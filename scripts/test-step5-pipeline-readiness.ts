import fs from "node:fs";
import path from "node:path";

function testGpuPipelineReadiness() {
  console.log("============================================================================");
  console.log("NOCTIS CLINICAL REASONING: STEP 5 GPU TRAINING PIPELINE READINESS AUDIT");
  console.log("============================================================================\n");

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      totalPassed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      totalFailed++;
    }
  }

  // 1. Dataset Verification
  const datasetPath = path.resolve(process.cwd(), "data/noctis-dpo-clinical-safety.jsonl");
  assert("DPO training dataset exists", fs.existsSync(datasetPath));

  const content = fs.readFileSync(datasetPath, "utf-8").trim().split("\n");
  assert("DPO dataset contains ≥ 1,000 pairs", content.length >= 1000);

  // 2. Training Script Verification
  const scriptPath = path.resolve(process.cwd(), "scripts/train_clinical_dpo.py");
  assert("train_clinical_dpo.py exists", fs.existsSync(scriptPath));

  const pyCode = fs.readFileSync(scriptPath, "utf-8");
  assert("Script targets noctis-ai/noctis-7b-clinical-v3.1", pyCode.includes("noctis-ai/noctis-7b-clinical-v3.1"));
  assert("Script supports DPOTrainer & LoRA", pyCode.includes("DPOTrainer") && pyCode.includes("LoraConfig"));

  // 3. Cluster Launcher Verification
  const launcherPath = path.resolve(process.cwd(), "scripts/run_gpu_phase3_dpo.sh");
  assert("run_gpu_phase3_dpo.sh launcher exists", fs.existsSync(launcherPath));

  // 4. Training Guide Verification
  const guidePath = path.resolve(process.cwd(), "deliverables/NOCTIS_GPU_CLUSTER_TRAINING_GUIDE.md");
  assert("Cloud cluster training guide exists", fs.existsSync(guidePath));

  console.log("\n============================================================================");
  console.log(`STEP 5 PIPELINE AUDIT COMPLETE: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("============================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

testGpuPipelineReadiness();
