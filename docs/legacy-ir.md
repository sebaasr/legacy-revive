# Legacy IR (v1)

The Legacy IR is the target-agnostic JSON format that sits between recovery and modernization. Every
target's reader exports it; the shared web runtime renders it. Adding a new legacy program means writing
a reader that emits this IR and a translator for its script language. The runtime stays the same.

## Top level (`ir.json`)

```json
{
  "ir_version": 1,
  "program": "hypercard",              // target name
  "source": { "file": "Hyper-Wordle.stak", "bytes": 127232 },
  "name": "Hyper-Wordle",
  "size": { "width": 512, "height": 342 },   // screen size in pixels (or cells, see `units`)
  "units": "px",                       // "px" or "cells" (character-grid programs)
  "start_screen": "card-3001",
  "script": { "language": "hypertalk", "text": "on openStack ... end openStack" },  // or null
  "layers": [ Layer ],                 // shared layers reused by many screens (e.g. backgrounds)
  "screens": [ Screen ],               // in the program's own order
  "assets": [ Asset ],
  "notes": [ "anything the reader skipped or could not decode" ]
}
```

## Layer and Screen

A **Layer** is a reusable visual group shared by several screens. A **Screen** is one page/card/board the
user sees. A screen is drawn as: its shared layers (in order), then its own image, then its own objects.

```json
// Layer
{ "id": "bkgnd-2600", "name": "", "image": "assets/bkgnd-2600.png", "objects": [ Object ], "script": Script|null }

// Screen
{
  "id": "card-3001", "name": "Title", "number": 1,
  "layers": ["bkgnd-2600"],
  "image": "assets/card-3001.png",     // or null
  "objects": [ Object ],
  "layer_text": { "bkgnd-2600/field-1": "text this screen shows in a shared-layer field" },
  "script": Script|null,
  "grid": null                          // optional, for "cells" programs: { "cols", "rows", "cells": "assets/board-0.json" }
}
```

## Object

```json
{
  "id": "field-1", "kind": "button" | "field" | "graphic" | "entity",
  "name": "Guess", "number": 1,
  "rect": [left, top, right, bottom],  // in `units`, relative to the screen
  "visible": true,
  "style": { "shape": "rectangle|roundrect|transparent|opaque|shadow|scrolling|...",
             "font": "Geneva", "size": 12, "align": "left|center|right",
             "show_name": true, "highlight": false, "locked": false },
  "text": "contents (fields) or label",
  "icon": "assets/icon-123.png" | null,
  "script": Script|null,
  "extra": { }                          // target-specific fields the runtime may ignore
}
```

## Script and Asset

```json
// Script
{ "language": "hypertalk", "text": "on mouseUp\n  go next card\nend mouseUp" }

// Asset
{ "id": "card-3001", "kind": "image" | "sound" | "data", "file": "assets/card-3001.png", "width": 512, "height": 342 }
```

## Rules
- Ids are unique strings inside one IR file; references use ids, never positions.
- Images are 1-bit or RGBA PNGs at native resolution. Transparent pixels mean "show what is below".
- Anything the reader could not decode is listed in `notes` with where it came from, never dropped silently.
