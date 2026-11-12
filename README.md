# Legacy Revive

**AI agents that recover abandoned software from its files alone and carry it forward into maintainable web apps.**

Final project for the AI Agents class. Software disappears when its platform dies: the programs and the work people
made with them end up runnable only inside emulators, if at all. Legacy Revive is a pipeline of five cooperating
agents that reverse engineers a legacy program's file format with no documentation and no source code, writes a
specification, proves the specification in a clean room, and then modernizes each program into a web app a
developer can read and extend. A verifier agent measures the result against the original.

The pipeline is general: it was run end to end on two unrelated programs.

| target | what it is | corpus | script language |
|---|---|---|---|
| **HyperCard** | Apple, 1987–2004. Card stacks for the classic Mac | 10 stacks from the Internet Archive (`hypercardstacks`) | HyperTalk |
| **ZZT** | Epic MegaGames, 1991. MS-DOS text-mode game creation tool | 8 community-made world files (6 releases) from the Museum of ZZT | ZZT-OOP |

Open **`index.html`** for a gallery of every program: the original (emulator screenshot) beside the modernized app,
with a link to play each one. Every app opens by double-clicking its `index.html`, with no server and no build step.

## The agents (`.claude/agents/`)

```
 corpus files ──► Analyst ──► Documenter ──► SPEC.md ──► Clean-room Builder ──► Legacy IR ──► Modernizer ──► web app
  (bytes only)    notes +      one precise              reader built from        (shared      translator +       │
                  probes       specification            the spec alone           JSON)        shared runtime     ▼
                                                        + GAPS.md                                  ◄── defects ── Verifier
```

Each agent is one short prompt file: its role, its rules, and the tools it may use. Read them here:

| agent | prompt file |
|---|---|
| Analyst | [`.claude/agents/analyst.md`](.claude/agents/analyst.md) |
| Documenter | [`.claude/agents/documenter.md`](.claude/agents/documenter.md) |
| Clean-room Builder | [`.claude/agents/cleanroom-builder.md`](.claude/agents/cleanroom-builder.md) |
| Modernizer | [`.claude/agents/modernizer.md`](.claude/agents/modernizer.md) |
| Verifier | [`.claude/agents/verifier.md`](.claude/agents/verifier.md) |

**Running them.** Install [Claude Code](https://claude.com/claude-code), clone this repo, and start `claude` inside the
repo folder. `/agents` lists the five agents, and you call them in plain language, e.g. *"use the analyst agent on
corpus/hypercard/obliquestrategies"* or *"run the verifier on the Game Genie app"*. They run on your own Claude plan.
`CLAUDE.md` gives every session the pipeline and its rules. The agents expect this repo's folder layout, so run them
here rather than copying the files elsewhere. Nothing they already built needs an AI to run: the readers, apps,
gallery and tests are plain Python and JavaScript.

| agent | input | output | rule |
|---|---|---|---|
| **Analyst** | sample files | `specs/<t>/notes/`, runnable `probes/` | bytes only: no web, no docs, no recalled knowledge; every claim cites offsets and is labelled confirmed / probable / unknown |
| **Documenter** | notes + probes | `specs/<t>/SPEC.md` | only what the notes support; the spec must be enough to write a reader |
| **Clean-room Builder** | **SPEC.md only** | `recovered/<t>/reader.py` → Legacy IR, tests, `GAPS.md` | may not read the notes, probes or any other code; logs every place the spec was wrong or silent |
| **Modernizer** | Legacy IR + spec | shared `modern/runtime/`, `modern/<t>/translator.py`, apps in `output/<t>/*/app/` | readable output, original script kept as comments, untranslatable lines become counted stubs |
| **Verifier** | apps + originals | `eval/` scores, `DEFECTS.md` | visual and behavioral checks against the original; defects go back to the Modernizer |

The **Legacy IR** (`docs/legacy-ir.md`) is what makes the pipeline general: every reader emits it, and one shared
browser runtime renders it (a pixel renderer for HyperCard, a character-cell renderer for ZZT). A new legacy program
needs a reader and a script translator, not a new runtime.

## Results (final verification, `eval/SUMMARY.md`)

**Recovery (clean room)**
- HyperCard: the agents worked out the whole stack format from bytes, including the undocumented bitmap
  compression (an opcode stream with row filters). Decoded card pictures match the original screenshots on
  **99.95–100%** of pixels in all 10 stacks; the only miss is a mouse cursor captured in one screenshot.
- ZZT: all 8 world files parse to their last byte (269 boards, 10,297 entities, 5,227 programs).
- Readers built from the spec alone pass their invariant tests on **18/18** files. They logged **31 gaps**: places
  where the spec was silent or ambiguous, and one where it was wrong (ZZT wall shapes: 15 occur, the spec said 7).

**Modernization**

| | iteration 1 | iteration 2 (after the Verifier's defects) |
|---|---|---|
| behavioral scenarios from the original scripts | 94/101 (93.1%) | **113/113 (100%)** |
| hold-out scenarios (Verifier only, never shown to the Modernizer) | – | **36/38 (94.7%)** |
| smoke tests with no JS/script errors | 17/18 | **18/18** |
| original script lines translated | 99.6% | **99.90%** (18,385 / 18,403) |
| visual fidelity, start screen | HyperCard ink_f1 0.985 · ZZT color match 0.9999 | 0.986 · 0.9999 |

The hold-out score is the honest number: the main set includes scenarios the Modernizer wrote next to its own
fixes. The two hold-out failures are real, open defects (listed in `eval/SUMMARY.md`).

## What the agents could not do (and why)
- **Missing data.** 35 HyperCard buttons use icons that ship inside the HyperCard application, not the stack, and
  some stacks call code from library stacks that aren't preserved. Those parts are drawn blank or stubbed, and each
  app's `MIGRATION.md` lists them. Two missing pieces (a Game Genie bit-conversion library, Patients' external
  commands) were reconstructed from how the scripts call them and are labelled as reconstructions.
- **Engine semantics are not in the files.** File formats can be recovered from bytes, but what a ZZT lion *does*
  is engine behaviour. The Modernizer reconstructed those behaviours, which is outside the clean room, and
  `MIGRATION.md` says so.
- **Measurement limits.** ZZT reference images exist only for title screens, and the glyph shapes were taken from
  those same images, so ZZT's visual score is an upper bound.

## Ethics and licensing
HyperCard is abandoned (Apple stopped selling it in 2004); only user-made stacks were analyzed, never the
application. ZZT's license forbids reverse engineering Epic's program and bundled worlds, so they were excluded:
only community-made worlds were used, and `ZZT.EXE` was never analyzed. The work is for interoperability and
preservation, and no original code is copied into the output.

## Repository map
| path | contents |
|---|---|
| `.claude/agents/` | the five agent definitions |
| `docs/legacy-ir.md` | the shared intermediate representation |
| `corpus/` | sample files + reference screenshots (`tools/fetch_corpus.py`, `tools/fetch_zzt.py`) |
| `specs/<t>/` | Analyst notes and probes, `SPEC.md`, `GAPS.md` |
| `recovered/<t>/` | clean-room readers and tests |
| `modern/` | shared runtime, translators, engines, `build.py` |
| `output/<t>/<sample>/` | `ir/` (recovered) and `app/` (modernized, with `MIGRATION.md`) |
| `eval/` | render/compare tools, behavioral harness, scenarios, results, `SUMMARY.md`, `DEFECTS.md` |
| `proposal/` | the one-page proposal (LaTeX) |
| `presentation/` | the class presentation (slide sources with speaker notes) |
| `PROMPTS.md` | every prompt of the project, in English, key turns marked |

## Reproduce
```bash
pip install machfs Pillow
python tools/fetch_corpus.py && python tools/fetch_zzt.py        # corpus
python recovered/hypercard/test_reader.py && python recovered/zzt/test_reader.py
python modern/build.py hypercard all && python modern/build.py zzt all
cd eval && npm install && cd ..
python eval/visual.py hypercard && python eval/visual.py zzt
node eval/behave.mjs hypercard <stack>     # one app at a time; see eval/SUMMARY.md
python eval/summarize.py && python tools/make_gallery.py
```

The agents ran as Claude Code subagents (Claude Opus 5.5). Their prompts are the files in `.claude/agents/` plus
the task messages recorded in the session transcripts referenced in `PROMPTS.md`.
