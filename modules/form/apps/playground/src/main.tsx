import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  A3S_FLOW_ENGINE_VERSION,
  type A3SFlowDagNodeManifest,
  type A3SFlowWorkflowDagNode,
  a3sFlowDagNodeManifestCatalog,
  createA3SFlowDagNode,
  requireA3SFlowDagNodeManifest,
} from '../../../src/a3s-flow';
import {
  compileForm,
  type FormDocument,
  type FormHostAdapter,
  type FormWizardCheckpoint,
  getAtPath,
  type JsonObject,
} from '../../../src/core';
import { FormDesigner } from '../../../src/react';
import '../../../src/a3s-ui.css';
import './playground.css';
import './workspace.css';
import { playgroundNodeRegistry } from './custom-nodes';
import { ProductIcon } from './icons';
import { sampleForm } from './sample';
import { wizardFormSeed } from './wizard-sample';
import { WorkflowNodeWorkspace } from './workflow-node-workspace';
import {
  createFormRecord,
  loadPlaygroundWorkspace,
  savePlaygroundWorkspace,
  updateWorkspaceDocument,
} from './workspace';
import { type WorkspaceTemplateId, WorkspaceView } from './workspace-view';

const playgroundCapabilities = {
  widgets: Object.keys(playgroundNodeRegistry),
  dataSources: ['playground.workflow.models', 'playground.workflow.route-destinations'],
};
const playgroundSeeds = [{ id: 'employee-onboarding', document: sampleForm }, wizardFormSeed];
const playgroundWorkflowNodes = a3sFlowDagNodeManifestCatalog.filter((node) => !node.internal);
const playgroundHostAdapter: FormHostAdapter = {
  resolveDataSource: async (request) => {
    if (request.definition.registryKey === 'playground.workflow.route-destinations') {
      const dependency = request.scope?.dependencies.find(
        (binding) => binding.template === 'routes.*.when.equals',
      );
      const match = dependency ? getAtPath(request.value, dependency.path) : undefined;
      if (match === 'customer') {
        return [
          { label: '客户成功', value: 'customer-success' },
          { label: '自助服务', value: 'self-service' },
        ];
      }
      if (match === 'enterprise') {
        return [
          { label: '大客户团队', value: 'account-team' },
          { label: '解决方案支持', value: 'solutions' },
        ];
      }
      return [
        { label: '常规处理', value: 'standard' },
        { label: '人工复核', value: 'manual-review' },
      ];
    }
    if (request.definition.registryKey !== 'playground.workflow.models') return [];
    const catalog = [
      { label: 'GPT-5', value: 'gpt-5' },
      { label: 'GPT-4.1', value: 'gpt-4.1' },
      { label: 'Claude Sonnet 4', value: 'claude-sonnet-4' },
      { label: 'Claude Haiku 3.5', value: 'claude-haiku-3.5' },
      { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
      { label: 'DeepSeek V3', value: 'deepseek-v3' },
    ];
    const query = request.query?.trim().toLocaleLowerCase() ?? '';
    const filtered = query
      ? catalog.filter((option) => option.label.toLocaleLowerCase().includes(query))
      : catalog;
    const offset = request.cursor ? Number.parseInt(request.cursor, 10) : 0;
    const start = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
    const limit = request.limit ?? 3;
    const options = filtered.slice(start, start + limit);
    const next = start + options.length;
    return {
      options,
      nextCursor: next < filtered.length ? String(next) : undefined,
    };
  },
  validateValue: async (request) => {
    const scopeOwnsEmail =
      request.scope.kind === 'form' ||
      (request.scope.kind === 'field' && request.scope.path === 'email') ||
      (request.scope.kind === 'page' && request.scope.nodeId === 'contact-page');
    return {
      issues:
        scopeOwnsEmail && request.value.email === 'used@a3s.dev'
          ? [
              {
                path: 'email',
                code: 'email_in_use',
                message: '该企业邮箱已被占用。',
              },
            ]
          : [],
    };
  },
};

type StorageState = 'saving' | 'saved' | 'error';

interface PlaygroundNotice {
  message: string;
  tone: 'success' | 'error';
}

function createFormId(): string {
  return `form-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function defaultFormValue(document: FormDocument): JsonObject {
  const value = document.schema.default;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return structuredClone(value) as JsonObject;
}

function App() {
  const [workspace, setWorkspace] = useState(() =>
    loadPlaygroundWorkspace(localStorage, playgroundSeeds),
  );
  const [surface, setSurface] = useState<'workspace' | 'editor' | 'node'>('workspace');
  const [value, setValue] = useState<JsonObject>({});
  const [workflowNode, setWorkflowNode] = useState<A3SFlowDagNodeManifest>();
  const [workflowDagNode, setWorkflowDagNode] = useState<A3SFlowWorkflowDagNode>();
  const [wizardCheckpointsByForm, setWizardCheckpointsByForm] = useState<
    Readonly<Record<string, Readonly<Record<string, FormWizardCheckpoint>>>>
  >({});
  const [storageState, setStorageState] = useState<StorageState>('saved');
  const [notice, setNotice] = useState<PlaygroundNotice>();
  const [storageAvailable, setStorageAvailable] = useState(true);
  const noticeTimer = useRef<number | undefined>(undefined);
  const workflowReturnFocus = useRef<HTMLElement | null>(null);
  const activeRecord =
    workspace.forms.find((record) => record.id === workspace.activeFormId) ?? workspace.forms[0];
  const document = activeRecord?.document ?? sampleForm;
  const compilation = useMemo(
    () => compileForm(document, { capabilities: playgroundCapabilities }),
    [document],
  );

  const showNotice = useCallback((message: string, tone: PlaygroundNotice['tone'] = 'success') => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice({ message, tone });
    noticeTimer.current = window.setTimeout(() => setNotice(undefined), 2800);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  useEffect(() => {
    setStorageState('saving');
    const timer = window.setTimeout(() => {
      const available = savePlaygroundWorkspace(localStorage, workspace);
      setStorageAvailable(available);
      setStorageState(available ? 'saved' : 'error');
    }, 240);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  const openForm = (formId: string) => {
    const record = workspace.forms.find((item) => item.id === formId);
    setWorkspace((current) => ({ ...current, activeFormId: formId }));
    setValue(record ? defaultFormValue(record.document) : {});
    setSurface('editor');
  };

  const openWorkflowNode = (type: string) => {
    const node = requireA3SFlowDagNodeManifest(type);
    workflowReturnFocus.current =
      window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    setWorkflowNode(node);
    setWorkflowDagNode(
      createA3SFlowDagNode(
        `playground-${type}`,
        node,
        {},
        {
          position: { x: 96, y: 72 },
          selected: true,
        },
      ),
    );
    setSurface('node');
  };

  const returnToWorkspace = () => {
    const returnFocus = workflowReturnFocus.current;
    workflowReturnFocus.current = null;
    setSurface('workspace');
    window.requestAnimationFrame(() => returnFocus?.focus());
  };

  const copyWorkflowField = async (fieldValue: unknown) => {
    const text =
      typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue ?? null, null, 2);
    if (!navigator.clipboard?.writeText) {
      showNotice('Clipboard access is unavailable in this browser.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showNotice('Field value copied.');
    } catch {
      showNotice('Could not copy the field value.', 'error');
    }
  };

  const createForm = (title: string, description: string, template: WorkspaceTemplateId) => {
    const record = createFormRecord(
      createFormId(),
      title,
      description,
      new Date(),
      template === 'onboarding' ? sampleForm : undefined,
    );
    setWorkspace((current) => ({
      ...current,
      activeFormId: record.id,
      forms: [record, ...current.forms],
    }));
    setValue({});
    setSurface('editor');
  };

  const updateDocument = (next: FormDocument) => {
    if (!activeRecord) return;
    setWorkspace((current) => updateWorkspaceDocument(current, activeRecord.id, next));
  };

  const save = useCallback(() => {
    const available = savePlaygroundWorkspace(localStorage, workspace);
    setStorageAvailable(available);
    setStorageState(available ? 'saved' : 'error');
    showNotice(
      available ? '已保存到当前浏览器。' : '保存失败，请检查浏览器存储权限。',
      available ? 'success' : 'error',
    );
  }, [showNotice, workspace]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (surface !== 'editor') return;
      if ((!event.metaKey && !event.ctrlKey) || event.key.toLocaleLowerCase() !== 's') return;
      event.preventDefault();
      save();
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [save, surface]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(compilation.document ?? document, null, 2)], {
      type: 'application/json',
    });
    const link = Object.assign(documentElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'form.a3s.json',
    });
    link.click();
    URL.revokeObjectURL(link.href);
    showNotice('表单 JSON 已导出。');
  };

  const importJson = async (file: File) => {
    try {
      const input: unknown = JSON.parse(await file.text());
      const result = compileForm(input, { capabilities: playgroundCapabilities });
      if (!result.ok || !result.document) {
        showNotice(
          `导入失败：${result.diagnostics[0]?.message ?? '文件不是有效的 A3S Form 文档。'}`,
          'error',
        );
        return;
      }
      const timestamp = new Date().toISOString();
      const record = {
        id: createFormId(),
        document: result.document,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setWorkspace((current) => ({
        ...current,
        activeFormId: record.id,
        forms: [record, ...current.forms],
      }));
      setValue(defaultFormValue(result.document));
      setSurface('editor');
      showNotice(`已导入“${result.document.metadata.title}”。`);
    } catch {
      showNotice('导入失败：请选择有效的 JSON 文件。', 'error');
    }
  };

  const handleAction = (actionId: string) => {
    showNotice(actionId === 'submit' ? '申请已提交，正在等待审批。' : '草稿已保存。');
  };

  return (
    <div className={`playground-shell is-${surface}`}>
      {surface !== 'workspace' && (
        <header className="playground-header workspace-header">
          <div className="playground-brand" data-workspace-identity>
            <button
              type="button"
              className="playground-back btn"
              data-size="icon-sm"
              data-variant="ghost"
              aria-label={surface === 'node' ? '返回节点目录' : '返回表单列表'}
              onClick={returnToWorkspace}
            >
              <ProductIcon name="arrow-left" size={19} />
            </button>
            <span className="playground-mark" aria-hidden="true">
              <ProductIcon name={surface === 'node' ? 'template' : 'form'} size={19} />
            </span>
            <span>
              <strong>
                {surface === 'node' ? workflowNode?.display_name : document.metadata.title}
              </strong>
              {surface === 'node' ? (
                <small>
                  {workflowNode?.categoryLabel}
                  <i aria-hidden="true">·</i>
                  A3S FLOW {A3S_FLOW_ENGINE_VERSION}
                </small>
              ) : (
                <small>
                  <span
                    className={`playground-status is-${storageState}`}
                    role="status"
                    aria-live="polite"
                  >
                    <ProductIcon
                      name={
                        storageState === 'saving'
                          ? 'clock'
                          : storageState === 'saved'
                            ? 'check'
                            : 'close'
                      }
                      size={11}
                    />
                    {storageState === 'saving'
                      ? '正在保存'
                      : storageState === 'saved'
                        ? '已保存到本地'
                        : '保存失败'}
                  </span>
                  <i aria-hidden="true">·</i>
                  FORM
                  <i aria-hidden="true">·</i>v{document.revision}
                </small>
              )}
            </span>
          </div>
          <div className="playground-header-actions" data-workspace-actions>
            <a
              aria-label="打开 Form 组件文档"
              className="playground-secondary btn"
              data-variant="secondary"
              href="https://a3s-lab.github.io/UI/components/form-system/"
              target="_blank"
              rel="noreferrer"
            >
              <ProductIcon name="book" size={15} />
              <span>帮助</span>
            </a>
            {surface === 'editor' && (
              <>
                <button
                  aria-label="导出表单"
                  type="button"
                  className="playground-secondary btn"
                  data-variant="secondary"
                  onClick={exportJson}
                >
                  <ProductIcon name="download" size={15} />
                  <span>导出</span>
                </button>
                <button
                  aria-label={storageState === 'error' ? '重试保存表单' : '保存表单'}
                  aria-keyshortcuts="Control+S Meta+S"
                  type="button"
                  className={`playground-primary btn is-${storageState}`}
                  data-variant="primary"
                  onClick={save}
                >
                  <ProductIcon
                    name={
                      storageState === 'saving'
                        ? 'clock'
                        : storageState === 'saved'
                          ? 'check'
                          : 'save'
                    }
                    size={15}
                  />
                  <span>
                    {storageState === 'saving'
                      ? '保存中'
                      : storageState === 'saved'
                        ? '已保存'
                        : '重试保存'}
                  </span>
                </button>
              </>
            )}
          </div>
        </header>
      )}

      <WorkspaceView
        active={surface === 'workspace'}
        forms={workspace.forms}
        workflowNodes={playgroundWorkflowNodes}
        storageAvailable={storageAvailable}
        onOpen={openForm}
        onOpenWorkflowNode={openWorkflowNode}
        onCreate={createForm}
        onImport={importJson}
      />
      {surface === 'node' && workflowNode && workflowDagNode ? (
        <WorkflowNodeWorkspace
          dagNode={workflowDagNode}
          manifest={workflowNode}
          onChange={setWorkflowDagNode}
          onApply={() => showNotice(`${workflowNode.display_name} configuration applied.`)}
          onReset={() => showNotice(`${workflowNode.display_name} reset to manifest defaults.`)}
          onRequestConnection={({ inputTypes }) =>
            showNotice(
              inputTypes.length > 0
                ? `Connection request: ${inputTypes.join(', ')}`
                : 'Connection request sent to the host.',
            )
          }
          onRefreshField={() => showNotice('Field refresh request sent to the host.')}
          onCopyField={({ value: fieldValue }) => void copyWorkflowField(fieldValue)}
          onDataDisplayAction={({ buttonText }) =>
            showNotice(`${buttonText} action sent to the host.`)
          }
        />
      ) : surface === 'editor' ? (
        <main className="playground-editor">
          <FormDesigner
            document={compilation.document ?? document}
            onChange={updateDocument}
            value={value}
            onValueChange={setValue}
            onAction={handleAction}
            compileOptions={{ capabilities: playgroundCapabilities }}
            hostAdapter={playgroundHostAdapter}
            nodeRegistry={playgroundNodeRegistry}
            wizardCheckpoints={activeRecord ? wizardCheckpointsByForm[activeRecord.id] : undefined}
            onWizardCheckpointChange={({ checkpoint }) => {
              if (!activeRecord) return;
              setWizardCheckpointsByForm((current) => ({
                ...current,
                [activeRecord.id]: {
                  ...current[activeRecord.id],
                  [checkpoint.wizardId]: checkpoint,
                },
              }));
            }}
          />
        </main>
      ) : null}

      {notice && (
        <div
          className={`playground-toast is-${notice.tone}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {notice.message}
        </div>
      )}
    </div>
  );
}

function documentElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return window.document.createElement(tag);
}

const root = window.document.getElementById('root');
if (!root) throw new Error('找不到应用挂载节点。');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
