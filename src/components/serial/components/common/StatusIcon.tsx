import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { STATUS_STYLES } from '@/components/serial/styles/common';

export type StatusType = 'success' | 'failed' | 'running' | 'partial' | 'pending';

export interface StatusIconProps {
  status: StatusType;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showAnimation?: boolean;
}

const sizeMap = {
  small: 'w-3.5 h-3.5',
  medium: 'w-4 h-4',
  large: 'w-5 h-5'
};

const statusConfig = {
  success: {
    icon: CheckCircle,
    className: STATUS_STYLES.SUCCESS,
    title: '成功'
  },
  failed: {
    icon: XCircle,
    className: STATUS_STYLES.FAILED,
    title: '失败'
  },
  running: {
    icon: AlertCircle,
    className: STATUS_STYLES.RUNNING,
    title: '运行中'
  },
  partial: {
    icon: AlertCircle,
    className: STATUS_STYLES.PARTIAL,
    title: '部分完成'
  },
  pending: {
    icon: Clock,
    className: STATUS_STYLES.PENDING,
    title: '待执行'
  }
};

export const StatusIcon: React.FC<StatusIconProps> = ({ 
  status, 
  size = 'small', 
  className = '',
  showAnimation = true
}) => {
  const config = statusConfig[status];
  if (!config) return null;

  const { icon: Icon } = config;
  const sizeClass = sizeMap[size];
  const animationClass = status === 'running' && showAnimation ? 'animate-pulse' : '';
  
  return (
    <Icon 
      className={`${sizeClass} ${config.className} ${animationClass} ${className}`}
      title={config.title}
    />
  );
};

/**
 * 状态图标组 - 用于显示多个状态
 */
export interface StatusIconGroupProps {
  items: Array<{
    status: StatusType;
    key?: string;
  }>;
  size?: 'small' | 'medium' | 'large';
  separator?: boolean;
  className?: string;
}

export const StatusIconGroup: React.FC<StatusIconGroupProps> = ({
  items,
  size = 'small',
  separator = false,
  className = ''
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className={`flex items-center ${separator ? 'gap-1' : 'gap-0.5'} ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={item.key || index}>
          <StatusIcon status={item.status} size={size} />
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * 状态文本显示组件
 */
export interface StatusTextProps {
  status: StatusType;
  text?: string;
  showIcon?: boolean;
  iconSize?: 'small' | 'medium' | 'large';
  className?: string;
}

export const StatusText: React.FC<StatusTextProps> = ({
  status,
  text,
  showIcon = true,
  iconSize = 'small',
  className = ''
}) => {
  const config = statusConfig[status];
  const displayText = text || config?.title || status;
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && <StatusIcon status={status} size={iconSize} />}
      <span className={`text-sm ${config?.className || ''}`}>{displayText}</span>
    </div>
  );
};