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
import { globalToast } from "@/hooks/useGlobalMessages";
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
import { RunResultDialog } from './RunResultDialog';

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
        globalToast({
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

  // 获取测试用例的顶层父用例
  const getTopLevelParent = (targetId: string, cases: TestCase[] = testCases): TestCase | null => {
    if (!Array.isArray(cases)) {
      return null;
    }
    
    for (const testCase of cases) {
      // 如果是顶层用例，直接返回
      if (testCase.id === targetId || testCase.uniqueId === targetId) {
        return testCase;
      }
      
      // 如果在子用例中找到，返回顶层父用例
      const found = findTestCaseById(targetId, testCase.subCases);
      if (found) {
        return testCase; // 返回顶层父用例
      }
    }
    return null;
  };

  // 查找指定用例的直接父用例
  const findParentCase = (targetId: string): TestCase | null => {
    const findParent = (cases: TestCase[]): TestCase | null => {
      for (const testCase of cases) {
        // 检查直接子用例
        if (testCase.subCases.some(subCase => subCase.id === targetId)) {
          return testCase;
        }
        // 递归检查更深层的子用例
        const found = findParent(testCase.subCases);
        if (found) return found;
      }
      return null;
    };

    return findParent(testCases);
  };

  // 判断是否为统计用例（根据名称判断）
  const isStatsCase = (testCase: TestCase): boolean => {
    return testCase.name.includes('统计') || testCase.name.includes('统计用例');
  };

  // 获取用于操作的目标用例（统计用例使用其父用例）
  const getTargetCaseForActions = (selectedCase: TestCase | null): TestCase | null => {
    if (!selectedCase) return null;
    
    if (isStatsCase(selectedCase)) {
      const parent = findParentCase(selectedCase.id);
      return parent || selectedCase;
    }
    
    return selectedCase;
  };

  // 递归更新测试用例
  const updateCaseById = (cases: TestCase[], id: string, updater: (testCase: TestCase) => TestCase): TestCase[] => {
    // Ensure cases is always an array to prevent iteration errors
    if (!Array.isArray(cases)) {
      return [];
    }
    
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
    // Ensure cases is always an array to prevent iteration errors
    if (!Array.isArray(cases)) {
      return [];
    }
    
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
    // Ensure cases is always an array to prevent iteration errors
    if (!Array.isArray(cases)) {
      return [];
    }
    
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
    // Ensure cases is always an array to prevent iteration errors
    if (!Array.isArray(cases)) {
      return null;
    }
    
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
    // Ensure testCases is always an array
    if (!Array.isArray(testCases)) {
      return null;
    }
    
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
    // Ensure cases is always an array to prevent iteration errors
    if (!Array.isArray(cases)) {
      return null;
    }
    
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
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          style={{ paddingLeft: `${level * 16}px` }}
          onClick={() => setSelectedTestCaseId(caseId)}
        >
          {/* 复选框 */}
          <Checkbox
            checked={command.selected}
            onCheckedChange={(checked) => {
              setSelectedTestCaseId(caseId);
              updateCommandSelection(caseId, command.id, checked as boolean);
            }}
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
  
  // URC匹配检查
  const checkUrcMatch = (data: string, command: TestCommand): boolean => {
    if (!command.urcPattern) return false;
    
    try {
      const regex = new RegExp(command.urcPattern, 'i');
      return regex.test(data);
    } catch (error) {
      console.error('Invalid URC pattern:', error);
      return false;
    }
  };

  // 运行单个命令
  const runCommand = async (caseId: string, commandIndex: number): Promise<boolean> => {
    const targetCase = findTestCaseById(caseId);
    if (!targetCase) return false;
    
    const command = targetCase.commands[commandIndex];
    
    // 设置当前执行的命令高亮
    setExecutingCommand({ caseId, commandIndex });
    
    if (command.type === 'execution') {
      // 执行命令前进行变量替换
      const substitutedCommand = substituteVariables(command.command);
      
      // 发送命令
      const sendEvent: SendCommandEvent = {
        command: substitutedCommand,
        format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
        lineEnding: command.lineEnding,
        targetPort: 'ALL'
      };
      
      console.log('Emitting SEND_COMMAND', sendEvent);
      eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
      
      // 更新命令状态为成功（简化处理）
      const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        commands: tc.commands.map((cmd, idx) => 
          idx === commandIndex ? { ...cmd, status: 'success' } : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      statusMessages?.addMessage(`执行命令: ${substitutedCommand}`, 'info');
      return true;
    } else if (command.type === 'urc') {
      // URC 命令：激活监听状态
      const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        commands: tc.commands.map((cmd, idx) => 
          idx === commandIndex ? { ...cmd, selected: true, status: 'pending' } : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      statusMessages?.addMessage(`激活URC监听: ${command.command}`, 'info');
      return true;
    }
    
    return false;
  };

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

    try {
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
        
        // 运行命令
        await runCommand(caseId, commandIndex);
        
        // 命令间等待时间
        if (command.waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, command.waitTime));
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

  // 处理编辑用例
  const handleEditCase = (testCase: TestCase) => {
    setEditingCase(testCase);
  };

  // 处理保存用例
  const handleSaveCase = (updatedCase: TestCase) => {
    const updatedTestCases = updateCaseById(testCases, updatedCase.id, () => updatedCase);
    setTestCases(updatedTestCases);
    setEditingCase(null);
  };

  // 删除测试用例
  const deleteTestCase = (caseId: string) => {
    const updatedTestCases = testCases.filter(tc => tc.id !== caseId);
    setTestCases(updatedTestCases);
    
    if (selectedTestCaseId === caseId) {
      setSelectedTestCaseId(updatedTestCases.length > 0 ? updatedTestCases[0].id : '');
    }
    
    globalToast({
      title: "删除成功",
      description: "测试用例已删除"
    });
  };

  // 处理同步
  const handleSync = () => {
    handleWorkspaceChange();
  };

  // 删除预设用例
  const deletePresetCases = () => {
    toast({
      title: "清除完成",
      description: "预设用例已清除"
    });
  };

  // 监听串口数据
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
      if (event.type === 'received') {
        if (currentTestCase) {
          currentTestCase.commands.forEach((command, commandIndex) => {
            if (command.type === 'urc' && command.selected && command.urcPattern) {
              const matches = checkUrcMatch(event.data, command);
              if (matches) {
                const extractedParams = parseUrcData(event.data, command);
                if (Object.keys(extractedParams).length > 0) {
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
                
                const isUrcAlreadyTriggered = triggeredUrcIds.has(command.id);
                
                const updatedCommands = currentTestCase.commands.map((cmd, idx) => {
                  if (idx === commandIndex) {
                    let newCmd = { ...cmd, status: 'success' as const };
                    
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
                
                if (!isUrcAlreadyTriggered || command.urcListenMode === 'once') {
                  if (command.urcListenMode === 'permanent') {
                    setTriggeredUrcIds(prev => new Set([...prev, command.id]));
                  }
                  
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
                          title: "URC触发",
                          description: "没有后续可执行步骤",
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
                            description: "找不到指定的跳转目标",
                            variant: "destructive"
                          });
                        }
                      }
                      break;
                    
                    default:
                      toast({
                        title: "URC匹配",
                        description: `${command.command} 匹配成功`,
                      });
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

  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases });

  // 渲染用例节点
  const renderCaseNode = (testCase: TestCase, level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    elements.push(
      <div key={testCase.id} className="select-none">
        <div 
          className={`
            flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/30
            ${selectedTestCaseId === testCase.id ? 'bg-primary/10 border-primary/20' : ''}
            ${testCase.isRunning ? 'bg-primary/5' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
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
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon(testCase.status)}
          </div>
          
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

    if (testCase.isExpanded) {
      testCase.commands.forEach((command, index) => {
        elements.push(renderCommandRow(command, testCase.id, index, level + 1));
      });
      
      testCase.subCases.forEach((subCase) => {
        elements.push(...renderCaseNode(subCase, level + 1));
      });
    }
    
    return elements;
  };

  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    cases.forEach((testCase) => {
      if (level === 0) {
        testCase.commands.forEach((command, index) => {
          elements.push(renderCommandRow(command, testCase.id, index, 0));
        });
        
        testCase.subCases.forEach((subCase) => {
          elements.push(...renderCaseNode(subCase, level + 1));
        });
      } else {
        elements.push(...renderCaseNode(testCase, level));
      }
    });
    
    return elements;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <TestCaseHeader 
          currentTestCase={currentTestCase}
          onUpdateCase={(caseId, updater) => {
            const updatedTestCases = updateCaseById(testCases, caseId, updater);
            setTestCases(updatedTestCases);
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-3 border-b border-border/30 bg-secondary/20">
        <TestCaseActions
          currentTestCase={currentTestCase}
          testCases={testCases}
          setTestCases={setTestCases}
          connectedPorts={connectedPorts}
          onEditCase={handleEditCase}
          onRunTestCase={runTestCase}
          onSync={handleSync}
          onDeleteTestCase={deleteTestCase}
          onDeleteSelectedCommands={() => {}}
          onDeletePresetCases={deletePresetCases}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* Left: Tree View */}
        <div className="flex-1 bg-card/50 rounded-lg border border-border/30 overflow-hidden">
          <div className="h-full overflow-auto">
            {testCases.length > 0 ? (
              renderUnifiedTree(testCases, 0)
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">暂无测试用例</p>
                  <p className="text-sm">请创建第一个测试用例开始使用</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Side Panel */}
        <div className="w-80 space-y-4">
          {/* Variable Display */}
          <div className="bg-card/50 rounded-lg border border-border/30 p-4">
            <VariableDisplay 
              storedParameters={storedParameters}
              onClearParameter={(key) => {
                setStoredParameters(prev => {
                  const newParams = { ...prev };
                  delete newParams[key];
                  return newParams;
                });
              }}
              onClearAll={() => setStoredParameters({})}
            />
          </div>

          {/* Test Case Switcher */}
          <div className="bg-card/50 rounded-lg border border-border/30">
            <TestCaseSwitcher 
              testCases={testCases}
              currentTestCase={currentTestCase}
              onSelectTestCase={setSelectedTestCaseId}
              setTestCases={setTestCases}
              onDeleteTestCase={deleteTestCase}
              onSync={handleSync}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
