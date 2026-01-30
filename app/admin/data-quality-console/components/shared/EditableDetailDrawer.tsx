'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import { CompletenessBar } from './CompletenessBar';
import { EditableField } from './EditableField';
import { useEditRow } from './useEditRow';
import { isPopulated, type FieldGroup } from './DetailDrawer';
import { ENUM_OPTIONS } from '@/lib/validations/data-quality-schemas';

interface EditableDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any> | null;
  fieldGroups: FieldGroup[];
  completeness?: { percent: number; filled?: number; populated?: number; total?: number };
  tableName: string;
  recordId: string | null;
  readOnlyKeys: Set<string>;
  onSaveSuccess: (updatedData: Record<string, any>) => void;
}

export function EditableDetailDrawer({
  open,
  onClose,
  title,
  data,
  fieldGroups,
  completeness,
  tableName,
  recordId,
  readOnlyKeys,
  onSaveSuccess,
}: EditableDetailDrawerProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<Record<string, any>>({});
  const originalDataRef = useRef<Record<string, any> | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingCloseRef = useRef(false);

  const { saveRow, isSaving, errors, setErrors } = useEditRow({
    tableName,
    onSuccess: (updatedData) => {
      onSaveSuccess(updatedData);
      setIsEditMode(false);
      setDirtyFields({});
      setErrors({});
    },
  });

  // Reset state when data changes or drawer closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setDirtyFields({});
      setErrors({});
    }
  }, [open, setErrors]);

  const dirtyCount = Object.keys(dirtyFields).length;

  const handleEnterEdit = useCallback(() => {
    if (data) {
      originalDataRef.current = { ...data };
      setIsEditMode(true);
      setDirtyFields({});
      setErrors({});
    }
  }, [data, setErrors]);

  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    setDirtyFields({});
    setErrors({});
  }, [setErrors]);

  const handleFieldChange = useCallback((key: string, value: any) => {
    setDirtyFields((prev) => {
      // Compare to original value
      const original = originalDataRef.current;
      const originalValue = key.includes('.')
        ? key.split('.').reduce((o: any, k: string) => o?.[k], original)
        : original?.[key];

      // If value matches original, remove from dirty
      if (JSON.stringify(value) === JSON.stringify(originalValue)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return { ...prev, [key]: value };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!recordId || dirtyCount === 0) return;

    // Build PATCH body — for users-orgs, strip "organization." prefix
    const body: Record<string, any> = {};
    for (const [key, value] of Object.entries(dirtyFields)) {
      if (tableName === 'users-orgs' && key.startsWith('organization.')) {
        body[key.replace('organization.', '')] = value;
      } else {
        body[key] = value;
      }
    }

    await saveRow(recordId, body);
  }, [recordId, dirtyCount, dirtyFields, tableName, saveRow]);

  const handleClose = useCallback(() => {
    if (isEditMode && dirtyCount > 0) {
      pendingCloseRef.current = true;
      setShowUnsavedDialog(true);
    } else {
      setIsEditMode(false);
      onClose();
    }
  }, [isEditMode, dirtyCount, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowUnsavedDialog(false);
    setIsEditMode(false);
    setDirtyFields({});
    setErrors({});
    pendingCloseRef.current = false;
    onClose();
  }, [onClose, setErrors]);

  const getFieldValue = (key: string): any => {
    // Check dirty fields first
    if (key in dirtyFields) {
      return dirtyFields[key];
    }
    // Then original data
    if (!data) return undefined;
    return key.includes('.')
      ? key.split('.').reduce((o: any, k: string) => o?.[k], data)
      : data[key];
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <SheetContent
          side="right"
          className="w-[520px] sm:w-[600px] overflow-y-auto"
        >
          <SheetHeader>
            <div className="flex items-center justify-between pr-2">
              <SheetTitle className="text-base truncate mr-4">{title}</SheetTitle>
              <div className="flex items-center gap-2 shrink-0">
                {isEditMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || dirtyCount === 0}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1" />
                      )}
                      저장{dirtyCount > 0 ? ` (${dirtyCount}건)` : ''}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnterEdit}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    편집
                  </Button>
                )}
              </div>
            </div>
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
                      const value = getFieldValue(field.key);
                      const populated = isPopulated(value);
                      const fieldIsReadOnly = readOnlyKeys.has(field.key);
                      const enumKey = `${tableName}.${field.key}`;
                      const enumOpts = ENUM_OPTIONS[enumKey];

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
                          <div>
                            <EditableField
                              fieldKey={field.key}
                              label={field.label}
                              type={field.type || 'text'}
                              value={value}
                              isEditing={isEditMode}
                              isReadOnly={fieldIsReadOnly}
                              onChange={handleFieldChange}
                              error={errors[field.key]}
                              enumOptions={enumOpts}
                            />
                          </div>
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

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>변경사항이 저장되지 않았습니다</AlertDialogTitle>
            <AlertDialogDescription>
              저장하지 않은 변경사항 {dirtyCount}건이 있습니다. 저장하지 않고 닫으시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 편집</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              저장하지 않고 닫기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
