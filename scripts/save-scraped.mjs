import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    const key = arg.slice(2, eq);
    const value = arg.slice(eq + 1);
    args[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv);
const required = ["universityId", "universityName", "cycle", "sourceUrl", "outputDir"];
for (const k of required) {
  if (!args[k]) {
    console.error(`Missing required arg: --${k}`);
    process.exit(2);
  }
}

let body = "";
for await (const chunk of process.stdin) body += chunk;
body = body.trim();

const scrapedAt = new Date().toISOString();
const frontmatter = [
  "---",
  `universityId: ${args.universityId}`,
  `universityName: ${args.universityName}`,
  `cycle: ${args.cycle}`,
  `sourceUrl: ${args.sourceUrl}`,
  `scrapedAt: ${scrapedAt}`,
  "---",
  "",
  body,
  "",
].join("\n");

mkdirSync(args.outputDir, { recursive: true });
const outPath = join(args.outputDir, `${args.universityId}-${args.cycle}.md`);
writeFileSync(outPath, frontmatter, "utf8");
console.log(`[OK] Saved: ${outPath}`);
