'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';

interface ExportCSVProps {
  endpoint: string;
  filters: Record<string, string>;
  filename: string;
}

function jsonToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object')
          return JSON.stringify(val).replace(/"/g, '""');
        return String(val).replace(/"/g, '""');
      })
      .map((v) => `"${v}"`)
      .join(',')
  );
  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
}

export function ExportCSV({ endpoint, filters, filename }: ExportCSVProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        export: 'csv',
        limit: '10000',
        ...filters,
      });
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }
      const json = await res.json();
      const data: Record<string, any>[] = Array.isArray(json)
        ? json
        : json.data || [];

      if (data.length === 0) {
        toast({
          title: '내보내기 실패',
          description: '내보낼 데이터가 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      const csv = jsonToCSV(data);
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'CSV 내보내기 오류',
        description:
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      CSV 내보내기
    </Button>
  );
}
