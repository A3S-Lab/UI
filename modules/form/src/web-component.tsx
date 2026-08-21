import { createRoot, type Root } from 'react-dom/client';
import type {
  CompileOptions,
  FieldError,
  FormDocument,
  FormHostAdapter,
  FormLocaleCatalogOverride,
  FormPlan,
  FormWizardCheckpoint,
  JsonObject,
} from './core';
import {
  FormDesigner,
  type FormNodeRegistry,
  FormRenderer,
  type FormWidgetRegistry,
} from './react';

abstract class ReactFormElement extends HTMLElement {
  protected reactRoot?: Root;

  connectedCallback(): void {
    this.reactRoot ??= createRoot(this);
    this.renderReact();
  }

  disconnectedCallback(): void {
    this.reactRoot?.unmount();
    this.reactRoot = undefined;
  }

  protected abstract renderReact(): void;
}

export class A3SFormRendererElement extends ReactFormElement {
  private currentErrors?: FieldError[];
  private currentHostAdapter?: FormHostAdapter;
  private currentLocale?: string;
  private currentLocaleCatalog?: FormLocaleCatalogOverride;
  private currentNodeRegistry?: FormNodeRegistry;
  private currentPlan?: FormPlan;
  private currentReadOnly = false;
  private currentValue: JsonObject = {};
  private currentWidgetRegistry?: FormWidgetRegistry;
  private currentWizardCheckpoints?: Readonly<Record<string, FormWizardCheckpoint>>;

  get errors(): FieldError[] | undefined {
    return this.currentErrors;
  }

  set errors(value: FieldError[] | undefined) {
    this.currentErrors = value;
    this.renderReact();
  }

  get hostAdapter(): FormHostAdapter | undefined {
    return this.currentHostAdapter;
  }

  set hostAdapter(value: FormHostAdapter | undefined) {
    this.currentHostAdapter = value;
    this.renderReact();
  }

  get locale(): string | undefined {
    return this.currentLocale;
  }

  set locale(value: string | undefined) {
    this.currentLocale = value;
    this.renderReact();
  }

  get localeCatalog(): FormLocaleCatalogOverride | undefined {
    return this.currentLocaleCatalog;
  }

  set localeCatalog(value: FormLocaleCatalogOverride | undefined) {
    this.currentLocaleCatalog = value;
    this.renderReact();
  }

  get nodeRegistry(): FormNodeRegistry | undefined {
    return this.currentNodeRegistry;
  }

  set nodeRegistry(value: FormNodeRegistry | undefined) {
    this.currentNodeRegistry = value;
    this.renderReact();
  }

  get plan(): FormPlan | undefined {
    return this.currentPlan;
  }

  set plan(value: FormPlan | undefined) {
    this.currentPlan = value;
    this.renderReact();
  }

  get readOnly(): boolean {
    return this.currentReadOnly;
  }

  set readOnly(value: boolean) {
    this.currentReadOnly = value;
    this.renderReact();
  }

  get value(): JsonObject {
    return this.currentValue;
  }

  set value(value: JsonObject) {
    this.currentValue = value;
    this.renderReact();
  }

  get widgetRegistry(): FormWidgetRegistry | undefined {
    return this.currentWidgetRegistry;
  }

  set widgetRegistry(value: FormWidgetRegistry | undefined) {
    this.currentWidgetRegistry = value;
    this.renderReact();
  }

  get wizardCheckpoints(): Readonly<Record<string, FormWizardCheckpoint>> | undefined {
    return this.currentWizardCheckpoints;
  }

  set wizardCheckpoints(value: Readonly<Record<string, FormWizardCheckpoint>> | undefined) {
    this.currentWizardCheckpoints = value;
    this.renderReact();
  }

  protected renderReact(): void {
    if (!this.reactRoot) return;
    if (!this.currentPlan) {
      this.reactRoot.render(null);
      return;
    }
    this.reactRoot.render(
      <FormRenderer
        plan={this.currentPlan}
        value={this.currentValue}
        errors={this.currentErrors}
        hostAdapter={this.currentHostAdapter}
        locale={this.currentLocale}
        localeCatalog={this.currentLocaleCatalog}
        nodeRegistry={this.currentNodeRegistry}
        readOnly={this.currentReadOnly}
        widgetRegistry={this.currentWidgetRegistry}
        wizardCheckpoints={this.currentWizardCheckpoints}
        onChange={(value) => {
          this.currentValue = value;
          this.renderReact();
          this.dispatchEvent(
            new CustomEvent('value-change', { detail: value, bubbles: true, composed: true }),
          );
        }}
        onAction={(actionId, value) => {
          this.dispatchEvent(
            new CustomEvent('form-action', {
              detail: { actionId, value },
              bubbles: true,
              composed: true,
            }),
          );
        }}
        onWizardCheckpointChange={(change) => {
          this.dispatchEvent(
            new CustomEvent('wizard-checkpoint-change', {
              detail: change,
              bubbles: true,
              composed: true,
            }),
          );
        }}
      />,
    );
  }
}

export class A3SFormDesignerElement extends ReactFormElement {
  private currentCompileOptions?: CompileOptions;
  private currentDocument?: FormDocument;
  private currentErrors?: FieldError[];
  private currentHostAdapter?: FormHostAdapter;
  private currentLocale?: string;
  private currentLocaleCatalog?: FormLocaleCatalogOverride;
  private currentNodeRegistry?: FormNodeRegistry;
  private currentReadOnly = false;
  private currentValue: JsonObject = {};
  private currentWidgetRegistry?: FormWidgetRegistry;
  private currentWizardCheckpoints?: Readonly<Record<string, FormWizardCheckpoint>>;

  get compileOptions(): CompileOptions | undefined {
    return this.currentCompileOptions;
  }

  set compileOptions(value: CompileOptions | undefined) {
    this.currentCompileOptions = value;
    this.renderReact();
  }

  get document(): FormDocument | undefined {
    return this.currentDocument;
  }

  set document(value: FormDocument | undefined) {
    this.currentDocument = value;
    this.renderReact();
  }

  get errors(): FieldError[] | undefined {
    return this.currentErrors;
  }

  set errors(value: FieldError[] | undefined) {
    this.currentErrors = value;
    this.renderReact();
  }

  get hostAdapter(): FormHostAdapter | undefined {
    return this.currentHostAdapter;
  }

  set hostAdapter(value: FormHostAdapter | undefined) {
    this.currentHostAdapter = value;
    this.renderReact();
  }

  get locale(): string | undefined {
    return this.currentLocale;
  }

  set locale(value: string | undefined) {
    this.currentLocale = value;
    this.renderReact();
  }

  get localeCatalog(): FormLocaleCatalogOverride | undefined {
    return this.currentLocaleCatalog;
  }

  set localeCatalog(value: FormLocaleCatalogOverride | undefined) {
    this.currentLocaleCatalog = value;
    this.renderReact();
  }

  get nodeRegistry(): FormNodeRegistry | undefined {
    return this.currentNodeRegistry;
  }

  set nodeRegistry(value: FormNodeRegistry | undefined) {
    this.currentNodeRegistry = value;
    this.renderReact();
  }

  get readOnly(): boolean {
    return this.currentReadOnly;
  }

  set readOnly(value: boolean) {
    this.currentReadOnly = value;
    this.renderReact();
  }

  get value(): JsonObject {
    return this.currentValue;
  }

  set value(value: JsonObject) {
    this.currentValue = value;
    this.renderReact();
  }

  get widgetRegistry(): FormWidgetRegistry | undefined {
    return this.currentWidgetRegistry;
  }

  set widgetRegistry(value: FormWidgetRegistry | undefined) {
    this.currentWidgetRegistry = value;
    this.renderReact();
  }

  get wizardCheckpoints(): Readonly<Record<string, FormWizardCheckpoint>> | undefined {
    return this.currentWizardCheckpoints;
  }

  set wizardCheckpoints(value: Readonly<Record<string, FormWizardCheckpoint>> | undefined) {
    this.currentWizardCheckpoints = value;
    this.renderReact();
  }

  protected renderReact(): void {
    if (!this.reactRoot) return;
    if (!this.currentDocument) {
      this.reactRoot.render(null);
      return;
    }
    this.reactRoot.render(
      <FormDesigner
        document={this.currentDocument}
        value={this.currentValue}
        compileOptions={this.currentCompileOptions}
        errors={this.currentErrors}
        hostAdapter={this.currentHostAdapter}
        locale={this.currentLocale}
        localeCatalog={this.currentLocaleCatalog}
        nodeRegistry={this.currentNodeRegistry}
        readOnly={this.currentReadOnly}
        widgetRegistry={this.currentWidgetRegistry}
        wizardCheckpoints={this.currentWizardCheckpoints}
        onChange={(document) => {
          this.currentDocument = document;
          this.renderReact();
          this.dispatchEvent(
            new CustomEvent('document-change', { detail: document, bubbles: true, composed: true }),
          );
        }}
        onValueChange={(value) => {
          this.currentValue = value;
          this.renderReact();
          this.dispatchEvent(
            new CustomEvent('value-change', { detail: value, bubbles: true, composed: true }),
          );
        }}
        onAction={(actionId, value) => {
          this.dispatchEvent(
            new CustomEvent('form-action', {
              detail: { actionId, value },
              bubbles: true,
              composed: true,
            }),
          );
        }}
        onWizardCheckpointChange={(change) => {
          this.dispatchEvent(
            new CustomEvent('wizard-checkpoint-change', {
              detail: change,
              bubbles: true,
              composed: true,
            }),
          );
        }}
      />,
    );
  }
}

export function defineA3SFormElements(registry: CustomElementRegistry = customElements): void {
  if (!registry.get('a3s-form-renderer'))
    registry.define('a3s-form-renderer', A3SFormRendererElement);
  if (!registry.get('a3s-form-designer'))
    registry.define('a3s-form-designer', A3SFormDesignerElement);
}
