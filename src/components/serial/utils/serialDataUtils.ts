// serialDataUtils.ts - Extract data formatting utilities
// 格式化显示数据
export const formatData = (
  data: string, 
  format: 'utf8' | 'hex', 
  originalFormat: 'utf8' | 'hex'
): string => {
  if (format === originalFormat) {
    return data;
  }

  if (format === 'hex' && originalFormat === 'utf8') {
    // UTF-8 转 HEX
    return Array.from(data)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(' ').toUpperCase();
  } else if (format === 'utf8' && originalFormat === 'hex') {
    // HEX 转 UTF-8 - 直接转换为UTF-8字符，不使用转义序列
    try {
      const hexData = data.replace(/\s/g, '');
      const bytes = [];
      for (let i = 0; i < hexData.length; i += 2) {
        const hex = hexData.substr(i, 2);
        bytes.push(parseInt(hex, 16));
      }
      // 直接使用TextDecoder转换，控制字符会显示为实际字符
      const uint8Array = new Uint8Array(bytes);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(uint8Array);
    } catch {
      return data; // 转换失败时返回原数据
    }
  }
  
  return data;
};

// Convert data based on format and add line endings
export const prepareDataForSending = (
  sendData: string,
  sendFormat: 'utf8' | 'hex',
  newlineMode: 'none' | 'lf' | 'cr' | 'crlf'
): { uint8Array: Uint8Array; dataToSend: string } => {
  let dataToSend = sendData;
  
  // 添加换行符
  switch (newlineMode) {
    case 'lf':
      dataToSend += '\n';
      break;
    case 'cr':
      dataToSend += '\r';
      break;
    case 'crlf':
      dataToSend += '\r\n';
      break;
  }

  // 根据格式转换数据
  let uint8Array: Uint8Array;
  
  if (sendFormat === 'hex') {
    // 处理十六进制数据
    const hexData = dataToSend.replace(/\s/g, ''); // 移除空格
    const bytes = [];
    for (let i = 0; i < hexData.length; i += 2) {
      const hex = hexData.substr(i, 2);
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
        throw new Error(`Invalid hex data: ${hex}`);
      }
      bytes.push(parseInt(hex, 16));
    }
    uint8Array = new Uint8Array(bytes);
  } else {
    // UTF-8 数据
    const encoder = new TextEncoder();
    uint8Array = encoder.encode(dataToSend);
  }

  return { uint8Array, dataToSend };
};

// Validate hex data format
export const isValidHexData = (data: string): boolean => {
  const hexData = data.replace(/\s/g, ''); // Remove spaces
  return /^[0-9A-Fa-f]*$/.test(hexData) && hexData.length % 2 === 0;
};

// Get display line height based on settings
export const getLineHeight = (terminalLineHeight: string): string => {
  switch (terminalLineHeight) {
    case 'compact': return '1.2';
    case 'normal': return '1.5';
    case 'loose': return '1.8';
    default: return '1.2';
  }
};

// Calculate data length in bytes
export const getDataByteLength = (data: string, format: 'utf8' | 'hex'): number => {
  if (format === 'hex') {
    const hexData = data.replace(/\s/g, '');
    return hexData.length / 2;
  } else {
    return new TextEncoder().encode(data).length;
  }
};