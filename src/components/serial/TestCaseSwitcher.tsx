import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TestTube2, FilePlus, Trash2, RotateCcw, Upload, Download, FolderOpen, Copy } from "lucide-react";
import { TestCase } from "./types";
import { useToast } from "@/hooks/use-toast";
import { createWorkspace, openWorkspace, cloneCase, getNextUniqueId, saveCase, deleteCase, getCurrentWorkspace } from "./workspace";
import { normalizeImportedCases, ensureUniqueIds } from "@/lib/testCaseUtils";

interface TestCaseSwitcherProps {
  testCases: TestCase[];
  currentTestCase: TestCase | null;
  onSelectTestCase: (caseId: string) => void;
  setTestCases: (cases: TestCase[]) => void;
  onDeleteTestCase?: (caseId: string) => void;
  onCreateTestCase?: () => void;
  onSync?: () => void;
  onWorkspaceChange?: () => void;
}

export const TestCaseSwitcher: React.FC<TestCaseSwitcherProps> = ({
  testCases,
  currentTestCase,
  onSelectTestCase,
  setTestCases,
  onDeleteTestCase,
  onCreateTestCase,
  onSync,
  onWorkspaceChange
}) => {
  const {
    toast
  } = useToast();
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New workspace dialogs
  const [showNewCaseDialog, setShowNewCaseDialog] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState('');
  const [cloneNewName, setCloneNewName] = useState('');
  const [confirmNewWorkspace, setConfirmNewWorkspace] = useState(false);
  const [deleteConfirmCase, setDeleteConfirmCase] = useState<TestCase | null>(null);
  console.log('TestCaseSwitcher rendered - NEW MODULAR LAYOUT ACTIVE', {
    testCases,
    currentTestCase
  });
  const filteredTestCases = testCases.filter(tc => tc.name.toLowerCase().includes(searchQuery.toLowerCase()) || tc.uniqueId.includes(searchQuery) || tc.description.toLowerCase().includes(searchQuery.toLowerCase()));

  // Handle new workspace creation
  const handleOpenNewWorkspace = async () => {
    try {
      // For Tauri desktop mode, use file system selection
      const workspace = await createWorkspace('新工作区', true);
      if (onWorkspaceChange) {
        onWorkspaceChange();
      }
      toast({
        title: "新工作区已创建",
        description: `已切换到工作区: ${workspace.name}`
      });
    } catch (error) {
      console.error('Create workspace error:', error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "无法创建新工作区",
        variant: "destructive"
      });
    }
    setConfirmNewWorkspace(false);
  };

  // Handle new case creation
  const handleCreateNewCase = async () => {
    if (!newCaseName.trim()) return;
    try {
      const uniqueId = await getNextUniqueId();
      const newTestCase: TestCase = {
        id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uniqueId,
        name: newCaseName.trim(),
        description: newCaseDescription.trim(),
        commands: [],
        subCases: [],
        isExpanded: false,
        isRunning: false,
        currentCommand: -1,
        selected: false,
        status: 'pending'
      };
      await saveCase(newTestCase);
      setTestCases([...testCases, newTestCase]);

      // Reset form
      setNewCaseName('');
      setNewCaseDescription('');
      setShowNewCaseDialog(false);
      toast({
        title: "新建成功",
        description: `已创建测试用例: ${newTestCase.name}`
      });
    } catch (error) {
      toast({
        title: "创建失败",
        description: "无法创建测试用例",
        variant: "destructive"
      });
    }
  };

  // Handle case cloning
  const handleCloneCase = async () => {
    if (!cloneSourceId || !cloneNewName.trim()) return;
    try {
      const clonedCase = await cloneCase(cloneSourceId, cloneNewName.trim());
      setTestCases([...testCases, clonedCase]);

      // Reset form
      setCloneSourceId('');
      setCloneNewName('');
      setShowCloneDialog(false);
      toast({
        title: "克隆成功",
        description: `已创建测试用例: ${clonedCase.name}`
      });
    } catch (error) {
      toast({
        title: "克隆失败",
        description: "无法克隆测试用例",
        variant: "destructive"
      });
    }
  };
  const handleDeleteCase = async (testCase: TestCase) => {
    try {
      // 删除磁盘文件
      await deleteCase(testCase.uniqueId);
      
      // 如果有传入的删除回调，使用它
      if (onDeleteTestCase) {
        onDeleteTestCase(testCase.id);
      } else {
        // 默认删除逻辑
        const updatedTestCases = testCases.filter(tc => tc.id !== testCase.id);
        setTestCases(updatedTestCases);
      }
      
      toast({
        title: "删除成功",
        description: `已删除测试用例: ${testCase.name}`
      });
      
      setDeleteConfirmCase(null);
    } catch (error) {
      toast({
        title: "删除失败",
        description: "无法删除测试用例",
        variant: "destructive"
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
        description: `已删除测试用例: ${currentTestCase.name}`
      });
    }
  };
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async e => {
          try {
            const rawData = JSON.parse(e.target?.result as string);
            
            let rawArray: any[] = [];
            let isSingleCase = false;
            
            // 支持多种输入格式
            if (Array.isArray(rawData)) {
              // 格式1: 数组 [TestCase, ...]
              rawArray = rawData;
            } else if (rawData && typeof rawData === 'object') {
              // 检查是否是单个测试用例对象
              const hasTestCaseStructure = rawData.id && rawData.name && 
                (Array.isArray(rawData.commands) || !rawData.commands) &&
                (Array.isArray(rawData.subCases) || !rawData.subCases);
              
              if (hasTestCaseStructure) {
                // 格式2: 单个测试用例对象
                rawArray = [rawData];
                isSingleCase = true;
              } else if (Array.isArray(rawData.testCases)) {
                // 格式3: 包含testCases属性的对象
                rawArray = rawData.testCases;
              } else {
                toast({
                  title: "导入失败",
                  description: "JSON文件必须包含测试用例数组或单个测试用例对象",
                  variant: "destructive"
                });
                return;
              }
            } else {
              toast({
                title: "导入失败",
                description: "JSON文件格式不正确",
                variant: "destructive"
              });
              return;
            }
            
            // 标准化和验证导入的测试用例
            const normalizedCases = normalizeImportedCases(rawArray);
            const validatedCases = await ensureUniqueIds(normalizedCases, testCases);
            
            if (validatedCases.length === 0) {
              toast({
                title: "导入失败", 
                description: "未找到有效的测试用例",
                variant: "destructive"
              });
              return;
            }
            
            setTestCases([...testCases, ...validatedCases]);
            
            // 立即保存导入的用例到磁盘
            try {
              for (const validCase of validatedCases) {
                await saveCase(validCase);
              }
            } catch (error) {
              console.warn('自动保存导入用例失败:', error);
            }
            
            // 自动切换到导入的用例
            if (onSelectTestCase && validatedCases.length > 0) {
              onSelectTestCase(validatedCases[0].id);
            }
            
            // 根据导入类型显示不同的成功消息
            if (isSingleCase) {
              toast({
                title: "导入成功",
                description: `已自动适配单用例文件，导入 1 个测试用例`
              });
            } else {
              toast({
                title: "导入成功",
                description: `已导入 ${validatedCases.length} 个测试用例`
              });
            }
          } catch (error) {
            toast({
              title: "导入失败",
              description: "文件格式错误或包含无效数据",
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
    // 确保 testCases 是数组且不为空
    if (!Array.isArray(testCases)) {
      toast({
        title: "导出失败",
        description: "测试用例数据格式错误",
        variant: "destructive"
      });
      return;
    }

    if (testCases.length === 0) {
      toast({
        title: "导出失败",
        description: "没有可导出的测试用例",
        variant: "destructive"
      });
      return;
    }

    try {
      const dataStr = JSON.stringify(testCases, null, 2);
      const dataBlob = new Blob([dataStr], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-cases-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "导出成功",
        description: `已导出 ${testCases.length} 个测试用例`
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: "导出过程中发生错误",
        variant: "destructive"
      });
    }
  };
  return <>
      {/* 底部工具栏 */}
      <div className="flex-shrink-0 p-3 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          {/* 左侧：用例选择 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCaseSelector(true)} className="flex items-center gap-2 min-w-[120px] h-8">
              <TestTube2 className="w-3 h-3" />
              <span className="text-xs">
                {currentTestCase ? `#${currentTestCase.uniqueId}` : '选择测试用例'}
              </span>
            </Button>
          </div>

          {/* 右侧：管理按钮 */}
          <div className="flex items-center gap-1">
            {/* 删除当前用例 */}
            {currentTestCase && <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>删除当前测试用例</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>}
            
            {/* 分隔线 */}
            <div className="w-px h-4 bg-border mx-1" />
            
            {/* 同步 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onSync} variant="outline" size="sm" className="h-8 w-8 p-0">
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
                  <Button onClick={handleUpload} variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>导入测试用例</p>
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
            <Input placeholder="搜索测试用例名称、编号或描述..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
          </div>
          
          {/* 操作按钮工具栏 */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b">
            <Button variant="outline" size="sm" onClick={() => setShowNewCaseDialog(true)} className="flex items-center gap-2">
              <FilePlus className="w-4 h-4" />
              新增用例
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => setConfirmNewWorkspace(true)} className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              新建并切换工作区
            </Button>
            
            <Button variant="outline" size="sm" onClick={onSync} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              刷新
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => setShowCloneDialog(true)} className="flex items-center gap-2" disabled={testCases.length === 0}>
              <Copy className="w-4 h-4" />
              新增用例自..
            </Button>
          </div>
          
          {/* 测试用例表格 */}
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {filteredTestCases.length === 0 ? <div className="text-center text-muted-foreground py-8">
                {searchQuery ? '未找到匹配的测试用例' : '暂无测试用例'}
              </div> : <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-20">用例ID</TableHead>
                     <TableHead>用例名</TableHead>
                     <TableHead>用例简述</TableHead>
                     <TableHead className="w-20">操作</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredTestCases.map(testCase => <TableRow key={testCase.id} className={`hover:bg-accent/50 ${currentTestCase?.id === testCase.id ? 'bg-accent/30' : ''}`}>
                       <TableCell className="font-mono text-sm cursor-pointer" onClick={() => {
                         onSelectTestCase(testCase.id);
                         setShowCaseSelector(false);
                         setSearchQuery('');
                       }}>
                         #{testCase.uniqueId}
                       </TableCell>
                       <TableCell className="font-medium cursor-pointer" onClick={() => {
                         onSelectTestCase(testCase.id);
                         setShowCaseSelector(false);
                         setSearchQuery('');
                       }}>
                         {testCase.name}
                       </TableCell>
                       <TableCell className="text-muted-foreground cursor-pointer" onClick={() => {
                         onSelectTestCase(testCase.id);
                         setShowCaseSelector(false);
                         setSearchQuery('');
                       }}>
                         {testCase.description || '-'}
                       </TableCell>
                       <TableCell>
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                           onClick={(e) => {
                             e.stopPropagation();
                             setDeleteConfirmCase(testCase);
                           }}
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </TableCell>
                     </TableRow>)}
                 </TableBody>
              </Table>}
          </div>
        </DialogContent>
       </Dialog>

       {/* 删除用例确认对话框 */}
       <AlertDialog open={!!deleteConfirmCase} onOpenChange={() => setDeleteConfirmCase(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>确认删除测试用例</AlertDialogTitle>
             <AlertDialogDescription>
               确定要删除测试用例 "{deleteConfirmCase?.name}" 吗？此操作不可撤销。
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setDeleteConfirmCase(null)}>
               取消
             </AlertDialogCancel>
             <AlertDialogAction 
               onClick={() => deleteConfirmCase && handleDeleteCase(deleteConfirmCase)}
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
               删除
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

        {/* 新工作区确认对话框 */}
        <AlertDialog open={confirmNewWorkspace} onOpenChange={setConfirmNewWorkspace}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>创建并切换到新工作区</AlertDialogTitle>
              <AlertDialogDescription>
                将创建一个新工作区，并自动切换到它。当前工作区的数据不会被清空或删除，您可随时切换回来。在桌面版中，您需要选择一个文件夹用于存放测试用例。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleOpenNewWorkspace}>
                确认创建
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 新增用例对话框 */}
        <Dialog open={showNewCaseDialog} onOpenChange={setShowNewCaseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增测试用例</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">用例名称</label>
                <Input value={newCaseName} onChange={e => setNewCaseName(e.target.value)} placeholder="请输入用例名称" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">用例描述</label>
                <Input value={newCaseDescription} onChange={e => setNewCaseDescription(e.target.value)} placeholder="请输入用例描述（可选）" className="mt-1" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowNewCaseDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateNewCase} disabled={!newCaseName.trim()}>
                  创建
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 克隆用例对话框 */}
        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>克隆测试用例</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">选择源用例</label>
                <select value={cloneSourceId} onChange={e => setCloneSourceId(e.target.value)} className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background">
                  <option value="">请选择要克隆的用例</option>
                  {testCases.map(testCase => (
                    <option key={testCase.id} value={testCase.id}>
                      #{testCase.uniqueId} - {testCase.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">新用例名称</label>
                <Input value={cloneNewName} onChange={e => setCloneNewName(e.target.value)} placeholder="请输入新用例名称" className="mt-1" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCloneCase} disabled={!cloneSourceId || !cloneNewName.trim()}>
                  克隆
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
}
