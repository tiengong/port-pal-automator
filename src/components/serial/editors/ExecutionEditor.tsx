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
import { useTranslation } from 'react-i18next';

interface ExecutionEditorProps {
  command: TestCommand;
  onUpdate: (updates: Partial<TestCommand>) => void;
}

export const ExecutionEditor: React.FC<ExecutionEditorProps> = ({
  command,
  onUpdate
}) => {
  const { t } = useTranslation();
  const [showExamples, setShowExamples] = useState(false);
  
  const updateCommand = (field: keyof TestCommand, value: any) => {
    onUpdate({ [field]: value });
  };

  // 执行命令示例
  const executionExamples = [
    { name: t('editor.execution.examples.basicAT'), command: "AT", expectedResponse: "OK", validationMethod: "contains" },
    { name: t('editor.execution.examples.simStatus'), command: "AT+CPIN?", expectedResponse: "+CPIN: READY", validationMethod: "contains" },
    { name: t('editor.execution.examples.signalStrength'), command: "AT+CSQ", expectedResponse: "+CSQ:", validationMethod: "contains" },
    { name: t('editor.execution.examples.networkReg'), command: "AT+CREG?", expectedResponse: "+CREG:", validationMethod: "contains" },
    { name: t('editor.execution.examples.hexData'), command: "1A2B3C", dataFormat: "hex", expectedResponse: "OK", validationMethod: "contains" },
    { name: t('editor.execution.examples.sendSMS'), command: "AT+CMGS=\"13800000000\"", expectedResponse: ">", validationMethod: "contains" }
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
        <Badge variant="default" className="bg-blue-500">{t('editor.execution.title')}</Badge>
        <span className="text-sm text-muted-foreground">{t('editor.execution.subtitle')}</span>
      </div>

      {/* 快速示例 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{t('editor.execution.quickExamples')}</CardTitle>
            <Popover open={showExamples} onOpenChange={setShowExamples}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <FileCode className="w-3 h-3 mr-1" />
                  {t('editor.execution.insertExample')}
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
          <CardTitle className="text-sm">{t('editor.execution.commandSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="command">{t('editor.execution.commandContent')}</Label>
              {command.dataFormat === 'hex' && (
                <Badge variant="secondary" className="text-xs">{t('editor.execution.hexFormat')}</Badge>
              )}
            </div>
            <Textarea
              id="command"
              value={command.command}
              onChange={(e) => updateCommand('command', e.target.value)}
              placeholder={command.dataFormat === 'hex' ? t('editor.execution.hexPlaceholder') : t('editor.execution.atPlaceholder')}
              className={command.dataFormat === 'hex' ? "font-mono" : "font-mono"}
              rows={2}
            />
            {command.dataFormat === 'hex' ? (
              <p className="text-xs text-muted-foreground mt-1">
                {t('editor.execution.hexExample')}
              </p>
            ) : (
              <div className="text-xs text-muted-foreground mt-1">
                <strong>{t('editor.execution.variableUsage')}:</strong>
                <code className="bg-muted px-1 rounded ml-1">{'{变量名}'}</code>
                <code className="bg-muted px-1 rounded ml-1">{'{变量名|默认值}'}</code>
                <code className="bg-muted px-1 rounded ml-1">{'{P1.变量名}'}</code>
                <code className="bg-muted px-1 rounded ml-1">{'{P2.变量名}'}</code>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataFormat">{t('editor.execution.dataFormat')}</Label>
              <Select
                value={command.dataFormat || 'string'}
                onValueChange={(value) => updateCommand('dataFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">{t('editor.execution.string')}</SelectItem>
                  <SelectItem value="hex">{t('editor.execution.hex')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="lineEnding">{t('editor.execution.lineEnding')}</Label>
                <Badge variant="outline" className="text-xs font-mono">
                  {command.lineEnding === 'none' && t('editor.execution.none')}
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
                  <SelectItem value="none">{t('editor.execution.none')}</SelectItem>
                  <SelectItem value="lf">{t('editor.execution.lf')}</SelectItem>
                  <SelectItem value="cr">{t('editor.execution.cr')}</SelectItem>
                  <SelectItem value="crlf">{t('editor.execution.crlf')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 响应验证 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('editor.execution.responseValidation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="validationMethod">{t('editor.execution.validationMethod')}</Label>
            <Select
              value={command.validationMethod || 'none'}
              onValueChange={(value) => updateCommand('validationMethod', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('editor.execution.noValidation')}</SelectItem>
                <SelectItem value="contains">{t('editor.execution.contains')}</SelectItem>
                <SelectItem value="equals">{t('editor.execution.equals')}</SelectItem>
                <SelectItem value="regex">{t('editor.execution.regex')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="timeout">{t('editor.execution.timeout')}</Label>
            <Input
              id="timeout"
              type="number"
              value={command.timeout || 5000}
              onChange={(e) => updateCommand('timeout', parseInt(e.target.value) || 5000)}
              min="1000"
              placeholder="5000"
            />
          </div>
          
          {command.validationMethod !== 'none' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="expectedResponse">{t('editor.execution.expectedResponse')}</Label>
                <div className="flex items-center gap-2">
                  {(command.validationMethod === 'contains' || command.validationMethod === 'equals') && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">{t('editor.execution.expectedResponseFormat')}</Label>
                      <Select
                        value={command.expectedResponseFormat || 'text'}
                        onValueChange={(value) => updateCommand('expectedResponseFormat', value)}
                      >
                        <SelectTrigger className="h-6 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">{t('editor.execution.format.text')}</SelectItem>
                          <SelectItem value="hex">{t('editor.execution.format.hex')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                    {t('editor.execution.autoFill')}
                  </Button>
                </div>
              </div>
              <Textarea
                id="expectedResponse"
                value={command.expectedResponse || ''}
                onChange={(e) => updateCommand('expectedResponse', e.target.value)}
                placeholder={
                  command.expectedResponseFormat === 'hex' 
                    ? t('editor.execution.expectedResponseHexPlaceholder')
                    : t('editor.execution.expectedResponsePlaceholder')
                }
                className="font-mono"
                rows={command.expectedResponseFormat === 'hex' ? 2 : 3}
              />
              {command.expectedResponseFormat === 'hex' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('editor.execution.expectedResponseHexHelp')}
                </p>
              )}
              {!command.expectedResponse && (
                <p className="text-xs text-amber-600 mt-1">
                  {t('editor.execution.expectedResponseWarning')}
                </p>
              )}
            </div>
          )}
          
          {command.validationMethod === 'regex' && (
            <div>
              <Label htmlFor="validationPattern">{t('editor.execution.regexPattern')}</Label>
              <Input
                id="validationPattern"
                value={command.validationPattern || ''}
                onChange={(e) => updateCommand('validationPattern', e.target.value)}
                placeholder={t('editor.execution.regexPatternPlaceholder')}
                className="font-mono"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="waitTime">{t('editor.execution.waitTime')}</Label>
        <Input
          id="waitTime"
          type="number"
          value={command.waitTime}
          onChange={(e) => updateCommand('waitTime', parseInt(e.target.value) || 0)}
          min="0"
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('editor.execution.waitTimeDescription')}
        </p>
      </div>

      {/* 执行配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">执行配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maxAttempts">重试次数</Label>
            <Input
              id="maxAttempts"
              type="number"
              value={command.maxAttempts || 1}
              onChange={(e) => updateCommand('maxAttempts', parseInt(e.target.value) || 1)}
              min="1"
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              命令失败时的重试次数，超过重试次数后按失败严重性处理
            </p>
          </div>
          
          <div>
            <Label htmlFor="failureSeverity">失败严重性</Label>
            <Select
              value={command.failureSeverity || 'error'}
              onValueChange={(value) => updateCommand('failureSeverity', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              错误: 失败时停止测试用例；警告: 失败时记录警告但继续执行
            </p>
          </div>

          <div>
            <Label htmlFor="failureMessage">失败提示信息</Label>
            <Textarea
              id="failureMessage"
              value={command.failureMessage || ''}
              onChange={(e) => updateCommand('failureMessage', e.target.value)}
              placeholder="命令执行失败时显示的提示信息（可选）"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              可自定义失败时的提示信息，为空时使用默认信息
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 用户交互 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('editor.execution.userInteraction')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="requiresUserAction"
              checked={command.requiresUserAction || false}
              onCheckedChange={(checked) => updateCommand('requiresUserAction', checked)}
            />
            <Label htmlFor="requiresUserAction">需要用户确认</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            启用后，执行此命令前会显示确认对话框让用户确认
          </p>
          
          {command.requiresUserAction && (
            <div>
              <Label htmlFor="userPrompt">确认提示内容</Label>
              <Textarea
                id="userPrompt"
                value={command.userPrompt || ''}
                onChange={(e) => updateCommand('userPrompt', e.target.value)}
                placeholder="请输入需要用户确认的提示信息，例如：请确认设备已连接并处于正确状态"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};