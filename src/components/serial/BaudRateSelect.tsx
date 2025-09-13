import React, { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BaudRateSelectProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

const STANDARD_BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export const BaudRateSelect: React.FC<BaudRateSelectProps> = ({
  value,
  onChange,
  label = "波特率",
  className
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customValue, setCustomValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 处理双击切换到编辑模式
  const handleDoubleClick = () => {
    setIsEditing(true);
    setCustomValue(value.toString());
  };

  // 处理输入框失焦
  const handleBlur = () => {
    handleCustomValueSave();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomValueSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCustomValue(value.toString());
    }
  };

  // 处理自定义值保存
  const handleCustomValueSave = () => {
    const numValue = parseInt(customValue);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 10000000) {
      onChange(numValue);
    }
    setIsEditing(false);
  };

  // 处理标准波特率选择
  const handleStandardRateChange = (newValue: string) => {
    const numValue = parseInt(newValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  // 判断当前值是否为标准波特率
  const isStandardRate = STANDARD_BAUD_RATES.includes(value);

  if (isEditing) {
    return (
      <div className={className}>
        <Label>{label}</Label>
        <Input
          ref={inputRef}
          type="number"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="输入波特率"
          className="mt-1"
          min="1"
          max="10000000"
        />
        <div className="text-xs text-muted-foreground mt-1">
          按Enter保存，按Esc取消
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Label className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">双击自定义</span>
      </Label>
      <Select
        value={value.toString()}
        onValueChange={handleStandardRateChange}
      >
        <SelectTrigger className="mt-1" onDoubleClick={handleDoubleClick}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STANDARD_BAUD_RATES.map(rate => (
            <SelectItem key={rate} value={rate.toString()}>
              {rate} bps
            </SelectItem>
          ))}
          {!isStandardRate && (
            <SelectItem key={value} value={value.toString()}>
              {value} bps (自定义)
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};