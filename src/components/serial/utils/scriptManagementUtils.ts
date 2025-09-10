import { Script } from '../types/ScriptTypes';
import { globalToast } from '@/hooks/useGlobalMessages';

export interface ScriptExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  timestamp: Date;
}

/**
 * Create a new script with default values
 */
export const createNewScript = (options: {
  name: string;
  language?: string;
  description?: string;
  content?: string;
}): Script => {
  const { name, language = 'javascript', description = '', content = '' } = options;
  
  return {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    language,
    description,
    content,
    isRunning: false,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastRunResult: null
  };
};

/**
 * Execute a script (simulated)
 */
export const executeScript = async (
  script: Script,
  onStatusUpdate: (updates: Partial<Script>) => void,
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  }
): Promise<ScriptExecutionResult> => {
  // Update script status to running
  onStatusUpdate({
    ...script,
    isRunning: true,
    status: 'running'
  });
  
  statusMessages?.addMessage(`开始执行脚本: ${script.name}`, 'info');
  
  try {
    // Simulate script execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate different outcomes based on script content
    const hasErrors = script.content.includes('error') || script.content.includes('throw');
    const hasWarnings = script.content.includes('warning') || script.content.includes('console.warn');
    
    if (hasErrors) {
      throw new Error('Script execution failed with errors');
    }
    
    const output = generateScriptOutput(script);
    const result: ScriptExecutionResult = {
      success: true,
      output,
      timestamp: new Date()
    };
    
    // Update script status
    onStatusUpdate({
      ...script,
      isRunning: false,
      status: hasWarnings ? 'partial' : 'success',
      lastRunResult: result
    });
    
    statusMessages?.addMessage(`脚本执行完成: ${script.name}`, 'success');
    
    return result;
    
  } catch (error) {
    const result: ScriptExecutionResult = {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    
    // Update script status
    onStatusUpdate({
      ...script,
      isRunning: false,
      status: 'error',
      lastRunResult: result
    });
    
    statusMessages?.addMessage(`脚本执行失败: ${script.name} - ${result.error}`, 'error');
    
    return result;
  }
};

/**
 * Generate simulated script output based on content
 */
const generateScriptOutput = (script: Script): string => {
  const { language, content } = script;
  
  // Generate output based on script language and content
  switch (language) {
    case 'javascript':
      return generateJavaScriptOutput(content);
    case 'python':
      return generatePythonOutput(content);
    case 'bash':
      return generateBashOutput(content);
    default:
      return `Script executed successfully\nOutput: ${content.length} characters processed`;
  }
};

/**
 * Generate JavaScript script output
 */
const generateJavaScriptOutput = (content: string): string => {
  const lines = [
    'JavaScript script executed successfully',
    `Processed ${content.split('\n').length} lines of code`,
    'Console output:',
    ...extractConsoleOutputs(content),
    'Execution completed in ' + Math.floor(Math.random() * 1000 + 500) + 'ms'
  ];
  
  return lines.join('\n');
};

/**
 * Generate Python script output
 */
const generatePythonOutput = (content: string): string => {
  const lines = [
    'Python script executed successfully',
    `Processed ${content.split('\n').length} lines of code`,
    'Print output:',
    ...extractPrintStatements(content),
    'Execution completed in ' + Math.floor(Math.random() * 1000 + 300) + 'ms'
  ];
  
  return lines.join('\n');
};

/**
 * Generate Bash script output
 */
const generateBashOutput = (content: string): string => {
  const lines = [
    'Bash script executed successfully',
    `Executed ${content.split('\n').filter(line => line.trim() && !line.startsWith('#')).length} commands`,
    'Command outputs:',
    ...generateCommandOutputs(content),
    'All commands completed successfully'
  ];
  
  return lines.join('\n');
};

/**
 * Extract console outputs from JavaScript content
 */
const extractConsoleOutputs = (content: string): string[] => {
  const outputs: string[] = [];
  const consoleLogMatches = content.match(/console\.log\(['"`](.*?)['"`]\)/g);
  
  if (consoleLogMatches) {
    consoleLogMatches.forEach((match, index) => {
      const message = match.replace(/console\.log\(['"`](.*?)['"`]\)/, '$1');
      outputs.push(`  ${index + 1}: ${message}`);
    });
  }
  
  if (outputs.length === 0) {
    outputs.push('  No console output detected');
  }
  
  return outputs;
};

/**
 * Extract print statements from Python content
 */
const extractPrintStatements = (content: string): string[] => {
  const outputs: string[] = [];
  const printMatches = content.match(/print\(['"`](.*?)['"`]\)/g);
  
  if (printMatches) {
    printMatches.forEach((match, index) => {
      const message = match.replace(/print\(['"`](.*?)['"`]\)/, '$1');
      outputs.push(`  ${index + 1}: ${message}`);
    });
  }
  
  if (outputs.length === 0) {
    outputs.push('  No print output detected');
  }
  
  return outputs;
};

/**
 * Generate command outputs for Bash script
 */
const generateCommandOutputs = (content: string): string[] => {
  const outputs: string[] = [];
  const commands = content.split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('echo'));
  
  commands.forEach((command, index) => {
    const trimmedCommand = command.trim();
    if (trimmedCommand) {
      outputs.push(`  $ ${trimmedCommand}`);
      outputs.push(`  Output: Command executed successfully`);
      outputs.push('');
    }
  });
  
  if (outputs.length === 0) {
    outputs.push('  No executable commands found');
  }
  
  return outputs;
};

/**
 * Stop script execution
 */
export const stopScript = (
  script: Script,
  onStatusUpdate: (updates: Partial<Script>) => void,
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  }
): void => {
  // Update script status
  onStatusUpdate({
    ...script,
    isRunning: false,
    status: 'stopped'
  });
  
  statusMessages?.addMessage(`脚本已停止: ${script.name}`, 'warning');
};

/**
 * Update script content
 */
export const updateScriptContent = (
  script: Script,
  content: string,
  onUpdate: (updatedScript: Script) => void
): void => {
  const updatedScript: Script = {
    ...script,
    content,
    updatedAt: new Date()
  };
  
  onUpdate(updatedScript);
};

/**
 * Save script to storage
 */
export const saveScript = async (
  script: Script,
  onSave: (script: Script) => void
): Promise<boolean> => {
  try {
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSave(script);
    
    globalToast({
      title: "保存成功",
      description: `脚本已保存: ${script.name}`,
    });
    
    return true;
  } catch (error) {
    globalToast({
      title: "保存失败",
      description: `无法保存脚本: ${error}`,
      variant: "destructive"
    });
    
    return false;
  }
};

/**
 * Delete script
 */
export const deleteScript = (
  scriptId: string,
  scripts: Script[],
  setScripts: (scripts: Script[]) => void,
  currentScript: Script | null,
  setCurrentScript: (script: Script | null) => void
): void => {
  const scriptToDelete = scripts.find(s => s.id === scriptId);
  
  const updatedScripts = scripts.filter(s => s.id !== scriptId);
  setScripts(updatedScripts);
  
  if (currentScript?.id === scriptId) {
    setCurrentScript(null);
  }
  
  globalToast({
    title: "脚本已删除",
    description: scriptToDelete ? `已删除脚本: ${scriptToDelete.name}` : "脚本已删除"
  });
};

/**
 * Select script and clear test case selection
 */
export const selectScript = (
  scriptId: string,
  scripts: Script[],
  setCurrentScript: (script: Script | null) => void,
  setSelectedTestCaseId: (id: string) => void
): void => {
  const script = scripts.find(s => s.id === scriptId);
  setCurrentScript(script || null);
  
  // Clear test case selection when selecting a script
  if (script) {
    setSelectedTestCaseId('');
  }
};

/**
 * Get script language display name
 */
export const getScriptLanguageDisplay = (language: string): string => {
  switch (language) {
    case 'javascript':
      return 'JavaScript';
    case 'python':
      return 'Python';
    case 'bash':
      return 'Bash';
    case 'typescript':
      return 'TypeScript';
    default:
      return language.toUpperCase();
  }
};

/**
 * Get script status display
 */
export const getScriptStatusDisplay = (status: string): string => {
  switch (status) {
    case 'success':
      return '成功';
    case 'error':
      return '错误';
    case 'running':
      return '运行中';
    case 'stopped':
      return '已停止';
    case 'pending':
      return '待执行';
    default:
      return status;
  }
};

/**
 * Get script status color
 */
export const getScriptStatusColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'error':
      return 'text-red-600 bg-red-100 border-red-200';
    case 'running':
      return 'text-blue-600 bg-blue-100 border-blue-200';
    case 'stopped':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'pending':
      return 'text-gray-600 bg-gray-100 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

/**
 * Validate script content
 */
export const validateScriptContent = (content: string, language: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!content.trim()) {
    errors.push('脚本内容不能为空');
    return { valid: false, errors };
  }
  
  // Basic syntax validation based on language
  switch (language) {
    case 'javascript':
      return validateJavaScript(content);
    case 'python':
      return validatePython(content);
    case 'bash':
      return validateBash(content);
    default:
      return { valid: true, errors: [] };
  }
};

/**
 * Validate JavaScript syntax
 */
const validateJavaScript = (content: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  try {
    // Basic syntax checks
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('大括号不匹配');
    }
    if (openParens !== closeParens) {
      errors.push('圆括号不匹配');
    }
    if (openBrackets !== closeBrackets) {
      errors.push('方括号不匹配');
    }
    
    // Check for common syntax issues
    if (content.includes('function') && !content.includes('{')) {
      errors.push('函数定义可能不完整');
    }
    
    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push('JavaScript语法检查失败');
    return { valid: false, errors };
  }
};

/**
 * Validate Python syntax
 */
const validatePython = (content: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic indentation check
  const lines = content.split('\n');
  let expectedIndent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    
    const indent = line.length - line.trimStart().length;
    
    if (line.includes(':') && !line.trim().startsWith('#')) {
      // Line ends with colon, next line should be indented
      expectedIndent += 4;
    } else if (indent < expectedIndent && line.trim() !== '') {
      // Check if indentation is reduced appropriately
      expectedIndent = Math.floor(indent / 4) * 4;
    }
    
    if (indent % 4 !== 0 && line.trim() !== '') {
      errors.push(`第${i + 1}行: 缩进必须是4的倍数`);
    }
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Validate Bash syntax
 */
const validateBash = (content: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    
    // Basic syntax checks for bash
    if (trimmed.includes('if') && !trimmed.includes('then')) {
      // Check if next line has 'then'
      const nextLine = lines[index + 1];
      if (!nextLine || !nextLine.trim().includes('then')) {
        errors.push(`第${index + 1}行: if语句缺少then`);
      }
    }
    
    if (trimmed.includes('then') && !trimmed.includes('fi')) {
      // Look for matching 'fi'
      let foundFi = false;
      for (let i = index + 1; i < lines.length; i++) {
        if (lines[i].trim() === 'fi') {
          foundFi = true;
          break;
        }
      }
      if (!foundFi) {
        errors.push(`第${index + 1}行: if语句缺少匹配的fi`);
      }
    }
  });
  
  return { valid: errors.length === 0, errors };
};