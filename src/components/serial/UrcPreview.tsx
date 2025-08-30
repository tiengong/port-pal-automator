import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import { TestCommand } from './types';

interface UrcPreviewProps {
  command: TestCommand;
}

export const UrcPreview: React.FC<UrcPreviewProps> = ({ command }) => {
  const [testData, setTestData] = useState('');
  const [previewResult, setPreviewResult] = useState<{
    matches: boolean;
    extractedVars: { [key: string]: string };
    error?: string;
  } | null>(null);

  const testParsing = () => {
    if (!command.dataParseConfig || !testData.trim()) return;

    const { parseType, parsePattern, parameterMap } = command.dataParseConfig;
    let matches = false;
    let extractedVars: { [key: string]: string } = {};
    let error: string | undefined;

    try {
      switch (parseType) {
        case 'regex':
          const regex = new RegExp(parsePattern);
          const match = testData.match(regex);
          if (match) {
            matches = true;
            Object.entries(parameterMap).forEach(([groupKey, varName]) => {
              if (typeof varName === 'string') {
                const value = isNaN(Number(groupKey)) 
                  ? match.groups?.[groupKey] 
                  : match[Number(groupKey)];
                if (value) {
                  extractedVars[varName] = value;
                }
              }
            });
          }
          break;
        case 'split':
          const parts = testData.split(parsePattern);
          matches = parts.length > 1;
          if (matches) {
            Object.entries(parameterMap).forEach(([indexKey, varName]) => {
              if (typeof varName === 'string') {
                const index = Number(indexKey);
                if (!isNaN(index) && parts[index] !== undefined) {
                  extractedVars[varName] = parts[index].trim();
                }
              }
            });
          }
          break;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : '解析错误';
    }

    setPreviewResult({ matches, extractedVars, error });
  };

  if (!command.dataParseConfig?.parseType) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">实时预览测试</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">测试数据</label>
          <Textarea
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            placeholder={
              command.dataParseConfig.parseType === 'regex'
                ? '输入要测试的URC数据，如: +MIPLOBSERVE:0,193077,1,3303,1,-1'
                : '输入要分割的字符串'
            }
            className="font-mono text-xs"
            rows={2}
          />
        </div>
        
        <Button 
          onClick={testParsing} 
          size="sm" 
          className="w-full"
          disabled={!testData.trim()}
        >
          <Play className="w-3 h-3 mr-1" />
          测试解析
        </Button>

        {previewResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {previewResult.matches ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm">
                {previewResult.matches ? '匹配成功' : '未匹配'}
              </span>
            </div>

            {previewResult.error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                错误: {previewResult.error}
              </div>
            )}

            {Object.keys(previewResult.extractedVars).length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">提取的变量:</div>
                <div className="space-y-1">
                  {Object.entries(previewResult.extractedVars).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {key}
                      </Badge>
                      <span className="text-xs font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};