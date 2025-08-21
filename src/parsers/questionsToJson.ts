

import * as fs from 'fs/promises';
import * as path from 'path';

export async function parseQuestionsToJson(): Promise<string> {
    // __dirname is src/parsers, so go up two levels to repo root then into outnav-workspace
    const mdPath = path.resolve(__dirname, '..', '..', 'outnav-workspace', 'Questions.md');
    const outDir = path.resolve(__dirname, '..', '..', 'src', 'json_exports');
    const outPath = path.join(outDir, 'questions.json');

    const raw = await fs.readFile(mdPath, 'utf8');

    // Find each question block: header '# Question <n>' followed by its content
    const questionRe = /^#\s+Question\s+(\d+)\s*\n([\s\S]*?)(?=(?:\n#\s+Question\s+\d+)|$)/gm;
    const questions = [] as any[];
    let m: RegExpExecArray | null;

    while ((m = questionRe.exec(raw)) !== null) {
        const num = parseInt(m[1], 10);
        const body = m[2].trim();

        // Split sections by '## <Section>' headings
        const sectionRe = /##\s+([^\n]+)\n([\s\S]*?)(?=(?:\n##\s+[^\n]+)|$)/gm;
        const sections: Record<string, string> = {};
        let s: RegExpExecArray | null;
        while ((s = sectionRe.exec(body)) !== null) {
            const key = s[1].trim();
            const val = s[2].trim();
            sections[key] = val;
        }

        const proposition = sections['Proposition'] || '';
        const stepByStep = sections['Step-by-step'] || sections['Step-by-step '] || '';
        const answer = sections['Answer'] || '';

        // Metadata parsing: lines like 'Discipline\t\tElectromagnetism' or separated by multiple spaces
        const metaRaw = sections['Metadata'] || '';
        const meta: Record<string, string> = {};
        if (metaRaw) {
            const lines = metaRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                // split on tab(s) or 2+ spaces
                const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    const k = parts[0];
                    const v = parts.slice(1).join(' ');
                    meta[k] = v;
                }
            }
        }

        const discipline = meta['Discipline'] || '';
        const description = meta['Description'] || '';
        const source = meta['Source'] || '';
        const tagsRaw = meta['Tags'] || '';
        const tags = tagsRaw ? tagsRaw.split(/\s*;\s*/).map(t => t.trim()).filter(Boolean) : [];

        // Attempts parsing: lines like '2024-11-07T06:00:00Z 0'
        const attemptsRaw = sections['Attempts'] || '';
        const attempts: Array<{ datetime: string; code: number }> = [];
        if (attemptsRaw) {
            const lines = attemptsRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                const m = line.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+\-Z]+)\s+(0|1)$/);
                if (m) {
                    attempts.push({ datetime: m[1], code: Number(m[2]) });
                }
            }
        }

        const questionObj: any = {
            number: num,
            discipline,
            source,
            description,
            'proposition': proposition,
            'step-by-step': stepByStep,
            answer,
            tags,
        };

        if (attempts.length) questionObj.attempts = attempts;

        questions.push(questionObj);
    }

    const out = { questions };

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');

    return outPath;
}

// Run when invoked directly (useful during development with ts-node)
if (require && require.main === module) {
    parseQuestionsToJson().then(p => console.log('Wrote', p)).catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
}