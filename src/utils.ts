import { promises } from "fs";
import { extname, join } from "path";
import { Progress, ProgressLocation, window, workspace } from "vscode";
import matter = require("gray-matter");

const MD_EXTENSIONS = [".md", ".markdown"];

export interface MarkdownFile {
  path: string;
  content: string;
  matter: any;
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
