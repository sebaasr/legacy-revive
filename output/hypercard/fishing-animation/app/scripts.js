// HyperTalk scripts of Fishing (Fishing.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: card-2923/button-1 "Click Me to Begin"
function script0(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // speak "Gee, Maria, the fish aren't biting today!"
    H.speak("Gee, Maria, the fish aren't biting today!", "");
    // wait 300
    await H.wait(300);
    // visual effect dissolve very fast
    H.visual("dissolve very fast");
    // go to card "2"
    await H.go($, {key: "2"});
  });
  // end mouseUp
}

// ---- script 1: card-3598/button-1 "Click Me Again"
function script1(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // speak "Well, let's throw this electric fan into the water, and maybe we can fry the fishes!" with female voice
    H.speak("Well, let's throw this electric fan into the water, and maybe we can fry the fishes!", "female voice");
    // wait 200
    await H.wait(200);
    // visual effect dissolve very fast
    H.visual("dissolve very fast");
    // go to card "3"
    await H.go($, {key: "3"});
    // wait 400
    await H.wait(400);
    // visual effect dissolve very fast
    H.visual("dissolve very fast");
    // go to card "4"
    await H.go($, {key: "4"});
    // wait 400
    await H.wait(400);
    // visual effect dissolve very fast
    H.visual("dissolve very fast");
    // go to card "5"
    await H.go($, {key: "5"});
    // repeat 20
    for (let n1 = 20; n1 > 0; n1--) {
      await H.tick();
      // visual effect dissolve very fast
      H.visual("dissolve very fast");
      // go next
      await H.go($, {rel: "next"});
    // end repeat
    }
    // wait 100
    await H.wait(100);
    // visual effect stretch from bottom very slow
    H.visual("stretch from bottom very slow");
    // go to card "edn"
    await H.go($, {key: "edn"});
    // speak "The end!"
    H.speak("The end!", "");
    // play "MJW"
    H.play("MJW", null, "");
    // wait 300 ticks
    await H.wait(300);
    // visual effect stretch from center very slow
    H.visual("stretch from center very slow");
    // go to card "as"
    await H.go($, {key: "as"});
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0("card-2923/button-1");  // card-2923/button-1 "Click Me to Begin"
script1("card-3598/button-1");  // card-3598/button-1 "Click Me Again"
};
