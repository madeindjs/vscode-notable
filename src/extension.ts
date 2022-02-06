import { commands, ExtensionContext, QuickPickItem, TextDocumentWillSaveEvent, Uri, window, workspace } from "vscode";
import { MarkdownDocument } from "./markdownDocument";
import {
  getMarkdownFiles,
  isMarkdownFileMatchContent,
  isMarkdownFileMatchTag,
  markdownFileToQuickPickItem,
  parseQuery,
  uniq,
} from "./utils";

function createNote() {
  return MarkdownDocument.create();
}

async function addFrontmatter() {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    window.showErrorMessage("Please open an editor");
    return;
  }

  new MarkdownDocument(editor.document).createFrontMatter();
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

  const markdownFiles = await getMarkdownFiles({ showProgress: true });

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

  const mdDoc = new MarkdownDocument(editor.document);

  const newTagsStr = await window.showInputBox({
    value: mdDoc.tags.join(","),
    prompt: "Enter one or many tags (separated by a comma)",
  });

  if (newTagsStr === undefined) {
    window.showErrorMessage("You don't have write any tags");
    return;
  }

  mdDoc.tags = uniq(newTagsStr.split(",").map((t) => t.trim()));
}

function deleteNote() {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    window.showErrorMessage("Please open an editor");
    return;
  }

  const mdDoc = new MarkdownDocument(editor.document);
  mdDoc.toggleSafeDelete();
}

workspace.onWillSaveTextDocument(({ document }: TextDocumentWillSaveEvent) => {
  const editor = window.activeTextEditor;

  if (editor === undefined) {
    return;
  }

  if (document.languageId === "markdown" && document.uri.path === editor.document.uri.path) {
    const markdownDocument = new MarkdownDocument(document);
    markdownDocument.onSave();
  }
});

export async function activate(context: ExtensionContext) {
  console.log("activate");
  context.subscriptions.push(
    commands.registerCommand("notable.createNote", createNote),
    commands.registerCommand("notable.addTagNote", addTagNote),
    commands.registerCommand("notable.addFrontmatter", addFrontmatter),
    commands.registerCommand("notable.safeDeleteNote", deleteNote),
    commands.registerCommand("notable.searchNote", searchNote)
  );
}

export function deactivate() {}
