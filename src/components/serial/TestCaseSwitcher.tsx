import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, TestTube2, FilePlus, Trash2, RotateCcw, Upload, Download } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDeleteCurrentCase = () => {
    if (!currentTestCase) return;
    
    if (onDeleteTestCase) {
      onDeleteTestCase(currentTestCase.id);
    } else {
      // 默认删除逻辑
      const updatedTestCases = testCases.filter(tc => tc.id !== currentTestCase.id);
      setTestCases(updatedTestCases);
      toast({
        title: "删除成功",
        description: `已删除测试用例: ${currentTestCase.name}`,
      });
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            setTestCases(data);
            toast({
              title: "导入成功",
              description: "测试用例已导入",
            });
          } catch (error) {
            toast({
              title: "导入失败",
              description: "文件格式错误",
              variant: "destructive"
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(testCases, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'test-cases.json';
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "导出成功",
      description: "测试用例已导出",
    });
  };

  return (
    <>
      {/* 底部工具栏 */}
      <div className="flex-shrink-0 p-3 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          {/* 左侧：用例选择 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCaseSelector(true)}
              className="flex items-center gap-2 min-w-[120px] h-8"
            >
              <TestTube2 className="w-3 h-3" />
              <span className="text-xs">
                {currentTestCase ? `#${currentTestCase.uniqueId}` : '选择测试用例'}
              </span>
            </Button>
          </div>

          {/* 右侧：管理按钮 */}
          <div className="flex items-center gap-1">
            {/* 新增用例 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleCreateTestCase}
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-3 text-xs"
                  >
                    <FilePlus className="w-3 h-3 mr-1" />
                    新增用例
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>创建新的测试用例</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 删除当前用例 */}
            {currentTestCase && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleDeleteCurrentCase}
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      删除当前用例
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>删除当前测试用例</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* 分隔线 */}
            <div className="w-px h-4 bg-border mx-1" />
            
            {/* 同步 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onSync}
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>同步测试用例</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 导入 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleUpload}
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>导入测试用例</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 导出 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleDownload}
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>导出测试用例</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* 测试用例选择窗口 */}
      <Dialog open={showCaseSelector} onOpenChange={setShowCaseSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择测试用例</DialogTitle>
          </DialogHeader>
          
          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索测试用例名称、编号或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* 测试用例列表 */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
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
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            #{testCase.uniqueId}
                          </Badge>
                          <span className="font-medium truncate">{testCase.name}</span>
                        </div>
                        
                        {testCase.description && (
                          <p className="text-sm text-muted-foreground truncate mb-2">
                            {testCase.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{testCase.commands.length} 个步骤</span>
                          <Badge 
                            variant={
                              testCase.status === 'success' ? 'default' :
                              testCase.status === 'failed' ? 'destructive' :
                              testCase.status === 'running' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {testCase.status === 'pending' ? '待执行' :
                             testCase.status === 'running' ? '执行中' :
                             testCase.status === 'success' ? '成功' :
                             testCase.status === 'failed' ? '失败' : '部分成功'}
                          </Badge>
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
    </>
  );
};