import json

with open(r"d:\Anti-gravity\expedite-consults\expedite-consults\noctis-ai\src\lib\noctis-health-500-complete.json", "r", encoding="utf-8") as f:
    data = json.load(f)

flagship_ids = [
    "NH-EM-001", "NH-CARD-001", "NH-EM-004", "NH-ID-001", "NH-CC-001",
    "NH-GI-001", "NH-PULM-001", "NH-EM-005", "NH-EM-003", "NH-HEME-001",
    "NH-OBGYN-001", "NH-PEDS-001", "NH-TOX-001", "NH-PSYCH-001", "NH-DERM-001"
]

by_id = {c["caseId"]: c for c in data}
for fid in flagship_ids:
    c = by_id.get(fid)
    if c:
        print(f"[{c['caseId']}] {c['specialty']}: {c['goldStandard']['primaryDiagnosis']} ({c['goldStandard'].get('icd10')})")
    else:
        print(f"MISSING: {fid}")
