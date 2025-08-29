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
import { SubcaseEditor } from './SubcaseEditor';

interface TestCaseManagerProps {
  connectedPorts: Array<{
    port: any;
    params: any;
  }>;
  receivedData: string[];
}

export interface TestCommand {
  id: string;
  type: 'execution' | 'urc' | 'subcase';
  command: string;
  expectedResponse?: string;
  validationMethod: 'none' | 'contains' | 'equals' | 'regex';
  validationPattern?: string;
  waitTime: number;
  stopOnFailure: boolean;
  requiresUserAction?: boolean;
  userPrompt?: string;
  lineEnding: 'none' | 'lf' | 'cr' | 'crlf';
  selected: boolean;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  
  // 子用例特有字段
  referencedCaseId?: string; // 引用的测试用例ID
  isExpanded?: boolean; // 是否展开显示子步骤
  subCommands?: TestCommand[]; // 可编辑的子命令列表（子用例展开后的命令副本）
  
  // URC特有字段
  urcPattern?: string; // URC匹配模式
  dataParseConfig?: {
    parseType: 'contains' | 'exact' | 'regex' | 'split' | 'json';
    parsePattern: string;
    parameterMap: { [key: string]: string }; // 参数映射 
  };
  jumpConfig?: {
    onReceived: 'continue' | 'jump';
    jumpTarget?: {
      type: 'command' | 'case';
      targetId: string;
      targetIndex?: number;
    };
  };
}

interface TestCase {
  id: string;
  uniqueId: string; // 唯一编号
  name: string;
  description: string;
  commands: TestCommand[];
  subCases: TestCase[];
  isExpanded: boolean;
  isRunning: boolean;
  currentCommand: number;
  selected: boolean;
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial';
}

interface ExecutionResult {
  commandId: string;
  success: boolean;
  responseTime: number;
  actualResponse?: string;
  error?: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string;
  targetType: 'case' | 'command';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [editingSubcaseIndex, setEditingSubcaseIndex] = useState<number | null>(null);
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
  
  // 测试用例选择窗口状态
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  
  // 参数存储系统 - 用于URC解析的参数
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: string }>({});
  
  // 子用例展开状态管理
  const [expandedSubcases, setExpandedSubcases] = useState<Set<string>>(new Set());

  // 生成唯一编号
  const generateUniqueId = () => {
    const id = nextUniqueId.toString();
    setNextUniqueId(prev => prev + 1);
    return id;
  };

  // 切换子用例展开状态
  const toggleSubcaseExpanded = (subcaseId: string) => {
    setExpandedSubcases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subcaseId)) {
        newSet.delete(subcaseId);
      } else {
        newSet.add(subcaseId);
      }
      return newSet;
    });
  };

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

  // 递归渲染子用例步骤
  const renderSubcaseSteps = (subcase: TestCase, depth: number = 1): React.ReactNode => {
    return subcase.commands.map((command, cmdIndex) => (
      <div key={`${subcase.id}-cmd-${cmdIndex}`} 
           className={`border-l-2 border-muted-foreground/20 pl-4 ml-${depth * 4} space-y-2`}
           style={{ marginLeft: `${depth * 16}px` }}>
        <div className="flex items-center gap-2 py-2">
          <Badge variant="outline" className="text-xs">
            {depth > 1 ? '•' : '└'} 步骤 {cmdIndex + 1}
          </Badge>
          <Badge variant={command.type === 'execution' ? 'default' : 'destructive'} className="text-xs">
            {command.type === 'execution' ? '命令' : 'URC'}
          </Badge>
          <div className="text-sm text-muted-foreground font-mono">
            {command.type === 'execution' && `执行: ${command.command}`}
            {command.type === 'urc' && `监听: ${command.urcPattern || command.command}`}
          </div>
        </div>
      </div>
    ));
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
        subCases: [
          {
            id: 'subcase1',
            uniqueId: '1003',
            name: '信号强度检测',
            description: '检测信号强度',
            isExpanded: false,
            isRunning: false,
            currentCommand: -1,
            selected: false,
            status: 'pending',
            subCases: [],
            commands: [
              {
                id: 'subcmd1',
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
        ],
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
          }
        ]
      }
    ];
    setTestCases(sampleTestCases);
    setNextUniqueId(1004);
  }, []);

  // 隐藏右键菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible]);

  // 获取命令建议
  const getCommandSuggestions = (input: string) => {
    if (!input) return [];
    return atCommands.filter(cmd => 
      cmd.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5);
  };

  // 获取测试用例建议
  const getTestCaseSuggestions = (input: string): TestCase[] => {
    if (!input) return [];
    
    const searchInCases = (cases: TestCase[]): TestCase[] => {
      const results: TestCase[] = [];
      cases.forEach(testCase => {
        if (testCase.uniqueId.includes(input) || 
            testCase.name.toLowerCase().includes(input.toLowerCase())) {
          results.push(testCase);
        }
        results.push(...searchInCases(testCase.subCases));
      });
      return results;
    };
    
    return searchInCases(testCases).slice(0, 5);
  };

  // 递归查找测试用例
  const findTestCase = (cases: TestCase[], id: string): TestCase | null => {
    for (const testCase of cases) {
      if (testCase.id === id) return testCase;
      const found = findTestCase(testCase.subCases, id);
      if (found) return found;
    }
    return null;
  };

  // 更新测试用例状态
  const updateTestCaseStatus = (cases: TestCase[], caseId: string, updates: Partial<TestCase>): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === caseId) {
        return { ...testCase, ...updates };
      }
      if (testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: updateTestCaseStatus(testCase.subCases, caseId, updates)
        };
      }
      return testCase;
    });
  };

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'case' | 'command') => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId: id,
      targetType: type
    });
  };

  // 切换选择状态
  const toggleSelection = (id: string, type: 'case' | 'command') => {
    if (type === 'case') {
      const updateSelection = (cases: TestCase[]): TestCase[] => {
        return cases.map(testCase => {
          if (testCase.id === id) {
            const newSelected = !testCase.selected;
            return {
              ...testCase,
              selected: newSelected,
              commands: testCase.commands.map(cmd => ({ ...cmd, selected: newSelected })),
              subCases: updateCaseSelection(testCase.subCases, newSelected)
            };
          }
          return {
            ...testCase,
            subCases: updateSelection(testCase.subCases)
          };
        });
      };
      
      const updateCaseSelection = (cases: TestCase[], selected: boolean): TestCase[] => {
        return cases.map(testCase => ({
          ...testCase,
          selected,
          commands: testCase.commands.map(cmd => ({ ...cmd, selected })),
          subCases: updateCaseSelection(testCase.subCases, selected)
        }));
      };
      
      setTestCases(updateSelection);
    } else {
      // 更新命令选择状态
      const updateCommandSelection = (cases: TestCase[]): TestCase[] => {
        return cases.map(testCase => ({
          ...testCase,
          commands: testCase.commands.map(cmd => 
            cmd.id === id ? { ...cmd, selected: !cmd.selected } : cmd
          ),
          subCases: updateCommandSelection(testCase.subCases)
        }));
      };
      
      setTestCases(updateCommandSelection);
    }
    
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // 手动修改状态
  const changeStatus = (id: string, type: 'case' | 'command', status: string) => {
    if (type === 'case') {
      setTestCases(prev => updateTestCaseStatus(prev, id, { status: status as any }));
    } else {
      const updateCommandStatus = (cases: TestCase[]): TestCase[] => {
        return cases.map(testCase => ({
          ...testCase,
          commands: testCase.commands.map(cmd => 
            cmd.id === id ? { ...cmd, status: status as any } : cmd
          ),
          subCases: updateCommandStatus(testCase.subCases)
        }));
      };
      setTestCases(updateCommandStatus);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // 添加测试用例
  const addTestCase = (parentId?: string) => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      uniqueId: generateUniqueId(),
      name: '新测试用例',
      description: '',
      commands: [],
      subCases: [],
      isExpanded: false,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending'
    };

    if (parentId) {
      // 添加为子用例
      const addSubCase = (cases: TestCase[]): TestCase[] => {
        return cases.map(testCase => {
          if (testCase.id === parentId) {
            return {
              ...testCase,
              subCases: [...testCase.subCases, newTestCase],
              isExpanded: true
            };
          }
          return {
            ...testCase,
            subCases: addSubCase(testCase.subCases)
          };
        });
      };
      setTestCases(addSubCase);
    } else {
      setTestCases(prev => [...prev, newTestCase]);
    }
    
    setSelectedCase(newTestCase);
    setEditingCase(newTestCase);
  };

  // 删除测试用例
  const deleteTestCase = (caseId: string) => {
    const removeCase = (cases: TestCase[]): TestCase[] => {
      return cases.filter(tc => tc.id !== caseId).map(tc => ({
        ...tc,
        subCases: removeCase(tc.subCases)
      }));
    };
    
    setTestCases(removeCase);
    if (selectedCase?.id === caseId) {
      setSelectedCase(null);
      setEditingCase(null);
    }
    toast({
      title: "测试用例已删除",
      description: "测试用例已被删除",
    });
  };

  // 切换展开状态
  const toggleExpansion = (caseId: string) => {
    setTestCases(prev => updateTestCaseStatus(prev, caseId, { 
      isExpanded: !(findTestCase(prev, caseId)?.isExpanded) 
    }));
  };

  // 运行选中的测试用例/命令
  const runSelected = () => {
    // 实现运行逻辑
    toast({
      title: "开始执行",
      description: "正在执行选中的测试用例和命令",
    });
  };

  // 运行单个测试用例
  const runTestCase = (caseId: string) => {
    // 先选中该测试用例的所有命令
    const updatedTestCases = testCases.map(tc => {
      if (tc.id === caseId) {
        return {
          ...tc,
          commands: tc.commands.map(cmd => ({ ...cmd, selected: true }))
        };
      }
      return tc;
    });
    setTestCases(updatedTestCases);
    
    // 然后执行
    toast({
      title: "开始执行",
      description: `正在执行测试用例: ${testCases.find(tc => tc.id === caseId)?.name}`,
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const hasSelected = testCases.some(tc => tc.selected);
    const updateAllSelection = (cases: TestCase[], selected: boolean): TestCase[] => {
      return cases.map(testCase => ({
        ...testCase,
        selected,
        commands: testCase.commands.map(cmd => ({ ...cmd, selected })),
        subCases: updateAllSelection(testCase.subCases, selected)
      }));
    };
    
    setTestCases(prev => updateAllSelection(prev, !hasSelected));
  };

  // 过滤测试用例
  const filterTestCases = (cases: TestCase[], query: string): TestCase[] => {
    if (!query) return cases;
    
    return cases.filter(testCase => {
      const matchesName = testCase.name.toLowerCase().includes(query.toLowerCase());
      const matchesId = testCase.uniqueId.includes(query);
      const hasMatchingSubCase = filterTestCases(testCase.subCases, query).length > 0;
      
      return matchesName || matchesId || hasMatchingSubCase;
    }).map(testCase => ({
      ...testCase,
      subCases: filterTestCases(testCase.subCases, query)
    }));
  };

  // 渲染测试用例树
  const renderTestCaseTree = (cases: TestCase[], level = 0) => {
    return cases.map(testCase => (
      <div key={testCase.id} className={`ml-${level * 4}`}>
        <div 
          className={`
            flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 text-sm
            ${selectedCase?.id === testCase.id ? 'bg-secondary/50 border-primary/30' : 'border-border/50'}
            ${testCase.isRunning ? 'bg-blue-50 border-blue-200' : ''}
            ${testCase.status === 'success' ? 'bg-green-50 border-green-200' : ''}
            ${testCase.status === 'failed' ? 'bg-red-50 border-red-200' : ''}
            ${!testCase.selected ? 'opacity-60' : ''}
          `}
          onClick={() => setSelectedCase(testCase)}
          onContextMenu={(e) => handleContextMenu(e, testCase.id, 'case')}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleExpansion(testCase.id);
            }}
            className="p-0.5"
          >
            {testCase.isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>

          <div 
            onClick={(e) => {
              e.stopPropagation();
              toggleSelection(testCase.id, 'case');
            }}
            className="p-0.5"
          >
            {testCase.selected ? (
              <CheckSquare className="w-3 h-3 text-primary" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs px-1">
                #{testCase.uniqueId}
              </Badge>
              <span className="font-medium text-xs truncate">{testCase.name}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {testCase.commands.length} 命令, {testCase.subCases.length} 子用例
              {testCase.isRunning && testCase.currentCommand !== -1 && (
                <span className="text-primary ml-2">
                  {testCase.currentCommand + 1}/{testCase.commands.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // runTestCase(testCase);
              }}
              disabled={testCase.isRunning || connectedPorts.length === 0}
              className="h-6 w-6 p-0"
            >
              <Play className="w-3 h-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditingCase(testCase);
              }}
              className="h-6 w-6 p-0"
            >
              <Edit className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                deleteTestCase(testCase.id);
              }}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {testCase.isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border/50 pl-3">
            {/* 渲染子用例 */}
            {renderTestCaseTree(testCase.subCases, level + 1)}
            
            {/* 渲染命令 */}
            {testCase.commands.map((command, index) => (
              <React.Fragment key={command.id}>
                <div 
                  className={`
                    flex items-center gap-2 p-1.5 rounded text-xs border
                    ${index === testCase.currentCommand ? 'bg-blue-50 border-blue-200' : 'bg-secondary/30 border-border/30'}
                    ${command.status === 'success' ? 'bg-green-50 border-green-200' : ''}
                    ${command.status === 'failed' ? 'bg-red-50 border-red-200' : ''}
                    ${command.status === 'running' ? 'bg-yellow-50 border-yellow-200' : ''}
                    ${!command.selected ? 'opacity-60' : ''}
                    hover:bg-muted/50 cursor-pointer
                  `}
                  onContextMenu={(e) => handleContextMenu(e, command.id, 'command')}
                >
                  <div 
                    onClick={() => toggleSelection(command.id, 'command')}
                    className="p-0.5"
                  >
                    {command.selected ? (
                      <CheckSquare className="w-3 h-3 text-primary" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                  </div>

                  {/* 步骤编号 */}
                  <Badge variant="outline" className="text-xs px-1">
                    步骤 {index + 1}
                  </Badge>

                  {/* 如果是子用例类型 */}
                  {command.type === 'subcase' && (
                    <button 
                      onClick={() => {
                        const updateCommandExpansion = (cases: TestCase[]): TestCase[] => {
                          return cases.map(testCase => ({
                            ...testCase,
                            commands: testCase.commands.map(cmd => 
                              cmd.id === command.id ? { ...cmd, isExpanded: !cmd.isExpanded } : cmd
                            ),
                            subCases: updateCommandExpansion(testCase.subCases)
                          }));
                        };
                        
                        setTestCases(updateCommandExpansion);
                      }}
                      className="p-0.5"
                    >
                      {command.isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}

                  <Badge variant={
                    command.type === 'execution' ? 'default' : 
                    command.type === 'urc' ? 'destructive' : 'secondary'
                  } className="text-xs px-1">
                    {command.type === 'execution' ? '命令' : 
                     command.type === 'urc' ? 'URC' : '子用例'}
                  </Badge>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate">
                      {command.type === 'subcase' ? (
                        <span>执行：{command.command}</span>
                      ) : (
                        command.command
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {command.requiresUserAction && (
                      <AlertCircle className="w-3 h-3 text-orange-500" />
                    )}
                    {command.status === 'success' && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    {command.status === 'failed' && (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // 单独运行命令
                      }}
                      className="h-4 w-4 p-0"
                    >
                      <PlayCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 子用例展开显示可编辑子步骤 */}
                {command.type === 'subcase' && command.isExpanded && command.subCommands && (
                  <div className="ml-8 mt-1 space-y-1 border-l border-border/30 pl-3">
                    {command.subCommands.map((subCommand, subIndex) => (
                      <div key={`${command.id}-sub-${subIndex}`}
                           className="flex items-center gap-2 p-1 rounded text-xs bg-muted/20 border-border/20 border">
                        <Badge variant="outline" className="text-xs px-1">
                          {index + 1}.{subIndex + 1}
                        </Badge>
                        <Badge variant={subCommand.type === 'execution' ? 'default' : 'destructive'} 
                               className="text-xs px-1">
                          {subCommand.type === 'execution' ? '命令' : 'URC'}
                        </Badge>
                        <div className="flex-1 min-w-0 font-mono text-xs truncate">
                          {subCommand.type === 'execution' && `执行: ${subCommand.command}`}
                          {subCommand.type === 'urc' && `监听: ${subCommand.urcPattern || subCommand.command}`}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {subCommand.status === 'success' && (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          )}
                          {subCommand.status === 'failed' && (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    ));
  };

  const filteredTestCases = filterTestCases(testCases, searchQuery);
  
  // 获取当前选中的测试用例
  const getCurrentTestCase = () => {
    if (selectedTestCaseId) {
      return testCases.find(tc => tc.id === selectedTestCaseId) || filteredTestCases[0];
    }
    return filteredTestCases[0];
  };
  
  const currentTestCase = getCurrentTestCase();

  // 自动选中第一个测试用例
  React.useEffect(() => {
    if (filteredTestCases.length > 0 && !selectedTestCaseId) {
      setSelectedTestCaseId(filteredTestCases[0].id);
    }
  }, [filteredTestCases, selectedTestCaseId]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30">
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
         {/* 当前测试用例显示 */}
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3 flex-1">
             <TestTube2 className="w-5 h-5 text-primary" />
             <div className="flex-1">
               {currentTestCase ? (
                 <div className="space-y-2">
                   <div className="flex items-center gap-2">
                     <Badge variant="outline" className="text-xs">#{currentTestCase.uniqueId}</Badge>
                     <span className="font-semibold text-lg">{currentTestCase.name}</span>
                   </div>
                   
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <span>{currentTestCase.commands.length} 个步骤</span>
                     {currentTestCase.description && (
                       <span>• {currentTestCase.description}</span>
                     )}
                   </div>
                 </div>
               ) : (
                 <h3 className="text-lg font-semibold text-muted-foreground">无测试用例</h3>
               )}
             </div>
           </div>
         </div>

         {/* 当前测试用例操作 */}
         <div className="flex items-center justify-between gap-3">
           {/* 主要操作 */}
           <div className="flex items-center gap-1">
             {currentTestCase && (
               <>
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button 
                         onClick={() => setEditingCase(currentTestCase)} 
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
                 
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button 
                         onClick={() => runTestCase(currentTestCase.id)} 
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
               </>
             )}
           </div>
          
          {/* 选择操作 */}
          <div className="flex items-center gap-1">
            {currentTestCase && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => {
                        const hasSelectedCommands = currentTestCase.commands.some(cmd => cmd.selected);
                        const newSelectedState = !hasSelectedCommands;
                        
                        const updatedCommands = currentTestCase.commands.map(cmd => ({
                          ...cmd,
                          selected: newSelectedState
                        }));
                        
                        const updatedCase = { ...currentTestCase, commands: updatedCommands };
                        const updatedTestCases = testCases.map(tc => 
                          tc.id === currentTestCase.id ? updatedCase : tc
                        );
                        setTestCases(updatedTestCases);
                      }} 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                    >
                      {currentTestCase.commands.some(cmd => cmd.selected) ? 
                        <Square className="w-4 h-4" /> : 
                        <CheckSquare className="w-4 h-4" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{currentTestCase.commands.some(cmd => cmd.selected) ? '取消全选' : '全选步骤'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
           {/* 文件操作和其他 */}
           <div className="flex items-center gap-1">
             <TooltipProvider>
               {currentTestCase && (
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button 
                       onClick={() => deleteTestCase(currentTestCase.id)} 
                       variant="outline" 
                       size="sm" 
                       className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>
                     <p>删除测试用例</p>
                   </TooltipContent>
                 </Tooltip>
               )}
             </TooltipProvider>
           </div>
        </div>
      </div>

      {/* 测试用例步骤展开 */}
      <div className="flex-1 overflow-y-auto p-3">
        {!currentTestCase ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <TestTube2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">
              {searchQuery ? '未找到匹配的测试用例' : '暂无测试用例，点击新建用例开始'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 直接显示当前测试用例的命令步骤 */}
            {currentTestCase.commands.map((command, index) => (
              <div 
                key={command.id}
                className={`
                  flex items-center gap-3 p-2 rounded border hover:bg-muted/50
                  ${index === currentTestCase.currentCommand ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : 'bg-card border-border/50'}
                  ${command.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : ''}
                  ${command.status === 'failed' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' : ''}
                  ${command.status === 'running' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : ''}
                `}
              >
                <input
                  type="checkbox"
                  checked={command.selected}
                  onChange={(e) => toggleSelection(command.id, 'command')}
                  className="rounded"
                />
                
                <div className="flex-1 min-w-0 font-mono text-sm">
                  {command.type === 'execution' && command.command}
                  {command.type === 'urc' && (command.urcPattern || command.command)}
                  {command.type === 'subcase' && command.command}
                </div>

                <div className="flex items-center gap-1">
                  {/* 状态指示器 */}
                  {command.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {command.status === 'failed' && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  {command.status === 'running' && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            // 单独运行这个命令
                            const updatedCommands = currentTestCase.commands.map((cmd, i) => ({
                              ...cmd,
                              selected: i === index
                            }));
                            const updatedCase = { ...currentTestCase, commands: updatedCommands };
                            const updatedTestCases = testCases.map(tc => 
                              tc.id === currentTestCase.id ? updatedCase : tc
                            );
                            setTestCases(updatedTestCases);
                            
                            // 执行运行逻辑
                            toast({
                              title: "开始执行",
                              description: `正在执行步骤 ${index + 1}: ${command.command}`,
                            });
                          }}
                          disabled={connectedPorts.length === 0}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>运行此步骤</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            console.log('Settings button clicked', command.type, command.id);
                            // 打开单个命令设置
                            if (command.type === 'subcase') {
                              // 如果是子用例，打开子用例编辑器
                              const commandIndex = index; // 使用循环中的index而不是findIndex
                              console.log('Opening subcase editor for index:', commandIndex);
                              setEditingSubcaseIndex(commandIndex);
                            } else {
                              // 设置当前编辑的命令索引，并确保设置正确的测试用例
                              console.log('Opening command editor for index:', index);
                              setEditingCase(currentTestCase); // 确保设置当前测试用例
                              setEditingCommandIndex(index); // 使用循环中的index
                            }
                          }}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>设置此步骤</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
            
            {currentTestCase.commands.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PlayCircle className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">此测试用例暂无步骤</p>
                <p className="text-xs mt-1">点击上方"设置"按钮添加测试步骤</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 命令操作下拉栏 */}
      {currentTestCase && (
        <div className="border-t bg-muted/20 p-2">
          <div className="flex items-center justify-between gap-2">
            {/* 显示当前测试用例编号按钮 */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCaseSelector(true)}
                      className="h-6 px-2 gap-1 text-xs"
                    >
                      <Hash className="w-3 h-3" />
                      <span>{currentTestCase ? `#${currentTestCase.uniqueId}` : '无用例'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">显示当前测试用例编号</p>
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border mx-1" />

                {/* 新建测试用例按钮 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => addTestCase()} 
                      variant="default"
                      size="sm" 
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">新建测试用例</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* 用例操作按钮 */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-xs"
                      onClick={() => {
                        toast({
                          title: "更新用例",
                          description: "用例已更新到最新版本",
                        });
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">更新用例</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-xs"
                      onClick={() => {
                        toast({
                          title: "推送用例",
                          description: "用例已推送到服务器",
                        });
                      }}
                    >
                      <Upload className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">推送用例</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-xs"
                      onClick={() => {
                        toast({
                          title: "获取用例",
                          description: "正在从服务器获取最新用例",
                        });
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">获取用例</p>
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border mx-1" />

                {/* 测试用例选择按钮 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCaseSelector(true)}
                      className="h-6 px-2 gap-1 text-xs"
                    >
                      <Search className="w-3 h-3" />
                      <span>选择用例</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">搜索和选择测试用例</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}

      {/* 测试用例选择窗口 */}
      <Dialog open={showCaseSelector} onOpenChange={setShowCaseSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>选择测试用例</DialogTitle>
            <DialogDescription>
              搜索并选择要执行的测试用例
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索测试用例名称或编号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 测试用例列表 */}
            <div className="flex-1 max-h-96 overflow-y-auto space-y-2">
              {filteredTestCases.length > 0 ? (
                filteredTestCases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedTestCaseId === testCase.id 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-card border-border hover:bg-muted/50'
                      }
                    `}
                    onClick={() => {
                      setSelectedTestCaseId(testCase.id);
                      setShowCaseSelector(false);
                      setSearchQuery(''); // 清空搜索
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          #{testCase.uniqueId}
                        </Badge>
                        <span className="font-medium">{testCase.name}</span>
                        {selectedTestCaseId === testCase.id && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{testCase.commands.length} 个步骤</span>
                        {testCase.description && (
                          <span>• {testCase.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <TestTube2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">
                    {searchQuery ? '未找到匹配的测试用例' : '暂无测试用例'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-card border border-border shadow-lg rounded-md py-1 z-50 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1 text-left text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => toggleSelection(contextMenu.targetId, contextMenu.targetType)}
          >
            <CheckSquare className="w-3 h-3" />
            切换选择
          </button>
          <Separator className="my-1" />
          <button
            className="w-full px-3 py-1 text-left text-sm hover:bg-muted text-green-600"
            onClick={() => changeStatus(contextMenu.targetId, contextMenu.targetType, 'success')}
          >
            标记为通过
          </button>
          <button
            className="w-full px-3 py-1 text-left text-sm hover:bg-muted text-red-600"
            onClick={() => changeStatus(contextMenu.targetId, contextMenu.targetType, 'failed')}
          >
            标记为失败
          </button>
          <button
            className="w-full px-3 py-1 text-left text-sm hover:bg-muted text-blue-600"
            onClick={() => changeStatus(contextMenu.targetId, contextMenu.targetType, 'pending')}
          >
            重置状态
          </button>
        </div>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={!!editingCase} onOpenChange={(open) => !open && setEditingCase(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>编辑测试用例</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            {editingCase && (
              <TestCaseEditor 
                testCase={editingCase}
                testCases={testCases}
                onSave={(updatedCase) => {
                  const updateCase = (cases: TestCase[]): TestCase[] => {
                    return cases.map(tc => {
                      if (tc.id === updatedCase.id) {
                        return updatedCase;
                      }
                      return {
                        ...tc,
                        subCases: updateCase(tc.subCases)
                      };
                    });
                  };
                  
                  setTestCases(updateCase);
                  setEditingCase(null);
                  setSelectedCase(updatedCase);
                  toast({
                    title: "保存成功",
                    description: "测试用例已更新"
                  });
                }}
                onCancel={() => setEditingCase(null)}
                getCommandSuggestions={getCommandSuggestions}
                getTestCaseSuggestions={getTestCaseSuggestions}
                onAddSubCase={(parentId) => addTestCase(parentId)}
                storedParameters={storedParameters}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 用户操作提示弹窗 */}
      <Dialog open={waitingForUser} onOpenChange={setWaitingForUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>需要用户操作</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{userPrompt}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setWaitingForUser(false)}>
                取消
              </Button>
              <Button onClick={() => {
                setWaitingForUser(false);
                setUserPrompt('');
              }}>
                继续执行
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 测试用例编辑器组件
interface TestCaseEditorProps {
  testCase: TestCase;
  testCases: TestCase[]; // 添加所有测试用例数据
  onSave: (testCase: TestCase) => void;
  onCancel: () => void;
  getCommandSuggestions: (input: string) => string[];
  getTestCaseSuggestions: (input: string) => TestCase[];
  onAddSubCase: (parentId: string) => void;
  storedParameters: { [key: string]: string }; // 添加参数存储
}

const TestCaseEditor: React.FC<TestCaseEditorProps> = ({
  testCase,
  testCases,
  onSave,
  onCancel,
  getCommandSuggestions,
  getTestCaseSuggestions,
  onAddSubCase,
  storedParameters
}) => {
  const { toast } = useToast();
  const [editingCase, setEditingCase] = useState<TestCase>({ ...testCase });
  const [commandInput, setCommandInput] = useState('');
  const [subCaseInput, setSubCaseInput] = useState('');
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  const [subCaseSuggestions, setSubCaseSuggestions] = useState<TestCase[]>([]);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  
  // 子用例编辑面板状态管理  
  const [editingSubcaseIndex, setEditingSubcaseIndex] = useState<number | null>(null);

  // 初始化子命令（如果为空则从引用用例复制）
  const initializeSubCommands = (commandIndex: number) => {
    const command = editingCase.commands[commandIndex];
    if (!command.subCommands || command.subCommands.length === 0) {
      if (command.referencedCaseId) {
        const referencedCase = findTestCaseById(command.referencedCaseId);
        if (referencedCase) {
          const deepCopyCommands = (commands: TestCommand[]): TestCommand[] => {
            return commands.map(cmd => ({
              ...cmd,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              selected: false,
              status: 'pending'
            }));
          };
          
          updateCommand(commandIndex, { subCommands: deepCopyCommands(referencedCase.commands) });
        }
      }
    }
  };

  // 根据ID查找测试用例 - 这里需要从父组件传入testCases数据
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

  // 递归渲染子用例步骤
  const renderSubcaseSteps = (subcase: TestCase, testCases: TestCase[], depth: number = 1): React.ReactNode => {
    return subcase.commands.map((command, cmdIndex) => (
      <div key={`${subcase.id}-cmd-${cmdIndex}`} 
           className={`border-l-2 border-muted-foreground/20 pl-4 ml-${depth * 4} space-y-2`}
           style={{ marginLeft: `${depth * 16}px` }}>
        <div className="flex items-center gap-2 py-2">
          <Badge variant="outline" className="text-xs">
            {depth > 1 ? '•' : '└'} 步骤 {cmdIndex + 1}
          </Badge>
          <Badge variant={command.type === 'execution' ? 'default' : 'destructive'} className="text-xs">
            {command.type === 'execution' ? '命令' : 'URC'}
          </Badge>
          <div className="text-sm text-muted-foreground font-mono">
            {command.type === 'execution' && `执行: ${command.command}`}
            {command.type === 'urc' && `监听: ${command.urcPattern || command.command}`}
          </div>
        </div>
      </div>
    ));
  };

  // 添加子用例引用
  const addSubcaseReference = (targetCase: TestCase) => {
    // 深度复制目标用例的命令作为可编辑的子命令
    const deepCopyCommands = (commands: TestCommand[]): TestCommand[] => {
      return commands.map(cmd => ({
        ...cmd,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        selected: false,
        status: 'pending'
      }));
    };

    const newCommand: TestCommand = {
      id: Date.now().toString(),
      type: 'subcase',
      command: targetCase.name,
      validationMethod: 'none',
      waitTime: 2000,
      stopOnFailure: true,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending',
      referencedCaseId: targetCase.id,
      isExpanded: false,
      subCommands: deepCopyCommands(targetCase.commands) // 深度复制命令作为可编辑子步骤
    };
    
    setEditingCase(prev => ({
      ...prev,
      commands: [...prev.commands, newCommand]
    }));
    
    toast({
      title: "子用例已添加",
      description: `已添加子用例引用：${targetCase.name}，包含 ${targetCase.commands.length} 个可编辑子步骤`,
    });
  };

  const addCommand = () => {
    if (!commandInput.trim()) return;

    console.log('Adding command:', commandInput, 'Available test cases:', testCases.length);

    // 智能判断命令类型
    let commandType: 'execution' | 'urc' = 'execution';
    let urcPattern: string | undefined;
    
    const input = commandInput.trim();
    
    // 只检查是否是子用例引用 (以#开头)
    if (input.startsWith('#')) {
      const caseId = input.substring(1); // 去掉#号
      console.log('Looking for case with ID:', caseId);
      const matchedCase = testCases.find(tc => tc.uniqueId === caseId || tc.id === caseId);
      console.log('Found matched case:', matchedCase);
      if (matchedCase) {
        addSubcaseReference(matchedCase);
        setCommandInput('');
        setCommandSuggestions([]);
        return;
      } else {
        console.log('No matching case found for ID:', caseId);
        toast({
          title: "未找到子用例",
          description: `找不到编号为 ${caseId} 的测试用例`,
          variant: "destructive"
        });
        return;
      }
    }
    // 检查是否是URC模式 (包含+或%开头)
    else if (input.includes('+') || input.includes('%') || input.includes(':')) {
      commandType = 'urc';
      urcPattern = input;
    }

    const newCommand: TestCommand = {
      id: Date.now().toString(),
      type: commandType,
      command: commandInput,
      validationMethod: 'none',
      waitTime: 2000,
      stopOnFailure: true,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending',
      // 为URC类型添加特有字段
      urcPattern: commandType === 'urc' ? urcPattern : undefined,
      dataParseConfig: commandType === 'urc' ? undefined : undefined,
      jumpConfig: commandType === 'urc' ? undefined : undefined,
    };
    
    setEditingCase(prev => ({
      ...prev,
      commands: [...prev.commands, newCommand]
    }));
    setCommandInput('');
    setCommandSuggestions([]);
    setSubCaseSuggestions([]);
  };

  // 复制用例到当前用例
  const copyTestCaseCommands = (sourceCase: TestCase) => {
    if (!sourceCase) return;
    
    // 深度复制源用例的命令，并生成新的ID
    const copyCommands = (commands: TestCommand[]): TestCommand[] => {
      return commands.map(cmd => ({
        ...cmd,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        selected: false,
        status: 'pending'
      }));
    };
    
    const copiedCommands = copyCommands(sourceCase.commands);
    
    setEditingCase(prev => ({
      ...prev,
      commands: [...prev.commands, ...copiedCommands]
    }));
    
    toast({
      title: "用例已复制",
      description: `已复制 ${sourceCase.name} 的 ${copiedCommands.length} 个步骤到当前用例`,
    });
  };

  const updateCommand = (index: number, updates: Partial<TestCommand>) => {
    setEditingCase(prev => ({
      ...prev,
      commands: prev.commands.map((cmd, i) => 
        i === index ? { ...cmd, ...updates } : cmd
      )
    }));
  };

  // 更新子命令
  const updateSubCommand = (commandIndex: number, subIndex: number, updates: Partial<TestCommand>) => {
    setEditingCase(prev => ({
      ...prev,
      commands: prev.commands.map((cmd, i) => {
        if (i === commandIndex && cmd.subCommands) {
          return {
            ...cmd,
            subCommands: cmd.subCommands.map((subCmd, j) => 
              j === subIndex ? { ...subCmd, ...updates } : subCmd
            )
          };
        }
        return cmd;
      })
    }));
  };

  // 删除子命令
  const deleteSubCommand = (commandIndex: number, subIndex: number) => {
    setEditingCase(prev => ({
      ...prev,
      commands: prev.commands.map((cmd, i) => {
        if (i === commandIndex && cmd.subCommands) {
          return {
            ...cmd,
            subCommands: cmd.subCommands.filter((_, j) => j !== subIndex)
          };
        }
        return cmd;
      })
    }));
  };

  // 添加子命令
  const addSubCommand = (commandIndex: number) => {
    const newSubCommand: TestCommand = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: 'execution',
      command: '',
      validationMethod: 'none',
      waitTime: 2000,
      stopOnFailure: true,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    };

    setEditingCase(prev => ({
      ...prev,
      commands: prev.commands.map((cmd, i) => {
        if (i === commandIndex) {
          return {
            ...cmd,
            subCommands: [...(cmd.subCommands || []), newSubCommand]
          };
        }
        return cmd;
      })
    }));
  };

  const deleteCommand = (index: number) => {
    setEditingCase(prev => ({
      ...prev,
      commands: prev.commands.filter((_, i) => i !== index)
    }));
  };

  const handleCommandInputChange = (value: string) => {
    setCommandInput(value);
    if (value) {
      setCommandSuggestions(getCommandSuggestions(value));
    } else {
      setCommandSuggestions([]);
    }
  };

  const handleSubCaseInputChange = (value: string) => {
    setSubCaseInput(value);
    if (value) {
      setSubCaseSuggestions(getTestCaseSuggestions(value));
    } else {
      setSubCaseSuggestions([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>用例编号</Label>
          <Input
            value={editingCase.uniqueId}
            disabled
            className="bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label>用例名称 *</Label>
          <Input
            value={editingCase.name}
            onChange={(e) => setEditingCase(prev => ({ ...prev, name: e.target.value }))}
            placeholder="输入测试用例名称"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>描述</Label>
        <Textarea
          value={editingCase.description}
          onChange={(e) => setEditingCase(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="描述测试用例的功能和目的"
        />
      </div>

      <Separator />

      {/* 测试步骤管理 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">测试步骤</Label>
          <Badge variant="outline" className="text-xs">
            共 {editingCase.commands.length} 个步骤
          </Badge>
        </div>

        {/* 参数显示 */}
        {Object.keys(storedParameters).length > 0 && (
          <div className="space-y-2 p-3 bg-primary/5 rounded-lg border">
            <Label className="text-xs font-medium text-primary">可用参数</Label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(storedParameters).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10"
                  onClick={() => setCommandInput(prev => prev + `{${key}}`)}
                  title={`点击插入参数 {${key}}, 当前值: ${value}`}
                >
                  {key}: {String(value).length > 10 ? String(value).substring(0, 10) + '...' : String(value)}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              使用格式: 在命令中输入 {"{参数名}"} 来引用参数
            </div>
          </div>
        )}

        {/* 步骤列表 */}
        <div className="space-y-3">
          {editingCase.commands.map((command, index) => (
            <div key={command.id} className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    command.type === 'execution' ? 'default' : 'destructive'
                  }>
                    步骤 {index + 1}
                  </Badge>
                  {command.type === 'subcase' ? (
                    <Badge variant="secondary" className="h-6 px-2">
                      子用例
                    </Badge>
                  ) : (
                    <Select
                      value={command.type}
                      onValueChange={(value: 'execution' | 'urc') => updateCommand(index, { type: value })}
                    >
                      <SelectTrigger className="w-24 h-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="execution">命令</SelectItem>
                        <SelectItem value="urc">URC</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <div className="text-sm text-muted-foreground font-mono flex-1">
                    {command.type === 'execution' && `执行: ${command.command}`}
                    {command.type === 'urc' && `监听: ${command.urcPattern || command.command}`}
                    {command.type === 'subcase' && `子用例: ${command.command}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (command.type === 'subcase') {
                        initializeSubCommands(index);
                        setEditingSubcaseIndex(index);
                      } else {
                        setEditingCommandIndex(editingCommandIndex === index ? null : index);
                      }
                    }}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommand(index)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {/* 步骤内容输入 */}
              {command.type === 'subcase' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      value={command.command}
                      onChange={(e) => {
                        updateCommand(index, { command: e.target.value });
                        if (e.target.value) {
                          setSubCaseSuggestions(getTestCaseSuggestions(e.target.value));
                        } else {
                          setSubCaseSuggestions([]);
                        }
                      }}
                      placeholder="搜索并选择要引用的测试用例..."
                    />
                    {subCaseSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-b shadow-lg z-10 max-h-32 overflow-y-auto">
                        {subCaseSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="p-2 hover:bg-muted cursor-pointer"
                            onClick={() => {
                              updateCommand(index, { 
                                command: suggestion.name,
                                referencedCaseId: suggestion.id
                              });
                              setSubCaseSuggestions([]);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">#{suggestion.uniqueId}</Badge>
                              <span className="text-sm">{suggestion.name}</span>
                              <Badge variant="secondary" className="text-xs">{suggestion.commands.length} 步骤</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 子用例预览和编辑 */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          子用例预览
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          共 {command.subCommands?.length || 0} 步
                        </span>
                       </div>
                     </div>
                    
                    {/* 预览前几个步骤 */}
                    <div className="space-y-1">
                      {command.subCommands?.slice(0, 3).map((subCmd, subIdx) => (
                        <div key={subCmd.id} className="text-xs text-muted-foreground font-mono">
                          {index + 1}.{subIdx + 1}) {subCmd.type === 'execution' ? 'AT' : 'URC'}：{subCmd.command || '(未设置)'}
                        </div>
                      ))}
                      {(command.subCommands?.length || 0) > 3 && (
                        <div className="text-xs text-muted-foreground">
                          ... 还有 {(command.subCommands?.length || 0) - 3} 个步骤
                        </div>
                      )}
                      {(!command.subCommands || command.subCommands.length === 0) && (
                        <div className="text-xs text-muted-foreground italic">
                          点击"设置 编辑子用例"开始配置子步骤
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <Input
                  value={command.command}
                  onChange={(e) => updateCommand(index, { command: e.target.value })}
                  placeholder={
                    command.type === 'execution' ? "输入AT命令，如: AT+CSQ" :
                    command.type === 'urc' ? "输入URC模式，如: +CREG:" :
                    "输入命令内容"
                  }
                />
              )}

              {/* 详细配置 */}
              {editingCommandIndex === index && (
                <div className="space-y-3 bg-muted/30 p-3 rounded">
                  {/* ... 保留原有的详细配置代码 ... */}
                  {/* URC特有配置 */}
                  {command.type === 'urc' && (
                    <div className="space-y-3 border-l-2 border-orange-500 pl-3">
                      <Label className="text-xs font-medium text-orange-600">URC配置</Label>
                      
                      {/* URC匹配模式 */}
                      <div>
                        <Label className="text-xs">URC匹配模式</Label>
                        <Input
                          className="h-8"
                          value={command.urcPattern || ''}
                          onChange={(e) => updateCommand(index, { urcPattern: e.target.value })}
                          placeholder="例如: +CREG: 或 %CGREG: 或 +CSQ:"
                        />
                      </div>

                      {/* 匹配方式 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">匹配方式</Label>
                          <Select
                            value={command.dataParseConfig?.parseType || 'contains'}
                            onValueChange={(value: 'contains' | 'exact' | 'regex') => 
                              updateCommand(index, { 
                                dataParseConfig: { 
                                  ...command.dataParseConfig,
                                  parseType: value,
                                  parsePattern: command.dataParseConfig?.parsePattern || '',
                                  parameterMap: command.dataParseConfig?.parameterMap || {}
                                } 
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contains">包含匹配</SelectItem>
                              <SelectItem value="exact">精确匹配</SelectItem>
                              <SelectItem value="regex">正则表达式</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">超时时间(ms)</Label>
                          <Input
                            type="number"
                            className="h-8"
                            value={command.waitTime}
                            onChange={(e) => updateCommand(index, { waitTime: Number(e.target.value) })}
                            placeholder="5000"
                          />
                        </div>
                      </div>

                      {/* 参数提取配置 */}
                      <div>
                        <Label className="text-xs">参数提取模式</Label>
                        <Input
                          className="h-8"
                          value={command.dataParseConfig?.parsePattern || ''}
                          onChange={(e) => 
                            updateCommand(index, { 
                              dataParseConfig: { 
                                ...command.dataParseConfig,
                                parseType: command.dataParseConfig?.parseType || 'regex',
                                parsePattern: e.target.value,
                                parameterMap: command.dataParseConfig?.parameterMap || {}
                              } 
                            })
                          }
                          placeholder={
                            command.dataParseConfig?.parseType === 'regex' 
                              ? '例如: \\+CREG: (\\d+),(\\d+) 提取状态和信号' 
                              : command.dataParseConfig?.parseType === 'split'
                              ? '例如: , 按逗号分割'
                              : '留空则匹配整行'
                          }
                        />
                      </div>

                      {/* 参数映射 */}
                      <div>
                        <Label className="text-xs">参数映射 (格式: 参数名=组号,参数名2=组号2)</Label>
                        <Input
                          className="h-8"
                          value={
                            command.dataParseConfig?.parameterMap 
                              ? Object.entries(command.dataParseConfig.parameterMap)
                                  .map(([key, value]) => `${key}=${value}`)
                                  .join(',')
                              : ''
                          }
                          onChange={(e) => {
                            const parameterMap: { [key: string]: string } = {};
                            if (e.target.value.trim()) {
                              e.target.value.split(',').forEach(pair => {
                                const [key, value] = pair.split('=');
                                if (key && value) {
                                  parameterMap[key.trim()] = value.trim();
                                }
                              });
                            }
                            updateCommand(index, { 
                              dataParseConfig: { 
                                ...command.dataParseConfig,
                                parseType: command.dataParseConfig?.parseType || 'regex',
                                parsePattern: command.dataParseConfig?.parsePattern || '',
                                parameterMap
                              } 
                            });
                          }}
                          placeholder="例如: status=1,signal=2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          提取的参数可在后续步骤中使用 {"{参数名}"} 引用
                        </div>
                      </div>

                      {/* 失败处理 */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={command.stopOnFailure}
                          onCheckedChange={(checked) => updateCommand(index, { stopOnFailure: checked })}
                        />
                        <Label className="text-xs">匹配失败时停止执行</Label>
                      </div>
                    </div>
                  )}

                  {/* 通用配置 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">验证方式</Label>
                      <Select
                        value={command.validationMethod}
                        onValueChange={(value: any) => updateCommand(index, { validationMethod: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无验证</SelectItem>
                          <SelectItem value="contains">包含</SelectItem>
                          <SelectItem value="equals">完全匹配</SelectItem>
                          <SelectItem value="regex">正则表达式</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">等待时间(ms)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={command.waitTime}
                        onChange={(e) => updateCommand(index, { waitTime: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">换行符</Label>
                      <Select
                        value={command.lineEnding}
                        onValueChange={(value: any) => updateCommand(index, { lineEnding: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无</SelectItem>
                          <SelectItem value="lf">LF (\n)</SelectItem>
                          <SelectItem value="cr">CR (\r)</SelectItem>
                          <SelectItem value="crlf">CRLF (\r\n)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 添加新步骤 */}
        <div className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="space-y-3">
            <Label className="text-sm font-medium">添加新步骤</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={commandInput}
                  onChange={(e) => handleCommandInputChange(e.target.value)}
                  placeholder="输入AT命令、URC模式或#编号添加子用例..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commandInput.trim()) {
                      addCommand();
                    }
                  }}
                />
                {commandSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-b shadow-lg z-10 max-h-32 overflow-y-auto">
                    {commandSuggestions.map((suggestion, index) => (
                      <div
                        key={`cmd-${index}`}
                        className="p-2 hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setCommandInput(suggestion);
                          setCommandSuggestions([]);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">命令</Badge>
                          <span className="text-sm font-mono">{suggestion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={addCommand} disabled={!commandInput.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                添加步骤
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <div>• AT命令: AT+CSQ</div>
              <div>• URC监听: +CREG:</div>
              <div>• 子用例: #1001</div>
            </div>
            
            {/* 子用例快速添加 */}
            <div className="border-t pt-3">
              <Label className="text-xs font-medium text-blue-600">快速添加子用例</Label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 relative">
                  <Input
                    value={subCaseInput}
                    onChange={(e) => handleSubCaseInputChange(e.target.value)}
                    placeholder="搜索测试用例..."
                    className="h-8"
                  />
                  {subCaseSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-b shadow-lg z-10 max-h-32 overflow-y-auto">
                      {subCaseSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            addSubcaseReference(suggestion);
                            setSubCaseInput('');
                            setSubCaseSuggestions([]);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">#{suggestion.uniqueId}</Badge>
                              <span className="text-sm">{suggestion.name}</span>
                              <Badge variant="secondary" className="text-xs">{suggestion.commands.length} 步骤</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (subCaseInput.trim() && subCaseSuggestions.length > 0) {
                      addSubcaseReference(subCaseSuggestions[0]);
                      setSubCaseInput('');
                      setSubCaseSuggestions([]);
                    }
                  }}
                  disabled={!subCaseInput.trim() || subCaseSuggestions.length === 0}
                  className="h-8"
                >
                  添加子用例
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button 
          onClick={() => onSave(editingCase)}
          disabled={!editingCase.name.trim()}
        >
          保存
        </Button>
      </div>

      {/* 子用例编辑弹窗 */}
      <Dialog open={editingSubcaseIndex !== null} onOpenChange={(open) => !open && setEditingSubcaseIndex(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>编辑子用例 - {editingCase.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            {editingSubcaseIndex !== null && (
              <SubcaseEditor
                parentCaseName={editingCase.name}
                subCommands={editingCase.commands[editingSubcaseIndex]?.subCommands || []}
                onSubCommandsChange={(subCommands) => {
                  updateCommand(editingSubcaseIndex, { subCommands });
                }}
                onClose={() => setEditingSubcaseIndex(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 单个命令编辑弹窗 */}
      <Dialog open={editingCommandIndex !== null} onOpenChange={(open) => !open && setEditingCommandIndex(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑命令设置</DialogTitle>
            <DialogDescription>
              配置单个命令的参数和验证设置
            </DialogDescription>
          </DialogHeader>
          {editingCommandIndex !== null && editingCase && (
            <div className="space-y-4">
              {(() => {
                const command = editingCase.commands[editingCommandIndex];
                return (
                  <>
                    <div>
                      <Label className="text-sm">命令内容</Label>
                      <Input
                        value={command.command}
                        onChange={(e) => updateCommand(editingCommandIndex, { command: e.target.value })}
                        placeholder={
                          command.type === 'execution' ? "输入AT命令" : 
                          command.type === 'urc' ? "输入URC模式" : "命令内容"
                        }
                      />
                    </div>

                    {/* URC特有配置 */}
                    {command.type === 'urc' && (
                      <div>
                        <Label className="text-sm">URC匹配模式</Label>
                        <Input
                          value={command.urcPattern || ''}
                          onChange={(e) => updateCommand(editingCommandIndex, { urcPattern: e.target.value })}
                          placeholder="例如: +CREG: 或 %CGREG:"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">验证方式</Label>
                        <Select
                          value={command.validationMethod}
                          onValueChange={(value: any) => updateCommand(editingCommandIndex, { validationMethod: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">无验证</SelectItem>
                            <SelectItem value="contains">包含</SelectItem>
                            <SelectItem value="equals">完全匹配</SelectItem>
                            <SelectItem value="regex">正则表达式</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">等待时间(ms)</Label>
                        <Input
                          type="number"
                          value={command.waitTime}
                          onChange={(e) => updateCommand(editingCommandIndex, { waitTime: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">换行符</Label>
                        <Select
                          value={command.lineEnding}
                          onValueChange={(value: any) => updateCommand(editingCommandIndex, { lineEnding: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">无</SelectItem>
                            <SelectItem value="lf">LF (\n)</SelectItem>
                            <SelectItem value="cr">CR (\r)</SelectItem>
                            <SelectItem value="crlf">CRLF (\r\n)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          checked={command.stopOnFailure}
                          onCheckedChange={(checked) => updateCommand(editingCommandIndex, { stopOnFailure: checked })}
                        />
                        <Label className="text-sm">失败时停止执行</Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
                        取消
                      </Button>
                      <Button onClick={() => setEditingCommandIndex(null)}>
                        保存
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};