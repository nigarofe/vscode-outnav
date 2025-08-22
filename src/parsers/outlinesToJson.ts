import * as fs from 'fs/promises';
import { possibleWebviews } from '../webviews-config';

export async function parseOutlinesToJson() {
    const mapping = possibleWebviews['Outlines.txt'];
    const raw = await fs.readFile(mapping.filePath, 'utf8');

    // Split the outlines by lines and filter out empty lines

}
