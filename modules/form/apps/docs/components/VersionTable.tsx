import { useLang, useSite } from '@rspress/core/runtime';
import versions from '../versions.json';

const TABLE_LABELS = {
  zh: {
    version: '版本',
    status: '状态',
    entry: '入口',
    stable: '稳定版',
    preview: '开发版',
    default: '默认',
  },
  en: {
    version: 'Version',
    status: 'Status',
    entry: 'Entry',
    stable: 'Stable',
    preview: 'Preview',
    default: 'Default',
  },
} as const;

export function VersionTable() {
  const { site } = useSite();
  const lang = useLang() === 'en' ? 'en' : 'zh';
  const labels = TABLE_LABELS[lang];
  return (
    <table>
      <thead>
        <tr>
          <th>{labels.version}</th>
          <th>{labels.status}</th>
          <th>{labels.entry}</th>
        </tr>
      </thead>
      <tbody>
        {versions.map((version) => (
          <tr key={version.id}>
            <td>
              <code>{version.id}</code>
            </td>
            <td>
              {labels[version.status]}
              {version.default ? ` · ${labels.default}` : ''}
            </td>
            <td>
              <a
                href={`${site.base}${version.default ? '' : `${version.id}/`}${lang === 'en' ? 'en/' : ''}`}
              >
                {lang === 'en' ? version.labelEn : version.label}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
