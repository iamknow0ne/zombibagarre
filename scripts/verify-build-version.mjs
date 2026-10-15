import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const {version} = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const html = await readFile(new URL('dist/index.html', root), 'utf8');
assert.ok(html.includes(`BUILD ${version}</span>`), 'Built title must identify the package version.');
assert.ok(html.includes(`FIELD TRANSMISSION ${version}</span>`), 'Built loading screen must identify the package version.');
assert.ok(!html.includes('%GAME_VERSION%'), 'Version placeholders must be resolved before packaging.');
console.log(`Verified visible release version: ${version}`);
