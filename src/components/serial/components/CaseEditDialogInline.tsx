import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestCase } from '../types';

interface CaseEditDialogInlineProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCase: TestCase | null;
  setEditingCase: (testCase: TestCase | null) => void;
  onSave: (caseId: string, updatedCase: TestCase) => void;
}

export const CaseEditDialogInline: React.FC<CaseEditDialogInlineProps> = ({
  isOpen,
  onOpenChange,
  editingCase,
  setEditingCase,
  onSave
}) => {
  const handleSave = () => {
    if (!editingCase) return;
    onSave(editingCase.id, editingCase);
    onOpenChange(false);
    setEditingCase(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑测试用例</DialogTitle>
          <DialogDescription>
            修改测试用例的基本信息和配置
          </DialogDescription>
        </DialogHeader>
        
        {editingCase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="case-name">用例名称</Label>
                <Input
                  id="case-name"
                  value={editingCase.name}
                  onChange={(e) => setEditingCase({ ...editingCase, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="case-id">用例编号</Label>
                <Input
                  id="case-id"
                  value={editingCase.uniqueId}
                  onChange={(e) => setEditingCase({ ...editingCase, uniqueId: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="case-description">用例描述</Label>
              <Textarea
                id="case-description"
                value={editingCase.description}
                onChange={(e) => setEditingCase({ ...editingCase, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="validation-level">异常检测等级</Label>
              <Select
                value={editingCase.validationLevel || 'error'}
                onValueChange={(value) => setEditingCase({ 
                  ...editingCase, 
                  validationLevel: value as 'warning' | 'error' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">错误级别（仅错误导致失败）</SelectItem>
                  <SelectItem value="warning">警告级别（警告和错误都导致失败）</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                设置测试用例执行过程中的异常检测等级，决定何种程度的异常会导致用例失败
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="case-failure-handling">失败处理方式</Label>
                <Select
                  value={editingCase.failureStrategy || editingCase.failureHandling || 'stop'}
                  onValueChange={(value) => setEditingCase({ 
                    ...editingCase, 
                    failureStrategy: value as 'stop' | 'continue' | 'prompt' 
                  })}
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
                <p className="text-sm text-muted-foreground mt-1">
                  命令失败时的处理方式，适用于所有严重级别的失败
                </p>
              </div>
              
              <div>
                <Label htmlFor="case-run-mode">运行模式</Label>
                <Select
                  value={editingCase.runMode || 'auto'}
                  onValueChange={(value) => setEditingCase({ 
                    ...editingCase, 
                    runMode: value as 'auto' | 'single' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">自动连续执行</SelectItem>
                    <SelectItem value="single">单步执行</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  自动模式：连续执行所有命令；单步模式：每个命令需手动确认
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="case-run-count">运行次数</Label>
              <Input
                id="case-run-count"
                type="number"
                min="1"
                max="999"
                value={editingCase.runCount || 1}
                onChange={(e) => setEditingCase({ 
                  ...editingCase, 
                  runCount: parseInt(e.target.value) || 1 
                })}
                placeholder="1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                设置测试用例执行次数 (1-999次)
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>
                保存
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};