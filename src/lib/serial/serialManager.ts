import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from './transport';
import { WebSerialTransport } from './webSerialTransport';
import { TauriSerialTransport } from './tauriSerialTransport';

export class SerialManager {
  private transport: SerialTransport;
  private connections = new Map<string, SerialConnection>(); // label -> connection

  constructor() {
    // Choose transport based on environment - use more reliable detection
    if (typeof window !== 'undefined' && window.__TAURI__) {
      console.log('Initializing Tauri serial transport');
      this.transport = new TauriSerialTransport();
    } else {
      console.log('Initializing Web serial transport');
      this.transport = new WebSerialTransport();
    }
  }

  isSupported(): boolean {
    return this.transport.isSupported();
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    return this.transport.listPorts();
  }

  async requestPort(): Promise<SerialPortInfo | null> {
    if (this.transport.requestPort) {
      return this.transport.requestPort();
    }
    return null;
  }

  async connect(port: SerialPortInfo, config: SerialConfig, label: string): Promise<boolean> {
    try {
      // Disconnect existing connection with same label
      if (this.connections.has(label)) {
        await this.disconnect(label);
      }

      const connection = await this.transport.connect(port, config);
      this.connections.set(label, connection);
      return true;
    } catch (error) {
      console.error(`Failed to connect ${label}:`, error);
      return false;
    }
  }

  async disconnect(label: string): Promise<void> {
    const connection = this.connections.get(label);
    if (connection) {
      await this.transport.disconnect(connection);
      this.connections.delete(label);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(label => 
      this.disconnect(label)
    );
    await Promise.all(disconnectPromises);
  }

  isConnected(label?: string): boolean {
    if (label) {
      return this.connections.has(label) && this.connections.get(label)?.isOpen === true;
    }
    return Array.from(this.connections.values()).some(conn => conn.isOpen);
  }

  getConnection(label: string): SerialConnection | null {
    return this.connections.get(label) || null;
  }

  getConnections(): Map<string, SerialConnection> {
    return new Map(this.connections);
  }

  async write(label: string, data: string | Uint8Array): Promise<void> {
    const connection = this.connections.get(label);
    if (!connection || !connection.isOpen) {
      throw new Error(`Port ${label} not connected`);
    }

    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    await this.transport.write(connection, bytes);
  }

  async startReading(label: string, onData: (data: Uint8Array) => void): Promise<void> {
    const connection = this.connections.get(label);
    if (!connection || !connection.isOpen) {
      throw new Error(`Port ${label} not connected`);
    }

    await this.transport.startReading(connection, onData);
  }

  async stopReading(label: string): Promise<void> {
    const connection = this.connections.get(label);
    if (connection) {
      await this.transport.stopReading(connection);
    }
  }
}