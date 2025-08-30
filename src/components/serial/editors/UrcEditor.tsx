import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Radio } from "lucide-react";
import { TestCommand } from '../types';

interface UrcEditorProps {
  command: TestCommand;
  onUpdate: (updates: Partial<TestCommand>) => void;
}

export const UrcEditor: React.FC<UrcEditorProps> = ({
  command,
  onUpdate
}) => {
  const [showExamples, setShowExamples] = useState(false);
  
  const updateCommand = (field: keyof TestCommand, value: any) => {
    onUpdate({ [field]: value });
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
            <Label htmlFor="urcPattern">URC匹配内容</Label>
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
            <Label htmlFor="urcMatchMode">匹配方式</Label>
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
            <Label htmlFor="urcListenMode">监听类型</Label>
            <Select
              value={command.urcListenMode || 'once'}
              onValueChange={(value) => updateCommand('urcListenMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">永久监听</SelectItem>
                <SelectItem value="once">监听一次</SelectItem>
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
              <Label htmlFor="urcListenTimeout">监听超时时间 (ms)</Label>
              <Input
                id="urcListenTimeout"
                type="number"
                value={command.urcListenTimeout || 10000}
                onChange={(e) => updateCommand('urcListenTimeout', parseInt(e.target.value) || 10000)}
                min="1000"
                placeholder="10000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                超过此时间未收到匹配的URC将视为失败
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
            <Label htmlFor="urcFailureHandling">失败处理方式</Label>
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

      {/* 数据解析（高级功能） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">数据解析 (高级)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="parseType">解析类型</Label>
            <Select
              value={command.dataParseConfig?.parseType || 'contains'}
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
                <SelectItem value="contains">简单包含</SelectItem>
                <SelectItem value="regex">正则表达式</SelectItem>
                <SelectItem value="split">分割字符串</SelectItem>
                <SelectItem value="json">JSON解析</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {command.dataParseConfig?.parseType !== 'contains' && (
            <div>
              <Label htmlFor="parsePattern">解析模式</Label>
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
                  command.dataParseConfig?.parseType === 'regex' ? '输入正则表达式' :
                  command.dataParseConfig?.parseType === 'split' ? '输入分割符' :
                  '输入JSON路径'
                }
                className="font-mono"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 跳转配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">跳转配置 (高级)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jumpAction">收到URC后操作</Label>
            <Select
              value={command.jumpConfig?.onReceived || 'continue'}
              onValueChange={(value) => {
                const newConfig = { 
                  ...command.jumpConfig, 
                  onReceived: value as any 
                };
                updateCommand('jumpConfig', newConfig);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continue">继续执行</SelectItem>
                <SelectItem value="jump">跳转到指定位置</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {command.jumpConfig?.onReceived === 'jump' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="jumpType">跳转类型</Label>
                <Select
                  value={command.jumpConfig?.jumpTarget?.type || 'command'}
                  onValueChange={(value) => {
                    const newConfig = { 
                      ...command.jumpConfig, 
                      jumpTarget: { 
                        ...command.jumpConfig?.jumpTarget,
                        type: value as any,
                        targetId: '',
                        targetIndex: 0
                      }
                    };
                    updateCommand('jumpConfig', newConfig);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="command">跳转到命令</SelectItem>
                    <SelectItem value="case">跳转到用例</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="jumpTarget">跳转目标ID</Label>
                <Input
                  id="jumpTarget"
                  value={command.jumpConfig?.jumpTarget?.targetId || ''}
                  onChange={(e) => {
                    const newConfig = { 
                      ...command.jumpConfig, 
                      jumpTarget: { 
                        ...command.jumpConfig?.jumpTarget,
                        targetId: e.target.value
                      }
                    };
                    updateCommand('jumpConfig', newConfig);
                  }}
                  placeholder="输入目标ID"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};