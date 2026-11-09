import os

path = r"d:\Anti-gravity\expedite-consults\expedite-consults\noctis-ai\src\lib\noctis-response-intelligence.ts"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add import
import_target = 'import { handleNaturalPatientDiagnosticQuery } from "./noctis-patient-diagnosis.ts";'
import_repl = 'import { handleNaturalHealth500Query } from "./noctis-health-500-chat.ts";\nimport { handleNaturalPatientDiagnosticQuery } from "./noctis-patient-diagnosis.ts";'

assert import_target in text, "import_target not found"
text = text.replace(import_target, import_repl, 1)

# 2. Add dispatch block before patientDiagResponse
dispatch_target = '  // 00-c. Noctis Patient Diagnostic & Triage Intelligence Engine'
dispatch_repl = '''  // 00-b2. Noctis Health 500 Clinical Benchmark Intelligence Engine (NOCTIS-HEALTH-500, 15 Specialties)
  const health500Response = handleNaturalHealth500Query(currentQuestion);
  if (health500Response) {
    return adaptSpecialistEngineOutput(currentQuestion, health500Response, "NOCTIS-HEALTH-500-001");
  }

  // 00-c. Noctis Patient Diagnostic & Triage Intelligence Engine'''

assert dispatch_target in text, "dispatch_target not found"
text = text.replace(dispatch_target, dispatch_repl, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Successfully updated noctis-response-intelligence.ts!")
