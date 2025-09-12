/**
 * 测试用例核心工具函数
 * 基础工具函数：ID生成、格式化、状态配置等
 */

/**
 * 生成唯一ID的工厂函数
 */
export const createUniqueIdGenerator = (startId = 1001) => {
  let nextId = startId;
  return () => (nextId++).toString();
};

/**
 * 格式化命令索引显示
 */
export const formatCommandIndex = (index: number): string => {
  return index >= 0 ? `${index + 1}` : '';
};

/**
 * 获取状态图标配置
 */
export const getStatusIconConfig = (status: string) => {
  switch (status) {
    case 'success':
      return { icon: '✓', color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'failed':
      return { icon: '✗', color: 'text-red-600', bgColor: 'bg-red-100' };
    case 'running':
      return { icon: '⟳', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'pending':
      return { icon: '○', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    case 'partial':
      return { icon: '◐', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    default:
      return { icon: '?', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

/**
 * 判断是否为统计用例（包含特定标记）
 */
export const isStatsCase = (testCase: any): boolean => {
  return testCase.name.includes('[统计]') || testCase.description?.includes('[统计]');
};

/**
 * 格式化显示文本
 */
export const formatDisplayText = (text: string, maxLength = 50): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * 深度克隆测试用例（避免引用问题）
 */
export const deepCloneTestCase = (testCase: any): any => {
  return JSON.parse(JSON.stringify(testCase));
};

/**
 * 生成时间戳
 */
export const generateTimestamp = (): number => {
  return Date.now();
};

/**
 * 格式化时间戳
 */
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

/**
 * 检查对象是否为空
 */
export const isEmptyObject = (obj: any): boolean => {
  return obj == null || Object.keys(obj).length === 0;
};

/**
 * 安全地获取嵌套属性
 */
export const safeGet = (obj: any, path: string, defaultValue?: any): any => {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? defaultValue;
};

/**
 * 深度合并对象
 */
export const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
};

/**
 * 生成随机字符串
 */
export const generateRandomString = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};