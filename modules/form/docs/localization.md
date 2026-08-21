# Runtime localization

A3S Form keeps runtime copy separate from the form document. `metadata.locale` selects a built-in catalog, while the embedding host may override product wording without changing the document revision or digest.

The current catalog contract is `a3s.dev/form-locale-catalog/v1`. English and Chinese are built in. Chinese language tags use the Chinese catalog; other unsupported language tags fall back to English.

```tsx
import {
  FORM_LOCALE_CATALOG_API_VERSION,
  type FormLocaleCatalogOverride,
} from '@a3s-lab/ui/form/core';
import { FormRenderer } from '@a3s-lab/ui/form/react';

const localeCatalog: FormLocaleCatalogOverride = {
  apiVersion: FORM_LOCALE_CATALOG_API_VERSION,
  messages: {
    selectPlaceholder: 'Choose a workflow model',
    actionFailed: 'The node was not saved. Check the workflow service and try again.',
  },
};

<FormRenderer
  plan={plan}
  value={value}
  locale="en-US"
  localeCatalog={localeCatalog}
  onChange={setValue}
/>;
```

The same `localeCatalog` input is available on the Vue Renderer and Designer, and as a property on `<a3s-form-renderer>` and `<a3s-form-designer>`. Custom React widgets and runtime node extensions receive the resolved `messages` object.

The catalog covers native control fallback text, repeater controls, data-source states, action progress, validation summaries, synchronous schema validation, and async-validation fallback errors. Labels, descriptions, authored options, action labels, and explicit rule messages remain document content and are not translated automatically.

Treat the override as immutable host configuration. Replacing the object updates the embedded runtime. Do not serialize it into a workflow node value or `FormDocument`.
