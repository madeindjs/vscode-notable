import matter = require("gray-matter");
import path = require("path");
import yaml = require("yaml");
import {
  commands,
  ExtensionContext,
  Position,
  Range,
  SnippetString,
  TextDocumentWillSaveEvent,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
} from "vscode";
import { uniq } from "./utils";

// function getTagsCacheKey(): string {
//   const d = new Date();
//   return `markdown-tags_${d.getFullYear()}-${
//     d.getMonth() + 1
//   }-${d.getDay()}T${d.getHours()}:${d.getMinutes()}`;
// }

function openNewFile() {
  const defaultContent = `---
title: Undefined
tags: []
created: '${new Date().toISOString()}'
modified: '${new Date().toISOString()}'
---

# Undefined

`;
  const newFile = Uri.parse(`untitled:untitled.md`);
  workspace.openTextDocument(newFile).then((document) => {
    const edit = new WorkspaceEdit();
    edit.insert(newFile, new Position(0, 0), defaultContent);
    return workspace.applyEdit(edit).then((success) => {
      if (success) {
        window.showTextDocument(document);
      } else {
        window.showInformationMessage("Error!");
      }
    });
  });
}

async function addTagNote() {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    window.showErrorMessage("Please open an editor");
    return;
  }
  const content = editor.document.getText();
  const { data } = matter(content);

  const oldTags = data.tags ?? [];

  const newTagsStr = await window.showInputBox({
    value: oldTags.join(","),
    prompt: "Enter one or many tags (separated by a comma)",
  });

  if (newTagsStr === undefined) {
    window.showErrorMessage("You don't have write any tags");
    return;
  }

  data.tags = uniq(newTagsStr.split(",").map((t) => t.trim()));

  updateFrontMatter(editor, data);
}

function updateFrontMatter(editor: TextEditor, matterData: Object): void {
  const content = editor.document.getText();
  const newMatter = `---\n${yaml.stringify(matterData)}---`;

  const firstMatter = 0;
  // TODO: prevent interpret separator block
  const secondMatter = content.indexOf("---", firstMatter + 3);

  if (secondMatter) {
    const firstMatterPosition = editor.document.positionAt(firstMatter);
    const secondMatterPosition = editor.document.positionAt(secondMatter + 3);
    const range = new Range(firstMatterPosition, secondMatterPosition);

    editor.edit((editBuilder) => editBuilder.replace(range, newMatter));
  } else {
    const snippet = new SnippetString(newMatter);
    editor.insertSnippet(snippet);
  }
}

function deleteNote() {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    window.showErrorMessage("Please open an editor");
    return;
  }

  const content = editor.document.getText();
  const { data } = matter(content);

  if (data.deleted === true) {
    delete data.deleted;
  } else {
    data.deleted = true;
  }

  updateFrontMatter(editor, data);
}

// Update
workspace.onWillSaveTextDocument(({ document }: TextDocumentWillSaveEvent) => {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    return;
  }

  if (
    document.languageId === "markdown" &&
    document.uri.path === editor.document.uri.path
  ) {
    const content = document.getText();
    const { data } = matter(content);

    data.modified = new Date().toISOString();
    updateFrontMatter(editor, data);
  }
});

export async function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("notable.createNote", openNewFile),
    commands.registerCommand("notable.addTagNote", addTagNote),
    commands.registerCommand("notable.safeDeleteNote", deleteNote)
  );

  // const emojiDiagnostics = languages.createDiagnosticCollection("emoji");
  // context.subscriptions.push(emojiDiagnostics);
  // subscribeToDocumentChanges(context, emojiDiagnostics);

  // const providerCompletion = languages.registerCompletionItemProvider('markdown', {
  //     async provideCompletionItems(document: TextDocument, position: Position) {
  //         // TODO: support multi line syntax
  //         const linePrefix = document.lineAt(position).text.substr(0, position.character);
  //         if (!linePrefix.startsWith('tags:')) {
  //             return undefined;
  //         }

  //         const cacheKey = getTagsCacheKey();
  //         const cache = context.globalState.get<CompletionItem[]>(cacheKey);
  //         if (cache) { return cache; }

  //         const tags = await getTags();
  //         const completions = tags.map(tag => new CompletionItem(tag, CompletionItemKind.Keyword));
  //         await context.globalState.update(cacheKey, completions);
  //         return completions;
  //     }
  // });

  // context.subscriptions.push(disposable, providerCompletion);
}

export function deactivate() {}
