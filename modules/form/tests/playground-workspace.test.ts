import { sampleForm } from '../apps/playground/src/sample';
import { wizardFormSeed } from '../apps/playground/src/wizard-sample';
import {
  countFormFields,
  createBlankForm,
  createFormRecord,
  LEGACY_FORM_STORAGE_KEY,
  loadPlaygroundWorkspace,
  savePlaygroundWorkspace,
  updateWorkspaceDocument,
  WORKSPACE_STORAGE_KEY,
} from '../apps/playground/src/workspace';

class MemoryStorage {
  readonly values = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('quota exceeded');
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('Playground workspace storage', () => {
  const now = new Date('2026-08-02T08:00:00.000Z');

  it('seeds a Chinese local workspace and reloads the versioned payload', () => {
    const storage = new MemoryStorage();
    const workspace = loadPlaygroundWorkspace(storage, sampleForm, now);

    expect(workspace.schemaVersion).toBe(1);
    expect(workspace.activeFormId).toBe('employee-onboarding');
    expect(workspace.forms[0].document.metadata.locale).toBe('zh-CN');
    expect(savePlaygroundWorkspace(storage, workspace)).toBe(true);
    expect(loadPlaygroundWorkspace(storage, sampleForm, now)).toEqual(workspace);
  });

  it('migrates the legacy single-form key without losing the document', () => {
    const storage = new MemoryStorage();
    storage.values.set(LEGACY_FORM_STORAGE_KEY, JSON.stringify(sampleForm));

    const workspace = loadPlaygroundWorkspace(storage, sampleForm, now);
    expect(workspace.forms).toHaveLength(1);
    expect(workspace.forms[0].document.metadata.title).toBe(sampleForm.metadata.title);
    savePlaygroundWorkspace(storage, workspace);
    expect(storage.values.has(LEGACY_FORM_STORAGE_KEY)).toBe(false);
    expect(storage.values.has(WORKSPACE_STORAGE_KEY)).toBe(true);
  });

  it('adds newly bundled examples without replacing existing local forms', () => {
    const storage = new MemoryStorage();
    const existing = loadPlaygroundWorkspace(storage, sampleForm, now);
    expect(savePlaygroundWorkspace(storage, existing)).toBe(true);

    const enriched = loadPlaygroundWorkspace(
      storage,
      [{ id: 'employee-onboarding', document: sampleForm }, wizardFormSeed],
      now,
    );

    expect(enriched.activeFormId).toBe('employee-onboarding');
    expect(enriched.forms).toHaveLength(2);
    expect(enriched.forms.filter((record) => record.id === 'employee-onboarding')).toHaveLength(1);
    expect(enriched.forms.map((record) => record.id)).toContain('organization-onboarding-wizard');
  });

  it('upgrades an older bundled example once while preserving its original creation time', () => {
    const storage = new MemoryStorage();
    const outdatedDocument = structuredClone(wizardFormSeed.document);
    outdatedDocument.schema.properties = {
      ...outdatedDocument.schema.properties,
      obsolete: { type: 'string' },
    };
    const outdated = loadPlaygroundWorkspace(
      storage,
      [{ id: wizardFormSeed.id, seedVersion: 1, document: outdatedDocument }],
      now,
    );
    expect(savePlaygroundWorkspace(storage, outdated)).toBe(true);

    const upgradedSeed = { ...wizardFormSeed, seedVersion: 2 };
    const upgraded = loadPlaygroundWorkspace(
      storage,
      [upgradedSeed],
      new Date('2026-08-02T10:00:00.000Z'),
    );
    const template = upgraded.forms.find((record) => record.id === wizardFormSeed.id);

    expect(template?.seedVersion).toBe(2);
    expect(template?.createdAt).toBe(now.toISOString());
    expect(template?.document.schema.properties).not.toHaveProperty('obsolete');
  });

  it('falls back safely when stored data is corrupt or writes are denied', () => {
    const storage = new MemoryStorage();
    storage.values.set(WORKSPACE_STORAGE_KEY, '{broken');
    const workspace = loadPlaygroundWorkspace(storage, sampleForm, now);
    expect(workspace.forms[0].id).toBe('employee-onboarding');

    storage.failWrites = true;
    expect(savePlaygroundWorkspace(storage, workspace)).toBe(false);
  });

  it('creates and updates independent form records', () => {
    const first = createFormRecord('survey', ' 客户调查 ', ' 收集客户反馈 ', now);
    const second = createBlankForm('', '');
    expect(first.document.metadata.title).toBe('客户调查');
    expect(first.document.metadata.description).toBe('收集客户反馈');
    expect(second.metadata.title).toBe('未命名表单');
    expect(second.ui.nodes[0].children).toEqual([]);

    const workspace = loadPlaygroundWorkspace(new MemoryStorage(), sampleForm, now);
    const nextDocument = structuredClone(workspace.forms[0].document);
    nextDocument.revision += 1;
    nextDocument.ui.nodes.push({
      id: 'extra',
      kind: 'repeater',
      label: '成员',
      schemaPath: '/properties/members',
    });
    const updated = updateWorkspaceDocument(
      workspace,
      'employee-onboarding',
      nextDocument,
      new Date('2026-08-02T09:00:00.000Z'),
    );

    expect(updated.forms[0].updatedAt).toBe('2026-08-02T09:00:00.000Z');
    expect(countFormFields(updated.forms[0].document)).toBe(countFormFields(sampleForm) + 1);
  });

  it('creates an independent form from a business template', () => {
    const record = createFormRecord(
      'onboarding-copy',
      '研发入职申请',
      '供研发团队入职审批使用',
      now,
      sampleForm,
    );

    expect(record.document).not.toBe(sampleForm);
    expect(record.document.metadata.title).toBe('研发入职申请');
    expect(record.document.metadata.description).toBe('供研发团队入职审批使用');
    expect(record.document.metadata.owner).toBe('本地工作台');
    expect(record.document.revision).toBe(1);
    expect(
      record.document.ui.nodes.find((node) => node.id === record.document.ui.root)?.label,
    ).toBe('研发入职申请');
    expect(countFormFields(record.document)).toBe(countFormFields(sampleForm));
    expect(sampleForm.metadata.title).toBe('新员工入职申请');
  });
});
