import {workspace} from "vscode";

const configuration = workspace.getConfiguration("notable");

export const onSaveRenameFile = configuration.get<boolean>("onSaveRenameFile");
export const onSaveUpdateFrontMatter = configuration.get<boolean>("onSaveUpdateFrontMatter");
