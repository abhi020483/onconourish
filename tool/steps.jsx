/* ===== OncoNourish Tool — wizard steps ===== */

const STEP_META = [
  { t: "Welcome", k: "Step 1 of 9" },
  { t: "About you", k: "Step 2 of 9" },
  { t: "Body measures", k: "Step 3 of 9" },
  { t: "Cancer & treatment", k: "Step 4 of 9" },
  { t: "Medical background", k: "Step 5 of 9" },
  { t: "How you're eating", k: "Step 6 of 9" },
  { t: "Food intolerances", k: "Step 7 of 9" },
  { t: "How you're feeling", k: "Step 8 of 9" },
  { t: "Review & submit", k: "Step 9 of 9" }
];

function validateStep(step, p) {
  if (step === 1 && !p.consent) return "Please give consent to continue.";
  if (step === 2) {
    if (!p.age || p.age < 1 || p.age > 120) return "Please enter an age between 1 and 120.";
  }
  if (step === 3) {
    if (!p.height || p.height < 120 || p.height > 220) return "Please enter a height between 120 and 220 cm.";
    if (!p.currentWeight || p.currentWeight < 25 || p.currentWeight > 250) return "Please enter a weight between 25 and 250 kg.";
    if (!p.usualUnknown && p.usualWeight && (p.usualWeight < 25 || p.usualWeight > 250)) return "Please check the usual weight value.";
  }
  if (step === 4 && p.cancerType === "Gastric" && !p.gastricPhase) return "Please choose the gastric treatment phase.";
  return null;
}

const O = window.ONCO.options;
const arrToggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

function StepContent({ step, p, set, goTo }) {
  switch (step) {
    /* 1 — welcome & consent */
    case 1: return (
      <div>
        <div className="eyebrow-sm">Supportive nutrition care</div>
        <h2 className="q-title">Let's set up your nutrition plan</h2>
        <p className="q-sub">A few short questions help your care team build a nutrition chart and daily meals that fit your treatment, your body and your kitchen. It takes about 5 minutes.</p>
        <ul className="privacy">
          <li><Ico name="lock" /><span>Your information is private and used only to prepare your plan.</span></li>
          <li><Ico name="shieldCheck" /><span>Your oncologist or dietitian reviews and approves everything before you receive it.</span></li>
          <li><Ico name="info" /><span>This is <b>supportive care</b> — it helps you stay nourished. It does not treat, cure, or arrest cancer.</span></li>
        </ul>
        <div className={"consent-card" + (p.consent ? " on" : "")} onClick={() => set("consent", !p.consent)} style={{ cursor: "pointer" }}>
          <span className="box" style={{ width: 22, height: 22, borderRadius: 7, border: "1.6px solid " + (p.consent ? "var(--green)" : "var(--line-strong)"), background: p.consent ? "var(--green)" : "#fff", display: "grid", placeItems: "center", flex: "none" }}>
            {p.consent && <Ico name="check" size={14} sw={3} style={{ color: "#fff" }} />}
          </span>
          <div style={{ fontSize: 14, color: "var(--ink-soft)" }}><b style={{ color: "var(--ink)" }}>I consent</b> to share this information with my care team to prepare a nutrition plan.</div>
        </div>
      </div>
    );

    /* 2 — about you */
    case 2: return (
      <div>
        <div className="eyebrow-sm">About you</div>
        <h2 className="q-title">Tell us a little about yourself</h2>
        <p className="q-sub">We use your age and sex to choose the right reference ranges.</p>
        <Field label="Your name" optional help="You can skip this — it only personalises your plan.">
          <input type="text" value={p.name} placeholder="e.g. Anita K." onChange={e => set("name", e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Age"><Stepper value={p.age} onChange={v => set("age", v)} min={1} max={120} unit="years" /></Field>
          <Field label="Sex"><Seg options={O.sex} value={p.sex} onChange={v => set("sex", v)} /></Field>
        </div>
      </div>
    );

    /* 3 — body measures */
    case 3: {
      const bmi = (p.height > 0 && p.currentWeight > 0) ? (p.currentWeight / Math.pow(p.height / 100, 2)) : null;
      return (
        <div>
          <div className="eyebrow-sm">Body measures</div>
          <h2 className="q-title">Your body measures</h2>
          <p className="q-sub">This helps us set the right energy and protein goals for you.</p>
          <div className="row2">
            <Field label="Height"><div className="input-unit"><input type="number" value={p.height} onChange={e => set("height", e.target.value === "" ? "" : +e.target.value)} /><span className="u">cm</span></div></Field>
            <Field label="Current weight"><div className="input-unit"><input type="number" value={p.currentWeight} onChange={e => set("currentWeight", e.target.value === "" ? "" : +e.target.value)} /><span className="u">kg</span></div></Field>
          </div>
          <Field label="Your weight about 6 months ago" help="This helps us see if you've lost weight recently.">
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="input-unit" style={{ flex: "1 1 160px" }}>
                <input type="number" value={p.usualUnknown ? "" : p.usualWeight} disabled={p.usualUnknown} onChange={e => set("usualWeight", e.target.value === "" ? "" : +e.target.value)} style={p.usualUnknown ? { opacity: .5 } : null} />
                <span className="u">kg</span>
              </div>
              <Chk label="I'm not sure" on={p.usualUnknown} onClick={() => set("usualUnknown", !p.usualUnknown)} />
            </div>
          </Field>
          <Field label="Activity level" help="How mobile you are most of the day — it adjusts your energy target.">
            <Seg options={O.activity} value={p.activity} onChange={v => set("activity", v)} sm />
          </Field>
          {bmi && <div className="silent-hint"><Ico name="info" size={15} />Recorded for your care team. We focus on goals, not labels — there's no number to worry about here.</div>}
        </div>
      );
    }

    /* 4 — cancer & treatment */
    case 4: return (
      <div>
        <div className="eyebrow-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>Cancer & treatment <span className="mono" style={{ fontSize: 10, color: "var(--clay-deep)", background: "var(--rose-bg)", border: "1px solid var(--rose-line)", padding: "2px 7px", borderRadius: 6 }}>CLINICIAN-CONFIRMED</span></div>
        <h2 className="q-title">Your cancer & treatment</h2>
        <p className="q-sub">Your care team will confirm these clinical details. Choose what you know.</p>
        <div className="row2">
          <Field label="Cancer type"><select value={p.cancerType} onChange={e => set("cancerType", e.target.value)}><option value="">Select…</option>{O.cancerTypes.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Stage"><select value={p.stage} onChange={e => set("stage", e.target.value)}><option value="">Select…</option>{O.stages.map(s => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Current treatment" optional help="Select all that apply.">
          <div className="chipset">{O.treatments.map(t => <Chk key={t} label={t} on={p.treatment.includes(t)} onClick={() => set("treatment", arrToggle(p.treatment, t))} />)}</div>
        </Field>
        {p.cancerType === "Gastric" && (
          <div className="gastric-path">
            <div className="eyebrow-sm" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>Gastric pathway <span className="mono" style={{ fontSize: 10, color: "var(--green)", background: "var(--mint)", border: "1px solid var(--line)", padding: "2px 7px", borderRadius: 6 }}>ESPEN / ESMO</span></div>
            <Field label="Treatment phase" help="Drives NRS-2002 screening and the recommended nutrition route.">
              <Seg options={O.gastricPhases} value={p.gastricPhase} onChange={v => set("gastricPhase", v)} sm />
            </Field>
            {p.gastricPhase === "preop" && (
              <div className="row2">
                <Field><ToggleRow title="Gastric-outlet obstruction" sub="Blocks adequate oral/enteral intake" on={p.obstruction} onClick={() => set("obstruction", !p.obstruction)} /></Field>
                <Field><ToggleRow title="Elective surgery" sub="Planned, not emergency" on={p.elective} onClick={() => set("elective", !p.elective)} /></Field>
              </div>
            )}
            {p.gastricPhase === "postop" && (
              <div className="row2">
                <Field label="Days since surgery"><Stepper value={p.daysPostOp} onChange={v => set("daysPostOp", v)} min={0} max={120} unit="days" /></Field>
                <Field><ToggleRow title="Major complication" sub="Anastomotic leak / ileus / prolonged NPO" on={p.gastricComplication} onClick={() => set("gastricComplication", !p.gastricComplication)} /></Field>
              </div>
            )}
          </div>
        )}
      </div>
    );

    /* 5 — medical background */
    case 5: return (
      <div>
        <div className="eyebrow-sm">Medical background</div>
        <h2 className="q-title">Your medical background</h2>
        <p className="q-sub">Other conditions can change your nutrition targets. Medications are verified by your doctor.</p>
        <Field label="Do you have any of these?" optional>
          <div className="chipset">{O.comorbidities.map(c => <Chk key={c.id} label={c.label} on={p.comorbidities.includes(c.id)} onClick={() => set("comorbidities", arrToggle(p.comorbidities, c.id))} />)}</div>
        </Field>
        <Field label="Other conditions" optional>
          <textarea value={p.otherConditions} placeholder="Anything else your care team should know…" onChange={e => set("otherConditions", e.target.value)} />
        </Field>
        <Field label="Current medications" optional help="Type a medicine and press Enter. Your doctor checks for drug–nutrient interactions.">
          <TagInput tags={p.medications} onChange={v => set("medications", v)} placeholder="e.g. Metformin, then Enter" />
        </Field>
      </div>
    );

    /* 6 — how you're eating */
    case 6: return (
      <div>
        <div className="eyebrow-sm">How you're eating</div>
        <h2 className="q-title">How you usually eat</h2>
        <p className="q-sub">So your meals feel familiar, affordable and easy to make at home.</p>
        <Field label="Diet type"><Seg options={O.dietTypes} value={p.dietType} onChange={v => set("dietType", v)} sm /></Field>
        <div className="row2">
          <Field label="Regional cuisine"><select value={p.cuisine} onChange={e => set("cuisine", e.target.value)}>{O.cuisines.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Meals per day"><Seg options={O.mealsPerDay} value={p.mealsPerDay} onChange={v => set("mealsPerDay", v)} sm /></Field>
        </div>
        <Field label="Your appetite right now">
          <div className="faces">
            {O.appetite.map(a => <button key={a.id} type="button" className={"face" + (p.appetite === a.id ? " on" : "")} onClick={() => set("appetite", a.id)}><div className="emoji">{a.emoji}</div><div className="fl">{a.label}</div></button>)}
          </div>
        </Field>
      </div>
    );

    /* 7 — intolerances */
    case 7: return (
      <div>
        <div className="eyebrow-sm">Food intolerances</div>
        <h2 className="q-title">Foods to keep out</h2>
        <p className="q-sub">We'll automatically swap these for safe, familiar alternatives.</p>
        <Field><ToggleRow title="Lactose intolerant" sub="We'll use soy milk, tofu and soy curd" on={p.lactose} onClick={() => set("lactose", !p.lactose)} /></Field>
        <Field><ToggleRow title="Gluten intolerant" sub="We'll use rice, jowar and bajra instead of wheat" on={p.gluten} onClick={() => set("gluten", !p.gluten)} /></Field>
        <Field label="Anything else to avoid?" optional>
          <div className="chipset">{O.intolerancesStd.map(i => <Chk key={i} label={i} on={p.intolerances.includes(i)} onClick={() => set("intolerances", arrToggle(p.intolerances, i))} />)}</div>
        </Field>
        <Field label="Other allergies" optional>
          <input type="text" value={p.allergies} placeholder="e.g. sesame" onChange={e => set("allergies", e.target.value)} />
        </Field>
      </div>
    );

    /* 8 — symptoms */
    case 8: return (
      <div>
        <div className="eyebrow-sm">How you're feeling</div>
        <h2 className="q-title">How you're feeling lately</h2>
        <p className="q-sub">Tell us about any side-effects so we can choose foods that are gentler and easier.</p>
        <div className="chipset" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          {O.symptoms.map(s => {
            const on = p.symptomList.includes(s.id);
            return (
              <div key={s.id} className="symrow">
                <button type="button" className={"chk" + (on ? " on" : "")} style={{ flex: 1, justifyContent: "flex-start" }} onClick={() => set("symptomList", arrToggle(p.symptomList, s.id))}>
                  <span className="box"><Ico name="check" size={12} sw={3} /></span>{s.label}
                </button>
                {on && <div className="sev">{["mild", "moderate", "severe"].map(lv => <button key={lv} className={p.severity[s.id] === lv ? "on" : ""} onClick={() => set("severity", { ...p.severity, [s.id]: lv })}>{lv[0].toUpperCase() + lv.slice(1)}</button>)}</div>}
              </div>
            );
          })}
        </div>
        <p className="help" style={{ marginTop: 16 }}>Feeling fine? You can leave this blank and continue.</p>
      </div>
    );

    /* 9 — review */
    case 9: {
      const rows = [
        { step: 2, label: "About you", val: `${p.name || "—"} · ${p.age} yrs · ${p.sex}` },
        { step: 3, label: "Body measures", val: `${p.height} cm · ${p.currentWeight} kg · usual ${p.usualUnknown ? "not sure" : p.usualWeight + " kg"} · ${(O.activity.find(a => a.id === p.activity) || {}).label}` },
        { step: 4, label: "Cancer & treatment", val: `${p.cancerType || "—"} · Stage ${p.stage || "—"}${p.cancerType === "Gastric" && p.gastricPhase ? " · " + (O.gastricPhases.find(g => g.id === p.gastricPhase) || {}).label : ""}${p.treatment.length ? " · " + p.treatment.join(", ") : ""}` },
        { step: 5, label: "Medical background", val: (p.comorbidities.length ? p.comorbidities.map(id => (O.comorbidities.find(c => c.id === id) || {}).label).join(", ") : "None") + (p.medications.length ? " · " + p.medications.length + " medication(s)" : "") },
        { step: 6, label: "How you're eating", val: `${p.dietType} · ${p.cuisine} · ${p.mealsPerDay} meals · ${(O.appetite.find(a => a.id === p.appetite) || {}).label} appetite` },
        { step: 7, label: "Intolerances", val: [p.lactose && "Lactose", p.gluten && "Gluten", ...p.intolerances].filter(Boolean).join(", ") || "None" },
        { step: 8, label: "Symptoms", val: p.symptomList.length ? p.symptomList.map(id => (O.symptoms.find(s => s.id === id) || {}).label).join(", ") : "None reported" }
      ];
      return (
        <div>
          <div className="eyebrow-sm">Review & submit</div>
          <h2 className="q-title">Check your answers</h2>
          <p className="q-sub">Edit anything that doesn't look right, then submit for your care team to review.</p>
          <div style={{ display: "grid", gap: 0, border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
            {rows.map(r => (
              <div key={r.step} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "#fff" }}>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 14, color: "var(--ink)" }}>{r.val}</div>
                </div>
                <button className="btn-text" style={{ padding: "2px 6px", fontSize: 13, color: "var(--green)", fontWeight: 600, display: "inline-flex", gap: 5, alignItems: "center" }} onClick={() => goTo(r.step)}><Ico name="pencil" size={13} />Edit</button>
              </div>
            ))}
          </div>
          <div className="std-disclaimer" style={{ marginTop: 18 }}><Ico name="info" size={18} /><div>Your care team will review this before your plan is finalised. OncoNourish provides supportive nutritional guidance only — it is not a substitute for medical advice and makes no claim to treat, cure, or arrest cancer.</div></div>
        </div>
      );
    }
    default: return null;
  }
}

Object.assign(window, { STEP_META, validateStep, StepContent });
