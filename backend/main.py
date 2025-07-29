#!/usr/bin/env python3
"""
Data Ingestion Module - Main Entry Point

This module handles file detection, metadata extraction, and ingestion logging
for a full-stack data ingestion pipeline.
"""

import hashlib
import logging
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict
import pandas as pd


class FileDetector:
    """Handles detection of files in specified directories."""
    
    SUPPORTED_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.json', '.parquet', '.txt', '.tsv'}
    
    def __init__(self, watch_directories: List[str] = None):
        """
        Initialize FileDetector.
        
        Args:
            watch_directories: List of directories to monitor for files
        """
        self.watch_directories = watch_directories or ['./data/incoming']
        self.logger = logging.getLogger(__name__)
    
    def detect_files(self, recursive: bool = True) -> List[Path]:
        """
        Detect supported files in watch directories.
        
        Args:
            recursive: Whether to search subdirectories
            
        Returns:
            List of Path objects for detected files
        """
        detected_files = []
        
        for directory in self.watch_directories:
            dir_path = Path(directory)
            
            if not dir_path.exists():
                self.logger.warning(f"Directory does not exist: {directory}")
                continue
                
            if not dir_path.is_dir():
                self.logger.warning(f"Path is not a directory: {directory}")
                continue
            
            # Search for files
            pattern = "**/*" if recursive else "*"
            for file_path in dir_path.glob(pattern):
                if (file_path.is_file() and 
                    file_path.suffix.lower() in self.SUPPORTED_EXTENSIONS):
                    detected_files.append(file_path)
                    
        self.logger.info(f"Detected {len(detected_files)} files")
        return detected_files


class MetadataExtractor:
    """Extracts metadata from various file types."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def extract_metadata(self, file_path: Path) -> Dict:
        """
        Extract comprehensive metadata from a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary containing file metadata
        """
        try:
            metadata = {
                'file_path': str(file_path),
                'file_name': file_path.name,
                'file_size': file_path.stat().st_size,
                'file_extension': file_path.suffix.lower(),
                'created_time': datetime.fromtimestamp(file_path.stat().st_ctime).isoformat(),
                'modified_time': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                'checksum': self._calculate_checksum(file_path),
                'extraction_time': datetime.now().isoformat()
            }
            
            # Add file-specific metadata
            if file_path.suffix.lower() in {'.csv', '.tsv'}:
                metadata.update(self._extract_csv_metadata(file_path))
            elif file_path.suffix.lower() in {'.xlsx', '.xls'}:
                metadata.update(self._extract_excel_metadata(file_path))
            elif file_path.suffix.lower() == '.json':
                metadata.update(self._extract_json_metadata(file_path))
            elif file_path.suffix.lower() == '.parquet':
                metadata.update(self._extract_parquet_metadata(file_path))
            
            self.logger.info(f"Extracted metadata for: {file_path.name}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"Failed to extract metadata from {file_path}: {str(e)}")
            return {
                'file_path': str(file_path),
                'error': str(e),
                'extraction_time': datetime.now().isoformat()
            }
    
    def _calculate_checksum(self, file_path: Path, algorithm: str = 'md5') -> str:
        """Calculate file checksum."""
        hash_func = hashlib.new(algorithm)
        
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_func.update(chunk)
            return hash_func.hexdigest()
        except Exception as e:
            self.logger.error(f"Failed to calculate checksum for {file_path}: {str(e)}")
            return None
    
    def _extract_csv_metadata(self, file_path: Path) -> Dict:
        """Extract metadata specific to CSV files."""
        try:
            # Read just the first few rows to get column info without loading entire file
            df_sample = pd.read_csv(file_path, nrows=5)
            
            # Get full row count efficiently
            with open(file_path, 'rb') as f:
                row_count = sum(1 for _ in f) - 1  # Subtract header row
            
            return {
                'row_count': row_count,
                'column_count': len(df_sample.columns),
                'column_names': df_sample.columns.tolist(),
                'data_types': df_sample.dtypes.astype(str).to_dict()
            }
        except Exception as e:
            self.logger.error(f"Failed to extract CSV metadata from {file_path}: {str(e)}")
            return {'csv_error': str(e)}
    
    def _extract_excel_metadata(self, file_path: Path) -> Dict:
        """Extract metadata specific to Excel files."""
        try:
            # Read Excel file info
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            
            sheets_info = {}
            for sheet in sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
                sheets_info[sheet] = {
                    'row_count': len(pd.read_excel(file_path, sheet_name=sheet)),
                    'column_count': len(df.columns),
                    'column_names': df.columns.tolist(),
                    'data_types': df.dtypes.astype(str).to_dict()
                }
            
            return {
                'sheet_count': len(sheet_names),
                'sheet_names': sheet_names,
                'sheets_info': sheets_info
            }
        except Exception as e:
            self.logger.error(f"Failed to extract Excel metadata from {file_path}: {str(e)}")
            return {'excel_error': str(e)}
    
    def _extract_json_metadata(self, file_path: Path) -> Dict:
        """Extract metadata specific to JSON files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, list):
                return {
                    'json_type': 'array',
                    'record_count': len(data),
                    'sample_keys': list(data[0].keys()) if data and isinstance(data[0], dict) else None
                }
            elif isinstance(data, dict):
                return {
                    'json_type': 'object',
                    'top_level_keys': list(data.keys())
                }
            else:
                return {'json_type': type(data).__name__}
                
        except Exception as e:
            self.logger.error(f"Failed to extract JSON metadata from {file_path}: {str(e)}")
            return {'json_error': str(e)}
    
    def _extract_parquet_metadata(self, file_path: Path) -> Dict:
        """Extract metadata specific to Parquet files."""
        try:
            df = pd.read_parquet(file_path)
            return {
                'row_count': len(df),
                'column_count': len(df.columns),
                'column_names': df.columns.tolist(),
                'data_types': df.dtypes.astype(str).to_dict()
            }
        except Exception as e:
            self.logger.error(f"Failed to extract Parquet metadata from {file_path}: {str(e)}")
            return {'parquet_error': str(e)}


class IngestionLogger:
    """Handles logging of ingestion activities and metadata."""
    
    def __init__(self, log_directory: str = './logs'):
        """
        Initialize IngestionLogger.
        
        Args:
            log_directory: Directory to store log files
        """
        self.log_directory = Path(log_directory)
        self.log_directory.mkdir(exist_ok=True)
        
        # Set up file logging
        self.setup_logging()
        self.logger = logging.getLogger(__name__)
        
        # Metadata storage
        self.metadata_file = self.log_directory / 'ingestion_metadata.json'
        self.ingestion_log = self.log_directory / 'ingestion_history.json'
    
    def setup_logging(self):
        """Configure logging with both file and console handlers."""
        # Create formatters
        detailed_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        simple_formatter = logging.Formatter('%(levelname)s: %(message)s')
        
        # File handler
        log_file = self.log_directory / f'ingestion_{datetime.now().strftime("%Y%m%d")}.log'
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(detailed_formatter)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(simple_formatter)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)
        
        # Avoid duplicate handlers
        if not root_logger.handlers:
            root_logger.addHandler(file_handler)
            root_logger.addHandler(console_handler)
    
    def log_ingestion_start(self, session_id: str, files_detected: int):
        """Log the start of an ingestion session."""
        entry = {
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'event': 'ingestion_start',
            'files_detected': files_detected
        }
        self._append_to_log(entry)
        self.logger.info(f"Started ingestion session {session_id} with {files_detected} files")
    
    def log_file_processed(self, session_id: str, file_path: str, metadata: Dict, success: bool):
        """Log the processing of a single file."""
        entry = {
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'event': 'file_processed',
            'file_path': file_path,
            'success': success,
            'metadata': metadata
        }
        self._append_to_log(entry)
        
        if success:
            self.logger.info(f"Successfully processed: {Path(file_path).name}")
            self._store_metadata(metadata)
        else:
            self.logger.error(f"Failed to process: {Path(file_path).name}")
    
    def log_ingestion_complete(self, session_id: str, processed_count: int, failed_count: int):
        """Log the completion of an ingestion session."""
        entry = {
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'event': 'ingestion_complete',
            'processed_count': processed_count,
            'failed_count': failed_count
        }
        self._append_to_log(entry)
        self.logger.info(f"Completed ingestion session {session_id}: "
                        f"{processed_count} processed, {failed_count} failed")
    
    def _append_to_log(self, entry: Dict):
        """Append an entry to the ingestion history log."""
        try:
            # Load existing log or create new list
            if self.ingestion_log.exists():
                with open(self.ingestion_log, 'r') as f:
                    log_data = json.load(f)
            else:
                log_data = []
            
            # Append new entry
            log_data.append(entry)
            
            # Write back to file
            with open(self.ingestion_log, 'w') as f:
                json.dump(log_data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to append to ingestion log: {str(e)}")
    
    def _store_metadata(self, metadata: Dict):
        """Store file metadata for later retrieval."""
        try:
            # Load existing metadata or create new dict
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r') as f:
                    all_metadata = json.load(f)
            else:
                all_metadata = {}
            
            # Use file path as key
            file_key = metadata.get('file_path', 'unknown')
            all_metadata[file_key] = metadata
            
            # Write back to file
            with open(self.metadata_file, 'w') as f:
                json.dump(all_metadata, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to store metadata: {str(e)}")
    
    def get_ingestion_history(self, limit: int = 100) -> List[Dict]:
        """Retrieve ingestion history."""
        try:
            if self.ingestion_log.exists():
                with open(self.ingestion_log, 'r') as f:
                    log_data = json.load(f)
                return log_data[-limit:] if limit else log_data
            return []
        except Exception as e:
            self.logger.error(f"Failed to retrieve ingestion history: {str(e)}")
            return []
    
    def get_file_metadata(self, file_path: str = None) -> Dict:
        """Retrieve stored metadata for files."""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r') as f:
                    all_metadata = json.load(f)
                
                if file_path:
                    return all_metadata.get(file_path, {})
                return all_metadata
            return {}
        except Exception as e:
            self.logger.error(f"Failed to retrieve metadata: {str(e)}")
            return {}


class DataIngestionPipeline:
    """Main pipeline orchestrating the data ingestion process."""
    
    def __init__(self, watch_directories: List[str] = None, log_directory: str = './logs'):
        """
        Initialize the data ingestion pipeline.
        
        Args:
            watch_directories: Directories to monitor for files
            log_directory: Directory for logs and metadata storage
        """
        self.file_detector = FileDetector(watch_directories)
        self.metadata_extractor = MetadataExtractor()
        self.ingestion_logger = IngestionLogger(log_directory)
        self.logger = logging.getLogger(__name__)
    
    def run_ingestion(self, recursive: bool = True) -> Dict:
        """
        Run a complete ingestion cycle.
        
        Args:
            recursive: Whether to search subdirectories recursively
            
        Returns:
            Summary of ingestion results
        """
        session_id = f"ingestion_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Detect files
            detected_files = self.file_detector.detect_files(recursive=recursive)
            self.ingestion_logger.log_ingestion_start(session_id, len(detected_files))
            
            # Process each file
            processed_count = 0
            failed_count = 0
            results = []
            
            for file_path in detected_files:
                try:
                    # Extract metadata
                    metadata = self.metadata_extractor.extract_metadata(file_path)
                    
                    # Check if extraction was successful
                    success = 'error' not in metadata
                    
                    # Log the processing
                    self.ingestion_logger.log_file_processed(
                        session_id, str(file_path), metadata, success
                    )
                    
                    # Update counters
                    if success:
                        processed_count += 1
                    else:
                        failed_count += 1
                    
                    results.append({
                        'file_path': str(file_path),
                        'success': success,
                        'metadata': metadata
                    })
                    
                except Exception as e:
                    failed_count += 1
                    error_msg = f"Unexpected error processing {file_path}: {str(e)}"
                    self.logger.error(error_msg)
                    
                    results.append({
                        'file_path': str(file_path),
                        'success': False,
                        'error': error_msg
                    })
            
            # Log completion
            self.ingestion_logger.log_ingestion_complete(session_id, processed_count, failed_count)
            
            # Return summary
            summary = {
                'session_id': session_id,
                'total_files': len(detected_files),
                'processed_count': processed_count,
                'failed_count': failed_count,
                'results': results
            }
            
            return summary
            
        except Exception as e:
            self.logger.error(f"Critical error in ingestion pipeline: {str(e)}")
            return {
                'session_id': session_id,
                'error': str(e),
                'total_files': 0,
                'processed_count': 0,
                'failed_count': 0
            }


def main():
    """Main entry point for the ingestion script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Data Ingestion Pipeline')
    parser.add_argument('--directories', nargs='+', default=['./data/incoming'],
                       help='Directories to scan for files')
    parser.add_argument('--log-dir', default='./logs',
                       help='Directory for logs and metadata')
    parser.add_argument('--no-recursive', action='store_true',
                       help='Disable recursive directory scanning')
    
    args = parser.parse_args()
    
    # Create pipeline
    pipeline = DataIngestionPipeline(
        watch_directories=args.directories,
        log_directory=args.log_dir
    )
    
    # Run ingestion
    results = pipeline.run_ingestion(recursive=not args.no_recursive)
    
    # Print summary
    print(f"\n{'='*50}")
    print("INGESTION SUMMARY")
    print(f"{'='*50}")
    print(f"Session ID: {results['session_id']}")
    print(f"Total Files: {results['total_files']}")
    print(f"Successfully Processed: {results['processed_count']}")
    print(f"Failed: {results['failed_count']}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()