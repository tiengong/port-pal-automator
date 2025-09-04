// 临时修复文件 - 只包含修复后的runAutoMode函数
export const runAutoMode_fixed = async (
  caseId: string,
  testCases: any[],
  setTestCases: any,
  findTestCaseById: any,
  runningCasesRef: any,
  statusMessages: any,
  setStoredParameters: any,
  setTriggeredUrcIds: any,
  updateCaseById: any,
  setExecutingCommand: any,
  toast: any,
  runCommand: any,
  setRunResult: any,
  setShowRunResult: any
) => {
  const testCase = findTestCaseById(caseId);
  if (!testCase) return;

  // 如果正在运行，则暂停
  if (runningCasesRef.current.has(caseId)) {
    runningCasesRef.current.delete(caseId);
    const updatedTestCases = updateCaseById(testCases, caseId, (tc: any) => ({
      ...tc,
      isRunning: false,
      status: 'pending'
    }));
    setTestCases(updatedTestCases);
    statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
    return;
  }

  // 添加到运行中的用例集合
  runningCasesRef.current.add(caseId);

  // 每次运行测试用例时清空存储的变量和触发状态
  setStoredParameters({});
  setTriggeredUrcIds(new Set());
  
  // 更新状态为运行中
  const updatedTestCases = updateCaseById(testCases, caseId, (tc: any) => ({
    ...tc,
    isRunning: true,
    status: 'running',
    currentCommand: 0
  }));
  setTestCases(updatedTestCases);
  
  statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');

  // 初始化执行统计
  const startTime = new Date();
  let passedCommands = 0;
  let failedCommands = 0; 
  let warnings = 0;
  let errors = 0;
  const failureLogs: any[] = [];

  // 获取运行次数，默认为1
  const runCount = testCase.runCount || 1;
  
  // 执行所有选中的命令，如果没有选中则执行全部命令
  const selectedCommands = testCase.commands.filter((cmd: any) => cmd.selected);
  const commandsToRun = selectedCommands.length > 0 ? selectedCommands : testCase.commands;
  
  try {
    // 执行命令循环
    for (let i = 0; i < runCount; i++) {
      // 检查是否被暂停
      if (!runningCasesRef.current.has(caseId)) {
        console.log('Test case execution stopped (paused)');
        setExecutingCommand({ caseId: null, commandIndex: null });
        return;
      }

      if (runCount > 1) {
        toast({
          title: `第 ${i + 1} 次执行`,
          description: `执行测试用例: ${testCase.name} (${i + 1}/${runCount})`,
        });
      }

      // 执行命令循环
      for (let j = 0; j < commandsToRun.length; j++) {
        // 检查是否被暂停
        if (!runningCasesRef.current.has(caseId)) {
          console.log('Test case execution stopped (paused during command loop)');
          setExecutingCommand({ caseId: null, commandIndex: null });
          return;
        }

        const command = commandsToRun[j];
        const commandIndex = testCase.commands.indexOf(command);
        
        console.log(`Executing command ${j + 1}/${commandsToRun.length}: ${command.command}`);
        
        // 执行单个命令
        const commandResult = await runCommand(caseId, commandIndex);
        
        if (commandResult.success) {
          // 命令成功
          passedCommands++;
        } else {
          // 命令失败 - 简化的失败处理
          const commandFailureSeverity = command.failureSeverity || 'error';
          
          // 根据测试用例的失败处理策略决定是否继续
          if (testCase.failureHandling === 'stop') {
            statusMessages?.addMessage(`命令失败，停止执行测试用例`, 'error');
            failureLogs.push({
              commandIndex: commandIndex,
              commandText: command.command,
              error: commandResult.error || '命令执行失败',
              timestamp: new Date()
            });
            failedCommands++;
            break;
          } else {
            // 继续执行
            statusMessages?.addMessage(`命令失败，但继续执行`, 'warning');
            failureLogs.push({
              commandIndex: commandIndex,
              commandText: command.command,
              error: commandResult.error || '命令执行失败但继续执行',
              timestamp: new Date()
            });
            failedCommands++;
          }
        }
        
        // 命令间等待时间
        if (command.waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, command.waitTime));
        }
      }
    }

    // 执行完成，清除运行状态
    runningCasesRef.current.delete(caseId);
    setExecutingCommand({ caseId: null, commandIndex: null });
    
    // 确定最终状态
    const finalStatus = failedCommands === 0 ? 'success' : 
                       passedCommands === 0 ? 'failed' : 'partial';
    
    const finalTestCases = updateCaseById(testCases, caseId, (tc: any) => ({
      ...tc,
      isRunning: false,
      status: finalStatus
    }));
    setTestCases(finalTestCases);

    // 创建执行结果
    const endTime = new Date();
    const result = {
      testCaseId: caseId,
      testCaseName: testCase.name,
      status: finalStatus,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      totalCommands: commandsToRun.length,
      passedCommands,
      failedCommands,
      warnings,
      errors,
      failureLogs
    };

    // 显示结果对话框
    setRunResult(result);
    setShowRunResult(true);

    statusMessages?.addMessage(`测试用例 "${testCase.name}" 执行完成`, finalStatus === 'success' ? 'success' : 'warning');
    
  } catch (error) {
    // 执行出错，清除运行状态
    runningCasesRef.current.delete(caseId);
    setExecutingCommand({ caseId: null, commandIndex: null });
    const errorTestCases = updateCaseById(testCases, caseId, (tc: any) => ({
      ...tc,
      isRunning: false,
      status: 'failed'
    }));
    setTestCases(errorTestCases);

    // 创建错误执行结果
    const endTime = new Date();
    const errorResult = {
      testCaseId: caseId,
      testCaseName: testCase.name,
      status: 'failed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      totalCommands: commandsToRun.length,
      passedCommands: 0,
      failedCommands: commandsToRun.length,
      warnings: 0,
      errors: 1,
      failureLogs: [
        {
          commandIndex: -1,
          commandText: '执行异常',
          error: `测试用例执行异常: ${error}`,
          timestamp: new Date()
        }
      ]
    };

    // 显示错误结果对话框
    setRunResult(errorResult);
    setShowRunResult(true);

    statusMessages?.addMessage(`测试用例执行出错: ${error}`, 'error');
  }
};