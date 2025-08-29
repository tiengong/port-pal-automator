import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, TestTube2, Terminal, Wifi, WifiOff, Power, PowerOff, Plug } from "lucide-react";
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
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Enhanced Header */}
      <header className="h-14 app-header px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">串口调试工具</h1>
          </div>
          <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20">
            v2.2.0
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Enhanced Connection Status */}
          <div className="flex items-center gap-3">
            {connectedPorts.length > 0 ? (
              <Badge 
                variant="outline" 
                className="text-xs border-success/50 bg-success/10 text-success hover:bg-success/20 transition-smooth"
              >
                <Wifi className="w-3 h-3 mr-1.5" />
                {connectedPorts.length} 端口已连接
              </Badge>
            ) : (
              <Badge 
                variant="outline" 
                className="text-xs border-muted-foreground/30 bg-muted/30 text-muted-foreground"
              >
                <WifiOff className="w-3 h-3 mr-1.5" />
                未连接
              </Badge>
            )}
            
            <Button
              variant={connectedPorts.length > 0 ? "destructive" : "default"}
              size="sm"
              className="h-8 px-3 transition-spring"
              onClick={handleQuickToggleConnection}
            >
              {connectedPorts.length > 0 ? (
                <>
                  <PowerOff className="w-3 h-3 mr-1.5" />
                  断开
                </>
              ) : (
                <>
                  <Power className="w-3 h-3 mr-1.5" />
                  连接
                </>
              )}
            </Button>
          </div>

          {/* Settings Dialog */}
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 transition-smooth hover:shadow-md"
              >
                <Settings2 className="w-3 h-3 mr-1.5" />
                设置
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
            <Badge variant="destructive" className="text-xs animate-pulse">
              不支持 Web Serial API
            </Badge>
          )}
        </div>
      </header>

      {/* Enhanced Main Content - 2 Column Layout */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Enhanced Left Panel */}
        <div className="w-96 control-panel flex flex-col">
          <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="flex-1 flex flex-col">
            <div className="border-b border-border/50 px-4 py-3">
              <TabsList className="grid w-full grid-cols-2 h-10 bg-secondary/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="connection" 
                  className="text-sm h-8 transition-smooth data-[state=active]:shadow-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Plug className="w-4 h-4 mr-2" />
                  连接
                </TabsTrigger>
                <TabsTrigger 
                  value="testcase" 
                  className="text-sm h-8 transition-smooth data-[state=active]:shadow-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <TestTube2 className="w-4 h-4 mr-2" />
                  测试
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="connection" className="flex-1 m-0 p-6 animate-slide-up">
              <SerialConnection
                onConnect={handlePortConnect}
                onDisconnect={handlePortDisconnect}
                isSupported={isSerialSupported}
                connectedPorts={connectedPorts}
              />
            </TabsContent>

            <TabsContent value="testcase" className="flex-1 m-0 animate-slide-up">
              <TestCaseManager 
                connectedPorts={connectedPorts}
                receivedData={receivedData}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Enhanced Right Panel - Data Terminal */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-background to-secondary/30">
          <DataTerminal 
            connectedPorts={connectedPorts}
            onDisconnect={handlePortDisconnect}
          />
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <footer className="h-10 bg-gradient-to-r from-card to-secondary/50 border-t border-border/50 px-6 flex items-center justify-between text-sm text-muted-foreground backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <span className="font-medium">串口调试工具 v2.2.0</span>
          {isSerialSupported ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse-success"></div>
              <span className="text-success font-medium">Web Serial API 已支持</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse-warning"></div>
              <span className="text-warning font-medium">请使用 Chrome/Edge 浏览器</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          {connectedPorts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">活跃连接:</span>
              {connectedPorts.map((p, i) => (
                <span key={i} className="text-success font-medium">
                  {p.params.baudRate}bps
                  {i < connectedPorts.length - 1 && <span className="text-muted-foreground mx-1">,</span>}
                </span>
              ))}
            </div>
          )}
          <span className="text-muted-foreground/70">© 2024</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;