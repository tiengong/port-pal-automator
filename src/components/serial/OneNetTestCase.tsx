import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestCase, TestCommand } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

interface OneNetTestCaseProps {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  onClose: () => void;
}

export const OneNetTestCase: React.FC<OneNetTestCaseProps> = ({
  testCases,
  setTestCases,
  onClose
}) => {
  const { toast } = useToast();

  const createOneNetTestCase = (): TestCase => {
    const caseId = `onenet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uniqueId = (Math.max(...testCases.map(tc => parseInt(tc.uniqueId) || 1000), 1000) + 1).toString();

    const commands: TestCommand[] = [
      // 1. 初始通信与版本查询
      {
        id: `${caseId}_cmd_1`,
        type: 'execution',
        command: 'ATI',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 1000,
        maxAttempts: 1,
        failureSeverity: 'error',
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      },
      {
        id: `${caseId}_cmd_2`,
        type: 'execution',
        command: 'AT+CGMR',
        expectedResponse: 'VER:001',
        validationMethod: 'contains',
        waitTime: 1000,
        maxAttempts: 1,
        failureSeverity: 'error',
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      }
    ];

    return {
      id: caseId,
      uniqueId: uniqueId,
      name: 'OneNet LwM2M温度传感器测试',
      description: 'OneNet LwM2M协议测试用例',
      commands: commands,
      subCases: [],
      isExpanded: false,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending',
      failureHandling: 'stop',
      isPreset: true
    };
  };

  const handleAddTestCase = () => {
    const newTestCase = createOneNetTestCase();
    setTestCases([...testCases, newTestCase]);
    
    toast({
      title: "导入成功",
      description: `已添加OneNet LwM2M测试用例: ${newTestCase.name}`,
    });
    
    onClose();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          OneNet LwM2M 预设测试用例
        </CardTitle>
        <CardDescription>
          添加完整的OneNet LwM2M协议测试用例
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleAddTestCase}>
            添加测试用例
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};