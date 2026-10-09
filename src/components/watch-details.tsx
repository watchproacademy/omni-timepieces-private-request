'use client';
import { profileForBrand, referencesFor, wearingOptionsFor, yearsFor } from '@/lib/catalog';
import { useRequest } from './providers';
import { Field, SelectField } from './fields';
import type { EditableWatch } from '@/lib/state';
export function WatchDetails({ watch }: {
    watch: EditableWatch;
}) {
    const { dispatch } = useRequest();
    const profile = profileForBrand(watch.brand);
    const update = (patch: Partial<EditableWatch>) => dispatch({ type: 'watch/update', id: watch.id, patch });
    const wearing = wearingOptionsFor(profile, watch.model);
    return <><p className="helper">{profile.helper}</p><div className="suggestions">{profile.suggestions.map(model => <button type="button" key={model} onClick={() => update({ model })}>{model}</button>)}</div><div className="field-grid">
 <Field label={profile.modelLabel} value={watch.model} required options={profile.suggestions} placeholder={profile.modelPlaceholder} onChange={model => update({ model })}/>
 <Field label={profile.referenceLabel} value={watch.reference} options={referencesFor(watch.brand, watch.model)} onChange={reference => update({ reference })}/>
 <Field label={profile.yearLabel} value={watch.year} options={yearsFor()} onChange={year => update({ year })}/>
 <Field label={profile.dialLabel} value={watch.dial} options={profile.dials} onChange={dial => update({ dial })}/>
 {profile.materials.length ? <SelectField label={profile.materialLabel} value={watch.caseMaterial} options={[...profile.materials, 'Other / specific']} onChange={caseMaterial => update({ caseMaterial, caseMaterialOther: '' })}/> : null}
 {wearing.length ? <SelectField label={profile.braceletLabel} value={watch.bracelet} options={[...wearing, 'Other / specific']} onChange={bracelet => update({ bracelet, braceletOther: '' })}/> : null}
 {/other|specific/i.test(watch.caseMaterial) ? <Field label="Specific case material" value={watch.caseMaterialOther} required onChange={caseMaterialOther => update({ caseMaterialOther })}/> : null}
 {/other|specific/i.test(watch.bracelet) ? <Field label="Specific bracelet or strap" value={watch.braceletOther} required onChange={braceletOther => update({ braceletOther })}/> : null}
 </div><button className="quiet-button" type="button" onClick={() => update({ model: 'Open to guidance' })}>I’d like your guidance</button></>;
}
