const API_BASE_URL = 'http://localhost:8000';

export interface UploadResponse {
  success: boolean;
  message: string;
  uploaded_files: Array<{
    filename: string;
    size: number;
    path: string;
  }>;
  ingestion_results: {
    session_id: string;
    total_files: number;
    processed_count: number;
    failed_count: number;
    results: Array<{
      file_path: string;
      success: boolean;
      metadata?: any;
      error?: string;
    }>;
  };
}

export interface MetadataResponse {
  success: boolean;
  metadata: Record<string, any>;
}

export interface LogsResponse {
  success: boolean;
  logs: Array<{
    session_id: string;
    timestamp: string;
    event: string;
    file_path?: string;
    success?: boolean;
    files_detected?: number;
    processed_count?: number;
    failed_count?: number;
    metadata?: any;
  }>;
}

export class APIService {
  static async uploadFiles(files: File[]): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  static async getMetadata(): Promise<MetadataResponse> {
    const response = await fetch(`${API_BASE_URL}/metadata`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    return response.json();
  }

  static async getLogs(limit = 100): Promise<LogsResponse> {
    const response = await fetch(`${API_BASE_URL}/logs?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    return response.json();
  }

  static async triggerIngestion(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/trigger-ingestion`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger ingestion: ${response.statusText}`);
    }

    return response.json();
  }

  static async healthCheck(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }
}