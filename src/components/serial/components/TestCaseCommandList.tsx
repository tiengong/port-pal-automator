import React from 'react';
import { TestCase, TestCommand } from '@/components/serial/types';
import { CommandRow } from '@/components/serial/CommandRow';
import { SubCaseRow } from '@/components/serial/SubCaseRow';
import { getSortedChildren } from '@/components/serial/testCaseUtils';

export interface TestCaseCommandListProps {
  testCase: TestCase;
  level?: number;
  parentCaseId?: string;
  isExecuting?: boolean;
  dragInfo: {
    isDragging: boolean;
    dragType: 'case' | 'command' | 'subcase' | null;
    dragItemId: string;
    dragSourceCaseId: string;
    dropTarget?: {
      caseId: string;
      itemId: string;
      itemType: 'command' | 'subcase';
      position: 'above' | 'below';
    };
  };
  inlineEdit: {
    commandId: string | null;
    value: string;
  };
  onSelectCase: (caseId: string) => void;
  onToggleExpand: (caseId: string) => void;
  onUpdateCommandSelection: (caseId: string, commandId: string, selected: boolean) => void;
  onUpdateCaseSelection: (caseId: string, selected: boolean) => void;
  onRunCommand: (caseId: string, commandIndex: number) => void;
  onRunTestCase: (caseId: string) => void;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onEditCase: (testCase: TestCase) => void;
  onSaveInlineEdit: (caseId: string, commandId: string) => void;
  onSetLastFocusedChild: (caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, caseId: string, index: number, position: 'above' | 'below') => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
}

export const TestCaseCommandList: React.FC<TestCaseCommandListProps> = ({
  testCase,
  level = 0,
  parentCaseId,
  isExecuting = false,
  dragInfo,
  inlineEdit,
  onSelectCase,
  onToggleExpand,
  onUpdateCommandSelection,
  onUpdateCaseSelection,
  onRunCommand,
  onRunTestCase,
  onEditCommand,
  onEditCase,
  onSaveInlineEdit,
  onSetLastFocusedChild,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  setInlineEdit
}) => {
  
  const { commands, subCases } = getSortedChildren(testCase);

  const renderCommand = (command: TestCommand, commandIndex: number) => {
    const isDragging = dragInfo.isDragging && dragInfo.dragItemId === command.id;
    const isDropTarget = dragInfo.dropTarget?.caseId === testCase.id && 
                        dragInfo.dropTarget?.itemId === command.id && 
                        dragInfo.dropTarget?.itemType === 'command';
    const dropPosition = dragInfo.dropTarget?.position || null;

    return (
      <CommandRow
        key={command.id}
        command={command}
        caseId={testCase.id}
        commandIndex={commandIndex}
        level={level + 1}
        isDragging={isDragging}
        isDropTarget={isDropTarget}
        dropPosition={dropPosition}
        isExecuting={isExecuting && testCase.currentCommand === commandIndex}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onSelectCase={onSelectCase}
        onUpdateCommandSelection={onUpdateCommandSelection}
        onRunCommand={onRunCommand}
        onEditCommand={onEditCommand}
        onSaveInlineEdit={onSaveInlineEdit}
        onSetLastFocusedChild={onSetLastFocusedChild}
        inlineEdit={inlineEdit}
        setInlineEdit={setInlineEdit}
      />
    );
  };

  const renderSubCase = (subCase: TestCase, subCaseIndex: number) => {
    const isDragging = dragInfo.isDragging && dragInfo.dragItemId === subCase.id;
    const isDropTarget = dragInfo.dropTarget?.caseId === testCase.id && 
                        dragInfo.dropTarget?.itemId === subCase.id && 
                        dragInfo.dropTarget?.itemType === 'subcase';
    const dropPosition = dragInfo.dropTarget?.position || null;

    return (
      <SubCaseRow
        key={subCase.id}
        subCase={subCase}
        parentCaseId={testCase.id}
        level={level + 1}
        isDragging={isDragging}
        isDropTarget={isDropTarget}
        dropPosition={dropPosition}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onSelectCase={onSelectCase}
        onToggleExpand={onToggleExpand}
        onUpdateCaseSelection={onUpdateCaseSelection}
        onRunTestCase={onRunTestCase}
        onEditCase={onEditCase}
        onSetLastFocusedChild={onSetLastFocusedChild}
      />
    );
  };

  const renderChildren = () => {
    const elements: React.ReactNode[] = [];
    
    // 渲染命令
    commands.forEach((command, index) => {
      elements.push(renderCommand(command, index));
    });
    
    // 渲染子用例
    subCases.forEach((subCase, index) => {
      elements.push(renderSubCase(subCase, index));
      
      // 递归渲染子用例的内容
      if (subCase.isExpanded) {
        elements.push(
          <TestCaseCommandList
            key={`${subCase.id}-children`}
            testCase={subCase}
            level={level + 1}
            parentCaseId={testCase.id}
            isExecuting={isExecuting}
            dragInfo={dragInfo}
            inlineEdit={inlineEdit}
            onSelectCase={onSelectCase}
            onToggleExpand={onToggleExpand}
            onUpdateCommandSelection={onUpdateCommandSelection}
            onUpdateCaseSelection={onUpdateCaseSelection}
            onRunCommand={onRunCommand}
            onRunTestCase={onRunTestCase}
            onEditCommand={onEditCommand}
            onEditCase={onEditCase}
            onSaveInlineEdit={onSaveInlineEdit}
            onSetLastFocusedChild={onSetLastFocusedChild}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            setInlineEdit={setInlineEdit}
          />
        );
      }
    });
    
    return elements;
  };

  if (!testCase.isExpanded) {
    return null;
  }

  return (
    <>
      {renderChildren()}
    </>
  );
};