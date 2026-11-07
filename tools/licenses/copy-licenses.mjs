// Publishes the license texts next to the app, where the Licenses page links to them:
// /3rdpartylicenses.txt (every bundled package, written by the Angular build) and /LICENSE.txt (this app, GPL-3.0).
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const browserDir = path.join(rootDir, 'dist/app/browser');

await copyFile(path.join(rootDir, 'dist/app/3rdpartylicenses.txt'), path.join(browserDir, '3rdpartylicenses.txt'));
await copyFile(path.join(rootDir, 'LICENSE'), path.join(browserDir, 'LICENSE.txt'));
