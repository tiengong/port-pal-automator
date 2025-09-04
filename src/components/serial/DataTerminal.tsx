import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Send, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw,
  Play, 
  Square,
  Clock,
  FileText,
  ArrowUp,
  ArrowDown,
  Copy,
  Link,
  Columns,
  Merge,
  ArrowLeftRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSerialManager } from "@/hooks/useSerialManager";
import { eventBus, EVENTS, SerialDataEvent, SendCommandEvent } from "@/lib/eventBus";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";

interface DataTerminalProps {
  serialManager: ReturnType<typeof useSerialManager>;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

interface MergedLogEntry extends LogEntry {
  portLabel: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'sent' | 'received' | 'system' | 'error';
  data: string;
  format: 'utf8' | 'hex';
}

export const DataTerminal: React.FC<DataTerminalProps> = ({
  serialManager,
  statusMessages
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [logs, setLogs] = useState<{ [portIndex: number]: LogEntry[] }>({});
  const [mergedLogs, setMergedLogs] = useState<MergedLogEntry[]>([]);
  const [sendData, setSendData] = useState("");
  const [sendFormat, setSendFormat] = useState<'utf8' | 'hex'>('utf8');
  const [displayFormat, setDisplayFormat] = useState<'utf8' | 'hex'>('utf8');
  const [newlineMode, setNewlineMode] = useState<'none' | 'lf' | 'cr' | 'crlf'>('crlf');
  const [autoSend, setAutoSend] = useState(false);
  const [autoSendInterval, setAutoSendInterval] = useState(1000);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [selectedSendPort, setSelectedSendPort] = useState<'ALL' | 'P1' | 'P2'>('ALL');
  const [synchronizedScrolling, setSynchronizedScrolling] = useState(true);
  
  const connectedPorts = serialManager.getConnectedPorts();
  const connectedPortLabels = serialManager.ports.filter(p => p.connected);
  const { strategy } = serialManager;
  
  const terminalRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const readersRef = useRef<Map<any, ReadableStreamDefaultReader>>(new Map());

  // 统计信息
  const [stats, setStats] = useState<{ [portIndex: number]: { sentBytes: number; receivedBytes: number; totalLogs: number } }>({});

  // 同步设置到组件状态
  useEffect(() => {
    setDisplayFormat(settings.displayFormat);
    setShowTimestamp(settings.showTimestamp);
    setAutoSendInterval(settings.defaultAutoSendInterval);
  }, [settings.displayFormat, settings.showTimestamp, settings.defaultAutoSendInterval]);

  // 添加日志条目 - 只记录发送和接收的UART数据
  const addLog = (type: LogEntry['type'], data: string, format: 'utf8' | 'hex' = displayFormat, portIndex?: number) => {
    // 只记录发送和接收的数据，不记录系统消息
    if (type !== 'sent' && type !== 'received') return;
    
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      data,
      format
    };
    
    if (portIndex !== undefined) {
      // 更新分端口日志
      setLogs(prev => {
        const newPortLogs = [...(prev[portIndex] || []), entry];
        // 应用最大日志行数限制
        const limitedLogs = newPortLogs.slice(-settings.maxLogLines);
        return {
          ...prev,
          [portIndex]: limitedLogs
        };
      });
      
      // 更新合并日志（用于 MERGED_TXRX 模式）
      const portLabel = connectedPortLabels[portIndex]?.label || `${t('terminal.port')} ${portIndex + 1}`;
      const mergedEntry: MergedLogEntry = {
        ...entry,
        portLabel
      };
      setMergedLogs(prev => {
        const newMergedLogs = [...prev, mergedEntry];
        // 应用最大日志行数限制
        return newMergedLogs.slice(-settings.maxLogLines);
      });
      
      setStats(prev => ({
        ...prev,
        [portIndex]: {
          totalLogs: (prev[portIndex]?.totalLogs || 0) + 1,
          receivedBytes: type === 'received' ? (prev[portIndex]?.receivedBytes || 0) + data.length : (prev[portIndex]?.receivedBytes || 0),
          sentBytes: type === 'sent' ? (prev[portIndex]?.sentBytes || 0) + data.length : (prev[portIndex]?.sentBytes || 0)
        }
      }));
    }

    // 自动滚动到底部（仅当启用自动滚动时）
    if (settings.autoScroll) {
      setTimeout(() => {
        if (synchronizedScrolling && connectedPorts.length > 1) {
          // 同步滚动所有终端
          terminalRefs.current.forEach(ref => {
            if (ref) {
              ref.scrollTo({
                top: ref.scrollHeight,
                behavior: 'smooth'
              });
            }
          });
        } else if (portIndex !== undefined && terminalRefs.current[portIndex]) {
          // 只滚动特定终端
          terminalRefs.current[portIndex]!.scrollTo({
            top: terminalRefs.current[portIndex]!.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  };

  // 开始监听数据
  const startReading = async (port: any, portIndex: number) => {
    // 检查是否在演示模式
    if (!serialManager.serialManager.isSupported()) {
      console.log('Demo mode: Skipping port reading setup');
      return;
    }

    if (readersRef.current.has(port)) return;

    try {
      const reader = port.readable.getReader();
      readersRef.current.set(port, reader);

      while (port.readable) {
        try {
          const { value, done } = await reader.read();
          
          if (done) break;
          
          if (value) {
            // 将接收到的数据转换为字符串
            const decoder = new TextDecoder();
            const text = decoder.decode(value);
            
            addLog('received', text, displayFormat, portIndex);
            
            // 发送数据到事件总线
            const portLabel = connectedPortLabels[portIndex]?.label || `${t('terminal.port')} ${portIndex + 1}`;
            const serialEvent: SerialDataEvent = {
              portIndex,
              portLabel,
              data: text,
              timestamp: new Date(),
              type: 'received'
            };
            eventBus.emit(EVENTS.SERIAL_DATA_RECEIVED, serialEvent);
          }
        } catch (error) {
          if ((error as any).name === 'NetworkError') {
            statusMessages?.addMessage(t('terminal.messages.deviceDisconnected'), 'error');
            // Find the port label and disconnect
            const portLabel = connectedPortLabels[portIndex]?.label;
            if (portLabel) {
              serialManager.disconnectPort(portLabel);
            }
            break;
          }
          console.error(t('terminal.messages.readDataError'), error);
        }
      }
    } catch (error) {
      // 在演示模式下，不显示错误消息
      if (serialManager.serialManager.isSupported()) {
        console.error(t('terminal.messages.cannotStartReading'), error);
        statusMessages?.addMessage(t('terminal.messages.cannotStartReading'), 'error');
      }
    }
  };

  // 停止监听数据
  const stopReading = async (port: any) => {
    const reader = readersRef.current.get(port);
    if (reader) {
      try {
        await reader.cancel();
        await reader.releaseLock();
      } catch (error) {
        console.error(t('terminal.messages.stopReadingFailed'), error);
      } finally {
        readersRef.current.delete(port);
      }
    }
  };

  // 发送数据到所有连接的端口
  const sendSerialData = async () => {
    console.log('sendSerialData called', { 
      sendData, 
      supported: serialManager.serialManager.isSupported(),
      connectedPorts: connectedPorts.length 
    });
    // 检查是否在演示模式（Web Serial API不可用）
    if (!serialManager.serialManager.isSupported()) {
      // 演示模式：模拟发送数据
      if (!sendData.trim()) {
        statusMessages?.addMessage(t('terminal.messages.noDataToSend'), 'warning');
        return;
      }
      
      let dataToSend = sendData;
      
      // 添加换行符
      switch (newlineMode) {
        case 'lf':
          dataToSend += '\n';
          break;
        case 'cr':
          dataToSend += '\r';
          break;
        case 'crlf':
          dataToSend += '\r\n';
          break;
      }
      
      // 模拟发送到演示端口
      addLog('sent', dataToSend, sendFormat, 0);
      statusMessages?.addMessage(t('terminal.messages.demoModeSent', { data: sendData }), 'info');
      
      // 模拟接收回复（延迟500ms）
      setTimeout(() => {
        const mockResponse = `Echo: ${sendData}`;
        addLog('received', mockResponse, 'utf8', 0);
      }, 500);
      
      return;
    }
    
    if (connectedPorts.length === 0) {
      statusMessages?.addMessage(t('terminal.notConnected'), 'warning');
      return;
    }

    let dataToSend = sendData;
    
    // 添加换行符
    switch (newlineMode) {
      case 'lf':
        dataToSend += '\n';
        break;
      case 'cr':
        dataToSend += '\r';
        break;
      case 'crlf':
        dataToSend += '\r\n';
        break;
    }

    // 根据格式转换数据
    let uint8Array: Uint8Array;
    
    if (sendFormat === 'hex') {
      // 处理十六进制数据
      const hexData = dataToSend.replace(/\s/g, ''); // 移除空格
      const bytes = [];
      for (let i = 0; i < hexData.length; i += 2) {
        const hex = hexData.substr(i, 2);
        if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
          throw new Error(t('terminal.messages.invalidHexData', { hex }));
        }
        bytes.push(parseInt(hex, 16));
      }
      uint8Array = new Uint8Array(bytes);
    } else {
      // UTF-8 数据
      const encoder = new TextEncoder();
      uint8Array = encoder.encode(dataToSend);
    }

    // 根据通信模式和选择发送到指定端口
    const portsToSend = (() => {
      // 在 MERGED_TXRX 模式下，使用 strategy.txPort 而不是 selectedSendPort
      const targetPort = strategy.communicationMode === 'MERGED_TXRX' ? strategy.txPort : selectedSendPort;
      
      if (targetPort === 'ALL') {
        return connectedPorts.map((portInfo, index) => ({ portInfo, index }));
      } else {
        return connectedPorts
          .map((portInfo, index) => ({ portInfo, index }))
          .filter((_, index) => {
            const portLabel = connectedPortLabels[index]?.label;
            return portLabel === targetPort;
          });
      }
    })();

    const sendPromises = portsToSend.map(async ({ portInfo, index }) => {
      try {
        const writer = portInfo.port.writable.getWriter();
        await writer.write(uint8Array);
        await writer.releaseLock();
        
        // 记录发送的数据到对应端口
        const portLabel = connectedPortLabels[index]?.label || `${t('terminal.port')} ${index + 1}`;
        addLog('sent', dataToSend, sendFormat, index);
        return { success: true, portLabel };
        } catch (error) {
        const portLabel = connectedPortLabels[index]?.label || `${t('terminal.port')} ${index + 1}`;
        console.error(t('terminal.messages.sendFailed', { portLabel }), error);
        statusMessages?.addMessage(t('terminal.messages.sendFailed', { portLabel, error: (error as Error).message }), 'error');
        return { success: false, portLabel };
      }
    });

    try {
      const results = await Promise.all(sendPromises);
      const successResults = results.filter(r => r.success);
      const successCount = successResults.length;

      if (successCount > 0) {
        const targetPort = strategy.communicationMode === 'MERGED_TXRX' ? strategy.txPort : selectedSendPort;
        const targetDesc = targetPort === 'ALL' 
          ? t('terminal.messages.sentBytesToPorts', { successCount, totalCount: portsToSend.length })
          : targetPort;
        
        statusMessages?.addMessage(t('terminal.messages.sentBytesToTarget', { bytes: uint8Array.length, target: targetDesc }), 'success');
      } else {
        statusMessages?.addMessage(t('terminal.messages.allPortsFailed'), 'error');
      }
    } catch (error) {
      statusMessages?.addMessage(t('terminal.messages.partialFailed'), 'error');
    }
  };

  // 自动发送控制
  const toggleAutoSend = () => {
    if (autoSend) {
      if (autoSendTimerRef.current) {
        clearInterval(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
      setAutoSend(false);
      statusMessages?.addMessage(t('terminal.messages.autoSendStopped'), 'info');
    } else {
      if (autoSendInterval < 10) {
        toast({
          title: t('terminal.intervalTooShort'),
          description: t('terminal.messages.intervalTooShort'),
          variant: "destructive"
        });
        return;
      }
      
      autoSendTimerRef.current = setInterval(() => {
        sendSerialData();
      }, autoSendInterval);
      
      setAutoSend(true);
      statusMessages?.addMessage(t('terminal.messages.autoSendStarted', { interval: autoSendInterval }), 'success');
    }
  };

  // 清空日志
  const clearLogs = (portIndex?: number) => {
    if (portIndex !== undefined) {
      // 清空特定端口的日志
      setLogs(prev => ({ ...prev, [portIndex]: [] }));
      setStats(prev => ({ ...prev, [portIndex]: { sentBytes: 0, receivedBytes: 0, totalLogs: 0 } }));
      statusMessages?.addMessage(`${t('terminal.port')} ${portIndex + 1} ${t('terminal.logsCleared')}`, 'success');
    } else {
      // 清空所有日志
      setLogs({});
      setMergedLogs([]);
      setStats({});
      statusMessages?.addMessage(t('terminal.logsCleared'), 'success');
    }
  };

  // 导出日志
  const exportLogs = () => {
    let content = '';
    Object.entries(logs).forEach(([portIndex, portLogs]) => {
      content += `=== ${t('terminal.port')} ${parseInt(portIndex) + 1} ===\n`;
      portLogs.forEach(log => {
        const timestamp = showTimestamp ? `[${log.timestamp.toLocaleTimeString()}] ` : '';
        const type = log.type === 'sent' ? t('terminal.sent') : log.type === 'received' ? t('terminal.received') : t('terminal.system');
        content += `${timestamp}${type}: ${log.data}\n`;
      });
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const totalLogs = Object.values(logs).reduce((sum, portLogs) => sum + portLogs.length, 0);
    toast({
      title: t('terminal.ui.exportLogsTitle'),
      description: t('terminal.messages.exportSuccess', { count: totalLogs }),
    });
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
        let result = '';
        for (let i = 0; i < hexData.length; i += 2) {
          const hex = hexData.substr(i, 2);
          const char = String.fromCharCode(parseInt(hex, 16));
          result += char.charCodeAt(0) < 32 ? `\\x${hex}` : char;
        }
        return result;
      } catch {
        return data; // 转换失败时返回原数据
      }
    }

    return data;
  };

  // 监听发送命令事件 - 使用 useRef 确保稳定的订阅
  const sendSerialDataRef = useRef(sendSerialData);
  
  // 更新 ref 中的函数引用
  useEffect(() => {
    sendSerialDataRef.current = sendSerialData;
  }, [sendSerialData]);
  
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SEND_COMMAND, (event: SendCommandEvent) => {
      console.log('[SEND_COMMAND] received', event);
      // 临时设置发送数据并执行发送
      setSendData(event.command);
      setSendFormat(event.format);
      setNewlineMode(event.lineEnding);
      if (event.targetPort) {
        setSelectedSendPort(event.targetPort);
      }
      
      // 延迟执行发送以确保状态更新
      setTimeout(() => {
        sendSerialDataRef.current();
      }, 50);
    });
    
    return unsubscribe;
  }, []);

  // 监听端口连接变化
  useEffect(() => {
    // 为新连接的端口启动数据监听
    connectedPorts.forEach(({ port }, index) => {
      if (!readersRef.current.has(port)) {
        startReading(port, index);
        statusMessages?.addMessage(t('terminal.messages.startListeningPort', { portNumber: index + 1 }), 'info');
      }
    });

      // 清理断开连接的端口
    const connectedPortSet = new Set(connectedPorts.map(p => p.port));
    for (const [port, reader] of readersRef.current.entries()) {
      if (!connectedPortSet.has(port)) {
        stopReading(port);
        statusMessages?.addMessage(t('terminal.messages.portDisconnected'), 'warning');
      }
    }

    // 初始化terminalRefs数组
    terminalRefs.current = new Array(connectedPorts.length).fill(null);
  }, [connectedPorts]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) {
        clearInterval(autoSendTimerRef.current);
      }
      // 停止所有数据读取
      for (const port of readersRef.current.keys()) {
        stopReading(port);
      }
    };
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 工具栏 */}
      <div className="p-4 border-b border-border">
        {/* 控制选项 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDisplayFormat(displayFormat === 'utf8' ? 'hex' : 'utf8')}
                className="w-16 font-mono"
              >
                {displayFormat === 'utf8' ? 'UTF-8' : displayFormat.toUpperCase()}
              </Button>
              
              <Button 
                variant={showTimestamp ? "default" : "outline"}
                size="sm" 
                onClick={() => setShowTimestamp(!showTimestamp)}
                className="w-8 h-8 p-0"
              >
                <Clock className="w-4 h-4" />
              </Button>

              {/* Display Mode Toggle - Only when P2 is connected */}
              {connectedPorts.length > 1 && (
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={strategy.communicationMode === 'COMPARE' ? "default" : "outline"}
                        size="sm" 
                        onClick={() => serialManager.updateStrategy({ 
                          communicationMode: strategy.communicationMode === 'COMPARE' ? 'MERGED_TXRX' : 'COMPARE' 
                        })}
                        className="flex items-center gap-1"
                      >
                        {strategy.communicationMode === 'COMPARE' ? (
                            <>
                              <Columns className="w-3 h-3" />
                              {t('terminal.ui.splitView')}
                            </>
                          ) : (
                            <>
                              <Merge className="w-3 h-3" />
                              {t('terminal.ui.mergedView')}
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{strategy.communicationMode === 'COMPARE' ? t('terminal.ui.toggleToMerged') : t('terminal.ui.toggleToSplit')}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* TX Port Controls for MERGED_TXRX mode */}
                  {strategy.communicationMode === 'MERGED_TXRX' && (
                    <>
                      <Select
                        value={strategy.txPort}
                        onValueChange={(value: 'ALL' | 'P1' | 'P2') => 
                          serialManager.updateStrategy({ txPort: value })
                        }
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t('terminal.ui.allPorts')}</SelectItem>
                          <SelectItem value="P1">P1</SelectItem>
                          <SelectItem value="P2">P2</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const swapped = strategy.txPort === 'P1' ? 'P2' : strategy.txPort === 'P2' ? 'P1' : 'P1';
                              serialManager.updateStrategy({ txPort: swapped });
                            }}
                            disabled={strategy.txPort === 'ALL'}
                            className="w-8 h-8 p-0"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('terminal.ui.swapTxRx')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              )}

              {connectedPorts.length > 1 && strategy.communicationMode === 'COMPARE' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={synchronizedScrolling ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSynchronizedScrolling(!synchronizedScrolling)}
                      className="w-8 h-8 p-0"
                    >
                      <Link className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('terminal.ui.synchronizedScrolling')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => clearLogs()} className="hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Clear All Logs</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear All Logs</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={exportLogs} className="hover:bg-accent">
                    <Download className="w-4 h-4" />
                    <span className="sr-only">Export Logs</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export Logs</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* 数据显示区域 */}
      <div className="flex-1 flex">
        {strategy.communicationMode === 'MERGED_TXRX' ? (
          // 合并 TX/RX 模式 - 单列显示所有数据
          <div className="flex-1 terminal-output p-4 overflow-y-auto custom-scrollbar font-mono text-sm">
            {mergedLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">{t('terminal.ui.waitingData')}</p>
              </div>
            ) : (
              mergedLogs.map((log) => (
                <div key={log.id} className="mb-1 flex items-start gap-2">
                  {showTimestamp && (
                    <span className="text-muted-foreground text-xs min-w-16">
                      {log.timestamp.toLocaleTimeString().slice(-8)}
                    </span>
                  )}
                  
                  <span className={`
                    text-xs px-1 py-0.5 rounded min-w-8 text-center border
                    ${log.portLabel === 'P1' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800' : ''}
                    ${log.portLabel === 'P2' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800' : ''}
                    ${log.portLabel === 'SYSTEM' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' : ''}
                  `}>
                    [{log.portLabel}]
                  </span>
                  
                  <span className={`
                    text-xs px-2 py-0.5 rounded min-w-12 text-center
                    ${log.type === 'sent' ? 'bg-primary/20 text-primary' : ''}
                    ${log.type === 'received' ? 'bg-success/20 text-success' : ''}
                    ${log.type === 'system' ? 'bg-muted text-muted-foreground' : ''}
                    ${log.type === 'error' ? 'bg-destructive/20 text-destructive' : ''}
                  `}>
                     {log.type === 'sent' ? t('terminal.ui.tx') : 
                      log.type === 'received' ? t('terminal.ui.rx') : 
                      log.type === 'system' ? t('terminal.ui.system') : t('terminal.ui.error')}
                  </span>
                  
                  <span className="font-mono break-all">
                    {formatData(log.data, displayFormat, log.format)}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : connectedPorts.length === 1 ? (
          // 单端口模式
          <div className="flex-1 terminal-output p-4 overflow-y-auto custom-scrollbar font-mono text-sm">
            {!logs[0] || logs[0].length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">{t('terminal.ui.waitingData')}</p>
              </div>
            ) : (
              logs[0].map((log) => (
                <div key={log.id} className="mb-1 flex items-start gap-2">
                  {showTimestamp && (
                    <span className="text-muted-foreground text-xs min-w-16">
                      {log.timestamp.toLocaleTimeString().slice(-8)}
                    </span>
                  )}
                  
                  <span className={`
                    text-xs px-2 py-0.5 rounded min-w-12 text-center
                    ${log.type === 'sent' ? 'bg-primary/20 text-primary' : ''}
                    ${log.type === 'received' ? 'bg-success/20 text-success' : ''}
                    ${log.type === 'system' ? 'bg-muted text-muted-foreground' : ''}
                    ${log.type === 'error' ? 'bg-destructive/20 text-destructive' : ''}
                  `}>
                     {log.type === 'sent' ? t('terminal.ui.tx') : 
                      log.type === 'received' ? t('terminal.ui.rx') : 
                      log.type === 'system' ? t('terminal.ui.system') : t('terminal.ui.error')}
                  </span>
                  
                  <span className="font-mono break-all">
                    {formatData(log.data, displayFormat, log.format)}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          // 双端口分栏模式
          <ResizablePanelGroup direction="horizontal" className="w-full">
            {connectedPorts.map((_, index) => {
              const portLabel = connectedPortLabels[index]?.label || `${t('terminal.port')} ${index + 1}`;
              const portStats = stats[index] || { sentBytes: 0, receivedBytes: 0, totalLogs: 0 };
              
              return (
                <React.Fragment key={index}>
                  <ResizablePanel defaultSize={50} minSize={25}>
                    <div className="h-full flex flex-col">
                      {/* 端口头部 */}
                      <div className="p-3 bg-muted/30 border-b border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {portLabel}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>↑{portStats.sentBytes}{t('terminal.ui.bytes')}</span>
                              <span>↓{portStats.receivedBytes}{t('terminal.ui.bytes')}</span>
                              <span>{portStats.totalLogs}{t('terminal.ui.lines')}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => clearLogs(index)}
                                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('terminal.ui.clearPortLogs')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>

                      {/* 终端显示区域 */}
                      <div 
                        ref={(el) => terminalRefs.current[index] = el}
                        className="flex-1 terminal-output p-4 overflow-y-auto custom-scrollbar font-mono text-sm"
                        onScroll={(e) => {
                          // 同步滚动处理
                          if (synchronizedScrolling && connectedPorts.length > 1) {
                            const target = e.currentTarget;
                            const scrollPercentage = target.scrollTop / (target.scrollHeight - target.clientHeight);
                            
                            terminalRefs.current.forEach((ref, refIndex) => {
                              if (ref && refIndex !== index) {
                                const maxScroll = ref.scrollHeight - ref.clientHeight;
                                ref.scrollTop = maxScroll * scrollPercentage;
                              }
                            });
                          }
                        }}
                      >
                        {!logs[index] || logs[index].length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">{t('terminal.ui.waitingData')}</p>
                          </div>
                        ) : (
                          logs[index].map((log) => (
                            <div key={log.id} className="mb-1 flex items-start gap-2">
                              {showTimestamp && (
                                <span className="text-muted-foreground text-xs min-w-16">
                                  {log.timestamp.toLocaleTimeString().slice(-8)}
                                </span>
                              )}
                              
                              <span className={`
                                text-xs px-1 py-0.5 rounded min-w-8 text-center
                                ${log.type === 'sent' ? 'bg-primary/20 text-primary' : ''}
                                ${log.type === 'received' ? 'bg-success/20 text-success' : ''}
                                ${log.type === 'system' ? 'bg-muted text-muted-foreground' : ''}
                                ${log.type === 'error' ? 'bg-destructive/20 text-destructive' : ''}
                              `}>
                                 {log.type === 'sent' ? t('terminal.ui.txShort') : 
                                  log.type === 'received' ? t('terminal.ui.rxShort') : 
                                  log.type === 'system' ? t('terminal.ui.systemShort') : t('terminal.ui.errorShort')}
                              </span>
                              
                              <span className="font-mono break-all text-xs">
                                {formatData(log.data, displayFormat, log.format)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </ResizablePanel>
                  
                  {index < connectedPorts.length - 1 && (
                    <ResizableHandle withHandle className="w-1 hover:bg-primary/20 transition-colors" />
                  )}
                </React.Fragment>
              );
            })}
          </ResizablePanelGroup>
        )}
      </div>

      {/* 发送区域 */}
      <div className="p-4 border-t border-border bg-secondary/5">
        {/* Port Selection for Sending */}
        {connectedPortLabels.length > 1 && strategy.communicationMode === 'COMPARE' && (
          <div className="flex items-center gap-3 mb-3">
            <Label className="text-sm">{t('terminal.ui.sendTo')}:</Label>
            <Select value={selectedSendPort} onValueChange={setSelectedSendPort as any}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('terminal.ui.allPorts')}</SelectItem>
                {connectedPortLabels.map((port) => (
                  <SelectItem key={port.label} value={port.label}>
                    {port.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Input
              value={sendData}
              onChange={(e) => setSendData(e.target.value)}
              placeholder={sendFormat === 'hex' ? t('terminal.ui.hexPlaceholder') : t('terminal.ui.textPlaceholder')}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !autoSend) {
                  sendSerialData();
                }
              }}
              className="font-mono pr-32"
            />
            
            {/* 内嵌控制按钮 */}
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Select value={sendFormat} onValueChange={setSendFormat as any}>
                <SelectTrigger className="w-16 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf8">UTF-8</SelectItem>
                  <SelectItem value="hex">HEX</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newlineMode} onValueChange={setNewlineMode as any}>
                <SelectTrigger className="w-14 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('terminal.ui.none')}</SelectItem>
                  <SelectItem value="lf">LF</SelectItem>
                  <SelectItem value="cr">CR</SelectItem>
                  <SelectItem value="crlf">CRLF</SelectItem>
                </SelectContent>
              </Select>

              {/* 自动发送开关 - 集成到控制栏 */}
              <div className="flex items-center gap-1">
                <Switch
                  id="autoSendToggle"
                  checked={autoSend}
                   onCheckedChange={toggleAutoSend}
                   disabled={connectedPorts.length === 0 && serialManager.serialManager.isSupported()}
                  className="scale-75"
                />
                <Label htmlFor="autoSendToggle" className="text-xs text-muted-foreground">{t('terminal.ui.auto')}</Label>
              </div>

              {!autoSend ? (
                <Button 
                   onClick={sendSerialData} 
                   disabled={connectedPorts.length === 0 && serialManager.serialManager.isSupported()}
                  size="sm"
                  className="h-6 px-2"
                >
                  <Send className="w-3 h-3" />
                </Button>
              ) : (
                <Button 
                  onClick={toggleAutoSend}
                  variant="destructive"
                  size="sm"
                  className="h-6 px-2"
                >
                  <Square className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* 自动发送间隔设置 - 仅在开启时显示，更紧凑 */}
        {autoSend && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 text-primary" />
              <span>{t('terminal.ui.autoSendInterval')}:</span>
              <Input
                type="number"
                min="10"
                max="3600000"
                value={autoSendInterval}
                onChange={(e) => setAutoSendInterval(parseInt(e.target.value) || 1000)}
                className="w-20 h-6 text-xs"
              />
              <span>ms</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-primary">
              <span className="animate-pulse">●</span>
              <span>{t('terminal.ui.running')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};