import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Square, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
  Code,
  Zap,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Script, ScriptExecutionResult } from "./types/ScriptTypes";

interface ScriptEditorProps {
  script: Script;
  onScriptUpdate: (script: Script) => void;
  onRunScript: (scriptId: string) => void;
  onStopScript: (scriptId: string) => void;
  onSaveScript: (script: Script) => void;
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onScriptUpdate,
  onRunScript,
  onStopScript,
  onSaveScript,
  statusMessages
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScriptChange = (field: keyof Script, value: any) => {
    const updatedScript = {
      ...script,
      [field]: value,
      modifiedAt: new Date()
    };
    onScriptUpdate(updatedScript);
  };

  const handleContentChange = (content: string) => {
    handleScriptChange('content', content);
  };

  const getStatusIcon = (status: Script['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'stopped':
        return <Square className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeVariant = (status: Script['status']) => {
    switch (status) {
      case 'success':
        return 'default' as const;
      case 'error':
        return 'destructive' as const;
      case 'running':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 紧凑的标签栏 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="editor" className="flex items-center gap-1.5 text-xs">
            <Code className="w-3.5 h-3.5" />
            编辑器
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            设置
          </TabsTrigger>
          <TabsTrigger value="output" className="flex items-center gap-1.5 text-xs">
            <Terminal className="w-3.5 h-3.5" />
            输出
          </TabsTrigger>
          <TabsTrigger value="result" className="flex items-center gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" />
            结果
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 mt-2 h-full min-h-0">
          <div className="h-full flex flex-col">
            <Textarea
              ref={textareaRef}
              value={script.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={`-- ${script.language} 脚本内容\n-- 在这里编写您的${script.language}代码`}
              className="flex-1 resize-none font-mono text-sm border-border bg-card/50"
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 mt-2 overflow-y-auto">
          <div className="space-y-3 pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="scriptName" className="text-sm font-medium">脚本名称</Label>
              <Input
                id="scriptName"
                value={script.name}
                onChange={(e) => handleScriptChange('name', e.target.value)}
                placeholder="输入脚本名称"
                className="h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scriptDescription" className="text-sm font-medium">描述</Label>
              <Textarea
                id="scriptDescription"
                value={script.description}
                onChange={(e) => handleScriptChange('description', e.target.value)}
                placeholder="脚本功能描述"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scriptLanguage" className="text-sm font-medium">脚本语言</Label>
              <Select 
                value={script.language} 
                onValueChange={(value: Script['language']) => handleScriptChange('language', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lua">Lua</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">文件路径</Label>
              <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded border">
                {script.filePath}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <Label className="text-xs font-medium">创建时间</Label>
                <div className="mt-1">{script.createdAt.toLocaleString()}</div>
              </div>
              <div>
                <Label className="text-xs font-medium">修改时间</Label>
                <div className="mt-1">{script.modifiedAt.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="output" className="flex-1 mt-2 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">输出控制台</span>
          </div>
          <div className="flex-1 bg-black text-green-400 font-mono text-xs p-3 rounded border overflow-y-auto">
            {script.isRunning ? (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                脚本正在运行中...
              </div>
            ) : (
              <div className="text-gray-500">
                点击运行按钮来执行脚本并查看输出
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="result" className="flex-1 mt-2 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">执行结果</span>
            </div>
            
            {script.lastRunResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded border">
                  {script.lastRunResult.success ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium text-sm">执行成功</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-medium text-sm">执行失败</span>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {script.lastRunResult.timestamp.toLocaleString()}
                  </span>
                </div>
                
                {script.lastRunResult.output && (
                  <div>
                    <Label className="text-sm font-medium">输出内容</Label>
                    <pre className="bg-muted/50 p-2 rounded border text-xs mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {script.lastRunResult.output}
                    </pre>
                  </div>
                )}
                
                {script.lastRunResult.error && (
                  <div>
                    <Label className="text-sm font-medium">错误信息</Label>
                    <pre className="bg-red-50 text-red-800 p-2 rounded border text-xs mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {script.lastRunResult.error}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">尚未执行脚本</p>
                <p className="text-xs">运行脚本后将显示执行结果</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};