# OncoNourish — Cowork Build Prompt

> Paste the prompt below into a fresh Claude Cowork session to build the OncoNourish MVP.
> It is self-contained and carries all the decisions from the concept note.

---

## ROLE & GOAL
Build an MVP web app called **"OncoNourish"** — an AI-guided, clinician-prescribed nutrition companion for oncology patients. It generates a personalised nutrition chart plus daily meal plans from a patient's clinical profile. Positioning is **SUPPORTIVE CARE only**: it helps patients stay nourished and tolerate treatment. It must **NOT** claim to treat, cure, or arrest cancer.

## USERS & FLOW
- **Clinician (oncologist/dietitian):** logs in, creates a patient, fills the intake profile, generates the plan, reviews/approves, shares with patient.
- **Patient:** views their approved nutrition chart + daily meal plans (read-only, no medical decisions made without the clinician).

Build the clinician-facing flow first; patient view is a shared read-only page.

## PERSONALISATION PROFILE (intake form — these drive the plan)
- Cancer type & stage; disease condition
- Treatment regimen / line of therapy; current & concomitant medications
- Comorbidities (diabetes, renal, cardiac, hepatic); concomitant diseases
- Age, sex, height/weight (for BMI & protein targets)
- Current diet format / eating pattern (veg/non-veg, regional cuisine)
- Intolerances: lactose, gluten, plus a standard checklist

**Phase-1 disease scope:** a small set of high-volume cancers only (breast, colorectal, head & neck, upper-GI) — keep it focused.

## ENGINE ARCHITECTURE (evidence-based rules + LLM)
- **Rules layer:** encode clinical nutrition guidance (ESPEN / ASCO / ICMR) as explicit, auditable rules — foods to favour/avoid, protein & calorie targets, hydration, supplement flags, and drug-nutrient cautions — keyed off the profile. Store rules as editable config (JSON/YAML), not hardcoded.
- **LLM layer:** takes the rules-engine output and turns it into clear, culturally relevant, affordable Indian meal plans in plain language. The LLM **presents and localises**; it must not invent clinical claims or override rules.
- Every recommendation must be **traceable back to a rule** (show "why" to clinician).

## OUTPUTS (generate both)
1. **Nutrition Chart:** framework — favour/avoid lists, macro & protein targets, hydration, supplement guidance, do's & don'ts, mapped to regimen/comorbidities.
2. **Daily Meal Plans:** concrete day-by-day meals, portions, simple recipes built around local food and the patient's intolerances.

Export both to a clean, printable **PDF** the clinician can hand over.

> MVP = one-time generated plan; design the data model so phase-aware regeneration can be added later.

## SAFETY & COMPLIANCE (hard requirements)
- Supportive-care framing throughout; visible disclaimer: not a substitute for medical advice; no treat/cure/arrest claims anywhere in UI or output.
- Clinician approval gate before any plan reaches a patient.
- Handle health data carefully: no unnecessary PII, consent notice, basic access control between clinician and patient views.

## TECH
- Use a simple, modern stack (e.g. React + a lightweight backend, or Next.js).
- Keep the LLM call abstracted behind one service module with a clear prompt template and the rules-engine output injected as structured context.
- Seed with 2–3 realistic sample patient cases so the app is demoable end-to-end.

## DELIVERABLES
- Working app I can run locally, with the clinician flow → generate → review → PDF export working on the sample cases.
- The rules config files, clearly commented, so a clinical advisor can edit them.
- A short README: how to run it, where the rules live, and the safety guardrails.

---

**Start by proposing the data model and screen list, ask me anything ambiguous, then build.**
