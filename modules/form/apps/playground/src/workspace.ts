import type { FormDocument } from '../../../src/core';

export const WORKSPACE_STORAGE_KEY = 'a3s-form-workspace:v1';
export const LEGACY_FORM_STORAGE_KEY = 'a3s-form-playground';

export interface PlaygroundFormRecord {
  id: string;
  document: FormDocument;
  createdAt: string;
  updatedAt: string;
  seedVersion?: number;
}

export interface PlaygroundWorkspace {
  schemaVersion: 1;
  activeFormId: string | null;
  forms: PlaygroundFormRecord[];
}

export interface PlaygroundWorkspaceSeed {
  id: string;
  document: FormDocument;
  seedVersion?: number;
}

type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isFormDocument(value: unknown): value is FormDocument {
  if (!value || typeof value !== 'object') return false;
  const document = value as Partial<FormDocument>;
  return Boolean(
    document.apiVersion &&
      document.kind === 'a3s.form' &&
      document.metadata &&
      document.schema &&
      document.ui &&
      Array.isArray(document.ui.nodes) &&
      typeof document.ui.root === 'string' &&
      typeof document.revision === 'number',
  );
}

function isWorkspace(value: unknown): value is PlaygroundWorkspace {
  if (!value || typeof value !== 'object') return false;
  const workspace = value as Partial<PlaygroundWorkspace>;
  return (
    workspace.schemaVersion === 1 &&
    Array.isArray(workspace.forms) &&
    workspace.forms.every(
      (record) =>
        Boolean(record) &&
        typeof record.id === 'string' &&
        typeof record.createdAt === 'string' &&
        typeof record.updatedAt === 'string' &&
        (record.seedVersion === undefined || typeof record.seedVersion === 'number') &&
        isFormDocument(record.document),
    )
  );
}

function seedRecord(seed: PlaygroundWorkspaceSeed, timestamp: string): PlaygroundFormRecord {
  return {
    id: seed.id,
    document: structuredClone(seed.document),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(seed.seedVersion === undefined ? {} : { seedVersion: seed.seedVersion }),
  };
}

function isSeedList(
  seed: FormDocument | readonly PlaygroundWorkspaceSeed[],
): seed is readonly PlaygroundWorkspaceSeed[] {
  return Array.isArray(seed);
}

function normalizeSeeds(
  seed: FormDocument | readonly PlaygroundWorkspaceSeed[],
): readonly PlaygroundWorkspaceSeed[] {
  return isSeedList(seed) ? seed : [{ id: 'employee-onboarding', document: seed }];
}

function mergeBundledSeeds(
  workspace: PlaygroundWorkspace,
  seeds: readonly PlaygroundWorkspaceSeed[],
  timestamp: string,
): PlaygroundWorkspace {
  const seedById = new Map(seeds.map((seed) => [seed.id, seed]));
  const existingIds = new Set(workspace.forms.map((record) => record.id));
  const missing = seeds.filter((seed) => !existingIds.has(seed.id));
  let replaced = false;
  const existing = workspace.forms.map((record) => {
    const seed = seedById.get(record.id);
    if (!seed || seed.seedVersion === undefined || (record.seedVersion ?? 0) >= seed.seedVersion) {
      return record;
    }
    replaced = true;
    return {
      ...seedRecord(seed, timestamp),
      createdAt: record.createdAt,
    };
  });
  if (missing.length === 0 && !replaced) return workspace;
  return {
    ...workspace,
    activeFormId: workspace.activeFormId ?? missing[0]?.id ?? null,
    forms: [...missing.map((seed) => seedRecord(seed, timestamp)), ...existing],
  };
}

export function loadPlaygroundWorkspace(
  storage: StoragePort,
  seed: FormDocument | readonly PlaygroundWorkspaceSeed[],
  now = new Date(),
): PlaygroundWorkspace {
  const timestamp = now.toISOString();
  const seeds = normalizeSeeds(seed);
  try {
    const stored = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isWorkspace(parsed)) return mergeBundledSeeds(parsed, seeds, timestamp);
    }
    const legacy = storage.getItem(LEGACY_FORM_STORAGE_KEY);
    if (legacy) {
      const document: unknown = JSON.parse(legacy);
      if (isFormDocument(document)) {
        return mergeBundledSeeds(
          {
            schemaVersion: 1,
            activeFormId: 'employee-onboarding',
            forms: [seedRecord({ id: 'employee-onboarding', document }, timestamp)],
          },
          seeds,
          timestamp,
        );
      }
    }
  } catch {
    // Corrupted or inaccessible browser storage falls back to the bundled sample.
  }
  return {
    schemaVersion: 1,
    activeFormId: seeds[0]?.id ?? null,
    forms: seeds.map((item) => seedRecord(item, timestamp)),
  };
}

export function savePlaygroundWorkspace(
  storage: StoragePort,
  workspace: PlaygroundWorkspace,
): boolean {
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    storage.removeItem(LEGACY_FORM_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function createBlankForm(title: string, description: string): FormDocument {
  const normalizedTitle = title.trim() || '未命名表单';
  return {
    apiVersion: 'a3s.dev/form/v1alpha1',
    kind: 'a3s.form',
    metadata: {
      title: normalizedTitle,
      description: description.trim() || '在这里设计并发布你的表单。',
      locale: 'zh-CN',
      owner: '本地工作台',
      tags: ['本地表单'],
    },
    revision: 1,
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        {
          id: 'root',
          kind: 'root',
          label: normalizedTitle,
          description: description.trim() || '从左侧添加字段和布局组件。',
          columns: 12,
          gap: 16,
          children: [],
          width: 12,
        },
      ],
    },
    dataSources: [],
    rules: [],
    actions: [
      {
        id: 'save-draft',
        label: '保存草稿',
        registryKey: 'host.save-draft.v1',
        tone: 'secondary',
      },
      {
        id: 'submit',
        label: '提交',
        registryKey: 'host.submit.v1',
        tone: 'primary',
      },
    ],
  };
}

export function createFormRecord(
  id: string,
  title: string,
  description: string,
  now = new Date(),
  template?: FormDocument,
): PlaygroundFormRecord {
  const timestamp = now.toISOString();
  const document = template ? structuredClone(template) : createBlankForm(title, description);
  if (template) {
    const normalizedTitle = title.trim() || template.metadata.title;
    const normalizedDescription = description.trim() || template.metadata.description;
    document.metadata = {
      ...document.metadata,
      title: normalizedTitle,
      description: normalizedDescription,
      owner: '本地工作台',
    };
    document.revision = 1;
    const root = document.ui.nodes.find((node) => node.id === document.ui.root);
    if (root) {
      root.label = normalizedTitle;
      root.description = normalizedDescription;
    }
  }
  return {
    id,
    document,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateWorkspaceDocument(
  workspace: PlaygroundWorkspace,
  formId: string,
  document: FormDocument,
  now = new Date(),
): PlaygroundWorkspace {
  return {
    ...workspace,
    activeFormId: formId,
    forms: workspace.forms.map((record) =>
      record.id === formId ? { ...record, document, updatedAt: now.toISOString() } : record,
    ),
  };
}

export function countFormFields(document: FormDocument): number {
  return document.ui.nodes.filter((node) => node.kind === 'field' || node.kind === 'repeater')
    .length;
}
