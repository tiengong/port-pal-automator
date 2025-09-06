import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Play, 
  Settings,
  Upload,
  Download,
  RotateCcw,
  Square,
  Pause,
  Trash2,
  FilePlus,
  Package,
  Edit,
  CheckSquare,
  SquareIcon
} from "lucide-react";
import { TestCase, TestCommand } from "./types";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { OneNetTestCase } from "./OneNetTestCase";
import { normalizeImportedCases, ensureUniqueIds } from "@/lib/testCaseUtils";
import { scheduleAutoSave } from './workspace';

interface TestCaseActionsProps {
  currentTestCase: TestCase | null;
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  connectedPorts: Array<{ port: any; params: any }>;
  onEditCase: (testCase: TestCase) => void;
  onRunTestCase: (caseId: string) => void;
  onSync: () => void;
  onDeleteTestCase?: (caseId: string) => void;
  onCreateTestCase?: () => void;
  onDeleteSelectedCommands?: () => void;
  onDeletePresetCases?: () => void;
  onUpdateCase?: (caseId: string, updater: (c: TestCase) => TestCase) => void;
  onSelectTestCase?: (caseId: string) => void;
  hasSelectedItems?: (testCase: TestCase) => boolean;
}

export const TestCaseActions: React.FC<TestCaseActionsProps> = ({
  currentTestCase,
  testCases,
  setTestCases,
  connectedPorts,
  onEditCase,
  onRunTestCase,
  onSync,
  onDeleteTestCase,
  onCreateTestCase,
  onDeleteSelectedCommands,
  onDeletePresetCases,
  onUpdateCase,
  onSelectTestCase,
  hasSelectedItems
}) => {
  console.log('TestCaseActions rendered', { currentTestCase });
  
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  // 检查测试用例是否有执行记录
  const hasExecutionHistory = (testCase: TestCase): boolean => {
    // 检查用例本身的状态
    if (testCase.status !== 'pending' || testCase.currentCommand !== -1 || testCase.isRunning) {
      return true;
    }
    
    // 检查命令是否有执行记录
    if (testCase.commands.some(cmd => cmd.status !== 'pending')) {
      return true;
    }
    
    // 递归检查子用例
    if (testCase.subCases.some(subcase => hasExecutionHistory(subcase))) {
      return true;
    }
    
    return false;
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
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
                  title: t("testCase.importFailed"),
                  description: "JSON文件必须包含测试用例数组或单个测试用例对象",
                  variant: "destructive"
                });
                return;
              }
            } else {
              toast({
                title: t("testCase.importFailed"),
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
                title: t("testCase.importFailed"),
                description: "未找到有效的测试用例",
                variant: "destructive"
              });
              return;
            }
            
            setTestCases([...testCases, ...validatedCases]);
            
            // 自动切换到导入的用例
            if (onSelectTestCase && validatedCases.length > 0) {
              onSelectTestCase(validatedCases[0].id);
            }
            
            // 根据导入类型显示不同的成功消息
            if (isSingleCase) {
              toast({
                title: t("testCase.importSuccess"),
                description: `已自动适配单用例文件，导入 1 个测试用例`
              });
            } else {
              toast({
                title: t("testCase.importSuccess"),
                description: `已导入 ${validatedCases.length} 个测试用例`,
              });
            }
          } catch (error) {
            toast({
              title: t("testCase.importFailed"),
              description: t("testCase.importFailedDesc"),
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
        title: t("testCase.exportFailed"),
        description: "测试用例数据格式错误",
        variant: "destructive"
      });
      return;
    }

    if (testCases.length === 0) {
      toast({
        title: t("testCase.exportFailed"),
        description: "没有可导出的测试用例",
        variant: "destructive"
      });
      return;
    }

    try {
      const dataStr = JSON.stringify(testCases, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-cases-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: t("testCase.exportSuccess"),
        description: `已导出 ${testCases.length} 个测试用例`,
      });
    } catch (error) {
      toast({
        title: t("testCase.exportFailed"),
        description: "导出过程中发生错误",
        variant: "destructive"
      });
    }
  };

  const handleCreateTestCase = () => {
    if (onCreateTestCase) {
      onCreateTestCase();
    } else {
      // 默认创建逻辑
      const newTestCase: TestCase = {
        id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uniqueId: (Math.max(...testCases.map(tc => parseInt(tc.uniqueId) || 1000), 1000) + 1).toString(),
        name: t("testCase.newTestCase"),
        description: '',
        commands: [],
        subCases: [],
        isExpanded: false,
        isRunning: false,
        currentCommand: -1,
        selected: false,
        status: 'pending',
        failureStrategy: 'stop',
        onWarningFailure: 'continue',
        onErrorFailure: 'stop',
        failureHandling: 'stop',
        validationLevel: 'error', // 默认错误级别
        runMode: 'auto', // 默认自动模式
        runCount: 1 // 默认运行1次
      };
      
      setTestCases([...testCases, newTestCase]);
      toast({
        title: t("testCase.createSuccess"),
        description: t("testCase.createSuccessDesc", { name: newTestCase.name }),
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
        title: t("testCase.deleteSuccess"),
        description: t("testCase.deleteSuccessDesc", { name: currentTestCase.name }),
      });
    }
  };

  const handleDeleteSelectedCommands = () => {
    if (!currentTestCase) return;
    
    // 获取所有选中的命令
    const selectedCommands = currentTestCase.commands.filter(cmd => cmd.selected);
    
    if (selectedCommands.length === 0) {
      toast({
        title: t("testCase.deleteSelected"),
        description: t("testCase.deleteSelectedDesc"),
        variant: "destructive"
      });
      return;
    }
    
      // 回退到顶层更新
      const updatedCommands = currentTestCase.commands.filter(cmd => !cmd.selected);
      const updatedCase = { ...currentTestCase, commands: updatedCommands };
      const updatedTestCases = testCases.map(tc => 
        tc.id === currentTestCase.id ? updatedCase : tc
      );
      setTestCases(updatedTestCases);
      
      // 兜底自动保存
      scheduleAutoSave(updatedCase);
    
    toast({
      title: t("testCase.deleteSuccess"),
      description: t("testCase.deleteSelectedSuccess", { count: selectedCommands.length }),
    });
  };

  const handleDeletePresetCases = () => {
    if (onDeletePresetCases) {
      onDeletePresetCases();
    } else {
      // 默认删除预设用例逻辑
      const presetCases = testCases.filter(tc => tc.isPreset);
      
      if (presetCases.length === 0) {
        toast({
          title: t("testCase.deletePresetCases"),
          description: t("testCase.noPresetCases"),
          variant: "default"
        });
        return;
      }
      
      const updatedTestCases = testCases.filter(tc => !tc.isPreset);
      setTestCases(updatedTestCases);
      
      toast({
        title: t("testCase.deleteSuccess"),
        description: t("testCase.deletePresetSuccess", { count: presetCases.length }),
      });
    }
  };

  const handleToggleSelectAll = () => {
    if (!currentTestCase) return;
    
    const allSelected = currentTestCase.commands.length > 0 && 
      currentTestCase.commands.every(cmd => cmd.selected);
    
    if (onUpdateCase) {
      // 使用递归更新回调
      onUpdateCase(currentTestCase.id, (testCase) => ({
        ...testCase,
        commands: testCase.commands.map(cmd => ({
          ...cmd,
          selected: !allSelected
        }))
      }));
    } else {
      // 回退到顶层更新
      const updatedCommands = currentTestCase.commands.map(cmd => ({
        ...cmd,
        selected: !allSelected
      }));
      const updatedCase = { ...currentTestCase, commands: updatedCommands };
      const updatedTestCases = testCases.map(tc => 
        tc.id === currentTestCase.id ? updatedCase : tc
      );
      setTestCases(updatedTestCases);
      
      // 兜底自动保存
      scheduleAutoSave(updatedCase);
    }
    
    toast({
      title: allSelected ? "取消全选" : "全选命令",
      description: allSelected ? "已取消选择所有命令" : `已选择所有 ${currentTestCase.commands.length} 个命令`,
    });
  };

  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {/* 全选/取消全选按钮 */}
      {currentTestCase && currentTestCase.commands.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleToggleSelectAll}
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0"
              >
                {currentTestCase.commands.length > 0 && currentTestCase.commands.every(cmd => cmd.selected) ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <SquareIcon className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {currentTestCase.commands.length > 0 && currentTestCase.commands.every(cmd => cmd.selected)
                  ? "取消全选"
                  : "全选命令"
                }
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* 删除选中命令和子用例按钮 */}
      {currentTestCase && hasSelectedItems && hasSelectedItems(currentTestCase) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={onDeleteSelectedCommands || handleDeleteSelectedCommands} 
                variant="destructive" 
                size="sm" 
                className="h-7 w-7 p-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>删除选中项</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* 编辑按钮 */}
      {currentTestCase && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => onEditCase(currentTestCase)} 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("testCase.edit")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* 运行按钮 */}
      {currentTestCase && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => onRunTestCase(currentTestCase.id)} 
                variant={currentTestCase.isRunning ? "destructive" : "default"} 
                size="sm" 
                className="h-7 w-7 p-0"
                disabled={connectedPorts.length === 0}
              >
                {currentTestCase.isRunning ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{currentTestCase.isRunning ? t("testCase.pause") : t("testCase.run")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* 停止按钮 */}
      {currentTestCase?.isRunning && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-7 w-7 p-0"
              >
                <Square className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("testCase.stop")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* 重置按钮 - 只有在测试用例有执行记录时才显示 */}
      {currentTestCase && hasExecutionHistory(currentTestCase) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => {
                  if (onUpdateCase) {
                    onUpdateCase(currentTestCase.id, (testCase) => ({
                      ...testCase,
                      status: 'pending',
                      currentCommand: -1,
                      isRunning: false,
                      commands: testCase.commands.map(cmd => ({
                        ...cmd,
                        status: 'pending'
                      })),
                      subCases: testCase.subCases.map(subcase => ({
                        ...subcase,
                        status: 'pending',
                        currentCommand: -1,
                        isRunning: false,
                        commands: subcase.commands.map(cmd => ({
                          ...cmd,
                          status: 'pending'
                        }))
                      }))
                    }));
                  }
                  toast({
                    title: t("testCase.reset"),
                    description: "测试用例状态已重置",
                  });
                }}
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("testCase.reset")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* 预设用例对话框 */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择预设测试用例</DialogTitle>
          </DialogHeader>
          <OneNetTestCase
            testCases={testCases}
            setTestCases={setTestCases}
            onClose={() => setShowPresetDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};