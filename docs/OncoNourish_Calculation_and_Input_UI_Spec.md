# OncoNourish — Calculation Tool, Suggestion Engine & Patient Input UI

**Specification document · v1.0 · June 2026**
Scope: how a patient (or clinician) enters self-information, how the app calculates nutrition targets, and how it suggests foods and daily meals to produce the **Nutrition Chart** and **Daily Meal Plans**.

> **Positioning reminder:** OncoNourish is *supportive care*. All targets below are nutritional-support guidance derived from published clinical guidelines (ESPEN / ASCO / ICMR). The output is reviewed and approved by the treating clinician before it reaches the patient. Nothing here treats, cures, or arrests cancer.

---

## 1. How the pieces fit together

```
  PATIENT INPUT  ─►  CALCULATION TOOL  ─►  SUGGESTION ENGINE  ─►  OUTPUTS
  (self-info form)   (targets & flags)     (rules + LLM)          1. Nutrition Chart
                                                                  2. Daily Meal Plans
                                          ─► Clinician review/approve ─► Patient
```

- **Calculation Tool** = deterministic math. Turns raw inputs into energy, protein, fluid and other targets, plus risk flags. Fully auditable, no AI.
- **Suggestion Engine** = rules (foods to favour/avoid, filtered by intolerances and side effects) + an LLM that turns the approved targets and food lists into culturally relevant Indian meal plans. The LLM presents and localises; it never overrides a rule or invents a target.

---

## 2. The Calculation Tool

### 2.1 Inputs it consumes

| Field | Type | Used for |
|-------|------|----------|
| Weight (kg) | number | Energy, protein, fluid targets |
| Height (cm) | number | BMI |
| Usual / 6-month-ago weight (kg) | number | % weight loss → malnutrition flag |
| Age | number | Fluid adjustment, activity assumption |
| Sex | enum | Reference ranges |
| Activity / mobility level | enum (bedbound / low / moderate) | Energy multiplier |
| Cancer type & stage | enum | Suggestion engine + clinician notes |
| Comorbidities | multi-select | Target adjustments (renal, diabetic, cardiac, hepatic) |
| Current symptoms | multi-select | Side-effect-aware suggestions |

### 2.2 Core formulas

> Units: weight in kg, height in cm. Use **adjusted body weight** if BMI > 30 (see 2.4).

**Body Mass Index**
```
BMI = weight / (height_in_metres)^2
```

**Energy target (ESPEN: 25–30 kcal/kg/day)**
```
energy_kcal_per_day = weight × energy_factor

energy_factor:
  bedbound / very low activity ............ 25 kcal/kg
  low–moderate activity (default) ......... 27 kcal/kg
  ambulatory, trying to regain weight ..... 30 kcal/kg
```

**Protein target (ESPEN: >1.0, up to 1.5 g/kg/day)**
```
protein_g_per_day = weight × protein_factor

protein_factor:
  baseline / stable ....................... 1.2 g/kg
  weight-losing / cachexia risk ........... 1.5 g/kg
  renal impairment (not on dialysis) ...... 1.0 g/kg   (see 2.3 — clinician flag)
```

**Fluid target (general supportive default)**
```
fluid_ml_per_day = weight × 30        (≈30 mL/kg/day)
  + add 300–500 mL if fever / vomiting / diarrhoea present
  - flag for clinician review if cardiac or renal restriction applies
```

**Weight-loss / malnutrition screen (drives risk flag)**
```
percent_weight_loss = (usual_weight − current_weight) / usual_weight × 100

Flag = AT RISK if any of:
  • % weight loss > 5% in ~6 months
  • BMI < 18.5  (or < 20 if age ≥ 70)
  • reported reduced intake for > 1 week
```

### 2.3 Comorbidity adjustments (applied after base calc, each raises a clinician flag)

| Condition | Adjustment | Flag to clinician |
|-----------|-----------|-------------------|
| Renal impairment (no dialysis) | Protein → 1.0 g/kg; restrict potassium/phosphorus in suggestions | Yes — confirm protein cap |
| Renal (on dialysis) | Protein → 1.2–1.5 g/kg (do not restrict) | Yes |
| Diabetes / hyperglycaemia | Prefer low-GI carbs; distribute carbs across meals | Yes |
| Cardiac / fluid restriction | Cap fluid target; reduce sodium in suggestions | Yes — confirm fluid cap |
| Hepatic impairment | Adjust protein cautiously; clinician sets ceiling | Yes — manual review |

> **Rule:** the tool never silently overrides a guideline. Any adjustment is shown to the clinician with the reason, and the clinician confirms before the plan is generated.

### 2.4 Edge cases & guards
- **BMI > 30:** use adjusted body weight `= ideal_weight + 0.25 × (actual − ideal)` for energy/protein to avoid overfeeding.
- **Missing usual weight:** skip the weight-loss flag; prompt clinician to confirm.
- **Implausible values** (e.g., height < 100 cm, weight < 25 kg): block and ask to re-enter.
- **Conflicting restrictions** (e.g., high-protein need + renal cap): always defer to the more conservative value and flag for the clinician.

### 2.5 What the calculation tool outputs (a structured object)

```json
{
  "bmi": 19.8,
  "nutritional_risk": "AT_RISK",
  "percent_weight_loss": 7.2,
  "targets": {
    "energy_kcal_per_day": 1650,
    "protein_g_per_day": 90,
    "fluid_ml_per_day": 1800
  },
  "flags": ["weight_loss_>5%", "renal_protein_cap_review"],
  "rationale": {
    "energy": "27 kcal/kg × 61 kg (low-moderate activity)",
    "protein": "1.5 g/kg (weight-losing) — capped to 1.0 if renal confirmed"
  }
}
```

This object is the single source of truth handed to the suggestion engine and shown (with rationale) to the clinician.

---

## 3. The Suggestion Engine

### 3.1 Two layers

1. **Rules (deterministic, auditable):** produces *what* to favour/avoid and the numeric targets to hit.
2. **LLM (presentation/localisation):** turns rules + targets into named meals, portions and simple recipes in the patient's cuisine and language. It must respect every rule and never add a clinical claim.

### 3.2 Rule sources & structure
Rules are stored as editable config (JSON/YAML) so a clinical advisor can maintain them — not hardcoded.

```yaml
- id: protein_priority
  when: { nutritional_risk: AT_RISK }
  favour: [dal, paneer, eggs, chicken, fish, soya, milk, curd, nuts]
  reason: "Meet elevated protein target to protect muscle mass"

- id: lactose_intolerant
  when: { intolerance: lactose }
  exclude: [milk, paneer, curd, khoa]
  substitute: { milk: soy_milk, paneer: tofu, curd: soy_curd }

- id: gluten_intolerant
  when: { intolerance: gluten }
  exclude: [wheat, atta, suji, maida, barley]
  substitute: { roti: rice/jowar/bajra_roti }

- id: low_appetite
  when: { symptom: poor_appetite }
  strategy: "small frequent energy-dense meals; add ghee/oil/nut-butter"
```

### 3.3 Resolution order (how a conflict is settled)
```
1. Safety / clinician caps        (e.g., renal protein cap)   ← highest priority
2. Intolerance exclusions          (lactose, gluten, standard set)
3. Comorbidity preferences         (low-GI, low-sodium)
4. Symptom strategies              (nausea, mucositis, poor appetite)
5. Cuisine & patient preference    (veg/non-veg, regional)     ← lowest priority
```
Higher rules win. The engine logs which rule excluded or substituted each item, so every suggestion is explainable.

### 3.4 Symptom-aware suggestion examples

| Symptom | Strategy applied to meal plan |
|---------|-------------------------------|
| Nausea | Bland, cool, low-odour foods; ginger; small frequent portions |
| Mouth sores / mucositis | Soft, moist, non-acidic, non-spicy; smoothies, khichdi |
| Diarrhoea | Low-fibre, low-fat; bananas, rice, curd (if tolerated); extra fluids |
| Constipation | Higher fibre, fluids, prunes/papaya |
| Taste changes | Tart/marinated flavours, varied textures |
| Poor appetite | Energy-dense, fortify with ghee/oil/milk powder/nuts |

### 3.5 LLM guardrails (prompt-level)
- Hit the calculated energy/protein/fluid targets within ±10%; show estimated totals per day.
- Use only items allowed after rules resolution; never reintroduce an excluded food.
- Output locally available, affordable foods in the patient's stated cuisine.
- Plain, encouraging, non-alarmist language. No medical claims. Add the standard disclaimer.

---

## 4. Patient Self-Information Input UI

### 4.1 Design principles
- **Reassuring, not clinical-cold.** Patients may be anxious or fatigued. Warm tone, plenty of white space, large tap targets.
- **One idea per screen.** A short multi-step wizard beats one long form.
- **Plain language + helper text.** Avoid jargon; explain why each item is asked.
- **Forgiving.** Allow "I don't know / skip", save-and-resume, and easy back navigation.
- **Accessible.** WCAG AA: large fonts, high contrast, screen-reader labels, works one-handed on mobile.
- **Clinician-assisted mode.** Same form can be filled by the patient at home or by staff in clinic; clinical fields (regimen, meds) are clinician-confirmed.

### 4.2 Wizard structure (steps)

```
Step 1  Welcome & consent          → who this is for, privacy notice, consent toggle
Step 2  About you                  → name (optional), age, sex
Step 3  Body measures              → height, current weight, usual weight (6 mo ago)
Step 4  Your cancer & treatment    → cancer type, stage, current treatment*  (*clinician-confirmed)
Step 5  Medical background         → comorbidities, concomitant conditions, medications*
Step 6  How you're eating          → diet type (veg/non-veg/eggetarian), regional cuisine, meals/day, appetite
Step 7  Food intolerances          → lactose, gluten, + standard checklist, allergies
Step 8  How you're feeling         → symptom checklist (nausea, mouth sores, diarrhoea, etc.)
Step 9  Review & submit            → summary card, edit any step, submit for clinician review
```

A progress indicator (e.g. "Step 3 of 9") sits at the top throughout.

### 4.3 Field-by-field detail

**Step 2 — About you**
- Age — number stepper, years.
- Sex — segmented control (Female / Male / Other).

**Step 3 — Body measures**
- Height — cm slider + number entry; toggle for ft/in.
- Current weight — kg entry.
- Usual weight 6 months ago — kg entry, with "Not sure" option. *Helper:* "This helps us see if you've lost weight recently."
- Live feedback (optional, gentle): shows BMI silently to the engine; does **not** display a judgemental label to the patient.

**Step 4 — Cancer & treatment** *(clinician-confirmed)*
- Cancer type — searchable dropdown limited to Phase-1 set (breast, colorectal, head & neck, upper-GI).
- Stage — I–IV / "not sure".
- Current treatment — chemo / radiation / surgery / targeted / none-yet (multi-select).

**Step 5 — Medical background**
- Comorbidities — checklist: diabetes, kidney, heart, liver, thyroid, hypertension, none.
- Other conditions — free text.
- Current medications — chip input; *clinician verifies* (drug–nutrient interaction check happens server-side).

**Step 6 — How you're eating**
- Diet type — Vegetarian / Non-vegetarian / Eggetarian / Vegan.
- Regional cuisine — dropdown (North / South / East / West Indian, etc.) for relevant meal suggestions.
- Meals per day — 2 / 3 / 4 / small-frequent.
- Appetite right now — Good / Reduced / Poor (slider or faces).

**Step 7 — Food intolerances**
- Lactose — toggle.
- Gluten — toggle.
- Standard checklist — nuts, soy, shellfish, egg, etc.
- Other allergies — free text.

**Step 8 — How you're feeling** (drives symptom-aware suggestions)
- Checklist with icons: nausea, vomiting, mouth sores, taste changes, diarrhoea, constipation, poor appetite, fatigue, swallowing difficulty.
- "How severe?" mild/moderate/severe per selected symptom (optional).

**Step 9 — Review & submit**
- Summary card grouped by section, each with an "Edit" link.
- Clear note: *"Your care team will review this before your plan is finalised."*
- Submit button → status becomes "Awaiting clinician review".

### 4.4 Validation & UX rules
- Inline validation on blur, friendly messages ("Please enter a height between 120–220 cm").
- Required vs optional clearly marked; the form can be submitted with optional gaps.
- Auto-save after each step; resume later via secure link.
- Clinical fields show a small "Confirmed by your doctor" badge once verified.

### 4.5 Example screen (text wireframe — Step 3)

```
┌───────────────────────────────────────────┐
│  ● ● ● ○ ○ ○ ○ ○ ○        Step 3 of 9      │
│                                           │
│   Your body measures                      │
│   This helps us set the right energy and  │
│   protein goals for you.                  │
│                                           │
│   Height                                  │
│   [ 162 ] cm        (switch to ft/in)     │
│                                           │
│   Current weight                          │
│   [ 61 ] kg                               │
│                                           │
│   Your weight about 6 months ago          │
│   [ 66 ] kg     □ I'm not sure            │
│                                           │
│            [  Back  ]   [  Continue  ]    │
└───────────────────────────────────────────┘
```

### 4.6 What happens after submit
1. Inputs → **Calculation Tool** → targets + risk flags.
2. Targets → **Suggestion Engine** (rules + LLM) → draft Nutrition Chart + Daily Meal Plans.
3. Draft → **Clinician review** (adjust, approve).
4. Approved plan → patient's read-only view + printable PDF.

---

## 5. Worked example (illustrative)

Input: Female, 58, height 162 cm, weight 61 kg, usual weight 66 kg, colorectal cancer on chemo, lactose intolerant, poor appetite, mild nausea.

```
BMI               = 61 / 1.62²            = 23.2
% weight loss     = (66−61)/66 × 100      = 7.6%   → AT RISK
Energy target     = 61 × 27               ≈ 1650 kcal/day
Protein target    = 61 × 1.5 (weight-loss)≈ 90 g/day
Fluid target      = 61 × 30               ≈ 1830 mL/day
```
Suggestion engine: high-protein, **lactose-free** (paneer→tofu, milk→soy milk), small frequent energy-dense meals, bland/low-odour for nausea. LLM builds a South/North-Indian day plan hitting ~1650 kcal / ~90 g protein, then routes to the clinician for approval.

---

## 6. Build notes
- Calculation Tool = pure functions, unit-tested against the formulas above; no AI in this layer.
- Rules config lives in version-controlled files a clinical advisor can edit.
- LLM call is a single service module: inputs = calc output + resolved food lists; output = meal plan text constrained to targets.
- Every suggestion stores the rule IDs that produced it (explainability for clinicians and audit).

---

*Disclaimer: OncoNourish provides nutritional support guidance reviewed by a qualified clinician. It is not a substitute for medical advice and makes no claim to treat, cure, or arrest cancer. Energy and protein targets follow ESPEN clinical nutrition in cancer guidance (25–30 kcal/kg/day; protein >1.0 up to 1.5 g/kg/day).*
