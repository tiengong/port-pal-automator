export interface TestCommand {
  id: string;
  type: 'execution' | 'urc' | 'subcase';
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
  
  // 子用例特有字段
  referencedCaseId?: string; // 引用的测试用例ID
  isExpanded?: boolean; // 是否展开显示子步骤
  subCommands?: TestCommand[]; // 可编辑的子命令列表（子用例展开后的命令副本）
  
  // URC特有字段
  urcPattern?: string; // URC匹配模式
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
  uniqueId: string; // 唯一编号
  name: string;
  description: string;
  commands: TestCommand[];
  subCases: TestCase[];
  isExpanded: boolean;
  isRunning: boolean;
  currentCommand: number;
  selected: boolean;
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial';
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