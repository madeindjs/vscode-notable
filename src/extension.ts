import matter = require("gray-matter");
import {
  commands,
  ExtensionContext,
  TextDocumentWillSaveEvent,
  window,
  workspace,
} from "vscode";
import {
  addTagNote,
  createNote,
  deleteNote,
  searchNote,
  updateFrontMatter,
} from "./notesActions";

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
    commands.registerCommand("notable.createNote", createNote),
    commands.registerCommand("notable.addTagNote", addTagNote),
    commands.registerCommand("notable.safeDeleteNote", deleteNote),
    commands.registerCommand("notable.searchNote", searchNote)
  );
}

export function deactivate() {}
