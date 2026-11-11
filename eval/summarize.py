"""Merge the verifier's measurements into eval/<target>/results.json and eval/SUMMARY.md tables.

Inputs (all produced by earlier verifier runs, nothing is re-run here):
  eval/<target>/visual.json            eval/visual.py
  eval/<target>/behave/<sample>.json   node eval/behave.mjs <target>
  eval/spec_checks.json                spec accuracy results (reader tests, picture check, GAPS counts)
  output/<target>/<sample>/app/stats.json + scripts.js   maintainability

Usage: python eval/summarize.py   (writes both results.json files and prints the SUMMARY tables)
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def function_sizes(js: str):
    """(name, lines) for every generated handler function in scripts.js (brace matching per line)."""
    lines = js.splitlines()
    out = []
    i = 0
    pat = re.compile(r'async function (\w+)\s*\(')
    while i < len(lines):
        m = pat.search(lines[i])
        if not m:
            i += 1
            continue
        depth, j, started = 0, i, False
        while j < len(lines):
            s = re.sub(r'"(?:\\.|[^"\\])*"', '""', lines[j])
            if not s.lstrip().startswith('//'):
                depth += s.count('{') - s.count('}')
                started = started or '{' in s
            if started and depth <= 0:
                break
            j += 1
        out.append((m.group(1), j - i + 1, i + 1))
        i += 1
    return out


def maintainability(target: str, sample: str) -> dict:
    app = ROOT / 'output' / target / sample / 'app'
    st = json.loads((app / 'stats.json').read_text(encoding='utf-8'))
    js = (app / 'scripts.js').read_text(encoding='utf-8')
    sizes = function_sizes(js)
    biggest = max(sizes, key=lambda t: t[1]) if sizes else ('-', 0, 0)
    comment_lines = sum(1 for ln in js.splitlines() if ln.strip().startswith('//'))
    stubs = st.get('lines_stubbed', 0)
    return {
        'handlers': st.get('handlers'),
        'lines': st.get('lines'),
        'lines_translated': st.get('lines_translated'),
        'lines_stubbed': stubs,
        'translated_pct': round(100 * st['lines_translated'] / st['lines'], 1) if st.get('lines') else None,
        'stubs_by_command': st.get('stubs_by_command', {}),
        'undefined_handlers': st.get('undefined_handlers', []),
        'unavailable_icons': len(st.get('unavailable_icons', [])),
        'generated_functions': len(sizes),
        'largest_function': {'name': biggest[0], 'lines': biggest[1], 'at': f'scripts.js:{biggest[2]}'},
        'scripts_js_lines': js.count('\n') + 1,
        'comment_lines': comment_lines,
        'original_kept_as_comments': comment_lines >= (st.get('lines') or 0),
    }


def main():
    spec = json.loads((ROOT / 'eval' / 'spec_checks.json').read_text(encoding='utf-8'))
    for target in ('hypercard', 'zzt'):
        vis = json.loads((ROOT / 'eval' / target / 'visual.json').read_text(encoding='utf-8'))
        samples = sorted(p.name for p in (ROOT / 'output' / target).iterdir() if (p / 'app' / 'index.html').exists())
        per = {}
        for s in samples:
            bf = ROOT / 'eval' / target / 'behave' / f'{s}.json'
            b = json.loads(bf.read_text(encoding='utf-8')) if bf.exists() else None
            v = vis.get(s, {})
            visual = None
            if v.get('ink_f1') is not None:
                visual = {k: v[k] for k in ('ink_f1', 'precision', 'recall', 'pixel_agreement', 'color_match')}
                visual['render_options'] = v.get('render_options')
                if 'without_menubar' in v:
                    visual['without_menubar'] = {k: v['without_menubar'][k] for k in ('ink_f1', 'precision', 'recall', 'color_match')}
                visual['side_by_side'] = f'eval/{target}/{s}/side.png'
            m = maintainability(target, s)
            scen = b['scenarios'] if b else []
            per[s] = {
                'visual': visual,
                'behavioral': {
                    'pass': sum(1 for x in scen if x['pass']), 'total': len(scen),
                    'failed': [x['name'] for x in scen if not x['pass']],
                },
                'smoke': None if not b or not b.get('smoke') else {
                    'pass': b['smoke']['pass'], 'errors': b['smoke']['errors'][:5],
                    **({'buttons_clicked': b['smoke']['buttons']} if target == 'hypercard' else {'boards_seen': b['smoke']['boardsSeen']}),
                    'runtime_stubs_hit': b['smoke'].get('runtimeStubs', []),
                },
                'errors': sorted({e for x in scen for e in x['errors']} | set((b or {}).get('smoke', {}).get('errors', []) if b else []))[:10],
                'stubs': {'lines_stubbed': m['lines_stubbed'], 'by_command': m['stubs_by_command'], 'undefined_handlers': m['undefined_handlers']},
                'maintainability': m,
            }
        withv = [p['visual'] for p in per.values() if p['visual']]
        head = 'color_match' if target == 'zzt' else 'ink_f1'
        tot_b = sum(p['behavioral']['total'] for p in per.values())
        pass_b = sum(p['behavioral']['pass'] for p in per.values())
        out = {
            'target': target,
            'headline_visual_metric': head,
            'notes': ([
                'ZZT: ink_f1 is weak on dark colour images; color_match is the headline. Glyph shapes were harvested from these same reference screenshots, so the ZZT visual scores are an upper bound.',
            ] if target == 'zzt' else [
                'Oblique Strategies reference includes the menu bar (top 20 px); see visual.without_menubar.',
                'Small cards rendered on a 512x342 desktop at the measured window offsets (render_options).',
            ]),
            'totals': {
                'samples': len(per),
                'with_reference': len(withv),
                'visual_mean_' + head: round(sum(v[head] for v in withv) / len(withv), 4),
                'visual_mean_ink_f1': round(sum(v['ink_f1'] for v in withv) / len(withv), 4),
                'behavioral_pass': pass_b, 'behavioral_total': tot_b,
                'smoke_pass': sum(1 for p in per.values() if p['smoke'] and p['smoke']['pass']),
                'lines': sum(p['maintainability']['lines'] for p in per.values()),
                'lines_translated': sum(p['maintainability']['lines_translated'] for p in per.values()),
                'lines_stubbed': sum(p['maintainability']['lines_stubbed'] for p in per.values()),
                'handlers': sum(p['maintainability']['handlers'] for p in per.values()),
            },
            'spec_accuracy': spec[target],
            'samples': per,
        }
        (ROOT / 'eval' / target / 'results.json').write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f'## {target}')
        print(f"| sample | visual {head} | ink_f1 | behavioral | smoke | errors | lines tr./stub | handlers | largest fn |")
        for s, p in per.items():
            v = p['visual']
            vh = f"{v[head]:.4f}" if v else 'n/a'
            vi = f"{v['ink_f1']:.4f}" if v else 'n/a'
            m = p['maintainability']
            sm = 'pass' if p['smoke'] and p['smoke']['pass'] else 'FAIL'
            print(f"| {s} | {vh} | {vi} | {p['behavioral']['pass']}/{p['behavioral']['total']} | {sm} | {len(p['errors'])} | "
                  f"{m['lines_translated']}/{m['lines_stubbed']} | {m['handlers']} | {m['largest_function']['lines']} ({m['largest_function']['name']}) |")
        print(json.dumps(out['totals']))


if __name__ == '__main__':
    main()
