// HyperTalk scripts of FLC 1.1 (FLC 1.1.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // on openStack
  H.on(owner, "openStack", async function openStack($) {
    // global SYL, NUM
    /* shared: H.g.syl, H.g.num */
    // hide menuBar
    H.hideBar("menubar");
  });
  // end openStack
  // on arrowKey
  H.on(owner, "arrowKey", async function arrowKey($) {
    // go this card
    await H.go($, {rel: "this"});
  });
  // end arrowKey
  // on closeStack
  H.on(owner, "closeStack", async function closeStack($) {
    // doMenu "Compact Stack"
    await H.doMenu($, "Compact Stack");
    // show menuBar
    H.showBar("menubar");
  });
  // end closeStack
}

// ---- script 1: bkgnd-3624/button-13 "Sort/Export"
function script1(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // answer "Do you wish to Sort your Lexicon, Export it, or Both?" with "Both" or "Export" or "Sort"
    it = await H.answer("Do you wish to Sort your Lexicon, Export it, or Both?", ["Both", "Export", "Sort"]);
    // if it is "Both" then
    if (H.eq(it, "Both")) {
      // do sortLex
      await H.call($, "sortLex", []);
      // do exportLex
      await H.call($, "exportLex", []);
    // else if it is "Export" then
    } else if (H.eq(it, "Export")) {
      // do exportLex
      await H.call($, "exportLex", []);
    // else if it is "Sort" then
    } else if (H.eq(it, "Sort")) {
      // do sortLex
      await H.call($, "sortLex", []);
    // end if
    }
  });
  // end mouseUp
  // on sortLex
  H.on(owner, "sortLex", async function sortLex($) {
    let it = "";
    // answer "Do you want to sort the words ascending or descending?" with "Descending" or "Ascending"
    it = await H.answer("Do you want to sort the words ascending or descending?", ["Descending", "Ascending"]);
    // if it is "Ascending" then
    if (H.eq(it, "Ascending")) {
      // sort lines of cd fld Lexicon ascending
      H.putInto(H.part($, "card", "field", "Lexicon"), H.sort(H.value(H.part($, "card", "field", "Lexicon")), "line", "ascending", "text"), "into");
    // else if it is "Descending" then
    } else if (H.eq(it, "Descending")) {
      // sort lines of cd fld Lexicon descending
      H.putInto(H.part($, "card", "field", "Lexicon"), H.sort(H.value(H.part($, "card", "field", "Lexicon")), "line", "descending", "text"), "into");
    // end if
    }
  });
  // end sortLex
  // on exportLex
  H.on(owner, "exportLex", async function exportLex($) {
    let fileName = "", it = "";
    // put "Trade Talk Lexicon" into fileName
    fileName = "Trade Talk Lexicon";
    // ask "Export lexicon to what file (specify path) ?" with fileName
    it = await H.ask("Export lexicon to what file (specify path) ?", fileName);
    // if it is empty then exit exportLex
    if (H.eq(it, "")) {
      return;
    }
    // put it into fileName
    fileName = it;
    // open file fileName
    H.unsupported("open file", "open file fileName");
    // write card field Lexicon to file fileName
    H.unsupported("write", "write card field Lexicon to file fileName");
    // close file fileName
    H.unsupported("close file", "close file fileName");
  });
  // end exportLex
}

// ---- script 2: bkgnd-3624/button-14 "Print"
function script2(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // answer "Do you want to print out the Lexicon or the Glossary?" with "Cancel" or "Lexicon" or "Glossary"
    it = await H.answer("Do you want to print out the Lexicon or the Glossary?", ["Cancel", "Lexicon", "Glossary"]);
    // if it is "Lexicon" then
    if (H.eq(it, "Lexicon")) {
      // open printing
      H.unsupported("open printing", "open printing");
      // print cd fld Lexicon
      H.unsupported("print", "print cd fld Lexicon");
      // close printing
      H.unsupported("close printing", "close printing");
    // else if it is "Glossary" then
    } else if (H.eq(it, "Glossary")) {
      // open printing
      H.unsupported("open printing", "open printing");
      // print cd fld Lexicon
      H.unsupported("print", "print cd fld Lexicon");
      // close printing
      H.unsupported("close printing", "close printing");
    // else if it is "Cancel" then
    } else if (H.eq(it, "Cancel")) {
      // exit mouseUp
      return;
    // end if
    }
  });
  // end mouseUp
}

// ---- script 3: bkgnd-3624/button-15 "Save Word"
function script3(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // show cd fld Lexicon
    H.show(H.part($, "card", "field", "Lexicon"));
    // hide cd fld Glossary
    H.hide(H.part($, "card", "field", "Glossary"));
    // hide cd fld Pronounce
    H.hide(H.part($, "card", "field", "Pronounce"));
    // set hilite of cd button Lexicon to true
    H.setProp(H.part($, "card", "button", "Lexicon"), "hilite", true);
    // set hilite of cd btn "Batch List" to false
    H.setProp(H.part($, "card", "button", "Batch List"), "hilite", false);
    // if cd fld Batch is empty then
    if (H.eq(H.value(H.part($, "card", "field", "Batch")), "")) {
      // do noBatch
      await H.call($, "noBatch", []);
    // else if cd fld Batch is not empty then
    } else if (!H.eq(H.value(H.part($, "card", "field", "Batch")), "")) {
      // answer "Do you want to save your batch words?" with "Yes" or "No"
      it = await H.answer("Do you want to save your batch words?", ["Yes", "No"]);
      // if it is "Yes" then
      if (H.eq(it, "Yes")) {
        // do yesBatch
        await H.call($, "yesBatch", []);
      // else if it is "No" then
      } else if (H.eq(it, "No")) {
        // do noBatch
        await H.call($, "noBatch", []);
      // end if
      }
    // end if
    }
    // hide cd fld Batch
    H.hide(H.part($, "card", "field", "Batch"));
  });
  // end mouseUp
  // on noBatch
  H.on(owner, "noBatch", async function noBatch($) {
    let it = "", LIN = "";
    // answer "Should I delete the current batch list?" with "No" or "Yes"
    it = await H.answer("Should I delete the current batch list?", ["No", "Yes"]);
    // if it is "Yes" then
    if (H.eq(it, "Yes")) {
      // put empty into cd fld Batch
      H.putInto(H.part($, "card", "field", "Batch"), "", "into");
    // else if it is "No" then
    } else if (H.eq(it, "No")) {
    // end if
    }
    // put 1 into LIN
    LIN = 1;
    // if line LIN of cd fld Lexicon is empty then
    if (H.eq(H.chunk(H.value(H.part($, "card", "field", "Lexicon")), [["line", LIN]]), "")) {
      // put line 1 of card field Word into line LIN of card field Lexicon
      H.putInto(H.part($, "card", "field", "Lexicon"), H.chunk(H.value(H.part($, "card", "field", "Word")), [["line", 1]]), "into", [["line", LIN]]);
    // else repeat until line LIN of card field Lexicon is empty
    } else {
      while (!(H.eq(H.chunk(H.value(H.part($, "card", "field", "Lexicon")), [["line", LIN]]), ""))) {
        await H.tick();
        // add 1 to LIN
        LIN = H.num(LIN) + 1;
      // end repeat
      }
    }
    // put line 1 of card field Word into line LIN of card field Lexicon
    H.putInto(H.part($, "card", "field", "Lexicon"), H.chunk(H.value(H.part($, "card", "field", "Word")), [["line", 1]]), "into", [["line", LIN]]);
  });
  // end noBatch
  // on yesBatch
  H.on(owner, "yesBatch", async function yesBatch($) {
    let LIN = "";
    // put 1 into LIN
    LIN = 1;
    // if line LIN of cd fld Lexicon is empty then
    if (H.eq(H.chunk(H.value(H.part($, "card", "field", "Lexicon")), [["line", LIN]]), "")) {
      // put cd fld Batch into line LIN of card field Lexicon
      H.putInto(H.part($, "card", "field", "Lexicon"), H.value(H.part($, "card", "field", "Batch")), "into", [["line", LIN]]);
    // else if line LIN of cd fld Lexicon is not empty then
    } else if (!H.eq(H.chunk(H.value(H.part($, "card", "field", "Lexicon")), [["line", LIN]]), "")) {
      // repeat until line LIN of card field Lexicon is empty
      while (!(H.eq(H.chunk(H.value(H.part($, "card", "field", "Lexicon")), [["line", LIN]]), ""))) {
        await H.tick();
        // add 1 to LIN
        LIN = H.num(LIN) + 1;
      // end repeat
      }
      // put cd fld Batch into line LIN of card field Lexicon
      H.putInto(H.part($, "card", "field", "Lexicon"), H.value(H.part($, "card", "field", "Batch")), "into", [["line", LIN]]);
    // end if
    }
  });
  // end yesBatch
}

// ---- script 4: card-4138/button-13 "Begin"
function script4(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect stretch from bottom fast
    H.visual("stretch from bottom fast");
    // go cd "Trade"
    await H.go($, {key: "Trade"});
  });
  // end mouseUp
}

// ---- script 5: card-4138/button-14 "About"
function script5(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect stretch from top fast
    H.visual("stretch from top fast");
    // go cd "About"
    await H.go($, {key: "About"});
  });
  // end mouseUp
}

// ---- script 6: card-4138/button-15 "Home"
function script6(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // answer "Are you sure you want to go home" with "Yes" or "No"
    it = await H.answer("Are you sure you want to go home", ["Yes", "No"]);
    // if it is "Yes" then
    if (H.eq(it, "Yes")) {
      // go Home
      await H.goHome($);
    // else if it is "No" then
    } else if (H.eq(it, "No")) {
      // exit mouseUp
      return;
    // end if
    }
  });
  // end mouseUp
}

// ---- script 7: card-4138/button-16 "Quit"
function script7(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // answer "Are you sure you want to quit" with "Yes" or "No"
    it = await H.answer("Are you sure you want to quit", ["Yes", "No"]);
    // if it is "Yes" then
    if (H.eq(it, "Yes")) {
      // doMenu "Quit HyperCard"
      await H.doMenu($, "Quit HyperCard");
    // else if it is "No" then
    } else if (H.eq(it, "No")) {
      // exit mouseUp
      return;
    // end if
    }
  });
  // end mouseUp
}

// ---- script 8: card card-2221 "Trade"
function script8(owner) {
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    // global wordLoc, SYL, SF, BTC
    /* shared: H.g.wordloc, H.g.syl, H.g.sf, H.g.btc */
    // global LNG, SPL
    /* shared: H.g.lng, H.g.spl */
    // put empty into cd fld Word
    H.putInto(H.part($, "card", "field", "Word"), "", "into");
    // put empty into cd fld Sylab
    H.putInto(H.part($, "card", "field", "Sylab"), "", "into");
    // put empty into cd fld NumS
    H.putInto(H.part($, "card", "field", "NumS"), "", "into");
    // hide cd fld "Pronounce"
    H.hide(H.part($, "card", "field", "Pronounce"));
    // hide cd fld "Glossary"
    H.hide(H.part($, "card", "field", "Glossary"));
    // show cd fld "Lexicon"
    H.show(H.part($, "card", "field", "Lexicon"));
    // pass openCard
    return H.PASS;
  });
  // end openCard
  // on makeWord
  H.on(owner, "makeWord", async function makeWord($) {
    let NUM = "", LOC = "";
    // global wordLoc, SYL, SPL
    /* shared: H.g.wordloc, H.g.syl, H.g.spl */
    // put empty into cd fld Sylab
    H.putInto(H.part($, "card", "field", "Sylab"), "", "into");
    // put empty into cd fld Word
    H.putInto(H.part($, "card", "field", "Word"), "", "into");
    // put empty into SYL
    H.g.syl = "";
    // if hilite of card button "Longer Words" is not true then
    if (!H.eq(H.prop(H.part($, "card", "button", "Longer Words"), "hilite"), true)) {
      // put the random of 4 into SPL
      H.g.spl = H.f.random(4);
      // if SPL <= 3 then
      if (H.le(H.g.spl, 3)) {
        // put the random of 3 into NUM
        NUM = H.f.random(3);
      // else if SPL = 4 then
      } else if (H.eq(H.g.spl, 4)) {
        // put the random of 2 + 2 into NUM
        NUM = H.f.random(2) + 2;
      // end if
      }
    // else if hilite of card button "Longer Words" is true then
    } else if (H.eq(H.prop(H.part($, "card", "button", "Longer Words"), "hilite"), true)) {
      // put the random of 4 + 2 into NUM
      NUM = H.f.random(4) + 2;
    // end if
    }
    // put NUM into cd fld NumS
    H.putInto(H.part($, "card", "field", "NumS"), NUM, "into");
    // put 1 into LOC
    LOC = 1;
    // put 1 into wordLoc
    H.g.wordloc = 1;
    // repeat for NUM
    for (let n1 = H.num(NUM); n1 > 0; n1--) {
      await H.tick();
      // if SYL is CVC then do sylCvc
      if (H.eq(H.g.syl, "CVC")) {
        await H.call($, "sylCvc", []);
      }
      // if SYL is CV then do sylCv
      if (H.eq(H.g.syl, "CV")) {
        await H.call($, "sylCv", []);
      }
      // if SYL is VC then do sylVc
      if (H.eq(H.g.syl, "VC")) {
        await H.call($, "sylVc", []);
      }
      // if SYL is V then do sylV
      if (H.eq(H.g.syl, "V")) {
        await H.call($, "sylV", []);
      // else do basicSyl
      } else {
        await H.call($, "basicSyl", []);
      }
      // repeat until word LOC of cd fld Sylab is empty
      while (!(H.eq(H.chunk(H.value(H.part($, "card", "field", "Sylab")), [["word", LOC]]), ""))) {
        await H.tick();
        // add 1 to LOC
        LOC = H.num(LOC) + 1;
      // end repeat
      }
      // if SYL is V then put V into word LOC of cd fld Sylab
      if (H.eq(H.g.syl, "V")) {
        H.putInto(H.part($, "card", "field", "Sylab"), "V", "into", [["word", LOC]]);
      // else if SYL is VC then put VC into word LOC of cd fld Sylab
      } else if (H.eq(H.g.syl, "VC")) {
        H.putInto(H.part($, "card", "field", "Sylab"), "VC", "into", [["word", LOC]]);
      // else if SYL is CV then put CV into word LOC of cd fld Sylab
      } else if (H.eq(H.g.syl, "CV")) {
        H.putInto(H.part($, "card", "field", "Sylab"), "CV", "into", [["word", LOC]]);
      // else if SYL is CVC then put CVC into word LOC of cd fld Sylab
      } else if (H.eq(H.g.syl, "CVC")) {
        H.putInto(H.part($, "card", "field", "Sylab"), "CVC", "into", [["word", LOC]]);
      }
      // if SYL is V then
      if (H.eq(H.g.syl, "V")) {
        // do Vowel
        await H.call($, "Vowel", []);
      // end if
      }
      // if SYL is VC then
      if (H.eq(H.g.syl, "VC")) {
        // do Vowel
        await H.call($, "Vowel", []);
        // do FinCon
        await H.call($, "FinCon", []);
      // end if
      }
      // if SYL is CV then
      if (H.eq(H.g.syl, "CV")) {
        // do IniCon
        await H.call($, "IniCon", []);
        // do Vowel
        await H.call($, "Vowel", []);
      // end if
      }
      // if SYL is CVC then
      if (H.eq(H.g.syl, "CVC")) {
        // do IniCon
        await H.call($, "IniCon", []);
        // do Vowel
        await H.call($, "Vowel", []);
        // do FinCon
        await H.call($, "FinCon", []);
      // end if
      }
    // end repeat
    }
  });
  // end makeWord
  // on basicSyl
  H.on(owner, "basicSyl", async function basicSyl($) {
    // global SYL, SF
    /* shared: H.g.syl, H.g.sf */
    // put the random of 20 into SF
    H.g.sf = H.f.random(20);
    // if SF <= 12 then put CVC into SYL
    if (H.le(H.g.sf, 12)) {
      H.g.syl = "CVC";
    // else if SF >= 13 and SF <= 16 then put CV into SYL
    } else if ((H.ge(H.g.sf, 13) && H.le(H.g.sf, 16))) {
      H.g.syl = "CV";
    // else if SF >= 17 and SF <= 19 then put VC into SYL
    } else if ((H.ge(H.g.sf, 17) && H.le(H.g.sf, 19))) {
      H.g.syl = "VC";
    // else if SF >= 20 then put V into SYL
    } else if (H.ge(H.g.sf, 20)) {
      H.g.syl = "V";
    }
  });
  // end basicSyl
  // on sylCvc
  H.on(owner, "sylCvc", async function sylCvc($) {
    // global SYL, SF
    /* shared: H.g.syl, H.g.sf */
    // put the random of 20 into SF
    H.g.sf = H.f.random(20);
    // if SF <= 1 then put cvc into SYL
    if (H.le(H.g.sf, 1)) {
      H.g.syl = "cvc";
    // else if SF >= 2 and SF <= 3 then put cv into SYL
    } else if ((H.ge(H.g.sf, 2) && H.le(H.g.sf, 3))) {
      H.g.syl = "cv";
    // else if SF >= 4 and SF <= 10 then put vc into SYL
    } else if ((H.ge(H.g.sf, 4) && H.le(H.g.sf, 10))) {
      H.g.syl = "vc";
    // else if SF >= 11 then put v into SYL
    } else if (H.ge(H.g.sf, 11)) {
      H.g.syl = "v";
    }
  });
  // end sylCvc
  // on sylCv
  H.on(owner, "sylCv", async function sylCv($) {
    // global SYL, SF
    /* shared: H.g.syl, H.g.sf */
    // put the random of 20 into SF
    H.g.sf = H.f.random(20);
    // if SF <= 10 then put cvc into SYL
    if (H.le(H.g.sf, 10)) {
      H.g.syl = "cvc";
    // else if SF >= 11 and SF <= 17 then put cv into SYL
    } else if ((H.ge(H.g.sf, 11) && H.le(H.g.sf, 17))) {
      H.g.syl = "cv";
    // else if SF = 18 then put vc into SYL
    } else if (H.eq(H.g.sf, 18)) {
      H.g.syl = "vc";
    // else if SF >= 19 then put v into SYL
    } else if (H.ge(H.g.sf, 19)) {
      H.g.syl = "v";
    }
  });
  // end sylCv
  // on sylVc
  H.on(owner, "sylVc", async function sylVc($) {
    // global SYL, SF
    /* shared: H.g.syl, H.g.sf */
    // put the random of 20 into SF
    H.g.sf = H.f.random(20);
    // if SF <= 2 then put cvc into SYL
    if (H.le(H.g.sf, 2)) {
      H.g.syl = "cvc";
    // else if SF = 3 then put cv into SYL
    } else if (H.eq(H.g.sf, 3)) {
      H.g.syl = "cv";
    // else if SF >= 4 and SF <= 13 then put vc into SYL
    } else if ((H.ge(H.g.sf, 4) && H.le(H.g.sf, 13))) {
      H.g.syl = "vc";
    // else if SF >= 14 then put v into SYL
    } else if (H.ge(H.g.sf, 14)) {
      H.g.syl = "v";
    }
  });
  // end sylVc
  // on sylV
  H.on(owner, "sylV", async function sylV($) {
    // global SYL, SF
    /* shared: H.g.syl, H.g.sf */
    // put the random of 20 into SF
    H.g.sf = H.f.random(20);
    // if SF <= 9 then put cvc into SYL
    if (H.le(H.g.sf, 9)) {
      H.g.syl = "cvc";
    // else if SF >= 10 and SF <= 18 then put cv into SYL
    } else if ((H.ge(H.g.sf, 10) && H.le(H.g.sf, 18))) {
      H.g.syl = "cv";
    // else if SF = 19 then put vc into SYL
    } else if (H.eq(H.g.sf, 19)) {
      H.g.syl = "vc";
    // else if SF = 20 then put v into SYL
    } else if (H.eq(H.g.sf, 20)) {
      H.g.syl = "v";
    }
  });
  // end sylV
  // on IniCon
  H.on(owner, "IniCon", async function IniCon($) {
    let LCN = "", INC = "";
    // global wordLoc
    /* shared: H.g.wordloc */
    // put wordLoc into LCN
    LCN = H.g.wordloc;
    // put the random of 147 into INC
    INC = H.f.random(147);
    // if INC <= 3 then
    if (H.le(INC, 3)) {
      // put b into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "b", "into", [["word", LCN]]);
    // else if INC >= 4 and INC <= 15 then
    } else if ((H.ge(INC, 4) && H.le(INC, 15))) {
      // put c into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "c", "into", [["word", LCN]]);
    // else if INC >= 16 and INC <= 31 then
    } else if ((H.ge(INC, 16) && H.le(INC, 31))) {
      // put d into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "d", "into", [["word", LCN]]);
    // else if INC = 32 then
    } else if (H.eq(INC, 32)) {
      // put f into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "f", "into", [["word", LCN]]);
    // else if INC >= 33 and INC <= 40 then
    } else if ((H.ge(INC, 33) && H.le(INC, 40))) {
      // put g into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "g", "into", [["word", LCN]]);
    // else if INC = 41 then
    } else if (H.eq(INC, 41)) {
      // put gr into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "gr", "into", [["word", LCN]]);
    // else if INC >= 42 and INC <= 43 then
    } else if ((H.ge(INC, 42) && H.le(INC, 43))) {
      // put h into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "h", "into", [["word", LCN]]);
    // else if INC = 44 then
    } else if (H.eq(INC, 44)) {
      // put hl into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "hl", "into", [["word", LCN]]);
    // else if INC = 45 then
    } else if (H.eq(INC, 45)) {
      // put hr into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "hr", "into", [["word", LCN]]);
    // else if INC >= 46 and INC <= 52 then
    } else if ((H.ge(INC, 46) && H.le(INC, 52))) {
      // put j into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "j", "into", [["word", LCN]]);
    // else if INC >= 53 and INC <= 62 then
    } else if ((H.ge(INC, 53) && H.le(INC, 62))) {
      // put k into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "k", "into", [["word", LCN]]);
    // else if INC = 63 then
    } else if (H.eq(INC, 63)) {
      // put kh into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "kh", "into", [["word", LCN]]);
    // else if INC >= 64 and INC <= 71 then
    } else if ((H.ge(INC, 64) && H.le(INC, 71))) {
      // put l into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "l", "into", [["word", LCN]]);
    // else if INC >= 72 and INC <= 81 then
    } else if ((H.ge(INC, 72) && H.le(INC, 81))) {
      // put m into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "m", "into", [["word", LCN]]);
    // else if INC >= 82 and INC <= 91 then
    } else if ((H.ge(INC, 82) && H.le(INC, 91))) {
      // put n into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "n", "into", [["word", LCN]]);
    // else if INC >= 92 and INC <= 97 then
    } else if ((H.ge(INC, 92) && H.le(INC, 97))) {
      // put p into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "p", "into", [["word", LCN]]);
    // else if INC = 98 then
    } else if (H.eq(INC, 98)) {
      // put pl into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "pl", "into", [["word", LCN]]);
    // else if INC = 99 then
    } else if (H.eq(INC, 99)) {
      // put pt into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "pt", "into", [["word", LCN]]);
    // else if INC >= 100 and INC <= 109 then
    } else if ((H.ge(INC, 100) && H.le(INC, 109))) {
      // put r into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "r", "into", [["word", LCN]]);
    // else if INC >= 110 and INC <= 119 then
    } else if ((H.ge(INC, 110) && H.le(INC, 119))) {
      // put s into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "s", "into", [["word", LCN]]);
    // else if INC = 120 then
    } else if (H.eq(INC, 120)) {
      // put scl into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "scl", "into", [["word", LCN]]);
    // else if INC = 111 then
    } else if (H.eq(INC, 111)) {
      // put sl into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "sl", "into", [["word", LCN]]);
    // else if INC = 112 then
    } else if (H.eq(INC, 112)) {
      // put spr into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "spr", "into", [["word", LCN]]);
    // else if INC >= 113 and INC <= 115 then
    } else if ((H.ge(INC, 113) && H.le(INC, 115))) {
      // put st into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "st", "into", [["word", LCN]]);
    // else if INC >= 116 and INC <= 131 then
    } else if ((H.ge(INC, 116) && H.le(INC, 131))) {
      // put t into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "t", "into", [["word", LCN]]);
    // else if INC >= 132 and INC <= 135 then
    } else if ((H.ge(INC, 132) && H.le(INC, 135))) {
      // put th into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "th", "into", [["word", LCN]]);
    // else if INC = 136 then
    } else if (H.eq(INC, 136)) {
      // put tr into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "tr", "into", [["word", LCN]]);
    // else if INC >= 137 and INC <= 141 then
    } else if ((H.ge(INC, 137) && H.le(INC, 141))) {
      // put v into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "v", "into", [["word", LCN]]);
    // else if INC >= 142 and INC <= 143 then
    } else if ((H.ge(INC, 142) && H.le(INC, 143))) {
      // put x into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "x", "into", [["word", LCN]]);
    // else if INC >= 144 and INC <= 146 then
    } else if ((H.ge(INC, 144) && H.le(INC, 146))) {
      // put y into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "y", "into", [["word", LCN]]);
    // else if INC = 147 then
    } else if (H.eq(INC, 147)) {
      // put z into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "z", "into", [["word", LCN]]);
    // end if
    }
    // add 1 to LCN
    LCN = H.num(LCN) + 1;
    // put LCN into wordLoc
    H.g.wordloc = LCN;
  });
  // end IniCon
  // on Vowel
  H.on(owner, "Vowel", async function Vowel($) {
    let LCN = "", VCF = "";
    // global wordLoc
    /* shared: H.g.wordloc */
    // put wordLoc into LCN
    LCN = H.g.wordloc;
    // put the random of 264 into VCF
    VCF = H.f.random(264);
    // if VCF <= 94 then
    if (H.le(VCF, 94)) {
      // put a into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "a", "into", [["word", LCN]]);
    // else if VCF >= 95 and VCF <= 100 then
    } else if ((H.ge(VCF, 95) && H.le(VCF, 100))) {
      // put aa into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "aa", "into", [["word", LCN]]);
    // else if VCF >= 101 and VCF <= 106 then
    } else if ((H.ge(VCF, 101) && H.le(VCF, 106))) {
      // put ae into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ae", "into", [["word", LCN]]);
    // else if VCF = 107 then
    } else if (H.eq(VCF, 107)) {
      // put ai into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ai", "into", [["word", LCN]]);
    // else if VCF = 108 then
    } else if (H.eq(VCF, 108)) {
      // put ao into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ao", "into", [["word", LCN]]);
    // else if VCF >= 109 and VCF <= 111 then
    } else if ((H.ge(VCF, 109) && H.le(VCF, 111))) {
      // put au into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "au", "into", [["word", LCN]]);
    // else if VCF >= 112 and VCF <= 114 then
    } else if ((H.ge(VCF, 112) && H.le(VCF, 114))) {
      // put ay into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ay", "into", [["word", LCN]]);
    // else if VCF >= 115 and VCF <= 156 then
    } else if ((H.ge(VCF, 115) && H.le(VCF, 156))) {
      // put e into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "e", "into", [["word", LCN]]);
    // else if VCF >= 157 and VCF <= 164 then
    } else if ((H.ge(VCF, 157) && H.le(VCF, 164))) {
      // put é into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "é", "into", [["word", LCN]]);
    // else if VCF >= 165 and VCF <= 171 then
    } else if ((H.ge(VCF, 165) && H.le(VCF, 171))) {
      // put eh into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "eh", "into", [["word", LCN]]);
    // else if VCF >= 172 and VCF <= 173 then
    } else if ((H.ge(VCF, 172) && H.le(VCF, 173))) {
      // put ea into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ea", "into", [["word", LCN]]);
    // else if VCF >= 174 and VCF <= 175 then
    } else if ((H.ge(VCF, 174) && H.le(VCF, 175))) {
      // put ei into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ei", "into", [["word", LCN]]);
    // else if VCF >= 176 and VCF <= 207 then
    } else if ((H.ge(VCF, 176) && H.le(VCF, 207))) {
      // put i into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "i", "into", [["word", LCN]]);
    // else if VCF >= 208 and VCF <= 209 then
    } else if ((H.ge(VCF, 208) && H.le(VCF, 209))) {
      // put ia into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ia", "into", [["word", LCN]]);
    // else if VCF = 210 then
    } else if (H.eq(VCF, 210)) {
      // put ie into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ie", "into", [["word", LCN]]);
    // else if VCF = 211 then
    } else if (H.eq(VCF, 211)) {
      // put io into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "io", "into", [["word", LCN]]);
    // else if VCF >= 212 and VCF <= 213 then
    } else if ((H.ge(VCF, 212) && H.le(VCF, 213))) {
      // put iu into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "iu", "into", [["word", LCN]]);
    // else if VCF >= 214 and VCF <= 238 then
    } else if ((H.ge(VCF, 214) && H.le(VCF, 238))) {
      // put o into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "o", "into", [["word", LCN]]);
    // else if VCF >= 239 and VCF <= 240 then
    } else if ((H.ge(VCF, 239) && H.le(VCF, 240))) {
      // put oe into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "oe", "into", [["word", LCN]]);
    // else if VCF >= 241 and VCF <= 242 then
    } else if ((H.ge(VCF, 241) && H.le(VCF, 242))) {
      // put ou into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ou", "into", [["word", LCN]]);
    // else if VCF >= 243 and VCF <= 252 then
    } else if ((H.ge(VCF, 243) && H.le(VCF, 252))) {
      // put u into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "u", "into", [["word", LCN]]);
    // else if VCF >= 253 and VCF <= 254 then
    } else if ((H.ge(VCF, 253) && H.le(VCF, 254))) {
      // put û into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "û", "into", [["word", LCN]]);
    // else if VCF >= 255 then
    } else if (H.ge(VCF, 255)) {
      // put y into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "y", "into", [["word", LCN]]);
    // end if
    }
    // add 1 to LCN
    LCN = H.num(LCN) + 1;
    // put LCN into wordLoc
    H.g.wordloc = LCN;
  });
  // end Vowel
  // on FinCon
  H.on(owner, "FinCon", async function FinCon($) {
    let LCN = "", FNC = "";
    // global wordLoc
    /* shared: H.g.wordloc */
    // put wordLoc into LCN
    LCN = H.g.wordloc;
    // put the random of 175 into FNC
    FNC = H.f.random(175);
    // if FNC <= 6 then
    if (H.le(FNC, 6)) {
      // put b into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "b", "into", [["word", LCN]]);
    // else if FNC >= 7 and FNC <= 8 then
    } else if ((H.ge(FNC, 7) && H.le(FNC, 8))) {
      // put ch into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ch", "into", [["word", LCN]]);
    // else if FNC >= 9 and FNC <= 13 then
    } else if ((H.ge(FNC, 9) && H.le(FNC, 13))) {
      // put d into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "d", "into", [["word", LCN]]);
    // else if FNC = 14 then
    } else if (H.eq(FNC, 14)) {
      // put dh into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "dh", "into", [["word", LCN]]);
    // else if FNC >= 15 and FNC <= 16 then
    } else if ((H.ge(FNC, 15) && H.le(FNC, 16))) {
      // put g into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "g", "into", [["word", LCN]]);
    // else if FNC >= 17 and FNC <= 20 then
    } else if ((H.ge(FNC, 17) && H.le(FNC, 20))) {
      // put h into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "h", "into", [["word", LCN]]);
    // else if FNC >= 21 and FNC <= 26 then
    } else if ((H.ge(FNC, 21) && H.le(FNC, 26))) {
      // put k into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "k", "into", [["word", LCN]]);
    // else if FNC >= 27 and FNC <= 48 then
    } else if ((H.ge(FNC, 27) && H.le(FNC, 48))) {
      // put l into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "l", "into", [["word", LCN]]);
    // else if FNC = 49 then
    } else if (H.eq(FNC, 49)) {
      // put lr into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "lr", "into", [["word", LCN]]);
    // else if FNC = 50 then
    } else if (H.eq(FNC, 50)) {
      // put ls into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ls", "into", [["word", LCN]]);
    // else if FNC >= 51 and FNC <= 61 then
    } else if ((H.ge(FNC, 51) && H.le(FNC, 61))) {
      // put m into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "m", "into", [["word", LCN]]);
    // else if FNC >= 62 and FNC <= 105 then
    } else if ((H.ge(FNC, 62) && H.le(FNC, 105))) {
      // put n into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "n", "into", [["word", LCN]]);
    // else if FNC = 106 then
    } else if (H.eq(FNC, 106)) {
      // put ncs into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ncs", "into", [["word", LCN]]);
    // else if FNC = 107 then
    } else if (H.eq(FNC, 107)) {
      // put nm into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "nm", "into", [["word", LCN]]);
    // else if FNC = 108 then
    } else if (H.eq(FNC, 108)) {
      // put p into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "p", "into", [["word", LCN]]);
    // else if FNC >= 109 and FNC <= 142 then
    } else if ((H.ge(FNC, 109) && H.le(FNC, 142))) {
      // put r into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "r", "into", [["word", LCN]]);
    // else if FNC = 143 then
    } else if (H.eq(FNC, 143)) {
      // put rr into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "rr", "into", [["word", LCN]]);
    // else if FNC >= 144 and FNC <= 162 then
    } else if ((H.ge(FNC, 144) && H.le(FNC, 162))) {
      // put s into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "s", "into", [["word", LCN]]);
    // else if FNC = 163 then
    } else if (H.eq(FNC, 163)) {
      // put sch into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "sch", "into", [["word", LCN]]);
    // else if FNC >= 164 and FNC <= 165 then
    } else if ((H.ge(FNC, 164) && H.le(FNC, 165))) {
      // put sh into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "sh", "into", [["word", LCN]]);
    // else if FNC >= 166 and FNC <= 169 then
    } else if ((H.ge(FNC, 166) && H.le(FNC, 169))) {
      // put t into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "t", "into", [["word", LCN]]);
    // else if FNC >= 170 and FNC <= 171 then
    } else if ((H.ge(FNC, 170) && H.le(FNC, 171))) {
      // put th into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "th", "into", [["word", LCN]]);
    // else if FNC = 172 then
    } else if (H.eq(FNC, 172)) {
      // put ts into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "ts", "into", [["word", LCN]]);
    // else if FNC >= 173 then
    } else if (H.ge(FNC, 173)) {
      // put v into word LCN of cd fld Word
      H.putInto(H.part($, "card", "field", "Word"), "v", "into", [["word", LCN]]);
    // end if
    }
    // add 1 to LCN
    LCN = H.num(LCN) + 1;
    // put LCN into wordLoc
    H.g.wordloc = LCN;
  });
  // end FinCon
}

// ---- script 9: card-2221/button-9 "New"
function script9(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // do makeWord
    await H.call($, "makeWord", []);
  });
  // end mouseUp
}

// ---- script 10: card-2221/button-16 "Batch"
function script10(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", WRD = "";
    // global BTC, LNG
    /* shared: H.g.btc, H.g.lng */
    // ask "How many words do you wish to generate?" with "12"
    it = await H.ask("How many words do you wish to generate?", "12");
    // put it into BTC
    H.g.btc = it;
    // if BTC >= 50 then
    if (H.ge(H.g.btc, 50)) {
      // put "A list of " into LNG
      H.g.lng = "A list of ";
      // put the number of words in LNG into WRD
      WRD = H.count("word", H.g.lng);
      // add 1 to WRD
      WRD = H.num(WRD) + 1;
      // put BTC into word WRD of LNG
      H.g.lng = H.put(H.g.lng, H.g.btc, "into", [["word", WRD]]);
      // put the number of words in LNG into WRD
      WRD = H.count("word", H.g.lng);
      // add 1 to WRD
      WRD = H.num(WRD) + 1;
      // put " will take several minutes to generate.  Do you wish to proceed?" into word WRD of LNG
      H.g.lng = H.put(H.g.lng, " will take several minutes to generate.  Do you wish to proceed?", "into", [["word", WRD]]);
      // answer LNG with "Ok" or "Cancel"
      it = await H.answer(H.g.lng, ["Ok", "Cancel"]);
      // if it is "Cancel" then
      if (H.eq(it, "Cancel")) {
        // exit mouseUp
        return;
      // else if it is "Ok" then
      } else if (H.eq(it, "Ok")) {
        // do genWords
        await H.call($, "genWords", []);
      // end if
      }
    // else if BTC <= 49 then
    } else if (H.le(H.g.btc, 49)) {
      // do genWords
      await H.call($, "genWords", []);
    // end if
    }
  });
  // end mouseUp
  // on genWords
  H.on(owner, "genWords", async function genWords($) {
    let BLoc = "";
    // global BTC, LNG
    /* shared: H.g.btc, H.g.lng */
    // put empty into cd fld Batch
    H.putInto(H.part($, "card", "field", "Batch"), "", "into");
    // show cd fld Batch
    H.show(H.part($, "card", "field", "Batch"));
    // hide cd fld Lexicon
    H.hide(H.part($, "card", "field", "Lexicon"));
    // hide cd fld Glossary
    H.hide(H.part($, "card", "field", "Glossary"));
    // hide cd fld Pronounce
    H.hide(H.part($, "card", "field", "Pronounce"));
    // set hilite of cd button "Batch List" to true
    H.setProp(H.part($, "card", "button", "Batch List"), "hilite", true);
    // set hilite of cd btn Lexicon to false
    H.setProp(H.part($, "card", "button", "Lexicon"), "hilite", false);
    // set hilite of cd btn Glossary to false
    H.setProp(H.part($, "card", "button", "Glossary"), "hilite", false);
    // set hilite of cd btn Pronunciation to false
    H.setProp(H.part($, "card", "button", "Pronunciation"), "hilite", false);
    // put BTC into cd fld Count
    H.putInto(H.part($, "card", "field", "Count"), H.g.btc, "into");
    // put 1 into BLoc
    BLoc = 1;
    // repeat for BTC
    for (let n1 = H.num(H.g.btc); n1 > 0; n1--) {
      await H.tick();
      // do makeWord
      await H.call($, "makeWord", []);
      // put cd fld Word into line BLoc of cd fld Batch
      H.putInto(H.part($, "card", "field", "Batch"), H.value(H.part($, "card", "field", "Word")), "into", [["line", BLoc]]);
      // add 1 to BLoc
      BLoc = H.num(BLoc) + 1;
      // subtract 1 from cd fld Count
      H.putInto(H.part($, "card", "field", "Count"), H.num(H.value(H.part($, "card", "field", "Count"))) - 1, "into");
    // end repeat
    }
    // put empty into cd fld Count
    H.putInto(H.part($, "card", "field", "Count"), "", "into");
    // sort lines of cd fld Batch ascending
    H.putInto(H.part($, "card", "field", "Batch"), H.sort(H.value(H.part($, "card", "field", "Batch")), "line", "ascending", "text"), "into");
  });
  // end genWords
}

// ---- script 11: card-2221/button-21 "Main"
function script11(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect stretch from top fast
    H.visual("stretch from top fast");
    // go cd Main
    await H.go($, {key: "Main"});
  });
  // end mouseUp
}

// ---- script 12: card-2221/button-23 "Lexicon"
function script12(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // set hilite of cd btn Lexicon to true
    H.setProp(H.part($, "card", "button", "Lexicon"), "hilite", true);
    // show cd fld Lexicon
    H.show(H.part($, "card", "field", "Lexicon"));
    // set hilite of cd btn Glossary to false
    H.setProp(H.part($, "card", "button", "Glossary"), "hilite", false);
    // hide cd fld Glossary
    H.hide(H.part($, "card", "field", "Glossary"));
    // set hilite of cd btn Pronunciation to false
    H.setProp(H.part($, "card", "button", "Pronunciation"), "hilite", false);
    // hide cd fld Pronounce
    H.hide(H.part($, "card", "field", "Pronounce"));
    // set hilite of cd btn "Batch List" to false
    H.setProp(H.part($, "card", "button", "Batch List"), "hilite", false);
    // hide cd fld Batch
    H.hide(H.part($, "card", "field", "Batch"));
  });
  // end mouseUp
}

// ---- script 13: card-2221/button-24 "Glossary"
function script13(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // set hilite of cd btn Glossary to true
    H.setProp(H.part($, "card", "button", "Glossary"), "hilite", true);
    // show cd fld Glossary
    H.show(H.part($, "card", "field", "Glossary"));
    // set hilite of cd btn Lexicon to false
    H.setProp(H.part($, "card", "button", "Lexicon"), "hilite", false);
    // hide cd fld Lexicon
    H.hide(H.part($, "card", "field", "Lexicon"));
    // set hilite of cd btn Pronunciation to false
    H.setProp(H.part($, "card", "button", "Pronunciation"), "hilite", false);
    // hide cd fld Pronounce
    H.hide(H.part($, "card", "field", "Pronounce"));
    // set hilite of cd button "Batch List" to false
    H.setProp(H.part($, "card", "button", "Batch List"), "hilite", false);
    // hide cd fld Batch
    H.hide(H.part($, "card", "field", "Batch"));
  });
  // end mouseUp
}

// ---- script 14: card-2221/button-25 "Pronunciation"
function script14(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // set hilite of cd btn Pronunciation to true
    H.setProp(H.part($, "card", "button", "Pronunciation"), "hilite", true);
    // show cd fld Pronounce
    H.show(H.part($, "card", "field", "Pronounce"));
    // set hilite of cd btn Lexicon to false
    H.setProp(H.part($, "card", "button", "Lexicon"), "hilite", false);
    // hide cd fld Lexicon
    H.hide(H.part($, "card", "field", "Lexicon"));
    // set hilite of cd btn Glossary to false
    H.setProp(H.part($, "card", "button", "Glossary"), "hilite", false);
    // hide cd fld Glossary
    H.hide(H.part($, "card", "field", "Glossary"));
    // set hilite of cd btn "Batch List" to false
    H.setProp(H.part($, "card", "button", "Batch List"), "hilite", false);
    // hide cd fld Batch
    H.hide(H.part($, "card", "field", "Batch"));
  });
  // end mouseUp
}

// ---- script 15: card-2221/button-26 "Batch List"
function script15(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // set hilite of cd btn "Batch List" to true
    H.setProp(H.part($, "card", "button", "Batch List"), "hilite", true);
    // show cd fld Batch
    H.show(H.part($, "card", "field", "Batch"));
    // set hilite of cd btn Lexicon to false
    H.setProp(H.part($, "card", "button", "Lexicon"), "hilite", false);
    // hide cd fld Lexicon
    H.hide(H.part($, "card", "field", "Lexicon"));
    // set hilite of cd btn Glossary to false
    H.setProp(H.part($, "card", "button", "Glossary"), "hilite", false);
    // hide cd fld Glossary
    H.hide(H.part($, "card", "field", "Glossary"));
    // set hilite of cd btn Pronunciation to false
    H.setProp(H.part($, "card", "button", "Pronunciation"), "hilite", false);
    // hide cd fld Pronounce
    H.hide(H.part($, "card", "field", "Pronounce"));
  });
  // end mouseUp
}

// ---- script 16: card-4423/button-4 "Main"
function script16(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect stretch from bottom fast
    H.visual("stretch from bottom fast");
    // go cd Main
    await H.go($, {key: "Main"});
  });
  // end mouseUp
}

// ---- script 17: card-4423/button-5 "Begin"
function script17(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect stretch from top fast
    H.visual("stretch from top fast");
    // go cd Trade
    await H.go($, {key: "Trade"});
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-3624/button-13");  // bkgnd-3624/button-13 "Sort/Export"
script2("bkgnd-3624/button-14");  // bkgnd-3624/button-14 "Print"
script3("bkgnd-3624/button-15");  // bkgnd-3624/button-15 "Save Word"
script4("card-4138/button-13");  // card-4138/button-13 "Begin"
script5("card-4138/button-14");  // card-4138/button-14 "About"
script6("card-4138/button-15");  // card-4138/button-15 "Home"
script7("card-4138/button-16");  // card-4138/button-16 "Quit"
script8("card-2221");  // card card-2221 "Trade"
script9("card-2221/button-9");  // card-2221/button-9 "New"
script10("card-2221/button-16");  // card-2221/button-16 "Batch"
script11("card-2221/button-21");  // card-2221/button-21 "Main"
script12("card-2221/button-23");  // card-2221/button-23 "Lexicon"
script13("card-2221/button-24");  // card-2221/button-24 "Glossary"
script14("card-2221/button-25");  // card-2221/button-25 "Pronunciation"
script15("card-2221/button-26");  // card-2221/button-26 "Batch List"
script16("card-4423/button-4");  // card-4423/button-4 "Main"
script17("card-4423/button-5");  // card-4423/button-5 "Begin"
};
