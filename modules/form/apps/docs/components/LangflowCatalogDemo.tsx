import { useMemo, useState } from 'react';
import type { JsonObject } from '../../../src/core';
import { LangflowNodeConfigurationPanel, LangflowWorkflowNodePreview } from '../../../src/react';
import {
  createLangflowNodeDefaultValue,
  LANGFLOW_CATALOG_PROVENANCE,
  langflowNodeCatalog,
  langflowNodeCategories,
  requireLangflowNode,
} from '../../../src/workflow';
import '../../../src/a3s-ui.css';

const initialType = 'APIRequest';

export function LangflowCatalogDemo() {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [type, setType] = useState(initialType);
  const [value, setValue] = useState<JsonObject>(() =>
    createLangflowNodeDefaultValue(requireLangflowNode(initialType)),
  );
  const [status, setStatus] = useState('Values are controlled by this page.');
  const node = requireLangflowNode(type);
  const visibleNodes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('en');
    return langflowNodeCatalog.filter((candidate) => {
      if (category !== 'all' && candidate.category !== category) return false;
      if (!normalized) return true;
      return `${candidate.display_name} ${candidate.type} ${candidate.description}`
        .toLocaleLowerCase('en')
        .includes(normalized);
    });
  }, [category, query]);
  const selectedVisible = visibleNodes.some((candidate) => candidate.type === type);

  const selectNode = (nextType: string) => {
    if (!nextType) return;
    const nextNode = requireLangflowNode(nextType);
    setType(nextType);
    setValue(createLangflowNodeDefaultValue(nextNode));
    setStatus(`${nextNode.display_name} loaded.`);
  };

  return (
    <section className="a3s-doc-langflow-demo" aria-label="Langflow node catalog demo">
      <header className="a3s-doc-langflow-demo-header">
        <div>
          <strong>Langflow {LANGFLOW_CATALOG_PROVENANCE.version}</strong>
          <span>
            {LANGFLOW_CATALOG_PROVENANCE.categories} categories ·{' '}
            {LANGFLOW_CATALOG_PROVENANCE.nodes} nodes · {LANGFLOW_CATALOG_PROVENANCE.fields} fields
          </span>
        </div>
        <a
          className="btn"
          data-size="sm"
          data-variant="outline"
          href="https://a3s-lab.github.io/UI/form/playground/"
        >
          Open full catalog
        </a>
      </header>

      <div className="a3s-doc-langflow-demo-controls">
        <label className="field">
          <span>Category</span>
          <select
            className="select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {langflowNodeCategories.map((candidate) => (
              <option value={candidate.id} key={candidate.id}>
                {candidate.label} ({candidate.nodes.length})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Search</span>
          <input
            className="input"
            type="search"
            value={query}
            placeholder="Node name or capability"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Node</span>
          <select
            className="select"
            value={selectedVisible ? type : ''}
            onChange={(event) => selectNode(event.target.value)}
          >
            {!selectedVisible && <option value="">Choose a matching node</option>}
            {visibleNodes.map((candidate) => (
              <option value={candidate.type} key={candidate.type}>
                {candidate.display_name} · {candidate.fields.length} fields
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="a3s-doc-langflow-demo-status" role="status">
        {visibleNodes.length} matching nodes · {status}
      </p>

      <div className="a3s-doc-langflow-demo-panel">
        <LangflowWorkflowNodePreview node={node} />
        <LangflowNodeConfigurationPanel
          node={node}
          value={value}
          onChange={setValue}
          onApply={() => setStatus(`${node.display_name} values applied.`)}
          onReset={() => setStatus(`${node.display_name} values reset.`)}
          onRequestConnection={(request) =>
            setStatus(
              `Connection requested for ${request.valuePath ?? request.nodeId}: ${request.inputTypes.join(', ')}.`,
            )
          }
          onRefreshField={(request) =>
            setStatus(`Refresh requested for ${request.valuePath ?? request.nodeId}.`)
          }
          onCopyField={(request) =>
            setStatus(`Copy requested for ${request.valuePath ?? request.nodeId}.`)
          }
          onDataDisplayAction={(request) => setStatus(`${request.buttonText} requested.`)}
        />
      </div>
    </section>
  );
}
