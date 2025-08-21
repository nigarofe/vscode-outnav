import * as vscode from "vscode";

export const possibleWebviews: Record<string, { htmlFileName: string; scriptFileName: string; title: string; panel: vscode.WebviewPanel | undefined }> = {
    "Outlines.txt": {
        htmlFileName: "outlinesWebview.html",
        scriptFileName: "outlinesWebview.js",
        title: "Outlines",
        panel: undefined
    },
    "Premises.md": {
        htmlFileName: "premisesWebview.html",
        scriptFileName: "premisesWebview.js",
        title: "Premises",
        panel: undefined
    },
    "Questions.md": {
        htmlFileName: "questionsWebview.html",
        scriptFileName: "questionsWebview.js",
        title: "Questions",
        panel: undefined
    }
};