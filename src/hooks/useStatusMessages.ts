import { useState, useCallback } from 'react';

export interface StatusMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

export const useStatusMessages = () => {
  const [messages, setMessages] = useState<StatusMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<StatusMessage | null>(null);

  const addMessage = useCallback((message: string, type: StatusMessage['type'] = 'info') => {
    const newMessage: StatusMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date()
    };

    setMessages(prev => [...prev.slice(-49), newMessage]); // Keep last 50 messages
    setCurrentMessage(newMessage);

    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        setCurrentMessage(prev => prev?.id === newMessage.id ? null : prev);
      }, 5000);
    }
  }, []);

  const clearMessage = useCallback(() => {
    setCurrentMessage(null);
  }, []);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
    setCurrentMessage(null);
  }, []);

  return {
    messages,
    currentMessage,
    addMessage,
    clearMessage,
    clearAllMessages
  };
};