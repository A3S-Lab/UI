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
  const contentRef = useRef<HTMLElement>(null);
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const closeDialog = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
  };

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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open && dialog?.open) dialog.close();
  });

  useEffect(() => {
    if (!open || !contentRef.current) return;
    contentRef.current.scrollTop = 0;
  }, [open, section]);

  return (
    <dialog
      aria-label={zh ? "设置" : "Settings"}
      className="product-settings"
      data-agent-inspector
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <header className="product-settings__dialog-header">
        <strong className="product-settings__dialog-title">
          {zh ? "设置" : "Settings"}
        </strong>
        <button
          aria-label={zh ? "关闭设置" : "Close settings"}
          className="product-settings__close"
          onClick={closeDialog}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>
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
      <main ref={contentRef}>
        <ProductSettingsSectionContent locale={locale} section={section} />
      </main>
    </dialog>
  );
}
