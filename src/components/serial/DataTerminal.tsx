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

interface DataTerminalProps {
  serialManager: ReturnType<typeof useSerialManager>;
}

interface MergedLogEntry extends LogEntry {
  portLabel: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'sent' | 'received' | 'system' | 'error';
  data: string;
  format: 'ascii' | 'hex';
}

export const DataTerminal: React.FC<DataTerminalProps> = ({
  serialManager
}) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<{ [portIndex: number]: LogEntry[] }>({});
  const [mergedLogs, setMergedLogs] = useState<MergedLogEntry[]>([]);
  const [sendData, setSendData] = useState("");
  const [sendFormat, setSendFormat] = useState<'ascii' | 'hex'>('ascii');
  const [displayFormat, setDisplayFormat] = useState<'ascii' | 'hex'>('ascii');
  const [newlineMode, setNewlineMode] = useState<'none' | 'lf' | 'cr' | 'crlf'>('crlf');
  const [autoSend, setAutoSend] = useState(false);
  const [autoSendInterval, setAutoSendInterval] = useState(1000);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
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

  // 添加日志条目
  const addLog = (type: LogEntry['type'], data: string, format: 'ascii' | 'hex' = displayFormat, portIndex?: number) => {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      data,
      format
    };
    
    if (portIndex !== undefined) {
      // 更新分端口日志
      setLogs(prev => ({
        ...prev,
        [portIndex]: [...(prev[portIndex] || []), entry]
      }));
      
      // 更新合并日志（用于 MERGED_TXRX 模式）
      const portLabel = connectedPortLabels[portIndex]?.label || `端口 ${portIndex + 1}`;
      const mergedEntry: MergedLogEntry = {
        ...entry,
        portLabel
      };
      setMergedLogs(prev => [...prev, mergedEntry]);
      
      setStats(prev => ({
        ...prev,
        [portIndex]: {
          totalLogs: (prev[portIndex]?.totalLogs || 0) + 1,
          receivedBytes: type === 'received' ? (prev[portIndex]?.receivedBytes || 0) + data.length : (prev[portIndex]?.receivedBytes || 0),
          sentBytes: type === 'sent' ? (prev[portIndex]?.sentBytes || 0) + data.length : (prev[portIndex]?.sentBytes || 0)
        }
      }));
    } else {
      // 系统日志添加到所有端口
      setLogs(prev => {
        const newLogs = { ...prev };
        connectedPorts.forEach((_, index) => {
          newLogs[index] = [...(newLogs[index] || []), entry];
        });
        return newLogs;
      });
      
      // 系统日志也添加到合并日志
      const mergedEntry: MergedLogEntry = {
        ...entry,
        portLabel: 'SYSTEM'
      };
      setMergedLogs(prev => [...prev, mergedEntry]);
    }

    // 自动滚动到底部
    if (autoScrollEnabled) {
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
            const portLabel = connectedPortLabels[portIndex]?.label || `端口 ${portIndex + 1}`;
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
            addLog('error', '设备连接已断开', displayFormat, portIndex);
            // Find the port label and disconnect
            const portLabel = connectedPortLabels[portIndex]?.label;
            if (portLabel) {
              serialManager.disconnectPort(portLabel);
            }
            break;
          }
          console.error('读取数据错误:', error);
        }
      }
    } catch (error) {
      console.error('开始读取失败:', error);
      addLog('error', '无法开始读取数据', displayFormat, portIndex);
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
        console.error('停止读取失败:', error);
      } finally {
        readersRef.current.delete(port);
      }
    }
  };

  // 发送数据到所有连接的端口
  const sendSerialData = async () => {
    if (connectedPorts.length === 0) {
      toast({
        title: "未连接设备",
        description: "请先连接串口设备",
        variant: "destructive"
      });
      return;
    }

    if (!sendData.trim()) {
      toast({
        title: "发送内容为空",
        description: "请输入要发送的数据",
        variant: "destructive"
      });
      return;
    }

    let dataToSend = sendData;
    // 立即清空输入框
    setSendData("");
    
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
          throw new Error(`无效的十六进制数据: ${hex}`);
        }
        bytes.push(parseInt(hex, 16));
      }
      uint8Array = new Uint8Array(bytes);
    } else {
      // ASCII 数据
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
        const portLabel = connectedPortLabels[index]?.label || `端口 ${index + 1}`;
        addLog('sent', dataToSend, sendFormat, index);
        return { success: true, portLabel };
      } catch (error) {
        const portLabel = connectedPortLabels[index]?.label || `端口 ${index + 1}`;
        console.error(`发送数据到 ${portLabel} 失败:`, error);
        addLog('error', `发送失败: ${(error as Error).message}`, displayFormat, index);
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
          ? `${successCount}/${portsToSend.length} 个端口`
          : targetPort;
        
        toast({
          title: "数据已发送",
          description: `发送了 ${uint8Array.length} 字节数据到 ${targetDesc}`,
        });
      } else {
        toast({
          title: "发送失败",
          description: "所有端口发送失败",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "发送失败",
        description: "部分或全部端口发送失败",
        variant: "destructive"
      });
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
      addLog('system', '已停止自动发送');
    } else {
      if (autoSendInterval < 10) {
        toast({
          title: "间隔时间过短",
          description: "自动发送间隔不能少于 10ms",
          variant: "destructive"
        });
        return;
      }
      
      autoSendTimerRef.current = setInterval(() => {
        sendSerialData();
      }, autoSendInterval);
      
      setAutoSend(true);
      addLog('system', `已启动自动发送，间隔 ${autoSendInterval}ms`);
    }
  };

  // 清空日志
  const clearLogs = (portIndex?: number) => {
    if (portIndex !== undefined) {
      // 清空特定端口的日志
      setLogs(prev => ({ ...prev, [portIndex]: [] }));
      setStats(prev => ({ ...prev, [portIndex]: { sentBytes: 0, receivedBytes: 0, totalLogs: 0 } }));
      addLog('system', `端口 ${portIndex + 1} 日志已清空`, displayFormat, portIndex);
    } else {
      // 清空所有日志
      setLogs({});
      setMergedLogs([]);
      setStats({});
      addLog('system', '日志已清空');
    }
  };

  // 导出日志
  const exportLogs = () => {
    let content = '';
    Object.entries(logs).forEach(([portIndex, portLogs]) => {
      content += `=== 端口 ${parseInt(portIndex) + 1} ===\n`;
      portLogs.forEach(log => {
        const timestamp = showTimestamp ? `[${log.timestamp.toLocaleTimeString()}] ` : '';
        const type = log.type === 'sent' ? '发送' : log.type === 'received' ? '接收' : '系统';
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
      title: "日志已导出",
      description: `导出了 ${totalLogs} 条日志记录`,
    });
  };

  // 格式化显示数据
  const formatData = (data: string, format: 'ascii' | 'hex', originalFormat: 'ascii' | 'hex') => {
    if (format === originalFormat) {
      return data;
    }

    if (format === 'hex' && originalFormat === 'ascii') {
      // ASCII 转 HEX
      return Array.from(data)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ').toUpperCase();
    } else if (format === 'ascii' && originalFormat === 'hex') {
      // HEX 转 ASCII
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

  // 监听发送命令事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SEND_COMMAND, (event: SendCommandEvent) => {
      // 临时设置发送数据并执行发送
      setSendData(event.command);
      setSendFormat(event.format);
      setNewlineMode(event.lineEnding);
      if (event.targetPort) {
        setSelectedSendPort(event.targetPort);
      }
      
      // 延迟执行发送以确保状态更新
      setTimeout(() => {
        sendSerialData();
      }, 50);
    });
    
    return unsubscribe;
  }, [sendSerialData]);

  // 监听端口连接变化
  useEffect(() => {
    // 为新连接的端口启动数据监听
    connectedPorts.forEach(({ port }, index) => {
      if (!readersRef.current.has(port)) {
        startReading(port, index);
        addLog('system', `开始监听端口数据 - 端口 ${index + 1}`);
      }
    });

      // 清理断开连接的端口
    const connectedPortSet = new Set(connectedPorts.map(p => p.port));
    for (const [port, reader] of readersRef.current.entries()) {
      if (!connectedPortSet.has(port)) {
        stopReading(port);
        addLog('system', '端口已断开连接');
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
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="p-4 border-b border-border">
        {/* 控制选项 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDisplayFormat(displayFormat === 'ascii' ? 'hex' : 'ascii')}
                className="w-16 font-mono"
              >
                {displayFormat.toUpperCase()}
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
                            分栏
                          </>
                        ) : (
                          <>
                            <Merge className="w-3 h-3" />
                            合并
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{strategy.communicationMode === 'COMPARE' ? '切换到合并模式' : '切换到分栏模式'}</p>
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
                          <SelectItem value="ALL">全部</SelectItem>
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
                          <p>交换TX/RX</p>
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
                    <p>Synchronized Scrolling</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={autoScrollEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>自动滚动</p>
                </TooltipContent>
              </Tooltip>
              
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
                <p className="text-xs">等待数据...</p>
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
                    {log.type === 'sent' ? '发送' : 
                     log.type === 'received' ? '接收' : 
                     log.type === 'system' ? '系统' : '错误'}
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
                <p className="text-xs">等待数据...</p>
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
                    {log.type === 'sent' ? '发送' : 
                     log.type === 'received' ? '接收' : 
                     log.type === 'system' ? '系统' : '错误'}
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
              const portLabel = connectedPortLabels[index]?.label || `端口 ${index + 1}`;
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
                              <span>↑{portStats.sentBytes}B</span>
                              <span>↓{portStats.receivedBytes}B</span>
                              <span>{portStats.totalLogs}条</span>
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
                                <p>清空此端口日志</p>
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
                            <p className="text-xs">等待数据...</p>
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
                                {log.type === 'sent' ? '发' : 
                                 log.type === 'received' ? '收' : 
                                 log.type === 'system' ? '系' : '错'}
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
            <Label className="text-sm">发送到:</Label>
            <Select value={selectedSendPort} onValueChange={setSelectedSendPort as any}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部端口</SelectItem>
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
              placeholder={sendFormat === 'hex' ? "输入十六进制数据 (如: 48 65 6C 6C 6F)" : "输入要发送的文本数据"}
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
                  <SelectItem value="ascii">ASCII</SelectItem>
                  <SelectItem value="hex">HEX</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newlineMode} onValueChange={setNewlineMode as any}>
                <SelectTrigger className="w-14 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  <SelectItem value="lf">LF</SelectItem>
                  <SelectItem value="cr">CR</SelectItem>
                  <SelectItem value="crlf">CRLF</SelectItem>
                </SelectContent>
              </Select>

              {!autoSend ? (
                <Button 
                  onClick={sendSerialData} 
                  disabled={connectedPorts.length === 0}
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
        
        {/* 自动发送设置 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="autoSendToggle"
                checked={autoSend}
                onCheckedChange={toggleAutoSend}
                disabled={connectedPorts.length === 0}
              />
              <Label htmlFor="autoSendToggle" className="text-sm">自动发送</Label>
            </div>
            
            {autoSend && (
              <div className="flex items-center gap-2 text-xs">
                <Label>间隔:</Label>
                <Input
                  type="number"
                  min="10"
                  max="3600000"
                  value={autoSendInterval}
                  onChange={(e) => setAutoSendInterval(parseInt(e.target.value) || 1000)}
                  className="w-20 h-6 text-xs"
                />
                <span className="text-muted-foreground">ms</span>
              </div>
            )}
          </div>
          
          {autoSend && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Clock className="w-3 h-3" />
              <span>正在自动发送</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};