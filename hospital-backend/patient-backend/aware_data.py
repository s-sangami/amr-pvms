# WHO AWaRe Classification (2023) — real data from the World Health Organization
# Access = safer first-line, Watch = use carefully, Reserve = last-resort
# Source: WHO AWaRe Antibiotic Book 2023

AWARE_CATEGORIES = {
    # ---- ACCESS (0) — first-line, lower resistance risk ----
    "amoxicillin": 0,
    "amoxicillin+clavulanic acid": 0,
    "amoxicillin-clavulanate": 0,
    "co-amoxiclav": 0,
    "ampicillin": 0,
    "amikacin": 0,
    "benzylpenicillin": 0,
    "benzathine benzylpenicillin": 0,
    "cefalexin": 0,
    "cephalexin": 0,
    "cefazolin": 0,
    "chloramphenicol": 0,
    "clindamycin": 0,
    "cloxacillin": 0,
    "doxycycline": 0,
    "gentamicin": 0,
    "metronidazole": 0,
    "nitrofurantoin": 0,
    "trimethoprim": 0,
    "co-trimoxazole": 0,
    "trimethoprim-sulfamethoxazole": 0,
    "flucloxacillin": 0,
    "phenoxymethylpenicillin": 0,

    # ---- WATCH (1) — higher resistance potential, use carefully ----
    "azithromycin": 1,
    "ciprofloxacin": 1,
    "levofloxacin": 1,
    "ofloxacin": 1,
    "norfloxacin": 1,
    "cefixime": 1,
    "cefpodoxime": 1,
    "ceftriaxone": 1,
    "cefotaxime": 1,
    "ceftazidime": 1,
    "cefuroxime": 1,
    "clarithromycin": 1,
    "erythromycin": 1,
    "meropenem": 1,
    "imipenem": 1,
    "vancomycin": 1,
    "piperacillin-tazobactam": 1,
    "rifampicin": 1,
    "roxithromycin": 1,

    # ---- RESERVE (2) — last-resort, highest stewardship priority ----
    "ceftazidime-avibactam": 2,
    "colistin": 2,
    "polymyxin b": 2,
    "linezolid": 2,
    "tigecycline": 2,
    "daptomycin": 2,
    "fosfomycin iv": 2,
    "aztreonam": 2,
    "cefiderocol": 2,
}

# WHO "Not Recommended" fixed-dose antibiotic combinations (FDC-ABs).
# WHO lists 103 of these in the AWaRe database (since 2021); they are
# rejected for clinical use due to poor rationale, lack of efficacy evidence,
# dosing problems, additive toxicity, and AMR risk from unnecessary
# broad-spectrum coverage.
# The entries below are the ones documented in published literature.
# Expand from the official WHO AWaRe spreadsheet: aware.essentialmeds.org
NOT_RECOMMENDED_FDC = [
    "ampicillin-cloxacillin",
    "ampicillin+cloxacillin",
    "flucloxacillin-amoxicillin",
    "flucloxacillin+amoxicillin",
    "amoxicillin-flucloxacillin",
    "ceftriaxone-sulbactam",
    "ceftriaxone+sulbactam",
    "cefoperazone-sulbactam",
    "cefoperazone+sulbactam",
    "piperacillin-sulbactam",
    "piperacillin+sulbactam",
]


def is_not_recommended(drug_name: str) -> bool:
    """True if the drug is a WHO 'Not Recommended' fixed-dose combination."""
    if not drug_name:
        return False
    key = drug_name.strip().lower().replace(" ", "")
    for fdc in NOT_RECOMMENDED_FDC:
        if fdc.replace(" ", "") == key:
            return True
    # Heuristic: any combination naming two antibiotics we know about
    # separated by + or - is worth flagging for review.
    for sep in ["+", "-", "/"]:
        if sep in key:
            parts = [p.strip() for p in key.split(sep)]
            known = [p for p in parts if p in AWARE_CATEGORIES]
            if len(known) >= 2:
                return True
    return False
# Drugs that commonly cross-react with a penicillin allergy
PENICILLIN_FAMILY = [
    "amoxicillin", "ampicillin", "benzylpenicillin", "benzathine benzylpenicillin",
    "cloxacillin", "flucloxacillin", "phenoxymethylpenicillin", "piperacillin-tazobactam",
    "amoxicillin+clavulanic acid", "amoxicillin-clavulanate", "co-amoxiclav",
]
# Cephalosporins have partial cross-reactivity with penicillin allergy
CEPHALOSPORIN_FAMILY = [
    "cefalexin", "cephalexin", "cefazolin", "cefixime", "cefpodoxime",
    "ceftriaxone", "cefotaxime", "ceftazidime", "cefuroxime",
]


def get_aware_category(drug_name: str):
    """Return 0=Access, 1=Watch, 2=Reserve, or None if not an antibiotic."""
    if not drug_name:
        return None
    key = drug_name.strip().lower()
    # strip a trailing dosage like "500mg" if present
    key = key.split()[0] if key else key
    return AWARE_CATEGORIES.get(key)  # None if unknown


def check_allergy_conflict(drug_name: str, allergies: str) -> bool:
    """True if the drug conflicts with the patient's recorded allergies."""
    if not drug_name or not allergies:
        return False
    drug = drug_name.strip().lower()
    allergy_text = allergies.lower()

    if "penicillin" in allergy_text:
        if drug in PENICILLIN_FAMILY:
            return True
        if drug in CEPHALOSPORIN_FAMILY:
            return True  # partial cross-reactivity

    # direct name match (e.g. allergic to "azithromycin")
    for allergen in [a.strip() for a in allergy_text.split(",")]:
        if allergen and allergen in drug:
            return True
    return False