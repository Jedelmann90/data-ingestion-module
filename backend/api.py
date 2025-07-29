#!/usr/bin/env python3
"""
FastAPI server for file upload and ingestion management.
"""

import os
import shutil
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from main import DataIngestionPipeline, IngestionLogger

app = FastAPI(title="Data Ingestion API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
UPLOAD_DIR = Path("data/incoming")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

pipeline = DataIngestionPipeline(
    watch_directories=[str(UPLOAD_DIR)],
    log_directory="./logs"
)

@app.post("/upload", response_model=Dict[str, Any])
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload files to the ingestion directory and trigger processing.
    """
    try:
        uploaded_files = []
        
        # Save uploaded files
        for file in files:
            if not file.filename:
                continue
                
            file_path = UPLOAD_DIR / file.filename
            
            # Save file to disk
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            uploaded_files.append({
                "filename": file.filename,
                "size": len(content),
                "path": str(file_path)
            })
        
        # Trigger ingestion pipeline
        results = pipeline.run_ingestion(recursive=False)
        
        return {
            "success": True,
            "message": f"Successfully uploaded {len(uploaded_files)} files",
            "uploaded_files": uploaded_files,
            "ingestion_results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/metadata", response_model=Dict[str, Any])
async def get_metadata():
    """
    Get all file metadata from the ingestion logger.
    """
    try:
        logger = IngestionLogger("./logs")
        metadata = logger.get_file_metadata()
        return {
            "success": True,
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metadata: {str(e)}")

@app.get("/logs", response_model=Dict[str, Any])
async def get_ingestion_logs(limit: int = 100):
    """
    Get ingestion logs.
    """
    try:
        logger = IngestionLogger("./logs")
        logs = logger.get_ingestion_history(limit=limit)
        return {
            "success": True,
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")

@app.post("/trigger-ingestion", response_model=Dict[str, Any])
async def trigger_ingestion():
    """
    Manually trigger the ingestion pipeline.
    """
    try:
        results = pipeline.run_ingestion(recursive=False)
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "healthy", "message": "Data Ingestion API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)