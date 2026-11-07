import { readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  let entries;
  try {
    entries = readdirSync(absoluteDirectory, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory.replaceAll(path.sep, "/"), entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return entry.isFile() ? [relativePath] : [];
  });
}

const libraryFiles = walk("src/lib").filter((file) => path.posix.basename(file).startsWith("noctis-"));
const implementationFiles = libraryFiles.filter((file) =>
  /\.(?:ts|tsx|js|jsx|mjs|py)$/.test(file) && !/\.test\./.test(file)
);
const testFiles = libraryFiles.filter((file) => /\.test\.(?:ts|tsx|js|jsx|mjs)$/.test(file));
const dataFiles = libraryFiles.filter((file) => !implementationFiles.includes(file) && !testFiles.includes(file));
const components = walk("src/components/noctis").filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
const routes = walk("src/routes").filter((file) => /noctis/i.test(file));

const groups = {
  core: /(?:brain|orchestrator|professional-engine|specialist-router|response-intelligence|memory|decisions|council|custom-agents|skills)/i,
  evidence_learning: /(?:train|training|source-ingestion|evidence|eval|benchmark|deep-research|rag|truth-ledger|live-search|live-connectors|autonomous-trainer)/i,
  cyber_defense: /(?:cyber|sast|vuln|attack-path|blast-radius|cve|defense|redteam|fuzzer|remediation|enclave|pqc|steganography|canary|circuit-breaker|verified-execution|wasm-runner|zk-proof)/i,
  health: /(?:clinical|health|medical|cardiovascular|endocrine|infectious|hematology|neurology|obstetrics|oncology|patient|pharmacogenomics|ocr-intake|longitudinal)/i,
  science_engineering: /(?:science|architect|automotive|digital-twin|grid|pde|holodeck)/i,
  legal_risk_finance: /(?:legal|risk|rmf|investment)/i,
  execution_integrations: /(?:execute|pipeline|swarm|mesh|workspace|plugin|github|gmail|voice|audio|vault|air-gap|code-interpreter|cognitive-sandbox|war-room|passport|desk|outside|gadgets|lex-synthesizer|diff|ledger|scenarios|ric|sovereign-factory)/i,
  professions_careers: /(?:career)/i,
  other: /.*/,
};

const grouped = Object.fromEntries(
  Object.entries(groups).map(([group, pattern]) => [
    group,
    implementationFiles.filter((file) => pattern.test(path.posix.basename(file))),
  ])
);
const report = {
  generatedAt: new Date().toISOString(),
  note: "File presence is inventory evidence only; it does not prove runtime integration, test success, or production readiness.",
  counts: {
    noctisLibraryFiles: libraryFiles.length,
    implementationFiles: implementationFiles.length,
    testFiles: testFiles.length,
    dataFiles: dataFiles.length,
    uiComponents: components.length,
    routeFiles: routes.length,
  },
  groups: Object.fromEntries(Object.entries(grouped).map(([key, value]) => [key, value.length])),
  implementationFiles: implementationFiles.sort(),
  testFiles: testFiles.sort(),
  dataFiles: dataFiles.sort(),
  uiComponents: components.sort(),
  routes: routes.sort(),
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
