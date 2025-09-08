// AutoCompleteCommandRow.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayCircle, Settings, CheckCircle, XCircle, AlertCircle, ChevronDown } from "lucide-react";
import { TestCommand } from "./types";
import { useToast } from "@/hooks/use-toast";
import { atCommandAutoCompleteManager, ATCommand } from "./utils/atCommandAutoComplete";
import { cn } from "@/lib/utils";

interface AutoCompleteCommandRowProps {
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
  onUpdateCommand: (caseId: string, commandId: string, updates: Partial<TestCommand>) => void;
}

export const AutoCompleteCommandRow: React.FC<AutoCompleteCommandRowProps> = ({
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
  setInlineEdit,
  onUpdateCommand
}) => {
  const { toast } = useToast();
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteItems, setAutoCompleteItems] = useState<ATCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputValue, setInputValue] = useState(command.command);
  const autoCompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化AT命令库
  useEffect(() => {
    const loadLibrary = async () => {
      if (!atCommandAutoCompleteManager.isLibraryLoaded()) {
        await atCommandAutoCompleteManager.loadLibrary();
      }
    };
    loadLibrary();
  }, []);

  // 点击外部关闭自动补全
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autoCompleteRef.current && !autoCompleteRef.current.contains(event.target as Node)) {
        setShowAutoComplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showAutoComplete || autoCompleteItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % autoCompleteItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + autoCompleteItems.length) % autoCompleteItems.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < autoCompleteItems.length) {
          selectAutoCompleteItem(autoCompleteItems[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowAutoComplete(false);
        break;
    }
  }, [showAutoComplete, autoCompleteItems, selectedIndex]);

  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    
    // 更新命令
    onUpdateCommand(caseId, command.id, { command: value });

    // 触发自动补全
    if (value.trim().length > 0) {
      const completer = atCommandAutoCompleteManager.getCompleter();
      if (completer) {
        const matches = completer.getMatches(value, 5);
        if (matches.length > 0) {
          setAutoCompleteItems(matches);
          setSelectedIndex(0);
          setShowAutoComplete(true);
        } else {
          setShowAutoComplete(false);
        }
      }
    } else {
      setShowAutoComplete(false);
    }
  }, [caseId, command.id, onUpdateCommand]);

  // 选择自动补全项
  const selectAutoCompleteItem = useCallback((atCommand: ATCommand) => {
    setInputValue(atCommand.command);
    onUpdateCommand(caseId, command.id, { 
      command: atCommand.command,
      expectedResponse: atCommand.expectedResponse,
      waitTime: atCommand.urcTimeout
    });
    setShowAutoComplete(false);
    
    // 显示提示信息
    toast({
      title: "AT命令已更新",
      description: `${atCommand.command}: ${atCommand.description}`,
      duration: 2000,
    });
  }, [caseId, command.id, onUpdateCommand, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'running':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <div 
      className={cn(
        "p-2 hover:bg-muted/50 transition-colors cursor-move select-none relative",
        isDragging && "opacity-50",
        isDropTarget && dropPosition === 'above' && "border-t-2 border-primary",
        isDropTarget && dropPosition === 'below' && "border-b-2 border-primary"
      )}
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
      <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 12}px` }}>
        {/* 拖拽手柄 */}
        <div className="w-3 h-3 bg-gray-300 rounded-sm flex-shrink-0 cursor-grab" />
        
        {/* 复选框 */}
        <Checkbox
          checked={command.selected}
          onCheckedChange={(checked) => onUpdateCommandSelection(caseId, command.id, checked as boolean)}
          className="flex-shrink-0 w-3.5 h-3.5"
        />
        
        {/* 命令索引 */}
        <span className="text-xs text-gray-500 font-mono flex-shrink-0 w-6">
          {(commandIndex + 1).toString().padStart(2, '0')}
        </span>
        
        {/* 命令输入框（带自动补全） */}
        <div className="flex-1 min-w-0 relative">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              onSelectCase(caseId);
              onSetLastFocusedChild(caseId, 'command', command.id, commandIndex);
            }}
            placeholder="输入AT命令..."
            className="h-7 text-xs font-mono"
            disabled={isExecuting}
          />
          
          {/* 自动补全下拉框 */}
          {showAutoComplete && autoCompleteItems.length > 0 && (
            <div 
              ref={autoCompleteRef}
              className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              {autoCompleteItems.map((item, index) => (
                <div
                  key={item.command}
                  className={cn(
                    "px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    index === selectedIndex && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => selectAutoCompleteItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono">{item.command}</code>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    预期: {item.expectedResponse}
                  </div>
                </div>
              ))}
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
                  disabled={isExecuting}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>运行命令</p>
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
                  onClick={() => onEditCommand(caseId, commandIndex)}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>编辑命令</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};