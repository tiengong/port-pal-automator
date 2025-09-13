/**
 * 数据缓冲管理器 - 用于测试命令期间的数据缓冲
 * 实现双路径数据处理：显示路径（立即显示）+ 测试路径（仅在测试时缓冲）
 */

export interface TestCommandContext {
  commandId: string;
  expectedResponse?: string;
  timeout: number;
  startTime: number;
}

export class DataBufferManager {
  private testBuffers = new Map<string, Uint8Array[]>(); // 按端口标签缓冲数据
  private testContexts = new Map<string, TestCommandContext>(); // 测试上下文
  private displayCallbacks = new Map<string, (data: Uint8Array) => void>(); // 显示回调
  private testCallbacks = new Map<string, (data: Uint8Array) => void>(); // 测试回调

  /**
   * 注册端口的数据处理回调
   */
  registerPort(portLabel: string, displayCallback: (data: Uint8Array) => void, testCallback?: (data: Uint8Array) => void): void {
    this.displayCallbacks.set(portLabel, displayCallback);
    if (testCallback) {
      this.testCallbacks.set(portLabel, testCallback);
    }
    this.testBuffers.set(portLabel, []);
  }

  /**
   * 处理接收到的数据 - 中断式双路径处理
   */
  processData(portLabel: string, data: Uint8Array): void {
    // 显示路径：立即显示数据（中断式处理）
    const displayCallback = this.displayCallbacks.get(portLabel);
    if (displayCallback) {
      displayCallback(data);
    }

    // 测试路径：仅在测试期间缓冲数据
    const testContext = this.testContexts.get(portLabel);
    if (testContext) {
      const buffer = this.testBuffers.get(portLabel);
      if (buffer) {
        buffer.push(data);
        
        // 调用测试回调
        const testCallback = this.testCallbacks.get(portLabel);
        if (testCallback) {
          testCallback(data);
        }
      }
    }
  }

  /**
   * 开始测试命令 - 启动缓冲
   */
  startTestCommand(portLabel: string, context: TestCommandContext): void {
    this.testContexts.set(portLabel, context);
    // 清空之前的缓冲数据
    const buffer = this.testBuffers.get(portLabel);
    if (buffer) {
      buffer.length = 0;
    }
  }

  /**
   * 结束测试命令 - 停止缓冲
   */
  endTestCommand(portLabel: string): Uint8Array[] {
    this.testContexts.delete(portLabel);
    const buffer = this.testBuffers.get(portLabel);
    if (buffer) {
      const result = [...buffer];
      buffer.length = 0; // 清空缓冲
      return result;
    }
    return [];
  }

  /**
   * 获取测试期间缓冲的数据
   */
  getTestBuffer(portLabel: string): Uint8Array[] {
    return this.testBuffers.get(portLabel) || [];
  }

  /**
   * 检查是否在测试模式
   */
  isTestMode(portLabel: string): boolean {
    return this.testContexts.has(portLabel);
  }

  /**
   * 清理端口资源
   */
  cleanup(portLabel: string): void {
    this.testBuffers.delete(portLabel);
    this.testContexts.delete(portLabel);
    this.displayCallbacks.delete(portLabel);
    this.testCallbacks.delete(portLabel);
  }

  /**
   * 清理所有资源
   */
  cleanupAll(): void {
    this.testBuffers.clear();
    this.testContexts.clear();
    this.displayCallbacks.clear();
    this.testCallbacks.clear();
  }
}

// 全局数据缓冲管理器实例
export const dataBufferManager = new DataBufferManager();