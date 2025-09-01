import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, TestTube2, Terminal, Wifi, WifiOff, Power, PowerOff, Plug } from "lucide-react";
import { SerialConnection } from "@/components/serial/SerialConnection";
import { DataTerminal } from "@/components/serial/DataTerminal";
import { TestCaseManager } from "@/components/serial/TestCaseManager";
import { SettingsPanel } from "@/components/serial/SettingsPanel";
import { StatusFooter } from "@/components/StatusFooter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSerialManager } from "@/hooks/useSerialManager";
import { useStatusMessages } from "@/hooks/useStatusMessages";

const Index = () => {
  const serialManager = useSerialManager();
  const statusMessages = useStatusMessages();
  const [leftPanelTab, setLeftPanelTab] = useState("connection");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [receivedData, setReceivedData] = useState<string[]>([]);

  // Web Serial API availability check
  const isSerialSupported = 'serial' in navigator;
  const connectionStatus = serialManager.getConnectionStatus();

  // 快速连接/断开
  const handleQuickToggleConnection = async () => {
    const result = await serialManager.quickConnect();
    if (result?.showPanel) {
      setLeftPanelTab("connection");
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
            {connectionStatus.count > 0 ? (
              <Badge 
                variant="outline" 
                className="text-xs border-success/50 bg-success/10 text-success hover:bg-success/20 transition-smooth"
              >
                <Wifi className="w-3 h-3 mr-1.5" />
                {connectionStatus.label}
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
            
            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={serialManager.isConnected() ? "destructive" : "default"}
                      size="sm"
                      className="h-8 px-3 transition-spring rounded-r-none"
                      onClick={handleQuickToggleConnection}
                    >
                      {serialManager.isConnected() ? (
                        <PowerOff className="w-3 h-3" />
                      ) : (
                        <Power className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{serialManager.isConnected() ? "断开全部连接" : "快速连接串口"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!serialManager.isConnected() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 rounded-l-none border-l-0"
                  onClick={() => setLeftPanelTab("connection")}
                >
                  <Plug className="w-3 h-3" />
                </Button>
              )}
            </div>
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
                serialManager={serialManager}
                isSupported={isSerialSupported}
              />
            </TabsContent>

            <TabsContent value="testcase" className="flex-1 m-0 animate-slide-up">
              <TestCaseManager 
                connectedPorts={serialManager.getConnectedPorts()}
                receivedData={receivedData}
                statusMessages={statusMessages}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Enhanced Right Panel - Data Terminal */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-background to-secondary/30">
          <DataTerminal 
            serialManager={serialManager}
            statusMessages={statusMessages}
          />
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <StatusFooter 
        currentMessage={statusMessages.currentMessage}
        onClearMessage={statusMessages.clearMessage}
        isSerialSupported={isSerialSupported}
      />
    </div>
  );
};

export default Index;