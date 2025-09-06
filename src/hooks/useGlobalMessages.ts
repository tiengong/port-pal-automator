import { useState, useCallback } from 'react';

export interface GlobalMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
}

let globalMessages: GlobalMessage[] = [];
let messageListeners: Array<() => void> = [];

export const addGlobalMessage = (message: string, type: GlobalMessage['type'] = 'info') => {
  const newMessage: GlobalMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message,
    type,
    timestamp: new Date()
  };
  
  globalMessages = [...globalMessages.slice(-99), newMessage]; // Keep last 100 messages
  messageListeners.forEach(listener => listener());
};

export const useGlobalMessages = () => {
  const [messages, setMessages] = useState<GlobalMessage[]>(globalMessages);
  
  const updateMessages = useCallback(() => {
    setMessages([...globalMessages]);
  }, []);
  
  // Subscribe to message updates
  useState(() => {
    messageListeners.push(updateMessages);
    return () => {
      messageListeners = messageListeners.filter(listener => listener !== updateMessages);
    };
  });
  
  const clearAllMessages = useCallback(() => {
    globalMessages = [];
    messageListeners.forEach(listener => listener());
  }, []);
  
  return {
    messages,
    addMessage: addGlobalMessage,
    clearAllMessages
  };
};

// Custom toast replacement that adds to global messages instead
export const globalToast = (options: { 
  title?: string; 
  description?: string; 
  variant?: 'default' | 'destructive' 
}) => {
  const message = options.title || options.description || '';
  const type = options.variant === 'destructive' ? 'error' : 'success';
  addGlobalMessage(message, type);
};