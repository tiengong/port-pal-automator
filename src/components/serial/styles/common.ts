/**
 * 公共样式常量
 */

// 拖拽相关样式
export const DRAG_DROP_STYLES = {
  // 基础拖拽样式
  BASE: 'p-2 hover:bg-muted/50 transition-colors cursor-move select-none',
  // 拖拽中状态
  DRAGGING: 'opacity-50',
  // 放置目标样式
  DROP_TARGET_ABOVE: 'border-t-2 border-primary',
  DROP_TARGET_BELOW: 'border-b-2 border-primary',
  // 执行中状态
  EXECUTING: 'bg-primary/10 border border-primary/30 shadow-sm',
  // 基础容器样式
  CONTAINER_BASE: 'p-3 hover:bg-muted/50 transition-colors cursor-move select-none'
} as const;

// 状态相关样式
export const STATUS_STYLES = {
  ICON_SIZE: 'w-3.5 h-3.5',
  SUCCESS: 'text-green-500',
  FAILED: 'text-red-500',
  RUNNING: 'text-yellow-500 animate-pulse',
  PARTIAL: 'text-blue-500',
  PENDING: 'text-gray-400'
} as const;

// 层级缩进
export const LEVEL_INDENT = {
  UNIT: 12, // 每级缩进的像素单位
  getIndent: (level: number, unit: number = LEVEL_INDENT.UNIT) => ({
    paddingLeft: `${level * unit}px`
  })
} as const;

// 布局相关样式
export const LAYOUT_STYLES = {
  // 按钮样式
  BUTTON_SMALL: 'h-7 w-7 p-0 flex-shrink-0',
  BUTTON_GHOST_SMALL: 'h-7 w-7 p-0',
  
  // 间距
  GAP_SMALL: 'gap-1',
  GAP_MEDIUM: 'gap-2',
  GAP_LARGE: 'gap-3',
  
  // 边距
  PADDING_SMALL: 'p-1',
  PADDING_MEDIUM: 'p-2',
  PADDING_LARGE: 'p-3'
} as const;

// 动画效果
export const ANIMATION_STYLES = {
  TRANSITION: 'transition-all duration-200',
  HOVER: 'hover:bg-muted/50',
  PULSE: 'animate-pulse'
} as const;

// 边框样式
export const BORDER_STYLES = {
  BORDER_PRIMARY_TOP: 'border-t-2 border-primary',
  BORDER_PRIMARY_BOTTOM: 'border-b-2 border-primary',
  BORDER_SECONDARY: 'border border-border',
  BORDER_INPUT: 'border border-input'
} as const;

// 颜色主题
export const COLOR_STYLES = {
  // 状态颜色
  SUCCESS: 'text-green-500',
  ERROR: 'text-red-500',
  WARNING: 'text-yellow-500',
  INFO: 'text-blue-500',
  MUTED: 'text-muted-foreground',
  
  // 背景颜色
  BG_SUCCESS: 'bg-green-50',
  BG_ERROR: 'bg-red-50',
  BG_WARNING: 'bg-yellow-50',
  BG_INFO: 'bg-blue-50',
  BG_MUTED: 'bg-muted'
} as const;

// 字体样式
export const TYPOGRAPHY_STYLES = {
  TEXT_SMALL: 'text-xs',
  TEXT_MEDIUM: 'text-sm',
  TEXT_LARGE: 'text-base',
  
  // 文本颜色
  TEXT_MUTED: 'text-muted-foreground',
  TEXT_PRIMARY: 'text-primary',
  TEXT_SECONDARY: 'text-secondary-foreground'
} as const;