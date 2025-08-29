import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Plug, PlugZap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SerialConnectionProps {
  onConnect: (port: any, params: SerialConnectionParams) => void;
  onDisconnect: (port: any) => void;
  isSupported: boolean;
  connectedPorts: any[];
}

interface SerialConnectionParams {
  baudRate: number;
  dataBits: number;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  stopBits: number;
}

export const SerialConnection: React.FC<SerialConnectionProps> = ({
  onConnect,
  onDisconnect,
  isSupported,
  connectedPorts
}) => {
  const { toast } = useToast();
  const [availablePorts, setAvailablePorts] = useState<any[]>([]);
  const [selectedPort, setSelectedPort] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionParams, setConnectionParams] = useState<SerialConnectionParams>({
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1
  });

  // 获取可用串口
  const refreshPorts = async () => {
    if (!isSupported) {
      toast({
        title: "不支持 Web Serial API",
        description: "请使用 Chrome、Edge 或 Opera 浏览器",
        variant: "destructive"
      });
      return;
    }

    try {
      const ports = await (navigator as any).serial.getPorts();
      setAvailablePorts(ports);
      
      if (ports.length === 0) {
        toast({
          title: "未找到串口",
          description: "请连接串口设备或点击「请求访问」选择新设备",
        });
      }
    } catch (error) {
      console.error('获取串口列表失败:', error);
      toast({
        title: "获取串口失败",
        description: "无法获取串口列表，请检查设备连接",
        variant: "destructive"
      });
    }
  };

  // 请求新串口访问
  const requestPort = async () => {
    if (!isSupported) return;

    try {
      const port = await (navigator as any).serial.requestPort();
      await refreshPorts();
      setSelectedPort(port);
      
      toast({
        title: "设备已添加",
        description: "串口设备已成功添加到列表",
      });
    } catch (error) {
      if ((error as any).name !== 'NotFoundError') {
        console.error('请求串口访问失败:', error);
        toast({
          title: "请求失败",
          description: "无法请求串口访问权限",
          variant: "destructive"
        });
      }
    }
  };

  // 连接串口
  const connectPort = async () => {
    if (!selectedPort || isConnecting) return;

    // 检查是否已连接
    if (connectedPorts.some(p => p.port === selectedPort)) {
      toast({
        title: "设备已连接",
        description: "该串口设备已经连接",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      await selectedPort.open({
        baudRate: connectionParams.baudRate,
        dataBits: connectionParams.dataBits,
        parity: connectionParams.parity,
        stopBits: connectionParams.stopBits
      });

      onConnect(selectedPort, connectionParams);

      toast({
        title: "连接成功",
        description: `已连接到串口设备 (${connectionParams.baudRate} bps)`,
      });
      
      // 清空选择，准备连接下一个
      setSelectedPort(null);
    } catch (error) {
      console.error('连接串口失败:', error);
      toast({
        title: "连接失败",
        description: "无法连接到选定的串口设备",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // 断开指定串口
  const disconnectPort = async (port: any) => {
    try {
      await port.close();
      onDisconnect(port);

      toast({
        title: "已断开连接",
        description: "串口连接已断开",
      });
    } catch (error) {
      console.error('断开串口失败:', error);
      toast({
        title: "断开失败",
        description: "无法断开串口连接",
        variant: "destructive"
      });
    }
  };

  // 组件挂载时刷新端口列表
  useEffect(() => {
    if (isSupported) {
      refreshPorts();
    }
  }, [isSupported]);

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            浏览器不支持
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            当前浏览器不支持 Web Serial API，请使用以下浏览器：
          </p>
          <div className="space-y-2">
            <Badge variant="outline">Chrome 89+</Badge>
            <Badge variant="outline">Edge 89+</Badge>
            <Badge variant="outline">Opera 76+</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {connectedPorts.length > 0 ? (
            <>
              <PlugZap className="w-5 h-5 text-success status-connected" />
              串口连接 ({connectedPorts.length}/2)
            </>
          ) : (
            <>
              <Plug className="w-5 h-5" />
              串口连接
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 端口选择 */}
        <div className="space-y-2">
          <Label>选择端口</Label>
          <div className="flex gap-2">
            <Select
              value={selectedPort ? "selected" : ""}
              onValueChange={(value) => {
                if (value !== "selected") {
                  const port = availablePorts[parseInt(value)];
                  setSelectedPort(port);
                }
              }}
              disabled={connectedPorts.length >= 2}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择串口设备" />
              </SelectTrigger>
              <SelectContent>
                {availablePorts.map((port, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    串口设备 #{index + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPorts}
              disabled={isConnecting || connectedPorts.length >= 2}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 请求新设备按钮 */}
        {connectedPorts.length < 2 && (
          <Button
            variant="outline"
            onClick={requestPort}
            disabled={isConnecting}
            className="w-full"
          >
            请求访问新设备
          </Button>
        )}

        <Separator />

        {/* 串口参数配置 */}
        <div className="space-y-4">
          <Label>连接参数</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baudRate">波特率</Label>
              <Select
                value={connectionParams.baudRate.toString()}
                onValueChange={(value) => 
                  setConnectionParams(prev => ({ ...prev, baudRate: parseInt(value) }))
                }
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(rate => (
                    <SelectItem key={rate} value={rate.toString()}>
                      {rate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataBits">数据位</Label>
              <Select
                value={connectionParams.dataBits.toString()}
                onValueChange={(value) => 
                  setConnectionParams(prev => ({ ...prev, dataBits: parseInt(value) }))
                }
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 6, 7, 8].map(bits => (
                    <SelectItem key={bits} value={bits.toString()}>
                      {bits}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parity">校验位</Label>
              <Select
                value={connectionParams.parity}
                onValueChange={(value: any) => 
                  setConnectionParams(prev => ({ ...prev, parity: value }))
                }
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  <SelectItem value="even">偶校验</SelectItem>
                  <SelectItem value="odd">奇校验</SelectItem>
                  <SelectItem value="mark">标记</SelectItem>
                  <SelectItem value="space">空格</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopBits">停止位</Label>
              <Select
                value={connectionParams.stopBits.toString()}
                onValueChange={(value) => 
                  setConnectionParams(prev => ({ ...prev, stopBits: parseInt(value) }))
                }
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* 连接控制 */}
        <Button
          onClick={connectPort}
          disabled={!selectedPort || isConnecting || connectedPorts.length >= 2}
          className="w-full btn-connect"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              连接中...
            </>
          ) : (
            connectedPorts.length >= 2 ? "已达到最大连接数" : "打开串口"
          )}
        </Button>

        {/* 已连接端口列表 */}
        {connectedPorts.length > 0 && (
          <div className="space-y-2">
            <Label>已连接端口</Label>
            {connectedPorts.map((portInfo, index) => (
              <div key={index} className="p-3 bg-success/10 border border-success/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-success">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">
                      端口 #{index + 1} - {portInfo.params.baudRate} bps
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disconnectPort(portInfo.port)}
                  >
                    断开
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {portInfo.params.dataBits}位数据 • {portInfo.params.parity === 'none' ? '无校验' : portInfo.params.parity} • {portInfo.params.stopBits}停止位
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};