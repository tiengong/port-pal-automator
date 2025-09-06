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
  Save, 
  FileText, 
  Settings, 
  Download,
  Upload,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
  Code,
  Zap
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

  const handleSave = () => {
    onSaveScript(script);
    toast({
      title: "脚本已保存",
      description: `脚本 "${script.name}" 已成功保存到本地`,
    });
  };

  const handleRun = () => {
    if (script.isRunning) {
      onStopScript(script.id);
    } else {
      onRunScript(script.id);
    }
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
      {/* 脚本头部信息 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span>{script.name}</span>
              <Badge variant="outline" className="text-xs">
                {script.language.toUpperCase()}
              </Badge>
              <Badge 
                variant={getStatusBadgeVariant(script.status)}
                className="flex items-center gap-1 text-xs"
              >
                {getStatusIcon(script.status)}
                {script.status}
              </Badge>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                保存
              </Button>
              
              <Button
                onClick={handleRun}
                disabled={script.status === 'running'}
                variant={script.isRunning ? "destructive" : "default"}
                size="sm"
                className="flex items-center gap-1"
              >
                {script.isRunning ? (
                  <>
                    <Square className="w-4 h-4" />
                    停止
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    运行
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* 主编辑区域 */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              编辑器
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              设置
            </TabsTrigger>
            <TabsTrigger value="output" className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              输出
            </TabsTrigger>
            <TabsTrigger value="result" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              结果
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 mt-4">
            <Card className="h-full">
              <CardContent className="p-4 h-full">
                <Textarea
                  ref={textareaRef}
                  value={script.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={`-- ${script.language} 脚本内容\n-- 在这里编写您的${script.language}代码`}
                  className="h-full resize-none font-mono text-sm"
                  style={{ minHeight: '400px' }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">脚本设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scriptName">脚本名称</Label>
                  <Input
                    id="scriptName"
                    value={script.name}
                    onChange={(e) => handleScriptChange('name', e.target.value)}
                    placeholder="输入脚本名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scriptDescription">描述</Label>
                  <Textarea
                    id="scriptDescription"
                    value={script.description}
                    onChange={(e) => handleScriptChange('description', e.target.value)}
                    placeholder="脚本功能描述"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scriptLanguage">脚本语言</Label>
                  <Select 
                    value={script.language} 
                    onValueChange={(value: Script['language']) => handleScriptChange('language', value)}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>文件路径</Label>
                  <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                    {script.filePath}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <Label>创建时间</Label>
                    <div>{script.createdAt.toLocaleString()}</div>
                  </div>
                  <div>
                    <Label>修改时间</Label>
                    <div>{script.modifiedAt.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="output" className="flex-1 mt-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  输出控制台
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 font-mono text-sm p-4 rounded min-h-64 max-h-96 overflow-y-auto">
                  {script.isRunning ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-pulse" />
                      脚本正在运行中...
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      点击运行按钮来执行脚本并查看输出
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result" className="flex-1 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  执行结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                {script.lastRunResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {script.lastRunResult.success ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-600 font-medium">执行成功</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="text-red-600 font-medium">执行失败</span>
                        </>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {script.lastRunResult.timestamp.toLocaleString()}
                      </span>
                    </div>
                    
                    {script.lastRunResult.output && (
                      <div>
                        <Label>输出内容</Label>
                        <pre className="bg-muted p-3 rounded text-sm mt-1 whitespace-pre-wrap">
                          {script.lastRunResult.output}
                        </pre>
                      </div>
                    )}
                    
                    {script.lastRunResult.error && (
                      <div>
                        <Label>错误信息</Label>
                        <pre className="bg-red-50 text-red-800 p-3 rounded text-sm mt-1 whitespace-pre-wrap">
                          {script.lastRunResult.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>尚未执行脚本</p>
                    <p className="text-sm">运行脚本后将显示执行结果</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};