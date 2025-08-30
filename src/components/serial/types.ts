export interface TestCommand {
  id: string;
  type: 'execution' | 'urc';
  command: string;
  expectedResponse?: string;
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
  failureHandling?: 'stop' | 'continue' | 'prompt'; // 失败处理方式
  userActionDialog?: boolean; // 是否需要用户操作弹框
  dialogContent?: string; // 弹框内容
  
  // 子用例特有字段
  referencedCaseId?: string; // 引用的测试用例ID
  isExpanded?: boolean; // 是否展开显示子步骤
  subCommands?: TestCommand[]; // 可编辑的子命令列表（子用例展开后的命令副本）
  
  // URC特有字段
  urcPattern?: string; // URC匹配内容
  urcMatchMode?: 'contains' | 'exact' | 'regex' | 'startsWith' | 'endsWith'; // URC匹配方式
  urcListenMode?: 'permanent' | 'once'; // 监听模式：永久监听或监听一次
  urcListenTimeout?: number; // 监听一次的超时时间（毫秒）
  urcFailureHandling?: 'stop' | 'continue' | 'prompt'; // URC失败处理方式
  urcDialogContent?: string; // URC弹框内容
  
  // URC参数提取配置
  dataParseConfig?: {
    parseType: 'contains' | 'exact' | 'regex' | 'split' | 'json';
    parsePattern: string;
    parameterMap: { [key: string]: string }; // 参数映射 
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
  isExpanded: boolean;
  isRunning: boolean;
  currentCommand: number;
  selected: boolean;
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial'; // 运行状态
  failureHandling?: 'stop' | 'continue' | 'prompt'; // 失败处理方式
  referencedCaseId?: string; // 引用用例（用于子用例）
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