import * as vscode from 'vscode';
import matter = require('gray-matter');

/** Code that is used to associate diagnostic entries with code actions. */
export const EMOJI_MENTION = 'emoji_mention';

/** String to detect in the text document. */
const EMOJI = 'emoji';

/**
 * Analyzes the text document for problems.
 * This demo diagnostic problem provider finds all mentions of 'emoji'.
 * @param doc text document to analyze
 * @param emojiDiagnostics diagnostic collection
 */
export function refreshDiagnostics(doc: vscode.TextDocument, emojiDiagnostics: vscode.DiagnosticCollection): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
        const lineOfText = doc.lineAt(lineIndex);
        if (lineOfText.text.startsWith('tags: ')) {
            diagnostics.push(...createDiagnostics(doc, lineOfText, lineIndex));
        }
    }

    emojiDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostics(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic[] {
    const diagnostics = [];

    const text = doc.getText()

    let data;

    try {
        data = matter(doc.getText()).data;
    } catch (e) {
        return [];
    }



    const existingTags: string[] = data.tags instanceof Array ? data.tags : [];

    for (const existingTag of existingTags) {
        const index = lineOfText.text.indexOf(existingTag);
        const range = new vscode.Range(lineIndex, index, lineIndex, index + EMOJI.length);
        const diagnostic = new vscode.Diagnostic(range, "When you say 'emoji', do you want to find out more?",
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