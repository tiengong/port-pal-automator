import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, TestTube2, FilePlus, Copy, Layers, RotateCcw, Upload, Download } from "lucide-react";
import { TestCase } from "./types";
import { useToast } from "@/hooks/use-toast";

interface TestCaseSwitcherProps {
  testCases: TestCase[];
  currentTestCase: TestCase | null;
  onSelectTestCase: (caseId: string) => void;
  setTestCases: (cases: TestCase[]) => void;
  onDeleteTestCase?: (caseId: string) => void;
  onCreateTestCase?: () => void;
  onSync?: () => void;
}

export const TestCaseSwitcher: React.FC<TestCaseSwitcherProps> = ({
  testCases,
  currentTestCase,
  onSelectTestCase,
  setTestCases,
  onDeleteTestCase,
  onCreateTestCase,
  onSync
}) => {
  const { toast } = useToast();
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentWorkspace, setCurrentWorkspace] = useState('默认工作区');

  console.log('TestCaseSwitcher rendered - NEW MODULAR LAYOUT ACTIVE', { testCases, currentTestCase });

  const filteredTestCases = testCases.filter(tc =>
    tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.uniqueId.includes(searchQuery) ||
    tc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTestCase = () => {
    if (onCreateTestCase) {
      onCreateTestCase();
    } else {
      // 默认创建逻辑
      const newTestCase: TestCase = {
        id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uniqueId: (Math.max(...testCases.map(tc => parseInt(tc.uniqueId) || 1000), 1000) + 1).toString(),
        name: '新建测试用例',
        description: '',
        commands: [],
        subCases: [],
        isExpanded: false,
        isRunning: false,
        currentCommand: -1,
        selected: false,
        status: 'pending'
      };
      
      setTestCases([...testCases, newTestCase]);
      toast({
        title: "新建成功",
        description: `已创建测试用例: ${newTestCase.name}`,
      });
    }
  };

  const handleCloneTestCase = (sourceCase: TestCase) => {
    const clonedCase: TestCase = {
      ...sourceCase,
      id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uniqueId: (Math.max(...testCases.map(tc => parseInt(tc.uniqueId) || 1000), 1000) + 1).toString(),
      name: `${sourceCase.name} - 副本`,
      commands: sourceCase.commands.map(cmd => ({
        ...cmd,
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        selected: false,
        status: 'pending'
      })),
      subCases: [], // 简化处理，不递归克隆子用例
      selected: false,
      status: 'pending',
      isRunning: false,
      currentCommand: -1
    };
    
    setTestCases([...testCases, clonedCase]);
    setShowCloneDialog(false);
    toast({
      title: "克隆成功",
      description: `已克隆测试用例: ${clonedCase.name}`,
    });
  };

  const workspaces = ['默认工作区', '调试工作区', '生产工作区']; // 示例工作区

  return (
    <>
      {/* 底部工具栏 - 四列布局 */}
      <div className="flex-shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="grid grid-cols-4 gap-px bg-border/50">
          
          {/* 第一列：工作区切换 */}
          <div className="bg-card p-3 flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground font-medium">工作区</div>
            <Select value={currentWorkspace} onValueChange={setCurrentWorkspace}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace} value={workspace} className="text-xs">
                    {workspace}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 第二列：测试用例选择 */}
          <div className="bg-card p-3 flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground font-medium">当前用例</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCaseSelector(true)}
              className="h-8 text-xs px-2 min-w-[100px]"
            >
              <TestTube2 className="w-3 h-3 mr-1" />
              {currentTestCase ? currentTestCase.name : '选择用例'}
            </Button>
          </div>

          {/* 第三列：新增用例 */}
          <div className="bg-card p-3 flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground font-medium">新增用例</div>
            <Button 
              onClick={handleCreateTestCase}
              variant="outline" 
              size="sm" 
              className="h-8 text-xs px-2"
            >
              <FilePlus className="w-3 h-3 mr-1" />
              新建
            </Button>
          </div>

          {/* 第四列：克隆用例 */}
          <div className="bg-card p-3 flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground font-medium">克隆用例</div>
            <Button 
              onClick={() => setShowCloneDialog(true)}
              variant="outline" 
              size="sm" 
              className="h-8 text-xs px-2"
              disabled={testCases.length === 0}
            >
              <Copy className="w-3 h-3 mr-1" />
              克隆
            </Button>
          </div>

        </div>
      </div>

      {/* 测试用例选择窗口 */}
      <Dialog open={showCaseSelector} onOpenChange={setShowCaseSelector}>
        <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择测试用例</DialogTitle>
          </DialogHeader>
          
          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索测试用例..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* 测试用例列表 */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px]">
            {filteredTestCases.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery ? '未找到匹配的测试用例' : '暂无测试用例'}
              </div>
            ) : (
              filteredTestCases.map((testCase) => (
                <Card 
                  key={testCase.id} 
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    currentTestCase?.id === testCase.id ? 'ring-2 ring-primary bg-accent/30' : ''
                  }`}
                  onClick={() => {
                    onSelectTestCase(testCase.id);
                    setShowCaseSelector(false);
                    setSearchQuery('');
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{testCase.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {testCase.commands.length} 步骤
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 克隆用例选择窗口 */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择要克隆的测试用例</DialogTitle>
          </DialogHeader>
          
          {/* 测试用例列表 */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px]">
            {testCases.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                暂无可克隆的测试用例
              </div>
            ) : (
              testCases.map((testCase) => (
                <Card 
                  key={testCase.id} 
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => handleCloneTestCase(testCase)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{testCase.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {testCase.commands.length} 步骤
                        </div>
                      </div>
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};