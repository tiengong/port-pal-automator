import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, FileCode } from "lucide-react";
import { TestCommand } from '../types';

interface ExecutionEditorProps {
  command: TestCommand;
  onUpdate: (updates: Partial<TestCommand>) => void;
}

export const ExecutionEditor: React.FC<ExecutionEditorProps> = ({
  command,
  onUpdate
}) => {
  const [showExamples, setShowExamples] = useState(false);
  
  const updateCommand = (field: keyof TestCommand, value: any) => {
    onUpdate({ [field]: value });
  };

  // 执行命令示例
  const executionExamples = [
    { name: "基础AT测试", command: "AT", expectedResponse: "OK", validationMethod: "contains" },
    { name: "获取SIM卡状态", command: "AT+CPIN?", expectedResponse: "+CPIN: READY", validationMethod: "contains" },
    { name: "获取信号强度", command: "AT+CSQ", expectedResponse: "+CSQ:", validationMethod: "contains" },
    { name: "获取网络注册状态", command: "AT+CREG?", expectedResponse: "+CREG:", validationMethod: "contains" },
    { name: "十六进制数据发送", command: "1A2B3C", dataFormat: "hex", expectedResponse: "OK", validationMethod: "contains" },
    { name: "发送短信", command: "AT+CMGS=\"13800000000\"", expectedResponse: ">", validationMethod: "contains" }
  ];

  const insertExample = (example: any) => {
    updateCommand('command', example.command);
    updateCommand('expectedResponse', example.expectedResponse);
    updateCommand('validationMethod', example.validationMethod);
    if (example.dataFormat) {
      updateCommand('dataFormat', example.dataFormat);
    }
    setShowExamples(false);
  };

  return (
    <div className="space-y-4">
      {/* 命令类型显示 */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-blue-500">执行命令</Badge>
        <span className="text-sm text-muted-foreground">Execute Command Configuration</span>
      </div>

      {/* 快速示例 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">快速示例模板</CardTitle>
            <Popover open={showExamples} onOpenChange={setShowExamples}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <FileCode className="w-3 h-3 mr-1" />
                  插入示例
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="end">
                <div className="space-y-1">
                  {executionExamples.map((example, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-auto p-2"
                      onClick={() => insertExample(example)}
                    >
                      <div className="text-left">
                        <div className="font-medium text-xs">{example.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{example.command}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
      </Card>

      {/* 基础设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">命令设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="command">命令内容</Label>
              {command.dataFormat === 'hex' && (
                <Badge variant="secondary" className="text-xs">十六进制格式</Badge>
              )}
            </div>
            <Input
              id="command"
              value={command.command}
              onChange={(e) => updateCommand('command', e.target.value)}
              placeholder={command.dataFormat === 'hex' ? "输入十六进制数据 (如: 1A 2B 3C)" : "输入AT命令，支持变量如: AT+MIPLOBSERVERSP=0,{msgid},1"}
              className={command.dataFormat === 'hex' ? "font-mono" : "font-mono"}
            />
            {command.dataFormat === 'hex' ? (
              <p className="text-xs text-muted-foreground mt-1">
                示例: 1A2B3C 或 1A 2B 3C (空格会被自动移除)
              </p>
            ) : (
              <div className="text-xs text-muted-foreground mt-1">
                <strong>变量使用格式：</strong>
                <code className="bg-muted px-1 rounded ml-1">{'{变量名}'}</code>
                <code className="bg-muted px-1 rounded ml-1">{'{变量名|默认值}'}</code>
                <code className="bg-muted px-1 rounded ml-1">{'{P1.变量名}'}</code>
                <code className="bg-muted px-1 rounded ml-1">{'{P2.变量名}'}</code>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataFormat">数据格式</Label>
              <Select
                value={command.dataFormat || 'string'}
                onValueChange={(value) => updateCommand('dataFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">字符串</SelectItem>
                  <SelectItem value="hex">十六进制</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="lineEnding">换行符</Label>
                <Badge variant="outline" className="text-xs font-mono">
                  {command.lineEnding === 'none' && '无'}
                  {command.lineEnding === 'lf' && '\\n'}
                  {command.lineEnding === 'cr' && '\\r'}
                  {command.lineEnding === 'crlf' && '\\r\\n'}
                </Badge>
              </div>
              <Select
                value={command.lineEnding}
                onValueChange={(value) => updateCommand('lineEnding', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  <SelectItem value="lf">LF (\n)</SelectItem>
                  <SelectItem value="cr">CR (\r)</SelectItem>
                  <SelectItem value="crlf">CRLF (\r\n)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 响应验证 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">响应验证</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="validationMethod">验证方式</Label>
            <Select
              value={command.validationMethod}
              onValueChange={(value) => updateCommand('validationMethod', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无验证</SelectItem>
                <SelectItem value="contains">包含</SelectItem>
                <SelectItem value="equals">完全匹配</SelectItem>
                <SelectItem value="regex">正则表达式</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {command.validationMethod !== 'none' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="expectedResponse">期望响应</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    if (command.command && !command.expectedResponse) {
                      // Auto-suggest validation based on command
                      if (command.command.includes('AT+')) {
                        updateCommand('expectedResponse', 'OK');
                      } else if (command.command.includes('CSQ')) {
                        updateCommand('expectedResponse', '+CSQ:');
                      } else if (command.command.includes('CREG')) {
                        updateCommand('expectedResponse', '+CREG:');
                      }
                    }
                  }}
                >
                  自动填充
                </Button>
              </div>
              <Input
                id="expectedResponse"
                value={command.expectedResponse || ''}
                onChange={(e) => updateCommand('expectedResponse', e.target.value)}
                placeholder="输入期望的响应内容，或点击自动填充"
                className="font-mono"
              />
              {!command.expectedResponse && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ 建议填写期望响应以确保命令执行正确
                </p>
              )}
            </div>
          )}
          
          {command.validationMethod === 'regex' && (
            <div>
              <Label htmlFor="validationPattern">正则表达式</Label>
              <Input
                id="validationPattern"
                value={command.validationPattern || ''}
                onChange={(e) => updateCommand('validationPattern', e.target.value)}
                placeholder="输入正则表达式模式"
                className="font-mono"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 时间设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">时间设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="waitTime">等待时间 (ms)</Label>
              <Input
                id="waitTime"
                type="number"
                value={command.waitTime}
                onChange={(e) => updateCommand('waitTime', parseInt(e.target.value) || 0)}
                min="0"
                placeholder="0"
              />
            </div>
            
            <div>
              <Label htmlFor="timeout">超时时间 (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={command.timeout || 5000}
                onChange={(e) => updateCommand('timeout', parseInt(e.target.value) || 5000)}
                min="1000"
                placeholder="5000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误处理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">错误处理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="failureHandling">失败处理方式</Label>
            <Select
              value={command.failureHandling || 'stop'}
              onValueChange={(value) => updateCommand('failureHandling', value)}
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
          
          <div className="flex items-center space-x-2">
            <Switch
              id="stopOnFailure"
              checked={command.stopOnFailure}
              onCheckedChange={(checked) => updateCommand('stopOnFailure', checked)}
            />
            <Label htmlFor="stopOnFailure">失败时停止整个用例</Label>
          </div>
        </CardContent>
      </Card>

      {/* 用户交互 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">用户交互</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="userActionDialog"
              checked={command.userActionDialog || false}
              onCheckedChange={(checked) => updateCommand('userActionDialog', checked)}
            />
            <Label htmlFor="userActionDialog">需要用户确认弹框</Label>
          </div>
          
          {command.userActionDialog && (
            <div>
              <Label htmlFor="dialogContent">弹框提示内容</Label>
              <Textarea
                id="dialogContent"
                value={command.dialogContent || ''}
                onChange={(e) => updateCommand('dialogContent', e.target.value)}
                placeholder="请输入需要提示用户的操作内容"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};