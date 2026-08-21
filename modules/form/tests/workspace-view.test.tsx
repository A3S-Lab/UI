import { fireEvent, render, screen } from '@testing-library/react';
import { sampleForm } from '../apps/playground/src/sample';
import { createFormRecord } from '../apps/playground/src/workspace';
import { WorkspaceView } from '../apps/playground/src/workspace-view';
import { a3sFlowDagNodeManifestCatalog } from '../src/a3s-flow';

const workflowNodes = a3sFlowDagNodeManifestCatalog.filter((node) => !node.internal);

describe('Playground WorkspaceView', () => {
  it('composes the workspace and create flow from A3S UI contracts', () => {
    const record = createFormRecord(
      'employee-onboarding',
      sampleForm.metadata.title,
      sampleForm.metadata.description ?? '',
      new Date('2026-08-07T00:00:00.000Z'),
      sampleForm,
    );
    let importedFile = '';
    render(
      <WorkspaceView
        forms={[record]}
        workflowNodes={workflowNodes}
        storageAvailable
        onOpen={() => undefined}
        onOpenWorkflowNode={() => undefined}
        onCreate={() => undefined}
        onImport={(file) => {
          importedFile = file.name;
        }}
      />,
    );

    const workspace = screen.getByRole('main');
    expect(workspace.classList.contains('app-shell')).toBe(true);
    expect(workspace.getAttribute('data-navigation')).toBe('expanded');
    expect(
      screen
        .getByRole('complementary', { name: 'A3S Form 导航' })
        .hasAttribute('data-app-navigation'),
    ).toBe(true);
    expect(workspace.querySelector('[data-app-main]')).toBeTruthy();
    expect(workspace.querySelector('[data-app-content]')).toBeTruthy();

    const createButton = screen.getByRole('button', { name: '新建表单' });
    expect(createButton.classList.contains('btn')).toBe(true);
    expect(createButton.getAttribute('data-variant')).toBe('primary');

    const search = screen.getByRole('textbox', { name: '搜索表单' });
    expect(search.classList.contains('input')).toBe(true);
    expect(search.closest('.playground-search')?.classList.contains('input-group')).toBe(true);
    search.focus();
    expect(window.document.activeElement).toBe(search);

    fireEvent.click(createButton);

    const dialog = screen.getByRole('dialog', { name: '创建表单' });
    expect(dialog.classList.contains('card')).toBe(true);
    expect(screen.getByLabelText('新表单名称').closest('.field')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '创建表单' })).toBeNull();

    const importCard = screen.getByRole('button', { name: /导入表单 JSON/ });
    fireEvent.click(importCard);
    const fileInput = screen.getByLabelText('导入表单 JSON');
    fireEvent.change(fileInput, {
      target: { files: [new File(['{}'], 'imported-form.json', { type: 'application/json' })] },
    });
    expect(importedFile).toBe('imported-form.json');
  });

  it('closes the workspace navigation when the viewport becomes compact', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });

    const record = createFormRecord(
      'employee-onboarding',
      sampleForm.metadata.title,
      sampleForm.metadata.description ?? '',
      new Date('2026-08-07T00:00:00.000Z'),
      sampleForm,
    );
    render(
      <WorkspaceView
        forms={[record]}
        workflowNodes={workflowNodes}
        storageAvailable
        onOpen={() => undefined}
        onOpenWorkflowNode={() => undefined}
        onCreate={() => undefined}
        onImport={() => undefined}
      />,
    );

    const workspace = screen.getByRole('main');
    expect(workspace.getAttribute('data-mobile-navigation')).toBe('open');

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    fireEvent(window, new Event('resize'));

    expect(workspace.getAttribute('data-mobile-navigation')).toBe('closed');
    expect(screen.queryByRole('complementary', { name: 'A3S Form 导航' })).toBeNull();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('lists all catalog nodes by category and opens the selected configuration', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    const record = createFormRecord(
      'employee-onboarding',
      sampleForm.metadata.title,
      sampleForm.metadata.description ?? '',
      new Date('2026-08-07T00:00:00.000Z'),
      sampleForm,
    );
    let opened = '';
    render(
      <WorkspaceView
        forms={[record]}
        workflowNodes={workflowNodes}
        storageAvailable
        onOpen={() => undefined}
        onOpenWorkflowNode={(type) => {
          opened = type;
        }}
        onCreate={() => undefined}
        onImport={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Flow DAG 节点/ }));
    expect(screen.getByRole('heading', { name: 'A3S Flow DAG 节点' })).toBeTruthy();
    expect(screen.getByText('18 / 18 个节点')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Open .+ configuration from .+$/ })).toHaveLength(
      18,
    );
    expect(screen.getByRole('heading', { name: 'Control flow' })).toBeTruthy();

    const first = workflowNodes[0];
    fireEvent.click(
      screen.getByRole('button', {
        name: `Open ${first.display_name} configuration from ${first.categoryLabel}`,
      }),
    );
    expect(opened).toBe(first.type);

    const search = screen.getByRole('textbox', { name: '搜索节点' });
    fireEvent.change(search, { target: { value: 'missing-node-name' } });
    expect(screen.getByText('没有找到“missing-node-name”')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '清除筛选' })[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Task execution 2' }));
    expect(screen.getByText('2 / 18 个节点')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Open .+ configuration from .+$/ })).toHaveLength(
      2,
    );
  });

  it('keeps catalog filters mounted while a node configuration is open', () => {
    const record = createFormRecord(
      'employee-onboarding',
      sampleForm.metadata.title,
      sampleForm.metadata.description ?? '',
      new Date('2026-08-07T00:00:00.000Z'),
      sampleForm,
    );
    const view = (active: boolean) => (
      <WorkspaceView
        active={active}
        forms={[record]}
        workflowNodes={workflowNodes}
        storageAvailable
        onOpen={() => undefined}
        onOpenWorkflowNode={() => undefined}
        onCreate={() => undefined}
        onImport={() => undefined}
      />
    );
    const { rerender } = render(view(true));

    fireEvent.click(screen.getByRole('button', { name: /Flow DAG 节点/ }));
    const search = screen.getByRole('textbox', { name: '搜索节点' }) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Run Step' } });
    expect(search.value).toBe('Run Step');

    rerender(view(false));
    expect(screen.getByRole('main', { hidden: true }).hasAttribute('hidden')).toBe(true);

    rerender(view(true));
    expect((screen.getByRole('textbox', { name: '搜索节点' }) as HTMLInputElement).value).toBe(
      'Run Step',
    );
  });
});
