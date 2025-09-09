import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from './transport';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { SerialPort } from 'tauri-plugin-serialplugin';

interface TauriPortInfo {
  port_name: string;
  port_type: string;
  usb_vid?: number;
  usb_pid?: number;
}

export class TauriSerialTransport extends SerialTransport {
  private connections = new Map<string, SerialPort>(); // connection id -> SerialPort instance
  private listeners = new Map<string, () => void>(); // connection id -> unlisten function

  isSupported(): boolean {
    return window.__TAURI__ !== undefined;
  }

  async requestPort(): Promise<SerialPortInfo | null> {
    // Tauri doesn't need requestPort - just return null
    return null;
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    if (!this.isSupported()) {
      return [];
    }

    try {
      const ports = await SerialPort.available_ports();
      
      return Object.entries(ports).map(([path, info], index) => {
        let deviceName = 'Serial Device';
        
        // 根据USB VID/PID确定设备名称
        if (info.usb_vid && info.usb_pid) {
          deviceName = this.getDeviceName(info.usb_vid, info.usb_pid);
        }
        
        return {
          id: `tauri-${index}`,
          name: `${path} (${deviceName})`,
          path: path
        };
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
      // 创建新的串口实例
      const serialPort = new SerialPort({
        path: port.path,
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        flowControl: 'None',
        parity: this.mapParity(config.parity),
        stopBits: config.stopBits,
        timeout: 1000
      });

      // 打开串口
      await serialPort.open();

      const connectionId = `${port.id}-${Date.now()}`;
      this.connections.set(connectionId, serialPort);

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
      // Stop reading first
      await this.stopReading(connection);
      
      // Close the port
      await serialPort.close();
      
      this.connections.delete(connection.id);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      // Remove from connections anyway
      this.connections.delete(connection.id);
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
      throw new Error(`Failed to write to port: ${error}`);
    }
  }

  async startReading(connection: SerialConnection, onData: (data: Uint8Array) => void): Promise<void> {
    const serialPort = this.connections.get(connection.id);
    if (!serialPort) {
      throw new Error('Port not connected');
    }

    // Stop any existing listener
    await this.stopReading(connection);

    try {
      // Listen for data events using the new API
      const unlisten = await serialPort.listen((data) => {
        onData(data);
      });

      this.listeners.set(connection.id, unlisten);
    } catch (error) {
      throw new Error(`Failed to start reading: ${error}`);
    }
  }

  async stopReading(connection: SerialConnection): Promise<void> {
    const unlisten = this.listeners.get(connection.id);

    if (unlisten) {
      unlisten();
      this.listeners.delete(connection.id);
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
    };
    
    const key = `${vendorId.toString(16).padStart(4, '0')}:${productId.toString(16).padStart(4, '0')}`;
    return deviceMap[key] || `USB Device (${key})`;
  }
}