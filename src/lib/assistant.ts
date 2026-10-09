import { brandProfiles, baseWatchProfile, wearingOptionsFor } from './catalog';
function detectAssistantBrand(brief: string, fallback: string) {
    const text = brief.toLowerCase();
    if (/\brolex\b/.test(text))
        return "Rolex";
    if (/\bpatek\b|patek philippe/.test(text))
        return "Patek Philippe";
    if (/\baudemars\b|audemars piguet|\bap\b/.test(text))
        return "Audemars Piguet";
    if (/richard mille|\brm\s*[- ]?\d/.test(text))
        return "Richard Mille";
    if (/\bvacheron\b|vacheron constantin/.test(text))
        return "Vacheron Constantin";
    if (/f\.?p\.?\s*journe|\bjourne\b/.test(text))
        return "F.P. Journe";
    if (/\bomega\b/.test(text))
        return "Omega";
    return fallback;
}
function optionContaining(options: string[], terms: string[]) {
    return options.find((option) => terms.some((term) => option.toLowerCase().includes(term))) || "";
}
export function interpretWatchBrief(brief: string, fallback = '') {
    const text = brief.toLowerCase().replace(/[–—]/g, "-");
    const brand = detectAssistantBrand(brief, fallback);
    const profile = brandProfiles[brand] || baseWatchProfile;
    let model = [...profile.suggestions].sort((a, b) => b.length - a.length).find((item) => text.includes(item.toLowerCase())) || "";
    const rmMatch = brand === "Richard Mille" && brief.match(/\brm\s*[- ]?(\d{2,3}(?:-\d{2})?)\b/i);
    if (rmMatch)
        model = `RM ${rmMatch[1]}`;
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
        if (!briefTerms.some((term) => text.includes(term)))
            return false;
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
        if (!briefTerms.some((term) => text.includes(term)))
            return false;
        bracelet = optionContaining(wearingOptions, optionTerms);
        return Boolean(bracelet);
    });
    let condition = "";
    if (/\b(?:new|unworn)\b/.test(text))
        condition = "New / unworn";
    else if (/pre[- ]?owned|\bused\b/.test(text))
        condition = "Pre-owned";
    else if (/open to either|either condition/.test(text))
        condition = "Open to either";
    let timeline = "";
    if (/asap|as soon as possible|immediately|right away/.test(text))
        timeline = "As soon as possible";
    else if (/within (?:two|2) weeks?/.test(text))
        timeline = "Within 2 weeks";
    else if (/(?:one|1|two|2|three|3)[ -]months?|1-3 months?/.test(text))
        timeline = "Within 1–3 months";
    else if (/no (?:fixed )?timeline|no rush/.test(text))
        timeline = "No fixed timeline";
    const moneyMatch = brief.match(/\$\s*([\d,.]+)\s*(k)?/i);
    const budgetMax = moneyMatch ? Math.round(Number(moneyMatch[1].replace(/,/g, "")) * (moneyMatch[2] ? 1000 : 1)) : 0;
    const budget = /flexible (?:budget|range)|budget is flexible/.test(text) ? "Flexible" : budgetMax ? "Custom" : "";
    const modelValue = model || "Open to guidance";
    const details = [
        ["Maison", brand], ["Watch", modelValue === "Open to guidance" ? "Guided search" : modelValue], [brand === "Richard Mille" ? "Edition" : "Reference", reference], ["Year", year], ["Dial", dial], ["Material", material], ["Bracelet / strap", bracelet], ["Condition", condition], ["Timing", timeline], ["Budget", budgetMax ? `Up to ${budgetMax.toLocaleString("en-US")} USD` : budget],
    ].filter(([, value]) => value);
    let followUp = "Should we keep the remaining configuration open for the strongest opportunity?";
    if (!model)
        followUp = "Which model or collection should we focus on?";
    else if (!reference)
        followUp = brand === "Richard Mille" ? "Is there a named edition you prefer, or should we keep it open?" : "Do you know the exact reference, or should we keep it open?";
    else if (brand === "Richard Mille" && !material)
        followUp = "Which case construction do you prefer?";
    else if (!dial)
        followUp = "Do you have a dial preference, or should we keep it open?";
    return { brand, model: modelValue, reference, year, dial, material, bracelet, condition, timeline, budget, budgetMax, details, followUp };
}
