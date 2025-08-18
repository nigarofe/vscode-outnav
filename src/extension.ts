import * as vscode from "vscode";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => getActiveEditor(editor))
    );


	
	


	console.log(`Active file (name): ${getActiveEditor(vscode.window.activeTextEditor)}`);
	console.log('Last line of activate()');
}

function getActiveEditor(editor?: vscode.TextEditor | undefined) {
        if (editor && editor.document) {
            const fullPath = editor.document.uri.fsPath;
            const fileName = path.basename(fullPath);
			// console.log(`Active file (name): ${fileName}`);
            return `${fileName}`;
        } else {
            return undefined;
        }
    }
