import React from 'react';
import { DRAG_DROP_STYLES, LEVEL_INDENT } from '@/components/serial/styles/common';

export interface DragDropWrapperProps {
  children: React.ReactNode;
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  dropPosition?: 'above' | 'below' | null;
  isExecuting?: boolean;
  level?: number;
  className?: string;
  style?: React.CSSProperties;
  
  // 拖拽事件
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  
  // 点击事件
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  
  // 其他属性
  id?: string;
  title?: string;
  role?: string;
  'aria-label'?: string;
}

export const DragDropWrapper: React.FC<DragDropWrapperProps> = ({
  children,
  draggable = true,
  isDragging = false,
  isDropTarget = false,
  dropPosition = null,
  isExecuting = false,
  level = 0,
  className = '',
  style,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
  onDoubleClick,
  ...props
}) => {
  // 构建样式类名
  const buildClassName = () => {
    const styles: string[] = [];
    
    // 基础样式
    if (level === 0) {
      styles.push(DRAG_DROP_STYLES.CONTAINER_BASE);
    } else {
      styles.push(DRAG_DROP_STYLES.BASE);
    }
    
    // 拖拽状态样式
    if (isDragging) styles.push(DRAG_DROP_STYLES.DRAGGING);
    if (isDropTarget && dropPosition === 'above') styles.push(DRAG_DROP_STYLES.DROP_TARGET_ABOVE);
    if (isDropTarget && dropPosition === 'below') styles.push(DRAG_DROP_STYLES.DROP_TARGET_BELOW);
    if (isExecuting) styles.push(DRAG_DROP_STYLES.EXECUTING);
    
    // 自定义样式
    if (className) styles.push(className);
    
    return styles.join(' ');
  };

  // 构建内联样式
  const buildStyle = (): React.CSSProperties => {
    const inlineStyles: React.CSSProperties = { ...style };
    
    // 添加层级缩进
    if (level > 0) {
      Object.assign(inlineStyles, LEVEL_INDENT.getIndent(level));
    }
    
    return inlineStyles;
  };

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(e);
  };

  return (
    <div
      {...props}
      draggable={draggable}
      className={buildClassName()}
      style={buildStyle()}
      onDragStart={onDragStart}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
};

/**
 * 简化版的拖拽包装器 - 用于基本的拖拽场景
 */
export interface SimpleDragWrapperProps {
  children: React.ReactNode;
  isDragging?: boolean;
  level?: number;
  className?: string;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const SimpleDragWrapper: React.FC<SimpleDragWrapperProps> = ({
  children,
  isDragging = false,
  level = 0,
  className = '',
  onDragStart,
  onClick
}) => {
  return (
    <DragDropWrapper
      isDragging={isDragging}
      level={level}
      className={className}
      onDragStart={onDragStart}
      onClick={onClick}
    >
      {children}
    </DragDropWrapper>
  );
};

/**
 * 可放置区域的包装器
 */
export interface DropZoneWrapperProps {
  children: React.ReactNode;
  isDropTarget?: boolean;
  dropPosition?: 'above' | 'below' | null;
  isExecuting?: boolean;
  className?: string;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const DropZoneWrapper: React.FC<DropZoneWrapperProps> = ({
  children,
  isDropTarget = false,
  dropPosition = null,
  isExecuting = false,
  className = '',
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  return (
    <DragDropWrapper
      draggable={false} // 放置区域不可拖拽
      isDropTarget={isDropTarget}
      dropPosition={dropPosition}
      isExecuting={isExecuting}
      className={className}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </DragDropWrapper>
  );
};