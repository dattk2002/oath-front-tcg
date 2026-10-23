// The bundled API externalizes only pg/ajv/ws. Copy their installed production closure, never re-resolve versions.
import { createRequire } from "node:module";
import { cp, mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { dirname, join, basename, resolve } from "node:path";
const target = process.argv[2];
if (!target) throw Error("Explicit new runtime destination required");
await mkdir(target);
await mkdir(join(target, "node_modules"));
const copied = new Map();
async function copy(name, from, optional = false) {
  const require = createRequire(from);
  let manifest;
  try {
    manifest = require.resolve(name + "/package.json");
  } catch (error) {
    if (error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
      let directory = dirname(require.resolve(name));
      for (;;) {
        try {
          const candidate = join(directory, "package.json");
          if (JSON.parse(await readFile(candidate, "utf8")).name === name) {
            manifest = candidate;
            break;
          }
        } catch {
          /* search only package ancestors */
        }
        const parent = dirname(directory);
        if (parent === directory)
          throw Error("Package metadata unavailable", { cause: error });
        directory = parent;
      }
    } else if (optional && error.code === "MODULE_NOT_FOUND") return;
    else throw error;
  }
  manifest = await realpath(manifest);
  const metadata = JSON.parse(await readFile(manifest, "utf8"));
  if (metadata.name !== name || !metadata.version)
    throw Error("Unsupported package metadata");
  const previous = copied.get(name);
  if (previous) {
    if (previous.version !== metadata.version)
      throw Error("Runtime dependency version collision: " + name);
    return;
  }
  copied.set(name, { name, version: metadata.version });
  await cp(dirname(manifest), join(target, "node_modules", name), {
    recursive: true,
    dereference: true,
    filter: (source) => basename(source) !== "node_modules",
  });
  for (const dep of Object.keys(metadata.dependencies ?? {}))
    await copy(dep, manifest);
  for (const dep of Object.keys(metadata.optionalDependencies ?? {}))
    await copy(dep, manifest, true);
  for (const dep of Object.keys(metadata.peerDependencies ?? {}))
    await copy(
      dep,
      manifest,
      metadata.peerDependenciesMeta?.[dep]?.optional === true,
    );
}
for (const name of ["pg", "ajv", "ws"])
  await copy(name, resolve("apps/api/package.json"));
await writeFile(
  join(target, "package.json"),
  JSON.stringify({ private: true, type: "module" }),
);
await writeFile(
  join(target, "runtime-dependencies.json"),
  JSON.stringify(
    [...copied.values()].sort((a, b) => a.name.localeCompare(b.name)),
    null,
    2,
  ),
);
console.log(
  `Packaged ${copied.size} frozen installed runtime dependencies; package metadata/licenses retained`,
);
