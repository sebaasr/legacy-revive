// HyperTalk scripts of CthulhuCard (CthulhuCard.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // on OpenStack
  H.on(owner, "OpenStack", async function OpenStack($) {
    // hide menubar
    H.hideBar("menubar");
    // play "DkCasMus"
    H.play("DkCasMus", null, "");
  });
  // end OpenStack
}

// ---- script 1: bkgnd-4587/button-5 "Prev"; card-6935/button-55 "Go Back"
function script1(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go prev
    await H.go($, {rel: "prev"});
  });
  // end mouseUp
}

// ---- script 2: bkgnd-4587/button-6 "1st Card"
function script2(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // global soundoff
    /* shared: H.g.soundoff */
    // if soundoff = "on" then
    if (H.eq(H.g.soundoff, "on")) {
      // play "Don't Worry.snd"
      H.play("Don't Worry.snd", null, "");
      // wait until the sound is "done"
      await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
      // play "Be Happy.snd"
      H.play("Be Happy.snd", null, "");
      // wait until the sound is "done"
      await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // end if
    }
    // go first
    await H.go($, {rel: "first"});
  });
  // end mouseUp
}

// ---- script 3: bkgnd-4587/button-7 "Home"
function script3(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // Go Home
    await H.goHome($);
  });
  // end mouseUp
}

// ---- script 4: bkgnd-4587/button-8 "Next"
function script4(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go next
    await H.go($, {rel: "next"});
  });
  // end mouseUp
}

// ---- script 5: card card-3185 "Title card"
function script5(owner) {
  // on stackopen
  H.on(owner, "stackopen", async function stackopen($) {
    // play "DkCasMus"
    H.play("DkCasMus", null, "");
  });
  // end stackopen
}

// ---- script 6: card-3185/button-5 "Run Away!!"
function script6(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Don't Worry.snd"
    H.play("Don't Worry.snd", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // go home
    await H.goHome($);
  });
  // end mouseUp
}

// ---- script 7: card-3185/button-7 "Alpha Search"
function script7(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card "list card"
    await H.go($, {key: "list card"});
  });
  // end mouseUp
}

// ---- script 8: card-3185/button-8 "Credits"; card-19562/button-1 "Go Back!"
function script8(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 2523
    await H.go($, {id: 2523});
  });
  // end mouseUp
}

// ---- script 9: card-3185/button-13 "Questions?"
function script9(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 4180
    await H.go($, {id: 4180});
  });
  // end mouseUp
}

// ---- script 10: card-6935/field-53 ""
function script10(owner) {
  // on mousedown
  H.on(owner, "mousedown", async function mousedown($) {
    let ClickedHere = "", holder = "";
    // put the clickLoc into ClickedHere
    ClickedHere = H.f.clickLoc();
    // set lockText of target to false
    H.setProp(H.target($), "lockText", false);
    // click at left of target + 1,item 2 of ClickedHere
    await H.clickAt($, H.num(H.prop(H.target($), "left")) + 1, H.chunk(ClickedHere, [["item", 2]]));
    // click at right of target - 20, item 2 of ClickedHere with shiftKey
    await H.clickAt($, H.num(H.prop(H.target($), "right")) - 20, H.chunk(ClickedHere, [["item", 2]]), ["shiftkey"]);
    // put selection into holder
    holder = H.f.selection();
    // go to cd holder
    await H.go($, {key: holder});
    // set lockText of target to true
    H.setProp(H.target($), "lockText", true);
    // if holder = "" then beep
    if (H.eq(holder, "")) {
      H.beep(1);
    }
  });
  // end mousedown
}

// ---- script 11: card-3967/button-1 ""
function script11(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "What do i do?.snd"
    H.play("What do i do?.snd", null, "");
  });
  // end mouseUp
}

// ---- script 12: card-5098/button-1 ""
function script12(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "byakhee"
    H.play("byakhee", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "byakhee"
    H.play("byakhee", null, "");
  });
  // end mouseUp
}

// ---- script 13: card-8146/button-1 ""
function script13(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Ahhh"
    H.play("Ahhh", null, "");
  });
  // End mouseUp
}

// ---- script 14: card-8455/button-1 ""
function script14(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "game over, man.snd"
    H.play("game over, man.snd", null, "");
  });
  // end mouseUp
}

// ---- script 15: card-8902/button-1 ""
function script15(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "DYOSN"
    H.play("DYOSN", null, "");
  });
  // end mouseUp
}

// ---- script 16: card-8995/button-1 ""
function script16(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "DeepOne.snd"
    H.play("DeepOne.snd", null, "");
  });
  // end mouseUp
}

// ---- script 17: card-9418/button-1 ""; card-6731/button-1 ""
function script17(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "HOLY SHIT.snd"
    H.play("HOLY SHIT.snd", null, "");
  });
  // end mouseUp
}

// ---- script 18: card-9631/button-1 ""
function script18(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "UhOh"
    H.play("UhOh", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "DS"
    H.play("DS", null, "");
  });
  // end mouseUp
}

// ---- script 19: card-9747/button-1 ""
function script19(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Elder Thing"
    H.play("Elder Thing", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "Elder Thing"
    H.play("Elder Thing", null, "");
  });
  // end mouseUp
}

// ---- script 20: card-9984/button-1 ""
function script20(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "polyp"
    H.play("polyp", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "polyp"
    H.play("polyp", null, "");
  });
  // end mouseUp
}

// ---- script 21: card-10397/button-1 ""
function script21(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "UhOh"
    H.play("UhOh", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "Yuck"
    H.play("Yuck", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "Belch"
    H.play("Belch", null, "");
  });
  // end mouseUp
}

// ---- script 22: card-10516/button-1 ""
function script22(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Mi-Go"
    H.play("Mi-Go", null, "");
  });
  // end mouseUp
}

// ---- script 23: card-10824/button-1 ""
function script23(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Ahhh"
    H.play("Ahhh", null, "");
  });
  // end mouseUp
}

// ---- script 24: card-11209/button-1 ""
function script24(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Dead"
    H.play("Dead", null, "");
  });
  // end mouseUp
}

// ---- script 25: card-11505/button-1 ""
function script25(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Yith"
    H.play("Yith", null, "");
  });
  // end mouseUp
}

// ---- script 26: card-11571/button-1 ""
function script26(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Hound"
    H.play("Hound", null, "");
  });
  // end mouseUp
}

// ---- script 27: card-12027/button-1 ""
function script27(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Danger, Danger"
    H.play("Danger, Danger", null, "");
  });
  // end mouseUp
}

// ---- script 28: card-12117/button-1 ""
function script28(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Ithaq1"
    H.play("Ithaq1", null, "");
  });
  // end mouseUp
}

// ---- script 29: card-4674/button-1 ""
function script29(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Goop"
    H.play("Goop", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "Aliens"
    H.play("Aliens", null, "");
  });
  // end mouseUp
}

// ---- script 30: card-5273/button-1 ""
function script30(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Wahoo"
    H.play("Wahoo", null, "");
    // play "WAhaha"
    H.play("WAhaha", null, "");
  });
  // end mouseUp
}

// ---- script 31: card-2638/button-1 ""
function script31(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Howl"
    H.play("Howl", null, "");
  });
  // end mouseUp
}

// ---- script 32: card-5476/button-1 ""
function script32(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "goop"
    H.play("goop", null, "");
  });
  // end mouseUp
}

// ---- script 33: card-5856/button-1 ""
function script33(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Shantak"
    H.play("Shantak", null, "");
  });
  // end mouseUp
}

// ---- script 34: card-6097/button-1 ""
function script34(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "WET SLUMP"
    H.play("WET SLUMP", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "WET SLUMP"
    H.play("WET SLUMP", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "Belch"
    H.play("Belch", null, "");
  });
  // end mouseUp
}

// ---- script 35: card-6271/button-1 ""
function script35(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "no use"
    H.play("no use", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "Ahhh"
    H.play("Ahhh", null, "");
  });
  // end mouseUp
}

// ---- script 36: card-6495/button-1 ""
function script36(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "SV"
    H.play("SV", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "SV"
    H.play("SV", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // play "SV"
    H.play("SV", null, "");
  });
  // end mouseUp
}

// ---- script 37: card-6731/button-2 "Next"; card-4180/button-2 "Go Back!"
function script37(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 3185
    await H.go($, {id: 3185});
  });
  // end mouseUp
}

// ---- script 38: card-2523/button-1 "Go Back!!"
function script38(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go first
    await H.go($, {rel: "first"});
  });
  // end mouseUp
}

// ---- script 39: card-2523/button-4 "About"; card-4180/button-7 "About"
function script39(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card id 19562
    await H.go($, {id: 19562});
  });
  // end mouseUp
}

// ---- script 40: card-19562/button-2 "Home"
function script40(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Don't Worry.snd"
    H.play("Don't Worry.snd", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // go home
    await H.goHome($);
  });
  // end mouseUp
}

// ---- script 41: card-4180/button-1 "Home"
function script41(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Don't Worry.Snd"
    H.play("Don't Worry.Snd", null, "");
    // wait until the sound is "done"
    await H.waitUntil(async () => H.eq(H.f.sound(), "done"));
    // go home
    await H.goHome($);
  });
  // end mouseUp
}

// ---- script 42: card-4180/button-3 "Panic Button"
function script42(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play "Don't Worry.snd"
    H.play("Don't Worry.snd", null, "");
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-4587/button-5");  // bkgnd-4587/button-5 "Prev"
script1("card-6935/button-55");  // card-6935/button-55 "Go Back"
script2("bkgnd-4587/button-6");  // bkgnd-4587/button-6 "1st Card"
script3("bkgnd-4587/button-7");  // bkgnd-4587/button-7 "Home"
script4("bkgnd-4587/button-8");  // bkgnd-4587/button-8 "Next"
script5("card-3185");  // card card-3185 "Title card"
script6("card-3185/button-5");  // card-3185/button-5 "Run Away!!"
script7("card-3185/button-7");  // card-3185/button-7 "Alpha Search"
script8("card-3185/button-8");  // card-3185/button-8 "Credits"
script8("card-19562/button-1");  // card-19562/button-1 "Go Back!"
script9("card-3185/button-13");  // card-3185/button-13 "Questions?"
script10("card-6935/field-53");  // card-6935/field-53 ""
script11("card-3967/button-1");  // card-3967/button-1 ""
script12("card-5098/button-1");  // card-5098/button-1 ""
script13("card-8146/button-1");  // card-8146/button-1 ""
script14("card-8455/button-1");  // card-8455/button-1 ""
script15("card-8902/button-1");  // card-8902/button-1 ""
script16("card-8995/button-1");  // card-8995/button-1 ""
script17("card-9418/button-1");  // card-9418/button-1 ""
script17("card-6731/button-1");  // card-6731/button-1 ""
script18("card-9631/button-1");  // card-9631/button-1 ""
script19("card-9747/button-1");  // card-9747/button-1 ""
script20("card-9984/button-1");  // card-9984/button-1 ""
script21("card-10397/button-1");  // card-10397/button-1 ""
script22("card-10516/button-1");  // card-10516/button-1 ""
script23("card-10824/button-1");  // card-10824/button-1 ""
script24("card-11209/button-1");  // card-11209/button-1 ""
script25("card-11505/button-1");  // card-11505/button-1 ""
script26("card-11571/button-1");  // card-11571/button-1 ""
script27("card-12027/button-1");  // card-12027/button-1 ""
script28("card-12117/button-1");  // card-12117/button-1 ""
script29("card-4674/button-1");  // card-4674/button-1 ""
script30("card-5273/button-1");  // card-5273/button-1 ""
script31("card-2638/button-1");  // card-2638/button-1 ""
script32("card-5476/button-1");  // card-5476/button-1 ""
script33("card-5856/button-1");  // card-5856/button-1 ""
script34("card-6097/button-1");  // card-6097/button-1 ""
script35("card-6271/button-1");  // card-6271/button-1 ""
script36("card-6495/button-1");  // card-6495/button-1 ""
script37("card-6731/button-2");  // card-6731/button-2 "Next"
script37("card-4180/button-2");  // card-4180/button-2 "Go Back!"
script38("card-2523/button-1");  // card-2523/button-1 "Go Back!!"
script39("card-2523/button-4");  // card-2523/button-4 "About"
script39("card-4180/button-7");  // card-4180/button-7 "About"
script40("card-19562/button-2");  // card-19562/button-2 "Home"
script41("card-4180/button-1");  // card-4180/button-1 "Home"
script42("card-4180/button-3");  // card-4180/button-3 "Panic Button"
};
