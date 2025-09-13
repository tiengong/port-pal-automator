import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from '../transport';

interface ConnectionState {
  isHealthy: boolean;
  lastDataReceived: number;
  retryCount: number;
  maxRetries: number;
  reconnectDelay: number;
}

export class RobustWebSerialTransport extends SerialTransport {
  private connections = new Map<string, any>();
  private readers = new Map<string, ReadableStreamDefaultReader>();
  private connectionStates = new Map<string, ConnectionState>();
  private dataBuffers = new Map<string, Uint8Array[]>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  isSupported(): boolean {
    return 'serial' in navigator;
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    if (!this.isSupported()) {
      return [];
    }

    try {
      const ports = await (navigator as any).serial.getPorts();
      return ports.map((port: any, index: number) => {
        const info = port.getInfo?.() || {};
        const portNumber = `COM${index + 1}`;
        
        let deviceName = 'Serial Device';
        if (info.usbVendorId && info.usbProductId) {
          deviceName = this.getDeviceName(info.usbVendorId, info.usbProductId);
        }
        
        return {
          id: `web-${index}`,
          name: `${portNumber} (${deviceName})`,
          path: portNumber
        };
      });
    } catch (error) {
      console.error('Failed to list ports:', error);
      return [];
    }
  }

  async requestPort(): Promise<SerialPortInfo | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      const info = port.getInfo?.() || {};
      
      const existingPorts = await (navigator as any).serial.getPorts();
      const comNumber = existingPorts.length;
      
      let deviceName = 'Serial Device';
      if (info.usbVendorId && info.usbProductId) {
        deviceName = this.getDeviceName(info.usbVendorId, info.usbProductId);
      }
      
      return {
        id: `web-${Date.now()}`,
        name: `COM${comNumber} (${deviceName})`,
        path: `COM${comNumber}`
      };
    } catch (error) {
      console.error('Failed to request port:', error);
      return null;
    }
  }

  async connect(port: SerialPortInfo, config: SerialConfig): Promise<SerialConnection> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API not supported');
    }

    try {
      const ports = await (navigator as any).serial.getPorts();
      const portIndex = parseInt(port.id.replace('web-', ''));
      const actualPort = ports[portIndex] || ports.find((p: any) => {
        const info = p.getInfo?.() || {};
        return port.name.includes(this.getDeviceName(info.usbVendorId, info.usbProductId));
      });

      if (!actualPort) {
        throw new Error(`Port ${port.name} not found`);
      }

      await actualPort.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        parity: config.parity,
        stopBits: config.stopBits
      });

      const connectionId = `${port.id}-${Date.now()}`;
      this.connections.set(connectionId, actualPort);
      
      // Initialize connection state
      this.connectionStates.set(connectionId, {
        isHealthy: true,
        lastDataReceived: Date.now(),
        retryCount: 0,
        maxRetries: 5,
        reconnectDelay: 1000
      });

      // Initialize data buffer
      this.dataBuffers.set(connectionId, []);

      // Start health monitoring
      this.startHealthMonitoring(connectionId);

      const connection: SerialConnection = {
        id: connectionId,
        port,
        config,
        isOpen: true,
        transport: this
      };

      return connection;
    } catch (error) {
      throw new Error(`Failed to connect to ${port.name}: ${error}`);
    }
  }

  async disconnect(connection: SerialConnection): Promise<void> {
    const port = this.connections.get(connection.id);
    if (!port) return;

    try {
      // Stop health monitoring
      this.stopHealthMonitoring(connection.id);
      
      // Stop reading
      await this.stopReading(connection);
      
      // Close port
      await port.close();
      
      // Cleanup
      this.connections.delete(connection.id);
      this.connectionStates.delete(connection.id);
      this.dataBuffers.delete(connection.id);
      
    } catch (error) {
      console.error('Failed to disconnect:', error);
      // Cleanup anyway
      this.connections.delete(connection.id);
      this.connectionStates.delete(connection.id);
      this.dataBuffers.delete(connection.id);
    }
  }

  async write(connection: SerialConnection, data: Uint8Array): Promise<void> {
    const port = this.connections.get(connection.id);
    if (!port || !port.writable) {
      throw new Error('Port not writable');
    }

    try {
      const writer = port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
    } catch (error) {
      console.error('WebSerial write error:', error);
      // Mark connection as unhealthy and attempt recovery
      const state = this.connectionStates.get(connection.id);
      if (state) {
        state.isHealthy = false;
        this.attemptRecovery(connection.id);
      }
      throw error;
    }
  }

  async startReading(connection: SerialConnection, onData: (data: Uint8Array) => void): Promise<void> {
    const port = this.connections.get(connection.id);
    if (!port || !port.readable) {
      throw new Error('Port not readable');
    }

    await this.stopReading(connection);
    
    // Start robust reading with error recovery
    this.startRobustReading(connection.id, onData);
  }

  async stopReading(connection: SerialConnection): Promise<void> {
    const reader = this.readers.get(connection.id);
    if (reader) {
      try {
        await reader.cancel();
        reader.releaseLock();
      } catch (error) {
        console.log('Reader cleanup error (expected):', error);
      }
      this.readers.delete(connection.id);
    }
  }

  private async startRobustReading(connectionId: string, onData: (data: Uint8Array) => void): Promise<void> {
    const port = this.connections.get(connectionId);
    const state = this.connectionStates.get(connectionId);
    
    if (!port || !state) return;

    const reader = port.readable.getReader();
    this.readers.set(connectionId, reader);

    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          console.log('Reader done, attempting recovery');
          break;
        }

        if (value && value.length > 0) {
          // Update health state
          state.lastDataReceived = Date.now();
          state.isHealthy = true;
          state.retryCount = 0;

          // Process data with batching for performance
          this.processDataBatch(connectionId, value, onData);
        }
      }
    } catch (error) {
      console.error('Reading error:', error);
      state.isHealthy = false;
      
      // Attempt recovery with exponential backoff
      this.attemptRecovery(connectionId, onData);
    } finally {
      this.readers.delete(connectionId);
      try {
        reader.releaseLock();
      } catch {}
    }
  }

  private processDataBatch(connectionId: string, data: Uint8Array, onData: (data: Uint8Array) => void): void {
    // Add to buffer for batching
    const buffer = this.dataBuffers.get(connectionId);
    if (buffer) {
      buffer.push(data);
      
      // Process buffer immediately for real-time response
      // But batch multiple small packets if they arrive within 10ms
      setTimeout(() => {
        if (buffer.length > 0) {
          const combinedLength = buffer.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Uint8Array(combinedLength);
          let offset = 0;
          
          for (const chunk of buffer) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          buffer.length = 0; // Clear buffer
          onData(combined);
        }
      }, 1);
    } else {
      // Fallback: direct processing
      onData(data);
    }
  }

  private async attemptRecovery(connectionId: string, onData?: (data: Uint8Array) => void): Promise<void> {
    const state = this.connectionStates.get(connectionId);
    if (!state) return;

    state.retryCount++;
    
    if (state.retryCount > state.maxRetries) {
      console.error(`Max retries exceeded for connection ${connectionId}`);
      return;
    }

    const delay = Math.min(state.reconnectDelay * Math.pow(2, state.retryCount - 1), 10000);
    console.log(`Attempting recovery in ${delay}ms (attempt ${state.retryCount})`);

    setTimeout(async () => {
      try {
        if (onData) {
          await this.startRobustReading(connectionId, onData);
        }
      } catch (error) {
        console.error('Recovery failed:', error);
        this.attemptRecovery(connectionId, onData);
      }
    }, delay);
  }

  private startHealthMonitoring(connectionId: string): void {
    const interval = setInterval(() => {
      const state = this.connectionStates.get(connectionId);
      if (!state) {
        clearInterval(interval);
        return;
      }

      const timeSinceLastData = Date.now() - state.lastDataReceived;
      const healthThreshold = 30000; // 30 seconds without data = unhealthy

      if (timeSinceLastData > healthThreshold && state.isHealthy) {
        console.warn(`Connection ${connectionId} appears unhealthy - no data for ${timeSinceLastData}ms`);
        state.isHealthy = false;
      }
    }, 5000); // Check every 5 seconds

    this.healthCheckIntervals.set(connectionId, interval);
  }

  private stopHealthMonitoring(connectionId: string): void {
    const interval = this.healthCheckIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(connectionId);
    }
  }

  private getDeviceName(vendorId: number, productId: number): string {
    const deviceMap: { [key: string]: string } = {
      // Silicon Labs
      "10c4:ea60": "Silicon Labs CP210x USB to UART Bridge",
      "10c4:ea70": "Silicon Labs CP210x USB to UART Bridge",
      // FTDI
      "0403:6001": "FTDI FT232R USB UART",
      "0403:6015": "FTDI FT230X USB UART",
      "0403:6014": "FTDI FT232H USB UART",
      // CH340/CH341
      "1a86:7523": "QinHeng CH340 USB Serial",
      "1a86:5523": "QinHeng CH341 USB Serial",
      // Prolific
      "067b:2303": "Prolific PL2303 USB Serial",
      // Arduino
      "2341:0043": "Arduino Uno Rev3",
      "2341:0001": "Arduino Uno",
      "1b4f:9206": "Arduino Leonardo",
      // ESP32
      "303a:1001": "Espressif ESP32-S2",
      "303a:0002": "Espressif ESP32-S3",
    };
    
    const key = `${vendorId.toString(16).padStart(4, '0')}:${productId.toString(16).padStart(4, '0')}`;
    return deviceMap[key] || `USB Device (${key})`;
  }
}