import * as fs from 'fs/promises';
import * as path from 'path';

interface AttemptEntry {
    timestamp: string;
    result: number; // 0 or 1
}

interface QuestionMetadata {
    discipline?: string;
    description?: string;
    source?: string;
    tags?: string[];
}

interface SpacedRepetitionMetrics {
    totalAttempts: number;
    successes: number;
    failures: number;
    lastAttempt?: string;
    nextReviewDate?: string;
}

interface QuestionSchema {
    number: number;
    discipline: string;
    source: string;
    description: string;
    proposition: string;
    step_by_step: string;
    answer: string;
    tags: string[];
    attempts?: Array<{ datetime: string; code: number }>;
    calculated_metrics?: Record<string, any>;
}

interface OutFile {
    questions: QuestionSchema[];
    lastUpdated?: string;
    totalQuestions?: number;
}

export async function parseQuestionsToJson(): Promise<string> {
    const mdPath = path.resolve(__dirname, '..', '..', 'outnav-workspace', 'Questions.md');
    const outDir = path.resolve(__dirname, '..', '..', 'src', 'json_exports');
    const outPath = path.join(outDir, 'questions.json');

    const raw = await fs.readFile(mdPath, 'utf8');

    // Robustly split the markdown file into question blocks by header positions
    const headerRe = /^#\s+Question\s+(\d+)/gm;
    const headers: Array<{ num: number; start: number; headerEnd: number }> = [];
    let hm: RegExpExecArray | null;
    while ((hm = headerRe.exec(raw)) !== null) {
        headers.push({ num: parseInt(hm[1], 10), start: hm.index, headerEnd: headerRe.lastIndex });
    }

    const questions: QuestionSchema[] = [];

    for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        const blockStart = h.headerEnd;
        const blockEnd = i + 1 < headers.length ? headers[i + 1].start : raw.length;
        const body = raw.slice(blockStart, blockEnd).trim();

        // Extract sections by scanning lines for '## ' headings
        const sections: Record<string, string> = {};
        const lines = body.split(/\r?\n/);
        let currentKey: string | null = null;
        let buf: string[] = [];
        for (const line of lines) {
            const headingMatch = line.match(/^##\s+(.+)$/);
            if (headingMatch) {
                if (currentKey) {
                    sections[currentKey] = buf.join('\n').trim();
                }
                currentKey = headingMatch[1].trim();
                buf = [];
            } else {
                if (currentKey) buf.push(line);
            }
        }
        if (currentKey) sections[currentKey] = buf.join('\n').trim();

        const proposition = sections['Proposition'] || '';
        const stepByStep = sections['Step-by-step'] || sections['Step-by-step '] || '';
        const answer = sections['Answer'] || '';

        const metaRaw = sections['Metadata'] || '';
        const metadata = parseMetadata(metaRaw);

        const attempts = parseAttempts(sections['Attempts'] || '');

        const questionObj: QuestionSchema = {
            number: h.num,
            discipline: metadata.discipline || '',
            source: metadata.source || '',
            description: metadata.description || '',
            proposition,
            step_by_step: stepByStep,
            answer,
            tags: metadata.tags || []
        };

        if (attempts.length) questionObj.attempts = attempts.map(a => ({ datetime: a.timestamp, code: a.result }));

        // Calculate spaced repetition metrics and merge them into calculated_metrics
        const spaced = calculateSpacedRepetitionMetrics(attempts);
        questionObj.calculated_metrics = {
            DSLA: calculateDaysSinceLastAttempt(attempts),
            LaMI: calculateLatestMemoryInterval(attempts),
            PMG_D: calculatePotentialMemoryGainDays(attempts),
            PMG_X: calculatePotentialMemoryGainMultiplier(attempts),
            // merged spaced repetition fields (snake_case keys for JSON schema compatibility)
            total_attempts: spaced.totalAttempts,
            memory_attempts: spaced.successes,
            help_attempts: spaced.failures,
            attempts_summary: `${spaced.totalAttempts};${spaced.successes};${spaced.failures}`,
            last_attempt: spaced.lastAttempt,
            next_review_date: spaced.nextReviewDate
        };

        questions.push(questionObj);
    }

    // Calculate priority color using all questions context and attach to each calculated_metrics
    const allQuestions = questions;
    for (const q of allQuestions) {
        const attemptsForQ: AttemptEntry[] = (q.attempts || []).map(a => ({ timestamp: a.datetime, result: a.code }));
        q.calculated_metrics!['PMG-X_cell_color'] = calculatePriorityColor(attemptsForQ, allQuestions.map(x => ({
            attempts: (x.attempts || []).map(a => ({ timestamp: a.datetime, result: a.code }))
        })) as any);
    }

    const out: OutFile = { questions, lastUpdated: new Date().toISOString(), totalQuestions: questions.length };

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');

    return outPath;
}

// --- Helper functions (ported/adapted from deprecated implementation) ---

function parseMetadata(content: string): QuestionMetadata {
    const metadata: QuestionMetadata = {};
    if (!content) return metadata;
    const lines = content.split(/\r?\n/).map(l => l.replace(/\r$/, '').trim()).filter(Boolean);
    for (const line of lines) {
        const tabMatch = line.match(/^(.+?)\t+(.+)$/);
        if (tabMatch) {
            const key = tabMatch[1].trim();
            const value = tabMatch[2].trim();
            switch (key.toLowerCase()) {
                case 'discipline':
                    if (value && value !== '-') metadata.discipline = value;
                    break;
                case 'description':
                    if (value && value !== '-') metadata.description = value;
                    break;
                case 'source':
                    if (value && value !== 'none' && value !== '-') metadata.source = value;
                    break;
                case 'tags':
                    if (value && value.trim()) metadata.tags = value.split(';').map(t => t.trim()).filter(Boolean);
                    break;
            }
        } else {
            // fallback: split on 2+ spaces
            const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
                const key = parts[0];
                const value = parts.slice(1).join(' ');
                switch (key.toLowerCase()) {
                    case 'discipline': metadata.discipline = value; break;
                    case 'description': metadata.description = value; break;
                    case 'source': if (value !== 'none' && value !== '-') metadata.source = value; break;
                    case 'tags': metadata.tags = value.split(';').map(t => t.trim()).filter(Boolean); break;
                }
            }
        }
    }
    return metadata;
}

function parseAttempts(content: string): AttemptEntry[] {
    const attempts: AttemptEntry[] = [];
    if (!content) return attempts;
    const lines = content.split(/\r?\n/).map(l => l.replace(/\r$/, '').trim()).filter(Boolean);
    for (const line of lines) {
        const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(0|1)$/);
        if (match) {
            attempts.push({ timestamp: match[1], result: Number(match[2]) });
        }
    }
    return attempts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function calculateSpacedRepetitionMetrics(attempts: AttemptEntry[]): SpacedRepetitionMetrics {
    const totalAttempts = attempts.length;
    const successes = attempts.filter(a => a.result === 1).length;
    const failures = attempts.filter(a => a.result === 0).length;
    const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1].timestamp : undefined;
    return {
        totalAttempts,
        successes,
        failures,
        lastAttempt,
    };
}

function calculateDaysSinceLastAttempt(attempts: AttemptEntry[]): number {
    if (attempts.length === 0) return 0;
    const lastAttempt = attempts[attempts.length - 1];
    const lastAttemptDate = new Date(lastAttempt.timestamp);
    const today = new Date();
    lastAttemptDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const timeDiff = today.getTime() - lastAttemptDate.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

function calculateLatestMemoryInterval(attempts: AttemptEntry[]): number | string {
    if (attempts.length === 0) return 0;
    const lastAttempt = attempts[attempts.length - 1];
    if (lastAttempt.result === 0) return 'W/H';
    if (attempts.length === 1 && lastAttempt.result === 1) return 'SA';
    const memoryIntervals: number[] = [];
    for (let j = 1; j < attempts.length; j++) {
        if (attempts[j].result === 1) {
            const prevDate = new Date(attempts[j - 1].timestamp);
            const currDate = new Date(attempts[j].timestamp);
            const interval = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            memoryIntervals.push(interval);
        }
    }
    if (memoryIntervals.length === 0) return 'SA';
    const lastInterval = memoryIntervals[memoryIntervals.length - 1];
    return lastInterval === 0 ? 1 : lastInterval;
}

function calculatePotentialMemoryGainDays(attempts: AttemptEntry[]): number {
    if (attempts.length === 0) return 0;
    const lastAttempt = attempts[attempts.length - 1];
    const dsla = calculateDaysSinceLastAttempt(attempts);
    if (lastAttempt.result === 0 || attempts.length === 1) return dsla;
    const lami = calculateLatestMemoryInterval(attempts);
    if (typeof lami === 'string') return dsla;
    return dsla - lami;
}

function calculatePotentialMemoryGainMultiplier(attempts: AttemptEntry[]): number | string {
    if (attempts.length === 0) return 'NA';
    const lastAttempt = attempts[attempts.length - 1];
    const dsla = calculateDaysSinceLastAttempt(attempts);
    if (lastAttempt.result === 0) return 'W/H';
    if (attempts.length === 1 && lastAttempt.result === 1) return 'SA';
    const lami = calculateLatestMemoryInterval(attempts);
    if (typeof lami === 'string') return lami;
    return parseFloat((dsla / lami).toFixed(2));
}

function calculatePriorityColor(attempts: AttemptEntry[], allQuestions?: { attempts: AttemptEntry[] }[]): string {
    const pmgX = calculatePotentialMemoryGainMultiplier(attempts);
    if (typeof pmgX === 'string') {
        switch (pmgX) {
            case 'NA': return '#F0F0F0';
            case 'SA': return '#E6E0F8';
            case 'W/H': return '#FFDDC1';
            default: return '#F0F0F0';
        }
    }
    if (allQuestions && allQuestions.length > 0) {
        const numericPmgXValues = allQuestions
            .map(q => calculatePotentialMemoryGainMultiplier(q.attempts || []))
            .filter(v => typeof v === 'number') as number[];
        if (numericPmgXValues.length > 0) {
            const minPmgX = Math.min(...numericPmgXValues);
            const maxPmgX = Math.max(...numericPmgXValues);
            if (maxPmgX > minPmgX) {
                const normalized = (pmgX as number - minPmgX) / (maxPmgX - minPmgX);
                const hue = 120 * (1 - normalized);
                return `hsl(${Math.round(hue)}, 100%, 75%)`;
            }
        }
    }
    if ((pmgX as number) <= 1) return 'hsl(120, 100%, 75%)';
    if ((pmgX as number) <= 2) return 'hsl(60, 100%, 75%)';
    return 'hsl(0, 100%, 75%)';
}

// Run when invoked directly (useful during development with ts-node)
if (require && require.main === module) {
    parseQuestionsToJson().then(p => console.log('Wrote', p)).catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
}