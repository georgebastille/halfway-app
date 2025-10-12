import fs from 'fs/promises';
import path from 'path';

/**
 * Reads a JSON Lines file and parses each line into an object.
 * Lines that are empty or contain only whitespace are skipped.
 */
export async function readJsonLines<T>(relativePath: string): Promise<T[]> {
  const filePath = path.join(process.cwd(), relativePath);
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const records: T[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    records.push(JSON.parse(trimmed) as T);
  }

  return records;
}
