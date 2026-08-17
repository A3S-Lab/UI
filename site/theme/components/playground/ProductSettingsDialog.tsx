import { useEffect, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  ProductSettingsSectionContent,
  settingsSections,
  type SettingsSection,
} from "./ProductSettingsSections";

export function ProductSettingsDialog({
  initialSection,
  locale,
  onClose,
  open,
}: {
  initialSection: SettingsSection;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  open: boolean;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<SettingsSection>(initialSection);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setSection(initialSection);
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (dialog.open) dialog.close();
  }, [initialSection, open]);

  return (
    <dialog
      aria-label={zh ? "设置" : "Settings"}
      className="product-settings"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <aside aria-label={zh ? "设置分组" : "Settings sections"}>
        {settingsSections.map((item) => (
          <button
            aria-current={section === item.id ? "page" : undefined}
            key={item.id}
            onClick={() => setSection(item.id)}
            type="button"
          >
            <ProductPlaygroundIcon name={item.icon} />
            {item.label[locale]}
          </button>
        ))}
      </aside>
      <main>
        <ProductSettingsSectionContent locale={locale} section={section} />
      </main>
      <button
        aria-label={zh ? "关闭设置" : "Close settings"}
        className="product-settings__close"
        onClick={onClose}
        type="button"
      >
        <ProductPlaygroundIcon name="close" />
      </button>
    </dialog>
  );
}
