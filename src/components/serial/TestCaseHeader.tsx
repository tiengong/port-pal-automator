import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TestTube2 } from "lucide-react";
import { TestCase } from "./types";

interface TestCaseHeaderProps {
  currentTestCase: TestCase | null;
  onUpdateCase?: (caseId: string, updater: (testCase: TestCase) => TestCase) => void;
}

export const TestCaseHeader: React.FC<TestCaseHeaderProps> = ({ currentTestCase, onUpdateCase }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  
  console.log('TestCaseHeader rendered', { currentTestCase });

  const handleDoubleClick = () => {
    if (currentTestCase && onUpdateCase) {
      setEditName(currentTestCase.name);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (currentTestCase && onUpdateCase && editName.trim()) {
      onUpdateCase(currentTestCase.id, (testCase) => ({
        ...testCase,
        name: editName.trim()
      }));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };
  
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <TestTube2 className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {currentTestCase ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={handleKeyDown}
                  className="font-semibold text-lg"
                  autoFocus
                />
              ) : (
                <span 
                  className="font-semibold text-lg truncate cursor-pointer hover:text-primary transition-colors"
                  onDoubleClick={handleDoubleClick}
                  title="双击重命名"
                >
                  {currentTestCase.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex-shrink-0">{currentTestCase.commands.length} 个步骤</span>
              {currentTestCase.description && (
                <span className="truncate">• {currentTestCase.description}</span>
              )}
            </div>
          </div>
        ) : (
          <h3 className="text-lg font-semibold text-muted-foreground">无测试用例</h3>
        )}
      </div>
    </div>
  );
};