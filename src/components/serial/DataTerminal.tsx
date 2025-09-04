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
  const isReadingRef = useRef<Set<'P1' | 'P2'>>(new Set()); // Track reading status by port label

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

  // 开始监听数据 - 使用 SerialManager API
  const startReading = async (portLabel: 'P1' | 'P2', portIndex: number) => {
    console.log(`[DataTerminal] Starting reading for ${portLabel}`);
    
    // 检查是否在演示模式
    if (!serialManager.serialManager.isSupported()) {
      console.log('Demo mode: Skipping port reading setup');
      return;
    }

    if (isReadingRef.current.has(portLabel)) {
      console.log(`[DataTerminal] Already reading from ${portLabel}`);
      return;
    }

    try {
      isReadingRef.current.add(portLabel);
      
      await serialManager.serialManager.startReading(portLabel, (data: Uint8Array) => {
        // 将接收到的数据转换为字符串
        const decoder = new TextDecoder();
        const text = decoder.decode(data);
        
        console.log(`[DataTerminal] Received data from ${portLabel}:`, text);
        addLog('received', text, displayFormat, portIndex);
        
        // 发送数据到事件总线
        const serialEvent: SerialDataEvent = {
          portIndex,
          portLabel,
          data: text,
          timestamp: new Date(),
          type: 'received'
        };
        eventBus.emit(EVENTS.SERIAL_DATA_RECEIVED, serialEvent);
      });
    } catch (error) {
      isReadingRef.current.delete(portLabel);
      console.error(`[DataTerminal] Cannot start reading from ${portLabel}:`, error);
      statusMessages?.addMessage(t('terminal.messages.cannotStartReading'), 'error');
    }
  };

  // 停止监听数据 - 使用 SerialManager API
  const stopReading = async (portLabel: 'P1' | 'P2') => {
    console.log(`[DataTerminal] Stopping reading for ${portLabel}`);
    
    if (!isReadingRef.current.has(portLabel)) {
      console.log(`[DataTerminal] Not reading from ${portLabel}`);
      return;
    }

    try {
      await serialManager.serialManager.stopReading(portLabel);
      isReadingRef.current.delete(portLabel);
      console.log(`[DataTerminal] Stopped reading from ${portLabel}`);
    } catch (error) {
      console.error(`[DataTerminal] Failed to stop reading from ${portLabel}:`, error);
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
      const portLabel = connectedPortLabels[index]?.label || `${t('terminal.port')} ${index + 1}`;
      
      try {
        await serialManager.serialManager.write(portLabel, uint8Array);
        
        // 记录发送的数据到对应端口
        addLog('sent', dataToSend, sendFormat, index);
        console.log(`[DataTerminal] Sent data to ${portLabel}:`, dataToSend);
        return { success: true, portLabel };
      } catch (error) {
        console.error(`[DataTerminal] Send failed to ${portLabel}:`, error);
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
      
      // 延迟发送以确保状态更新完成
      setTimeout(() => {
        sendSerialDataRef.current();
      }, 100);
    });

    return unsubscribe;
  }, []);

  // 监听端口连接变化
  useEffect(() => {
    // 为新连接的端口启动数据监听
    connectedPortLabels.forEach((portInfo, index) => {
      if (!isReadingRef.current.has(portInfo.label)) {
        startReading(portInfo.label, index);
        statusMessages?.addMessage(t('terminal.messages.startListeningPort', { portNumber: index + 1 }), 'info');
      }
    });

    // 清理断开连接的端口
    const connectedPortLabelsSet = new Set(connectedPortLabels.map(p => p.label));
    for (const portLabel of isReadingRef.current) {
      if (!connectedPortLabelsSet.has(portLabel)) {
        stopReading(portLabel);
        statusMessages?.addMessage(t('terminal.messages.portDisconnected'), 'warning');
      }
    }

    // 初始化terminalRefs数组
    terminalRefs.current = new Array(connectedPorts.length).fill(null);
  }, [connectedPorts, connectedPortLabels]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) {
        clearInterval(autoSendTimerRef.current);
      }
      // 停止所有数据读取
      for (const portLabel of isReadingRef.current) {
        stopReading(portLabel);
      }
      isReadingRef.current.clear();
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
                      
                      {/* Synchronized scrolling toggle */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={synchronizedScrolling ? "default" : "outline"}
                            size="sm" 
                            onClick={() => setSynchronizedScrolling(!synchronizedScrolling)}
                            className="w-8 h-8 p-0"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('terminal.ui.syncScroll')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => clearLogs()}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t('terminal.ui.clearLogs')}
                  </Button>
                </TooltipTrigger>
                 <TooltipContent>
                   <p>{t('terminal.ui.clearLogs')}</p>
                 </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportLogs}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    {t('terminal.ui.exportLogs')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('terminal.ui.exportLogs')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* 主显示区域 */}
      <div className="flex-1 min-h-0">
        {connectedPorts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('terminal.messages.noConnection')}</p>
              <p className="text-sm">{t('terminal.messages.connectToStartTerminal')}</p>
            </div>
          </div>
        ) : strategy.communicationMode === 'COMPARE' && connectedPorts.length > 1 ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {connectedPorts.map((portInfo, index) => (
              <React.Fragment key={index}>
                <ResizablePanel defaultSize={50}>
                  <div className="h-full flex flex-col">
                    {/* 端口标题 */}
                    <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {connectedPortLabels[index]?.label || `${t('terminal.port')} ${index + 1}`}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Serial Port
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {t('terminal.ui.logs')}: {stats[index]?.totalLogs || 0}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => clearLogs(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* 终端输出 */}
                    <div 
                      ref={el => terminalRefs.current[index] = el}
                      className="flex-1 overflow-auto p-2 font-mono text-sm bg-background"
                      style={{ 
                        fontSize: settings.fontSize ? `${settings.fontSize}px` : '12px',
                        scrollBehavior: synchronizedScrolling ? 'smooth' : 'auto'
                      }}
                      onScroll={(e) => {
                        if (synchronizedScrolling && connectedPorts.length > 1) {
                          const scrollTop = e.currentTarget.scrollTop;
                          terminalRefs.current.forEach((ref, refIndex) => {
                            if (ref && refIndex !== index) {
                              ref.scrollTop = scrollTop;
                            }
                          });
                        }
                      }}
                    >
                      {(logs[index] || []).map((log) => (
                        <div key={log.id} className="whitespace-pre-wrap break-all mb-1">
                          {showTimestamp && (
                            <span className="text-muted-foreground mr-2">
                              [{log.timestamp.toLocaleTimeString()}]
                            </span>
                          )}
                          <span className={`inline-block w-10 text-center text-xs rounded mr-2 ${
                            log.type === 'sent' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                              : log.type === 'received'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }`}>
                            {log.type === 'sent' ? t('terminal.ui.txShort') : log.type === 'received' ? t('terminal.ui.rxShort') : t('terminal.ui.systemShort')}
                          </span>
                          <span className={log.type === 'sent' ? 'text-blue-600 dark:text-blue-400' : log.type === 'received' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                            {formatData(log.data, displayFormat, log.format)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 端口统计 */}
                    <div className="p-2 border-t border-border bg-muted/30">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('terminal.ui.sentBytes')}: {stats[index]?.sentBytes || 0} {t('terminal.ui.bytes')}</span>
                        <span>{t('terminal.ui.receivedBytes')}: {stats[index]?.receivedBytes || 0} {t('terminal.ui.bytes')}</span>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                {index < connectedPorts.length - 1 && <ResizableHandle />}
              </React.Fragment>
            ))}
          </ResizablePanelGroup>
        ) : (
          // 合并视图 (MERGED_TXRX mode or single port)
          <div className="h-full flex flex-col">
            {/* 顶部标题 */}
            <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                {connectedPorts.length > 1 ? (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {t('terminal.ui.mergedView')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      TX: {strategy.txPort} | RX: {t('terminal.ui.allPorts')}
                    </span>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="text-xs font-mono">
                      {connectedPortLabels[0]?.label || t('terminal.port')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Serial Port
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {t('terminal.ui.logs')}: {connectedPorts.length > 1 ? mergedLogs.length : (stats[0]?.totalLogs || 0)}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => clearLogs()}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* 终端输出 */}
            <div 
              ref={el => terminalRefs.current[0] = el}
              className="flex-1 overflow-auto p-2 font-mono text-sm bg-background"
              style={{ fontSize: settings.fontSize ? `${settings.fontSize}px` : '12px' }}
            >
              {connectedPorts.length > 1 ? (
                // 合并日志显示
                mergedLogs.map((log) => (
                  <div key={log.id} className="whitespace-pre-wrap break-all mb-1">
                    {showTimestamp && (
                      <span className="text-muted-foreground mr-2">
                        [{log.timestamp.toLocaleTimeString()}]
                      </span>
                    )}
                    <span className="inline-block w-8 text-center text-xs rounded mr-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {log.portLabel}
                    </span>
                    <span className={`inline-block w-10 text-center text-xs rounded mr-2 ${
                      log.type === 'sent' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                        : log.type === 'received'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {log.type === 'sent' ? t('terminal.ui.txShort') : log.type === 'received' ? t('terminal.ui.rxShort') : t('terminal.ui.systemShort')}
                    </span>
                    <span className={log.type === 'sent' ? 'text-blue-600 dark:text-blue-400' : log.type === 'received' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                      {formatData(log.data, displayFormat, log.format)}
                    </span>
                  </div>
                ))
              ) : (
                // 单端口日志显示
                (logs[0] || []).map((log) => (
                  <div key={log.id} className="whitespace-pre-wrap break-all mb-1">
                    {showTimestamp && (
                      <span className="text-muted-foreground mr-2">
                        [{log.timestamp.toLocaleTimeString()}]
                      </span>
                    )}
                    <span className={`inline-block w-10 text-center text-xs rounded mr-2 ${
                      log.type === 'sent' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                        : log.type === 'received'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {log.type === 'sent' ? t('terminal.ui.txShort') : log.type === 'received' ? t('terminal.ui.rxShort') : t('terminal.ui.systemShort')}
                    </span>
                    <span className={log.type === 'sent' ? 'text-blue-600 dark:text-blue-400' : log.type === 'received' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                      {formatData(log.data, displayFormat, log.format)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 统计信息 */}
            <div className="p-2 border-t border-border bg-muted/30">
              {connectedPorts.length > 1 ? (
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  {connectedPortLabels.map((portInfo, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{portInfo.label}: {t('terminal.ui.sentBytes')} {stats[index]?.sentBytes || 0} / {t('terminal.ui.receivedBytes')} {stats[index]?.receivedBytes || 0} {t('terminal.ui.bytes')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('terminal.ui.sentBytes')}: {stats[0]?.sentBytes || 0} {t('terminal.ui.bytes')}</span>
                  <span>{t('terminal.ui.receivedBytes')}: {stats[0]?.receivedBytes || 0} {t('terminal.ui.bytes')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 发送区域 */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex flex-col gap-3">
          {/* 发送输入框 */}
          <div className="flex items-center gap-2">
            <Input
              value={sendData}
              onChange={(e) => setSendData(e.target.value)}
              placeholder={sendFormat === 'hex' ? t('terminal.ui.hexPlaceholder') : t('terminal.ui.textPlaceholder')}
              className="flex-1 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !autoSend) {
                  sendSerialData();
                }
              }}
            />
            
            {/* 控制选项 */}
            <div className="flex items-center gap-2">
              {/* 格式选择 */}
              <Select value={sendFormat} onValueChange={(value: 'utf8' | 'hex') => setSendFormat(value)}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf8">UTF-8</SelectItem>
                  <SelectItem value="hex">HEX</SelectItem>
                </SelectContent>
              </Select>

              {/* 换行符选择 */}
              <Select value={newlineMode} onValueChange={(value: 'none' | 'lf' | 'cr' | 'crlf') => setNewlineMode(value)}>
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('terminal.lineEnding.none')}</SelectItem>
                  <SelectItem value="lf">LF</SelectItem>
                  <SelectItem value="cr">CR</SelectItem>
                  <SelectItem value="crlf">CRLF</SelectItem>
                </SelectContent>
              </Select>

              {/* 端口选择 - 仅在比较模式下显示 */}
              {strategy.communicationMode === 'COMPARE' && connectedPorts.length > 1 && (
                <Select
                  value={selectedSendPort}
                  onValueChange={(value: 'ALL' | 'P1' | 'P2') => setSelectedSendPort(value)}
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
              )}

              {/* 自动发送间隔设置 */}
              {autoSend && (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={autoSendInterval}
                    onChange={(e) => setAutoSendInterval(Math.max(10, parseInt(e.target.value) || 1000))}
                    className="w-16 h-8 text-xs"
                    min={10}
                    step={10}
                  />
                  <span className="text-xs text-muted-foreground">ms</span>
                </div>
              )}

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
      </div>
    </div>
  );
};