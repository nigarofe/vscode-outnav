import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { possibleWebviews } from '../webviews-config';

export async function generateMessageForQuestions(editor: vscode.TextEditor) {
    let payload = {
        currentQuestionNumber: getCurrentQuestionNumber(editor),
        questionsJson: await readQuestionsJson()
    }
    return payload;
}

function getCurrentQuestionNumber(editor: vscode.TextEditor): any {
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

async function readQuestionsJson(): Promise<any[] | null> {
    const mapping = possibleWebviews['Questions.md'];
    try {
        const data = await fs.readFile(mapping.jsonExportPath, { encoding: 'utf8' });
        const parsed = JSON.parse(data).questions;
        return parsed;
    } catch (err) {
        console.error('Failed to load questions.json', err);
        return null;
    }
}