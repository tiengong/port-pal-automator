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
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from './types';

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
  
  // 参数存储系统 - 用于URC解析的参数
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: string }>({});
  
  // 子用例展开状态管理
  const [expandedSubcases, setExpandedSubcases] = useState<Set<string>>(new Set());

  // 切换子用例展开状态
  const toggleSubcaseExpansion = (commandId: string) => {
    setExpandedSubcases(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(commandId)) {
        newExpanded.delete(commandId);
      } else {
        newExpanded.add(commandId);
      }
      return newExpanded;
    });
  };

  // 获取引用的测试用例
  const getReferencedCase = (referencedCaseId: string): TestCase | null => {
    return findTestCaseById(referencedCaseId);
  };

  // 更新命令选中状态
  const updateCommandSelection = (commandId: string, selected: boolean) => {
    if (!currentTestCase) return;
    
    const updatedCommands = currentTestCase.commands.map(cmd =>
      cmd.id === commandId ? { ...cmd, selected } : cmd
    );
    
    const updatedCase = { ...currentTestCase, commands: updatedCommands };
    const updatedTestCases = testCases.map(tc => 
      tc.id === currentTestCase.id ? updatedCase : tc
    );
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

  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases });

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
        />
      </div>

      {/* 3. 中间测试用例展示区 */}
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
              <div className="divide-y divide-border">
                {currentTestCase.commands.map((command, index) => (
                  <div key={command.id}>
                    {/* 主命令行 */}
                    <div className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* 复选框 */}
                        <Checkbox
                          checked={command.selected}
                          onCheckedChange={(checked) => updateCommandSelection(command.id, checked as boolean)}
                          className="flex-shrink-0"
                        />
                        
                        {/* 命令编号 */}
                        <div className="flex items-center justify-center w-8 h-6 bg-primary/10 text-primary rounded-full text-xs font-medium flex-shrink-0">
                          {formatCommandIndex(index)}
                        </div>
                        
                        {/* 展开/收起图标（仅子用例显示） */}
                        {command.type === 'subcase' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => toggleSubcaseExpansion(command.id)}
                          >
                            {expandedSubcases.has(command.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        
                        {/* 命令内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm truncate">
                              {command.command}
                            </span>
                            
                            {/* 命令类型标识 */}
                            <Badge 
                              variant={command.type === 'subcase' ? 'secondary' : 'outline'} 
                              className="text-xs flex-shrink-0"
                            >
                              {command.type === 'execution' ? 'AT' : 
                               command.type === 'urc' ? 'URC' : '子用例'}
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
                          {command.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {command.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                          {command.status === 'running' && <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />}
                          
                          {/* 操作按钮 */}
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => runCommand(currentTestCase.id, index)}
                                    disabled={connectedPorts.length === 0}
                                  >
                                    <PlayCircle className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>单步执行</p>
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
                                    onClick={() => setEditingCommandIndex(index)}
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
                    </div>
                    
                    {/* 子用例展开内容 */}
                    {command.type === 'subcase' && expandedSubcases.has(command.id) && command.referencedCaseId && (
                      <div className="bg-muted/30 border-l-2 border-primary/30 ml-8">
                        {(() => {
                          const referencedCase = getReferencedCase(command.referencedCaseId);
                          if (!referencedCase) {
                            return (
                              <div className="p-3 text-sm text-muted-foreground">
                                找不到引用的测试用例: {command.referencedCaseId}
                              </div>
                            );
                          }
                          
                          return referencedCase.commands.map((subCmd, subIndex) => (
                            <div key={`${command.id}-${subCmd.id}`} className="p-2 border-b border-border/30 last:border-b-0">
                              <div className="flex items-center gap-3">
                                {/* 子命令编号 */}
                                <div className="flex items-center justify-center w-6 h-5 bg-primary/5 text-primary rounded text-xs font-medium flex-shrink-0">
                                  {formatCommandIndex(index, subIndex)}
                                </div>
                                
                                {/* 子命令内容 */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-xs truncate">
                                    {subCmd.command}
                                  </div>
                                  {subCmd.expectedResponse && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      期望: {subCmd.expectedResponse}
                                    </div>
                                  )}
                                </div>
                                
                                {/* 子命令状态 */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {subCmd.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                  {subCmd.status === 'failed' && <XCircle className="w-3 h-3 text-red-500" />}
                                  {subCmd.status === 'running' && <AlertCircle className="w-3 h-3 text-yellow-500 animate-pulse" />}
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. 测试用例切换区 */}
      <TestCaseSwitcher 
        testCases={testCases}
        currentTestCase={currentTestCase}
        onSelectTestCase={handleSelectTestCase}
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
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={() => {
                  const updatedTestCases = testCases.map(tc => 
                    tc.id === editingCase.id ? editingCase : tc
                  );
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑步骤</DialogTitle>
          </DialogHeader>
          
          {editingCommandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              <div>
                <Label>命令类型</Label>
                <Select 
                  value={currentTestCase.commands[editingCommandIndex].type}
                  onValueChange={(value: 'execution' | 'urc' | 'subcase') => {
                    const updatedCommands = [...currentTestCase.commands];
                    updatedCommands[editingCommandIndex] = {
                      ...updatedCommands[editingCommandIndex],
                      type: value
                    };
                    const updatedCase = { ...currentTestCase, commands: updatedCommands };
                    const updatedTestCases = testCases.map(tc => 
                      tc.id === currentTestCase.id ? updatedCase : tc
                    );
                    setTestCases(updatedTestCases);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="execution">执行命令</SelectItem>
                    <SelectItem value="urc">URC监听</SelectItem>
                    <SelectItem value="subcase">子用例</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>命令内容</Label>
                <Input
                  value={currentTestCase.commands[editingCommandIndex].command}
                  onChange={(e) => {
                    const updatedCommands = [...currentTestCase.commands];
                    updatedCommands[editingCommandIndex] = {
                      ...updatedCommands[editingCommandIndex],
                      command: e.target.value
                    };
                    const updatedCase = { ...currentTestCase, commands: updatedCommands };
                    const updatedTestCases = testCases.map(tc => 
                      tc.id === currentTestCase.id ? updatedCase : tc
                    );
                    setTestCases(updatedTestCases);
                  }}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
                  取消
                </Button>
                <Button onClick={() => setEditingCommandIndex(null)}>
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