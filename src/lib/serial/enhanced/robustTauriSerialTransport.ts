import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from '../transport';
import { SerialPort } from 'tauri-plugin-serialplugin';

interface ConnectionState {
  isHealthy: boolean;
  lastDataReceived: number;
  retryCount: number;
  maxRetries: number;
  reconnectDelay: number;
}

interface TauriPortInfo {
  port_name: string;
  port_type: string;
  usb_vid?: number;
  usb_pid?: number;
  friendly_name?: string;
  description?: string;
  display_name?: string;
}

export class RobustTauriSerialTransport extends SerialTransport {
  private connections = new Map<string, SerialPort>();
  private listeners = new Map<string, () => void>();
  private connectionStates = new Map<string, ConnectionState>();
  private dataBuffers = new Map<string, Uint8Array[]>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  isSupported(): boolean {
    return window.__TAURI__ !== undefined;
  }

  async requestPort(): Promise<SerialPortInfo | null> {
    return null; // Tauri doesn't need requestPort
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    if (!this.isSupported()) {
      return [];
    }

    try {
      const ports = await SerialPort.available_ports();
      console.log('Raw serial ports data:', ports);
      
      return Object.entries(ports).map(([path, info], index) => {
        console.log(`Raw device info for ${path}:`, JSON.stringify(info, null, 2));
        
        let deviceName = null;
        const possibleNameFields = [
          'friendly_name', 'description', 'display_name', 'name', 
          'device_name', 'product_name', 'manufacturer', 'vendor_name'
        ];
        
        for (const field of possibleNameFields) {
          if (info[field as keyof TauriPortInfo]) {
            deviceName = info[field as keyof TauriPortInfo] as string;
            console.log(`Found device name in field '${field}': ${deviceName}`);
            break;
          }
        }
        
        if (!deviceName) {
          if (info.usb_vid && info.usb_pid) {
            deviceName = this.getDeviceName(info.usb_vid, info.usb_pid);
          } else {
            deviceName = 'Serial Device';
          }
        }
        
        const portInfo = {
          id: `tauri-${index}`,
          name: `${path} (${deviceName})`,
          path: path
        };
        
        console.log(`Final device ${path}:`, {
          deviceName,
          finalName: portInfo.name
        });
        
        return portInfo;
      });
    } catch (error) {
      console.error('Failed to list serial ports:', error);
      return [];
    }
  }

  async connect(port: SerialPortInfo, config: SerialConfig): Promise<SerialConnection> {
    if (!this.isSupported()) {
      throw new Error('Tauri not available');
    }

    try {
      const serialPort = new SerialPort({
        path: port.path,
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        flowControl: 'None',
        parity: this.mapParity(config.parity),
        stopBits: config.stopBits,
        timeout: 1000
      });

      await serialPort.open();

      const connectionId = `${port.id}-${Date.now()}`;
      this.connections.set(connectionId, serialPort);

      // Initialize connection state with enhanced monitoring
      this.connectionStates.set(connectionId, {
        isHealthy: true,
        lastDataReceived: Date.now(),
        retryCount: 0,
        maxRetries: 5,
        reconnectDelay: 1000
      });

      // Initialize data buffer for batching
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
    const serialPort = this.connections.get(connection.id);
    if (!serialPort) return;

    try {
      // Stop health monitoring
      this.stopHealthMonitoring(connection.id);
      
      // Stop reading
      await this.stopReading(connection);
      
      // Close port
      await serialPort.close();
      
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
    const serialPort = this.connections.get(connection.id);
    if (!serialPort) {
      throw new Error('Port not connected');
    }

    try {
      await serialPort.write(data);
    } catch (error) {
      console.error('Tauri write error:', error);
      // Mark connection as unhealthy
      const state = this.connectionStates.get(connection.id);
      if (state) {
        state.isHealthy = false;
      }
      throw new Error(`Failed to write to port: ${error}`);
    }
  }

  async startReading(connection: SerialConnection, onData: (data: Uint8Array) => void): Promise<void> {
    const serialPort = this.connections.get(connection.id);
    if (!serialPort) {
      throw new Error('Port not connected');
    }

    await this.stopReading(connection);
    this.startRobustReading(connection.id, onData);
  }

  async stopReading(connection: SerialConnection): Promise<void> {
    const unlisten = this.listeners.get(connection.id);
    if (unlisten) {
      unlisten();
      this.listeners.delete(connection.id);
    }
  }

  private async startRobustReading(connectionId: string, onData: (data: Uint8Array) => void): Promise<void> {
    const serialPort = this.connections.get(connectionId);
    const state = this.connectionStates.get(connectionId);
    
    if (!serialPort || !state) return;

    try {
      const unlisten = await serialPort.listen((data: Uint8Array) => {
        // Update health state
        state.lastDataReceived = Date.now();
        state.isHealthy = true;
        state.retryCount = 0;

        // Interrupt-driven immediate data processing - no batching delays
        onData(data);
      });

      this.listeners.set(connectionId, unlisten);
    } catch (error) {
      console.error('Failed to start robust reading:', error);
      state.isHealthy = false;
      
      // Attempt recovery
      this.attemptRecovery(connectionId, onData);
    }
  }

  // Removed processDataBatch - using direct interrupt-driven processing for zero latency

  private async attemptRecovery(connectionId: string, onData?: (data: Uint8Array) => void): Promise<void> {
    const state = this.connectionStates.get(connectionId);
    if (!state) return;

    state.retryCount++;
    
    if (state.retryCount > state.maxRetries) {
      console.error(`Max retries exceeded for connection ${connectionId}`);
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = state.reconnectDelay * Math.pow(2, state.retryCount - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 15000);
    
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
      const healthThreshold = 30000; // 30 seconds

      if (timeSinceLastData > healthThreshold && state.isHealthy) {
        console.warn(`Connection ${connectionId} health check: no data for ${timeSinceLastData}ms`);
        state.isHealthy = false;
      }
    }, 5000);

    this.healthCheckIntervals.set(connectionId, interval);
  }

  private stopHealthMonitoring(connectionId: string): void {
    const interval = this.healthCheckIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(connectionId);
    }
  }

  private mapParity(parity: string): string {
    switch (parity) {
      case 'none': return 'None';
      case 'even': return 'Even';
      case 'odd': return 'Odd';
      default: return 'None';
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
      // Exar/MaxLinear XR21V141x 系列
      "04e2:1412": "Exar XR21V1412 USB UART Ch A",
      "04e2:1410": "Exar XR21V1410 USB UART",
      "04e2:1414": "Exar XR21V1414 USB UART",
      // 其他常见USB转串口芯片
      "0403:6010": "FTDI FT2232H USB UART",
      "0403:6011": "FTDI FT4232H USB UART",
      "067b:2304": "Prolific PL2303X USB Serial",
      "1a86:7522": "QinHeng CH340K USB Serial",
    };
    
    const key = `${vendorId.toString(16).padStart(4, '0')}:${productId.toString(16).padStart(4, '0')}`;
    return deviceMap[key] || `USB Device (${key})`;
  }
}