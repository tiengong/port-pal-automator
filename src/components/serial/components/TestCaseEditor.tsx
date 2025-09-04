// TestCaseEditor.tsx - Extract case editing UI from TestCaseManager
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TestCase } from '../types';

interface TestCaseEditorProps {
  editingCase: TestCase | null;
  setEditingCase: (testCase: TestCase | null) => void;
  onUpdateCase: (caseId: string, updates: Partial<TestCase>) => void;
}

export const TestCaseEditor: React.FC<TestCaseEditorProps> = ({
  editingCase,
  setEditingCase,
  onUpdateCase
}) => {
  const handleSave = () => {
    if (!editingCase) return;
    
    // Migrate legacy failureHandling to new structure if needed
    const updates: Partial<TestCase> = {
      name: editingCase.name,
      description: editingCase.description,
      failureStrategy: editingCase.failureStrategy || editingCase.failureHandling || 'stop',
      onWarningFailure: editingCase.onWarningFailure || editingCase.failureStrategy || 'continue',
      onErrorFailure: editingCase.onErrorFailure || editingCase.failureStrategy || 'stop',
      validationLevel: editingCase.validationLevel || 'error',
      runCount: editingCase.runCount
    };
    
    onUpdateCase(editingCase.id, updates);
    setEditingCase(null);
  };

  if (!editingCase) return null;

  return (
    <Dialog open={!!editingCase} onOpenChange={(open) => !open && setEditingCase(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑测试用例</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="case-name">用例名称</Label>
            <Input
              id="case-name"
              value={editingCase.name}
              onChange={(e) => setEditingCase({ ...editingCase, name: e.target.value })}
              placeholder="输入测试用例名称"
            />
          </div>
          
          <div>
            <Label htmlFor="case-description">用例描述</Label>
            <Textarea
              id="case-description"
              value={editingCase.description}
              onChange={(e) => setEditingCase({ ...editingCase, description: e.target.value })}
              placeholder="输入测试用例描述"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="case-failure-strategy">主要失败策略</Label>
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
            </div>
            
            <div>
              <Label htmlFor="case-run-count">运行次数</Label>
              <Input
                id="case-run-count"
                type="number"
                min="1"
                value={editingCase.runCount || 1}
                onChange={(e) => setEditingCase({ 
                  ...editingCase, 
                  runCount: parseInt(e.target.value) || 1 
                })}
                placeholder="1"
              />
            </div>
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
              <Label htmlFor="warning-failure">警告级失败处理</Label>
              <Select
                value={editingCase.onWarningFailure || 'continue'}
                onValueChange={(value) => setEditingCase({ 
                  ...editingCase, 
                  onWarningFailure: value as 'continue' | 'stop' | 'prompt' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continue">继续执行</SelectItem>
                  <SelectItem value="stop">停止执行</SelectItem>
                  <SelectItem value="prompt">提示用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="error-failure">错误级失败处理</Label>
              <Select
                value={editingCase.onErrorFailure || 'stop'}
                onValueChange={(value) => setEditingCase({ 
                  ...editingCase, 
                  onErrorFailure: value as 'continue' | 'stop' | 'prompt' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continue">继续执行</SelectItem>
                  <SelectItem value="stop">停止执行</SelectItem>
                  <SelectItem value="prompt">提示用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditingCase(null)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};