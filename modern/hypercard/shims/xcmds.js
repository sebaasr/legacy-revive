/* RECONSTRUCTED XCMDs/XFCNs (not recovered from any stack).
 *
 * External commands and functions were 68k code resources in a stack's resource fork (or in Home or
 * HyperCard itself); the Legacy IR does not carry them and they could not run in a browser anyway. The
 * ones below are re-implemented in JavaScript from the way the corpus scripts call them. Their behaviour
 * is inferred, so each one says what it is based on. HyperCard looks for externals after the stack and
 * its libraries, so the engine only uses these when no HyperTalk handler of the same name exists.
 *
 * Each entry is fn(E, $, ...args): E = HyperCardEngine, $ = the calling handler's context.
 * Add your own here; build_stack.py copies this file into every app whose scripts call one of them.
 */
(window.HC_XCMDS = window.HC_XCMDS || {});
Object.assign(window.HC_XCMDS, {
  /** piece(list, delimiter, n): the n-th piece of a delimited list.
   *  Patients: `put piece(HOProblemList,";",it) into MEDICINE` after `get PopMenu(the clickLoc,HOProblemList)`,
   *  where HOProblemList is built as lines joined with ";" (closeField of "MEDICATION LIST"). */
  piece(E, $, list, delim, n) {
    const d = String(delim == null || delim === '' ? ',' : delim);
    const parts = String(list == null ? '' : list).split(d);
    const i = Math.trunc(Number(n));
    return i >= 1 && i <= parts.length ? parts[i - 1] : '';
  },

  /** sortLines(text): the lines sorted alphabetically (case-insensitive), empty lines dropped.
   *  Patients: `put sortLines(CD field "MEDICATION LIST") into CD field "MEDICATION LIST"` keeps its pick lists sorted. */
  sortLines(E, $, text) {
    const lines = String(text == null ? '' : text).split('\n').filter(l => l.trim() !== '');
    lines.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return lines.join('\n');
  },

  /** mouseToLine(): number of the line under the last click in the target field.
   *  Patients: card "PATIENT LIST", locked field "PATIENTS": `put mouseToLine() into LINENUM; select line LINENUM of target`. */
  mouseToLine(E, $) {
    const id = E.objects.has($.target) ? $.target : null;
    let line = E.click && E.click.line;
    if (id && E.renderer && E.renderer.chunkAt) line = E.renderer.chunkAt(id, E.mouse.clickX, E.mouse.clickY).line || line;
    const m = /^line (\d+)/.exec(String(line || ''));
    return m ? Number(m[1]) : 0;
  },

  /** PopMenu(point, list): pop-up menu at `point` with the ";"-separated items of `list` ("(-" is a divider,
   *  as in Mac menu strings); returns the chosen item number, 0 when dismissed.
   *  Patients: buttons "MEDICATION LIST" / "PROBLEM LIST" (mouseDown): `if it > 0 then ... piece(list,";",it)`. */
  async PopMenu(E, $, point, list) {
    const [x, y] = String(point || '').split(',').map(Number);
    return E.popupMenu(x || 0, y || 0, String(list == null ? '' : list).split(';'), 0);
  },

  /** popUp(checkedItem, list): pop-up menu with the ","-separated items of `list`, item `checkedItem` checked,
   *  at the target; returns the chosen item's text (empty when dismissed).
   *  Patients: field "SEX" (mouseDown): `get popUp(CHOICE,"Male,Female,Unknown"); put item 1 of it into me`. */
  async popUp(E, $, checked, list) {
    const items = String(list == null ? '' : list).split(',');
    let x = E.mouse.clickX, y = E.mouse.clickY;
    const st = E.state.get($.target);
    if (st) { x = st.rect[0]; y = st.rect[3]; }
    const n = await E.popupMenu(x, y, items, Math.trunc(Number(checked)) || 0);
    return n ? items[n - 1] : '';
  },

  /** PRINTENGOOD: prints the patient card (the button is called "Print"). Uses the browser's print dialog. */
  PRINTENGOOD(E, $) {
    if (!E.fast && typeof window.print === 'function') window.print();
    return '';
  },
});
