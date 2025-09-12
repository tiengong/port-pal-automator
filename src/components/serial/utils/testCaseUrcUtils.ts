import { TestCommand } from '../types';

/**
 * Check if received data matches URC pattern
 */
export const checkUrcMatch = (data: string, pattern: string): boolean => {
  try {
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      // Regex pattern
      const regexPattern = pattern.slice(1, -1);
      const regex = new RegExp(regexPattern);
      return regex.test(data);
    } else {
      // String pattern
      return data.includes(pattern);
    }
  } catch (error) {
    console.error('Invalid URC pattern:', pattern, error);
    return false;
  }
};

/**
 * Parse URC data to extract parameters
 */
export const parseUrcData = (data: string, pattern: string): { [key: string]: string } => {
  const parameters: { [key: string]: string } = {};
  
  try {
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      // Regex pattern - extract named groups
      const regexPattern = pattern.slice(1, -1);
      const regex = new RegExp(regexPattern);
      const match = data.match(regex);
      
      if (match && match.groups) {
        return match.groups;
      }
    }
  } catch (error) {
    console.error('Error parsing URC data:', error);
  }
  
  return parameters;
};

/**
 * Substitute variables in command text
 */
export const substituteVariables = (command: string, parameters: { [key: string]: { value: string; timestamp: number } }): string => {
  let result = command;
  
  // Replace ${variable} patterns
  Object.keys(parameters).forEach(key => {
    const placeholder = `\${${key}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026'), 'g');
    result = result.replace(regex, parameters[key].value);
  });
  
  return result;
};