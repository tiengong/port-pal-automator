import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, Plug, PlugZap, AlertTriangle, Settings2, Plus, ChevronDown, ChevronRight, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSerialManager, type SerialPortInfo } from "@/hooks/useSerialManager";

interface DualChannelConnectionProps {
  serialManager: ReturnType<typeof useSerialManager>;
  isSupported: boolean;
}

export const DualChannelConnection: React.FC<DualChannelConnectionProps> = ({
  serialManager,
  isSupported
}) => {
  const { toast } = useToast();
  const [availablePorts, setAvailablePorts] = useState<any[]>([]);
  const [selectedPorts, setSelectedPorts] = useState<{
    P1: any | null;
    P2: any | null;
  }>({ P1: null, P2: null });
  const [selectedIndex, setSelectedIndex] = useState<{
    P1: string;
    P2: string;
  }>({ P1: "", P2: "" });
  const [isConnecting, setIsConnecting] = useState<{
    P1: boolean;
    P2: boolean;
  }>({ P1: false, P2: false });

  const { strategy, updateStrategy, ports } = serialManager;

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

  // 请求新串口访问并刷新
  const requestPortAndRefresh = async () => {
    if (!isSupported) return;

    try {
      await refreshPorts();
      const ports = await (navigator as any).serial.getPorts();
      
      // 自动请求新设备访问权限
      const port = await (navigator as any).serial.requestPort();
      await refreshPorts();
      
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

  // 连接指定通道
  const connectChannel = async (channel: 'P1' | 'P2') => {
    const selectedPort = selectedPorts[channel];
    if (!selectedPort || isConnecting[channel]) return;

    setIsConnecting(prev => ({ ...prev, [channel]: true }));
    
    try {
      const params = channel === 'P1' ? strategy.p1Config : strategy.p2Config;
      const success = await serialManager.connectPort(selectedPort, params, channel);
      
      if (success) {
        // 清空选择，准备连接下一个
        setSelectedPorts(prev => ({ ...prev, [channel]: null }));
        setSelectedIndex(prev => ({ ...prev, [channel]: "" }));
      }
    } finally {
      setIsConnecting(prev => ({ ...prev, [channel]: false }));
    }
  };

  // 断开指定通道
  const disconnectChannel = (channel: 'P1' | 'P2') => {
    serialManager.disconnectPort(channel);
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

  const p1Port = ports.find(p => p.label === 'P1');
  const p2Port = ports.find(p => p.label === 'P2');

  return (
    <div className="space-y-4">

      {/* Main Serial Port */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {p1Port?.connected ? (
              <>
                <PlugZap className="w-5 h-5 text-success" />
                <span>串口连接</span>
                <Badge variant="secondary" className="ml-auto">已连接</Badge>
              </>
            ) : (
              <>
                <Plug className="w-5 h-5" />
                <span>串口连接</span>
                <Badge variant="outline" className="ml-auto">未连接</Badge>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!p1Port?.connected ? (
            <>
              {/* Port Selection */}
              <div className="space-y-2">
                <Label>选择端口</Label>
                <Select
                  value={selectedIndex.P1}
                  onValueChange={(value) => {
                    const port = availablePorts[parseInt(value)];
                    setSelectedPorts(prev => ({ ...prev, P1: port }));
                    setSelectedIndex(prev => ({ ...prev, P1: value }));
                  }}
                  onOpenChange={async (isOpen) => {
                    if (isOpen) {
                      // 每次打开时都刷新串口列表
                      await refreshPorts();
                      
                      // 如果没有可用端口，提示并尝试请求新设备
                      if (availablePorts.length === 0) {
                        toast({
                          title: "正在扫描串口设备",
                          description: "将自动请求访问新的串口设备",
                        });
                        await requestPortAndRefresh();
                      } else {
                        toast({
                          title: "串口列表已更新",
                          description: `发现 ${availablePorts.length} 个可用串口设备`,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="点击选择设备（自动请求新设备）" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePorts.length === 0 ? (
                      <SelectItem value="no-ports" disabled>
                        正在请求设备访问权限...
                      </SelectItem>
                    ) : (
                      availablePorts.map((port, index) => {
                        // Try to get port info from the port object
                        const getPortInfo = () => {
                          const info = (port as any).getInfo?.() || {};
                          if (info.usbVendorId && info.usbProductId) {
                            return `USB设备 (${info.usbVendorId.toString(16).padStart(4, '0')}:${info.usbProductId.toString(16).padStart(4, '0')})`;
                          }
                          return `COM${index + 1}`;
                        };
                        
                        return (
                          <SelectItem key={index} value={index.toString()}>
                            {getPortInfo()}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>波特率</Label>
                  <Select
                    value={strategy.p1Config.baudRate.toString()}
                    onValueChange={(value) => 
                      updateStrategy({ 
                        p1Config: { ...strategy.p1Config, baudRate: parseInt(value) }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(rate => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate} bps
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>数据位</Label>
                  <Select
                    value={strategy.p1Config.dataBits.toString()}
                    onValueChange={(value) => 
                      updateStrategy({ 
                        p1Config: { ...strategy.p1Config, dataBits: parseInt(value) as 5 | 6 | 7 | 8 }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8].map(bits => (
                        <SelectItem key={bits} value={bits.toString()}>
                          {bits} 位
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>校验位</Label>
                  <Select
                    value={strategy.p1Config.parity}
                    onValueChange={(value: 'none' | 'even' | 'odd' | 'mark' | 'space') => 
                      updateStrategy({ 
                        p1Config: { ...strategy.p1Config, parity: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无校验</SelectItem>
                      <SelectItem value="even">偶校验</SelectItem>
                      <SelectItem value="odd">奇校验</SelectItem>
                      <SelectItem value="mark">标记校验</SelectItem>
                      <SelectItem value="space">空格校验</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>停止位</Label>
                  <Select
                    value={strategy.p1Config.stopBits.toString()}
                    onValueChange={(value) => 
                      updateStrategy({ 
                        p1Config: { ...strategy.p1Config, stopBits: parseInt(value) as 1 | 2 }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 位</SelectItem>
                      <SelectItem value="2">2 位</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => connectChannel('P1')}
                disabled={!selectedPorts.P1 || isConnecting.P1}
                className="w-full"
              >
                {isConnecting.P1 ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    连接中...
                  </>
                ) : (
                  "连接串口"
                )}
              </Button>
            </>
          ) : (
            <div className="p-3 bg-success/10 border border-success/20 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-success">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    已连接 - {p1Port.params.baudRate} bps
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => disconnectChannel('P1')}
                >
                  断开
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {p1Port.params.dataBits}位数据 • {p1Port.params.parity === 'none' ? '无校验' : p1Port.params.parity} • {p1Port.params.stopBits}停止位
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Secondary Serial Port - Simplified */}
      {!p2Port?.connected && !strategy.p2Enabled && (
        <Button 
          variant="outline" 
          className="w-full justify-center"
          onClick={async () => {
            // Enable P2 and sync config with P1
            updateStrategy({ 
              p2Enabled: true,
              mode: 'P1_P2',
              p2Config: { ...strategy.p1Config } // Sync with P1 config
            });
            
            // Auto-refresh ports for immediate selection
            await requestPortAndRefresh();
            
            toast({
              title: "第二路串口已启用",
              description: "配置已与主串口同步，请选择设备连接",
            });
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加第二路串口
        </Button>
      )}

      {/* Secondary Serial Port */}
      {strategy.p2Enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {p2Port?.connected ? (
                <>
                  <PlugZap className="w-5 h-5 text-success" />
                  <span>第二路串口</span>
                  <Badge variant="secondary" className="ml-auto">已连接</Badge>
                </>
              ) : (
                <>
                  <Plug className="w-5 h-5" />
                  <span>第二路串口</span>
                  <Badge variant="outline" className="ml-auto">未连接</Badge>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateStrategy({ 
                  p2Enabled: false,
                  mode: 'P1_ONLY'
                })}
                className="ml-auto p-1 h-6 w-6"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!p2Port?.connected ? (
              <>
                {/* Port Selection */}
                <div className="space-y-2">
                  <Label>选择端口</Label>
                  <Select
                    value={selectedIndex.P2}
                    onValueChange={(value) => {
                      const port = availablePorts[parseInt(value)];
                      setSelectedPorts(prev => ({ ...prev, P2: port }));
                      setSelectedIndex(prev => ({ ...prev, P2: value }));
                    }}
                    onOpenChange={async (isOpen) => {
                      if (isOpen) {
                        // 每次打开时都刷新串口列表
                        await refreshPorts();
                        
                        // 如果没有可用端口，提示并尝试请求新设备
                        if (availablePorts.length === 0) {
                          toast({
                            title: "正在扫描串口设备",
                            description: "将自动请求访问新的串口设备",
                          });
                          await requestPortAndRefresh();
                        } else {
                          toast({
                            title: "串口列表已更新",
                            description: `发现 ${availablePorts.length} 个可用串口设备`,
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="点击选择设备（自动请求新设备）" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePorts.length === 0 ? (
                        <SelectItem value="no-ports" disabled>
                          正在请求设备访问权限...
                        </SelectItem>
                      ) : (
                        availablePorts.map((port, index) => {
                          // Try to get port info from the port object
                          const getPortInfo = () => {
                            const info = (port as any).getInfo?.() || {};
                            if (info.usbVendorId && info.usbProductId) {
                              return `USB设备 (${info.usbVendorId.toString(16).padStart(4, '0')}:${info.usbProductId.toString(16).padStart(4, '0')})`;
                            }
                            return `COM${index + 1}`;
                          };
                          
                          return (
                            <SelectItem key={index} value={index.toString()}>
                              {getPortInfo()}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Detailed Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>波特率</Label>
                    <Select
                      value={strategy.p2Config.baudRate.toString()}
                      onValueChange={(value) => 
                        updateStrategy({ 
                          p2Config: { ...strategy.p2Config, baudRate: parseInt(value) }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(rate => (
                          <SelectItem key={rate} value={rate.toString()}>
                            {rate} bps
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>数据位</Label>
                    <Select
                      value={strategy.p2Config.dataBits.toString()}
                      onValueChange={(value) => 
                        updateStrategy({ 
                          p2Config: { ...strategy.p2Config, dataBits: parseInt(value) as 5 | 6 | 7 | 8 }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 6, 7, 8].map(bits => (
                          <SelectItem key={bits} value={bits.toString()}>
                            {bits} 位
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>校验位</Label>
                    <Select
                      value={strategy.p2Config.parity}
                      onValueChange={(value: 'none' | 'even' | 'odd' | 'mark' | 'space') => 
                        updateStrategy({ 
                          p2Config: { ...strategy.p2Config, parity: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无校验</SelectItem>
                        <SelectItem value="even">偶校验</SelectItem>
                        <SelectItem value="odd">奇校验</SelectItem>
                        <SelectItem value="mark">标记校验</SelectItem>
                        <SelectItem value="space">空格校验</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>停止位</Label>
                    <Select
                      value={strategy.p2Config.stopBits.toString()}
                      onValueChange={(value) => 
                        updateStrategy({ 
                          p2Config: { ...strategy.p2Config, stopBits: parseInt(value) as 1 | 2 }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 位</SelectItem>
                        <SelectItem value="2">2 位</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() => connectChannel('P2')}
                  disabled={!selectedPorts.P2 || isConnecting.P2}
                  className="w-full"
                >
                  {isConnecting.P2 ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      连接中...
                    </>
                  ) : (
                    "连接第二路串口"
                  )}
                </Button>
              </>
            ) : (
              <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-success">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">
                      P2 - {p2Port.params.baudRate} bps
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disconnectChannel('P2')}
                  >
                    断开
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {p2Port.params.dataBits}位数据 • {p2Port.params.parity === 'none' ? '无校验' : p2Port.params.parity} • {p2Port.params.stopBits}停止位
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};