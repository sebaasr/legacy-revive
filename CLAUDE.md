# Legacy Revive

Multi-agent pipeline that recovers and modernizes abandoned software. Class final project (AI Agents).

## Pipeline (agents in `.claude/agents/`)
1. `analyst` reverse engineers sample files from bytes alone → `specs/<target>/notes/`, `probes/`
2. `documenter` writes `specs/<target>/SPEC.md`
3. `cleanroom-builder` implements `recovered/<target>/reader.py` from SPEC.md only → Legacy IR (`docs/legacy-ir.md`); gaps → `specs/<target>/GAPS.md`
4. `modernizer` builds web apps: shared `modern/runtime/` + `modern/<target>/translator.py` → `output/<target>/<sample>/app/`
5. `verifier` scores visual/behavioral fidelity → `eval/<target>/results.json`, `DEFECTS.md` (loops back to 4)

## Targets
- `hypercard`: Apple HyperCard stacks (1987–2004), corpus from the Internet Archive `hypercardstacks` collection (`tools/fetch_corpus.py`).
- `zzt`: ZZT worlds (MS-DOS, 1991), community-made worlds only, from the Museum of ZZT (`tools/fetch_zzt.py`). Epic's own files are excluded: their license forbids reverse engineering. Never analyze ZZT.EXE.

## Rules
- Clean-room: stages 1–3 never use the web or prior knowledge of a format; stage 3 reads only SPEC.md.
- Every prompt the user sends is logged in English in `PROMPTS.md` (key turns marked **[KEY]**).
- Python 3 (stdlib + Pillow + machfs), plain JS for the runtime, no build step.
