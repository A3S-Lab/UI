import type { CSSProperties, ReactNode } from 'react';
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

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.3;
const ZOOM_STEP = 0.1;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(1))));
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
  const [zoom, setZoom] = useState(1);
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
        zoomControls: '画布缩放',
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
        zoomControls: 'Canvas zoom',
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
      data-zoom={Math.round(zoom * 100)}
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
          <div
            className="a3s-doc-workflow-studio__node"
            style={{ '--workflow-studio-zoom': zoom } as CSSProperties}
            onDoubleClick={(event) => event.stopPropagation()}
          >
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

          <div
            className="a3s-doc-workflow-studio__zoom"
            role="group"
            aria-label={copy.zoomControls}
          >
            <button
              type="button"
              aria-label={copy.zoomOut}
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
            >
              −
            </button>
            <output aria-live="polite">{Math.round(zoom * 100)}%</output>
            <button
              type="button"
              aria-label={copy.zoomIn}
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
            >
              +
            </button>
            <button
              type="button"
              aria-label={copy.fit}
              disabled={zoom === 1}
              onClick={() => setZoom(1)}
            >
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
