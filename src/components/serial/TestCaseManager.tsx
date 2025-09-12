import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import { 
  Plus, 
  Play, 
  Trash2, 
  Edit,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  TestTube2,
  Search,
  Upload,
  Download,
  CheckSquare,
  Square,
  PlayCircle,
  RotateCcw,
  Hash,
  Save,
  FileCode
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { globalToast } from "@/hooks/useGlobalMessages";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/contexts/SettingsContext";
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { ScriptEditor } from './ScriptEditor';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { VariableDisplay } from '../VariableDisplay';
import { RunResultDialog } from './RunResultDialog';
import { TestCase } from './types';
import { eventBus, EVENTS, SerialDataEvent } from '@/lib/eventBus';
import { sampleTestCases } from './sampleCases';
import { CaseEditDialogInline } from './components/CaseEditDialogInline';

// Import modular utilities
import { useTestCaseManager } from './hooks/useTestCaseManager';
import { setupUrcListeners } from './utils/urcHandlerUtils';

interface TestCaseManagerProps {
  connectedPorts: Array<{
    port: any;
    params: any;
  }>;
  receivedData: string[];
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export const TestCaseManager: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData,
  statusMessages
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { settings } = useSettings();
  
  // Use the modular hook for all business logic
  const {
    state,
    handleSelectTestCase,
    handleEditCase,
    handleRunTestCase,
    handleDeleteTestCase,
    handleRunCommand,
    handleEditCommand,
    updateCommandSelection,
    updateCaseSelection,
    updateSubCaseSelection,
    toggleCaseExpand,
    handleContextMenu,
    addCommandViaContextMenu,
    addUrcViaContextMenu,
    addSubCaseViaContextMenu,
    toggleSelectAllViaContextMenu,
    deleteSelectedCommands,
    handleCreateScript,
    handleDeleteScript,
    handleSelectScript,
    handleRunScript,
    handleStopScript,
    handleSaveScript,
    handleWorkspaceChange,
    getCurrentTestCase,
    getVisibleRootCase,
    getTargetCaseForActions,
    hasSelectedItems,
    generateUniqueId,
    setTestCases,
    setSelectedTestCaseId,
    setEditingCase,
    setIsEditDialogOpen,
    setEditingCommandIndex,
    setCurrentScript,
    setScripts,
    setRunResult,
    setShowRunResult,
    setStoredParameters,
    setTriggeredUrcIds,
    setContextMenu,
    setInlineEdit,
    setUserActionDialog,
    setFailurePromptDialog,
    setLastFocusedChild,
    setCurrentWorkspace,
    setNextUniqueId
  } = useTestCaseManager({
    connectedPorts,
    receivedData,
    statusMessages
  });

  // AT命令库
  const atCommands = [
    'AT', 'AT+CGMR', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ', 'AT+CREG', 'AT+COPS',
    'AT+CGATT', 'AT+CGACT', 'AT+CGDCONT', 'AT+CPINR', 'AT+CPIN', 'AT+CCID'
  ];

  // Initialize sample data
  useEffect(() => {
    if (state.testCases.length === 0) {
      setTestCases(sampleTestCases);
      setSelectedTestCaseId('case1');
      setNextUniqueId(1003);
    }
  }, []);

  // Use URC listeners from modular utilities
  useEffect(() => {
    const currentTestCase = getCurrentTestCase();
    if (!currentTestCase) return;
    
    const unsubscribe = setupUrcListeners({
      currentTestCase,
      testCases: state.testCases,
      storedParameters: state.storedParameters,
      triggeredUrcIds: state.triggeredUrcIds,
      onUpdateTestCases: setTestCases,
      onUpdateParameters: setStoredParameters,
      onUpdateTriggeredUrcIds: setTriggeredUrcIds,
      onExecuteCommand: async (caseId: string, commandIndex: number) => {
        await handleRunCommand(caseId, commandIndex);
      }
    });
    
    return unsubscribe;
  }, [getCurrentTestCase(), state.testCases, state.storedParameters, state.triggeredUrcIds]);

  const currentTestCase = getCurrentTestCase();
  const visibleRootCase = getVisibleRootCase();

  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases: state.testCases });

  // 获取状态图标
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

  // 渲染子用例行（支持拖拽）
  const renderSubCaseRow = (subCase: TestCase, parentCaseId: string, level: number) => {
    const isDragging = state.dragInfo.draggedItem?.caseId === parentCaseId && state.dragInfo.draggedItem?.itemId === subCase.id;
    const isDropTarget = state.dragInfo.dropTarget?.caseId === parentCaseId && state.dragInfo.dropTarget?.index === level;
    
    return (
      <div 
        key={subCase.id} 
        className={`p-3 hover:bg-muted/50 transition-colors cursor-move select-none ${
          isDragging ? 'opacity-50' : ''
        } ${
          isDropTarget && state.dragInfo.dropTarget?.position === 'above' ? 'border-t-2 border-primary' : ''
        } ${
          isDropTarget && state.dragInfo.dropTarget?.position === 'below' ? 'border-b-2 border-primary' : ''
        }`}
        draggable
        onDragStart={(e) => {
          // Implementation would use dragDropUtils
          console.log('Drag start:', subCase.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          console.log('Drop event');
        }}
      >
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
          {/* 复选框 */}
          <Checkbox
            checked={subCase.selected}
            onCheckedChange={(checked) => {
              updateCaseSelection(subCase.id, checked as boolean);
            }}
            className="flex-shrink-0"
          />
          
          {/* 子用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              setSelectedTestCaseId(subCase.id);
              setLastFocusedChild({
                caseId: parentCaseId,
                type: 'subcase',
                itemId: subCase.id,
                index: level
              });
            }}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${
                state.selectedTestCaseId === subCase.id ? 'text-primary' : ''
              }`}>
                {subCase.name}
              </span>
            </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon(subCase.status)}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleRunTestCase(subCase.id)}
                    disabled={connectedPorts.length === 0}
                  >
                    <PlayCircle className="w-4 h-4" />
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
                    className="h-8 w-8 p-0"
                    onClick={() => toggleCaseExpand(subCase.id)}
                  >
                    {subCase.subCases.length > 0 || subCase.commands.length > 0 ? (
                      subCase.isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{subCase.isExpanded ? '折叠' : '展开'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  };

  // 渲染测试用例节点
  const renderCaseNode = (testCase: TestCase, level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    // 渲染用例行
    elements.push(
      <div key={testCase.id} className="p-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 12}px` }}>
          {/* 复选框 */}
          <Checkbox
            checked={testCase.selected}
            onCheckedChange={(checked) => {
              updateCaseSelection(testCase.id, checked as boolean);
            }}
            className="flex-shrink-0 w-3.5 h-3.5"
          />
          
          {/* 用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setSelectedTestCaseId(testCase.id)}
          >
            <div className="flex items-center gap-1.5">
              <span className={`font-medium text-xs truncate ${
                state.selectedTestCaseId === testCase.id ? 'text-primary' : ''
              }`}>
                {testCase.name}
              </span>
            </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {getStatusIcon(testCase.status)}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRunTestCase(testCase.id)}
                    disabled={connectedPorts.length === 0}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>运行</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 折叠展开按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleCaseExpand(testCase.id)}
                  >
                    {testCase.isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{testCase.isExpanded ? '折叠' : '展开'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );

    // 渲染展开的内容（统一排序的命令和子用例）
    if (testCase.isExpanded) {
      // Implementation would use testCaseUtils for sorting
      testCase.commands.forEach((command, index) => {
        elements.push(
          <div key={command.id} className="p-2 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${(level + 1) * 12}px` }}>
              <Checkbox
                checked={command.selected}
                onCheckedChange={(checked) => {
                  updateCommandSelection(testCase.id, command.id, checked as boolean);
                }}
                className="flex-shrink-0 w-3.5 h-3.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-xs truncate">
                    {command.command}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {getStatusIcon(command.status)}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleRunCommand(testCase.id, index)}
                        disabled={connectedPorts.length === 0}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>运行</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        );
      });
      
      testCase.subCases.forEach((subCase) => {
        elements.push(renderSubCaseRow(subCase, testCase.id, level + 1));
        
        // 如果子用例展开，递归渲染其内容
        if (subCase.isExpanded) {
          elements.push(...renderCaseNode(subCase, level + 2));
        }
      });
    }
    
    return elements;
  };

  // 渲染统一树结构（顶级用例不显示，直接显示内容）
  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    cases.forEach((testCase) => {
      // 对于顶级用例（level === 0），不渲染用例行本身，直接渲染其内容
      if (level === 0) {
        // Implementation would use testCaseUtils for sorting
        testCase.commands.forEach((command, index) => {
          elements.push(
            <div key={command.id} className="p-2 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 12}px` }}>
                <Checkbox
                  checked={command.selected}
                  onCheckedChange={(checked) => {
                    updateCommandSelection(testCase.id, command.id, checked as boolean);
                  }}
                  className="flex-shrink-0 w-3.5 h-3.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs truncate">
                      {command.command}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getStatusIcon(command.status)}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleRunCommand(testCase.id, index)}
                          disabled={connectedPorts.length === 0}
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>运行</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          );
        });
        
        testCase.subCases.forEach((subCase) => {
          elements.push(...renderCaseNode(subCase, level + 1));
        });
      } else {
        // 对于非顶级用例，正常渲染
        elements.push(...renderCaseNode(testCase, level));
      }
    });
    
    return elements;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* 1. 当前信息显示 */}
      <div className="flex-shrink-0 p-2 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {state.currentScript ? (
          // Script header
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  {state.currentScript.name}
                  <Badge variant="outline" className="text-xs h-5">
                    {state.currentScript.language.toUpperCase()}
                  </Badge>
                  <Badge 
                    variant={
                      state.currentScript.status === 'success' ? 'default' : 
                      state.currentScript.status === 'error' ? 'destructive' : 
                      state.currentScript.status === 'running' ? 'secondary' : 
                      'outline'
                    }
                    className="flex items-center gap-1 text-xs h-5"
                  >
                    {state.currentScript.status === 'success' && <CheckCircle className="w-3 h-3" />}
                    {state.currentScript.status === 'error' && <XCircle className="w-3 h-3" />}
                    {state.currentScript.status === 'running' && <AlertCircle className="w-3 h-3 animate-pulse" />}
                    {state.currentScript.status}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {state.currentScript.description || '无描述'}
                </p>
              </div>
            </div>
            
            {/* Script actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveScript(state.currentScript!)}
                className="flex items-center gap-1 h-7 px-2"
              >
                <Save className="w-3.5 h-3.5" />
                保存
              </Button>
              
              <Button
                onClick={() => state.currentScript!.isRunning ? handleStopScript(state.currentScript!.id) : handleRunScript(state.currentScript!.id)}
                disabled={state.currentScript!.status === 'running'}
                variant={state.currentScript!.isRunning ? "destructive" : "default"}
                size="sm"
                className="flex items-center gap-1 h-7 px-2"
              >
                {state.currentScript!.isRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    停止
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    运行
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Test case header
          <>
            <div className="flex items-center justify-between mb-2">
              <TestCaseHeader 
                currentTestCase={currentTestCase ? (getVisibleRootCase() || currentTestCase) : currentTestCase} 
                onUpdateCase={(caseId, updater) => {
                  // Implementation would use testCaseRecursiveUtils
                  console.log('Update case:', caseId);
                }}
              />
            </div>

            {/* 2. 操作栏 */}
            <TestCaseActions 
              currentTestCase={getTargetCaseForActions(currentTestCase)}
              testCases={state.testCases}
              setTestCases={setTestCases}
              connectedPorts={connectedPorts}
              onEditCase={handleEditCase}
              onRunTestCase={handleRunTestCase}
              onSync={() => {
                toast({
                  title: "同步功能",
                  description: "同步功能开发中...",
                });
              }}
              onDeleteTestCase={handleDeleteTestCase}
              onDeleteSelectedCommands={() => {
                // Implementation would use selection utils
                console.log('Delete selected commands');
              }}
              onDeletePresetCases={() => {
                // Implementation would use preset utils
                console.log('Delete preset cases');
              }}
              onSelectTestCase={handleSelectTestCase}
              onUpdateCase={(caseId, updater) => {
                // Implementation would use testCaseRecursiveUtils
                console.log('Update case:', caseId);
              }}
              hasSelectedItems={hasSelectedItems}
            />
          </>
        )}
      </div>

      {/* 3. 中间内容展示区 - 脚本编辑器或测试用例 */}
      {state.currentScript ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScriptEditor
            script={state.currentScript}
            onScriptUpdate={(updatedScript) => {
              setScripts(state.scripts.map(s => 
                s.id === updatedScript.id ? updatedScript : s
              ));
              setCurrentScript(updatedScript);
            }}
            onRunScript={handleRunScript}
            onStopScript={handleStopScript}
            onSaveScript={handleSaveScript}
            statusMessages={statusMessages}
          />
        </div>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {state.testCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <TestTube2 className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">暂无测试用例，点击新建用例开始</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 参数显示面板 - 根据设置显示 */}
                  {settings.testCaseSettings.showVariablePanel && Object.keys(state.storedParameters).length > 0 && (
                    <VariableDisplay
                      storedParameters={state.storedParameters}
                      onClearParameter={(key) => {
                        setStoredParameters(prev => {
                          const newParams = { ...prev };
                          delete newParams[key];
                          return newParams;
                        });
                        toast({
                          title: "参数已清除",
                          description: `已清除参数: ${key}`,
                        });
                      }}
                      onClearAll={() => {
                        setStoredParameters({});
                        toast({
                          title: "全部参数已清除",
                          description: "所有解析的参数已被清空",
                        });
                      }}
                    />
                  )}
                   
                  {/* 统一层级树 */}
                  <div className="border border-border rounded-lg bg-card">
                    <div className="divide-y divide-border">
                      {visibleRootCase ? renderUnifiedTree([visibleRootCase], 0) : []}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuItem onClick={addCommandViaContextMenu} className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              新建命令
            </ContextMenuItem>
            <ContextMenuItem onClick={addUrcViaContextMenu} className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              新建URC
            </ContextMenuItem>
            <ContextMenuItem onClick={addSubCaseViaContextMenu} className="flex items-center gap-2">
              <TestTube2 className="w-4 h-4" />
              新建子用例
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                载入
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-64">
                <ContextMenuSub>
                  <ContextMenuSubTrigger>载入到当前用例</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-72 max-h-64 overflow-y-auto">
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>自当前仓库</ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                        {state.testCases.filter(tc => tc.id !== currentTestCase?.id).length > 0 ? (
                          state.testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                            <ContextMenuItem key={testCase.id} onClick={() => {
                              // Implementation would use importExportUtils
                              console.log('Load test case:', testCase.name);
                            }} className="flex items-center justify-between">
                              <span className="truncate mr-2">{testCase.name}</span>
                              <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                            </ContextMenuItem>
                          ))
                        ) : (
                          <ContextMenuItem disabled>暂无其他用例</ContextMenuItem>
                        )}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem onClick={() => {
                      // Implementation would use importExportUtils
                      console.log('Import from file: merge');
                    }}
                    >
                      自现有文件
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                
                <ContextMenuSub>
                  <ContextMenuSubTrigger>以子用例方式载入到当前用例</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-72 max-h-64 overflow-y-auto">
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>自当前仓库</ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                        {state.testCases.filter(tc => tc.id !== currentTestCase?.id).length > 0 ? (
                          state.testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                            <ContextMenuItem key={testCase.id} onClick={() => {
                              // Implementation would use importExportUtils
                              console.log('Load as subcase:', testCase.name);
                            }} className="flex items-center justify-between">
                              <span className="truncate mr-2">{testCase.name}</span>
                              <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                            </ContextMenuItem>
                          ))
                        ) : (
                          <ContextMenuItem disabled>暂无其他用例</ContextMenuItem>
                        )}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem onClick={() => {
                      // Implementation would use importExportUtils
                      console.log('Import from file: subcase');
                    }}
                    >
                      自现有文件
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </ContextMenuSubContent>
            </ContextMenuSub>
            
            <ContextMenuSeparator />
            
            <ContextMenuItem 
              onClick={toggleSelectAllViaContextMenu}
              className="flex items-center gap-2"
              disabled={!currentTestCase || currentTestCase.commands.length === 0}
            >
              <CheckSquare className="w-4 h-4" />
              全选/取消全选
            </ContextMenuItem>
            
            <ContextMenuItem 
              onClick={() => {
                const currentCase = getCurrentTestCase();
                if (currentCase) {
                  handleRunTestCase(currentCase.id);
                }
              }} 
              className="flex items-center gap-2"
              disabled={!currentTestCase || connectedPorts.length === 0}
            >
              <Play className="w-4 h-4" />
              运行
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuItem 
              onClick={deleteSelectedCommands}
              className="flex items-center gap-2 text-destructive"
              disabled={!currentTestCase}
            >
              <Trash2 className="w-4 h-4" />
              删除勾选的命令
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuItem 
              onClick={() => {
                // Implementation would use importExportUtils
                console.log('Export test case');
              }} 
              className="flex items-center gap-2"
              disabled={!currentTestCase}
            >
              <Download className="w-4 h-4" />
              导出用例到...
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {/* 4. 测试用例切换区 */}
      <TestCaseSwitcher 
        testCases={state.testCases}
        currentTestCase={currentTestCase}
        onSelectTestCase={handleSelectTestCase}
        setTestCases={setTestCases}
        onDeleteTestCase={handleDeleteTestCase}
        onSync={() => {
          toast({
            title: "同步功能",
            description: "同步功能开发中...",
          });
        }}
        onWorkspaceChange={handleWorkspaceChange}
        scripts={state.scripts}
        currentScript={state.currentScript}
        onSelectScript={handleSelectScript}
        onCreateScript={handleCreateScript}
        onDeleteScript={handleDeleteScript}
      />

      {/* 编辑测试用例对话框 */}
      <CaseEditDialogInline
        isOpen={state.isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingCase={state.editingCase}
        setEditingCase={setEditingCase}
        onSave={(caseId, updatedCase) => {
          // Implementation would use testCaseRecursiveUtils
          console.log('Save case:', caseId, updatedCase.name);
          toast({
            title: "保存成功",
            description: "测试用例已更新",
          });
        }}
      />

      {/* 编辑命令对话框 */}
      <Dialog open={state.editingCommandIndex !== null} onOpenChange={() => setEditingCommandIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {state.editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[state.editingCommandIndex].type === 'execution' && '编辑命令配置'}
              {state.editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[state.editingCommandIndex].type === 'urc' && '编辑URC配置'}
            </DialogTitle>
            <DialogDescription>
              配置详细属性，包括执行参数、验证规则、错误处理等
            </DialogDescription>
          </DialogHeader>
          
          {state.editingCommandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              {currentTestCase.commands[state.editingCommandIndex].type === 'execution' && (
                <ExecutionEditor
                  command={currentTestCase.commands[state.editingCommandIndex]}
                  onUpdate={(updates) => {
                    // Implementation would use testCaseRecursiveUtils
                    console.log('Update execution command:', updates);
                  }}
                />
              )}
              {currentTestCase.commands[state.editingCommandIndex].type === 'urc' && (
                <UrcEditor
                  command={currentTestCase.commands[state.editingCommandIndex]}
                  onUpdate={(updates) => {
                    // Implementation would use testCaseRecursiveUtils
                    console.log('Update URC command:', updates);
                  }}
                  jumpOptions={{
                    // Implementation would use testCaseNavigationUtils
                    commandOptions: []
                  }}
                />
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
                  取消
                </Button>
                <Button onClick={() => {
                  setEditingCommandIndex(null);
                  toast({
                    title: "保存成功",
                    description: "命令配置已更新",
                  });
                }}>
                  保存
                </Button>
              </div>
            </div>
          )}
          </DialogContent>
        </Dialog>

        {/* 执行结果对话框 */}
        <RunResultDialog
          isOpen={state.showRunResult}
          onClose={() => setShowRunResult(false)}
          result={state.runResult}
        />

        {/* 用户操作确认对话框 */}
        <AlertDialog open={state.userActionDialog.isOpen} onOpenChange={(open) => 
          setUserActionDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>操作前确认</AlertDialogTitle>
              <AlertDialogDescription>
                {state.userActionDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={state.userActionDialog.onCancel}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={state.userActionDialog.onConfirm}>
                开始执行
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* 失败处理提示对话框 */}
        <AlertDialog open={state.failurePromptDialog.isOpen} onOpenChange={(open) => 
          setFailurePromptDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>执行失败处理</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-wrap">
                {state.failurePromptDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={state.failurePromptDialog.onStop}>
                停止执行
              </AlertDialogCancel>
              <AlertDialogAction onClick={state.failurePromptDialog.onContinue}>
                继续执行
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };