/**
 * 性能监控面板组件
 * 实时显示应用性能指标和优化建议
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  RotateCcw,
  Download
} from 'lucide-react';
import { performanceMonitor, PerformanceReport } from '../utils/performanceMonitor';

interface PerformanceMonitorPanelProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const PerformanceMonitorPanel: React.FC<PerformanceMonitorPanelProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 1000
}) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  
  // 获取性能报告
  const updateReport = useCallback(() => {
    const newReport = performanceMonitor.getPerformanceReport();
    setReport(newReport);
  }, []);
  
  // 定期更新报告
  useEffect(() => {
    if (!autoRefresh || !isMonitoring) return;
    
    updateReport();
    const interval = setInterval(updateReport, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, isMonitoring, refreshInterval, updateReport]);
  
  // 切换监控状态
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      performanceMonitor.stopMonitoring();
    } else {
      performanceMonitor.startMonitoring();
    }
    setIsMonitoring(!isMonitoring);
  }, [isMonitoring]);
  
  // 重置性能数据
  const resetMetrics = useCallback(() => {
    performanceMonitor.reset();
    updateReport();
  }, [updateReport]);
  
  // 导出性能报告
  const exportReport = useCallback(() => {
    const history = performanceMonitor.getPerformanceHistory();
    const trend = performanceMonitor.getPerformanceTrend();
    const report = performanceMonitor.getPerformanceReport();
    
    const exportData = {
      timestamp: Date.now(),
      currentReport: report,
      performanceHistory: history,
      trend,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  
  if (!report) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            性能监控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            正在收集性能数据...
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };
  
  const getTrendIcon = (trend: 'improving' | 'stable' | 'degrading') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };
  
  const trend = performanceMonitor.getPerformanceTrend();
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          性能监控
        </CardTitle>
        <div className="flex items-center gap-2">
          {getTrendIcon(trend.overall)}
          <Badge variant={getScoreBadgeVariant(report.score)} className="ml-2">
            {report.score.toFixed(0)}分
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总体评分 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>总体性能评分</span>
            <span className={getScoreColor(report.score)}>{report.score.toFixed(1)}/100</span>
          </div>
          <Progress value={report.score} className="h-2" />
        </div>
        
        {/* 关键指标 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">渲染时间</label>
            <div className={`text-sm font-medium ${
              report.metrics.renderTime > 16.67 ? 'text-red-600' : 'text-green-600'
            }`}>
              {report.metrics.renderTime.toFixed(2)}ms
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">内存使用</label>
            <div className={`text-sm font-medium ${
              report.metrics.memoryUsage > 70 ? 'text-red-600' : 
              report.metrics.memoryUsage > 50 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {report.metrics.memoryUsage.toFixed(1)}%
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">缓存命中率</label>
            <div className={`text-sm font-medium ${
              report.metrics.cacheHitRate > 80 ? 'text-green-600' : 'text-red-600'
            }`}>
              {report.metrics.cacheHitRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">重渲染次数</label>
            <div className={`text-sm font-medium ${
              report.metrics.rerenderCount > 50 ? 'text-red-600' : 'text-green-600'
            }`}>
              {report.metrics.rerenderCount}
            </div>
          </div>
        </div>
        
        {/* 警告和建议 */}
        {(report.warnings.length > 0 || report.recommendations.length > 0) && (
          <div className="space-y-3">
            {report.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  性能警告
                </div>
                <ul className="text-xs space-y-1 text-red-600">
                  {report.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {report.recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                  <CheckCircle className="w-4 h-4" />
                  优化建议
                </div>
                <ul className="text-xs space-y-1 text-blue-600">
                  {report.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* 控制按钮 */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMonitoring}
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {isMonitoring ? '暂停监控' : '开始监控'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetMetrics}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置数据
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportReport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报告
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 

export default PerformanceMonitorPanel;