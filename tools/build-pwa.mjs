import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

import { relative, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const output = new URL('../dist/', import.meta.url);
const workerSource = await readFile(new URL('./pwa-worker.js', import.meta.url), 'utf8');
const files = (await readdir(output, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name !== 'sw.js')
  .map(entry => relative(fileURLToPath(output), join(entry.parentPath, entry.name)))
  .sort();

const hash = createHash('sha256').update(workerSource);
for (const file of files) {
  hash.update(file).update(await readFile(pathToFileURL(join(fileURLToPath(output), file))));
}

await writeFile(
  new URL('sw.js', output),
  `const version = ${JSON.stringify(hash.digest('hex'))};\nconst files = ${JSON.stringify(files)};\n${workerSource}`,
);
