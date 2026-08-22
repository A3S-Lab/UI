import { useLang } from '@rspress/core/runtime';
import { useMemo, useState } from 'react';
import {
  A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE,
  type A3SFlowDagNodeManifest,
  a3sFlowDagNodeManifestCatalog,
  createA3SFlowDagNode,
  getA3SFlowCoreNode,
  localizeA3SFlowCoreNode,
  requireA3SFlowDagNodeManifest,
} from '../../../../modules/form/src/a3s-flow';
import {
  A3SFlowDagNodeConfigurationPanel,
  A3SFlowDagNodePreview,
  type WorkflowNodePreviewStatus,
} from '../../../../modules/form/src/react';
import { DesignerIcon } from '../../../../modules/form/src/react/designer-icons';
import { workflowNodeVisual } from '../../../../modules/form/src/react/workflow-node-visual';
import '../../../../modules/form/src/styles.css';
import '../../../../modules/form/src/a3s-flow.css';
import { WorkflowStudioFrame } from './WorkflowStudioFrame';

const initialType = 'flow.step';
const visibleManifests = a3sFlowDagNodeManifestCatalog.filter((manifest) => !manifest.internal);

function manifestLabel(manifest: A3SFlowDagNodeManifest, locale: string): string {
  const coreNode = getA3SFlowCoreNode(manifest.type);
  return coreNode ? localizeA3SFlowCoreNode(coreNode, locale).display_name : manifest.display_name;
}

function manifestCategoryLabel(manifest: A3SFlowDagNodeManifest, locale: string): string {
  const coreNode = getA3SFlowCoreNode(manifest.type);
  return coreNode ? localizeA3SFlowCoreNode(coreNode, locale).categoryLabel : manifest.categoryLabel;
}

export function A3SFlowDagDemo() {
  const isEnglish = useLang() === 'en';
  const locale = isEnglish ? 'en-US' : 'zh-CN';
  const [query, setQuery] = useState('');
  const [dagNode, setDagNode] = useState(() =>
    createA3SFlowDagNode('docs-flow-step', requireA3SFlowDagNodeManifest(initialType)),
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<WorkflowNodePreviewStatus>('idle');
  const [status, setStatus] = useState(
    isEnglish ? 'Changes update the DAG node preview.' : '修改配置后，DAG 节点预览会同步更新。',
  );
  const manifest = requireA3SFlowDagNodeManifest(dagNode.data.type);
  const selectedLabel = manifestLabel(manifest, locale);
  const filteredManifests = useMemo(
    () =>
      visibleManifests.filter((candidate) =>
        `${manifestLabel(candidate, locale)} ${candidate.type}`
          .toLocaleLowerCase(locale)
          .includes(query.trim().toLocaleLowerCase(locale)),
      ),
    [locale, query],
  );
  const manifestCategories = useMemo(
    () => [
      ...new Map(
        filteredManifests.map((candidate) => [
          candidate.category,
          {
            id: candidate.category,
            label: manifestCategoryLabel(candidate, locale),
            items: filteredManifests.filter((item) => item.category === candidate.category),
          },
        ]),
      ).values(),
    ],
    [filteredManifests, locale],
  );

  const selectNode = (nextType: string) => {
    const nextManifest = requireA3SFlowDagNodeManifest(nextType);
    const nextLabel = manifestLabel(nextManifest, locale);
    setDagNode(createA3SFlowDagNode(`docs-${nextType}`, nextManifest));
    setPanelOpen(true);
    setPaletteOpen(false);
    setNodeStatus('idle');
    setStatus(isEnglish ? `${nextLabel} selected.` : `已选择「${nextLabel}」。`);
  };

  const runNode = () => {
    setNodeStatus('running');
    setStatus(
      isEnglish
        ? `${selectedLabel} is running with the current configuration.`
        : `正在使用当前配置运行「${selectedLabel}」。`,
    );
    window.setTimeout(() => {
      setNodeStatus('success');
      setStatus(
        isEnglish ? `${selectedLabel} completed successfully.` : `「${selectedLabel}」运行成功。`,
      );
    }, 650);
  };

  return (
    <WorkflowStudioFrame
      locale={locale}
      title={`A3S Flow ${A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE.engineVersion}`}
      panelOpen={panelOpen}
      paletteOpen={paletteOpen}
      onOpenPanel={() => setPanelOpen(true)}
      onPaletteOpenChange={setPaletteOpen}
      onRun={runNode}
      status={status}
      palette={
        <div className="a3s-doc-workflow-library">
          <header>
            <DesignerIcon name="search" size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={isEnglish ? 'Search nodes' : '搜索节点'}
              placeholder={isEnglish ? 'Search nodes…' : '搜索节点…'}
            />
          </header>
          <div className="a3s-doc-workflow-library__tabs" role="tablist">
            <button type="button" role="tab" aria-selected="true">
              {isEnglish ? 'Nodes' : '节点'}
            </button>
            <span>
              {visibleManifests.length} · {A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE.runtimeCommands}
            </span>
          </div>
          <div className="a3s-doc-workflow-library__list">
            {manifestCategories.length === 0 && (
              <p>{isEnglish ? 'No matching nodes.' : '没有匹配的节点。'}</p>
            )}
            {manifestCategories.map((category) => (
              <section key={category.id}>
                <h3>{category.label}</h3>
                {category.items.map((candidate) => {
                  const visual = workflowNodeVisual(candidate);
                  return (
                    <button
                      type="button"
                      key={candidate.type}
                      data-node-tone={visual.tone}
                      data-selected={candidate.type === dagNode.data.type || undefined}
                      onClick={() => selectNode(candidate.type)}
                    >
                      <span aria-hidden="true">
                        <DesignerIcon name={visual.icon} size={15} />
                      </span>
                      <span>{manifestLabel(candidate, locale)}</span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      }
      node={
        <A3SFlowDagNodePreview
          dagNode={dagNode}
          manifest={manifest}
          locale={locale}
          status={nodeStatus}
          selected={panelOpen}
          onSelect={() => setPanelOpen(true)}
        />
      }
      inspector={
        <A3SFlowDagNodeConfigurationPanel
          dagNode={dagNode}
          manifest={manifest}
          onChange={setDagNode}
          locale={locale}
          onClose={() => setPanelOpen(false)}
          onRun={runNode}
          lastRun={
            <div className="a3s-doc-workflow-run-result" data-status={nodeStatus}>
              <strong>{isEnglish ? 'Latest result' : '最近结果'}</strong>
              <p>
                {nodeStatus === 'success'
                  ? isEnglish
                    ? 'The selected DAG node completed successfully.'
                    : '当前 DAG 节点已成功完成。'
                  : isEnglish
                    ? 'Run the node to inspect its latest result.'
                    : '运行节点后可在这里查看最近结果。'}
              </p>
            </div>
          }
          onApply={() =>
            setStatus(
              isEnglish
                ? `${selectedLabel} configuration applied.`
                : `已应用「${selectedLabel}」配置。`,
            )
          }
          onReset={() =>
            setStatus(
              isEnglish
                ? `${selectedLabel} reset to defaults.`
                : `已恢复「${selectedLabel}」默认配置。`,
            )
          }
          onRequestConnection={() =>
            setStatus(
              isEnglish
                ? 'The host must provide a connection picker for this input.'
                : '这个输入需要由宿主提供连接选择器。',
            )
          }
        />
      }
    />
  );
}

/** @deprecated Use the Flow 1.0 DAG demo name in new documentation. */
export const A3SFlowCoreDemo = A3SFlowDagDemo;
