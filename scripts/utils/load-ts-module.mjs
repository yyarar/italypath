import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import ts from "typescript";

/**
 * Node 20 cannot import .ts files directly in this repo's runtime.
 * This helper transpiles a TS module to ESM in-memory and imports it via data URL.
 */
export async function loadTsModule(relativePath) {
  const absolutePath = resolve(process.cwd(), relativePath);
  const source = await readFile(absolutePath, "utf8");

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.Preserve,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: absolutePath,
    reportDiagnostics: false,
  });

  const encoded = Buffer.from(transpiled.outputText, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}
