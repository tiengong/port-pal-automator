import { TestCase, TestCommand } from '../types';
import { eventBus, EVENTS, SerialDataEvent } from '@/lib/eventBus';
import { parseUrcData, checkUrcMatch } from '../testCaseUrcUtils';
import { findTestCaseById } from '../testCaseRecursiveUtils';

export interface EventHandlerContext {
  testCases: TestCase[];
  currentTestCase: TestCase | null;
  triggeredUrcIds: Set<string>;
  storedParameters: Record<string, { value: string; timestamp: number }>;
  setStoredParameters: (params: Record<string, { value: string; timestamp: number }> | ((prev: Record<string, { value: string; timestamp: number }>) => Record<string, { value: string; timestamp: number }>)) => void;
  setTriggeredUrcIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  toast: (options: any) => void;
}

// 设置URC事件监听器
export const setupUrcEventListeners = (context: EventHandlerContext) => {
  // 监听串口数据，检查URC匹配
  const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
    if (!context.currentTestCase || !event.data) return;

    // 检查当前用例中的所有URC命令
    context.testCases.forEach(testCase => {
      if (testCase.commands) {
        testCase.commands.forEach(command => {
          if (command.type === 'urc' && command.selected && command.urcPattern) {
            const matches = checkUrcMatch(event.data, command);
            if (matches) {
              // 参数提取
              const extractedParams = parseUrcData(event.data, command);
              if (Object.keys(extractedParams).length > 0) {
                // 更新存储的参数，同名变量使用最新值
                context.setStoredParameters(prev => ({
                  ...prev,
                  ...extractedParams
                }));
                
                eventBus.emit(EVENTS.PARAMETER_EXTRACTED, { 
                  commandId: command.id, 
                  parameters: Object.keys(extractedParams).reduce((acc, key) => {
                    acc[key] = extractedParams[key].value;
                    return acc;
                  }, {} as Record<string, string>)
                });
                
                context.toast({
                  title: "参数解析成功",
                  description: `提取参数: ${Object.entries(extractedParams).map(([k, v]) => `${k}=${v.value}`).join(', ')}`,
                });
              }

              // 根据监听模式处理
              if (command.urcListenMode === 'once') {
                // 一次性监听，记录已触发的URC
                context.setTriggeredUrcIds(prev => new Set(prev).add(command.id));
                
                // 执行跳转逻辑
                if (command.jumpConfig?.onReceived === 'jump' && command.jumpConfig.jumpTarget) {
                  // 这里可以实现跳转逻辑
                  console.log('Jump to target:', command.jumpConfig.jumpTarget);
                }
              }
              
              // 永久监听模式不需要特殊处理，每次匹配都会执行
            }
          }
        });
      }
    });
  });
  
  return unsubscribe;
};

// 处理参数提取事件
export const handleParameterExtraction = (
  data: string,
  command: TestCommand,
  context: EventHandlerContext
) => {
  const extractedParams = parseUrcData(data, command);
  
  if (Object.keys(extractedParams).length > 0) {
    context.setStoredParameters(prev => ({
      ...prev,
      ...extractedParams
    }));
    
    context.toast({
      title: "参数解析成功",
      description: `从URC提取参数: ${Object.entries(extractedParams).map(([k, v]) => `${k}=${v.value}`).join(', ')}`,
    });
    
    return extractedParams;
  }
  
  return {};
};

// 检查URC触发条件
export const checkUrcTrigger = (
  data: string,
  command: TestCommand,
  triggeredUrcIds: Set<string>
): boolean => {
  // 如果是一次性监听且已触发，跳过
  if (command.urcListenMode === 'once' && triggeredUrcIds.has(command.id)) {
    return false;
  }
  
  // 检查URC匹配
  return checkUrcMatch(data, command);
};