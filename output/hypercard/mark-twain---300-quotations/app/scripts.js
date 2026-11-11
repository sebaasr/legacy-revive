// HyperTalk scripts of Mark Twain (Mark Twain.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // on closeStack
  H.on(owner, "closeStack", async function closeStack($) {
    // global lastfound
    /* shared: H.g.lastfound */
    // put empty into lastfound
    H.g.lastfound = "";
    // set the locktext of background field "quotation" to true
    H.setProp(H.part($, "bg", "field", "quotation"), "lockText", true);
    // show background field "intro"
    H.show(H.part($, "bg", "field", "intro"));
    // pass closeStack
    return H.PASS;
  });
  // end closeStack
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // if the visible of background field "intro" is true then
    if (H.eq(H.prop(H.part($, "bg", "field", "intro"), "visible"), true)) {
      // animate
      await H.call($, "animate", []);
      // lock screen
      H.lockScreen();
      // go to any card in background quotations
      await H.go($, {rel: "any", bg: {key: "quotations"}});
      // hide background field "intro"
      H.hide(H.part($, "bg", "field", "intro"));
      // unlock screen with dissolve very fast
      await H.unlockScreen("dissolve very fast");
    // else
    } else {
      // animate
      await H.call($, "animate", []);
      // visual effect dissolve very fast
      H.visual("dissolve very fast");
      // go to any card in background quotations
      await H.go($, {rel: "any", bg: {key: "quotations"}});
    // end if
    }
  });
  // end mouseUp
  // on animate
  H.on(owner, "animate", async function animate($) {
    // lock screen
    H.lockScreen();
    // go to card 1 of background "animation"
    await H.go($, {key: 1, bg: {key: "animation"}});
    // unlock screen
    await H.unlockScreen();
    // repeat 2
    for (let n1 = 2; n1 > 0; n1--) {
      await H.tick();
      // go next
      await H.go($, {rel: "next"});
      // wait 1
      await H.wait(1);
      // go back
      await H.goBack($);
      // wait 1
      await H.wait(1);
    // end repeat
    }
    // push card
    H.pushCard();
    // wait 10
    await H.wait(10);
    // go to last card
    await H.go($, {rel: "last"});
    // wait 4
    await H.wait(4);
    // pop card
    await H.popCard($);
  });
  // end animate
  // on arrowKey
  H.on(owner, "arrowKey", async function arrowKey($) {
    let it = "";
    // get param(1)
    it = H.f.param($, 1);
    // if it is "left" then
    if (H.eq(it, "left")) {
      // visual wipe right fast
      H.visual("wipe right fast");
      // go to previous card in this background
      await H.go($, {rel: "prev", bg: {rel: "this"}});
    // else if it is "right" then
    } else if (H.eq(it, "right")) {
      // visual wipe left fast
      H.visual("wipe left fast");
      // go to next card in this background
      await H.go($, {rel: "next", bg: {rel: "this"}});
    // else exit arrowKey
    } else {
      return;
    }
  });
  // end arrowKey
  // on hypertext
  H.on(owner, "hypertext", async function hypertext($) {
    let it = "";
    // if word 2 of the clickline > the number of lines in background field quotation then send mouseUp to this card
    if (H.gt(H.chunk(H.f.clickLine(), [["word", 2]]), H.count("line", H.value(H.part($, "bg", "field", "quotation"))))) {
      await H.send($, "mouseUp", H.card($, {rel: "this"}));
    // else if the clicktext is empty then send mouseUp to this card
    } else if (H.eq(H.f.clickText(), "")) {
      await H.send($, "mouseUp", H.card($, {rel: "this"}));
    // else
    } else {
      // select the clickchunk
      H.selectChunk(H.f.clickChunk());
      // lock screen
      H.lockScreen();
      // get the selection
      it = H.f.selection();
      // go next
      await H.go($, {rel: "next"});
      // find whole it
      await H.find($, it, "whole", null);
      // unlock screen with dissolve very fast
      await H.unlockScreen("dissolve very fast");
    // end if
    }
  });
  // end hypertext
  // on copyQuote
  H.on(owner, "copyQuote", async function copyQuote($) {
    let temp = "";
    // if the visible of background field "intro" is true then
    if (H.eq(H.prop(H.part($, "bg", "field", "intro"), "visible"), true)) {
      // lock screen
      H.lockScreen();
      // hide background field "intro"
      H.hide(H.part($, "bg", "field", "intro"));
      // unlock screen with dissolve very fast
      await H.unlockScreen("dissolve very fast");
    // end if
    }
    // put background field "quotation" into temp
    temp = H.value(H.part($, "bg", "field", "quotation"));
    // select text in background field "quotation"
    H.select(H.part($, "bg", "field", "quotation"), null, "on");
    // lock screen
    H.lockScreen();
    // select empty
    H.select(null);
    // put return & return & "Mark Twain" after last line of background field "quotation"
    H.putInto(H.part($, "bg", "field", "quotation"), H.cat("\n", "\n", "Mark Twain"), "after", [["line", "last"]]);
    // select text in background field quotation
    H.select(H.part($, "bg", "field", "quotation"), null, "on");
    // doMenu "copy text"
    await H.doMenu($, "copy text");
    // put temp into background field "quotation"
    H.putInto(H.part($, "bg", "field", "quotation"), temp, "into");
    // unlock screen
    await H.unlockScreen();
  });
  // end copyQuote
  // on findit
  H.on(owner, "findit", async function findit($) {
    let it = "", temp = "";
    // global lastfound
    /* shared: H.g.lastfound */
    // ask "Find what?" & return & "(hit return to find more instances)" with lastfound
    it = await H.ask(H.cat("Find what?", "\n", "(hit return to find more instances)"), H.g.lastfound);
    // if it is empty then exit findit
    if (H.eq(it, "")) {
      return;
    // else put it into lastfound
    } else {
      H.g.lastfound = it;
    }
    // if the visible of background field "intro" is true then
    if (H.eq(H.prop(H.part($, "bg", "field", "intro"), "visible"), true)) {
      // lock screen
      H.lockScreen();
      // hide background field "intro"
      H.hide(H.part($, "bg", "field", "intro"));
      // unlock screen with dissolve very fast
      await H.unlockScreen("dissolve very fast");
    // end if
    }
    // find it
    await H.find($, it, "normal", null);
    // if the result is "not found" then answer "Sorry," && lastfound && "not found."
    if (H.eq(H.f.result(), "not found")) {
      it = await H.answer(H.cat("Sorry,", " ", H.g.lastfound, " ", "not found."));
    // else
    } else {
      // put the loc of message into temp
      temp = H.prop(H.msgBox(), "loc");
      // set the loc of message to -10000, -10000
      H.setProp(H.msgBox(), "loc", H.cat(-10000, ",", -10000));
      // put "Find" && quote & lastfound & quote
      H.putInto(H.msgBox(), H.cat("Find", " ", "\"", H.g.lastfound, "\""), "into");
      // hide message
      H.hide(H.msgBox());
      // set the loc of message to temp
      H.setProp(H.msgBox(), "loc", temp);
    // end if
    }
  });
  // end findit
  // on about
  H.on(owner, "about", async function about($) {
    let it = "";
    // answer "Mark Twain" & return & ¬ "Version 3.0 " && the number of cards && "quotations" & return & ¬ "© 1995  Anne & Richard Wanderman" & return & ¬ "______________________________________" & return & ¬ "Mark Twain is shareware. Fee: $5." & return & ¬ "Please register this software if you keep it." & return & ¬ "Please distribute this software." & return & return & ¬ "Thank you." with "OK" or "More"
    it = await H.answer(H.cat("Mark Twain", "\n", "Version 3.0 ", " ", H.countCards(), " ", "quotations", "\n", "© 1995  Anne & Richard Wanderman", "\n", "______________________________________", "\n", "Mark Twain is shareware. Fee: $5.", "\n", "Please register this software if you keep it.", "\n", "Please distribute this software.", "\n", "\n", "Thank you."), ["OK", "More"]);
    // if it is "More" then
    if (H.eq(it, "More")) {
      // answer "For a catalog of other inexpensive, useful, educational, and fun stacks, contact:" & return & ¬ "______________________________________" & return & ¬ "Poor Richard's Publishing" & return & ¬ "P.O. Box 1075" & return & ¬ "Litchfield, CT  06759" & return & ¬ "203/567-4307" & return & ¬ "rwanderman@aol.com" & return & ¬ "http://www.tiac.net/users/poorrich/" with "OK" or "More"
      it = await H.answer(H.cat("For a catalog of other inexpensive, useful, educational, and fun stacks, contact:", "\n", "______________________________________", "\n", "Poor Richard's Publishing", "\n", "P.O. Box 1075", "\n", "Litchfield, CT  06759", "\n", "203/567-4307", "\n", "rwanderman@aol.com", "\n", "http://www.tiac.net/users/poorrich/"), ["OK", "More"]);
      // if it is "More" then
      if (H.eq(it, "More")) {
        // answer "Help" & return & ¬ "_____________________________________" & return & return & ¬ "• Upper left: About this stack." & return & ¬ "• Upper right: Lock/unlock quotation." & return & ¬ "• Lower left: Find quotation." & return & ¬ "• Lower right: Copy quotation." & return & ¬ "• Click picture for random quotation." & return & ¬ "• Click words (field locked) - hypertext."
        it = await H.answer(H.cat("Help", "\n", "_____________________________________", "\n", "\n", "• Upper left: About this stack.", "\n", "• Upper right: Lock/unlock quotation.", "\n", "• Lower left: Find quotation.", "\n", "• Lower right: Copy quotation.", "\n", "• Click picture for random quotation.", "\n", "• Click words (field locked) - hypertext."));
      // end if
      }
    // end if
    }
  });
  // end about
}

// ---- script 1: bkgnd-2750/field-5 "quotation"
function script1(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // hyperText
    await H.call($, "hyperText", []);
  });
  // end mouseUp
}

// ---- script 2: bkgnd-2750/button-27 ""
function script2(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // about
    await H.call($, "about", []);
  });
  // end mouseUp
}

// ---- script 3: bkgnd-2750/button-28 ""
function script3(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // if the visible of background field "intro" is true then
    if (H.eq(H.prop(H.part($, "bg", "field", "intro"), "visible"), true)) {
      // lock screen
      H.lockScreen();
      // hide background field "intro"
      H.hide(H.part($, "bg", "field", "intro"));
      // unlock screen with dissolve very fast
      await H.unlockScreen("dissolve very fast");
    // end if
    }
    // set the locktext of background field 1 to not the locktext of background field 1
    H.setProp(H.part($, "bg", "field", 1), "lockText", !H.bool(H.prop(H.part($, "bg", "field", 1), "lockText")));
  });
  // end mouseUp
}

// ---- script 4: bkgnd-2750/button-29 ""
function script4(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // findit
    await H.call($, "findit", []);
  });
  // end mouseUp
}

// ---- script 5: bkgnd-2750/button-30 ""
function script5(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // copyquote
    await H.call($, "copyquote", []);
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-2750/field-5");  // bkgnd-2750/field-5 "quotation"
script2("bkgnd-2750/button-27");  // bkgnd-2750/button-27 ""
script3("bkgnd-2750/button-28");  // bkgnd-2750/button-28 ""
script4("bkgnd-2750/button-29");  // bkgnd-2750/button-29 ""
script5("bkgnd-2750/button-30");  // bkgnd-2750/button-30 ""
};
