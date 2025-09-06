// testCaseUrcUtils.ts
import { TestCommand } from './types';

// URC解析和变量替换系统
export const parseUrcData = (data: string, command: TestCommand): { [key: string]: { value: string; timestamp: number } } => {
  if (!command.dataParseConfig || !command.dataParseConfig.enabled) return {};
  
  const { parseType, parsePattern, parameterMap } = command.dataParseConfig;
  const extractedParams: { [key: string]: { value: string; timestamp: number } } = {};
  const timestamp = Date.now();
  
  switch (parseType) {
    case 'regex':
      try {
        const regex = new RegExp(parsePattern);
        const match = data.match(regex);
        if (match) {
          Object.entries(parameterMap).forEach(([groupKey, varName]) => {
            if (typeof varName === 'string') {
              // 支持捕获组索引和命名捕获组
              const value = isNaN(Number(groupKey)) 
                ? match.groups?.[groupKey] 
                : match[Number(groupKey)];
              if (value) {
                extractedParams[varName] = { value, timestamp };
              }
            }
          });
        }
      } catch (error) {
        console.error('Regex parsing error:', error);
      }
      break;
    case 'split':
      const parts = data.split(parsePattern);
      Object.entries(parameterMap).forEach(([indexKey, varName]) => {
        if (typeof varName === 'string') {
          const index = Number(indexKey);
          if (!isNaN(index) && parts[index] !== undefined) {
            extractedParams[varName] = { value: parts[index].trim(), timestamp };
          }
        }
      });
      break;
  }
  
  return extractedParams;
};

// 变量替换函数
export const substituteVariables = (command: string, storedParameters: { [key: string]: { value: string; timestamp: number } }): string => {
  let substituted = command;
  
  Object.entries(storedParameters).forEach(([varName, varData]) => {
    // 支持多种变量格式: {var}, {var|default}, {P1.var}, {P2.var}
    const patterns = [
      `{${varName}}`,
      `{${varName}\\|[^}]*}`, // 带默认值
      `{P1\\.${varName}}`,
      `{P2\\.${varName}}`
    ];
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      substituted = substituted.replace(regex, varData.value);
    });
  });
  
  return substituted;
};

// URC匹配检查
export const checkUrcMatch = (data: string, command: TestCommand): boolean => {
  if (!command.urcPattern) return false;
  
  switch (command.urcMatchMode) {
    case 'contains':
      return data.includes(command.urcPattern);
    case 'exact':
      return data.trim() === command.urcPattern;
    case 'startsWith':
      return data.startsWith(command.urcPattern);
    case 'endsWith':
      return data.endsWith(command.urcPattern);
    case 'regex':
      try {
        const regex = new RegExp(command.urcPattern);
        return regex.test(data);
      } catch {
        return false;
      }
    default:
      return false;
  }
};