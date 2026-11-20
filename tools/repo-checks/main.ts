import { fileURLToPath } from 'node:url';
import { commentProblems } from './comments';
import { CODE, ownedFiles, STYLE } from './files';
import { importProblems } from './imports';

const repo = fileURLToPath(new URL('../../', import.meta.url));

const checks: Readonly<Record<string, () => string[]>> = {
  imports: () => {
    const present = new Set(ownedFiles(repo, /./).map((f) => f.path));
    return importProblems(ownedFiles(repo, CODE), present);
  },
  comments: () => commentProblems([...ownedFiles(repo, CODE), ...ownedFiles(repo, STYLE)]),
};

const names = process.argv.slice(2);
let failed = false;
for (const name of names.length === 0 ? Object.keys(checks) : names) {
  const check = checks[name];
  if (check === undefined) {
    console.error(`no check named ${name}; the checks are ${Object.keys(checks).join(', ')}`);
    process.exit(2);
  }
  const problems = check();
  if (problems.length === 0) {
    console.log(`${name} check passed`);
    continue;
  }
  failed = true;
  console.error(`${name} check failed with ${problems.length} problem(s):`);
  for (const p of problems) console.error(`- ${p}`);
}
process.exit(failed ? 1 : 0);
