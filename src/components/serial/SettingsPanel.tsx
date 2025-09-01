import React from "react";
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
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";

interface SettingsPanelProps {
  className?: string;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ className, statusMessages }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { settings, updateSetting, saveSettings, resetSettings, exportSettings, importSettings } = useSettings();

  // 手动保存设置
  const handleSaveSettings = async () => {
    const success = await saveSettings();
    const message = success ? t('settings.messages.saved') : t('settings.messages.saveFailed');
    const description = success ? "配置已保存到本地存储" : "无法保存设置到本地存储";
    const type = success ? "success" : "error" as const;
    
    if (statusMessages) {
      statusMessages.addMessage(message, type);
    } else {
      toast({
        title: message,
        description,
        variant: success ? "default" : "destructive"
      });
    }
  };

  // 重置设置
  const handleResetSettings = () => {
    resetSettings();
    const message = t('settings.messages.reset');
    const description = "所有设置已恢复到默认值";
    
    if (statusMessages) {
      statusMessages.addMessage(message, "success");
    } else {
      toast({
        title: message,
        description,
      });
    }
  };

  // 导出设置
  const handleExportSettings = () => {
    exportSettings();
    const message = t('settings.messages.exported');
    const description = "设置文件已下载到本地";
    
    if (statusMessages) {
      statusMessages.addMessage(message, "success");
    } else {
      toast({
        title: message,
        description,
      });
    }
  };

  // 导入设置
  const handleImportSettings = async () => {
    const success = await importSettings();
    const message = success ? t('settings.messages.imported') : t('settings.messages.importFailed');
    const description = success ? "配置文件已成功加载" : "配置文件格式错误";
    const type = success ? "success" : "error" as const;
    
    if (statusMessages) {
      statusMessages.addMessage(message, type);
    } else {
      toast({
        title: message,
        description,
        variant: success ? "default" : "destructive"
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {t('settings.title')}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t('settings.tabs.general')}</TabsTrigger>
            <TabsTrigger value="serial">{t('settings.tabs.serial')}</TabsTrigger>
            <TabsTrigger value="display">{t('settings.tabs.display')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            {/* 主题设置 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {t('settings.general.theme')}
              </Label>
              <Select 
                value={settings.theme} 
                onValueChange={(value: any) => updateSetting('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">{t('settings.general.themeDark')}</SelectItem>
                  <SelectItem value="light">{t('settings.general.themeLight')}</SelectItem>
                  <SelectItem value="auto">{t('settings.general.themeAuto')}</SelectItem>
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

              <Separator />

              {/* 自动发送设置 */}
              <div className="space-y-4">
                <Label className="text-base font-medium">自动发送设置</Label>
                
                {/* 默认自动发送间隔 */}
                <div className="space-y-2">
                  <Label>默认自动发送间隔 (毫秒)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="3600000"
                    value={settings.defaultAutoSendInterval}
                    onChange={(e) => updateSetting('defaultAutoSendInterval', parseInt(e.target.value) || 1000)}
                    placeholder="1000"
                  />
                  <div className="text-xs text-muted-foreground">
                    设置自动发送功能的默认间隔时间，范围：10ms - 3600000ms (1小时)
                  </div>
                </div>
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
                    <SelectItem value="utf8">UTF-8</SelectItem>
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
          <Button onClick={handleSaveSettings} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
          
          <Button variant="outline" onClick={handleExportSettings}>
            <Download className="w-4 h-4" />
          </Button>
          
          <Button variant="outline" onClick={handleImportSettings}>
            <Upload className="w-4 h-4" />
          </Button>
          
          <Button variant="outline" onClick={handleResetSettings}>
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
              <span>自动发送间隔:</span>
              <span>{settings.defaultAutoSendInterval}ms</span>
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