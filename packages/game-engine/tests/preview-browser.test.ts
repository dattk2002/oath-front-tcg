import { it, expect } from "vitest";
import ts from "typescript";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
it("client preview subpath dependency graph contains no private engine or Node imports", () => {
  const root = resolve(import.meta.dirname, "../../..");
  const seen = new Set<string>();
  function visit(file: string): void {
    if (seen.has(file)) return;
    seen.add(file);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
        continue;
      if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly)
        continue;
      if (ts.isExportDeclaration(node) && node.isTypeOnly) continue;
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier))
        continue;
      const spec = node.moduleSpecifier.text;
      expect(spec).not.toMatch(/^node:/);
      expect(spec).not.toMatch(
        /(?:rng|identity|setup|automatic|actions|resolve|projection|hash|replay|model)\.js$/,
      );
      if (spec.startsWith(".")) {
        const child = resolve(dirname(file), spec.replace(/\.js$/, ".ts"));
        if (existsSync(child) && child.endsWith(".ts")) visit(child);
      } else if (spec === "@oathfront/game-content")
        visit(resolve(root, "packages/game-content/src/index.ts"));
      else if (spec === "@oathfront/contracts")
        visit(resolve(root, "packages/contracts/src/index.ts"));
    }
  }
  visit(resolve(root, "packages/game-engine/src/preview.ts"));
  expect(seen.size).toBeGreaterThan(5);
  const pkg = JSON.parse(
    readFileSync(resolve(root, "packages/game-engine/package.json"), "utf8"),
  );
  expect(pkg.exports["./preview"]).toBe("./src/preview.ts");
});
