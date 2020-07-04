import { ExtensionContext, commands, window, languages, TextDocument, Position, CompletionItem, CompletionItemKind } from 'vscode';
import { getTags } from './utils';
import { subscribeToDocumentChanges } from './diagnostics';



function getTagsCacheKey(): string {
    const d = new Date();
    return `markdown-tags_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDay()}T${d.getHours()}:${d.getMinutes()}`;
}

export async function activate(context: ExtensionContext) {


    let disposable = commands.registerCommand('md-tags.showTags', () => {
        return getTags()
            .then(tags => window.showInformationMessage(`You have theses tags: ${tags}`))
            .catch((e) => window.showErrorMessage(`Error during fetching tags: ${e}`));

    });

    const emojiDiagnostics = languages.createDiagnosticCollection("emoji");
	context.subscriptions.push(emojiDiagnostics);
    subscribeToDocumentChanges(context, emojiDiagnostics);

    const providerCompletion = languages.registerCompletionItemProvider('markdown', {
        async provideCompletionItems(document: TextDocument, position: Position) {
            // TODO: support multi line syntax
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            if (!linePrefix.startsWith('tags:')) {
                return undefined;
            }

            const cacheKey = getTagsCacheKey();
            const cache = context.globalState.get<CompletionItem[]>(cacheKey);
            if (cache) { return cache; }

            const tags = await getTags();
            const completions = tags.map(tag => new CompletionItem(tag, CompletionItemKind.Keyword));
            await context.globalState.update(cacheKey, completions);
            return completions;
        }
    });


    context.subscriptions.push(disposable, providerCompletion);
}

export function deactivate() { }
