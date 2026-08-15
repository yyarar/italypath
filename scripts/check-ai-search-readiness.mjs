import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function readProjectFile(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

function assertIncludes(source, expected, file, failures) {
  if (!source.includes(expected)) {
    failures.push(`${file} must include ${JSON.stringify(expected)}`);
  }
}

const [llms, robots, countUp] = await Promise.all([
  readProjectFile('public/llms.txt'),
  readProjectFile('app/robots.ts'),
  readProjectFile('components/CountUpStat.tsx'),
]);

const failures = [];

assertIncludes(llms, '# ItalyPath', 'public/llms.txt', failures);
assertIncludes(llms, 'https://italypath.app/universities', 'public/llms.txt', failures);
assertIncludes(llms, 'https://italypath.app/scholarships', 'public/llms.txt', failures);
assertIncludes(llms, 'https://italypath.app/isee', 'public/llms.txt', failures);
assertIncludes(llms, 'official source', 'public/llms.txt', failures);

assertIncludes(robots, "userAgent: '*'", 'app/robots.ts', failures);
assertIncludes(robots, "'/universities'", 'app/robots.ts', failures);
assertIncludes(robots, "'/scholarships'", 'app/robots.ts', failures);
assertIncludes(robots, "'/isee'", 'app/robots.ts', failures);

assertIncludes(countUp, 'useState(() => value ?? 0)', 'components/CountUpStat.tsx', failures);

if (failures.length > 0) {
  console.error('AI search readiness check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('AI search readiness checks passed.');
