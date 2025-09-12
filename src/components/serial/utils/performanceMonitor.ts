/**
 * 性能监控系统
 * 实时监控应用性能指标，提供性能分析和优化建议
 */

export interface PerformanceMetrics {
  // 渲染性能
  renderTime: number;
  renderCount: number;
  rerenderCount: number;
  
  // 内存使用
  memoryUsage: number;
  memoryPeak: number;
  objectPoolHits: number;
  objectPoolMisses: number;
  
  // 响应时间
  operationTime: number;
  cacheHitRate: number;
  throttleEfficiency: number;
  
  // 资源使用
  domNodes: number;
  eventListeners: number;
  setTimeoutCount: number;
  setIntervalCount: number;
  
  timestamp: number;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  recommendations: string[];
  warnings: string[];
  score: number; // 0-100 性能评分
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = this.getInitialMetrics();
  private metricHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 100;
  private monitoring = false;
  private startTime = 0;
  
  constructor() {
    this.startMonitoring();
  }
  
  private getInitialMetrics(): PerformanceMetrics {
    return {
      renderTime: 0,
      renderCount: 0,
      rerenderCount: 0,
      memoryUsage: 0,
      memoryPeak: 0,
      objectPoolHits: 0,
      objectPoolMisses: 0,
      operationTime: 0,
      cacheHitRate: 0,
      throttleEfficiency: 0,
      domNodes: 0,
      eventListeners: 0,
      setTimeoutCount: 0,
      setIntervalCount: 0,
      timestamp: Date.now()
    };
  }
  
  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.startTime = Date.now();
    
    // 定期收集性能数据
    this.collectMetrics();
    
    // 监听内存使用情况（如果可用）
    if (performance.memory) {
      this.monitorMemoryUsage();
    }
    
    // 监听DOM变化
    this.monitorDOMChanges();
  }
  
  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    this.monitoring = false;
  }
  
  /**
   * 记录渲染时间
   */
  recordRenderTime(startTime: number, componentName?: string): void {
    const renderTime = performance.now() - startTime;
    this.metrics.renderTime = renderTime;
    this.metrics.renderCount++;
    
    if (renderTime > 16.67) { // 超过60fps的帧时间
      console.warn(`[Performance] Slow render detected: ${renderTime.toFixed(2)}ms in ${componentName || 'unknown component'}`);
    }
  }
  
  /**
   * 记录重渲染
   */
  recordRerender(componentName?: string): void {
    this.metrics.rerenderCount++;
    
    if (this.metrics.rerenderCount % 100 === 0) {
      console.warn(`[Performance] High rerender count: ${this.metrics.rerenderCount} in ${componentName || 'unknown component'}`);
    }
  }
  
  /**
   * 记录操作时间
   */
  recordOperationTime(operation: string, startTime: number): void {
    const operationTime = performance.now() - startTime;
    this.metrics.operationTime = operationTime;
    
    if (operationTime > 100) { // 超过100ms的操作
      console.warn(`[Performance] Slow operation detected: ${operationTime.toFixed(2)}ms for ${operation}`);
    }
  }
  
  /**
   * 记录对象池使用情况
   */
  recordObjectPoolUsage(hits: number, misses: number): void {
    this.metrics.objectPoolHits += hits;
    this.metrics.objectPoolMisses += misses;
    
    const total = hits + misses;
    if (total > 0) {
      const hitRate = (hits / total) * 100;
      this.metrics.cacheHitRate = hitRate;
    }
  }
  
  /**
   * 记录节流效率
   */
  recordThrottleEfficiency(originalCount: number, throttledCount: number): void {
    if (originalCount > 0) {
      this.metrics.throttleEfficiency = ((originalCount - throttledCount) / originalCount) * 100;
    }
  }
  
  /**
   * 收集性能指标
   */
  private collectMetrics(): void {
    if (!this.monitoring) return;
    
    // 更新DOM相关指标
    this.updateDOMMetrics();
    
    // 更新定时器指标
    this.updateTimerMetrics();
    
    // 保存到历史记录
    this.saveMetrics();
    
    // 继续收集
    setTimeout(() => this.collectMetrics(), 1000);
  }
  
  /**
   * 更新DOM指标
   */
  private updateDOMMetrics(): void {
    this.metrics.domNodes = document.querySelectorAll('*').length;
    
    // 估算事件监听器数量（简化版）
    this.metrics.eventListeners = this.estimateEventListeners();
  }
  
  /**
   * 更新定时器指标
   */
  private updateTimerMetrics(): void {
    // 这里可以通过重写setTimeout/setInterval来准确计数
    // 简化版本使用估算
    this.metrics.setTimeoutCount = this.estimateActiveTimeouts();
    this.metrics.setIntervalCount = this.estimateActiveIntervals();
  }
  
  /**
   * 监控内存使用
   */
  private monitorMemoryUsage(): void {
    if (!performance.memory) return;
    
    const updateMemory = () => {
      if (!this.monitoring) return;
      
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const limit = memory.jsHeapSizeLimit;
      
      this.metrics.memoryUsage = (used / limit) * 100;
      this.metrics.memoryPeak = Math.max(this.metrics.memoryPeak, this.metrics.memoryUsage);
      
      if (this.metrics.memoryUsage > 80) {
        console.warn(`[Performance] High memory usage: ${this.metrics.memoryUsage.toFixed(2)}%`);
      }
      
      setTimeout(updateMemory, 5000);
    };
    
    updateMemory();
  }
  
  /**
   * 监控DOM变化
   */
  private monitorDOMChanges(): void {
    if (typeof MutationObserver === 'undefined') return;
    
    let mutationCount = 0;
    
    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
      
      if (mutationCount > 100) {
        console.warn(`[Performance] High DOM mutation rate: ${mutationCount} mutations`);
        mutationCount = 0;
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });
    
    // 定期重置计数
    setInterval(() => {
      mutationCount = 0;
    }, 10000);
  }
  
  /**
   * 保存指标到历史记录
   */
  private saveMetrics(): void {
    const currentMetrics = { ...this.metrics, timestamp: Date.now() };
    this.metricHistory.push(currentMetrics);
    
    if (this.metricHistory.length > this.maxHistorySize) {
      this.metricHistory.shift();
    }
  }
  
  /**
   * 获取性能报告
   */
  getPerformanceReport(): PerformanceReport {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    let score = 100;
    
    // 渲染性能分析
    if (this.metrics.renderTime > 16.67) {
      warnings.push(`渲染时间过长: ${this.metrics.renderTime.toFixed(2)}ms`);
      score -= 10;
    }
    
    if (this.metrics.rerenderCount > 50) {
      warnings.push(`重渲染次数过多: ${this.metrics.rerenderCount}`);
      score -= 15;
    }
    
    // 内存使用分析
    if (this.metrics.memoryUsage > 70) {
      warnings.push(`内存使用过高: ${this.metrics.memoryUsage.toFixed(2)}%`);
      score -= 20;
    }
    
    // 操作性能分析
    if (this.metrics.operationTime > 100) {
      warnings.push(`操作响应慢: ${this.metrics.operationTime.toFixed(2)}ms`);
      score -= 10;
    }
    
    // 缓存效率分析
    if (this.metrics.cacheHitRate < 80) {
      warnings.push(`缓存命中率低: ${this.metrics.cacheHitRate.toFixed(2)}%`);
      score -= 5;
    }
    
    // DOM复杂度分析
    if (this.metrics.domNodes > 1000) {
      warnings.push(`DOM节点过多: ${this.metrics.domNodes}`);
      score -= 10;
    }
    
    if (this.metrics.eventListeners > 100) {
      warnings.push(`事件监听器过多: ${this.metrics.eventListeners}`);
      score -= 5;
    }
    
    // 生成优化建议
    if (this.metrics.renderTime > 16.67) {
      recommendations.push('考虑使用React.memo优化组件渲染');
      recommendations.push('检查是否有不必要的重渲染');
    }
    
    if (this.metrics.memoryUsage > 70) {
      recommendations.push('检查内存泄漏，及时清理定时器和事件监听器');
      recommendations.push('使用对象池减少内存分配');
    }
    
    if (this.metrics.cacheHitRate < 80) {
      recommendations.push('优化缓存策略，增加缓存命中率');
    }
    
    if (this.metrics.operationTime > 100) {
      recommendations.push('优化算法复杂度，减少操作时间');
      recommendations.push('考虑使用Web Workers处理复杂计算');
    }
    
    return {
      metrics: { ...this.metrics },
      recommendations,
      warnings,
      score: Math.max(0, Math.min(100, score))
    };
  }
  
  /**
   * 获取历史性能数据
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.metricHistory];
  }
  
  /**
   * 获取性能趋势
   */
  getPerformanceTrend(): {
    renderTime: 'improving' | 'stable' | 'degrading';
    memoryUsage: 'improving' | 'stable' | 'degrading';
    overall: 'improving' | 'stable' | 'degrading';
  } {
    if (this.metricHistory.length < 10) {
      return { renderTime: 'stable', memoryUsage: 'stable', overall: 'stable' };
    }
    
    const recent = this.metricHistory.slice(-10);
    const older = this.metricHistory.slice(-20, -10);
    
    const avgRenderTimeRecent = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length;
    const avgRenderTimeOlder = older.reduce((sum, m) => sum + m.renderTime, 0) / older.length;
    
    const avgMemoryRecent = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgMemoryOlder = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;
    
    const renderTrend = avgRenderTimeRecent < avgRenderTimeOlder * 0.95 ? 'improving' :
                       avgRenderTimeRecent > avgRenderTimeOlder * 1.05 ? 'degrading' : 'stable';
    
    const memoryTrend = avgMemoryRecent < avgMemoryOlder * 0.95 ? 'improving' :
                       avgMemoryRecent > avgMemoryOlder * 1.05 ? 'degrading' : 'stable';
    
    const overallTrend = (renderTrend === 'improving' && memoryTrend !== 'degrading') || 
                        (memoryTrend === 'improving' && renderTrend !== 'degrading') ? 'improving' :
                        (renderTrend === 'degrading' || memoryTrend === 'degrading') ? 'degrading' : 'stable';
    
    return { renderTime: renderTrend, memoryUsage: memoryTrend, overall: overallTrend };
  }
  
  /**
   * 重置性能数据
   */
  reset(): void {
    this.metrics = this.getInitialMetrics();
    this.metricHistory = [];
  }
  
  /**
   * 估算事件监听器数量（简化版）
   */
  private estimateEventListeners(): number {
    // 简化的估算方法
    const elements = document.querySelectorAll('*');
    const commonEvents = ['click', 'change', 'input', 'scroll', 'resize', 'keydown', 'keyup'];
    let count = 0;
    
    elements.forEach(element => {
      commonEvents.forEach(event => {
        if ((element as any)[`on${event}`]) {
          count++;
        }
      });
    });
    
    return count * 2; // 粗略估算
  }
  
  /**
   * 估算活跃的setTimeout数量（简化版）
   */
  private estimateActiveTimeouts(): number {
    // 简化估算，实际实现需要重写setTimeout
    return Math.floor(this.metrics.renderCount / 10);
  }
  
  /**
   * 估算活跃的setInterval数量（简化版）
   */
  private estimateActiveIntervals(): number {
    // 简化估算，实际实现需要重写setInterval
    return Math.floor(this.metrics.renderCount / 20);
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控Hook（用于React组件）
 */
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = performance.now();
  
  // 记录组件渲染
  React.useEffect(() => {
    performanceMonitor.recordRenderTime(startTime, componentName);
  });
  
  // 记录重渲染
  React.useEffect(() => {
    performanceMonitor.recordRerender(componentName);
  });
  
  return {
    getReport: () => performanceMonitor.getPerformanceReport(),
    getHistory: () => performanceMonitor.getPerformanceHistory(),
    getTrend: () => performanceMonitor.getPerformanceTrend()
  };
}; 

// 导入React（如果文件中没有）
import React from 'react';