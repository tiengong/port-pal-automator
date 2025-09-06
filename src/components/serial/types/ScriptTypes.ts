export interface Script {
  id: string;
  name: string;
  description: string;
  filePath: string;
  content: string;
  language: 'lua' | 'javascript' | 'python';
  createdAt: Date;
  modifiedAt: Date;
  isRunning: boolean;
  status: 'pending' | 'running' | 'success' | 'error' | 'stopped';
  lastRunResult?: {
    success: boolean;
    output: string;
    error?: string;
    timestamp: Date;
  };
}

export interface ScriptExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}