import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'sent' | 'received' | 'system' | 'error';
  data: string;
  format: 'utf8' | 'hex';
}

interface MergedLogEntry extends LogEntry {
  portLabel: string;
}

interface TerminalCoreProps {
  logs: LogEntry[];
  portLabel: string;
  portIndex: number;
  stats: { sentBytes: number; receivedBytes: number; totalLogs: number };
  displayFormat: 'utf8' | 'hex';
  showTimestamp: boolean;
  onClearLogs: () => void;
  terminalRef: (ref: HTMLDivElement | null) => void;
}

export const TerminalCore: React.FC<TerminalCoreProps> = ({
  logs,
  portLabel,
  portIndex,
  stats,
  displayFormat,
  showTimestamp,
  onClearLogs,
  terminalRef
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  // Terminal styling utilities
  const getLineHeight = () => {
    switch (settings.terminalLineHeight) {
      case 'compact': return '1.2';
      case 'normal': return '1.5';
      case 'loose': return '1.8';
      default: return '1.2';
    }
  };

  const getTextColor = (logType: LogEntry['type']) => {
    if (settings.terminalColorMode === 'black') {
      return 'text-foreground';
    }
    
    // By type coloring
    switch (logType) {
      case 'sent': return 'text-blue-600 dark:text-blue-400';
      case 'received': return 'text-green-600 dark:text-green-400';
      case 'system': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-foreground';
    }
  };

  const getBadgeContent = (logType: LogEntry['type']) => {
    switch (logType) {
      case 'sent': return '[TX]';
      case 'received': return '[RX]'; 
      case 'system': return '[SYS]';
      default: return '[?]';
    }
  };

  // 格式化显示数据
  const formatData = (data: string, format: 'utf8' | 'hex', originalFormat: 'utf8' | 'hex') => {
    if (format === originalFormat) {
      return data;
    }

    if (format === 'hex' && originalFormat === 'utf8') {
      // UTF-8 转 HEX
      return Array.from(data)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ').toUpperCase();
    } else if (format === 'utf8' && originalFormat === 'hex') {
      // HEX 转 UTF-8
      try {
        const hexData = data.replace(/\s/g, '');
        const bytes = [];
        for (let i = 0; i < hexData.length; i += 2) {
          const hex = hexData.substr(i, 2);
          bytes.push(parseInt(hex, 16));
        }
        const uint8Array = new Uint8Array(bytes);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        return decoder.decode(uint8Array);
      } catch {
        return data; // 转换失败时返回原数据
      }
    }
    return data;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {portLabel}
            <Badge variant="outline" className="text-xs">
              {stats.totalLogs}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>↑{stats.sentBytes}</span>
            <span>↓{stats.receivedBytes}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLogs}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div
          ref={terminalRef}
          className="h-full overflow-y-auto px-3 pb-3 font-mono text-xs"
          style={{ 
            lineHeight: getLineHeight()
          }}
        >
          {logs.map((log, index) => (
            <div
              key={`${log.id}-${index}`}
              className={`flex gap-2 py-0.5 ${getTextColor(log.type)}`}
            >
              {showTimestamp && (
                <span className="text-muted-foreground whitespace-nowrap">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>
              )}
              <Badge 
                variant="outline" 
                className={`h-4 text-xs px-1 shrink-0 ${
                  log.type === 'sent' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  log.type === 'received' ? 'bg-green-50 text-green-600 border-green-200' :
                  'bg-yellow-50 text-yellow-600 border-yellow-200'
                }`}
              >
                {getBadgeContent(log.type)}
              </Badge>
              <span className="break-all flex-1">
                {formatData(log.data, displayFormat, log.format)}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {t('terminal.noData')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};