# 07 Program text attached to records (the scripting language)

Probes: `p05_code.py` (line classes, command words), `p06_tokens.py` (token vocabulary),
`dump_world.py` (full listings). Corpus: 5,227 programs, ~36,000 lines.

## Storage (**confirmed**)
- CP437 text, lines terminated by CR (0x0D); every program ends with CR; no LF.
- Owned by type-36 objects (5,206) and type-10 records (20, plain prose only).
- Case-insensitive in practice: `#end`, `#END`, `#End` all appear; trailing spaces occur (`#die    `).

## Line types (classified by first character; counts over the corpus)
| First char | Count | Meaning (inferred from use) | Example |
|---|---|---|---|
| `@` | 3,372 | object name; only ever on the **first** line (3,355 programs start with it) | `@Mailbox` |
| `#` | 15,927 | command | `#give gems 50` |
| `:` | 3,609 | label (entry point for a message) | `:touch` |
| `'` | 14 | comment (no zapped labels in these saved files) | `'rose controls petunia` |
| `/` | 2,293 | movement: one step per `/dir`, can chain | `/i/i/i`, `/e/e/n` |
| `?` | 677 | movement that is tried/skipped if blocked (contrast with `/`) | `?e?e?e?s?w` |
| `!` | 545 | menu choice `!label;text` (545/545 contain `;`) | `!op;The operator.` |
| `$` | 405 | centered/highlighted text line | `$Hello Mr. Roberts.` |
| other | ~3,600 | plain text shown to the player as a message | `In your mailbox you find nothing.` |
| empty | 6,107 | blank line of message text | |

Movement tokens seen: `n s e w i` (i = idle/wait, 3,891 uses), `seek` (toward player), `cw`.
Direction words in commands: `n s e w north south east west idle seek opp cw rndns rndp flow`; modifiers
combine: `#go opp seek`, `#go cw rndns`, `#go rndp north`.

## Commands (`#word`), by frequency
`end 3828, bind 2350, char 1871, play 1557, send 1058, die 667, cycle 642, restart 519, zap 423,
put 351, if 311, take 273, give 267, change 267, lock 242, become 202, walk 175, endgame 161,
shoot 149, unlock 134, restore 104, set 101, go 96, clear 64, throwstar 35, block/try/spin 4-8`.

| Command | Syntax seen | Inferred meaning |
|---|---|---|
| `#end` | `#end` | stop running (ip = -1 in 188 saved records whose program reached it) |
| `#restart` | | jump to start of program |
| `#send` | `#send label`, `#send target:label` | jump to a label in self or in a named object |
| `#target:label` | `#door:open`, `#all:stop`, `#x1:gone` | shorthand send; target = an `@name` on the same board (checked p06) or `all` |
| `#zap` / `#restore` | `#zap talk` | disable / re-enable the first matching label (Manager: three `:talk` labels, each followed by `#zap talk` -> successive replies) |
| `#bind` | `#bind desk` | share another named object's program |
| `#char` | `#char 179` | set glyph (character code, same meaning as p1) |
| `#cycle` | `#cycle 1` | set update speed (matches record field +6) |
| `#walk` | `#walk s`, `#walk idle` | set continuous movement direction |
| `#go` / `#try` | `#go seek`, `#try e next` | move once; `#try` gives a fallback label if blocked |
| `#shoot` / `#throwstar` | `#shoot seek` | fire a projectile in a direction |
| `#put` | `#put n red normal`, `#put w empty` | place an element next to self |
| `#change` | `#change red passage empty` | replace all elements of one kind with another |
| `#become` | `#become red breakable` | turn self into an element |
| `#give` / `#take` | `#give gems 50`, `#take gems 100 toopoor` | counters `health score gems ammo torches energy` (`#take` jumps to label if insufficient) |
| `#set` / `#clear` | `#set rose` | world flags (cf. 10 flag slots in header) |
| `#if` | `#if dayone then x1`, `#if not shovel then ..`, `#if blocked e then ..`, `#if contact then shoot`, `#if alligned then` | condition = flag name, `not X`, `blocked dir`, `contact`, `alligned`; `then` + label or command |
| `#play` | `#play T-DEGACBEFD`, `#play SFxCxCxF#xCx` | music string: notes A-G, `#` sharp, `-`/`+` octave?, `T S` etc. duration letters, `x` rest?, digits = drum sounds? |
| `#lock` / `#unlock` | | ignore messages while locked |
| `#die`, `#endgame` | | remove self; end the game |

Element/color words used by `#put/#change/#become`: colors `red green yellow cyan blue purple white`;
elements `empty solid normal breakable fake invisible boulder gem key pusher passage` (p06).

## Example (CRIMRING board 1, object at (30,3), glyph p1=1)
```
@Manager
#end
:talk
Hi Jason!

$Hello Mr. Roberts.
...
#zap talk
#end
:talk
Please, I have a lot of work to do...
#zap talk
#end
:talk
#play T-DEGACBEFD
Go away!
#end
```
Most common labels: `touch` 1113, `shot` 309, `loop` 147, `do` 122, `go` 120, `thud` 89, `tooweak` 87,
`boom` 68. `touch`, `shot` and `thud` are used across all authors; `shot`/`thud` are never sent by any script and
`touch` only 35 times as `#send other:touch` (vs 1,113 labels), so they are **probably** labels the engine itself jumps to (player touches the object,
object is shot, object's movement is blocked). The others are author-defined.
