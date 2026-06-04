/* ===== OncoNourish Tool — calculation + suggestion engine (deterministic) ===== */
window.ONCO = window.ONCO || {};

(function () {
  const round = (n, step) => Math.round(n / step) * step;
  const has = (arr, v) => Array.isArray(arr) && arr.includes(v);

  /* ---------- 2. Calculation Tool ---------- */
  ONCO.calc = function (p) {
    const weight = +p.currentWeight, height = +p.height, age = +p.age || 0;
    const hM = height / 100;
    const bmi = weight / (hM * hM);

    // adjusted body weight if BMI > 30 (guard against overfeeding)
    const ideal = 22.5 * hM * hM;
    const usingAdj = bmi > 30;
    const calcW = usingAdj ? ideal + 0.25 * (weight - ideal) : weight;

    // weight-loss screen
    let pctLoss = null;
    const usual = +p.usualWeight;
    if (!p.usualUnknown && usual > 0 && usual >= weight) {
      pctLoss = ((usual - weight) / usual) * 100;
    }
    const lowBmi = bmi < 18.5 || (age >= 70 && bmi < 20);
    const weightLosing = (pctLoss !== null && pctLoss > 5) || lowBmi;
    const reducedIntake = p.appetite === "poor";
    const atRisk = weightLosing || reducedIntake;

    // energy
    const actObj = (ONCO.options.activity.find(a => a.id === p.activity)) || ONCO.options.activity[1];
    const energyFactor = actObj.factor;
    const energy = round(calcW * energyFactor, 10);

    // protein
    const renalNoDialysis = has(p.comorbidities, "renal");
    let proteinFactor = weightLosing ? 1.5 : 1.2;
    let proteinNote = weightLosing ? "1.5 g/kg (weight-losing / cachexia risk)" : "1.2 g/kg (baseline)";
    if (renalNoDialysis) { proteinFactor = 1.0; proteinNote = "1.0 g/kg — renal cap (more conservative value wins)"; }
    const protein = Math.round(calcW * proteinFactor);

    // fluid
    let fluid = weight * 30;
    const fluidBoost = has(p.symptomList, "vomiting") || has(p.symptomList, "diarrhoea");
    if (fluidBoost) fluid += 400;
    const fluidCap = has(p.comorbidities, "cardiac") || renalNoDialysis;
    const fluidMl = round(fluid, 50);

    // flags
    const flags = [];
    if (pctLoss !== null && pctLoss > 5) flags.push({ id: "weight_loss_>5%", label: "Weight loss > 5%", reason: `${pctLoss.toFixed(1)}% loss vs usual weight — nutritional risk.` });
    if (lowBmi) flags.push({ id: "low_bmi", label: "Low BMI", reason: `BMI ${bmi.toFixed(1)} below the healthy threshold for age.` });
    if (reducedIntake) flags.push({ id: "reduced_intake", label: "Reduced intake", reason: "Poor appetite reported — screen for malnutrition." });
    if (renalNoDialysis) flags.push({ id: "renal_protein_cap_review", label: "Confirm renal protein cap", reason: "Protein capped at 1.0 g/kg; restrict K⁺/PO₄. Clinician to confirm dialysis status." });
    if (fluidCap) flags.push({ id: "fluid_cap_review", label: "Confirm fluid cap", reason: "Cardiac / renal restriction may apply — clinician to confirm fluid ceiling." });
    if (has(p.comorbidities, "diabetes")) flags.push({ id: "diabetes_lowgi", label: "Glycaemic control", reason: "Prefer low-GI carbs distributed across meals." });
    if (has(p.comorbidities, "hepatic")) flags.push({ id: "hepatic_manual_review", label: "Hepatic review", reason: "Adjust protein cautiously — clinician sets ceiling." });
    if (usingAdj) flags.push({ id: "adjusted_body_weight", label: "Adjusted body weight used", reason: `BMI ${bmi.toFixed(1)} > 30 — energy & protein use adjusted weight to avoid overfeeding.` });
    if (p.usualUnknown || usual <= 0) flags.push({ id: "usual_weight_missing", label: "Usual weight not provided", reason: "Weight-loss screen skipped — confirm history with patient." });

    return {
      bmi: +bmi.toFixed(1),
      nutritional_risk: atRisk ? "AT_RISK" : "STABLE",
      percent_weight_loss: pctLoss === null ? null : +pctLoss.toFixed(1),
      calc_weight: +calcW.toFixed(1),
      targets: { energy_kcal_per_day: energy, protein_g_per_day: protein, fluid_ml_per_day: fluidMl },
      flags,
      fluidBoost, fluidCap,
      rationale: {
        energy: `${energyFactor} kcal/kg × ${calcW.toFixed(0)} kg (${actObj.label.toLowerCase()})`,
        protein: proteinNote,
        fluid: `30 mL/kg × ${weight} kg${fluidBoost ? " + 400 mL (GI losses)" : ""}${fluidCap ? " — capped per clinician" : ""}`
      }
    };
  };

  /* ---------- 3. Suggestion Engine ---------- */
  function excludedSet(p) {
    const ex = new Set();
    if (p.lactose) ex.add("lactose");
    if (p.gluten) ex.add("gluten");
    (p.intolerances || []).forEach(i => ex.add(i.toLowerCase()));
    return ex;
  }

  // adapt a dish to constraints; returns null if it must be excluded
  function adaptDish(d, ex, symptoms, diabetes) {
    let name = d.name, sub = null, kcal = d.kcal, protein = d.protein;
    const contains = d.contains || [];
    // gluten
    if (ex.has("gluten") && contains.includes("gluten")) {
      if (d.gf_alt) { name = d.gf_alt; sub = "gluten-free"; }
      else return null;
    }
    // lactose
    if (ex.has("lactose") && contains.includes("lactose")) {
      if (d.subKey === "paneer") { name = name.replace(/Paneer/g, "Tofu"); sub = "dairy-free"; }
      else if (d.subKey === "curd") { name = name.replace(/curd/gi, "soy curd"); sub = "dairy-free"; }
      else if (d.subKey === "milk") { name = name.replace(/milk/gi, "soy milk").replace(/Milkshake/g, "Soy shake"); sub = "dairy-free"; }
      else if (d.subKey === "ghee") { name = name.replace(/ghee/gi, "oil"); sub = "dairy-free"; }
      else return null;
    }
    // hard intolerances with no substitute
    for (const tag of ["nuts", "soy", "egg", "fish", "shellfish"]) {
      if (ex.has(tag) && contains.includes(tag)) return null;
    }
    // symptom hard filters
    if ((symptoms.has("mucositis") || symptoms.has("dysphagia")) && !d.soft) return null;
    if (symptoms.has("diarrhoea") && d.fibre && !d.lowFibre) return null;
    return { id: d.id, name, sub, kcal, protein, desc: d.desc, tags: dishTags(d, diabetes) };
  }

  function dishTags(d, diabetes) {
    const t = [];
    if (d.highProtein) t.push("high-protein");
    if (d.soft) t.push("soft");
    if (d.bland) t.push("bland");
    if (d.lowFibre) t.push("low-fibre");
    if (diabetes && d.lowGI) t.push("low-GI");
    return t;
  }

  // score a dish for the patient's symptoms (higher = better fit)
  function scoreDish(d, symptoms, diabetes, atRisk) {
    let s = 0;
    if (atRisk && d.highProtein) s += 3;
    if (symptoms.has("nausea") && (d.bland || d.lowOdour)) s += 3;
    if (symptoms.has("appetite") && d.kcal >= 380) s += 2;
    if (symptoms.has("constipation") && d.fibre) s += 2;
    if (symptoms.has("diarrhoea") && d.lowFibre) s += 2;
    if (diabetes && d.lowGI) s += 2;
    return s;
  }

  function pickFor(slot, p, calc, ex, symptoms, dayIndex, used) {
    const diabetes = has(p.comorbidities, "diabetes");
    const dietMax = ONCO.dietRank[p.dietType] ?? 1;
    let pool = ONCO.dishes.filter(d => d.slot === slot && d.diet <= dietMax);
    let regional = pool.filter(d => (d.region || []).includes(p.cuisine));
    if (regional.length >= 2) pool = regional;
    // adapt + drop nulls
    let adapted = pool.map(d => ({ d, a: adaptDish(d, ex, symptoms, diabetes) })).filter(x => x.a);
    // if constraints collapsed the regional pool, broaden to all regions for variety
    if (adapted.length < 2 && pool === regional) {
      const wide = ONCO.dishes.filter(d => d.slot === slot && d.diet <= dietMax);
      adapted = wide.map(d => ({ d, a: adaptDish(d, ex, symptoms, diabetes) })).filter(x => x.a);
    }
    if (!adapted.length) return null;
    // score, then rotate by day for variety, avoid repeats
    adapted.sort((x, y) => scoreDish(y.d, symptoms, diabetes, calc.nutritional_risk === "AT_RISK") - scoreDish(x.d, symptoms, diabetes, calc.nutritional_risk === "AT_RISK") || y.a.protein - x.a.protein);
    const fresh = adapted.filter(x => !used.has(x.a.id));
    const list = fresh.length ? fresh : adapted;
    return list[dayIndex % list.length].a;
  }

  ONCO.generateDay = function (p, calc, dayIndex) {
    const ex = excludedSet(p);
    const symptoms = new Set(p.symptomList || []);
    const used = new Set();
    const smallFreq = p.mealsPerDay === "Small & frequent" || p.appetite === "poor";
    const slots = smallFreq
      ? [["7:30 AM", "breakfast"], ["10:30 AM", "snack"], ["1:00 PM", "lunch"], ["4:30 PM", "snack"], ["8:00 PM", "dinner"]]
      : [["8:00 AM", "breakfast"], ["1:00 PM", "lunch"], ["5:00 PM", "snack"], ["8:30 PM", "dinner"]];

    const meals = [];
    slots.forEach(([time, slot], i) => {
      const dish = pickFor(slot, p, calc, ex, symptoms, dayIndex + i, used);
      if (dish) { used.add(dish.id); meals.push({ time, ...dish }); }
    });

    // totals + fortify toward energy AND protein targets (±10%)
    let totalK = meals.reduce((s, m) => s + m.kcal, 0);
    let totalP = meals.reduce((s, m) => s + m.protein, 0);
    const target = calc.targets.energy_kcal_per_day;
    const pTarget = calc.targets.protein_g_per_day;
    const dietMax = ONCO.dietRank[p.dietType] ?? 1;
    const avail = ONCO.fortifiers
      .filter(f => (f.diet === undefined || f.diet <= dietMax))
      .map(f => {
        const c = (f.contains || []).filter(x => x !== "lactose" || !(ex.has("lactose") && f.sub));
        if (ex.has("lactose") && (f.contains || []).includes("lactose") && f.sub) return { ...f, name: f.sub, contains: c };
        return { ...f, contains: c };
      })
      .filter(f => !(f.contains || []).some(x => ex.has(x)));
    let guard = 0;
    while (guard < 9 && (totalK < target * 0.92 || totalP < pTarget * 0.9)) {
      const needP = totalP < pTarget * 0.9;
      let pool = needP ? avail.filter(f => f.proteinRich) : avail;
      if (!pool.length) pool = avail;
      if (!pool.length) break;
      const f = needP ? pool.reduce((a, b) => (b.protein > a.protein ? b : a)) : pool.reduce((a, b) => (b.kcal < a.kcal ? a : b), pool[0]);
      const main = meals.reduce((a, b) => ((b.fortify || []).length < (a.fortify || []).length ? b : a), meals[0]);
      main.fortify = main.fortify || [];
      main.fortify.push(f.name);
      main.kcal += f.kcal; main.protein += f.protein;
      totalK += f.kcal; totalP += f.protein; guard++;
    }
    return {
      meals,
      totalK: Math.round(totalK),
      totalP: Math.round(totalP),
      energyHit: Math.abs(totalK - target) <= target * 0.12,
      proteinHit: totalP >= pTarget * 0.88
    };
  };

  ONCO.suggest = function (p, calc) {
    const ex = excludedSet(p);
    const symptoms = new Set(p.symptomList || []);
    const atRisk = calc.nutritional_risk === "AT_RISK";
    const appliedRules = [];

    // favour
    const favour = ONCO.favourBase.map(name => ({ name, why: "Foundational supportive nutrition" }));
    if (atRisk) {
      appliedRules.push({ id: "protein_priority", note: "Elevated protein target — protect muscle mass" });
      const dietMax = ONCO.dietRank[p.dietType] ?? 1;
      const protFoods = atRiskFoods(p, ex, dietMax);
      protFoods.forEach(f => favour.unshift(f));
    }
    if (has(p.comorbidities, "diabetes")) {
      appliedRules.push({ id: "diabetes_lowgi", note: "Prefer low-GI carbs, distribute across meals" });
      favour.push({ name: "Millets & whole pulses", why: "Low-GI · steadier glucose" });
    }

    // avoid
    const avoid = ONCO.avoidBase.map(name => ({ name, why: "General supportive-care caution" }));
    if (p.lactose) { appliedRules.push({ id: "lactose_intolerant", note: "Dairy excluded; soy substitutes used" }); avoid.push({ name: "Milk, paneer, curd", why: "Lactose — use soy milk / tofu / soy curd" }); }
    if (p.gluten) { appliedRules.push({ id: "gluten_intolerant", note: "Wheat excluded; millet substitutes used" }); avoid.push({ name: "Wheat roti, suji, maida", why: "Gluten — use jowar / bajra / rice" }); }
    if (has(p.comorbidities, "renal")) { appliedRules.push({ id: "renal_cap", note: "Restrict potassium & phosphorus" }); avoid.push({ name: "Banana, citrus, coconut water, nuts", why: "Renal — limit potassium / phosphorus" }); }
    if (has(p.comorbidities, "cardiac")) { appliedRules.push({ id: "cardiac_sodium", note: "Reduce sodium; cap fluid per clinician" }); avoid.push({ name: "Pickles, papad, fried & processed", why: "Cardiac — reduce sodium" }); }

    // symptom strategies
    const strategies = (p.symptomList || []).map(id => ({
      id, label: (ONCO.options.symptoms.find(s => s.id === id) || {}).label || id,
      text: ONCO.symptomStrategy[id]
    })).filter(s => s.text);
    if (p.appetite === "poor") appliedRules.push({ id: "low_appetite", note: "Small frequent energy-dense meals; fortify with ghee/oil/nuts" });

    // hydration / supplements / dos & don'ts
    const hydration = `Aim for ~${(calc.targets.fluid_ml_per_day / 1000).toFixed(1)} L of fluids daily${calc.fluidBoost ? " (increased for GI losses)" : ""}${calc.fluidCap ? " — within the clinician's fluid limit" : ""}. Prefer water, soups, buttermilk, coconut water (unless restricted).`;
    const supplements = [];
    if (atRisk) supplements.push("Consider oral nutrition supplement (ONS) between meals — clinician to specify");
    supplements.push("Vitamin D / B₁₂ only if clinically indicated — not routine");
    if (has(p.comorbidities, "renal")) supplements.push("Avoid potassium / phosphate-containing supplements unless prescribed");

    const dosDonts = {
      dos: ["Eat small amounts often, even when appetite is low", "Include a protein source at every meal", "Sip fluids through the day; maintain food hygiene"],
      donts: ["Don't skip meals or rely on liquids alone", "Avoid raw, street or reheated leftover food during therapy", "Don't start herbal / mega-dose supplements without your team"]
    };

    return {
      favour: dedupe(favour), avoid: dedupe(avoid),
      hydration, supplements, dosDonts, strategies, appliedRules: dedupeRules(appliedRules)
    };
  };

  function atRiskFoods(p, ex, dietMax) {
    const base = [
      { name: "Dal & whole pulses", why: "Affordable plant protein", diet: 0 },
      { name: "Soya chunks / tofu", why: "High protein, dairy-free", diet: 0 },
      { name: "Paneer / curd", why: "Protein + calories", diet: 1, lactose: true, alt: "Tofu / soy curd" },
      { name: "Eggs", why: "High-value protein", diet: 2, tag: "egg" },
      { name: "Chicken / fish", why: "Lean complete protein", diet: 3 },
      { name: "Nuts & seeds", why: "Energy-dense, fortifying", diet: 0, tag: "nuts" }
    ];
    return base.filter(f => {
      if (f.diet > dietMax) return false;
      if (f.tag && ex.has(f.tag)) return false;
      return true;
    }).map(f => {
      if (f.lactose && ex.has("lactose")) return { name: f.alt, why: f.why + " (dairy-free)" };
      return { name: f.name, why: f.why };
    });
  }

  function dedupe(arr) { const seen = new Set(); return arr.filter(x => { const k = x.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); }
  function dedupeRules(arr) { const seen = new Set(); return arr.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }); }
})();
