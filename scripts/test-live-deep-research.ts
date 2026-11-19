import { executeLiveDeepResearch, fetchArxivSources, fetchPubMedSources } from "../src/lib/noctis-deep-research.ts";

async function main() {
  console.log("=== TESTING NOCTIS LIVE DEEP RESEARCH (arXiv & PubMed) ===");

  // 1. Direct arXiv test
  console.log("\n[1] Querying arXiv API...");
  const arxivData = await fetchArxivSources("Tokamak disruption mitigation", 2);
  console.log(`Retrieved ${arxivData.sources.length} arXiv papers, ${arxivData.evidence.length} evidence passages.`);
  for (const s of arxivData.sources) {
    console.log(` - [${s.authorityTier}] ${s.title} (${s.publishedDate}) [${s.urlOrIdentifier}]`);
  }
  if (arxivData.sources.length === 0) {
    console.warn("Notice: arXiv returned 0 sources (network offline or rate-limited).");
  }

  // 2. Direct PubMed test
  console.log("\n[2] Querying PubMed API...");
  const pubmedData = await fetchPubMedSources("semaglutide pancreatitis", 2);
  console.log(`Retrieved ${pubmedData.sources.length} PubMed papers, ${pubmedData.evidence.length} evidence passages.`);
  for (const s of pubmedData.sources) {
    console.log(` - [${s.authorityTier}] ${s.title} (${s.publishedDate}) [${s.urlOrIdentifier}]`);
  }
  if (pubmedData.sources.length === 0) {
    console.warn("Notice: PubMed returned 0 sources (network offline or rate-limited).");
  }

  // 3. End-to-End Live Research Job
  console.log("\n[3] Executing Live End-to-End Research Job (Engineering/Physics)...");
  const job = await executeLiveDeepResearch({
    objective: "High-temperature superconducting (HTS) tape degradation under cyclic magnetic stress in compact fusion",
    domain: "physics",
    maxSources: 3,
  });

  console.log(`Job ID: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Sources: ${job.sources.length}`);
  console.log(`Evidence: ${job.evidence.length}`);
  console.log(`Claims: ${job.claims.length}`);
  console.log(`Deliverables: ${job.deliverables.length}`);
  console.log(`Quality Gate Passed: ${job.deliverables[0]?.qualityGate.passed}`);

  if (!job.id || job.sources.length === 0 || !job.deliverables[0]?.qualityGate.passed) {
    console.error("Live Deep Research Job validation failed!");
    process.exit(1);
  }

  console.log("\nALL LIVE DEEP RESEARCH TESTS PASSED SUCCESSFULLY! ✓");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
