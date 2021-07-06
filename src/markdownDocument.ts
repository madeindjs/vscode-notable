import matter = require("gray-matter");
import {dirname, extname, join} from "path";
import {Range, SnippetString, TextDocument, Uri, window, workspace, WorkspaceEdit} from "vscode";
const parse = require("markdown-to-ast").parse;
import yaml = require("yaml");
const sanitize = require("sanitize-filename");

export class MarkdownDocument {
  private frontMatterData: any | undefined;
  private ast: any | undefined;

  constructor(public readonly document: TextDocument) {
    this.parse();
  }

  async save() {
    const title = this.getCurrentTitle();
    this.updateFrontMatter({modified: new Date().toISOString(), title});

    const folderPath = dirname(this.document.uri.path);

    // TODO handle if undefined
    const filename = sanitize(title);
    const extension = extname(this.document.uri.path);

    const newUri = Uri.parse(join(folderPath, `${filename}${extension}`));

    // Uri.joinPath(this.document.uri.path)

    const edit = new WorkspaceEdit();
    edit.renameFile(this.document.uri, newUri, {overwrite: true});
    await workspace.applyEdit(edit);
  }

  private parse() {
    const content = this.document.getText();

    this.ast = parse(content);
    this.frontMatterData = matter(content).data;
  }

  getCurrentTitle(): string | undefined {
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

  updateFrontMatter(matterData: any): void {
    // TODO find a better way
    const editor = window.activeTextEditor;

    if (editor === undefined) {
      throw Error("No editor opened");
    }

    this.parse();

    if (this.ast === undefined) {
      throw Error("AST could not be parsed");
    }

    matterData = {...this.frontMatterData, ...matterData};

    const oldMatterNode = this.ast.children.filter((c: any) => c.type === "Yaml")[0];

    const newMatter = `---\n${yaml.stringify(matterData)}---`;

    if (oldMatterNode === undefined) {
      const snippet = new SnippetString(`${newMatter}\n`);
      editor.insertSnippet(snippet);
    } else {
      const firstMatterPosition = editor.document.positionAt(oldMatterNode.range[0]);
      const secondMatterPosition = editor.document.positionAt(oldMatterNode.range[1]);
      const range = new Range(firstMatterPosition, secondMatterPosition);

      editor.edit((editBuilder) => editBuilder.replace(range, newMatter));
    }
  }
}
