/**
 * AT命令自动补全工具模块
 * 提供高效的AT命令匹配和自动补全功能
 */

export interface ATCommand {
  command: string;
  description: string;
  expectedResponse: string;
  urcTimeout: number;
  category: string;
}

export interface UrcPattern {
  pattern: string;
  description: string;
  category: string;
}

export interface ATCommandsLibrary {
  version: string;
  description: string;
  commands: ATCommand[];
  urcPatterns: UrcPattern[];
}

/**
 * AT命令自动补全器
 * 使用高效的Trie树结构进行快速前缀匹配
 */
export class ATCommandAutoCompleter {
  private commandTrie: Map<string, any> = new Map();
  private commands: ATCommand[] = [];
  private urcPatterns: UrcPattern[] = [];
  private commandIndex: Map<string, ATCommand> = new Map();

  constructor(library: ATCommandsLibrary) {
    this.commands = library.commands;
    this.urcPatterns = library.urcPatterns;
    this.buildCommandIndex();
    this.buildTrie();
  }

  /**
   * 构建命令索引，提高查找效率
   */
  private buildCommandIndex(): void {
    this.commands.forEach(cmd => {
      this.commandIndex.set(cmd.command.toLowerCase(), cmd);
    });
  }

  /**
   * 构建Trie树用于快速前缀匹配
   */
  private buildTrie(): void {
    this.commands.forEach(cmd => {
      const command = cmd.command.toLowerCase();
      let current = this.commandTrie;
      
      for (let i = 0; i < command.length; i++) {
        const char = command[i];
        if (!current.has(char)) {
          current.set(char, new Map());
        }
        current = current.get(char);
      }
      
      // 在叶子节点存储完整的命令信息
      current.set('$cmd', cmd);
    });
  }

  /**
   * 根据输入内容获取匹配的AT命令
   * @param input 用户输入的内容
   * @param limit 返回结果的最大数量
   * @returns 匹配的AT命令列表
   */
  public getMatches(input: string, limit: number = 10): ATCommand[] {
    if (!input || input.trim().length === 0) {
      return this.getPopularCommands(limit);
    }

    const searchText = input.toLowerCase().trim();
    const matches: ATCommand[] = [];

    // 1. 前缀匹配（最高优先级）
    const prefixMatches = this.getPrefixMatches(searchText, limit);
    matches.push(...prefixMatches);

    // 2. 如果前缀匹配结果不足，进行模糊匹配
    if (matches.length < limit) {
      const fuzzyMatches = this.getFuzzyMatches(searchText, limit - matches.length, matches);
      matches.push(...fuzzyMatches);
    }

    return matches.slice(0, limit);
  }

  /**
   * 获取前缀匹配的命令
   */
  private getPrefixMatches(prefix: string, limit: number): ATCommand[] {
    const matches: ATCommand[] = [];
    
    // 使用Trie树进行高效前缀匹配
    let current = this.commandTrie;
    for (let i = 0; i < prefix.length; i++) {
      const char = prefix[i];
      if (!current.has(char)) {
        return matches;
      }
      current = current.get(char);
    }

    // 收集所有匹配的命令
    this.collectCommandsFromTrie(current, matches, limit);
    return matches;
  }

  /**
   * 从Trie树中收集命令
   */
  private collectCommandsFromTrie(node: Map<string, any>, matches: ATCommand[], limit: number): void {
    if (matches.length >= limit) return;

    // 如果当前节点有命令，添加到结果中
    if (node.has('$cmd')) {
      matches.push(node.get('$cmd'));
    }

    // 递归遍历子节点
    for (const [key, childNode] of node.entries()) {
      if (key !== '$cmd') {
        this.collectCommandsFromTrie(childNode, matches, limit);
        if (matches.length >= limit) break;
      }
    }
  }

  /**
   * 获取模糊匹配的命令
   */
  private getFuzzyMatches(searchText: string, limit: number, exclude: ATCommand[] = []): ATCommand[] {
    const excludeCommands = new Set(exclude.map(cmd => cmd.command));
    const matches: ATCommand[] = [];

    // 使用编辑距离算法进行模糊匹配
    this.commands.forEach(cmd => {
      if (excludeCommands.has(cmd.command)) return;
      
      const command = cmd.command.toLowerCase();
      const description = cmd.description.toLowerCase();
      
      // 计算相似度分数
      let score = 0;
      
      // 命令包含搜索词
      if (command.includes(searchText)) {
        score += 10;
      }
      
      // 描述包含搜索词
      if (description.includes(searchText)) {
        score += 5;
      }
      
      // 计算编辑距离
      const distance = this.levenshteinDistance(command, searchText);
      if (distance <= 2 && searchText.length > 2) {
        score += Math.max(0, 5 - distance);
      }
      
      if (score > 0) {
        matches.push({ ...cmd, score } as ATCommand);
      }
    });

    // 按分数排序
    matches.sort((a, b) => (b as any).score - (a as any).score);
    return matches.slice(0, limit);
  }

  /**
   * 获取常用命令
   */
  private getPopularCommands(limit: number): ATCommand[] {
    // 返回最常用的前几个命令
    const popularCommands = ['AT', 'ATI', 'AT+CREG?', 'AT+CSQ', 'AT+CPIN?'];
    return this.commands
      .filter(cmd => popularCommands.includes(cmd.command))
      .slice(0, limit);
  }

  /**
   * 计算两个字符串之间的编辑距离（Levenshtein距离）
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 根据命令名称获取完整的AT命令信息
   */
  public getCommandByName(command: string): ATCommand | null {
    return this.commandIndex.get(command.toLowerCase()) || null;
  }

  /**
   * 获取指定类别的命令
   */
  public getCommandsByCategory(category: string): ATCommand[] {
    return this.commands.filter(cmd => 
      cmd.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * 获取URC模式匹配
   */
  public getUrcMatches(input: string): UrcPattern[] {
    if (!input || input.trim().length === 0) {
      return [];
    }

    const searchText = input.toLowerCase().trim();
    return this.urcPatterns.filter(pattern => 
      pattern.pattern.toLowerCase().includes(searchText) ||
      pattern.description.toLowerCase().includes(searchText)
    );
  }

  /**
   * 获取所有类别
   */
  public getCategories(): string[] {
    const categories = new Set(this.commands.map(cmd => cmd.category));
    return Array.from(categories).sort();
  }
}

/**
 * AT命令自动补全管理器
 * 负责加载和管理AT命令库
 */
export class ATCommandAutoCompleteManager {
  private static instance: ATCommandAutoCompleteManager;
  private completer: ATCommandAutoCompleter | null = null;
  private libraryLoaded: boolean = false;

  private constructor() {}

  public static getInstance(): ATCommandAutoCompleteManager {
    if (!ATCommandAutoCompleteManager.instance) {
      ATCommandAutoCompleteManager.instance = new ATCommandAutoCompleteManager();
    }
    return ATCommandAutoCompleteManager.instance;
  }

  /**
   * 加载AT命令库
   */
  public async loadLibrary(libraryPath: string = '/at-commands-library.json'): Promise<void> {
    if (this.libraryLoaded) {
      return;
    }

    try {
      const response = await fetch(libraryPath);
      if (!response.ok) {
        throw new Error(`Failed to load AT commands library: ${response.statusText}`);
      }

      const library: ATCommandsLibrary = await response.json();
      this.completer = new ATCommandAutoCompleter(library);
      this.libraryLoaded = true;
    } catch (error) {
      console.error('Failed to load AT commands library:', error);
      // 加载失败时创建一个空的补全器
      this.completer = new ATCommandAutoCompleter({
        version: '1.0',
        description: 'Empty AT commands library',
        commands: [],
        urcPatterns: []
      });
    }
  }

  /**
   * 获取自动补全器实例
   */
  public getCompleter(): ATCommandAutoCompleter | null {
    return this.completer;
  }

  /**
   * 检查库是否已加载
   */
  public isLibraryLoaded(): boolean {
    return this.libraryLoaded;
  }
}

// 导出单例实例
export const atCommandAutoCompleteManager = ATCommandAutoCompleteManager.getInstance();