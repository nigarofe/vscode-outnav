import * as vscode from 'vscode';
import { promises as fs } from 'fs';

export function generateMessageForQuestions(editor: vscode.TextEditor) {
    let payload = {
        currentQuestion: getCurrentQuestion(editor)
    }

    loadQuestionsFromJson();

    return payload;
}

function getCurrentQuestion(editor: vscode.TextEditor): any {
    const headerRe = /^#\s+Question\s+(\d+)/gm;
    const doc = editor.document;
    const startLine = editor.selection.active.line;

    for (let line = startLine; line >= 0; line--) {
        const text = doc.lineAt(line).text;
        headerRe.lastIndex = 0; // reset because headerRe uses the 'g' flag
        const match = headerRe.exec(text);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            return isNaN(num) ? null : num;
        }
    }

    return null;
}

async function loadQuestionsFromJson() {
    const questionsJsonPath = 'C:\\Users\\Nicholas\\vscode-outnav\\src\\json_exports\\questions.json';
    try {
        const data = await fs.readFile(questionsJsonPath, { encoding: 'utf8' });
        const questions = JSON.parse(data);
        return questions;
    } catch (err) {
        console.error('Failed to load questions.json', err);
        return null;
    }
}