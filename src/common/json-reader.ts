import { promises as fs } from 'fs';
import * as path from 'path';
import { EXTENSION_SRC } from '../extension';

export async function readJson(property: string): Promise<any | null> {
    const data_path = path.join(EXTENSION_SRC, property, 'data-exported.json');
    const data = await fs.readFile(data_path, { encoding: 'utf8' });
    const parsed = JSON.parse(data);
    const parsed_property = parsed[property];

    if (parsed_property) {
        return parsed_property;
    } else {
        console.error(`Failed to load ${property} at ${data_path}`);
    }
}
