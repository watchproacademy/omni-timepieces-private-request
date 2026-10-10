export type WatchProfile = {
    prompt: string;
    question: string;
    helper: string;
    modelLabel: string;
    modelPlaceholder: string;
    referenceLabel: string;
    referencePlaceholder: string;
    configurationHeading: string;
    yearLabel: string;
    yearPlaceholder: string;
    dialLabel: string;
    dialPlaceholder: string;
    materialLabel: string;
    materialOpen: string;
    materialHelp: string;
    braceletLabel: string;
    braceletOpen: string;
    braceletHelp: string;
    suggestions: string[];
    referenceRules: {
        matches: string[];
        options: string[];
    }[];
    dials: string[];
    materials: string[];
    wearingRules: {
        matches: string[];
        options: string[];
    }[];
    wearingAlways?: string[];
};
export const baseWatchProfile: WatchProfile = {
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
export const brandProfiles: Record<string, WatchProfile> = {
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
export const commonDialOptions = [
    "Black", "White", "Blue", "Green", "Silver", "Grey", "Champagne", "Brown", "Salmon", "Red",
    "Meteorite", "Mother-of-pearl", "Skeleton / openworked", "Factory diamond", "No preference",
];
export const commonWearingOptions = [
    "Metal bracelet", "Oyster bracelet", "Jubilee bracelet", "Integrated bracelet", "Rubber / silicone strap",
    "Leather strap", "Fabric / Velcro® strap", "NATO strap", "Complete interchangeable set", "Not sure",
];
export const catalogBrands = [
    ...Object.keys(brandProfiles), "A. Lange & Söhne", "Cartier", "Tudor", "IWC", "Jaeger-LeCoultre",
    "Breitling", "Panerai", "Hublot", "Grand Seiko", "Breguet", "Zenith", "TAG Heuer", "Other",
];
export function profileForBrand(brand: string): WatchProfile {
    const key = Object.keys(brandProfiles).find(name => name.toLowerCase() === brand.trim().toLowerCase());
    return key ? brandProfiles[key] : baseWatchProfile;
}
export function referencesFor(brand: string, model: string) {
    const rules = profileForBrand(brand).referenceRules;
    const matching = model ? rules.filter(rule => rule.matches.some(term => model.toLowerCase().includes(term.toLowerCase()))) : [];
    return [...new Set((matching.length ? matching : rules).flatMap(rule => rule.options))];
}
export function wearingOptionsFor(profile: WatchProfile, model: string) {
    if (profile.wearingAlways)
        return profile.wearingAlways;
    return profile.wearingRules.find(rule => rule.matches.some(term => model.toLowerCase().includes(term.toLowerCase())))?.options || [];
}
export function yearsFor(currentYear = new Date().getFullYear()) {
    return ['Current production', 'Any year', ...Array.from({ length: currentYear - 1949 }, (_, i) => String(currentYear - i))];
}

// Request ranges are preferences; trade-in years remain individual production years.
export const yearPreferences = [2024, 2025, 2026].map(year => ({
    label: `${year}+`, value: `${year} and newer`
}));
