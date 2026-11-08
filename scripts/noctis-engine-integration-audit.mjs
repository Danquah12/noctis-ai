#!/usr/bin/env node
/**
 * Static import-graph audit for the Noctis engine registry.
 *
 * This is deliberately read-only. It proves only that source modules import
 * other source modules; it does not prove that a function is invoked, a route
 * is reachable, or a capability is operational.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listNoctisEngines } from "../src/lib/noctis-engine-registry.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"];
const IMPORT_PATTERN = /\b(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g;

function walk(directory) {
  const absolute = path.join(ROOT, directory);
  let entries = [];
  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const relative = path.posix.join(directory.replaceAll(path.sep, "/"), entry.name);
    if (entry.isDirectory()) return walk(relative);
    return entry.isFile() && SOURCE_EXTENSIONS.includes(path.extname(entry.name))
      ? [relative]
      : [];
  });
}

function moduleCandidates(absolute) {
  const candidates = [absolute];
  if (!path.extname(absolute)) {
    for (const extension of SOURCE_EXTENSIONS) candidates.push(absolute + extension);
    for (const extension of SOURCE_EXTENSIONS) candidates.push(path.join(absolute, "index" + extension));
  }
  return candidates;
}

function resolveImport(importer, specifier, sourceSet) {
  let absolute;
  if (specifier.startsWith("@/")) {
    absolute = path.resolve(ROOT, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    absolute = path.resolve(ROOT, path.dirname(importer), specifier);
  } else {
    return null;
  }
  for (const candidate of moduleCandidates(absolute)) {
    const relative = path.relative(ROOT, candidate).split(path.sep).join("/");
    if (sourceSet.has(relative)) return relative;
  }
  return null;
}

function classifyImporter(file) {
  if (/\.test\.[^.]+$/.test(file) || /\.spec\.[^.]+$/.test(file)) return "test";
  if (file.startsWith("src/routes/")) return "route";
  if (file.startsWith("src/components/")) return "ui";
  if (file.startsWith("scripts/")) return "script";
  if (file.startsWith("src/lib/") && /\.server\./.test(file)) return "server";
  if (file.startsWith("src/lib/")) return "library";
  return "other";
}

const sourceFiles = walk("src").concat(walk("scripts"));
const sourceSet = new Set(sourceFiles);
const engineFiles = sourceFiles.filter((file) =>
  file.startsWith("src/lib/noctis-") &&
  /\.(?:ts|tsx|js|jsx|mjs|mts)$/.test(file) &&
  !/\.test\./.test(file) &&
  !/\.spec\./.test(file)
);
const importersByTarget = new Map(engineFiles.map((file) => [file, new Set()]));
const importsByFile = new Map(sourceFiles.map((file) => [file, new Set()]));

for (const importer of sourceFiles) {
  let source;
  try {
    source = readFileSync(path.join(ROOT, importer), "utf8");
  } catch {
    continue;
  }
  IMPORT_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const target = resolveImport(importer, match[1], sourceSet);
    if (target && target !== importer) {
      importsByFile.get(importer)?.add(target);
      if (importersByTarget.has(target)) importersByTarget.get(target).add(importer);
    }
  }
}

const applicationEntrypoints = sourceFiles.filter((file) => file.startsWith("src/routes/"));
const reachableFromRoutes = new Set(applicationEntrypoints);
const pending = [...applicationEntrypoints];
while (pending.length) {
  const importer = pending.shift();
  for (const target of importsByFile.get(importer) ?? []) {
    if (reachableFromRoutes.has(target)) continue;
    reachableFromRoutes.add(target);
    pending.push(target);
  }
}

const manifests = listNoctisEngines();
const manifestIds = new Set();
const registry = manifests.map((manifest) => {
  const duplicateId = manifestIds.has(manifest.id);
  manifestIds.add(manifest.id);
  const sourcePath = manifest.sourcePath.replaceAll("\\", "/");
  const sourceExists = existsSync(path.join(ROOT, sourcePath));
  const importers = [...(importersByTarget.get(sourcePath) ?? [])].sort();
  const byKind = Object.groupBy
    ? Object.groupBy(importers, classifyImporter)
    : importers.reduce((groups, file) => {
        const kind = classifyImporter(file);
        (groups[kind] ??= []).push(file);
        return groups;
      }, {});
  return {
    id: manifest.id,
    lifecycle: manifest.lifecycle,
    sourcePath,
    sourceExists,
    duplicateId,
    importerCount: importers.length,
    runtimeImporterCount: importers.filter((file) => !["test", "script"].includes(classifyImporter(file))).length,
    reachableFromRouteEntrypoint: reachableFromRoutes.has(sourcePath),
    routeImporters: byKind.route ?? [],
    uiImporters: byKind.ui ?? [],
    serverImporters: byKind.server ?? [],
    libraryImporters: byKind.library ?? [],
    testImporters: byKind.test ?? [],
    scriptImporters: byKind.script ?? [],
  };
});

const registeredPaths = new Set(manifests.map((manifest) => manifest.sourcePath.replaceAll("\\", "/")));
const unregisteredEngineModules = engineFiles.filter((file) => !registeredPaths.has(file)).sort();
const missingSources = registry.filter((entry) => !entry.sourceExists);
const duplicateIds = registry.filter((entry) => entry.duplicateId);
const noRuntimeImporters = registry.filter((entry) => entry.runtimeImporterCount === 0);
const notRouteReachable = registry.filter((entry) => !entry.reachableFromRouteEntrypoint);
const summary = {
  generatedAt: new Date().toISOString(),
  scope: "Static source import graph only; no runtime reachability or execution is inferred.",
  counts: {
    sourceFilesScanned: sourceFiles.length,
    noctisModulesFound: engineFiles.length,
    registryEntries: manifests.length,
    missingRegistrySources: missingSources.length,
    duplicateRegistryIds: duplicateIds.length,
    registeredEnginesWithNoDirectImporters: noDirectImporters.length,
    unregisteredEngineModules: unregisteredEngineModules.length,
  },
  registry,
  missingSources,
  duplicateIds,
  noDirectImporters: noDirectImporters.map(({ id, sourcePath }) => ({ id, sourcePath })),
  unregisteredEngineModules,
};

process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
if (missingSources.length || duplicateIds.length) process.exitCode = 1;
