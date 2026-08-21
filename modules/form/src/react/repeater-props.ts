import type { CSSProperties, ReactNode } from 'react';
import type { CompiledNode, FieldError, FormLocaleMessages, JsonValue } from '../core';
import type { RuntimeDataGridColumn } from './data-grid-bulk';

export interface DialogValidationResult {
  item: JsonValue;
  errors: readonly FieldError[];
}

export interface RepeaterValidationResult {
  items: JsonValue[];
  errors: readonly FieldError[];
}

export interface RepeaterFieldProps {
  id: string;
  node: CompiledNode;
  items: JsonValue[];
  valuePath: string;
  required: boolean;
  disabled: boolean;
  validating: boolean;
  describedBy?: string;
  errors: readonly FieldError[];
  messages: Readonly<FormLocaleMessages>;
  locale?: string;
  style: CSSProperties;
  headerActions?: ReactNode;
  onBlur: () => void;
  onChange: (items: JsonValue[]) => void;
  identifyItem?: (item: JsonValue, index: number) => string | undefined;
  columns: readonly RuntimeDataGridColumn[];
  renderCell: (nodeId: string, index: number, key: string) => ReactNode;
  getCellValue: (nodeId: string, index: number) => JsonValue | undefined;
  formatCellValue: (nodeId: string, index: number) => string;
  renderDialogCell: (
    nodeId: string,
    index: number,
    key: string,
    item: JsonValue,
    onItemChange: (item: JsonValue) => void,
    errors: readonly FieldError[],
  ) => ReactNode;
  validateDialogItem: (item: JsonValue, index: number) => DialogValidationResult;
  validateItems: (items: JsonValue[]) => RepeaterValidationResult;
  validationStatus?: ReactNode;
}
