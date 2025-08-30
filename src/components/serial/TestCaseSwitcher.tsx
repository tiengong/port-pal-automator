import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Search, TestTube2, ChevronDown, Hash } from "lucide-react";
import { TestCase } from "./TestCaseManager";

interface TestCaseSwitcherProps {
  currentTestCase: TestCase | null;
  testCases: TestCase[];
  onSelectTestCase: (testCase: TestCase) => void;
}

export const TestCaseSwitcher: React.FC<TestCaseSwitcherProps> = ({
  currentTestCase,
  testCases,
  onSelectTestCase
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTestCases = testCases.filter(testCase =>
    testCase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    testCase.uniqueId.includes(searchQuery) ||
    testCase.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTestCase = (testCase: TestCase) => {
    onSelectTestCase(testCase);
    setIsDialogOpen(false);
    setSearchQuery('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-warning';
      case 'passed':
        return 'text-success';
      case 'failed':
        return 'text-destructive';
      case 'paused':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'passed':
        return '通过';
      case 'failed':
        return '失败';
      case 'paused':
        return '暂停';
      default:
        return '待执行';
    }
  };

  return (
    <>
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">当前测试用例:</span>
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="outline"
              size="sm"
              className="h-8 px-3 font-mono"
            >
              <Hash className="w-3 h-3 mr-2" />
              {currentTestCase?.uniqueId || '未选择'}
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="输入用例名或编号切换..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  
                  // 如果输入的是用例编号，直接切换
                  const foundCase = testCases.find(tc => 
                    tc.uniqueId === value || tc.name === value
                  );
                  if (foundCase) {
                    onSelectTestCase(foundCase);
                    setSearchQuery('');
                  }
                }}
                className="h-8 w-48 pr-8 text-xs"
              />
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            </div>
            
            <Badge variant="secondary" className="text-xs">
              {testCases.length} 个用例
            </Badge>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>选择测试用例</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="搜索测试用例..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            
            <ScrollArea className="h-96">
              <div className="space-y-2 pr-4">
                {filteredTestCases.map((testCase) => (
                  <Card 
                    key={testCase.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      currentTestCase?.id === testCase.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectTestCase(testCase)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <TestTube2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <h4 className="font-medium text-foreground truncate">
                              {testCase.name}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(testCase.status)}`}
                            >
                              {getStatusText(testCase.status)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {testCase.description || '暂无描述'}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-mono">#{testCase.uniqueId}</span>
                            <span>{testCase.commands.length} 个命令</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredTestCases.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <TestTube2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>没有找到匹配的测试用例</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};