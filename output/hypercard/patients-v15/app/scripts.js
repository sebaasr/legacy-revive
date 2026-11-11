// HyperTalk scripts of PATIENTS _  Version 1.5 (PATIENTS _  Version 1.5.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // ON CC
  H.on(owner, "CC", async function CC($) {
    // SEND MOUSEUP TO BKGND BUTTON "CC"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "CC"));
  });
  // END CC
  // ON IM
  H.on(owner, "IM", async function IM($) {
    // SEND MOUSEUP TO BKGND BUTTON "IMP"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "IMP"));
  });
  // END IM
  // ON DI
  H.on(owner, "DI", async function DI($) {
    // SEND MOUSEUP TO BKGND BUTTON "DISP"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "DISP"));
  });
  // END DI
  // ON N
  H.on(owner, "N", async function N($) {
    // SEND MOUSEUP TO BKGND BUTTON "NEW PATIENT"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "NEW PATIENT"));
  });
  // END N
  // ON R
  H.on(owner, "R", async function R($) {
    // SEND MOUSEUP TO BKGND BUTTON "RETURN"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "RETURN"));
  });
  // END R
  // ON P
  H.on(owner, "P", async function P($) {
    // SEND MOUSEUP TO BKGND BUTTON "PRINT"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "PRINT"));
  });
  // END P
  // ON F
  H.on(owner, "F", async function F($) {
    // SEND MOUSEUP TO BKGND BUTTON "FIND"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "FIND"));
  });
  // END F
  // ON openStack
  H.on(owner, "openStack", async function openStack($) {
    let it = "";
    // SET LOCKSCREEN TO TRUE
    H.setGlobal("lockScreen", true);
    // SET LOCKMESSAGES TO TRUE
    H.setGlobal("lockMessages", true);
    // GLOBAL HOPROBLEMLIST,HOPROBLEMLIST1,NFUMALE,NFUFEM,EXTEMALE,EXTEFEM
    /* shared: H.g.hoproblemlist, H.g.hoproblemlist1, H.g.nfumale, H.g.nfufem, H.g.extemale, H.g.extefem */
    // GO TO CARD ID 260168
    await H.go($, {id: 260168});
    // GET FIELD "MENU HOLDER"
    it = H.value(H.part($, null, "field", "MENU HOLDER"));
    // PUT IT INTO HOPROBLEMLIST
    H.g.hoproblemlist = it;
    // GO TO CARD ID 4434
    await H.go($, {id: 4434});
    // GET FIELD "MENU HOLDER"
    it = H.value(H.part($, null, "field", "MENU HOLDER"));
    // PUT IT INTO HOPROBLEMLIST1
    H.g.hoproblemlist1 = it;
    // GO TO CARD ID 69212
    await H.go($, {id: 69212});
    // PUT CD FLD "NFUFEM" INTO NFUFEM
    H.g.nfufem = H.value(H.part($, "card", "field", "NFUFEM"));
    // PUT CD FLD "NFUMALE" INTO NFUMALE
    H.g.nfumale = H.value(H.part($, "card", "field", "NFUMALE"));
    // PUT CD FLD "EXTEMALE" INTO EXTEMALE
    H.g.extemale = H.value(H.part($, "card", "field", "EXTEMALE"));
    // PUT CD FLD "EXTEFEM" INTO EXTEFEM
    H.g.extefem = H.value(H.part($, "card", "field", "EXTEFEM"));
    // GO TO CARD ID 227564
    await H.go($, {id: 227564});
    // PUSH CARD
    H.pushCard();
    // hide message box
    H.hide(H.msgBox());
    // SET LOCKSCREEN TO FALSE
    H.setGlobal("lockScreen", false);
    // SET LOCKMESSAGES TO FALSE
    H.setGlobal("lockMessages", false);
    // IF THERE IS NOT A MENU "PROCEDURE"
    // THEN
    if (H.unsupported("if", "IF THERE IS NOT A MENU \"PROCEDURE\"")) {
      // CREATE MENU "Procedure"
      H.unsupported("create menu", "CREATE MENU \"Procedure\"");
      // put "Colonoscopy,EGD"¬ into  MENU "PROCEDURE" WITH MENUMSGS "LOWER,EGD"
      H.unsupported("menu", "put \"Colonoscopy,EGD\" into  MENU \"PROCEDURE\" WITH MENUMSGS \"LOWER,EGD\"");
    // END IF
    }
  });
  // END OPENSTACK
  // on resume
  H.on(owner, "resume", async function resume($) {
    let it = "";
    // SET LOCKSCREEN TO TRUE
    H.setGlobal("lockScreen", true);
    // SET LOCKMESSAGES TO TRUE
    H.setGlobal("lockMessages", true);
    // GLOBAL HOPROBLEMLIST,HOPROBLEMLIST1,NFUMALE,NFUFEM,EXTEMALE,EXTEFEM
    /* shared: H.g.hoproblemlist, H.g.hoproblemlist1, H.g.nfumale, H.g.nfufem, H.g.extemale, H.g.extefem */
    // GO TO CARD ID 260168
    await H.go($, {id: 260168});
    // GET FIELD "MENU HOLDER"
    it = H.value(H.part($, null, "field", "MENU HOLDER"));
    // PUT IT INTO HOPROBLEMLIST
    H.g.hoproblemlist = it;
    // GO TO CARD ID 4434
    await H.go($, {id: 4434});
    // GET FIELD "MENU HOLDER"
    it = H.value(H.part($, null, "field", "MENU HOLDER"));
    // PUT IT INTO HOPROBLEMLIST1
    H.g.hoproblemlist1 = it;
    // GO TO CARD ID 69212
    await H.go($, {id: 69212});
    // PUT CD FLD "NFUFEM" INTO NFUFEM
    H.g.nfufem = H.value(H.part($, "card", "field", "NFUFEM"));
    // PUT CD FLD "NFUMALE" INTO NFUMALE
    H.g.nfumale = H.value(H.part($, "card", "field", "NFUMALE"));
    // PUT CD FLD "EXTEMALE" INTO EXTEMALE
    H.g.extemale = H.value(H.part($, "card", "field", "EXTEMALE"));
    // PUT CD FLD "EXTEFEM" INTO EXTEFEM
    H.g.extefem = H.value(H.part($, "card", "field", "EXTEFEM"));
    // GO TO CARD ID 227564
    await H.go($, {id: 227564});
    // PUSH CARD
    H.pushCard();
    // hide message box
    H.hide(H.msgBox());
    // SET LOCKSCREEN TO FALSE
    H.setGlobal("lockScreen", false);
    // SET LOCKMESSAGES TO FALSE
    H.setGlobal("lockMessages", false);
    // CREATE MENU "Procedure"
    H.unsupported("create menu", "CREATE MENU \"Procedure\"");
    // put "Colonoscopy,EGD"¬ into  MENU "PROCEDURE" WITH MENUMSGS "LOWER,EGD"
    H.unsupported("menu", "put \"Colonoscopy,EGD\" into  MENU \"PROCEDURE\" WITH MENUMSGS \"LOWER,EGD\"");
  });
  // end resume
  // ON SUSPENDSTACK
  H.on(owner, "SUSPENDSTACK", async function SUSPENDSTACK($) {
    // IF THERE IS A MENU "PROCEDURE" THEN DELETE MENU "Procedure"
    if (H.unsupported("if", "IF THERE IS A MENU \"PROCEDURE\" THEN DELETE MENU \"Procedure\"")) {
      H.unsupported("delete", "IF THERE IS A MENU \"PROCEDURE\" THEN DELETE MENU \"Procedure\"");
    }
    // RESET MENUBAR
    H.unsupported("reset menubar", "RESET MENUBAR");
  });
  // END SUSPENDSTACK
  // ON EGD
  H.on(owner, "EGD", async function EGD($) {
    let it = "", NXTLINE = "";
    // GLOBAL UPPER
    /* shared: H.g.upper */
    // IF FLD "NAME" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "NAME")), "")) {
      // ANSWER "YOU HAVE NOT PUT A PATIENT'S NAME"
      it = await H.answer("YOU HAVE NOT PUT A PATIENT'S NAME");
      // EXIT EGD
      return;
    // END IF
    }
    // IF FLD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU HAVE NOT WRITTEN A NEW NOTE"
      it = await H.answer("YOU HAVE NOT WRITTEN A NEW NOTE");
      // EXIT EGD
      return;
    // END IF
    }
    // IF FLD"IMPRESSION" IS EMPTY AND FLD "DISPOSITION" IS EMPTY
    // THEN
    if ((H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "") && H.eq(H.value(H.part($, null, "field", "DISPOSITION")), ""))) {
      // ANSWER "YOU NEED AN IMP OR A DISP"
      it = await H.answer("YOU NEED AN IMP OR A DISP");
      // EXIT EGD
      return;
    // END IF
    }
    // PUT "WE HAVE DISCUSSED WITH PT. THE PROCEDURE, THE NEED FOR AN EGD AND ITS COMPLICATIONS"¬ INTO UPPER
    H.g.upper = "WE HAVE DISCUSSED WITH PT. THE PROCEDURE, THE NEED FOR AN EGD AND ITS COMPLICATIONS";
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // IF FLD "DISPOSITION" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
      // put UPPER into line NXTLINE of field "TEXT"
      H.putInto(H.part($, null, "field", "TEXT"), H.g.upper, "into", [["line", NXTLINE]]);
    // END IF
    }
    // IF FIELD "DISPOSITION" IS NOT EMPTY
    // THEN
    if (!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
      // SELECT AFTER LAST CHAR OF LINE NXTLINE-3 OF FIELD "TEXT"
      H.select(H.part($, null, "field", "TEXT"), [["line", H.num(NXTLINE) - 3], ["char", "last"]], "after");
      // TYPE RETURN
      await H.type($, "\n");
      // put nextBlankLine("TEXT") into NXTLINE
      NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
      // put UPPER INTO line NXTLINE-3 of field "TEXT"
      H.putInto(H.part($, null, "field", "TEXT"), H.g.upper, "into", [["line", H.num(NXTLINE) - 3]]);
    // END IF
    }
  });
  // END EGD
  // ON LOWER
  H.on(owner, "LOWER", async function LOWER($) {
    let it = "", NXTLINE = "";
    // GLOBAL COLO
    /* shared: H.g.colo */
    // IF FLD "NAME" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "NAME")), "")) {
      // ANSWER "YOU HAVE NOT PUT A PATIENT'S NAME"
      it = await H.answer("YOU HAVE NOT PUT A PATIENT'S NAME");
      // EXIT LOWER
      return;
    // END IF
    }
    // IF FLD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU HAVE NOT WRITTEN A NEW NOTE"
      it = await H.answer("YOU HAVE NOT WRITTEN A NEW NOTE");
      // EXIT LOWER
      return;
    // END IF
    }
    // IF FLD"IMPRESSION" IS EMPTY AND FLD "DISPOSITION" IS EMPTY
    // THEN
    if ((H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "") && H.eq(H.value(H.part($, null, "field", "DISPOSITION")), ""))) {
      // ANSWER "YOU NEED AN IMP OR A DISP"
      it = await H.answer("YOU NEED AN IMP OR A DISP");
      // EXIT LOWER
      return;
    // END IF
    }
    // PUT "WE HAVE DISCUSSED WITH PT. THE PROCEDURE, THE NEED FOR AN COLONOSCOPY AND ITS COMPLICATIONS"¬ INTO COLO
    H.g.colo = "WE HAVE DISCUSSED WITH PT. THE PROCEDURE, THE NEED FOR AN COLONOSCOPY AND ITS COMPLICATIONS";
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // IF FLD "DISPOSITION" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
      // put COLO into line NXTLINE of field "TEXT"
      H.putInto(H.part($, null, "field", "TEXT"), H.g.colo, "into", [["line", NXTLINE]]);
    // END IF
    }
    // IF FIELD "DISPOSITION" IS NOT EMPTY
    // THEN
    if (!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
      // SELECT AFTER LAST CHAR OF LINE NXTLINE-3 OF FIELD "TEXT"
      H.select(H.part($, null, "field", "TEXT"), [["line", H.num(NXTLINE) - 3], ["char", "last"]], "after");
      // TYPE RETURN
      await H.type($, "\n");
      // put nextBlankLine("TEXT") into NXTLINE
      NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
      // put COLO INTO line NXTLINE-3 of field "TEXT"
      H.putInto(H.part($, null, "field", "TEXT"), H.g.colo, "into", [["line", H.num(NXTLINE) - 3]]);
    // END IF
    }
  });
  // END LOWER
  // FUNCTION DATE FLD
  H.fn(owner, "DATE", async function DATE($, FLD) {
    let Z = "";
    // REPEAT WITH Z = NUMBER OF LINES OF FIELD FLD DOWN TO 0
    for (Z of H.range(H.count("line", H.value(H.part($, null, "field", FLD))), 0, -1)) {
      await H.tick();
      // IF "/" IS IN LINE Z OF FIELD FLD
      // THEN
      if (H.contains(H.chunk(H.value(H.part($, null, "field", FLD)), [["line", Z]]), "/")) {
        // EXIT REPEAT
        break;
      // END IF
      }
    // END REPEAT
    }
    // RETURN Z
    return Z;
  });
  // END DATE
  // ON CLOSESTACK
  H.on(owner, "CLOSESTACK", async function CLOSESTACK($) {
    let it = "", SIZE = "";
    // IF THERE IS A MENU "PROCEDURE" THEN DELETE MENU "Procedure"
    if (H.unsupported("if", "IF THERE IS A MENU \"PROCEDURE\" THEN DELETE MENU \"Procedure\"")) {
      H.unsupported("delete", "IF THERE IS A MENU \"PROCEDURE\" THEN DELETE MENU \"Procedure\"");
    }
    // RESET MENUBAR
    H.unsupported("reset menubar", "RESET MENUBAR");
    // GET THE FREESIZE OF THIS STACK
    it = H.prop(H.stack(), "freeSize");
    // PUT IT/1024 INTO SIZE
    SIZE = H.num(it) / 1024;
    // IF SIZE > 25 THEN
    if (H.gt(SIZE, 25)) {
      // PUT "COMPACTING STACK: FREESIZE GREATER THAN 25K"
      H.putInto(H.msgBox(), "COMPACTING STACK: FREESIZE GREATER THAN 25K", "into");
      // SEND "DOMENU COMPACT STACK" TO HYPERCARD
      await H.send($, "DOMENU COMPACT STACK", "hypercard");
      // pass closestack
      return H.PASS;
    // end if
    }
  });
  // END CLOSESTACK
  // function NEXTEMPTYLINE CDFLD
  H.fn(owner, "NEXTEMPTYLINE", async function NEXTEMPTYLINE($, CDFLD) {
    let N = "";
    // if CD field CDFLD is empty then
    if (H.eq(H.value(H.part($, "card", "field", CDFLD)), "")) {
      // return 1
      return 1;
    // end if
    }
    // repeat with N=number of lines of CD field CDFLD down to 1
    for (N of H.range(H.count("line", H.value(H.part($, "card", "field", CDFLD))), 1, -1)) {
      await H.tick();
      // if line N of CD field CDFLD is not empty then exit repeat
      if (!H.eq(H.chunk(H.value(H.part($, "card", "field", CDFLD)), [["line", N]]), "")) {
        break;
      }
    // end repeat
    }
    // return N+1
    return H.num(N) + 1;
  });
  // end NEXTEMPTYLINE
  // function nextBlankLine FLD
  H.fn(owner, "nextBlankLine", async function nextBlankLine($, FLD) {
    let N = "";
    // if field FLD is empty then
    if (H.eq(H.value(H.part($, null, "field", FLD)), "")) {
      // return 1
      return 1;
    // end if
    }
    // repeat with N=number of lines of field FLD down to 1
    for (N of H.range(H.count("line", H.value(H.part($, null, "field", FLD))), 1, -1)) {
      await H.tick();
      // if line N of field FLD is not empty then exit repeat
      if (!H.eq(H.chunk(H.value(H.part($, null, "field", FLD)), [["line", N]]), "")) {
        break;
      }
    // end repeat
    }
    // return N+1
    return H.num(N) + 1;
  });
  // end nextBlankLIne
}

// ---- script 1: background bkgnd-2721 "PATIENT INFO"
function script1(owner) {
  // ON NFUMALE
  H.on(owner, "NFUMALE", async function NFUMALE($) {
    let NXTLINE = "";
    // GLOBAL NFUMALE
    /* shared: H.g.nfumale */
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // PUT FLD "NFUMALE" INTO LINE NXTLINE OF FIELD "TEXT"
    H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "NFUMALE")), "into", [["line", NXTLINE]]);
  });
  // END NFUMALE
  // ON EXTEMALE
  H.on(owner, "EXTEMALE", async function EXTEMALE($) {
    let NXTLINE = "";
    // GLOBAL EXTEMALE
    /* shared: H.g.extemale */
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // PUT FLD "EXTEMALE" INTO LINE NXTLINE OF FIELD "TEXT"
    H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "EXTEMALE")), "into", [["line", NXTLINE]]);
  });
  // END EXTEMALE
  // ON NFUFEM
  H.on(owner, "NFUFEM", async function NFUFEM($) {
    let NXTLINE = "";
    // GLOBAL NFUFEM
    /* shared: H.g.nfufem */
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // PUT FLD "NFUFEM" INTO LINE NXTLINE OF FIELD "TEXT"
    H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "NFUFEM")), "into", [["line", NXTLINE]]);
  });
  // END NFUFEM
  // ON EXTEFEM
  H.on(owner, "EXTEFEM", async function EXTEFEM($) {
    let NXTLINE = "";
    // GLOBAL EXTEFEM
    /* shared: H.g.extefem */
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // PUT FLD "EXTEFEM" INTO LINE NXTLINE OF FIELD "TEXT"
    H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "EXTEFEM")), "into", [["line", NXTLINE]]);
  });
  // END EXTEFEM
  // ON OPENCARD
  H.on(owner, "OPENCARD", async function OPENCARD($) {
    let HLINE = "", HSIZE = "";
    // IF THERE IS NO MENU "PROCEDURE" THEN CREATE MENU "Procedure"
    if (H.unsupported("if", "IF THERE IS NO MENU \"PROCEDURE\" THEN CREATE MENU \"Procedure\"")) {
      H.unsupported("create menu", "IF THERE IS NO MENU \"PROCEDURE\" THEN CREATE MENU \"Procedure\"");
    }
    // put "Colonoscopy,EGD"¬ into  MENU "PROCEDURE" WITH MENUMSGS "LOWER,EGD"
    H.unsupported("menu", "put \"Colonoscopy,EGD\" into  MENU \"PROCEDURE\" WITH MENUMSGS \"LOWER,EGD\"");
    // ENABLE MENU "Procedure"
    H.unsupported("enable menu", "ENABLE MENU \"Procedure\"");
    // GLOBAL NFUMALE, EXTEMALE, NFUFEM,EXTEFEM
    /* shared: H.g.nfumale, H.g.extemale, H.g.nfufem, H.g.extefem */
    // PUT NFUFEM INTO FLD "NFUFEM"
    H.putInto(H.part($, null, "field", "NFUFEM"), H.g.nfufem, "into");
    // PUT NFUMALE INTO FLD "NFUMALE"
    H.putInto(H.part($, null, "field", "NFUMALE"), H.g.nfumale, "into");
    // PUT EXTEMALE INTO FLD "EXTEMALE"
    H.putInto(H.part($, null, "field", "EXTEMALE"), H.g.extemale, "into");
    // PUT EXTEFEM INTO FLD "EXTEFEM"
    H.putInto(H.part($, null, "field", "EXTEFEM"), H.g.extefem, "into");
    // PUT ROUND(NEXTBLANKLINE("TEXT")*.9) INTO HLINE
    HLINE = H.f.round(H.num(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')) * 0.9);
    // PUT THE TEXTHEIGHT OF FLD "TEXT"INTO HSIZE
    HSIZE = H.prop(H.part($, null, "field", "TEXT"), "textHeight");
    // SET SCROLL OF FLD "TEXT" TO HLINE*HSIZE
    H.setProp(H.part($, null, "field", "TEXT"), "scroll", H.num(HLINE) * H.num(HSIZE));
    // IF FLD "NOTES" IS NOT EMPTY THEN SET THE VISIBLE OF BG BUTTON "FLAG" TO TRUE
    if (!H.eq(H.value(H.part($, null, "field", "NOTES")), "")) {
      H.setProp(H.part($, "bg", "button", "FLAG"), "visible", true);
    // ELSE
    } else {
      // SET THE VISIBLE OF BG BUTTON "FLAG" TO FALSE
      H.setProp(H.part($, "bg", "button", "FLAG"), "visible", false);
    // END IF
    }
    // IF FLD "REFERING" IS NOT EMPTY
    // THEN
    if (!H.eq(H.value(H.part($, null, "field", "REFERING")), "")) {
      // SET THE VISIBLE OF FLD "REFERING" TO TRUE
      H.setProp(H.part($, null, "field", "REFERING"), "visible", true);
      // IF THERE IS A BG BUTTON "SHOW REF"
      // THEN
      if (H.exists(() => H.part($, "bg", "button", "SHOW REF"))) {
        // SET THE NAME OF BG BTN "SHOW REF" TO "HIDE REF"
        H.setProp(H.part($, "bg", "button", "SHOW REF"), "name", "HIDE REF");
      // END IF
      }
    // END IF
    }
    // PASS OPENCARD
    return H.PASS;
  });
  // END OPENCARD
  // FUNCTION DATELINE FLD
  H.fn(owner, "DATELINE", async function DATELINE($, FLD) {
    let N = "";
    // REPEAT WITH N=1 TO NUMBER OF LINES OF FIELD FLD
    for (N of H.range(1, H.count("line", H.value(H.part($, null, "field", FLD))))) {
      await H.tick();
      // IF THE DATE IS IN LINE N OF FIELD FLD
      // THEN
      if (H.contains(H.chunk(H.value(H.part($, null, "field", FLD)), [["line", N]]), H.f.date())) {
        // RETURN N
        return N;
      // END IF
      }
    // END REPEAT
    }
  });
  // END DATELINE
  // FUNCTION IMPRESSION FLD
  H.fn(owner, "IMPRESSION", async function IMPRESSION($, FLD) {
    let N = "";
    // REPEAT WITH N=NUMBER OF LINES OF FIELD FLD DOWN TO 1
    for (N of H.range(H.count("line", H.value(H.part($, null, "field", FLD))), 1, -1)) {
      await H.tick();
      // IF "IMP:" IS IN LINE N OF FIELD FLD
      // THEN
      if (H.contains(H.chunk(H.value(H.part($, null, "field", FLD)), [["line", N]]), "IMP:")) {
        // RETURN N-1
        return H.num(N) - 1;
      // END IF
      }
    // END REPEAT
    }
  });
  // END IMPRESSION
  // FUNCTION DISPOSITION FLD
  H.fn(owner, "DISPOSITION", async function DISPOSITION($, FLD) {
    let N = "";
    // REPEAT WITH N=NUMBER OF LINES OF FIELD FLD DOWN TO 1
    for (N of H.range(H.count("line", H.value(H.part($, null, "field", FLD))), 1, -1)) {
      await H.tick();
      // IF "DISP:" IS IN LINE N OF FIELD FLD
      // THEN
      if (H.contains(H.chunk(H.value(H.part($, null, "field", FLD)), [["line", N]]), "DISP:")) {
        // RETURN N-1
        return H.num(N) - 1;
      // END IF
      }
    // END REPEAT
    }
  });
  // END DISPOSITION
  // ON CLOSECARD
  H.on(owner, "CLOSECARD", async function CLOSECARD($) {
    let it = "";
    // set lockMessages to true
    H.setGlobal("lockMessages", true);
    // IF THERE IS A BG BTN "HIDE REF"
    // THEN
    if (H.exists(() => H.part($, "bg", "button", "HIDE REF"))) {
      // SET THE NAME OF BG BTN "HIDE REF" TO "SHOW REF"
      H.setProp(H.part($, "bg", "button", "HIDE REF"), "name", "SHOW REF");
      // SET THE VISIBLE OF FLD "REFERING" TO FALSE
      H.setProp(H.part($, null, "field", "REFERING"), "visible", false);
    // END IF
    }
    // GET FLD "SEX"
    it = H.value(H.part($, null, "field", "SEX"));
    // IF IT IS EMPTY THEN ANSWER "YOU HAVE NOT SPECIFIED A SEX"
    if (H.eq(it, "")) {
      it = await H.answer("YOU HAVE NOT SPECIFIED A SEX");
    }
    // GET FIELD "NAME"
    it = H.value(H.part($, null, "field", "NAME"));
    // IF IT IS EMPTY THEN
    if (H.eq(it, "")) {
      // ANSWER "NAME IS NOT COMPLETE, DELETE THIS CARD?" WITH "YES" OR "NO
      it = await H.answer("NAME IS NOT COMPLETE, DELETE THIS CARD?", ["YES", "NO"]);
      // IF IT IS "YES" THEN SEND "DOMENU DELETE CARD" TO HYPERCARD
      if (H.eq(it, "YES")) {
        await H.send($, "DOMENU DELETE CARD", "hypercard");
      }
      // IF IT IS "NO" THEN EXIT CLOSECARD
      if (H.eq(it, "NO")) {
        return;
      }
    // END IF
    }
    // set lockMessages to FALSE
    H.setGlobal("lockMessages", false);
  });
  // END CLOSECARD
  // function NEXTEMPTYLINE CDFLD
  H.fn(owner, "NEXTEMPTYLINE", async function NEXTEMPTYLINE($, CDFLD) {
    let N = "";
    // if CD field CDFLD is empty then
    if (H.eq(H.value(H.part($, "card", "field", CDFLD)), "")) {
      // return 1
      return 1;
    // end if
    }
    // repeat with N=number of lines of CD field CDFLD down to 1
    for (N of H.range(H.count("line", H.value(H.part($, "card", "field", CDFLD))), 1, -1)) {
      await H.tick();
      // if line N of CD field CDFLD is not empty then exit repeat
      if (!H.eq(H.chunk(H.value(H.part($, "card", "field", CDFLD)), [["line", N]]), "")) {
        break;
      }
    // end repeat
    }
    // return N+1
    return H.num(N) + 1;
  });
  // end NEXTEMPTYLINE
  // function nextBlankLine FLD
  H.fn(owner, "nextBlankLine", async function nextBlankLine($, FLD) {
    let N = "";
    // if field FLD is empty then
    if (H.eq(H.value(H.part($, null, "field", FLD)), "")) {
      // return 1
      return 1;
    // end if
    }
    // repeat with N=number of lines of field FLD down to 1
    for (N of H.range(H.count("line", H.value(H.part($, null, "field", FLD))), 1, -1)) {
      await H.tick();
      // if line N of field FLD is not empty then exit repeat
      if (!H.eq(H.chunk(H.value(H.part($, null, "field", FLD)), [["line", N]]), "")) {
        break;
      }
    // end repeat
    }
    // return N+1
    return H.num(N) + 1;
  });
  // end nextBlankLIne
}

// ---- script 2: bkgnd-2721/button-21 "Next"
function script2(owner) {
  // ON MOUSEUP
  H.on(owner, "MOUSEUP", async function MOUSEUP($) {
    // VISUAL WIPE left
    H.visual("WIPE left");
    // go to next card of this bg
    await H.go($, {rel: "next", bg: {rel: "this"}});
  });
  // end mouseUp
}

// ---- script 3: bkgnd-2721/button-22 "Prev"
function script3(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // VISUAL WIPE right
    H.visual("WIPE right");
    // go to prev card of this background
    await H.go($, {rel: "prev", bg: {rel: "this"}});
  });
  // end mouseUp
}

// ---- script 4: bkgnd-2721/button-34 "RETURN"
function script4(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect dissolve to black
    H.visual("dissolve to black");
    // go to first card of bg "Title"
    await H.go($, {rel: "first", bg: {key: "Title"}});
  });
  // end mouseUp
}

// ---- script 5: bkgnd-2721/field-35 "Name"
function script5(owner) {
  // (no handlers: the script only holds comments or text)
}

// ---- script 6: bkgnd-2721/field-36 "DOB"
function script6(owner) {
  // ON MOUSEWITHIN
  H.on(owner, "MOUSEWITHIN", async function MOUSEWITHIN($) {
    let it = "";
    // IF FLD "DOB"IS NOT EMPTY THEN EXIT MOUSEWITHIN
    if (!H.eq(H.value(H.part($, null, "field", "DOB")), "")) {
      return;
    // ELSE
    } else {
      // PUT "PUT DOB" INTO FLD "DOB"
      H.putInto(H.part($, null, "field", "DOB"), "PUT DOB", "into");
      // WAIT  UNTIL THE MOUSECLICK
      await H.waitUntil(async () => H.bool(H.f.mouseClick()));
      // PUT EMPTY INTO FLD "DOB"
      H.putInto(H.part($, null, "field", "DOB"), "", "into");
      // ANSWER"CLICK ON NAME AND PRESS TAB TO ENTER DOB"
      it = await H.answer("CLICK ON NAME AND PRESS TAB TO ENTER DOB");
    // END IF
    }
  });
  // END MOUSEWITHIN
  // ON CLOSEFIELD
  H.on(owner, "CLOSEFIELD", async function CLOSEFIELD($) {
    let it = "";
    // IF FLD "DOB" IS NOT A DATE
    // THEN
    if (!H.isA(H.value(H.part($, null, "field", "DOB")), "date")) {
      // ANSWER "YOU HANE NOT ENTERED A VALID DATE FOR DOB"
      it = await H.answer("YOU HANE NOT ENTERED A VALID DATE FOR DOB");
      // PUT EMPTY INTO ME
      H.putInto(H.me($), "", "into");
      // SELECT TEXT OF ME
      H.select(H.me($), null, "on");
    // ELSE
    } else {
      // PASS CLOSEFIELD
      return H.PASS;
    // END IF
    }
  });
  // END CLOSEFIELD
}

// ---- script 7: bkgnd-2721/field-51 "MEDICATION"; bkgnd-2721/field-106 "PROBLEMS"
function script7(owner) {
  // on closeField
  H.on(owner, "closeField", async function closeField($) {
    let PROBS = "", N = "", it = "";
    // put me into PROBS
    PROBS = H.value(H.me($));
    // repeat with N=1 to the number of lines of PROBS
    for (N of H.range(1, H.count("line", PROBS))) {
      await H.tick();
      // get line N of PROBS
      it = H.chunk(PROBS, [["line", N]]);
      // repeat forever
      while (true) {
        await H.tick();
        // if char 1 of it ≠ " " then exit repeat
        if (!H.eq(H.chunk(it, [["char", 1]]), " ")) {
          break;
        }
        // delete char 1 of it
        it = H.del(it, [["char", 1]]);
      // end repeat
      }
      // repeat forever
      while (true) {
        await H.tick();
        // if last char of it ≠ " " then exit repeat
        if (!H.eq(H.chunk(it, [["char", "last"]]), " ")) {
          break;
        }
        // delete last char of it
        it = H.del(it, [["char", "last"]]);
      // end repeat
      }
      // put it into line N of PROBS
      PROBS = H.put(PROBS, it, "into", [["line", N]]);
    // end repeat
    }
    // repeat with N=the number of lines of PROBS down to 1
    for (N of H.range(H.count("line", PROBS), 1, -1)) {
      await H.tick();
      // get line N of PROBS
      it = H.chunk(PROBS, [["line", N]]);
      // if it is empty then
      if (H.eq(it, "")) {
        // delete line N of PROBS
        PROBS = H.del(PROBS, [["line", N]]);
      // end if
      }
    // end repeat
    }
    // put PROBS into me
    H.putInto(H.me($), PROBS, "into");
  });
  // end closeField
}

// ---- script 8: bkgnd-2721/button-64 "New Patient"
function script8(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // get field "Name"  --do not allow new patient if first not complete
    it = H.value(H.part($, null, "field", "Name"));
    // if it is not empty then
    if (!H.eq(it, "")) {
      // send "doMenu New card" to HyperCard
      await H.send($, "doMenu New card", "hypercard");
    // end if
    }
    // select after text of field "Name"
    H.select(H.part($, null, "field", "Name"), null, "after");
  });
  // end mouseUp
}

// ---- script 9: bkgnd-2721/button-65 "Sort"
function script9(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // put "Sorting patients..."
    H.putInto(H.msgBox(), "Sorting patients...", "into");
    // sort by LAST WORD OF field "NAME"
    H.unsupported("sort cards", "sort by LAST WORD OF field \"NAME\"");
    // put "Compacting patients..."
    H.putInto(H.msgBox(), "Compacting patients...", "into");
    // send "doMenu Compact stack" to HyperCard
    await H.send($, "doMenu Compact stack", "hypercard");
    // hide msg
    H.hide(H.msgBox());
  });
  // end mouseUp
}

// ---- script 10: bkgnd-2721/button-66 "Find"
function script10(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // ask "Find what?"
    it = await H.ask("Find what?", "");
    // if it is not empty then
    if (!H.eq(it, "")) {
      // put "Find" && quote & it & quote into msg
      H.putInto(H.msgBox(), H.cat("Find", " ", "\"", it, "\""), "into");
      // hide msg
      H.hide(H.msgBox());
      // type return
      await H.type($, "\n");
    // end if
    }
    // IF THE RESULT IS NOT EMPTY THEN ANSWER¬ "PATIENT NOT FOUND"
    if (!H.eq(H.f.result(), "")) {
      it = await H.answer("PATIENT NOT FOUND");
    }
  });
  // end mouseUp
}

// ---- script 11: bkgnd-2721/button-74 "Show Notes"
function script11(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // get the visible of field "notes"
    it = H.prop(H.part($, null, "field", "notes"), "visible");
    // if it is true then
    if (H.eq(it, true)) {
      // set visible of field "notes" to false
      H.setProp(H.part($, null, "field", "notes"), "visible", false);
      // set name of me to "Show Notes"
      H.setProp(H.me($), "name", "Show Notes");
    // else
    } else {
      // set visible of field "notes" to true
      H.setProp(H.part($, null, "field", "notes"), "visible", true);
      // set name of me to "Hide Notes"
      H.setProp(H.me($), "name", "Hide Notes");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 12: bkgnd-2721/button-80 "Print"
function script12(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // PRINTENGOOD
    await H.call($, "PRINTENGOOD", []);  // not defined in this stack (XCMD or other stack)
  });
  // end mouseUp
}

// ---- script 13: bkgnd-2721/button-99 "MEDICATION LIST"
function script13(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    let it = "", NXTLINE = "", MEDICINE = "";
    // global HOProblemList
    /* shared: H.g.hoproblemlist */
    // get PopMenu (the clickLoc,HOProblemList)
    it = await H.call($, "PopMenu", [H.f.clickLoc(), H.g.hoproblemlist], 'function');
    // if it > 0 then
    if (H.gt(it, 0)) {
      // put nextBlankLine("MEDICATION") into NXTLINE
      NXTLINE = await H.call($, "nextBlankLine", ["MEDICATION"], 'function');
      // put piece(HOProblemList,";",it) INTO MEDICINE
      MEDICINE = await H.call($, "piece", [H.g.hoproblemlist, ";", it], 'function');
      // IF MEDICINE IS IN FLD "MEDICATION" THEN EXIT MOUSEDOWN
      if (H.contains(H.value(H.part($, null, "field", "MEDICATION")), MEDICINE)) {
        return;
      }
      // IF MEDICINE IS NOT IN FLD "MEDICATION" THEN PUT MEDICINE¬ into line NXTLINE of field "MEDICATION"
      if (!H.contains(H.value(H.part($, null, "field", "MEDICATION")), MEDICINE)) {
        H.putInto(H.part($, null, "field", "MEDICATION"), MEDICINE, "into", [["line", NXTLINE]]);
      }
    // END IF
    }
  });
  // end mouseDown
}

// ---- script 14: bkgnd-2721/button-107 "PROBLEM LIST"
function script14(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    let it = "", NXTLINE = "", PROBLEM = "";
    // global HOProblemList1
    /* shared: H.g.hoproblemlist1 */
    // get PopMenu (the clickLoc,HOProblemList1)
    it = await H.call($, "PopMenu", [H.f.clickLoc(), H.g.hoproblemlist1], 'function');
    // if it > 0 then
    if (H.gt(it, 0)) {
      // put nextBlankLine("Problems") into NXTLINE
      NXTLINE = await H.call($, "nextBlankLine", ["Problems"], 'function');
      // put piece(HOProblemList1,";",it) INTO PROBLEM
      PROBLEM = await H.call($, "piece", [H.g.hoproblemlist1, ";", it], 'function');
      // IF PROBLEM IS IN FLD "PROBLEMS" THEN EXIT MOUSEDOWN
      if (H.contains(H.value(H.part($, null, "field", "PROBLEMS")), PROBLEM)) {
        return;
      }
      // IF PROBLEM IS NOT IN FLD "PROBLEMS" THEN PUT PROBLEM¬ into line NXTLINE of field "ProBLems"
      if (!H.contains(H.value(H.part($, null, "field", "PROBLEMS")), PROBLEM)) {
        H.putInto(H.part($, null, "field", "ProBLems"), PROBLEM, "into", [["line", NXTLINE]]);
      }
    // END IF
    }
  });
  // end mouseDown
}

// ---- script 15: bkgnd-2721/button-120 "Home"
function script15(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect iris close to inverse
    H.visual("iris close to inverse");
    // go Home
    await H.goHome($);
  });
  // end mouseUp
}

// ---- script 16: bkgnd-2721/button-125 "N F/U MALE"
function script16(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", N = "";
    // IF FIELD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU NEED A CHIEF COMPLAINT FIRST"
      it = await H.answer("YOU NEED A CHIEF COMPLAINT FIRST");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // IF FLD"DISPOSITION" IS NOT EMPTY OR FLD "IMPRESSION" IS NOT EMPTY
    // THEN
    if ((!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "") || !H.eq(H.value(H.part($, null, "field", "IMPRESSION")), ""))) {
      // ANSWER "YOU SURE YOU NOW WANT TO ADD A PE"¬ WITH "FORGET IT" OR "I WANT IT"
      it = await H.answer("YOU SURE YOU NOW WANT TO ADD A PE", ["FORGET IT", "I WANT IT"]);
      // IF IT IS "I WANT IT"
      // THEN
      if (H.eq(it, "I WANT IT")) {
        // REPEAT WITH N= NEXTBLANKLINE ("TEXT") DOWN TO DATELINE ("TEXT")+1
        for (N of H.range(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function'), H.num(await H.call($, "DATELINE", ["TEXT"], 'function')) + 1, -1)) {
          await H.tick();
          // DELETE LINE N OF FLD "TEXT"
          H.deleteIn(H.part($, null, "field", "TEXT"), [["line", N]]);
        // END REPEAT
        }
        // NFUMALE
        await H.call($, "NFUMALE", []);
        // PUT FLD "IMPRESSION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "IMPRESSION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT FLD "DISPOSITION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "DISPOSITION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT "TRUJILLO"INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), "TRUJILLO", "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // EXIT MOUSEUP
        return;
      // END IF
      }
      // IF IT IS "FORGET IT"
      // THEN
      if (H.eq(it, "FORGET IT")) {
        // EXIT MOUSEUP
        return;
      // END IF
      }
    // END IF
    }
    // IF FLD "IMPRESSION" IS EMPTY THEN NFUMALE
    if (H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "")) {
      await H.call($, "NFUMALE", []);
    }
  });
  // END MOUSEUP
}

// ---- script 17: bkgnd-2721/button-126 "N F/U FEM"
function script17(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", N = "";
    // IF FIELD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU NEED A CHIEF COMPLAINT FIRST"
      it = await H.answer("YOU NEED A CHIEF COMPLAINT FIRST");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // IF FLD"DISPOSITION" IS NOT EMPTY OR FLD "IMPRESSION" IS NOT EMPTY
    // THEN
    if ((!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "") || !H.eq(H.value(H.part($, null, "field", "IMPRESSION")), ""))) {
      // ANSWER "YOU SURE YOU NOW WANT TO ADD A PE"¬ WITH "FORGET IT" OR "I WANT IT"
      it = await H.answer("YOU SURE YOU NOW WANT TO ADD A PE", ["FORGET IT", "I WANT IT"]);
      // IF IT IS "I WANT IT"
      // THEN
      if (H.eq(it, "I WANT IT")) {
        // REPEAT WITH N= NEXTBLANKLINE ("TEXT") DOWN TO DATELINE ("TEXT")+1
        for (N of H.range(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function'), H.num(await H.call($, "DATELINE", ["TEXT"], 'function')) + 1, -1)) {
          await H.tick();
          // DELETE LINE N OF FLD "TEXT"
          H.deleteIn(H.part($, null, "field", "TEXT"), [["line", N]]);
        // END REPEAT
        }
        // NFUFEM
        await H.call($, "NFUFEM", []);
        // PUT FLD "IMPRESSION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "IMPRESSION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT FLD "DISPOSITION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "DISPOSITION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT "TRUJILLO"INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), "TRUJILLO", "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // EXIT MOUSEUP
        return;
      // END IF
      }
      // IF IT IS "FORGET IT"
      // THEN
      if (H.eq(it, "FORGET IT")) {
        // EXIT MOUSEUP
        return;
      // END IF
      }
    // END IF
    }
    // IF FLD "IMPRESSION" IS EMPTY THEN NFUFEM
    if (H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "")) {
      await H.call($, "NFUFEM", []);
    }
  });
  // end mouseUp
}

// ---- script 18: bkgnd-2721/button-127 "N EXT MALE"
function script18(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", N = "";
    // IF FIELD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU NEED A CHIEF COMPLAINT FIRST"
      it = await H.answer("YOU NEED A CHIEF COMPLAINT FIRST");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // IF FLD"DISPOSITION" IS NOT EMPTY OR FLD "IMPRESSION" IS NOT EMPTY
    // THEN
    if ((!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "") || !H.eq(H.value(H.part($, null, "field", "IMPRESSION")), ""))) {
      // ANSWER "YOU SURE YOU NOW WANT TO ADD A PE"¬ WITH "FORGET IT" OR "I WANT IT"
      it = await H.answer("YOU SURE YOU NOW WANT TO ADD A PE", ["FORGET IT", "I WANT IT"]);
      // IF IT IS "I WANT IT"
      // THEN
      if (H.eq(it, "I WANT IT")) {
        // REPEAT WITH N= NEXTBLANKLINE ("TEXT") DOWN TO DATELINE ("TEXT")+1
        for (N of H.range(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function'), H.num(await H.call($, "DATELINE", ["TEXT"], 'function')) + 1, -1)) {
          await H.tick();
          // DELETE LINE N OF FLD "TEXT"
          H.deleteIn(H.part($, null, "field", "TEXT"), [["line", N]]);
        // END REPEAT
        }
        // EXTEMALE
        await H.call($, "EXTEMALE", []);
        // PUT FLD "IMPRESSION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "IMPRESSION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT FLD "DISPOSITION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "DISPOSITION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT "TRUJILLO"INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), "TRUJILLO", "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // EXIT MOUSEUP
        return;
      // END IF
      }
      // IF IT IS "FORGET IT"
      // THEN
      if (H.eq(it, "FORGET IT")) {
        // EXIT MOUSEUP
        return;
      // END IF
      }
    // END IF
    }
    // IF FLD "IMPRESSION" IS EMPTY THEN EXTEMALE
    if (H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "")) {
      await H.call($, "EXTEMALE", []);
    }
  });
  // END MOUSEUP
}

// ---- script 19: bkgnd-2721/button-139 "show cc"
function script19(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // IF FLD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU HAVE NOT ENTERED A CHIEF COMPLAINT"
      it = await H.answer("YOU HAVE NOT ENTERED A CHIEF COMPLAINT");
    // END IF
    }
    // get the visible of field "CC"
    it = H.prop(H.part($, null, "field", "CC"), "visible");
    // if it is true then
    if (H.eq(it, true)) {
      // set visible of field "CC" to false
      H.setProp(H.part($, null, "field", "CC"), "visible", false);
      // set name of me to "show cc"
      H.setProp(H.me($), "name", "show cc");
    // else
    } else {
      // set visible of field "cc" to true
      H.setProp(H.part($, null, "field", "cc"), "visible", true);
      // set name of me to "hide cc"
      H.setProp(H.me($), "name", "hide cc");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 20: bkgnd-2721/button-140 "pelvic"
function script20(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // get the visible of field "VAGINA"
    it = H.prop(H.part($, null, "field", "VAGINA"), "visible");
    // if it is true then
    if (H.eq(it, true)) {
      // set visible of field "VAGINA" to false
      H.setProp(H.part($, null, "field", "VAGINA"), "visible", false);
      // set name of me to "pelvic"
      H.setProp(H.me($), "name", "pelvic");
      // PUT EMPTY INTO FLD "VAGINA"
      H.putInto(H.part($, null, "field", "VAGINA"), "", "into");
    // else
    } else {
      // set visible of field "VAGINA" to true
      H.setProp(H.part($, null, "field", "VAGINA"), "visible", true);
      // set name of me to "Hide p"
      H.setProp(H.me($), "name", "Hide p");
      // IF FIELD "VAGINA" IS EMPTY
      // THEN
      if (H.eq(H.value(H.part($, null, "field", "VAGINA")), "")) {
        // SELECT BEFORE TEXT OF FLD "VAGINA"
        H.select(H.part($, null, "field", "VAGINA"), null, "before");
        // TYPE "PELVIC:"
        await H.type($, "PELVIC:");
        // TYPE RETURN
        await H.type($, "\n");
        // TYPE "VAGINA AND CERVIX ARE NORMAL. PAP SMEAR DONE. BIMANUAL NO ADNEXAL MASSES. UTERUS NORMAL SIZE"
        await H.type($, "VAGINA AND CERVIX ARE NORMAL. PAP SMEAR DONE. BIMANUAL NO ADNEXAL MASSES. UTERUS NORMAL SIZE");
      // END IF
      }
    // END IF
    }
  });
  // end mouseUp
}

// ---- script 21: bkgnd-2721/button-151 "SHOW ABN"
function script21(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // get the visible of  field "abnormal"
    it = H.prop(H.part($, null, "field", "abnormal"), "visible");
    // if it is true then
    if (H.eq(it, true)) {
      // set visible oF  field "abnormal" to false
      H.setProp(H.part($, null, "field", "abnormal"), "visible", false);
      // set name of me to "SHOW ABN"
      H.setProp(H.me($), "name", "SHOW ABN");
    // else
    } else {
      // set visible of  field "abnormal" to true
      H.setProp(H.part($, null, "field", "abnormal"), "visible", true);
      // ASK "PUT ABNORMAL FINDINGS"
      it = await H.ask("PUT ABNORMAL FINDINGS", "");
      // PUT "ABNORMAL FINDINGS:"&& IT INTO  FLD "abnormal"
      H.putInto(H.part($, null, "field", "abnormal"), H.cat("ABNORMAL FINDINGS:", " ", it), "into");
      // if it is empty then put empty into fld "abnormal"
      if (H.eq(it, "")) {
        H.putInto(H.part($, null, "field", "abnormal"), "", "into");
      }
      // set name of me to "HIDE ABN"
      H.setProp(H.me($), "name", "HIDE ABN");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 22: bkgnd-2721/button-128 "N EXT FEM"
function script22(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", N = "";
    // IF FIELD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU NEED A CHIEF COMPLAINT FIRST"
      it = await H.answer("YOU NEED A CHIEF COMPLAINT FIRST");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // IF FLD"DISPOSITION" IS NOT EMPTY OR FLD "IMPRESSION" IS NOT EMPTY
    // THEN
    if ((!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "") || !H.eq(H.value(H.part($, null, "field", "IMPRESSION")), ""))) {
      // ANSWER "YOU SURE YOU NOW WANT TO ADD A PE"¬ WITH "FORGET IT" OR "I WANT IT"
      it = await H.answer("YOU SURE YOU NOW WANT TO ADD A PE", ["FORGET IT", "I WANT IT"]);
      // IF IT IS "I WANT IT"
      // THEN
      if (H.eq(it, "I WANT IT")) {
        // REPEAT WITH N= NEXTBLANKLINE ("TEXT") DOWN TO DATELINE ("TEXT")+1
        for (N of H.range(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function'), H.num(await H.call($, "DATELINE", ["TEXT"], 'function')) + 1, -1)) {
          await H.tick();
          // DELETE LINE N OF FLD "TEXT"
          H.deleteIn(H.part($, null, "field", "TEXT"), [["line", N]]);
        // END REPEAT
        }
        // EXTEFEM
        await H.call($, "EXTEFEM", []);
        // PUT FLD "IMPRESSION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "IMPRESSION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT FLD "DISPOSITION" INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.value(H.part($, null, "field", "DISPOSITION")), "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // PUT "TRUJILLO"INTO LINE NEXTBLANKLINE("TEXT")¬ OF FLD "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), "TRUJILLO", "into", [["line", await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')]]);
        // EXIT MOUSEUP
        return;
      // END IF
      }
      // IF IT IS "FORGET IT"
      // THEN
      if (H.eq(it, "FORGET IT")) {
        // EXIT MOUSEUP
        return;
      // END IF
      }
    // END IF
    }
    // IF FLD "IMPRESSION" IS EMPTY THEN EXTEFEM
    if (H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "")) {
      await H.call($, "EXTEFEM", []);
    }
  });
  // END MOUSEUP
}

// ---- script 23: bkgnd-2721/button-133 "CC"
function script23(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", HLINE = "", HSIZE = "", NXTLINE = "", N = "";
    // IF FIELD "CC" IS NOT EMPTY
    // THEN
    if (!H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU ALREADY HAVE A COMPLAINT"
      it = await H.answer("YOU ALREADY HAVE A COMPLAINT");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // PUT ROUND (NEXTBLANKLINE("TEXT")) INTO HLINE
    HLINE = H.f.round(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function'));
    // PUT THE TEXTHEIGHT OF FLD "TEXT"INTO HSIZE
    HSIZE = H.prop(H.part($, null, "field", "TEXT"), "textHeight");
    // SET SCROLL OF FLD "TEXT" TO  HLINE*HSIZE
    H.setProp(H.part($, null, "field", "TEXT"), "scroll", H.num(HLINE) * H.num(HSIZE));
    // ASK "WHAT ARE THE COMPLAINTS"
    it = await H.ask("WHAT ARE THE COMPLAINTS", "");
    // PUT "CC"&":"& SPACE & IT INTO FIELD "CC"
    H.putInto(H.part($, null, "field", "CC"), H.cat("CC", ":", " ", it), "into");
    // IF IT IS EMPTY
    // THEN
    if (H.eq(it, "")) {
      // PUT EMPTY INTO FLD "CC"
      H.putInto(H.part($, null, "field", "CC"), "", "into");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // put THE DATE into line NXTLINE+1 of field "TEXT"
    H.putInto(H.part($, null, "field", "TEXT"), H.f.date(), "into", [["line", H.num(NXTLINE) + 1]]);
    // IF DATELINE("TEXT")=NEXTBLANKLINE ("TEXT")-1
    // THEN
    if (H.eq(await H.call($, "DATELINE", ["TEXT"], 'function'), H.num(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')) - 1)) {
      // IF FLD "CC" IS NOT EMPTY
      // THEN
      if (!H.eq(H.value(H.part($, null, "field", "CC")), "")) {
        // EXIT MOUSEUP
        return;
      // END IF
      }
    // ELSE
    } else {
      // IF FLD "CC" IS EMPTY
      // THEN
      if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
        // ANSWER"YOU HAVE NOT WRITTEN A COMPLAINT"
        it = await H.answer("YOU HAVE NOT WRITTEN A COMPLAINT");
        // DELETE LINE (NEXTBLANKLINE ("TEXT")-1) OF FIELD "TEXT"
        H.deleteIn(H.part($, null, "field", "TEXT"), [["line", (H.num(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')) - 1)]]);
        // EXIT MOUSEUP
        return;
      // END IF
      }
      // IF DATELINE("TEXT")≠NEXTBLANKLINE ("TEXT")-1
      // THEN
      if (!H.eq(await H.call($, "DATELINE", ["TEXT"], 'function'), H.num(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')) - 1)) {
        // ANSWER "YOU ALREADY HAVE A NOTE FOR TODAY"
        it = await H.answer("YOU ALREADY HAVE A NOTE FOR TODAY");
        // DELETE LINE (NEXTBLANKLINE ("TEXT")-1) OF FIELD "TEXT"
        H.deleteIn(H.part($, null, "field", "TEXT"), [["line", (H.num(await H.call($, "NEXTBLANKLINE", ["TEXT"], 'function')) - 1)]]);
        // PUT EMPTY INTO FLD "CC"
        H.putInto(H.part($, null, "field", "CC"), "", "into");
        // EXIT MOUSEUP
        return;
      // END IF
      }
    // END IF
    }
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // repeat with N=1 TO THE NUMBER OF LINES OF FLD "CC"
    for (N of H.range(1, H.count("line", H.value(H.part($, null, "field", "CC"))))) {
      await H.tick();
      // put LINE N OF FIELD "CC" into line NXTLINE of field "TEXT"
      H.putInto(H.part($, null, "field", "TEXT"), H.chunk(H.value(H.part($, null, "field", "CC")), [["line", N]]), "into", [["line", NXTLINE]]);
      // IF FLD "CC" IS EMPTY THEN EXIT REPEAT
      if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
        break;
      }
    // END REPEAT
    }
  });
  // end mouseUp
}

// ---- script 24: bkgnd-2721/button-134 "DISP"
function script24(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", N = "", NXTLINE = "";
    // IF FIELD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU NEED A CHIEF COMPLAINT FIRST"
      it = await H.answer("YOU NEED A CHIEF COMPLAINT FIRST");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // IF FIELD "DISPOSITION" IS NOT EMPTY
    // THEN
    if (!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
      // ANSWER "YOU ALREADY HAVE A DISPOSITION"
      it = await H.answer("YOU ALREADY HAVE A DISPOSITION");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // ASK "WHAT IS YOUR DISPOSITION"
    it = await H.ask("WHAT IS YOUR DISPOSITION", "");
    // PUT "DISP"&":"& SPACE & IT INTO FIELD "DISPOSITION"
    H.putInto(H.part($, null, "field", "DISPOSITION"), H.cat("DISP", ":", " ", it), "into");
    // IF IT IS EMPTY THEN PUT EMPTY INTO FLD "DISPOSITION"
    if (H.eq(it, "")) {
      H.putInto(H.part($, null, "field", "DISPOSITION"), "", "into");
    }
    // repeat with N=1 TO THE NUMBER OF LINES OF FLD "TEXT"
    for (N of H.range(1, H.count("line", H.value(H.part($, null, "field", "TEXT"))))) {
      await H.tick();
      // IF "TRUJILLO" IS IN LINE N OF FIELD "TEXT"
      // THEN
      if (H.contains(H.chunk(H.value(H.part($, null, "field", "TEXT")), [["line", N]]), "TRUJILLO")) {
        // DELETE LINE N OF FIELD "TEXT"
        H.deleteIn(H.part($, null, "field", "TEXT"), [["line", N]]);
      // END IF
      }
      // IF FLD "DISPOSITION" IS EMPTY THEN EXIT REPEAT
      if (H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
        break;
      }
    // END REPEAT
    }
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // repeat with N=1 TO THE NUMBER OF LINES OF FLD "DISPOSITION"
    for (N of H.range(1, H.count("line", H.value(H.part($, null, "field", "DISPOSITION"))))) {
      await H.tick();
      // put LINE N OF FIELD "DISPOSITION" into line NXTLINE of field "TEXT"
      H.putInto(H.part($, null, "field", "TEXT"), H.chunk(H.value(H.part($, null, "field", "DISPOSITION")), [["line", N]]), "into", [["line", NXTLINE]]);
      // IF FLD "DISPOSITION" IS EMPTY THEN EXIT REPEAT
      if (H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
        break;
      }
    // END REPEAT
    }
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // IF "TRUJILLO" IS NOT IN LINE NXTLINE-1 OF FLD "TEXT" AND FLD "DISPOSITION" ¬ IS NOT EMPTY
    // THEN
    if ((!H.contains(H.chunk(H.value(H.part($, null, "field", "TEXT")), [["line", H.num(NXTLINE) - 1]]), "TRUJILLO") && !H.eq(H.value(H.part($, null, "field", "DISPOSITION")), ""))) {
      // put "TRUJILLO" INTO line NXTLINE of field "TEXT"
      H.putInto(H.part($, null, "field", "TEXT"), "TRUJILLO", "into", [["line", NXTLINE]]);
    // END IF
    }
  });
  // end mouseUp
}

// ---- script 25: bkgnd-2721/button-138 "IMP"
function script25(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", NXTLINE = "", N = "";
    // IF FIELD "CC" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "CC")), "")) {
      // ANSWER "YOU NEED A CHIEF COMPLAINT FIRST"
      it = await H.answer("YOU NEED A CHIEF COMPLAINT FIRST");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // IF FIELD "IMPRESSION" IS NOT EMPTY
    // THEN
    if (!H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "")) {
      // ANSWER "YOU ALREADY HAVE AN IMPRESSION"
      it = await H.answer("YOU ALREADY HAVE AN IMPRESSION");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // ASK "WHAT IS YOUR IMPRESSION"
    it = await H.ask("WHAT IS YOUR IMPRESSION", "");
    // PUT "IMP"&":"& SPACE & IT INTO FIELD "IMPRESSION"
    H.putInto(H.part($, null, "field", "IMPRESSION"), H.cat("IMP", ":", " ", it), "into");
    // IF IT IS EMPTY
    // THEN
    if (H.eq(it, "")) {
      // PUT EMPTY INTO FLD "IMPRESSION"
      H.putInto(H.part($, null, "field", "IMPRESSION"), "", "into");
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // put nextBlankLine("TEXT") into NXTLINE
    NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
    // IF FLD "DISPOSITION" IS EMPTY
    // THEN
    if (H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
      // repeat with N=1 TO THE NUMBER OF LINES OF FLD "IMPRESSION"
      for (N of H.range(1, H.count("line", H.value(H.part($, null, "field", "IMPRESSION"))))) {
        await H.tick();
        // put LINE N OF FIELD "IMPRESSION" into¬ line NXTLINE of field "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.chunk(H.value(H.part($, null, "field", "IMPRESSION")), [["line", N]]), "into", [["line", NXTLINE]]);
        // IF FLD "IMPRESSION" IS EMPTY THEN EXIT REPEAT
        if (H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "")) {
          break;
        }
      // END REPEAT
      }
    // END IF
    }
    // IF FIELD "DISPOSITION" IS NOT EMPTY
    // THEN
    if (!H.eq(H.value(H.part($, null, "field", "DISPOSITION")), "")) {
      // repeat with N=1 TO THE NUMBER OF LINES OF FLD "IMPRESSION"
      for (N of H.range(1, H.count("line", H.value(H.part($, null, "field", "IMPRESSION"))))) {
        await H.tick();
        // SELECT AFTER CHAR 19 OF LINE NXTLINE-3 OF FIELD "TEXT"
        H.select(H.part($, null, "field", "TEXT"), [["line", H.num(NXTLINE) - 3], ["char", 19]], "after");
        // TYPE RETURN
        await H.type($, "\n");
        // put nextBlankLine("TEXT") into NXTLINE
        NXTLINE = await H.call($, "nextBlankLine", ["TEXT"], 'function');
        // put LINE N OF FIELD "IMPRESSION" INTO line NXTLINE-3 of field "TEXT"
        H.putInto(H.part($, null, "field", "TEXT"), H.chunk(H.value(H.part($, null, "field", "IMPRESSION")), [["line", N]]), "into", [["line", H.num(NXTLINE) - 3]]);
        // IF FLD "IMPRESSION" IS EMPTY THEN EXIT REPEAT
        if (H.eq(H.value(H.part($, null, "field", "IMPRESSION")), "")) {
          break;
        }
      // END REPEAT
      }
    // END IF
    }
  });
  // end mouseUp
}

// ---- script 26: bkgnd-2721/button-155 "RETURN"
function script26(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // SHOW FLD "DATE RETURN"
    H.show(H.part($, null, "field", "DATE RETURN"));
    // ASK "WHEN TO RETURN"
    it = await H.ask("WHEN TO RETURN", "");
    // IF IT IS EMPTY
    // THEN
    if (H.eq(it, "")) {
      // EXIT MOUSEUP
      return;
    // ELSE
    } else {
      // PUT "RETURN:"&& IT INTO FLD "DATE RETURN"
      H.putInto(H.part($, null, "field", "DATE RETURN"), H.cat("RETURN:", " ", it), "into");
    // END IF
    }
  });
  // end mouseUp
}

// ---- script 27: bkgnd-2721/button-161 "SHOW REF"
function script27(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // get the visible of  field "REFERING"
    it = H.prop(H.part($, null, "field", "REFERING"), "visible");
    // if it is true then
    if (H.eq(it, true)) {
      // set visible oF  field "REFERING" to false
      H.setProp(H.part($, null, "field", "REFERING"), "visible", false);
      // set name of me to "SHOW REF"
      H.setProp(H.me($), "name", "SHOW REF");
    // else
    } else {
      // set visible of  field "REFERING" to true
      H.setProp(H.part($, null, "field", "REFERING"), "visible", true);
      // set the name of me to "hide ref"
      H.setProp(H.me($), "name", "hide ref");
    // end if
    }
    // if fld "refering" is empty then
    if (H.eq(H.value(H.part($, null, "field", "refering")), "")) {
      // ASK "PUT REFERING DOCTOR"
      it = await H.ask("PUT REFERING DOCTOR", "");
      // if it is empty
      // then
      if (H.eq(it, "")) {
        // exit mouseup
        return;
      // else
      } else {
        // PUT "Ref:"&& IT INTO  FLD "REFERING"
        H.putInto(H.part($, null, "field", "REFERING"), H.cat("Ref:", " ", it), "into");
      // end if
      }
      // set visible of  field "REFERING" to true
      H.setProp(H.part($, null, "field", "REFERING"), "visible", true);
      // SET THE NAME OF ME TO "HIDE REF"
      H.setProp(H.me($), "name", "HIDE REF");
    // else
    } else {
      // exit mouseup
      return;
    // end if
    }
  });
  // end mouseUp
}

// ---- script 28: bkgnd-2721/button-163 "Show allergy"
function script28(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // get the visible of field "allergy"
    it = H.prop(H.part($, null, "field", "allergy"), "visible");
    // if it is true then
    if (H.eq(it, true)) {
      // set visible of field "allergy" to false
      H.setProp(H.part($, null, "field", "allergy"), "visible", false);
      // set name of me to "Show allergy"
      H.setProp(H.me($), "name", "Show allergy");
    // else
    } else {
      // set visible of field "allergy" to true
      H.setProp(H.part($, null, "field", "allergy"), "visible", true);
      // set name of me to "Hide allergy"
      H.setProp(H.me($), "name", "Hide allergy");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 29: bkgnd-2721/field-147 "Sex"
function script29(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    let it = "", CHOICE = "";
    // get char 1 of me
    it = H.chunk(H.value(H.me($)), [["char", 1]]);
    // put empty into CHOICE
    CHOICE = "";
    // if it="M" then put 1 into CHOICE
    if (H.eq(it, "M")) {
      CHOICE = 1;
    }
    // if it="F" then put 2 into CHOICE
    if (H.eq(it, "F")) {
      CHOICE = 2;
    }
    // if it="U" then put 3 into CHOICE
    if (H.eq(it, "U")) {
      CHOICE = 3;
    }
    // get popUp(CHOICE,"Male,Female,Unknown")
    it = await H.call($, "popUp", [CHOICE, "Male,Female,Unknown"], 'function');
    // if item 1 of it is not empty then
    if (!H.eq(H.chunk(it, [["item", 1]]), "")) {
      // put item 1 of it into me
      H.putInto(H.me($), H.chunk(it, [["item", 1]]), "into");
    // end if
    }
  });
  // end mouseDown
}

// ---- script 30: bkgnd-2721/button-153 "New Button"
function script30(owner) {
  // on mouseDOWN
  H.on(owner, "mouseDOWN", async function mouseDOWN($) {
    // SEND MOUSEDOWN TO FLD "SEX"
    await H.send($, "MOUSEDOWN", H.part($, null, "field", "SEX"));
  });
  // end mouseDOWN
}

// ---- script 31: bkgnd-2721/field-44 "notes"
function script31(owner) {
  // ON OPENFIELD
  H.on(owner, "OPENFIELD", async function OPENFIELD($) {
  });
  // END OPENFIELD
}

// ---- script 32: bkgnd-201455/button-1 "Home"
function script32(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // global HOPROBLEMLIST,HOPROBLEMLIST1,HOEXAM
    /* shared: H.g.hoproblemlist, H.g.hoproblemlist1, H.g.hoexam */
    // put empty into HOProblemList--cause re-initialization on re-entry
    H.g.hoproblemlist = "";
    // put empty into HOProblemList1--cause re-initialization on re-entry
    H.g.hoproblemlist1 = "";
    // put empty into HOEXAM--cause re-initialization on re-entry
    H.g.hoexam = "";
    // visual effect iris close
    H.visual("iris close");
    // send "go home" to HyperCard
    await H.send($, "go home", "hypercard");
  });
  // end mouseUp
}

// ---- script 33: bkgnd-201455/button-2 "Sort All"
function script33(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // lock screen
    H.lockScreen();
    // go to first card of bg "Patient Info"
    await H.go($, {rel: "first", bg: {key: "Patient Info"}});
    // send mouseUp to bg btn "Sort"
    await H.send($, "mouseUp", H.part($, "bg", "button", "Sort"));
    // go to card "Title"
    await H.go($, {key: "Title"});
  });
  // end mouseUp
}

// ---- script 34: bkgnd-201455/button-3 "Find"
function script34(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // ask "Find what?"
    it = await H.ask("Find what?", "");
    // if it is not empty then
    if (!H.eq(it, "")) {
      // put "Find" && quote & it & quote into msg
      H.putInto(H.msgBox(), H.cat("Find", " ", "\"", it, "\""), "into");
      // hide msg
      H.hide(H.msgBox());
      // type return
      await H.type($, "\n");
    // end if
    }
    // IF THE RESULT IS NOT EMPTY THEN ANSWER¬ "PATIENT NOT FOUND"
    if (!H.eq(H.f.result(), "")) {
      it = await H.answer("PATIENT NOT FOUND");
    }
  });
  // end mouseUp
}

// ---- script 35: bkgnd-201455/button-4 "Options"
function script35(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect venetian blinds to grey
    H.visual("venetian blinds to grey");
    // go to CD "PROBLEM LIST1" of bg "Maintenance"
    await H.go($, {key: "PROBLEM LIST1", bg: {key: "Maintenance"}});
  });
  // end mouseUp
}

// ---- script 36: bkgnd-201455/button-5 ""
function script36(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // show card fld "About1"
    H.show(H.part($, "card", "field", "About1"));
  });
  // end mouseUp
}

// ---- script 37: bkgnd-201455/button-6 "PATIENT INFORMATION"
function script37(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // push card
    H.pushCard();
    // visual effect dissolve to black
    H.visual("dissolve to black");
    // go to first card of bg "patient info"
    await H.go($, {rel: "first", bg: {key: "patient info"}});
    // SEND MOUSEUP TO BG BUTTON "NEW PATIENT"
    await H.send($, "MOUSEUP", H.part($, "bg", "button", "NEW PATIENT"));
  });
  // end mouseUp
}

// ---- script 38: bkgnd-201455/button-8 "PATIENT LIST"
function script38(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // GO TO CD "PATIENT LIST"
    await H.go($, {key: "PATIENT LIST"});
  });
  // end mouseUp
}

// ---- script 39: bkgnd-259661/button-1 "Return"
function script39(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect venetian blinds to grey
    H.visual("venetian blinds to grey");
    // go TO card "Title"
    await H.go($, {key: "Title"});
  });
  // end mouseUp
}

// ---- script 40: bkgnd-259661/button-3 "Next"
function script40(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect wipe left
    H.visual("wipe left");
    // go to next card of this bg
    await H.go($, {rel: "next", bg: {rel: "this"}});
  });
  // end mouseUp
}

// ---- script 41: bkgnd-259661/field-4 "Menu Holder"
function script41(owner) {
  // ON CLOSEFIELD
  H.on(owner, "CLOSEFIELD", async function CLOSEFIELD($) {
    // put sortLines(field "MENU HOLDER") into field "MENU HOLDER"
    H.putInto(H.part($, null, "field", "MENU HOLDER"), await H.call($, "sortLines", [H.value(H.part($, null, "field", "MENU HOLDER"))], 'function'), "into");
  });
  // END CLOSEFIELD
}

// ---- script 42: card card-227564 "Title"
function script42(owner) {
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    let it = "";
    // get the number of cards of bg "Patient Info"
    it = H.countCards(H.bg($, {key: "Patient Info"}));
    // put it into  fld "Number Pts"
    H.putInto(H.part($, null, "field", "Number Pts"), it, "into");
    // pass openCard
    return H.PASS;
  });
  // end openCard
  // ON CLOSECARD
  H.on(owner, "CLOSECARD", async function CLOSECARD($) {
    // IF THERE IS NO MENU "PROCEDURE" THEN   CREATE MENU "Procedure"
    if (H.unsupported("if", "IF THERE IS NO MENU \"PROCEDURE\" THEN   CREATE MENU \"Procedure\"")) {
      H.unsupported("create menu", "IF THERE IS NO MENU \"PROCEDURE\" THEN   CREATE MENU \"Procedure\"");
    }
    // put "Colonoscopy,EGD"¬ into  MENU "PROCEDURE" WITH MENUMSGS "LOWER,EGD"
    H.unsupported("menu", "put \"Colonoscopy,EGD\" into  MENU \"PROCEDURE\" WITH MENUMSGS \"LOWER,EGD\"");
  });
  // END CLOSECARD
}

// ---- script 43: card-227564/field-10 "About1"
function script43(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // hide me
    H.hide(H.me($));
  });
  // end mouseUp
}

// ---- script 44: card-227564/button-35 "install"
function script44(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // push card
    H.pushCard();
    // set lockMessages to true
    H.setGlobal("lockMessages", true);
    // GetButton
    await H.call($, "GetButton", []);
    // GoStack
    await H.call($, "GoStack", []);
    // TheLevel
    await H.call($, "TheLevel", []);
    // GoCard
    await H.call($, "GoCard", []);
    // install
    await H.call($, "install", []);
    // GoBack
    await H.call($, "GoBack", []);
    // CleanUp
    await H.call($, "CleanUp", []);
  });
  // end mouseUp
  // on CleanUp
  H.on(owner, "CleanUp", async function CleanUp($) {
    // global SaveLevel
    /* shared: H.g.savelevel */
    // set the Userlevel to SaveLevel
    H.setGlobal("userLevel", H.g.savelevel);
  });
  // end CleanUp
  // on GoBack
  H.on(owner, "GoBack", async function GoBack($) {
    let it = "";
    // answer "Stay here or go back?" with "Back" or "Stay"
    it = await H.answer("Stay here or go back?", ["Back", "Stay"]);
    // if it is "Back" then pop card
    if (H.eq(it, "Back")) {
      await H.popCard($);
    }
  });
  // end GoBack
  // on Install
  H.on(owner, "Install", async function Install($) {
    let it = "";
    // set lockScreen to true
    H.setGlobal("lockScreen", true);
    // type "V" with commandKey
    await H.type($, "V");
    // set lockScreen to false
    H.setGlobal("lockScreen", false);
    // answer "Drag this button to it's new postion."
    it = await H.answer("Drag this button to it's new postion.");
    // wait until the mouse is down
    await H.waitUntil(async () => H.eq(H.f.mouse(), "down"));
    // repeat while the mouse is down
    while (H.eq(H.f.mouse(), "down")) {
      await H.tick();
      // set the loc of last button to the mouseLoc
      H.setProp(H.part($, null, "button", {ord: "last"}), "loc", H.f.mouseLoc());
    // end repeat
    }
    // choose browse tool
    H.choose("browse");
  });
  // end Install
  // on GetButton
  H.on(owner, "GetButton", async function GetButton($) {
    // set lockScreen to true
    H.setGlobal("lockScreen", true);
    // choose button tool
    H.choose("button");
    // click at loc of button "PATIENTS ™  Version 1.5"
    await H.clickAt($, H.prop(H.part($, null, "button", "PATIENTS ™  Version 1.5"), "loc"), null);
    // type "C" with commandKey
    await H.type($, "C");
    // choose browse tool
    H.choose("browse");
    // set lockScreen to false
    H.setGlobal("lockScreen", false);
  });
  // end GetButton
  // on GoCard
  H.on(owner, "GoCard", async function GoCard($) {
    let it = "";
    // go to first card
    await H.go($, {rel: "first"});
    // repeat
    while (true) {
      await H.tick();
      // answer "Install on this card?" with "Yes" or "No"
      it = await H.answer("Install on this card?", ["Yes", "No"]);
      // if it is "No"
      // then
      if (H.eq(it, "No")) {
        // go to next Card
        await H.go($, {rel: "next"});
      // else
      } else {
        // exit GoCard
        return;
      // end if
      }
    // end repeat
    }
  });
  // end GoCard
  // on GoStack
  H.on(owner, "GoStack", async function GoStack($) {
    // go to stack "home"
    await H.go($, {stack: "home"});
  });
  // end GoStack
  // on TheLevel
  H.on(owner, "TheLevel", async function TheLevel($) {
    let it = "";
    // global SaveLevel
    /* shared: H.g.savelevel */
    // put the userLevel into SaveLevel
    H.g.savelevel = H.f.userLevel();
    // set the userLevel to 4
    H.setGlobal("userLevel", 4);
    // if the userlevel < 4
    // then
    if (H.lt(H.f.userLevel(), 4)) {
      // answer "This stack is protected to userlevel" && the userLevel
      it = await H.answer(H.cat("This stack is protected to userlevel", " ", H.f.userLevel()));
      // answer "Please raise the level to 5"
      it = await H.answer("Please raise the level to 5");
      // set userlevel to SaveLevel
      H.setGlobal("userLevel", H.g.savelevel);
      // Exit to HyperCard
      throw H.ABORT;
    // end if
    }
  });
  // end TheLevel
}

// ---- script 45: card-227564/button-36 "PATIENTS ™  Version 1.5"
function script45(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // set cursor to watch
    H.setGlobal("cursor", "watch");
    // go to stack "PATIENTS ™  Version 1.5" in a new window
    await H.go($, {stack: "PATIENTS ™  Version 1.5"});
    // if the result is "Cancel" then exit mouseUp
    if (H.eq(H.f.result(), "Cancel")) {
      return;
    // else if the result <> empty then go to stack "PATIENTS ™  Version 1.5"
    } else if (!H.eq(H.f.result(), "")) {
      await H.go($, {stack: "PATIENTS ™  Version 1.5"});
    }
  });
  // end mouseUp
}

// ---- script 46: card card-260168 "Problem List"; card card-71469 "NAME CHANGE"; card card-4434 "PROBLEM LIST1"
function script46(owner) {
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    // DISABLE MENU "Procedure"
    H.unsupported("disable menu", "DISABLE MENU \"Procedure\"");
  });
  // end openCard
  // on closeCard
  H.on(owner, "closeCard", async function closeCard($) {
    // ENABLE MENU "Procedure"
    H.unsupported("enable menu", "ENABLE MENU \"Procedure\"");
  });
  // end closeCard
}

// ---- script 47: card-260168/field-2 "MEDICATION LIST"
function script47(owner) {
  // on closeField
  H.on(owner, "closeField", async function closeField($) {
    let N = "", it = "";
    // global HOProblemList
    /* shared: H.g.hoproblemlist */
    // put sortLines(CD field "MEDICATION LIST") into CD field "MEDICATION LIST"
    H.putInto(H.part($, "card", "field", "MEDICATION LIST"), await H.call($, "sortLines", [H.value(H.part($, "card", "field", "MEDICATION LIST"))], 'function'), "into");
    // put empty into HOProblemList
    H.g.hoproblemlist = "";
    // repeat with N=1 to the number of lines of me
    for (N of H.range(1, H.count("line", H.value(H.me($))))) {
      await H.tick();
      // get line N of me
      it = H.chunk(H.value(H.me($)), [["line", N]]);
      // if N>1 then put ";" after HOProblemList
      if (H.gt(N, 1)) {
        H.g.hoproblemlist = H.put(H.g.hoproblemlist, ";", "after");
      }
      // if it is empty then put "(-" after HOProblemList
      if (H.eq(it, "")) {
        H.g.hoproblemlist = H.put(H.g.hoproblemlist, "(-", "after");
      // else
      } else {
        // put it after HOProblemList
        H.g.hoproblemlist = H.put(H.g.hoproblemlist, it, "after");
      // end if
      }
    // end repeAT
    }
    // put HOProblemList into fld "Menu Holder"
    H.putInto(H.part($, null, "field", "Menu Holder"), H.g.hoproblemlist, "into");
  });
  // end closeField
}

// ---- script 48: card-260168/button-3 "MEDICATION LIST"
function script48(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    let it = "", NXTLINE = "";
    // global HOProblemList
    /* shared: H.g.hoproblemlist */
    // get PopMenu (the clickLoc,HOProblemList)
    it = await H.call($, "PopMenu", [H.f.clickLoc(), H.g.hoproblemlist], 'function');
    // if it > 0 then
    if (H.gt(it, 0)) {
      // put nextBlankLine("MEDICATION") into NXTLINE
      NXTLINE = await H.call($, "nextBlankLine", ["MEDICATION"], 'function');
      // put piece(HOProblemList,";",it) into line NXTLINE of field "MEDICATION"
      H.putInto(H.part($, null, "field", "MEDICATION"), await H.call($, "piece", [H.g.hoproblemlist, ";", it], 'function'), "into", [["line", NXTLINE]]);
    // end if
    }
  });
  // end mouseDown
}

// ---- script 49: card card-69212 "EXAM CHANGE"
function script49(owner) {
  // ON OPENCARD
  H.on(owner, "OPENCARD", async function OPENCARD($) {
    // DISABLE MENU "Procedure"
    H.unsupported("disable menu", "DISABLE MENU \"Procedure\"");
    // PASS OPENCARD
    return H.PASS;
  });
  // END OPENCARD
  // on closeCard
  H.on(owner, "closeCard", async function closeCard($) {
    // ENABLE MENU "Procedure"
    H.unsupported("enable menu", "ENABLE MENU \"Procedure\"");
  });
  // end closeCard
}

// ---- script 50: card-69212/field-1 "NFUMALE"
function script50(owner) {
  // (no handlers: the script only holds comments or text)
}

// ---- script 51: card-69212/button-10 "B (PRESS TO SET CHANGES)"
function script51(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // ANSWER "ARE YOU SURE YOU WANT TO CHANGE" WITH "YES" OR "NO"
    it = await H.answer("ARE YOU SURE YOU WANT TO CHANGE", ["YES", "NO"]);
    // IF IT IS "NO" THEN EXIT MOUSEUP
    if (H.eq(it, "NO")) {
      return;
    // ELSE
    } else {
      // LOCK SCREEN
      H.lockScreen();
      // PUSH CARD
      H.pushCard();
      // SET CURSOR TO BUSY
      H.setGlobal("cursor", "BUSY");
      // GLOBAL NFUMALE,NFUFEM,EXTEMALE,EXTEFEM
      /* shared: H.g.nfumale, H.g.nfufem, H.g.extemale, H.g.extefem */
      // PUT CD FLD "NFUFEM" INTO NFUFEM
      H.g.nfufem = H.value(H.part($, "card", "field", "NFUFEM"));
      // PUT CD FLD "NFUMALE" INTO NFUMALE
      H.g.nfumale = H.value(H.part($, "card", "field", "NFUMALE"));
      // PUT CD FLD "EXTEMALE" INTO EXTEMALE
      H.g.extemale = H.value(H.part($, "card", "field", "EXTEMALE"));
      // PUT CD FLD "EXTEFEM" INTO EXTEFEM
      H.g.extefem = H.value(H.part($, "card", "field", "EXTEFEM"));
      // GO TO BACKGROUND "PATIENT INFO"
      await H.go($, {rel: "first", bg: {key: "PATIENT INFO"}});
      // PUT NFUFEM INTO FLD "NFUFEM"
      H.putInto(H.part($, null, "field", "NFUFEM"), H.g.nfufem, "into");
      // PUT NFUMALE INTO FLD "NFUMALE"
      H.putInto(H.part($, null, "field", "NFUMALE"), H.g.nfumale, "into");
      // PUT EXTEMALE INTO FLD "EXTEMALE"
      H.putInto(H.part($, null, "field", "EXTEMALE"), H.g.extemale, "into");
      // PUT EXTEFEM INTO FLD "EXTEFEM"
      H.putInto(H.part($, null, "field", "EXTEFEM"), H.g.extefem, "into");
    // END IF
    }
    // POP CARD
    await H.popCard($);
    // UNLOCK SCREEN
    await H.unlockScreen();
    // PUT" WE ARE ALL DONE, DUDE"
    H.putInto(H.msgBox(), " WE ARE ALL DONE, DUDE", "into");
    // BEEP
    H.beep(1);
  });
  // end mouseUp
}

// ---- script 52: card-71469/button-1 "CHANGE NAME"
function script52(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", Z = "";
    // ANSWER "ARE YOU SURE YOU WANT TO CHANGE" WITH "YES" OR "NO"
    it = await H.answer("ARE YOU SURE YOU WANT TO CHANGE", ["YES", "NO"]);
    // IF IT IS "NO" THEN EXIT MOUSEUP
    if (H.eq(it, "NO")) {
      return;
    }
    // global NAME,NEWNAME,LOCAL,CDID
    /* shared: H.g.name, H.g.newname, H.g.local, H.g.cdid */
    // ask "WHAT IS THE NAME IN THE REPORT"
    it = await H.ask("WHAT IS THE NAME IN THE REPORT", "");
    // IF IT IS EMPTY THEN EXIT MOUSEUP
    if (H.eq(it, "")) {
      return;
    }
    // PUT IT INTO NAME
    H.g.name = it;
    // ask "WHAT IS THE NEW NAME"
    it = await H.ask("WHAT IS THE NEW NAME", "");
    // IF IT IS EMPTY THEN EXIT MOUSEUP
    if (H.eq(it, "")) {
      return;
    }
    // PUT IT INTO NEWNAME
    H.g.newname = it;
    // if NAME=NEWNAME then EXIT MOUSEUP
    if (H.eq(H.g.name, H.g.newname)) {
      return;
    }
    // PUSH CARD
    H.pushCard();
    // LOCK SCREEN
    H.lockScreen();
    // SET CURSOR TO BUSY
    H.setGlobal("cursor", "BUSY");
    // GET THE ID OF THIS CARD
    it = H.prop(H.card($, {rel: "this"}), "id");
    // PUT IT INTO CDID
    H.g.cdid = it;
    // GO TO CD "CARD REPORT" OF BACKGROUND "PATIENT INFO"
    await H.go($, {key: "CARD REPORT", bg: {key: "PATIENT INFO"}});
    // get THE SCRIPT OF BKGND BUTTON "PRINT"
    it = H.prop(H.part($, "bg", "button", "PRINT"), "script");
    // PUT IT INTO FLD "BOO"
    H.putInto(H.part($, null, "field", "BOO"), it, "into");
    // IF NAME IS NOT IN FLD "BOO" THEN
    if (!H.contains(H.value(H.part($, null, "field", "BOO")), H.g.name)) {
      // ANSWER "THERE IS NO SUCH DOCTOR'S NAME"
      it = await H.answer("THERE IS NO SUCH DOCTOR'S NAME");
      // POP CARD
      await H.popCard($);
      // EXIT MOUSEUP
      return;
    // END IF
    }
    // IF THE NUMBER OF CHARS IN NAME < 5
    // THEN
    if (H.lt(H.count("char", H.g.name), 5)) {
      // ANSWER "ARE YOU SURE THIS IS THE RIGHT NAME" WITH "YES" OR "NO"
      it = await H.answer("ARE YOU SURE THIS IS THE RIGHT NAME", ["YES", "NO"]);
      // IF IT IS "NO" THEN
      if (H.eq(it, "NO")) {
        // POP CARD
        await H.popCard($);
        // EXIT MOUSEUP
        return;
      // END IF
      }
    // end if
    }
    // GO TO CD "CARD REPORT" OF BACKGROUND "PATIENT INFO"
    await H.go($, {key: "CARD REPORT", bg: {key: "PATIENT INFO"}});
    // get THE SCRIPT OF BKGND BUTTON "PRINT"
    it = H.prop(H.part($, "bg", "button", "PRINT"), "script");
    // PUT IT INTO FLD "BOO"
    H.putInto(H.part($, null, "field", "BOO"), it, "into");
    // repeat with Z=1 TO NextBlankLine ("BOO")
    for (Z of H.range(1, await H.call($, "NextBlankLine", ["BOO"], 'function'))) {
      await H.tick();
      // if NAME IS IN LINE Z OF FLD "BOO" then
      if (H.contains(H.chunk(H.value(H.part($, null, "field", "BOO")), [["line", Z]]), H.g.name)) {
        // FIND WHOLE NAME
        await H.find($, H.g.name, "whole", null);
        // GET THE FOUNDCHUNK
        it = H.f.foundChunk();
        // PUT IT INTO LOCAL
        H.g.local = it;
        // DO "PUT NEWNAME INTO" && LOCAL
        await H.doScript($, H.cat("PUT NEWNAME INTO", " ", H.g.local));
      // END IF
      }
    // end repeat
    }
    // set SCRIPT OF BKGND BUTTON "PRINT" TO FLD "BOO"
    H.unsupported("set script", "set SCRIPT OF BKGND BUTTON \"PRINT\" TO FLD \"BOO\"");
    // GO TO CD "CARD REPORT" OF BACKGROUND "PATIENT INFO"
    await H.go($, {key: "CARD REPORT", bg: {key: "PATIENT INFO"}});
    // get THE SCRIPT OF BKGND BUTTON "DISP"
    it = H.prop(H.part($, "bg", "button", "DISP"), "script");
    // PUT IT INTO FLD "BOO"
    H.putInto(H.part($, null, "field", "BOO"), it, "into");
    // SELECT BEFORE TEXT OF FLD "BOO"
    H.select(H.part($, null, "field", "BOO"), null, "before");
    // repeat with Z=1 TO NextBlankLine ("BOO")
    for (Z of H.range(1, await H.call($, "NextBlankLine", ["BOO"], 'function'))) {
      await H.tick();
      // if NAME IS IN LINE Z OF FLD "BOO" then
      if (H.contains(H.chunk(H.value(H.part($, null, "field", "BOO")), [["line", Z]]), H.g.name)) {
        // FIND WHOLE NAME
        await H.find($, H.g.name, "whole", null);
        // GET THE FOUNDCHUNK
        it = H.f.foundChunk();
        // PUT IT INTO LOCAL
        H.g.local = it;
        // DO "PUT NEWNAME INTO" && LOCAL
        await H.doScript($, H.cat("PUT NEWNAME INTO", " ", H.g.local));
      // end if
      }
    // end repeat
    }
    // set SCRIPT OF BKGND BUTTON "DISP" TO FLD "BOO"
    H.unsupported("set script", "set SCRIPT OF BKGND BUTTON \"DISP\" TO FLD \"BOO\"");
    // GO TO CD "CARD REPORT" OF BACKGROUND "PATIENT INFO"
    await H.go($, {key: "CARD REPORT", bg: {key: "PATIENT INFO"}});
    // get THE SCRIPT OF BKGND BUTTON "N F/U MALE"
    it = H.prop(H.part($, "bg", "button", "N F/U MALE"), "script");
    // PUT IT INTO FLD "BOO"
    H.putInto(H.part($, null, "field", "BOO"), it, "into");
    // SELECT BEFORE TEXT OF FLD "BOO"
    H.select(H.part($, null, "field", "BOO"), null, "before");
    // repeat with Z=1 TO NextBlankLine ("BOO")
    for (Z of H.range(1, await H.call($, "NextBlankLine", ["BOO"], 'function'))) {
      await H.tick();
      // if NAME IS IN LINE Z OF FLD "BOO" then
      if (H.contains(H.chunk(H.value(H.part($, null, "field", "BOO")), [["line", Z]]), H.g.name)) {
        // FIND WHOLE NAME
        await H.find($, H.g.name, "whole", null);
        // GET THE FOUNDCHUNK
        it = H.f.foundChunk();
        // PUT IT INTO LOCAL
        H.g.local = it;
        // DO "PUT NEWNAME INTO" && LOCAL
        await H.doScript($, H.cat("PUT NEWNAME INTO", " ", H.g.local));
      // end if
      }
    // end repeat
    }
    // set SCRIPT OF BKGND BUTTON "N F/U MALE" TO FLD "BOO"
    H.unsupported("set script", "set SCRIPT OF BKGND BUTTON \"N F/U MALE\" TO FLD \"BOO\"");
    // GO TO CD "CARD REPORT" OF BACKGROUND "PATIENT INFO"
    await H.go($, {key: "CARD REPORT", bg: {key: "PATIENT INFO"}});
    // get THE SCRIPT OF BKGND BUTTON "N F/U FEM"
    it = H.prop(H.part($, "bg", "button", "N F/U FEM"), "script");
    // PUT IT INTO FLD "BOO"
    H.putInto(H.part($, null, "field", "BOO"), it, "into");
    // SELECT BEFORE TEXT OF FLD "BOO"
    H.select(H.part($, null, "field", "BOO"), null, "before");
    // repeat with Z=1 TO NextBlankLine ("BOO")
    for (Z of H.range(1, await H.call($, "NextBlankLine", ["BOO"], 'function'))) {
      await H.tick();
      // if NAME IS IN LINE Z OF FLD "BOO" then
      if (H.contains(H.chunk(H.value(H.part($, null, "field", "BOO")), [["line", Z]]), H.g.name)) {
        // FIND WHOLE NAME
        await H.find($, H.g.name, "whole", null);
        // GET THE FOUNDCHUNK
        it = H.f.foundChunk();
        // PUT IT INTO LOCAL
        H.g.local = it;
        // DO "PUT NEWNAME INTO" && LOCAL
        await H.doScript($, H.cat("PUT NEWNAME INTO", " ", H.g.local));
      // end if
      }
    // end repeat
    }
    // set SCRIPT OF BKGND BUTTON "N F/U FEM" TO FLD "BOO"
    H.unsupported("set script", "set SCRIPT OF BKGND BUTTON \"N F/U FEM\" TO FLD \"BOO\"");
    // GO TO CD "CARD REPORT" OF BACKGROUND "PATIENT INFO"
    await H.go($, {key: "CARD REPORT", bg: {key: "PATIENT INFO"}});
    // get THE SCRIPT OF BKGND BUTTON "N EXT MALE"
    it = H.prop(H.part($, "bg", "button", "N EXT MALE"), "script");
    // PUT IT INTO FLD "BOO"
    H.putInto(H.part($, null, "field", "BOO"), it, "into");
    // SELECT BEFORE TEXT OF FLD "BOO"
    H.select(H.part($, null, "field", "BOO"), null, "before");
    // repeat with Z=1 TO NextBlankLine ("BOO")
    for (Z of H.range(1, await H.call($, "NextBlankLine", ["BOO"], 'function'))) {
      await H.tick();
      // if NAME IS IN LINE Z OF FLD "BOO" then
      if (H.contains(H.chunk(H.value(H.part($, null, "field", "BOO")), [["line", Z]]), H.g.name)) {
        // FIND WHOLE NAME
        await H.find($, H.g.name, "whole", null);
        // GET THE FOUNDCHUNK
        it = H.f.foundChunk();
        // PUT IT INTO LOCAL
        H.g.local = it;
        // DO "PUT NEWNAME INTO" && LOCAL
        await H.doScript($, H.cat("PUT NEWNAME INTO", " ", H.g.local));
      // end if
      }
    // end repeat
    }
    // set SCRIPT OF BKGND BUTTON "N EXT MALE" TO FLD "BOO"
    H.unsupported("set script", "set SCRIPT OF BKGND BUTTON \"N EXT MALE\" TO FLD \"BOO\"");
    // GO TO CD "CARD REPORT" OF BACKGROUND "PATIENT INFO"
    await H.go($, {key: "CARD REPORT", bg: {key: "PATIENT INFO"}});
    // get THE SCRIPT OF BKGND BUTTON "N EXT FEM"
    it = H.prop(H.part($, "bg", "button", "N EXT FEM"), "script");
    // PUT IT INTO FLD "BOO"
    H.putInto(H.part($, null, "field", "BOO"), it, "into");
    // SELECT BEFORE TEXT OF FLD "BOO"
    H.select(H.part($, null, "field", "BOO"), null, "before");
    // repeat with Z=1 TO NextBlankLine ("BOO")
    for (Z of H.range(1, await H.call($, "NextBlankLine", ["BOO"], 'function'))) {
      await H.tick();
      // if NAME IS IN LINE Z OF FLD "BOO" then
      if (H.contains(H.chunk(H.value(H.part($, null, "field", "BOO")), [["line", Z]]), H.g.name)) {
        // FIND WHOLE NAME
        await H.find($, H.g.name, "whole", null);
        // GET THE FOUNDCHUNK
        it = H.f.foundChunk();
        // PUT IT INTO LOCAL
        H.g.local = it;
        // DO "PUT NEWNAME INTO" && LOCAL
        await H.doScript($, H.cat("PUT NEWNAME INTO", " ", H.g.local));
      // end if
      }
    // end repeat
    }
    // set SCRIPT OF BKGND BUTTON "N EXT FEM" TO FLD "BOO"
    H.unsupported("set script", "set SCRIPT OF BKGND BUTTON \"N EXT FEM\" TO FLD \"BOO\"");
    // POP CARD
    await H.popCard($);
    // UNLOCK SCREEN
    await H.unlockScreen();
    // PUT "WE ARE ALL DONE, DUDE"
    H.putInto(H.msgBox(), "WE ARE ALL DONE, DUDE", "into");
    // BEEP
    H.beep(1);
  });
  // END MOUSEUP
}

// ---- script 53: card-71469/button-4 "CHANGE NAME OF COMPANY"
function script53(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", NAME = "";
    // ask "WRITE NEW FOR COMPANY"
    it = await H.ask("WRITE NEW FOR COMPANY", "");
    // IF IT IS EMPTY THEN EXIT MOUSEUP
    if (H.eq(it, "")) {
      return;
    }
    // PUT IT INTO NAME
    NAME = it;
    // GO TO CD "TITLE"
    await H.go($, {key: "TITLE"});
    // PUT EMPTY INTO CD FLD "NAME"
    H.putInto(H.part($, "card", "field", "NAME"), "", "into");
    // PUT NAME INTO CD FLD "NAME"
    H.putInto(H.part($, "card", "field", "NAME"), NAME, "into");
  });
  // end mouseUp
}

// ---- script 54: card-50843/button-1 "UPDATE"
function script54(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", N = "";
    // GLOBAL NAMEVAR, IDEAR, DATEVAR
    /* shared: H.g.namevar, H.g.idear, H.g.datevar */
    // PUT EMPTY INTO DATEVAR
    H.g.datevar = "";
    // PUT EMPTY INTO NAMEVAR
    H.g.namevar = "";
    // SET CURSOR TO BUSY
    H.setGlobal("cursor", "BUSY");
    // SET LOCKSCREEN TO TRUE
    H.setGlobal("lockScreen", true);
    // SET LOCKMESSAGES TO TRUE
    H.setGlobal("lockMessages", true);
    // GET THE ID OF THIS CARD
    it = H.prop(H.card($, {rel: "this"}), "id");
    // PUT IT INTO IDEAR
    H.g.idear = it;
    // GO TO BG "PATIENT INFO"
    await H.go($, {rel: "first", bg: {key: "PATIENT INFO"}});
    // SORT BY LAST WORD OF FLD "NAME"
    H.unsupported("sort cards", "SORT BY LAST WORD OF FLD \"NAME\"");
    // REPEAT WITH N= 1 TO THE NUMBER OF CDS
    for (N of H.range(1, H.countCards())) {
      await H.tick();
      // GO NEXT CARD
      await H.go($, {rel: "next"});
      // GET SHORT NAME OF BKGND
      it = H.prop(H.bg($, {rel: "this"}), "short name");
      // IF IT IS "TITLE" THEN NEXT REPEAT
      if (H.eq(it, "TITLE")) {
        continue;
      }
      // IF IT IS "MAINTENANCE" THEN NEXT REPEAT
      if (H.eq(it, "MAINTENANCE")) {
        continue;
      }
      // IF IT IS "HELP" THEN NEXT REPEAT
      if (H.eq(it, "HELP")) {
        continue;
      }
      // IF IT IS "LOGO" THEN NEXT REPEAT
      if (H.eq(it, "LOGO")) {
        continue;
      }
      // PUT LAST WORD OF FLD "NAME"&","&FIRST WORD OF¬ FLD "NAME"&RETURN AFTER NAMEVAR
      H.g.namevar = H.put(H.g.namevar, H.cat(H.chunk(H.value(H.part($, null, "field", "NAME")), [["word", "last"]]), ",", H.chunk(H.value(H.part($, null, "field", "NAME")), [["word", 1]]), "\n"), "after");
    // END REPEAT
    }
    // GO TO IDEAR
    await H.go($, {key: H.g.idear});
    // PUT NAMEVAR INTO CD FLD "PATIENTS"
    H.putInto(H.part($, "card", "field", "PATIENTS"), H.g.namevar, "into");
    // SET LOCKSCREEN TO FALSE
    H.setGlobal("lockScreen", false);
    // SET LOCKMESSAGES TO FALSE
    H.setGlobal("lockMessages", false);
    // PUT THE TIME INTO CD FLD "TIME"
    H.putInto(H.part($, "card", "field", "TIME"), H.f.time(), "into");
    // PUT THE DATE INTO CD FLD "DATE1"
    H.putInto(H.part($, "card", "field", "DATE1"), H.f.date(), "into");
  });
  // end mouseUp
}

// ---- script 55: card-50843/field-4 "PATIENTS"
function script55(owner) {
  // ON MOUSEUP
  H.on(owner, "MOUSEUP", async function MOUSEUP($) {
    let LINENUM = "";
    // put mouseToLine() into LINENUM
    LINENUM = await H.call($, "mouseToLine", [], 'function');
    // select line LINENUM of target
    H.select(H.target($), [["line", LINENUM]], "on");
    // put FIRST ITEM OF line LINENUM of CD field "PATIENTS" into IT
    it = H.chunk(H.value(H.part($, "card", "field", "PATIENTS")), [["line", LINENUM], ["item", 1]]);
    // put "Find" && quote & it & quote into msg
    H.putInto(H.msgBox(), H.cat("Find", " ", "\"", it, "\""), "into");
    // hide msg
    H.hide(H.msgBox());
    // type return
    await H.type($, "\n");
    // type return
    await H.type($, "\n");
    // type return
    await H.type($, "\n");
  });
  // END MOUSEUP
}

// ---- script 56: card-50843/button-6 "Find"
function script56(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "";
    // SELECT BEFORE TEXT OF CD FLD "PATIENTS"
    H.select(H.part($, "card", "field", "PATIENTS"), null, "before");
    // ask "Find what?"
    it = await H.ask("Find what?", "");
    // if it is not empty then
    if (!H.eq(it, "")) {
      // put "Find" && quote & it & quote into msg
      H.putInto(H.msgBox(), H.cat("Find", " ", "\"", it, "\""), "into");
      // hide msg
      H.hide(H.msgBox());
      // type return
      await H.type($, "\n");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 57: card-4434/field-7 "Problem List"
function script57(owner) {
  // on closeField
  H.on(owner, "closeField", async function closeField($) {
    let N = "", it = "";
    // global HOProblemList1
    /* shared: H.g.hoproblemlist1 */
    // put sortLines(CD field "PROBLEM LIST") into CD field "PROBLEM LIST"
    H.putInto(H.part($, "card", "field", "PROBLEM LIST"), await H.call($, "sortLines", [H.value(H.part($, "card", "field", "PROBLEM LIST"))], 'function'), "into");
    // put empty into HOProblemList1
    H.g.hoproblemlist1 = "";
    // repeat with N=1 to the number of lines of me
    for (N of H.range(1, H.count("line", H.value(H.me($))))) {
      await H.tick();
      // get line N of me
      it = H.chunk(H.value(H.me($)), [["line", N]]);
      // if N>1 then put ";" after HOProblemList1
      if (H.gt(N, 1)) {
        H.g.hoproblemlist1 = H.put(H.g.hoproblemlist1, ";", "after");
      }
      // if it is empty then put "(-" after HOProblemList1
      if (H.eq(it, "")) {
        H.g.hoproblemlist1 = H.put(H.g.hoproblemlist1, "(-", "after");
      // else
      } else {
        // put it after HOProblemList1
        H.g.hoproblemlist1 = H.put(H.g.hoproblemlist1, it, "after");
      // end if
      }
    // end repeat
    }
    // put HOProblemList1 into fld "Menu Holder"
    H.putInto(H.part($, null, "field", "Menu Holder"), H.g.hoproblemlist1, "into");
  });
  // end closeField
}

// ---- script 58: card-4434/button-8 "Problem list"
function script58(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    let it = "", NXTLINE = "";
    // global HOProblemList1
    /* shared: H.g.hoproblemlist1 */
    // get PopMenu (the clickLoc,HOProblemList1)
    it = await H.call($, "PopMenu", [H.f.clickLoc(), H.g.hoproblemlist1], 'function');
    // if it > 0 then
    if (H.gt(it, 0)) {
      // put nextBlankLine("Problems") into NXTLINE
      NXTLINE = await H.call($, "nextBlankLine", ["Problems"], 'function');
      // put piece(HOProblemList1,";",it) into line NXTLINE¬ of field "ProBLems"
      H.putInto(H.part($, null, "field", "ProBLems"), await H.call($, "piece", [H.g.hoproblemlist1, ";", it], 'function'), "into", [["line", NXTLINE]]);
    // end if
    }
  });
  // end mouseDown
}

// ---- script 59: card-4434/button-10 "RESET"
function script59(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // GO TO BG ID 2721
    await H.go($, {rel: "first", bg: {id: 2721}});
    // SHOW BG BTN "NEW PATIENT"
    H.show(H.part($, "bg", "button", "NEW PATIENT"));
    // HIDE FLD "TYPE"
    H.hide(H.part($, null, "field", "TYPE"));
    // HIDE FLD "CC"
    H.hide(H.part($, null, "field", "CC"));
    // IF THE VISIBLE OF FIELD "ABNORMAL" IS TRUE THEN SEND MOUSEUP¬ TO BG BTN "HIDE ABN"
    if (H.eq(H.prop(H.part($, null, "field", "ABNORMAL"), "visible"), true)) {
      await H.send($, "MOUSEUP", H.part($, "bg", "button", "HIDE ABN"));
    }
    // SHOW BG BTN "NEW PATIENT"
    H.show(H.part($, "bg", "button", "NEW PATIENT"));
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-2721");  // background bkgnd-2721 "PATIENT INFO"
script2("bkgnd-2721/button-21");  // bkgnd-2721/button-21 "Next"
script3("bkgnd-2721/button-22");  // bkgnd-2721/button-22 "Prev"
script4("bkgnd-2721/button-34");  // bkgnd-2721/button-34 "RETURN"
script5("bkgnd-2721/field-35");  // bkgnd-2721/field-35 "Name"
script6("bkgnd-2721/field-36");  // bkgnd-2721/field-36 "DOB"
script7("bkgnd-2721/field-51");  // bkgnd-2721/field-51 "MEDICATION"
script7("bkgnd-2721/field-106");  // bkgnd-2721/field-106 "PROBLEMS"
script8("bkgnd-2721/button-64");  // bkgnd-2721/button-64 "New Patient"
script9("bkgnd-2721/button-65");  // bkgnd-2721/button-65 "Sort"
script10("bkgnd-2721/button-66");  // bkgnd-2721/button-66 "Find"
script11("bkgnd-2721/button-74");  // bkgnd-2721/button-74 "Show Notes"
script12("bkgnd-2721/button-80");  // bkgnd-2721/button-80 "Print"
script13("bkgnd-2721/button-99");  // bkgnd-2721/button-99 "MEDICATION LIST"
script14("bkgnd-2721/button-107");  // bkgnd-2721/button-107 "PROBLEM LIST"
script15("bkgnd-2721/button-120");  // bkgnd-2721/button-120 "Home"
script16("bkgnd-2721/button-125");  // bkgnd-2721/button-125 "N F/U MALE"
script17("bkgnd-2721/button-126");  // bkgnd-2721/button-126 "N F/U FEM"
script18("bkgnd-2721/button-127");  // bkgnd-2721/button-127 "N EXT MALE"
script19("bkgnd-2721/button-139");  // bkgnd-2721/button-139 "show cc"
script20("bkgnd-2721/button-140");  // bkgnd-2721/button-140 "pelvic"
script21("bkgnd-2721/button-151");  // bkgnd-2721/button-151 "SHOW ABN"
script22("bkgnd-2721/button-128");  // bkgnd-2721/button-128 "N EXT FEM"
script23("bkgnd-2721/button-133");  // bkgnd-2721/button-133 "CC"
script24("bkgnd-2721/button-134");  // bkgnd-2721/button-134 "DISP"
script25("bkgnd-2721/button-138");  // bkgnd-2721/button-138 "IMP"
script26("bkgnd-2721/button-155");  // bkgnd-2721/button-155 "RETURN"
script27("bkgnd-2721/button-161");  // bkgnd-2721/button-161 "SHOW REF"
script28("bkgnd-2721/button-163");  // bkgnd-2721/button-163 "Show allergy"
script29("bkgnd-2721/field-147");  // bkgnd-2721/field-147 "Sex"
script30("bkgnd-2721/button-153");  // bkgnd-2721/button-153 "New Button"
script31("bkgnd-2721/field-44");  // bkgnd-2721/field-44 "notes"
script32("bkgnd-201455/button-1");  // bkgnd-201455/button-1 "Home"
script33("bkgnd-201455/button-2");  // bkgnd-201455/button-2 "Sort All"
script34("bkgnd-201455/button-3");  // bkgnd-201455/button-3 "Find"
script35("bkgnd-201455/button-4");  // bkgnd-201455/button-4 "Options"
script36("bkgnd-201455/button-5");  // bkgnd-201455/button-5 ""
script37("bkgnd-201455/button-6");  // bkgnd-201455/button-6 "PATIENT INFORMATION"
script38("bkgnd-201455/button-8");  // bkgnd-201455/button-8 "PATIENT LIST"
script39("bkgnd-259661/button-1");  // bkgnd-259661/button-1 "Return"
script40("bkgnd-259661/button-3");  // bkgnd-259661/button-3 "Next"
script41("bkgnd-259661/field-4");  // bkgnd-259661/field-4 "Menu Holder"
script42("card-227564");  // card card-227564 "Title"
script43("card-227564/field-10");  // card-227564/field-10 "About1"
script44("card-227564/button-35");  // card-227564/button-35 "install"
script45("card-227564/button-36");  // card-227564/button-36 "PATIENTS ™  Version 1.5"
script46("card-260168");  // card card-260168 "Problem List"
script46("card-71469");  // card card-71469 "NAME CHANGE"
script46("card-4434");  // card card-4434 "PROBLEM LIST1"
script47("card-260168/field-2");  // card-260168/field-2 "MEDICATION LIST"
script48("card-260168/button-3");  // card-260168/button-3 "MEDICATION LIST"
script49("card-69212");  // card card-69212 "EXAM CHANGE"
script50("card-69212/field-1");  // card-69212/field-1 "NFUMALE"
script51("card-69212/button-10");  // card-69212/button-10 "B (PRESS TO SET CHANGES)"
script52("card-71469/button-1");  // card-71469/button-1 "CHANGE NAME"
script53("card-71469/button-4");  // card-71469/button-4 "CHANGE NAME OF COMPANY"
script54("card-50843/button-1");  // card-50843/button-1 "UPDATE"
script55("card-50843/field-4");  // card-50843/field-4 "PATIENTS"
script56("card-50843/button-6");  // card-50843/button-6 "Find"
script57("card-4434/field-7");  // card-4434/field-7 "Problem List"
script58("card-4434/button-8");  // card-4434/button-8 "Problem list"
script59("card-4434/button-10");  // card-4434/button-10 "RESET"
};
