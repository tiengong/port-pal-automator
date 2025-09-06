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
        stopOnFailure: false,
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
        stopOnFailure: false,
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      },

      // 2. MIPL实例创建与配置
      {
        id: `${caseId}_cmd_3`,
        type: 'execution',
        command: 'AT+MIPLCREATE',
        expectedResponse: '+MIPLCREATE:0',
        validationMethod: 'contains',
        waitTime: 2000,
        stopOnFailure: true,
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      },
      {
        id: `${caseId}_cmd_4`,
        type: 'execution',
        command: 'AT+MIPLADDOBJ=0,3303,2,"11",6,1',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 1000,
        stopOnFailure: true,
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      },

      // 3. 建立MIPL连接
      {
        id: `${caseId}_cmd_5`,
        type: 'execution',
        command: 'AT+MIPLOPEN=0,3600',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 1000,
        stopOnFailure: true,
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      },

      // URC监听：连接事件
      {
        id: `${caseId}_urc_1`,
        type: 'urc',
        command: 'MIPL连接开始',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLEVENT:0,1',
        urcMatchMode: 'contains',
        urcListenMode: 'once',
        urcListenTimeout: 10000,
        urcFailureHandling: 'continue'
      },
      {
        id: `${caseId}_urc_2`,
        type: 'urc',
        command: 'MIPL连接建立',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLEVENT:0,4',
        urcMatchMode: 'contains',
        urcListenMode: 'once',
        urcListenTimeout: 30000,
        urcFailureHandling: 'stop'
      },
      {
        id: `${caseId}_urc_3`,
        type: 'urc',
        command: 'MIPL注册完成',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLEVENT:0,6',
        urcMatchMode: 'contains',
        urcListenMode: 'once',
        urcListenTimeout: 30000,
        urcFailureHandling: 'stop'
      },

      // 4. 处理服务器观察请求
      {
        id: `${caseId}_urc_4`,
        type: 'urc',
        command: '观察请求监听',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLOBSERVE:0,',
        urcMatchMode: 'startsWith',
        urcListenMode: 'permanent',
        urcFailureHandling: 'continue',
        dataParseConfig: {
          enabled: true,
          parseType: 'regex',
          parsePattern: '\\+MIPLOBSERVE:0,(\\d+),1,3303,\\d+,-1',
          parameterMap: { '1': 'msgid' }
        },
        jumpConfig: {
          onReceived: 'continue'
        }
      },

        // 观察响应命令（使用msgid）
        {
          id: `${caseId}_cmd_6`,
          type: 'execution',
          command: 'AT+MIPLOBSERVERSP=0,{msgid},1',
          expectedResponse: 'OK',
          validationMethod: 'contains',
          waitTime: 1000,
          stopOnFailure: false,
          lineEnding: 'crlf',
          selected: false,
          status: 'pending'
        },

      // 5. 处理服务器发现请求
      {
        id: `${caseId}_urc_5`,
        type: 'urc',
        command: '发现请求监听',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLDISCOVER:0,',
        urcMatchMode: 'startsWith',
        urcListenMode: 'permanent',
        urcFailureHandling: 'continue',
        dataParseConfig: {
          enabled: true,
          parseType: 'regex',
          parsePattern: '\\+MIPLDISCOVER:0,(\\d+),3303',
          parameterMap: { '1': 'discoverId' }
        }
      },
        {
          id: `${caseId}_cmd_7`,
          type: 'execution',
          command: 'AT+MIPLDISCOVERRSP=0,{discoverId},1,34,"5700;5701;5601;5602;5603;5604;5605"',
          expectedResponse: 'OK',
          validationMethod: 'contains',
          waitTime: 1000,
          stopOnFailure: false,
          lineEnding: 'crlf',
          selected: false,
          status: 'pending'
        },

        // 6. 设备主动上报数据（使用msgid）
        {
          id: `${caseId}_cmd_8`,
          type: 'execution',
          command: 'AT+MIPLNOTIFY={msgid},3303,2,5700,1,"25.6"',
          expectedResponse: 'OK',
          validationMethod: 'contains',
          waitTime: 1000,
          stopOnFailure: false,
          lineEnding: 'crlf',
          selected: false,
          status: 'pending'
        },
      {
        id: `${caseId}_urc_6`,
        type: 'urc',
        command: '上报成功确认',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLEVENT:0,22',
        urcMatchMode: 'contains',
        urcListenMode: 'once',
        urcListenTimeout: 10000,
        urcFailureHandling: 'continue'
      },

      // 7. 处理服务器写请求
      {
        id: `${caseId}_urc_7`,
        type: 'urc',
        command: '写请求监听',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLWRITE:0,',
        urcMatchMode: 'startsWith',
        urcListenMode: 'permanent',
        urcFailureHandling: 'continue',
        dataParseConfig: {
          enabled: true,
          parseType: 'regex',
          parsePattern: '\\+MIPLWRITE:0,(\\d+),3303,2,5602,1,"([^"]+)"',
          parameterMap: { '1': 'writeId', '2': 'value' }
        }
      },
        {
          id: `${caseId}_cmd_9`,
          type: 'execution',
          command: 'AT+MIPLWRITERSP=0,{writeId},1',
          expectedResponse: 'OK',
          validationMethod: 'contains',
          waitTime: 1000,
          stopOnFailure: false,
          lineEnding: 'crlf',
          selected: false,
          status: 'pending'
        },

      // 8. 处理服务器读请求
      {
        id: `${caseId}_urc_8`,
        type: 'urc',
        command: '读请求监听',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLREAD:0,',
        urcMatchMode: 'startsWith',
        urcListenMode: 'permanent',
        urcFailureHandling: 'continue',
        dataParseConfig: {
          enabled: true,
          parseType: 'regex',
          parsePattern: '\\+MIPLREAD:0,(\\d+),3303,2,5605',
          parameterMap: { '1': 'readId' }
        }
      },
        {
          id: `${caseId}_cmd_10`,
          type: 'execution',
          command: 'AT+MIPLREADRSP=0,{readId},1,20,"24.5;25.1;24.8"',
          expectedResponse: 'OK',
          validationMethod: 'contains',
          waitTime: 1000,
          stopOnFailure: false,
          lineEnding: 'crlf',
          selected: false,
          status: 'pending'
        },

      // 9. 主动关闭MIPL连接
      {
        id: `${caseId}_cmd_11`,
        type: 'execution',
        command: 'AT+MIPLCLOSE=0',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 1000,
        stopOnFailure: false,
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      },
      {
        id: `${caseId}_urc_9`,
        type: 'urc',
        command: '连接关闭确认',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+MIPLEVENT:0,8',
        urcMatchMode: 'contains',
        urcListenMode: 'once',
        urcListenTimeout: 10000,
        urcFailureHandling: 'continue'
      }
    ];

    return {
      id: caseId,
      uniqueId: uniqueId,
      name: 'OneNet LwM2M温度传感器测试',
      description: 'OneNet LwM2M协议测试用例，包含初始化、连接、数据交互和关闭的完整流程。测试温度传感器对象(3303)的注册、观察、发现、读写和上报功能。',
      commands: commands,
      subCases: [],
      isExpanded: false,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending',
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
          添加完整的OneNet LwM2M协议测试用例，包含温度传感器对象的全流程测试
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">测试流程包含：</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• 初始通信与版本查询 (ATI, AT+CGMR)</li>
            <li>• MIPL实例创建与对象添加 (AT+MIPLCREATE, AT+MIPLADDOBJ)</li>
            <li>• 建立MIPL连接与事件监听 (AT+MIPLOPEN + URC监听)</li>
            <li>• 服务器观察请求处理 (观察URC + 响应命令)</li>
            <li>• 服务器发现请求处理 (发现URC + 响应命令)</li>
            <li>• 设备主动数据上报 (AT+MIPLNOTIFY)</li>
            <li>• 服务器写请求处理 (写URC + 响应命令)</li>
            <li>• 服务器读请求处理 (读URC + 响应命令)</li>
            <li>• 主动关闭连接 (AT+MIPLCLOSE + 关闭确认)</li>
          </ul>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h5 className="font-medium text-sm text-amber-800 mb-1">注意事项：</h5>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• 部分命令包含动态参数(如请求ID)，需要根据实际URC内容手动调整</li>
            <li>• URC监听会自动提取参数，但响应命令可能需要手动触发</li>
            <li>• 建议在有OneNet服务器环境下进行完整测试</li>
          </ul>
        </div>

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