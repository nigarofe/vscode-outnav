import * as vscode from "vscode";
import * as path from "path";

export const possibleWebviews: Record<string,
    {
        filePath: string; jsonExportPath: string; htmlFileName: string; scriptFileName: string; title: string; panel: vscode.WebviewPanel | undefined,
        spacing: Record<string, number>, required_headings_regex: Record<string, RegExp>
    }> = {
    "Outlines.txt": {
        filePath: path.resolve(__dirname, '..', 'outnav-workspace', 'Outlines.txt'),
        jsonExportPath: path.resolve(__dirname, '..', 'src', 'json_exports', 'outlines.json'),
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
        filePath: path.resolve(__dirname, '..', 'outnav-workspace', 'Premises.md'),
        jsonExportPath: path.resolve(__dirname, '..', 'src', 'json_exports', 'premises.json'),
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
        filePath: path.resolve(__dirname, '..', 'outnav-workspace', 'Questions.md'),
        jsonExportPath: path.resolve(__dirname, '..', 'src', 'json_exports', 'questions.json'),
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