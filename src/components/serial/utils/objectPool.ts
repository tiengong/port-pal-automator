/**
 * 对象池机制
 * 减少对象创建和垃圾回收开销
 */

export interface Poolable {
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private activeObjects = new Set<T>();
  
  constructor(
    private factory: () => T,
    private reset: (obj: T) => void = (obj) => obj.reset(),
    private initialSize = 10,
    private maxSize = 100
  ) {
    this.initialize();
  }

  /**
   * 初始化对象池
   */
  private initialize(): void {
    for (let i = 0; i < this.initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * 获取对象
   */
  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      // 池为空，创建新对象
      obj = this.factory();
    }
    
    this.activeObjects.add(obj);
    return obj;
  }

  /**
   * 释放对象回池
   */
  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      console.warn('尝试释放不属于池中的对象');
      return;
    }
    
    this.activeObjects.delete(obj);
    
    // 重置对象状态
    this.reset(obj);
    
    // 如果池未满，将对象放回池中
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * 批量释放对象
   */
  releaseAll(objects: T[]): void {
    objects.forEach(obj => this.release(obj));
  }

  /**
   * 释放所有活跃对象
   */
  releaseAllActive(): void {
    const activeObjects = Array.from(this.activeObjects);
    activeObjects.forEach(obj => this.release(obj));
  }

  /**
   * 清空对象池
   */
  clear(): void {
    this.pool.length = 0;
    this.activeObjects.clear();
  }

  /**
   * 获取池的统计信息
   */
  getStats(): {
    available: number;
    active: number;
    total: number;
    utilization: number;
  } {
    const available = this.pool.length;
    const active = this.activeObjects.size;
    const total = available + active;
    const utilization = total > 0 ? active / total : 0;
    
    return {
      available,
      active,
      total,
      utilization
    };
  }

  /**
   * 调整池大小
   */
  resize(newSize: number): void {
    if (newSize < this.activeObjects.size) {
      console.warn('新大小小于当前活跃对象数');
      return;
    }
    
    const currentTotal = this.pool.length + this.activeObjects.size;
    const diff = newSize - currentTotal;
    
    if (diff > 0) {
      // 增加池大小
      for (let i = 0; i < diff; i++) {
        this.pool.push(this.factory());
      }
    } else if (diff < 0) {
      // 减少池大小
      const removeCount = Math.min(-diff, this.pool.length);
      this.pool.splice(-removeCount, removeCount);
    }
    
    this.maxSize = newSize;
  }

  /**
   * 是否包含指定对象
   */
  contains(obj: T): boolean {
    return this.activeObjects.has(obj) || this.pool.includes(obj);
  }

  /**
   * 获取活跃对象数量
   */
  getActiveCount(): number {
    return this.activeObjects.size;
  }

  /**
   * 获取可用对象数量
   */
  getAvailableCount(): number {
    return this.pool.length;
  }
}

/**
 * 通用对象池实现（适用于没有reset方法的对象）
 */
export class GenericObjectPool<T> {
  private pool: T[] = [];
  private activeObjects = new Set<T>();
  
  constructor(
    private factory: () => T,
    private reset: (obj: T) => void = () => {},
    private initialSize = 10,
    private maxSize = 100
  ) {
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }
    
    this.activeObjects.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      console.warn('尝试释放不属于池中的对象');
      return;
    }
    
    this.activeObjects.delete(obj);
    this.reset(obj);
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  releaseAllActive(): void {
    const activeObjects = Array.from(this.activeObjects);
    activeObjects.forEach(obj => this.release(obj));
  }

  clear(): void {
    this.pool.length = 0;
    this.activeObjects.clear();
  }

  getStats(): {
    available: number;
    active: number;
    total: number;
    utilization: number;
  } {
    const available = this.pool.length;
    const active = this.activeObjects.size;
    const total = available + active;
    const utilization = total > 0 ? active / total : 0;
    
    return {
      available,
      active,
      total,
      utilization
    };
  }
}

/**
 * 日志条目对象池
 */
export interface LogEntry extends Poolable {
  id: string;
  timestamp: Date;
  type: 'sent' | 'received' | 'system' | 'error';
  data: string;
  format: 'utf8' | 'hex';
  portLabel?: string;
}

export const createLogEntryPool = () => {
  return new ObjectPool<LogEntry>(
    () => ({
      id: '',
      timestamp: new Date(),
      type: 'received',
      data: '',
      format: 'utf8',
      portLabel: undefined,
      reset() {
        this.id = '';
        this.data = '';
        this.timestamp = new Date();
        this.type = 'received';
        this.format = 'utf8';
        this.portLabel = undefined;
      }
    }),
    (entry) => entry.reset(),
    50,  // initialSize
    200  // maxSize
  );
};

/**
 * 执行结果对象池
 */
export interface ExecutionResult extends Poolable {
  commandId: string;
  success: boolean;
  responseTime: number;
  actualResponse?: string;
  error?: string;
}

export const createExecutionResultPool = () => {
  return new ObjectPool<ExecutionResult>(
    () => ({
      commandId: '',
      success: false,
      responseTime: 0,
      actualResponse: undefined,
      error: undefined,
      reset() {
        this.commandId = '';
        this.success = false;
        this.responseTime = 0;
        this.actualResponse = undefined;
        this.error = undefined;
      }
    }),
    (result) => result.reset(),
    20,  // initialSize
    100  // maxSize
  );
};

/**
 * 全局对象池实例
 */
export const logEntryPool = createLogEntryPool();
export const executionResultPool = createExecutionResultPool();