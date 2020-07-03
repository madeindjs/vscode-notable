import * as vscode from 'vscode';

import { promises } from 'fs';
import { join, extname } from 'path'
import * as matter from 'gray-matter';

async function walk(directory: string, filepaths: string[] = []) {

	const files = await promises.readdir(directory);
	for (let filename of files) {
		const filepath = join(directory, filename);

		const isDirectory = await promises.stat(filepath).then(s => s.isDirectory())

		if (isDirectory) {
			walk(filepath, filepaths);
		} else if (extname(filename) === '.md') {
			filepaths.push(filepath);
		}
	}
	return filepaths;
}

async function readMarkdown(path: string): Promise<string[]> {
	const content = await promises.readFile(path, { encoding: 'utf8' });
	const { data } = matter(content);
	return data.tags as string[];
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	vscode.workspace.workspaceFolders?.forEach(folder => {
		walk(folder.uri.path).then(paths => {
			return Promise.all(paths.map(p => readMarkdown(p)))
		}).then(console.log);

	})


	console.log('Congratulations, your extension "md-tags" is now active!');

	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('md-tags.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed

	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from md-tags!');
	// });

	// context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
