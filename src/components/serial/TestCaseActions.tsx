import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Play, 
  Settings,
  TestTube2,
  Upload,
  Download,
  RotateCcw,
  Square,
  Pause,
  Trash2,
  FilePlus,
  Radio,
  FileCode
} from "lucide-react";
import { TestCase, TestCommand } from "./types";
import { useToast } from "@/hooks/use-toast";

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
  onCreateTestCase
}) => {
  console.log('TestCaseActions rendered', { currentTestCase });
  
  const { toast } = useToast();
  const [showAddMenu, setShowAddMenu] = useState(false);

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

    const updatedCommands = [...currentTestCase.commands, newCommand];
    const updatedCase = { ...currentTestCase, commands: updatedCommands };
    const updatedTestCases = testCases.map(tc => 
      tc.id === currentTestCase.id ? updatedCase : tc
    );
    setTestCases(updatedTestCases);

    toast({
      title: "新增命令",
      description: `已添加新命令: ${newCommand.command}`,
    });
    setShowAddMenu(false);
  };

  const addUrc = () => {
    if (!currentTestCase) return;
    
    const newUrc: TestCommand = {
      id: `urc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'urc',
      command: 'URC监听',
      validationMethod: 'none',
      waitTime: 1000,
      stopOnFailure: false,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending',
      urcPattern: '+',
      urcMatchMode: 'startsWith',
      urcListenMode: 'once',
      urcListenTimeout: 10000,
      urcFailureHandling: 'continue'
    };

    const updatedCommands = [...currentTestCase.commands, newUrc];
    const updatedCase = { ...currentTestCase, commands: updatedCommands };
    const updatedTestCases = testCases.map(tc => 
      tc.id === currentTestCase.id ? updatedCase : tc
    );
    setTestCases(updatedTestCases);

    toast({
      title: "新增URC",
      description: `已添加URC监听: ${newUrc.urcPattern}`,
    });
    setShowAddMenu(false);
  };

  const addSubcase = () => {
    if (!currentTestCase) return;
    
    const newSubcase: TestCommand = {
      id: `subcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'subcase',
      command: '新建子用例',
      validationMethod: 'none',
      waitTime: 0,
      stopOnFailure: false,
      lineEnding: 'none',
      selected: false,
      status: 'pending',
      referencedCaseId: '',
      isExpanded: false,
      subCommands: []
    };

    const updatedCommands = [...currentTestCase.commands, newSubcase];
    const updatedCase = { ...currentTestCase, commands: updatedCommands };
    const updatedTestCases = testCases.map(tc => 
      tc.id === currentTestCase.id ? updatedCase : tc
    );
    setTestCases(updatedTestCases);

    toast({
      title: "追加子用例",
      description: `已添加新子用例: ${newSubcase.command}`,
    });
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
              新增命令
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={addUrc}
            >
              <Radio className="w-3 h-3 mr-2" />
              新增URC
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={addSubcase}
            >
              <TestTube2 className="w-3 h-3 mr-2" />
              追加子用例
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
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
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>编辑测试用例</p>
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
                variant="default" 
                size="sm" 
                className="h-8 w-8 p-0" 
                disabled={connectedPorts.length === 0}
              >
                <Play className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>运行测试用例</p>
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
              <p>停止测试</p>
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
              <p>重置测试状态</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};