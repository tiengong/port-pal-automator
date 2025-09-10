import { TestCommand, TestCase } from '../types';
import { eventBus, EVENTS, SerialDataEvent } from '@/lib/eventBus';
import { checkUrcMatch, parseUrcData } from './testCaseUrcUtils';
import { findCommandLocation } from './testCaseRecursiveUtils';
import { getNextStepFrom } from './testCaseNavigationUtils';
import { globalToast } from '@/hooks/useGlobalMessages';

export interface UrcHandlerContext {
  currentTestCase: TestCase | null;
  testCases: TestCase[];
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  triggeredUrcIds: Set<string>;
  onUpdateTestCases: (updatedTestCases: TestCase[]) => void;
  onUpdateParameters: (parameters: { [key: string]: { value: string; timestamp: number } }) => void;
  onUpdateTriggeredUrcIds: (ids: Set<string>) => void;
  onExecuteCommand: (caseId: string, commandIndex: number) => Promise<void>;
}

/**
 * Setup URC event listeners for the test case manager
 */
export const setupUrcListeners = (context: UrcHandlerContext): (() => void) => {
  const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
    if (event.type === 'received') {
      handleIncomingData(event, context);
    }
  });
  
  return unsubscribe;
};

/**
 * Handle incoming serial data for URC matching
 */
const handleIncomingData = (event: SerialDataEvent, context: UrcHandlerContext) => {
  const { currentTestCase, testCases, storedParameters, triggeredUrcIds, onUpdateTestCases, onUpdateParameters, onUpdateTriggeredUrcIds, onExecuteCommand } = context;
  
  if (!currentTestCase) return;
  
  // Check for active URC listeners
  currentTestCase.commands.forEach((command, commandIndex) => {
    if (command.type === 'urc' && command.selected && command.urcPattern) {
      const matches = checkUrcMatch(event.data, command);
      if (matches) {
        handleUrcMatch({
          command,
          commandIndex,
          data: event.data,
          currentTestCase,
          testCases,
          storedParameters,
          triggeredUrcIds,
          onUpdateTestCases,
          onUpdateParameters,
          onUpdateTriggeredUrcIds,
          onExecuteCommand
        });
      }
    }
  });
};

/**
 * Handle URC pattern matching and parameter extraction
 */
const handleUrcMatch = (options: {
  command: TestCommand;
  commandIndex: number;
  data: string;
  currentTestCase: TestCase;
  testCases: TestCase[];
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  triggeredUrcIds: Set<string>;
  onUpdateTestCases: (updatedTestCases: TestCase[]) => void;
  onUpdateParameters: (parameters: { [key: string]: { value: string; timestamp: number } }) => void;
  onUpdateTriggeredUrcIds: (ids: Set<string>) => void;
  onExecuteCommand: (caseId: string, commandIndex: number) => Promise<void>;
}) => {
  const {
    command, commandIndex, data, currentTestCase, testCases, storedParameters,
    triggeredUrcIds, onUpdateTestCases, onUpdateParameters, onUpdateTriggeredUrcIds, onExecuteCommand
  } = options;
  
  // Extract parameters
  const extractedParams = parseUrcData(data, command);
  if (Object.keys(extractedParams).length > 0) {
    // Update stored parameters, newer values override older ones
    const newParameters = { ...storedParameters, ...extractedParams };
    onUpdateParameters(newParameters);
    
    // Emit parameter extraction event
    eventBus.emit(EVENTS.PARAMETER_EXTRACTED, { 
      commandId: command.id, 
      parameters: extractedParams 
    });
    
    globalToast({
      title: "参数解析成功",
      description: `提取参数: ${Object.entries(extractedParams).map(([k, v]) => `${k}=${v.value}`).join(', ')}`,
    });
  }
  
  // Handle URC status update and jump logic
  const isUrcAlreadyTriggered = triggeredUrcIds.has(command.id);
  
  // Update URC status
  const updatedCommands = currentTestCase.commands.map((cmd, idx) => {
    if (idx === commandIndex) {
      const newCmd = { ...cmd, status: 'success' as const };
      
      // Handle once mode: deactivate after matching
      if (cmd.urcListenMode === 'once') {
        newCmd.selected = false;
      }
      
      return newCmd;
    }
    return cmd;
  });
  
  const updatedTestCases = updateCaseCommands(testCases, currentTestCase.id, updatedCommands);
  onUpdateTestCases(updatedTestCases);
  
  // Handle jump logic (only execute if not triggered before or in once mode)
  if (!isUrcAlreadyTriggered || command.urcListenMode === 'once') {
    // Mark permanent URC as triggered
    if (command.urcListenMode === 'permanent') {
      onUpdateTriggeredUrcIds(new Set([...triggeredUrcIds, command.id]));
    }
    
    // Execute jump logic
    await executeUrcJumpLogic({
      command, commandIndex, currentTestCase, testCases, onExecuteCommand
    });
  }
};

/**
 * Update commands for a specific test case
 */
const updateCaseCommands = (testCases: TestCase[], caseId: string, commands: TestCommand[]): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return { ...testCase, commands };
    }
    // Handle nested test cases
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: updateCaseCommands(testCase.subCases, caseId, commands)
      };
    }
    return testCase;
  });
};

/**
 * Execute URC jump logic based on configuration
 */
const executeUrcJumpLogic = async (options: {
  command: TestCommand;
  commandIndex: number;
  currentTestCase: TestCase;
  testCases: TestCase[];
  onExecuteCommand: (caseId: string, commandIndex: number) => Promise<void>;
}) => {
  const { command, commandIndex, currentTestCase, testCases, onExecuteCommand } = options;
  
  switch (command.jumpConfig?.onReceived) {
    case 'continue':
      const nextStep = getNextStepFrom(currentTestCase.id, commandIndex, testCases);
      if (nextStep) {
        setTimeout(() => onExecuteCommand(nextStep.caseId, nextStep.commandIndex), 100);
        globalToast({
          title: "URC继续执行",
          description: `已继续到下一步执行`,
        });
      } else {
        globalToast({
          title: "URC执行完成",
          description: "没有更多步骤可执行",
        });
      }
      break;
      
    case 'jump':
      if (command.jumpConfig?.jumpTarget?.type === 'command' && command.jumpConfig?.jumpTarget?.targetId) {
        const targetLocation = findCommandLocation(command.jumpConfig.jumpTarget.targetId, testCases);
        if (targetLocation) {
          setTimeout(() => onExecuteCommand(targetLocation.caseId, targetLocation.commandIndex), 100);
          globalToast({
            title: "URC跳转执行",
            description: `已跳转到指定命令`,
          });
        } else {
          globalToast({
            title: "跳转失败",
            description: "找不到目标命令",
            variant: "destructive"
          });
        }
      }
      break;
      
    default:
      // Default: only parameter extraction, no jump
      break;
  }
};

/**
 * Process URC data and extract parameters
 */
export const processUrcData = (data: string, command: TestCommand): {
  parameters: { [key: string]: { value: string; timestamp: number } };
  shouldTrigger: boolean;
} => {
  const matches = checkUrcMatch(data, command);
  if (!matches) {
    return { parameters: {}, shouldTrigger: false };
  }
  
  const extractedParams = parseUrcData(data, command);
  return {
    parameters: extractedParams,
    shouldTrigger: true
  };
};

/**
 * Check if URC should trigger based on mode and previous triggers
 */
export const shouldTriggerUrc = (command: TestCommand, triggeredUrcIds: Set<string>): boolean => {
  const isAlreadyTriggered = triggeredUrcIds.has(command.id);
  
  // For permanent mode, only trigger if not already triggered
  if (command.urcListenMode === 'permanent') {
    return !isAlreadyTriggered;
  }
  
  // For once mode, always trigger (will be deactivated after)
  return true;
};

/**
 * Get URC configuration examples
 */
export const getUrcExamples = () => [
  { 
    name: "网络注册URC", 
    urcPattern: "+CREG:", 
    urcMatchMode: "startsWith", 
    description: "监听网络注册状态变化",
    urcListenMode: "permanent"
  },
  { 
    name: "短信接收URC", 
    urcPattern: "+CMTI:", 
    urcMatchMode: "startsWith", 
    description: "监听短信接收通知",
    urcListenMode: "permanent"
  },
  { 
    name: "来电URC", 
    urcPattern: "RING", 
    urcMatchMode: "exact", 
    description: "监听来电通知",
    urcListenMode: "once",
    urcListenTimeout: 30000
  },
  { 
    name: "信号质量URC", 
    urcPattern: "+CSQ:", 
    urcMatchMode: "startsWith", 
    description: "监听信号质量变化",
    urcListenMode: "once",
    urcListenTimeout: 10000
  },
  { 
    name: "正则匹配URC", 
    urcPattern: "\\+C[A-Z]+:", 
    urcMatchMode: "regex", 
    description: "使用正则表达式匹配多种URC",
    urcListenMode: "permanent"
  }
];

/**
 * Validate URC pattern
 */
export const validateUrcPattern = (pattern: string, matchMode: string): { valid: boolean; error?: string } => {
  if (!pattern.trim()) {
    return { valid: false, error: 'URC模式不能为空' };
  }
  
  if (matchMode === 'regex') {
    try {
      new RegExp(pattern);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `正则表达式无效: ${error}` };
    }
  }
  
  return { valid: true };
};

/**
 * Format URC pattern for display
 */
export const formatUrcPattern = (pattern: string, matchMode: string): string => {
  if (matchMode === 'regex') {
    return pattern;
  }
  
  // Escape special characters for non-regex modes
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};