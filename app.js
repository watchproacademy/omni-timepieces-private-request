const form = document.querySelector("#request-form");
const steps = [...document.querySelectorAll(".step")];
const nextButton = document.querySelector("#continue");
const backButton = document.querySelector("#back");
const submitButton = document.querySelector("#submit");
const submitError = document.querySelector("#submit-error");
const progress = document.querySelector(".progress-track");
const progressFill = progress.querySelector("i");
const stepCount = document.querySelector("#step-count");
const stepLabel = document.querySelector("#step-label");
const otherBrandWrap = document.querySelector("#other-brand-wrap");
const customBudget = document.querySelector("#custom-budget");
const tradeDetails = document.querySelector("#trade-details");
const success = document.querySelector("#success");
const mobileStart = document.querySelector("#mobile-start");
const mobileIntro = document.querySelector("#mobile-intro");
const reviewNode = document.querySelector("#request-review");
const soundButtons = [...document.querySelectorAll("[data-sound-toggle]")];
const query = new URLSearchParams(window.location.search);
const configurationFields = document.querySelector("#configuration-fields");
const materialField = document.querySelector("#material-field");
const braceletField = document.querySelector("#bracelet-field");
const materialSelect = document.querySelector("#case-material");
const braceletSelect = document.querySelector("#bracelet");
const materialOtherWrap = document.querySelector("#material-other-wrap");
const materialOtherInput = document.querySelector("#case-material-other");
const braceletOtherWrap = document.querySelector("#bracelet-other-wrap");
const braceletOtherInput = document.querySelector("#bracelet-other");
const tradeSetOtherWrap = document.querySelector("#trade-set-other-wrap");
const tradeSetOtherInput = document.querySelector("#trade-set-other");
const watchTabs = document.querySelector("#watch-tabs");
const assistantDialog = document.querySelector("#watch-assistant-dialog");
const assistantCompose = document.querySelector("#assistant-compose");
const assistantResult = document.querySelector("#assistant-result");
const assistantBrief = document.querySelector("#assistant-brief");
const assistantInterpret = document.querySelector("#assistant-interpret");
const assistantError = document.querySelector("#assistant-error");
const assistantChips = document.querySelector("#assistant-chips");
const tradeTabs = document.querySelector("#trade-tabs");
const tradeEditorLabel = document.querySelector("#trade-editor-label");
const addTradeButton = document.querySelector("#add-trade");

const tradeFieldIds = {
  brand: "trade-brand",
  model: "trade-model",
  reference: "trade-reference",
  year: "trade-year",
  dial: "trade-dial",
  bracelet: "trade-bracelet",
  condition: "trade-condition",
  set: "trade-set",
  setOther: "trade-set-other",
  expectedValue: "trade-expected-value",
};

const labels = ["The maison", "The watch", "The occasion", "Condition", "Timing", "Budget", "Trade-in", "Your introduction", "Review"];
const baseWatchProfile = {
  prompt: "A little direction is plenty.",
  question: "What are we looking for today?",
  helper: "Share the exact reference, or let us guide you.",
  modelLabel: "Model or collection",
  modelPlaceholder: "e.g. Nautilus, Royal Oak, Daytona",
  referenceLabel: "Reference",
  referencePlaceholder: "e.g. 126500LN",
  configurationHeading: "Details that can influence value",
  yearLabel: "Year preference",
  yearPlaceholder: "e.g. 2022 or current",
  dialLabel: "Dial preference",
  dialPlaceholder: "e.g. Blue, motif, factory diamond",
  materialLabel: "Case material",
  materialOpen: "Open to material",
  materialHelp: "Material can meaningfully affect availability and value.",
  braceletLabel: "Bracelet or strap",
  braceletOpen: "Open to configuration",
  braceletHelp: "Shown when the watch is offered in configurations that can affect value.",
  suggestions: [],
  referenceRules: [],
  dials: [],
  materials: [],
  wearingRules: [],
};

const brandProfiles = {
  Rolex: {
    ...baseWatchProfile,
    prompt: "The reference and configuration narrow the search.",
    question: "Which Rolex are we considering?",
    helper: "The model, reference, material, dial, and bracelet identify the right configuration.",
    modelLabel: "Model",
    modelPlaceholder: "e.g. Daytona, GMT-Master II",
    referencePlaceholder: "e.g. 126710BLRO",
    suggestions: ["Submariner", "Daytona", "GMT-Master II", "Datejust", "Day-Date", "Sky-Dweller"],
    referenceRules: [
      { matches: ["submariner"], options: ["124060", "126610LN", "126610LV", "126613LB", "126613LN", "126618LN", "126619LB"] },
      { matches: ["daytona"], options: ["126500LN", "126503", "126505", "126509", "126515LN", "126519LN", "126506"] },
      { matches: ["gmt-master"], options: ["126710BLRO", "126710BLNR", "126710GRNR", "126720VTNR", "126713GRNR", "126718GRNR"] },
      { matches: ["datejust"], options: ["126300", "126334", "126200", "126234", "278274", "278273"] },
      { matches: ["day-date"], options: ["228238", "228239", "228235", "228236"] },
      { matches: ["sky-dweller"], options: ["336934", "336933", "336935", "336239"] },
    ],
    dials: ["Black", "White", "Blue", "Green", "Silver", "Champagne", "Slate", "Panda", "Meteorite", "Mother-of-pearl", "Factory diamond"],
    materials: ["Oystersteel", "Yellow gold", "White gold", "Everose gold", "Rolesor", "Platinum", "RLX titanium"],
    wearingRules: [
      { matches: ["gmt-master", "datejust"], options: ["Oyster bracelet", "Jubilee bracelet"] },
      { matches: ["daytona"], options: ["Oyster bracelet", "Oysterflex bracelet"] },
      { matches: ["sky-dweller"], options: ["Oyster bracelet", "Jubilee bracelet", "Oysterflex bracelet"] },
    ],
  },
  "Patek Philippe": {
    ...baseWatchProfile,
    prompt: "Collection and reference come first.",
    question: "Which Patek Philippe speaks to you?",
    helper: "A reference, case metal, dial, and presentation will define the exact piece.",
    modelLabel: "Collection or model",
    modelPlaceholder: "e.g. Nautilus, Aquanaut, Calatrava",
    referencePlaceholder: "e.g. 5167A-001",
    suggestions: ["Nautilus", "Aquanaut", "Calatrava", "Cubitus", "Complications", "Grand Complications"],
    referenceRules: [
      { matches: ["nautilus"], options: ["5811/1G-001", "5712/1A-001", "5726/1A-014", "5990/1A-011", "5990/1R-001"] },
      { matches: ["aquanaut"], options: ["5167A-001", "5167R-001", "5164G-001", "5164R-001", "5261R-001"] },
      { matches: ["calatrava"], options: ["6119R-001", "6119G-001", "5227J-001", "5227G-010"] },
      { matches: ["cubitus"], options: ["5821/1A-001", "5821/1AR-001", "5822P-001"] },
    ],
    dials: ["Blue", "Black", "Olive green", "White", "Silver", "Rose-gilt", "Salmon", "Grey", "Brown", "Mother-of-pearl", "Factory gem-set"],
    materials: ["Stainless steel", "Rose gold", "White gold", "Yellow gold", "Platinum"],
    wearingRules: [
      { matches: ["nautilus", "cubitus"], options: ["Integrated metal bracelet", "Composite strap", "Leather strap"] },
      { matches: ["aquanaut"], options: ["Composite strap", "Metal bracelet", "Gem-set bracelet"] },
      { matches: ["calatrava", "complication"], options: ["Alligator leather strap", "Calfskin strap", "Metal bracelet"] },
    ],
  },
  "Audemars Piguet": {
    ...baseWatchProfile,
    prompt: "Collection, reference, and execution define the brief.",
    question: "Which Audemars Piguet are we considering?",
    helper: "Share the collection or reference; material, dial, and wrist configuration can follow.",
    modelLabel: "Collection or model",
    modelPlaceholder: "e.g. Royal Oak, Code 11.59",
    referencePlaceholder: "e.g. 15510ST.OO.1320ST.06",
    dialLabel: "Dial / execution",
    dialPlaceholder: "e.g. Blue Grande Tapisserie, openworked",
    suggestions: ["Royal Oak", "Royal Oak Offshore", "Code 11.59", "Royal Oak Concept"],
    referenceRules: [
      { matches: ["royal oak offshore"], options: ["26420SO.OO.A002CA.01", "26238ST.OO.2000ST.01", "26715ST.OO.1356ST.02"] },
      { matches: ["royal oak concept"], options: ["26650TI.OO.D013CA.01", "26630OR.GG.D326CR.01"] },
      { matches: ["royal oak"], options: ["15510ST.OO.1320ST.06", "16202ST.OO.1240ST.02", "26240ST.OO.1320ST.05", "15407ST.OO.1220ST.01"] },
      { matches: ["code 11.59"], options: ["15210ST.OO.A348KB.01", "26393ST.OO.A348KB.01", "26393OR.OO.A002KB.02"] },
    ],
    dials: ["Blue Grande Tapisserie", "Black Grande Tapisserie", "Green Grande Tapisserie", "Grey", "Smoked blue", "Smoked green", "Openworked", "Factory gem-set"],
    materials: ["Stainless steel", "Titanium", "Pink gold", "Yellow gold", "White gold", "Black ceramic", "White ceramic", "Carbon"],
    wearingRules: [
      { matches: ["royal oak"], options: ["Integrated metal bracelet", "Rubber strap", "Leather strap", "Full interchangeable set"] },
      { matches: ["code 11.59"], options: ["Alligator leather strap", "Rubber-coated strap", "Textile-effect strap"] },
    ],
  },
  "Richard Mille": {
    ...baseWatchProfile,
    prompt: "With Richard Mille, the RM number is the model.",
    question: "Which RM reference are we considering?",
    helper: "Add the edition or name if known; case construction and strap usually define the variation.",
    modelLabel: "RM reference",
    modelPlaceholder: "e.g. RM 010, RM 055, RM 67-02",
    referenceLabel: "Edition / name",
    referencePlaceholder: "e.g. Bubba Watson, Rafael Nadal",
    configurationHeading: "Richard Mille configuration",
    dialLabel: "Accent / colourway",
    dialPlaceholder: "e.g. White / blue accents",
    materialLabel: "Case construction",
    materialHelp: "Case construction is one of the most important value variables for an RM.",
    braceletLabel: "Strap configuration",
    braceletOpen: "Open to strap",
    braceletHelp: "Factory strap type and colour help identify the intended configuration.",
    suggestions: ["RM 010", "RM 011", "RM 030", "RM 035", "RM 055", "RM 067"],
    referenceRules: [
      { matches: ["rm 011"], options: ["Felipe Massa", "Roberto Mancini", "Jean Todt"] },
      { matches: ["rm 035"], options: ["Rafael Nadal", "Americas", "Black Toro"] },
      { matches: ["rm 055"], options: ["Bubba Watson", "Asia Limited Edition", "Yas Marina Circuit"] },
      { matches: ["rm 067"], options: ["Extra Flat", "Sébastien Ogier", "Alexander Zverev"] },
    ],
    dials: ["Openworked / neutral", "White accents", "Blue accents", "Red accents", "Green accents", "Black monochrome", "Pastel colourway", "Gem-set execution"],
    materials: ["Titanium", "Rose gold", "White gold", "Ceramic", "Carbon TPT®", "Quartz TPT®", "Sapphire", "Other / specific combination"],
    wearingAlways: ["Rubber / silicone strap", "Velcro® strap", "Fabric strap", "Leather strap", "Other factory strap / colour"],
  },
  "Vacheron Constantin": {
    ...baseWatchProfile,
    prompt: "The collection sets the character of the watch.",
    question: "Which Vacheron Constantin are we looking for?",
    helper: "Reference, case material, dial, and—on Overseas—the strap set complete the brief.",
    modelLabel: "Collection or model",
    modelPlaceholder: "e.g. Overseas, Patrimony",
    referencePlaceholder: "e.g. 4500V/110A-B128",
    suggestions: ["Overseas", "Patrimony", "Traditionnelle", "Historiques", "Fiftysix", "Métiers d’Art"],
    referenceRules: [
      { matches: ["overseas"], options: ["4520V/210A-B128", "4520V/210A-B126", "5520V/210A-B148", "6000V/210A-B544", "7920V/210A-B333"] },
      { matches: ["patrimony"], options: ["85180/000R-9248", "14160/000R-H025"] },
      { matches: ["fiftysix"], options: ["4600E/110A-B487", "4000E/000A-B548"] },
      { matches: ["historiques"], options: ["82035/000R-9359", "5000H/000A-B582"] },
    ],
    dials: ["Blue", "Black", "Silver", "Pink", "Green", "Lacquered red", "Skeleton / openworked", "Métiers d’Art execution"],
    materials: ["Stainless steel", "Titanium", "Pink gold", "White gold", "Yellow gold", "Platinum"],
    wearingRules: [
      { matches: ["overseas"], options: ["Metal bracelet", "Rubber strap", "Alligator leather strap", "Complete interchangeable set"] },
    ],
  },
  "F.P. Journe": {
    ...baseWatchProfile,
    prompt: "Model, reference code, and case material carry the brief.",
    question: "Which F.P. Journe are we considering?",
    helper: "The model name, short reference code, case material, and dial execution are especially useful.",
    modelLabel: "Model",
    modelPlaceholder: "e.g. Chronomètre Bleu, Élégante",
    referenceLabel: "Reference code",
    referencePlaceholder: "e.g. CB, CS, ELT",
    dialLabel: "Dial / edition",
    dialPlaceholder: "e.g. Chrome blue, Havana, Black Label",
    suggestions: ["Chronomètre Bleu", "Élégante", "Chronomètre Souverain", "Chronomètre à Résonance", "Octa", "Centigraphe"],
    referenceRules: [
      { matches: ["chronomètre bleu"], options: ["CB"] },
      { matches: ["élégante"], options: ["ELT", "ELHT", "ELHT-BR"] },
      { matches: ["chronomètre souverain"], options: ["CS"] },
      { matches: ["chronomètre à résonance"], options: ["RQ"] },
      { matches: ["centigraphe"], options: ["CTS", "CT2"] },
      { matches: ["octa"], options: ["AR", "PR", "LUNE", "ZOD"] },
    ],
    dials: ["Chrome blue", "Havana", "Black Label", "Gold", "Silver guilloché", "Ruthenium", "Mother-of-pearl", "Factory gem-set"],
    materials: ["Platinum", "18K rose gold", "Titanium", "Tantalum", "Titalyt®"],
    wearingRules: [
      { matches: ["élégante"], options: ["Rubber strap", "Titalyt® bracelet", "Gem-set bracelet"] },
      { matches: ["centigraphe", "lineSport"], options: ["Metal bracelet", "Rubber strap"] },
    ],
  },
  Omega: {
    ...baseWatchProfile,
    prompt: "Collection and execution help us narrow a broad catalogue.",
    question: "Which OMEGA are we looking for?",
    helper: "Model family, reference, material, dial, and bracelet or strap lead to the right version.",
    modelLabel: "Collection or model",
    modelPlaceholder: "e.g. Speedmaster Moonwatch, Seamaster 300M",
    referencePlaceholder: "e.g. 310.30.42.50.01.001",
    suggestions: ["Speedmaster", "Seamaster Diver 300M", "Seamaster Aqua Terra", "Planet Ocean", "Constellation", "De Ville"],
    referenceRules: [
      { matches: ["speedmaster"], options: ["310.30.42.50.01.001", "310.30.42.50.04.001", "310.60.42.50.99.002", "329.30.44.51.01.003"] },
      { matches: ["seamaster diver"], options: ["210.30.42.20.03.001", "210.30.42.20.01.001", "210.32.42.20.01.001"] },
      { matches: ["aqua terra"], options: ["220.10.41.21.03.004", "220.10.38.20.03.001", "220.12.41.21.03.008"] },
      { matches: ["planet ocean"], options: ["215.30.44.21.01.001", "215.32.44.21.01.001"] },
    ],
    dials: ["Black", "White", "Blue", "Green", "Silver", "Grey", "Burgundy", "Moonshine gold", "Meteorite", "Skeleton / openworked"],
    materials: ["Stainless steel", "Titanium", "Sedna™ Gold", "Moonshine™ Gold", "Ceramic", "Bronze Gold"],
    wearingRules: [
      { matches: ["speedmaster", "seamaster", "planet ocean", "aqua terra"], options: ["Metal bracelet", "Rubber strap", "Leather strap", "NATO / fabric strap"] },
    ],
  },
};

const commonDialOptions = [
  "Black", "White", "Blue", "Green", "Silver", "Grey", "Champagne", "Brown", "Salmon", "Red",
  "Meteorite", "Mother-of-pearl", "Skeleton / openworked", "Factory diamond", "No preference",
];
const commonWearingOptions = [
  "Metal bracelet", "Oyster bracelet", "Jubilee bracelet", "Integrated bracelet", "Rubber / silicone strap",
  "Leather strap", "Fabric / Velcro® strap", "NATO strap", "Complete interchangeable set", "Not sure",
];
const catalogBrands = [
  ...Object.keys(brandProfiles), "A. Lange & Söhne", "Cartier", "Tudor", "IWC", "Jaeger-LeCoultre",
  "Breitling", "Panerai", "Hublot", "Grand Seiko", "Breguet", "Zenith", "TAG Heuer", "Other",
];

function uniqueOptions(options) {
  return [...new Set(options.filter(Boolean))];
}

function populateDatalist(id, options) {
  const list = document.querySelector(`#${id}`);
  if (!list) return;
  list.replaceChildren(...uniqueOptions(options).map((value) => {
    const option = document.createElement("option");
    option.value = value;
    return option;
  }));
}

function ruleOptionsFor(profile, model) {
  const rules = profile.referenceRules || [];
  const normalized = model.trim().toLowerCase();
  const matching = normalized
    ? rules.filter((rule) => rule.matches.some((term) => normalized.includes(term.toLowerCase())))
    : [];
  return uniqueOptions((matching.length ? matching : rules).flatMap((rule) => rule.options));
}

function profileForBrandName(brand) {
  const key = Object.keys(brandProfiles).find((name) => name.toLowerCase() === brand.trim().toLowerCase());
  return key ? brandProfiles[key] : baseWatchProfile;
}

function initializeCatalogs() {
  populateDatalist("watch-brand-options", catalogBrands);
  const currentYear = new Date().getFullYear();
  const years = ["Current production", "Any year", ...Array.from({ length: currentYear - 1949 }, (_, index) => String(currentYear - index))];
  populateDatalist("watch-year-options", years);
}

function configureTradeCatalog() {
  const brand = document.querySelector("#trade-brand")?.value || "";
  const model = document.querySelector("#trade-model")?.value || "";
  const profile = profileForBrandName(brand);
  populateDatalist("trade-model-options", profile.suggestions || []);
  populateDatalist("trade-reference-options", ruleOptionsFor(profile, model));
  populateDatalist("trade-dial-options", profile.dials?.length ? profile.dials : commonDialOptions);
  populateDatalist("trade-bracelet-options", uniqueOptions([
    ...wearingOptionsFor(profile, model),
    ...(profile.wearingAlways || []),
    ...commonWearingOptions,
  ]));
}

let currentStep = 1;
let saveTimer;
let autoTimer;
let transitionTimer;
let audioContext;
const movementAudio = new Audio("assets/audio/mechanical-watch-loop.mp3");
movementAudio.loop = true;
movementAudio.preload = "auto";
movementAudio.volume = 0;
const movementViewport = window.matchMedia("(max-width: 820px)");
let movementFadeFrame;
let assistantInterpretation;
let requestedWatches = [];
let activeWatchIndex = 0;
let addingAnotherWatch = false;
let tradeInWatches = [];
let activeTradeIndex = 0;

function track(event, details = {}) {
  const payload = { event, ...details };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent("omni:funnel", { detail: payload }));
}

function attribution() {
  return {
    source: (query.get("source") || "").slice(0, 120),
    utmSource: (query.get("utm_source") || "").slice(0, 120),
    utmMedium: (query.get("utm_medium") || "").slice(0, 120),
    utmCampaign: (query.get("utm_campaign") || "").slice(0, 160),
    landingPage: window.location.href.slice(0, 600),
    referrer: document.referrer.slice(0, 600),
  };
}

function inputFor(group) {
  return form.elements.namedItem(group.dataset.choice);
}

function currentTradeSnapshot() {
  return Object.fromEntries(Object.entries(tradeFieldIds).map(([key, id]) => [key, document.querySelector(`#${id}`).value.trim()]));
}

function needsCustomDetail(value) {
  return /\bother\b|specific/i.test(value || "");
}

function syncSelectOther(select, wrap, input, { clear = true } = {}) {
  const visible = needsCustomDetail(select.value);
  wrap.hidden = !visible;
  if (!visible && clear) input.value = "";
}

function valueWithCustomDetail(select, input) {
  return needsCustomDetail(select.value) && input.value.trim() ? input.value.trim() : select.value;
}

function restoreSelectWithCustomDetail(select, wrap, input, choice, finalValue) {
  const available = [...select.options].map((option) => option.value);
  const selected = available.includes(choice) ? choice : available.includes(finalValue) ? finalValue : "";
  if (selected) {
    select.value = selected;
  } else if (finalValue) {
    const other = available.find(needsCustomDetail);
    if (other) select.value = other;
  }
  input.value = needsCustomDetail(select.value) && finalValue !== select.value ? finalValue || "" : "";
  syncSelectOther(select, wrap, input, { clear: false });
}

function tradeHasData(trade) {
  return Object.values(trade || {}).some(Boolean);
}

function resetTradeFields() {
  Object.values(tradeFieldIds).forEach((id) => { document.querySelector(`#${id}`).value = ""; });
  syncSelectOther(document.querySelector("#trade-set"), tradeSetOtherWrap, tradeSetOtherInput);
  configureTradeCatalog();
}

function commitCurrentTrade() {
  if (document.querySelector("#trade-in").value !== "Yes") return false;
  tradeInWatches[activeTradeIndex] = currentTradeSnapshot();
  return true;
}

function tradeLabel(trade, index) {
  const identity = [trade?.brand, trade?.model].filter(Boolean).join(" ");
  return identity || `Trade-in ${String(index + 1).padStart(2, "0")}`;
}

function loadTradeSnapshot(trade = {}) {
  Object.entries(tradeFieldIds).forEach(([key, id]) => {
    document.querySelector(`#${id}`).value = trade[key] || "";
  });
  syncSelectOther(document.querySelector("#trade-set"), tradeSetOtherWrap, tradeSetOtherInput, { clear: false });
  configureTradeCatalog();
  renderTradeTabs();
}

function ensureTradeState() {
  if (!tradeInWatches.length) tradeInWatches = [currentTradeSnapshot()];
  activeTradeIndex = Math.max(0, Math.min(activeTradeIndex, tradeInWatches.length - 1));
  loadTradeSnapshot(tradeInWatches[activeTradeIndex]);
}

function tradeValidationIssue(trade) {
  if (!trade?.brand?.trim()) return { field: "brand", message: "Add the brand of this trade-in." };
  if (!trade?.model?.trim()) return { field: "model", message: "Add the model of this trade-in." };
  if (!trade?.condition) return { field: "condition", message: "Choose the current condition of this trade-in." };
  if (!trade?.set) return { field: "set", message: "Tell us what comes with this trade-in." };
  return undefined;
}

function focusTradeIssue(index, issue) {
  if (index !== activeTradeIndex) {
    activeTradeIndex = index;
    loadTradeSnapshot(tradeInWatches[index]);
  }
  return showError(issue.message, document.querySelector(`#${tradeFieldIds[issue.field]}`));
}

function switchTrade(index) {
  if (index === activeTradeIndex) return;
  commitCurrentTrade();
  activeTradeIndex = index;
  loadTradeSnapshot(tradeInWatches[index]);
  clearError();
  playInterfaceSound("select");
  saveDraft();
  track("private_request_trade_tab_opened", { trade: index + 1 });
}

function removeTrade(index) {
  commitCurrentTrade();
  const removed = tradeInWatches[index];
  tradeInWatches.splice(index, 1);
  playInterfaceSound("back");
  track("private_request_trade_removed", { trade: index + 1, brand: removed?.brand, model: removed?.model, remaining: tradeInWatches.length });

  if (!tradeInWatches.length) {
    activeTradeIndex = 0;
    resetTradeFields();
    const group = document.querySelector('[data-choice="tradeIn"]');
    choose(group, group.querySelector('[data-value="No"]'), true);
    renderTradeTabs();
  } else {
    activeTradeIndex = index < activeTradeIndex ? activeTradeIndex - 1 : Math.min(activeTradeIndex, tradeInWatches.length - 1);
    loadTradeSnapshot(tradeInWatches[activeTradeIndex]);
  }
  clearError();
  saveDraft();
}

function renderTradeTabs() {
  tradeTabs.replaceChildren();
  tradeInWatches.forEach((trade, index) => {
    const item = document.createElement("div");
    item.className = "trade-tab-item";
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "trade-tab";
    tab.classList.toggle("is-active", index === activeTradeIndex);
    tab.setAttribute("aria-label", `Edit trade-in ${index + 1}, ${tradeLabel(trade, index)}`);
    const number = document.createElement("span");
    const name = document.createElement("strong");
    number.textContent = `Trade ${String(index + 1).padStart(2, "0")}`;
    name.textContent = tradeLabel(trade, index);
    tab.append(number, name);
    tab.addEventListener("click", () => switchTrade(index));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "trade-tab-remove";
    remove.textContent = "×";
    remove.title = "Remove trade-in";
    remove.setAttribute("aria-label", `Remove trade-in ${index + 1}, ${tradeLabel(trade, index)}`);
    remove.addEventListener("click", () => removeTrade(index));
    item.append(tab, remove);
    tradeTabs.append(item);
  });
  tradeEditorLabel.textContent = `Trade-in ${String(activeTradeIndex + 1).padStart(2, "0")}`;
}

function addTradeIn() {
  commitCurrentTrade();
  const issue = tradeValidationIssue(tradeInWatches[activeTradeIndex]);
  if (issue) {
    focusTradeIssue(activeTradeIndex, issue);
    return;
  }
  tradeInWatches.push({});
  activeTradeIndex = tradeInWatches.length - 1;
  resetTradeFields();
  renderTradeTabs();
  clearError();
  playInterfaceSound("wind");
  saveDraft();
  track("private_request_additional_trade_started", { trade: activeTradeIndex + 1 });
  window.setTimeout(() => document.querySelector("#trade-brand").focus(), 60);
}

function clearError() {
  const node = steps[currentStep - 1]?.querySelector(".form-error");
  if (node) node.textContent = "";
}

function showError(message, target) {
  const node = steps[currentStep - 1]?.querySelector(".form-error");
  if (node) node.textContent = message;
  target?.focus();
  return false;
}

function scheduleAdvance() {
  window.clearTimeout(autoTimer);
  autoTimer = window.setTimeout(() => {
    if (validateStep(currentStep)) {
      playInterfaceSound("forward");
      advanceFromCurrentStep();
    }
  }, 450);
}

function choose(group, button, restoring = false) {
  const input = inputFor(group);
  if (!input) return;
  input.value = button.dataset.value;
  group.querySelectorAll("[data-value]").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });

  const choice = group.dataset.choice;
  if (choice === "brand") {
    otherBrandWrap.hidden = input.value !== "Other";
    if (!restoring) {
      ["model", "reference", "year", "dial", "case-material", "bracelet"].forEach((id) => {
        document.querySelector(`#${id}`).value = "";
      });
    }
    renderModels(restoring);
    if (!restoring && input.value === "Other") window.setTimeout(() => document.querySelector("#other-brand").focus(), 80);
  }
  if (choice === "budget") customBudget.hidden = input.value !== "Custom";
  if (choice === "tradeIn") {
    if (input.value === "Yes") {
      tradeDetails.hidden = false;
      ensureTradeState();
    } else {
      if (tradeHasData(currentTradeSnapshot())) tradeInWatches[activeTradeIndex] = currentTradeSnapshot();
      tradeDetails.hidden = true;
    }
  }

  clearError();
  if (!restoring) {
    playInterfaceSound("select");
    saveDraft();
    track("private_request_choice", { step: currentStep, field: choice, value: input.value });
    const needsMore = (choice === "brand" && input.value === "Other") || (choice === "budget" && input.value === "Custom") || (choice === "tradeIn" && input.value === "Yes") || choice === "preferredContact";
    if (!needsMore) scheduleAdvance();
  }
}

document.querySelectorAll("[data-choice]").forEach((group) => {
  group.querySelectorAll("[data-value]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => choose(group, button));
  });
});

addTradeButton.addEventListener("click", addTradeIn);

function selectedWatchProfile() {
  return brandProfiles[document.querySelector("#brand").value] || baseWatchProfile;
}

function setOptionalLabel(id, text, qualifier = "Optional") {
  const label = document.querySelector(`#${id}`);
  const note = document.createElement("span");
  note.textContent = qualifier;
  label.replaceChildren(document.createTextNode(`${text} `), note);
}

function replaceSelectOptions(select, options, openLabel, preserve) {
  const current = preserve ? select.value : "";
  select.replaceChildren();
  const open = document.createElement("option");
  open.value = "";
  open.textContent = openLabel;
  select.append(open);
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = options.includes(current) ? current : "";
}

function wearingOptionsFor(profile, model) {
  if (profile.wearingAlways) return profile.wearingAlways;
  const normalized = model.trim().toLowerCase();
  if (!normalized || normalized === "open to guidance") return [];
  return profile.wearingRules.find((rule) => rule.matches.some((term) => normalized.includes(term.toLowerCase())))?.options || [];
}

function configureBrandDetails(preserve = true) {
  const profile = selectedWatchProfile();
  const model = document.querySelector("#model");
  const reference = document.querySelector("#reference");
  const year = document.querySelector("#year");
  const dial = document.querySelector("#dial");

  document.querySelector("#watch-prompt").textContent = profile.prompt;
  document.querySelector("#step-2-title").textContent = profile.question;
  document.querySelector("#watch-helper").textContent = profile.helper;
  document.querySelector("#model-label").textContent = profile.modelLabel;
  model.placeholder = profile.modelPlaceholder;
  setOptionalLabel("reference-label", profile.referenceLabel);
  reference.placeholder = profile.referencePlaceholder;
  document.querySelector("#configuration-heading").textContent = profile.configurationHeading;
  setOptionalLabel("year-label", profile.yearLabel);
  year.placeholder = profile.yearPlaceholder;
  setOptionalLabel("dial-label", profile.dialLabel);
  dial.placeholder = profile.dialPlaceholder;
  populateDatalist("watch-model-options", profile.suggestions || []);
  populateDatalist("watch-reference-options", ruleOptionsFor(profile, model.value));
  populateDatalist("watch-dial-options", profile.dials?.length ? profile.dials : commonDialOptions);

  const hasMaterials = profile.materials.length > 0;
  materialField.hidden = !hasMaterials;
  setOptionalLabel("material-label", profile.materialLabel);
  document.querySelector("#material-help").textContent = profile.materialHelp;
  replaceSelectOptions(materialSelect, profile.materials, profile.materialOpen, preserve);
  syncSelectOther(materialSelect, materialOtherWrap, materialOtherInput, { clear: !preserve });

  const wearingOptions = wearingOptionsFor(profile, model.value);
  const hasWearing = wearingOptions.length > 0;
  braceletField.hidden = !hasWearing;
  setOptionalLabel("bracelet-label", profile.braceletLabel, "When applicable");
  document.querySelector("#bracelet-help").textContent = profile.braceletHelp;
  replaceSelectOptions(braceletSelect, wearingOptions, profile.braceletOpen, preserve);
  syncSelectOther(braceletSelect, braceletOtherWrap, braceletOtherInput, { clear: !preserve });

  const visibleFields = Number(hasMaterials) + Number(hasWearing);
  configurationFields.hidden = visibleFields === 0;
  configurationFields.classList.toggle("single", visibleFields === 1);
  updateWatchSelection();
}

function currentWatchSnapshot() {
  return {
    brand: finalBrand().trim(),
    brandValue: document.querySelector("#brand").value,
    otherBrand: document.querySelector("#other-brand").value.trim(),
    model: document.querySelector("#model").value.trim(),
    reference: document.querySelector("#reference").value.trim(),
    year: document.querySelector("#year").value.trim(),
    dial: document.querySelector("#dial").value.trim(),
    caseMaterial: valueWithCustomDetail(materialSelect, materialOtherInput),
    caseMaterialChoice: materialSelect.value,
    bracelet: valueWithCustomDetail(braceletSelect, braceletOtherInput),
    braceletChoice: braceletSelect.value,
    occasion: document.querySelector("#occasion").value,
    condition: document.querySelector("#condition").value,
    timeline: document.querySelector("#timeline").value,
    budget: formatCustomBudget(),
    budgetValue: document.querySelector("#budget").value,
    budgetMin: document.querySelector("#budget-min").value,
    budgetMax: document.querySelector("#budget-max").value,
  };
}

function commitCurrentWatch() {
  const watch = currentWatchSnapshot();
  if (!watch.brand || !watch.model) return false;
  requestedWatches[activeWatchIndex] = watch;
  return true;
}

function resetWatchFields() {
  ["brand", "other-brand", "model", "reference", "year", "dial", "case-material", "case-material-other", "bracelet", "bracelet-other", "occasion", "condition", "timeline", "budget", "budget-min", "budget-max"].forEach((id) => {
    document.querySelector(`#${id}`).value = "";
  });
  ["brand", "occasion", "condition", "timeline", "budget"].forEach((choice) => {
    document.querySelector(`[data-choice="${choice}"]`).querySelectorAll("[data-value]").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
  });
  document.querySelector("#guidance-choice").classList.remove("is-selected");
  otherBrandWrap.hidden = true;
  materialOtherWrap.hidden = true;
  braceletOtherWrap.hidden = true;
  customBudget.hidden = true;
  renderModels(false);
}

function loadWatchSnapshot(watch) {
  resetWatchFields();
  const brandGroup = document.querySelector('[data-choice="brand"]');
  const brandValue = watch.brandValue || (brandProfiles[watch.brand] ? watch.brand : "Other");
  const brandButton = [...brandGroup.querySelectorAll("[data-value]")].find((item) => item.dataset.value === brandValue);
  if (brandButton) choose(brandGroup, brandButton, true);
  if (brandValue === "Other") {
    document.querySelector("#other-brand").value = watch.otherBrand || watch.brand;
    otherBrandWrap.hidden = false;
  }
  document.querySelector("#model").value = watch.model || "";
  document.querySelector("#reference").value = watch.reference || "";
  document.querySelector("#year").value = watch.year || "";
  document.querySelector("#dial").value = watch.dial || "";
  renderModels(false);
  restoreSelectWithCustomDetail(materialSelect, materialOtherWrap, materialOtherInput, watch.caseMaterialChoice, watch.caseMaterial);
  restoreSelectWithCustomDetail(braceletSelect, braceletOtherWrap, braceletOtherInput, watch.braceletChoice, watch.bracelet);
  setChoiceFromAssistant("occasion", watch.occasion);
  setChoiceFromAssistant("condition", watch.condition);
  setChoiceFromAssistant("timeline", watch.timeline);
  setChoiceFromAssistant("budget", watch.budgetValue);
  document.querySelector("#budget-min").value = watch.budgetMin || "";
  document.querySelector("#budget-max").value = watch.budgetMax || "";
  document.querySelector("#guidance-choice").classList.toggle("is-selected", watch.model === "Open to guidance");
  updateWatchSelection();
}

function removeWatch(index, displayedWatch) {
  window.clearTimeout(autoTimer);
  const removingActiveWatch = index === activeWatchIndex;

  if (!removingActiveWatch) commitCurrentWatch();
  const removedWatch = requestedWatches[index] || displayedWatch;
  if (requestedWatches[index]) requestedWatches.splice(index, 1);

  playInterfaceSound("back");
  track("private_request_watch_removed", {
    watch: index + 1,
    brand: removedWatch?.brand,
    model: removedWatch?.model,
    remaining: requestedWatches.length,
  });

  if (requestedWatches.length === 0) {
    requestedWatches = [];
    activeWatchIndex = 0;
    addingAnotherWatch = false;
    resetWatchFields();
    showStep(1, "back");
    return;
  }

  if (!removingActiveWatch) {
    if (index < activeWatchIndex) activeWatchIndex -= 1;
    updateWatchSelection();
    if (currentStep === 9) updateReview();
    saveDraft();
    return;
  }

  activeWatchIndex = Math.min(index, requestedWatches.length - 1);
  addingAnotherWatch = false;
  loadWatchSnapshot(requestedWatches[activeWatchIndex]);
  showStep(currentStep >= 7 ? currentStep : 2, "back");
}

function updateWatchSelection() {
  const entries = requestedWatches.map((watch) => ({ ...watch }));
  const current = currentWatchSnapshot();
  if (current.brand && current.model) entries[activeWatchIndex] = current;
  else if (addingAnotherWatch) entries[activeWatchIndex] = { brand: `Watch ${String(activeWatchIndex + 1).padStart(2, "0")}`, model: "New selection", pending: true };

  watchTabs.replaceChildren();
  entries.forEach((watch, index) => {
    if (!watch) return;
    const item = document.createElement("div");
    item.className = "watch-tab-item";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "watch-tab";
    button.classList.toggle("is-active", index === activeWatchIndex);
    button.setAttribute("aria-label", watch.pending ? `Watch ${index + 1}, new selection` : `Edit watch ${index + 1}, ${watch.brand} ${watch.model}`);
    const number = document.createElement("b");
    const copy = document.createElement("span");
    const brand = document.createElement("small");
    const model = document.createElement("strong");
    number.textContent = String(index + 1).padStart(2, "0");
    brand.textContent = watch.brand;
    model.textContent = watch.model === "Open to guidance" ? "Guided search" : watch.model;
    copy.append(brand, model);
    button.append(number, copy);
    button.addEventListener("click", () => {
      if (index === activeWatchIndex && currentStep <= 6) return;
      commitCurrentWatch();
      const selected = requestedWatches[index];
      if (!selected) return;
      activeWatchIndex = index;
      addingAnotherWatch = false;
      loadWatchSnapshot(selected);
      showStep(2, "back");
      track("private_request_watch_tab_opened", { watch: index + 1 });
    });
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "watch-tab-remove";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", watch.pending
      ? `Clear watch ${index + 1}`
      : `Remove watch ${index + 1}, ${watch.brand} ${watch.model}`);
    removeButton.title = "Remove watch";
    removeButton.addEventListener("click", () => removeWatch(index, watch));
    item.append(button, removeButton);
    watchTabs.append(item);
  });
  watchTabs.hidden = entries.filter(Boolean).length === 0 || success.hidden === false;
}

function resetWatchConfiguration() {
  ["reference", "year", "dial", "case-material", "case-material-other", "bracelet", "bracelet-other"].forEach((id) => {
    document.querySelector(`#${id}`).value = "";
  });
  materialOtherWrap.hidden = true;
  braceletOtherWrap.hidden = true;
}

function detectAssistantBrand(brief) {
  const text = brief.toLowerCase();
  if (/\brolex\b/.test(text)) return "Rolex";
  if (/\bpatek\b|patek philippe/.test(text)) return "Patek Philippe";
  if (/\baudemars\b|audemars piguet|\bap\b/.test(text)) return "Audemars Piguet";
  if (/richard mille|\brm\s*[- ]?\d/.test(text)) return "Richard Mille";
  if (/\bvacheron\b|vacheron constantin/.test(text)) return "Vacheron Constantin";
  if (/f\.?p\.?\s*journe|\bjourne\b/.test(text)) return "F.P. Journe";
  if (/\bomega\b/.test(text)) return "Omega";
  return finalBrand();
}

function optionContaining(options, terms) {
  return options.find((option) => terms.some((term) => option.toLowerCase().includes(term))) || "";
}

function interpretWatchBrief(brief) {
  const text = brief.toLowerCase().replace(/[–—]/g, "-");
  const brand = detectAssistantBrand(brief);
  const profile = brandProfiles[brand] || baseWatchProfile;
  let model = [...profile.suggestions].sort((a, b) => b.length - a.length).find((item) => text.includes(item.toLowerCase())) || "";
  const rmMatch = brand === "Richard Mille" && brief.match(/\brm\s*[- ]?(\d{2,3}(?:-\d{2})?)\b/i);
  if (rmMatch) model = `RM ${rmMatch[1]}`;

  const namedEdition = ["Bubba Watson", "Rafael Nadal"].find((name) => text.includes(name.toLowerCase()));
  const referenceMatch = brief.match(/\b(?:ref(?:erence)?\.?)[\s:#-]*([A-Za-z0-9][A-Za-z0-9./-]{2,30})/i);
  const reference = namedEdition || referenceMatch?.[1] || "";
  const yearMatch = brief.match(/\b(?:19|20)\d{2}\b/);
  const year = yearMatch ? `${yearMatch[0]}${/(?:or\s+newer|and\s+newer|onward|or\s+later|\+)/i.test(brief) ? " or newer" : ""}` : "";

  const dialNames = ["meteorite", "turquoise", "champagne", "salmon", "panda", "white", "black", "blue", "green", "silver", "grey", "gray", "red", "purple"];
  const dialName = dialNames.find((name) => text.includes(name));
  const dial = dialName ? `${dialName === "gray" ? "Grey" : dialName[0].toUpperCase() + dialName.slice(1)}${dialName === "panda" ? " dial" : ""}` : "";

  let material = "";
  const materialMatches = [
    [["carbon tpt", "carbon"], ["carbon tpt", "carbon"]],
    [["quartz tpt"], ["quartz tpt"]],
    [["rose gold", "everose", "pink gold"], ["everose", "rose gold", "pink gold"]],
    [["white gold"], ["white gold"]],
    [["yellow gold"], ["yellow gold"]],
    [["black ceramic"], ["black ceramic", "ceramic"]],
    [["white ceramic"], ["white ceramic", "ceramic"]],
    [["ceramic"], ["ceramic"]],
    [["titanium"], ["titanium"]],
    [["platinum"], ["platinum"]],
    [["steel"], ["oystersteel", "stainless steel", "steel"]],
    [["sapphire"], ["sapphire"]],
    [["tantalum"], ["tantalum"]],
  ];
  materialMatches.some(([briefTerms, optionTerms]) => {
    if (!briefTerms.some((term) => text.includes(term))) return false;
    material = optionContaining(profile.materials, optionTerms);
    return Boolean(material);
  });

  const wearingOptions = wearingOptionsFor(profile, model);
  let bracelet = "";
  const wearingMatches = [
    [["oysterflex"], ["oysterflex"]],
    [["jubilee"], ["jubilee"]],
    [["velcro"], ["velcro"]],
    [["rubber", "silicone"], ["rubber", "silicone"]],
    [["alligator"], ["alligator"]],
    [["leather"], ["leather"]],
    [["metal bracelet", "steel bracelet"], ["metal bracelet", "integrated metal"]],
    [["oyster bracelet", "on oyster"], ["oyster bracelet"]],
  ];
  wearingMatches.some(([briefTerms, optionTerms]) => {
    if (!briefTerms.some((term) => text.includes(term))) return false;
    bracelet = optionContaining(wearingOptions, optionTerms);
    return Boolean(bracelet);
  });

  let condition = "";
  if (/\b(?:new|unworn)\b/.test(text)) condition = "New / unworn";
  else if (/pre[- ]?owned|\bused\b/.test(text)) condition = "Pre-owned";
  else if (/open to either|either condition/.test(text)) condition = "Open to either";

  let timeline = "";
  if (/asap|as soon as possible|immediately|right away/.test(text)) timeline = "As soon as possible";
  else if (/within (?:two|2) weeks?/.test(text)) timeline = "Within 2 weeks";
  else if (/(?:one|1|two|2|three|3)[ -]months?|1-3 months?/.test(text)) timeline = "Within 1–3 months";
  else if (/no (?:fixed )?timeline|no rush/.test(text)) timeline = "No fixed timeline";

  const moneyMatch = brief.match(/\$\s*([\d,.]+)\s*(k)?/i);
  const budgetMax = moneyMatch ? Math.round(Number(moneyMatch[1].replace(/,/g, "")) * (moneyMatch[2] ? 1000 : 1)) : 0;
  const budget = /flexible (?:budget|range)|budget is flexible/.test(text) ? "Flexible" : budgetMax ? "Custom" : "";
  const modelValue = model || "Open to guidance";

  const details = [
    ["Maison", brand], ["Watch", modelValue === "Open to guidance" ? "Guided search" : modelValue], [brand === "Richard Mille" ? "Edition" : "Reference", reference], ["Year", year], ["Dial", dial], ["Material", material], ["Bracelet / strap", bracelet], ["Condition", condition], ["Timing", timeline], ["Budget", budgetMax ? `Up to ${budgetMax.toLocaleString("en-US")} USD` : budget],
  ].filter(([, value]) => value);

  let followUp = "Should we keep the remaining configuration open for the strongest opportunity?";
  if (!model) followUp = "Which model or collection should we focus on?";
  else if (!reference) followUp = brand === "Richard Mille" ? "Is there a named edition you prefer, or should we keep it open?" : "Do you know the exact reference, or should we keep it open?";
  else if (brand === "Richard Mille" && !material) followUp = "Which case construction do you prefer?";
  else if (!dial) followUp = "Do you have a dial preference, or should we keep it open?";

  return { brand, model: modelValue, reference, year, dial, material, bracelet, condition, timeline, budget, budgetMax, details, followUp };
}

function renderAssistantResult(result) {
  assistantChips.replaceChildren();
  result.details.forEach(([label, value]) => {
    const chip = document.createElement("span");
    const term = document.createElement("strong");
    term.textContent = `${label}:`;
    chip.append(term, document.createTextNode(value));
    assistantChips.append(chip);
  });
  const visualModel = result.model === "Open to guidance" ? "Concierge-guided search" : result.model;
  document.querySelector("#assistant-watch-brand").textContent = result.brand;
  document.querySelector("#assistant-watch-model").textContent = visualModel;
  document.querySelector("#assistant-follow-up").textContent = result.followUp;
  assistantCompose.hidden = true;
  assistantResult.hidden = false;
}

function setChoiceFromAssistant(choice, value) {
  if (!value) return;
  const group = document.querySelector(`[data-choice="${choice}"]`);
  const button = [...group.querySelectorAll("[data-value]")].find((item) => item.dataset.value === value);
  if (button) choose(group, button, true);
}

function applyAssistantResult(result) {
  const brandGroup = document.querySelector('[data-choice="brand"]');
  const brandButton = [...brandGroup.querySelectorAll("[data-value]")].find((item) => item.dataset.value === result.brand);
  if (brandButton && document.querySelector("#brand").value !== result.brand) {
    resetWatchConfiguration();
    document.querySelector("#model").value = "";
    choose(brandGroup, brandButton, true);
  }
  document.querySelector("#model").value = result.model;
  document.querySelector("#reference").value = result.reference;
  document.querySelector("#year").value = result.year;
  document.querySelector("#dial").value = result.dial;
  configureBrandDetails(false);
  if (result.material && [...materialSelect.options].some((option) => option.value === result.material)) materialSelect.value = result.material;
  if (result.bracelet && [...braceletSelect.options].some((option) => option.value === result.bracelet)) braceletSelect.value = result.bracelet;
  syncSelectOther(materialSelect, materialOtherWrap, materialOtherInput);
  syncSelectOther(braceletSelect, braceletOtherWrap, braceletOtherInput);
  setChoiceFromAssistant("condition", result.condition);
  setChoiceFromAssistant("timeline", result.timeline);
  setChoiceFromAssistant("budget", result.budget);
  if (result.budget === "Custom") {
    document.querySelector("#budget-max").value = result.budgetMax;
    document.querySelector("#budget-min").value = "";
  }
  document.querySelector("#guidance-choice").classList.toggle("is-selected", result.model === "Open to guidance");
  document.querySelector("#model-suggestions").querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item.textContent === result.model));
  updateWatchSelection();
  clearError();
  saveDraft();
  track("private_request_assistant_applied", { brand: result.brand, model: result.model, details: result.details.length });
}

function renderModels(preserve = true) {
  const node = document.querySelector("#model-suggestions");
  const profile = selectedWatchProfile();
  const current = document.querySelector("#model").value;
  node.replaceChildren();
  profile.suggestions.forEach((model) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = model;
    button.classList.toggle("is-selected", current === model);
    button.addEventListener("click", () => {
      const modelInput = document.querySelector("#model");
      const changingModel = Boolean(modelInput.value.trim()) && modelInput.value !== model;
      if (changingModel) resetWatchConfiguration();
      modelInput.value = model;
      document.querySelector("#guidance-choice").classList.remove("is-selected");
      node.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
      clearError();
      configureBrandDetails(!changingModel);
      playInterfaceSound("select");
      saveDraft();
    });
    node.append(button);
  });
  configureBrandDetails(preserve);
}

document.querySelector("#guidance-choice").addEventListener("click", (event) => {
  assistantCompose.hidden = false;
  assistantResult.hidden = true;
  assistantError.textContent = "";
  assistantInterpretation = undefined;
  const brand = finalBrand();
  assistantBrief.placeholder = brand
    ? `For example: A recent ${brand} ${selectedWatchProfile().suggestions[0] || "watch"}, preferably unworn, with an open budget.`
    : "For example: A 2023 or newer Daytona with a white dial, unworn, up to $45,000.";
  assistantDialog.showModal();
  playInterfaceSound("open");
  window.setTimeout(() => assistantBrief.focus(), 60);
  track("private_request_assistant_opened", { brand });
});

document.querySelector(".assistant-close").addEventListener("click", () => assistantDialog.close());
assistantDialog.addEventListener("click", (event) => { if (event.target === assistantDialog) assistantDialog.close(); });

document.querySelector("#assistant-example").addEventListener("click", () => {
  const brand = finalBrand();
  if (brand === "Richard Mille") assistantBrief.value = "Looking for an RM 055 Bubba Watson in Carbon TPT with white accents and a Velcro strap, 2020 or newer. Pre-owned is fine.";
  else if (brand === "Patek Philippe") assistantBrief.value = "Looking for a Patek Philippe Nautilus with a blue dial in stainless steel, 2021 or newer, within three months.";
  else assistantBrief.value = "Looking for a 2023 or newer Rolex Daytona with a white panda dial on Oysterflex, unworn, up to $45,000.";
  assistantError.textContent = "";
  playInterfaceSound("select");
  assistantBrief.focus();
});

assistantInterpret.addEventListener("click", () => {
  const brief = assistantBrief.value.trim();
  if (brief.length < 8) {
    assistantError.textContent = "Add a little more detail so we can understand the request.";
    assistantBrief.focus();
    return;
  }
  assistantError.textContent = "";
  assistantInterpret.disabled = true;
  assistantInterpret.replaceChildren(document.createTextNode("Considering your request…"));
  window.setTimeout(() => {
    assistantInterpretation = interpretWatchBrief(brief);
    renderAssistantResult(assistantInterpretation);
    playInterfaceSound("open");
    assistantInterpret.disabled = false;
    assistantInterpret.replaceChildren(document.createTextNode("Understand my request "), Object.assign(document.createElement("span"), { textContent: "→" }));
    track("private_request_assistant_interpreted", { brand: assistantInterpretation.brand, model: assistantInterpretation.model });
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 720);
});

document.querySelector("#assistant-revise").addEventListener("click", () => {
  assistantResult.hidden = true;
  assistantCompose.hidden = false;
  playInterfaceSound("back");
  window.setTimeout(() => assistantBrief.focus(), 40);
});

document.querySelector("#assistant-use").addEventListener("click", () => {
  if (!assistantInterpretation) return;
  applyAssistantResult(assistantInterpretation);
  playInterfaceSound("confirm");
  assistantDialog.close();
  window.setTimeout(() => document.querySelector("#model").focus({ preventScroll: true }), 80);
});

document.querySelector("#model").addEventListener("input", (event) => {
  document.querySelector("#guidance-choice").classList.toggle("is-selected", event.target.value === "Open to guidance");
  document.querySelector("#model-suggestions").querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item.textContent === event.target.value));
  configureBrandDetails(true);
});

function showStep(next, direction = "forward") {
  window.clearTimeout(autoTimer);
  currentStep = Math.max(1, Math.min(9, next));
  steps.forEach((step) => {
    const active = Number(step.dataset.step) === currentStep;
    step.hidden = !active;
    step.classList.toggle("is-active", active);
    step.classList.toggle("is-back", active && direction === "back");
  });
  stepLabel.textContent = labels[currentStep - 1];
  stepCount.textContent = `${String(currentStep).padStart(2, "0")} / 09`;
  progress.setAttribute("aria-valuenow", String(currentStep));
  progressFill.style.width = `${(currentStep / 9) * 100}%`;
  backButton.disabled = currentStep === 1;
  nextButton.hidden = currentStep === 9;
  submitButton.hidden = currentStep !== 9;
  clearError();
  if (currentStep === 9) {
    commitCurrentWatch();
    updateReview();
  }
  updateWatchSelection();
  saveDraft();
  track("private_request_step_viewed", { step: currentStep, label: labels[currentStep - 1] });
  window.setTimeout(() => steps[currentStep - 1].querySelector("h2")?.focus({ preventScroll: true }), 30);
}

function advanceFromCurrentStep() {
  if (addingAnotherWatch && currentStep === 6) {
    commitCurrentWatch();
    addingAnotherWatch = false;
    showStep(9);
    return;
  }
  showStep(currentStep + 1);
}

function finalBrand() {
  return document.querySelector("#brand").value === "Other" ? document.querySelector("#other-brand").value.trim() : document.querySelector("#brand").value;
}

function formatCustomBudget() {
  const selected = document.querySelector("#budget").value;
  if (selected !== "Custom") return selected;
  const currency = document.querySelector("#currency").value;
  const format = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  const min = Number(document.querySelector("#budget-min").value);
  const max = Number(document.querySelector("#budget-max").value);
  if (min && max) return `${format.format(min)}–${format.format(max)} ${currency}`;
  if (max) return `Up to ${format.format(max)} ${currency}`;
  return "Custom";
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateStep(step) {
  if (step === 1) {
    const brand = document.querySelector("#brand");
    if (!brand.value) return showError("Choose a brand to continue.", document.querySelector("[data-choice='brand'] button"));
    if (brand.value === "Other" && !document.querySelector("#other-brand").value.trim()) return showError("Tell us which brand you have in mind.", document.querySelector("#other-brand"));
  }
  if (step === 2 && !document.querySelector("#model").value.trim()) return showError("Enter a model or choose “I’d like your guidance.”", document.querySelector("#model"));
  if (step === 3 && !document.querySelector("#occasion").value) return showError("Choose the answer that feels closest.", document.querySelector("[data-choice='occasion'] button"));
  if (step === 4 && !document.querySelector("#condition").value) return showError("Choose a condition preference.", document.querySelector("[data-choice='condition'] button"));
  if (step === 5 && !document.querySelector("#timeline").value) return showError("Choose the timing that feels closest.", document.querySelector("[data-choice='timeline'] button"));
  if (step === 6) {
    const budget = document.querySelector("#budget");
    if (!budget.value) return showError("Choose a comfortable budget range.", document.querySelector("[data-choice='budget'] button"));
    if (budget.value === "Custom") {
      const min = Number(document.querySelector("#budget-min").value);
      const max = Number(document.querySelector("#budget-max").value);
      if (!max) return showError("Add the top of your preferred range.", document.querySelector("#budget-max"));
      if (min && min > max) return showError("The starting amount must be below the maximum.", document.querySelector("#budget-min"));
    }
  }
  if (step === 7) {
    const trade = document.querySelector("#trade-in");
    if (!trade.value) return showError("Tell us whether a trade-in is part of the request.", document.querySelector("[data-choice='tradeIn'] button"));
    if (trade.value === "Yes") {
      commitCurrentTrade();
      ensureTradeState();
      commitCurrentTrade();
      for (let index = 0; index < tradeInWatches.length; index += 1) {
        const issue = tradeValidationIssue(tradeInWatches[index]);
        if (issue) return focusTradeIssue(index, issue);
      }
    }
  }
  if (step === 8) {
    const name = document.querySelector("#full-name");
    const email = document.querySelector("#email");
    const phone = document.querySelector("#phone");
    const location = document.querySelector("#location");
    const preferred = document.querySelector("#preferred-contact").value;
    if (!name.value.trim()) return showError("Enter your name.", name);
    if (!location.value.trim()) return showError("Add your city and country so we can plan delivery.", location);
    if (!email.value.trim() && !phone.value.trim()) return showError("Add an email address or phone number.", email);
    if (email.value.trim() && !validateEmail(email.value.trim())) return showError("Enter a valid email address.", email);
    if (!preferred) return showError("Choose how your concierge may contact you.", document.querySelector("[data-choice='preferredContact'] button"));
    if (["Text message", "WhatsApp", "Phone call"].includes(preferred) && !phone.value.trim()) return showError(`Add a phone number for ${preferred.toLowerCase()}.`, phone);
    if (preferred === "Email" && !email.value.trim()) return showError("Add an email address for your selected contact method.", email);
  }
  if (step === 9 && !document.querySelector("#consent").checked) return showError("Confirm that we may contact you through your selected method.", document.querySelector("#consent"));
  clearError();
  return true;
}

function collectPayload() {
  commitCurrentWatch();
  if (document.querySelector("#trade-in").value === "Yes") commitCurrentTrade();
  const payload = Object.fromEntries(new FormData(form).entries());
  const watches = requestedWatches.filter((watch) => watch?.brand && watch?.model).map((watch) => ({
    brand: watch.brand,
    model: watch.model,
    reference: watch.reference,
    year: watch.year,
    dial: watch.dial,
    caseMaterial: watch.caseMaterial,
    bracelet: watch.bracelet,
    occasion: watch.occasion,
    condition: watch.condition,
    timeline: watch.timeline,
    budget: watch.budget,
  }));
  const primary = watches[0] || currentWatchSnapshot();
  Object.assign(payload, primary);
  payload.watches = watches;
  payload.watchCount = watches.length;
  const trades = payload.tradeIn === "Yes"
    ? tradeInWatches.filter(tradeHasData).map((trade) => ({ ...trade, set: trade.setOther?.trim() || trade.set, currency: "USD" }))
    : [];
  payload.tradeIns = trades;
  payload.tradeCount = trades.length;
  if (trades[0]) {
    Object.assign(payload, {
      tradeBrand: trades[0].brand,
      tradeModel: trades[0].model,
      tradeReference: trades[0].reference,
      tradeYear: trades[0].year,
      tradeDial: trades[0].dial,
      tradeBracelet: trades[0].bracelet,
      tradeCondition: trades[0].condition,
      tradeSet: trades[0].set,
      tradeExpectedValue: trades[0].expectedValue,
      tradeCurrency: "USD",
    });
  }
  payload.consent = document.querySelector("#consent").checked;
  payload.budgetFlexible = payload.budget === "Flexible";
  payload.submittedAt = new Date().toISOString();
  Object.assign(payload, attribution());
  return payload;
}

function updateReview() {
  const payload = collectPayload();
  const tradeRows = payload.tradeIn === "Yes"
    ? payload.tradeIns.map((trade, index) => [
        `Trade-in ${String(index + 1).padStart(2, "0")}`,
        [`${trade.brand} ${trade.model}`, trade.reference && `Ref. ${trade.reference}`, trade.year, trade.dial, trade.bracelet, trade.condition, trade.set, trade.expectedValue && `Expected ${Number(trade.expectedValue).toLocaleString()} USD`].filter(Boolean).join(" · "),
      ])
    : [["Trade-in", "No trade-in"]];
  const watchRows = payload.watches.map((watch, index) => {
    const reference = watch.reference && (watch.brand === "Richard Mille" ? watch.reference : `Ref. ${watch.reference}`);
    const details = [reference, watch.year, watch.caseMaterial, watch.dial, watch.bracelet, watch.condition, watch.budget, watch.timeline, watch.occasion].filter(Boolean).join(" · ") || "Open configuration";
    return [`Watch ${String(index + 1).padStart(2, "0")}`, `${watch.brand} ${watch.model} — ${details}`, true];
  });
  const rows = [
    ...watchRows,
    ...tradeRows,
    ["Contact", `${payload.fullName} · ${payload.preferredContact}`],
    ["Location", payload.location],
  ];
  reviewNode.replaceChildren();
  rows.forEach(([label, value, isWatch]) => {
    const row = document.createElement("div");
    row.classList.toggle("review-watch", Boolean(isWatch));
    const term = document.createElement("span");
    const detail = document.createElement("strong");
    term.textContent = label;
    detail.textContent = value || "Open";
    row.append(term, detail);
    reviewNode.append(row);
  });
}

function saveDraft() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    if (document.querySelector("#trade-in").value === "Yes") commitCurrentTrade();
    const values = {};
    [...form.elements].forEach((element) => {
      if (!element.name) return;
      values[element.name] = element.type === "checkbox" ? element.checked : element.value;
    });
    try { sessionStorage.setItem("omniPrivateRequestV3", JSON.stringify({ step: currentStep, values, watches: requestedWatches, activeWatchIndex, addingAnotherWatch, tradeIns: tradeInWatches, activeTradeIndex })); } catch (_) { /* Storage is optional. */ }
  }, 180);
}

function restoreDraft() {
  let draft;
  try { draft = JSON.parse(sessionStorage.getItem("omniPrivateRequestV3")); } catch (_) { return; }
  if (!draft?.values) return;
  requestedWatches = Array.isArray(draft.watches) ? draft.watches : [];
  activeWatchIndex = Math.max(0, Number(draft.activeWatchIndex) || 0);
  addingAnotherWatch = Boolean(draft.addingAnotherWatch);
  tradeInWatches = Array.isArray(draft.tradeIns) ? draft.tradeIns : [];
  activeTradeIndex = Math.max(0, Number(draft.activeTradeIndex) || 0);
  const deferredSelects = new Set(["caseMaterial", "bracelet"]);
  Object.entries(draft.values).forEach(([name, value]) => {
    if (deferredSelects.has(name)) return;
    const element = form.elements.namedItem(name);
    if (!element) return;
    if (element.type === "checkbox") element.checked = Boolean(value);
    else element.value = value;
  });
  document.querySelectorAll("[data-choice]").forEach((group) => {
    const value = inputFor(group)?.value;
    const button = [...group.querySelectorAll("[data-value]")].find((item) => item.dataset.value === value);
    if (button) choose(group, button, true);
  });
  deferredSelects.forEach((name) => {
    const element = form.elements.namedItem(name);
    if (element && draft.values[name]) element.value = draft.values[name];
  });
  configureBrandDetails(true);
  if (document.querySelector("#trade-in").value === "Yes") ensureTradeState();
  currentStep = Math.max(1, Math.min(9, Number(draft.step) || 1));
  document.querySelector("#guidance-choice").classList.toggle("is-selected", document.querySelector("#model").value === "Open to guidance");
}

function applyPrefill() {
  const brandParam = query.get("brand");
  if (brandParam) {
    const group = document.querySelector("[data-choice='brand']");
    const button = [...group.querySelectorAll("[data-value]")].find((item) => item.dataset.value.toLowerCase() === brandParam.toLowerCase());
    if (button) choose(group, button, true);
    else {
      choose(group, group.querySelector("[data-value='Other']"), true);
      document.querySelector("#other-brand").value = brandParam.slice(0, 100);
    }
  }
  if (query.get("model")) document.querySelector("#model").value = query.get("model").slice(0, 150);
  if (query.get("reference")) document.querySelector("#reference").value = query.get("reference").slice(0, 100);
  configureBrandDetails(true);
}

form.addEventListener("input", (event) => {
  if (event.target.matches("input, select")) {
    clearError();
    if (event.target.id === "case-material") syncSelectOther(materialSelect, materialOtherWrap, materialOtherInput);
    if (event.target.id === "bracelet") syncSelectOther(braceletSelect, braceletOtherWrap, braceletOtherInput);
    if (event.target.id === "trade-set") syncSelectOther(event.target, tradeSetOtherWrap, tradeSetOtherInput);
    if (["model", "other-brand"].includes(event.target.id)) updateWatchSelection();
    if (event.target.closest("#trade-details")) {
      if (["trade-brand", "trade-model"].includes(event.target.id)) configureTradeCatalog();
      commitCurrentTrade();
      renderTradeTabs();
    }
    saveDraft();
  }
});

form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || currentStep === 9) return;
  event.preventDefault();
  nextButton.click();
});

nextButton.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  playInterfaceSound("forward");
  track("private_request_step_completed", { step: currentStep });
  advanceFromCurrentStep();
});

backButton.addEventListener("click", () => {
  playInterfaceSound("back");
  track("private_request_step_back", { from: currentStep });
  showStep(currentStep - 1, "back");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateStep(9)) return;
  submitError.hidden = true;
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");
  track("private_request_submit_attempted", { brand: finalBrand() });
  try {
    const payload = collectPayload();
    const isLocalPreview = window.location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);
    let result;
    if (isLocalPreview) {
      await new Promise((resolve) => window.setTimeout(resolve, 380));
      result = { ok: true, preview: true, requestId: `WR—PREVIEW—${String(Date.now()).slice(-6)}` };
    } else {
      const response = await fetch("/api/watch-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true || !result.requestId) throw new Error(result.message || "Your request could not be delivered. Please try again.");
    }
    form.hidden = true;
    success.hidden = false;
    watchTabs.hidden = true;
    document.querySelector("#trade-photo-next").hidden = payload.tradeIn !== "Yes";
    if (payload.tradeIn === "Yes") {
      const plural = payload.tradeIns.length > 1;
      document.querySelector("#trade-photo-title").textContent = plural ? "For your trade appraisals" : "For your trade appraisal";
      document.querySelector("#trade-photo-copy").textContent = plural
        ? "Your concierge will ask for three simple photos of each watch: the dial, caseback, and everything included."
        : "Your concierge will ask for three simple photos: the dial, caseback, and everything included with the watch.";
    }
    document.querySelector("#request-id").textContent = result.requestId || "WR—PENDING";
    if (result.preview) document.querySelector("#success-copy").textContent = "Demo complete — no request was sent. Live delivery will be enabled before launch.";
    playInterfaceSound("confirm");
    track("private_request_submitted", { requestId: result.requestId, preview: Boolean(result.preview) });
    try { sessionStorage.removeItem("omniPrivateRequestV3"); } catch (_) { /* Storage is optional. */ }
  } catch (error) {
    submitError.textContent = error.message;
    submitError.hidden = false;
    track("private_request_submit_failed", { message: error.message });
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
  }
});

document.querySelector("#new-request").addEventListener("click", () => {
  playInterfaceSound("open");
  form.reset();
  form.hidden = false;
  success.hidden = true;
  requestedWatches = [];
  activeWatchIndex = 0;
  addingAnotherWatch = false;
  tradeInWatches = [];
  activeTradeIndex = 0;
  document.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
  document.querySelectorAll("[aria-pressed]").forEach((item) => item.setAttribute("aria-pressed", "false"));
  otherBrandWrap.hidden = true;
  customBudget.hidden = true;
  tradeDetails.hidden = true;
  renderTradeTabs();
  renderModels();
  updateWatchSelection();
  showStep(1);
});

document.querySelector("#add-another-watch").addEventListener("click", () => {
  playInterfaceSound("wind");
  commitCurrentWatch();
  activeWatchIndex = requestedWatches.length;
  addingAnotherWatch = true;
  resetWatchFields();
  updateWatchSelection();
  showStep(1);
  track("private_request_additional_watch_started", { watch: activeWatchIndex + 1 });
});

document.querySelector("#explore-site").addEventListener("click", () => {
  track("private_request_website_explored", { destination: "https://omnitimepieces.com" });
});

mobileStart.addEventListener("click", () => {
  window.clearTimeout(transitionTimer);
  document.body.classList.add("mobile-transitioning");
  mobileStart.disabled = true;
  stopMovementHeartbeat({ fade: 420, reset: true });
  playInterfaceSound("settle");
  track("mobile_private_request_started");
  const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 520;
  transitionTimer = window.setTimeout(() => {
    document.body.classList.add("mobile-form-open");
    document.body.classList.remove("mobile-transitioning");
    mobileStart.disabled = false;
    steps[currentStep - 1].querySelector("h2")?.focus({ preventScroll: true });
  }, delay);
});

mobileIntro.addEventListener("click", () => {
  playInterfaceSound("back");
  document.body.classList.remove("mobile-form-open");
  document.body.classList.remove("mobile-transitioning");
  startMovementHeartbeat({ restart: true });
  window.setTimeout(() => mobileStart.focus({ preventScroll: true }), 520);
});

function isCinematicIntroActive() {
  return movementViewport.matches && !document.body.classList.contains("mobile-form-open");
}

function fadeMovementAudio(target, duration = 500, resetWhenSilent = false) {
  window.cancelAnimationFrame(movementFadeFrame);
  const startVolume = movementAudio.volume;
  const startedAt = window.performance.now();
  const draw = (now) => {
    const progress = Math.min(1, (now - startedAt) / Math.max(duration, 1));
    const eased = 1 - Math.pow(1 - progress, 3);
    movementAudio.volume = startVolume + (target - startVolume) * eased;
    if (progress < 1) {
      movementFadeFrame = window.requestAnimationFrame(draw);
      return;
    }
    if (target === 0) {
      movementAudio.pause();
      if (resetWhenSilent) movementAudio.currentTime = 0;
    }
  };
  movementFadeFrame = window.requestAnimationFrame(draw);
}

async function startMovementHeartbeat({ restart = false } = {}) {
  if (!document.body.classList.contains("sound-on") || !isCinematicIntroActive()) return;
  window.cancelAnimationFrame(movementFadeFrame);
  if (restart) movementAudio.currentTime = 0;
  if (movementAudio.paused) await movementAudio.play().catch(() => {});
  fadeMovementAudio(0.115, 760);
  document.body.dataset.soundscape = "movement";
}

function stopMovementHeartbeat({ fade = 480, reset = false } = {}) {
  fadeMovementAudio(0, fade, reset);
  document.body.dataset.soundscape = document.body.classList.contains("sound-on") ? "concierge" : "silent";
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return undefined;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function mechanicalImpact(at, { volume = 0.018, pitch = 1350, weight = 0.45 } = {}) {
  const context = ensureAudioContext();
  if (!context || context.state !== "running") return;
  const soundscapeScale = isCinematicIntroActive() ? 1 : 0.68;
  volume *= soundscapeScale;

  const duration = 0.034;
  const noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    const decay = Math.pow(1 - index / samples.length, 3.8);
    samples[index] = (Math.random() * 2 - 1) * decay;
  }

  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  noise.buffer = noiseBuffer;
  filter.type = "bandpass";
  filter.frequency.value = pitch;
  filter.Q.value = 3.6;
  noiseGain.gain.setValueAtTime(0.0001, at);
  noiseGain.gain.exponentialRampToValueAtTime(volume, at + 0.0015);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  noise.connect(filter).connect(noiseGain).connect(context.destination);
  noise.start(at);

  const body = context.createOscillator();
  const bodyGain = context.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(510 + weight * 180, at);
  body.frequency.exponentialRampToValueAtTime(360 + weight * 90, at + 0.028);
  bodyGain.gain.setValueAtTime(0.0001, at);
  bodyGain.gain.exponentialRampToValueAtTime(volume * 0.42, at + 0.002);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.032);
  body.connect(bodyGain).connect(context.destination);
  body.start(at);
  body.stop(at + 0.035);
}

function calibreResonance(at) {
  const context = ensureAudioContext();
  if (!context || context.state !== "running") return;
  [
    { frequency: 392, volume: 0.0032, delay: 0 },
    { frequency: 587.33, volume: 0.0021, delay: 0.045 },
  ].forEach(({ frequency, volume, delay }) => {
    const start = at + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, start + 1.25);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.065);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 1.4);
  });
}

function playInterfaceSound(kind = "select") {
  if (!document.body.classList.contains("sound-on")) return;
  const context = ensureAudioContext();
  if (!context) return;
  const now = context.currentTime + 0.008;

  if (kind === "settle") {
    calibreResonance(now);
    return;
  }

  if (kind === "back") {
    mechanicalImpact(now, { volume: 0.009, pitch: 1120, weight: 0.32 });
    return;
  }
  if (kind === "forward") {
    mechanicalImpact(now, { volume: 0.012, pitch: 1480, weight: 0.48 });
    mechanicalImpact(now + 0.052, { volume: 0.008, pitch: 1760, weight: 0.38 });
    return;
  }
  if (kind === "open") {
    mechanicalImpact(now, { volume: 0.01, pitch: 1250, weight: 0.4 });
    mechanicalImpact(now + 0.085, { volume: 0.006, pitch: 2050, weight: 0.28 });
    return;
  }
  if (kind === "wind" || kind === "confirm") {
    const count = kind === "confirm" ? 5 : 3;
    for (let index = 0; index < count; index += 1) {
      mechanicalImpact(now + index * 0.047, {
        volume: 0.009 + index * 0.0012,
        pitch: 1180 + index * 150,
        weight: 0.4 + index * 0.04,
      });
    }
    return;
  }
  mechanicalImpact(now, { volume: 0.01, pitch: 1580, weight: 0.38 });
}

async function toggleMovementSound() {
  const turningOn = !document.body.classList.contains("sound-on");
  document.body.classList.toggle("sound-on", turningOn);
  if (turningOn) {
    const context = ensureAudioContext();
    if (context) await context.resume();
    if (isCinematicIntroActive()) {
      await startMovementHeartbeat({ restart: true });
      playInterfaceSound("open");
    } else {
      movementAudio.pause();
      movementAudio.currentTime = 0;
      document.body.dataset.soundscape = "concierge";
      playInterfaceSound("settle");
    }
  } else {
    stopMovementHeartbeat({ fade: 180, reset: true });
    document.body.dataset.soundscape = "silent";
  }
  soundButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(turningOn));
    button.querySelector("span").textContent = turningOn ? "Sound on" : "Sound";
  });
  track("movement_sound_toggled", { enabled: turningOn });
}

soundButtons.forEach((button) => button.addEventListener("click", toggleMovementSound));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) movementAudio.pause();
  else if (document.body.classList.contains("sound-on") && isCinematicIntroActive()) startMovementHeartbeat();
});
movementViewport.addEventListener("change", () => {
  if (!document.body.classList.contains("sound-on")) return;
  if (isCinematicIntroActive()) startMovementHeartbeat();
  else stopMovementHeartbeat({ fade: 260, reset: true });
});

document.querySelectorAll("[data-review-edit]").forEach((button) => {
  button.addEventListener("click", () => {
    playInterfaceSound("back");
    showStep(Number(button.dataset.reviewEdit), "back");
  });
});

document.querySelectorAll("[data-legal]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.legal}`).showModal());
});

document.querySelectorAll(".legal-dialog").forEach((dialog) => {
  dialog.querySelector(".legal-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
});

initializeCatalogs();
configureTradeCatalog();
restoreDraft();
applyPrefill();
renderModels();
showStep(currentStep);
