import { EditorContent, useEditor } from "@tiptap/vue-3";
import {
  defineComponent,
  h,
  onMounted,
  toRef,
  toValue,
  watch,
} from "vue";
import {
  activeAgentComposerTrigger,
  bindAgentComposerInput,
  createAgentComposerExtensions,
  findAgentComposerTrigger,
  replaceAgentComposerTrigger,
} from "./shared.js";

export { findAgentComposerTrigger };

export function useAgentComposerEditor(options = {}) {
  const editor = useEditor({
    extensions: createAgentComposerExtensions({
      ...options,
      placeholder: toValue(options.placeholder),
    }),
    content: String(toValue(options.value) ?? toValue(options.defaultValue) ?? ""),
    contentType: "markdown",
    editable: toValue(options.disabled) !== true,
    editorProps: {
      attributes: {
        "aria-label": toValue(options.ariaLabel) || "Task instruction",
        "aria-multiline": "true",
        class: "agent-composer-editor__content",
        "data-composer-input": "",
        role: "textbox",
      },
      handleKeyDown: (_view, event) => {
        if (options.onSuggestionKeyDown?.(event)) return true;
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
        if (toValue(options.disabled)) return true;
        if (options.onSubmit) options.onSubmit(editor.value?.getMarkdown() || "", event);
        else editor.value?.view.dom.closest("form")?.requestSubmit();
        return true;
      },
    },
    onCreate: ({ editor: current }) => options.onReady?.(current),
    onSelectionUpdate: ({ editor: current }) =>
      options.onTriggerChange?.(activeAgentComposerTrigger(current)),
    onUpdate: ({ editor: current }) => {
      const markdown = current.getMarkdown();
      current.view.dom.dataset.markdown = markdown;
      options.onChange?.(markdown, current);
      options.onTriggerChange?.(activeAgentComposerTrigger(current));
    },
  });

  let unbind = () => {};
  onMounted(() => {
    if (editor.value) unbind = bindAgentComposerInput(editor.value);
  });
  watch(editor, (current) => {
    unbind();
    unbind = current ? bindAgentComposerInput(current) : () => {};
  });
  watch(
    () => toValue(options.disabled),
    (disabled) => {
      if (!editor.value) return;
      editor.value.setEditable(disabled !== true);
      editor.value.view.dom.setAttribute("aria-disabled", String(disabled === true));
    },
    { immediate: true },
  );
  watch(
    () => toValue(options.value),
    (value) => {
      if (value === undefined || !editor.value) return;
      const markdown = String(value ?? "");
      if (markdown === editor.value.getMarkdown()) return;
      editor.value.commands.setContent(markdown, {
        contentType: "markdown",
        emitUpdate: false,
      });
      editor.value.view.dom.dataset.markdown = markdown;
    },
  );
  watch(
    () => [
      toValue(options.suggestionsOpen),
      toValue(options.suggestionsId),
      toValue(options.activeSuggestionId),
      editor.value,
    ],
    ([open, suggestionsId, activeSuggestionId, current]) => {
      if (!current) return;
      const input = current.view.dom;
      input.setAttribute("aria-expanded", String(open === true));
      if (open && suggestionsId) input.setAttribute("aria-controls", String(suggestionsId));
      else input.removeAttribute("aria-controls");
      if (open && activeSuggestionId) {
        input.setAttribute("aria-activedescendant", String(activeSuggestionId));
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    },
    { immediate: true },
  );

  return {
    clear: () => editor.value?.commands.clearContent(),
    editor,
    focus: () => editor.value?.commands.focus(),
    getMarkdown: () => editor.value?.getMarkdown() || "",
    insertContent: (content) =>
      editor.value?.chain().focus().insertContent(content).run() ?? false,
    replaceTrigger: (trigger, replacement = "") =>
      replaceAgentComposerTrigger(editor.value, trigger, replacement),
    setMarkdown: (value, emitUpdate = false) =>
      editor.value?.commands.setContent(String(value ?? ""), {
        contentType: "markdown",
        emitUpdate,
      }) ?? false,
  };
}

export const AgentComposerEditor = defineComponent({
  name: "A3SAgentComposerEditor",
  inheritAttrs: false,
  props: {
    activeSuggestionId: String,
    ariaLabel: String,
    defaultValue: String,
    disabled: Boolean,
    extensions: Array,
    modelValue: String,
    placeholder: String,
    starterKit: Object,
    suggestionsId: String,
    suggestionsOpen: Boolean,
  },
  emits: ["ready", "submit", "trigger-change", "update:modelValue"],
  setup(props, { attrs, emit, expose }) {
    const control = useAgentComposerEditor({
      activeSuggestionId: toRef(props, "activeSuggestionId"),
      ariaLabel: toRef(props, "ariaLabel"),
      defaultValue: toRef(props, "defaultValue"),
      disabled: toRef(props, "disabled"),
      extensions: props.extensions,
      onChange: (markdown) => emit("update:modelValue", markdown),
      onReady: (editor) => emit("ready", editor),
      onSubmit: (markdown, event) => emit("submit", markdown, event),
      onTriggerChange: (trigger) => emit("trigger-change", trigger),
      placeholder: toRef(props, "placeholder"),
      starterKit: props.starterKit,
      suggestionsId: toRef(props, "suggestionsId"),
      suggestionsOpen: toRef(props, "suggestionsOpen"),
      value: toRef(props, "modelValue"),
    });
    expose(control);
    return () =>
      h(
        "section",
        {
          ...attrs,
          "aria-label": props.ariaLabel
            ? `${props.ariaLabel} editor`
            : "Task instruction editor",
          class: ["agent-composer-editor", attrs.class],
          "data-composer-editor": "",
        },
        control.editor.value
          ? [h(EditorContent, { editor: control.editor.value })]
          : [
              h(
                "span",
                {
                  "aria-live": "polite",
                  "data-composer-editor-loading": "",
                  role: "status",
                },
                "Preparing editor…",
              ),
            ],
      );
  },
});
