import { promises } from "fs";
import { basename, extname, join } from "path";
import {
  Progress,
  ProgressLocation,
  QuickPickItem,
  Range,
  SnippetString,
  TextEditor,
  window,
  workspace,
} from "vscode";
import matter = require("gray-matter");
import yaml = require("yaml");
const parse = require("markdown-to-ast").parse;

const MD_EXTENSIONS = [".md", ".markdown"];

export interface MarkdownFile {
  path: string;
  content: string;
  matter: any;
}
interface SearchNoteQuery {
  tags: string[];
  content: string;
}

export function parseQuery(query: string): SearchNoteQuery {
  const tags = [];

  let tagsMatches = query.match(/\#\w*/g);

  if (tagsMatches instanceof Array) {
    tagsMatches.forEach((m) => query.replace(m, ""));

    tags.push(...tagsMatches.map((m) => m.replace("#", "")));
  }

  tags.forEach((tag) => (query = query.replace(`#${tag}`, "")));

  return { tags, content: query };
}

async function getProgress(title: string): Promise<Progress<any>> {
  return await new Promise((resolve, reject) => {
    window.withProgress(
      { location: ProgressLocation.Notification, title, cancellable: false },
      async (progress) => {
        return resolve(progress);
      }
    );
  });
}

async function walk(
  directory: string,
  filepaths: string[] = []
): Promise<string[]> {
  const files = await promises.readdir(directory);
  for (let filename of files) {
    const filepath = join(directory, filename);

    const isDirectory = await promises
      .stat(filepath)
      .then((s) => s.isDirectory());

    if (isDirectory) {
      await walk(filepath, filepaths);
    } else if (MD_EXTENSIONS.includes(extname(filename))) {
      filepaths.push(filepath);
    }
  }
  return filepaths;
}

export async function openMarkdownFile(path: string): Promise<MarkdownFile> {
  const content = await promises.readFile(path, { encoding: "utf8" });
  const { data } = matter(content);

  return {
    path,
    content,
    matter: data,
  };
}

export async function getMarkdownFiles(
  options: { showProgress: boolean } = { showProgress: false }
): Promise<MarkdownFile[]> {
  if (workspace.workspaceFolders === undefined) {
    return [];
  }

  const { showProgress } = options;

  const markdownFiles: MarkdownFile[] = [];

  for (const folder of workspace.workspaceFolders) {
    let progress;

    if (showProgress) {
      progress = await getProgress(`Search markdown files on ${folder.uri}`);
    }

    console.log(`Start search tags on ${folder.uri}`);
    const paths = await walk(folder.uri.path);
    const files = await Promise.all(paths.map((p) => openMarkdownFile(p)));
    markdownFiles.push(...files);

    if (progress) {
      progress.report(100);
    }
  }

  return markdownFiles;
}

export function uniq<T>(array: T[]): T[] {
  return array.filter((v, i, a) => a.indexOf(v) === i);
}

export function isMarkdownFileMatchTag(
  document: MarkdownFile,
  queryTags: string[]
): boolean {
  if (queryTags.length === 0) {
    return true;
  }

  if (document.matter.tags instanceof Array) {
    return queryTags.every((tag) => document.matter.tags.includes(tag));
  } else {
    return false;
  }
}

export function isMarkdownFileMatchContent(
  document: MarkdownFile,
  content: string
): boolean {
  return document.content.includes(content);
}

export function markdownFileToQuickPickItem(
  document: MarkdownFile
): QuickPickItem {
  const tags: string[] = document.matter.tags ?? [];
  const ast = parse(document.content);

  const detail: string = ast.children
    .filter((c: any) => c.type === "Paragraph")
    .map((c: any) => c.raw)
    .join(" ... ");

  return {
    label: basename(document.path),
    description: tags.map((t) => `#${t}`).join(", "),
    detail,
  };
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
