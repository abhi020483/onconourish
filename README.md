# OncoNourish

**AI-guided, clinician-prescribed supportive-care nutrition companion for oncology patients.**

OncoNourish turns an oncology patient's clinical profile into a personalised **nutrition chart**
and **day-by-day Indian meal plans**, built on auditable clinical rules and reviewed/approved by
the care team before reaching the patient.

> **Supportive care only.** OncoNourish provides nutritional-support guidance derived from
> published clinical guidelines (ESPEN / ASCO / ICMR). It is **not** a substitute for medical
> advice and makes **no claim** to treat, cure, or arrest cancer.

## Live demo
- **Overview / client page:** [`index.html`](./index.html)
- **Interactive tool:** [`tool.html`](./tool.html) — 9-step patient intake → clinician review → nutrition chart + meal plan

*(Once GitHub Pages is enabled, the public link is added at the top of this section.)*

## What's inside
| Path | What it is |
|------|------------|
| `index.html` | Client-facing landing/overview page (links to the live tool) |
| `tool.html` | The live interactive tool (loads the `tool/` sources) |
| `print.html` | Print-optimised version of the overview |
| `tool/data.js` | **Editable** config: input options, rules, food & meal library, fortifiers |
| `tool/engine.js` | Deterministic **calculation tool + suggestion engine** (no AI; fully auditable) |
| `tool/ui.jsx`, `steps.jsx`, `results.jsx`, `app.jsx` | React UI (wizard, clinician review, plan) |
| `tool/onco-tool.css`, `onco-results.css` | Styles |
| `docs/` | Specification & original build prompt |
| `screenshots/` | UI screenshots |

## How it works
```
PATIENT INPUT ─► CALCULATION TOOL ─► SUGGESTION ENGINE ─► OUTPUTS
(9-step wizard)  (targets & flags)   (rules + meal lib)    1. Nutrition Chart
                                                           2. Daily Meal Plans
                                     ─► Clinician review / approve ─► Patient
```
- **Calculation tool** (`engine.js → ONCO.calc`): deterministic math — BMI, energy (25–30 kcal/kg),
  protein (1.0–1.5 g/kg), fluids (~30 mL/kg), weight-loss/malnutrition screen, comorbidity
  adjustments, and clinician flags. Each target shows its rationale.
- **Suggestion engine** (`engine.js → ONCO.suggest / generateDay`): rules resolve favour/avoid lists
  and adapt dishes to intolerances (lactose→soy/tofu, gluten→millet), comorbidities (renal, diabetes,
  cardiac) and symptoms (nausea, mucositis, diarrhoea…), then fortify meals to hit energy & protein
  targets within ±10%. Every suggestion is traceable to the rule that produced it.

## Where to edit the clinical rules
A clinical advisor can edit [`tool/data.js`](./tool/data.js) — input options, the `ONCO.rules`
config, base favour/avoid lists, the dish library, and fortifiers — with no changes to engine code.
Calculation constants live in [`tool/engine.js`](./tool/engine.js).

## Run locally
The tool loads JSX via Babel-standalone, so it needs to be served over HTTP (not opened as a `file://`):
```bash
cd onconourish
python3 -m http.server 8080
# then open http://localhost:8080/  (overview)  or  http://localhost:8080/tool.html
```

## Safety guardrails
- Supportive-care framing + visible disclaimer on every screen.
- Clinician review/approval step before a plan is finalised for the patient.
- Deterministic, auditable calculations; conservative value wins on conflicting restrictions
  (e.g. high-protein need vs. renal cap); every adjustment raises a clinician flag with its reason.

---
*Energy/protein targets follow ESPEN clinical nutrition in cancer guidance (25–30 kcal/kg/day;
protein >1.0 up to 1.5 g/kg/day).*
