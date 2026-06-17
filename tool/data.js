/* ===== OncoNourish Tool — data layer (options, rules, food + meal library) ===== */
window.ONCO = window.ONCO || {};

ONCO.options = {
  sex: ["Female", "Male", "Other"],
  activity: [
    { id: "bedbound", label: "Bedbound / very low", factor: 25 },
    { id: "low", label: "Low–moderate", factor: 27 },
    { id: "ambulatory", label: "Ambulatory / regaining", factor: 30 }
  ],
  cancerTypes: ["Breast", "Colorectal", "Head & neck", "Upper-GI", "Gastric"],
  stages: ["I", "II", "III", "IV", "Not sure"],
  gastricPhases: [
    { id: "preop", label: "Pre-op (resectable)" },
    { id: "postop", label: "Post-gastrectomy" },
    { id: "systemic", label: "Systemic therapy" },
    { id: "advanced", label: "Advanced / palliative" }
  ],
  treatments: ["Chemotherapy", "Radiation", "Surgery", "Targeted therapy", "None yet"],
  comorbidities: [
    { id: "diabetes", label: "Diabetes" },
    { id: "renal", label: "Kidney (renal)" },
    { id: "cardiac", label: "Heart (cardiac)" },
    { id: "hepatic", label: "Liver (hepatic)" },
    { id: "thyroid", label: "Thyroid" },
    { id: "hypertension", label: "High BP" }
  ],
  dietTypes: ["Vegetarian", "Eggetarian", "Non-vegetarian", "Vegan"],
  cuisines: ["South Indian", "North Indian", "East Indian", "West Indian"],
  mealsPerDay: ["2", "3", "4", "Small & frequent"],
  appetite: [
    { id: "good", label: "Good", emoji: "🙂" },
    { id: "reduced", label: "Reduced", emoji: "😐" },
    { id: "poor", label: "Poor", emoji: "😔" }
  ],
  intolerancesStd: ["Nuts", "Soy", "Shellfish", "Egg", "Fish"],
  symptoms: [
    { id: "nausea", label: "Nausea" },
    { id: "vomiting", label: "Vomiting" },
    { id: "mucositis", label: "Mouth sores" },
    { id: "taste", label: "Taste changes" },
    { id: "diarrhoea", label: "Diarrhoea" },
    { id: "constipation", label: "Constipation" },
    { id: "appetite", label: "Poor appetite" },
    { id: "fatigue", label: "Fatigue" },
    { id: "dysphagia", label: "Swallowing difficulty" },
    { id: "early_satiety", label: "Early satiety / fullness" },
    { id: "dumping", label: "Dumping syndrome" }
  ]
};

/* Symptom → dietary strategy (spec 3.4) */
ONCO.symptomStrategy = {
  nausea: "Bland, cool, low-odour foods; ginger; small frequent portions",
  vomiting: "Sips of fluid, dry bland foods, rehydration; avoid strong smells",
  mucositis: "Soft, moist, non-acidic, non-spicy — smoothies, khichdi, purées",
  taste: "Tart / marinated flavours and varied textures to counter dullness",
  diarrhoea: "Low-fibre, low-fat; bananas, rice, curd if tolerated; extra fluids",
  constipation: "Higher fibre, more fluids, prunes / papaya",
  appetite: "Energy-dense meals fortified with ghee, oil, milk powder or nuts",
  fatigue: "Easy-to-prepare, ready-to-eat energy-dense options",
  dysphagia: "Soft, moist, easy-to-swallow textures; purées and thick liquids",
  early_satiety: "Small, frequent, energy- and protein-dense low-bulk meals; ONS between meals; limit fluids with meals",
  dumping: "Small frequent meals; avoid sugary drinks/sweets; pair carbs with protein & fat; separate fluids from solids (~30 min apart); low-lactose if needed"
};

/* Rules config (spec 3.2) — editable by a clinical advisor */
ONCO.rules = [
  { id: "protein_priority", when: "AT_RISK", favour: ["Dal", "Paneer", "Eggs", "Chicken", "Fish", "Soya chunks", "Milk", "Curd", "Nuts"], reason: "Meet elevated protein target to protect muscle mass" },
  { id: "lactose_intolerant", when: "lactose", exclude: ["Milk", "Paneer", "Curd", "Khoa"], substitute: { Milk: "Soy milk", Paneer: "Tofu", Curd: "Soy curd" } },
  { id: "gluten_intolerant", when: "gluten", exclude: ["Wheat roti", "Suji", "Maida", "Barley"], substitute: { "Wheat roti": "Jowar / bajra roti" } },
  { id: "renal_cap", when: "renal", note: "Restrict potassium & phosphorus; confirm protein cap", limit: ["Banana", "Citrus", "Nuts", "Coconut water"] },
  { id: "diabetes_lowgi", when: "diabetes", note: "Prefer low-GI carbs; distribute across meals", favour: ["Millets", "Whole pulses", "Vegetables"] },
  { id: "cardiac_sodium", when: "cardiac", note: "Reduce sodium; cap fluid per clinician", limit: ["Pickles", "Papad", "Processed / fried"] },
  { id: "low_appetite", when: "appetite", strategy: "Small frequent energy-dense meals; add ghee / oil / nut-butter" }
];

/* Base favour / avoid lists */
ONCO.favourBase = ["Soft-cooked dals & pulses", "Seasonal cooked vegetables", "Whole grains & millets", "Curd / fermented foods", "Hydrating fluids & soups"];
ONCO.avoidBase = ["Raw / street food", "Very spicy or acidic food", "Unpasteurised dairy", "Grapefruit (drug interaction)", "Alcohol & sugary drinks"];

/* Meal library. diet: 0=vegan 1=veg(dairy) 2=egg 3=nonveg.
   slot: breakfast|snack|lunch|dinner. contains: intolerance tags.
   tags: soft|bland|lowOdour|lowFibre|lowGI|highProtein|fibre. region array. */
ONCO.dishes = [
  // breakfast
  { id:"ragi_idli", name:"Ragi idli + moong sambar", slot:"breakfast", kcal:320, protein:14, diet:1, region:["South Indian"], contains:["gluten"], soft:true, bland:true, lowOdour:true, gf_alt:"Plain ragi idli + sambar", desc:"Soft, easy to swallow · high protein" },
  { id:"pesarattu", name:"Pesarattu (moong dosa) + chutney", slot:"breakfast", kcal:300, protein:15, diet:0, region:["South Indian"], contains:[], highProtein:true, desc:"Green-gram dosa · protein-forward, gluten-free" },
  { id:"veg_upma", name:"Vegetable rava upma", slot:"breakfast", kcal:290, protein:8, diet:1, region:["South Indian","West Indian"], contains:["gluten"], soft:true, bland:true, desc:"Warm, soft semolina with vegetables" },
  { id:"paneer_paratha", name:"Paneer paratha + curd", slot:"breakfast", kcal:420, protein:18, diet:1, region:["North Indian"], contains:["gluten","lactose"], highProtein:true, subKey:"paneer", desc:"Protein-rich stuffed flatbread" },
  { id:"besan_chilla", name:"Besan chilla + mint chutney", slot:"breakfast", kcal:280, protein:13, diet:0, region:["North Indian","West Indian"], contains:[], highProtein:true, lowGI:true, desc:"Gram-flour pancake · gluten-free, low-GI" },
  { id:"egg_bhurji_toast", name:"Egg bhurji + millet toast", slot:"breakfast", kcal:360, protein:20, diet:2, region:["North Indian"], contains:["egg"], highProtein:true, desc:"Scrambled eggs · very high protein" },
  { id:"poha", name:"Vegetable poha + peanuts", slot:"breakfast", kcal:310, protein:9, diet:0, region:["West Indian"], contains:["nuts"], bland:true, desc:"Light flattened-rice · gentle on the gut" },
  { id:"chenna_porridge", name:"Chana-dal & rice porridge", slot:"breakfast", kcal:300, protein:12, diet:0, region:["East Indian"], contains:[], soft:true, bland:true, lowOdour:true, desc:"Soft savoury porridge · soothing" },

  // snack
  { id:"banana_almond", name:"Banana + soaked almonds", slot:"snack", kcal:180, protein:6, diet:0, region:["South Indian","North Indian","East Indian","West Indian"], contains:["nuts"], desc:"Energy-dense snack between meals", potassium:true },
  { id:"sprouts_chaat", name:"Steamed sprouts chaat", slot:"snack", kcal:160, protein:10, diet:0, region:["West Indian","North Indian"], contains:[], highProtein:true, fibre:true, lowGI:true, desc:"Protein + fibre, lightly spiced" },
  { id:"curd_rice_small", name:"Small curd rice", slot:"snack", kcal:200, protein:7, diet:1, region:["South Indian"], contains:["lactose"], soft:true, bland:true, subKey:"curd", desc:"Cooling, soothing · easy to tolerate" },
  { id:"peanut_chikki", name:"Peanut & jaggery chikki", slot:"snack", kcal:210, protein:7, diet:0, region:["West Indian","North Indian"], contains:["nuts"], sweet:true, desc:"Energy-dense bite, fortifies calories" },
  { id:"date_milkshake", name:"Date & nut milkshake", slot:"snack", kcal:240, protein:9, diet:1, region:["North Indian"], contains:["lactose","nuts"], soft:true, sweet:true, subKey:"milk", desc:"Smooth, energy-dense · easy to sip" },
  { id:"coconut_water", name:"Tender coconut water + biscuit", slot:"snack", kcal:140, protein:3, diet:0, region:["South Indian"], contains:["gluten"], bland:true, lowOdour:true, potassium:true, desc:"Hydrating, gentle for nausea" },
  { id:"moong_soup", name:"Moong dal soup", slot:"snack", kcal:170, protein:11, diet:0, region:["South Indian","North Indian","East Indian","West Indian"], contains:[], soft:true, bland:true, lowOdour:true, highProtein:true, desc:"Warm, soft, protein-rich sip" },
  { id:"banana_smoothie", name:"Banana & curd smoothie", slot:"snack", kcal:220, protein:9, diet:1, region:["South Indian","North Indian","East Indian","West Indian"], contains:["lactose"], soft:true, bland:true, subKey:"curd", desc:"Smooth, easy to sip · soothing" },
  { id:"oats_porridge", name:"Oats & nut porridge", slot:"snack", kcal:240, protein:9, diet:1, region:["North Indian","West Indian"], contains:["lactose","nuts"], soft:true, bland:true, subKey:"milk", desc:"Soft, energy-dense porridge" },

  // lunch
  { id:"curd_rice_paneer", name:"Curd rice + paneer bhurji", slot:"lunch", kcal:450, protein:22, diet:1, region:["South Indian"], contains:["lactose"], highProtein:true, soft:true, subKey:"curd", desc:"Comfort meal · protein-forward" },
  { id:"sambar_rice_veg", name:"Sambar rice + steamed beans", slot:"lunch", kcal:420, protein:14, diet:0, region:["South Indian"], contains:[], fibre:true, desc:"Lentil-rich, balanced plate" },
  { id:"rajma_chawal", name:"Rajma + rice + salad", slot:"lunch", kcal:470, protein:17, diet:0, region:["North Indian"], contains:[], highProtein:true, fibre:true, desc:"Kidney-bean curry · hearty protein" },
  { id:"dal_roti_sabzi", name:"Dal + roti + seasonal sabzi", slot:"lunch", kcal:440, protein:16, diet:1, region:["North Indian","West Indian","East Indian"], contains:["gluten"], gf_alt:"Dal + jowar roti + sabzi", desc:"Everyday balanced thali" },
  { id:"fish_curry_rice", name:"Light fish curry + rice", slot:"lunch", kcal:480, protein:26, diet:3, region:["East Indian","South Indian"], contains:["fish"], highProtein:true, lowOdour:false, desc:"High-quality protein · well tolerated" },
  { id:"chicken_pulao", name:"Soft chicken & veg pulao", slot:"lunch", kcal:520, protein:28, diet:3, region:["North Indian"], contains:[], highProtein:true, soft:true, desc:"Tender, protein-dense one-pot" },
  { id:"khichdi_ghee", name:"Moong khichdi + ghee", slot:"lunch", kcal:400, protein:13, diet:1, region:["North Indian","East Indian","West Indian","South Indian"], contains:["lactose"], soft:true, bland:true, lowOdour:true, lowFibre:true, subKey:"ghee", desc:"Soft, soothing · gentle on the gut" },

  // dinner
  { id:"veg_khichdi_dinner", name:"Vegetable khichdi + curd", slot:"dinner", kcal:380, protein:14, diet:1, region:["South Indian","North Indian","East Indian","West Indian"], contains:["lactose"], soft:true, bland:true, lowFibre:true, subKey:"curd", desc:"Gentle on the gut · well tolerated" },
  { id:"moong_chilla_dinner", name:"Moong dal chilla + chutney", slot:"dinner", kcal:300, protein:15, diet:0, region:["North Indian"], contains:[], highProtein:true, lowGI:true, desc:"Light, protein-rich evening meal" },
  { id:"idiyappam_stew", name:"Idiyappam + veg stew", slot:"dinner", kcal:360, protein:11, diet:1, region:["South Indian"], contains:["lactose"], soft:true, bland:true, lowOdour:true, subKey:"milk", desc:"Soft rice noodles in mild stew" },
  { id:"paneer_veg_dinner", name:"Paneer & vegetable curry + roti", slot:"dinner", kcal:430, protein:21, diet:1, region:["North Indian"], contains:["gluten","lactose"], highProtein:true, subKey:"paneer", gf_alt:"Paneer curry + jowar roti", desc:"Protein-rich vegetarian dinner" },
  { id:"egg_curry_rice", name:"Egg curry + soft rice", slot:"dinner", kcal:420, protein:19, diet:2, region:["East Indian","South Indian"], contains:["egg"], highProtein:true, soft:true, desc:"Comforting · high biological-value protein" },
  { id:"daliya", name:"Veg daliya (broken wheat)", slot:"dinner", kcal:330, protein:11, diet:1, region:["North Indian"], contains:["gluten","lactose"], soft:true, bland:true, fibre:true, gf_alt:"Veg millet porridge", desc:"Warm, fibre-rich and filling" },

  // gastric-friendly: soft, small-volume, low simple sugar, all regions (for gastric cancer / post-gastrectomy)
  { id:"gc_dalrice_soup", name:"Soft rice + mashed moong dal (soup-style)", slot:"lunch", kcal:380, protein:16, diet:0, region:["South Indian","North Indian","East Indian","West Indian"], contains:[], soft:true, bland:true, lowOdour:true, lowFibre:true, lowGI:true, highProtein:true, gastric:true, desc:"Soft, low-bulk, protein-rich · gentle after gastrectomy" },
  { id:"gc_paneer_soft", name:"Very soft paneer bhurji + soaked phulka", slot:"dinner", kcal:330, protein:18, diet:1, region:["South Indian","North Indian","East Indian","West Indian"], contains:["lactose","gluten"], soft:true, lowFibre:true, highProtein:true, gastric:true, subKey:"paneer", gf_alt:"Soft paneer bhurji + soaked jowar roti", desc:"Small, soft, protein-dense serving" },
  { id:"gc_idli_sambar", name:"Idli + extra-lentil sambar (mild)", slot:"breakfast", kcal:300, protein:13, diet:0, region:["South Indian","North Indian","East Indian","West Indian"], contains:[], soft:true, bland:true, lowFibre:true, highProtein:true, gastric:true, desc:"Soft, mild, lentil-forward · low simple sugar" },
  { id:"gc_suji_kheer", name:"Low-sugar suji kheer with ghee", slot:"snack", kcal:220, protein:7, diet:1, region:["South Indian","North Indian","East Indian","West Indian"], contains:["lactose","gluten"], soft:true, bland:true, lowGI:true, gastric:true, subKey:"milk", gf_alt:"Low-sugar ragi kheer with ghee", desc:"Energy-dense, lightly sweet · split into small sips" },
  { id:"gc_curd_rice_mild", name:"Soft curd rice, small & mild", slot:"dinner", kcal:300, protein:12, diet:1, region:["South Indian","North Indian","East Indian","West Indian"], contains:["lactose"], soft:true, bland:true, lowFibre:true, gastric:true, subKey:"curd", desc:"Cooling, low-bulk · low-lactose curd if needed" },
  { id:"gc_dal_chicken_soup", name:"Soft rice + moong dal with shredded chicken", slot:"lunch", kcal:430, protein:26, diet:3, region:["South Indian","North Indian","East Indian","West Indian"], contains:[], soft:true, bland:true, lowFibre:true, highProtein:true, gastric:true, desc:"Soup-style, soft, high protein · well tolerated" }
];

/* fortification add-ons to close energy / protein gaps (diet + intolerance aware) */
ONCO.fortifiers = [
  { name:"1 tsp ghee or cold-pressed oil", kcal:45, protein:0, contains:[] },
  { name:"Handful of mixed nuts & seeds", kcal:90, protein:4, contains:["nuts"] },
  { name:"Extra katori of dal or sprouts", kcal:110, protein:9, contains:[], proteinRich:true },
  { name:"Glass of fortified milk", kcal:120, protein:8, contains:["lactose"], sub:"Glass of fortified soy milk", proteinRich:true },
  { name:"Boiled egg", kcal:75, protein:6, contains:["egg"], diet:2, proteinRich:true },
  { name:"Scoop of clinician-advised protein supplement", kcal:120, protein:20, contains:[], proteinRich:true }
];

ONCO.dietRank = { Vegan: 0, Vegetarian: 1, Eggetarian: 2, "Non-vegetarian": 3 };
