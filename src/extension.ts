import matter = require("gray-matter");
import {
  commands,
  ExtensionContext,
  Position,
  QuickPickItem,
  TextDocumentWillSaveEvent,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
} from "vscode";
import {MarkdownDocument} from "./markdownDocument";
import {
  getMarkdownFiles,
  isMarkdownFileMatchContent,
  isMarkdownFileMatchTag,
  markdownFileToQuickPickItem,
  parseQuery,
  uniq,
  updateFrontMatter,
} from "./utils";

function createNote() {
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

async function searchNote() {
  const queryStr = await window.showInputBox({
    prompt: "What do you search",
    placeHolder: "#tag content",
  });

  if (queryStr === undefined) {
    return;
  }

  const query = parseQuery(queryStr);

  const markdownFiles = await getMarkdownFiles({showProgress: true});

  const matchingMarkdownFiles = markdownFiles
    .filter((document) => isMarkdownFileMatchTag(document, query.tags))
    .filter((document) => isMarkdownFileMatchContent(document, query.content));

  if (matchingMarkdownFiles.length === 0) {
    window.showErrorMessage("Cannot find any notes matching this query");
    return;
  }

  const quickPickItems: QuickPickItem[] = matchingMarkdownFiles.map((doc) => markdownFileToQuickPickItem(doc));

  const selected = await window.showQuickPick<QuickPickItem>(quickPickItems);

  if (selected === undefined) {
    return;
  }

  const selectedMarkdownFile = matchingMarkdownFiles.find((d) => d.path.endsWith(selected.label));

  if (selectedMarkdownFile === undefined) {
    window.showErrorMessage("Oops. Could not find matching file");
  } else {
    const document = await workspace.openTextDocument(Uri.file(selectedMarkdownFile.path));
    await window.showTextDocument(document);
  }
}

async function addTagNote() {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    window.showErrorMessage("Please open an editor");
    return;
  }
  const content = editor.document.getText();
  const {data} = matter(content);

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

function deleteNote() {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    window.showErrorMessage("Please open an editor");
    return;
  }

  const content = editor.document.getText();
  const {data} = matter(content);

  if (data.deleted === true) {
    delete data.deleted;
  } else {
    data.deleted = true;
  }

  updateFrontMatter(editor, data);
}

workspace.onWillSaveTextDocument(({document}: TextDocumentWillSaveEvent) => {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    return;
  }

  if (document.languageId === "markdown" && document.uri.path === editor.document.uri.path) {
    const markdownDocument = new MarkdownDocument(document);
    markdownDocument.save();
  }
});

export async function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("notable.createNote", createNote),
    commands.registerCommand("notable.addTagNote", addTagNote),
    commands.registerCommand("notable.safeDeleteNote", deleteNote),
    commands.registerCommand("notable.searchNote", searchNote)
  );
}

export function deactivate() {}
