import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type JsonObject } from '../../../../modules/form/src/core';
import { FormRenderer } from '../../../../modules/form/src/react';
import '../../../../modules/form/src/styles.css';

const document: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: {
    title: '创建 Workspace',
    description: '配置名称、组织类型和通知地址。',
    locale: 'zh-CN',
  },
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      workspaceName: { type: 'string', minLength: 2, maxLength: 40 },
      organizationType: { type: 'string', enum: ['team', 'enterprise'] },
      contactEmail: { type: 'string', format: 'email' },
    },
    required: ['workspaceName', 'organizationType', 'contactEmail'],
    additionalProperties: false,
  },
  ui: {
    root: 'root',
    nodes: [
      { id: 'root', kind: 'root', children: ['workspace-wizard'] },
      {
        id: 'workspace-wizard',
        kind: 'group',
        label: '创建 Workspace',
        description: '填写内容会在步骤切换时保留。',
        layout: 'wizard',
        children: ['identity-page', 'contact-page', 'review-page'],
      },
      {
        id: 'identity-page',
        kind: 'group',
        label: '基本信息',
        description: '设置 Workspace 名称和组织类型。',
        layout: 'page',
        pageRole: 'form',
        columns: 12,
        children: ['workspace-name', 'organization-type'],
      },
      {
        id: 'workspace-name',
        kind: 'field',
        label: 'Workspace 名称',
        widget: 'text',
        schemaPath: '/properties/workspaceName',
      },
      {
        id: 'organization-type',
        kind: 'field',
        label: '组织类型',
        widget: 'radio',
        schemaPath: '/properties/organizationType',
        options: [
          { label: '团队', value: 'team' },
          { label: '企业', value: 'enterprise' },
        ],
      },
      {
        id: 'contact-page',
        kind: 'group',
        label: '通知设置',
        description: '设置创建结果和运行异常的通知地址。',
        layout: 'page',
        pageRole: 'form',
        columns: 12,
        children: ['contact-email'],
      },
      {
        id: 'contact-email',
        kind: 'field',
        label: '通知邮箱',
        widget: 'email',
        schemaPath: '/properties/contactEmail',
      },
      {
        id: 'review-page',
        kind: 'group',
        label: '确认',
        description: '检查配置后创建 Workspace。',
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
      registryKey: 'docs.create-workspace',
      label: '创建 Workspace',
      tone: 'primary',
    },
  ],
};

const plan = assertCompiled(document);
const initialValue: JsonObject = {
  workspaceName: 'A3S Lab',
  organizationType: 'team',
  contactEmail: 'ops@a3s.dev',
};

export function WizardDemo() {
  const resetValue = useMemo(() => structuredClone(initialValue), []);
  const [value, setValue] = useState<JsonObject>(resetValue);
  const [submitted, setSubmitted] = useState<JsonObject>();
  const [session, setSession] = useState(0);

  return (
    <section className="a3s-doc-field-demo" data-widget="wizard">
      <header>
        <div>
          <strong>实时示例</strong>
          <span>步骤校验 · 返回编辑 · 确认提交</span>
        </div>
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="secondary"
          onClick={() => {
            setValue(structuredClone(resetValue));
            setSubmitted(undefined);
            setSession((current) => current + 1);
          }}
        >
          重置
        </button>
      </header>
      <div className="a3s-doc-field-demo__preview">
        <FormRenderer
          key={session}
          plan={plan}
          value={value}
          onChange={setValue}
          onAction={(_actionId, nextValue) => setSubmitted(structuredClone(nextValue))}
        />
      </div>
      <div className="a3s-doc-field-demo__value">
        <span>{submitted ? '最近提交' : '受控值'}</span>
        <pre aria-live="polite">{JSON.stringify(submitted ?? value, null, 2)}</pre>
      </div>
    </section>
  );
}
