# 右击菜单功能实现总结

## 概述
已成功完善 TestCaseManager 组件的右击菜单功能，实现了用户要求的四种交互场景。

## 实现的功能

### 场景1：空白区域右击 → 在根用例末尾添加新步骤
✅ **已实现** - 点击空白区域时，会在当前根用例的末尾添加新元素

### 场景2：任意步骤右击 → 在当前步骤后插入新步骤  
✅ **已实现** - 右击命令时，会在该命令之后插入新命令

### 场景3：子用例右击 → 在子用例内添加步骤（≤3层嵌套）
✅ **已实现** - 右击子用例时，会在该子用例内添加新元素，并检查嵌套层级限制（最大3层）

### 场景4：子用例内命令右击 → 在当前命令后插入新元素
✅ **已实现** - 右击子用例内的命令时，会在该子用例的当前命令后插入新元素

## 技术实现细节

### 1. 增强的 ContextMenuState 类型
```typescript
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string;
  targetType: 'case' | 'command';
  insertIndex?: number; // 插入位置索引
  parentCaseId?: string; // 父用例ID 
  targetPath?: string[]; // 目标路径
}
```

### 2. 核心工具函数
- `findCasePath()` - 查找用例路径
- `getCaseDepth()` - 获取用例嵌套深度
- `canAddSubCase()` - 检查是否可以添加子用例（限制3层）

### 3. 右击事件处理
`handleContextMenu()` 函数精确捕获右击上下文：
- 确定目标元素类型（命令或用例）
- 计算插入位置
- 获取父用例ID
- 构建目标路径

### 4. 插入逻辑
三个添加函数都支持精确位置插入：
- `addCommandViaContextMenu()`
- `addUrcViaContextMenu()`  
- `addSubCaseViaContextMenu()`

### 5. CommandRow 集成
CommandRow 组件已添加 `onContextMenu` 支持，能够正确传递右击事件。

## 代码变更文件

1. **src/components/serial/types.ts** - 增强 ContextMenuState 类型
2. **src/components/serial/utils/testCaseHelpers.ts** - 添加嵌套层级工具函数
3. **src/components/serial/TestCaseManager.tsx** - 实现核心右击逻辑
4. **src/components/serial/CommandRow.tsx** - 添加右击事件支持

## 测试验证

✅ TypeScript 编译无错误
✅ 开发构建成功
✅ 所有四种场景逻辑完整实现

## 使用说明

用户现在可以：
1. 在空白区域右击，在根用例末尾添加新命令/URC/子用例
2. 在任意命令上右击，在该命令后插入新元素
3. 在子用例上右击，在子用例内添加新元素（自动检查层级限制）
4. 在子用例内的命令上右击，在该命令后插入新元素

所有操作都会自动保存，并显示相应的成功提示。