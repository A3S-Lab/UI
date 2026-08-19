import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { AgentComposerEditorHandle } from "../../../../src/integrations/tiptap/react.js";
import type { ProductPlaygroundLocale } from "./product-playground-data";

type SpeechRecognitionResultLike = {
  readonly 0?: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = Event & {
  readonly error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

export function useProductComposerSpeech({
  editorRef,
  locale,
  setStatus,
}: {
  editorRef: RefObject<AgentComposerEditorHandle | null>;
  locale: ProductPlaygroundLocale;
  setStatus: Dispatch<SetStateAction<string>>;
}) {
  const zh = locale === "zh";
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechOutcomeRef = useRef<"captured" | "error" | "idle" | "stopped">(
    "idle",
  );
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (!recognition) return;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.abort();
    };
  }, []);

  const toggleSpeechInput = () => {
    if (listening) {
      speechOutcomeRef.current = "stopped";
      recognitionRef.current?.stop();
      setListening(false);
      setStatus(zh ? "语音输入已停止。" : "Voice input stopped.");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setStatus(
        zh
          ? "当前浏览器不支持语音输入，请继续使用键盘。"
          : "Voice input is unavailable in this browser. Continue with the keyboard.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = zh ? "zh-CN" : "en-US";
    speechOutcomeRef.current = "idle";
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = Array.from(
        event.results,
        (result) => result[0]?.transcript ?? "",
      )
        .join(" ")
        .trim();
      if (!transcript) return;
      speechOutcomeRef.current = "captured";
      const currentValue = editorRef.current?.getMarkdown() ?? "";
      editorRef.current?.insertContent(
        `${currentValue.trim() ? " " : ""}${transcript}`,
      );
      setStatus(zh ? "语音内容已加入任务。" : "Voice input added.");
    };
    recognition.onerror = (event) => {
      speechOutcomeRef.current = "error";
      setListening(false);
      recognitionRef.current = null;
      const permissionDenied =
        event.error === "not-allowed" || event.error === "service-not-allowed";
      setStatus(
        permissionDenied
          ? zh
            ? "麦克风权限未开启，请在浏览器设置中允许后重试。"
            : "Microphone permission is blocked. Allow it in browser settings and try again."
          : zh
            ? "没有识别到语音，请重试或使用键盘。"
            : "No speech was recognized. Try again or use the keyboard.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (speechOutcomeRef.current === "idle") {
        setStatus(
          zh
            ? "没有识别到语音，请重试或使用键盘。"
            : "No speech was recognized. Try again or use the keyboard.",
        );
      }
    };
    try {
      recognition.start();
      setListening(true);
      setStatus(zh ? "正在聆听…" : "Listening…");
    } catch {
      recognitionRef.current = null;
      speechOutcomeRef.current = "error";
      setListening(false);
      setStatus(
        zh
          ? "暂时无法启动语音输入，请重试。"
          : "Voice input could not start. Try again.",
      );
    }
  };

  return {
    listening,
    speechSupported,
    toggleSpeechInput,
  };
}
