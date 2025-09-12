/**
 * 虚拟化测试用例树组件
 * 用于优化大型测试用例树的渲染性能
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { TestCase } from '@/components/serial/types';
import { TestCaseTreeView, TestCaseTreeViewProps } from './TestCaseTreeView';

interface VirtualizedTestCaseTreeProps extends Omit<TestCaseTreeViewProps, 'testCases'> {
  testCases: TestCase[];
  itemHeight?: number;
  overscan?: number;
  maxHeight?: number;
}

interface FlattenedItem {
  testCase: TestCase;
  level: number;
  parentId?: string;
  index: number;
}

export const VirtualizedTestCaseTree: React.FC<VirtualizedTestCaseTreeProps> = React.memo(({
  testCases,
  itemHeight = 48,
  overscan = 5,
  maxHeight = 600,
  ...treeViewProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(maxHeight);

  // 扁平化测试用例树
  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];
    
    const flattenTestCases = (cases: TestCase[], level = 0, parentId?: string) => {
      cases.forEach((testCase, index) => {
        items.push({
          testCase,
          level,
          parentId,
          index
        });
        
        // 如果展开，添加子用例
        if (testCase.isExpanded && testCase.subCases.length > 0) {
          flattenTestCases(testCase.subCases, level + 1, testCase.id);
        }
      });
    };
    
    flattenTestCases(testCases);
    return items;
  }, [testCases]);

  const totalHeight = flattenedItems.length * itemHeight;

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
    
    // 添加overscan
    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(flattenedItems.length - 1, endIndex + overscan);
    
    return { start, end };
  }, [scrollTop, containerHeight, itemHeight, flattenedItems.length, overscan]);

  // 可见项目
  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;
    return flattenedItems.slice(start, end + 1);
  }, [flattenedItems, visibleRange]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 监听容器大小变化
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(Math.min(rect.height, maxHeight));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [maxHeight]);

  // 渲染可见项目
  const renderVisibleItems = () => {
    return visibleItems.map(({ testCase, level, parentId, index }) => {
      const offsetTop = (flattenedItems.findIndex(item => 
        item.testCase.id === testCase.id && item.level === level && item.index === index
      )) * itemHeight;

      // 为每个项目创建独立的TestCase数组
      const itemTestCases = [testCase];

      return (
        <div
          key={`${testCase.id}-${level}-${index}`}
          className="virtualized-item"
          style={{
            position: 'absolute',
            top: offsetTop,
            left: 0,
            right: 0,
            height: itemHeight,
            transform: 'translateZ(0)' // 启用硬件加速
          }}
        >
          <TestCaseTreeView
            {...treeViewProps}
            testCases={itemTestCases}
            level={level}
            parentCaseId={parentId}
          />
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="virtualized-test-case-tree"
      style={{
        position: 'relative',
        height: `${containerHeight}px`,
        overflow: 'auto',
        contain: 'layout style paint' // 性能优化
      }}
      onScroll={handleScroll}
    >
      {/* 占位符，用于正确滚动 */}
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {/* 可见项目 */}
        {renderVisibleItems()}
      </div>
    </div>
  );
});

VirtualizedTestCaseTree.displayName = 'VirtualizedTestCaseTree';