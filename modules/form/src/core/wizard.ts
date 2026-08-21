import type {
  CompiledNode,
  FormPlan,
  FormWizardCheckpoint,
  FormWizardCheckpointResult,
} from './types';

export const FORM_WIZARD_CHECKPOINT_API_VERSION =
  'a3s.dev/form-wizard-checkpoint/v1alpha1' as const;

interface WizardDefinition {
  wizard: CompiledNode;
  pages: readonly CompiledNode[];
}

interface WizardTopology {
  definitions: readonly WizardDefinition[];
  pageByNodeId: ReadonlyMap<string, string>;
  wizardById: ReadonlyMap<string, WizardDefinition>;
}

const topologyCache = new WeakMap<FormPlan, WizardTopology>();

function buildWizardTopology(plan: FormPlan): WizardTopology {
  const wizardById = new Map<string, WizardDefinition>();
  const pageByNodeId = new Map<string, string>();
  const definitions = plan.nodes
    .filter((node) => node.layout === 'wizard')
    .map((wizard) => {
      const pages = (wizard.children ?? [])
        .map((id) => plan.nodeById[id])
        .filter((node): node is CompiledNode => node?.layout === 'page');
      const definition = { wizard, pages };
      wizardById.set(wizard.id, definition);
      for (const page of pages) {
        const pending = [page.id];
        const visited = new Set<string>();
        while (pending.length > 0) {
          const nodeId = pending.pop();
          if (!nodeId || visited.has(nodeId)) continue;
          visited.add(nodeId);
          pageByNodeId.set(nodeId, page.id);
          pending.push(...(plan.nodeById[nodeId]?.children ?? []));
        }
      }
      return definition;
    });
  return { definitions, pageByNodeId, wizardById };
}

function wizardTopology(plan: FormPlan): WizardTopology {
  const cached = topologyCache.get(plan);
  if (cached) return cached;
  const topology = buildWizardTopology(plan);
  topologyCache.set(plan, topology);
  return topology;
}

function pathsShareHierarchy(template: string, path: string): boolean {
  if (!template || !path) return false;
  const templateSegments = template.split('.');
  const pathSegments = path.split('.');
  const sharedLength = Math.min(templateSegments.length, pathSegments.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const expected = templateSegments[index];
    if (expected !== '*' && expected !== pathSegments[index]) return false;
  }
  return true;
}

export function formWizardDefinitions(plan: FormPlan): readonly WizardDefinition[] {
  return wizardTopology(plan).definitions;
}

export function formWizardPages(plan: FormPlan, wizardId: string): readonly CompiledNode[] {
  return wizardTopology(plan).wizardById.get(wizardId)?.pages ?? [];
}

export function formWizardPageForNode(plan: FormPlan, nodeId: string): string | undefined {
  return wizardTopology(plan).pageByNodeId.get(nodeId);
}

export interface FormWizardValuePathOwners {
  pageIds: readonly string[];
  outsideWizard: boolean;
}

export function formWizardValuePathOwners(plan: FormPlan, path: string): FormWizardValuePathOwners {
  const topology = wizardTopology(plan);
  const pageIds = new Set<string>();
  let outsideWizard = false;
  for (const node of plan.nodes) {
    const template = node.valuePathTemplate ?? node.valuePath;
    if (!template || !pathsShareHierarchy(template, path)) continue;
    const pageId = topology.pageByNodeId.get(node.id);
    if (pageId) pageIds.add(pageId);
    else outsideWizard = true;
  }
  return { pageIds: [...pageIds], outsideWizard };
}

export function valuePathBelongsToWizardPage(
  plan: FormPlan,
  pageId: string,
  path: string,
): boolean {
  return formWizardValuePathOwners(plan, path).pageIds.includes(pageId);
}

export function formWizardPageForValuePath(plan: FormPlan, path: string): string | undefined {
  return formWizardValuePathOwners(plan, path).pageIds[0];
}

function checkpointFailure(
  code: Exclude<FormWizardCheckpointResult, { ok: true }>['code'],
  message: string,
): FormWizardCheckpointResult {
  return { ok: false, code, message };
}

export function createFormWizardCheckpoint(
  plan: FormPlan,
  wizardId: string,
  pageId: string,
  completedPageIds: readonly string[] = [],
): FormWizardCheckpointResult {
  const pages = formWizardPages(plan, wizardId);
  if (pages.length === 0) {
    return checkpointFailure('wizard_missing', `Wizard ${wizardId} is not present in this plan.`);
  }
  if (!pages.some((page) => page.id === pageId)) {
    return checkpointFailure(
      'page_missing',
      `Page ${pageId} does not belong to wizard ${wizardId}.`,
    );
  }
  const requestedCompletedPages = new Set(completedPageIds);
  const missingCompletedPage = completedPageIds.find(
    (candidate) => !pages.some((page) => page.id === candidate),
  );
  if (missingCompletedPage) {
    return checkpointFailure(
      'completed_page_missing',
      `Completed page ${missingCompletedPage} does not belong to wizard ${wizardId}.`,
    );
  }
  return {
    ok: true,
    checkpoint: {
      apiVersion: FORM_WIZARD_CHECKPOINT_API_VERSION,
      sourceDigest: plan.sourceDigest,
      sourceRevision: plan.sourceRevision,
      wizardId,
      pageId,
      completedPageIds: pages
        .filter((page) => requestedCompletedPages.has(page.id))
        .map((page) => page.id),
    },
  };
}

export function restoreFormWizardCheckpoint(
  plan: FormPlan,
  input: unknown,
): FormWizardCheckpointResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return checkpointFailure('invalid_api_version', 'Wizard checkpoint must be an object.');
  }
  const checkpoint = input as Partial<FormWizardCheckpoint>;
  if (checkpoint.apiVersion !== FORM_WIZARD_CHECKPOINT_API_VERSION) {
    return checkpointFailure(
      'invalid_api_version',
      'Wizard checkpoint API version is unsupported.',
    );
  }
  if (checkpoint.sourceDigest !== plan.sourceDigest) {
    return checkpointFailure(
      'digest_mismatch',
      'Wizard checkpoint digest does not match this plan.',
    );
  }
  if (checkpoint.sourceRevision !== plan.sourceRevision) {
    return checkpointFailure(
      'revision_mismatch',
      'Wizard checkpoint revision does not match this plan.',
    );
  }
  if (typeof checkpoint.wizardId !== 'string') {
    return checkpointFailure('wizard_missing', 'Wizard checkpoint does not identify a wizard.');
  }
  if (typeof checkpoint.pageId !== 'string') {
    return checkpointFailure('page_missing', 'Wizard checkpoint does not identify a page.');
  }
  if (
    !Array.isArray(checkpoint.completedPageIds) ||
    checkpoint.completedPageIds.some((pageId) => typeof pageId !== 'string')
  ) {
    return checkpointFailure(
      'completed_page_missing',
      'Wizard checkpoint completed pages are invalid.',
    );
  }
  return createFormWizardCheckpoint(
    plan,
    checkpoint.wizardId,
    checkpoint.pageId,
    checkpoint.completedPageIds as string[],
  );
}
