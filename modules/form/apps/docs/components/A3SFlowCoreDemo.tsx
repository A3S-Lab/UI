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
} from '../../../src/a3s-flow';
import { A3SFlowDagNodeConfigurationPanel, A3SFlowDagNodePreview } from '../../../src/react';
import '../../../src/a3s-ui.css';

const initialType = 'flow.step';
const visibleManifests = a3sFlowDagNodeManifestCatalog.filter((manifest) => !manifest.internal);
const manifestCategories = [
  ...new Map(
    visibleManifests.map((manifest) => [
      manifest.category,
      { id: manifest.category, label: manifest.categoryLabel },
    ]),
  ).values(),
];

function manifestLabel(manifest: A3SFlowDagNodeManifest, locale: string): string {
  const coreNode = getA3SFlowCoreNode(manifest.type);
  return coreNode ? localizeA3SFlowCoreNode(coreNode, locale).display_name : manifest.display_name;
}

export function A3SFlowDagDemo() {
  const isEnglish = useLang() === 'en';
  const locale = isEnglish ? 'en-US' : 'zh-CN';
  const [category, setCategory] = useState('all');
  const [dagNode, setDagNode] = useState(() =>
    createA3SFlowDagNode('docs-flow-step', requireA3SFlowDagNodeManifest(initialType)),
  );
  const [status, setStatus] = useState(
    isEnglish ? 'Changes update the DAG node preview.' : '修改配置后，DAG 节点预览会同步更新。',
  );
  const manifest = requireA3SFlowDagNodeManifest(dagNode.data.type);
  const selectedLabel = manifestLabel(manifest, locale);
  const categoryManifests = useMemo(
    () =>
      category === 'all'
        ? visibleManifests
        : visibleManifests.filter((candidate) => candidate.category === category),
    [category],
  );

  const selectNode = (nextType: string) => {
    const nextManifest = requireA3SFlowDagNodeManifest(nextType);
    const nextLabel = manifestLabel(nextManifest, locale);
    setDagNode(createA3SFlowDagNode(`docs-${nextType}`, nextManifest));
    setStatus(isEnglish ? `${nextLabel} selected.` : `已选择「${nextLabel}」。`);
  };

  const selectCategory = (nextCategory: string) => {
    setCategory(nextCategory);
    const nextManifest =
      nextCategory === 'all'
        ? visibleManifests[0]
        : visibleManifests.find((candidate) => candidate.category === nextCategory);
    if (nextManifest) selectNode(nextManifest.type);
  };

  return (
    <section
      className="a3s-doc-langflow-demo"
      aria-label={isEnglish ? 'A3S Flow DAG-node demo' : 'A3S Flow DAG 节点示例'}
    >
      <header className="a3s-doc-langflow-demo-header">
        <div>
          <strong>A3S Flow {A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE.engineVersion}</strong>
          <span>
            {isEnglish
              ? `${visibleManifests.length} visible manifests · ${A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE.runtimeCommands} runtime commands`
              : `${visibleManifests.length} 个可见 manifest · ${A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE.runtimeCommands} 个运行时命令`}
          </span>
        </div>
        <a
          className="btn"
          data-size="sm"
          data-variant="outline"
          href="https://a3s-lab.github.io/UI/form/playground/"
        >
          {isEnglish ? 'Open Playground' : '打开 Playground'}
        </a>
      </header>

      <div className="a3s-doc-langflow-demo-controls" data-control-count="two">
        <label className="field">
          <span>{isEnglish ? 'Category' : '分类'}</span>
          <select
            className="select"
            value={category}
            onChange={(event) => selectCategory(event.target.value)}
          >
            <option value="all">{isEnglish ? 'All DAG nodes' : '全部 DAG 节点'}</option>
            {manifestCategories.map((candidate) => (
              <option value={candidate.id} key={candidate.id}>
                {candidate.label} (
                {visibleManifests.filter((manifest) => manifest.category === candidate.id).length})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{isEnglish ? 'Node' : '节点'}</span>
          <select
            className="select"
            value={dagNode.data.type}
            onChange={(event) => selectNode(event.target.value)}
          >
            {categoryManifests.map((candidate) => (
              <option value={candidate.type} key={candidate.type}>
                {manifestLabel(candidate, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p
        className="a3s-doc-langflow-demo-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {status}
      </p>

      <div className="a3s-doc-langflow-demo-panel a3s-doc-flow-demo-panel">
        <A3SFlowDagNodePreview dagNode={dagNode} manifest={manifest} locale={locale} />
        <A3SFlowDagNodeConfigurationPanel
          dagNode={dagNode}
          manifest={manifest}
          onChange={setDagNode}
          locale={locale}
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
                ? 'Open the Playground to connect this input.'
                : '请在 Playground 中连接这个输入。',
            )
          }
        />
      </div>
    </section>
  );
}

/** @deprecated Use the Flow 1.0 DAG demo name in new documentation. */
export const A3SFlowCoreDemo = A3SFlowDagDemo;
