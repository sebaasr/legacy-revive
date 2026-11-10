"""dump_world.py <file.ZZT> [--grid] [--raw]

Prints the full recovered structure of a world file: header, every board (offset, size, name, RLE stats,
properties, exits), and every status record with its program text.
  --grid  also print each board's 60x25 element-type grid (2 hex digits per cell)
  --raw   also print the raw unknown fields of every record
Exit code 1 if any structural check fails (board chain, record end, header count).
"""
import os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib

# best-guess element names (see notes/06-elements.md for evidence and confidence)
ELEMENT_GUESS = {
    0: 'empty', 4: 'player', 5: 'item?(fixed color 03)', 6: 'item?(fixed color 06)', 7: 'collectible?',
    8: 'key?', 9: 'door?', 10: 'scroll (text record)', 11: 'passage (p3=target board)',
    12: 'moving thing (stepper)?', 13: 'timed thing (cycle 6)?', 14: '?', 16: 'conveyor/spinner?', 17: 'conveyor/spinner?',
    19: 'water?', 20: 'forest?/dense fill', 21: 'solid wall', 22: 'normal wall', 23: 'breakable wall?',
    24: 'wall-like?', 25: '?', 26: '?', 27: 'wall-like (fake?)', 28: 'wall-like?',
    29: 'creature/projectile?', 30: 'projectile/mover?', 31: 'line wall', 32: '?',
    34: 'creature?', 35: 'creature?', 36: 'object (scripted)', 37: 'creature?', 38: 'creature?',
    39: 'creature?', 40: 'pusher?', 41: 'creature?', 42: 'creature?', 44: 'creature?', 45: 'creature?',
    47: 'text on blue', 48: 'text on green', 49: 'text on cyan', 50: 'text on red',
    51: 'text on purple', 52: 'text on brown', 53: 'text on black (white)',
}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__); sys.exit(1)
    path = args[0]
    show_grid = '--grid' in sys.argv; raw = '--raw' in sys.argv
    d, h, bs, end = zztlib.load(path)
    ok = True
    print(f'FILE {path}  ({len(d)} bytes)')
    print('== WORLD HEADER (512 bytes)')
    print(f"  magic            : {h['magic']} (ff ff)")
    print(f"  board count      : {h['board_count']}  (stored {h['board_count'] - 1})")
    print(f"  world name       : {h['name']!r}")
    print(f"  current board    : {h['current_board']}")
    print(f"  counter @0x0f    : {h['unk_0f_health?']}  (probably health)")
    print(f"  other counters   : 04={h['unk_04']} 06={h['unk_06']} 13={h['unk_13']} 15={h['unk_15']} 17={h['unk_17']} 19={h['unk_19']} 1b={h['unk_1b']}")
    print(f"  bytes 08..0e     : {h['unk_08_0e']}  (7 bytes; probably one per key color)")
    print(f"  flags (10 slots) : {[f for f in h['flags']]}")
    print(f"  bytes 104..108   : {h['unk_104_108']}")
    for b in bs:
        p = b['props']
        cnt = collections.Counter(t for t, c in b['cells'])
        print()
        print(f"== BOARD {b['index']}  @0x{b['offset']:x}  size {b['size']}  name {b['name']!r}")
        print(f"  grid: {b['rle_bytes'] // 3} RLE runs ({b['rle_bytes']} bytes) -> 1500 cells")
        print('  element counts: ' + ', '.join(f'{t}:{n}' for t, n in sorted(cnt.items())))
        ex = p['exits']
        print(f"  exits: north={ex['north']} south={ex['south']} west={ex['west']} east={ex['east']}  (0 = none)")
        print(f"  byte0={p['unk_00_max_shots?']} (max shots?)  dark={p['dark?']}  byte6={p['unk_06_reenter?']}  "
              f"time?={p['unk_68_time?']}  enter_xy?={p['unk_66_67_enter_xy?']}  message={p['message']!r}")
        if raw: print(f"  props 70..85: {p['unk_70_85']}")
        if show_grid:
            for y in range(25):
                print('   ' + ''.join(f'{b["cells"][y * 60 + x][0]:02x}' for x in range(60)))
        print(f"  status records: {len(b['stats'])} (stored count {b['stat_count_field']})")
        for i, s in enumerate(b['stats']):
            t, c = b['cells'][(s['y'] - 1) * 60 + s['x'] - 1]
            name = ELEMENT_GUESS.get(t, '?')
            line = (f"   #{i:<3} ({s['x']:2},{s['y']:2}) cell type {t:2} [{name}] color {c:02x}  cycle {s['cycle']} "
                    f"p1 {s['p1']} p2 {s['p2']} p3 {s['p3']} step ({s['step_x']},{s['step_y']}) "
                    f"follower {s['follower']} leader {s['leader']} under ({s['under_type']},{s['under_color']:02x}) "
                    f"ip {s['ip']} code_len {s['code_len']}")
            print(line)
            if raw: print(f"        ptr {s['unk_17_20_ptr']}  bytes25..32 {s['unk_25_32']}")
            if s['code']:
                for ln in s['code'].split('\r')[:-1] if s['code'].endswith('\r') else s['code'].split('\r'):
                    print('        | ' + ln)
        if b['parsed_end'] != b['end']:
            ok = False; print(f"  !! records end at 0x{b['parsed_end']:x}, board ends at 0x{b['end']:x}")
    print()
    print(f"END: parsed to 0x{end:x} of 0x{len(d):x}  {'OK' if end == len(d) and ok and len(bs) == h['board_count'] else 'MISMATCH'}")
    if not (end == len(d) and ok): sys.exit(1)


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    main()
