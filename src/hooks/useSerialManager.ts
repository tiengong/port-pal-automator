import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface SerialPortInfo {
  id: string;
  port: any;
  params: {
    baudRate: number;
    dataBits: number;
    parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
    stopBits: number;
  };
  label: 'P1' | 'P2';
  connected: boolean;
}

export interface ConnectionStrategy {
  mode: 'P1_ONLY' | 'P1_P2';
  p1Config: SerialPortInfo['params'];
  p2Config: SerialPortInfo['params'];
  p2Enabled: boolean;
}

export const useSerialManager = () => {
  const { toast } = useToast();
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [strategy, setStrategy] = useState<ConnectionStrategy>({
    mode: 'P1_ONLY',
    p1Config: {
      baudRate: 115200,
      dataBits: 8,
      parity: 'none',
      stopBits: 1
    },
    p2Config: {
      baudRate: 115200,
      dataBits: 8,
      parity: 'none',
      stopBits: 1
    },
    p2Enabled: false
  });

  const isConnected = useCallback(() => {
    return ports.some(p => p.connected);
  }, [ports]);

  const getConnectionStatus = useCallback(() => {
    const p1 = ports.find(p => p.label === 'P1');
    const p2 = ports.find(p => p.label === 'P2');
    
    const connected = [];
    if (p1?.connected) connected.push('P1');
    if (p2?.connected) connected.push('P2');
    
    return {
      connected,
      count: connected.length,
      label: connected.length > 0 ? connected.join('+') : '未连接'
    };
  }, [ports]);

  const connectPort = useCallback(async (selectedPort: any, params: SerialPortInfo['params'], label: 'P1' | 'P2') => {
    try {
      // Check if port is already connected
      if (ports.some(p => p.port === selectedPort)) {
        toast({
          title: "设备已连接",
          description: `${label} 端口已经连接`,
          variant: "destructive"
        });
        return false;
      }

      await selectedPort.open({
        baudRate: params.baudRate,
        dataBits: params.dataBits,
        parity: params.parity,
        stopBits: params.stopBits
      });

      const newPortInfo: SerialPortInfo = {
        id: Date.now().toString(),
        port: selectedPort,
        params,
        label,
        connected: true
      };

      setPorts(prev => {
        // Remove any existing port with the same label
        const filtered = prev.filter(p => p.label !== label);
        return [...filtered, newPortInfo];
      });

      toast({
        title: "连接成功",
        description: `${label} 端口已连接 (${params.baudRate} bps)`,
      });

      return true;
    } catch (error) {
      console.error(`Connect ${label} failed:`, error);
      toast({
        title: "连接失败",
        description: `无法连接到 ${label} 端口`,
        variant: "destructive"
      });
      return false;
    }
  }, [ports, toast]);

  const disconnectPort = useCallback(async (label: 'P1' | 'P2') => {
    const portInfo = ports.find(p => p.label === label);
    if (!portInfo) return;

    try {
      // Close the port
      if (portInfo.port.readable && portInfo.port.readable.locked) {
        try {
          const reader = portInfo.port.readable.getReader();
          await reader.cancel();
          reader.releaseLock();
        } catch (readerError) {
          console.log('Reader cleanup error (expected):', readerError);
        }
      }
      
      await portInfo.port.close();

      setPorts(prev => prev.filter(p => p.label !== label));

      toast({
        title: "已断开连接",
        description: `${label} 端口连接已断开`,
      });
    } catch (error) {
      console.error(`Disconnect ${label} failed:`, error);
      
      // Remove from state even if close failed
      setPorts(prev => prev.filter(p => p.label !== label));
      
      toast({
        title: "端口已断开",
        description: `${label} 连接已断开，端口可能仍在使用中`,
        variant: "destructive"
      });
    }
  }, [ports, toast]);

  const disconnectAll = useCallback(async () => {
    const disconnectPromises = ports
      .filter(p => p.connected)
      .map(p => disconnectPort(p.label));
    
    await Promise.all(disconnectPromises);
  }, [ports, disconnectPort]);

  const quickConnect = useCallback(async () => {
    if (isConnected()) {
      await disconnectAll();
      return;
    }

    // Try to auto-connect to recently used ports if available
    try {
      if ('serial' in navigator) {
        const availablePorts = await (navigator as any).serial.getPorts();
        if (availablePorts.length >= 1) {
          // Auto-connect to first available port as P1
          const success = await connectPort(availablePorts[0], strategy.p1Config, 'P1');
          if (success && availablePorts.length >= 2 && strategy.mode === 'P1_P2') {
            // Auto-connect second port as P2 if strategy supports it
            await connectPort(availablePorts[1], strategy.p2Config, 'P2');
          }
          return;
        }
      }
    } catch (error) {
      console.log('Auto-connect failed, showing panel');
    }

    // Show connection panel if auto-connect fails
    return { showPanel: true };
  }, [isConnected, disconnectAll, connectPort, strategy]);

  const updateStrategy = useCallback((newStrategy: Partial<ConnectionStrategy>) => {
    setStrategy(prev => ({ ...prev, ...newStrategy }));
  }, []);

  // Legacy compatibility - convert to old format for existing components
  const getConnectedPorts = useCallback(() => {
    return ports
      .filter(p => p.connected)
      .map(p => ({
        port: p.port,
        params: p.params
      }));
  }, [ports]);

  return {
    ports,
    strategy,
    isConnected,
    getConnectionStatus,
    connectPort,
    disconnectPort,
    disconnectAll,
    quickConnect,
    updateStrategy,
    getConnectedPorts, // For legacy compatibility
  };
};