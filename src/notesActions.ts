import matter = require("gray-matter");
import {
  Position,
  Range,
  SnippetString,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
} from "vscode";
import { uniq } from "./utils";
import yaml = require("yaml");
const parse = require("markdown-to-ast").parse;

export function createNote() {
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

export async function addTagNote() {
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

export function updateFrontMatter(editor: TextEditor, matterData: any): void {
  const content = editor.document.getText();

  const ast = parse(content);

  const titles = ast.children.filter(
    (c: any) => c.type === "Header" && c.depth === 1
  );

  if (titles.length > 0) {
    const raw = titles[0].raw as string;
    // not support other syntax than `# title`
    if (!raw.startsWith("# ")) {
      return;
    }
    matterData.title = raw.replace("# ", "");
  }

  const oldMatterNode = ast.children.filter((c: any) => c.type === "Yaml")[0];

  const newMatter = `---\n${yaml.stringify(matterData)}---`;

  if (oldMatterNode === undefined) {
    const snippet = new SnippetString(`${newMatter}\n`);
    editor.insertSnippet(snippet);
  } else {
    const firstMatterPosition = editor.document.positionAt(
      oldMatterNode.range[0]
    );
    const secondMatterPosition = editor.document.positionAt(
      oldMatterNode.range[1]
    );
    const range = new Range(firstMatterPosition, secondMatterPosition);

    editor.edit((editBuilder) => editBuilder.replace(range, newMatter));
  }
}

export function deleteNote() {
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
