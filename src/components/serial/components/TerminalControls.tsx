import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Download, 
  Upload, 
  RotateCcw,
  Play, 
  Square,
  Clock
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface TerminalControlsProps {
  sendData: string;
  setSendData: (data: string) => void;
  sendFormat: 'utf8' | 'hex';
  setSendFormat: (format: 'utf8' | 'hex') => void;
  displayFormat: 'utf8' | 'hex';
  setDisplayFormat: (format: 'utf8' | 'hex') => void;
  newlineMode: 'none' | 'lf' | 'cr' | 'crlf';
  setNewlineMode: (mode: 'none' | 'lf' | 'cr' | 'crlf') => void;
  autoSend: boolean;
  autoSendInterval: number;
  setAutoSendInterval: (interval: number) => void;
  showTimestamp: boolean;
  setShowTimestamp: (show: boolean) => void;
  selectedSendPort: 'ALL' | 'P1' | 'P2';
  setSelectedSendPort: (port: 'ALL' | 'P1' | 'P2') => void;
  synchronizedScrolling: boolean;
  setSynchronizedScrolling: (sync: boolean) => void;
  onSendData: () => void;
  onToggleAutoSend: () => void;
  onExportLogs: () => void;
  connectedPorts: any[];
  connectedPortLabels: any[];
  strategy: any;
}

export const TerminalControls: React.FC<TerminalControlsProps> = ({
  sendData,
  setSendData,
  sendFormat,
  setSendFormat,
  displayFormat,
  setDisplayFormat,
  newlineMode,
  setNewlineMode,
  autoSend,
  autoSendInterval,
  setAutoSendInterval,
  showTimestamp,
  setShowTimestamp,
  selectedSendPort,
  setSelectedSendPort,
  synchronizedScrolling,
  setSynchronizedScrolling,
  onSendData,
  onToggleAutoSend,
  onExportLogs,
  connectedPorts,
  connectedPortLabels,
  strategy
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{t('terminal.controls')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 发送数据区域 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="send-data">{t('terminal.sendData')}</Label>
            <div className="flex items-center gap-2 text-xs">
              <Label htmlFor="send-format">{t('terminal.format')}:</Label>
              <Select value={sendFormat} onValueChange={(value: 'utf8' | 'hex') => setSendFormat(value)}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf8">UTF-8</SelectItem>
                  <SelectItem value="hex">HEX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            id="send-data"
            value={sendData}
            onChange={(e) => setSendData(e.target.value)}
            placeholder={sendFormat === 'hex' ? "48 65 6C 6C 6F" : "Hello World"}
            className="min-h-20 font-mono text-sm"
          />
        </div>

        {/* 发送选项 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('terminal.lineEnding')}</Label>
            <Select value={newlineMode} onValueChange={(value: 'none' | 'lf' | 'cr' | 'crlf') => setNewlineMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('terminal.none')}</SelectItem>
                <SelectItem value="lf">LF (\n)</SelectItem>
                <SelectItem value="cr">CR (\r)</SelectItem>
                <SelectItem value="crlf">CRLF (\r\n)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {strategy.communicationMode !== 'MERGED_TXRX' && (
            <div className="space-y-2">
              <Label>{t('terminal.targetPort')}</Label>
              <Select value={selectedSendPort} onValueChange={(value: 'ALL' | 'P1' | 'P2') => setSelectedSendPort(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('terminal.allPorts')}</SelectItem>
                  {connectedPortLabels.map((portInfo, index) => (
                    <SelectItem key={index} value={portInfo.label}>
                      {portInfo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 发送按钮 */}
        <div className="flex gap-2">
          <Button 
            onClick={onSendData} 
            disabled={!sendData.trim() || connectedPorts.length === 0}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            {t('terminal.send')}
          </Button>
          <Button
            variant={autoSend ? "destructive" : "outline"}
            onClick={onToggleAutoSend}
            disabled={!sendData.trim() || connectedPorts.length === 0}
          >
            {autoSend ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>

        {/* 自动发送设置 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-interval">{t('terminal.autoSendInterval')} (ms)</Label>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <Input
            id="auto-interval"
            type="number"
            min="10"
            max="60000"
            value={autoSendInterval}
            onChange={(e) => setAutoSendInterval(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <Separator />

        {/* 显示选项 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t('terminal.displayOptions')}</Label>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show-timestamp" className="text-sm">
              {t('terminal.showTimestamp')}
            </Label>
            <Switch
              id="show-timestamp"
              checked={showTimestamp}
              onCheckedChange={setShowTimestamp}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="display-format" className="text-sm">
              {t('terminal.displayFormat')}
            </Label>
            <Select value={displayFormat} onValueChange={(value: 'utf8' | 'hex') => setDisplayFormat(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utf8">UTF-8</SelectItem>
                <SelectItem value="hex">HEX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {connectedPorts.length > 1 && (
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-scroll" className="text-sm">
                {t('terminal.synchronizedScrolling')}
              </Label>
              <Switch
                id="sync-scroll"
                checked={synchronizedScrolling}
                onCheckedChange={setSynchronizedScrolling}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExportLogs} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            {t('terminal.ui.exportLogs')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};