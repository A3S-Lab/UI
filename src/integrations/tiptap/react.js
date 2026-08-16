import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  activeAgentComposerTrigger,
  bindAgentComposerInput,
  createAgentComposerExtensions,
  findAgentComposerTrigger,
  replaceAgentComposerTrigger,
} from "./shared.js";

export { findAgentComposerTrigger };

export function useAgentComposerEditor(options = {}) {
  const callbacks = useRef(options);
  callbacks.current = options;
  const valueRef = useRef(String(options.value ?? options.defaultValue ?? ""));
  const editor = useEditor({
    immediatelyRender: false,
    extensions: createAgentComposerExtensions(options),
    content: valueRef.current,
    contentType: "markdown",
    editable: options.disabled !== true,
    editorProps: {
      attributes: {
        "aria-label": options.ariaLabel || "Task instruction",
        "aria-multiline": "true",
        class: "agent-composer-editor__content",
        "data-composer-input": "",
        role: "textbox",
      },
      handleKeyDown: (_view, event) => {
        if (callbacks.current.onSuggestionKeyDown?.(event)) return true;
        if (
          event.key !== "Enter" ||
          event.shiftKey ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.isComposing ||
          event.keyCode === 229
        ) {
          return false;
        }
        event.preventDefault();
        const current = callbacks.current;
        if (current.disabled) return true;
        if (current.onSubmit) current.onSubmit(editor?.getMarkdown() || "", event);
        else editor?.view.dom.closest("form")?.requestSubmit();
        return true;
      },
    },
    onCreate: ({ editor: current }) => callbacks.current.onReady?.(current),
    onSelectionUpdate: ({ editor: current }) => {
      callbacks.current.onTriggerChange?.(activeAgentComposerTrigger(current));
    },
    onUpdate: ({ editor: current }) => {
      const value = current.getMarkdown();
      valueRef.current = value;
      current.view.dom.dataset.markdown = value;
      callbacks.current.onChange?.(value, current);
      callbacks.current.onTriggerChange?.(activeAgentComposerTrigger(current));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const unbind = bindAgentComposerInput(editor);
    return unbind;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const disabled = options.disabled === true;
    editor.setEditable(!disabled);
    editor.view.dom.setAttribute("aria-disabled", String(disabled));
  }, [editor, options.disabled]);

  useEffect(() => {
    if (!editor || options.value === undefined) return;
    const value = String(options.value ?? "");
    if (value === editor.getMarkdown()) return;
    valueRef.current = value;
    editor.commands.setContent(value, {
      contentType: "markdown",
      emitUpdate: false,
    });
    editor.view.dom.dataset.markdown = value;
  }, [editor, options.value]);

  useEffect(() => {
    if (!editor) return;
    const input = editor.view.dom;
    const open = options.suggestionsOpen === true;
    input.setAttribute("aria-expanded", String(open));
    if (open && options.suggestionsId) {
      input.setAttribute("aria-controls", options.suggestionsId);
    } else {
      input.removeAttribute("aria-controls");
    }
    if (open && options.activeSuggestionId) {
      input.setAttribute("aria-activedescendant", options.activeSuggestionId);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }, [
    editor,
    options.activeSuggestionId,
    options.suggestionsId,
    options.suggestionsOpen,
  ]);

  return {
    clear: () => editor?.commands.clearContent(),
    editor,
    focus: () => editor?.commands.focus(),
    getMarkdown: () => editor?.getMarkdown() || "",
    insertContent: (content) =>
      editor?.chain().focus().insertContent(content).run() ?? false,
    replaceTrigger: (trigger, replacement = "") =>
      replaceAgentComposerTrigger(editor, trigger, replacement),
    setMarkdown: (value, emitUpdate = false) =>
      editor?.commands.setContent(String(value ?? ""), {
        contentType: "markdown",
        emitUpdate,
      }) ?? false,
  };
}

export const AgentComposerEditor = forwardRef(function AgentComposerEditor(
  {
    activeSuggestionId,
    ariaLabel,
    className,
    defaultValue,
    disabled,
    extensions,
    onChange,
    onReady,
    onSubmit,
    onSuggestionKeyDown,
    onTriggerChange,
    placeholder,
    starterKit,
    suggestionsId,
    suggestionsOpen,
    value,
    ...sectionProps
  },
  ref,
) {
  const control = useAgentComposerEditor({
    activeSuggestionId,
    ariaLabel,
    defaultValue,
    disabled,
    extensions,
    onChange,
    onReady,
    onSubmit,
    onSuggestionKeyDown,
    onTriggerChange,
    placeholder,
    starterKit,
    suggestionsId,
    suggestionsOpen,
    value,
  });
  useImperativeHandle(ref, () => control, [control]);

  return React.createElement(
    "section",
    {
      ...sectionProps,
      "aria-label": ariaLabel ? `${ariaLabel} editor` : "Task instruction editor",
      className: ["agent-composer-editor", className].filter(Boolean).join(" "),
      "data-composer-editor": "",
    },
    control.editor
      ? React.createElement(EditorContent, { editor: control.editor })
      : React.createElement(
          "span",
          { "aria-live": "polite", "data-composer-editor-loading": "", role: "status" },
          "Preparing editor…",
        ),
  );
});
