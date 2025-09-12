// CommandRow.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayCircle, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { TestCommand } from "./types";
import { useToast } from "@/hooks/use-toast";

interface CommandRowProps {
  command: TestCommand;
  caseId: string;
  commandIndex: number;
  level: number;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: 'above' | 'below' | null;
  isExecuting: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string, type: 'command', itemId: string, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, caseId: string, index: number, position: 'above' | 'below') => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onSelectCase: (caseId: string) => void;
  onUpdateCommandSelection: (caseId: string, commandId: string, selected: boolean) => void;
  onRunCommand: (caseId: string, commandIndex: number) => void;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onSaveInlineEdit: (caseId: string, commandId: string) => void;
  onSetLastFocusedChild: (caseId: string, type: 'command', itemId: string, index: number) => void;
  onContextMenu: (e: React.MouseEvent, commandId: string, targetType: 'command') => void;
  inlineEdit: {
    commandId: string | null;
    value: string;
  };
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
}

export const CommandRow: React.FC<CommandRowProps> = ({
  command,
  caseId,
  commandIndex,
  level,
  isDragging,
  isDropTarget,
  dropPosition,
  isExecuting,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectCase,
  onUpdateCommandSelection,
  onRunCommand,
  onEditCommand,
  onSaveInlineEdit,
  onSetLastFocusedChild,
  onContextMenu,
  inlineEdit,
  setInlineEdit
}) => {
  const { toast } = useToast();
  const [localEditValue, setLocalEditValue] = useState(inlineEdit.value);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'running':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />;
      case 'partial':
        return <AlertCircle className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return null;
    }
  };

  const handleInlineEditSave = (caseId: string, commandId: string) => {
    if (inlineEdit.commandId === commandId && localEditValue.trim()) {
      // 更新内联编辑的值
      setInlineEdit({ commandId, value: localEditValue });
      onSaveInlineEdit(caseId, commandId);
      setLocalEditValue("");
    }
    setInlineEdit({ commandId: null, value: '' });
  };

  return (
    <div 
      key={command.id} 
      className={`p-2 hover:bg-muted/50 transition-colors cursor-move select-none ${
        isDragging ? 'opacity-50' : ''
      } ${
        isDropTarget && dropPosition === 'above' ? 'border-t-2 border-primary' : ''
      } ${
        isDropTarget && dropPosition === 'below' ? 'border-b-2 border-primary' : ''
      } ${
        isExecuting ? 'bg-primary/10 border border-primary/30 shadow-sm' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, caseId, 'command', command.id, commandIndex)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'above' : 'below';
        
        onDragOver(e, caseId, commandIndex, position);
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onContextMenu={(e) => onContextMenu(e, command.id, 'command')}
    >
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={() => {
          onSelectCase(caseId);
          onSetLastFocusedChild(caseId, 'command', command.id, commandIndex);
          // 选中当前点击的命令
          onUpdateCommandSelection(caseId, command.id, true);
        }}
      >
        {/* 复选框 */}
        <Checkbox
          checked={command.selected}
          onCheckedChange={(checked) => {
            onSelectCase(caseId);
            onUpdateCommandSelection(caseId, command.id, checked as boolean);
          }}
          className="flex-shrink-0 w-3.5 h-3.5"
        />
        
        {/* 命令内容 */}
        <div className="flex-1 min-w-0">
          <div 
            className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/30 rounded p-0.5 -m-0.5 transition-colors"
            onDoubleClick={() => {
              if (command.type === 'urc') {
                const currentValue = command.urcPattern || '';
                setInlineEdit({ commandId: command.id, value: currentValue });
                setLocalEditValue(currentValue);
              } else {
                const currentValue = command.command;
                setInlineEdit({ commandId: command.id, value: currentValue });
                setLocalEditValue(currentValue);
              }
            }}
            title={command.type === 'urc' ? "双击编辑URC校验内容" : "双击编辑命令内容"}
          >
            {inlineEdit.commandId === command.id ? (
              <Input
                value={localEditValue}
                onChange={(e) => setLocalEditValue(e.target.value)}
                onBlur={() => handleInlineEditSave(caseId, command.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInlineEditSave(caseId, command.id);
                  } else if (e.key === 'Escape') {
                    setInlineEdit({ commandId: null, value: '' });
                    setLocalEditValue("");
                  }
                }}
                className="font-mono text-xs h-5 px-1"
                placeholder={command.type === 'urc' ? "输入URC校验内容" : "输入命令内容"}
                autoFocus
              />
            ) : (
              <span className="font-mono text-xs truncate">
                {command.type === 'urc' ? (command.urcPattern || '点击编辑URC校验内容') : command.command}
              </span>
            )}
          </div>
          
          {command.expectedResponse && (
            <div className="text-xs text-muted-foreground truncate">
              期望: {command.expectedResponse}
            </div>
          )}
        </div>
        
        {/* 状态指示器 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {getStatusIcon(command.status)}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                    className="h-7 w-7 p-0"
                  onClick={() => onRunCommand(caseId, commandIndex)}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>运行</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    onSelectCase(caseId);
                    onEditCommand(caseId, commandIndex);
                  }}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>设置</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};