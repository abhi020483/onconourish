/* ===== OncoNourish Tool — Gastric cancer module =====
 * Deep, deterministic gastric-cancer support:
 *   - NRS-2002 nutritional-risk screening (ONCO.nrs2002)
 *   - Machine-evaluable nutrition-route algorithm (oral / ONS / EN / PN / postpone surgery)
 *   - Phase-specific rule sets (pre-op, post-gastrectomy, systemic, advanced/palliative)
 *
 * Rule sets are EDITABLE CONFIG for a clinical advisor: targets, diet pattern, Indian
 * food examples and monitoring are plain data; each route step keeps the human-readable
 * `condition`/`recommendation` text AND a `test(ctx)` predicate the engine evaluates.
 *
 * Sources: ESPEN Practical Guideline — Clinical Nutrition in Cancer (2021);
 * ESPEN Clinical Nutrition in Surgery (2021/2025); ESMO Gastric Cancer living guideline
 * (supportive care & nutrition); upper-GI / gastric nutrition reviews (2016–2023);
 * ICMR-NIN Dietary Guidelines for Indians (2024). Supportive care only.
 */
window.ONCO = window.ONCO || {};

(function () {
  // Estimated oral intake as % of needs. Explicit override wins; else derived from appetite.
  ONCO.estimateIntakePct = function (p) {
    if (typeof p.oralIntakePct === "number" && p.oralIntakePct >= 0) return p.oralIntakePct;
    return ({ good: 85, reduced: 60, poor: 35 })[p.appetite] != null ? ({ good: 85, reduced: 60, poor: 35 })[p.appetite] : 70;
  };

  // NRS-2002 disease-severity component, by gastric phase (editable).
  const DISEASE_SCORE = {
    preop: { score: 1, text: "Oncology (chronic disease)" },
    postop: { score: 2, text: "Major abdominal surgery (gastrectomy)" },
    systemic: { score: 1, text: "Oncology on systemic therapy" },
    advanced: { score: 1, text: "Advanced oncology (palliative)" },
  };

  /* ---------- NRS-2002 screening ---------- */
  // Approximated from available inputs (6-month weight change, BMI, appetite→intake%).
  ONCO.nrs2002 = function (p, calc) {
    const bmi = calc.bmi;
    const loss = calc.percent_weight_loss; // % vs usual (≈6 months)
    const intake = ONCO.estimateIntakePct(p);

    let nutr = 0, nutrText = "Normal nutritional status";
    if (bmi < 18.5 || (loss !== null && loss > 15) || intake < 25) {
      nutr = 3; nutrText = "Severe — BMI <18.5, >15% weight loss, or intake <25% of needs";
    } else if ((loss !== null && loss > 10) || bmi < 20.5 || intake < 50) {
      nutr = 2; nutrText = "Moderate — >10% loss, low BMI, or intake <50% of needs";
    } else if ((loss !== null && loss > 5) || intake < 75) {
      nutr = 1; nutrText = "Mild — >5% loss or intake <75% of needs";
    }

    const phase = p.gastricPhase || "preop";
    const dz = DISEASE_SCORE[phase] || DISEASE_SCORE.preop;
    const age = (+p.age >= 70) ? 1 : 0;
    const total = nutr + dz.score + age;

    return {
      nutr, nutrText,
      disease: dz.score, diseaseText: dz.text,
      age, ageText: age ? "Age ≥70 (+1)" : "Age <70 (0)",
      total, atRisk: total >= 3,
      intakePct: intake,
      summary: `NRS-2002 = ${total} (nutrition ${nutr} + disease ${dz.score} + age ${age})`,
    };
  };

  /* ---------- Route-algorithm rule sets (editable) ---------- */
  const TARGETS = { energy_kcal_per_kg: [25, 30], protein_g_per_kg: [1.2, 1.5] };

  ONCO.gastricRuleSets = {
    preop: {
      id: "GC_PREOP_ESPEN_2021",
      label: "Pre-operative (resectable)",
      title: "Pre-operative nutrition in resectable gastric (upper-GI) cancer",
      sources: ["ESPEN Cancer 2021", "ESPEN Surgery 2025", "Upper-GI nutrition reviews 2016–2023"],
      targets: TARGETS,
      // ctx = { nrs, intakePct, pctLoss, bmi, obstruction, elective, daysPostOp, complication }
      steps: [
        { priority: 0, route: "Dietary counselling", condition: "NRS-2002 < 3 and no clinically relevant weight loss",
          recommendation: "No formal delay for nutrition. Provide dietary counselling focused on adequate protein and energy.",
          test: (c) => c.nrs < 3 && !(c.pctLoss !== null && c.pctLoss > 5) },
        { priority: 1, route: "Oral + ONS (5–7 days)", condition: "NRS-2002 ≥ 3 (and < 6)",
          recommendation: "Start intensive oral support now: high-protein, high-energy diet plus oral nutrition supplements (ONS) targeting 25–30 kcal/kg/day and 1.2–1.5 g protein/kg/day for ≥5–7 days before surgery.",
          test: (c) => c.nrs >= 3 && c.nrs < 6 },
        { priority: 2, route: "Enteral + immunonutrition", condition: "NRS-2002 ≥ 3 and oral intake < 60% of target despite ONS",
          recommendation: "Escalate to enteral nutrition (naso-jejunal or feeding jejunostomy) with an immunonutrition formula (arginine, omega-3, nucleotides) for 5–7 days pre-op.",
          test: (c) => c.nrs >= 3 && c.intakePct < 60 },
        { priority: 3, route: "Postpone surgery 7–10 days", condition: "NRS-2002 ≥ 6 OR severe malnutrition (>10–15% loss in 6 mo, or BMI <18.5) and elective surgery",
          recommendation: "Recommend postponing elective gastrectomy by 7–10 days for intensive nutrition support (oral/enteral preferred, parenteral if EN not feasible) until ≥60–70% of energy and protein targets are met.",
          test: (c) => (c.nrs >= 6 || (c.pctLoss !== null && c.pctLoss > 10) || c.bmi < 18.5) && c.elective },
        { priority: 4, route: "Feeding jejunostomy / NJ tube", condition: "Gastro-duodenal obstruction preventing oral/enteral intake with a functional distal gut",
          recommendation: "Place a pre-operative feeding jejunostomy or naso-jejunal tube for full enteral nutrition; use parenteral nutrition only if the enteral route is impossible.",
          test: (c) => c.obstruction },
      ],
      diet_pattern: {
        meals_per_day: 5,
        notes: [
          "High-protein, high-energy, low-bulk meals — early satiety is common in gastric cancer.",
          "Use oral nutrition supplements (ONS) between meals so they don't displace main-meal intake.",
          "Follow ICMR-NIN guidance: protein-dense options, minimise ultra-processed / HFSS foods.",
        ],
        indian_food_examples: [
          { situation: "High-protein vegetarian (small-volume)", items: ["Soft moong-dal khichdi with ghee + finely chopped vegetables", "Thick chana/masoor dal with jeera rice + 1 katori curd", "Suji upma with peanuts/cashews + vegetables", "Besan cheela with paneer stuffing"] },
          { situation: "Non-vegetarian options", items: ["Soft rice with moong-dal + shredded chicken (soup-style)", "Light fish curry with soft rice, minimal spice/oil", "Soft egg bhurji with phulka soaked in dal"] },
          { situation: "ONS-style snacks", items: ["Thick lassi/curd shake with roasted-chana powder (+ a little jaggery if no diabetes)", "Ragi porridge with milk + groundnut/til paste", "Mashed banana with curd + powdered nuts (if tolerated)"] },
        ],
      },
      monitoring: {
        labs: ["Weight & % weight change over 1–6 months", "Albumin / prealbumin (supportive only)", "C-reactive protein", "Basic metabolic panel"],
        clinical: ["NRS-2002 score", "Daily oral intake vs target (% of 25–30 kcal/kg and 1.2–1.5 g/kg)", "Early satiety, nausea, vomiting, obstruction signs"],
      },
    },

    postop: {
      id: "GC_POSTOP_ESPEN_2025",
      label: "Post-gastrectomy (early)",
      title: "Post-gastrectomy nutrition (early post-operative period)",
      sources: ["ESPEN Surgery 2025", "Upper-GI nutritional strategies 2023", "Resectable gastric cancer support 2022"],
      targets: TARGETS,
      steps: [
        { priority: 0, route: "Early oral (ERAS)", condition: "POD 1–2, no anastomotic leak / contraindication",
          recommendation: "Start early oral intake (clear fluids advancing to liquid/soft diet) per ERAS; avoid prolonged fasting.",
          test: (c) => c.daysPostOp <= 2 && !c.complication },
        { priority: 1, route: "Continue oral ± ONS", condition: "By POD 5–6 oral intake covers ≥60% of energy/protein targets",
          recommendation: "Continue gradual oral progression. Routine EN/PN not needed; add ONS if intake fluctuates.",
          test: (c) => c.daysPostOp >= 5 && c.intakePct >= 60 && !c.complication },
        { priority: 2, route: "Enteral (NJ / jejunostomy) → PN if needed", condition: "By POD 6 oral intake <60% of targets, or complications limiting intake",
          recommendation: "Initiate enteral nutrition (naso-jejunal or feeding jejunostomy). If EN not possible/contraindicated, start parenteral nutrition to reach ≥60–100% of targets.",
          test: (c) => (c.daysPostOp >= 6 && c.intakePct < 60) || c.complication },
        { priority: 3, route: "Parenteral nutrition", condition: "Severe complication (anastomotic leak, ileus) with expected NPO >7 days",
          recommendation: "Use parenteral nutrition; add supplemental EN/oral as soon as feasible and reassess daily.",
          test: (c) => c.complication && c.daysPostOp >= 1 },
      ],
      diet_pattern: {
        meals_per_day: 6,
        notes: [
          "Small, frequent, low-volume meals (6–8/day) to manage early satiety and dumping.",
          "Prefer soft, low-fibre, low-simple-sugar foods initially; increase fibre gradually as tolerated.",
          "Pair complex carbohydrate with protein and some fat to slow gastric emptying and reduce reactive hypoglycaemia.",
          "Separate fluids from solids (drink ~30 min before/after meals) to ease dumping.",
        ],
        indian_food_examples: [
          { situation: "Day 3–7 soft diet (if tolerated)", items: ["Rice water + very soft mashed dal with a tsp of ghee", "Curd rice (dahi-bhaat), soft-cooked, minimal spice", "Suji kheer with milk, low sugar, a little ghee"] },
          { situation: "Weeks 2–4 (advancing texture)", items: ["Soft moong-dal khichdi with finely mashed vegetables", "Idli with sambar (more lentil, less spice)", "Upma/poha softened with extra water + oil + mashed vegetables", "Very soft paneer bhurji in small servings with soaked phulka"] },
          { situation: "Dumping / diarrhoea management", items: ["Avoid fruit juices, sweet drinks and very sugary desserts", "Prefer small portions of whole fruit (banana, papaya) over juices", "Use low-lactose options (curd, buttermilk) if milk triggers symptoms"] },
        ],
      },
      monitoring: {
        labs: ["Weight trend weekly", "Full blood count", "Albumin / prealbumin (supportive)", "Iron studies and vitamin B12 (esp. after total gastrectomy)"],
        clinical: ["Daily oral/EN/PN intake vs targets", "Stool frequency & consistency (diarrhoea, steatorrhoea)", "Early satiety, nausea, vomiting, dumping (palpitations/sweating after meals)", "Micronutrient-deficiency signs over time (anaemia, neuropathy, glossitis)"],
      },
    },

    systemic: {
      id: "GC_SYSTEMIC_ESPEN_ESMO",
      label: "Systemic therapy",
      title: "Nutrition during systemic therapy for gastric cancer",
      sources: ["ESPEN Cancer 2021", "ESMO Gastric — supportive care"],
      targets: TARGETS,
      steps: [
        { priority: 0, route: "Counselling + monitor", condition: "NRS-2002 < 3 and stable intake",
          recommendation: "Dietary counselling; reinforce protein at each meal; re-screen each cycle.",
          test: (c) => c.nrs < 3 },
        { priority: 1, route: "Oral + ONS", condition: "NRS-2002 ≥ 3 or intake <75% of needs",
          recommendation: "Add oral nutrition supplements between meals; treat symptoms (nausea, mucositis, taste) proactively; target 25–30 kcal/kg and 1.2–1.5 g/kg protein.",
          test: (c) => c.nrs >= 3 || c.intakePct < 75 },
        { priority: 2, route: "Enteral nutrition", condition: "Inadequate oral intake (<60%) for >1–2 weeks despite ONS",
          recommendation: "Consider enteral nutrition (NJ tube) if the gut is functional and oral intake stays below 60% of needs.",
          test: (c) => c.intakePct < 60 },
      ],
      diet_pattern: {
        meals_per_day: 5,
        notes: ["Small, frequent, protein-dense meals; fortify with ghee/oil/nuts/milk when appetite is low.", "Manage treatment side-effects with symptom-specific textures and flavours."],
        indian_food_examples: [
          { situation: "Protein-forward meals", items: ["Moong-dal khichdi + ghee", "Paneer/tofu curry with soft rice or phulka", "Curd rice with a soft side of dal"] },
          { situation: "Snacks / ONS", items: ["Sprouts chaat (lightly spiced)", "Ragi porridge with nut paste", "Buttermilk with roasted-chana powder"] },
        ],
      },
      monitoring: { labs: ["Weight each cycle", "FBC, basic metabolic panel"], clinical: ["NRS-2002 each cycle", "Intake vs targets", "Active symptoms (nausea, mucositis, diarrhoea, taste change)"] },
    },

    advanced: {
      id: "GC_ADVANCED_ESPEN_ESMO",
      label: "Advanced / palliative",
      title: "Nutrition in advanced / palliative gastric cancer",
      sources: ["ESPEN Cancer 2021", "ESMO Gastric — supportive & palliative care"],
      targets: { energy_kcal_per_kg: [25, 30], protein_g_per_kg: [1.0, 1.5] },
      steps: [
        { priority: 0, route: "Comfort-first oral", condition: "Reasonable performance status, oral intake possible",
          recommendation: "Prioritise comfort and food enjoyment. Small, frequent, energy-dense favourites; relax restrictions; manage symptoms aggressively. Targets are goals, not mandates.",
          test: (c) => c.intakePct >= 40 },
        { priority: 1, route: "Oral + ONS / consider EN", condition: "Declining intake but patient wishes active nutrition support",
          recommendation: "Offer ONS; discuss goals of care before any enteral nutrition. Decisions are shared and values-based.",
          test: (c) => c.intakePct < 40 },
        { priority: 2, route: "Obstruction pathway", condition: "Malignant gastric-outlet obstruction",
          recommendation: "Manage per goals of care (stent / venting / EN beyond obstruction / comfort feeding); dietitian + palliative-care input.",
          test: (c) => c.obstruction },
      ],
      diet_pattern: {
        meals_per_day: 6,
        notes: ["Comfort and preference lead. Small, soft, energy-dense, low-effort foods.", "Don't force targets; minimise burdensome restrictions."],
        indian_food_examples: [
          { situation: "Comfort, energy-dense", items: ["Suji/ragi kheer (mild sweetness as tolerated)", "Soft khichdi with extra ghee", "Mashed banana with curd; lassi"] },
          { situation: "If swallowing is hard", items: ["Smooth dal soups", "Curd/soy smoothies", "Idiyappam with mild stew"] },
        ],
      },
      monitoring: { labs: ["Only as aligned with goals of care"], clinical: ["Symptom burden, comfort, intake as tolerated", "Hydration & mouth care"] },
    },
  };

  /* ---------- Assessment entry point ---------- */
  ONCO.gastricAssessment = function (p, calc) {
    if (p.cancerType !== "Gastric") return null;
    const phase = p.gastricPhase || "preop";
    const rs = ONCO.gastricRuleSets[phase] || ONCO.gastricRuleSets.preop;
    const nrs = ONCO.nrs2002(p, calc);
    const ctx = {
      nrs: nrs.total,
      intakePct: nrs.intakePct,
      pctLoss: calc.percent_weight_loss,
      bmi: calc.bmi,
      obstruction: !!p.obstruction,
      elective: p.elective !== false,
      daysPostOp: +p.daysPostOp || 0,
      complication: !!p.gastricComplication,
    };
    const evaluated = rs.steps.map((s, i) => ({ ...s, idx: i, hit: !!s.test(ctx) }));
    const matched = evaluated.filter(s => s.hit);
    const primary = matched.length ? matched.reduce((a, b) => (b.priority > a.priority ? b : a)) : null;
    return { phase, ruleSet: rs, nrs, ctx, steps: evaluated, primary };
  };
})();
