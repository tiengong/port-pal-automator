import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from './transport';

export class WebSerialTransport extends SerialTransport {
  private connections = new Map<string, any>();
  private readers = new Map<string, ReadableStreamDefaultReader>();

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
      
      // Get the current port count to generate next COM number
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
      // Find the actual port object
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
      // Stop reading first
      await this.stopReading(connection);
      
      // Close the port
      await port.close();
      
      this.connections.delete(connection.id);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      // Remove from connections anyway
      this.connections.delete(connection.id);
    }
  }

  async write(connection: SerialConnection, data: Uint8Array): Promise<void> {
    const port = this.connections.get(connection.id);
    if (!port || !port.writable) {
      throw new Error('Port not writable');
    }

    const writer = port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  async startReading(connection: SerialConnection, onData: (data: Uint8Array) => void): Promise<void> {
    const port = this.connections.get(connection.id);
    if (!port || !port.readable) {
      throw new Error('Port not readable');
    }

    // Stop any existing reader
    await this.stopReading(connection);

    const reader = port.readable.getReader();
    this.readers.set(connection.id, reader);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        onData(value);
      }
    } catch (error) {
      console.error('Reading stopped:', error);
    } finally {
      this.readers.delete(connection.id);
      try {
        reader.releaseLock();
      } catch {}
    }
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