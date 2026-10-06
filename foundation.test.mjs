import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
assert.ok(existsSync('package.json'), 'package.json must exist');
assert.ok(existsSync('tsconfig.json'), 'tsconfig.json must exist');
assert.ok(existsSync('app/page.tsx'), 'App Router page must exist');

const pkg = readJson('package.json');
assert.match(pkg.dependencies?.next ?? '', /^\^?16\./, 'Next.js 16 required');
assert.match(pkg.dependencies?.react ?? '', /^\^?19\./, 'React 19 required');
assert.match(pkg.dependencies?.typescript ?? pkg.devDependencies?.typescript ?? '', /^\^?5\./, 'TypeScript 5 required');

const tsconfig = readJson('tsconfig.json');
const c = tsconfig.compilerOptions ?? {};
assert.equal(c.strict, true, 'strict TypeScript required');
assert.equal(c.noUncheckedIndexedAccess, true, 'noUncheckedIndexedAccess required');
assert.equal(c.noUnusedLocals, true, 'noUnusedLocals required');
assert.equal(c.noUnusedParameters, true, 'noUnusedParameters required');

const home = readFileSync('app/page.tsx', 'utf8');
assert.match(home, /MailTrace DX Lab/);
assert.match(home, /developer/i);
console.log('foundation architecture test passed');
