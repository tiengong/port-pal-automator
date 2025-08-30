import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestCommand } from './types';

interface CommandEditorProps {
  command: TestCommand;
  onUpdate: (updates: Partial<TestCommand>) => void;
  allTestCases?: Array<{ id: string; name: string; uniqueId: string }>;
}

export const CommandEditor: React.FC<CommandEditorProps> = ({
  command,
  onUpdate,
  allTestCases = []
}) => {
  const updateCommand = (field: keyof TestCommand, value: any) => {
    onUpdate({ [field]: value });
  };

  const renderExecutionSettings = () => (
    <div className="space-y-4">
      {/* 基础设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">基础设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="command">命令内容</Label>
            <Input
              id="command"
              value={command.command}
              onChange={(e) => updateCommand('command', e.target.value)}
              placeholder="输入AT命令"
            />
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
              <Label htmlFor="lineEnding">换行符</Label>
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

      {/* 验证设置 */}
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
              <Label htmlFor="expectedResponse">期望响应</Label>
              <Input
                id="expectedResponse"
                value={command.expectedResponse || ''}
                onChange={(e) => updateCommand('expectedResponse', e.target.value)}
                placeholder="输入期望的响应内容"
              />
            </div>
          )}
          
          {command.validationMethod === 'regex' && (
            <div>
              <Label htmlFor="validationPattern">验证模式</Label>
              <Input
                id="validationPattern"
                value={command.validationPattern || ''}
                onChange={(e) => updateCommand('validationPattern', e.target.value)}
                placeholder="输入正则表达式"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 时间和错误处理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">时间和错误处理</CardTitle>
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
              />
            </div>
          </div>
          
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
            <Label htmlFor="stopOnFailure">失败时停止</Label>
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
            <Label htmlFor="userActionDialog">等待用户操作弹框</Label>
          </div>
          
          {command.userActionDialog && (
            <div>
              <Label htmlFor="dialogContent">弹框内容</Label>
              <Textarea
                id="dialogContent"
                value={command.dialogContent || ''}
                onChange={(e) => updateCommand('dialogContent', e.target.value)}
                placeholder="输入弹框提示内容"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderUrcSettings = () => (
    <div className="space-y-4">
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
              placeholder="输入URC匹配模式"
            />
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
              />
            </div>
          )}
          
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
          
          <div>
            <Label htmlFor="urcDialogContent">弹框内容</Label>
            <Textarea
              id="urcDialogContent"
              value={command.urcDialogContent || ''}
              onChange={(e) => updateCommand('urcDialogContent', e.target.value)}
              placeholder="输入URC处理相关的提示内容"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 参数提取 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">参数提取</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="parseType">解析类型</Label>
            <Select
              value={command.dataParseConfig?.parseType || 'contains'}
              onValueChange={(value) => updateCommand('dataParseConfig', {
                ...command.dataParseConfig,
                parseType: value
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">包含匹配</SelectItem>
                <SelectItem value="exact">精确匹配</SelectItem>
                <SelectItem value="regex">正则表达式</SelectItem>
                <SelectItem value="split">分割解析</SelectItem>
                <SelectItem value="json">JSON解析</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="parsePattern">解析模式</Label>
            <Input
              id="parsePattern"
              value={command.dataParseConfig?.parsePattern || ''}
              onChange={(e) => updateCommand('dataParseConfig', {
                ...command.dataParseConfig,
                parsePattern: e.target.value
              })}
              placeholder="输入解析模式"
            />
          </div>
          
          <div>
            <Label htmlFor="parameterMap">参数映射 (JSON格式)</Label>
            <Textarea
              id="parameterMap"
              value={JSON.stringify(command.dataParseConfig?.parameterMap || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateCommand('dataParseConfig', {
                    ...command.dataParseConfig,
                    parameterMap: parsed
                  });
                } catch (error) {
                  // 忽略解析错误，用户输入过程中可能不完整
                }
              }}
              placeholder='{"param1": "value1", "param2": "value2"}'
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSubcaseSettings = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">子用例设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subcaseName">子用例名称</Label>
            <Input
              id="subcaseName"
              value={command.command}
              onChange={(e) => updateCommand('command', e.target.value)}
              placeholder="输入子用例名称"
            />
          </div>
          
          <div>
            <Label htmlFor="referencedCaseId">引用用例</Label>
            <Select
              value={command.referencedCaseId || ''}
              onValueChange={(value) => updateCommand('referencedCaseId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择要引用的测试用例" />
              </SelectTrigger>
              <SelectContent>
                {allTestCases.map((testCase) => (
                  <SelectItem key={testCase.id} value={testCase.id}>
                    {testCase.uniqueId} - {testCase.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="subcaseFailureHandling">失败处理方式</Label>
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
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <Label>命令类型</Label>
        <Select
          value={command.type}
          onValueChange={(value: 'execution' | 'urc' | 'subcase') => updateCommand('type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="execution">执行命令</SelectItem>
            <SelectItem value="urc">URC监听</SelectItem>
            <SelectItem value="subcase">子用例</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <Tabs value={command.type} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="execution">执行命令</TabsTrigger>
          <TabsTrigger value="urc">URC监听</TabsTrigger>
          <TabsTrigger value="subcase">子用例</TabsTrigger>
        </TabsList>
        
        <TabsContent value="execution" className="mt-4">
          {renderExecutionSettings()}
        </TabsContent>
        
        <TabsContent value="urc" className="mt-4">
          {renderUrcSettings()}
        </TabsContent>
        
        <TabsContent value="subcase" className="mt-4">
          {renderSubcaseSettings()}
        </TabsContent>
      </Tabs>
    </div>
  );
};