# Prompt Log: AI Agents for Recovering and Modernizing Legacy Software

Every prompt sent to the agent for this project, translated to English when it was written in Spanish.
Prompts that changed the project's direction are marked **[KEY]**.

Raw transcripts (original language, with full agent responses) are saved by Claude Code as `.jsonl`
files under `C:\Users\sebas\.claude\projects\<folder>\`, where `<folder>` is the directory the session
was started from.

---

## Session 1 (2026-10-29): Choosing the idea and writing the proposal

Transcript: `C:\Users\sebas\.claude\projects\C--Users-sebas\99d8c60f-4936-4635-929c-5280e56faed6.jsonl`

1. **[KEY]** "I have the proposal for my AI agents project. What could we do? I wanted something related
   to architecture or something that contributes to the world. We can use everything I've asked you for
   in past assignments, reverse engineering and so on. Think about using my projects as examples too.
   Give me ideas."
   *(Pasted the assignment: write a one-page project proposal, presented in the last week of classes;
   know where your prompts are stored.)*
   - Result: five ideas. Favorites: (1) "Legacy Rescue" architecture recovery, (3) software preservation.

2. "I like 1 and 3. Give me the descriptions in English to show my professor."
   - Result: English pitches for Option A (Legacy Rescue) and Option B (Software Preservation).

3. **[KEY]** "He said option B. He gave me an old piece of software called HyperCard, and it shouldn't
   only recover, it should also be able to modernize."
   - Result: proposal drafted as a Claude Doc with a recover → modernize → verify agent pipeline.

4. **[KEY]** "Wait, not only HyperCard, that's just an example. The idea is to create software not only
   for that; we want it for more possible software."
   - Result: proposal reframed as a general pipeline for any legacy software; HyperCard becomes case
     study 1, plus a second program of a different kind to test generality.

5. **[KEY]** "Add the fact that we can use reverse engineering as a tool."
   - Result: reverse engineering made the agents' main tool (REA MCP server: decompilation,
     file-format analysis, GDB/Frida instrumentation).

6. "Now, could we use LaTeX for the one-page PDF?"
   - Result: `proposal.tex` / `proposal.pdf`, one page, TikZ pipeline diagram.

7. "Save all the prompts for everything in English, we need to keep a record. Also remove the timeline
   from the PDF."
   - Result: this `PROMPTS.md` log created; timeline removed from the PDF.

---

## Session 2 (2026-11-10): Building the full project

Transcript: `C:\Users\sebas\.claude\projects\C--Users-sebas\99d8c60f-4936-4635-929c-5280e56faed6.jsonl` (continued)

8. **[KEY]** "I need to present this in a week and a half. I want to leave it finished. Help me and finish
   it properly and completely."
   - Clarifications (answered via questions): the professor only named HyperCard (no files) → corpus
     taken from the Internet Archive; agents run as Claude Code subagents (no API key); the agent picks
     the second program → ZZT (1991), community worlds only (Epic's license forbids reverse engineering
     its own files).

9. "Ok, keep going, let me know when it's done."
   - Result (2026-11-10 → 11-11): full pipeline built and run on HyperCard (10 stacks) and ZZT (8 worlds):
     5 agent roles in `.claude/agents/`, 14 agent runs (Analyst ×3, Documenter ×2, Clean-room Builder ×2,
     Modernizer ×4, Verifier ×2 + one resumed after a usage limit). Final: 113/113 scenarios, hold-out 36/38,
     99.9% of script lines translated. See README.md and eval/SUMMARY.md.

## Agent task prompts (orchestration log)

The orchestrator (main Claude Code session) wrote one task message per agent run; the role definitions are in
`.claude/agents/*.md`. In order:

| # | agent | target | task summary |
|---|---|---|---|
| A1 | Analyst | HyperCard | Part 1: container, stack header, cards/backgrounds, parts, field text, locate bitmaps; `dump_stack.py` |
| A2 | Analyst | ZZT | World header, boards, RLE grid, properties, entity records + scripts, element table; `dump_world.py`, `render_board.py` |
| A3 | Analyst | HyperCard | Part 2: bitmap decompression checked against emulator screenshots; resource fork icons |
| D1 | Documenter | ZZT | SPEC.md with palette tables, grid algorithm, ZZT-OOP section, IR mapping |
| C1 | Clean-room Builder | ZZT | Reader from SPEC.md only, tests, GAPS.md |
| M1 | Modernizer | ZZT | Shared runtime (designed for both targets), cell renderer, ZZT-OOP translator, engine, 8 apps |
| D2 | Documenter | HyperCard | SPEC.md with full bitmap codec, worked hex examples, HyperTalk usage counts from all 288 scripts |
| C2 | Clean-room Builder | HyperCard | Reader from SPEC.md only, tests, picture check, GAPS.md |
| M2 | Modernizer | HyperCard | Pixel renderer, HyperTalk tokenizer/parser/translator, 10 apps (resumed once after a usage limit) |
| V1 | Verifier | both | Visual + behavioral harness, 101 scenarios from the original scripts, DEFECTS.md |
| M3 | Modernizer | HyperCard | Iteration 2: fix V1 defects (library shim, chunk padding, locals, doMenu, XCMDs, snd decoding) |
| M4 | Modernizer | ZZT | Iteration 2: element behaviours (creatures, bombs, transporters, dark boards…), one window per message |
| V2 | Verifier | both | Final: fresh re-run, retire 3 bug-encoding scenarios, 38 hold-out scenarios, SUMMARY.md |

Key orchestration decisions: run ZZT and HyperCard stages in parallel where they don't share files; the shared
runtime was built by the first Modernizer with an explicit contract for the second target; the final Verifier wrote
hold-out scenarios the Modernizer never saw, so the last score is not tuned to the fixes.
   - Deliverables finished 2026-11-11: README.md, gallery index.html, eval/SUMMARY.md, and the class slides
     (13 slides with speaker notes: https://claude.ai/artifact/V2E7nzRvr3kaFE5HHg4PBd, sources in presentation/deck).

## Session 2026-11-12 (transcript 99d8c60f-4936-4635-929c-5280e56faed6.jsonl, continued)
1. "I have a question: which HyperCard did you do? The one from Apple from 1987?"
   - Answered: yes, Apple's HyperCard, but only the stack files made with it were analyzed, never the app.
     9 stacks use format 10 (HyperCard 2.x) and Inigo Gets Out uses format 8 (1.x era).
2. "Add that to the slides so we know what we worked with."
   - Slide 5 ("Two unrelated programs"): HyperCard 1987–2004, user-made stacks not the app, formats 2.x (9) + 1.x (1);
     footnote and speaker notes say only user files were analyzed, never the programs.
3. "So basically Legacy Revive just shows the new software, right, because the old ones aren't available anymore? What's the main point of this project, the agents?"
   - Explained: the old programs still run only in emulators; the point is the agent pipeline (bytes -> spec -> clean-room
     reader -> modern app -> verified), and the apps are the proof it works.
4. "So do I have access to the 3 agents whenever I want?"
   - Explained: there are 5; they're prompt files in .claude/agents/, available in any Claude Code session opened in the
     repo (/agents lists them); they run on the user's Claude plan; built outputs need no AI.
5. "I want to share this in my final project submission, how can I?"
   - Gave options (private GitHub repo + slides link, or zip); nothing pushed yet, waiting for the user's choice.
6. "But can I share the 5 agents?"
   - Explained: yes, they're the .claude/agents/*.md files and travel with the repo; anyone with Claude Code who opens the
     repo folder can run them.
7. "Do A, private repo, keep the Claude lines." **[KEY]**
   - Created private GitHub repo https://github.com/sebaasr/legacy-revive and pushed all history (co-author lines kept).
8. "Yes, add the agents section to the README and to the presentation."
   - README: links to the five prompt files + how to run them; slides: agent files on "Five agents" slide,
     repo link on the closing slide.
