import type { ReactNode } from 'react';
import { useState } from 'react';
import { DesignerIcon } from '../../../../modules/form/src/react/designer-icons';
import './WorkflowStudioFrame.css';

interface WorkflowStudioFrameProps {
  locale: string;
  node: ReactNode;
  inspector: ReactNode;
  status: string;
  panelOpen: boolean;
  onOpenPanel: () => void;
  onRun: () => void;
  palette?: ReactNode;
  paletteOpen?: boolean;
  onPaletteOpenChange?: (open: boolean) => void;
  title?: string;
}

export function WorkflowStudioFrame({
  inspector,
  locale,
  node,
  onOpenPanel,
  onPaletteOpenChange,
  onRun,
  palette,
  paletteOpen: controlledPaletteOpen,
  panelOpen,
  status,
  title,
}: WorkflowStudioFrameProps) {
  const chinese = locale.toLocaleLowerCase().startsWith('zh');
  const [uncontrolledPaletteOpen, setUncontrolledPaletteOpen] = useState(false);
  const paletteOpen = controlledPaletteOpen ?? uncontrolledPaletteOpen;
  const setPaletteOpen = (open: boolean) => {
    if (controlledPaletteOpen === undefined) setUncontrolledPaletteOpen(open);
    onPaletteOpenChange?.(open);
  };
  const copy = chinese
    ? {
        workflow: '工作流',
        draft: '草稿',
        saved: '已保存',
        run: '运行',
        library: '节点库',
        closeLibrary: '关闭节点库',
        configure: '配置当前节点',
        nodeActions: '当前节点操作',
        zoomOut: '缩小画布',
        zoomIn: '放大画布',
        fit: '适应画布',
      }
    : {
        workflow: 'Workflow',
        draft: 'Draft',
        saved: 'Saved',
        run: 'Run',
        library: 'Node library',
        closeLibrary: 'Close node library',
        configure: 'Configure current node',
        nodeActions: 'Current node actions',
        zoomOut: 'Zoom out',
        zoomIn: 'Zoom in',
        fit: 'Fit canvas',
      };

  const openPanel = () => {
    setPaletteOpen(false);
    onOpenPanel();
  };

  return (
    <section
      className="a3s-doc-workflow-studio"
      data-palette-open={paletteOpen}
      data-panel-open={panelOpen}
      aria-label={title ?? copy.workflow}
    >
      <header className="a3s-doc-workflow-studio__bar">
        <div className="a3s-doc-workflow-studio__trail">
          <span aria-hidden="true" />
          <strong>{title ?? copy.workflow}</strong>
          <i aria-hidden="true">/</i>
          <span>{copy.draft}</span>
        </div>
        <div className="a3s-doc-workflow-studio__actions">
          <span className="a3s-doc-workflow-studio__saved">
            <DesignerIcon name="check-square" size={13} />
            {copy.saved}
          </span>
          {palette && (
            <button
              type="button"
              className="a3s-doc-workflow-studio__library-toggle"
              data-variant="secondary"
              aria-label={copy.library}
              aria-expanded={paletteOpen}
              onClick={() => setPaletteOpen(!paletteOpen)}
            >
              <DesignerIcon name="components" size={14} />
              <span>{copy.library}</span>
            </button>
          )}
          <button type="button" aria-label={copy.run} onClick={onRun}>
            <DesignerIcon name="play" size={14} />
            <span>{copy.run}</span>
          </button>
        </div>
      </header>

      <div className="a3s-doc-workflow-studio__workspace">
        <div className="a3s-doc-workflow-studio__canvas" onDoubleClick={openPanel}>
          <div className="a3s-doc-workflow-studio__node" onDoubleClick={(event) => event.stopPropagation()}>
            <div
              className="a3s-doc-workflow-studio__node-actions"
              role="toolbar"
              aria-label={copy.nodeActions}
            >
              <button type="button" aria-label={copy.configure} onClick={openPanel}>
                <DesignerIcon name="settings" size={14} />
              </button>
              <button type="button" aria-label={copy.run} onClick={onRun}>
                <DesignerIcon name="play" size={14} />
              </button>
            </div>
            {node}
          </div>

          {palette && (
            <aside
              className="a3s-doc-workflow-studio__palette"
              aria-label={copy.library}
              hidden={!paletteOpen}
            >
              <button
                type="button"
                className="a3s-doc-workflow-studio__palette-close"
                aria-label={copy.closeLibrary}
                onClick={() => setPaletteOpen(false)}
              >
                <DesignerIcon name="close" size={15} />
              </button>
              {palette}
            </aside>
          )}

          <div className="a3s-doc-workflow-studio__zoom" role="group" aria-label={copy.fit}>
            <button type="button" aria-label={copy.zoomOut}>−</button>
            <span>100%</span>
            <button type="button" aria-label={copy.zoomIn}>+</button>
            <button type="button" aria-label={copy.fit}>
              <DesignerIcon name="grid" size={14} />
            </button>
          </div>
        </div>

        {panelOpen && <aside className="a3s-doc-workflow-studio__inspector">{inspector}</aside>}

        <p className="a3s-doc-workflow-studio__status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </section>
  );
}
