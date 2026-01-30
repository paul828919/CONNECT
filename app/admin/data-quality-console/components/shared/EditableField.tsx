'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, X } from 'lucide-react';
import { renderValue } from './DetailDrawer';

interface EditableFieldProps {
  fieldKey: string;
  label: string;
  type: 'text' | 'date' | 'json' | 'array' | 'boolean' | 'number' | 'url';
  value: any;
  isEditing: boolean;
  isReadOnly: boolean;
  onChange: (key: string, value: any) => void;
  error?: string;
  enumOptions?: string[];
}

export function EditableField({
  fieldKey,
  label,
  type,
  value,
  isEditing,
  isReadOnly,
  onChange,
  error,
  enumOptions,
}: EditableFieldProps) {
  const [arrayInput, setArrayInput] = useState('');

  // Read-only mode: use existing renderValue
  if (!isEditing || isReadOnly) {
    return (
      <div className="relative group">
        {renderValue(value, type)}
        {isEditing && isReadOnly && (
          <span className="ml-1 text-xs text-muted-foreground">(읽기전용)</span>
        )}
      </div>
    );
  }

  // Editing mode
  const wrapWithError = (input: React.ReactNode) => (
    <div className="w-full">
      <div className="flex items-center gap-1">
        <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
        {input}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  // Enum dropdown
  if (enumOptions && enumOptions.length > 0) {
    return wrapWithError(
      <Select
        value={value ?? ''}
        onValueChange={(v) => onChange(fieldKey, v)}
      >
        <SelectTrigger className={`w-full text-xs h-8 ${error ? 'border-red-500' : ''}`}>
          <SelectValue placeholder="선택..." />
        </SelectTrigger>
        <SelectContent>
          {enumOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Boolean toggle
  if (type === 'boolean') {
    return wrapWithError(
      <div className="flex items-center gap-2">
        <Switch
          checked={!!value}
          onCheckedChange={(checked) => onChange(fieldKey, checked)}
        />
        <span className="text-xs text-muted-foreground">{value ? '예' : '아니오'}</span>
      </div>
    );
  }

  // Number input
  if (type === 'number') {
    return wrapWithError(
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(fieldKey, v === '' ? null : Number(v));
        }}
        className={`text-xs h-8 ${error ? 'border-red-500' : ''}`}
      />
    );
  }

  // Date input
  if (type === 'date') {
    const dateValue = value ? new Date(value).toISOString().slice(0, 16) : '';
    return wrapWithError(
      <Input
        type="datetime-local"
        value={dateValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(fieldKey, v ? new Date(v).toISOString() : null);
        }}
        className={`text-xs h-8 ${error ? 'border-red-500' : ''}`}
      />
    );
  }

  // Array (tag input)
  if (type === 'array') {
    const arr = Array.isArray(value) ? value : [];
    const handleAdd = () => {
      const trimmed = arrayInput.trim();
      if (trimmed) {
        const newItems = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
        onChange(fieldKey, [...arr, ...newItems]);
        setArrayInput('');
      }
    };
    const handleRemove = (idx: number) => {
      onChange(fieldKey, arr.filter((_: any, i: number) => i !== idx));
    };
    return wrapWithError(
      <div className="space-y-1.5 w-full">
        <div className="flex flex-wrap gap-1">
          {arr.map((item: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
              {String(item)}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder="추가 (쉼표로 구분)..."
          value={arrayInput}
          onChange={(e) => setArrayInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className={`text-xs h-7 ${error ? 'border-red-500' : ''}`}
        />
      </div>
    );
  }

  // JSON textarea
  if (type === 'json') {
    const jsonStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return wrapWithError(
      <Textarea
        value={jsonStr ?? ''}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(fieldKey, parsed);
          } catch {
            // Keep as string while user types
            onChange(fieldKey, e.target.value);
          }
        }}
        className={`text-xs font-mono min-h-[60px] ${error ? 'border-red-500' : ''}`}
      />
    );
  }

  // URL input
  if (type === 'url') {
    return wrapWithError(
      <Input
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(fieldKey, e.target.value || null)}
        placeholder="https://..."
        className={`text-xs h-8 ${error ? 'border-red-500' : ''}`}
      />
    );
  }

  // Text input (textarea if long text)
  const strValue = value ?? '';
  const isLong = typeof strValue === 'string' && strValue.length > 100;
  if (isLong) {
    return wrapWithError(
      <Textarea
        value={strValue}
        onChange={(e) => onChange(fieldKey, e.target.value || null)}
        className={`text-xs min-h-[60px] ${error ? 'border-red-500' : ''}`}
      />
    );
  }

  return wrapWithError(
    <Input
      value={strValue}
      onChange={(e) => onChange(fieldKey, e.target.value || null)}
      className={`text-xs h-8 ${error ? 'border-red-500' : ''}`}
    />
  );
}
