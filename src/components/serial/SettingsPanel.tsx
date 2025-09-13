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
  Trash2,
  FolderOpen,
  Hash,
  ChevronDown,
  FileCode,
  Info,
  Github,
  Globe,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';

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

  // 选择日志存储目录
  const handleSelectLogDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择日志存储目录'
      });

      if (selected) {
        updateSetting('logStoragePath', selected as string);
        statusMessages?.addMessage('日志存储路径已更新', 'success');
      }
    } catch (error) {
      console.error('选择目录失败:', error);
      statusMessages?.addMessage('选择目录失败', 'error');
    }
  };

  // 创建日志存储目录
  const handleCreateLogDirectory = async () => {
    try {
      const path = settings.logStoragePath;
      
      if (!path) {
        statusMessages?.addMessage('请先设置日志存储路径', 'warning');
        return;
      }

      const pathExists = await exists(path);
      
      if (pathExists) {
        statusMessages?.addMessage('目录已存在', 'info');
        return;
      }

      await mkdir(path, { recursive: true });
      statusMessages?.addMessage('日志存储目录创建成功', 'success');
    } catch (error) {
      console.error('创建目录失败:', error);
      statusMessages?.addMessage('创建目录失败: ' + (error as Error).message, 'error');
    }
  };

  // 选择工作区目录
  const handleSelectWorkspaceDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择工作区目录'
      });

      if (selected) {
        updateSetting('workspacePath', selected as string);
        statusMessages?.addMessage('工作区路径已更新', 'success');
      }
    } catch (error) {
      console.error('选择目录失败:', error);
      statusMessages?.addMessage('选择目录失败', 'error');
    }
  };

  // 创建工作区目录和示例测试用例
  const handleCreateWorkspaceDirectory = async () => {
    try {
      const path = settings.workspacePath;
      
      if (!path) {
        statusMessages?.addMessage('请先设置工作区路径', 'warning');
        return;
      }

      const pathExists = await exists(path);
      
      if (!pathExists) {
        await mkdir(path, { recursive: true });
      }

      // 创建最小的测试用例文件
      const minimalTestCase = {
        id: "demo_001",
        uniqueId: "1001",
        name: "示例测试用例",
        description: "这是一个基础的测试用例示例",
        commands: [
          {
            id: "cmd_001",
            type: "execution",
            command: "AT",
            validationMethod: "contains",
            expectedValue: "OK",
            waitTime: 1000,
            stopOnFailure: false,
            failureHandling: "stop",
            lineEnding: "crlf",
            selected: false,
            status: "pending"
          }
        ],
        subCases: [],
        isExpanded: true,
        isRunning: false,
        currentCommand: -1,
        selected: false,
        status: "pending",
        failureStrategy: "stop",
        onWarningFailure: "continue",
        onErrorFailure: "stop"
      };

      const testCaseFilePath = `${path}/sample_test_case.json`;
      const testCaseFileExists = await exists(testCaseFilePath);
      
      if (!testCaseFileExists) {
        await writeTextFile(testCaseFilePath, JSON.stringify([minimalTestCase], null, 2));
        statusMessages?.addMessage('工作区目录和示例测试用例文件创建成功', 'success');
      } else {
        statusMessages?.addMessage('工作区目录创建成功，示例文件已存在', 'info');
      }
    } catch (error) {
      console.error('创建工作区失败:', error);
      statusMessages?.addMessage('创建工作区失败: ' + (error as Error).message, 'error');
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">{t('settings.tabs.general')}</TabsTrigger>
            <TabsTrigger value="serial">{t('settings.tabs.serial')}</TabsTrigger>
            <TabsTrigger value="display">{t('settings.tabs.display')}</TabsTrigger>
            <TabsTrigger value="terminal">{t('settings.tabs.terminal')}</TabsTrigger>
            <TabsTrigger value="about">{t('settings.tabs.about')}</TabsTrigger>
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
                onValueChange={(value) => updateSetting('theme', value as 'dark' | 'light' | 'auto')}
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
                onValueChange={(value) => updateSetting('fontSize', value as 'small' | 'medium' | 'large')}
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
                onValueChange={(value) => updateSetting('language', value as 'zh-CN' | 'en-US')}
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

            {/* 日志存储路径 */}
            <div className="space-y-2">
              <Label>日志存储路径</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={settings.logStoragePath}
                  onChange={(e) => updateSetting('logStoragePath', e.target.value)}
                  placeholder="./logs"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectLogDirectory}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  浏览
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCreateLogDirectory}
                >
                  创建
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                设置日志文件的存储目录，如果目录不存在将自动创建
              </div>
            </div>

            {/* 工作区路径 */}
            <div className="space-y-2">
              <Label>默认工作区路径</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={settings.workspacePath}
                  onChange={(e) => updateSetting('workspacePath', e.target.value)}
                  placeholder="./test"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectWorkspaceDirectory}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  浏览
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCreateWorkspaceDirectory}
                >
                  创建
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                设置测试用例文件的默认工作目录，如果目录不存在将自动创建并生成示例文件
              </div>
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

          <TabsContent value="terminal" className="space-y-4 mt-4">
            {/* 终端字体大小 */}
            <div className="space-y-2">
              <Label>{t('settings.terminal.fontSize')}</Label>
              <Input
                type="number"
                min="8"
                max="24"
                value={settings.terminalFontSize}
                onChange={(e) => updateSetting('terminalFontSize', parseInt(e.target.value) || 12)}
              />
              <div className="text-xs text-muted-foreground">
                {t('settings.terminal.fontSizeDesc')}
              </div>
            </div>

            {/* 行高设置 */}
            <div className="space-y-2">
              <Label>{t('settings.terminal.lineHeight')}</Label>
              <Select 
                value={settings.terminalLineHeight} 
                onValueChange={(value) => updateSetting('terminalLineHeight', value as 'compact' | 'normal' | 'loose')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">{t('settings.terminal.lineHeightCompact')}</SelectItem>
                  <SelectItem value="normal">{t('settings.terminal.lineHeightNormal')}</SelectItem>
                  <SelectItem value="loose">{t('settings.terminal.lineHeightLoose')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 行间距设置 */}
            <div className="space-y-2">
              <Label>{t('settings.terminal.rowGap')}</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={settings.terminalRowGap}
                onChange={(e) => updateSetting('terminalRowGap', parseInt(e.target.value) || 0)}
              />
              <div className="text-xs text-muted-foreground">
                {t('settings.terminal.rowGapDesc')}
              </div>
            </div>

            {/* 颜色模式 */}
            <div className="space-y-2">
              <Label>{t('settings.terminal.colorMode')}</Label>
              <Select 
                value={settings.terminalColorMode} 
                onValueChange={(value) => updateSetting('terminalColorMode', value as 'black' | 'byType')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="black">{t('settings.terminal.colorModeBlack')}</SelectItem>
                  <SelectItem value="byType">{t('settings.terminal.colorModeByType')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {t('settings.terminal.colorModeDesc')}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about" className="space-y-6 mt-4">
            {/* 应用信息 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Serial Pilot</h3>
                  <p className="text-sm text-muted-foreground">高级串口调试工具</p>
                </div>
              </div>

              <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">版本:</span>
                  <Badge variant="secondary">v0.1.0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">构建时间:</span>
                  <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString('zh-CN')}</span>
                </div>                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">平台:</span>
                  <span className="text-sm text-muted-foreground">{window.__TAURI__ ? '桌面版' : 'Web版'}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* 功能特性 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                核心功能
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>双通道串口通信支持</li>
                <li>实时数据监控与记录</li>
                <li>高级测试用例管理</li>
                <li>脚本编辑与执行</li>
                <li>变量提取与验证</li>
                <li>多语言界面支持</li>
              </ul>
            </div>

            <Separator />

            {/* 链接与资源 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                相关链接
              </h4>
              <div className="grid gap-2">
                <Button variant="outline" size="sm" className="justify-start" onClick={() => window.open('https://github.com/your-repo/serial-pilot', '_blank')}>
                  <Github className="w-4 h-4 mr-2" />
                  GitHub 仓库
                </Button>
                <Button variant="outline" size="sm" className="justify-start" onClick={() => window.open('https://github.com/your-repo/serial-pilot/issues', '_blank')}>
                  <Info className="w-4 h-4 mr-2" />
                  问题反馈
                </Button>
              </div>
            </div>

            <Separator />

            {/* 版本检查与更新 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Download className="w-4 h-4" />
                版本更新
              </h4>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      // 检查更新的逻辑
                      const response = await fetch('https://api.github.com/repos/your-repo/serial-pilot/releases/latest');
                      const data = await response.json();
                      
                      if (data.tag_name && data.tag_name !== `v${'0.1.0'}`) {
                        toast({
                          title: "发现新版本",
                          description: `新版本 ${data.tag_name} 可用，点击链接下载。`,
                          action: {
                            label: "下载",
                            onClick: () => window.open(data.html_url, '_blank')
                          }
                        });
                      } else {
                        toast({
                          title: "已是最新版本",
                          description: "当前版本已是最新。"
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "检查更新失败",
                        description: "无法连接到更新服务器。",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  检查更新
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // 重新启动应用（如果是Tauri环境）
                    if (window.__TAURI__) {
                      // Tauri重启逻辑
                      toast({
                        title: "重启应用",
                        description: "应用将重新启动..."
                      });
                      setTimeout(() => {
                        // 这里可以添加实际的重启逻辑
                        window.location.reload();
                      }, 1000);
                    } else {
                      window.location.reload();
                    }
                  }}
                >
                  重启应用
                </Button>
              </div>
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