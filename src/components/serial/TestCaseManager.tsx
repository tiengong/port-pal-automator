import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { eventBus, EVENTS } from '@/lib/eventBus';
import { useToast } from "@/hooks/use-toast"
import { useExecutionLogs } from '@/hooks/useExecutionLogs';

interface TestCase {
  id: string;
  name: string;
  description: string;
  runCount: number;
  commands: Command[];
  isRunning: boolean;
  lastRunTime: Date | null;
}

interface Command {
  id: string;
  type: 'execution' | 'urc';
  selected: boolean;
  command: string;
  urcPattern: string;
  format: 'ascii' | 'hex';
  lineEnding: 'none' | 'lf' | 'cr' | 'crlf';
  targetPort: 'ALL' | 'P1' | 'P2';
  waitTime: number;
}

interface TestCaseManagerProps {
  connectedPorts: any[];
  receivedData: string[];
  executionLogs: ReturnType<typeof import('@/hooks/useExecutionLogs').useExecutionLogs>;
}

export const TestCaseManager: React.FC<TestCaseManagerProps> = ({ 
  connectedPorts, 
  receivedData,
  executionLogs 
}) => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [commandType, setCommandType] = useState<'execution' | 'urc'>('execution');
  const [newCommand, setNewCommand] = useState('');
  const [newURCPattern, setNewURCPattern] = useState('');
  const [executingCommand, setExecutingCommand] = useState<{ caseId: string | null, commandIndex: number | null }>({ caseId: null, commandIndex: null });
  const { toast } = useToast();

  useEffect(() => {
    const savedTestCases = localStorage.getItem('testCases');
    if (savedTestCases) {
      setTestCases(JSON.parse(savedTestCases));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('testCases', JSON.stringify(testCases));
  }, [testCases]);

  const createTestCase = () => {
    if (!newCaseName.trim()) {
      executionLogs.addLog('error', '用例名称不能为空', '请填写用例名称');
      return;
    }

    const newTestCase: TestCase = {
      id: Date.now().toString(),
      name: newCaseName,
      description: newCaseDescription,
      runCount: 1,
      commands: [],
      isRunning: false,
      lastRunTime: null,
    };
    setTestCases([...testCases, newTestCase]);
    setNewCaseName('');
    setNewCaseDescription('');
  };

  const deleteTestCase = (caseId: string) => {
    setTestCases(testCases.filter(tc => tc.id !== caseId));
    setSelectedCaseId(null);
  };

  const selectTestCase = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const addCommand = () => {
    if (!selectedCaseId) {
      executionLogs.addLog('error', '请选择测试用例', '请先选择一个测试用例');
      return;
    }

    if (commandType === 'execution' && !newCommand.trim()) {
      executionLogs.addLog('error', '命令不能为空', '请填写命令');
      return;
    }

    if (commandType === 'urc' && !newURCPattern.trim()) {
      executionLogs.addLog('error', 'URC Pattern 不能为空', '请填写 URC Pattern');
      return;
    }

    const newCommandItem: Command = {
      id: Date.now().toString(),
      type: commandType,
      selected: true,
      command: newCommand,
      urcPattern: newURCPattern,
      format: 'ascii',
      lineEnding: 'crlf',
      targetPort: 'ALL',
      waitTime: 1000,
    };

    const updatedTestCases = testCases.map(tc =>
      tc.id === selectedCaseId ? { ...tc, commands: [...tc.commands, newCommandItem] } : tc
    );
    setTestCases(updatedTestCases);
    setNewCommand('');
    setNewURCPattern('');
  };

  const updateCommand = (caseId: string, commandId: string, updatedFields: Partial<Command>) => {
    const updatedTestCases = testCases.map(tc =>
      tc.id === caseId
        ? {
            ...tc,
            commands: tc.commands.map(cmd =>
              cmd.id === commandId ? { ...cmd, ...updatedFields } : cmd
            ),
          }
        : tc
    );
    setTestCases(updatedTestCases);
  };

  const deleteCommand = (caseId: string, commandId: string) => {
    const updatedTestCases = testCases.map(tc =>
      tc.id === caseId
        ? { ...tc, commands: tc.commands.filter(cmd => cmd.id !== commandId) }
        : tc
    );
    setTestCases(updatedTestCases);
  };

  const updateCase = (caseId: string, updatedFields: Partial<TestCase>) => {
    const updatedTestCases = testCases.map(tc =>
      tc.id === caseId ? { ...tc, ...updatedFields } : tc
    );
    setTestCases(updatedTestCases);
  };

  const findTestCaseById = (caseId: string) => {
    return testCases.find(tc => tc.id === caseId);
  };

  const updateCaseById = (testCases: TestCase[], caseId: string, updateFunction: (testCase: TestCase) => TestCase) => {
    return testCases.map(tc =>
      tc.id === caseId ? updateFunction(tc) : tc
    );
  };

  const executeTestCase = async (caseId: string) => {
    const testCase = findTestCaseById(caseId);
    if (!testCase) return;
    
    executionLogs.addLog('info', `开始执行测试用例: ${testCase.name}`);

    try {
      const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: true,
        lastRunTime: new Date()
      }));
      setTestCases(updatedTestCases);

      for (let run = 0; run < testCase.runCount; run++) {
        if (testCase.runCount > 1) {
          executionLogs.addLog('info', `执行第 ${run + 1}/${testCase.runCount} 次`);
        }

        for (const command of testCase.commands.filter(cmd => cmd.selected)) {
          const currentTestCase = findTestCaseById(caseId);
          if (!currentTestCase?.isRunning) {
            setExecutingCommand({ caseId: null, commandIndex: null });
            executionLogs.addLog('warning', '测试用例执行已暂停');
            return;
          }

          const commandIndex = testCase.commands.indexOf(command);
          await runCommand(caseId, commandIndex);
          
          if (command.waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, command.waitTime));
          }
        }
      }

      setExecutingCommand({ caseId: null, commandIndex: null });
      const finalTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        lastRunTime: new Date()
      }));
      setTestCases(finalTestCases);

      executionLogs.addLog('success', `测试用例 "${testCase.name}" 执行完成`, `共执行 ${testCase.runCount} 次`);
    } catch (error) {
      setExecutingCommand({ caseId: null, commandIndex: null });
      const errorTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        lastRunTime: new Date()
      }));
      setTestCases(errorTestCases);
      
      executionLogs.addLog('error', `测试用例 "${testCase.name}" 执行失败`, error instanceof Error ? error.message : '未知错误');
    }
  };

  const runCommand = async (caseId: string, commandIndex: number) => {
    const targetCase = findTestCaseById(caseId);
    if (!targetCase) return;
    
    const command = targetCase.commands[commandIndex];
    
    setExecutingCommand({ caseId, commandIndex });
    
    if (command.type === 'execution') {
      const substitutedCommand = command.command;
      
      const sendEvent = {
        command: substitutedCommand,
        format: command.format || 'ascii',
        lineEnding: command.lineEnding || 'crlf',
        targetPort: command.targetPort || 'ALL'  
      };
      
      eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
      
      executionLogs.addLog('info', `执行命令: ${substitutedCommand}`, `步骤 ${commandIndex + 1}`);
    } else if (command.type === 'urc') {
      executionLogs.addLog('info', `激活URC监听: ${command.urcPattern}`, `步骤 ${commandIndex + 1}`);
    }
    
    setTimeout(() => {
      setExecutingCommand({ caseId: null, commandIndex: null });
    }, command.waitTime || 1000);
  };

  const stopTestCase = (caseId: string) => {
    updateCase(caseId, { isRunning: false });
    setExecutingCommand({ caseId: null, commandIndex: null });
    executionLogs.addLog('warning', `测试用例 "${findTestCaseById(caseId)?.name}" 已停止`);
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4 flex-grow">
        <CardHeader>
          <CardTitle>测试用例</CardTitle>
          <CardDescription>创建和管理测试用例</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <div className="mb-4">
            <div className="grid gap-2 mb-2">
              <Label htmlFor="case-name">名称</Label>
              <Input
                id="case-name"
                placeholder="测试用例名称"
                value={newCaseName}
                onChange={(e) => setNewCaseName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="case-description">描述</Label>
              <Input
                id="case-description"
                placeholder="测试用例描述"
                value={newCaseDescription}
                onChange={(e) => setNewCaseDescription(e.target.value)}
              />
            </div>
            <Button className="mt-4 w-full" onClick={createTestCase}>创建测试用例</Button>
          </div>

          <ScrollArea className="rounded-md border h-64 mb-4">
            <div className="p-4">
              {testCases.map((testCase) => (
                <div
                  key={testCase.id}
                  className={`p-2 rounded-md mb-2 cursor-pointer ${selectedCaseId === testCase.id ? 'bg-secondary' : 'hover:bg-accent'
                    }`}
                  onClick={() => selectTestCase(testCase.id)}
                >
                  {testCase.name}
                </div>
              ))}
            </div>
          </ScrollArea>

          {selectedCaseId && (
            <Button variant="destructive" onClick={() => deleteTestCase(selectedCaseId)}>
              删除测试用例
            </Button>
          )}
        </CardContent>
      </Card>

      {selectedCaseId && (
        <Card className="flex-grow">
          <CardHeader>
            <CardTitle>命令</CardTitle>
            <CardDescription>为测试用例添加和管理命令</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="mb-4">
              <Select value={commandType} onValueChange={(value) => setCommandType(value as 'execution' | 'urc')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择命令类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="execution">执行命令</SelectItem>
                  <SelectItem value="urc">URC监听</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {commandType === 'execution' && (
              <div className="grid gap-2 mb-4">
                <Label htmlFor="command">命令</Label>
                <Input
                  id="command"
                  placeholder="要执行的命令"
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                />
              </div>
            )}

            {commandType === 'urc' && (
              <div className="grid gap-2 mb-4">
                <Label htmlFor="urc-pattern">URC Pattern</Label>
                <Input
                  id="urc-pattern"
                  placeholder="URC Pattern"
                  value={newURCPattern}
                  onChange={(e) => setNewURCPattern(e.target.value)}
                />
              </div>
            )}

            <Button className="w-full" onClick={addCommand}>添加命令</Button>

            <div className="mt-4">
              <ScrollArea className="rounded-md border h-64">
                <div className="p-4">
                  {testCases
                    .find((tc) => tc.id === selectedCaseId)
                    ?.commands.map((command, index) => (
                      <div
                        key={command.id}
                        className={`p-2 rounded-md mb-2 border ${executingCommand.caseId === selectedCaseId && executingCommand.commandIndex === index ? 'bg-primary/50 border-primary' : 'border-muted-foreground/20'}`}
                      >
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`command-selected-${command.id}`} className="cursor-pointer">
                            <div className="flex items-center">
                              <Checkbox
                                id={`command-selected-${command.id}`}
                                checked={Boolean(command.selected)}
                                onCheckedChange={(checked) =>
                                  updateCommand(selectedCaseId, command.id, { selected: Boolean(checked) })
                                }
                                className="mr-2"
                              />
                              {command.type === 'execution' ? command.command : `URC: ${command.urcPattern}`}
                            </div>
                          </Label>
                          <Button variant="ghost" size="sm" onClick={() => deleteCommand(selectedCaseId, command.id)}>
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            <div className="mt-4 flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const selectedCase = testCases.find((tc) => tc.id === selectedCaseId);
                  if (selectedCase) {
                    updateCase(selectedCaseId, { isRunning: !selectedCase.isRunning });
                    if (!selectedCase.isRunning) {
                      executeTestCase(selectedCaseId);
                    } else {
                      stopTestCase(selectedCaseId);
                    }
                  }
                }}
                disabled={testCases.find((tc) => tc.id === selectedCaseId)?.isRunning === true && executingCommand.caseId !== selectedCaseId}
              >
                {testCases.find((tc) => tc.id === selectedCaseId)?.isRunning ? '停止测试' : '运行测试'}
              </Button>
              <Input
                type="number"
                className="w-24 text-center"
                value={testCases.find((tc) => tc.id === selectedCaseId)?.runCount || 1}
                onChange={(e) => {
                  const runCount = parseInt(e.target.value);
                  if (!isNaN(runCount) && runCount > 0) {
                    updateCase(selectedCaseId, { runCount: runCount });
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
