// HyperTalk scripts of What is HyperCard_ (What is HyperCard_.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // (no handlers: the script only holds comments or text)
}

// ---- script 1: background bkgnd-2619 "Content"
function script1(owner) {
  // on openStack
  H.on(owner, "openStack", async function openStack($) {
    // checkHCversion
    await H.call($, "checkHCversion", []);
    // showTextFields
    await H.call($, "showTextFields", []);
    // choose browse tool
    H.choose("browse");
    // set the editBkgnd to false
    H.setGlobal("editBkgnd", false);
  });
  // end openStack
  // on closeStack
  H.on(owner, "closeStack", async function closeStack($) {
    // lock screen
    H.lockScreen();
    // set the hilite of bkgnd btn "Welcome" to true
    H.setProp(H.part($, "bg", "button", "Welcome"), "hilite", true);
  });
  // end closeStack
  // on resumeStack
  H.on(owner, "resumeStack", async function resumeStack($) {
    // choose browse tool
    H.choose("browse");
    // set the editBkgnd to false
    H.setGlobal("editBkgnd", false);
  });
  // end resumeStack
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    let it = "";
    // get the number of this card
    it = H.prop(H.card($, {rel: "this"}), "number");
    // set the enabled of bkgnd btn "Previous" to NOT (it = 1)
    H.setProp(H.part($, "bg", "button", "Previous"), "enabled", !H.eq(it, 1));
    // set the enabled of bkgnd btn "Next" to NOT (it = the number of cards)
    H.setProp(H.part($, "bg", "button", "Next"), "enabled", !H.eq(it, H.countCards()));
    // get the short name of this card
    it = H.prop(H.card($, {rel: "this"}), "short name");
    // if there is a bkgnd btn it
    // then set the hilite of bkgnd btn it to true
    if (H.exists(() => H.part($, "bg", "button", it))) {
      H.setProp(H.part($, "bg", "button", it), "hilite", true);
    }
  });
  // end openCard
  // on arrowKey whichArrow
  H.on(owner, "arrowKey", async function arrowKey($, whichArrow) {
    // if whichArrow is "Right" OR whichArrow is "Down" then
    if ((H.eq(whichArrow, "Right") || H.eq(whichArrow, "Down"))) {
      // click at the loc of bkgnd btn "Next"
      await H.clickAt($, H.prop(H.part($, "bg", "button", "Next"), "loc"), null);
    // else if whichArrow is "Left" OR whichArrow is "Up" then
    } else if ((H.eq(whichArrow, "Left") || H.eq(whichArrow, "Up"))) {
      // click at the loc of bkgnd btn "Previous"
      await H.clickAt($, H.prop(H.part($, "bg", "button", "Previous"), "loc"), null);
    // end if
    }
  });
  // end arrowKey
  // on goTopic
  H.on(owner, "goTopic", async function goTopic($) {
    // go card (the short name of the target)
    await H.go($, {key: H.prop(H.target($), "short name")});
  });
  // end goTopic
  // on checkHCVersion
  H.on(owner, "checkHCVersion", async function checkHCVersion($) {
    // if the version < 2.2 then
    if (H.lt(H.f.version(), 2.2)) {
      // requiresTwoTwoMessage
      await H.call($, "requiresTwoTwoMessage", []);
      // lock messages
      H.setGlobal("lockMessages", true);
      // if the number of lines in the stacks > 1 then close card window
      if (H.gt(H.count("line", H.f.stacks()), 1)) {
        H.unsupported("close card window", "if the number of lines in the stacks > 1 then close card window");
      // else go back
      } else {
        await H.goBack($);
      }
      // exit to HyperCard
      throw H.ABORT;
    // end if
    }
  });
  // end checkHCVersion
  // on requiresTwoTwoMessage -- ∆ Localize the string.
  H.on(owner, "requiresTwoTwoMessage", async function requiresTwoTwoMessage($) {
    let it = "";
    // answer "“" & the short name of this stack & "”" && ¬ "requires version 2.2 of HyperCard or the HyperCard Player." && ¬ "(You’re using version" && the version & ".)"
    it = await H.answer(H.cat("“", H.prop(H.stack(), "short name"), "”", " ", "requires version 2.2 of HyperCard or the HyperCard Player.", " ", "(You’re using version", " ", H.f.version(), ".)"));
  });
  // end requiresTwoTwoMessage
  // on showTextFields
  H.on(owner, "showTextFields", async function showTextFields($) {
    let it = "";
    // get (the environment is "Development")
    it = H.eq(H.f.environment(), "Development");
    // set the visible of fld "Body Dev" to it
    H.setProp(H.part($, null, "field", "Body Dev"), "visible", it);
    // set the visible of fld "Tag Dev" to it
    H.setProp(H.part($, null, "field", "Tag Dev"), "visible", it);
    // set the visible of fld "Body Player" to not it
    H.setProp(H.part($, null, "field", "Body Player"), "visible", !H.bool(it));
    // set the visible of fld "Tag Player" to not it
    H.setProp(H.part($, null, "field", "Tag Player"), "visible", !H.bool(it));
  });
  // end showTextFields
}

// ---- script 2: bkgnd-2619/button-1 "Welcome"; bkgnd-2619/button-4 "Introduction"; bkgnd-2619/button-13 "HyperCard"; ... (10 owners)
function script2(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // goTopic
    await H.call($, "goTopic", []);
  });
  // end mouseUp
}

// ---- script 3: bkgnd-2619/button-21 "Previous"
function script3(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // goPrev
    await H.call($, "goPrev", []);
  });
  // end mouseUp
  // on goPrev
  H.on(owner, "goPrev", async function goPrev($) {
    // go previous card
    await H.go($, {rel: "prev"});
  });
  // end goPrev
}

// ---- script 4: bkgnd-2619/button-22 "Next"
function script4(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // goNext
    await H.call($, "goNext", []);
  });
  // end mouseUp
  // on goNext
  H.on(owner, "goNext", async function goNext($) {
    // go next card
    await H.go($, {rel: "next"});
  });
  // end goNext
}

// ---- script 5: card-5608/button-2 "Standard"
function script5(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let pitch = "", note = "";
    // play stop
    H.playStop();
    // put max(2,(min(5,random(5)))) into pitch -- get a pitch between 2 and 5
    pitch = H.f.max(2, H.f.min(5, H.f.random(5)));
    // put "g" & pitch into note
    note = H.cat("g", pitch);
    // play harpsichord note
    H.play("harpsichord", null, note);
  });
  // end mouseUp
}

// ---- script 6: card-5608/button-4 "Radio Button"
function script6(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // play flute
    H.play("flute", null, "");
  });
  // end mouseDown
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play flute
    H.play("flute", null, "");
  });
  // end mouseUp
}

// ---- script 7: card-5608/button-5 ""
function script7(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord a
    H.play("harpsichord", null, "a");
  });
  // end mouseUp
}

// ---- script 8: card-5608/button-6 ""
function script8(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord b
    H.play("harpsichord", null, "b");
  });
  // end mouseUp
}

// ---- script 9: card-5608/button-7 ""
function script9(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord c
    H.play("harpsichord", null, "c");
  });
  // end mouseUp
}

// ---- script 10: card-5608/button-8 ""
function script10(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // play harpsichord a2s
    H.play("harpsichord", null, "a2s");
  });
  // end mouseDown
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord c3s
    H.play("harpsichord", null, "c3s");
  });
  // end mouseUp
}

// ---- script 11: card-5608/button-9 "Hilite"
function script11(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play flute b2e c3e d2e f3e g2e
    H.play("flute", null, "b2e c3e d2e f3e g2e");
  });
  // end mouseUp
}

// ---- script 12: card-5608/button-10 "Hilite"
function script12(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord tempo 150 b4e c5e d3e f4e g3q
    H.play("harpsichord", 150, "b4e c5e d3e f4e g3q");
  });
  // end mouseUp
}

// ---- script 13: card-5608/button-11 "Hilite"
function script13(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play flute d3s
    H.play("flute", null, "d3s");
  });
  // end mouseUp
}

// ---- script 14: card-5608/button-12 "Hilite"
function script14(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play flute d4s
    H.play("flute", null, "d4s");
  });
  // end mouseUp
}

// ---- script 15: card-5608/button-13 "Letter"
function script15(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play boing tempo 1000 a b a b a bw
    H.play("boing", 1000, "a b a b a bw");
  });
  // end mouseUp
}

// ---- script 16: card-5608/button-14 "Hilite"
function script16(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord tempo 300 a#2q c3w
    H.play("harpsichord", 300, "a#2q c3w");
  });
  // end mouseUp
}

// ---- script 17: card-5608/button-15 "Hilite"
function script17(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // play harpsichord tempo 300 c#4q g#3q
    H.play("harpsichord", 300, "c#4q g#3q");
  });
  // end mouseUp
}

// ---- script 18: card-6449/button-2 "Next"
function script18(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go Home
    await H.goHome($);
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-2619");  // background bkgnd-2619 "Content"
script2("bkgnd-2619/button-1");  // bkgnd-2619/button-1 "Welcome"
script2("bkgnd-2619/button-4");  // bkgnd-2619/button-4 "Introduction"
script2("bkgnd-2619/button-13");  // bkgnd-2619/button-13 "HyperCard"
script2("bkgnd-2619/button-14");  // bkgnd-2619/button-14 "What's Next"
script2("bkgnd-2619/button-15");  // bkgnd-2619/button-15 "Stacks"
script2("bkgnd-2619/button-16");  // bkgnd-2619/button-16 "Cards"
script2("bkgnd-2619/button-17");  // bkgnd-2619/button-17 "Buttons"
script2("bkgnd-2619/button-18");  // bkgnd-2619/button-18 "Home"
script2("bkgnd-2619/button-19");  // bkgnd-2619/button-19 "More Stacks"
script2("bkgnd-2619/button-20");  // bkgnd-2619/button-20 "Creating Stacks"
script3("bkgnd-2619/button-21");  // bkgnd-2619/button-21 "Previous"
script4("bkgnd-2619/button-22");  // bkgnd-2619/button-22 "Next"
script5("card-5608/button-2");  // card-5608/button-2 "Standard"
script6("card-5608/button-4");  // card-5608/button-4 "Radio Button"
script7("card-5608/button-5");  // card-5608/button-5 ""
script8("card-5608/button-6");  // card-5608/button-6 ""
script9("card-5608/button-7");  // card-5608/button-7 ""
script10("card-5608/button-8");  // card-5608/button-8 ""
script11("card-5608/button-9");  // card-5608/button-9 "Hilite"
script12("card-5608/button-10");  // card-5608/button-10 "Hilite"
script13("card-5608/button-11");  // card-5608/button-11 "Hilite"
script14("card-5608/button-12");  // card-5608/button-12 "Hilite"
script15("card-5608/button-13");  // card-5608/button-13 "Letter"
script16("card-5608/button-14");  // card-5608/button-14 "Hilite"
script17("card-5608/button-15");  // card-5608/button-15 "Hilite"
script18("card-6449/button-2");  // card-6449/button-2 "Next"
};
