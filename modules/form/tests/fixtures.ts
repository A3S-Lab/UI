import type { FormDocument } from '../src/core';

export function createDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 3,
    metadata: { title: '测试表单' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2 },
        age: { type: 'integer', minimum: 18 },
        active: { type: 'boolean' },
        role: { type: 'string', enum: ['admin', 'member'] },
      },
      required: ['name'],
    },
    ui: {
      root: 'root',
      nodes: [
        {
          id: 'root',
          kind: 'root',
          label: '基础信息',
          children: ['name', 'age', 'active', 'role'],
        },
        {
          id: 'name',
          kind: 'field',
          label: '姓名',
          schemaPath: '/properties/name',
          widget: 'text',
        },
        {
          id: 'age',
          kind: 'field',
          label: '年龄',
          schemaPath: '/properties/age',
          widget: 'number',
          width: 6,
        },
        {
          id: 'active',
          kind: 'field',
          label: '启用',
          schemaPath: '/properties/active',
          widget: 'switch',
        },
        {
          id: 'role',
          kind: 'field',
          label: '角色',
          schemaPath: '/properties/role',
          widget: 'select',
          dataSource: 'roles',
        },
      ],
    },
    dataSources: [{ id: 'roles', registryKey: 'test.roles' }],
    actions: [{ id: 'submit', registryKey: 'test.submit', label: '提交', tone: 'primary' }],
    rules: [
      {
        id: 'show-age',
        target: 'age',
        kind: 'visible',
        expression: { op: 'field', path: 'active' },
      },
    ],
  };
}

export function createObjectRepeaterDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: 'Workflow recipients', locale: 'en-US' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              rowId: { type: 'string' },
              name: { type: 'string', minLength: 1 },
              email: { type: 'string', format: 'email' },
            },
            required: ['rowId', 'name'],
            additionalProperties: false,
          },
        },
      },
      required: ['recipients'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        {
          id: 'root',
          kind: 'root',
          label: 'Notification settings',
          children: ['recipients'],
        },
        {
          id: 'recipients',
          kind: 'repeater',
          label: 'Recipients',
          description: 'People notified by this workflow node.',
          schemaPath: '/properties/recipients',
          itemKey: 'rowId',
          children: ['recipient-name', 'recipient-email'],
        },
        {
          id: 'recipient-name',
          kind: 'field',
          label: 'Name',
          schemaPath: '/properties/recipients/items/properties/name',
          widget: 'text',
          width: 6,
        },
        {
          id: 'recipient-email',
          kind: 'field',
          label: 'Email',
          schemaPath: '/properties/recipients/items/properties/email',
          widget: 'email',
          width: 6,
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [{ id: 'save', registryKey: 'test.save', label: 'Save', tone: 'primary' }],
  };
}

export function createWizardDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 4,
    metadata: {
      title: 'Workspace onboarding',
      description: 'Configure a workspace in three short steps.',
      locale: 'en-US',
    },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        workspaceName: { type: 'string', minLength: 2 },
        organizationType: { type: 'string', enum: ['personal', 'enterprise'] },
        contactEmail: { type: 'string', format: 'email' },
      },
      required: ['workspaceName', 'organizationType', 'contactEmail'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['onboarding'] },
        {
          id: 'onboarding',
          kind: 'group',
          label: 'Create your workspace',
          description: 'Your entries are retained while you move between steps.',
          layout: 'wizard',
          children: ['identity-page', 'contact-page', 'review-page'],
        },
        {
          id: 'identity-page',
          kind: 'group',
          label: 'Workspace',
          description: 'Choose a name and organization type.',
          layout: 'page',
          pageRole: 'form',
          children: ['workspace-name', 'organization-type'],
        },
        {
          id: 'workspace-name',
          kind: 'field',
          label: 'Workspace name',
          schemaPath: '/properties/workspaceName',
          widget: 'text',
        },
        {
          id: 'organization-type',
          kind: 'field',
          label: 'Organization type',
          schemaPath: '/properties/organizationType',
          widget: 'radio',
          options: [
            { label: 'Personal', value: 'personal' },
            { label: 'Enterprise', value: 'enterprise' },
          ],
        },
        {
          id: 'contact-page',
          kind: 'group',
          label: 'Contact',
          description: 'Set the address used for workspace notices.',
          layout: 'page',
          pageRole: 'form',
          children: ['contact-email'],
        },
        {
          id: 'contact-email',
          kind: 'field',
          label: 'Contact email',
          schemaPath: '/properties/contactEmail',
          widget: 'email',
        },
        {
          id: 'review-page',
          kind: 'group',
          label: 'Review',
          description: 'Confirm the values before creating the workspace.',
          layout: 'page',
          pageRole: 'review',
          children: [],
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [
      {
        id: 'create-workspace',
        registryKey: 'test.create-workspace',
        label: 'Create workspace',
        tone: 'primary',
      },
    ],
  };
}

export function createNestedRepeaterDocument(): FormDocument {
  const document = createObjectRepeaterDocument();
  const recipients = document.schema.properties?.recipients;
  const recipientItems = recipients?.items;
  if (!recipientItems?.properties) throw new Error('Missing recipient item schema.');
  recipientItems.properties.channels = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        channelId: { type: 'string' },
        address: { type: 'string', minLength: 1 },
      },
      required: ['channelId', 'address'],
      additionalProperties: false,
    },
  };
  const repeater = document.ui.nodes.find((node) => node.id === 'recipients');
  if (!repeater) throw new Error('Missing recipient repeater node.');
  repeater.children?.push('recipient-channels');
  document.ui.nodes.push(
    {
      id: 'recipient-channels',
      kind: 'repeater',
      label: 'Channels',
      schemaPath: '/properties/recipients/items/properties/channels',
      itemKey: 'channelId',
      children: ['channel-address'],
      width: 12,
    },
    {
      id: 'channel-address',
      kind: 'field',
      label: 'Address',
      schemaPath: '/properties/recipients/items/properties/channels/items/properties/address',
      widget: 'text',
      width: 12,
    },
  );
  return document;
}
