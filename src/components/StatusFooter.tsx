import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertCircle, XCircle, Info, X, Wifi, WifiOff, History, Trash } from 'lucide-react';
import { GlobalMessage } from '@/hooks/useGlobalMessages';
import { useSerialManager } from '@/hooks/useSerialManager';
import { useTranslation } from 'react-i18next';

interface StatusFooterProps {
  isSerialSupported: boolean;
  messages: GlobalMessage[];
  onClearAllMessages: () => void;
}

export const StatusFooter: React.FC<StatusFooterProps> = ({
  isSerialSupported,
  messages,
  onClearAllMessages
}) => {
  const { t } = useTranslation();
  const serialManager = useSerialManager();
  const connectionStatus = serialManager.getConnectionStatus();

  const getMessageIcon = (type: GlobalMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getMessageStyles = (type: GlobalMessage['type']) => {
    switch (type) {
      case 'success':
        return 'text-success border-success/20 bg-success/10';
      case 'warning':
        return 'text-warning border-warning/20 bg-warning/10';
      case 'error':
        return 'text-destructive border-destructive/20 bg-destructive/10';
      default:
        return 'text-primary border-primary/20 bg-primary/10';
    }
  };

  return (
    <footer className="h-6 bg-gradient-to-r from-card to-secondary/50 border-t border-border/50 px-6 flex items-center text-sm backdrop-blur-sm">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <ScrollArea className="h-5 w-full">
          <div className="flex items-center gap-2 py-1 select-none">
            {messages.length === 0 ? (
              <span className="text-muted-foreground/50 text-xs">{t('status.ready')}</span>
            ) : (
              messages.slice(-3).map((msg) => (
                <div key={msg.id} className={`flex items-center gap-2 px-2 py-0.5 rounded text-xs whitespace-nowrap ${getMessageStyles(msg.type)} select-none`}>
                  {getMessageIcon(msg.type)}
                  <span className="text-muted-foreground/70">{msg.message}</span>
                  <span className="text-muted-foreground/50 text-xs">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </footer>
  );
};