import { Extension } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";

const tokenHighlightKey = new PluginKey("a3sAgentComposerTokens");

export const AgentComposerTokenHighlight = Extension.create({
  name: "a3sAgentComposerTokens",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tokenHighlightKey,
        props: {
          decorations(state) {
            const decorations = [];
            state.doc.descendants((node, position) => {
              if (
                !node.isText ||
                !node.text ||
                node.marks.some((mark) => mark.type.name === "code")
              ) {
                return;
              }
              for (const token of composerTokenRanges(node.text)) {
                decorations.push(
                  Decoration.inline(position + token.from, position + token.to, {
                    class: `agent-composer-token agent-composer-token--${token.kind}`,
                    "data-composer-token": token.kind,
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export function createAgentComposerExtensions(options = {}) {
  return [
    StarterKit.configure({
      blockquote: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      ...(options.starterKit || {}),
    }),
    Placeholder.configure({
      placeholder:
        options.placeholder ||
        "Describe the task; use @ for files, $ for skills, or / for commands…",
    }),
    Markdown,
    AgentComposerTokenHighlight,
    ...(options.extensions || []),
  ];
}

export function findAgentComposerTrigger(textBeforeCursor, cursor) {
  const command = textBeforeCursor.match(/^\/([^\s/]*)$/);
  if (command) {
    const query = command[1] || "";
    return {
      kind: "command",
      query,
      from: cursor - query.length - 1,
      to: cursor,
    };
  }

  const match = textBeforeCursor.match(/(?:^|\s)(?:@([^\s@]*)|\$([^\s$]*))$/);
  if (!match) return null;
  const fileQuery = match[1];
  const query = fileQuery ?? match[2] ?? "";
  return {
    kind: fileQuery !== undefined ? "file" : "skill",
    query,
    from: cursor - query.length - 1,
    to: cursor,
  };
}

export function activeAgentComposerTrigger(editor) {
  const { selection } = editor.state;
  if (!selection.empty || !selection.$from.parent.isTextblock) return null;
  if (selection.$from.marks().some((mark) => mark.type.name === "code")) {
    return null;
  }
  const textBeforeCursor = selection.$from.parent.textBetween(
    0,
    selection.$from.parentOffset,
    "\n",
    "\n",
  );
  return findAgentComposerTrigger(textBeforeCursor, selection.from);
}

export function replaceAgentComposerTrigger(editor, trigger, replacement = "") {
  if (!editor || !trigger) return false;
  const chain = editor
    .chain()
    .focus()
    .deleteRange({ from: trigger.from, to: trigger.to });
  if (replacement) chain.insertContent(replacement);
  return chain.run();
}

export function bindAgentComposerInput(editor) {
  if (!editor) return () => {};
  const input = editor.view.dom;
  input.dataset.composerInput = "";
  input.classList.add("agent-composer-editor__content");
  input.getMarkdown = () => editor.getMarkdown();
  input.setMarkdown = (value) =>
    editor.commands.setContent(String(value ?? ""), {
      contentType: "markdown",
      emitUpdate: false,
    });
  input.dataset.markdown = editor.getMarkdown();
  return () => {
    delete input.getMarkdown;
    delete input.setMarkdown;
  };
}

function composerTokenRanges(text) {
  const ranges = [];
  const pattern = /(?:^|[\s([{'“（【])([@$])([\p{L}_][\p{L}\p{N}._/-]*)/gu;
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const marker = match[1];
    const token = `${marker}${match[2]}`;
    const from = match.index + match[0].length - token.length;
    ranges.push({
      from,
      kind: marker === "@" ? "file" : "skill",
      to: from + token.length,
    });
  }
  const command = text.match(/^\/([A-Za-z][\w.-]*)/);
  if (command?.[1]) {
    ranges.push({ from: 0, kind: "command", to: command[1].length + 1 });
  }
  return ranges;
}
