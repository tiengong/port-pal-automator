/**
 * 测试用例脚本面板组件
 * 包含脚本编辑器和执行结果显示
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCode, Play, Settings, Save, RotateCcw } from "lucide-react";
import { ScriptEditor } from '../ScriptEditor';
import { ExecutionEditor } from '../editors/ExecutionEditor';
import { UrcEditor } from '../editors/UrcEditor';
import { VariableDisplay } from '../../VariableDisplay';
import { Script } from '../types/ScriptTypes';
import { TestCase } from '../types';
import { StatusIcon } from './common/StatusIcon';

export interface TestCaseScriptPanelProps {
  currentScript: Script | null;
  currentTestCase: TestCase | null;
  editingCommandIndex: number | null;
  isExecuting: boolean;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onSaveScript?: () => void;
  onRunScript?: () => void;
  onStopScript?: () => void;
  onResetScript?: () => void;
}

export const TestCaseScriptPanel: React.FC<TestCaseScriptPanelProps> = ({
  currentScript,
  currentTestCase,
  editingCommandIndex,
  isExecuting,
  onEditCommand,
  onSaveScript,
  onRunScript,
  onStopScript,
  onResetScript
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'execution' | 'urc' | 'variables'>('script');

  const renderScriptContent = () => {
    if (!currentScript) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>选择一个脚本开始编辑</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{currentScript.name}</h3>
            <Badge variant="outline" className="text-xs">
              {currentScript.language.toUpperCase()}
            </Badge>
            <Badge 
              variant={
                currentScript.status === 'success' ? 'default' : 
                currentScript.status === 'error' ? 'destructive' : 
                currentScript.status === 'running' ? 'secondary' : 
                'outline'
              }
              className="flex items-center gap-1 text-xs"
            >
              <StatusIcon status={currentScript.status as any} size="small" />
              {currentScript.status}
            </Badge>
          </div>
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
              <div className="w-3.5 h-3.5 bg-current rounded-sm" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={onSaveScript}
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={onResetScript}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <ScriptEditor 
          script={currentScript}
          onChange={(updatedScript) => {
            // 处理脚本更新
            console.log('Script updated:', updatedScript);
          }}
        />
      </div>
    );
  };

  const renderExecutionContent = () => {
    if (!currentTestCase || editingCommandIndex === null) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>选择一个执行命令进行编辑</p>
          </div>
        </div>
      );
    }

    const command = currentTestCase.commands[editingCommandIndex];
    if (!command) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>命令不存在</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">编辑执行命令</h3>
            <Badge variant="outline" className="text-xs">
              #{editingCommandIndex + 1}
            </Badge>
            <Badge variant={command.status === 'success' ? 'default' : command.status === 'failed' ? 'destructive' : 'outline'} className="text-xs"
            >
              <StatusIcon status={command.status as any} size="small" />
              {command.status}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => onEditCommand(currentTestCase.id, editingCommandIndex)}
          >
              <Settings className="w-3.5 h-3.5" />
            设置
          </Button>
        </div>
        <ExecutionEditor
          command={command}
          onUpdateCommand={(updatedCommand) => {
            // 处理命令更新
            console.log('Command updated:', updatedCommand);
          }}
        />
      </div>
    );
  };

  const renderUrcContent = () => {
    if (!currentTestCase || editingCommandIndex === null) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>选择一个URC命令进行编辑</p>
          </div>
        </div>
      );
    }

    const command = currentTestCase.commands[editingCommandIndex];
    if (!command || command.type !== 'urc') {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>该命令不是URC类型</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">编辑URC命令</h3>
            <Badge variant="outline" className="text-xs">
              #{editingCommandIndex + 1}
            </Badge>
            <Badge variant={command.status === 'success' ? 'default' : command.status === 'failed' ? 'destructive' : 'outline'} className="text-xs"
            >
              <StatusIcon status={command.status as any} size="small" />
              {command.status}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => onEditCommand(currentTestCase.id, editingCommandIndex)}
          >
              <Settings className="w-3.5 h-3.5" />
            设置
          </Button>
        </div>
        <UrcEditor
          command={command}
          onUpdateCommand={(updatedCommand) => {
            // 处理命令更新
            console.log('URC Command updated:', updatedCommand);
          }}
        />
      </div>
    );
  };

  const renderVariablesContent = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">变量显示</h3>
      </div>
      <VariableDisplay />
    </div>
  );

  if (!currentScript && !currentTestCase) {
    return (
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>选择一个脚本或测试用例开始编辑</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="flex-shrink-0 p-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            {currentScript ? '脚本编辑器' : '命令编辑器'}
          </div>
          {currentScript && (
            <Badge variant="outline" className="text-xs"
            >
              {currentScript.language.toUpperCase()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 pt-0 overflow-y-auto"
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 mb-3"
          >
            <TabsTrigger value="script" className="text-xs py-1"
            >
              脚本
            </TabsTrigger>
            <TabsTrigger value="execution" className="text-xs py-1"
            >
              执行
            </TabsTrigger>
            <TabsTrigger value="urc" className="text-xs py-1"
            >
              URC
            </TabsTrigger>
            <TabsTrigger value="variables" className="text-xs py-1"
            >
              变量
            </TabsTrigger>
          </TabsList>
          <TabsContent value="script" className="mt-0"
          >
            {renderScriptContent()}
          </TabsContent>
          <TabsContent value="execution" className="mt-0"
          >
            {renderExecutionContent()}
          </TabsContent>
          <TabsContent value="urc" className="mt-0"
          >
            {renderUrcContent()}
          </TabsContent>
          <TabsContent value="variables" className="mt-0"
          >
            {renderVariablesContent()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TestCaseScriptPanel;