import { useEffect, useRef, useState } from "react";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import type { ProductPlaygroundLocale } from "./product-playground-data";

type ProductSessionFeedback = "helpful" | "unhelpful" | null;

export function ProductSessionMessageActions({
  exportContent,
  locale,
  onOpenArtifacts,
  responseText,
  title,
}: {
  exportContent: readonly string[];
  locale: ProductPlaygroundLocale;
  onOpenArtifacts: (returnFocus: HTMLElement) => void;
  responseText: string;
  title: string;
}) {
  const zh = locale === "zh";
  const [feedback, setFeedback] = useState<ProductSessionFeedback>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("");
  const menuRef = useRef<HTMLDetailsElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      menuRef.current?.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(
    () => () => {
      const utterance = utteranceRef.current;
      if (!utterance) return;
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(responseText);
      setStatus(zh ? "回复已复制" : "Response copied");
    } catch {
      setStatus(zh ? "无法复制回复" : "Unable to copy response");
    }
  };

  const setResponseFeedback = (next: Exclude<ProductSessionFeedback, null>) => {
    const selected = feedback === next ? null : next;
    setFeedback(selected);
    setStatus(
      selected === "helpful"
        ? zh
          ? "已标记为有帮助"
          : "Marked as helpful"
        : selected === "unhelpful"
          ? zh
            ? "已记录改进反馈"
            : "Improvement feedback recorded"
          : zh
            ? "反馈已撤销"
            : "Feedback cleared",
    );
  };

  const toggleSpeech = () => {
    if (
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      setStatus(zh ? "当前浏览器不支持朗读" : "Speech is unavailable");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeaking(false);
      setStatus(zh ? "已停止朗读" : "Reading stopped");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(responseText);
    utterance.lang = zh ? "zh-CN" : "en-US";
    utterance.rate = 0.96;
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeaking(false);
      setStatus(zh ? "朗读完成" : "Reading complete");
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeaking(false);
      setStatus(zh ? "无法朗读回复" : "Unable to read response");
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setStatus(zh ? "正在朗读回复" : "Reading response");
  };

  const saveResponseToMemory = () => {
    try {
      const key = "a3s-playground-saved-responses";
      const stored = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      const items = Array.isArray(stored) ? stored : [];
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            content: responseText,
            savedAt: new Date().toISOString(),
            title,
          },
          ...items,
        ]),
      );
      setStatus(zh ? "回复已保存到记忆" : "Response saved to memory");
    } catch {
      setStatus(
        zh ? "浏览器未允许保存记忆" : "Browser storage is unavailable",
      );
    }
    setMenuOpen(false);
  };

  const exportConversation = () => {
    const body = [`# ${title}`, "", ...exportContent].join("\n\n");
    const href = URL.createObjectURL(
      new Blob([body], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.download = `${title.replace(/[\\/:*?"<>|]/gu, "-")}.md`;
    link.href = href;
    link.click();
    URL.revokeObjectURL(href);
    setStatus(zh ? "会话已导出" : "Conversation exported");
    setMenuOpen(false);
  };

  return (
    <footer className="product-session__message-actions">
      <button
        aria-label={zh ? "复制回复" : "Copy response"}
        onClick={copyResponse}
        title={zh ? "复制" : "Copy"}
        type="button"
      >
        <ProductPlaygroundIcon name="copy" />
      </button>
      <button
        aria-label={zh ? "回复有帮助" : "Helpful response"}
        aria-pressed={feedback === "helpful"}
        onClick={() => setResponseFeedback("helpful")}
        title={zh ? "有帮助" : "Helpful"}
        type="button"
      >
        <ProductPlaygroundIcon name="thumb-up" />
      </button>
      <button
        aria-label={zh ? "回复没有帮助" : "Unhelpful response"}
        aria-pressed={feedback === "unhelpful"}
        onClick={() => setResponseFeedback("unhelpful")}
        title={zh ? "没有帮助" : "Not helpful"}
        type="button"
      >
        <ProductPlaygroundIcon name="thumb-down" />
      </button>
      <button
        aria-label={
          speaking
            ? zh
              ? "停止朗读回复"
              : "Stop reading response"
            : zh
              ? "朗读回复"
              : "Read response aloud"
        }
        aria-pressed={speaking}
        data-speaking={speaking ? "true" : undefined}
        onClick={toggleSpeech}
        title={speaking ? (zh ? "停止朗读" : "Stop") : zh ? "朗读" : "Read"}
        type="button"
      >
        <ProductPlaygroundIcon name="volume" />
      </button>
      <details
        className="product-session__message-menu"
        onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        open={menuOpen}
        ref={menuRef}
      >
        <summary aria-label={zh ? "更多回复操作" : "More response actions"}>
          <ProductPlaygroundIcon name="more" />
        </summary>
        <div role="menu">
          <button
            onClick={() => {
              const summary = menuRef.current?.querySelector<HTMLElement>(
                "summary",
              );
              if (summary) onOpenArtifacts(summary);
              setMenuOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            <ProductPlaygroundIcon name="document" />
            {zh ? "查看交付产物" : "Review deliverables"}
          </button>
          <button onClick={saveResponseToMemory} role="menuitem" type="button">
            <ProductPlaygroundIcon name="brain" />
            {zh ? "保存到记忆" : "Save to memory"}
          </button>
          <button onClick={exportConversation} role="menuitem" type="button">
            <ProductPlaygroundIcon name="download" />
            {zh ? "导出会话" : "Export conversation"}
          </button>
        </div>
      </details>
      <output aria-live="polite">{status}</output>
    </footer>
  );
}
