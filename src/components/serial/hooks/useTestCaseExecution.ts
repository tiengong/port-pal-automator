// useTestCaseExecution.ts - Extract execution logic from TestCaseManager
import { useState, useCallback } from 'react';
import { TestCase, TestCommand, ExecutionResult } from '../types';
import { eventBus, EVENTS, SendCommandEvent } from '@/lib/eventBus';

interface ExecutionOptions {
  onStatusUpdate?: (message: string, type: 'info' | 'warning' | 'error') => void;
  onCommandUpdate?: (caseId: string, commandIndex: number, updates: Partial<TestCommand>) => void;
  onCaseUpdate?: (caseId: string, updates: Partial<TestCase>) => void;
}

export const useTestCaseExecution = (options: ExecutionOptions = {}) => {
  const [runningCases, setRunningCases] = useState<Set<string>>(new Set());
  const [executionResults, setExecutionResults] = useState<{ [commandId: string]: ExecutionResult }>({});

  // Determine if execution should stop based on command failure and case strategy
  const shouldStopOnFailure = useCallback((
    command: TestCommand, 
    testCase: TestCase, 
    commandResult: ExecutionResult
  ): boolean => {
    const severity = command.failureSeverity || 'error';
    const caseStrategy = testCase.failureStrategy || testCase.failureHandling || 'stop';
    
    // Check case-level strategy based on command severity
    if (severity === 'warning') {
      const warningStrategy = testCase.onWarningFailure || caseStrategy;
      return warningStrategy === 'stop';
    } else {
      const errorStrategy = testCase.onErrorFailure || caseStrategy;
      return errorStrategy === 'stop';
    }
  }, []);

  // Execute a single command with retry logic
  const executeCommand = useCallback(async (
    command: TestCommand,
    testCase: TestCase
  ): Promise<ExecutionResult> => {
    const maxAttempts = command.maxAttempts || 1;
    let lastResult: ExecutionResult | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      options.onStatusUpdate?.(
        `执行命令 (尝试 ${attempt}/${maxAttempts}): ${command.command}`,
        'info'
      );

      // Update command status to running
      options.onCommandUpdate?.(testCase.id, 
        testCase.commands.indexOf(command),
        { status: 'running' }
      );

      try {
        // Send command via event bus
        const sendEvent: SendCommandEvent = {
          command: command.command,
          lineEnding: command.lineEnding || 'crlf',
          format: command.dataFormat === 'hex' ? 'hex' : 'utf8'
        };

        eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);

        // Wait for response (simplified - in real implementation would listen for response)
        await new Promise(resolve => setTimeout(resolve, command.timeout || 5000));

        // For now, simulate success/failure based on some logic
        const success = Math.random() > 0.1; // 90% success rate for demo
        
        lastResult = {
          commandId: command.id,
          success,
          responseTime: Date.now(),
          actualResponse: success ? command.expectedResponse : 'ERROR',
          error: success ? undefined : 'Command failed'
        };

        if (success) {
          options.onStatusUpdate?.(
            `命令执行成功: ${command.command}`,
            'info'
          );
          options.onCommandUpdate?.(testCase.id,
            testCase.commands.indexOf(command),
            { status: 'success' }
          );
          break;
        } else {
          options.onStatusUpdate?.(
            `命令执行失败 (尝试 ${attempt}/${maxAttempts}): ${command.command}`,
            command.failureSeverity === 'warning' ? 'warning' : 'error'
          );
          
          if (attempt === maxAttempts) {
            options.onCommandUpdate?.(testCase.id,
              testCase.commands.indexOf(command),
              { status: 'failed' }
            );
          }
        }
      } catch (error) {
        lastResult = {
          commandId: command.id,
          success: false,
          responseTime: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        if (attempt === maxAttempts) {
          options.onCommandUpdate?.(testCase.id,
            testCase.commands.indexOf(command),
            { status: 'failed' }
          );
        }
      }

      // Wait between retries if not the last attempt
      if (attempt < maxAttempts && command.waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, command.waitTime));
      }
    }

    return lastResult!;
  }, [options]);

  // Execute a test case
  const executeTestCase = useCallback(async (testCase: TestCase): Promise<void> => {
    if (runningCases.has(testCase.id)) {
      return; // Already running
    }

    setRunningCases(prev => new Set(prev).add(testCase.id));
    
    try {
      options.onStatusUpdate?.(`开始执行测试用例: ${testCase.name}`, 'info');
      options.onCaseUpdate?.(testCase.id, { 
        isRunning: true, 
        status: 'running', 
        currentCommand: 0 
      });

      for (let i = 0; i < testCase.commands.length; i++) {
        const command = testCase.commands[i];
        
        if (!command.selected) {
          continue; // Skip unselected commands
        }

        options.onCaseUpdate?.(testCase.id, { currentCommand: i });

        const result = await executeCommand(command, testCase);
        setExecutionResults(prev => ({
          ...prev,
          [command.id]: result
        }));

        // Check if execution should stop based on failure and case strategy
        if (!result.success) {
          if (shouldStopOnFailure(command, testCase, result)) {
            const severity = command.failureSeverity || 'error';
            options.onStatusUpdate?.(
              `命令失败 (${severity})，根据用例策略停止执行: ${testCase.name}`,
              severity === 'warning' ? 'warning' : 'error'
            );
            break;
          } else {
            options.onStatusUpdate?.(
              `命令失败但继续执行: ${command.command}`,
              command.failureSeverity === 'warning' ? 'warning' : 'error'
            );
          }
        }

        // Wait between commands
        if (command.waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, command.waitTime));
        }
      }

      // Determine final case status
      const failedCommands = testCase.commands.filter(cmd => 
        cmd.selected && executionResults[cmd.id] && !executionResults[cmd.id].success
      );
      
      let finalStatus: TestCase['status'] = 'success';
      if (failedCommands.length > 0) {
        const hasErrors = failedCommands.some(cmd => cmd.failureSeverity === 'error');
        finalStatus = hasErrors ? 'failed' : 'partial';
      }

      options.onCaseUpdate?.(testCase.id, {
        isRunning: false,
        status: finalStatus,
        currentCommand: -1
      });

      options.onStatusUpdate?.(
        `测试用例执行完成: ${testCase.name} (状态: ${finalStatus})`,
        finalStatus === 'success' ? 'info' : finalStatus === 'failed' ? 'error' : 'warning'
      );

    } catch (error) {
      options.onCaseUpdate?.(testCase.id, {
        isRunning: false,
        status: 'failed',
        currentCommand: -1
      });
      
      options.onStatusUpdate?.(
        `测试用例执行异常: ${testCase.name} - ${error}`,
        'error'
      );
    } finally {
      setRunningCases(prev => {
        const newSet = new Set(prev);
        newSet.delete(testCase.id);
        return newSet;
      });
    }
  }, [runningCases, executeCommand, shouldStopOnFailure, executionResults, options]);

  return {
    runningCases,
    executionResults,
    executeTestCase,
    executeCommand,
    shouldStopOnFailure
  };
};