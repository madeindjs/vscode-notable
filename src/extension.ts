import { workspace, ExtensionContext, commands, window, ProgressLocation, Progress, languages, TextDocument, Position, CompletionItem, CompletionItemKind } from 'vscode';

import { promises } from 'fs';
import { join, extname } from 'path'
import * as matter from 'gray-matter';

const MD_EXTENSIONS = ['.md', '.markdown']

async function getProgress(title: string): Promise<Progress<any>> {

    return await new Promise((resolve, reject) => {
        window.withProgress({ location: ProgressLocation.Notification, title, cancellable: false }, async (progress) => {
            return resolve(progress)
        });
    })
}

async function walk(directory: string, filepaths: string[] = []): Promise<string[]> {
    const files = await promises.readdir(directory);
    for (let filename of files) {
        const filepath = join(directory, filename);

        const isDirectory = await promises.stat(filepath).then(s => s.isDirectory())

        if (isDirectory) {
            await walk(filepath, filepaths);
        } else if (MD_EXTENSIONS.includes(extname(filename))) {
            filepaths.push(filepath);
        }
    }
    return filepaths;
}

async function getMarkdownTags(path: string): Promise<string[]> {
    // console.log(`getMarkdownTags on ${path}`)
    const content = await promises.readFile(path, { encoding: 'utf8' });
    const { data } = matter(content);

    if (data.tags instanceof Array) {
        return data.tags;
    }
    return []
}

async function getTags(): Promise<string[]> {
    if (workspace.workspaceFolders === undefined) {
        return [];
    }
    const tags: string[] = []

    for (const folder of workspace.workspaceFolders) {
        const progress = await getProgress(`Search tags on ${folder.uri}`)



        console.log(`Start search tags on ${folder.uri}`)
        const paths = await walk(folder.uri.path);
        const arrayTags = await Promise.all(paths.map(p => getMarkdownTags(p)));

        progress.report(100);

        arrayTags.forEach(t => tags.push(...t))
    }

    // uniq
    return tags.filter((v, i, a) => a.indexOf(v) === i);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
    // console.log('Loaded')


    console.log('Congratulations, your extension "md-tags" is now active!');

    // // The command has been defined in the package.json file
    // // Now provide the implementation of the command with registerCommand
    // // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('md-tags.showTags', () => {


        return getTags()
            .then(tags => window.showInformationMessage(`You have theses tags: ${tags}`))
            .catch((e) => window.showErrorMessage(`Error during fetching tags: ${e}`))

    });

    const provider = languages.registerCompletionItemProvider('markdown', {
        async provideCompletionItems(document: TextDocument, position: Position) {
            const tags = await getTags();
            return tags.map(tag => new CompletionItem(tag, CompletionItemKind.Keyword))
        }
    },
    );

    context.subscriptions.push(disposable, provider);
}

// this method is called when your extension is deactivated
export function deactivate() { }
