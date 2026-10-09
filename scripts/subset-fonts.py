"""Optional asset build: Python + fonttools[woff]==4.60.2. Originals stay intact.

Latin and common punctuation load first; other glyphs use the complete font.
Run from the repository root after replacing licensed source WOFF2 files.
"""
from pathlib import Path
from fontTools import subset

RANGES = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+FEFF,U+FFFD'
for source in sorted(Path('public/fonts').glob('*.woff2')):
    if source.stem.endswith('-latin'):
        continue
    options = subset.Options()
    options.flavor = 'woff2'
    font = subset.load_font(str(source), options)
    selection = subset.Subsetter(options=options)
    selection.populate(unicodes=subset.parse_unicodes(RANGES))
    selection.subset(font)
    subset.save_font(font, str(source.with_stem(source.stem + '-latin')), options)
