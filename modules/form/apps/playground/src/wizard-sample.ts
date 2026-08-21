import type { FormDocument } from '../../../src/core';
import type { PlaygroundWorkspaceSeed } from './workspace';

export const organizationOnboardingWizard: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: {
    title: '组织入驻向导',
    description: '分步填写组织资料，企业账号会增加认证步骤。',
    locale: 'zh-CN',
    tags: ['向导', '条件分支', '宿主检查点'],
    owner: 'A3S Form',
  },
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      workspaceName: { type: 'string', minLength: 2, maxLength: 64 },
      organizationType: { type: 'string', enum: ['personal', 'enterprise'] },
      registrationNumber: { type: 'string', minLength: 6, maxLength: 32 },
      email: { type: 'string', format: 'email' },
    },
    required: ['workspaceName', 'organizationType', 'registrationNumber', 'email'],
    additionalProperties: false,
    default: {
      organizationType: 'personal',
    },
  },
  ui: {
    root: 'onboarding-root',
    nodes: [
      {
        id: 'onboarding-root',
        kind: 'root',
        children: ['onboarding-wizard'],
      },
      {
        id: 'onboarding-wizard',
        kind: 'group',
        label: '创建组织空间',
        description: '每一步独立校验；返回修改不会丢失已填内容。',
        layout: 'wizard',
        children: ['identity-page', 'verification-page', 'contact-page', 'review-page'],
      },
      {
        id: 'identity-page',
        kind: 'group',
        label: '基本资料',
        description: '先确定空间名称和组织类型。',
        layout: 'page',
        pageRole: 'form',
        children: ['workspace-name', 'organization-type'],
      },
      {
        id: 'workspace-name',
        kind: 'field',
        label: '空间名称',
        schemaPath: '/properties/workspaceName',
        placeholder: '例如：产品研发组',
      },
      {
        id: 'organization-type',
        kind: 'field',
        label: '组织类型',
        schemaPath: '/properties/organizationType',
        widget: 'radio',
        options: [
          { label: '个人团队', value: 'personal' },
          { label: '企业组织', value: 'enterprise' },
        ],
      },
      {
        id: 'verification-page',
        kind: 'group',
        label: '企业认证',
        description: '企业组织需要填写统一登记号。',
        layout: 'page',
        pageRole: 'form',
        children: ['registration-number'],
      },
      {
        id: 'registration-number',
        kind: 'field',
        label: '企业登记号',
        schemaPath: '/properties/registrationNumber',
        placeholder: '请输入登记号',
      },
      {
        id: 'contact-page',
        kind: 'group',
        label: '联系方式',
        description: '用于接收入驻结果和重要通知。',
        layout: 'page',
        pageRole: 'form',
        children: ['contact-email'],
      },
      {
        id: 'contact-email',
        kind: 'field',
        label: '联系邮箱',
        schemaPath: '/properties/email',
        widget: 'email',
        placeholder: 'name@example.com',
      },
      {
        id: 'review-page',
        kind: 'group',
        label: '确认提交',
        description: '检查资料后创建组织空间。',
        layout: 'page',
        pageRole: 'review',
        children: [],
      },
    ],
  },
  rules: [
    {
      id: 'show-enterprise-verification',
      target: 'verification-page',
      kind: 'visible',
      expression: {
        op: 'eq',
        left: { op: 'field', path: 'organizationType' },
        right: { op: 'literal', value: 'enterprise' },
      },
    },
  ],
  dataSources: [],
  actions: [
    {
      id: 'save-draft',
      registryKey: 'host.save-draft.v1',
      label: '保存草稿',
      tone: 'secondary',
    },
    {
      id: 'create-organization',
      registryKey: 'host.submit.v1',
      label: '创建组织空间',
      tone: 'primary',
    },
  ],
};

export const wizardFormSeed: PlaygroundWorkspaceSeed = {
  id: 'organization-onboarding-wizard',
  seedVersion: 1,
  document: organizationOnboardingWizard,
};
