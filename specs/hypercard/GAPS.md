# HyperCard SPEC gaps (found by the Clean-room Builder)

Found while implementing `recovered/hypercard/reader.py` from SPEC.md alone. All 10 corpus stacks
parse, and every structural invariant in the spec holds: 437 parts, 386 bitmap streams, all
part/content lengths, all card counts. So the gaps below are about meaning and the IR mapping, not
about the container layout.

| # | spec section | problem | what you did |
|---|---|---|---|
| 1 | 3.3 style numbers, 6 `style.shape` | Button **style 8** occurs (What is HyperCard, `card-5608/button-2`). The spec lists only 0–6 for buttons. | Emitted `"style-8"` plus a note, like the other unknown styles (button 1, 2, 4, 5, 6; field 1). |
| 2 | 6 `extra.runs` | `"font"` in a run is not defined as a font id or a font name. Neither is `"style"` (raw STBL bits or something else). | Each run has `start`, `font` (FTBL name), `font_id`, `size`, `style` (raw bits, −1 replaced by the part's +26 value) and `style_id`. |
| 3 | 4.1 vs 6 (Layer / `layer_text`) | 4.1 recommends falling back to the BKGD block's record when a card has no record for a background field. Section 6 puts the BKGD record only in the layer object's `text`, and `layer_text` only from CARD records. Who does the fallback is not stated (open question 6). | Followed section 6 and did not copy BKGD text into `layer_text`. The runtime should use `layer_text` when present, otherwise the layer object's `text`. |
| 4 | 6 `start_screen` vs task | `start_screen` = STAK 0x30, but openStack scripts move elsewhere (Oblique: `go card 2`). The spec does not say whether the IR should resolve this. | IR keeps STAK 0x30, as the spec says. `check_pictures.py` takes the last `go card N / card id N / first / last` in `on openStack`. Oblique resolves to card 2 (`card-69896`), Patients to `card id 227564` (= first card). |
| 5 | 3.3 flags, 6 "unknown flag bits that are set" | The spec does not say which bits count as known for notes. Field flag A 0x01 is "probable locked", but its table entry says unknown for fields. | Known: A 0x80 (both kinds), A 0x01 (both), B 0x8000/0x4000 (buttons). Every other set bit gets one aggregated note per (kind, bits) value, listing the part count and examples. |
| 6 | 6 `style` | `locked` for buttons and `highlight` for fields are not defined. | Both set to `false`. |
| 7 | 3.3 rect | It is not stated whether right/bottom are exclusive or inclusive. | IR passes the values through unchanged. The fidelity check treats them as inclusive when masking parts out. |
| 8 | 4.8 / 6 icons | When a button's icon id is missing as `ICON` but exists as another type (Patients 9253 is only a `CURS`), the spec does not say whether to use it. ICN# with the same id as a fallback is not covered either. | Only `ICON` is exported. The missing-icon note names the other types that have that id. |
| 9 | 6 missing-icon note | One note per button, or one per icon id? | One note per button (Cthulhu: 18, Patients: 9…), each with the object id. |
| 10 | 6 sounds | How a `play "<name>"` target is matched to a `snd ` resource (case, `.snd` suffix) is not given. Cthulhu uses both `"Don't Worry.snd"` and `"Don't Worry.Snd"`. | The name is matched case-insensitively against `snd ` resource names. One note per distinct name, saying whether it is present (Fishing "MJW") or missing. |
| 11 | 4.5 main loop | It is not specified what happens when a repeat prefix (0xA0–0xBF) is followed by another repeat byte, or by an unknown op. | Treated as an unknown op. Decoding stops and a note is added (never happens in the corpus). |
| 12 | 4.5 opcode 0x88 | The filter values are unknown (the probe guess is (16, 0)). | Used (16, 0) plus a note if met (never met). |
| 13 | 4.5 | 0x85/0x86/0x87 with fewer previous rows than needed is not specified. | A white row is emitted (never happens). |
| 14 | 6 `name` | The name is the file name minus `.stak`, but the corpus file names are sanitised (`What is HyperCard_`, `Game Genie Encoder_Decoder`). The original name (probably with `?` or `/`) cannot be recovered from the data fork. | Used the file name as-is. |
| 15 | 6 display context | The window offset of cards smaller than the screen cannot be derived from the file (as the spec says). | `check_pictures.py` searches the offset for the best match. It finds exactly the spec's values: FLC (48, 51), What is HyperCard (16, 40), Mark Twain (144, 40). |
| 16 | 4.2 / 6 format 8 | Format 8 has no FTBL, so all font names are unknown. | `style.font = null`, `extra.font_id = 0`, plus one stack-level note (not one per part). |
| 17 | 6 Layer `image` | It says "opaque card-size PNG" but not 1-bit vs RGB. | Saved as a 1-bit PNG (allowed by the IR rules). Card pictures are RGBA. |
