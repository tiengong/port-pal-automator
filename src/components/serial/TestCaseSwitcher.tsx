import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TestTube2 } from "lucide-react";
import { TestCase } from "./types";

interface TestCaseSwitcherProps {
  testCases: TestCase[];
  currentTestCase: TestCase | null;
  onSelectTestCase: (caseId: string) => void;
}

export const TestCaseSwitcher: React.FC<TestCaseSwitcherProps> = ({
  testCases,
  currentTestCase,
  onSelectTestCase
}) => {
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTestCases = testCases.filter(tc =>
    tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.uniqueId.includes(searchQuery) ||
    tc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* 测试用例切换按钮 */}
      <div className="flex items-center justify-center p-3 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCaseSelector(true)}
          className="flex items-center gap-2 min-w-[120px] h-8"
        >
          <TestTube2 className="w-3 h-3" />
          <span className="text-xs">
            {currentTestCase ? `#${currentTestCase.uniqueId}` : '选择测试用例'}
          </span>
        </Button>
      </div>

      {/* 测试用例选择窗口 */}
      <Dialog open={showCaseSelector} onOpenChange={setShowCaseSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择测试用例</DialogTitle>
          </DialogHeader>
          
          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索测试用例名称、编号或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* 测试用例列表 */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
            {filteredTestCases.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery ? '未找到匹配的测试用例' : '暂无测试用例'}
              </div>
            ) : (
              filteredTestCases.map((testCase) => (
                <Card 
                  key={testCase.id} 
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    currentTestCase?.id === testCase.id ? 'ring-2 ring-primary bg-accent/30' : ''
                  }`}
                  onClick={() => {
                    onSelectTestCase(testCase.id);
                    setShowCaseSelector(false);
                    setSearchQuery('');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            #{testCase.uniqueId}
                          </Badge>
                          <span className="font-medium truncate">{testCase.name}</span>
                        </div>
                        
                        {testCase.description && (
                          <p className="text-sm text-muted-foreground truncate mb-2">
                            {testCase.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{testCase.commands.length} 个步骤</span>
                          <Badge 
                            variant={
                              testCase.status === 'success' ? 'default' :
                              testCase.status === 'failed' ? 'destructive' :
                              testCase.status === 'running' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {testCase.status === 'pending' ? '待执行' :
                             testCase.status === 'running' ? '执行中' :
                             testCase.status === 'success' ? '成功' :
                             testCase.status === 'failed' ? '失败' : '部分成功'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};