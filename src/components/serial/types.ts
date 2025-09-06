// types.ts
import { CommandFailureConfig, CaseFailureHandling, LegacyFailureHandling } from './types/FailureHandling';

export interface TestCommand {
  id: string;
  type: 'execution' | 'urc';
  command: string;
  expectedResponse?: string;
  expectedResponseFormat?: 'text' | 'hex'; // 期望响应格式：文本或十六进制
  validationMethod: 'none' | 'contains' | 'equals' | 'regex';
  validationPattern?: string;
  waitTime: number;
  stopOnFailure: boolean;
  requiresUserAction?: boolean;
  userPrompt?: string;
  lineEnding: 'none' | 'lf' | 'cr' | 'crlf';
  selected: boolean;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  
  // 执行命令扩展属性
  dataFormat?: 'string' | 'hex'; // 数据格式：字符串或十六进制
  timeout?: number; // 超时时间（毫秒）
  
  // New failure handling - only retries, severity, and prompts at command level
  maxAttempts?: number; // 重试次数（默认1次）
  retryDelay?: number; // 重试间隔时间（毫秒，默认1000）
  failureSeverity?: 'warning' | 'error'; // 失败严重等级
  failurePrompt?: string; // 失败提示消息
  
  // Legacy fields for backward compatibility (will be migrated)
  failureHandling?: 'stop' | 'continue' | 'prompt' | 'retry';
  userActionDialog?: boolean; // 是否需要用户操作弹框
  dialogContent?: string; // 弹框内容
  
  // URC特有字段
  urcPattern?: string; // URC匹配内容
  urcMatchMode?: 'contains' | 'exact' | 'regex' | 'startsWith' | 'endsWith'; // URC匹配方式
  urcListenMode?: 'permanent' | 'once'; // 监听模式：永久监听或监听一次
  urcListenTimeout?: number; // 监听一次的超时时间（毫秒）
  
  // Legacy URC fields for backward compatibility (will be migrated)
  urcFailureHandling?: 'stop' | 'continue' | 'prompt';
  urcDialogContent?: string; // URC弹框内容
  
  // URC参数提取配置
  dataParseConfig?: {
    enabled: boolean; // 是否启用变量提取
    parseType: 'regex' | 'split';
    parsePattern: string;
    parameterMap: { [key: string]: string }; // 参数映射：group1->varName, index0->varName
  };
  jumpConfig?: {
    onReceived: 'continue' | 'jump';
    jumpTarget?: {
      type: 'command' | 'case';
      targetId: string;
      targetIndex?: number;
    };
  };
}

export interface TestCase {
  id: string;
  uniqueId: string; // 唯一编号（不可修改，子用例无该属性）
  name: string; // 用例名称
  description: string;
  commands: TestCommand[];
  subCases: TestCase[];
  // 子项顺序控制（用于统一渲染命令和子用例）
  childrenOrder?: Array<{ type: 'command' | 'subcase'; id: string; index: number }>;
  isExpanded: boolean;
  isRunning: boolean;
  currentCommand: number;
  selected: boolean;
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial'; // 运行状态
  
  // New failure handling - case level determines stop/continue behavior
  failureStrategy: 'stop' | 'continue' | 'prompt'; // Primary failure strategy
  onWarningFailure?: 'continue' | 'stop' | 'prompt'; // How to handle warning-level command failures
  onErrorFailure?: 'continue' | 'stop' | 'prompt'; // How to handle error-level command failures
  
  // Legacy field for backward compatibility
  failureHandling?: 'stop' | 'continue' | 'prompt'; // Will be migrated to failureStrategy
  
  validationLevel?: 'warning' | 'error'; // 校验等级：警告级别或错误级别
  runMode?: 'auto' | 'single'; // 运行模式：自动连续执行或单步执行
  runCount?: number; // 运行次数配置
  isPreset?: boolean; // 是否为预设用例
}

export interface ExecutionResult {
  commandId: string;
  success: boolean;
  responseTime: number;
  actualResponse?: string;
  error?: string;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string;
  targetType: 'case' | 'command';
}