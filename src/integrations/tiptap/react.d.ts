import type { Editor, Extension } from "@tiptap/core";
import type { HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from "react";

export interface AgentComposerTrigger {
  kind: "command" | "file" | "skill";
  query: string;
  from: number;
  to: number;
}

export interface AgentComposerEditorOptions {
  activeSuggestionId?: string;
  ariaLabel?: string;
  defaultValue?: string;
  disabled?: boolean;
  extensions?: Extension[];
  onChange?: (markdown: string, editor: Editor) => void;
  onReady?: (editor: Editor) => void;
  onSubmit?: (markdown: string, event: globalThis.KeyboardEvent) => void;
  onSuggestionKeyDown?: (event: globalThis.KeyboardEvent) => boolean;
  onTriggerChange?: (trigger: AgentComposerTrigger | null) => void;
  placeholder?: string;
  starterKit?: Record<string, unknown>;
  suggestionsId?: string;
  suggestionsOpen?: boolean;
  value?: string;
}

export interface AgentComposerEditorHandle {
  clear(): void;
  editor: Editor | null;
  focus(): void;
  getMarkdown(): string;
  insertContent(content: string | Record<string, unknown>): boolean;
  replaceTrigger(trigger: AgentComposerTrigger, replacement?: string): boolean;
  setMarkdown(value: string, emitUpdate?: boolean): boolean;
}

export type AgentComposerEditorProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "defaultValue" | "onChange" | "onSubmit"
> & AgentComposerEditorOptions;

export function findAgentComposerTrigger(
  textBeforeCursor: string,
  cursor: number,
): AgentComposerTrigger | null;
export function useAgentComposerEditor(
  options?: AgentComposerEditorOptions,
): AgentComposerEditorHandle;
export const AgentComposerEditor: ForwardRefExoticComponent<
  AgentComposerEditorProps & RefAttributes<AgentComposerEditorHandle>
>;
