import React, { useState, useEffect } from "react";
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
import { useGlobalMessages } from "@/hooks/useGlobalMessages";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  const serialManager = useSerialManager();
  const globalMessages = useGlobalMessages();
  const { settings } = useSettings();
  
  // 记住左侧页签状态
  const [leftPanelTab, setLeftPanelTab] = useState(() => {
    return localStorage.getItem('serial_left_tab') || 'connection';
  });
  
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [receivedData, setReceivedData] = useState<string[]>([]);

  // 保存页签状态到 localStorage
  useEffect(() => {
    localStorage.setItem('serial_left_tab', leftPanelTab);
  }, [leftPanelTab]);

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

  // 同步默认串口参数到未连接的端口
  useEffect(() => {
    const disconnectedPorts = serialManager.ports.filter(p => !p.connected);
    if (disconnectedPorts.length > 0) {
      // 更新未连接端口的默认配置
      disconnectedPorts.forEach(portInfo => {
        const updatedConfig = {
          baudRate: settings.defaultBaudRate,
          dataBits: settings.defaultDataBits as 5 | 6 | 7 | 8,
          parity: settings.defaultParity as 'none' | 'even' | 'odd' | 'mark' | 'space',
          stopBits: settings.defaultStopBits as 1 | 2
        };
        
        if (portInfo.label === 'P1') {
          serialManager.updateStrategy({ p1Config: updatedConfig });
        } else if (portInfo.label === 'P2') {
          serialManager.updateStrategy({ p2Config: updatedConfig });
        }
      });
    }
  }, [settings.defaultBaudRate, settings.defaultDataBits, settings.defaultParity, settings.defaultStopBits, serialManager.ports]);

  return (
    <div className="h-[100svh] md:h-screen w-full overflow-hidden bg-background animate-fade-in flex flex-col">
      {/* Enhanced Header */}
      <header className="h-14 app-header px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">{t('app.title')}</h1>
          </div>
          <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20">
            {t('app.version')}
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
                {t('app.disconnected')}
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
                    <p>{serialManager.isConnected() ? t('app.quickToggle') : t('app.quickToggle')}</p>
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
                {t('app.settings')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90svh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('settings.title')}</DialogTitle>
              </DialogHeader>
              <SettingsPanel statusMessages={globalMessages} />
            </DialogContent>
          </Dialog>

          {!isSerialSupported && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              {t('app.notSupported')}
            </Badge>
          )}
        </div>
      </header>

      {/* Enhanced Main Content - 2 Column Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Enhanced Left Panel */}
        <div className="w-full md:w-96 control-panel flex flex-col min-w-0 min-h-0">
          <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-border/50 px-4 py-3">
              <TabsList className="grid w-full grid-cols-2 h-10 bg-secondary/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="connection" 
                  className="text-sm h-8 transition-smooth data-[state=active]:shadow-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Plug className="w-4 h-4 mr-2" />
                  {t('tabs.connection')}
                </TabsTrigger>
                <TabsTrigger 
                  value="testcase" 
                  className="text-sm h-8 transition-smooth data-[state=active]:shadow-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <TestTube2 className="w-4 h-4 mr-2" />
                  {t('tabs.testCase')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="connection" className="flex-1 m-0 p-4 md:p-6 animate-slide-up overflow-visible">
              <SerialConnection
                serialManager={serialManager}
                isSupported={isSerialSupported}
              />
            </TabsContent>

            <TabsContent value="testcase" className="flex-1 m-0 animate-slide-up flex flex-col min-h-0" forceMount>
              <div className={leftPanelTab === 'testcase' ? 'flex flex-col min-h-0 h-full' : 'hidden'}>
                <TestCaseManager 
                  connectedPorts={serialManager.getConnectedPorts()}
                  receivedData={receivedData}
                  statusMessages={globalMessages}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Enhanced Right Panel - Data Terminal */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-background to-secondary/30 min-w-0 min-h-0 overflow-hidden">
          <DataTerminal 
            serialManager={serialManager}
            statusMessages={globalMessages}
          />
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <StatusFooter 
        isSerialSupported={isSerialSupported}
        messages={globalMessages.messages}
        onClearAllMessages={globalMessages.clearAllMessages}
      />
    </div>
  );
};

export default Index;