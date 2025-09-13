import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from './transport';
import { WebSerialTransport } from './webSerialTransport';
import { RobustTauriSerialTransport } from './enhanced/robustTauriSerialTransport';
import { TauriEnvironmentDetector } from './enhanced/tauriEnvironmentDetector';

export class SerialManager {
  private transport: SerialTransport;
  private connections = new Map<string, SerialConnection>(); // label -> connection
  private isInitialized = false;

  constructor() {
    // Defer transport initialization until first use
    this.initializeTransport();
  }

  private async initializeTransport() {
    if (this.isInitialized) return;
    
    // Wait for Tauri to be ready if in Tauri environment
    const isTauriReady = await TauriEnvironmentDetector.waitForTauri();
    
    if (isTauriReady) {
      const hasSerialPlugin = await TauriEnvironmentDetector.verifySerialPlugin();
      if (hasSerialPlugin) {
        console.log('Initializing Robust Tauri serial transport');
        this.transport = new RobustTauriSerialTransport();
      } else {
        console.log('Tauri serial plugin not available, using web transport');
        this.transport = new WebSerialTransport();
      }
    } else {
      console.log('Initializing Web serial transport');
      this.transport = new WebSerialTransport();
    }
    
    this.isInitialized = true;
    console.log('Transport initialized:', {
      type: this.transport.constructor.name,
      environment: TauriEnvironmentDetector.getEnvironmentInfo()
    });
  }

  async isSupported(): Promise<boolean> {
    await this.initializeTransport();
    return this.transport.isSupported();
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    await this.initializeTransport();
    return this.transport.listPorts();
  }

  async requestPort(): Promise<SerialPortInfo | null> {
    await this.initializeTransport();
    if (this.transport.requestPort) {
      return this.transport.requestPort();
    }
    return null;
  }

  async connect(port: SerialPortInfo, config: SerialConfig, label: string): Promise<boolean> {
    try {
      await this.initializeTransport();
      
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