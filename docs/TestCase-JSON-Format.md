# 测试用例 JSON 文件格式说明 / Test Case JSON Format Manual

## 概述 / Overview

**中文**: 本手册详细说明了测试用例导入功能所支持的 JSON 文件格式。用户可以根据此说明编写符合规范的 JSON 文件，然后通过工具的导入功能加载测试用例。

**English**: This manual provides detailed specifications for the JSON file format supported by the test case import functionality. Users can write compliant JSON files according to this specification and load test cases through the tool's import feature.

## 文件要求 / File Requirements

**中文**:
- 文件编码：UTF-8
- 文件扩展名：`.json`
- 文件大小：建议不超过 10MB
- JSON 格式：标准 JSON，不支持注释

**English**:
- File encoding: UTF-8
- File extension: `.json`
- File size: Recommended under 10MB
- JSON format: Standard JSON, comments not supported

## 顶层结构 / Top-level Structure

**中文**: JSON 文件的根元素必须是一个数组，包含一个或多个测试用例对象。

**English**: The root element of the JSON file must be an array containing one or more test case objects.

```json
[
  {
    // 测试用例对象 / Test case object
  },
  {
    // 更多测试用例... / More test cases...
  }
]
```

## 测试用例对象结构 / TestCase Object Structure

### 必需字段 / Required Fields

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---------------|-------------|-------------------|
| `id` | string | 测试用例内部 ID / Internal test case ID |
| `uniqueId` | string | 全局唯一 ID，不可修改 / Global unique ID, immutable |
| `name` | string | 测试用例名称 / Test case name |
| `description` | string | 测试用例描述 / Test case description |
| `commands` | TestCommand[] | 命令列表 / Command list |
| `subCases` | TestCase[] | 子用例列表 / Sub-case list |

### 可选字段 / Optional Fields

| 字段名 / Field | 类型 / Type | 默认值 / Default | 说明 / Description |
|---------------|-------------|-----------------|-------------------|
| `isExpanded` | boolean | `false` | 是否展开 / Whether expanded |
| `isRunning` | boolean | `false` | 是否正在运行 / Whether running |
| `currentCommand` | number | `0` | 当前执行命令索引 / Current command index |
| `selected` | boolean | `true` | 是否选中 / Whether selected |
| `status` | string | `"pending"` | 运行状态 / Run status |
| `failureHandling` | string | `"stop"` | 失败处理方式 / Failure handling |
| `runCount` | number | `1` | 运行次数 / Run count |
| `isPreset` | boolean | `false` | 是否为预设用例 / Whether preset case |

### 状态枚举值 / Status Enum Values

**中文**: `status` 字段可选值：
- `"pending"`: 等待执行
- `"running"`: 正在执行
- `"success"`: 执行成功
- `"failed"`: 执行失败
- `"partial"`: 部分成功

**English**: `status` field options:
- `"pending"`: Waiting for execution
- `"running"`: Currently executing
- `"success"`: Execution successful
- `"failed"`: Execution failed
- `"partial"`: Partially successful

### 失败处理枚举值 / Failure Handling Enum Values

**中文**: `failureHandling` 字段可选值：
- `"stop"`: 停止执行
- `"continue"`: 继续执行
- `"prompt"`: 提示用户

**English**: `failureHandling` field options:
- `"stop"`: Stop execution
- `"continue"`: Continue execution
- `"prompt"`: Prompt user

## 测试命令对象结构 / TestCommand Object Structure

### 基础必需字段 / Basic Required Fields

| 字段名 / Field | 类型 / Type | 说明 / Description |
|---------------|-------------|-------------------|
| `id` | string | 命令 ID / Command ID |
| `type` | string | 命令类型：`"execution"` 或 `"urc"` / Command type |
| `command` | string | 执行的命令内容 / Command content |
| `validationMethod` | string | 验证方法 / Validation method |
| `waitTime` | number | 等待时间（毫秒）/ Wait time (ms) |
| `stopOnFailure` | boolean | 失败时是否停止 / Stop on failure |
| `lineEnding` | string | 行结束符 / Line ending |
| `selected` | boolean | 是否选中 / Whether selected |
| `status` | string | 执行状态 / Execution status |

### 命令类型枚举 / Command Type Enum

**中文**:
- `"execution"`: 执行命令
- `"urc"`: URC 监听命令

**English**:
- `"execution"`: Execution command
- `"urc"`: URC listening command

### 验证方法枚举 / Validation Method Enum

**中文**:
- `"none"`: 无验证
- `"contains"`: 包含检查
- `"equals"`: 相等检查
- `"regex"`: 正则表达式检查

**English**:
- `"none"`: No validation
- `"contains"`: Contains check
- `"equals"`: Equals check
- `"regex"`: Regex check

### 行结束符枚举 / Line Ending Enum

**中文**:
- `"none"`: 无行结束符
- `"lf"`: LF (\n)
- `"cr"`: CR (\r)
- `"crlf"`: CRLF (\r\n)

**English**:
- `"none"`: No line ending
- `"lf"`: LF (\n)
- `"cr"`: CR (\r)
- `"crlf"`: CRLF (\r\n)

### 执行命令可选字段 / Execution Command Optional Fields

| 字段名 / Field | 类型 / Type | 默认值 / Default | 说明 / Description |
|---------------|-------------|-----------------|-------------------|
| `expectedResponse` | string | - | 期望响应 / Expected response |
| `validationPattern` | string | - | 验证模式 / Validation pattern |
| `requiresUserAction` | boolean | `false` | 需要用户操作 / Requires user action |
| `userPrompt` | string | - | 用户提示 / User prompt |
| `dataFormat` | string | `"string"` | 数据格式 / Data format |
| `timeout` | number | `5000` | 超时时间（毫秒）/ Timeout (ms) |
| `failureHandling` | string | `"stop"` | 失败处理 / Failure handling |
| `failureSeverity` | string | `"error"` | 失败严重性 / Failure severity |
| `userActionDialog` | boolean | `false` | 用户操作对话框 / User action dialog |
| `dialogContent` | string | - | 对话框内容 / Dialog content |

### URC 命令特有字段 / URC Command Specific Fields

| 字段名 / Field | 类型 / Type | 默认值 / Default | 说明 / Description |
|---------------|-------------|-----------------|-------------------|
| `urcPattern` | string | - | URC 匹配模式 / URC match pattern |
| `urcMatchMode` | string | `"contains"` | URC 匹配方式 / URC match mode |
| `urcListenMode` | string | `"once"` | 监听模式 / Listen mode |
| `urcListenTimeout` | number | `10000` | 监听超时（毫秒）/ Listen timeout (ms) |
| `urcFailureHandling` | string | `"stop"` | URC 失败处理 / URC failure handling |
| `urcDialogContent` | string | - | URC 对话框内容 / URC dialog content |

### URC 匹配方式枚举 / URC Match Mode Enum

**中文**:
- `"contains"`: 包含
- `"exact"`: 精确匹配
- `"regex"`: 正则表达式
- `"startsWith"`: 以...开始
- `"endsWith"`: 以...结束

**English**:
- `"contains"`: Contains
- `"exact"`: Exact match
- `"regex"`: Regular expression
- `"startsWith"`: Starts with
- `"endsWith"`: Ends with

### URC 监听模式枚举 / URC Listen Mode Enum

**中文**:
- `"permanent"`: 永久监听
- `"once"`: 监听一次

**English**:
- `"permanent"`: Permanent listening
- `"once"`: Listen once

### 数据解析配置 / Data Parse Configuration

```json
{
  "dataParseConfig": {
    "enabled": true,
    "parseType": "regex",
    "parsePattern": "Temperature: (\\d+\\.\\d+)C, Humidity: (\\d+\\.\\d+)%",
    "parameterMap": {
      "group1": "temperature",
      "group2": "humidity"
    }
  }
}
```

### 跳转配置 / Jump Configuration

```json
{
  "jumpConfig": {
    "onReceived": "jump",
    "jumpTarget": {
      "type": "command",
      "targetId": "cmd_001",
      "targetIndex": 5
    }
  }
}
```

## 完整示例 / Complete Examples

### 最小示例 / Minimal Example

```json
[
  {
    "id": "case_001",
    "uniqueId": "CASE_20241201_001",
    "name": "基础串口测试",
    "description": "测试串口基本通信功能",
    "commands": [
      {
        "id": "cmd_001",
        "type": "execution",
        "command": "AT",
        "validationMethod": "contains",
        "validationPattern": "OK",
        "waitTime": 1000,
        "stopOnFailure": true,
        "lineEnding": "crlf",
        "selected": true,
        "status": "pending"
      }
    ],
    "subCases": [],
    "isExpanded": false,
    "isRunning": false,
    "currentCommand": 0,
    "selected": true,
    "status": "pending"
  }
]
```

### 高级示例 / Advanced Example

```json
[
  {
    "id": "case_advanced",
    "uniqueId": "CASE_20241201_002",
    "name": "高级功能测试",
    "description": "包含数据解析和跳转的复杂测试用例",
    "commands": [
      {
        "id": "cmd_init",
        "type": "execution",
        "command": "AT+INIT",
        "validationMethod": "regex",
        "validationPattern": "INIT\\s+OK",
        "waitTime": 2000,
        "stopOnFailure": true,
        "lineEnding": "crlf",
        "selected": true,
        "status": "pending",
        "dataFormat": "string",
        "timeout": 5000,
        "failureHandling": "stop"
      },
      {
        "id": "cmd_sensor",
        "type": "urc",
        "command": "",
        "validationMethod": "none",
        "waitTime": 0,
        "stopOnFailure": false,
        "lineEnding": "none",
        "selected": true,
        "status": "pending",
        "urcPattern": "SENSOR:",
        "urcMatchMode": "startsWith",
        "urcListenMode": "once",
        "urcListenTimeout": 10000,
        "dataParseConfig": {
          "enabled": true,
          "parseType": "regex",
          "parsePattern": "SENSOR: T=(\\d+\\.\\d+), H=(\\d+\\.\\d+)",
          "parameterMap": {
            "group1": "temperature",
            "group2": "humidity"
          }
        },
        "jumpConfig": {
          "onReceived": "continue"
        }
      }
    ],
    "subCases": [
      {
        "id": "subcase_001",
        "uniqueId": "SUBCASE_20241201_001",
        "name": "子测试用例",
        "description": "嵌套的子测试用例",
        "commands": [
          {
            "id": "subcmd_001",
            "type": "execution",
            "command": "AT+STATUS",
            "validationMethod": "contains",
            "validationPattern": "READY",
            "waitTime": 1000,
            "stopOnFailure": true,
            "lineEnding": "crlf",
            "selected": true,
            "status": "pending"
          }
        ],
        "subCases": [],
        "isExpanded": false,
        "isRunning": false,
        "currentCommand": 0,
        "selected": true,
        "status": "pending"
      }
    ],
    "isExpanded": true,
    "isRunning": false,
    "currentCommand": 0,
    "selected": true,
    "status": "pending",
    "failureHandling": "prompt",
    "runCount": 3
  }
]
```

## 常见问题 / Common Issues

### 1. JSON 格式错误 / JSON Format Errors

**中文**: 
- 确保所有字符串使用双引号
- 检查括号和大括号是否匹配
- 最后一个元素后不要有逗号
- 使用在线 JSON 验证器检查格式

**English**:
- Ensure all strings use double quotes
- Check that brackets and braces match
- No comma after the last element
- Use online JSON validators to check format

### 2. 必需字段缺失 / Missing Required Fields

**中文**: 确保每个测试用例和命令都包含所有必需字段。导入时缺失字段会导致错误。

**English**: Ensure each test case and command contains all required fields. Missing fields will cause import errors.

### 3. 枚举值错误 / Invalid Enum Values

**中文**: 检查所有枚举字段（如 `type`、`status`、`validationMethod` 等）使用的是文档中列出的有效值。

**English**: Check that all enum fields (like `type`, `status`, `validationMethod`, etc.) use valid values listed in this documentation.

### 4. ID 重复 / Duplicate IDs

**中文**: 确保所有 `id` 和 `uniqueId` 在文件中是唯一的，重复的 ID 可能导致导入失败或运行时错误。

**English**: Ensure all `id` and `uniqueId` values are unique within the file. Duplicate IDs may cause import failures or runtime errors.

### 5. 数据类型错误 / Data Type Errors

**中文**: 确保数值字段使用数字类型，布尔字段使用 `true`/`false`，字符串字段使用引号。

**English**: Ensure numeric fields use number types, boolean fields use `true`/`false`, and string fields use quotes.

## 导入提示 / Import Tips

**中文**:
1. 建议先用小的测试文件验证格式
2. 可以从工具导出现有用例作为参考模板
3. 使用代码编辑器的 JSON 语法高亮功能
4. 大文件导入前建议备份现有数据

**English**:
1. Test with small files first to validate format
2. Export existing cases as reference templates
3. Use code editors with JSON syntax highlighting
4. Backup existing data before importing large files

---

**版本信息 / Version Info**: 此文档适用于串口调试工具 v1.0+ / This document applies to Serial Debug Tool v1.0+