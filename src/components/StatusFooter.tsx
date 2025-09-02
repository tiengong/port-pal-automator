import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertCircle, XCircle, Info, X, Wifi, WifiOff, History, Trash } from 'lucide-react';
import { StatusMessage } from '@/hooks/useStatusMessages';
import { useSerialManager } from '@/hooks/useSerialManager';
import { useTranslation } from 'react-i18next';
interface StatusFooterProps {
  currentMessage: StatusMessage | null;
  onClearMessage: () => void;
  isSerialSupported: boolean;
  messages: StatusMessage[];
  onClearAllMessages: () => void;
}
export const StatusFooter: React.FC<StatusFooterProps> = ({
  currentMessage,
  onClearMessage,
  isSerialSupported,
  messages,
  onClearAllMessages
}) => {
  const {
    t
  } = useTranslation();
  const serialManager = useSerialManager();
  const connectionStatus = serialManager.getConnectionStatus();
  const getMessageIcon = (type: StatusMessage['type']) => {
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
  const getMessageStyles = (type: StatusMessage['type']) => {
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
  return <footer className="h-6 bg-gradient-to-r from-card to-secondary/50 border-t border-border/50 px-6 flex items-center justify-between text-sm backdrop-blur-sm">
      {/* Left: Status Message */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {currentMessage ? <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${getMessageStyles(currentMessage.type)}`}>
            {getMessageIcon(currentMessage.type)}
            <span className="font-medium truncate max-w-md" title={currentMessage.message}>
              {currentMessage.message}
            </span>
            
          </div> : <div className="flex items-center gap-6">
            
            {isSerialSupported ? <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                <span className="text-success font-medium">{t('status.webSerialSupported')}</span>
              </div> : <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
                <span className="text-warning font-medium">{t('status.webSerialNotSupported')}</span>
              </div>}
          </div>}
      </div>

      {/* Right: Connection Status & History */}
      <div className="flex items-center gap-6">
        {connectionStatus.count > 0 && <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('status.activeConnections')}:</span>
            {serialManager.ports.filter(p => p.connected).map((p, i) => <span key={i} className="text-success font-medium">
                {p.label}({p.params.baudRate}bps)
                {i < connectionStatus.count - 1 && <span className="text-muted-foreground mx-1">,</span>}
              </span>)}
          </div>}
        
        {/* Message History */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
              <History className="w-4 h-4" />
              {messages.length > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-primary">
                  {messages.length > 99 ? '99+' : messages.length}
                </Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="flex items-center justify-between p-3 border-b">
              <h4 className="font-medium text-sm">{t('status.history')}</h4>
              <Button variant="ghost" size="sm" onClick={onClearAllMessages} className="h-8 w-8 p-0">
                <Trash className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-64">
              {messages.length === 0 ? <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t('status.noMessages')}
                </div> : <div className="p-2">
                  {messages.slice().reverse().map(msg => <div key={msg.id} className="mb-2 p-2 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-start gap-2">
                        {getMessageIcon(msg.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm break-words">{msg.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>)}
                </div>}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        <span className="text-muted-foreground/70">© 2024</span>
      </div>
    </footer>;
};