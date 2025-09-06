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
import { useTranslation } from "react-i18next";
import { useSerialManager, type SerialPortInfo } from "@/hooks/useSerialManager";
import { SerialPortInfo as TransportPortInfo } from '@/lib/serial/transport';

interface DualChannelConnectionProps {
  serialManager: ReturnType<typeof useSerialManager>;
  isSupported: boolean;
}

export const DualChannelConnection: React.FC<DualChannelConnectionProps> = ({
  serialManager,
  isSupported
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [availablePorts, setAvailablePorts] = useState<TransportPortInfo[]>([]);
  const [selectedPorts, setSelectedPorts] = useState<{
    P1: TransportPortInfo | null;
    P2: TransportPortInfo | null;
  }>({ P1: null, P2: null });
  const [selectedIndex, setSelectedIndex] = useState<{
    P1: string;
    P2: string;
  }>({ P1: "", P2: "" });
  const [isConnecting, setIsConnecting] = useState<{
    P1: boolean;
    P2: boolean;
  }>({ P1: false, P2: false });

  const { strategy, updateStrategy, ports, serialManager: manager } = serialManager;

  // 获取可用串口
  const refreshPorts = async () => {
    if (!manager.isSupported()) {
      toast({
        title: t("connection.webSerialNotSupported"),
        description: t("connection.webSerialNotSupportedDesc"),
        variant: "destructive"
      });
      return;
    }

    try {
      const ports = await manager.listPorts();
      setAvailablePorts(ports);
      
      if (ports.length === 0) {
        toast({
          title: t("connection.noPortsFound"),
          description: t("connection.noPortsFoundDesc"),
        });
      }
    } catch (error) {
      console.error('获取串口列表失败:', error);
      toast({
        title: t("connection.requestFailed"),
        description: t("connection.requestFailedDesc"),
        variant: "destructive"
      });
    }
  };

  // 请求新串口访问并刷新
  const requestPortAndRefresh = async () => {
    if (!manager.isSupported()) return;

    try {
      const port = await manager.requestPort();
      if (port) {
        await refreshPorts();
        toast({
          title: t("connection.deviceAdded"),
          description: t("connection.deviceAddedDesc"),
        });
      }
    } catch (error) {
      console.error('请求串口访问失败:', error);
      toast({
        title: t("connection.requestFailed"),
        description: t("connection.requestFailedDesc"),
        variant: "destructive"
      });
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
    if (manager.isSupported()) {
      refreshPorts();
    }
  }, [manager]);

  if (!manager.isSupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            <span>{t("connection.browserNotSupported")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {window.__TAURI__ 
              ? t("connection.tauriSerialNotSupported")
              : t("connection.currentBrowserNotSupported")
            }
          </p>
          {!window.__TAURI__ && (
            <div className="space-y-2">
              <Badge variant="outline">Chrome 89+</Badge>
              <Badge variant="outline">Edge 89+</Badge>
              <Badge variant="outline">Opera 76+</Badge>
            </div>
          )}
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
                <span>{t("connection.serialConnection")}</span>
                <Badge variant="secondary" className="ml-auto">{t("connection.connected")}</Badge>
              </>
            ) : (
              <>
                <Plug className="w-5 h-5" />
                <span>{t("connection.serialConnection")}</span>
                <Badge variant="outline" className="ml-auto">{t("connection.disconnected")}</Badge>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!p1Port?.connected ? (
            <>
              {/* Port Selection */}
              <div className="space-y-2">
                <Label>{t("connection.selectPort")}</Label>
                <Select
                  value={selectedIndex.P1}
                  onValueChange={async (value) => {
                    if (value === "add-port") {
                      await requestPortAndRefresh();
                      return;
                    }
                    const port = availablePorts[parseInt(value)];
                    setSelectedPorts(prev => ({ ...prev, P1: port }));
                    setSelectedIndex(prev => ({ ...prev, P1: value }));
                  }}
                  onOpenChange={async (isOpen) => {
                    if (isOpen) {
                      // 每次打开时都刷新串口列表
                      await refreshPorts();
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("connection.selectDeviceAuto")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePorts.length === 0 ? (
                      <>
                        <SelectItem value="no-ports" disabled>
                          {t("connection.noPortsAvailable")}
                        </SelectItem>
                        <SelectItem value="add-port">
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            {t("connection.addNewDevice")}
                          </div>
                        </SelectItem>
                      </>
                    ) : (
                      availablePorts.map((port, index) => {
                        return (
                          <SelectItem key={index} value={index.toString()}>
                            {port.name}
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
                  <Label>{t("connection.baudRate")}</Label>
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
                  <Label>{t("connection.dataBits")}</Label>
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
                          {bits} {t("connection.bits")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("connection.parity")}</Label>
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
                      <SelectItem value="none">{t("connection.noParity")}</SelectItem>
                      <SelectItem value="even">{t("connection.evenParity")}</SelectItem>
                      <SelectItem value="odd">{t("connection.oddParity")}</SelectItem>
                      <SelectItem value="mark">{t("connection.markParity")}</SelectItem>
                      <SelectItem value="space">{t("connection.spaceParity")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("connection.stopBits")}</Label>
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
                      <SelectItem value="1">1 {t("connection.bits")}</SelectItem>
                      <SelectItem value="2">2 {t("connection.bits")}</SelectItem>
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
                    {t("connection.connecting")}
                  </>
                ) : (
                  t("connection.connect")
                )}
              </Button>
            </>
          ) : (
            <div className="p-3 bg-success/10 border border-success/20 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-success">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {t("connection.connected")} - {p1Port.params.baudRate} bps
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => disconnectChannel('P1')}
                >
                  {t("connection.disconnect")}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {p1Port.params.dataBits}{t("connection.bits")} • {p1Port.params.parity === 'none' ? t("connection.noParity") : p1Port.params.parity} • {p1Port.params.stopBits}{t("connection.stopBits")}
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
              title: t("connection.secondPortEnabled"),
              description: t("connection.secondPortEnabledDesc"),
            });
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("connection.addSecondPort")}
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
                  <span>{t("connection.secondSerialPort")}</span>
                  <Badge variant="secondary" className="ml-auto">{t("connection.connected")}</Badge>
                </>
              ) : (
                <>
                  <Plug className="w-5 h-5" />
                  <span>{t("connection.secondSerialPort")}</span>
                  <Badge variant="outline" className="ml-auto">{t("connection.disconnected")}</Badge>
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
                  <Label>{t("connection.selectPort")}</Label>
                  <Select
                    value={selectedIndex.P2}
                    onValueChange={async (value) => {
                      if (value === "add-port") {
                        await requestPortAndRefresh();
                        return;
                      }
                      const port = availablePorts[parseInt(value)];
                      setSelectedPorts(prev => ({ ...prev, P2: port }));
                      setSelectedIndex(prev => ({ ...prev, P2: value }));
                    }}
                    onOpenChange={async (isOpen) => {
                      if (isOpen) {
                        // 每次打开时都刷新串口列表
                        await refreshPorts();
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("connection.selectDeviceAuto")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePorts.length === 0 ? (
                        <>
                          <SelectItem value="no-ports" disabled>
                            {t("connection.noPortsAvailable")}
                          </SelectItem>
                          <SelectItem value="add-port">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              {t("connection.addNewDevice")}
                            </div>
                          </SelectItem>
                        </>
                      ) : (
                        availablePorts.map((port, index) => {
                        return (
                          <SelectItem key={index} value={index.toString()}>
                            {port.name}
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
                    <Label>{t("connection.baudRate")}</Label>
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
                    <Label>{t("connection.dataBits")}</Label>
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
                            {bits} {t("connection.bits")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("connection.parity")}</Label>
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
                        <SelectItem value="none">{t("connection.noParity")}</SelectItem>
                        <SelectItem value="even">{t("connection.evenParity")}</SelectItem>
                        <SelectItem value="odd">{t("connection.oddParity")}</SelectItem>
                        <SelectItem value="mark">{t("connection.markParity")}</SelectItem>
                        <SelectItem value="space">{t("connection.spaceParity")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("connection.stopBits")}</Label>
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
                        <SelectItem value="1">1 {t("connection.bits")}</SelectItem>
                        <SelectItem value="2">2 {t("connection.bits")}</SelectItem>
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
                      {t("connection.connecting")}
                    </>
                  ) : (
                    t("connection.connect")
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
                    {t("connection.disconnect")}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {p2Port.params.dataBits}{t("connection.bits")} • {p2Port.params.parity === 'none' ? t("connection.noParity") : p2Port.params.parity} • {p2Port.params.stopBits}{t("connection.stopBits")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};