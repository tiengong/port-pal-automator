import { TestCase, TestCommand } from '../types';
import { findTestCaseById, updateCaseById } from '../testCaseRecursiveUtils';
import { substituteVariables } from '../testCaseUrcUtils';
import { eventBus, EVENTS, SendCommandEvent } from '@/lib/eventBus';
import { TestRunResult } from '../RunResultDialog';

export interface ExecutionContext {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  setExecutingCommand: (command: string | null) => void;
  storedParameters: Record<string, { value: string; timestamp: number }>;
  runningCasesRef: React.MutableRefObject<Set<string>>;
  connectedPorts: Array<any>;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
  setRunResult: (result: TestRunResult | null) => void;
  setShowRunResult: (show: boolean) => void;
  toast: (options: any) => void;
}

// 运行测试用例
export const runTestCase = async (
  caseId: string,
  context: ExecutionContext
) => {
  const testCase = findTestCaseById(caseId, context.testCases);
  if (!testCase) return;

  // 如果正在运行，则暂停
  if (context.runningCasesRef.current.has(caseId)) {
    context.runningCasesRef.current.delete(caseId);
    const updatedTestCases = updateCaseById(context.testCases, caseId, (tc) => ({
      ...tc,
      isRunning: false,
      status: 'pending'
    }));
    context.setTestCases(updatedTestCases);
    context.setExecutingCommand(null);
    
    context.statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
    return;
  }

  // 标记开始运行
  context.runningCasesRef.current.add(caseId);
  const runningTestCases = updateCaseById(context.testCases, caseId, (tc) => ({
    ...tc,
    isRunning: true,
    status: 'running',
    currentCommand: 0
  }));
  context.setTestCases(runningTestCases);

  context.statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');
  
  const startTime = new Date();
  let errors = 0;
  let warnings = 0;
  let successes = 0;

  try {
    // 获取运行次数
    const runCount = Math.max(1, testCase.runCount || 1);
    
    for (let i = 0; i < runCount; i++) {
      // 检查是否被暂停
      if (!context.runningCasesRef.current.has(caseId)) {
        console.log('Test case execution stopped (paused)');
        context.setExecutingCommand(null);
        return;
      }

      if (runCount > 1) {
        context.toast({
          title: `第 ${i + 1} 次执行`,
          description: `执行测试用例: ${testCase.name} (${i + 1}/${runCount})`,
        });
      }

      // 执行命令
      for (let j = 0; j < testCase.commands.length; j++) {
        // 检查是否被暂停
        if (!context.runningCasesRef.current.has(caseId)) {
          console.log('Test case execution stopped (paused)');
          context.setExecutingCommand(null);
          return;
        }

        const command = testCase.commands[j];
        
        // 跳过未选中的命令
        if (!command.selected) {
          continue;
        }

        try {
          const result = await runCommand(caseId, j, context);
          if (result.success) {
            successes++;
          } else {
            // 根据命令的严重程度决定如何处理失败
            const severity = command.failureSeverity || 'error';
            
            if (severity === 'error') {
              errors++;
            } else {
              warnings++;
            }

            // 根据失败处理策略决定是否继续
            const commandAction = command.failureHandling || 'continue';
            let caseAction = commandAction;
            
            // 如果命令没有明确的失败处理，使用用例级别的策略
            if (commandAction === 'continue') {
              caseAction = testCase.onErrorFailure || testCase.failureStrategy || 'continue';
            } else if (commandAction === 'prompt') {
              caseAction = testCase.onWarningFailure || testCase.failureStrategy || 'continue';
            }
            
            // 根据用例策略执行相应的操作
            if (caseAction === 'stop') {
              context.statusMessages?.addMessage(`命令失败（${severity}级），停止执行测试用例`, 'error');
              context.runningCasesRef.current.delete(caseId);
              context.setExecutingCommand(null);
              
              // 停止执行时也要显示测试结果
              const endTime = new Date();
              const result: TestRunResult = {
                testCaseId: caseId,
                testCaseName: testCase.name,
                status: 'failed',
                startTime,
                endTime,
                duration: endTime.getTime() - startTime.getTime(),
                totalCommands: testCase.commands.filter(cmd => cmd.selected).length,
                passedCommands: j + 1,
                failedCommands: errors,
                warnings,
                errors: errors,
                failureLogs: []
              };
              
              const finalTestCases = updateCaseById(context.testCases, caseId, (tc) => ({
                ...tc,
                isRunning: false,
                status: 'failed'
              }));
              context.setTestCases(finalTestCases);
              
              context.setRunResult(result);
              context.setShowRunResult(true);
              return;
            }
            
            // 如果是 'prompt'，显示用户确认对话框
            if (caseAction === 'prompt') {
              // 这里需要显示对话框让用户选择继续或停止
              // 由于是异步操作，需要通过Promise来处理
              await new Promise<void>((resolve, reject) => {
                // 这里应该触发一个对话框状态更新
                // 暂时先继续执行
                resolve();
              });
            }
          }
          
          // 命令间延迟
          if (command.waitTime) {
            await new Promise(resolve => setTimeout(resolve, command.waitTime));
          }
        } catch (error) {
          errors++;
          context.statusMessages?.addMessage(`命令执行错误: ${error}`, 'error');
          
          // 根据错误处理策略决定是否继续
          if (testCase.failureStrategy === 'stop') {
            break;
          }
        }
      }
    }

    // 执行完成，清除运行状态
    context.runningCasesRef.current.delete(caseId);
    context.setExecutingCommand(null);
    
    // 确定最终状态 - 根据检测等级决定失败条件
    const level = testCase.validationLevel || 'error';
    let finalStatus: 'success' | 'failed' | 'partial';
    
    if (errors > 0) {
      finalStatus = 'failed';
    } else if (warnings > 0 && level === 'warning') {
      finalStatus = 'partial';
    } else {
      finalStatus = 'success';
    }
    
    const endTime = new Date();
    const result: TestRunResult = {
      testCaseId: caseId,
      testCaseName: testCase.name,
      status: finalStatus,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      totalCommands: testCase.commands.filter(cmd => cmd.selected).length,
      passedCommands: successes,
      failedCommands: errors,
      warnings,
      errors: errors,
      failureLogs: []
    };
    
    const finalTestCases = updateCaseById(context.testCases, caseId, (tc) => ({
      ...tc,
      isRunning: false,
      status: finalStatus
    }));
    context.setTestCases(finalTestCases);
    
    context.setRunResult(result);
    context.setShowRunResult(true);

    context.statusMessages?.addMessage(`测试用例 "${testCase.name}" 执行完成`, finalStatus === 'success' ? 'success' : 'warning');
  } catch (error) {
    // 执行出错，清除运行状态并显示结果
    context.runningCasesRef.current.delete(caseId);
    context.setExecutingCommand(null);
    const errorTestCases = updateCaseById(context.testCases, caseId, (tc) => ({
      ...tc,
      isRunning: false,
      status: 'failed'
    }));
    context.setTestCases(errorTestCases);

    const endTime = new Date();
    const errorResult: TestRunResult = {
      testCaseId: caseId,
      testCaseName: testCase.name,
      status: 'failed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      totalCommands: testCase.commands.filter(cmd => cmd.selected).length,
      passedCommands: 0,
      failedCommands: 1,
      warnings: 0,
      errors: 1,
      failureLogs: []
    };

    context.setRunResult(errorResult);
    context.setShowRunResult(true);

    context.statusMessages?.addMessage(`测试用例执行出错: ${error}`, 'error');
  }
};

// 运行单个命令
export const runCommand = async (
  caseId: string, 
  commandIndex: number, 
  context: ExecutionContext
): Promise<{ success: boolean; error?: string }> => {
  const targetCase = findTestCaseById(caseId, context.testCases);
  if (!targetCase) return { success: false, error: '测试用例未找到' };
  
  const command = targetCase.commands[commandIndex];
  
  // 检查是否需要用户操作前确认
  if (command.requiresUserAction) {
    // 这里需要处理用户确认逻辑
    const promptText = command.userPrompt || `即将执行命令: ${command.command}\n\n是否继续？`;
    // 暂时跳过用户确认
  }
  
  // 设置当前执行的命令高亮
  context.setExecutingCommand(`${caseId}-${commandIndex}`);
  
  if (command.type === 'execution') {
    const substitutedCommand = substituteVariables(command.command, context.storedParameters);
    
    // 如果有验证方法且不是none，使用重试逻辑
    if (command.validationMethod && command.validationMethod !== 'none') {
      const maxAttempts = command.failureHandling === 'retry' ? (command.maxAttempts || 3) : 1;
      let success = false;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // 发送命令
        const sendEvent: SendCommandEvent = {
          command: substitutedCommand,
          format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
          lineEnding: command.lineEnding || 'crlf'
        };
        
        eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
        
        // 这里应该等待响应并验证
        // 暂时模拟成功
        success = true;
        break;
      }
      
      return { success };
    } else {
      // 没有验证，直接发送
      const sendEvent: SendCommandEvent = {
        command: substitutedCommand,
        format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
        lineEnding: command.lineEnding || 'crlf'
      };
      
      eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, command.waitTime || 1000));
      
      return { success: true };
    }
  } else if (command.type === 'urc') {
    // URC监听逻辑
    if (command.urcListenMode === 'once' && command.urcListenTimeout) {
      // 一次性监听，设置超时
      const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          const severity = command.failureSeverity || 'error';
          context.statusMessages?.addMessage(`URC监听超时失败（${severity}级）: ${command.urcPattern}`, severity === 'error' ? 'error' : 'warning');
          resolve({ success: false, error: `URC监听超时（${command.urcListenTimeout}ms）` });
        }, command.urcListenTimeout);
      });
      
      return timeoutPromise;
    }
    
    return { success: true };
  }
  
  // 模拟执行时间后清除高亮
  setTimeout(() => {
    context.setExecutingCommand(null);
  }, command.waitTime || 1000);
  
  return { success: true };
};