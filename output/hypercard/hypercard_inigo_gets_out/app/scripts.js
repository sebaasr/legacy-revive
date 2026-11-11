// HyperTalk scripts of Inigo Gets Out (Inigo Gets Out.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: card-2927/button-2 "New Button"
function script0(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 3695
    await H.go($, {id: 3695});
  });
  // end mouseUp
}

// ---- script 1: card-2927/button-3 "New Button"
function script1(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 11284
    await H.go($, {id: 11284});
  });
  // end mouseUp
}

// ---- script 2: card card-11284 ""; card card-9494 ""
function script2(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 2927
    await H.go($, {id: 2927});
  });
  // end mouseUp
}

// ---- script 3: card-3695/button-1 "New Button"
function script3(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 3502
    await H.go($, {id: 3502});
  });
  // end mouseUp
}

// ---- script 4: card-3695/button-2 "New Button"
function script4(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 9939
    await H.go($, {id: 9939});
  });
  // end mouseUp
}

// ---- script 5: card-3695/button-3 "New Button"
function script5(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 8940
    await H.go($, {id: 8940});
  });
  // end mouseUp
}

// ---- script 6: card-3502/button-1 "New Button"
function script6(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 4132
    await H.go($, {id: 4132});
    // go to card id 4926
    await H.go($, {id: 4926});
    // play harpsichord fast d1 d d d d d d d d d d d d d d d
    H.play("harpsichord", null, "fast d1 d d d d d d d d d d d d d d d");
    // flash 6
    await H.flash(6);
    // go to card id 5419
    await H.go($, {id: 5419});
    // go to card id 5756
    await H.go($, {id: 5756});
    // go to card id 6426
    await H.go($, {id: 6426});
  });
  // end mouseUp
}

// ---- script 7: card-3502/button-2 "New Button"; card-6426/button-1 "New Button"
function script7(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 3156
    await H.go($, {id: 3156});
  });
  // end mouseUp
}

// ---- script 8: card-3502/button-3 "New Button"; card-6426/button-2 "New Button"; card-3156/button-2 "New Button"; ... (4 owners)
function script8(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 8138
    await H.go($, {id: 8138});
  });
  // end mouseUp
}

// ---- script 9: card-3156/button-1 "New Button"
function script9(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 7525
    await H.go($, {id: 7525});
    // play harpsichord gb1
    H.play("harpsichord", null, "gb1");
  });
  // end mouseUp
}

// ---- script 10: card-7525/button-2 "New Button"
function script10(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord gb1
    H.play("harpsichord", null, "gb1");
  });
  // end mouseUp
}

// ---- script 11: card-8138/button-1 "New Button"
function script11(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 8581
    await H.go($, {id: 8581});
  });
  // end mouseUp
}

// ---- script 12: card-8581/button-1 "New Button"
function script12(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 9001
    await H.go($, {id: 9001});
  });
  // end mouseUp
}

// ---- script 13: card-9001/button-1 "New Button"
function script13(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord c4 a3 f c4 a3 f c4 d c c c
    H.play("harpsichord", null, "c4 a3 f c4 a3 f c4 d c c c");
    // go to card id 9494
    await H.go($, {id: 9494});
  });
  // end mouseUp
}

// ---- script 14: card-9939/button-1 "New Button"
function script14(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play boing
    H.play("boing", null, "");
    // go to card id 10666
    await H.go($, {id: 10666});
  });
  // end mouseUp
}

// ---- script 15: card-10666/button-1 "New Button"; card-11851/button-1 "New Button"
function script15(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 11074
    await H.go($, {id: 11074});
  });
  // end mouseUp
}

// ---- script 16: card-11074/button-1 "New Button"
function script16(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 11851
    await H.go($, {id: 11851});
  });
  // end mouseUp
}

// ---- script 17: card-11074/button-2 "New Button"
function script17(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 12665
    await H.go($, {id: 12665});
  });
  // end mouseUp
}

// ---- script 18: card-12665/button-1 "New Button"
function script18(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 13017
    await H.go($, {id: 13017});
  });
  // end mouseUp
}

// ---- script 19: card-13017/button-1 "New Button"
function script19(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 13638
    await H.go($, {id: 13638});
    // play harpsichord fast a7 b c d e f gw
    H.play("harpsichord", null, "fast a7 b c d e f gw");
    // go to card id 13948
    await H.go($, {id: 13948});
  });
  // end mouseUp
}

// ---- script 20: card-13948/button-1 "New Button"
function script20(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 14466
    await H.go($, {id: 14466});
  });
  // end mouseUp
}

// ---- script 21: card-13948/button-2 "New Button"
function script21(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord e6
    H.play("harpsichord", null, "e6");
  });
  // end mouseUp
}

// ---- script 22: card-14466/button-1 "New Button"
function script22(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect scroll left
    H.visual("scroll left");
    // go to card id 14932
    await H.go($, {id: 14932});
  });
  // end mouseUp
}

// ---- script 23: card-14932/button-1 "New Button"
function script23(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 15631
    await H.go($, {id: 15631});
    // go to card id 15432
    await H.go($, {id: 15432});
  });
  // end mouseUp
}

// ---- script 24: card-15432/button-1 "New Button"; card-8940/button-1 "New Button"
function script24(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 16689
    await H.go($, {id: 16689});
    // visual effect dissolve to black
    H.visual("dissolve to black");
    // go to card id 3985
    await H.go($, {id: 3985});
    // wait 1 seconds
    await H.wait(1 * 60);
    // go to card id 17277
    await H.go($, {id: 17277});
  });
  // end mouseUp
}

// ---- script 25: card-17277/button-1 "New Button"
function script25(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 3695
    await H.go($, {id: 3695});
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0("card-2927/button-2");  // card-2927/button-2 "New Button"
script1("card-2927/button-3");  // card-2927/button-3 "New Button"
script2("card-11284");  // card card-11284 ""
script2("card-9494");  // card card-9494 ""
script3("card-3695/button-1");  // card-3695/button-1 "New Button"
script4("card-3695/button-2");  // card-3695/button-2 "New Button"
script5("card-3695/button-3");  // card-3695/button-3 "New Button"
script6("card-3502/button-1");  // card-3502/button-1 "New Button"
script7("card-3502/button-2");  // card-3502/button-2 "New Button"
script7("card-6426/button-1");  // card-6426/button-1 "New Button"
script8("card-3502/button-3");  // card-3502/button-3 "New Button"
script8("card-6426/button-2");  // card-6426/button-2 "New Button"
script8("card-3156/button-2");  // card-3156/button-2 "New Button"
script8("card-7525/button-1");  // card-7525/button-1 "New Button"
script9("card-3156/button-1");  // card-3156/button-1 "New Button"
script10("card-7525/button-2");  // card-7525/button-2 "New Button"
script11("card-8138/button-1");  // card-8138/button-1 "New Button"
script12("card-8581/button-1");  // card-8581/button-1 "New Button"
script13("card-9001/button-1");  // card-9001/button-1 "New Button"
script14("card-9939/button-1");  // card-9939/button-1 "New Button"
script15("card-10666/button-1");  // card-10666/button-1 "New Button"
script15("card-11851/button-1");  // card-11851/button-1 "New Button"
script16("card-11074/button-1");  // card-11074/button-1 "New Button"
script17("card-11074/button-2");  // card-11074/button-2 "New Button"
script18("card-12665/button-1");  // card-12665/button-1 "New Button"
script19("card-13017/button-1");  // card-13017/button-1 "New Button"
script20("card-13948/button-1");  // card-13948/button-1 "New Button"
script21("card-13948/button-2");  // card-13948/button-2 "New Button"
script22("card-14466/button-1");  // card-14466/button-1 "New Button"
script23("card-14932/button-1");  // card-14932/button-1 "New Button"
script24("card-15432/button-1");  // card-15432/button-1 "New Button"
script24("card-8940/button-1");  // card-8940/button-1 "New Button"
script25("card-17277/button-1");  // card-17277/button-1 "New Button"
};
