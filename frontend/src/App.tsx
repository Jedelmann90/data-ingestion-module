import React, { useState, useEffect } from 'react';
import { FileMetadataCard } from './components/FileMetadataCard';
import { IngestionLogsTable } from './components/IngestionLogsTable';
import { FileUpload } from './components/FileUpload';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { RefreshCw, Database, FileText, Activity, Upload, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { APIService } from './services/api';

// Mock data structure matching our backend
const mockMetadata = {
  "data/incoming/sample_data.csv": {
    "file_path": "data/incoming/sample_data.csv",
    "file_name": "sample_data.csv",
    "file_size": 182,
    "file_extension": ".csv",
    "created_time": "2025-07-29T12:28:13.580989",
    "modified_time": "2025-07-29T12:28:13.368017",
    "checksum": "dbb7f39b77dcd4aa9735e162235f40c4",
    "extraction_time": "2025-07-29T12:28:42.764819",
    "row_count": 5,
    "column_count": 5,
    "column_names": ["id", "name", "age", "city", "salary"],
    "data_types": {
      "id": "int64",
      "name": "object",
      "age": "int64",
      "city": "object",
      "salary": "int64"
    }
  },
  "data/incoming/test_config.json": {
    "file_path": "data/incoming/test_config.json",
    "file_name": "test_config.json",
    "file_size": 344,
    "file_extension": ".json",
    "created_time": "2025-07-29T12:28:27.313732",
    "modified_time": "2025-07-29T12:28:27.153919",
    "checksum": "959525435ef28c65939b614ab275006d",
    "extraction_time": "2025-07-29T12:28:42.764389",
    "json_type": "object",
    "top_level_keys": ["database", "settings", "users"]
  }
};

const mockLogs = [
  {
    "session_id": "ingestion_20250729_122842",
    "timestamp": "2025-07-29T12:28:42.764055",
    "event": "ingestion_start" as const,
    "files_detected": 2
  },
  {
    "session_id": "ingestion_20250729_122842",
    "timestamp": "2025-07-29T12:28:42.764460",
    "event": "file_processed" as const,
    "file_path": "data/incoming/test_config.json",
    "success": true,
    "metadata": mockMetadata["data/incoming/test_config.json"]
  },
  {
    "session_id": "ingestion_20250729_122842",
    "timestamp": "2025-07-29T12:28:42.766641",
    "event": "file_processed" as const,
    "file_path": "data/incoming/sample_data.csv",
    "success": true,
    "metadata": mockMetadata["data/incoming/sample_data.csv"]
  },
  {
    "session_id": "ingestion_20250729_122842",
    "timestamp": "2025-07-29T12:28:42.766939",
    "event": "ingestion_complete" as const,
    "processed_count": 2,
    "failed_count": 0
  }
];

function App() {
  const [metadata, setMetadata] = useState<Record<string, any>>(mockMetadata);
  const [logs, setLogs] = useState<any[]>(mockLogs);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showUpload, setShowUpload] = useState(false);
  const [recentlyUploaded, setRecentlyUploaded] = useState<string[]>([]);
  const [showOlderFiles, setShowOlderFiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  const metadataEntries = Object.values(metadata);
  const totalFiles = metadataEntries.length;
  const totalSize = metadataEntries.reduce((sum, file) => sum + file.file_size, 0);

  // Check API connection on mount
  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      await APIService.healthCheck();
      setApiConnected(true);
      loadData();
    } catch (error) {
      console.log('API not available, using mock data');
      setApiConnected(false);
    }
  };

  const loadData = async () => {
    if (!apiConnected) return;
    
    try {
      setLoading(true);
      const [metadataResponse, logsResponse] = await Promise.all([
        APIService.getMetadata(),
        APIService.getLogs()
      ]);
      
      if (metadataResponse.success) {
        setMetadata(metadataResponse.metadata);
      }
      
      if (logsResponse.success) {
        setLogs(logsResponse.logs);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (apiConnected) {
      await loadData();
    } else {
      setLastRefresh(new Date());
      console.log('Refreshing data...');
    }
  };

  const handleFilesUploaded = async (files: File[]) => {
    if (!apiConnected) {
      alert('API not connected. Please start the backend server (python backend/api.py) to enable real file uploads.');
      return;
    }

    try {
      setLoading(true);
      const response = await APIService.uploadFiles(files);
      
      if (response.success) {
        // Mark these files as recently uploaded
        const uploadedPaths = response.uploaded_files.map(f => f.path);
        setRecentlyUploaded(uploadedPaths);
        
        // Refresh data to show new files
        await loadData();
        
        // Auto-hide upload area and show results
        setShowUpload(false);
        
        alert(`Successfully uploaded and processed ${files.length} file(s)!`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Ingestion Dashboard</h1>
                <p className="text-sm text-gray-500">Monitor file processing and metadata extraction</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-500">
                  {apiConnected ? 'API Connected' : 'Mock Data'} • Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                <Upload className="h-4 w-4" />
                Upload Files
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload Section */}
        {showUpload && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Files</h2>
            <FileUpload onFilesUploaded={handleFilesUploaded} />
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFiles}</div>
              <p className="text-xs text-muted-foreground">
                Files processed
              </p>
              {!showUpload && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-3 w-3" />
                  Add files
                </button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
              <p className="text-xs text-muted-foreground">
                Data processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">
                Active ingestion sessions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* File Metadata Section */}
        <div className="mb-8">
          {/* Recently Uploaded Files */}
          {recentlyUploaded.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Recently Uploaded Files ({recentlyUploaded.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {metadataEntries
                  .filter(file => recentlyUploaded.includes(file.file_path))
                  .map((file, index) => (
                    <div key={file.file_path || index} className="ring-2 ring-green-200 rounded-xl">
                      <FileMetadataCard metadata={file} />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All Files or Older Files */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {recentlyUploaded.length > 0 ? 'Previous Files' : 'File Metadata'}
                {recentlyUploaded.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({metadataEntries.filter(file => !recentlyUploaded.includes(file.file_path)).length})
                  </span>
                )}
              </h2>
              {recentlyUploaded.length > 0 && (
                <button
                  onClick={() => setShowOlderFiles(!showOlderFiles)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50"
                >
                  {showOlderFiles ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide Previous Files
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show Previous Files
                    </>
                  )}
                </button>
              )}
            </div>

            {(recentlyUploaded.length === 0 || showOlderFiles) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {metadataEntries
                  .filter(file => recentlyUploaded.length === 0 || !recentlyUploaded.includes(file.file_path))
                  .map((file, index) => (
                    <FileMetadataCard key={file.file_path || index} metadata={file} />
                  ))}
              </div>
            )}

            {metadataEntries.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No files have been processed yet</p>
                  <p className="text-sm text-gray-400">
                    {apiConnected 
                      ? 'Upload files using the button above to see metadata here' 
                      : 'Start the backend server and upload files to see real metadata'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Ingestion Logs Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingestion Logs</h2>
          <IngestionLogsTable logs={logs} />
        </div>
      </main>
    </div>
  );
}

export default App;
