'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { CompletenessBar } from './CompletenessBar';

export interface FieldGroup {
  title: string;
  icon: string;
  fields: {
    label: string;
    key: string;
    type?: 'text' | 'date' | 'json' | 'array' | 'boolean' | 'number' | 'url';
  }[];
}

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any> | null;
  fieldGroups: FieldGroup[];
  completeness?: { percent: number; filled?: number; populated?: number; total?: number };
}

export function isPopulated(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function formatDate(value: any): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return String(value);
  }
}

function formatNumber(value: any): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString();
}

export function renderValue(
  value: any,
  type: string = 'text'
): React.ReactNode {
  if (!isPopulated(value)) {
    return <span className="text-red-400">--</span>;
  }

  switch (type) {
    case 'date':
      return <span className="text-sm">{formatDate(value)}</span>;

    case 'json': {
      const jsonStr =
        typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      const truncated =
        jsonStr.length > 200 ? jsonStr.slice(0, 200) + '...' : jsonStr;
      return (
        <span className="text-xs font-mono break-all" title={jsonStr}>
          {truncated}
        </span>
      );
    }

    case 'array': {
      const arr = Array.isArray(value) ? value : [value];
      if (arr.length === 0) {
        return <span className="text-red-400">--</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {arr.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    case 'boolean':
      return <span>{value ? '\u2705' : '\u274C'}</span>;

    case 'number':
      return <span className="text-sm font-medium">{formatNumber(value)}</span>;

    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline break-all"
          title={String(value)}
        >
          {String(value).length > 50
            ? String(value).slice(0, 50) + '...'
            : String(value)}
        </a>
      );

    default:
      return <span className="text-sm">{String(value)}</span>;
  }
}

export function DetailDrawer({
  open,
  onClose,
  title,
  data,
  fieldGroups,
  completeness,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-[520px] sm:w-[600px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {completeness && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
            <div className="text-sm font-medium mb-2">데이터 완성도</div>
            <CompletenessBar
              percent={completeness.percent}
              populated={completeness.filled ?? completeness.populated}
              total={completeness.total}
              size="md"
            />
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-6">
            {fieldGroups.map((group, gi) => (
              <div key={gi}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span>{group.title}</span>
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {group.fields.map((field) => {
                    // Support nested keys like '_count.matches'
                    const value = field.key.includes('.')
                      ? field.key.split('.').reduce((o: any, k: string) => o?.[k], data)
                      : data[field.key];
                    const populated = isPopulated(value);
                    return (
                      <div
                        key={field.key}
                        className="grid grid-cols-[140px_1fr] gap-2 items-start"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              populated ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="text-xs text-muted-foreground font-medium">
                            {field.label}
                          </span>
                        </div>
                        <div>{renderValue(value, field.type || 'text')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
