import { compileForm } from './compiler';
import type { FormDocument } from './types';

export interface CreateFormDocumentOptions {
  title?: string;
  description?: string;
  locale?: string;
}

export function createFormDocument(options: CreateFormDocumentOptions = {}): FormDocument {
  const document: FormDocument = {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 0,
    metadata: {
      title: options.title ?? '未命名表单',
      description: options.description,
      locale: options.locale ?? 'zh-CN',
      tags: [],
    },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        {
          id: 'root',
          kind: 'root',
          label: options.title ?? '未命名表单',
          columns: 12,
          children: [],
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
  const result = compileForm(document);
  return result.document as FormDocument;
}
