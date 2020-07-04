# VSCode Markdown Tag

VSCode plugin to handle [YAML Markdown front matter](https://jekyllrb.com/docs/front-matter/) tags like this :

```markdown
---
tags: [markdown, vscode, extension]
---
```

## Features

- [x] Add autocomplete tags from Markdowns tags in workspace directory

![Screenshot of autocomplete feature](https://raw.githubusercontent.com/madeindjs/vscode-markdown-tags/master/screenshots/autocomplete.gif)

- [x] Propose tags similar from your workspace tags using [didyoumean](https://www.npmjs.com/package/didyoumean) library

![Screenshot of didyoumean feature](https://raw.githubusercontent.com/madeindjs/vscode-markdown-tags/master/screenshots/didyoumean.gif)

- [ ] Add an explorer view to view all markdown files linked to given note
- [ ] Jump on related notes using [show all references](https://github.com/microsoft/vscode-extension-samples/tree/master/contentprovider-sample)
- [ ] More...

## Installation

TODO: publish

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

- `myExtension.enable`: enable/disable this extension
- `myExtension.thing`: set to `blah` to do something

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Links

- https://github.com/microsoft/vscode-extension-samples/tree/master/tree-view-sample
- https://github.com/microsoft/vscode-extension-samples/blob/master/code-actions-sample/src/extension.ts
