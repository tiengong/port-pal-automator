import { TestCase, TestCommand, ExecutionResult, TestRunResult } from '../types';
import { eventBus, EVENTS, SendCommandEvent, SerialDataEvent } from '@/lib/eventBus';
import { substituteVariables, checkUrcMatch, parseUrcData } from './testCaseUrcUtils';
import { getNextStepFrom } from './testCaseNavigationUtils';
import { findCommandLocation } from './testCaseRecursiveUtils';
import { globalToast } from '@/hooks/useGlobalMessages';

export interface ExecutionContext {
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  triggeredUrcIds: Set<string>;
  runningCasesRef: React.MutableRefObject<Set<string>>;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export interface ExecutionOptions {
  testCase: TestCase;
  caseId: string;
  commandsToRun: TestCommand[];
  context: ExecutionContext;
  onStatusUpdate: (updates: Partial<TestCase>) => void;
  onCommandExecute: (caseId: string, commandIndex: number) => Promise<{ success: boolean; error?: string }>;
  onComplete: (result: TestRunResult) => void;
}

/**
 * Execute a test case with comprehensive error handling and result tracking
 */
export const executeTestCase = async (options: ExecutionOptions): Promise<void> => {
  const { testCase, caseId, commandsToRun, context, onStatusUpdate, onCommandExecute, onComplete } = options;
  const { storedParameters, triggeredUrcIds, runningCasesRef, statusMessages } = context;
  
  // Initialize execution statistics
  const startTime = new Date();
  let passedCommands = 0;
  let failedCommands = 0;
  let warnings = 0;
  let errors = 0;
  const failureLogs: TestRunResult['failureLogs'] = [];

  // Get run count, default to 1
  const runCount = testCase.runCount || 1;

  try {
    for (let i = 0; i < runCount; i++) {
      // Check if paused
      if (!runningCasesRef.current.has(caseId)) {
        console.log('Test case execution stopped (paused)');
        return;
      }

      if (runCount > 1) {
        globalToast({
          title: `第 ${i + 1} 次执行`,
          description: `执行测试用例: ${testCase.name} (${i + 1}/${runCount})`,
        });
      }

      // Execute commands
      for (let j = 0; j < commandsToRun.length; j++) {
        // Check if paused
        if (!runningCasesRef.current.has(caseId)) {
          console.log('Test case execution stopped (paused during command loop)');
          return;
        }

        const command = commandsToRun[j];
        const commandIndex = testCase.commands.indexOf(command);
        
        // Handle single-step mode
        if (testCase.runMode === 'single') {
          const userConfirmed = await promptUserAction({
            commandText: command.command,
            promptText: `单步模式执行确认\n\n即将执行第 ${j + 1}/${commandsToRun.length} 条命令:\n${command.command}\n\n是否继续执行？`,
            statusMessages
          });
          
          if (!userConfirmed) {
            const endTime = new Date();
            const result = createExecutionResult({
              testCase, caseId, startTime, endTime,
              totalCommands: commandsToRun.length,
              passedCommands, failedCommands, warnings, errors, failureLogs,
              status: 'failed'
            });
            onComplete(result);
            return;
          }
        }
        
        // Execute command and get result
        const commandResult = await onCommandExecute(caseId, commandIndex);
        
        // Update statistics
        if (commandResult.success) {
          passedCommands++;
        } else {
          const severity = command.failureSeverity || 'error';
          if (severity === 'error') {
            failedCommands++;
            errors++;
          } else {
            warnings++;
          }
          
          failureLogs.push({
            commandIndex: j,
            commandText: command.command,
            error: commandResult.error || '命令执行失败',
            timestamp: new Date()
          });
          
          // Handle failure based on case-level strategy
          const shouldContinue = await handleCommandFailure({
            command, testCase, severity, statusMessages,
            onFailurePrompt: (promptText) => promptFailureDialog({ promptText, statusMessages })
          });
          
          if (!shouldContinue) {
            const endTime = new Date();
            const result = createExecutionResult({
              testCase, caseId, startTime, endTime,
              totalCommands: commandsToRun.length,
              passedCommands, failedCommands, warnings, errors, failureLogs,
              status: 'failed'
            });
            onComplete(result);
            return;
          }
        }
        
        // Wait between commands
        if (command.waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, command.waitTime));
        }
      }
    }

    // Determine final status based on validation level
    const validationLevel = testCase.validationLevel || 'error';
    let finalStatus: 'success' | 'failed' | 'partial';
    
    if (errors > 0) {
      finalStatus = 'failed';
    } else if (warnings > 0) {
      finalStatus = 'partial';
    } else {
      finalStatus = 'success';
    }
    
    // Update test case status
    onStatusUpdate({
      isRunning: false,
      status: finalStatus
    });

    // Create execution result
    const endTime = new Date();
    const result = createExecutionResult({
      testCase, caseId, startTime, endTime,
      totalCommands: commandsToRun.length,
      passedCommands, failedCommands, warnings, errors, failureLogs,
      status: finalStatus
    });

    statusMessages?.addMessage(`测试用例 "${testCase.name}" 执行完成`, finalStatus === 'success' ? 'success' : 'warning');
    onComplete(result);
    
  } catch (error) {
    // Handle execution errors
    runningCasesRef.current.delete(caseId);
    
    const endTime = new Date();
    const errorResult: TestRunResult = {
      testCaseId: caseId,
      testCaseName: testCase.name,
      status: 'failed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      totalCommands: commandsToRun.length,
      passedCommands,
      failedCommands,
      warnings,
      errors,
      failureLogs: [
        ...failureLogs,
        {
          commandIndex: -1,
          commandText: '系统错误',
          error: error?.toString() || '未知错误',
          timestamp: new Date()
        }
      ]
    };
    
    onComplete(errorResult);
    statusMessages?.addMessage(`测试用例执行出错: ${error}`, 'error');
  }
};

/**
 * Execute a single command with validation and response handling
 */
export const executeCommand = async (
  command: TestCommand,
  caseId: string,
  commandIndex: number,
  storedParameters: { [key: string]: { value: string; timestamp: number } },
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  }
): Promise<{ success: boolean; error?: string }> => {
  
  // Check if user action confirmation is required
  if (command.requiresUserAction) {
    const userConfirmed = await promptUserAction({
      commandText: command.command,
      promptText: command.userPrompt || `即将执行命令: ${command.command}\n\n是否继续？`,
      statusMessages
    });
    
    if (!userConfirmed) {
      return { success: false, error: '用户取消执行' };
    }
  }
  
  if (command.type === 'execution') {
    // Perform variable substitution
    const substitutedCommand = substituteVariables(command.command, storedParameters);
    
    // Handle commands with validation
    if (command.validationMethod && command.validationMethod !== 'none') {
      return await executeValidatedCommand({
        command: { ...command, command: substitutedCommand },
        caseId, commandIndex, statusMessages
      });
    } else {
      // Send command without validation
      const sendEvent: SendCommandEvent = {
        command: substitutedCommand,
        format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
        lineEnding: command.lineEnding,
        targetPort: 'ALL'
      };
      
      eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
      statusMessages?.addMessage(`执行命令: ${substitutedCommand}`, 'info');
      return { success: true };
    }
  } else if (command.type === 'urc') {
    // URC listening logic
    statusMessages?.addMessage(`URC监听: ${command.urcPattern}`, 'info');
    
    // Handle timeout for once mode
    if (command.urcListenMode === 'once' && command.urcListenTimeout) {
      return await handleUrcTimeout({ command, caseId, commandIndex, statusMessages });
    }
    
    return { success: true };
  }
  
  return { success: true };
};

/**
 * Execute a command with validation and retry logic
 */
const executeValidatedCommand = async (options: {
  command: TestCommand;
  caseId: string;
  commandIndex: number;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}): Promise<{ success: boolean; error?: string }> => {
  const { command, caseId, commandIndex, statusMessages } = options;
  const maxAttempts = command.failureHandling === 'retry' ? (command.maxAttempts || 3) : 1;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Send command
    const sendEvent: SendCommandEvent = {
      command: command.command,
      format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
      lineEnding: command.lineEnding,
      targetPort: 'ALL'
    };
    
    eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
    
    // Wait for response and validate
    const timeout = command.timeout || 5000;
    const isValid = await waitForResponseValidation({
      command, timeout, attempt, maxAttempts, statusMessages
    });
    
    if (isValid) {
      return { success: true };
    } else if (attempt < maxAttempts) {
      statusMessages?.addMessage(`命令执行失败，正在重试 (${attempt}/${maxAttempts})`, 'warning');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Retry interval
    }
  }
  
  return { success: false, error: '命令执行失败' };
};

/**
 * Wait for response and perform validation
 */
const waitForResponseValidation = async (options: {
  command: TestCommand;
  timeout: number;
  attempt: number;
  maxAttempts: number;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}): Promise<boolean> => {
  const { command, timeout } = options;
  
  return new Promise<boolean>((resolve) => {
    let responseData = '';
    const timeoutId = setTimeout(() => resolve(false), timeout);
    
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (data: SerialDataEvent) => {
      if (data.type === 'received') {
        responseData += data.data;
        
        // Perform validation based on method
        let isValid = false;
        const expectedResponse = command.expectedResponse || '';
        
        switch (command.validationMethod) {
          case 'contains':
            isValid = responseData.includes(expectedResponse);
            break;
          case 'equals':
            isValid = responseData.trim() === expectedResponse.trim();
            break;
          case 'regex':
            try {
              const pattern = command.validationPattern || expectedResponse;
              const regex = new RegExp(pattern);
              isValid = regex.test(responseData);
            } catch (e) {
              console.error('Invalid regex pattern:', e);
              isValid = false;
            }
            break;
        }
        
        if (isValid) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      }
    });
  });
};

/**
 * Handle URC timeout for once mode
 */
const handleUrcTimeout = async (options: {
  command: TestCommand;
  caseId: string;
  commandIndex: number;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}): Promise<{ success: boolean; error?: string }> => {
  const { command, caseId, commandIndex, statusMessages } = options;
  
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    const timeoutId = setTimeout(() => {
      const severity = command.failureSeverity || 'error';
      const errorMessage = `URC监听超时（${command.urcListenTimeout}ms）`;
      
      statusMessages?.addMessage(`URC监听超时失败（${severity}级）: ${command.urcPattern}`, severity === 'error' ? 'error' : 'warning');
      resolve({ success: false, error: errorMessage });
    }, command.urcListenTimeout!);
    
    // 返回清理函数，允许外部清理定时器
    return () => clearTimeout(timeoutId);
  });
};

/**
 * Handle command failure based on strategy
 */
const handleCommandFailure = async (options: {
  command: TestCommand;
  testCase: TestCase;
  severity: string;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
  onFailurePrompt: (promptText: string) => Promise<boolean>;
}): Promise<boolean> => {
  const { command, testCase, severity, statusMessages, onFailurePrompt } = options;
  
  // Determine case-level action
  let caseAction: 'stop' | 'continue' | 'prompt';
  if (severity === 'error') {
    caseAction = testCase.onErrorFailure || testCase.failureStrategy || 'stop';
  } else {
    caseAction = testCase.onWarningFailure || testCase.failureStrategy || 'continue';
  }
  
  // Execute action
  if (caseAction === 'stop') {
    statusMessages?.addMessage(`命令失败（${severity}级），停止执行测试用例`, 'error');
    return false;
  } else if (caseAction === 'prompt') {
    const promptText = command.failurePrompt || `命令执行失败（${severity}级）: ${command.command}\n\n是否继续执行测试用例？`;
    return await onFailurePrompt(promptText);
  } else {
    // continue
    statusMessages?.addMessage(`命令失败（${severity}级），但继续执行下一条`, 'warning');
    return true;
  }
};

/**
 * Prompt user for action confirmation
 */
const promptUserAction = async (options: {
  commandText: string;
  promptText: string;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}): Promise<boolean> => {
  // This would typically use a dialog system
  // For now, return true to continue execution
  // In the actual implementation, this would integrate with the dialog system
  return new Promise<boolean>((resolve) => {
    // Placeholder for dialog integration
    resolve(true);
  });
};

/**
 * Prompt failure dialog for user decision
 */
const promptFailureDialog = async (options: {
  promptText: string;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}): Promise<boolean> => {
  // This would typically use a failure dialog system
  // For now, return true to continue execution
  // In the actual implementation, this would integrate with the dialog system
  return new Promise<boolean>((resolve) => {
    // Placeholder for dialog integration
    resolve(true);
  });
};

/**
 * Create execution result object
 */
const createExecutionResult = (options: {
  testCase: TestCase;
  caseId: string;
  startTime: Date;
  endTime: Date;
  totalCommands: number;
  passedCommands: number;
  failedCommands: number;
  warnings: number;
  errors: number;
  failureLogs: TestRunResult['failureLogs'];
  status: 'success' | 'failed' | 'partial';
}): TestRunResult => {
  const { testCase, caseId, startTime, endTime, totalCommands, passedCommands, failedCommands, warnings, errors, failureLogs, status } = options;
  
  return {
    testCaseId: caseId,
    testCaseName: testCase.name,
    status,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    totalCommands,
    passedCommands,
    failedCommands,
    warnings,
    errors,
    failureLogs
  };
};