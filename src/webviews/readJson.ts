import { promises as fs } from 'fs';
import * as path from 'path';
import { jsonExportsDir } from '../extension';

export async function readJson(fileName: string, property?: string): Promise<any | null> {
    try {
        const data = await fs.readFile(path.join(jsonExportsDir, fileName), { encoding: 'utf8' });
        const parsed = JSON.parse(data);
        if (property) return parsed[property];
        return parsed;
    } catch (err) {
        console.error(`Failed to load ${fileName}`, err);
        return null;
    }
}
