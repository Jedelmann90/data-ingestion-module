import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  preview?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  error?: string | null;
}

interface FileUploadProps {
  onFilesUploaded?: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  maxFiles?: number;
}

const SUPPORTED_TYPES = [
  '.csv', '.tsv', '.xlsx', '.xls', '.json', '.parquet', '.txt'
];

const MIME_TYPE_MAP: Record<string, string[]> = {
  '.csv': ['text/csv', 'application/csv'],
  '.tsv': ['text/tab-separated-values'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.xls': ['application/vnd.ms-excel'],
  '.json': ['application/json', 'text/json'],
  '.parquet': ['application/octet-stream'],
  '.txt': ['text/plain']
};

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  acceptedTypes = SUPPORTED_TYPES,
  maxFileSize = 50, // 50MB default
  maxFiles = 10
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (filename: string): string => {
    return '.' + filename.split('.').pop()?.toLowerCase();
  };

  const isFileTypeSupported = (file: File): boolean => {
    const extension = getFileExtension(file.name);
    const mimeTypes = MIME_TYPE_MAP[extension] || [];
    
    return acceptedTypes.includes(extension) && 
           (mimeTypes.length === 0 || mimeTypes.includes(file.type));
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    if (!isFileTypeSupported(file)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check max files limit
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: UploadedFile[] = fileArray.map(file => {
      const error = validateFile(file);
      
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: error ? 'error' : 'pending',
        error,
        preview: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate processing
    newFiles.forEach(uploadedFile => {
      if (!uploadedFile.error) {
        // Simulate processing delay
        setTimeout(() => {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id 
                ? { ...f, status: 'processing' }
                : f
            )
          );
          
          // Simulate completion
          setTimeout(() => {
            setUploadedFiles(prev => 
              prev.map(f => 
                f.id === uploadedFile.id 
                  ? { ...f, status: 'completed' }
                  : f
              )
            );
          }, 1000 + Math.random() * 2000);
        }, 500);
      }
    });

    // Call parent callback
    const validFiles = newFiles.filter(f => !f.error).map(f => f.file);
    if (validFiles.length > 0 && onFilesUploaded) {
      onFilesUploaded(validFiles);
    }
  }, [uploadedFiles.length, maxFiles, maxFileSize, acceptedTypes, onFilesUploaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearAllFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  const getStatusIcon = (status: UploadedFile['status'], hasError: boolean) => {
    if (hasError) return <AlertCircle className="h-4 w-4 text-red-500" />;
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status'], hasError: boolean) => {
    if (hasError) return <Badge variant="destructive">Error</Badge>;
    
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Drop files here or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports: {acceptedTypes.join(', ')} (max {maxFileSize}MB each)
              </p>
              <input
                type="file"
                multiple
                accept={acceptedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Select Files
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
              <button
                onClick={clearAllFiles}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((uploadedFile) => (
                <div
                  key={uploadedFile.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(uploadedFile.status, !!uploadedFile.error)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {uploadedFile.preview?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(uploadedFile.preview?.size || 0)}
                        {uploadedFile.error && (
                          <span className="text-red-500 ml-2">
                            • {uploadedFile.error}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(uploadedFile.status, !!uploadedFile.error)}
                    <button
                      onClick={() => removeFile(uploadedFile.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};