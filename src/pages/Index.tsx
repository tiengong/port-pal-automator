import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, TestTube2, Terminal, Wifi, WifiOff, Power, PowerOff } from "lucide-react";
import { SerialConnection } from "@/components/serial/SerialConnection";
import { DataTerminal } from "@/components/serial/DataTerminal";
import { TestCaseManager } from "@/components/serial/TestCaseManager";
import { SettingsPanel } from "@/components/serial/SettingsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SerialPort {
  port: any;
  params: {
    baudRate: number;
    dataBits: number;
    parity: string;
    stopBits: number;
  };
}

const Index = () => {
  const [connectedPorts, setConnectedPorts] = useState<SerialPort[]>([]);
  const [leftPanelTab, setLeftPanelTab] = useState("connection");
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [receivedData, setReceivedData] = useState<string[]>([]);

  // Web Serial API availability check
  const isSerialSupported = 'serial' in navigator;

  const handlePortConnect = (port: any, params: any) => {
    const newPort: SerialPort = { port, params };
    setConnectedPorts(prev => [...prev, newPort]);
  };

  const handlePortDisconnect = (port: any) => {
    setConnectedPorts(prev => prev.filter(p => p.port !== port));
  };

  // 快速连接/断开
  const handleQuickToggleConnection = () => {
    if (connectedPorts.length > 0) {
      // 断开所有连接
      connectedPorts.forEach(({ port }) => handlePortDisconnect(port));
    } else {
      // 显示连接面板
      setShowConnectionPanel(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-12 bg-card border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">串口调试工具</h1>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">v2.2.0</Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status & Quick Connect */}
          <div className="flex items-center gap-2">
            {connectedPorts.length > 0 ? (
              <Badge variant="outline" className="text-xs border-success text-success">
                <Wifi className="w-3 h-3 mr-1" />
                {connectedPorts.length} 端口
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <WifiOff className="w-3 h-3 mr-1" />
                未连接
              </Badge>
            )}
            
            <Button
              variant={connectedPorts.length > 0 ? "destructive" : "default"}
              size="sm"
              className="h-7 px-2"
              onClick={handleQuickToggleConnection}
            >
              {connectedPorts.length > 0 ? (
                <PowerOff className="w-3 h-3" />
              ) : (
                <Power className="w-3 h-3" />
              )}
            </Button>
          </div>

          {/* Settings Dialog */}
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2">
                <Settings2 className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>应用设置</DialogTitle>
              </DialogHeader>
              <SettingsPanel />
            </DialogContent>
          </Dialog>

          {!isSerialSupported && (
            <Badge variant="destructive" className="text-xs">
              不支持 Web Serial API
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <div className="flex h-[calc(100vh-3rem)]">
        {/* Left Panel - Tabbed Interface */}
        <div className="w-96 bg-card border-r border-border flex flex-col">
          <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="flex-1 flex flex-col">
            <div className="border-b border-border px-1 py-1">
              <TabsList className="grid w-full grid-cols-2 h-8 bg-secondary/30">
                <TabsTrigger value="connection" className="text-xs h-6">
                  连接
                </TabsTrigger>
                <TabsTrigger value="testcase" className="text-xs h-6">
                  <TestTube2 className="w-3 h-3 mr-1" />
                  测试
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="connection" className="flex-1 m-0 p-4">
              <SerialConnection
                onConnect={handlePortConnect}
                onDisconnect={handlePortDisconnect}
                isSupported={isSerialSupported}
                connectedPorts={connectedPorts}
              />
            </TabsContent>

            <TabsContent value="testcase" className="flex-1 m-0">
              <TestCaseManager 
                connectedPorts={connectedPorts}
                receivedData={receivedData}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Data Terminal */}
        <div className="flex-1 flex flex-col">
          <DataTerminal 
            connectedPorts={connectedPorts}
            onDisconnect={handlePortDisconnect}
          />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="h-8 bg-card border-t border-border px-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>串口调试工具 v2.2.0</span>
          {isSerialSupported ? (
            <span className="text-success">● Web Serial API 已支持</span>
          ) : (
            <span className="text-warning">● 请使用 Chrome/Edge 浏览器</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {connectedPorts.length > 0 && (
            <span>
              活跃连接: {connectedPorts.map((p, i) => (
                <span key={i} className="text-success">
                  {p.params.baudRate}bps
                  {i < connectedPorts.length - 1 && ", "}
                </span>
              ))}
            </span>
          )}
          <span>© 2024</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;