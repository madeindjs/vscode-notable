import * as vscode from 'vscode';
import matter = require('gray-matter');
import * as didyoumean from 'didyoumean';
import { getTags } from './utils'

/** Code that is used to associate diagnostic entries with code actions. */
export const EMOJI_MENTION = 'markdown-tag.did-you-mean';

/** String to detect in the text document. */
const EMOJI = 'emoji';

/**
 * Analyzes the text document for problems.
 * This demo diagnostic problem provider finds all mentions of 'emoji'.
 * @param doc text document to analyze
 * @param emojiDiagnostics diagnostic collection
 */
export async function refreshDiagnostics(doc: vscode.TextDocument, emojiDiagnostics: vscode.DiagnosticCollection): Promise<void> {
    const diagnostics: vscode.Diagnostic[] = [];

    const tags = await getTags();

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
        const lineOfText = doc.lineAt(lineIndex);
        if (lineOfText.text.startsWith('tags: ')) {
            diagnostics.push(...createDiagnostics(doc, lineOfText, lineIndex, tags));
        }
    }

    emojiDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostics(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number, tags: string[]): vscode.Diagnostic[] {
    const diagnostics = [];
    let frontMatter;

    try {
        frontMatter = matter(doc.getText()).data;
    } catch (e) {
        return [];
    }

    const existingTags: string[] = frontMatter.tags instanceof Array ? frontMatter.tags : [];

    // tags = tags.filter(t => !existingTags.includes(t))

    for (const tag of existingTags) {
        if (tags.includes(tag)) continue;

        const meanTag = didyoumean(tag, tags);

        if (meanTag === tag || meanTag === null) continue;

        const index = lineOfText.text.indexOf(tag);
        const range = new vscode.Range(lineIndex, index, lineIndex, index + EMOJI.length);
        const diagnostic = new vscode.Diagnostic(range, `It seams that tag not already exists. Did you mean "${meanTag}"`,
            vscode.DiagnosticSeverity.Information);
        diagnostic.code = EMOJI_MENTION;

        diagnostics.push(diagnostic);

    }



    // find where in the line of thet the 'emoji' is mentioned


    // create range that represents, where in the document the word is

    return diagnostics;
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, emojiDiagnostics: vscode.DiagnosticCollection): void {
    if (vscode.window.activeTextEditor) {
        refreshDiagnostics(vscode.window.activeTextEditor.document, emojiDiagnostics);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                refreshDiagnostics(editor.document, emojiDiagnostics);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, emojiDiagnostics))
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => emojiDiagnostics.delete(doc.uri))
    );

}