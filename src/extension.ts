import path = require("path");
import {
  commands,
  ExtensionContext,
  Position,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
} from "vscode";

function getTagsCacheKey(): string {
  const d = new Date();
  return `markdown-tags_${d.getFullYear()}-${
    d.getMonth() + 1
  }-${d.getDay()}T${d.getHours()}:${d.getMinutes()}`;
}

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

export async function activate(context: ExtensionContext) {
  let disposable = commands.registerCommand("notable.createNote", () => {
    return openNewFile();
  });

  context.subscriptions.push(disposable);

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
