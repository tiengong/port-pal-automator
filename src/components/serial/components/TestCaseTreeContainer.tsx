/**
 * 测试用例树形容器组件
 * 包含用例树、搜索、过滤等功能
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, TestTube2, Hash } from "lucide-react";
import { TestCase } from '../types';
import { TestCaseTreeView } from './TestCaseTreeView';
import { useTestCaseDragDrop } from '../hooks/useTestCaseDragDrop';

export interface TestCaseTreeContainerProps {
  testCases: TestCase[];
  selectedCaseId: string;
  dragInfo: any;
  isExecuting: boolean;
  onSelectCase: (caseId: string) => void;
  onToggleExpand: (caseId: string) => void;
  onUpdateCaseSelection: (caseId: string, selected: boolean) => void;
  onUpdateCommandSelection: (caseId: string, commandId: string, selected: boolean) => void;
  onRunTestCase: (caseId: string) => void;
  onRunCommand: (caseId: string, commandIndex: number) => void;
  onEditCase: (testCase: TestCase) => void;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onSaveInlineEdit: (caseId: string, commandId: string) => void;
  onSetLastFocusedChild: (caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, caseId: string, index: number, position: 'above' | 'below') => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onCreateTestCase?: () => void;
  inlineEdit: { commandId: string | null; value: string };
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
}

export const TestCaseTreeContainer: React.FC<TestCaseTreeContainerProps> = ({
  testCases,
  selectedCaseId,
  dragInfo,
  isExecuting,
  onSelectCase,
  onToggleExpand,
  onUpdateCaseSelection,
  onUpdateCommandSelection,
  onRunTestCase,
  onRunCommand,
  onEditCase,
  onEditCommand,
  onSaveInlineEdit,
  onSetLastFocusedChild,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCreateTestCase,
  inlineEdit,
  setInlineEdit
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'success' | 'failed' | 'pending'>('all');

  // 过滤和搜索逻辑
  const filteredTestCases = useMemo(() => {
    let filtered = testCases;

    // 搜索过滤
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(testCase => {
        const matchesName = testCase.name.toLowerCase().includes(searchLower);
        const matchesDescription = testCase.description?.toLowerCase().includes(searchLower);
        const matchesCommands = testCase.commands.some(cmd => 
          cmd.command.toLowerCase().includes(searchLower) ||
          cmd.expectedResponse?.toLowerCase().includes(searchLower)
        );
        return matchesName || matchesDescription || matchesCommands;
      });
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(testCase => testCase.status === filterStatus);
    }

    return filtered;
  }, [testCases, searchTerm, filterStatus]);

  // 统计信息
  const stats = useMemo(() => {
    const total = testCases.length;
    const running = testCases.filter(tc => tc.status === 'running').length;
    const success = testCases.filter(tc => tc.status === 'success').length;
    const failed = testCases.filter(tc => tc.status === 'failed').length;

    return { total, running, success, failed };
  }, [testCases]);

  const renderSearchBar = () => (
    <div className="flex items-center gap-2 mb-3">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索测试用例..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={onCreateTestCase}
        disabled={isExecuting}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderStats = () => (
    <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-1 text-xs">
        <TestTube2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">总计:</span>
        <Badge variant="secondary" className="text-xs">{stats.total}</Badge>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-yellow-500">●</span>
        <span className="text-muted-foreground">运行:</span>
        <Badge variant="secondary" className="text-xs">{stats.running}</Badge>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-green-500">●</span>
        <span className="text-muted-foreground">成功:</span>
        <Badge variant="secondary" className="text-xs">{stats.success}</Badge>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-red-500">●</span>
        <span className="text-muted-foreground">失败:</span>
        <Badge variant="secondary" className="text-xs">{stats.failed}</Badge>
      </div>
      {searchTerm.trim() && (
        <div className="flex items-center gap-1 text-xs ml-auto">
          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">匹配:</span>
          <Badge variant="default" className="text-xs">{filteredTestCases.length}</Badge>
        </div>
      )}
    </div>
  );

  const renderFilterButtons = () => {
    const filters = [
      { key: 'all', label: '全部', count: stats.total },
      { key: 'running', label: '运行中', count: stats.running },
      { key: 'success', label: '成功', count: stats.success },
      { key: 'failed', label: '失败', count: stats.failed },
      { key: 'pending', label: '待执行', count: stats.total - stats.running - stats.success - stats.failed }
    ] as const;

    return (
      <div className="flex flex-wrap gap-1 mb-3">
        {filters.map(filter => (
          <Button
            key={filter.key}
            variant={filterStatus === filter.key ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setFilterStatus(filter.key)}
          >
            {filter.label}
            {filter.count > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {filter.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="flex-shrink-0 p-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <TestTube2 className="w-4 h-4" />
            测试用例
          </div>
          <Badge variant="outline" className="text-xs"
          >
            {filteredTestCases.length} / {stats.total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 pt-0 overflow-y-auto"
      >
        {renderSearchBar()}
        {renderStats()}
        {renderFilterButtons()}
        <div className="space-y-1"
        >
          <TestCaseTreeView
            testCases={filteredTestCases}
            selectedCaseId={selectedCaseId}
            dragInfo={dragInfo}
            onSelectCase={onSelectCase}
            onToggleExpand={onToggleExpand}
            onUpdateCaseSelection={onUpdateCaseSelection}
            onRunTestCase={onRunTestCase}
            onEditCase={onEditCase}
            onSetLastFocusedChild={onSetLastFocusedChild}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
          {filteredTestCases.length === 0 && (
            <div className="text-center text-muted-foreground py-8"
            >
              <TestTube2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{searchTerm.trim() ? '未找到匹配的测试用例' : '暂无测试用例'}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onCreateTestCase}
              >
                <Plus className="w-4 h-4 mr-1" />
                创建测试用例
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TestCaseTreeContainer;