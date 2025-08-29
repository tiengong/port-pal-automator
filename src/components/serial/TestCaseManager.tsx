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
  
  // 新增菜单状态
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // 参数存储系统 - 用于URC解析的参数
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: string }>({});
  
  // 子用例展开状态管理
  const [expandedSubcases, setExpandedSubcases] = useState<Set<string>>(new Set());

  // 新增：子用例命令展开状态管理
  const [expandedSubcaseCommands, setExpandedSubcaseCommands] = useState<Set<string>>(new Set());

  // 新增：命令设置对话框状态
  const [commandDialog, setCommandDialog] = useState<{
    open: boolean;
    commandIndex: number | null;
  }>({ open: false, commandIndex: null });

  // 新增：子用例编辑对话框状态  
  const [subcaseDialog, setSubcaseDialog] = useState<{
    open: boolean;
    commandIndex: number | null;
  }>({ open: false, commandIndex: null });

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

  // 新增：切换子用例命令展开状态
  const toggleSubcaseCommandExpanded = (commandId: string) => {
    setExpandedSubcaseCommands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commandId)) {
        newSet.delete(commandId);
      } else {
        newSet.add(commandId);
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

  // 更新指定位置的命令
  const updateCommandAt = (caseId: string, commandIndex: number, updates: Partial<TestCommand>) => {
    setTestCases(prev => prev.map(testCase => {
      if (testCase.id === caseId) {
        return {
          ...testCase,
          commands: testCase.commands.map((cmd, index) => 
            index === commandIndex ? { ...cmd, ...updates } : cmd
          )
        };
      }
      return testCase;
    }));
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
          },
          {
            id: 'subcaseCmd1',
            type: 'subcase',
            command: '信号强度检测',
            validationMethod: 'none',
            waitTime: 2000,
            stopOnFailure: true,
            lineEnding: 'crlf',
            selected: false,
            status: 'pending',
            referencedCaseId: 'subcase1',
            isExpanded: false,
            subCommands: [
              {
                id: 'subcmd1-copy',
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
              subCases: [...testCase.subCases, newTestCase]
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
    
    // 开始编辑新用例
    setEditingCase(newTestCase);
  };

  // 过滤测试用例
  const filterTestCases = (cases: TestCase[], query: string): TestCase[] => {
    if (!query) return cases;
    
    return cases.filter(testCase => {
      const matchesName = testCase.name.toLowerCase().includes(query.toLowerCase());
      const matchesId = testCase.uniqueId.includes(query);
      const matchesCommands = testCase.commands.some(cmd => 
        cmd.command.toLowerCase().includes(query.toLowerCase())
      );
      const hasMatchingSubCase = filterTestCases(testCase.subCases, query).length > 0;
      
      return matchesName || matchesId || matchesCommands || hasMatchingSubCase;
    });
  };

  // 渲染测试用例列表
  const renderTestCases = (cases: TestCase[], depth = 0): React.ReactNode => {
    return cases.map(testCase => (
      <div key={testCase.id} className={`ml-${depth * 4}`}>
        <div 
          className={`
            flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer
            ${selectedTestCaseId === testCase.id ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : 'bg-card'}
            ${testCase.status === 'running' ? 'bg-blue-50 border-blue-200' : ''}
            ${testCase.status === 'success' ? 'bg-green-50 border-green-200' : ''}
            ${testCase.status === 'failed' ? 'bg-red-50 border-red-200' : ''}
          `}
          onClick={() => setSelectedTestCaseId(testCase.id)}
          onContextMenu={(e) => handleContextMenu(e, testCase.id, 'case')}
        >
          <div className="flex items-center gap-1">
            {testCase.subCases.length > 0 && (
              <button onClick={(e) => {
                e.stopPropagation();
                toggleSubcaseExpanded(testCase.id);
              }}>
                {expandedSubcases.has(testCase.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            
            <input
              type="checkbox"
              checked={testCase.selected}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelection(testCase.id, 'case');
              }}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="outline" className="text-xs font-mono">
              {testCase.uniqueId}
            </Badge>
            <span className="font-medium">{testCase.name}</span>
            
            {testCase.isRunning && testCase.currentCommand !== -1 && (
              <Badge variant="secondary" className="text-xs">
                执行中 {testCase.currentCommand + 1}/{testCase.commands.length}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {testCase.status === 'success' && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {testCase.status === 'failed' && (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            {testCase.status === 'running' && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
        
        {/* 子用例展开显示 */}
        {testCase.subCases.length > 0 && expandedSubcases.has(testCase.id) && (
          <div className="ml-4 mt-1 space-y-1">
            {renderTestCases(testCase.subCases, depth + 1)}
          </div>
        )}
        
        {/* 测试用例下的命令步骤展开 */}
        {testCase.isExpanded && (
          <div className="ml-6 mt-2 space-y-1">
            {testCase.commands.map((command, index) => (
              <div key={command.id}
                   className={`flex items-center gap-2 p-1 rounded text-xs
                     ${index === testCase.currentCommand ? 'bg-blue-50' : 'bg-muted/20'}
                     ${command.status === 'success' ? 'bg-green-50' : ''}
                     ${command.status === 'failed' ? 'bg-red-50' : ''}
                   `}
                   onContextMenu={(e) => handleContextMenu(e, command.id, 'command')}
              >
                <input
                  type="checkbox"
                  checked={command.selected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelection(command.id, 'command');
                  }}
                  className="rounded"
                />
                
                <Badge variant="outline" className="text-xs px-1">
                  {index + 1}
                </Badge>
                
                {command.type === 'subcase' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubcaseCommandExpanded(command.id);
                    }}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {expandedSubcaseCommands.has(command.id) ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                )}
                
                {command.type === 'subcase' ? (
                  <Badge variant="secondary" className="text-xs px-1">子用例</Badge>
                ) : (
                  <Badge variant={command.type === 'execution' ? 'default' : 'destructive'} 
                         className="text-xs px-1">
                    {command.type === 'execution' ? '命令' : 'URC'}
                  </Badge>
                )}
                
                <div className="flex-1 min-w-0 font-mono text-xs truncate">
                  {command.type === 'execution' && command.command}
                  {command.type === 'urc' && (command.urcPattern || command.command)}
                  {command.type === 'subcase' && command.command}
                </div>
                
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
            ))}

            {/* 子用例展开显示可编辑子步骤 */}
            {testCase.commands.map((command) => (
              command.type === 'subcase' && expandedSubcaseCommands.has(command.id) && command.subCommands && (
                <div key={`${command.id}-expanded`} className="ml-8 mt-1 space-y-1 border-l border-border/30 pl-3">
                  {command.subCommands.map((subCommand, subIndex) => (
                    <div key={`${command.id}-sub-${subIndex}`}
                         className="flex items-center gap-2 p-1 rounded text-xs bg-muted/20 border-border/20 border">
                      <Badge variant="outline" className="text-xs px-1">
                        {testCase.commands.findIndex(c => c.id === command.id) + 1}.{subIndex + 1}
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
              )
            ))}
          </div>
        )}
      </div>
    ));
  };

  // 过滤测试用例
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
    <div className="flex h-full bg-background">
      {/* 左侧测试用例列表 */}
      <div className="w-1/3 border-r border-border/50 flex flex-col">
        {/* 搜索和操作栏 */}
        <div className="p-3 border-b border-border/50 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索测试用例..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTestCase()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>添加新测试用例</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* 测试用例列表 */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredTestCases.length > 0 ? (
            <div className="space-y-1">
              {renderTestCases(filteredTestCases)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <TestTube2 className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">
                {searchQuery ? '未找到匹配的测试用例' : '暂无测试用例，点击新建用例开始'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧测试用例详情 */}
      <div className="flex-1 flex flex-col">
        {/* 测试用例信息栏 */}
        <div className="border-b border-border/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentTestCase ? (
                <>
                  <Badge variant="outline" className="font-mono">
                    {currentTestCase.uniqueId}
                  </Badge>
                  <h2 className="text-lg font-semibold">{currentTestCase.name}</h2>
                  {currentTestCase.description && (
                    <p className="text-sm text-muted-foreground">
                      {currentTestCase.description}
                    </p>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">请选择测试用例</span>
              )}
            </div>
            
            {currentTestCase && (
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCase(currentTestCase)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>设置测试用例</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 执行测试用例
                  }}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            )}
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
                <div key={command.id}>
                  <div 
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

                    {/* 子用例展开按钮 */}
                    {command.type === 'subcase' && command.subCommands && command.subCommands.length > 0 && (
                      <button 
                        onClick={() => toggleSubcaseCommandExpanded(command.id)}
                        className="p-0.5 hover:bg-muted rounded"
                      >
                        {expandedSubcaseCommands.has(command.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    
                    <div className="flex-1 min-w-0 font-mono text-sm">
                      {command.type === 'execution' && command.command}
                      {command.type === 'urc' && (command.urcPattern || command.command)}
                      {command.type === 'subcase' && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">子用例</Badge>
                          <span>{command.command}</span>
                          {command.subCommands && (
                            <Badge variant="outline" className="text-xs">
                              {command.subCommands.length} 步骤
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                      
                      {command.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {command.status === 'failed' && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {command.status === 'running' && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (command.type === 'subcase') {
                            // 打开子用例编辑对话框
                            setSubcaseDialog({ open: true, commandIndex: index });
                          } else {
                            // 打开单个命令设置对话框
                            setCommandDialog({ open: true, commandIndex: index });
                          }
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // 单独运行命令
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <PlayCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 展开的子用例命令 */}
                  {command.type === 'subcase' && expandedSubcaseCommands.has(command.id) && 
                   command.subCommands && command.subCommands.length > 0 && (
                    <div className="ml-8 mt-2 space-y-1 border-l border-border/30 pl-3">
                      {command.subCommands.map((subCommand, subIndex) => (
                        <div key={`${command.id}-sub-${subIndex}`}
                             className={`
                               flex items-center gap-2 p-2 rounded text-xs border
                               ${subCommand.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : ''}
                               ${subCommand.status === 'failed' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' : ''}
                               ${subCommand.status === 'running' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : 'bg-muted/20 border-border/20'}
                             `}
                        >
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
                          <div className="flex items-center gap-1">
                            {subCommand.status === 'success' && (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            )}
                            {subCommand.status === 'failed' && (
                              <XCircle className="w-3 h-3 text-red-500" />
                            )}
                            {subCommand.status === 'running' && (
                              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // 编辑子命令
                              }}
                              className="h-4 w-4 p-0"
                            >
                              <Settings className="w-2 h-2" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // 单独运行子命令
                              }}
                              className="h-4 w-4 p-0"
                            >
                              <PlayCircle className="w-2 h-2" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-muted/50 font-mono"
                        onClick={() => setSelectedTestCaseId(currentTestCase.id)}
                      >
                        {currentTestCase.uniqueId}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>当前测试用例: {currentTestCase.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Badge variant="secondary" className="text-xs">
                  {currentTestCase.commands.length} 步骤
                </Badge>
              </div>

              {/* 操作按钮组 */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 重置所有步骤状态
                    updateTestCaseStatus(testCases, currentTestCase.id, {
                      status: 'pending',
                      currentCommand: -1,
                      commands: currentTestCase.commands.map(cmd => ({ ...cmd, status: 'pending' }))
                    });
                  }}
                  className="h-7 px-2"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  <span className="text-xs">重置</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 执行选中步骤
                  }}
                  className="h-7 px-2"
                >
                  <Play className="w-3 h-3 mr-1" />
                  <span className="text-xs">执行选中</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    // 执行全部步骤
                  }}
                  className="h-7 px-2"
                >
                  <Play className="w-3 h-3 mr-1" />
                  <span className="text-xs">执行全部</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-background border border-border rounded-md shadow-lg z-50 py-1"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
            onClick={() => toggleSelection(contextMenu.targetId, contextMenu.targetType)}
          >
            <CheckSquare className="w-3 h-3" />
            切换选择
          </button>
          <Separator className="my-1" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted"
            onClick={() => changeStatus(contextMenu.targetId, contextMenu.targetType, 'pending')}
          >
            标记为待执行
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted"
            onClick={() => changeStatus(contextMenu.targetId, contextMenu.targetType, 'success')}
          >
            标记为成功
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted"
            onClick={() => changeStatus(contextMenu.targetId, contextMenu.targetType, 'failed')}
          >
            标记为失败
          </button>
        </div>
      )}

      {/* 测试用例编辑器对话框 */}
      {editingCase && (
        <TestCaseEditor
          testCase={editingCase}
          testCases={testCases}
          onSave={(updatedCase) => {
            setTestCases(prev => prev.map(tc => 
              tc.id === updatedCase.id ? updatedCase : tc
            ));
            setEditingCase(null);
          }}
          onCancel={() => setEditingCase(null)}
          getCommandSuggestions={getCommandSuggestions}
          getTestCaseSuggestions={getTestCaseSuggestions}
          onAddSubCase={addTestCase}
          storedParameters={storedParameters}
        />
      )}

      {/* 命令设置对话框 */}
      <Dialog open={commandDialog.open} onOpenChange={(open) => setCommandDialog({ open, commandIndex: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>命令设置</DialogTitle>
            <DialogDescription>
              配置单个命令的参数和验证设置
            </DialogDescription>
          </DialogHeader>
          {commandDialog.commandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              {(() => {
                const command = currentTestCase.commands[commandDialog.commandIndex!];
                return (
                  <>
                    <div>
                      <Label className="text-sm font-medium">命令内容</Label>
                      <Input
                        value={command.command}
                        onChange={(e) => updateCommandAt(currentTestCase.id, commandDialog.commandIndex!, { command: e.target.value })}
                        placeholder={
                          command.type === 'execution' ? "AT+CREG?" : 
                          command.type === 'urc' ? "输入URC模式" : "命令内容"
                        }
                        className="font-mono bg-muted/30"
                      />
                    </div>

                    {/* 等待时间 */}
                    <div>
                      <Label className="text-sm font-medium">等待时间 (毫秒)</Label>
                      <Input
                        type="number"
                        value={command.waitTime}
                        onChange={(e) => updateCommandAt(currentTestCase.id, commandDialog.commandIndex!, { waitTime: parseInt(e.target.value) || 2000 })}
                        className="bg-background"
                      />
                    </div>

                    {/* 行结束符 */}
                    <div>
                      <Label className="text-sm font-medium">行结束符</Label>
                      <Select
                        value={command.lineEnding}
                        onValueChange={(value: any) => updateCommandAt(currentTestCase.id, commandDialog.commandIndex!, { lineEnding: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="none">无</SelectItem>
                          <SelectItem value="lf">LF (\n)</SelectItem>
                          <SelectItem value="cr">CR (\r)</SelectItem>
                          <SelectItem value="crlf">CRLF (\r\n)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 失败时停止执行 */}
                    <div className="flex items-center justify-between py-2">
                      <Label className="text-sm font-medium">失败时停止执行</Label>
                      <Switch
                        checked={command.stopOnFailure}
                        onCheckedChange={(checked) => updateCommandAt(currentTestCase.id, commandDialog.commandIndex!, { stopOnFailure: checked })}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setCommandDialog({ open: false, commandIndex: null })}>
                        取消
                      </Button>
                      <Button onClick={() => setCommandDialog({ open: false, commandIndex: null })}>
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

      {/* 子用例编辑对话框 */}
      <Dialog open={subcaseDialog.open} onOpenChange={(open) => setSubcaseDialog({ open, commandIndex: null })}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>子用例编辑</DialogTitle>
            <DialogDescription>
              编辑子用例的命令步骤
            </DialogDescription>
          </DialogHeader>
          {subcaseDialog.commandIndex !== null && currentTestCase && (
            <SubcaseEditor
              command={currentTestCase.commands[subcaseDialog.commandIndex!]}
              onSave={(updatedCommand) => {
                updateCommandAt(currentTestCase.id, subcaseDialog.commandIndex!, updatedCommand);
                setSubcaseDialog({ open: false, commandIndex: null });
              }}
              onCancel={() => setSubcaseDialog({ open: false, commandIndex: null })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 用户操作确认对话框 */}
      <Dialog open={waitingForUser} onOpenChange={setWaitingForUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>需要用户操作</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{userPrompt}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setWaitingForUser(false);
                setUserPrompt('');
              }}>
                跳过
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

// 以下为 TestCaseEditor 组件示例实现，供完整性参考

interface TestCaseEditorProps {
  testCase: TestCase;
  testCases: TestCase[];
  onSave: (updatedCase: TestCase) => void;
  onCancel: () => void;
  getCommandSuggestions: (input: string) => string[];
  getTestCaseSuggestions: (input: string) => TestCase[];
  onAddSubCase: (parentId?: string) => void;
  storedParameters: { [key: string]: string };
}

export const TestCaseEditor: React.FC<TestCaseEditorProps> = ({
  testCase,
  testCases,
  onSave,
  onCancel,
  getCommandSuggestions,
  getTestCaseSuggestions,
  onAddSubCase,
  storedParameters
}) => {
  const [localTestCase, setLocalTestCase] = useState<TestCase>({...testCase});

  const updateField = (field: keyof TestCase, value: any) => {
    setLocalTestCase(prev => ({ ...prev, [field]: value }));
  };

  const updateCommand = (index: number, updates: Partial<TestCommand>) => {
    setLocalTestCase(prev => {
      const newCommands = [...prev.commands];
      newCommands[index] = { ...newCommands[index], ...updates };
      return { ...prev, commands: newCommands };
    });
  };

  const addCommand = () => {
    const newCommand: TestCommand = {
      id: Date.now().toString(),
      type: 'execution',
      command: '',
      validationMethod: 'none',
      waitTime: 2000,
      stopOnFailure: false,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    };
    setLocalTestCase(prev => ({ ...prev, commands: [...prev.commands, newCommand] }));
  };

  const removeCommand = (index: number) => {
    setLocalTestCase(prev => {
      const newCommands = [...prev.commands];
      newCommands.splice(index, 1);
      return { ...prev, commands: newCommands };
    });
  };

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>编辑测试用例</DialogTitle>
        <DialogDescription>修改测试用例的基本信息和命令步骤</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>用例名称</Label>
          <Input
            value={localTestCase.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </div>
        <div>
          <Label>描述</Label>
          <Textarea
            value={localTestCase.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>
        <div>
          <Label>命令步骤</Label>
          <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-2">
            {localTestCase.commands.map((cmd, idx) => (
              <div key={cmd.id} className="flex items-center gap-2">
                <Input
                  value={cmd.command}
                  onChange={(e) => updateCommand(idx, { command: e.target.value })}
                  placeholder="AT命令或URC模式"
                  className="flex-1 font-mono"
                />
                <Select
                  value={cmd.validationMethod}
                  onValueChange={(value: any) => updateCommand(idx, { validationMethod: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无验证</SelectItem>
                    <SelectItem value="contains">包含</SelectItem>
                    <SelectItem value="equals">等于</SelectItem>
                    <SelectItem value="regex">正则</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeCommand(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCommand} className="w-full">
              添加命令
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={() => onSave(localTestCase)}>保存</Button>
        </div>
      </div>
    </DialogContent>
  );
};
