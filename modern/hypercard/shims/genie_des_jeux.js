/* COMPATIBILITY SHIM (not recovered from any stack): library stack "genie des jeux".
 *
 * The Game Genie Encoder/Decoder stack runs `start using stack "genie des jeux"` in openStack and then
 * calls bin2dec() and bin() from it. That library stack is not in the corpus, so these two functions are
 * re-implemented here from the way the scripts use them:
 *   bin2dec(s)  binary string -> decimal number   ("1000" -> 8; "0" and "1" only, other chars ignored)
 *   bin(n)      decimal number -> binary string, at least 16 characters, zero-padded ("8" -> "0000000000001000")
 * 16 bits is what the scripts index (`char c+8 of data`, `char c+1 of address`), and it reproduces every
 * value saved in the stack (checked against eval/hypercard/gamegenie_sim.py).
 *
 * The engine puts a library on the message path after the stack (HyperCard's `start using` order) when a
 * script runs `start using stack "<name>"` and a shim with that name is registered.
 */
(window.HC_SHIMS = window.HC_SHIMS || {})['genie des jeux'] = {
  kind: 'library',
  about: 'compatibility shim for the missing library stack "genie des jeux" (bin2dec, bin)',
  functions: {
    bin2dec(s) {
      let v = 0;
      for (const ch of String(s == null ? '' : s).trim()) {
        if (ch === '0' || ch === '1') v = v * 2 + (ch === '1' ? 1 : 0);
      }
      return v;
    },
    bin(n) {
      const v = Math.max(0, Math.trunc(Number(String(n == null ? '' : n).trim()) || 0));
      return v.toString(2).padStart(16, '0');
    },
  },
};
