// Sample test cases data
import { TestCase } from './types';

export const sampleTestCases: TestCase[] = [
  {
    id: 'case1',
    uniqueId: '1001',  
    name: 'AT指令基础测试',
    description: '测试基础AT指令功能',
    commands: [
      {
        id: 'cmd1',
        type: 'execution',
        command: 'AT',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 1000,
        stopOnFailure: false,
        lineEnding: 'crlf',
        selected: true,
        status: 'pending'
      },
      {
        id: 'cmd2',
        type: 'execution',
        command: 'AT+CGMR',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 1000,
        stopOnFailure: false,
        lineEnding: 'crlf',
        selected: true,
        status: 'pending'
      }
    ],
    subCases: [],
    isExpanded: true,
    isRunning: false,
    currentCommand: 0,
    selected: false,
    status: 'pending',
    failureStrategy: 'stop',
    validationLevel: 'error',
    runCount: 1,
    isPreset: true
  },
  {
    id: 'case2',
    uniqueId: '1002',
    name: 'URC监听测试',
    description: '测试URC接收和参数解析',
    commands: [
      {
        id: 'urc1',
        type: 'urc',
        command: 'URC监听',
        validationMethod: 'none',
        waitTime: 0,
        stopOnFailure: false,
        lineEnding: 'none',
        selected: true,
        status: 'pending',
        urcPattern: '+CREG:',
        urcMatchMode: 'startsWith',
        urcListenMode: 'permanent',
        dataParseConfig: {
          enabled: true,
          parseType: 'regex',
          parsePattern: '\\+CREG:\\s*(\\d+),(\\d+)',
          parameterMap: {
            'group1': 'n',
            'group2': 'stat'
          }
        }
      }
    ],
    subCases: [],
    isExpanded: true,
    isRunning: false,
    currentCommand: 0,
    selected: false,
    status: 'pending',
    failureStrategy: 'continue',
    validationLevel: 'warning',
    runCount: 1,
    isPreset: true
  },
  {
    id: 'case3',
    uniqueId: '1003',
    name: '网络连接测试',
    description: '测试网络连接和信号强度',
    commands: [
      {
        id: 'cmd3',
        type: 'execution',
        command: 'AT+COPS?',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 2000,
        stopOnFailure: false,
        lineEnding: 'crlf',
        selected: true,
        status: 'pending'
      },
      {
        id: 'cmd4',
        type: 'execution',
        command: 'AT+CSQ',
        expectedResponse: 'OK',
        validationMethod: 'contains',
        waitTime: 1000,
        stopOnFailure: false,
        lineEnding: 'crlf',
        selected: true,
        status: 'pending'
      }
    ],
    subCases: [],
    isExpanded: true,
    isRunning: false,
    currentCommand: 0,
    selected: false,
    status: 'pending',
    failureStrategy: 'prompt',
    validationLevel: 'error',
    runCount: 1,
    isPreset: true
  }
];