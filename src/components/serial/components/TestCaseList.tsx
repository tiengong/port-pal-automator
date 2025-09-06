import React from 'react';
import { TestCase } from '../types';
import { TestCaseRenderer } from './TestCaseRenderer';

interface TestCaseListProps {
  testCases: TestCase[];
  selectedTestCaseId: string | null;
  connectedPorts: Array<any>;
  setTestCases: (cases: TestCase[]) => void;
  setSelectedTestCaseId: (id: string) => void;
  onRunTestCase: (id: string) => void;
  onEditCase: (testCase: TestCase) => void;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onDeleteCommand: (caseId: string, commandIndex: number) => void;
  onDuplicateCommand: (caseId: string, commandIndex: number) => void;
  contextMenu: any;
  setContextMenu: (menu: any) => void;
  dragInfo: any;
  setDragInfo: (info: any) => void;
  inlineEdit: any;
  setInlineEdit: (edit: any) => void;
  executingCommand: string | null;
}

export const TestCaseList: React.FC<TestCaseListProps> = ({
  testCases,
  selectedTestCaseId,
  connectedPorts,
  setTestCases,
  setSelectedTestCaseId,
  onRunTestCase,
  onEditCase,
  onEditCommand,
  onDeleteCommand,
  onDuplicateCommand,
  contextMenu,
  setContextMenu,
  dragInfo,
  setDragInfo,
  inlineEdit,
  setInlineEdit,
  executingCommand
}) => {
  return (
    <div className="space-y-2">
      {testCases.map((testCase) => (
        <TestCaseRenderer
          key={testCase.id}
          testCase={testCase}
          level={0}
          selectedTestCaseId={selectedTestCaseId}
          connectedPorts={connectedPorts}
          testCases={testCases}
          setTestCases={setTestCases}
          setSelectedTestCaseId={setSelectedTestCaseId}
          onRunTestCase={onRunTestCase}
          onEditCase={onEditCase}
          onEditCommand={onEditCommand}
          onDeleteCommand={onDeleteCommand}
          onDuplicateCommand={onDuplicateCommand}
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          dragInfo={dragInfo}
          setDragInfo={setDragInfo}
          inlineEdit={inlineEdit}
          setInlineEdit={setInlineEdit}
          executingCommand={executingCommand}
        />
      ))}
    </div>
  );
};