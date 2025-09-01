import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VariableDisplayProps {
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  onClearParameter: (key: string) => void;
  onClearAll: () => void;
}

export const VariableDisplay: React.FC<VariableDisplayProps> = ({
  storedParameters,
  onClearParameter,
  onClearAll
}) => {
  const { t } = useTranslation();
  const parameterEntries = Object.entries(storedParameters);

  if (parameterEntries.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="w-4 h-4" />
              {t('variable.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-4">
            {t('variable.empty')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hash className="w-4 h-4" />
            {t('variable.title')} ({parameterEntries.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="h-6 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {t('variable.clear')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {parameterEntries.map(([key, data]) => (
            <div key={key} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {key}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {t('variable.inPort')}
                    </Badge>
                  </div>
                  <span className="text-sm font-mono truncate">
                    {data.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClearParameter(key)}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};