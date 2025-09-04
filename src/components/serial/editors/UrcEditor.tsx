import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Radio, Wand2 } from "lucide-react";
import { TestCommand } from '../types';
import { UrcPreview } from '../UrcPreview';
import { useTranslation } from 'react-i18next';

interface UrcEditorProps {
  command: TestCommand;
  onUpdate: (updates: Partial<TestCommand>) => void;
  jumpOptions?: {
    commandOptions: Array<{ id: string; label: string }>;
  };
}

export const UrcEditor: React.FC<UrcEditorProps> = ({
  command,
  onUpdate,
  jumpOptions
}) => {
  const [showExamples, setShowExamples] = useState(false);
  const [parameterMapText, setParameterMapText] = useState('');
  const [parameterMapError, setParameterMapError] = useState<string | null>(null);
  const [showCommandOptions, setShowCommandOptions] = useState(false);
  
  const updateCommand = (field: keyof TestCommand, value: any) => {
    onUpdate({ [field]: value });
  };

  // Sync parameterMapText with external changes
  useEffect(() => {
    const parameterMap = command.dataParseConfig?.parameterMap || {};
    const newText = JSON.stringify(parameterMap, null, 2);
    if (newText !== parameterMapText) {
      setParameterMapText(newText);
      setParameterMapError(null);
    }
  }, [command.dataParseConfig?.parameterMap]);

  const handleParameterMapChange = (text: string) => {
    setParameterMapText(text);
    
    try {
      const parameterMap = JSON.parse(text);
      const newConfig = { 
        ...command.dataParseConfig, 
        parameterMap 
      };
      updateCommand('dataParseConfig', newConfig);
      setParameterMapError(null);
    } catch (err) {
      setParameterMapError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const formatParameterMap = () => {
    try {
      const parsed = JSON.parse(parameterMapText);
      const formatted = JSON.stringify(parsed, null, 2);
      setParameterMapText(formatted);
      setParameterMapError(null);
    } catch (err) {
      // Keep current text if parsing fails
    }
  };

  // URC监听示例
  const urcExamples = [
    { 
      name: "网络注册URC", 
      urcPattern: "+CREG:", 
      urcMatchMode: "startsWith", 
      description: "监听网络注册状态变化",
      urcListenMode: "permanent"
    },
    { 
      name: "短信接收URC", 
      urcPattern: "+CMTI:", 
      urcMatchMode: "startsWith", 
      description: "监听短信接收通知",
      urcListenMode: "permanent"
    },
    { 
      name: "来电URC", 
      urcPattern: "RING", 
      urcMatchMode: "exact", 
      description: "监听来电通知",
      urcListenMode: "once",
      urcListenTimeout: 30000
    },
    { 
      name: "信号质量URC", 
      urcPattern: "+CSQ:", 
      urcMatchMode: "startsWith", 
      description: "监听信号质量变化",
      urcListenMode: "once",
      urcListenTimeout: 10000
    },
    { 
      name: "正则匹配URC", 
      urcPattern: "\\+C[A-Z]+:", 
      urcMatchMode: "regex", 
      description: "使用正则表达式匹配多种URC",
      urcListenMode: "permanent"
    }
  ];

  const insertExample = (example: any) => {
    updateCommand('urcPattern', example.urcPattern);
    updateCommand('urcMatchMode', example.urcMatchMode);
    updateCommand('urcListenMode', example.urcListenMode);
    if (example.urcListenTimeout) {
      updateCommand('urcListenTimeout', example.urcListenTimeout);
    }
    setShowExamples(false);
  };

  return (
    <div className="space-y-4">
      {/* 命令类型显示 */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-green-500">URC监听</Badge>
        <span className="text-sm text-muted-foreground">URC Listening Configuration</span>
      </div>

      {/* 快速示例 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">快速示例模板</CardTitle>
            <Popover open={showExamples} onOpenChange={setShowExamples}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Radio className="w-3 h-3 mr-1" />
                  插入示例
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="end">
                <div className="space-y-1">
                  {urcExamples.map((example, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-auto p-2"
                      onClick={() => insertExample(example)}
                    >
                      <div className="text-left">
                        <div className="font-medium text-xs">{example.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{example.urcPattern}</div>
                        <div className="text-xs text-muted-foreground">{example.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
      </Card>

      {/* URC匹配设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">URC匹配设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="urcPattern">URC内容</Label>
            <Input
              id="urcPattern"
              value={command.urcPattern || ''}
              onChange={(e) => updateCommand('urcPattern', e.target.value)}
              placeholder="输入URC匹配模式，如: +CREG:"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URC (Unsolicited Result Code) 是设备主动上报的消息
            </p>
          </div>
          
          <div>
            <Label htmlFor="urcMatchMode">URC匹配方式</Label>
            <Select
              value={command.urcMatchMode || 'contains'}
              onValueChange={(value) => updateCommand('urcMatchMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">包含</SelectItem>
                <SelectItem value="exact">完全匹配</SelectItem>
                <SelectItem value="regex">正则表达式</SelectItem>
                <SelectItem value="startsWith">开头匹配</SelectItem>
                <SelectItem value="endsWith">结尾匹配</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {command.urcMatchMode === 'regex' && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-xs text-amber-800">
                <strong>正则表达式示例：</strong><br/>
                • <code className="bg-amber-100 px-1 rounded">\\+C[A-Z]+:</code> - 匹配以+C开头的AT命令<br/>
                • <code className="bg-amber-100 px-1 rounded">RING|CONNECT</code> - 匹配RING或CONNECT<br/>
                • <code className="bg-amber-100 px-1 rounded">\\d+</code> - 匹配数字
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 监听模式 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">监听模式</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="urcListenMode">监听模式</Label>
            <Select
              value={command.urcListenMode || 'once'}
              onValueChange={(value) => updateCommand('urcListenMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">监听一次</SelectItem>
                <SelectItem value="permanent">永久监听</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {command.urcListenMode === 'permanent' 
                ? '永久监听：持续监听该URC，直到用例结束'
                : '监听一次：收到一次匹配的URC后停止监听'
              }
            </p>
          </div>
          
          {command.urcListenMode === 'once' && (
            <div>
              <Label htmlFor="urcListenTimeout">超时时间 (ms)</Label>
              <Input
                id="urcListenTimeout"
                type="number"
                value={command.urcListenTimeout || 10000}
                onChange={(e) => updateCommand('urcListenTimeout', parseInt(e.target.value) || 10000)}
                min="1000"
                placeholder="10000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                如果是监听一次，超过此时间未收到匹配的URC将视为失败
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 错误处理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">错误处理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="urcFailureHandling">错误处理</Label>
            <Select
              value={command.urcFailureHandling || 'stop'}
              onValueChange={(value) => updateCommand('urcFailureHandling', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stop">停止执行</SelectItem>
                <SelectItem value="continue">继续执行</SelectItem>
                <SelectItem value="prompt">提示用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="failureSeverity">失败异常等级</Label>
            <Select
              value={command.failureSeverity || 'error'}
              onValueChange={(value) => updateCommand('failureSeverity', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="error">异常</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {command.urcFailureHandling === 'prompt' && (
            <div>
              <Label htmlFor="urcDialogContent">失败提示内容</Label>
              <Textarea
                id="urcDialogContent"
                value={command.urcDialogContent || ''}
                onChange={(e) => updateCommand('urcDialogContent', e.target.value)}
                placeholder="当URC监听失败时显示给用户的提示信息"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 变量提取 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">变量提取</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="extractionEnabled"
              checked={command.dataParseConfig?.enabled || false}
              onCheckedChange={(checked) => {
                const newConfig = { 
                  enabled: checked,
                  parseType: 'regex' as const,
                  parsePattern: '',
                  parameterMap: {},
                  ...command.dataParseConfig
                };
                updateCommand('dataParseConfig', newConfig);
              }}
            />
            <Label htmlFor="extractionEnabled">启用变量提取</Label>
          </div>
          
          {command.dataParseConfig?.enabled && (
            <>
              <div>
                <Label htmlFor="parseType">解析方式</Label>
                <Select
                  value={command.dataParseConfig?.parseType || 'regex'}
                  onValueChange={(value) => {
                    const newConfig = { 
                      ...command.dataParseConfig, 
                      parseType: value as any,
                      parsePattern: '',
                      parameterMap: {}
                    };
                    updateCommand('dataParseConfig', newConfig);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regex">正则表达式提取</SelectItem>
                    <SelectItem value="split">分割字符串提取</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {command.dataParseConfig?.parseType === 'regex' 
                    ? '使用正则表达式捕获组提取变量，支持命名捕获组'
                    : '按指定分隔符分割字符串，按索引提取变量'
                  }
                </p>
              </div>

          <div>
            <Label htmlFor="parsePattern">
              {command.dataParseConfig?.parseType === 'regex' ? '正则表达式' : '分隔符'}
            </Label>
            <Input
              id="parsePattern"
              value={command.dataParseConfig?.parsePattern || ''}
              onChange={(e) => {
                const newConfig = { 
                  ...command.dataParseConfig, 
                  parsePattern: e.target.value 
                };
                updateCommand('dataParseConfig', newConfig);
              }}
              placeholder={
                command.dataParseConfig?.parseType === 'regex' 
                  ? '如: \\+MIPLOBSERVE:0,(\\d+),.*' 
                  : '如: ,'
              }
              className="font-mono"
            />
            {command.dataParseConfig?.parseType === 'regex' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                <p className="text-xs text-blue-800">
                  <strong>提取示例：</strong><br/>
                  • <code className="bg-blue-100 px-1 rounded">\\+MIPLOBSERVE:0,(\\d+),.*</code> → 捕获组1为msgid<br/>
                  • <code className="bg-blue-100 px-1 rounded">\\+STATUS:(?&lt;code&gt;\\d+),(?&lt;msg&gt;.*)</code> → 命名捕获组code和msg<br/>
                  • <code className="bg-blue-100 px-1 rounded">OK\\s+(\\w+)\\s+(\\d+)</code> → 捕获组1和2
                </p>
              </div>
            )}
            {command.dataParseConfig?.parseType === 'split' && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-2">
                <p className="text-xs text-green-800">
                  <strong>分割示例：</strong><br/>
                  输入: <code className="bg-green-100 px-1 rounded">+RESPONSE:0,123,OK</code><br/>
                  分隔符: <code className="bg-green-100 px-1 rounded">,</code><br/>
                  结果: ["+RESPONSE:0", "123", "OK"] → 索引0,1,2
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="parameterMap">变量映射 (JSON格式)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatParameterMap}
                className="h-6 px-2 text-xs"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                格式化
              </Button>
            </div>
            <Textarea
              id="parameterMap"
              value={parameterMapText}
              onChange={(e) => handleParameterMapChange(e.target.value)}
              placeholder={command.dataParseConfig?.parseType === 'regex' 
                ? '{\n  "1": "msgid",\n  "code": "statusCode"\n}'
                : '{\n  "1": "msgid",\n  "2": "status"\n}'
              }
              rows={4}
              className={`font-mono text-xs ${parameterMapError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {parameterMapError && (
              <p className="text-xs text-red-600 mt-1 bg-red-50 border border-red-200 rounded px-2 py-1">
                JSON错误: {parameterMapError}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {command.dataParseConfig?.parseType === 'regex' 
                ? '键为捕获组号(1,2,...)或命名捕获组名，值为变量名'
                : '键为分割后的索引(0,1,2,...)，值为变量名'
              }
            </p>
          </div>
          
          <div>
            <Label htmlFor="testPreview">验证测试</Label>
            <p className="text-xs text-muted-foreground">
              在下方查看实时提取预览，确保配置正确
            </p>
          </div>

              <p className="text-xs text-muted-foreground mt-1 bg-blue-50 border border-blue-200 rounded-md p-2">
                <strong>说明：</strong><br/>
                • 变量作用域固定为端口内，多个端口的变量独立存储<br/>
                • 每次运行测试用例时自动清空已存储的变量<br/>
                • 同名变量会被最新提取的值覆盖
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* 实时预览 */}
      {command.dataParseConfig?.enabled && <UrcPreview command={command} />}

      {/* 验证成功后操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">验证成功后操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jumpAction">操作选择</Label>
            <Select
              value={command.jumpConfig?.onReceived || 'continue'}
              onValueChange={(value) => {
                const newConfig = { 
                  ...command.jumpConfig, 
                  onReceived: value as any,
                  jumpTarget: value === 'jump' ? { 
                    type: 'command', 
                    targetId: '',
                    ...command.jumpConfig?.jumpTarget
                  } : undefined
                };
                updateCommand('jumpConfig', newConfig);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continue">顺序执行</SelectItem>
                <SelectItem value="jump">跳转到指定命令</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {command.jumpConfig?.onReceived === 'jump' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="commandSelect">选择命令</Label>
                <div className="space-y-2">
                  <Popover open={showCommandOptions} onOpenChange={setShowCommandOptions}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between"
                        disabled={!jumpOptions?.commandOptions?.length}
                      >
                        {command.jumpConfig?.jumpTarget?.targetId ? 
                          jumpOptions?.commandOptions?.find(opt => opt.id === command.jumpConfig?.jumpTarget?.targetId)?.label || '未找到命令'
                          : '选择命令'
                        }
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-popover border shadow-lg z-50" align="start">
                      <div className="p-2 border-b">
                        <p className="text-sm font-medium">当前用例及子用例命令清单</p>
                      </div>
                      {jumpOptions?.commandOptions?.length ? (
                        <ScrollArea className="max-h-64">
                          <div className="p-1">
                            {jumpOptions.commandOptions.map(option => (
                              <Button
                                key={option.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-auto p-2 text-left"
                                onClick={() => {
                                  const newConfig = { 
                                    ...command.jumpConfig, 
                                    jumpTarget: { 
                                      type: 'command' as const,
                                      targetId: option.id
                                    }
                                  };
                                  updateCommand('jumpConfig', newConfig);
                                  setShowCommandOptions(false);
                                }}
                              >
                                <div className="text-left">
                                  <div className="text-xs font-mono text-muted-foreground truncate">
                                    {option.label}
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无可跳转命令
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  
                  {command.jumpConfig?.jumpTarget?.targetId && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                      <span className="font-medium">已选择: </span>
                      {jumpOptions?.commandOptions?.find(opt => opt.id === command.jumpConfig?.jumpTarget?.targetId)?.label || command.jumpConfig.jumpTarget.targetId}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};