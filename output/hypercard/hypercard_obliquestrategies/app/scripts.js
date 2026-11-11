// HyperTalk scripts of Oblique Strategies (Oblique Strategies.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // on openStack
  H.on(owner, "openStack", async function openStack($) {
    // hide titleBar
    H.hideBar("titlebar");
    // set userlevel to 1
    H.setGlobal("userLevel", 1);
    // visual effect dissolve
    H.visual("dissolve");
    // wait 1 second
    await H.wait(1 * 60);
    // go card 2
    await H.go($, {key: 2});
  });
  // end openStack
}

// ---- script 1: bkgnd-2648/button-5 "New Button"
function script1(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let randomcardVar = "";
    // visual effect dissolve slowly
    H.visual("dissolve slowly");
    // put the random of 127 into randomcardVar
    randomcardVar = H.f.random(127);
    // add 3 to randomcardVar
    randomcardVar = H.num(randomcardVar) + 3;
    // go to card randomcardVar
    await H.go($, {key: randomcardVar});
  });
  // end mouseUp
}

// ---- script 2: bkgnd-2648/button-7 "New Button 2"
function script2(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect wipe left very slowly
    H.visual("wipe left very slowly");
    // if the number of this card is 130¬ or the number of this card is 2 then
    if ((H.eq(H.prop(H.card($, {rel: "this"}), "number"), 130) || H.eq(H.prop(H.card($, {rel: "this"}), "number"), 2))) {
      // go card 4
      await H.go($, {key: 4});
    // else
    } else {
      // go next card
      await H.go($, {rel: "next"});
    // end if
    }
  });
  // end mouseUp
}

// ---- script 3: bkgnd-2648/button-8 "New Button"
function script3(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect wipe right very slowly
    H.visual("wipe right very slowly");
    // if the number of this card is 4¬ or the number of this card is 2 then
    if ((H.eq(H.prop(H.card($, {rel: "this"}), "number"), 4) || H.eq(H.prop(H.card($, {rel: "this"}), "number"), 2))) {
      // go last card
      await H.go($, {rel: "last"});
    // else
    } else {
      // go previous card
      await H.go($, {rel: "prev"});
    // end if
    }
  });
  // end mouseUp
}

// ---- script 4: bkgnd-2648/button-9 "New Button"
function script4(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect dissolve slowly
    H.visual("dissolve slowly");
    // go card 2
    await H.go($, {key: 2});
  });
  // end mouseUp
}

// ---- script 5: card-69896/button-4 "New Button"
function script5(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // answer "Leave Oblique Strategies?" with "No" or "Yes"
    it = await H.answer("Leave Oblique Strategies?", ["No", "Yes"]);
    // if the value of it is "yes" then
    if (H.eq(H.f.value(it), "yes")) {
      // doMenu "Quit HyperCard"
      await H.doMenu($, "Quit HyperCard");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 6: card-69896/button-3 "New Button"
function script6(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect dissolve very slowly
    H.visual("dissolve very slowly");
    // go to card 3
    await H.go($, {key: 3});
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-2648/button-5");  // bkgnd-2648/button-5 "New Button"
script2("bkgnd-2648/button-7");  // bkgnd-2648/button-7 "New Button 2"
script3("bkgnd-2648/button-8");  // bkgnd-2648/button-8 "New Button"
script4("bkgnd-2648/button-9");  // bkgnd-2648/button-9 "New Button"
script5("card-69896/button-4");  // card-69896/button-4 "New Button"
script6("card-69896/button-3");  // card-69896/button-3 "New Button"
};
