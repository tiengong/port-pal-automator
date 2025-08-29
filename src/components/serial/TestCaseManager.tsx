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

  // 生成唯一编号
  const generateUniqueId = () => {
    const id = nextUniqueId.toString();
    setNextUniqueId(prev => prev + 1);
    return id;
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
          },
          {
            id: 'subcmd1',
            type: 'subcase',
            command: '网络连接测试',
            referencedCaseId: 'case2',
            validationMethod: 'none',
            waitTime: 0,
            stopOnFailure: false,
            lineEnding: 'none',
            selected: false,
            status: 'pending',
            isExpanded: false
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

  // 获取当前选中的测试用例
  const getCurrentTestCase = () => {
    if (selectedTestCaseId) {
      return testCases.find(tc => tc.id === selectedTestCaseId);
    }
    return testCases[0];
  };
  
  const currentTestCase = getCurrentTestCase();

  // 运行测试用例
  const runTestCase = (caseId: string) => {
    toast({
      title: "开始执行",
      description: `正在执行测试用例: ${currentTestCase?.name}`,
    });
  };

  // 运行单个命令
  const runCommand = (caseId: string, commandIndex: number) => {
    if (!currentTestCase) return;
    
    const command = currentTestCase.commands[commandIndex];
    toast({
      title: "开始执行",
      description: `正在执行步骤 ${commandIndex + 1}: ${command.command}`,
    });
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* 头部工具栏 */}
      <div className="flex-shrink-0 p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
         {/* 当前测试用例显示 */}
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3 flex-1 min-w-0">
             <TestTube2 className="w-5 h-5 text-primary flex-shrink-0" />
             <div className="flex-1 min-w-0">
               {currentTestCase ? (
                 <div className="space-y-2">
                   <div className="flex items-center gap-2 min-w-0">
                     <Badge variant="outline" className="text-xs flex-shrink-0">#{currentTestCase.uniqueId}</Badge>
                     <span className="font-semibold text-lg truncate">{currentTestCase.name}</span>
                   </div>
                   
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <span className="flex-shrink-0">{currentTestCase.commands.length} 个步骤</span>
                     {currentTestCase.description && (
                       <span className="truncate">• {currentTestCase.description}</span>
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
          <div className="flex items-center justify-between gap-3 min-w-0">
            {/* 主要操作 */}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        // 添加新命令的逻辑
                        if (currentTestCase) {
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
                        }
                        setShowAddMenu(false);
                      }}
                    >
                      <Play className="w-3 h-3 mr-2" />
                      新增命令
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-2 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // 添加子用例的逻辑
                        if (currentTestCase) {
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
                        }
                        setShowAddMenu(false);
                      }}
                    >
                      <TestTube2 className="w-3 h-3 mr-2" />
                      追加子用例
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
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
            <p className="text-sm">暂无测试用例，点击新建用例开始</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 当前测试用例的命令列表 */}
            <div className="border border-border rounded-lg bg-card">
              {/* 命令列表 */}
              <div className="p-3 space-y-2">
                {currentTestCase.commands.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    暂无命令
                  </div>
                ) : (
                  currentTestCase.commands.map((command, index) => (
                    <React.Fragment key={command.id}>
                      <div 
                        className={`
                          flex items-center gap-3 p-2 rounded border text-sm
                          ${index === currentTestCase.currentCommand ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : 'bg-muted/20 border-border/30'}
                          ${command.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : ''}
                          ${command.status === 'failed' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' : ''}
                          ${command.status === 'running' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : ''}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={command.selected}
                          onChange={() => {
                            const updatedCommands = currentTestCase.commands.map((cmd, i) => 
                              i === index ? { ...cmd, selected: !cmd.selected } : cmd
                            );
                            const updatedCase = { ...currentTestCase, commands: updatedCommands };
                            const updatedTestCases = testCases.map(tc => 
                              tc.id === currentTestCase.id ? updatedCase : tc
                            );
                            setTestCases(updatedTestCases);
                          }}
                          className="w-4 h-4 rounded"
                        />
                        
                         <Badge variant="outline" className="text-xs">
                           {index + 1}
                         </Badge>
                         
                         {command.type === 'urc' && (
                           <Badge variant="destructive" className="text-xs">
                             URC
                           </Badge>
                         )}

                          <div className="flex-1 min-w-0 font-mono text-sm">
                            <div className="truncate">
                              {command.type === 'execution' && command.command}
                              {command.type === 'urc' && (command.urcPattern || command.command)}
                              {command.type === 'subcase' && (
                                <span className="truncate">{command.command}</span>
                              )}
                            </div>
                          </div>

                         <div className="flex items-center gap-1 flex-shrink-0">
                          {command.status === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {command.status === 'failed' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          {command.status === 'running' && (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          
                          {/* 子用例展开/收起按钮 */}
                          {command.type === 'subcase' && (command.subCommands?.length > 0 || command.referencedCaseId) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const updatedCommands = currentTestCase.commands.map((cmd, i) => 
                                  i === index ? { ...cmd, isExpanded: !cmd.isExpanded } : cmd
                                );
                                const updatedCase = { ...currentTestCase, commands: updatedCommands };
                                const updatedTestCases = testCases.map(tc => 
                                  tc.id === currentTestCase.id ? updatedCase : tc
                                );
                                setTestCases(updatedTestCases);
                              }}
                            >
                              {command.isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => runCommand(currentTestCase.id, index)}
                            disabled={connectedPorts.length === 0}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              // 打开命令设置
                              if (command.type === 'subcase') {
                                const commandWithSubCommands = {
                                  ...command,
                                  subCommands: command.subCommands || []
                                };
                                const updatedCommands = [...currentTestCase.commands];
                                updatedCommands[index] = commandWithSubCommands;
                                
                                setEditingCase({ ...currentTestCase, commands: updatedCommands });
                                setEditingSubcaseIndex(index);
                              } else {
                                setEditingCase(currentTestCase);
                                setEditingCommandIndex(index);
                              }
                            }}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* 展开的子用例步骤 */}
                      {command.type === 'subcase' && command.isExpanded && (
                        <div className="ml-8 mt-1 space-y-1 border-l border-border/30 pl-3">
                          {(() => {
                            // 显示子命令或引用的测试用例命令
                            let commandsToShow: TestCommand[] = [];
                            let isEditable = false;
                            
                            if (command.subCommands && command.subCommands.length > 0) {
                              commandsToShow = command.subCommands;
                              isEditable = true; // 子命令可编辑
                            } else if (command.referencedCaseId) {
                              const referencedCase = findTestCaseById(command.referencedCaseId);
                              if (referencedCase) {
                                commandsToShow = referencedCase.commands;
                                isEditable = false; // 引用的命令不可直接编辑
                              }
                            }

                            return commandsToShow.map((subCommand, subIndex) => (
                              <div key={`${command.id}-sub-${subIndex}`}
                                   className="flex items-center gap-2 p-2 rounded text-xs bg-muted/20 border-border/20 border hover:bg-muted/30 transition-colors">
                                
                                {/* 选择框 */}
                                 <input
                                   type="checkbox"
                                   checked={subCommand.selected || false}
                                   onChange={() => {
                                     if (isEditable && command.subCommands) {
                                       // 更新子命令的选择状态
                                       const updatedSubCommands = command.subCommands.map((cmd, i) => 
                                         i === subIndex ? { ...cmd, selected: !subCommand.selected } : cmd
                                       );
                                       
                                       // 更新父级命令
                                       const updatedCommands = currentTestCase.commands.map((cmd, i) => 
                                         i === index ? { ...cmd, subCommands: updatedSubCommands } : cmd
                                       );
                                       
                                       // 更新测试用例
                                       const updatedCase = { ...currentTestCase, commands: updatedCommands };
                                       const updatedTestCases = testCases.map(tc => 
                                         tc.id === currentTestCase.id ? updatedCase : tc
                                       );
                                       setTestCases(updatedTestCases);
                                     }
                                   }}
                                   className="w-3 h-3 rounded flex-shrink-0"
                                   disabled={!isEditable}
                                 />
                                
                                 {/* 步骤编号 */}
                                 <Badge variant="outline" className="text-xs px-1 flex-shrink-0">
                                   {index + 1}.{subIndex + 1}
                                 </Badge>
                                 
                                 {/* 命令类型 - 只显示URC */}
                                 {subCommand.type === 'urc' && (
                                   <Badge variant="destructive" className="text-xs px-1 flex-shrink-0">
                                     URC
                                   </Badge>
                                 )}
                                
                                {/* 命令内容 */}
                                 <div className="flex-1 min-w-0 font-mono text-xs truncate">
                                   {subCommand.type === 'execution' && subCommand.command}
                                   {subCommand.type === 'urc' && (subCommand.urcPattern || subCommand.command)}
                                 </div>
                                
                                {/* 操作按钮区域 */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {/* 状态指示器 */}
                                  {subCommand.status === 'success' && (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                  {subCommand.status === 'failed' && (
                                    <XCircle className="w-3 h-3 text-red-500" />
                                  )}
                                  {subCommand.status === 'running' && (
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  )}
                                  
                                  {/* 运行按钮 - 所有命令都有 */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30"
                                    onClick={() => {
                                      // 运行单个子命令
                                      toast({
                                        title: "开始执行",
                                        description: `正在执行子步骤 ${index + 1}.${subIndex + 1}: ${subCommand.command}`,
                                      });
                                    }}
                                    disabled={connectedPorts.length === 0}
                                    title={`运行步骤 ${index + 1}.${subIndex + 1}`}
                                  >
                                    <Play className="w-2 h-2" />
                                  </Button>
                                  
                                  {/* 编辑按钮 */}
                                  {isEditable ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30"
                                      onClick={() => {
                                        // 编辑单个子命令 - 创建临时的编辑状态
                                        const tempCase: TestCase = {
                                          ...currentTestCase,
                                          commands: [{
                                            ...subCommand,
                                            id: `temp_${subCommand.id}` // 避免ID冲突
                                          }]
                                        };
                                        setEditingCase(tempCase);
                                        setEditingCommandIndex(0); // 编辑临时用例的第一个命令
                                      }}
                                      title={`编辑步骤 ${index + 1}.${subIndex + 1}`}
                                    >
                                      <Settings className="w-2 h-2" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30"
                                      onClick={() => {
                                        // 跳转到引用的测试用例进行编辑
                                        if (command.referencedCaseId) {
                                          const referencedCase = findTestCaseById(command.referencedCaseId);
                                          if (referencedCase) {
                                            setSelectedTestCaseId(referencedCase.id);
                                            toast({
                                              title: "切换到原始测试用例",
                                              description: `已切换到 ${referencedCase.name} 用例进行编辑`,
                                            });
                                          }
                                        }
                                      }}
                                      title="跳转到原始测试用例编辑"
                                    >
                                      <Settings className="w-2 h-2" />
                                    </Button>
                                   )}
                                 </div>
                               </div>
                            ));
                          })()}
                          
                          {/* 子命令操作栏 */}
                          {(() => {
                            const isEditable = command.subCommands !== undefined;
                            const hasSubCommands = (command.subCommands && command.subCommands.length > 0) || 
                                                 (command.referencedCaseId && findTestCaseById(command.referencedCaseId)?.commands.length > 0);
                            
                            return hasSubCommands && (
                              <div className="pt-2 border-t border-border/20 mt-2">
                                <div className="flex items-center justify-between gap-2">
                                  {/* 左侧：选择操作 */}
                                  <div className="flex items-center gap-1">
                                    {isEditable && command.subCommands && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-xs px-1"
                                        onClick={() => {
                                          // 全选/取消全选子命令
                                          const hasSelected = command.subCommands?.some(cmd => cmd.selected);
                                          const newSelectedState = !hasSelected;
                                          
                                          const updatedSubCommands = command.subCommands.map(cmd => ({
                                            ...cmd,
                                            selected: newSelectedState
                                          }));
                                          
                                          // 更新父级命令
                                          const updatedCommands = currentTestCase.commands.map((cmd, i) => 
                                            i === index ? { ...cmd, subCommands: updatedSubCommands } : cmd
                                          );
                                          
                                          // 更新测试用例
                                          const updatedCase = { ...currentTestCase, commands: updatedCommands };
                                          const updatedTestCases = testCases.map(tc => 
                                            tc.id === currentTestCase.id ? updatedCase : tc
                                          );
                                          setTestCases(updatedTestCases);
                                        }}
                                        title={command.subCommands?.some(cmd => cmd.selected) ? '取消全选' : '全选子命令'}
                                      >
                                        {command.subCommands?.some(cmd => cmd.selected) ? (
                                          <>
                                            <Square className="w-2 h-2 mr-1" />
                                            取消全选
                                          </>
                                        ) : (
                                          <>
                                            <CheckSquare className="w-2 h-2 mr-1" />
                                            全选
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    
                                    {/* 运行选中的子命令 */}
                                    {isEditable && command.subCommands?.some(cmd => cmd.selected) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-xs px-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                                        onClick={() => {
                                          const selectedCount = command.subCommands?.filter(cmd => cmd.selected).length || 0;
                                          toast({
                                            title: "开始执行选中的子命令",
                                            description: `将依次执行 ${selectedCount} 个子步骤`,
                                          });
                                        }}
                                        disabled={connectedPorts.length === 0}
                                      >
                                        <PlayCircle className="w-2 h-2 mr-1" />
                                        运行选中
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {/* 右侧：添加命令 */}
                                  {isEditable && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-xs px-1 text-primary hover:bg-primary/10"
                                      onClick={() => {
                                        // 打开子用例编辑器
                                        const commandWithSubCommands = {
                                          ...command,
                                          subCommands: command.subCommands || []
                                        };
                                        const updatedCommands = [...currentTestCase.commands];
                                        updatedCommands[index] = commandWithSubCommands;
                                        
                                        setEditingCase({ ...currentTestCase, commands: updatedCommands });
                                        setEditingSubcaseIndex(index);
                                      }}
                                    >
                                      <Plus className="w-2 h-2 mr-1" />
                                      添加
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 子用例编辑弹窗 */}
      <Dialog open={editingSubcaseIndex !== null} onOpenChange={(open) => !open && setEditingSubcaseIndex(null)}>
        <DialogContent className="max-w-[90vw] w-full sm:max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>编辑子用例 - {editingCase?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            {editingSubcaseIndex !== null && editingCase && (
              <SubcaseEditor
                parentCaseName={editingCase.name}
                subCommands={editingCase.commands[editingSubcaseIndex]?.subCommands || []}
                onSubCommandsChange={(subCommands) => {
                  const updatedCommands = [...editingCase.commands];
                  updatedCommands[editingSubcaseIndex] = {
                    ...updatedCommands[editingSubcaseIndex],
                    subCommands
                  };
                  setEditingCase({ ...editingCase, commands: updatedCommands });
                  
                  // 同时更新主状态
                  const updatedTestCases = testCases.map(tc => 
                    tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                  );
                  setTestCases(updatedTestCases);
                }}
                onClose={() => setEditingSubcaseIndex(null)}
                allTestCases={testCases.map(tc => ({
                  id: tc.id,  
                  uniqueId: tc.uniqueId,
                  name: tc.name
                }))}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 单个命令编辑弹窗 */}
      <Dialog open={editingCommandIndex !== null} onOpenChange={(open) => !open && setEditingCommandIndex(null)}>
        <DialogContent className="max-w-[90vw] w-full sm:max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>编辑命令设置</DialogTitle>
            <DialogDescription>
              配置命令的参数和验证设置
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            {editingCommandIndex !== null && editingCase && (
              <div className="space-y-4">
                {(() => {
                  const command = editingCase.commands[editingCommandIndex];
                  return (
                    <>
                       {/* 命令类型选择 */}
                       <div>
                         <Label className="text-sm font-medium">命令类型</Label>
                         <Select
                           value={command.type}
                           onValueChange={(value: 'execution' | 'urc') => {
                             const updatedCommands = [...editingCase.commands];
                             updatedCommands[editingCommandIndex] = {
                               ...updatedCommands[editingCommandIndex],
                               type: value,
                               // 根据类型设置默认值
                               ...(value === 'urc' && {
                                 urcPattern: updatedCommands[editingCommandIndex].urcPattern || '+CREG:',
                                 command: updatedCommands[editingCommandIndex].command || '+CREG:'
                               }),
                               ...(value === 'execution' && {
                                 command: updatedCommands[editingCommandIndex].command || 'AT'
                               })
                             };
                             setEditingCase({ ...editingCase, commands: updatedCommands });
                             
                             const updatedTestCases = testCases.map(tc => 
                               tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                             );
                             setTestCases(updatedTestCases);
                           }}
                         >
                           <SelectTrigger className="bg-background">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="bg-background border shadow-md z-50">
                             <SelectItem value="execution">
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-primary rounded-full"></div>
                                 <span>AT命令执行</span>
                               </div>
                             </SelectItem>
                             <SelectItem value="urc">
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-destructive rounded-full"></div>
                                 <span>URC消息监听</span>
                               </div>
                             </SelectItem>
                           </SelectContent>
                         </Select>
                         <p className="text-xs text-muted-foreground mt-1">
                           {command.type === 'execution' 
                             ? '执行AT命令并等待响应' 
                             : '监听并解析URC（主动上报）消息'
                           }
                         </p>
                       </div>

                       <div>
                         <Label className="text-sm font-medium">
                           {command.type === 'execution' ? '命令内容' : 'URC模式'}
                         </Label>
                         <Input
                           value={command.command}
                           onChange={(e) => {
                             const updatedCommands = [...editingCase.commands];
                             updatedCommands[editingCommandIndex] = {
                               ...updatedCommands[editingCommandIndex],
                               command: e.target.value
                             };
                             setEditingCase({ ...editingCase, commands: updatedCommands });
                             
                             // 同时更新主状态
                             const updatedTestCases = testCases.map(tc => 
                               tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                             );
                             setTestCases(updatedTestCases);
                           }}
                           placeholder={
                             command.type === 'execution' 
                               ? "例如: AT+CREG? 或 AT+CSQ" 
                               : "例如: +CREG: 或 +CSQ:"
                           }
                           className="font-mono bg-muted/30"
                         />
                         <p className="text-xs text-muted-foreground mt-1">
                           {command.type === 'execution' 
                             ? '要发送的AT命令，不需要包含换行符' 
                             : '要匹配的URC消息模式，支持部分匹配'
                           }
                         </p>
                       </div>

                       {/* URC特有配置 */}
                       {command.type === 'urc' && (
                         <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                             <Label className="text-sm font-medium text-orange-700 dark:text-orange-300">URC监听配置</Label>
                           </div>
                           
                           <div>
                             <Label className="text-sm font-medium">精确匹配模式</Label>
                             <Input
                               value={command.urcPattern || ''}
                               onChange={(e) => {
                                 const updatedCommands = [...editingCase.commands];
                                 updatedCommands[editingCommandIndex] = {
                                   ...updatedCommands[editingCommandIndex],
                                   urcPattern: e.target.value
                                 };
                                 setEditingCase({ ...editingCase, commands: updatedCommands });
                                 
                                 const updatedTestCases = testCases.map(tc => 
                                   tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                                 );
                                 setTestCases(updatedTestCases);
                               }}
                               placeholder="例如: +CREG: 2,1 或完整的URC消息"
                               className="font-mono bg-background"
                             />
                             <p className="text-xs text-muted-foreground mt-1">
                               留空则使用上方的URC模式进行匹配，填写则进行精确匹配
                             </p>
                           </div>

                           <div>
                             <Label className="text-sm font-medium">数据解析类型</Label>
                             <Select
                               value={command.dataParseConfig?.parseType || 'contains'}
                               onValueChange={(value: 'contains' | 'exact' | 'regex' | 'split' | 'json') => {
                                 const updatedCommands = [...editingCase.commands];
                                 updatedCommands[editingCommandIndex] = {
                                   ...updatedCommands[editingCommandIndex],
                                   dataParseConfig: {
                                     parseType: value,
                                     parsePattern: command.dataParseConfig?.parsePattern || '',
                                     parameterMap: command.dataParseConfig?.parameterMap || {}
                                   }
                                 };
                                 setEditingCase({ ...editingCase, commands: updatedCommands });
                                 
                                 const updatedTestCases = testCases.map(tc => 
                                   tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                                 );
                                 setTestCases(updatedTestCases);
                               }}
                             >
                               <SelectTrigger className="bg-background">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent className="bg-background border shadow-md z-50">
                                 <SelectItem value="contains">包含匹配</SelectItem>
                                 <SelectItem value="exact">精确匹配</SelectItem>
                                 <SelectItem value="regex">正则表达式</SelectItem>
                                 <SelectItem value="split">分割解析</SelectItem>
                                 <SelectItem value="json">JSON解析</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>

                           <div>
                             <Label className="text-sm font-medium">解析模式</Label>
                             <Input
                               value={command.dataParseConfig?.parsePattern || ''}
                               onChange={(e) => {
                                 const updatedCommands = [...editingCase.commands];
                                 updatedCommands[editingCommandIndex] = {
                                   ...updatedCommands[editingCommandIndex],
                                   dataParseConfig: {
                                     parseType: command.dataParseConfig?.parseType || 'contains',
                                     parsePattern: e.target.value,
                                     parameterMap: command.dataParseConfig?.parameterMap || {}
                                   }
                                 };
                                 setEditingCase({ ...editingCase, commands: updatedCommands });
                                 
                                 const updatedTestCases = testCases.map(tc => 
                                   tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                                 );
                                 setTestCases(updatedTestCases);
                               }}
                               placeholder={
                                 command.dataParseConfig?.parseType === 'regex' 
                                   ? '例如: \\+CREG: (\\d+),(\\d+) 捕获状态和信号'
                                   : command.dataParseConfig?.parseType === 'split'
                                   ? '例如: , 按逗号分割'
                                   : '留空则匹配整行内容'
                               }
                               className="font-mono bg-background"
                             />
                             <p className="text-xs text-muted-foreground mt-1">
                               定义如何从URC消息中提取数据参数
                             </p>
                           </div>
                         </div>
                       )}

                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Label className="text-sm font-medium">验证方式</Label>
                           <Select
                             value={command.validationMethod}
                             onValueChange={(value: any) => {
                               const updatedCommands = [...editingCase.commands];
                               updatedCommands[editingCommandIndex] = {
                                 ...updatedCommands[editingCommandIndex],
                                 validationMethod: value
                               };
                               setEditingCase({ ...editingCase, commands: updatedCommands });
                               
                               const updatedTestCases = testCases.map(tc => 
                                 tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                               );
                               setTestCases(updatedTestCases);
                             }}
                           >
                             <SelectTrigger className="bg-background">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="bg-background border shadow-md z-50">
                               <SelectItem value="none">无验证</SelectItem>
                               <SelectItem value="contains">包含</SelectItem>
                               <SelectItem value="equals">完全匹配</SelectItem>
                               <SelectItem value="regex">正则表达式</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         <div>
                           <Label className="text-sm font-medium">等待时间(ms)</Label>
                           <Input
                             type="number"
                             value={command.waitTime}
                             onChange={(e) => {
                               const updatedCommands = [...editingCase.commands];
                               updatedCommands[editingCommandIndex] = {
                                 ...updatedCommands[editingCommandIndex],
                                 waitTime: Number(e.target.value)
                               };
                               setEditingCase({ ...editingCase, commands: updatedCommands });
                               
                               const updatedTestCases = testCases.map(tc => 
                                 tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                               );
                               setTestCases(updatedTestCases);
                             }}
                             className="text-center bg-muted/30"
                           />
                         </div>
                       </div>

                       <div>
                         <Label className="text-sm font-medium">换行符</Label>
                         <Select
                           value={command.lineEnding}
                           onValueChange={(value: any) => {
                             const updatedCommands = [...editingCase.commands];
                             updatedCommands[editingCommandIndex] = {
                               ...updatedCommands[editingCommandIndex],
                               lineEnding: value
                             };
                             setEditingCase({ ...editingCase, commands: updatedCommands });
                             
                             const updatedTestCases = testCases.map(tc => 
                               tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                             );
                             setTestCases(updatedTestCases);
                           }}
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
                           onCheckedChange={(checked) => {
                             const updatedCommands = [...editingCase.commands];
                             updatedCommands[editingCommandIndex] = {
                               ...updatedCommands[editingCommandIndex],
                               stopOnFailure: checked
                             };
                             setEditingCase({ ...editingCase, commands: updatedCommands });
                             
                             const updatedTestCases = testCases.map(tc => 
                               tc.id === editingCase.id ? { ...editingCase, commands: updatedCommands } : tc
                             );
                             setTestCases(updatedTestCases);
                           }}
                         />
                       </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
              取消
            </Button>
            <Button onClick={() => setEditingCommandIndex(null)}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};