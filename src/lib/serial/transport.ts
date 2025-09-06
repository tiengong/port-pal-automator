// Abstract transport layer for serial communication
export interface SerialPortInfo {
  id: string;
  name: string; // Display name like "COM1 (Device Description)"
  path?: string; // Physical path/device identifier
}

export interface SerialConfig {
  baudRate: number;
  dataBits: number;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  stopBits: number;
}

export interface SerialConnection {
  id: string;
  port: SerialPortInfo;
  config: SerialConfig;
  isOpen: boolean;
  transport: SerialTransport;
}

export abstract class SerialTransport {
  abstract isSupported(): boolean;
  abstract listPorts(): Promise<SerialPortInfo[]>;
  abstract requestPort?(): Promise<SerialPortInfo | null>;
  abstract connect(port: SerialPortInfo, config: SerialConfig): Promise<SerialConnection>;
  abstract disconnect(connection: SerialConnection): Promise<void>;
  abstract write(connection: SerialConnection, data: Uint8Array): Promise<void>;
  abstract startReading(connection: SerialConnection, onData: (data: Uint8Array) => void): Promise<void>;
  abstract stopReading(connection: SerialConnection): Promise<void>;
}