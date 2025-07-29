import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

interface IngestionLogEntry {
  session_id: string;
  timestamp: string;
  event: 'ingestion_start' | 'file_processed' | 'ingestion_complete';
  file_path?: string;
  success?: boolean;
  files_detected?: number;
  processed_count?: number;
  failed_count?: number;
  metadata?: any;
}

interface IngestionLogsTableProps {
  logs: IngestionLogEntry[];
}

const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

const getEventIcon = (event: string, success?: boolean) => {
  switch (event) {
    case 'ingestion_start':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'file_processed':
      return success ? 
        <CheckCircle className="h-4 w-4 text-green-500" /> : 
        <XCircle className="h-4 w-4 text-red-500" />;
    case 'ingestion_complete':
      return <Activity className="h-4 w-4 text-purple-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

const getEventBadge = (event: string, success?: boolean) => {
  switch (event) {
    case 'ingestion_start':
      return <Badge variant="secondary">Started</Badge>;
    case 'file_processed':
      return success ? 
        <Badge variant="success">Processed</Badge> : 
        <Badge variant="destructive">Failed</Badge>;
    case 'ingestion_complete':
      return <Badge variant="default">Completed</Badge>;
    default:
      return <Badge variant="outline">{event}</Badge>;
  }
};

const getFileName = (filePath?: string): string => {
  if (!filePath) return '-';
  return filePath.split('/').pop() || filePath;
};

export const IngestionLogsTable: React.FC<IngestionLogsTableProps> = ({ logs }) => {
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Ingestion Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Time</TableHead>
              <TableHead className="w-[100px]">Event</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="w-[150px]">Session ID</TableHead>
              <TableHead className="w-[100px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No ingestion logs available
                </TableCell>
              </TableRow>
            ) : (
              sortedLogs.map((log, index) => (
                <TableRow key={`${log.session_id}-${index}`}>
                  <TableCell className="text-sm">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEventIcon(log.event, log.success)}
                      {getEventBadge(log.event, log.success)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {getFileName(log.file_path)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.session_id.replace('ingestion_', '')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.event === 'ingestion_start' && log.files_detected && (
                      <span>{log.files_detected} files detected</span>
                    )}
                    {log.event === 'ingestion_complete' && 
                     log.processed_count !== undefined && 
                     log.failed_count !== undefined && (
                      <span>
                        {log.processed_count} ✓ / {log.failed_count} ✗
                      </span>
                    )}
                    {log.event === 'file_processed' && log.metadata && (
                      <span className="text-muted-foreground">
                        {log.metadata.file_size && `${Math.round(log.metadata.file_size / 1024)}KB`}
                        {log.metadata.row_count && ` • ${log.metadata.row_count} rows`}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};