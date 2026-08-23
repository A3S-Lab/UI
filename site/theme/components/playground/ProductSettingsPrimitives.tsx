import type { ReactNode } from "react";

export function SettingsHeader({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <header className="product-settings__content-header">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

export function SettingsSwitch({
  checked = false,
  disabled = false,
  label,
  onCheckedChange,
}: {
  checked?: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <label className="product-settings__switch">
      <input
        aria-label={label}
        checked={onCheckedChange ? checked : undefined}
        defaultChecked={onCheckedChange ? undefined : checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
        role="switch"
        type="checkbox"
      />
      <span />
    </label>
  );
}

export function SettingsRow({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="product-settings__row">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {children}
    </div>
  );
}

export function announceProductSetting(key: string, value: unknown) {
  document.dispatchEvent(
    new CustomEvent("a3s:playground-settingchange", {
      detail: { key, value },
    }),
  );
}
