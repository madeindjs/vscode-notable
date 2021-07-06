import matter = require("gray-matter");
import {Range, SnippetString, TextDocument, window} from "vscode";
const parse = require("markdown-to-ast").parse;
import yaml = require("yaml");

export class MarkdownDocument {
  private frontMatterData: Object | undefined;
  private ast: any | undefined;

  constructor(public readonly document: TextDocument) {}

  save() {
    this.updateFrontMatter({modified: new Date().toISOString()});
    // const edit = new WorkspaceEdit();
    // edit.renameFile(document.uri, this.targetPath, {overwrite: true});
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

    const title = this.getCurrentTitle();

    if (title !== undefined) {
      matterData.title = title;
    }

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
