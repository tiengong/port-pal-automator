/**
 * 测试用例管理器头部组件
 * 显示当前脚本/用例信息和操作按钮
 */

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCode, Play, Square, Settings, Save, Upload, Download } from "lucide-react";
import { StatusIcon } from './common/StatusIcon';
import { Script } from '../types/ScriptTypes';
import { TestCase } from '../types';

export interface TestCaseManagerHeaderProps {
  currentScript: Script | null;
  currentTestCase: TestCase | null;
  isExecuting: boolean;
  onRunScript?: () => void;
  onStopScript?: () => void;
  onSaveScript?: () => void;
  onUploadTestCases?: () => void;
  onDownloadTestCases?: () => void;
  onEditCurrentCase?: () => void;
  onRunCurrentCase?: () => void;
}

export const TestCaseManagerHeader: React.FC<TestCaseManagerHeaderProps> = ({
  currentScript,
  currentTestCase,
  isExecuting,
  onRunScript,
  onStopScript,
  onSaveScript,
  onUploadTestCases,
  onDownloadTestCases,
  onEditCurrentCase,
  onRunCurrentCase
}) => {
  const renderScriptHeader = () => {
    if (!currentScript) return null;

    return (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              {currentScript.name}
              <Badge variant="outline" className="text-xs h-5">
                {currentScript.language.toUpperCase()}
              </Badge>
              <Badge 
                variant={
                  currentScript.status === 'success' ? 'default' : 
                  currentScript.status === 'error' ? 'destructive' : 
                  currentScript.status === 'running' ? 'secondary' : 
                  'outline'
                }
                className="flex items-center gap-1 text-xs h-5"
              >
                <StatusIcon status={currentScript.status as any} size="small" />
                {currentScript.status}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              {currentScript.description || '无描述'}
            </p>
          </div>
        </div>
        
        {/* Script actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={onRunScript}
            disabled={isExecuting}
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={onStopScript}
            disabled={!isExecuting}
          >
            <Square className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={onSaveScript}
          >
            <Save className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderTestCaseHeader = () => {
    if (!currentTestCase) return null;

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              {currentTestCase.name}
              {currentTestCase.isPreset && (
                <Badge variant="outline" className="text-xs">
                  预设
                </Badge>
              )}
            </h2>
            {currentTestCase.description && (
              <p className="text-xs text-muted-foreground">
                {currentTestCase.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Test case actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={onRunCurrentCase}
            disabled={isExecuting}
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={onEditCurrentCase}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderActions = () => {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={onUploadTestCases}
        >
          <Upload className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={onDownloadTestCases}
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex-shrink-0 p-2 border-b border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {currentScript ? renderScriptHeader() : renderTestCaseHeader()}
        </div>
        {renderActions()}
      </div>
    </div>
  );
};

export default TestCaseManagerHeader;