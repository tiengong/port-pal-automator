import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { SerialManager } from '@/lib/serial/serialManager';
import { SerialPortInfo as TransportPortInfo, SerialConfig } from '@/lib/serial/transport';

export interface SerialPortInfo {
  id: string;
  port: any;
  params: SerialConfig;
  label: 'P1' | 'P2';
  connected: boolean;
}

export interface ConnectionStrategy {
  mode: 'P1_ONLY' | 'P1_P2';
  communicationMode: 'COMPARE' | 'MERGED_TXRX';
  txPort: 'ALL' | 'P1' | 'P2';
  p1Config: SerialConfig;
  p2Config: SerialConfig;
  p2Enabled: boolean;
}

export const useSerialManager = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [serialManager] = useState(() => new SerialManager());
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [strategy, setStrategy] = useState<ConnectionStrategy>({
    mode: 'P1_ONLY',
    communicationMode: 'COMPARE',
    txPort: 'ALL',
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
      label: connected.length > 0 ? connected.join('+') : t("app.disconnected")
    };
  }, [ports]);

  const connectPort = useCallback(async (selectedPort: TransportPortInfo, params: SerialConfig, label: 'P1' | 'P2') => {
    try {
      // Check if port is already connected
      if (ports.some(p => p.label === label)) {
        toast({
          title: t("connection.deviceAlreadyConnected"),
          description: t("connection.deviceAlreadyConnectedDesc", { port: label }),
          variant: "destructive"
        });
        return false;
      }

      const success = await serialManager.connect(selectedPort, params, label);
      
      if (success) {
        const newPortInfo: SerialPortInfo = {
          id: selectedPort.id,
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
          title: t("connection.connectSuccess"),
          description: t("connection.connectSuccessDesc", { port: label, baudRate: params.baudRate }),
        });
      } else {
        toast({
          title: t("connection.connectFailed"),
          description: t("connection.connectFailedDesc", { port: label }),
          variant: "destructive"
        });
      }

      return success;
    } catch (error) {
      console.error(`Connect ${label} failed:`, error);
      toast({
        title: t("connection.connectFailed"),
        description: t("connection.connectFailedDesc", { port: label }),
        variant: "destructive"
      });
      return false;
    }
  }, [ports, toast, serialManager]);

  const disconnectPort = useCallback(async (label: 'P1' | 'P2') => {
    try {
      await serialManager.disconnect(label);
      setPorts(prev => prev.filter(p => p.label !== label));

      toast({
        title: t("connection.disconnectSuccess"),
        description: t("connection.disconnectSuccessDesc", { port: label }),
      });
    } catch (error) {
      console.error(`Disconnect ${label} failed:`, error);
      
      // Remove from state even if disconnect failed
      setPorts(prev => prev.filter(p => p.label !== label));
      
      toast({
        title: t("connection.disconnectError"),
        description: t("connection.disconnectErrorDesc", { port: label }),
        variant: "destructive"
      });
    }
  }, [serialManager, toast]);

  const disconnectAll = useCallback(async () => {
    try {
      await serialManager.disconnectAll();
      setPorts([]);
    } catch (error) {
      console.error('Disconnect all failed:', error);
      // Clear state anyway
      setPorts([]);
    }
  }, [serialManager]);

  const quickConnect = useCallback(async () => {
    if (isConnected()) {
      await disconnectAll();
      return;
    }

    // Try to auto-connect to recently used ports if available
    try {
      const availablePorts = await serialManager.listPorts();
      if (availablePorts.length >= 1) {
        // Auto-connect to first available port as P1
        const success = await connectPort(availablePorts[0], strategy.p1Config, 'P1');
        if (success && availablePorts.length >= 2 && strategy.mode === 'P1_P2') {
          // Auto-connect second port as P2 if strategy supports it
          await connectPort(availablePorts[1], strategy.p2Config, 'P2');
        }
        return;
      }
    } catch (error) {
      console.log('Auto-connect failed, showing panel');
    }

    // Show connection panel if auto-connect fails
    return { showPanel: true };
  }, [isConnected, disconnectAll, connectPort, strategy, serialManager]);

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
    serialManager, // Expose serialManager for direct access
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