import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { FileText, Database, Hash, Calendar, BarChart3 } from 'lucide-react';

interface FileMetadata {
  file_path: string;
  file_name: string;
  file_size: number;
  file_extension: string;
  created_time: string;
  modified_time: string;
  checksum: string;
  extraction_time: string;
  row_count?: number;
  column_count?: number;
  column_names?: string[];
  data_types?: Record<string, string>;
  json_type?: string;
  top_level_keys?: string[];
  sheet_count?: number;
  sheet_names?: string[];
}

interface FileMetadataCardProps {
  metadata: FileMetadata;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

const getFileTypeColor = (extension: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" => {
  switch (extension.toLowerCase()) {
    case '.csv':
    case '.tsv':
      return 'success';
    case '.xlsx':
    case '.xls':
      return 'warning';
    case '.json':
      return 'secondary';
    case '.parquet':
      return 'default';
    default:
      return 'outline';
  }
};

export const FileMetadataCard: React.FC<FileMetadataCardProps> = ({ metadata }) => {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {metadata.file_name}
          </CardTitle>
          <Badge variant={getFileTypeColor(metadata.file_extension)}>
            {metadata.file_extension.toUpperCase().substring(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic File Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Size: {formatFileSize(metadata.file_size)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono text-xs">{metadata.checksum?.substring(0, 8)}...</span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Modified: {formatDate(metadata.modified_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Processed: {formatDate(metadata.extraction_time)}</span>
          </div>
        </div>

        {/* Data-specific information */}
        {metadata.row_count !== undefined && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Data Information</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Rows: {metadata.row_count?.toLocaleString()}</span>
              <span>Columns: {metadata.column_count}</span>
            </div>
            
            {metadata.column_names && metadata.column_names.length > 0 && (
              <div className="mt-2">
                <span className="text-sm font-medium">Columns:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {metadata.column_names.slice(0, 6).map((col, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                  {metadata.column_names.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{metadata.column_names.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* JSON-specific information */}
        {metadata.json_type && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">JSON Structure</span>
            </div>
            <div className="text-sm">
              <span>Type: {metadata.json_type}</span>
              {metadata.top_level_keys && (
                <div className="mt-1">
                  <span className="font-medium">Keys:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {metadata.top_level_keys.map((key, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Excel-specific information */}
        {metadata.sheet_count && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Excel Workbook</span>
            </div>
            <div className="text-sm">
              <span>Sheets: {metadata.sheet_count}</span>
              {metadata.sheet_names && (
                <div className="mt-1">
                  <div className="flex flex-wrap gap-1">
                    {metadata.sheet_names.map((sheet, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {sheet}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};