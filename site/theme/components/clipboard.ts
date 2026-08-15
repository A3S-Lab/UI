export async function writeClipboardText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Privacy-restricted browsers may expose Clipboard without allowing it.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  Object.assign(textarea.style, {
    inset: "0 auto auto -9999px",
    opacity: "0",
    position: "fixed",
  });
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("The browser rejected the clipboard operation.");
    }
  } finally {
    textarea.remove();
  }
}
