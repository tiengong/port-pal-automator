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
import { useTranslation } from "react-i18next";
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { CaseTree } from './CaseTree';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { VariableDisplay } from '../VariableDisplay';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from './types';
import { eventBus, EVENTS, SerialDataEvent, SendCommandEvent } from '@/lib/eventBus';
import { initializeDefaultWorkspace, loadCases, saveCase, getCurrentWorkspace, fromPersistedCase } from './workspace';

interface TestCaseManagerProps {
  connectedPorts: Array<{
    port: any;
    params: any;
  }>;
  receivedData: string[];
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export const TestCaseManager: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData,
  statusMessages
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Track running test cases to prevent race conditions
  const runningCasesRef = useRef<Set<string>>(new Set());
  
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [nextUniqueId, setNextUniqueId] = useState(1001);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  
  // Drag and drop state
  const [dragInfo, setDragInfo] = useState<{
    draggedItem: { caseId: string; commandIndex: number } | null;
    dropTarget: { caseId: string; commandIndex: number; position: 'above' | 'below' } | null;
  }>({ draggedItem: null, dropTarget: null });

  // Inline editing state
  const [inlineEdit, setInlineEdit] = useState<{
    commandId: string | null;
    value: string;
  }>({ commandId: null, value: '' });

  // 当前执行命令状态
  const [executingCommand, setExecutingCommand] = useState<{
    caseId: string | null;
    commandIndex: number | null;
  }>({ caseId: null, commandIndex: null });
  
  // Initialize workspace and load test cases
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const workspace = await initializeDefaultWorkspace();
        setCurrentWorkspace(workspace);
        const cases = await loadCases();
        // Ensure cases is always an array
        setTestCases(Array.isArray(cases) ? cases : []);
        if (cases.length > 0 && !selectedTestCaseId) {
          setSelectedTestCaseId(cases[0].id);
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        toast({
          title: t("testCase.initFailed"),
          description: t("testCase.initFailedDesc"),
          variant: "destructive"
        });
      }
    };
    
    initWorkspace();
  }, []);
  
  // Handle workspace changes
  const handleWorkspaceChange = async () => {
    try {
      const workspace = getCurrentWorkspace();
      setCurrentWorkspace(workspace);
        const cases = await loadCases();
        // Ensure cases is always an array
        setTestCases(Array.isArray(cases) ? cases : []);
      setSelectedTestCaseId(cases.length > 0 ? cases[0].id : '');
    } catch (error) {
      console.error('Failed to reload workspace:', error);
    }
  };
  
  // 参数存储系统 - 用于URC解析的参数（端口内作用域）
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number } }>({});
  
  // 跟踪已触发的永久URC ID，防止重复触发
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());
  
  // URC解析和变量替换系统
  const parseUrcData = (data: string, command: TestCommand): { [key: string]: { value: string; timestamp: number } } => {
    if (!command.dataParseConfig || !command.dataParseConfig.enabled) return {};
    
    const { parseType, parsePattern, parameterMap } = command.dataParseConfig;
    const extractedParams: { [key: string]: { value: string; timestamp: number } } = {};
    const timestamp = Date.now();
    
    switch (parseType) {
      case 'regex':
        try {
          const regex = new RegExp(parsePattern);
          const match = data.match(regex);
          if (match) {
            Object.entries(parameterMap).forEach(([groupKey, varName]) => {
              if (typeof varName === 'string') {
                // 支持捕获组索引和命名捕获组
                const value = isNaN(Number(groupKey)) 
                  ? match.groups?.[groupKey] 
                  : match[Number(groupKey)];
                if (value) {
                  extractedParams[varName] = { value, timestamp };
                }
              }
            });
          }
        } catch (error) {
          console.error('Regex parsing error:', error);
        }
        break;
      case 'split':
        const parts = data.split(parsePattern);
        Object.entries(parameterMap).forEach(([indexKey, varName]) => {
          if (typeof varName === 'string') {
            const index = Number(indexKey);
            if (!isNaN(index) && parts[index] !== undefined) {
              extractedParams[varName] = { value: parts[index].trim(), timestamp };
            }
          }
        });
        break;
    }
    
    return extractedParams;
  };
  
  // 变量替换函数
  const substituteVariables = (command: string): string => {
    let substituted = command;
    
    Object.entries(storedParameters).forEach(([varName, varData]) => {
      // 支持多种变量格式: {var}, {var|default}, {P1.var}, {P2.var}
      const patterns = [
        `{${varName}}`,
        `{${varName}\\|[^}]*}`, // 带默认值
        `{P1\\.${varName}}`,
        `{P2\\.${varName}}`
      ];
      
      patterns.forEach(pattern => {
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        substituted = substituted.replace(regex, varData.value);
      });
    });
    
    return substituted;
  };
  

  // 更新命令选中状态（支持嵌套）
  const updateCommandSelection = (caseId: string, commandId: string, selected: boolean) => {
    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map(cmd =>
        cmd.id === commandId ? { ...cmd, selected } : cmd
      )
    }));
    setTestCases(updatedTestCases);
  };

  // 格式化命令索引（支持子用例嵌套）
  const formatCommandIndex = (index: number, subIndex?: number): string => {
    return subIndex !== undefined ? `${index + 1}.${subIndex + 1}` : `${index + 1}`;
  };

  // 生成唯一编号
  const generateUniqueId = () => {
    const id = nextUniqueId.toString();
    setNextUniqueId(prev => prev + 1);
    return id;
  };

  // 数组移动工具函数
  const moveItem = <T,>(array: T[], fromIndex: number, toIndex: number): T[] => {
    const newArray = [...array];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray;
  };

  // 保存内联编辑
  const saveInlineEdit = (caseId: string, commandId: string) => {
    if (inlineEdit.commandId === commandId && inlineEdit.value.trim()) {
      const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
        ...testCase,
        commands: testCase.commands.map(cmd =>
          cmd.id === commandId 
            ? { ...cmd, [cmd.type === 'urc' ? 'urcPattern' : 'command']: inlineEdit.value.trim() }
            : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      // 保存更新后的用例
      const updatedCase = findTestCaseById(caseId, updatedTestCases);
      if (updatedCase) {
        saveCase(updatedCase);
      }
      
      toast({
        title: t("testCase.modifySuccess"),
        description: t("testCase.modifySuccessDesc")
      });
    }
    setInlineEdit({ commandId: null, value: '' });
  };

  // ========== 递归工具函数 ==========
  
  // 根据ID查找测试用例
  const findTestCaseById = (id: string, cases: TestCase[] = testCases): TestCase | null => {
    // Ensure cases is always an array to prevent iteration errors
    if (!Array.isArray(cases)) {
      return null;
    }
    
    for (const testCase of cases) {
      if (testCase.id === id || testCase.uniqueId === id) {
        return testCase;
      }
      const found = findTestCaseById(id, testCase.subCases);
      if (found) return found;
    }
    return null;
  };

  // 递归更新测试用例
  const updateCaseById = (cases: TestCase[], id: string, updater: (testCase: TestCase) => TestCase): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === id) {
        return updater(testCase);
      }
      if (testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: updateCaseById(testCase.subCases, id, updater)
        };
      }
      return testCase;
    });
  };

  // 递归添加子用例
  const addSubCaseById = (cases: TestCase[], parentId: string, newCase: TestCase): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === parentId) {
        return {
          ...testCase,
          subCases: [...testCase.subCases, newCase],
          isExpanded: true // 自动展开以显示新添加的子用例
        };
      }
      if (testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: addSubCaseById(testCase.subCases, parentId, newCase)
        };
      }
      return testCase;
    });
  };

  // 递归展开/折叠
  const toggleExpandById = (cases: TestCase[], id: string): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === id) {
        return { ...testCase, isExpanded: !testCase.isExpanded };
      }
      if (testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: toggleExpandById(testCase.subCases, id)
        };
      }
      return testCase;
    });
  };

  // 查找用例路径（从根到目标节点的完整路径）
  const findCasePath = (targetId: string, cases: TestCase[] = testCases, path: TestCase[] = []): TestCase[] | null => {
    for (const testCase of cases) {
      const currentPath = [...path, testCase];
      
      if (testCase.id === targetId) {
        return currentPath;
      }
      
      const found = findCasePath(targetId, testCase.subCases, currentPath);
      if (found) return found;
    }
    return null;
  };

  // 获取可见的根用例（当前选中用例的顶层祖先）
  const getVisibleRootCase = (): TestCase | null => {
    if (selectedTestCaseId) {
      const casePath = findCasePath(selectedTestCaseId);
      if (casePath && casePath.length > 0) {
        return casePath[0]; // 返回路径的第一个元素（顶层祖先）
      }
    }
    return testCases[0] || null;
  };

  // 获取当前选中的测试用例（支持嵌套查找）
  const getCurrentTestCase = () => {
    // Ensure testCases is always an array
    if (!Array.isArray(testCases)) {
      return null;
    }
    
    if (selectedTestCaseId) {
      return findTestCaseById(selectedTestCaseId);
    }
    return testCases[0] || null;
  };
  
  // ========== 导航工具函数 ==========
  
  // 查找命令在用例树中的位置
  const findCommandLocation = (commandId: string, cases: TestCase[] = testCases): { caseId: string; commandIndex: number } | null => {
    for (const testCase of cases) {
      const commandIndex = testCase.commands.findIndex(cmd => cmd.id === commandId);
      if (commandIndex !== -1) {
        return { caseId: testCase.id, commandIndex };
      }
      
      // 递归查找子用例
      const found = findCommandLocation(commandId, testCase.subCases);
      if (found) return found;
    }
    return null;
  };
  
  // 获取用例中第一个可执行项
  const getFirstExecutableInCase = (testCase: TestCase): { caseId: string; commandIndex: number } | null => {
    if (testCase.commands.length > 0) {
      return { caseId: testCase.id, commandIndex: 0 };
    }
    
    // 如果当前用例没有命令，查找第一个子用例的第一条命令
    for (const subCase of testCase.subCases) {
      const first = getFirstExecutableInCase(subCase);
      if (first) return first;
    }
    
    return null;
  };
  
  // 获取指定位置的下一步
  const getNextStepFrom = (caseId: string, commandIndex: number): { caseId: string; commandIndex: number } | null => {
    const targetCase = findTestCaseById(caseId);
    if (!targetCase) return null;
    
    // 尝试获取当前用例的下一条命令
    if (commandIndex + 1 < targetCase.commands.length) {
      return { caseId, commandIndex: commandIndex + 1 };
    }
    
    // 如果没有下一条命令，尝试进入第一个子用例
    if (targetCase.subCases.length > 0) {
      const first = getFirstExecutableInCase(targetCase.subCases[0]);
      if (first) return first;
    }
    
    return null;
  };
  
  // 构建跳转命令选项（仅限当前用例及其子用例的执行命令）
  const buildCommandOptionsFromCase = (testCase: TestCase | null, path: string[] = []): Array<{ id: string; label: string }> => {
    if (!testCase) return [];
    
    const pathName = [...path, testCase.name].join(' / ');
    const currentCaseOptions = testCase.commands
      .map((cmd, idx) => ({ cmd, idx }))
      .filter(({ cmd }) => cmd.type === 'execution')
      .map(({ cmd, idx }) => ({
        id: cmd.id,
        label: `${pathName} · ${idx + 1}. ${cmd.command}`
      }));
    
    const subCaseOptions = testCase.subCases.flatMap(subCase => 
      buildCommandOptionsFromCase(subCase, [...path, testCase.name])
    );
    
    return [...currentCaseOptions, ...subCaseOptions];
  };
  
  const currentTestCase = getCurrentTestCase();
  const visibleRootCase = getVisibleRootCase();

  // ========== 递归渲染函数 ==========
  
  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  // 渲染命令行
  const renderCommandRow = (command: TestCommand, caseId: string, commandIndex: number, level: number) => {
    const isDragging = dragInfo.draggedItem?.caseId === caseId && dragInfo.draggedItem?.commandIndex === commandIndex;
    const isDropTarget = dragInfo.dropTarget?.caseId === caseId && dragInfo.dropTarget?.commandIndex === commandIndex;
    const isExecuting = executingCommand.caseId === caseId && executingCommand.commandIndex === commandIndex;
    
    return (
      <div 
        key={command.id} 
        className={`p-3 hover:bg-muted/50 transition-colors cursor-move select-none ${
          isDragging ? 'opacity-50' : ''
        } ${
          isDropTarget && dragInfo.dropTarget?.position === 'above' ? 'border-t-2 border-primary' : ''
        } ${
          isDropTarget && dragInfo.dropTarget?.position === 'below' ? 'border-b-2 border-primary' : ''
        } ${
          isExecuting ? 'bg-primary/10 border border-primary/30 shadow-sm' : ''
        }`}
        draggable
        onDragStart={(e) => {
          setDragInfo(prev => ({
            ...prev,
            draggedItem: { caseId, commandIndex }
          }));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          
          const rect = e.currentTarget.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          const position = e.clientY < midpoint ? 'above' : 'below';
          
          setDragInfo(prev => ({
            ...prev,
            dropTarget: { caseId, commandIndex, position }
          }));
        }}
        onDragLeave={(e) => {
          // 只在离开整个元素时清除，避免子元素触发
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragInfo(prev => ({ ...prev, dropTarget: null }));
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const { draggedItem, dropTarget } = dragInfo;
          
          if (draggedItem && dropTarget && draggedItem.caseId === dropTarget.caseId) {
            const targetCase = findTestCaseById(dropTarget.caseId);
            if (targetCase) {
              let newIndex = dropTarget.commandIndex;
              if (dropTarget.position === 'below') {
                newIndex += 1;
              }
              
              // 如果拖拽的索引在目标索引之前，需要调整目标索引
              if (draggedItem.commandIndex < newIndex) {
                newIndex -= 1;
              }
              
              const reorderedCommands = moveItem(targetCase.commands, draggedItem.commandIndex, newIndex);
              
              const updatedTestCases = updateCaseById(testCases, dropTarget.caseId, (testCase) => ({
                ...testCase,
                commands: reorderedCommands
              }));
              
              setTestCases(updatedTestCases);
              
              // 保存更新后的用例
              const updatedCase = findTestCaseById(dropTarget.caseId, updatedTestCases);
              if (updatedCase) {
                saveCase(updatedCase);
              }
              
              toast({
                title: "重新排序成功",
                description: "命令顺序已更新"
              });
            }
          } else if (draggedItem && dropTarget && draggedItem.caseId !== dropTarget.caseId) {
            toast({
              title: "不支持跨用例拖拽",
              description: "只能在同一用例内重新排序命令"
            });
          }
          
          setDragInfo({ draggedItem: null, dropTarget: null });
        }}
      >
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
          {/* 复选框 */}
          <Checkbox
            checked={command.selected}
            onCheckedChange={(checked) => updateCommandSelection(caseId, command.id, checked as boolean)}
            className="flex-shrink-0"
          />
          
          {/* 命令内容 */}
          <div className="flex-1 min-w-0">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded p-1 -m-1 transition-colors"
              onDoubleClick={() => {
                if (command.type === 'urc') {
                  const currentValue = command.urcPattern || '';
                  setInlineEdit({ commandId: command.id, value: currentValue });
                } else {
                  const currentValue = command.command;
                  setInlineEdit({ commandId: command.id, value: currentValue });
                }
              }}
              title={command.type === 'urc' ? "双击编辑URC校验内容" : "双击编辑命令内容"}
            >
              {inlineEdit.commandId === command.id ? (
                <Input
                  value={inlineEdit.value}
                  onChange={(e) => setInlineEdit(prev => ({ ...prev, value: e.target.value }))}
                  onBlur={() => saveInlineEdit(caseId, command.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveInlineEdit(caseId, command.id);
                    } else if (e.key === 'Escape') {
                      setInlineEdit({ commandId: null, value: '' });
                    }
                  }}
                  className="font-mono text-sm h-6 px-1"
                  placeholder={command.type === 'urc' ? "输入URC校验内容" : "输入命令内容"}
                  autoFocus
                />
              ) : (
                <span className="font-mono text-sm truncate">
                  {command.type === 'urc' ? (command.urcPattern || '点击编辑URC校验内容') : command.command}
                </span>
              )}
            </div>
            
            {command.expectedResponse && (
              <div className="text-xs text-muted-foreground truncate mt-1">
                期望: {command.expectedResponse}
              </div>
            )}
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon(command.status)}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => runCommand(caseId, commandIndex)}
                    disabled={connectedPorts.length === 0}
                  >
                    <PlayCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>运行</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedTestCaseId(caseId);
                      setEditingCommandIndex(commandIndex);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>设置</p>
                </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
             </div>
           </div>
         </div>
       );
    };

  // 渲染测试用例节点
  const renderCaseNode = (testCase: TestCase, level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    // 渲染用例行
    elements.push(
      <div key={testCase.id} className="p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
          {/* 展开/折叠按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => {
              const updatedTestCases = toggleExpandById(testCases, testCase.id);
              setTestCases(updatedTestCases);
            }}
          >
            {testCase.subCases.length > 0 || testCase.commands.length > 0 ? (
              testCase.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </Button>

          {/* 复选框 */}
          <Checkbox
            checked={testCase.selected}
            onCheckedChange={(checked) => {
              const updatedTestCases = updateCaseById(testCases, testCase.id, (tc) => ({
                ...tc,
                selected: checked as boolean
              }));
              setTestCases(updatedTestCases);
            }}
            className="flex-shrink-0"
          />
          
          {/* 用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setSelectedTestCaseId(testCase.id)}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${
                selectedTestCaseId === testCase.id ? 'text-primary' : ''
              }`}>
                {testCase.name}
              </span>
               

             </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon(testCase.status)}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => runTestCase(testCase.id)}
                    disabled={connectedPorts.length === 0}
                  >
                    <PlayCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>运行</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEditCase(testCase)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>设置</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );

    // 渲染展开的内容（命令和子用例）
    if (testCase.isExpanded) {
      // 先渲染命令
      testCase.commands.forEach((command, index) => {
        elements.push(renderCommandRow(command, testCase.id, index, level + 1));
      });
      
      // 再渲染子用例
      testCase.subCases.forEach((subCase) => {
        elements.push(...renderCaseNode(subCase, level + 1));
      });
    }
    
    return elements;
  };

  // 渲染统一树结构（顶级用例不显示，直接显示内容）
  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    cases.forEach((testCase) => {
      // 对于顶级用例（level === 0），不渲染用例行本身，直接渲染其内容
      if (level === 0) {
        // 直接渲染命令
        testCase.commands.forEach((command, index) => {
          elements.push(renderCommandRow(command, testCase.id, index, 0));
        });
        
        // 直接渲染子用例
        testCase.subCases.forEach((subCase) => {
          elements.push(...renderCaseNode(subCase, 0));
        });
      } else {
        // 对于非顶级用例，正常渲染
        elements.push(...renderCaseNode(testCase, level));
      }
    });
    
    return elements;
  };

  // 监听串口数据接收事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
      if (event.type === 'received') {
        // 检查是否有活跃的URC监听器
        if (currentTestCase) {
          currentTestCase.commands.forEach((command, commandIndex) => {
            if (command.type === 'urc' && command.selected && command.urcPattern) {
              const matches = checkUrcMatch(event.data, command);
              if (matches) {
                // 参数提取
                const extractedParams = parseUrcData(event.data, command);
                if (Object.keys(extractedParams).length > 0) {
                  // 更新存储的参数，同名变量使用最新值
                  setStoredParameters(prev => {
                    return { ...prev, ...extractedParams };
                  });
                  
                  eventBus.emit(EVENTS.PARAMETER_EXTRACTED, { 
                    commandId: command.id, 
                    parameters: extractedParams 
                  });
                  
                  toast({
                    title: "参数解析成功",
                    description: `提取参数: ${Object.entries(extractedParams).map(([k, v]) => `${k}=${v.value}`).join(', ')}`,
                  });
                }
                
                // 处理URC状态更新和跳转逻辑
                const isUrcAlreadyTriggered = triggeredUrcIds.has(command.id);
                
                // 更新URC状态
                const updatedCommands = currentTestCase.commands.map((cmd, idx) => {
                  if (idx === commandIndex) {
                    let newCmd = { ...cmd, status: 'success' as const };
                    
                    // 处理once模式：匹配后失活
                    if (cmd.urcListenMode === 'once') {
                      newCmd.selected = false;
                    }
                    
                    return newCmd;
                  }
                  return cmd;
                });
                
                const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
                  ...testCase,
                  commands: updatedCommands
                }));
                setTestCases(updatedTestCases);
                
                // 处理跳转逻辑（只有在未触发过或once模式下才执行）
                if (!isUrcAlreadyTriggered || command.urcListenMode === 'once') {
                  // 标记permanent URC为已触发
                  if (command.urcListenMode === 'permanent') {
                    setTriggeredUrcIds(prev => new Set([...prev, command.id]));
                  }
                  
                  // 执行跳转逻辑
                  switch (command.jumpConfig?.onReceived) {
                    case 'continue':
                      const nextStep = getNextStepFrom(currentTestCase.id, commandIndex);
                      if (nextStep) {
                        setTimeout(() => runCommand(nextStep.caseId, nextStep.commandIndex), 100);
                        toast({
                          title: "URC继续执行",
                          description: `已继续到下一步执行`,
                        });
                      } else {
                        toast({
                          title: "URC执行完成",
                          description: "没有更多步骤可执行",
                        });
                      }
                      break;
                      
                    case 'jump':
                      if (command.jumpConfig?.jumpTarget?.type === 'command' && command.jumpConfig?.jumpTarget?.targetId) {
                        const targetLocation = findCommandLocation(command.jumpConfig.jumpTarget.targetId);
                        if (targetLocation) {
                          setTimeout(() => runCommand(targetLocation.caseId, targetLocation.commandIndex), 100);
                          toast({
                            title: "URC跳转执行",
                            description: `已跳转到指定命令`,
                          });
                        } else {
                          toast({
                            title: "跳转失败",
                            description: "找不到目标命令",
                            variant: "destructive"
                          });
                        }
                      }
                      break;
                      
                    default:
                      // 默认情况：仅参数提取，不跳转
                      break;
                  }
                }
              }
            }
          });
        }
      }
    });
    
    return unsubscribe;
  }, [currentTestCase, testCases, triggeredUrcIds]);
  
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

  // 初始化示例数据
  useEffect(() => {
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
    setNextUniqueId(1003);
    setSelectedTestCaseId('case1'); // 自动选择第一个测试用例
  }, []);


  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases });

  // 运行测试用例
  const runTestCase = async (caseId: string) => {
    const testCase = findTestCaseById(caseId);
    if (!testCase) return;

    // 如果正在运行，则暂停
    if (runningCasesRef.current.has(caseId)) {
      runningCasesRef.current.delete(caseId);
      const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'pending'
      }));
      setTestCases(updatedTestCases);
      statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
      return;
    }

    // 添加到运行中的用例集合
    runningCasesRef.current.add(caseId);

    // 每次运行测试用例时清空存储的变量和触发状态
    setStoredParameters({});
    setTriggeredUrcIds(new Set());
    
    // 更新状态为运行中
    const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      isRunning: true,
      status: 'running',
      currentCommand: 0
    }));
    setTestCases(updatedTestCases);
    
    statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');

    // 获取运行次数，默认为1
    const runCount = testCase.runCount || 1;
    
    try {
      for (let i = 0; i < runCount; i++) {
        // 检查是否被暂停
        if (!runningCasesRef.current.has(caseId)) {
          console.log('Test case execution stopped (paused)');
          setExecutingCommand({ caseId: null, commandIndex: null });
          return;
        }

        if (runCount > 1) {
          toast({
            title: `第 ${i + 1} 次执行`,
            description: `执行测试用例: ${testCase.name} (${i + 1}/${runCount})`,
          });
        }

        // 执行所有选中的命令，如果没有选中则执行全部命令
        const selectedCommands = testCase.commands.filter(cmd => cmd.selected);
        const commandsToRun = selectedCommands.length > 0 ? selectedCommands : testCase.commands;
        
        console.log('Run clicked', { caseId, count: commandsToRun.length });

        for (let j = 0; j < commandsToRun.length; j++) {
          // 检查是否被暂停
          if (!runningCasesRef.current.has(caseId)) {
            console.log('Test case execution stopped (paused during command loop)');
            setExecutingCommand({ caseId: null, commandIndex: null });
            return;
          }

          const command = commandsToRun[j];
          const commandIndex = testCase.commands.indexOf(command);
          
          console.log(`Executing command ${j + 1}/${commandsToRun.length}: ${command.command}`);
          await runCommand(caseId, commandIndex);
          
          // 命令间等待时间
          if (command.waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, command.waitTime));
          }
        }
      }

      // 执行完成，清除运行状态
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
      const finalTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'success'
      }));
      setTestCases(finalTestCases);

      statusMessages?.addMessage(`测试用例 "${testCase.name}" 执行完成`, 'success');
    } catch (error) {
      // 执行出错，清除运行状态
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
      const errorTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'failed'
      }));
      setTestCases(errorTestCases);

      statusMessages?.addMessage(`测试用例执行出错: ${error}`, 'error');
    }
  };

  // 运行单个命令
  const runCommand = async (caseId: string, commandIndex: number) => {
    const targetCase = findTestCaseById(caseId);
    if (!targetCase) return;
    
    const command = targetCase.commands[commandIndex];
    
    // 设置当前执行的命令高亮
    setExecutingCommand({ caseId, commandIndex });
    
    if (command.type === 'execution') {
      // 执行命令前进行变量替换
      const substitutedCommand = substituteVariables(command.command);
      
      const sendEvent: SendCommandEvent = {
        command: substitutedCommand,
        format: command.dataFormat === 'hex' ? 'hex' : 'ascii',
        lineEnding: command.lineEnding,
        targetPort: 'ALL'
      };
      
      console.log('Emitting SEND_COMMAND', sendEvent);
      eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
      
      statusMessages?.addMessage(`执行命令: ${substitutedCommand}`, 'info');
    } else if (command.type === 'urc') {
      statusMessages?.addMessage(`URC监听: ${command.urcPattern}`, 'info');
    }
    
    // 模拟执行时间后清除高亮
    setTimeout(() => {
      setExecutingCommand({ caseId: null, commandIndex: null });
    }, command.waitTime || 1000);
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

  // 深拷贝用例作为子用例
  const cloneCaseForSubcase = (src: TestCase): TestCase => {
    const cloneCmd = (cmd: TestCommand): TestCommand => ({
      ...cmd,
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: 'pending',
      selected: false
    });
    
    const cloneCase = (tc: TestCase): TestCase => ({
      ...tc,
      id: `case_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      uniqueId: '', // 子用例不需要唯一编号
      commands: tc.commands.map(cloneCmd),
      subCases: tc.subCases.map(cloneCase),
      isExpanded: false,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending'
    });
    
    const cloned = cloneCase(src);
    cloned.uniqueId = generateUniqueId();
    return cloned;
  };

  // 以子用例方式载入到当前用例
  const loadTestCaseAsSubCaseToCurrentCase = (sourceCase: TestCase) => {
    if (!currentTestCase) {
      toast({
        title: "无法载入",
        description: "请先选择当前用例",
        variant: "destructive"
      });
      return;
    }
    
    const newSubCase = cloneCaseForSubcase(sourceCase);
    const updated = addSubCaseById(testCases, currentTestCase.id, newSubCase);
    setTestCases(updated);
    
    toast({
      title: "载入成功",
      description: `已以子用例方式载入：${sourceCase.name}`,
    });
  };

  // 从文件导入
  const importFromFile = (variant: 'merge' | 'subcase') => {
    if (!currentTestCase) {
      toast({
        title: "无法载入",
        description: "请先选择当前用例",
        variant: "destructive"
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          let testCase: TestCase;

          // 检查是否为 PersistedTestCase 格式
          if (!jsonData.isRunning && !jsonData.currentCommand) {
            // 使用 fromPersistedCase 转换
            testCase = fromPersistedCase(jsonData);
          } else {
            // 假设是完整的 TestCase
            testCase = jsonData as TestCase;
          }

          if (variant === 'merge') {
            loadTestCaseToCurrentCase(testCase);
          } else {
            loadTestCaseAsSubCaseToCurrentCase(testCase);
          }
        } catch (error) {
          toast({
            title: "导入失败",
            description: "文件格式错误或不支持",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
      <ContextMenu>
        <ContextMenuTrigger asChild>
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
                <div className="border border-border rounded-lg bg-card">
                  <div className="divide-y divide-border">
                    {visibleRootCase ? renderUnifiedTree([visibleRootCase], 0) : []}
                  </div>
                </div>
              </div>
            )}
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
              <ContextMenuSub>
                <ContextMenuSubTrigger>载入到当前用例</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-72 max-h-64 overflow-y-auto">
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>自当前仓库</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                      {testCases.filter(tc => tc.id !== currentTestCase?.id).length > 0 ? (
                        testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                          <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseToCurrentCase(testCase)} className="flex items-center justify-between">
                            <span className="truncate mr-2">{testCase.name}</span>
                            <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                          </ContextMenuItem>
                        ))
                      ) : (
                        <ContextMenuItem disabled>暂无其他用例</ContextMenuItem>
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuItem onClick={() => importFromFile('merge')}>
                    自现有文件
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              
              <ContextMenuSub>
                <ContextMenuSubTrigger>以子用例方式载入到当前用例</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-72 max-h-64 overflow-y-auto">
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>自当前仓库</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                      {testCases.filter(tc => tc.id !== currentTestCase?.id).length > 0 ? (
                        testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                          <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseAsSubCaseToCurrentCase(testCase)} className="flex items-center justify-between">
                            <span className="truncate mr-2">{testCase.name}</span>
                            <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                          </ContextMenuItem>
                        ))
                      ) : (
                        <ContextMenuItem disabled>暂无其他用例</ContextMenuItem>
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuItem onClick={() => importFromFile('subcase')}>
                    自现有文件
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuSubContent>
          </ContextMenuSub>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={deleteSelectedCommands} 
            className="flex items-center gap-2 text-destructive"
            disabled={!currentTestCase}
          >
            <Trash2 className="w-4 h-4" />
            删除勾选的命令
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={exportTestCase} 
            className="flex items-center gap-2"
            disabled={!currentTestCase}
          >
            <Download className="w-4 h-4" />
            导出用例到...
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* 4. 测试用例切换区 */}
      <TestCaseSwitcher 
        testCases={testCases}
        currentTestCase={currentTestCase}
        onSelectTestCase={handleSelectTestCase}
        setTestCases={setTestCases}
        onDeleteTestCase={deleteTestCase}
        onSync={handleSync}
        onWorkspaceChange={handleWorkspaceChange}
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
              
              <div className="grid grid-cols-2 gap-4">
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
                  jumpOptions={{
                    commandOptions: buildCommandOptionsFromCase(currentTestCase)
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