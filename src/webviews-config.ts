import * as vscode from "vscode";
import * as path from "path";

export interface WebviewConfig {
    filePath: string;
    jsonExportPath: string;
    htmlFileName: string;
    scriptFileName: string;
    title: string;
    panel: vscode.WebviewPanel | undefined;
    spacing: Record<string, number>;
    required_headings_regex: Record<string, RegExp>;
}

const workspaceRoot = path.resolve(__dirname, '..');
const workspaceDir = path.join(workspaceRoot, 'outnav-workspace');
const jsonExportsDir = path.join(workspaceRoot, 'src', 'json_exports');


export const possibleWebviews: Record<string, WebviewConfig> = {
    "Outlines.txt": {
        filePath: path.join(workspaceDir, 'Outlines.txt'),
        jsonExportPath: path.join(jsonExportsDir, 'outlines.json'),
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
        filePath: path.join(workspaceDir, 'Premises.md'),
        jsonExportPath: path.join(jsonExportsDir, 'premises.json'),
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
        filePath: path.join(workspaceDir, 'Questions.md'),
        jsonExportPath: path.join(jsonExportsDir, 'questions.json'),
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
}