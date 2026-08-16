import type { Editor, Extension } from "@tiptap/core";
import type { DefineComponent, Ref } from "vue";

export interface AgentComposerTrigger {
  kind: "command" | "file" | "skill";
  query: string;
  from: number;
  to: number;
}

export interface AgentComposerEditorOptions {
  activeSuggestionId?: string | Ref<string | undefined>;
  ariaLabel?: string | Ref<string | undefined>;
  defaultValue?: string | Ref<string | undefined>;
  disabled?: boolean | Ref<boolean>;
  extensions?: Extension[];
  onChange?: (markdown: string, editor: Editor) => void;
  onReady?: (editor: Editor) => void;
  onSubmit?: (markdown: string, event: KeyboardEvent) => void;
  onSuggestionKeyDown?: (event: KeyboardEvent) => boolean;
  onTriggerChange?: (trigger: AgentComposerTrigger | null) => void;
  placeholder?: string | Ref<string | undefined>;
  starterKit?: Record<string, unknown>;
  suggestionsId?: string | Ref<string | undefined>;
  suggestionsOpen?: boolean | Ref<boolean>;
  value?: string | Ref<string | undefined>;
}

export interface AgentComposerEditorHandle {
  clear(): void;
  editor: Ref<Editor | undefined>;
  focus(): void;
  getMarkdown(): string;
  insertContent(content: string | Record<string, unknown>): boolean;
  replaceTrigger(trigger: AgentComposerTrigger, replacement?: string): boolean;
  setMarkdown(value: string, emitUpdate?: boolean): boolean;
}

export interface AgentComposerEditorProps {
  activeSuggestionId?: string;
  ariaLabel?: string;
  defaultValue?: string;
  disabled?: boolean;
  extensions?: Extension[];
  modelValue?: string;
  placeholder?: string;
  starterKit?: Record<string, unknown>;
  suggestionsId?: string;
  suggestionsOpen?: boolean;
}

export function findAgentComposerTrigger(
  textBeforeCursor: string,
  cursor: number,
): AgentComposerTrigger | null;
export function useAgentComposerEditor(
  options?: AgentComposerEditorOptions,
): AgentComposerEditorHandle;
export const AgentComposerEditor: DefineComponent<AgentComposerEditorProps>;
