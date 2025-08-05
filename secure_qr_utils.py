"""
Secure QR Code Utilities with Document Binding

This module extends the basic QR utilities with security features for binding
QR codes to specific documents using HMAC authentication.
"""

import os
import json
import time
import logging
from typing import Dict, Any, Optional, Union, Tuple
from PIL import Image

# Import existing utilities
from qr_utils import (
    generate_qr, 
    read_qr, 
    generate_qr_with_analysis, 
    analyze_qr_requirements,
    get_capacity_info
)

# Import security module
from document_security import (
    DocumentBinder, 
    BindingStorage, 
    DocumentSecurityError,
    quick_document_fingerprint,
    quick_binding_verification
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SecureQRGenerator:
    """Enhanced QR generator with document binding capabilities"""
    
    def __init__(self, key_file_path: str = "security_key.bin", 
                 storage_dir: str = "binding_storage"):
        """Initialize secure QR generator"""
        self.binder = DocumentBinder(key_file_path)
        self.storage = BindingStorage(storage_dir)
        
    def generate_bound_qr(self, data: str, document_path: str, output_path: str, 
                         expiry_hours: int = 24, **qr_kwargs) -> Dict[str, Any]:
        """
        Generate QR code bound to a specific document
        
        Args:
            data: Original QR data content
            document_path: Path to document that QR will be bound to
            output_path: Path to save the QR code
            expiry_hours: Hours until binding expires
            **qr_kwargs: Additional QR generation parameters
            
        Returns:
            Dict with generation results and binding info
        """
        try:
            logger.info(f"Generating bound QR for document: {document_path}")
            
            # Generate document fingerprint
            fingerprint = self.binder.generate_document_fingerprint(document_path)
            
            # Generate binding token
            binding_token = self.binder.generate_binding_token(
                fingerprint, data, expiry_hours
            )
            
            # Create secure QR data structure
            secure_qr_data = self.binder.create_secure_qr_data(data, binding_token)
            
            # Check if secure data fits in QR capacity
            capacity_check = analyze_qr_requirements(secure_qr_data)
            if not capacity_check.get('recommended_version'):
                # Data too long, try compact format
                logger.warning("Secure QR data too long, trying compact format")
                compact_secure_data = json.dumps({
                    "v": "1.0",
                    "t": "s",
                    "d": data,
                    "b": binding_token[:100]  # Truncate token if needed
                }, separators=(',', ':'))
                
                capacity_check = analyze_qr_requirements(compact_secure_data)
                if capacity_check.get('recommended_version'):
                    secure_qr_data = compact_secure_data
                else:
                    raise DocumentSecurityError("Document binding data too large for QR code")
            
            # Generate QR code with enhanced analysis
            qr_result = generate_qr_with_analysis(
                secure_qr_data, 
                output_path, 
                **qr_kwargs
            )
            
            if not qr_result['success']:
                raise DocumentSecurityError(f"QR generation failed: {qr_result.get('error')}")
            
            # Save binding record
            binding_record = {
                "document_fingerprint": fingerprint,
                "qr_data": data,
                "secure_qr_data": secure_qr_data,
                "binding_token": binding_token,
                "qr_file_path": output_path,
                "created_at": int(time.time()),
                "expires_at": int(time.time()) + (expiry_hours * 3600),
                "qr_generation_info": qr_result
            }
            
            self.storage.save_binding_record(fingerprint["document_id"], binding_record)
            
            result = {
                "success": True,
                "qr_path": output_path,
                "document_binding": {
                    "document_id": fingerprint["document_id"],  # Use UUID
                    "document_uuid": fingerprint["document_id"],  # Explicit UUID field
                    "fingerprint_hash": fingerprint["fingerprint_hash"][:16] + "...",
                    "expires_at": binding_record["expires_at"],
                    "binding_status": "active"
                },
                "qr_analysis": qr_result.get('comprehensive_analysis', {}),
                "security_info": {
                    "is_secure": True,
                    "original_data": data,
                    "secure_data_length": len(secure_qr_data),
                    "version": "2.0"  # Updated to UUID-based version
                }
            }
            
            logger.info(f"Successfully generated bound QR with document UUID {fingerprint['document_id']}")
            return result
            
        except Exception as e:
            logger.error(f"Error generating bound QR: {e}")
            return {
                "success": False,
                "error": str(e),
                "qr_path": None
            }
    
    def generate_unbound_qr(self, data: str, output_path: str, **qr_kwargs) -> Dict[str, Any]:
        """
        Generate traditional QR code without document binding (backward compatibility)
        
        Args:
            data: QR data content
            output_path: Path to save the QR code
            **qr_kwargs: Additional QR generation parameters
            
        Returns:
            Dict with generation results
        """
        try:
            logger.info("Generating unbound QR (legacy mode)")
            
            # Generate QR code with enhanced analysis
            qr_result = generate_qr_with_analysis(data, output_path, **qr_kwargs)
            
            if qr_result['success']:
                qr_result["security_info"] = {
                    "is_secure": False,
                    "original_data": data,
                    "binding_status": "unbound",
                    "version": "legacy"
                }
            
            return qr_result
            
        except Exception as e:
            logger.error(f"Error generating unbound QR: {e}")
            return {
                "success": False,
                "error": str(e),
                "qr_path": None
            }
    
    def pre_register_document(self, document_path: str, qr_data: str, 
                            expiry_hours: int = 24) -> Dict[str, Any]:
        """
        Pre-register a document for later QR generation
        
        Args:
            document_path: Path to the document
            qr_data: QR data content that will be bound
            expiry_hours: Hours until registration expires
            
        Returns:
            Dict with registration info including binding token
        """
        try:
            logger.info(f"Pre-registering document: {document_path}")
            
            # Generate document fingerprint
            fingerprint = self.binder.generate_document_fingerprint(document_path)
            
            # Generate binding token
            binding_token = self.binder.generate_binding_token(
                fingerprint, qr_data, expiry_hours
            )
            
            # Save pre-registration record
            preregistration_record = {
                "document_fingerprint": fingerprint,
                "qr_data": qr_data,
                "binding_token": binding_token,
                "status": "pre_registered",
                "created_at": int(time.time()),
                "expires_at": int(time.time()) + (expiry_hours * 3600),
                "qr_generated": False
            }
            
            self.storage.save_binding_record(
                f"prereg_{fingerprint['document_id']}", 
                preregistration_record
            )
            
            result = {
                "success": True,
                "registration_id": fingerprint["document_id"],  # Use UUID
                "document_uuid": fingerprint["document_id"],  # Explicit UUID field
                "binding_token": binding_token,
                "document_info": {
                    "document_id": fingerprint["document_id"],  # UUID
                    "filename": fingerprint["file_info"]["name"],
                    "size": fingerprint["file_info"]["size"],
                    "document_type": fingerprint["file_info"]["extension"]
                },
                "expires_at": preregistration_record["expires_at"],
                "instructions": {
                    "next_step": "Use the binding_token when generating QR code",
                    "api_endpoint": "/generate_qr_with_token"
                }
            }
            
            logger.info(f"Pre-registered document with UUID: {fingerprint['document_id']}")
            return result
            
        except Exception as e:
            logger.error(f"Error pre-registering document: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_and_embed_secure_qr(self, document_file_path: str, qr_data: str, 
                                    security_options: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate bound QR code and embed it into document in one workflow.
        
        Args:
            document_file_path: Path to the document file
            qr_data: Text data for QR code generation
            security_options: Dictionary containing security configuration
                - expiry_hours: Hours until binding expires (default: 24)
                - security_level: Security level (default: 'high')
                - auto_embed: Whether to perform embedding automatically (default: True)
        
        Returns:
            Dict containing QR file path, processed document path, and security info
        """
        try:
            expiry_hours = security_options.get('expiry_hours', 24)
            auto_embed = security_options.get('auto_embed', True)
            
            # Generate a unique identifier for this workflow
            workflow_id = f"secure_workflow_{int(time.time())}"
            
            # Determine output paths
            import os
            base_dir = os.path.dirname(document_file_path)
            qr_output_path = os.path.join(base_dir, f"secure_qr_{workflow_id}.png")
            
            # Generate bound QR code
            logger.info(f"Generating secure QR for workflow {workflow_id}")
            qr_result = self.generate_bound_qr(
                data=qr_data,
                document_path=document_file_path,
                output_path=qr_output_path,
                expiry_hours=expiry_hours
            )
            
            if not qr_result.get('success', False):
                return {
                    "success": False,
                    "error": f"QR generation failed: {qr_result.get('error')}",
                    "workflow_id": workflow_id
                }
            
            result = {
                "success": True,
                "workflow_id": workflow_id,
                "qr_path": qr_output_path,
                "qr_data": qr_data,
                "security_info": qr_result.get('security_info', {}),
                "document_binding": qr_result.get('document_binding', {}),
                "qr_analysis": qr_result.get('qr_analysis', {})
            }
            
            # Perform embedding if requested
            if auto_embed:
                from main import embed_watermark_to_docx, embed_watermark_to_pdf
                
                # Determine document type and output path
                doc_extension = os.path.splitext(document_file_path)[1].lower()
                embedded_doc_path = os.path.join(base_dir, f"embedded_secure_{workflow_id}{doc_extension}")
                
                # Perform embedding based on document type
                if doc_extension == '.docx':
                    embed_result = embed_watermark_to_docx(document_file_path, qr_output_path, embedded_doc_path)
                elif doc_extension == '.pdf':
                    embed_result = embed_watermark_to_pdf(document_file_path, qr_output_path, embedded_doc_path)
                else:
                    return {
                        "success": False,
                        "error": f"Unsupported document type: {doc_extension}",
                        "workflow_id": workflow_id,
                        "qr_path": qr_output_path
                    }
                
                if embed_result.get('success', False):
                    result.update({
                        "embedded_document_path": embedded_doc_path,
                        "processed_images": embed_result.get('processed_images', []),
                        "quality_metrics": {
                            "mse": embed_result.get('mse'),
                            "psnr": embed_result.get('psnr')
                        },
                        "public_dir": embed_result.get('public_dir', ''),
                        "embedding_completed": True
                    })
                else:
                    result.update({
                        "embedding_completed": False,
                        "embedding_error": embed_result.get('error', 'Unknown embedding error'),
                        "qr_path": qr_output_path  # QR still available even if embedding fails
                    })
            
            logger.info(f"Secure workflow {workflow_id} completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in secure QR generation and embedding workflow: {e}")
            return {
                "success": False,
                "error": str(e),
                "workflow_id": workflow_id if 'workflow_id' in locals() else None
            }
    
    def generate_and_embed_legacy_qr(self, document_file_path: str, qr_data: str, 
                                   qr_options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate regular QR code and embed it into document (legacy mode).
        
        Args:
            document_file_path: Path to the document file
            qr_data: Text data for QR code generation
            qr_options: Optional QR generation parameters
        
        Returns:
            Dict containing QR file path, processed document path, and analysis info
        """
        try:
            from qr_utils import generate_qr_with_analysis
            from main import embed_watermark_to_docx, embed_watermark_to_pdf
            
            # Generate a unique identifier for this workflow
            workflow_id = f"legacy_workflow_{int(time.time())}"
            
            # Determine output paths
            import os
            base_dir = os.path.dirname(document_file_path)
            qr_output_path = os.path.join(base_dir, f"legacy_qr_{workflow_id}.png")
            
            # Generate regular QR code
            logger.info(f"Generating legacy QR for workflow {workflow_id}")
            qr_result = generate_qr_with_analysis(qr_data, qr_output_path, **(qr_options or {}))
            
            if not qr_result.get('success', False):
                return {
                    "success": False,
                    "error": f"QR generation failed: {qr_result.get('error')}",
                    "workflow_id": workflow_id
                }
            
            # Determine document type and output path
            doc_extension = os.path.splitext(document_file_path)[1].lower()
            embedded_doc_path = os.path.join(base_dir, f"embedded_legacy_{workflow_id}{doc_extension}")
            
            # Perform embedding based on document type
            if doc_extension == '.docx':
                embed_result = embed_watermark_to_docx(document_file_path, qr_output_path, embedded_doc_path)
            elif doc_extension == '.pdf':
                embed_result = embed_watermark_to_pdf(document_file_path, qr_output_path, embedded_doc_path)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported document type: {doc_extension}",
                    "workflow_id": workflow_id,
                    "qr_path": qr_output_path
                }
            
            result = {
                "success": True,
                "workflow_id": workflow_id,
                "qr_path": qr_output_path,
                "qr_data": qr_data,
                "qr_analysis": qr_result.get('comprehensive_analysis', {}),
                "security_info": {
                    "is_secure": False,
                    "security_level": "none",
                    "binding_status": "unbound"
                }
            }
            
            if embed_result.get('success', False):
                result.update({
                    "embedded_document_path": embedded_doc_path,
                    "processed_images": embed_result.get('processed_images', []),
                    "quality_metrics": {
                        "mse": embed_result.get('mse'),
                        "psnr": embed_result.get('psnr')
                    },
                    "public_dir": embed_result.get('public_dir', ''),
                    "embedding_completed": True
                })
            else:
                result.update({
                    "embedding_completed": False,
                    "embedding_error": embed_result.get('error', 'Unknown embedding error')
                })
            
            logger.info(f"Legacy workflow {workflow_id} completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in legacy QR generation and embedding workflow: {e}")
            return {
                "success": False,
                "error": str(e),
                "workflow_id": workflow_id if 'workflow_id' in locals() else None
            }
    
    def generate_qr_with_token(self, data: str, binding_token: str, 
                              output_path: str, **qr_kwargs) -> Dict[str, Any]:
        """
        Generate QR code using a pre-generated binding token
        
        Args:
            data: QR data content
            binding_token: Pre-generated binding token
            output_path: Path to save the QR code
            **qr_kwargs: Additional QR generation parameters
            
        Returns:
            Dict with generation results
        """
        try:
            logger.info("Generating QR with pre-generated token")
            
            # Create secure QR data structure
            secure_qr_data = self.binder.create_secure_qr_data(data, binding_token)
            
            # Generate QR code
            qr_result = generate_qr_with_analysis(
                secure_qr_data, 
                output_path, 
                **qr_kwargs
            )
            
            if not qr_result['success']:
                raise DocumentSecurityError(f"QR generation failed: {qr_result.get('error')}")
            
            # Add security info to result
            qr_result["security_info"] = {
                "is_secure": True,
                "original_data": data,
                "uses_pregenerated_token": True,
                "secure_data_length": len(secure_qr_data),
                "version": "2.0"  # Updated to UUID-based version
            }
            
            logger.info("Successfully generated QR with pre-generated token")
            return qr_result
            
        except Exception as e:
            logger.error(f"Error generating QR with token: {e}")
            return {
                "success": False,
                "error": str(e),
                "qr_path": None
            }


class SecureQRValidator:
    """Validator for QR code and document binding verification"""
    
    def __init__(self, key_file_path: str = "security_key.bin", 
                 storage_dir: str = "binding_storage"):
        """Initialize secure QR validator"""
        self.binder = DocumentBinder(key_file_path)
        self.storage = BindingStorage(storage_dir)
    
    def validate_qr_document_binding(self, qr_image_path: str, 
                                   document_path: str) -> Dict[str, Any]:
        """
        Validate that a QR code is properly bound to a document
        
        Args:
            qr_image_path: Path to QR code image
            document_path: Path to document
            
        Returns:
            Dict with validation results
        """
        try:
            logger.info(f"Validating QR-document binding: {qr_image_path} + {document_path}")
            
            # Read QR code
            qr_data_list = read_qr(qr_image_path)
            if not qr_data_list:
                return {
                    "valid": False,
                    "error": "Could not read QR code from image",
                    "error_type": "QR_READ_FAILED"
                }
            
            qr_data = qr_data_list[0]  # Take first QR code
            
            # Use quick verification function
            verification_result = quick_binding_verification(qr_data, document_path)
            
            if verification_result.get("is_legacy"):
                return {
                    "valid": True,
                    "is_legacy": True,
                    "binding_verified": False,
                    "message": "QR code is legacy format (not bound to any document)",
                    "security_level": "none",
                    "recommendations": [
                        "Consider regenerating QR code with document binding for enhanced security"
                    ]
                }
            
            if verification_result.get("binding_verified"):
                details = verification_result.get("verification_details", {})
                return {
                    "valid": True,
                    "is_legacy": False,
                    "binding_verified": True,
                    "document_id": verification_result.get("document_id"),  # Use UUID
                    "verification_details": details,
                    "security_level": "secure",
                    "message": "QR code is properly bound to this document",
                    "expires_at": details.get("expires_at"),
                    "issued_at": details.get("issued_at")
                }
            else:
                error_details = verification_result.get("verification_details", {})
                return {
                    "valid": False,
                    "is_legacy": False,
                    "binding_verified": False,
                    "error": error_details.get("error", "Binding verification failed"),
                    "error_type": "BINDING_MISMATCH",
                    "security_level": "compromised",
                    "message": "QR code is NOT bound to this document",
                    "verification_details": error_details
                }
                
        except Exception as e:
            logger.error(f"Error validating QR-document binding: {e}")
            return {
                "valid": False,
                "error": str(e),
                "error_type": "VALIDATION_ERROR"
            }
    
    def extract_qr_security_info(self, qr_image_path: str) -> Dict[str, Any]:
        """
        Extract security information from QR code without document validation
        
        Args:
            qr_image_path: Path to QR code image
            
        Returns:
            Dict with QR security information
        """
        try:
            logger.info(f"Extracting security info from QR: {qr_image_path}")
            
            # Read QR code
            qr_data_list = read_qr(qr_image_path)
            if not qr_data_list:
                return {
                    "success": False,
                    "error": "Could not read QR code from image"
                }
            
            qr_data = qr_data_list[0]
            
            # Parse QR data for security info
            qr_info = self.binder.parse_secure_qr_data(qr_data)
            
            if qr_info["is_secure"]:
                # Decode binding token to get more info
                try:
                    import base64
                    token_json = base64.b64decode(qr_info["binding_token"].encode('ascii')).decode('utf-8')
                    token_data = json.loads(token_json)
                    
                    payload_bytes = base64.b64decode(token_data["payload"].encode('ascii'))
                    payload = json.loads(payload_bytes.decode('utf-8'))
                    
                    return {
                        "success": True,
                        "is_secure": True,
                        "security_info": {
                            "version": qr_info["version"],
                            "created_at": qr_info["created_at"],
                            "original_data": qr_info["original_data"],
                            "is_uuid_based": qr_info.get("is_uuid_based", False),
                            "binding_info": {
                                "issued_at": payload.get("issued_at"),
                                "expires_at": payload.get("expires_at"),
                                "document_id": payload.get("document_id"),  # UUID if v2.0
                                "expected_fingerprint": payload.get("fingerprint_hash", "")[:16] + "..."
                            }
                        }
                    }
                    
                except Exception as e:
                    logger.warning(f"Could not decode binding token details: {e}")
                    return {
                        "success": True,
                        "is_secure": True,
                        "security_info": {
                            "version": qr_info["version"],
                            "created_at": qr_info["created_at"],
                            "original_data": qr_info["original_data"],
                            "is_uuid_based": qr_info.get("is_uuid_based", False),
                            "binding_info": "encrypted"
                        }
                    }
            else:
                return {
                    "success": True,
                    "is_secure": False,
                    "security_info": {
                        "version": "legacy",
                        "original_data": qr_info["original_data"],
                        "binding_status": "unbound"
                    }
                }
                
        except Exception as e:
            logger.error(f"Error extracting QR security info: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# Convenience functions for easy integration
def generate_secure_qr(data: str, document_path: str, output_path: str, 
                      **kwargs) -> Dict[str, Any]:
    """
    Quick function to generate a document-bound QR code
    
    Args:
        data: QR data content
        document_path: Path to document for binding
        output_path: Path to save QR code
        **kwargs: Additional QR generation parameters
        
    Returns:
        Dict with generation results
    """
    generator = SecureQRGenerator()
    return generator.generate_bound_qr(data, document_path, output_path, **kwargs)


def validate_secure_qr(qr_image_path: str, document_path: str) -> Dict[str, Any]:
    """
    Quick function to validate QR-document binding
    
    Args:
        qr_image_path: Path to QR code image
        document_path: Path to document
        
    Returns:
        Dict with validation results
    """
    validator = SecureQRValidator()
    return validator.validate_qr_document_binding(qr_image_path, document_path)


def get_qr_security_info(qr_image_path: str) -> Dict[str, Any]:
    """
    Quick function to get QR security information
    
    Args:
        qr_image_path: Path to QR code image
        
    Returns:
        Dict with security information
    """
    validator = SecureQRValidator()
    return validator.extract_qr_security_info(qr_image_path) 
