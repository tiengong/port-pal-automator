// Event bus for component communication
type EventCallback = (data: any) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Clear all event listeners
  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

// Event types
export interface SerialDataEvent {
  portIndex: number;
  portLabel: string;
  data: string;
  timestamp: Date;
  type: 'sent' | 'received';
}

export interface SendCommandEvent {
  command: string;
  format: 'utf8' | 'hex';
  lineEnding: 'none' | 'lf' | 'cr' | 'crlf';
  targetPort?: 'ALL' | 'P1' | 'P2';
}

// Event names
export const EVENTS = {
  SERIAL_DATA_RECEIVED: 'serial:data:received',
  SEND_COMMAND: 'serial:send:command',
  URC_PARSED: 'urc:parsed',
  PARAMETER_EXTRACTED: 'parameter:extracted'
} as const;