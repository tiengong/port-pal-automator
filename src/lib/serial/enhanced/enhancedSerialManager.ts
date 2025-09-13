import { SerialTransport, SerialPortInfo, SerialConfig, SerialConnection } from '../transport';
import { RobustWebSerialTransport } from './robustWebSerialTransport';
import { RobustTauriSerialTransport } from './robustTauriSerialTransport';

interface ConnectionHealth {
  isHealthy: boolean;
  dataRate: number; // bytes per second
  packetsReceived: number;
  lastPacketTime: number;
  quality: 'excellent' | 'good' | 'poor' | 'critical';
}

export class EnhancedSerialManager {
  private transport: SerialTransport;
  private connections = new Map<string, SerialConnection>();
  private connectionHealth = new Map<string, ConnectionHealth>();
  private dataCallbacks = new Map<string, (data: Uint8Array) => void>();
  private connectionStatsIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    // Use enhanced transports with robust error handling
    if (typeof window !== 'undefined' && window.__TAURI__) {
      console.log('Initializing Enhanced Tauri serial transport');
      this.transport = new RobustTauriSerialTransport();
    } else {
      console.log('Initializing Enhanced Web serial transport');
      this.transport = new RobustWebSerialTransport();
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

      // Initialize health monitoring
      this.connectionHealth.set(label, {
        isHealthy: true,
        dataRate: 0,
        packetsReceived: 0,
        lastPacketTime: Date.now(),
        quality: 'excellent'
      });

      // Start statistics monitoring
      this.startStatsMonitoring(label);

      console.log(`Enhanced connection established for ${label}`);
      return true;
    } catch (error) {
      console.error(`Enhanced connect ${label} failed:`, error);
      return false;
    }
  }

  async disconnect(label: string): Promise<void> {
    const connection = this.connections.get(label);
    if (connection) {
      try {
        // Stop statistics monitoring
        this.stopStatsMonitoring(label);
        
        // Stop data reading
        const callback = this.dataCallbacks.get(label);
        if (callback) {
          await this.transport.stopReading(connection);
          this.dataCallbacks.delete(label);
        }
        
        await this.transport.disconnect(connection);
        this.connections.delete(label);
        this.connectionHealth.delete(label);
        
        console.log(`Enhanced disconnection completed for ${label}`);
      } catch (error) {
        console.error(`Enhanced disconnect ${label} error:`, error);
        // Force cleanup
        this.connections.delete(label);
        this.connectionHealth.delete(label);
      }
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
      const connection = this.connections.get(label);
      const health = this.connectionHealth.get(label);
      return connection?.isOpen === true && health?.isHealthy === true;
    }
    return Array.from(this.connections.values()).some(conn => conn.isOpen);
  }

  getConnection(label: string): SerialConnection | null {
    return this.connections.get(label) || null;
  }

  getConnectionHealth(label: string): ConnectionHealth | null {
    return this.connectionHealth.get(label) || null;
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

    // Wrap the callback to include health monitoring
    const enhancedCallback = (data: Uint8Array) => {
      this.updateConnectionHealth(label, data);
      onData(data);
    };

    this.dataCallbacks.set(label, enhancedCallback);
    await this.transport.startReading(connection, enhancedCallback);
  }

  async stopReading(label: string): Promise<void> {
    const connection = this.connections.get(label);
    if (connection) {
      await this.transport.stopReading(connection);
      this.dataCallbacks.delete(label);
    }
  }

  // Enhanced methods for monitoring
  getOverallHealth(): { 
    connectedPorts: number; 
    healthyPorts: number; 
    totalDataRate: number; 
    averageQuality: string;
  } {
    const connections = Array.from(this.connectionHealth.values());
    const connectedPorts = connections.length;
    const healthyPorts = connections.filter(h => h.isHealthy).length;
    const totalDataRate = connections.reduce((sum, h) => sum + h.dataRate, 0);
    
    const qualityScores = connections.map(h => {
      switch (h.quality) {
        case 'excellent': return 4;
        case 'good': return 3;
        case 'poor': return 2;
        case 'critical': return 1;
        default: return 0;
      }
    });
    
    const averageScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;
    
    const averageQuality = averageScore >= 3.5 ? 'excellent' :
                          averageScore >= 2.5 ? 'good' :
                          averageScore >= 1.5 ? 'poor' : 'critical';

    return {
      connectedPorts,
      healthyPorts,
      totalDataRate: Math.round(totalDataRate),
      averageQuality
    };
  }

  private updateConnectionHealth(label: string, data: Uint8Array): void {
    const health = this.connectionHealth.get(label);
    if (!health) return;

    const now = Date.now();
    const timeDelta = now - health.lastPacketTime;
    
    // Update statistics
    health.packetsReceived++;
    health.lastPacketTime = now;
    
    // Calculate data rate (bytes per second)
    if (timeDelta > 0) {
      const instantRate = (data.length * 1000) / timeDelta;
      health.dataRate = health.dataRate * 0.9 + instantRate * 0.1; // Moving average
    }

    // Determine connection quality
    const timeSinceLastPacket = now - health.lastPacketTime;
    if (timeSinceLastPacket < 100) {
      health.quality = 'excellent';
    } else if (timeSinceLastPacket < 1000) {
      health.quality = 'good';
    } else if (timeSinceLastPacket < 5000) {
      health.quality = 'poor';
    } else {
      health.quality = 'critical';
      health.isHealthy = false;
    }
  }

  private startStatsMonitoring(label: string): void {
    const interval = setInterval(() => {
      const health = this.connectionHealth.get(label);
      if (!health) {
        clearInterval(interval);
        return;
      }

      const now = Date.now();
      const timeSinceLastPacket = now - health.lastPacketTime;

      // Update health status based on data flow
      if (timeSinceLastPacket > 10000) { // 10 seconds without data
        health.isHealthy = false;
        health.quality = 'critical';
        console.warn(`Port ${label} appears unhealthy - no data for ${timeSinceLastPacket}ms`);
      }
    }, 2000); // Check every 2 seconds

    this.connectionStatsIntervals.set(label, interval);
  }

  private stopStatsMonitoring(label: string): void {
    const interval = this.connectionStatsIntervals.get(label);
    if (interval) {
      clearInterval(interval);
      this.connectionStatsIntervals.delete(label);
    }
  }
}