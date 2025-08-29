import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Palette, 
  Keyboard, 
  Download, 
  Upload, 
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsPanelProps {
  className?: string;
}

interface AppSettings {
  // 界面设置
  theme: 'dark' | 'light' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  maxLogLines: number;
  autoSave: boolean;
  
  // 默认串口参数
  defaultBaudRate: number;
  defaultDataBits: number;
  defaultParity: string;
  defaultStopBits: number;
  
  // 显示设置
  showTimestamp: boolean;
  autoScroll: boolean;
  displayFormat: 'ascii' | 'hex';
  
  // 快捷键设置
  shortcuts: {
    saveConfig: string;
    refreshPorts: string;
    toggleFormat: string;
    clearLogs: string;
    sendData: string;
  };
  
  // 语言设置
  language: 'zh-CN' | 'en-US';
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ className }) => {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<AppSettings>({
    // 默认设置
    theme: 'light',
    fontSize: 'medium',
    maxLogLines: 1000,
    autoSave: true,
    
    defaultBaudRate: 115200,
    defaultDataBits: 8,
    defaultParity: 'none',
    defaultStopBits: 1,
    
    showTimestamp: true,
    autoScroll: true,
    displayFormat: 'ascii',
    
    shortcuts: {
      saveConfig: 'Ctrl+S',
      refreshPorts: 'Ctrl+R', 
      toggleFormat: 'Ctrl+T',
      clearLogs: 'Ctrl+L',
      sendData: 'Enter'
    },
    
    language: 'zh-CN'
  });

  // 从本地存储加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('serialTool_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    }
  }, []);

  // 保存设置到本地存储
  const saveSettings = () => {
    try {
      localStorage.setItem('serialTool_settings', JSON.stringify(settings));
      toast({
        title: "设置已保存",
        description: "配置已保存到本地存储",
      });
    } catch (error) {
      console.error('保存设置失败:', error);
      toast({
        title: "保存失败",
        description: "无法保存设置到本地存储",
        variant: "destructive"
      });
    }
  };

  // 重置设置
  const resetSettings = () => {
    const defaultSettings: AppSettings = {
      theme: 'dark',
      fontSize: 'medium',
      maxLogLines: 1000,
      autoSave: true,
      
      defaultBaudRate: 115200,
      defaultDataBits: 8,
      defaultParity: 'none',
      defaultStopBits: 1,
      
      showTimestamp: true,
      autoScroll: true,
      displayFormat: 'ascii',
      
      shortcuts: {
        saveConfig: 'Ctrl+S',
        refreshPorts: 'Ctrl+R',
        toggleFormat: 'Ctrl+T',
        clearLogs: 'Ctrl+L',
        sendData: 'Enter'
      },
      
      language: 'zh-CN'
    };

    setSettings(defaultSettings);
    toast({
      title: "设置已重置",
      description: "所有设置已恢复到默认值",
    });
  };

  // 导出设置
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `serial-tool-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "设置已导出",
      description: "设置文件已下载到本地",
    });
  };

  // 导入设置
  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          setSettings(prev => ({ ...prev, ...imported }));
          
          toast({
            title: "设置已导入",
            description: "配置文件已成功加载",
          });
        } catch (error) {
          console.error('导入设置失败:', error);
          toast({
            title: "导入失败",
            description: "配置文件格式错误",
            variant: "destructive"
          });
        }
      };
      
      reader.readAsText(file);
    };

    input.click();
  };

  // 更新设置
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // 如果启用了自动保存，立即保存
    if (settings.autoSave && key !== 'autoSave') {
      setTimeout(() => {
        localStorage.setItem('serialTool_settings', JSON.stringify({ ...settings, [key]: value }));
      }, 100);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          设置
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="serial">串口</TabsTrigger>
            <TabsTrigger value="display">显示</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            {/* 主题设置 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                主题
              </Label>
              <Select 
                value={settings.theme} 
                onValueChange={(value: any) => updateSetting('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">深色主题</SelectItem>
                  <SelectItem value="light">浅色主题</SelectItem>
                  <SelectItem value="auto">跟随系统</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 字体大小 */}
            <div className="space-y-2">
              <Label>字体大小</Label>
              <Select 
                value={settings.fontSize} 
                onValueChange={(value: any) => updateSetting('fontSize', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">小 (12px)</SelectItem>
                  <SelectItem value="medium">中 (14px)</SelectItem>
                  <SelectItem value="large">大 (16px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 语言设置 */}
            <div className="space-y-2">
              <Label>语言</Label>
              <Select 
                value={settings.language} 
                onValueChange={(value: any) => updateSetting('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 日志行数限制 */}
            <div className="space-y-2">
              <Label>最大日志行数</Label>
              <Input
                type="number"
                min="100"
                max="10000"
                value={settings.maxLogLines}
                onChange={(e) => updateSetting('maxLogLines', parseInt(e.target.value) || 1000)}
              />
            </div>

            {/* 自动保存 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="autoSave">自动保存设置</Label>
              <Switch
                id="autoSave"
                checked={settings.autoSave}
                onCheckedChange={(checked) => updateSetting('autoSave', checked)}
              />
            </div>
          </TabsContent>

          <TabsContent value="serial" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Label className="text-base font-medium">默认串口参数</Label>
              
              {/* 默认波特率 */}
              <div className="space-y-2">
                <Label>波特率</Label>
                <Select 
                  value={settings.defaultBaudRate.toString()} 
                  onValueChange={(value) => updateSetting('defaultBaudRate', parseInt(value))}
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

              {/* 数据位 */}
              <div className="space-y-2">
                <Label>数据位</Label>
                <Select 
                  value={settings.defaultDataBits.toString()} 
                  onValueChange={(value) => updateSetting('defaultDataBits', parseInt(value))}
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

              {/* 校验位 */}
              <div className="space-y-2">
                <Label>校验位</Label>
                <Select 
                  value={settings.defaultParity} 
                  onValueChange={(value) => updateSetting('defaultParity', value)}
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

              {/* 停止位 */}
              <div className="space-y-2">
                <Label>停止位</Label>
                <Select 
                  value={settings.defaultStopBits.toString()} 
                  onValueChange={(value) => updateSetting('defaultStopBits', parseInt(value))}
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
          </TabsContent>

          <TabsContent value="display" className="space-y-4 mt-4">
            {/* 显示选项 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showTimestamp">显示时间戳</Label>
                <Switch
                  id="showTimestamp"
                  checked={settings.showTimestamp}
                  onCheckedChange={(checked) => updateSetting('showTimestamp', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoScroll">自动滚动</Label>
                <Switch
                  id="autoScroll"
                  checked={settings.autoScroll}
                  onCheckedChange={(checked) => updateSetting('autoScroll', checked)}
                />
              </div>

              {/* 默认显示格式 */}
              <div className="space-y-2">
                <Label>默认显示格式</Label>
                <Select 
                  value={settings.displayFormat} 
                  onValueChange={(value: any) => updateSetting('displayFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ascii">ASCII</SelectItem>
                    <SelectItem value="hex">十六进制</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* 快捷键设置 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Keyboard className="w-4 h-4" />
                快捷键
              </Label>
              
              {Object.entries(settings.shortcuts).map(([key, shortcut]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-sm">
                    {key === 'saveConfig' && '保存配置'}
                    {key === 'refreshPorts' && '刷新端口'}
                    {key === 'toggleFormat' && '切换格式'}
                    {key === 'clearLogs' && '清空日志'}
                    {key === 'sendData' && '发送数据'}
                  </Label>
                  <Badge variant="outline" className="font-mono">
                    {shortcut}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button onClick={saveSettings} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
          
          <Button variant="outline" onClick={exportSettings}>
            <Download className="w-4 h-4" />
          </Button>
          
          <Button variant="outline" onClick={importSettings}>
            <Upload className="w-4 h-4" />
          </Button>
          
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* 当前设置状态 */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>主题:</span>
              <span>{settings.theme === 'dark' ? '深色' : settings.theme === 'light' ? '浅色' : '跟随系统'}</span>
            </div>
            <div className="flex justify-between">
              <span>默认波特率:</span>
              <span>{settings.defaultBaudRate}</span>
            </div>
            <div className="flex justify-between">
              <span>自动保存:</span>
              <span>{settings.autoSave ? '启用' : '禁用'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};