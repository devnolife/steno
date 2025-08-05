"""
Migration Utility for UUID-based Document Binding

This module provides utilities to migrate from hash-based to UUID-based storage
and maintain backward compatibility during the transition period.
"""

import os
import json
import uuid
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

# Import security modules
from document_security import DocumentBinder, BindingStorage, is_valid_uuid, format_uuid

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MigrationManager:
    """Manager for handling migration from hash-based to UUID-based storage"""
    
    def __init__(self, storage_dir: str = "binding_storage", backup_dir: str = "binding_storage_backup"):
        """
        Initialize migration manager
        
        Args:
            storage_dir: Current binding storage directory
            backup_dir: Directory to store backup of original files
        """
        self.storage_dir = Path(storage_dir)
        self.backup_dir = Path(backup_dir)
        self.storage = BindingStorage(str(self.storage_dir))
        
        # Create backup directory
        self.backup_dir.mkdir(exist_ok=True)
        
        logger.info(f"Migration manager initialized: {self.storage_dir} -> {self.backup_dir}")
    
    def create_backup(self) -> bool:
        """
        Create backup of current binding storage
        
        Returns:
            True if backup successful, False otherwise
        """
        try:
            backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            timestamped_backup_dir = self.backup_dir / f"backup_{backup_timestamp}"
            
            if self.storage_dir.exists():
                shutil.copytree(self.storage_dir, timestamped_backup_dir)
                logger.info(f"Backup created successfully: {timestamped_backup_dir}")
                return True
            else:
                logger.warning(f"Storage directory does not exist: {self.storage_dir}")
                return True  # Nothing to backup
                
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return False
    
    def analyze_existing_records(self) -> Dict[str, Any]:
        """
        Analyze existing binding records to understand migration requirements
        
        Returns:
            Dict with analysis results
        """
        analysis = {
            "total_files": 0,
            "hash_based_files": 0,
            "uuid_based_files": 0,
            "invalid_files": 0,
            "version_1_records": 0,
            "version_2_records": 0,
            "files_to_migrate": [],
            "migration_required": False
        }
        
        try:
            if not self.storage_dir.exists():
                logger.info("Storage directory does not exist - no migration needed")
                return analysis
            
            for record_file in self.storage_dir.glob("*.json"):
                analysis["total_files"] += 1
                
                try:
                    with open(record_file, 'r') as f:
                        record = json.load(f)
                    
                    # Check record version
                    version = record.get("document_fingerprint", {}).get("version", "1.0")
                    if version == "2.0":
                        analysis["version_2_records"] += 1
                    else:
                        analysis["version_1_records"] += 1
                    
                    # Check filename pattern
                    filename_stem = record_file.stem
                    
                    if filename_stem.startswith("prereg_"):
                        # Pre-registration record
                        id_part = filename_stem[7:]  # Remove "prereg_" prefix
                    else:
                        id_part = filename_stem
                    
                    if is_valid_uuid(id_part):
                        analysis["uuid_based_files"] += 1
                    elif len(id_part) == 16 and all(c in '0123456789abcdef' for c in id_part):
                        # Looks like hash-based ID
                        analysis["hash_based_files"] += 1
                        analysis["files_to_migrate"].append({
                            "file": str(record_file),
                            "current_id": id_part,
                            "version": version
                        })
                    else:
                        analysis["invalid_files"] += 1
                        logger.warning(f"Unrecognized file pattern: {record_file}")
                
                except Exception as e:
                    analysis["invalid_files"] += 1
                    logger.error(f"Error analyzing file {record_file}: {e}")
            
            analysis["migration_required"] = analysis["hash_based_files"] > 0
            
            logger.info(f"Analysis complete: {analysis['total_files']} total files, "
                       f"{analysis['hash_based_files']} need migration")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error during analysis: {e}")
            return analysis
    
    def migrate_record(self, record_file: Path) -> Tuple[bool, str]:
        """
        Migrate a single record from hash-based to UUID-based
        
        Args:
            record_file: Path to the record file to migrate
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Load existing record
            with open(record_file, 'r') as f:
                record = json.load(f)
            
            # Check if already migrated
            fingerprint = record.get("document_fingerprint", {})
            if fingerprint.get("version") == "2.0" and "document_id" in fingerprint:
                return True, "Already migrated"
            
            # Generate new UUID for document
            new_document_id = str(uuid.uuid4())
            
            # Update fingerprint with UUID
            fingerprint["document_id"] = new_document_id
            fingerprint["version"] = "2.0"
            
            # Update any binding tokens in the record
            if "binding_token" in record:
                try:
                    updated_token = self._update_binding_token(record["binding_token"], new_document_id)
                    record["binding_token"] = updated_token
                except Exception as e:
                    logger.warning(f"Could not update binding token: {e}")
            
            # Determine new filename
            filename_stem = record_file.stem
            if filename_stem.startswith("prereg_"):
                new_filename = f"prereg_{new_document_id}.json"
            else:
                new_filename = f"{new_document_id}.json"
            
            new_file_path = record_file.parent / new_filename
            
            # Save migrated record
            with open(new_file_path, 'w') as f:
                json.dump(record, f, indent=2)
            
            # Remove old file if different
            if new_file_path != record_file:
                record_file.unlink()
            
            logger.info(f"Migrated {record_file.name} -> {new_filename}")
            return True, f"Migrated to {new_filename}"
            
        except Exception as e:
            logger.error(f"Error migrating {record_file}: {e}")
            return False, str(e)
    
    def _update_binding_token(self, old_token: str, new_document_id: str) -> str:
        """
        Update binding token with new document UUID
        
        Args:
            old_token: Original binding token
            new_document_id: New UUID for the document
            
        Returns:
            Updated binding token
        """
        import base64
        import hmac
        import hashlib
        
        try:
            # Decode token
            token_json = base64.b64decode(old_token.encode('ascii')).decode('utf-8')
            token_data = json.loads(token_json)
            
            # Decode payload
            payload_bytes = base64.b64decode(token_data["payload"].encode('ascii'))
            payload = json.loads(payload_bytes.decode('utf-8'))
            
            # Update payload with new UUID
            payload["document_id"] = new_document_id
            payload["version"] = "2.0"
            
            # Re-encode payload
            updated_payload_json = json.dumps(payload, sort_keys=True)
            updated_payload_bytes = updated_payload_json.encode('utf-8')
            
            # Note: We cannot regenerate the HMAC signature without the secret key
            # This is a limitation - tokens will need to be regenerated for full security
            
            # Update token data
            token_data["payload"] = base64.b64encode(updated_payload_bytes).decode('ascii')
            token_data["version"] = "2.0"
            
            # Re-encode complete token
            updated_token_json = json.dumps(token_data)
            updated_token = base64.b64encode(updated_token_json.encode('utf-8')).decode('ascii')
            
            logger.warning("Updated binding token payload but signature remains unchanged - "
                          "recommend regenerating token for full security")
            
            return updated_token
            
        except Exception as e:
            logger.error(f"Could not update binding token: {e}")
            raise
    
    def run_migration(self, dry_run: bool = False) -> Dict[str, Any]:
        """
        Run complete migration process
        
        Args:
            dry_run: If True, only analyze without making changes
            
        Returns:
            Dict with migration results
        """
        results = {
            "success": False,
            "dry_run": dry_run,
            "backup_created": False,
            "files_analyzed": 0,
            "files_migrated": 0,
            "files_failed": 0,
            "migration_details": [],
            "errors": []
        }
        
        try:
            logger.info(f"Starting migration (dry_run={dry_run})")
            
            # Analyze existing records
            analysis = self.analyze_existing_records()
            results["files_analyzed"] = analysis["total_files"]
            
            if not analysis["migration_required"]:
                logger.info("No migration required - all records are already UUID-based")
                results["success"] = True
                return results
            
            # Create backup if not dry run
            if not dry_run:
                if not self.create_backup():
                    results["errors"].append("Failed to create backup")
                    return results
                results["backup_created"] = True
            
            # Migrate each file that needs migration
            for file_info in analysis["files_to_migrate"]:
                record_file = Path(file_info["file"])
                
                if dry_run:
                    # Just log what would be done
                    logger.info(f"Would migrate: {record_file.name}")
                    results["migration_details"].append({
                        "file": file_info["file"],
                        "action": "would_migrate",
                        "status": "dry_run"
                    })
                    results["files_migrated"] += 1
                else:
                    # Actually migrate
                    success, message = self.migrate_record(record_file)
                    
                    if success:
                        results["files_migrated"] += 1
                        results["migration_details"].append({
                            "file": file_info["file"],
                            "action": "migrated",
                            "status": "success",
                            "message": message
                        })
                    else:
                        results["files_failed"] += 1
                        results["migration_details"].append({
                            "file": file_info["file"],
                            "action": "migrate_failed",
                            "status": "error",
                            "message": message
                        })
                        results["errors"].append(f"Failed to migrate {record_file.name}: {message}")
            
            results["success"] = results["files_failed"] == 0
            
            logger.info(f"Migration complete: {results['files_migrated']} migrated, "
                       f"{results['files_failed']} failed")
            
            return results
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            results["errors"].append(str(e))
            return results
    
    def validate_migration(self) -> Dict[str, Any]:
        """
        Validate that migration was successful
        
        Returns:
            Dict with validation results
        """
        validation = {
            "success": False,
            "total_files": 0,
            "valid_uuid_files": 0,
            "valid_records": 0,
            "invalid_records": 0,
            "issues": []
        }
        
        try:
            if not self.storage_dir.exists():
                validation["success"] = True  # No files to validate
                return validation
            
            for record_file in self.storage_dir.glob("*.json"):
                validation["total_files"] += 1
                
                try:
                    with open(record_file, 'r') as f:
                        record = json.load(f)
                    
                    # Check filename has valid UUID
                    filename_stem = record_file.stem
                    if filename_stem.startswith("prereg_"):
                        uuid_part = filename_stem[7:]
                    else:
                        uuid_part = filename_stem
                    
                    if is_valid_uuid(uuid_part):
                        validation["valid_uuid_files"] += 1
                    else:
                        validation["issues"].append(f"Invalid UUID in filename: {record_file.name}")
                    
                    # Check record structure
                    fingerprint = record.get("document_fingerprint", {})
                    if fingerprint.get("version") == "2.0" and "document_id" in fingerprint:
                        if is_valid_uuid(fingerprint["document_id"]):
                            validation["valid_records"] += 1
                        else:
                            validation["invalid_records"] += 1
                            validation["issues"].append(f"Invalid document_id UUID in {record_file.name}")
                    else:
                        validation["invalid_records"] += 1
                        validation["issues"].append(f"Missing or invalid UUID structure in {record_file.name}")
                
                except Exception as e:
                    validation["invalid_records"] += 1
                    validation["issues"].append(f"Error reading {record_file.name}: {e}")
            
            validation["success"] = (validation["invalid_records"] == 0 and 
                                   len(validation["issues"]) == 0)
            
            logger.info(f"Validation complete: {validation['valid_records']} valid, "
                       f"{validation['invalid_records']} invalid")
            
            return validation
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            validation["issues"].append(str(e))
            return validation


# Convenience functions
def run_migration_analysis() -> Dict[str, Any]:
    """Quick function to analyze migration requirements"""
    manager = MigrationManager()
    return manager.analyze_existing_records()


def run_migration(dry_run: bool = False) -> Dict[str, Any]:
    """Quick function to run migration"""
    manager = MigrationManager()
    return manager.run_migration(dry_run=dry_run)


def validate_migration() -> Dict[str, Any]:
    """Quick function to validate migration"""
    manager = MigrationManager()
    return manager.validate_migration()


if __name__ == "__main__":
    # Command line interface for migration
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python migration_utils.py [analyze|migrate|validate|dry-run]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "analyze":
        print("Analyzing migration requirements...")
        result = run_migration_analysis()
        print(json.dumps(result, indent=2))
    
    elif command == "dry-run":
        print("Running migration dry-run...")
        result = run_migration(dry_run=True)
        print(json.dumps(result, indent=2))
    
    elif command == "migrate":
        print("Running actual migration...")
        result = run_migration(dry_run=False)
        print(json.dumps(result, indent=2))
    
    elif command == "validate":
        print("Validating migration...")
        result = validate_migration()
        print(json.dumps(result, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        print("Available commands: analyze, dry-run, migrate, validate")
        sys.exit(1)
