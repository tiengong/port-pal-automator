import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from "@/components/ui/context-menu";
import { 
  Plus, 
  Play, 
  Trash2, 
  Edit,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  TestTube2,
  Search,
  Upload,
  Download,
  CheckSquare,
  Square,
  PlayCircle,
  RotateCcw,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { CaseTree } from './CaseTree';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { VariableDisplay } from '../VariableDisplay';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from './types';
import { eventBus, EVENTS, SerialDataEvent, SendCommandEvent } from '@/lib/eventBus';
import { initializeDefaultWorkspace, loadCases, saveCase, getCurrentWorkspace } from './workspace';

interface TestCaseManagerProps {
  connectedPorts: Array<{
    port: any;
    params: any;
  }>;
  receivedData: string[];
}

export const TestCaseManager: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData
}) => {
  const { toast } = useToast();
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // AT命令库
  const atCommands = [
    'AT', 'AT+CGMR', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ', 'AT+CREG', 'AT+COPS',
    'AT+CGATT', 'AT+CGACT', 'AT+CGDCONT', 'AT+CPINR', 'AT+CPIN', 'AT+CCID'
  ];
  
  // 状态管理
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number; } }>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [nextUniqueId, setNextUniqueId] = useState(1001);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  
  // 查找测试用例
  const findTestCaseById = (id: string): TestCase | null => {
    const findInCases = (cases: TestCase[]): TestCase | null => {
      for (const testCase of cases) {
        if (testCase.id === id) {
          return testCase;
        }
        if (testCase.subCases) {
          const found = findInCases(testCase.subCases);
          if (found) return found;
        }
      }
      return null;
    };
    return findInCases(testCases);
  };

  // 计算当前测试用例
  const currentTestCase = selectedTestCaseId ? findTestCaseById(selectedTestCaseId) : null;
  const visibleRootCase = currentTestCase;

  // 生成唯一ID
  const generateUniqueId = () => {
    const newId = nextUniqueId;
    setNextUniqueId(prev => prev + 1);
    return newId.toString();
  };

  // 工作空间变更处理
  const handleWorkspaceChange = (workspace: any) => {
    setCurrentWorkspace(workspace);
  };
  
  // Initialize workspace and load test cases
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const workspace = await initializeDefaultWorkspace();
        setCurrentWorkspace(workspace);
        const cases = await loadCases();
        
        if (cases.length > 0) {
          // 如果从workspace加载到用例，使用加载的用例
          setTestCases(cases);
          if (!selectedTestCaseId) {
            setSelectedTestCaseId(cases[0].id);
          }
        } else {
          // 如果没有保存的用例，使用示例数据
          const sampleTestCases: TestCase[] = [
            {
              id: 'case1',
              uniqueId: '1001',
              name: 'AT指令基础测试',
              description: '测试基本AT指令响应',
              isExpanded: false,
              isRunning: false,
              currentCommand: -1,
              selected: false,
              status: 'pending',
              subCases: [],
              commands: [
                {
                  id: 'cmd1',
                  type: 'execution',
                  command: 'AT',
                  expectedResponse: 'OK',
                  validationMethod: 'contains',
                  validationPattern: 'OK',
                  waitTime: 2000,
                  stopOnFailure: true,
                  lineEnding: 'crlf',
                  selected: false,
                  status: 'pending'
                },
                {
                  id: 'cmd2',
                  type: 'execution',
                  command: 'AT+CGMR',
                  validationMethod: 'none',
                  waitTime: 3000,
                  stopOnFailure: false,
                  lineEnding: 'crlf',
                  selected: false,
                  status: 'pending'
                }
              ]
            },
            {
              id: 'case2',
              uniqueId: '1002',
              name: '网络连接测试',
              description: '测试网络连接相关指令',
              isExpanded: false,
              isRunning: false,
              currentCommand: -1,
              selected: false,
              status: 'pending',
              subCases: [],
              commands: [
                {
                  id: 'cmd3',
                  type: 'execution',
                  command: 'AT+CREG?',
                  validationMethod: 'contains',
                  validationPattern: '+CREG:',
                  waitTime: 2000,
                  stopOnFailure: true,
                  lineEnding: 'crlf',
                  selected: false,
                  status: 'pending'
                },
                {
                  id: 'cmd4',
                  type: 'execution',
                  command: 'AT+CSQ',
                  validationMethod: 'regex',
                  validationPattern: '\\+CSQ: \\d+,\\d+',
                  waitTime: 2000,
                  stopOnFailure: false,
                  lineEnding: 'crlf',
                  selected: false,
                  status: 'pending'
                }
              ]
            }
          ];
          setTestCases(sampleTestCases);
          setSelectedTestCaseId('case1');
        }
        setNextUniqueId(1003);
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      }
    };
    
    initWorkspace();
  }, []);

  // URC数据解析
  const parseUrcData = (data: string): { [key: string]: string } => {
    const parameters: { [key: string]: string } = {};
    
    // 尝试解析标准AT响应格式
    const patterns = [
      /\+(\w+):\s*(.+)/g,  // +CMD: value
      /(\w+):\s*(.+)/g,    // CMD: value
      /OK/g,               // OK
      /ERROR/g             // ERROR
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(data)) !== null) {
        if (match.length > 2) {
          parameters[match[1]] = match[2];
        }
      }
    });
    
    return parameters;
  };

  // 变量替换
  const substituteVariables = (text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return storedParameters[key]?.value || match;
    });
  };

  // 递归更新测试用例
  const updateCaseById = (cases: TestCase[], id: string, updater: (tc: TestCase) => TestCase): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === id) {
        return updater(testCase);
      }
      if (testCase.subCases && testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: updateCaseById(testCase.subCases, id, updater)
        };
      }
      return testCase;
    });
  };

  // 添加子用例
  const addSubCaseById = (cases: TestCase[], parentId: string, newSubCase: TestCase): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === parentId) {
        return {
          ...testCase,
          subCases: [...testCase.subCases, newSubCase]
        };
      }
      if (testCase.subCases && testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: addSubCaseById(testCase.subCases, parentId, newSubCase)
        };
      }
      return testCase;
    });
  };

  // 切换展开状态
  const toggleExpandById = (cases: TestCase[], id: string): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === id) {
        return { ...testCase, isExpanded: !testCase.isExpanded };
      }
      if (testCase.subCases && testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: toggleExpandById(testCase.subCases, id)
        };
      }
      return testCase;
    });
  };

  // URC匹配检查
  const checkUrcMatch = (data: string, command: TestCommand): boolean => {
    if (!command.urcPattern) return false;
    
    switch (command.urcMatchMode) {
      case 'contains':
        return data.includes(command.urcPattern);
      case 'exact':
        return data.trim() === command.urcPattern;
      case 'startsWith':
        return data.startsWith(command.urcPattern);
      case 'endsWith':
        return data.endsWith(command.urcPattern);
      case 'regex':
        try {
          const regex = new RegExp(command.urcPattern);
          return regex.test(data);
        } catch {
          return false;
        }
      default:
        return false;
    }
  };

  // 监听URC数据
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
      const receivedData = event.data;
      
      // 解析参数并存储
      const parameters = parseUrcData(receivedData);
      if (Object.keys(parameters).length > 0) {
        setStoredParameters(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, { value, timestamp: Date.now() }]))
        }));
      }
      
      // 检查URC匹配
      if (currentTestCase) {
        currentTestCase.commands.forEach((command, index) => {
          if (command.type === 'urc' && command.selected && checkUrcMatch(receivedData, command)) {
            setStoredParameters(prev => ({
              ...prev,
              [`urc_${command.id}`]: { value: receivedData, timestamp: Date.now() }
            }));
            
            const updatedCommands = currentTestCase.commands.map((cmd, idx) =>
              idx === index ? { ...cmd, status: 'success' as const, selected: false } : cmd
            );
            
            const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
              ...testCase,
              commands: updatedCommands
            }));
            setTestCases(updatedTestCases);
            
            toast({
              title: "URC匹配成功",
              description: `模式 ${command.urcPattern} 匹配到数据`,
            });
          }
        });
      }
    });
    
    return unsubscribe;
  }, [currentTestCase]);

  // 渲染统一层级树
  const renderUnifiedTree = (cases: TestCase[], depth: number = 0): React.ReactNode => {
    return (
      <CaseTree
        cases={cases}
        selectedId={selectedTestCaseId}
        onSelect={handleSelectTestCase}
        onToggleExpand={(id) => {
          const updatedTestCases = toggleExpandById(testCases, id);
          setTestCases(updatedTestCases);
        }}
        onAddSubCase={(parentId) => {
          const newSubCase: TestCase = {
            id: `subcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uniqueId: generateUniqueId(),
            name: '新建子用例',
            description: '',
            commands: [],
            subCases: [],
            isExpanded: false,
            isRunning: false,
            currentCommand: -1,
            selected: false,
            status: 'pending'
          };
          
          const updatedTestCases = addSubCaseById(testCases, parentId, newSubCase);
          setTestCases(updatedTestCases);
        }}
      />
    );
  };

  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases });

  // 运行测试用例
  const runTestCase = (caseId: string) => {
    // 每次运行测试用例时清空存储的变量
    setStoredParameters({});
    
    toast({
      title: "开始执行",
      description: `正在执行测试用例: ${currentTestCase?.name}`,
    });
  };

  // 运行单个命令
  const runCommand = (caseId: string, commandIndex: number) => {
    const targetCase = findTestCaseById(caseId);
    if (!targetCase) return;
    
    const command = targetCase.commands[commandIndex];
    
    if (command.type === 'execution') {
      // 执行命令前进行变量替换
      const substitutedCommand = substituteVariables(command.command);
      
      const sendEvent: SendCommandEvent = {
        command: substitutedCommand,
        format: command.dataFormat === 'hex' ? 'hex' : 'ascii',
        lineEnding: command.lineEnding,
        targetPort: connectedPorts.length > 1 ? 'ALL' : undefined
      };
      
      eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
      
      toast({
        title: "命令已发送",
        description: `执行步骤 ${commandIndex + 1}: ${substitutedCommand}`,
      });
    } else if (command.type === 'urc') {
      // 激活URC监听
      const updatedCommands = targetCase.commands.map((cmd, idx) =>
        idx === commandIndex ? { ...cmd, selected: true, status: 'running' as const } : cmd
      );
      
      const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
        ...testCase,
        commands: updatedCommands
      }));
      setTestCases(updatedTestCases);
      
      toast({
        title: "URC监听已激活",
        description: `监听模式: ${command.urcPattern}`,
      });
    }
  };

  // 删除测试用例
  const deleteTestCase = (caseId: string) => {
    setTestCases(prev => prev.filter(tc => tc.id !== caseId));
    if (selectedTestCaseId === caseId) {
      setSelectedTestCaseId(testCases.length > 1 ? testCases.find(tc => tc.id !== caseId)?.id || '' : '');
    }
    toast({
      title: "删除成功",
      description: "测试用例已删除",
    });
  };

  // 删除预设用例
  const deletePresetCases = () => {
    const presetCases = testCases.filter(tc => tc.isPreset);
    
    if (presetCases.length === 0) {
      toast({
        title: "提示",
        description: "没有预设用例需要删除",
        variant: "default"
      });
      return;
    }
    
    const updatedTestCases = testCases.filter(tc => !tc.isPreset);
    setTestCases(updatedTestCases);
    
    // 如果当前选中的是预设用例，切换到第一个非预设用例
    if (currentTestCase && currentTestCase.isPreset) {
      const firstNonPreset = updatedTestCases[0];
      if (firstNonPreset) {
        setSelectedTestCaseId(firstNonPreset.id);
      } else {
        setSelectedTestCaseId('');
      }
    }
    
    toast({
      title: "删除成功",
      description: `已删除 ${presetCases.length} 个预设用例`,
    });
  };

  // 编辑引用的测试用例
  const handleEditReferencedCase = (caseId: string) => {
    const referencedCase = testCases.find(tc => tc.id === caseId);
    if (referencedCase) {
      handleEditCase(referencedCase);
    }
  };

  // 同步测试用例
  const handleSync = () => {
    toast({
      title: "同步功能",
      description: "同步功能开发中...",
    });
  };

  // 编辑测试用例
  const handleEditCase = (testCase: TestCase) => {
    setEditingCase(testCase);
    setIsEditDialogOpen(true);
  };

  // 选择测试用例
  const handleSelectTestCase = (caseId: string) => {
    setSelectedTestCaseId(caseId);
  };

  // 右击菜单功能
  const addCommandViaContextMenu = () => {
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
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "新增命令",
      description: `已添加新命令: ${newCommand.command}`,
    });
  };

  const addUrcViaContextMenu = () => {
    if (!currentTestCase) return;
    
    const newUrc: TestCommand = {
      id: `urc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'urc',
      command: 'URC监听',
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

    const updatedCommands = [...currentTestCase.commands, newUrc];
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "新增URC",
      description: `已添加URC监听: ${newUrc.urcPattern}`,
    });
  };

  const loadTestCaseToCurrentCase = (sourceCase: TestCase) => {
    if (!currentTestCase) return;

    const commandsToAdd = sourceCase.commands.map(cmd => ({
      ...cmd,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selected: false,
      status: 'pending' as const
    }));

    const updatedCommands = [...currentTestCase.commands, ...commandsToAdd];
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "载入成功",
      description: `已载入 ${commandsToAdd.length} 个命令到当前用例`,
    });
  };


  const deleteSelectedCommands = () => {
    if (!currentTestCase) return;

    const selectedCommands = currentTestCase.commands.filter(cmd => cmd.selected);
    if (selectedCommands.length === 0) {
      toast({
        title: "提示",
        description: "请先勾选要删除的命令",
      });
      return;
    }

    const updatedCommands = currentTestCase.commands.filter(cmd => !cmd.selected);
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "删除成功",
      description: `已删除 ${selectedCommands.length} 个命令`,
    });
  };

  const exportTestCase = () => {
    if (!currentTestCase) return;

    const dataStr = JSON.stringify(currentTestCase, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentTestCase.name}_${currentTestCase.uniqueId}.json`;
    link.click();
    
    URL.revokeObjectURL(url);

    toast({
      title: "导出成功",
      description: `测试用例已导出: ${currentTestCase.name}`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* ========== 模块化测试页面布局 - 2024年版本 ========== */}
      
      {/* 1. 当前测试用例信息显示 */}
      <div className="flex-shrink-0 p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {/* 🎯 新模块化布局已激活 - 2024版本 */}
        <div className="flex items-center justify-between mb-4">
          <TestCaseHeader 
            currentTestCase={currentTestCase} 
            onUpdateCase={(caseId: string, updater: (c: TestCase) => TestCase) => {
              const updatedTestCases = updateCaseById(testCases, caseId, updater);
              setTestCases(updatedTestCases);
            }}
          />
        </div>

        {/* 2. 操作栏 */}
        <TestCaseActions 
          currentTestCase={currentTestCase}
          testCases={testCases}
          setTestCases={setTestCases}
          connectedPorts={connectedPorts}
          onEditCase={handleEditCase}
          onRunTestCase={runTestCase}
          onSync={handleSync}
          onDeleteTestCase={deleteTestCase}
          onDeletePresetCases={deletePresetCases}
          onAddSubCase={(parentId: string) => {
            const newSubCase: TestCase = {
              id: `subcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              uniqueId: generateUniqueId(),
              name: '新建子用例',
              description: '',
              commands: [],
              subCases: [],
              isExpanded: false,
              isRunning: false,
              currentCommand: -1,
              selected: false,
              status: 'pending'
            };

            const updatedTestCases = addSubCaseById(testCases, parentId, newSubCase);
            setTestCases(updatedTestCases);

            toast({
              title: "新增子用例",
              description: `已添加子用例: ${newSubCase.name}`,
            });
          }}
          onUpdateCase={(caseId: string, updater: (c: TestCase) => TestCase) => {
            const updatedTestCases = updateCaseById(testCases, caseId, updater);
            setTestCases(updatedTestCases);
          }}
        />
      </div>

      {/* 3. 中间测试用例展示区 */}
      <div className="flex-1 overflow-y-auto p-3">
        {testCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <TestTube2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">暂无测试用例，点击新建用例开始</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 参数显示面板 */}
            {Object.keys(storedParameters).length > 0 && (
              <VariableDisplay
                storedParameters={storedParameters}
                onClearParameter={(key) => {
                  setStoredParameters(prev => {
                    const newParams = { ...prev };
                    delete newParams[key];
                    return newParams;
                  });
                  toast({
                    title: "参数已清除",
                    description: `已清除参数: ${key}`,
                  });
                }}
                onClearAll={() => {
                  setStoredParameters({});
                  toast({
                    title: "全部参数已清除",
                    description: "所有解析的参数已被清空",
                  });
                }}
              />
            )}
            
            {/* 统一层级树 */}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="border border-border rounded-lg bg-card">
                  <div className="divide-y divide-border">
                    {visibleRootCase ? renderUnifiedTree([visibleRootCase], 0) : []}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-64">
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    新建
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem onClick={addCommandViaContextMenu} className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      新建命令
                    </ContextMenuItem>
                    <ContextMenuItem onClick={addUrcViaContextMenu} className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      新建URC
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                
                <ContextMenuSeparator />
                
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    载入
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-64">
                    {testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                      <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseToCurrentCase(testCase)} className="flex items-center justify-between">
                        <span className="truncate mr-2">{testCase.name}</span>
                        <span className="text-xs text-muted-foreground">载入到当前用例</span>
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem onClick={deleteSelectedCommands} className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  删除勾选的命令
                </ContextMenuItem>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem onClick={exportTestCase} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  导出用例到...
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        )}
      </div>

      {/* 4. 测试用例切换区 */}
      <TestCaseSwitcher 
        testCases={testCases}
        currentTestCase={currentTestCase}
        onSelectTestCase={handleSelectTestCase}
        setTestCases={setTestCases}
        onDeleteTestCase={deleteTestCase}
        onSync={handleSync}
        onWorkspaceChange={() => handleWorkspaceChange}
      />

      {/* 编辑测试用例对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                  <Label htmlFor="case-failure-handling">失败处理方式</Label>
                  <Select
                    value={editingCase.failureHandling || 'stop'}
                    onValueChange={(value) => setEditingCase({ ...editingCase, failureHandling: value as 'stop' | 'continue' | 'prompt' })}
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
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={() => {
                  const updatedTestCases = updateCaseById(testCases, editingCase.id, () => editingCase);
                  setTestCases(updatedTestCases);
                  setIsEditDialogOpen(false);
                  setEditingCase(null);
                  toast({
                    title: "保存成功",
                    description: "测试用例已更新",
                  });
                }}>
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑命令对话框 */}
      <Dialog open={editingCommandIndex !== null} onOpenChange={() => setEditingCommandIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[editingCommandIndex].type === 'execution' && '编辑命令配置'}
              {editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[editingCommandIndex].type === 'urc' && '编辑URC配置'}
            </DialogTitle>
            <DialogDescription>
              配置详细属性，包括执行参数、验证规则、错误处理等
            </DialogDescription>
          </DialogHeader>
          
          {editingCommandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              {currentTestCase.commands[editingCommandIndex].type === 'execution' && (
                <ExecutionEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={(updates) => {
                    const updatedCommands = [...currentTestCase.commands];
                    updatedCommands[editingCommandIndex] = {
                      ...updatedCommands[editingCommandIndex],
                      ...updates
                    };
                    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
                      ...testCase,
                      commands: updatedCommands
                    }));
                    setTestCases(updatedTestCases);
                  }}
                />
              )}
              {currentTestCase.commands[editingCommandIndex].type === 'urc' && (
                <UrcEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={(updates) => {
                    const updatedCommands = [...currentTestCase.commands];
                    updatedCommands[editingCommandIndex] = {
                      ...updatedCommands[editingCommandIndex],
                      ...updates
                    };
                    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
                      ...testCase,
                      commands: updatedCommands
                    }));
                    setTestCases(updatedTestCases);
                  }}
                />
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
                  取消
                </Button>
                <Button onClick={() => {
                  setEditingCommandIndex(null);
                  toast({
                    title: "保存成功",
                    description: "命令配置已更新",
                  });
                }}>
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};