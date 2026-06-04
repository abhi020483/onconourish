/* ===== OncoNourish Tool — app shell, state, navigation ===== */

const BLANK = {
  consent: false, name: "", age: 58, sex: "Female",
  height: 162, currentWeight: 61, usualWeight: 66, usualUnknown: false, activity: "low",
  cancerType: "", stage: "", treatment: [],
  comorbidities: [], otherConditions: "", medications: [],
  dietType: "Vegetarian", cuisine: "South Indian", mealsPerDay: "3", appetite: "good",
  lactose: false, gluten: false, intolerances: [], allergies: "",
  symptomList: [], severity: {}
};

const SAMPLES = [
  {
    label: "Lakshmi R.", note: "Colorectal · lactose · poor appetite",
    data: { consent: true, name: "Lakshmi R.", age: 58, sex: "Female", height: 162, currentWeight: 61, usualWeight: 66, usualUnknown: false, activity: "low", cancerType: "Colorectal", stage: "III", treatment: ["Chemotherapy"], comorbidities: [], otherConditions: "", medications: ["Capecitabine"], dietType: "Vegetarian", cuisine: "South Indian", mealsPerDay: "Small & frequent", appetite: "poor", lactose: true, gluten: false, intolerances: [], allergies: "", symptomList: ["nausea", "appetite"], severity: { nausea: "mild", appetite: "moderate" } }
  },
  {
    label: "Anita K.", note: "Breast · AC-T · reduced appetite",
    data: { consent: true, name: "Anita K.", age: 47, sex: "Female", height: 158, currentWeight: 59, usualWeight: 62, usualUnknown: false, activity: "low", cancerType: "Breast", stage: "II", treatment: ["Chemotherapy"], comorbidities: ["diabetes"], otherConditions: "", medications: ["Doxorubicin", "Cyclophosphamide"], dietType: "Vegetarian", cuisine: "North Indian", mealsPerDay: "4", appetite: "reduced", lactose: true, gluten: false, intolerances: [], allergies: "", symptomList: ["taste"], severity: { taste: "mild" } }
  },
  {
    label: "Imran S.", note: "Head & neck · radiation · mouth sores",
    data: { consent: true, name: "Imran S.", age: 64, sex: "Male", height: 171, currentWeight: 58, usualWeight: 68, usualUnknown: false, activity: "low", cancerType: "Head & neck", stage: "III", treatment: ["Radiation", "Chemotherapy"], comorbidities: [], otherConditions: "", medications: [], dietType: "Non-vegetarian", cuisine: "North Indian", mealsPerDay: "Small & frequent", appetite: "poor", lactose: false, gluten: false, intolerances: [], allergies: "", symptomList: ["mucositis", "dysphagia", "appetite"], severity: { mucositis: "severe", dysphagia: "moderate", appetite: "severe" } }
  }
];

function App() {
  const [p, setP] = useState(() => ({ ...SAMPLES[0].data }));
  const [phase, setPhase] = useState("wizard"); // wizard | review | plan
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const stageRef = useRef(null);

  const set = (k, v) => { setP(prev => ({ ...prev, [k]: v })); setError(null); };
  const loadSample = (s) => { setP({ ...s.data }); setPhase("wizard"); setStep(9); setError(null); };
  const reset = () => { setP({ ...BLANK }); setPhase("wizard"); setStep(1); setError(null); };

  const scrollTop = () => { if (stageRef.current) stageRef.current.scrollTop = 0; window.scrollTo(0, 0); };

  const next = () => {
    const err = validateStep(step, p);
    if (err) { setError(err); return; }
    if (step < 9) { setStep(step + 1); setError(null); scrollTop(); }
    else { setPhase("review"); scrollTop(); }
  };
  const back = () => { if (step > 1) { setStep(step - 1); setError(null); scrollTop(); } };
  const goTo = (s) => { setStep(s); setError(null); scrollTop(); };

  const toClinician = () => {
    for (const s of [2, 3]) { const e = validateStep(s, p); if (e) { setStep(s); setPhase("wizard"); setError(e); return; } }
    setPhase("review"); scrollTop();
  };

  const calc = useMemo(() => (phase !== "wizard" ? window.ONCO.calc(p) : null), [p, phase]);
  const sug = useMemo(() => (phase === "plan" && calc ? window.ONCO.suggest(p, calc) : null), [p, calc, phase]);

  const meta = STEP_META[step - 1];

  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-in">
          <a className="brand" href="index.html" title="Back to overview" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="mark"><Ico name="leaf" size={17} style={{ color: "#fff" }} /></span>
            Onco<b>Nourish</b>
          </a>
          <div className="role">
            <button className={phase === "wizard" ? "on" : ""} onClick={() => setPhase("wizard")}>Patient intake</button>
            <button className={phase !== "wizard" ? "on" : ""} onClick={toClinician}>Clinician review</button>
          </div>
        </div>
      </header>

      <div className="disclaimer-strip">
        <div className="in"><Ico name="info" size={14} /><span>Supportive care only — reviewed &amp; approved by your clinician. OncoNourish does not treat, cure, or arrest cancer.</span></div>
      </div>

      <main className="stage" ref={stageRef}>
        {phase === "wizard" && (
          <div className="wizard">
            <div className="progress">
              <div className="dots">{Array.from({ length: 9 }).map((_, i) => <span key={i} className={"dot" + (i + 1 === step ? " cur" : i + 1 < step ? " done" : "")}></span>)}</div>
              <span className="step-label">{meta.k}</span>
            </div>
            <div className="bar"><i style={{ width: (step / 9 * 100) + "%" }}></i></div>

            <div className="card">
              <div className="fade" key={step}><StepContent step={step} p={p} set={set} goTo={goTo} /></div>
              {error && <div className="errline"><Ico name="alert" size={15} />{error}</div>}
              <div className="wiz-nav">
                {step > 1
                  ? <button className="btn btn-ghost" onClick={back}><Ico name="arrowL" size={16} />Back</button>
                  : <button className="btn-text" onClick={() => loadSample(SAMPLES[0])} style={{ fontSize: 13.5 }}>Skip — load a sample case</button>}
                <button className="btn btn-primary" onClick={next} disabled={step === 1 && !p.consent}>
                  {step === 9 ? <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Ico name="send" size={16} />Submit for review</span>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>Continue<Ico name="arrowR" size={16} /></span>}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>Demo cases:</span>
              {SAMPLES.map((s, i) => (
                <button key={i} className="rulechip" style={{ cursor: "pointer" }} onClick={() => loadSample(s)} title={s.note}>{s.label}</button>
              ))}
            </div>
          </div>
        )}

        {phase === "review" && calc && (
          <ReviewScreen p={p} calc={calc} onBack={() => { setPhase("wizard"); setStep(9); scrollTop(); }} onApprove={() => { setPhase("plan"); scrollTop(); }} />
        )}

        {phase === "plan" && calc && sug && (
          <PlanScreen p={p} calc={calc} sug={sug} onReset={reset} />
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
