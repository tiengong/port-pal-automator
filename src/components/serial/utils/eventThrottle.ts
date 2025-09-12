/**
 * 事件节流工具
 * 优化高频事件处理，减少不必要的计算和渲染
 */

export interface ThrottleOptions {
  leading?: boolean;    // 是否立即执行第一次
  trailing?: boolean;   // 是否在延迟后执行最后一次
  maxWait?: number;     // 最大等待时间
}

/**
 * 节流函数实现
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  wait: number,
  options: ThrottleOptions = {}
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let result: any;
  
  const { leading = true, trailing = true, maxWait } = options;
  
  const invokeFunc = (time: number, args: Parameters<T>) => {
    lastInvokeTime = time;
    result = func(...args);
    return result;
  };
  
  const leadingEdge = (time: number, args: Parameters<T>) => {
    lastInvokeTime = time;
    if (leading) {
      return invokeFunc(time, args);
    }
    lastCallTime = time;
    return result;
  };
  
  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    
    return maxWait !== undefined 
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  };
  
  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    
    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  };
  
  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer
    timeout = setTimeout(timerExpired, remainingWait(time));
    return result;
  };
  
  const trailingEdge = (time: number) => {
    timeout = null;
    
    if (trailing && lastCallTime !== null) {
      return invokeFunc(time, [] as any);
    }
    lastCallTime = null;
    return result;
  };
  
  const throttled = (...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastCallTime = time;
    lastArgs = args;
    
    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(time, args);
      }
      if (maxWait !== undefined) {
        // Handle invocations in a tight loop
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(time, args);
      }
    }
    
    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
    return result;
  };
  
  throttled.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastCallTime = null;
    timeout = null;
  };
  
  let lastArgs: Parameters<T>;
  
  return throttled;
};

/**
 * 防抖函数实现
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } => {
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let timerId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T>;
  let result: any;
  
  const { leading = false, trailing = true, maxWait } = options;
  
  const invokeFunc = (time: number) => {
    const args = lastArgs;
    lastArgs = null as any;
    lastCallTime = null;
    lastInvokeTime = time;
    result = func(...args);
    return result;
  };
  
  const leadingEdge = (time: number) => {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  };
  
  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    
    return maxWait !== undefined 
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  };
  
  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    
    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  };
  
  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer
    timerId = setTimeout(timerExpired, remainingWait(time));
  };
  
  const trailingEdge = (time: number) => {
    timerId = null;
    
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null as any;
    return result;
  };
  
  const debounced = (...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastArgs = args;
    lastCallTime = time;
    
    if (isInvoking) {
      if (timerId === null) {
        return leadingEdge(time);
      }
      if (maxWait !== undefined) {
        // Handle invocations in a tight loop
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(time);
      }
    }
    
    if (timerId === null) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  };
  
  debounced.cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = null as any;
    lastCallTime = null;
    timerId = null;
  };
  
  debounced.flush = () => {
    if (timerId !== null) {
      const time = Date.now();
      return trailingEdge(time);
    }
    return result;
  };
  
  return debounced;
};

/**
 * 串口数据处理节流配置
 */
export const SERIAL_THROTTLE_CONFIG = {
  DATA_RECEIVED: 50,      // 数据接收节流 50ms
  COMMAND_SEND: 100,      // 命令发送节流 100ms
  STATUS_UPDATE: 200,     // 状态更新节流 200ms
  LOG_UPDATE: 100,        // 日志更新节流 100ms
  URC_PROCESSING: 30      // URC处理节流 30ms
} as const;

/**
 * 测试用例操作节流配置
 */
export const TESTCASE_THROTTLE_CONFIG = {
  SELECTION_CHANGE: 150,  // 选择变化节流 150ms
  EXPAND_COLLAPSE: 100,   // 展开折叠节流 100ms
  DRAG_DROP: 200,         // 拖拽操作节流 200ms
  EXECUTION_UPDATE: 100,  // 执行状态更新节流 100ms
  SCROLL: 50              // 滚动节流 50ms
} as const;

/**
 * 高频事件节流管理器
 */
export class EventThrottleManager {
  private throttledFunctions = new Map<string, ((...args: any[]) => void) & { cancel: () => void }>();
  
  /**
   * 创建或获取节流函数
   */
  getThrottledFunction<T extends (...args: any[]) => void>(
    key: string,
    func: T,
    wait: number,
    options?: ThrottleOptions
  ): (...args: Parameters<T>) => void {
    if (!this.throttledFunctions.has(key)) {
      const throttled = throttle(func, wait, options);
      this.throttledFunctions.set(key, throttled);
    }
    return this.throttledFunctions.get(key) as (...args: Parameters<T>) => void;
  }
  
  /**
   * 取消指定节流函数
   */
  cancel(key: string): void {
    const throttled = this.throttledFunctions.get(key);
    if (throttled) {
      throttled.cancel();
      this.throttledFunctions.delete(key);
    }
  }
  
  /**
   * 取消所有节流函数
   */
  cancelAll(): void {
    this.throttledFunctions.forEach(throttled => throttled.cancel());
    this.throttledFunctions.clear();
  }
  
  /**
   * 获取节流函数统计
   */
  getStats(): { total: number; keys: string[] } {
    return {
      total: this.throttledFunctions.size,
      keys: Array.from(this.throttledFunctions.keys())
    };
  }
}

// 全局事件节流管理器实例
export const eventThrottleManager = new EventThrottleManager();