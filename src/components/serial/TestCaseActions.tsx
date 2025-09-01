import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Play, 
  Settings,
  Upload,
  Download,
  RotateCcw,
  Square,
  Pause,
  Trash2,
  FilePlus,
  Radio,
  FileCode,
  Package,
  FolderPlus,
  Edit
} from "lucide-react";
import { TestCase, TestCommand } from "./types";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { OneNetTestCase } from "./OneNetTestCase";

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
  onAddSubCase?: (parentId: string) => void;
  onUpdateCase?: (caseId: string, updater: (c: TestCase) => TestCase) => void;
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
  onAddSubCase,
  onUpdateCase
}) => {
  console.log('TestCaseActions rendered', { currentTestCase });
  
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  const addCommand = () => {
    if (!currentTestCase) return;
    
    const newCommand: TestCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'execution',
      command: 'AT',
      validationMethod: 'none',
      waitTime: 1000,
      stopOnFailure: false,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    };

    if (onUpdateCase) {
      // 使用递归更新回调
      onUpdateCase(currentTestCase.id, (testCase) => ({
        ...testCase,
        commands: [...testCase.commands, newCommand]
      }));
    } else {
      // 回退到顶层更新
      const updatedCommands = [...currentTestCase.commands, newCommand];
      const updatedCase = { ...currentTestCase, commands: updatedCommands };
      const updatedTestCases = testCases.map(tc => 
        tc.id === currentTestCase.id ? updatedCase : tc
      );
      setTestCases(updatedTestCases);
    }

    toast({
      title: t("testCase.addCommand"),
      description: t("testCase.addCommandDesc", { command: newCommand.command }),
    });
    setShowAddMenu(false);
  };

  const addUrc = () => {
    if (!currentTestCase) return;
    
    const newUrc: TestCommand = {
      id: `urc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'urc',
      command: t("testCase.urcListener"),
      validationMethod: 'none',
      waitTime: 0,
      stopOnFailure: false,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+CREG:',
      urcMatchMode: 'startsWith',
      urcListenMode: 'once',
      urcListenTimeout: 10000,
      urcFailureHandling: 'stop'
    };

    if (onUpdateCase) {
      // 使用递归更新回调
      onUpdateCase(currentTestCase.id, (testCase) => ({
        ...testCase,
        commands: [...testCase.commands, newUrc]
      }));
    } else {
      // 回退到顶层更新
      const updatedCommands = [...currentTestCase.commands, newUrc];
      const updatedCase = { ...currentTestCase, commands: updatedCommands };
      const updatedTestCases = testCases.map(tc => 
        tc.id === currentTestCase.id ? updatedCase : tc
      );
      setTestCases(updatedTestCases);
    }

    toast({
      title: t("testCase.addUrc"),
      description: t("testCase.addUrcDesc", { pattern: newUrc.urcPattern }),
    });
    setShowAddMenu(false);
  };

  const addSubCase = () => {
    if (!currentTestCase) return;
    
    if (onAddSubCase) {
      // 使用递归添加回调
      onAddSubCase(currentTestCase.id);
    } else {
      // 回退到顶层更新（仅用于顶层用例）
      const newSubCase: TestCase = {
        id: `subcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uniqueId: (Math.max(...testCases.map(tc => parseInt(tc.uniqueId) || 1000), 1000) + 1).toString(),
        name: t("testCase.newSubCase"),
        description: '',
        commands: [],
        subCases: [],
        isExpanded: false,
        isRunning: false,
        currentCommand: -1,
        selected: false,
        status: 'pending'
      };

      const updatedSubCases = [...currentTestCase.subCases, newSubCase];
      const updatedCase = { ...currentTestCase, subCases: updatedSubCases };
      const updatedTestCases = testCases.map(tc => 
        tc.id === currentTestCase.id ? updatedCase : tc
      );
      setTestCases(updatedTestCases);

      toast({
        title: t("testCase.addSubCase"),
        description: t("testCase.addSubCaseDesc", { name: newSubCase.name }),
      });
    }
    setShowAddMenu(false);
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
              title: t("testCase.importSuccess"),
              description: t("testCase.importSuccessDesc"),
            });
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
    const dataStr = JSON.stringify(testCases, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'test-cases.json';
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: t("testCase.exportSuccess"),
      description: t("testCase.exportSuccessDesc"),
    });
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
        status: 'pending'
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
    
    // 删除选中的命令
    const updatedCommands = currentTestCase.commands.filter(cmd => !cmd.selected);
    const updatedCase = { ...currentTestCase, commands: updatedCommands };
    const updatedTestCases = testCases.map(tc => 
      tc.id === currentTestCase.id ? updatedCase : tc
    );
    setTestCases(updatedTestCases);
    
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

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* 新增按钮 */}
      <Popover open={showAddMenu} onOpenChange={setShowAddMenu}>
        <PopoverTrigger asChild>
          <Button 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 z-50" align="start" side="bottom">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={addCommand}
            >
              <FileCode className="w-3 h-3 mr-2" />
              {t("testCase.addCommand")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={addUrc}
            >
              <Radio className="w-3 h-3 mr-2" />
              {t("testCase.addUrc")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={addSubCase}
            >
              <FolderPlus className="w-3 h-3 mr-2" />
              {t("testCase.addSubCase")}
            </Button>
            {testCases.some(tc => tc.isPreset) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2 text-sm text-red-600 hover:text-red-700"
                onClick={() => {
                  setShowAddMenu(false);
                  handleDeletePresetCases();
                }}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                {t("testCase.deletePresetCases")}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* 删除选中命令按钮 */}
      {currentTestCase && currentTestCase.commands.some(cmd => cmd.selected) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={onDeleteSelectedCommands || handleDeleteSelectedCommands} 
                variant="destructive" 
                size="sm" 
                className="h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("testCase.deleteSelected")}</p>
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
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
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
                className="h-8 w-8 p-0" 
                disabled={connectedPorts.length === 0}
              >
                {currentTestCase.isRunning ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
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
                className="h-8 w-8 p-0"
              >
                <Square className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("testCase.stop")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* 重置按钮 */}
      {currentTestCase && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="w-4 h-4" />
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