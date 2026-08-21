export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  type?: 'null' | 'boolean' | 'object' | 'array' | 'number' | 'integer' | 'string';
  title?: string;
  description?: string;
  default?: JsonValue;
  enum?: JsonValue[];
  const?: JsonValue;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  [keyword: string]: unknown;
}

export type UiNodeKind = 'root' | 'section' | 'group' | 'field' | 'repeater' | 'content';

export type UiLayout =
  | 'flow'
  | 'grid'
  | 'columns'
  | 'card'
  | 'tabs'
  | 'tab'
  | 'collapse'
  | 'collapse-panel'
  | 'data-grid'
  | 'wizard'
  | 'page';

export type FormPageRole = 'form' | 'review';

export type UiPresentation = 'text' | 'divider' | 'spacer';

export interface UiOption {
  label: string;
  value: JsonPrimitive;
  disabled?: boolean;
}

export type UiMatrixValue = Exclude<JsonPrimitive, null>;

export interface UiMatrixRow {
  /** Stable object key used by the controlled matrix value and its child Schema. */
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface UiMatrixColumn {
  label: string;
  value: UiMatrixValue;
  disabled?: boolean;
}

export interface UiMatrixDefinition {
  rows: UiMatrixRow[];
  columns: UiMatrixColumn[];
}

export type UiDataGridEditMode = 'inline' | 'dialog';
export type UiDataGridSelection = 'none' | 'multiple';
export type UiDataGridSorting = 'none' | 'single';
export type UiDataGridFiltering = 'none' | 'search';
export type UiDataGridPaste = 'none' | 'append';
export type UiDataGridFill = 'none' | 'down';
export type UiDataGridVirtualizationMode = 'rows';

export interface UiDataGridVirtualizationDefinition {
  /** Window object-array rows inside a bounded scroll viewport. */
  mode: UiDataGridVirtualizationMode;
  /** Scroll viewport height in CSS pixels. Defaults to 480 and accepts 240–960. */
  viewportHeight?: number;
  /** Extra rows rendered before and after the viewport. Defaults to 6 and accepts 2–24. */
  overscan?: number;
}

export interface UiDataGridDefinition {
  /** Inline editing is the compatibility default. Dialog editing commits a validated row draft. */
  editMode?: UiDataGridEditMode;
  /** Multiple selection enables bounded bulk row deletion without changing the value shape. */
  selection?: UiDataGridSelection;
  /** Single-column sorting changes only the local view and never reorders the controlled array. */
  sorting?: UiDataGridSorting;
  /** Search filtering matches formatted values across the visible columns. */
  filtering?: UiDataGridFiltering;
  /** Append validated tab-separated rows from a protected paste dialog. */
  paste?: UiDataGridPaste;
  /** Fill one column from the first visible selected row into the remaining selected rows. */
  fill?: UiDataGridFill;
  /** Render a measured row window. Virtualization requires dialog editing. */
  virtualization?: UiDataGridVirtualizationDefinition;
}

export interface UiNode {
  id: string;
  kind: UiNodeKind;
  label?: string;
  description?: string;
  schemaPath?: string;
  widget?: string;
  children?: string[];
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
  width?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  placeholder?: string;
  content?: string;
  layout?: UiLayout;
  /** Applies only to a direct child of a wizard layout. Defaults to form. */
  pageRole?: FormPageRole;
  presentation?: UiPresentation;
  gap?: 0 | 8 | 12 | 16 | 24 | 32;
  options?: UiOption[];
  /** Canonical row and column contract for matrix-single and matrix-multiple fields. */
  matrix?: UiMatrixDefinition;
  /** Interaction policy for object repeaters using the data-grid layout. */
  dataGrid?: UiDataGridDefinition;
  customProps?: JsonObject;
  dataSource?: string;
  /** Object property used to preserve a repeater row across host-controlled updates. */
  itemKey?: string;
  readOnly?: boolean;
  hidden?: boolean;
}

export interface FormUi {
  root: string;
  nodes: UiNode[];
}

export type FormExpression =
  | { op: 'literal'; value: JsonValue }
  | { op: 'field'; path: string }
  | { op: 'not'; value: FormExpression }
  | { op: 'all' | 'any'; values: FormExpression[] }
  | { op: 'coalesce' | 'concat'; values: FormExpression[] }
  | {
      op: 'if';
      condition: FormExpression;
      whenTrue: FormExpression;
      whenFalse: FormExpression;
    }
  | {
      op:
        | 'eq'
        | 'ne'
        | 'gt'
        | 'gte'
        | 'lt'
        | 'lte'
        | 'contains'
        | 'in'
        | 'add'
        | 'subtract'
        | 'multiply'
        | 'divide';
      left: FormExpression;
      right: FormExpression;
    }
  | { op: 'exists'; value: FormExpression };

export type FormRuleKind = 'visible' | 'enabled' | 'computed' | 'validate';
export type FormRuleScope = 'form' | 'row';

export interface FormRule {
  id: string;
  target: string;
  kind: FormRuleKind;
  /** Defaults to form scope. Row scope binds `*` path segments to the target row. */
  scope?: FormRuleScope;
  expression: FormExpression;
  message?: string;
}

export interface DataSourceDefinition {
  id: string;
  registryKey: string;
  parameters?: JsonObject;
  cacheTtlMs?: number;
  dependencies?: string[];
  trigger?: 'mount' | 'focus';
  searchable?: boolean;
  debounceMs?: number;
  pageSize?: number;
}

export interface ActionDefinition {
  id: string;
  registryKey: string;
  label: string;
  tone?: 'primary' | 'secondary' | 'danger';
  payload?: JsonObject;
}

export interface FormMetadata {
  title: string;
  description?: string;
  locale?: string;
  tags?: string[];
  owner?: string;
  compatibility?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FormLocaleMessages {
  checkboxEnabled: string;
  selectPlaceholder: string;
  repeaterRemove: string;
  repeaterRemoveLabel: string;
  repeaterAdd: string;
  repeaterItemLabel: string;
  repeaterEmpty: string;
  repeaterTemplateEmpty: string;
  repeaterMoveUpLabel: string;
  repeaterMoveDownLabel: string;
  repeaterMinimumReached: string;
  repeaterMaximumReached: string;
  dataGridRowNumberLabel: string;
  dataGridRowLabel: string;
  dataGridActionsLabel: string;
  dataGridEmpty: string;
  dataGridAdd: string;
  dataGridEmptyValue: string;
  dataGridEditRowLabel: string;
  dataGridAddRowTitle: string;
  dataGridEditorDescription: string;
  dataGridEditorClose: string;
  dataGridEditorCancel: string;
  dataGridEditorSave: string;
  dataGridEditorInvalid: string;
  dataGridEditorConflict: string;
  dataGridRowInvalid: string;
  dataGridSelectRowLabel: string;
  dataGridSelectAllLabel: string;
  dataGridSelectionSummary: string;
  dataGridDeleteSelected: string;
  dataGridDeleteConfirmation: string;
  dataGridDeleteCount: string;
  dataGridSelectionMinimum: string;
  dataGridRowSingular: string;
  dataGridRowPlural: string;
  dataGridSelectVisibleLabel: string;
  dataGridFilterLabel: string;
  dataGridFilterPlaceholder: string;
  dataGridFilterClear: string;
  dataGridFilterResults: string;
  dataGridFilterNoResults: string;
  dataGridFilterNoResultsClear: string;
  dataGridSortAscendingLabel: string;
  dataGridSortDescendingLabel: string;
  dataGridSortClearLabel: string;
  dataGridMobileSortLabel: string;
  dataGridOriginalOrder: string;
  dataGridAscending: string;
  dataGridDescending: string;
  dataGridReorderViewActive: string;
  dataGridPaste: string;
  dataGridPasteTitle: string;
  dataGridPasteDescription: string;
  dataGridPasteClose: string;
  dataGridPasteColumns: string;
  dataGridPasteColumnOrder: string;
  dataGridPasteInputLabel: string;
  dataGridPastePlaceholder: string;
  dataGridPasteHint: string;
  dataGridPastePreview: string;
  dataGridPastePreviewSummary: string;
  dataGridPastePreviewEmpty: string;
  dataGridPasteApply: string;
  dataGridPasteEmpty: string;
  dataGridPasteSize: string;
  dataGridPasteRows: string;
  dataGridPasteUnclosedQuote: string;
  dataGridPasteQuoteTrailing: string;
  dataGridPasteNoColumns: string;
  dataGridPasteTooManyColumns: string;
  dataGridPasteInvalidNumber: string;
  dataGridPasteInvalidInteger: string;
  dataGridPasteInvalidBoolean: string;
  dataGridPasteInvalidJson: string;
  dataGridPasteInvalidObject: string;
  dataGridPasteInvalidArray: string;
  dataGridPasteInvalidNull: string;
  dataGridPasteEnum: string;
  dataGridPasteCapacity: string;
  dataGridPasteErrorCell: string;
  dataGridPasteErrorRow: string;
  dataGridPasteValidation: string;
  dataGridFillDown: string;
  dataGridFillTitle: string;
  dataGridFillDescription: string;
  dataGridFillClose: string;
  dataGridFillColumnLabel: string;
  dataGridFillSourceLabel: string;
  dataGridFillTargetsLabel: string;
  dataGridFillTargets: string;
  dataGridFillApply: string;
  dataGridFillMinimum: string;
  dataGridFillNoColumns: string;
  dataGridFillConflict: string;
  dataGridFillValidation: string;
  dataGridVirtualRegionLabel: string;
  dataGridVirtualDescription: string;
  dataGridVirtualRange: string;
  tagsInputAriaLabel: string;
  tagsInputPlaceholder: string;
  tagsAdd: string;
  tagsRemoveLabel: string;
  tagsDuplicate: string;
  multiSelectSummary: string;
  matrixEmpty: string;
  matrixRowRequired: string;
  matrixSelectionSummary: string;
  matrixSelectionLimit: string;
  ratingOptionLabel: string;
  sliderValueLabel: string;
  calculatedEmpty: string;
  temporalUtcLabel: string;
  validationPending: string;
  validationPendingLabel: string;
  wizardProgressLabel: string;
  wizardStepProgress: string;
  wizardPrevious: string;
  wizardNext: string;
  wizardPageValidationPending: string;
  wizardPageValidationPendingLabel: string;
  wizardEmpty: string;
  wizardReviewTitle: string;
  wizardReviewEmpty: string;
  wizardReviewEditLabel: string;
  wizardReviewEmptyValue: string;
  wizardReviewItemCount: string;
  wizardReviewBooleanTrue: string;
  wizardReviewBooleanFalse: string;
  dataSourceSearchLabel: string;
  dataSourceSearchAriaLabel: string;
  dataSourceSearchPlaceholder: string;
  dataSourceFocusPrompt: string;
  dataSourceDependencyPrompt: string;
  dataSourceLoading: string;
  dataSourceLoadingLabel: string;
  dataSourceEmpty: string;
  dataSourceError: string;
  dataSourceErrorLabel: string;
  dataSourceRetry: string;
  dataSourceRetryLabel: string;
  dataSourcePageError: string;
  dataSourcePageErrorLabel: string;
  dataSourcePageRetryLabel: string;
  dataSourceLoadMore: string;
  dataSourceLoadMoreLabel: string;
  dataSourceLoadingMore: string;
  actionFailed: string;
  errorSummaryLabel: string;
  errorSummaryTitle: string;
  errorSummarySeparator: string;
  actionButtonPending: string;
  actionPending: string;
  formValidationButtonPending: string;
  formValidationPending: string;
  formValidationPendingLabel: string;
  validationType: string;
  validationMinLength: string;
  validationMaxLength: string;
  validationPattern: string;
  validationInvalidPattern: string;
  validationFormat: string;
  validationMinimum: string;
  validationMaximum: string;
  validationMultipleOf: string;
  validationConst: string;
  validationEnum: string;
  validationMinItems: string;
  validationMaxItems: string;
  validationUniqueItems: string;
  validationRequired: string;
  validationAdditionalProperties: string;
  validationRule: string;
  asyncInvalidScope: string;
  asyncUnavailable: string;
  asyncInvalidResponse: string;
}

export interface FormLocaleCatalog {
  apiVersion: 'a3s.dev/form-locale-catalog/v1';
  locale: string;
  messages: Readonly<FormLocaleMessages>;
}

export interface FormLocaleCatalogOverride {
  apiVersion: 'a3s.dev/form-locale-catalog/v1';
  messages: Partial<FormLocaleMessages>;
}

export interface FormDocument {
  kind: 'a3s.form';
  apiVersion: 'a3s.dev/form/v1alpha1';
  schema: JsonSchema;
  ui: FormUi;
  rules?: FormRule[];
  dataSources?: DataSourceDefinition[];
  actions?: ActionDefinition[];
  metadata: FormMetadata;
  revision: number;
  digest?: string;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface FormDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  path: string;
  hint?: string;
}

export interface CompilerLimits {
  maxSerializedBytes: number;
  maxNodes: number;
  maxDepth: number;
  maxRules: number;
  maxExpressionOperations: number;
  maxPatchOperations: number;
}

export interface CompilerCapabilities {
  widgets?: Iterable<string>;
  dataSources?: Iterable<string>;
  actions?: Iterable<string>;
}

export interface CompileOptions {
  capabilities?: CompilerCapabilities;
  limits?: Partial<CompilerLimits>;
  requireDigest?: boolean;
}

export interface CompiledNode extends UiNode {
  valuePath?: string;
  /** Dot-separated value path with `*` placeholders for repeater row indices. */
  valuePathTemplate?: string;
  /** Ordered outer-to-inner repeater node ids required by valuePathTemplate. */
  repeaterAncestors?: readonly string[];
  schema?: JsonSchema;
  depth: number;
}

export interface FormPlan {
  apiVersion: 'a3s.dev/form-plan/v1alpha1';
  schemaProfile: 'a3s.dev/form-schema-profile/1';
  sourceRevision: number;
  sourceDigest: string;
  metadata: FormMetadata;
  schema: JsonSchema;
  root: string;
  nodes: CompiledNode[];
  nodeById: Readonly<Record<string, CompiledNode>>;
  rules: FormRule[];
  ruleDependencies: Readonly<Record<string, readonly string[]>>;
  nodeSubscriptions: Readonly<Record<string, readonly string[]>>;
  expressionOperationLimit: number;
  dependencyOrder: string[];
  dataSources: DataSourceDefinition[];
  actions: ActionDefinition[];
}

export interface CompileResult {
  /** Exact semantic compiler revision that produced this result. */
  compilerRevision: string;
  ok: boolean;
  document?: FormDocument;
  plan?: FormPlan;
  diagnostics: FormDiagnostic[];
}

export interface PatchPrecondition {
  path: string;
  exists?: boolean;
  equals?: JsonValue;
}

export type FormPatchOperation =
  | { op: 'set'; path: string; value: JsonValue }
  | { op: 'remove'; path: string }
  | { op: 'insert'; path: string; index: number; value: JsonValue }
  | { op: 'move'; from: string; path: string; index?: number };

export interface FormPatch {
  apiVersion: 'a3s.dev/form-patch/v1alpha1';
  baseRevision: number;
  description?: string;
  preconditions?: PatchPrecondition[];
  operations: FormPatchOperation[];
}

export interface PatchConflict {
  code: 'revision_mismatch' | 'precondition_failed' | 'invalid_operation';
  path: string;
  message: string;
}

export type ApplyPatchResult =
  | {
      ok: true;
      document: FormDocument;
      plan: FormPlan;
      diagnostics: FormDiagnostic[];
    }
  | {
      ok: false;
      conflicts: PatchConflict[];
      diagnostics: FormDiagnostic[];
    };

export interface FormRef {
  uri: string;
  revision: number;
  digest: string;
  mode: 'configuration' | 'interaction' | 'read-only';
}

export interface FieldError {
  path: string;
  code: string;
  message: string;
}

export interface FormWizardCheckpoint {
  apiVersion: 'a3s.dev/form-wizard-checkpoint/v1alpha1';
  sourceDigest: string;
  sourceRevision: number;
  wizardId: string;
  pageId: string;
  completedPageIds: string[];
}

export type FormWizardCheckpointErrorCode =
  | 'invalid_api_version'
  | 'digest_mismatch'
  | 'revision_mismatch'
  | 'wizard_missing'
  | 'page_missing'
  | 'completed_page_missing';

export type FormWizardCheckpointResult =
  | { ok: true; checkpoint: FormWizardCheckpoint }
  | { ok: false; code: FormWizardCheckpointErrorCode; message: string };

export type FormWizardCheckpointChangeReason = 'next' | 'previous' | 'jump' | 'reconcile';

export interface FormWizardCheckpointChange {
  checkpoint: FormWizardCheckpoint;
  reason: FormWizardCheckpointChangeReason;
}

export type ComputedRuleTraceStatus = 'set' | 'removed' | 'unchanged' | 'error' | 'skipped';

export interface ComputedRuleTraceEntry {
  ruleId: string;
  target: string;
  path: string;
  dependencies: string[];
  status: ComputedRuleTraceStatus;
  previousValue?: JsonValue;
  nextValue?: JsonValue;
  error?: string;
}

export interface ComputedRuleEvaluationOptions {
  includeValues?: boolean;
}

export interface FormValueEvaluationOptions extends ComputedRuleEvaluationOptions {
  locale?: string;
  localeCatalog?: FormLocaleCatalogOverride;
}

export interface ComputedRuleEvaluation {
  value: JsonObject;
  trace: ComputedRuleTraceEntry[];
  errors: FieldError[];
}

export interface IncrementalComputedRuleEvaluation extends ComputedRuleEvaluation {
  evaluatedRuleIds: string[];
  reusedRuleIds: string[];
}

export type FormValueEvaluation = ComputedRuleEvaluation;

export type AsyncValidationScope =
  | { kind: 'form' }
  | { kind: 'field'; nodeId: string; path: string }
  | { kind: 'page'; nodeId: string };

export type AsyncValidationTrigger = 'blur' | 'submit';

export interface AsyncValidationIssue {
  path?: string;
  code: string;
  message: string;
}

export interface AsyncValidationRequest {
  plan: FormPlan;
  value: JsonObject;
  scope: AsyncValidationScope;
  trigger: AsyncValidationTrigger;
  locale: string;
}

export interface AsyncValidationResponse {
  issues: AsyncValidationIssue[];
}

export type FormAsyncValidator = (
  request: AsyncValidationRequest,
  signal: AbortSignal,
) => Promise<AsyncValidationResponse>;

export type AsyncValidationStatus = 'valid' | 'invalid' | 'cancelled' | 'unavailable';

export interface AsyncValidationOptions {
  scope?: AsyncValidationScope;
  trigger?: AsyncValidationTrigger;
  locale?: string;
  localeCatalog?: FormLocaleCatalogOverride;
}

export interface AsyncValidationEvaluation extends FormValueEvaluation {
  asyncErrors: FieldError[];
  status: AsyncValidationStatus;
}

export interface DataSourceDependencyBinding {
  /** Dependency path as declared by the form document. */
  template: string;
  /** Concrete dependency path for this request. */
  path: string;
}

export interface DataSourceRequestScope {
  nodeId: string;
  valuePath: string;
  rowIndices: number[];
  dependencies: DataSourceDependencyBinding[];
}

export interface DataSourceRequest {
  definition: DataSourceDefinition;
  query?: string;
  cursor?: string;
  limit?: number;
  value: JsonObject;
  locale: string;
  /** Concrete renderer scope. Optional for direct host calls made outside a renderer. */
  scope?: DataSourceRequestScope;
}

export interface DataSourcePage {
  options: UiOption[];
  nextCursor?: string;
}

export type DataSourceResponse = UiOption[] | DataSourcePage;

export interface ActionRequest {
  definition: ActionDefinition;
  value: JsonObject;
  plan: FormPlan;
}

export interface RepeaterItemIdentityRequest {
  /** The immutable plan that owns the repeater node. */
  plan: FormPlan;
  /** The compiled repeater node being rendered. */
  node: CompiledNode;
  /** The host-controlled row value. The callback must not mutate it. */
  item: JsonValue;
  /** The row's current position inside this repeater. */
  index: number;
  /** The concrete path to this repeater, including any outer row indices. */
  valuePath: string;
}

export interface FormHostAdapter {
  resolveDataSource?: (
    request: DataSourceRequest,
    signal: AbortSignal,
  ) => Promise<DataSourceResponse>;
  validateValue?: FormAsyncValidator;
  /** Returns a stable business identity for a row without adding engine metadata to its value. */
  identifyRepeaterItem?: (request: RepeaterItemIdentityRequest) => string | undefined;
  // biome-ignore lint/suspicious/noConfusingVoidType: Host actions may intentionally return no payload.
  invokeAction?: (request: ActionRequest, signal: AbortSignal) => Promise<JsonValue | void>;
}

export interface CompileWorkerRequest {
  id: string;
  type: 'compile';
  document: FormDocument;
  options?: CompileOptions;
}

export interface CompileWorkerResponse {
  id: string;
  type: 'result';
  result: CompileResult;
}
