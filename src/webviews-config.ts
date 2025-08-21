import * as vscode from "vscode";

export const possibleWebviews: Record<string,
    {
        htmlFileName: string; scriptFileName: string; title: string; panel: vscode.WebviewPanel | undefined,
        spacing: Record<string, number>, required_headings_regex: Record<string, RegExp>
    }> = {
    "Outlines.txt": {
        htmlFileName: "outlinesWebview.html",
        scriptFileName: "outlinesWebview.js",
        title: "Outlines",
        panel: undefined,
        spacing: {
            "level1": 10,
            "level2": 2
        },
        required_headings_regex: {}
    },
    "Premises.md": {
        htmlFileName: "premisesWebview.html",
        scriptFileName: "premisesWebview.js",
        title: "Premises",
        panel: undefined,
        spacing: {
            "level1": 50,
            "level2": 10,
            "level3": 2
        },
        required_headings_regex: {}
    },
    "Questions.md": {
        htmlFileName: "questionsWebview.html",
        scriptFileName: "questionsWebview.js",
        title: "Questions",
        panel: undefined,
        spacing: {
            "level1": 10,
            "level2": 2
        },
        required_headings_regex: {
            "level1": /^#\s+Question\s+(\d+)/gm
        }
    }
};