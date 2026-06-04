/* ===== OncoNourish Tool — clinician review + plan outputs ===== */

/* ---------- Clinician review (the approval gate) ---------- */
function ReviewScreen({ p, calc, onApprove, onBack }) {
  const initials = (p.name || "Patient").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const atRisk = calc.nutritional_risk === "AT_RISK";
  const t = calc.targets;
  return (
    <div className="review fade">
      <div className="page-head">
        <div className="kicker"><Ico name="clipboard" size={14} />Clinician review · approval gate</div>
        <h1>Review the calculated plan</h1>
        <p>Deterministic targets from the calculation tool — no AI in this layer. Confirm the flags, then approve to generate the patient's chart and meals.</p>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panel-head"><h3><Ico name="user" size={18} />Patient & targets</h3><span className="tagm">CALC v1.0</span></div>
          <div className="panel-body">
            <div className="psum">
              <div className="av">{initials}</div>
              <div><div className="nm">{p.name || "Unnamed patient"}</div><div className="mt">{p.cancerType || "—"} · Stage {p.stage || "—"} · {p.age}{p.sex ? "/" + p.sex[0] : ""} · BMI {calc.bmi}</div></div>
            </div>
            <div className={"risk " + (atRisk ? "at" : "ok")} style={{ marginTop: 16 }}>
              <span className="ri"><Ico name={atRisk ? "alert" : "shieldCheck"} size={22} /></span>
              <div><b>{atRisk ? "At nutritional risk" : "Nutritionally stable"}</b><span>{calc.percent_weight_loss !== null ? `${calc.percent_weight_loss}% weight change vs usual · ` : "Weight history not available · "}BMI {calc.bmi}</span></div>
            </div>
            <div className="tiles">
              <div className="tile"><div className="tn">{t.energy_kcal_per_day}<small> kcal</small></div><div className="tl">Energy / day</div><div className="tr">{calc.rationale.energy}</div></div>
              <div className="tile"><div className="tn">{t.protein_g_per_day}<small> g</small></div><div className="tl">Protein / day</div><div className="tr">{calc.rationale.protein}</div></div>
              <div className="tile"><div className="tn">{(t.fluid_ml_per_day / 1000).toFixed(1)}<small> L</small></div><div className="tl">Fluids / day</div><div className="tr">{calc.rationale.fluid}</div></div>
            </div>
            <details className="raw">
              <summary><Ico name="chevron" size={13} />View structured output (handed to suggestion engine)</summary>
              <div className="json-peek"><JsonPeek calc={calc} /></div>
            </details>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3><Ico name="alert" size={18} />Clinician flags</h3><span className="tagm">{calc.flags.length} to confirm</span></div>
          <div className="panel-body">
            {calc.flags.length === 0 && (
              <div className="flagrow clean"><span className="fi"><Ico name="check" size={16} sw={2.4} /></span><div><div className="ft">No adjustments needed</div><div className="fr">Targets follow baseline ESPEN guidance for this profile.</div></div></div>
            )}
            <div className="flaglist">
              {calc.flags.map(f => (
                <div className="flagrow" key={f.id}><span className="fi"><Ico name="alert" size={16} /></span><div><div className="ft">{f.label}</div><div className="fr">{f.reason}</div></div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="approvebar">
        <div className="ap-txt"><Ico name="shieldCheck" size={20} />Nothing reaches the patient until you approve. You can adjust inputs first.</div>
        <div className="ap-act">
          <button className="btn btn-ghost" onClick={onBack}><Ico name="arrowL" size={16} />Adjust inputs</button>
          <button className="btn btn-primary" onClick={onApprove}><Ico name="check" size={17} sw={2.4} />Approve & generate plan</button>
        </div>
      </div>
    </div>
  );
}

function JsonPeek({ calc }) {
  const t = calc.targets;
  return (
    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{`{
  `}<span className="k">"bmi"</span>{": "}<span className="n">{calc.bmi}</span>{`,
  `}<span className="k">"nutritional_risk"</span>{": "}<span className="s">"{calc.nutritional_risk}"</span>{`,
  `}<span className="k">"percent_weight_loss"</span>{": "}<span className="n">{calc.percent_weight_loss === null ? "null" : calc.percent_weight_loss}</span>{`,
  `}<span className="k">"targets"</span>{": { "}<span className="k">"energy_kcal_per_day"</span>{": "}<span className="n">{t.energy_kcal_per_day}</span>{", "}<span className="k">"protein_g_per_day"</span>{": "}<span className="n">{t.protein_g_per_day}</span>{", "}<span className="k">"fluid_ml_per_day"</span>{": "}<span className="n">{t.fluid_ml_per_day}</span>{` },
  `}<span className="k">"flags"</span>{": ["}<span className="s">{calc.flags.map(f => `"${f.id}"`).join(", ")}</span>{`]
}`}
    </pre>
  );
}

/* ---------- Patient-facing approved plan ---------- */
function PlanScreen({ p, calc, sug, onReset }) {
  const [day, setDay] = useState(0);
  const days = useMemo(() => [0, 1, 2].map(i => window.ONCO.generateDay(p, calc, i)), [p, calc]);
  const d = days[day];
  const t = calc.targets;

  return (
    <div className="plan fade">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="kicker"><span className="approved-pill">Approved by care team</span></div>
          <h1 style={{ marginTop: 12 }}>{p.name ? p.name.split(" ")[0] + "'s" : "Your"} nutrition plan</h1>
          <p>{p.cancerType || "Supportive"} care · {p.dietType.toLowerCase()} · {p.cuisine} · built around your intolerances and how you're feeling.</p>
        </div>
        <div className="plan-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}><Ico name="printer" size={17} />Print / PDF</button>
          <button className="btn btn-ghost" onClick={onReset}><Ico name="arrowL" size={16} />New patient</button>
        </div>
      </div>

      <div className="grid2">
        {/* Nutrition chart */}
        <div className="panel">
          <div className="panel-head"><h3><Ico name="doc" size={18} />Nutrition Chart</h3><span className="tagm">FRAMEWORK</span></div>
          <div className="panel-body">
            <div className="tiles" style={{ marginBottom: 18 }}>
              <div className="tile"><div className="tn">{t.energy_kcal_per_day}<small> kcal</small></div><div className="tl">Energy / day</div></div>
              <div className="tile"><div className="tn">{t.protein_g_per_day}<small> g</small></div><div className="tl">Protein / day</div></div>
              <div className="tile"><div className="tn">{(t.fluid_ml_per_day / 1000).toFixed(1)}<small> L</small></div><div className="tl">Fluids / day</div></div>
            </div>

            <div className="sec-label"><span className="d" style={{ background: "var(--sage)" }}></span>Foods to favour</div>
            <div className="foodlist" style={{ marginBottom: 16 }}>
              {sug.favour.slice(0, 7).map((f, i) => (
                <div className="fooditem fav" key={i}><span className="fd"></span>{f.name}<span className="why">{f.why}</span></div>
              ))}
            </div>

            <div className="sec-label"><span className="d" style={{ background: "var(--clay)" }}></span>Foods to limit</div>
            <div className="foodlist" style={{ marginBottom: 16 }}>
              {sug.avoid.slice(0, 6).map((f, i) => (
                <div className="fooditem avoid" key={i}><span className="fd"></span>{f.name}<span className="why">{f.why}</span></div>
              ))}
            </div>

            <div className="sec-label"><span className="d" style={{ background: "var(--green)" }}></span>Hydration & supplements</div>
            <div className="guidance" style={{ marginBottom: 16 }}>
              <div className="gline"><Ico name="droplet" size={17} /><span>{sug.hydration}</span></div>
              {sug.supplements.map((s, i) => <div className="gline" key={i}><Ico name="pill" size={17} /><span>{s}</span></div>)}
            </div>

            <div className="sec-label"><span className="d" style={{ background: "var(--green)" }}></span>Do's & don'ts</div>
            <div className="guidance">
              {sug.dosDonts.dos.map((s, i) => <div className="gline" key={"d" + i}><Ico name="check" size={17} sw={2.3} /><span>{s}</span></div>)}
              {sug.dosDonts.donts.map((s, i) => <div className="gline" key={"x" + i} style={{ color: "var(--clay-deep)" }}><Ico name="x" size={17} sw={2.3} style={{ color: "var(--clay)" }} /><span>{s}</span></div>)}
            </div>
          </div>
        </div>

        {/* Meal plan */}
        <div className="panel">
          <div className="panel-head"><h3><Ico name="utensils" size={18} />Daily Meal Plan</h3><span className="tagm">{p.dietType} · {p.cuisine}</span></div>
          <div className="panel-body">
            <div className="daystrip">
              {["Day 1", "Day 2", "Day 3"].map((lab, i) => <button key={i} className={day === i ? "on" : ""} onClick={() => setDay(i)}>{lab}</button>)}
            </div>
            <div className="daybar">
              <div className="daytot">
                <span className={"pill" + (d.energyHit ? " hit" : "")}><b>{d.totalK}</b> kcal</span>
                <span className={"pill" + (d.proteinHit ? " hit" : "")}><b>{d.totalP}</b> g protein</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>target {t.energy_kcal_per_day} kcal · {t.protein_g_per_day} g</span>
            </div>
            {d.meals.map((m, i) => (
              <div className="meal" key={i}>
                <div className="mt">{m.time}</div>
                <div className="mm">
                  <h6>{m.name}</h6>
                  <p>{m.desc}</p>
                  <div className="mtags">
                    {m.sub && <span className="mtag sub">{m.sub}</span>}
                    {(m.tags || []).map((tg, j) => <span className="mtag" key={j}>{tg}</span>)}
                    {(m.fortify || []).map((ff, j) => <span className="mtag forti" key={"f" + j}>+ {ff}</span>)}
                  </div>
                </div>
                <div className="mk"><b>{m.kcal}</b> kcal<br />{m.protein} g</div>
              </div>
            ))}
            <details className="applied-rules">
              <summary><Ico name="chevron" size={13} />Why these meals? · {sug.appliedRules.length + sug.strategies.length} rules applied</summary>
              <div className="rulechips">
                {sug.appliedRules.map(r => <span className="rulechip" key={r.id}><b>{r.id}</b> — {r.note}</span>)}
                {sug.strategies.map(s => <span className="rulechip" key={s.id}><b>{s.id}</b> — {s.text}</span>)}
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="std-disclaimer">
        <Ico name="info" size={18} />
        <div>OncoNourish provides nutritional support guidance reviewed by a qualified clinician. It is not a substitute for medical advice and makes no claim to treat, cure, or arrest cancer. Energy and protein targets follow ESPEN clinical nutrition in cancer guidance (25–30 kcal/kg/day; protein &gt;1.0 up to 1.5 g/kg/day).</div>
      </div>
    </div>
  );
}

Object.assign(window, { ReviewScreen, PlanScreen });
