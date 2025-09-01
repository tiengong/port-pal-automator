import React from "react";
import { Badge } from "@/components/ui/badge";
import { TestTube2 } from "lucide-react";
import { TestCase } from "./types";

interface TestCaseHeaderProps {
  currentTestCase: TestCase | null;
}

export const TestCaseHeader: React.FC<TestCaseHeaderProps> = ({ currentTestCase }) => {
  console.log('TestCaseHeader rendered', { currentTestCase });
  
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <TestTube2 className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {currentTestCase ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-lg truncate">{currentTestCase.name}</span>
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