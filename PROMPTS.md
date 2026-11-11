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
