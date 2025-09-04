import { TestCase, TestCommand } from './types';

/**
 * OneNet LwM2M 温度传感器测试用例生成器
 * 基于中移物联网平台的标准LwM2M温度传感器接入流程
 * 
 * 测试流程包括：
 * 1. 基础AT测试
 * 2. MIPL实例创建与配置
 * 3. 建立MIPL连接
 * 4. 处理服务器观察请求
 * 5. 响应观察请求
 * 6. 处理服务器发现请求
 * 7. 处理服务器写请求
 * 8. 处理服务器读请求
 * 9. 数据上报测试
 */

export const createOneNetTestCase = (uniqueId: string): TestCase => {
  const caseId = `onenet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // OneNet LwM2M温度传感器完整测试流程
  const commands: TestCommand[] = [
    // 1. 基础AT测试
    {
      id: `${caseId}_cmd_1`,
      type: 'execution',
      command: 'ATI',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
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
      maxAttempts: 3,
      failureSeverity: 'warning',
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
      maxAttempts: 3,
      failureSeverity: 'error',
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
      maxAttempts: 3,
      failureSeverity: 'error',
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
      maxAttempts: 3,
      failureSeverity: 'error',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // URC监听：连接事件
    {
      id: `${caseId}_urc_1`,
      type: 'urc',
      command: 'MIPL引导完成',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLEVENT:0,1',
      urcMatchMode: 'contains',
      urcListenMode: 'once',
      urcListenTimeout: 10000,
      maxAttempts: 3,
      failureSeverity: 'warning'
    },
    {
      id: `${caseId}_urc_2`,
      type: 'urc',
      command: 'MIPL连接建立',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLEVENT:0,4',
      urcMatchMode: 'contains',
      urcListenMode: 'once',
      urcListenTimeout: 30000,
      maxAttempts: 3,
      failureSeverity: 'error'
    },
    {
      id: `${caseId}_urc_3`,
      type: 'urc',
      command: 'MIPL注册完成',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLEVENT:0,6',
      urcMatchMode: 'contains',
      urcListenMode: 'once',
      urcListenTimeout: 30000,
      maxAttempts: 3,
      failureSeverity: 'error'
    },

    // 4. 处理服务器观察请求
    {
      id: `${caseId}_urc_4`,
      type: 'urc',
      command: '观察请求监听',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLOBSERVE:0,',
      urcMatchMode: 'startsWith',
      urcListenMode: 'permanent',
      maxAttempts: 3,
      failureSeverity: 'warning',
      dataParseConfig: {
        enabled: true,
        parseType: 'regex',
        parsePattern: '\\+MIPLOBSERVE:0,(\\d+),1,3303,\\d+,-1',
        parameterMap: { '1': 'msgid' }
      },
      jumpConfig: {
        onReceived: 'jump',
        jumpTarget: {
          type: 'command',
          targetId: `${caseId}_cmd_6`
        }
      }
    },

    // 5. 响应观察请求
    {
      id: `${caseId}_cmd_6`,
      type: 'execution',
      command: 'AT+MIPLOBSERVERSP=0,{msgid},1',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // 6. 处理服务器发现请求
    {
      id: `${caseId}_urc_5`,
      type: 'urc',
      command: '发现请求监听',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLDISCOVER:0,',
      urcMatchMode: 'startsWith',
      urcListenMode: 'permanent',
      maxAttempts: 3,
      failureSeverity: 'warning',
      dataParseConfig: {
        enabled: true,
        parseType: 'regex',
        parsePattern: '\\+MIPLDISCOVER:0,(\\d+),3303',
        parameterMap: { '1': 'discoverId' }
      }
    },

    // 响应发现请求
    {
      id: `${caseId}_cmd_7`,
      type: 'execution',
      command: 'AT+MIPLDISCOVERRSP=0,{discoverId},1,3303,"5700;5701;5602;5605;5603;5604"',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },
    {
      id: `${caseId}_cmd_8`,
      type: 'execution',
      command: 'AT+MIPLNOTIFY=0,{msgid},3303,0,5700,4,4,"25.6",0,0',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // 等待观察响应
    {
      id: `${caseId}_urc_6`,
      type: 'urc',
      command: '观察响应确认',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLEVENT:0,22',
      urcMatchMode: 'contains',
      urcListenMode: 'once',
      urcListenTimeout: 10000,
      maxAttempts: 3,
      failureSeverity: 'warning'
    },

    // 7. 处理服务器写请求
    {
      id: `${caseId}_urc_7`,
      type: 'urc',
      command: '写请求监听',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLWRITE:0,',
      urcMatchMode: 'startsWith',
      urcListenMode: 'permanent',
      maxAttempts: 3,
      failureSeverity: 'warning',
      dataParseConfig: {
        enabled: true,
        parseType: 'regex',
        parsePattern: '\\+MIPLWRITE:0,(\\d+),3303,2,5602,1,"([^"]+)"',
        parameterMap: { '1': 'writeId', '2': 'value' }
      }
    },

    // 响应写请求
    {
      id: `${caseId}_cmd_9`,
      type: 'execution',
      command: 'AT+MIPLWRITERSP=0,{writeId},1',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
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
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLREAD:0,',
      urcMatchMode: 'startsWith',
      urcListenMode: 'permanent',
      maxAttempts: 3,
      failureSeverity: 'warning',
      dataParseConfig: {
        enabled: true,
        parseType: 'regex',
        parsePattern: '\\+MIPLREAD:0,(\\d+),3303,2,5605',
        parameterMap: { '1': 'readId' }
      }
    },

    // 响应读请求
    {
      id: `${caseId}_cmd_10`,
      type: 'execution',
      command: 'AT+MIPLREADRSP=0,{readId},1,3303,2,5605,4,4,"On",0,0',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // 9. 数据上报测试 - 定期发送数据
    {
      id: `${caseId}_cmd_11`,
      type: 'execution',
      command: 'AT+MIPLNOTIFY=0,{msgid},3303,0,5700,4,4,"26.5",0,0',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // 等待断开事件
    {
      id: `${caseId}_urc_9`,
      type: 'urc',
      command: '等待断开事件',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLEVENT:0,8',
      urcMatchMode: 'contains',
      urcListenMode: 'once',
      urcListenTimeout: 10000,
      maxAttempts: 3,
      failureSeverity: 'warning'
    }
  ];

  return {
    id: caseId,
    uniqueId: uniqueId,
    name: 'OneNet LwM2M温度传感器测试',
    description: '基于中移物联网平台的LwM2M温度传感器完整接入测试流程，包括设备引导、注册、观察、读写操作等',
    commands: commands,
    subCases: [],
    isExpanded: false,
    isRunning: false,
    currentCommand: -1,
    selected: false,
    status: 'pending',
    failureHandling: 'stop',
    validationLevel: 'error',
    runMode: 'auto',
    runCount: 1,
    isPreset: true
  };
};

/**
 * 获取OneNet测试用例的简化版本（仅包含核心步骤）
 */
export const createOneNetTestCaseSimple = (uniqueId: string): TestCase => {
  const caseId = `onenet_simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const commands: TestCommand[] = [
    // 基础AT测试
    {
      id: `${caseId}_cmd_1`,
      type: 'execution',
      command: 'ATI',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'warning',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // MIPL实例创建
    {
      id: `${caseId}_cmd_2`,
      type: 'execution',
      command: 'AT+MIPLCREATE',
      expectedResponse: '+MIPLCREATE:0',
      validationMethod: 'contains',
      waitTime: 2000,
      maxAttempts: 3,
      failureSeverity: 'error',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // 建立连接
    {
      id: `${caseId}_cmd_3`,
      type: 'execution',
      command: 'AT+MIPLOPEN=0,3600',
      expectedResponse: 'OK',
      validationMethod: 'contains',
      waitTime: 1000,
      maxAttempts: 3,
      failureSeverity: 'error',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    },

    // 监听连接事件
    {
      id: `${caseId}_urc_1`,
      type: 'urc',
      command: 'MIPL连接建立',
      validationMethod: 'none',
      waitTime: 0,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+MIPLEVENT:0,4',
      urcMatchMode: 'contains',
      urcListenMode: 'once',
      urcListenTimeout: 30000,
      maxAttempts: 3,
      failureSeverity: 'error'
    }
  ];

  return {
    id: caseId,
    uniqueId: uniqueId,
    name: 'OneNet LwM2M简化测试',
    description: 'OneNet LwM2M核心连接测试流程',
    commands: commands,
    subCases: [],
    isExpanded: false,
    isRunning: false,
    currentCommand: -1,
    selected: false,
    status: 'pending',
    failureHandling: 'stop',
    validationLevel: 'error',
    runMode: 'auto',
    runCount: 1,
    isPreset: true
  };
};