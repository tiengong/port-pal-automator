import React from "react";
import { TestCase, TestCommand, ExecutionResult } from "../types";
import { eventBus, EVENTS, SendCommandEvent } from "@/lib/eventBus";
import { substituteVariables } from "../utils/urcUtils";
import { findTestCaseById, updateCaseById, isStatsCase } from "../utils/testCaseUtils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface TestCaseExecutorProps {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  executionResults: ExecutionResult[];
  setExecutionResults: (results: ExecutionResult[]) => void;
  executingCommand: { caseId: string | null; commandIndex: number | null };
  setExecutingCommand: (cmd: { caseId: string | null; commandIndex: number | null }) => void;
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  setStoredParameters: (params: { [key: string]: { value: string; timestamp: number } }) => void;
  runningCasesRef: React.MutableRefObject<Set<string>>;
  onRunComplete?: (result: any) => void;
}

export const TestCaseExecutor: React.FC<TestCaseExecutorProps> = ({
  testCases,
  setTestCases,
  executionResults,
  setExecutionResults,
  executingCommand,
  setExecutingCommand,
  storedParameters,
  setStoredParameters,
  runningCasesRef,
  onRunComplete
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  // 执行单个命令
  const executeCommand = async (
    testCase: TestCase,
    command: TestCommand,
    commandIndex: number
  ): Promise<ExecutionResult> => {
    const startTime = Date.now();
    
    try {
      setExecutingCommand({ caseId: testCase.id, commandIndex });

      if (command.type === 'execution') {
        // 变量替换
        const substitutedCommand = substituteVariables(command.command, storedParameters);
        
        // 发送命令到串口
        const sendEvent: SendCommandEvent = {
          command: substitutedCommand,
          format: 'utf8',
          lineEnding: command.lineEnding || 'crlf',
          targetPort: 'ALL'
        };
        
        eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
        
        // 等待命令执行完成
        await new Promise(resolve => setTimeout(resolve, command.waitTime || 1000));
        
        return {
          commandId: command.id,
          success: true,
          actualResponse: 'Command executed',
          responseTime: Date.now() - startTime
        };
      } else if (command.type === 'urc') {
        // URC 命令处理
        return {
          commandId: command.id,
          success: true,
          actualResponse: 'URC listener started',
          responseTime: Date.now() - startTime
        };
      }
      
      return {
        commandId: command.id,
        success: false,
        actualResponse: 'Unknown command type',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        commandId: command.id,
        success: false,
        actualResponse: (error as Error).message,
        responseTime: Date.now() - startTime
      };
    } finally {
      setExecutingCommand({ caseId: null, commandIndex: null });
    }
  };

  // 执行测试用例
  const executeTestCase = async (testCaseId: string): Promise<void> => {
    if (runningCasesRef.current.has(testCaseId)) {
      toast({
        title: t("testCase.alreadyRunning"),
        description: t("testCase.alreadyRunningDesc"),
        variant: "destructive"
      });
      return;
    }

    const testCase = findTestCaseById(testCaseId, testCases);
    if (!testCase) {
      toast({
        title: t("testCase.notFound"),
        description: t("testCase.notFoundDesc"),
        variant: "destructive"
      });
      return;
    }

    // 跳过统计用例的执行
    if (isStatsCase(testCase)) {
      toast({
        title: t("testCase.skipStats"),
        description: t("testCase.skipStatsDesc"),
        variant: "default"
      });
      return;
    }

    runningCasesRef.current.add(testCaseId);
    
    // 更新测试用例状态为运行中
    const updatedTestCases = updateCaseById(testCases, testCaseId, (tc) => ({
      ...tc,
      isRunning: true,
      status: 'running' as const
    }));
    setTestCases(updatedTestCases);

    const results: ExecutionResult[] = [];
    let allSuccess = true;

    try {
      // 执行所有命令
      for (let i = 0; i < testCase.commands.length; i++) {
        const command = testCase.commands[i];
        
        if (command.selected) {
          const result = await executeCommand(testCase, command, i);
          results.push(result);
          
          if (!result.success) {
            allSuccess = false;
            // 根据失败处理策略决定是否继续
            if (command.failureHandling === 'stop') {
              break;
            }
          }
        }
      }

      // 执行子用例
      for (const subCase of testCase.subCases) {
        if (subCase.selected) {
          await executeTestCase(subCase.id);
        }
      }

      // 更新执行结果
      setExecutionResults([...executionResults, ...results]);
      
      // 调用完成回调
      if (onRunComplete) {
        onRunComplete({
          testCaseId,
          success: allSuccess,
          results,
          executionTime: results.reduce((sum, r) => sum + r.responseTime, 0)
        });
      }

    } catch (error) {
      console.error('Test case execution error:', error);
      toast({
        title: t("testCase.executionFailed"),
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      runningCasesRef.current.delete(testCaseId);
      
      // 更新测试用例状态
      const finalUpdatedTestCases = updateCaseById(testCases, testCaseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: allSuccess ? 'success' as const : 'failed' as const
      }));
      setTestCases(finalUpdatedTestCases);
    }
  };

  return null; // This is a headless component
};