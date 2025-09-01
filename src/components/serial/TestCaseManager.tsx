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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [nextUniqueId, setNextUniqueId] = useState(1001);
  
  // 参数存储系统 - 用于URC解析的参数（端口内作用域）
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number } }>({});
  
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

  // ========== 递归工具函数 ==========
  
  // 根据ID查找测试用例
  const findTestCaseById = (id: string, cases: TestCase[] = testCases): TestCase | null => {
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
    if (selectedTestCaseId) {
      return findTestCaseById(selectedTestCaseId);
    }
    return testCases[0] || null;
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
  const renderCommandRow = (command: TestCommand, caseId: string, commandIndex: number, level: number) => (
    <div key={command.id} className="p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
        {/* 复选框 */}
        <Checkbox
          checked={command.selected}
          onCheckedChange={(checked) => updateCommandSelection(caseId, command.id, checked as boolean)}
          className="flex-shrink-0"
        />
        
        {/* 命令内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm truncate">
              {command.command}
            </span>
            
            {/* 命令类型标识 */}
            <Badge 
              variant="outline" 
              className="text-xs flex-shrink-0"
            >
              {command.type === 'execution' ? 'AT' : 'URC'}
            </Badge>
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
              
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {testCase.uniqueId}
              </Badge>

              {testCase.commands.length > 0 && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {testCase.commands.length} 条命令
                </Badge>
              )}

              {testCase.subCases.length > 0 && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {testCase.subCases.length} 个子用例
                </Badge>
              )}
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

  // 渲染统一树结构
  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    cases.forEach((testCase) => {
      elements.push(...renderCaseNode(testCase, level));
    });
    
    return elements;
  };

  // 监听串口数据接收事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
      if (event.type === 'received') {
        // 检查是否有活跃的URC监听器
        if (currentTestCase) {
          currentTestCase.commands.forEach((command) => {
            if (command.type === 'urc' && command.selected && command.urcPattern) {
              const matches = checkUrcMatch(event.data, command);
              if (matches) {
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
              }
            }
          });
        }
      }
    });
    
    return unsubscribe;
  }, [currentTestCase]);
  
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
          <TestCaseHeader currentTestCase={currentTestCase} />
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