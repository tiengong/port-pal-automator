import React, { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TestCommand } from '../types';

interface SubcaseRefEditorProps {
  command: TestCommand;
  onUpdate: (updates: Partial<TestCommand>) => void;
  allTestCases?: Array<{ id: string; name: string; uniqueId: string }>;
  onEditReferencedCase?: (caseId: string) => void;
}

export const SubcaseRefEditor: React.FC<SubcaseRefEditorProps> = ({
  command,
  onUpdate,
  allTestCases = [],
  onEditReferencedCase
}) => {
  const [openCombobox, setOpenCombobox] = useState(false);
  
  const updateCommand = (field: keyof TestCommand, value: any) => {
    onUpdate({ [field]: value });
  };

  // 过滤可用的测试用例（排除当前编辑的用例）
  const availableTestCases = useMemo(() => {
    return allTestCases.filter(testCase => testCase.id !== command.id);
  }, [allTestCases, command.id]);

  // 查找当前选择的测试用例
  const selectedTestCase = useMemo(() => {
    return availableTestCases.find(tc => tc.id === command.referencedCaseId);
  }, [availableTestCases, command.referencedCaseId]);

  const handleTestCaseSelect = (testCase: typeof availableTestCases[0]) => {
    updateCommand('referencedCaseId', testCase.id);
    updateCommand('command', `引用用例: ${testCase.name}`);
    setOpenCombobox(false);
  };

  return (
    <div className="space-y-4">
      {/* 命令类型显示 */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-purple-500">子用例引用</Badge>
        <span className="text-sm text-muted-foreground">Subcase Reference Configuration</span>
      </div>

      {/* 基础设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">用例引用设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="referencedCase">选择引用用例</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between"
                >
                  {selectedTestCase ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{selectedTestCase.uniqueId}</Badge>
                      <span>{selectedTestCase.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">选择要引用的测试用例...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="搜索测试用例..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="text-center py-4">
                        <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">未找到匹配的测试用例</p>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {availableTestCases.map((testCase) => (
                        <CommandItem
                          key={testCase.id}
                          value={`${testCase.uniqueId} ${testCase.name}`}
                          onSelect={() => handleTestCaseSelect(testCase)}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedTestCase?.id === testCase.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <Badge variant="outline" className="text-xs">{testCase.uniqueId}</Badge>
                            <span className="flex-1">{testCase.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {!selectedTestCase && (
              <p className="text-xs text-muted-foreground mt-1">
                请选择一个已存在的测试用例作为子用例
              </p>
            )}
          </div>

          {selectedTestCase && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-800">
                  <strong>当前引用：</strong> {selectedTestCase.uniqueId} - {selectedTestCase.name}
                </p>
                {onEditReferencedCase && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => onEditReferencedCase(selectedTestCase.id)}
                  >
                    编辑引用用例
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="command">显示名称</Label>
            <Input
              id="command"
              value={command.command}
              onChange={(e) => updateCommand('command', e.target.value)}
              placeholder="为这个子用例引用设置显示名称"
            />
            <p className="text-xs text-muted-foreground mt-1">
              可以自定义显示名称，不影响实际引用的用例
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 展开设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">展开设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="isExpanded"
              checked={command.isExpanded || false}
              onCheckedChange={(checked) => updateCommand('isExpanded', checked)}
            />
            <Label htmlFor="isExpanded">默认展开子步骤</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            如果开启，在测试用例列表中将默认展开显示引用用例的所有命令
          </p>
        </CardContent>
      </Card>

      {/* 执行设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">执行设置</CardTitle>
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
              <p className="text-xs text-muted-foreground mt-1">
                执行子用例前的等待时间
              </p>
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
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="stopOnFailure"
              checked={command.stopOnFailure}
              onCheckedChange={(checked) => updateCommand('stopOnFailure', checked)}
            />
            <Label htmlFor="stopOnFailure">子用例失败时停止整个测试</Label>
          </div>
        </CardContent>
      </Card>

      {/* 可用用例列表（信息展示） */}
      {availableTestCases.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">暂无可引用的测试用例</p>
              <p className="text-xs text-muted-foreground">
                请先创建其他测试用例，然后可以在这里引用它们作为子用例
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {availableTestCases.length > 0 && !selectedTestCase && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">可引用的测试用例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableTestCases.slice(0, 5).map((testCase) => (
                <div key={testCase.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md">
                  <Badge variant="outline" className="text-xs">{testCase.uniqueId}</Badge>
                  <span className="flex-1">{testCase.name}</span>
                </div>
              ))}
              {availableTestCases.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  还有 {availableTestCases.length - 5} 个用例...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};