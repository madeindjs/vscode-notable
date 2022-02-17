import matter = require("gray-matter");
import { basename, dirname, extname, join } from "path";
import { Position, Range, SnippetString, TextDocument, Uri, window, workspace, WorkspaceEdit } from "vscode";
import { onSaveDenyListFile, onSaveRenameFile, onSaveUpdateFrontMatter } from "./config";
import yaml = require("yaml");
import path = require("path");

const parse = require("@textlint/markdown-to-ast").parse;
const sanitize = require("sanitize-filename");

export class MarkdownDocument {
  private frontMatterData: any | undefined;
  private ast: any | undefined;

  static async create() {
    const defaultContent = `---
title: Undefined
tags: []
created: '${new Date().toISOString()}'
modified: '${new Date().toISOString()}'
---

# Undefined

`;
    const folder = workspace.workspaceFolders?.length ? workspace.workspaceFolders[0].uri.fsPath : process.cwd();
    const newFile = Uri.parse(`untitled:${path.join(folder, "untitled.md")}`);
    const document = await workspace.openTextDocument(newFile);

    const edit = new WorkspaceEdit();
    edit.insert(newFile, new Position(0, 0), defaultContent);
    await workspace.applyEdit(edit).then((success) => {
      if (success) {
        window.showTextDocument(document);
      } else {
        window.showInformationMessage("Error!");
      }
    });

    return new MarkdownDocument(document);
  }

  constructor(public readonly document: TextDocument) {
    this.parse();
  }

  get tags(): string[] {
    return this.frontMatterData.tags ?? [];
  }

  set tags(tags: string[]) {
    this.updateFrontMatter({ tags });
  }

  async onSave() {
    if (this.isOnSaveDenyList) {
      return;
    }

    const title = this.getCurrentTitle();
    this.updateFrontMatter({ modified: new Date().toISOString(), title });
    await this.renameMarkdownFile();
  }

  toggleSafeDelete() {
    const data = this.frontMatterData;

    if (data.deleted === true) {
      delete data.deleted;
    } else {
      data.deleted = true;
    }
    this.updateFrontMatter(data);
  }

  createFrontMatter(ctime: Date) {
    const data = this.frontMatterData;

    if (Object.entries(data).length ===  0) {
      const title = this.getCurrentTitle();
      data.title = title !== undefined ? title : 'Undefined';
      data.tags = [];
      data.created= ctime;
      data.modified= new Date().toISOString();
      this.updateFrontMatter(data);
    } else {
      window.showInformationMessage("Nothing to do. The file already has FrontMatter.");
    }
  }

  get isOnSaveDenyList() {
    if (onSaveDenyListFile === undefined) {
      return false;
    }

    const filename = basename(this.document.uri.path);

    return onSaveDenyListFile.includes(filename);
  }

  private async renameMarkdownFile() {
    if (!onSaveRenameFile) {
      console.log("Skip renaming markdown file because of configuration");
      return;
    }
    const title = this.getCurrentTitle();
    const folderPath = dirname(this.document.uri.path);

    if (!title) {
      return;
    }

    const filename = sanitize(title);
    const extension = extname(this.document.uri.path);

    const newUri = Uri.parse(join(folderPath, `${filename}${extension}`));

    const edit = new WorkspaceEdit();
    edit.renameFile(this.document.uri, newUri, { overwrite: true });
    await workspace.applyEdit(edit);
  }

  private parse() {
    const content = this.document.getText();

    this.ast = parse(content);
    this.frontMatterData = matter(content).data;
  }

  private getCurrentTitle(): string | undefined {
    const ast = parse(this.document.getText());

    const titles = ast.children.filter((c: any) => c.type === "Header" && c.depth === 1);

    if (titles.length > 0) {
      const raw = titles[0].raw as string;
      // not support other syntax than `# title`
      if (!raw.startsWith("# ")) {
        return undefined;
      }
      return raw.replace("# ", "");
    }

    if (this.frontMatterData?.title !== undefined) {
      return this.frontMatterData?.title;
    }

    return undefined;
  }

  private updateFrontMatter(matterData: any): void {
    if (!onSaveUpdateFrontMatter) {
      console.log("Skip updating frontmatter because of configuration");
      return;
    }

    // TODO find a better way
    const editor = window.activeTextEditor;

    if (editor === undefined) {
      throw Error("No editor opened");
    }

    this.parse();

    if (this.ast === undefined) {
      throw Error("AST could not be parsed");
    }

    matterData = { ...this.frontMatterData, ...matterData };

    const oldMatterNode = this.ast.children.filter((c: any) => c.type === "Yaml")[0];

    const newMatter = `---\n${yaml.stringify(matterData)}---`;

    if (oldMatterNode === undefined) {
      const snippet = new SnippetString(`${newMatter}\n\n`);
      editor.insertSnippet(snippet, new Position(0, 0));
    } else {
      const firstMatterPosition = editor.document.positionAt(oldMatterNode.range[0]);
      const secondMatterPosition = editor.document.positionAt(oldMatterNode.range[1]);
      const range = new Range(firstMatterPosition, secondMatterPosition);

      editor.edit((editBuilder) => editBuilder.replace(range, newMatter));
    }

    this.parse();
  }
}
