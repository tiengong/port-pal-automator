// Web compatibility checks and utilities
export const checkWebSerialSupport = (): { 
  supported: boolean; 
  reason?: string;
  requirements?: string[];
} => {
  // Check if Web Serial API is supported
  if (typeof window === 'undefined') {
    return { 
      supported: false, 
      reason: 'Running in non-browser environment' 
    };
  }

  if (!('serial' in navigator)) {
    return { 
      supported: false, 
      reason: 'Web Serial API not supported',
      requirements: [
        'Chrome/Edge 89+ or Opera 75+',
        'Enable chrome://flags/#enable-experimental-web-platform-features',
        'HTTPS connection (except localhost)'
      ]
    };
  }

  // Check if running on HTTPS or localhost
  const isSecureContext = window.location.protocol === 'https:' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
  
  if (!isSecureContext) {
    return { 
      supported: false, 
      reason: 'Web Serial API requires HTTPS or localhost',
      requirements: ['HTTPS connection required for Web Serial API']
    };
  }

  return { supported: true };
};

export const getWebSerialBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  
  // Detect browser and version
  let browserInfo = 'Unknown browser';
  
  if (userAgent.includes('Chrome/')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    browserInfo = `Chrome ${version}`;
    
    if (version >= 89) {
      return { browser: browserInfo, compatible: true };
    }
  } else if (userAgent.includes('Edge/')) {
    const match = userAgent.match(/Edge\/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    browserInfo = `Edge ${version}`;
    
    if (version >= 89) {
      return { browser: browserInfo, compatible: true };
    }
  } else if (userAgent.includes('OPR/')) {
    const match = userAgent.match(/OPR\/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    browserInfo = `Opera ${version}`;
    
    if (version >= 75) {
      return { browser: browserInfo, compatible: true };
    }
  }
  
  return { browser: browserInfo, compatible: false };
};