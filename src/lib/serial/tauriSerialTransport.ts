import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from './transport';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface TauriPortInfo {
  port_name: string;
  port_type: string;
  usb_vid?: number;
  usb_pid?: number;
}

export class TauriSerialTransport extends SerialTransport {
  private connections = new Map<string, string>(); // connection id -> port name
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
      const ports: TauriPortInfo[] = await invoke('plugin:serialplugin|available_ports');
      
      return ports.map((port, index) => {
        let deviceName = 'Serial Device';
        
        if (port.usb_vid && port.usb_pid) {
          deviceName = this.getDeviceName(port.usb_vid, port.usb_pid);
        }
        
        return {
          id: `tauri-${index}`,
          name: `${port.port_name} (${deviceName})`,
          path: port.port_name
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
      await invoke('plugin:serialplugin|open', {
        path: port.path,
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        flowControl: 'None',
        parity: this.mapParity(config.parity),
        stopBits: config.stopBits,
        timeout: 1000
      });

      const connectionId = `${port.id}-${Date.now()}`;
      this.connections.set(connectionId, port.path!);

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
    const portPath = this.connections.get(connection.id);
    if (!portPath) return;

    try {
      // Stop reading first
      await this.stopReading(connection);
      
      // Close the port
      await invoke('plugin:serialplugin|close', { path: portPath });
      
      this.connections.delete(connection.id);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      // Remove from connections anyway
      this.connections.delete(connection.id);
    }
  }

  async write(connection: SerialConnection, data: Uint8Array): Promise<void> {
    const portPath = this.connections.get(connection.id);
    if (!portPath) {
      throw new Error('Port not connected');
    }

    try {
      await invoke('plugin:serialplugin|write', {
        path: portPath,
        data: Array.from(data)
      });
    } catch (error) {
      throw new Error(`Failed to write to port: ${error}`);
    }
  }

  async startReading(connection: SerialConnection, onData: (data: Uint8Array) => void): Promise<void> {
    const portPath = this.connections.get(connection.id);
    if (!portPath) {
      throw new Error('Port not connected');
    }

    // Stop any existing listener
    await this.stopReading(connection);

    try {
      // Start reading from the port
      await invoke('plugin:serialplugin|start_reading', { path: portPath });

      // Listen for data events
      const unlisten = await listen(`serial_data_${portPath.replace(/[^a-zA-Z0-9]/g, '_')}`, (event: any) => {
        const data = new Uint8Array(event.payload);
        onData(data);
      });

      this.listeners.set(connection.id, unlisten);
    } catch (error) {
      throw new Error(`Failed to start reading: ${error}`);
    }
  }

  async stopReading(connection: SerialConnection): Promise<void> {
    const portPath = this.connections.get(connection.id);
    const unlisten = this.listeners.get(connection.id);

    if (unlisten) {
      unlisten();
      this.listeners.delete(connection.id);
    }

    if (portPath) {
      try {
        await invoke('plugin:serialplugin|stop_reading', { path: portPath });
      } catch (error) {
        console.log('Stop reading error (expected):', error);
      }
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