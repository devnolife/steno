"""
Document Security Module for QR Code Watermarking Tool

This module provides security features for binding QR codes to specific documents
using HMAC-based authentication and document fingerprinting.

Features:
- Document fingerprinting using SHA-256 + metadata
- HMAC generation and verification for QR-document binding
- Secure key management
- Document verification workflow
"""

import hashlib
import hmac
import json
import os
import time
import secrets
import uuid
from typing import Dict, Optional, Tuple, Union, Any
from pathlib import Path
import logging
from PIL import Image
import fitz  # PyMuPDF for PDF processing
from docx import Document
import base64

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security configuration
HMAC_KEY_LENGTH = 32  # 256-bit key
HMAC_DIGEST_LENGTH = 32  # 256-bit digest
QR_BINDING_VERSION = "2.0"  # Updated to UUID-based format
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50MB max document size
BINDING_EXPIRY_HOURS = 24  # QR codes expire after 24 hours


class DocumentSecurityError(Exception):
    """Custom exception for document security errors"""
    pass


class DocumentBinder:
    """Main class for handling document-QR binding operations"""
    
    def __init__(self, key_file_path: str = "security_key.bin"):
        """
        Initialize DocumentBinder with encryption key management
        
        Args:
            key_file_path: Path to store/load the encryption key
        """
        self.key_file_path = key_file_path
        self.secret_key = self._load_or_generate_key()
        
    def _load_or_generate_key(self) -> bytes:
        """Load existing key or generate new one"""
        try:
            if os.path.exists(self.key_file_path):
                with open(self.key_file_path, 'rb') as f:
                    key = f.read()
                if len(key) == HMAC_KEY_LENGTH:
                    logger.info("Loaded existing security key")
                    return key
                else:
                    logger.warning("Invalid key file, generating new key")
            
            # Generate new key
            key = secrets.token_bytes(HMAC_KEY_LENGTH)
            with open(self.key_file_path, 'wb') as f:
                f.write(key)
            logger.info("Generated new security key")
            return key
            
        except Exception as e:
            logger.error(f"Error managing security key: {e}")
            raise DocumentSecurityError(f"Failed to initialize security key: {e}")
    
    def generate_document_fingerprint(self, document_path: str) -> Dict[str, Any]:
        """
        Generate a comprehensive fingerprint for a document
        
        Args:
            document_path: Path to the document file
            
        Returns:
            Dict containing document fingerprint data
        """
        if not os.path.exists(document_path):
            raise DocumentSecurityError(f"Document not found: {document_path}")
        
        file_size = os.path.getsize(document_path)
        if file_size > MAX_DOCUMENT_SIZE:
            raise DocumentSecurityError(f"Document too large: {file_size} bytes (max: {MAX_DOCUMENT_SIZE})")
        
        try:
            # Basic file metadata
            stat = os.stat(document_path)
            filename = os.path.basename(document_path)
            file_ext = os.path.splitext(filename)[1].lower()
            
            # Calculate file hash
            sha256_hash = hashlib.sha256()
            with open(document_path, 'rb') as f:
                # Read file in chunks for memory efficiency
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)
            
            file_hash = sha256_hash.hexdigest()
            
            # Document-specific metadata
            doc_metadata = self._extract_document_metadata(document_path, file_ext)
            
            # Create fingerprint structure with UUID-based document ID
            document_id = str(uuid.uuid4())  # Generate unique UUID for document
            
            fingerprint = {
                "version": QR_BINDING_VERSION,
                "document_id": document_id,  # Primary UUID identifier
                "timestamp": int(time.time()),
                "file_info": {
                    "name": filename,
                    "size": file_size,
                    "extension": file_ext,
                    "modified_time": int(stat.st_mtime)
                },
                "content_hash": file_hash,
                "document_metadata": doc_metadata,
                "security_level": "standard"
            }
            
            # Calculate fingerprint hash for verification (kept for security)
            fingerprint_data = json.dumps(fingerprint, sort_keys=True).encode('utf-8')
            fingerprint_hash = hashlib.sha256(fingerprint_data).hexdigest()
            fingerprint["fingerprint_hash"] = fingerprint_hash
            
            logger.info(f"Generated fingerprint for {filename}: {document_id}")
            return fingerprint
            
        except Exception as e:
            logger.error(f"Error generating document fingerprint: {e}")
            raise DocumentSecurityError(f"Failed to fingerprint document: {e}")
    
    def _extract_document_metadata(self, document_path: str, file_ext: str) -> Dict[str, Any]:
        """Extract document-specific metadata"""
        metadata = {"type": file_ext}
        
        try:
            if file_ext == '.docx':
                metadata.update(self._extract_docx_metadata(document_path))
            elif file_ext == '.pdf':
                metadata.update(self._extract_pdf_metadata(document_path))
            else:
                metadata["extraction_method"] = "basic"
                
        except Exception as e:
            logger.warning(f"Could not extract metadata for {file_ext}: {e}")
            metadata["metadata_error"] = str(e)
        
        return metadata
    
    def _extract_docx_metadata(self, docx_path: str) -> Dict[str, Any]:
        """Extract metadata from DOCX document"""
        try:
            doc = Document(docx_path)
            core_props = doc.core_properties
            
            # Count elements
            paragraph_count = len(doc.paragraphs)
            image_count = 0
            
            # Count images by checking relationships
            for rel in doc.part.rels.values():
                if "image" in rel.reltype:
                    image_count += 1
            
            return {
                "paragraph_count": paragraph_count,
                "image_count": image_count,
                "author": getattr(core_props, 'author', None),
                "title": getattr(core_props, 'title', None),
                "subject": getattr(core_props, 'subject', None),
                "created": str(getattr(core_props, 'created', None)),
                "modified": str(getattr(core_props, 'modified', None)),
                "extraction_method": "docx"
            }
            
        except Exception as e:
            logger.warning(f"Error extracting DOCX metadata: {e}")
            return {"extraction_method": "docx", "error": str(e)}
    
    def _extract_pdf_metadata(self, pdf_path: str) -> Dict[str, Any]:
        """Extract metadata from PDF document"""
        try:
            doc = fitz.open(pdf_path)
            metadata = doc.metadata
            
            page_count = doc.page_count
            image_count = 0
            
            # Count images in PDF
            for page_num in range(min(5, page_count)):  # Check first 5 pages
                page = doc[page_num]
                image_list = page.get_images()
                image_count += len(image_list)
            
            doc.close()
            
            return {
                "page_count": page_count,
                "image_count": image_count,
                "title": metadata.get('title', None),
                "author": metadata.get('author', None),
                "subject": metadata.get('subject', None),
                "creator": metadata.get('creator', None),
                "producer": metadata.get('producer', None),
                "creation_date": metadata.get('creationDate', None),
                "modification_date": metadata.get('modDate', None),
                "extraction_method": "pdf"
            }
            
        except Exception as e:
            logger.warning(f"Error extracting PDF metadata: {e}")
            return {"extraction_method": "pdf", "error": str(e)}
    
    def generate_binding_token(self, document_fingerprint: Dict[str, Any], 
                              qr_data: str, expiry_hours: int = BINDING_EXPIRY_HOURS) -> str:
        """
        Generate HMAC token for QR-document binding
        
        Args:
            document_fingerprint: Document fingerprint data
            qr_data: QR code data content
            expiry_hours: Token expiry time in hours
            
        Returns:
            Base64-encoded binding token
        """
        try:
            # Create binding payload with UUID
            binding_payload = {
                "document_id": document_fingerprint["document_id"],  # Use UUID as primary ID
                "fingerprint_hash": document_fingerprint["fingerprint_hash"],
                "qr_data": qr_data,
                "issued_at": int(time.time()),
                "expires_at": int(time.time()) + (expiry_hours * 3600),
                "version": QR_BINDING_VERSION
            }
            
            # Serialize payload
            payload_json = json.dumps(binding_payload, sort_keys=True)
            payload_bytes = payload_json.encode('utf-8')
            
            # Generate HMAC
            hmac_digest = hmac.new(
                self.secret_key,
                payload_bytes,
                hashlib.sha256
            ).digest()
            
            # Combine payload and HMAC
            token_data = {
                "payload": base64.b64encode(payload_bytes).decode('ascii'),
                "signature": base64.b64encode(hmac_digest).decode('ascii'),
                "version": QR_BINDING_VERSION
            }
            
            # Encode complete token
            token_json = json.dumps(token_data)
            token_b64 = base64.b64encode(token_json.encode('utf-8')).decode('ascii')
            
            logger.info(f"Generated binding token for document {document_fingerprint['document_id']}")
            return token_b64
            
        except Exception as e:
            logger.error(f"Error generating binding token: {e}")
            raise DocumentSecurityError(f"Failed to generate binding token: {e}")
    
    def verify_binding_token(self, token: str, document_fingerprint: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify QR-document binding token
        
        Args:
            token: Base64-encoded binding token
            document_fingerprint: Current document fingerprint
            
        Returns:
            Dict with verification results
        """
        try:
            # Decode token
            token_json = base64.b64decode(token.encode('ascii')).decode('utf-8')
            token_data = json.loads(token_json)
            
            # Validate token structure
            required_fields = ["payload", "signature", "version"]
            for field in required_fields:
                if field not in token_data:
                    return {"valid": False, "error": f"Missing token field: {field}"}
            
            # Decode payload and signature
            payload_bytes = base64.b64decode(token_data["payload"].encode('ascii'))
            signature_bytes = base64.b64decode(token_data["signature"].encode('ascii'))
            
            # Verify HMAC signature
            expected_signature = hmac.new(
                self.secret_key,
                payload_bytes,
                hashlib.sha256
            ).digest()
            
            if not hmac.compare_digest(signature_bytes, expected_signature):
                return {"valid": False, "error": "Invalid token signature"}
            
            # Parse payload
            payload_json = payload_bytes.decode('utf-8')
            payload = json.loads(payload_json)
            
            # Check expiry
            current_time = int(time.time())
            if current_time > payload.get("expires_at", 0):
                return {"valid": False, "error": "Token expired"}
            
            # Verify document fingerprint match (check both UUID and hash for compatibility)
            if payload.get("fingerprint_hash") != document_fingerprint.get("fingerprint_hash"):
                return {
                    "valid": False, 
                    "error": "Document fingerprint mismatch",
                    "expected_fingerprint": payload.get("fingerprint_hash"),
                    "actual_fingerprint": document_fingerprint.get("fingerprint_hash")
                }
            
            # Verification successful
            verification_result = {
                "valid": True,
                "qr_data": payload.get("qr_data"),
                "issued_at": payload.get("issued_at"),
                "expires_at": payload.get("expires_at"),
                "document_id": document_fingerprint.get("document_id"),  # Use UUID
                "document_uuid": payload.get("document_id"),  # From token
                "verification_time": current_time
            }
            
            logger.info(f"Successfully verified binding token for document {document_fingerprint['document_id']}")
            return verification_result
            
        except json.JSONDecodeError as e:
            return {"valid": False, "error": f"Invalid token format: {e}"}
        except Exception as e:
            logger.error(f"Error verifying binding token: {e}")
            return {"valid": False, "error": f"Verification failed: {e}"}
    
    def create_secure_qr_data(self, original_data: str, binding_token: str) -> str:
        """
        Create QR data structure that includes binding token
        
        Args:
            original_data: Original QR data content
            binding_token: Document binding token
            
        Returns:
            JSON string containing both data and binding info
        """
        try:
            secure_data = {
                "version": QR_BINDING_VERSION,
                "type": "secure",
                "data": original_data,
                "binding": binding_token,
                "created_at": int(time.time())
            }
            
            return json.dumps(secure_data, separators=(',', ':'))  # Compact JSON
            
        except Exception as e:
            logger.error(f"Error creating secure QR data: {e}")
            raise DocumentSecurityError(f"Failed to create secure QR data: {e}")
    
    def parse_secure_qr_data(self, qr_data: str) -> Dict[str, Any]:
        """
        Parse QR data to extract original content and binding token
        Handles both legacy (v1.0) and UUID-based (v2.0) formats
        
        Args:
            qr_data: QR data string (may be secure or legacy format)
            
        Returns:
            Dict with parsed data and security info
        """
        try:
            # Try to parse as JSON (secure format)
            try:
                data = json.loads(qr_data)
                if isinstance(data, dict) and data.get("type") == "secure":
                    version = data.get("version", "1.0")
                    return {
                        "is_secure": True,
                        "original_data": data.get("data"),
                        "binding_token": data.get("binding"),
                        "version": version,
                        "created_at": data.get("created_at"),
                        "is_uuid_based": version == "2.0"
                    }
            except json.JSONDecodeError:
                pass
            
            # Legacy/plain text format
            return {
                "is_secure": False,
                "original_data": qr_data,
                "binding_token": None,
                "version": None,
                "created_at": None,
                "is_uuid_based": False
            }
            
        except Exception as e:
            logger.error(f"Error parsing QR data: {e}")
            raise DocumentSecurityError(f"Failed to parse QR data: {e}")


class BindingStorage:
    """Simple file-based storage for document binding records"""
    
    def __init__(self, storage_dir: str = "binding_storage"):
        """Initialize binding storage"""
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        logger.info(f"Initialized binding storage at {self.storage_dir}")
    
    def save_binding_record(self, document_id: str, record: Dict[str, Any]) -> bool:
        """Save a binding record using UUID as primary key"""
        try:
            record_file = self.storage_dir / f"{document_id}.json"
            with open(record_file, 'w') as f:
                json.dump(record, f, indent=2)
            logger.info(f"Saved binding record: {document_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving binding record: {e}")
            return False
    
    def load_binding_record(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Load a binding record using UUID as primary key"""
        try:
            # First try UUID-based filename
            record_file = self.storage_dir / f"{document_id}.json"
            if record_file.exists():
                with open(record_file, 'r') as f:
                    record = json.load(f)
                return record
            
            # Backward compatibility: try hash-based filename if UUID fails
            # This helps with migration from old system
            for existing_file in self.storage_dir.glob("*.json"):
                try:
                    with open(existing_file, 'r') as f:
                        record = json.load(f)
                    # Check if this record matches the requested document_id
                    if (record.get("document_fingerprint", {}).get("document_id") == document_id or
                        record.get("document_fingerprint", {}).get("fingerprint_id") == document_id):
                        return record
                except Exception:
                    continue
            
            return None
        except Exception as e:
            logger.error(f"Error loading binding record: {e}")
            return None
    
    def cleanup_expired_records(self) -> int:
        """Remove expired binding records"""
        current_time = int(time.time())
        cleaned_count = 0
        
        try:
            for record_file in self.storage_dir.glob("*.json"):
                try:
                    with open(record_file, 'r') as f:
                        record = json.load(f)
                    
                    if record.get("expires_at", 0) < current_time:
                        record_file.unlink()
                        cleaned_count += 1
                        logger.info(f"Cleaned expired record: {record_file.name}")
                        
                except Exception as e:
                    logger.warning(f"Error processing record {record_file}: {e}")
            
            logger.info(f"Cleanup complete. Removed {cleaned_count} expired records")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            return 0


# Convenience functions for easy integration
def quick_document_fingerprint(document_path: str) -> Dict[str, Any]:
    """Quick function to generate document fingerprint"""
    binder = DocumentBinder()
    return binder.generate_document_fingerprint(document_path)


def quick_binding_verification(qr_data: str, document_path: str) -> Dict[str, Any]:
    """Quick function to verify QR-document binding"""
    try:
        binder = DocumentBinder()
        
        # Parse QR data
        qr_info = binder.parse_secure_qr_data(qr_data)
        
        if not qr_info["is_secure"]:
            return {
                "binding_verified": False,
                "is_legacy": True,
                "message": "QR code is not bound to any document (legacy format)"
            }
        
        # Generate current document fingerprint
        fingerprint = binder.generate_document_fingerprint(document_path)
        
        # Verify binding
        verification = binder.verify_binding_token(qr_info["binding_token"], fingerprint)
        
        return {
            "binding_verified": verification["valid"],
            "is_legacy": False,
            "verification_details": verification,
            "document_id": fingerprint["document_id"]  # Use UUID instead of fingerprint_id
        }
        
    except Exception as e:
        return {
            "binding_verified": False,
            "is_legacy": False,
            "error": str(e)
        } 


def is_valid_uuid(uuid_string: str) -> bool:
    """Check if a string is a valid UUID format"""
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False


def format_uuid(uuid_string: str, with_hyphens: bool = True) -> str:
    """Format UUID string consistently"""
    try:
        uuid_obj = uuid.UUID(uuid_string)
        if with_hyphens:
            return str(uuid_obj)
        else:
            return uuid_obj.hex
    except ValueError:
        raise DocumentSecurityError(f"Invalid UUID format: {uuid_string}")


def validate_uuid_input(uuid_string: str) -> Dict[str, Any]:
    """Validate UUID input and return validation results"""
    if not uuid_string:
        return {"valid": False, "error": "UUID cannot be empty"}
    
    if not isinstance(uuid_string, str):
        return {"valid": False, "error": "UUID must be a string"}
    
    if not is_valid_uuid(uuid_string):
        return {"valid": False, "error": "Invalid UUID format"}
    
    return {
        "valid": True,
        "formatted_uuid": format_uuid(uuid_string),
        "uuid_version": uuid.UUID(uuid_string).version
    }
