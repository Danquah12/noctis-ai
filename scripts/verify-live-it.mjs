async function main() {
  console.log("=== VERIFYING CONTINUOUS AUTONOMOUS DAEMON TELEMETRY ===");
  const trainRes = await fetch("https://www.dstrike.app/api/noctis?continuous_train=verbose");
  const trainData = await trainRes.json();
  const summary = trainData.epochSummary;
  console.log("Mode:", trainData.mode);
  console.log("Epoch ID:", summary?.epochId);
  console.log("Status:", summary?.status);
  console.log("Total Domains Audited:", summary?.totalDomainsAudited);
  console.log("Total Scenarios Evaluated:", summary?.totalScenariosEvaluated);
  console.log("Total Invariants Verified:", summary?.totalInvariantsVerified);
  console.log("Safety Violations Count:", summary?.safetyViolationsCount);
  console.log("Accuracy Score Percent:", summary?.accuracyScorePercent + "%");
  console.log("Total Duration (ms):", summary?.totalDurationMs + "ms");
  console.log("\nLast 5 Step Logs from Verbose Telemetry:");
  summary?.verboseLogs?.slice(-5).forEach(log => console.log("  " + log));

  console.log("\n=== VERIFYING NATURAL INFORMATION TECHNOLOGY INFERENCE ===");
  const itQueries = [
    "In a Raft consensus cluster with 5 nodes, what is the quorum required?",
    "Under BGP route flap dampening RFC 2439, if penalty is 3200 with suppress threshold 2000 and half-life 15m, what is the suppression status?",
    "In PostgreSQL MVCC with Repeatable Read, does concurrent update on row ID 402 trigger write skew or serialization failure under SSI?",
    "What are the 10 domains in information technology for Noctis?"
  ];

  for (const q of itQueries) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Query: "${q}"`);
    const resp = await fetch("https://www.dstrike.app/api/noctis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: q })
    });
    const json = await resp.json();
    console.log("Status:", resp.status);
    console.log("Engine Response:\n" + json.text);
  }
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
