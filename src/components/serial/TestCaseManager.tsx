import React, { useState, useEffect } from "react";
import { TestCaseHeader } from "./TestCaseHeader";
import { TestCaseActions } from "./TestCaseActions";
import { TestCaseSwitcher } from "./TestCaseSwitcher";
// import { SubcaseEditor } from "./SubcaseEditor"; // 暂时移除
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Play, TestTube2 } from "lucide-react";

// 接口定义
// Interfaces
export interface TestCommand {
  id: string;
  type: 'execution' | 'urc_listen' | 'subcase' | 'urc';
  command: string;
  expectedResponse?: string;
  validationMethod: 'contains' | 'equals' | 'regex' | 'none';
  validationPattern?: string;
  waitTime: number;
  status: 'pending' | 'running' | 'passed' | 'failed';
  subCommands?: TestCommand[];
  stopOnFailure?: boolean;
  lineEnding?: 'crlf' | 'lf' | 'cr';
  selected?: boolean;
  referencedCaseId?: string;
  urcPattern?: string;
}

export interface TestCase {
  id: string;
  uniqueId: string;
  name: string;
  description: string;
  isExpanded: boolean;
  isRunning: boolean;
  currentCommand: number;
  selected: boolean;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'paused';
  subCases: TestCase[];
  commands: TestCommand[];
}

interface TestCaseManagerProps {
  connectedPorts: Array<{
    port: any;
    params: {
      baudRate: number;
      dataBits: number;
      parity: string;
      stopBits: number;
    };
  }>;
  receivedData: string[];
}

export const TestCaseManager: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData
}) => {
  const { toast } = useToast();
  
  // 状态管理
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubcaseIndex, setEditingSubcaseIndex] = useState<number | null>(null);
  const [nextUniqueId, setNextUniqueId] = useState(1001);

  // 生成唯一编号
  const generateUniqueId = () => {
    const id = nextUniqueId.toString();
    setNextUniqueId(prev => prev + 1);
    return id;
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
            status: 'pending'
          },
          {
            id: 'cmd2',
            type: 'execution',
            command: 'AT+CGMR',
            expectedResponse: 'OK',
            validationMethod: 'contains',
            validationPattern: 'OK',
            waitTime: 3000,
            status: 'pending'
          }
        ]
      },
      {
        id: 'case2',
        uniqueId: '1002',
        name: '网络连接测试',
        description: '测试网络注册和连接功能',
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
            expectedResponse: '+CREG: 0,1',
            validationMethod: 'contains',
            validationPattern: '0,1',
            waitTime: 5000,
            status: 'pending'
          }
        ]
      }
    ];
    
    setTestCases(sampleTestCases);
    setSelectedCase(sampleTestCases[0]);
    setNextUniqueId(1003);
  }, []);

  // 运行测试用例
  const runTestCase = async (caseId: string) => {
    const testCase = testCases.find(tc => tc.id === caseId);
    if (!testCase) return;

    if (connectedPorts.length === 0) {
      toast({
        variant: "destructive",
        title: "连接错误",
        description: "请先连接串口设备"
      });
      return;
    }

    // 更新测试用例状态为运行中
    const updatedTestCases = testCases.map(tc => 
      tc.id === caseId 
        ? { ...tc, isRunning: true, status: 'running' as const, currentCommand: 0 }
        : tc
    );
    setTestCases(updatedTestCases);

    try {
      // 依次执行每个命令
      for (let i = 0; i < testCase.commands.length; i++) {
        await runCommand(caseId, i);
      }

      // 测试完成，更新状态
      const finalUpdatedCases = testCases.map(tc => 
        tc.id === caseId 
          ? { ...tc, isRunning: false, status: 'passed' as const, currentCommand: -1 }
          : tc
      );
      setTestCases(finalUpdatedCases);

      toast({
        title: "测试完成",
        description: `测试用例 "${testCase.name}" 执行完成`
      });

    } catch (error) {
      // 测试失败，更新状态
      const errorUpdatedCases = testCases.map(tc => 
        tc.id === caseId 
          ? { ...tc, isRunning: false, status: 'failed' as const, currentCommand: -1 }
          : tc
      );
      setTestCases(errorUpdatedCases);

      toast({
        variant: "destructive",
        title: "测试失败",
        description: error instanceof Error ? error.message : "测试执行过程中发生错误"
      });
    }
  };

  // 运行单个命令
  const runCommand = async (caseId: string, commandIndex: number): Promise<void> => {
    const testCase = testCases.find(tc => tc.id === caseId);
    if (!testCase || !testCase.commands[commandIndex]) return;

    const command = testCase.commands[commandIndex];

    // 更新命令状态为运行中
    const updatedTestCases = testCases.map(tc => 
      tc.id === caseId 
        ? {
            ...tc,
            commands: tc.commands.map((cmd, idx) => 
              idx === commandIndex 
                ? { ...cmd, status: 'running' as const }
                : cmd
            )
          }
        : tc
    );
    setTestCases(updatedTestCases);

    // 模拟命令执行
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 更新命令状态为成功
    const successUpdatedCases = testCases.map(tc => 
      tc.id === caseId 
        ? {
            ...tc,
            commands: tc.commands.map((cmd, idx) => 
              idx === commandIndex 
                ? { ...cmd, status: 'passed' as const }
                : cmd
            )
          }
        : tc
    );
    setTestCases(successUpdatedCases);
  };

  // 文件操作函数
  const handleSyncTestCases = () => {
    toast({
      title: "同步测试用例",
      description: "正在同步测试用例数据...",
    });
  };

  const handleUploadTestCases = () => {
    toast({
      title: "上传测试用例",
      description: "正在上传测试用例到服务器...",
    });
  };

  const handleDownloadTestCases = () => {
    toast({
      title: "下载测试用例",
      description: "正在从服务器下载测试用例...",
    });
  };

  const currentTestCase = selectedCase;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 模块1: 当前测试用例信息显示 */}
      <TestCaseHeader currentTestCase={currentTestCase} />

      {/* 模块2: 操作栏 */}
      <TestCaseActions
        currentTestCase={currentTestCase}
        connectedPorts={connectedPorts}
        onRunTestCase={runTestCase}
        onStopTestCase={(caseId) => {
          toast({ title: "停止测试", description: "测试已停止" });
        }}
        onPauseTestCase={(caseId) => {
          toast({ title: "暂停测试", description: "测试已暂停" });
        }}
        onResetTestCase={(caseId) => {
          toast({ title: "重置测试", description: "测试状态已重置" });
        }}
        onEditTestCase={(testCase) => {
          setEditingCase(testCase);
          setIsEditDialogOpen(true);
        }}
        onAddCommand={() => {
          toast({ title: "添加命令", description: "请在测试用例展示区添加命令" });
        }}
        onAddSubcase={() => {
          toast({ title: "添加子用例", description: "请在测试用例展示区添加子用例" });
        }}
        onSyncTestCases={handleSyncTestCases}
        onUploadTestCases={handleUploadTestCases}
        onDownloadTestCases={handleDownloadTestCases}
      />

      {/* 模块3: 中间测试用例展示区 */}
      <div className="flex-1 overflow-hidden">
        {currentTestCase ? (
          <div className="h-full p-4 overflow-y-auto">
            <div className="space-y-3">
              {currentTestCase.commands.map((command, index) => (
                <Card 
                  key={command.id}
                  className={`transition-all cursor-pointer ${
                    command.status === 'running' ? 'ring-2 ring-warning shadow-warning/20' :
                    command.status === 'passed' ? 'border-success shadow-success/10' :
                    command.status === 'failed' ? 'border-destructive shadow-destructive/10' :
                    'hover:shadow-md'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {index + 1}
                        </Badge>
                        <span className="font-mono text-sm">{command.command}</span>
                        {command.status && (
                          <Badge 
                            variant={command.status === 'passed' ? 'default' : 
                                   command.status === 'failed' ? 'destructive' : 'outline'}
                            className={`text-xs ${
                              command.status === 'running' ? 'bg-warning/10 text-warning border-warning/20' : ''
                            }`}
                          >
                            {command.status === 'running' ? '运行中' : 
                             command.status === 'passed' ? '通过' :
                             command.status === 'failed' ? '失败' : '待执行'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => runCommand(currentTestCase.id, index)}
                          disabled={connectedPorts.length === 0}
                          variant="outline"
                          size="sm"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {command.expectedResponse && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        期望响应: {command.expectedResponse}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {currentTestCase.commands.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <TestTube2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">该测试用例暂无命令</p>
                    <p className="text-xs text-muted-foreground mt-1">点击操作栏的"添加"按钮来添加命令</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center text-muted-foreground">
              <TestTube2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">暂无测试用例</h3>
              <p className="text-sm">请先创建或选择一个测试用例</p>
            </div>
          </div>
        )}
      </div>

      {/* 模块4: 测试用例切换区 */}
      <TestCaseSwitcher
        currentTestCase={currentTestCase}
        testCases={testCases}
        onSelectTestCase={(testCase) => {
          setSelectedCase(testCase);
        }}
      />

      {/* 测试用例编辑弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑测试用例</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="case-name">用例名称</Label>
              <Input
                id="case-name"
                value={editingCase?.name || ''}
                onChange={(e) => {
                  if (editingCase) {
                    const updatedCase = { ...editingCase, name: e.target.value };
                    setEditingCase(updatedCase);
                  }
                }}
                placeholder="输入用例名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-description">用例描述</Label>
              <Textarea
                id="case-description"
                value={editingCase?.description || ''}
                onChange={(e) => {
                  if (editingCase) {
                    const updatedCase = { ...editingCase, description: e.target.value };
                    setEditingCase(updatedCase);
                  }
                }}
                placeholder="输入用例描述"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (editingCase) {
                  const updatedTestCases = testCases.map(tc => 
                    tc.id === editingCase.id ? editingCase : tc
                  );
                  setTestCases(updatedTestCases);
                  if (selectedCase?.id === editingCase.id) {
                    setSelectedCase(editingCase);
                  }
                }
                setIsEditDialogOpen(false);
              }}
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 子用例编辑弹窗 - 暂时简化 */}
      <Dialog open={editingSubcaseIndex !== null} onOpenChange={(open) => !open && setEditingSubcaseIndex(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑子用例</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-muted-foreground">子用例编辑功能正在开发中...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};