import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Settings, Trash2 } from "lucide-react";
import { TestCommand } from './TestCaseManager';

interface SubcaseEditorProps {
  command: TestCommand;
  onSave: (updatedCommand: TestCommand) => void;
  onCancel: () => void;
}

export const SubcaseEditor: React.FC<SubcaseEditorProps> = ({
  command,
  onSave,
  onCancel
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localCommand, setLocalCommand] = useState<TestCommand>(command);

  const subCommands = localCommand.subCommands || [];

  const addSubCommand = () => {
    const newCommand: TestCommand = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: 'execution',
      command: '',
      validationMethod: 'none',
      waitTime: 2000,
      stopOnFailure: true,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    };
    setLocalCommand(prev => ({
      ...prev,
      subCommands: [...subCommands, newCommand]
    }));
  };

  const updateSubCommand = (index: number, updates: Partial<TestCommand>) => {
    const updated = subCommands.map((cmd, i) => 
      i === index ? { ...cmd, ...updates } : cmd
    );
    setLocalCommand(prev => ({
      ...prev,
      subCommands: updated
    }));
  };

  const deleteSubCommand = (index: number) => {
    setLocalCommand(prev => ({
      ...prev,
      subCommands: subCommands.filter((_, i) => i !== index)
    }));
  };

  const moveSubCommand = (fromIndex: number, toIndex: number) => {
    const updated = [...subCommands];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setLocalCommand(prev => ({
      ...prev,
      subCommands: updated
    }));
  };

  const handleSave = () => {
    onSave(localCommand);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs text-blue-700 dark:text-blue-300">
        <span className="font-medium">注意：</span>这里的修改只影响当前父用例中的子步骤，不会影响原始用例
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">子步骤列表</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              共 {subCommands.length} 步
            </Badge>
            <Button variant="outline" size="sm" onClick={addSubCommand}>
              <Plus className="w-3 h-3 mr-1" />
              添加
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {subCommands.map((command, index) => (
            <div key={command.id} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-1">
                    {index + 1}
                  </Badge>
                  <Select
                    value={command.type}
                    onValueChange={(value: 'execution' | 'urc') => 
                      updateSubCommand(index, { type: value })
                    }
                  >
                    <SelectTrigger className="w-20 h-6">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="execution">命令</SelectItem>
                      <SelectItem value="urc">URC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSubCommand(index, index - 1)}
                      className="h-6 w-6 p-0"
                    >
                      ↑
                    </Button>
                  )}
                  {index < subCommands.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSubCommand(index, index + 1)}
                      className="h-6 w-6 p-0"
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSubCommand(index)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <Input
                value={command.command}
                onChange={(e) => updateSubCommand(index, { command: e.target.value })}
                placeholder={
                  command.type === 'execution' ? "输入AT命令" : "输入URC模式"
                }
                className="h-8 text-sm"
              />

              {/* 详细配置 */}
              {editingIndex === index && (
                <div className="space-y-3 bg-muted/30 p-3 rounded">
                  {/* URC特有配置 */}
                  {command.type === 'urc' && (
                    <div>
                      <Label className="text-xs">URC匹配模式</Label>
                      <Input
                        className="h-7 text-xs mt-1"
                        value={command.urcPattern || ''}
                        onChange={(e) => updateSubCommand(index, { urcPattern: e.target.value })}
                        placeholder="例如: +CREG: 或 %CGREG:"
                      />
                    </div>
                  )}

                  {/* 通用配置 */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-xs">验证方式</Label>
                      <Select
                        value={command.validationMethod}
                        onValueChange={(value: any) => updateSubCommand(index, { validationMethod: value })}
                      >
                        <SelectTrigger className="h-7 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="none">无验证</SelectItem>
                          <SelectItem value="contains">包含</SelectItem>
                          <SelectItem value="equals">完全匹配</SelectItem>
                          <SelectItem value="regex">正则表达式</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">等待时间(ms)</Label>
                      <Input
                        type="number"
                        className="h-7 text-xs mt-1"
                        value={command.waitTime}
                        onChange={(e) => updateSubCommand(index, { waitTime: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">换行符</Label>
                      <Select
                        value={command.lineEnding}
                        onValueChange={(value: any) => updateSubCommand(index, { lineEnding: value })}
                      >
                        <SelectTrigger className="h-7 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="none">无</SelectItem>
                          <SelectItem value="lf">LF (\n)</SelectItem>
                          <SelectItem value="cr">CR (\r)</SelectItem>
                          <SelectItem value="crlf">CRLF (\r\n)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={command.stopOnFailure}
                        onCheckedChange={(checked) => updateSubCommand(index, { stopOnFailure: checked })}
                      />
                      <Label className="text-xs">失败时停止执行</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {subCommands.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">暂无子步骤</p>
              <p className="text-xs mt-1">点击上方"添加"按钮创建第一个子步骤</p>
            </div>
          )}
        </div>
        
        {/* 底部操作按钮 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};