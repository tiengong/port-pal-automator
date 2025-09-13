export class TauriEnvironmentDetector {
  private static readonly MAX_WAIT_TIME = 5000; // 5 seconds
  private static readonly CHECK_INTERVAL = 100; // 100ms

  static async waitForTauri(): Promise<boolean> {
    return new Promise((resolve) => {
      let elapsedTime = 0;
      
      const checkTauri = () => {
        if (window.__TAURI__ && window.__TAURI__.core) {
          console.log('Tauri environment detected');
          resolve(true);
          return;
        }
        
        elapsedTime += this.CHECK_INTERVAL;
        if (elapsedTime >= this.MAX_WAIT_TIME) {
          console.log('Tauri environment not available, falling back to web');
          resolve(false);
          return;
        }
        
        setTimeout(checkTauri, this.CHECK_INTERVAL);
      };
      
      checkTauri();
    });
  }

  static async verifySerialPlugin(): Promise<boolean> {
    try {
      const { SerialPort } = await import('tauri-plugin-serialplugin');
      await SerialPort.available_ports();
      console.log('Tauri serial plugin verified successfully');
      return true;
    } catch (error) {
      console.warn('Tauri serial plugin verification failed:', error);
      return false;
    }
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.__TAURI__;
  }

  static getEnvironmentInfo() {
    return {
      isTauri: this.isSupported(),
      hasCore: !!(window.__TAURI__ && window.__TAURI__.core),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
  }
}