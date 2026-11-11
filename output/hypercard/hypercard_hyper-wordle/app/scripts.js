// HyperTalk scripts of Hyper-Wordle (Hyper-Wordle.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // function getStackPath
  H.fn(owner, "getStackPath", async function getStackPath($) {
    let thePath = "", theQuote = "";
    // put "" into thePath
    thePath = "";
    // put the long name of this stack into thePath
    thePath = H.prop(H.stack(), "long name");
    // put offset(quote, thePath) into theQuote
    theQuote = H.f.offset("\"", thePath);
    // if theQuote > 0 then
    if (H.gt(theQuote, 0)) {
      // delete char 1 to theQuote of thePath
      thePath = H.del(thePath, [["char", 1, theQuote]]);
      // put offset(quote, thePath) into theQuote
      theQuote = H.f.offset("\"", thePath);
      // if theQuote > 0 then
      if (H.gt(theQuote, 0)) {
        // delete char (theQuote - 1 - length(the short name of this stack)) to theQuote of thePath
        thePath = H.del(thePath, [["char", (H.num(theQuote) - 1 - H.f.length(H.prop(H.stack(), "short name"))), theQuote]]);
      // end if
      }
    // end if
    }
    // return thePath
    return thePath;
  });
  // end getStackPath
  // function loadWords stackPath, fileName
  H.fn(owner, "loadWords", async function loadWords($, stackPath, fileName) {
    let theWords = "", filePath = "", it = "";
    // put empty into theWords
    theWords = "";
    // put stackPath & ":" & fileName into filePath
    filePath = H.cat(stackPath, ":", fileName);
    // open file filePath
    H.openFile(filePath);
    // if the result is empty then
    if (H.eq(H.f.result(), "")) {
      // repeat
      while (true) {
        await H.tick();
        // set the cursor to busy
        H.setGlobal("cursor", "busy");
        // read from file filePath for 16384 -- maximum read is 16K
        it = H.readFile(filePath, 16384, null);
        // if it is empty then exit repeat
        if (H.eq(it, "")) {
          break;
        // else put it after theWords
        } else {
          theWords = H.put(theWords, it, "after");
        }
      // end repeat
      }
      // close file filePath
      await H.closeFile(filePath);
    // else
    } else {
      // answer "Error opening file " & filePath & ". The error is: " & the result
      it = await H.answer(H.cat("Error opening file ", filePath, ". The error is: ", H.f.result()));
    // end if
    }
    // set the cursor to hand
    H.setGlobal("cursor", "hand");
    // return theWords
    return theWords;
  });
  // end loadWords
  // function centerPoint theRect
  H.fn(owner, "centerPoint", async function centerPoint($, theRect) {
    let theLeft = "", theTop = "", theRight = "", theBottom = "", thePoint = "";
    // put item 1 of theRect into theLeft
    theLeft = H.chunk(theRect, [["item", 1]]);
    // put item 2 of theRect into theTop
    theTop = H.chunk(theRect, [["item", 2]]);
    // put item 3 of theRect into theRight
    theRight = H.chunk(theRect, [["item", 3]]);
    // put item 4 of theRect into theBottom
    theBottom = H.chunk(theRect, [["item", 4]]);
    // put (theLeft + round((theRight - theLeft) / 2)) & "," & ¬ (theTop + round((theBottom - theTop) / 2)) into thePoint
    thePoint = H.cat((H.num(theLeft) + H.f.round((H.num(theRight) - H.num(theLeft)) / 2)), ",", (H.num(theTop) + H.f.round((H.num(theBottom) - H.num(theTop)) / 2)));
    // return thePoint
    return thePoint;
  });
  // end centerPoint
  // on drawLine startPoint, endPoint
  H.on(owner, "drawLine", async function drawLine($, startPoint, endPoint) {
    // choose line tool
    H.choose("line");
    // set lineSize to 2
    H.setGlobal("lineSize", 2);
    // drag from startPoint to endPoint
    await H.drag($, startPoint, endPoint);
    // choose browse tool
    H.choose("browse");
  });
  // end drawLine
  // on eraseLine startPoint, endPoint
  H.on(owner, "eraseLine", async function eraseLine($, startPoint, endPoint) {
    // choose eraser tool
    H.choose("eraser");
    // drag from startPoint to endPoint
    await H.drag($, startPoint, endPoint);
    // choose browse tool
    H.choose("browse");
  });
  // end eraseLine
  // on checkUserCancel
  H.on(owner, "checkUserCancel", async function checkUserCancel($) {
    // if the mouseClick then
    if (H.bool(H.f.mouseClick())) {
      // choose browse tool
      H.choose("browse");
      // exit to hyperCard
      throw H.ABORT;
    // end if
    }
  });
  // end checkUserCancel
}

// ---- script 1: background bkgnd-11532 "Graphs"
function script1(owner) {
  // on clearScreen
  H.on(owner, "clearScreen", async function clearScreen($) {
    // choose "Select Tool"
    H.choose("select");
    // doMenu "Select All"
    await H.doMenu($, "Select All");
    // doMenu "Clear Picture"
    await H.doMenu($, "Clear Picture");
  });
  // end clearScreen
  // on setFont fontName,fontSize,fontAlignment,fontStyle
  H.on(owner, "setFont", async function setFont($, fontName, fontSize, fontAlignment, fontStyle) {
    // if fontName is not empty then set textFont to fontName
    if (!H.eq(fontName, "")) {
      H.setGlobal("textFont", fontName);
    }
    // if fontSize is not empty then set textSize to fontSize
    if (!H.eq(fontSize, "")) {
      H.setGlobal("textSize", fontSize);
    }
    // if fontSize is not empty then set textheight to fontSize
    if (!H.eq(fontSize, "")) {
      H.setGlobal("textHeight", fontSize);
    }
    // if fontAlignment is not empty then set textAlign to fontAlignment
    if (!H.eq(fontAlignment, "")) {
      H.setGlobal("textAlign", fontAlignment);
    }
    // if fontStyle is not empty then set textStyle to fontStyle
    if (!H.eq(fontStyle, "")) {
      H.setGlobal("textStyle", fontStyle);
    }
  });
  // end setFont
  // function stripReturns theText -- remove all trailing return chars
  H.fn(owner, "stripReturns", async function stripReturns($, theText) {
    // repeat until last char of theText ≠ return
    while (!(!H.eq(H.chunk(theText, [["char", "last"]]), "\n"))) {
      await H.tick();
      // delete last char of theText
      theText = H.del(theText, [["char", "last"]]);
    // end repeat
    }
    // return theText
    return theText;
  });
  // end stripReturns
  // function validatedData data,labels
  H.fn(owner, "validatedData", async function validatedData($, data, labels) {
    let numData = "", count = "";
    // put max(number of lines in data,number of lines in labels) into numData
    numData = H.f.max(H.count("line", data), H.count("line", labels));
    // repeat with count = 1 to numData
    for (count of H.range(1, numData)) {
      await H.tick();
      // if ((line count of data is not a number) or ¬ (line count of data < 0) or (line count of data is empty))
      // then put zero into line count of data
      if (((!H.isA(H.chunk(data, [["line", count]]), "number") || H.lt(H.chunk(data, [["line", count]]), 0)) || H.eq(H.chunk(data, [["line", count]]), ""))) {
        data = H.put(data, 0, "into", [["line", count]]);
      }
    // end repeat
    }
    // return data
    return data;
  });
  // end validatedData
  // function roundUp anyNumber
  H.fn(owner, "roundUp", async function roundUp($, anyNumber) {
    let wholeNumber = "", divisor = "";
    // put trunc(anyNumber) into wholeNumber
    wholeNumber = H.f.trunc(anyNumber);
    // put (10^(length(wholeNumber) - 1)) into divisor
    divisor = (10 ** (H.f.length(wholeNumber) - 1));
    // if wholeNumber mod divisor = 0 then return wholeNumber
    if (H.eq(H.mod(wholeNumber, divisor), 0)) {
      return wholeNumber;
    // else return (trunc((wholeNumber/divisor) + 1)) * divisor
    } else {
      return H.f.trunc((H.num(wholeNumber) / H.num(divisor)) + 1) * H.num(divisor);
    }
  });
  // end roundUp
  // function rectWidth theRect
  H.fn(owner, "rectWidth", async function rectWidth($, theRect) {
    // return item 3 of theRect - item 1 of theRect
    return H.num(H.chunk(theRect, [["item", 3]])) - H.num(H.chunk(theRect, [["item", 1]]));
  });
  // end rectWidth
  // function rectHeight theRect
  H.fn(owner, "rectHeight", async function rectHeight($, theRect) {
    // return item 4 of theRect - item 2 of theRect
    return H.num(H.chunk(theRect, [["item", 4]])) - H.num(H.chunk(theRect, [["item", 2]]));
  });
  // end rectHeight
  // function getMaxValue dataList
  H.fn(owner, "getMaxValue", async function getMaxValue($, dataList) {
    // sort dataList descending numeric
    dataList = H.sort(dataList, "line", "descending", "numeric");
    // return line 1 of dataList +1
    return H.num(H.chunk(dataList, [["line", 1]])) + 1;
  });
  // end getMaxValue
  // function maxChars textList
  H.fn(owner, "maxChars", async function maxChars($, textList) {
    let longest = "", theLine = "";
    // put 0 into longest
    longest = 0;
    // repeat with theLine = 1 to the number of lines in textList
    for (theLine of H.range(1, H.count("line", textList))) {
      await H.tick();
      // if length(line theLine of textList) > longest
      // then put length(line theLine of textList) into longest
      if (H.gt(H.f.length(H.chunk(textList, [["line", theLine]])), longest)) {
        longest = H.f.length(H.chunk(textList, [["line", theLine]]));
      }
    // end repeat
    }
    // return longest
    return longest;
  });
  // end maxChars
}

// ---- script 2: bkgnd-11532/field-36 "labels"
function script2(owner) {
  // on tabKey
  H.on(owner, "tabKey", async function tabKey($) {
    let theLine = "";
    // put word 2 of the selectedLine into theLine
    theLine = H.chunk(H.f.selectedLine(), [["word", 2]]);
    // if last char of bg field "Data" ≠ return
    // then put return after bg field "Data"
    if (!H.eq(H.chunk(H.value(H.part($, "bg", "field", "Data")), [["char", "last"]]), "\n")) {
      H.putInto(H.part($, "bg", "field", "Data"), "\n", "after");
    }
    // select after line theLine of bg field "Data"
    H.select(H.part($, "bg", "field", "Data"), [["line", theLine]], "after");
  });
  // end tabKey
}

// ---- script 3: bkgnd-11532/field-35 "data"
function script3(owner) {
  // on tabKey
  H.on(owner, "tabKey", async function tabKey($) {
    let theLine = "";
    // put word 2 of the selectedLine into theLine
    theLine = H.chunk(H.f.selectedLine(), [["word", 2]]);
    // if last char of bg field "Labels" ≠ return
    // then put return after bg field "Labels"
    if (!H.eq(H.chunk(H.value(H.part($, "bg", "field", "Labels")), [["char", "last"]]), "\n")) {
      H.putInto(H.part($, "bg", "field", "Labels"), "\n", "after");
    }
    // select after line theLine of bg field "Labels"
    H.select(H.part($, "bg", "field", "Labels"), [["line", theLine]], "after");
  });
  // end tabKey
}

// ---- script 4: bkgnd-11532/field-70 "percent total"; bkgnd-11532/field-71 "total"; bkgnd-11532/button-72 "Total:"
function script4(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // updateTotals
    await H.call($, "updateTotals", []);  // not defined in this stack (XCMD or other stack)
  });
  // end mouseDown
}

// ---- script 5: bkgnd-11532/button-50 "Legend"
function script5(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // set cursor to "Grab Hand"
    H.setGlobal("cursor", "Grab Hand");
    // hide bg btn "GrowLegend"
    H.hide(H.part($, "bg", "button", "GrowLegend"));
    // doDragBtn name of me,0,62,width of card window,height of card window
    await H.call($, "doDragBtn", [H.prop(H.me($), "name"), 0, 62, H.prop(H.cardWindow(), "width"), H.prop(H.cardWindow(), "height")]);  // not defined in this stack (XCMD or other stack)
    // set botRight of bg btn "GrowLegend" to botRight of me
    H.setProp(H.part($, "bg", "button", "GrowLegend"), "botRight", H.prop(H.me($), "botRight"));
    // show bg btn "GrowLegend"
    H.show(H.part($, "bg", "button", "GrowLegend"));
  });
  // end mouseDown
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    // drawChart
    await H.call($, "drawChart", []);
  });
  // end mouseup
}

// ---- script 6: bkgnd-11532/button-51 "growLegend"
function script6(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    let frameRect = "", halfMyWidth = "", halfMyHeight = "", dataCount = "", maxLabelSize = "", maxWidth = "", maxHeight = "", cardWidth = "", cardHeight = "", newLoc = "";
    // set cursor to arrow
    H.setGlobal("cursor", "arrow");
    // set icon of me to "Inverse Grow Box"
    H.setProp(H.me($), "icon", "Inverse Grow Box");
    // set style of me to rectangle
    H.setProp(H.me($), "style", "rectangle");
    // set style of bg btn "Legend" to "rectangle"
    H.setProp(H.part($, "bg", "button", "Legend"), "style", "rectangle");
    // put the rect of bg btn "Legend" into frameRect
    frameRect = H.prop(H.part($, "bg", "button", "Legend"), "rect");
    // put width of me div 2 into halfMyWidth
    halfMyWidth = H.div(H.prop(H.me($), "width"), 2);
    // put height of me div 2 into halfMyHeight
    halfMyHeight = H.div(H.prop(H.me($), "height"), 2);
    // put number of lines of validatedData(bg field "Data") into dataCount
    dataCount = H.count("line", await H.call($, "validatedData", [H.value(H.part($, "bg", "field", "Data"))], 'function'));
    // put maxChars(stripReturns(bg field "Labels")) * 8 into maxLabelSize
    maxLabelSize = H.num(await H.call($, "maxChars", [await H.call($, "stripReturns", [H.value(H.part($, "bg", "field", "Labels"))], 'function')], 'function')) * 8;
    // put maxLabelSize + 70 into maxWidth
    maxWidth = H.num(maxLabelSize) + 70;
    // put (dataCount * 17) + 20 into maxHeight
    maxHeight = (H.num(dataCount) * 17) + 20;
    // put width of card window into cardWidth
    cardWidth = H.prop(H.cardWindow(), "width");
    // put height of card window into cardHeight
    cardHeight = H.prop(H.cardWindow(), "height");
    // repeat until the mouse is up
    while (!(H.eq(H.f.mouse(), "up"))) {
      await H.tick();
      // put the mouseLoc into newLoc
      newLoc = H.f.mouseLoc();
      // if item 1 of newLoc <= (item 1 of frameRect + maxWidth)
      // then put item 1 of frameRect + (maxWidth - halfMyWidth) ¬ into item 1 of newLoc
      if (H.le(H.chunk(newLoc, [["item", 1]]), (H.num(H.chunk(frameRect, [["item", 1]])) + H.num(maxWidth)))) {
        newLoc = H.put(newLoc, H.num(H.chunk(frameRect, [["item", 1]])) + (H.num(maxWidth) - H.num(halfMyWidth)), "into", [["item", 1]]);
      }
      // put min(item 1 of newLoc,cardWidth - halfMyWidth) ¬ into item 1 of newLoc
      newLoc = H.put(newLoc, H.f.min(H.chunk(newLoc, [["item", 1]]), H.num(cardWidth) - H.num(halfMyWidth)), "into", [["item", 1]]);
      // if item 2 of newLoc <= (item 2 of frameRect + maxHeight)
      // then put item 2 of frameRect + (maxHeight - halfMyHeight) ¬ into item 2 of newLoc
      if (H.le(H.chunk(newLoc, [["item", 2]]), (H.num(H.chunk(frameRect, [["item", 2]])) + H.num(maxHeight)))) {
        newLoc = H.put(newLoc, H.num(H.chunk(frameRect, [["item", 2]])) + (H.num(maxHeight) - H.num(halfMyHeight)), "into", [["item", 2]]);
      }
      // put min(item 2 of newLoc,cardHeight - halfMyHeight) ¬ into item 2 of newLoc
      newLoc = H.put(newLoc, H.f.min(H.chunk(newLoc, [["item", 2]]), H.num(cardHeight) - H.num(halfMyHeight)), "into", [["item", 2]]);
      // set loc of me to newLoc
      H.setProp(H.me($), "loc", newLoc);
      // put bottom of me into item 4 of frameRect -- new bottom
      frameRect = H.put(frameRect, H.prop(H.me($), "bottom"), "into", [["item", 4]]);
      // put right of me into item 3 of frameRect -- new right
      frameRect = H.put(frameRect, H.prop(H.me($), "right"), "into", [["item", 3]]);
      // set rect of bg btn "Legend" to frameRect
      H.setProp(H.part($, "bg", "button", "Legend"), "rect", frameRect);
    // end repeat
    }
    // set icon of me to "Grow Box"
    H.setProp(H.me($), "icon", "Grow Box");
    // set style of me to rectangle
    H.setProp(H.me($), "style", "rectangle");
  });
  // end mouseDown
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    // drawChart
    await H.call($, "drawChart", []);
  });
  // end mouseup
}

// ---- script 7: bkgnd-11532/field-63 "graph info"
function script7(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // showInfo false
    await H.call($, "showInfo", [false]);  // not defined in this stack (XCMD or other stack)
  });
  // end mouseUp
}

// ---- script 8: card card-2990 "game"
function script8(owner) {
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    // global gDebug
    /* shared: H.g.gdebug */
    // global gCode
    /* shared: H.g.gcode */
    // put false into gDebug
    H.g.gdebug = false;
    // put false into gCode
    H.g.gcode = false;
    // set the name of card button ID 125 to "Gaming"
    H.setProp(H.part($, "card", "button", {id: 125}), "name", "Gaming");
    // if gDebug is true then
    if (H.eq(H.g.gdebug, true)) {
      // show card button ID 125
      H.show(H.part($, "card", "button", {id: 125}));
      // show card button "load"
      H.show(H.part($, "card", "button", "load"));
      // show card button "reset"
      H.show(H.part($, "card", "button", "reset"));
      // show card field "row"
      H.show(H.part($, "card", "field", "row"));
      // show card field "col"
      H.show(H.part($, "card", "field", "col"));
      // show card field "word"
      H.show(H.part($, "card", "field", "word"));
      // show card field "we won"
      H.show(H.part($, "card", "field", "we won"));
      // show card field "game number"
      H.show(H.part($, "card", "field", "game number"));
      // show card field "words"
      H.show(H.part($, "card", "field", "words"));
      // show card field "acceptable 1"
      H.show(H.part($, "card", "field", "acceptable 1"));
      // show card field "acceptable 2"
      H.show(H.part($, "card", "field", "acceptable 2"));
      // show card field "acceptable 3"
      H.show(H.part($, "card", "field", "acceptable 3"));
    // else
    } else {
      // hide card button ID 125
      H.hide(H.part($, "card", "button", {id: 125}));
      // hide card button "load"
      H.hide(H.part($, "card", "button", "load"));
      // hide card button "reset"
      H.hide(H.part($, "card", "button", "reset"));
      // hide card field "row"
      H.hide(H.part($, "card", "field", "row"));
      // hide card field "col"
      H.hide(H.part($, "card", "field", "col"));
      // hide card field "word"
      H.hide(H.part($, "card", "field", "word"));
      // hide card field "we won"
      H.hide(H.part($, "card", "field", "we won"));
      // hide card field "game number"
      H.hide(H.part($, "card", "field", "game number"));
      // hide card field "words"
      H.hide(H.part($, "card", "field", "words"));
      // hide card field "acceptable 1"
      H.hide(H.part($, "card", "field", "acceptable 1"));
      // hide card field "acceptable 2"
      H.hide(H.part($, "card", "field", "acceptable 2"));
      // hide card field "acceptable 3"
      H.hide(H.part($, "card", "field", "acceptable 3"));
    // end if
    }
  });
  // end openCard
  // on resetGame
  H.on(owner, "resetGame", async function resetGame($) {
    // setGame(0) -- set the game number to zero
    await H.call($, "setGame", [0]);
    // resetStats -- rest stats to zero
    await H.call($, "resetStats", []);
    // newGame -- start a new game
    await H.call($, "newGame", []);
  });
  // end resetGame
  // on newGame
  H.on(owner, "newGame", async function newGame($) {
    let theGame = "";
    // put getGame() into theGame
    theGame = await H.call($, "getGame", [], 'function');
    // setGame(theGame + 1) -- next game
    await H.call($, "setGame", [(H.num(theGame) + 1)]);
    // setWord("") -- clear the user's word
    await H.call($, "setWord", [""]);
    // setWeWon(false) -- haven't won yet
    await H.call($, "setWeWon", [false]);
    // resetTiles -- reset the tiles
    await H.call($, "resetTiles", []);
    // setRow(1)
    await H.call($, "setRow", [1]);
    // setCol(1)
    await H.call($, "setCol", [1]);
    // resetKeyboardLetters -- reset the keyboard letters
    await H.call($, "resetKeyboardLetters", []);
  });
  // end newGame
  // on resetTiles
  H.on(owner, "resetTiles", async function resetTiles($) {
    let i = "", j = "", letterField = "";
    // repeat with i = 1 to 6
    for (i of H.range(1, 6)) {
      await H.tick();
      // repeat with j = 1 to 5
      for (j of H.range(1, 5)) {
        await H.tick();
        // put getBox(i,j) into letterField
        letterField = await H.call($, "getBox", [i, j], 'function');
        // put "" into card field letterField
        H.putInto(H.part($, "card", "field", letterField), "", "into");
        // set textStyle of card field letterField to outline
        H.setProp(H.part($, "card", "field", letterField), "textStyle", "outline");
        // set style of card field letterField to rectangle
        H.setProp(H.part($, "card", "field", letterField), "style", "rectangle");
      // end repeat
      }
    // end repeat
    }
  });
  // end resetTiles
  // on keyDown theKey
  H.on(owner, "keyDown", async function keyDown($, theKey) {
    let weWon = "", keyNum = "", theWord = "", theLetter = "";
    // global gCode
    /* shared: H.g.gcode */
    // if gCode is false then
    if (H.eq(H.g.gcode, false)) {
      // put getWeWon() into weWon
      weWon = await H.call($, "getWeWon", [], 'function');
      // if weWon = false then
      if (H.eq(weWon, false)) {
        // put charToNum of theKey into keyNum -- get the number cooresponding to the key
        keyNum = H.f.charToNum(theKey);
        // put getWord() into theWord -- get the user's guess word
        theWord = await H.call($, "getWord", [], 'function');
        // if keyNum = 3 or keyNum = 13 then -- enter or return key pressed
        if ((H.eq(keyNum, 3) || H.eq(keyNum, 13))) {
          // handleEnterKey
          await H.call($, "handleEnterKey", []);
        // else if keyNum = 8 then -- delete key pressed
        } else if (H.eq(keyNum, 8)) {
          // deleteLetter
          await H.call($, "deleteLetter", []);
        // else if length of theWord < 5 then
        } else if (H.lt(H.f.length(theWord), 5)) {
          // if keyNum >= (charToNum of "a") and keyNum <= (charToNum of "z") then
          if ((H.ge(keyNum, H.f.charToNum("a")) && H.le(keyNum, H.f.charToNum("z")))) {
            // put numToChar of (keyNum + (charToNum of "A" - charToNum of "a")) into theLetter
            theLetter = H.f.numToChar((H.num(keyNum) + (H.f.charToNum("A") - H.f.charToNum("a"))));
            // addLetter theLetter
            await H.call($, "addLetter", [theLetter]);
          // else if keyNum >= (charToNum of "A") and keyNum <= (charToNum of "Z") then
          } else if ((H.ge(keyNum, H.f.charToNum("A")) && H.le(keyNum, H.f.charToNum("Z")))) {
            // addLetter theKey
            await H.call($, "addLetter", [theKey]);
          // else
          } else {
            // pass keyDown
            return H.PASS;
          // end if
          }
        // else
        } else {
          // pass keyDown
          return H.PASS;
        // end if
        }
      // else
      } else {
        // pass keyDown
        return H.PASS;
      // end if
      }
    // else
    } else {
      // pass keyDown
      return H.PASS;
    // end if
    }
  });
  // end keyDown
  // on handleEnterKey
  H.on(owner, "handleEnterKey", async function handleEnterKey($) {
    let theRow = "", theCol = "", theWord = "", theMatch = "", j = "", letterField = "";
    // put getRow() into theRow
    theRow = await H.call($, "getRow", [], 'function');
    // put getCol() into theCol
    theCol = await H.call($, "getCol", [], 'function');
    // put getWord() into theWord -- the user's guess word
    theWord = await H.call($, "getWord", [], 'function');
    // put getMatch() into theMatch -- the game word to match
    theMatch = await H.call($, "getMatch", [], 'function');
    // if length of theWord is 5 then
    if (H.eq(H.f.length(theWord), 5)) {
      // if theWord = theMatch then
      if (H.eq(theWord, theMatch)) {
        // weWon
        await H.call($, "weWon", []);
        // lock screen
        H.lockScreen();
        // repeat with j = 1 to 5
        for (j of H.range(1, 5)) {
          await H.tick();
          // put getBox(theRow,j) into letterField
          letterField = await H.call($, "getBox", [theRow, j], 'function');
          // set the style of card field letterField to shadow
          H.setProp(H.part($, "card", "field", letterField), "style", "shadow");
          // set the textStyle of card field letterField to bold
          H.setProp(H.part($, "card", "field", letterField), "textStyle", "bold");
          // setKeyboardLetter (character j of theWord), true
          await H.call($, "setKeyboardLetter", [H.chunk(theWord, [["char", j]]), true]);
        // end repeat
        }
        // unlock screen
        await H.unlockScreen();
      // else if acceptableWord(theWord) is true then -- it is an accepted word
      } else if (H.eq(await H.call($, "acceptableWord", [theWord], 'function'), true)) {
        // repeat with j = 1 to 5
        for (j of H.range(1, 5)) {
          await H.tick();
          // put getBox(theRow,j) into letterField
          letterField = await H.call($, "getBox", [theRow, j], 'function');
          // animateTile theRow, j
          await H.call($, "animateTile", [theRow, j]);
          // if character j of theWord = character j of theMatch then
          if (H.eq(H.chunk(theWord, [["char", j]]), H.chunk(theMatch, [["char", j]]))) {
            // set the textStyle of card field letterField to bold
            H.setProp(H.part($, "card", "field", letterField), "textStyle", "bold");
            // setKeyboardLetter (character j of theWord), true
            await H.call($, "setKeyboardLetter", [H.chunk(theWord, [["char", j]]), true]);
          // else if theMatch contains character j of theWord then
          } else if (H.contains(theMatch, H.chunk(theWord, [["char", j]]))) {
            // set the textStyle of card field letterField to outline, shadow
            H.setProp(H.part($, "card", "field", letterField), "textStyle", H.cat("outline", ",", "shadow"));
            // setKeyboardLetter (character j of theWord), true
            await H.call($, "setKeyboardLetter", [H.chunk(theWord, [["char", j]]), true]);
          // else
          } else {
            // set the textStyle of card field letterField to outline
            H.setProp(H.part($, "card", "field", letterField), "textStyle", "outline");
            // setKeyboardLetter(character j of theWord), false
            await H.call($, "setKeyboardLetter", [H.chunk(theWord, [["char", j]]), false]);
          // end if
          }
        // end repeat
        }
        // if theRow = 6 then
        if (H.eq(theRow, 6)) {
          // weLost(theMatch)
          await H.call($, "weLost", [theMatch]);
        // else
        } else {
          // nextRow -- move to the first col of the next row
          await H.call($, "nextRow", []);
        // end if
        }
      // else -- not an accepted word
      } else {
        // repeat for two times
        for (let n3 = 2; n3 > 0; n3--) {
          await H.tick();
          // lock screen
          H.lockScreen();
          // repeat with j = 1 to 5
          for (j of H.range(1, 5)) {
            await H.tick();
            // put getBox(theRow,j) into letterField
            letterField = await H.call($, "getBox", [theRow, j], 'function');
            // set the style of card field letterField to shadow
            H.setProp(H.part($, "card", "field", letterField), "style", "shadow");
          // end repeat
          }
          // unlock screen
          await H.unlockScreen();
          // lock screen
          H.lockScreen();
          // repeat with j = 1 to 5
          for (j of H.range(1, 5)) {
            await H.tick();
            // put getBox(theRow,j) into letterField
            letterField = await H.call($, "getBox", [theRow, j], 'function');
            // set the style of card field letterField to rectangle
            H.setProp(H.part($, "card", "field", letterField), "style", "rectangle");
          // end repeat
          }
          // unlock screen
          await H.unlockScreen();
        // end repeat
        }
        // repeat with j = 1 to 5
        for (j of H.range(1, 5)) {
          await H.tick();
          // put getBox(theRow,j) into letterField
          letterField = await H.call($, "getBox", [theRow, j], 'function');
          // put "" into card field letterField
          H.putInto(H.part($, "card", "field", letterField), "", "into");
        // end repeat
        }
        // setCol(1) -- go back to the first column tile
        await H.call($, "setCol", [1]);
        // setWord "" -- try again
        await H.call($, "setWord", [""]);
      // end if
      }
      // setWord ""
      await H.call($, "setWord", [""]);
    // end if
    }
  });
  // end handleEnterKey
  // on animateTile theRow, theCol
  H.on(owner, "animateTile", async function animateTile($, theRow, theCol) {
  });
  // end animateTile
  // function acceptableWord theWord
  H.fn(owner, "acceptableWord", async function acceptableWord($, theWord) {
    // if card field "words" contains theWord ¬ or card field "acceptable 1" contains theWord ¬ or card field "acceptable 2" contains theWord ¬ or card field "acceptable 3" contains theWord then
    if ((((H.contains(H.value(H.part($, "card", "field", "words")), theWord) || H.contains(H.value(H.part($, "card", "field", "acceptable 1")), theWord)) || H.contains(H.value(H.part($, "card", "field", "acceptable 2")), theWord)) || H.contains(H.value(H.part($, "card", "field", "acceptable 3")), theWord))) {
      // return true
      return true;
    // end if
    }
    // return false
    return false;
  });
  // end acceptableWord
  // on previousBox
  H.on(owner, "previousBox", async function previousBox($) {
    let i = "", j = "";
    // put getRow() into i
    i = await H.call($, "getRow", [], 'function');
    // put getCol() into j
    j = await H.call($, "getCol", [], 'function');
    // if j = 1 and i = 1 then
    if ((H.eq(j, 1) && H.eq(i, 1))) {
    // else
    } else {
      // if j = 1 then
      if (H.eq(j, 1)) {
        // put 5 into j
        j = 5;
        // put i - 1 into i
        i = H.num(i) - 1;
      // else
      } else {
        // put j - 1 into j
        j = H.num(j) - 1;
      // end if
      }
      // setRow(i)
      await H.call($, "setRow", [i]);
      // setCol(j)
      await H.call($, "setCol", [j]);
    // end if
    }
  });
  // end previousBox
  // on nextCol
  H.on(owner, "nextCol", async function nextCol($) {
    let theCol = "";
    // put getCol() into theCol
    theCol = await H.call($, "getCol", [], 'function');
    // if theCol < 5 then
    if (H.lt(theCol, 5)) {
      // setCol(theCol + 1)
      await H.call($, "setCol", [(H.num(theCol) + 1)]);
    // end if
    }
  });
  // end nextCol
  // function getCurrentBox
  H.fn(owner, "getCurrentBox", async function getCurrentBox($) {
    let letterField = "";
    // put "letter " & getRow() & getCol() into letterField
    letterField = H.cat("letter ", await H.call($, "getRow", [], 'function'), await H.call($, "getCol", [], 'function'));
    // return letterField
    return letterField;
  });
  // end getCurrentBox
  // function getBox theRow, theCol
  H.fn(owner, "getBox", async function getBox($, theRow, theCol) {
    let letterField = "";
    // put "letter " & theRow & theCol into letterField
    letterField = H.cat("letter ", theRow, theCol);
    // return letterField
    return letterField;
  });
  // end getBox
  // on resetKeyboardLetters
  H.on(owner, "resetKeyboardLetters", async function resetKeyboardLetters($) {
    let theKey = "";
    // repeat with theKey = charToNum("A") to charToNum("Z")
    for (theKey of H.range(H.f.charToNum("A"), H.f.charToNum("Z"))) {
      await H.tick();
      // set the textStyle of card field ("letter " & numToChar(theKey)) to plain
      H.setProp(H.part($, "card", "field", H.cat("letter ", H.f.numToChar(theKey))), "textStyle", "plain");
      // show card field ("letter " & numToChar(theKey))
      H.show(H.part($, "card", "field", H.cat("letter ", H.f.numToChar(theKey))));
    // end repeat
    }
  });
  // end resetKeyboardLetters
  // on setKeyboardLetter theLetter, letterIn
  H.on(owner, "setKeyboardLetter", async function setKeyboardLetter($, theLetter, letterIn) {
    // if letterIn = true then
    if (H.eq(letterIn, true)) {
      // set the textStyle of card field ("letter " & theLetter) to bold
      H.setProp(H.part($, "card", "field", H.cat("letter ", theLetter)), "textStyle", "bold");
    // else
    } else {
      // hide card field ("letter " & theLetter)
      H.hide(H.part($, "card", "field", H.cat("letter ", theLetter)));
    // end if
    }
  });
  // end setKeyboardLetter
  // on nextRow
  H.on(owner, "nextRow", async function nextRow($) {
    let theRow = "";
    // put getRow() into theRow
    theRow = await H.call($, "getRow", [], 'function');
    // if theRow < 6 then
    if (H.lt(theRow, 6)) {
      // setRow (theRow + 1)
      await H.call($, "setRow", [(H.num(theRow) + 1)]);
      // setCol(1)
      await H.call($, "setCol", [1]);
    // end if
    }
  });
  // end nextRow
  // on weWon
  H.on(owner, "weWon", async function weWon($) {
    let theWins = "", theStreak = "", thePlays = "", theRow = "";
    // setWeWon(true)
    await H.call($, "setWeWon", [true]);
    // put getWins() into theWins
    theWins = await H.call($, "getWins", [], 'function');
    // put getStreak() into theStreak
    theStreak = await H.call($, "getStreak", [], 'function');
    // put getPlays() into thePlays
    thePlays = await H.call($, "getPlays", [], 'function');
    // put getRow() into theRow
    theRow = await H.call($, "getRow", [], 'function');
    // setWins(theWins + 1)
    await H.call($, "setWins", [(H.num(theWins) + 1)]);
    // setStreak(theStreak + 1)
    await H.call($, "setStreak", [(H.num(theStreak) + 1)]);
    // setPlays(thePlays + 1)
    await H.call($, "setPlays", [(H.num(thePlays) + 1)]);
    // incWinRow(theRow)
    await H.call($, "incWinRow", [theRow]);
  });
  // end weWon
  // on weLost theWord
  H.on(owner, "weLost", async function weLost($, theWord) {
    let theLosses = "", thePlays = "", it = "";
    // setWeWon(false)
    await H.call($, "setWeWon", [false]);
    // put getLosses() into theLosses
    theLosses = await H.call($, "getLosses", [], 'function');
    // put getPlays() into thePlays
    thePlays = await H.call($, "getPlays", [], 'function');
    // setLosses(theLosses + 1)
    await H.call($, "setLosses", [(H.num(theLosses) + 1)]);
    // setPlays(thePlays + 1)
    await H.call($, "setPlays", [(H.num(thePlays) + 1)]);
    // setStreak(0)
    await H.call($, "setStreak", [0]);
    // answer "Sorry, the word is " & quote & theWord & quote & ". Play again?" ¬ with "OK" or "Cancel"
    it = await H.answer(H.cat("Sorry, the word is ", "\"", theWord, "\"", ". Play again?"), ["OK", "Cancel"]);
    // if it is "OK" then
    if (H.eq(it, "OK")) {
      // newGame
      await H.call($, "newGame", []);
    // end if
    }
  });
  // end weLost
  // on resetStats
  H.on(owner, "resetStats", async function resetStats($) {
    let theRow = "";
    // repeat with theRow = 1 to 6
    for (theRow of H.range(1, 6)) {
      await H.tick();
      // setWinRow theRow, 0
      await H.call($, "setWinRow", [theRow, 0]);
    // end repeat
    }
    // setPlays(0)
    await H.call($, "setPlays", [0]);
    // setWins(0)
    await H.call($, "setWins", [0]);
    // setLosses(0)
    await H.call($, "setLosses", [0]);
    // setStreak(0)
    await H.call($, "setStreak", [0]);
    // setMaxStreak(0)
    await H.call($, "setMaxStreak", [0]);
  });
  // end resetStats
  // on addLetter theLetter
  H.on(owner, "addLetter", async function addLetter($, theLetter) {
    let theWord = "";
    // put getWord() & theLetter into theWord
    theWord = H.cat(await H.call($, "getWord", [], 'function'), theLetter);
    // setWord(theWord)
    await H.call($, "setWord", [theWord]);
    // displayLetter theLetter
    await H.call($, "displayLetter", [theLetter]);
    // nextCol
    await H.call($, "nextCol", []);
  });
  // end addLetter
  // on deleteLetter
  H.on(owner, "deleteLetter", async function deleteLetter($) {
    let theWord = "", theLength = "";
    // put getWord() into theWord
    theWord = await H.call($, "getWord", [], 'function');
    // put length of theWord into theLength
    theLength = H.f.length(theWord);
    // if length = 0 then
    if (H.eq("length", 0)) {
      // setWord("")
      await H.call($, "setWord", [""]);
      // setCol(1)
      await H.call($, "setCol", [1]);
    // else
    } else {
      // put char 1 to theLength - 1 of theWord into theWord
      theWord = H.chunk(theWord, [["char", 1, H.num(theLength) - 1]]);
      // setWord(theWord)
      await H.call($, "setWord", [theWord]);
      // setCol(length of theWord + 1)
      await H.call($, "setCol", [(H.f.length(theWord) + 1)]);
      // displayLetter ""
      await H.call($, "displayLetter", [""]);
    // end if
    }
  });
  // end deleteLetter
  // on displayLetter theLetter
  H.on(owner, "displayLetter", async function displayLetter($, theLetter) {
    let theBox = "";
    // put getCurrentBox() into theBox
    theBox = await H.call($, "getCurrentBox", [], 'function');
    // put theLetter into card field theBox
    H.putInto(H.part($, "card", "field", theBox), theLetter, "into");
  });
  // end displayLetter
  // function getMatch
  H.fn(owner, "getMatch", async function getMatch($) {
    let theGame = "";
    // put getGame() into theGame
    theGame = await H.call($, "getGame", [], 'function');
    // return the first word of line theGame of card field "words"
    return H.chunk(H.value(H.part($, "card", "field", "words")), [["line", theGame], ["word", 1]]);
  });
  // end getMatch
  // function getRow
  H.fn(owner, "getRow", async function getRow($) {
    // return card field "row"
    return H.value(H.part($, "card", "field", "row"));
  });
  // end getRow
  // function getCol
  H.fn(owner, "getCol", async function getCol($) {
    // return card field "col"
    return H.value(H.part($, "card", "field", "col"));
  });
  // end getCol
  // on setRow theRow
  H.on(owner, "setRow", async function setRow($, theRow) {
    // put theRow into card field "row"
    H.putInto(H.part($, "card", "field", "row"), theRow, "into");
  });
  // end setRow
  // on setCol theCol
  H.on(owner, "setCol", async function setCol($, theCol) {
    // put theCol into card field "col"
    H.putInto(H.part($, "card", "field", "col"), theCol, "into");
  });
  // end setCol
  // on setWeWon theWeWon
  H.on(owner, "setWeWon", async function setWeWon($, theWeWon) {
    // put theWeWon into card field "we won"
    H.putInto(H.part($, "card", "field", "we won"), theWeWon, "into");
  });
  // end setWeWon
  // function getWeWon
  H.fn(owner, "getWeWon", async function getWeWon($) {
    // return card field "we won"
    return H.value(H.part($, "card", "field", "we won"));
  });
  // end getWeWon
  // on setGame theGame
  H.on(owner, "setGame", async function setGame($, theGame) {
    // put theGame into card field "game number"
    H.putInto(H.part($, "card", "field", "game number"), theGame, "into");
  });
  // end setGame
  // function getGame
  H.fn(owner, "getGame", async function getGame($) {
    // return card field "game number"
    return H.value(H.part($, "card", "field", "game number"));
  });
  // end getGame
  // on setWinRow theRow, theValue
  H.on(owner, "setWinRow", async function setWinRow($, theRow, theValue) {
    // put theValue into line ((6 - theRow) mod 6 + 1) of background field "data" of card "stats"
    H.putInto(H.part($, "bg", "field", "data", H.card($, {key: "stats"})), theValue, "into", [["line", (H.mod((6 - H.num(theRow)), 6) + 1)]]);
  });
  // end setWinRow
  // on incWinRow theRow
  H.on(owner, "incWinRow", async function incWinRow($, theRow) {
    let theRowWins = "";
    // put line ((6 - theRow) mod 6 + 1) of background field "data" of card "stats" into theRowWins
    theRowWins = H.chunk(H.value(H.part($, "bg", "field", "data", H.card($, {key: "stats"}))), [["line", (H.mod((6 - H.num(theRow)), 6) + 1)]]);
    // if theRowWins is empty or theRowWins = 0 then
    if ((H.eq(theRowWins, "") || H.eq(theRowWins, 0))) {
      // put 0 into theRowWins
      theRowWins = 0;
    // end if
    }
    // put theRowWins + 1 into theRowWins
    theRowWins = H.num(theRowWins) + 1;
    // put theRowWins into line ((6 - theRow) mod 6 + 1) of background field "data" of card "stats"
    H.putInto(H.part($, "bg", "field", "data", H.card($, {key: "stats"})), theRowWins, "into", [["line", (H.mod((6 - H.num(theRow)), 6) + 1)]]);
  });
  // end incWinRow
  // function getPlays
  H.fn(owner, "getPlays", async function getPlays($) {
    let theValue = "";
    // put card field "plays" of card "stats" into theValue
    theValue = H.value(H.part($, "card", "field", "plays", H.card($, {key: "stats"})));
    // if theValue is empty or theValue = "" then
    if ((H.eq(theValue, "") || H.eq(theValue, ""))) {
      // put 0 into theValue
      theValue = 0;
    // end if
    }
    // return theValue
    return theValue;
  });
  // end getPlays
  // on setPlays theValue
  H.on(owner, "setPlays", async function setPlays($, theValue) {
    // put theValue into card field "plays" of card "stats"
    H.putInto(H.part($, "card", "field", "plays", H.card($, {key: "stats"})), theValue, "into");
  });
  // end setPlays
  // function getWins
  H.fn(owner, "getWins", async function getWins($) {
    let theValue = "";
    // put card field "wins" of card "stats" into theValue
    theValue = H.value(H.part($, "card", "field", "wins", H.card($, {key: "stats"})));
    // if theValue is empty or theValue = "" then
    if ((H.eq(theValue, "") || H.eq(theValue, ""))) {
      // put 0 into theValue
      theValue = 0;
    // end if
    }
    // return theValue
    return theValue;
  });
  // end getWins
  // on setWins theValue
  H.on(owner, "setWins", async function setWins($, theValue) {
    // put theValue into card field "wins" of card "stats"
    H.putInto(H.part($, "card", "field", "wins", H.card($, {key: "stats"})), theValue, "into");
  });
  // end setWins
  // function getLosses
  H.fn(owner, "getLosses", async function getLosses($) {
    let theValue = "";
    // put card field "losses" of card "stats" into theValue
    theValue = H.value(H.part($, "card", "field", "losses", H.card($, {key: "stats"})));
    // if theValue is empty or theValue = "" then
    if ((H.eq(theValue, "") || H.eq(theValue, ""))) {
      // put 0 into theValue
      theValue = 0;
    // end if
    }
    // return theValue
    return theValue;
  });
  // end getLosses
  // on setLosses theValue
  H.on(owner, "setLosses", async function setLosses($, theValue) {
    // put theValue into card field "losses" of card "stats"
    H.putInto(H.part($, "card", "field", "losses", H.card($, {key: "stats"})), theValue, "into");
  });
  // end setLosses
  // function getStreak
  H.fn(owner, "getStreak", async function getStreak($) {
    let theValue = "";
    // put card field "streak" of card "stats" into theValue
    theValue = H.value(H.part($, "card", "field", "streak", H.card($, {key: "stats"})));
    // if theValue is empty or theValue = "" then
    if ((H.eq(theValue, "") || H.eq(theValue, ""))) {
      // put 0 into theValue
      theValue = 0;
    // end if
    }
    // return theValue
    return theValue;
  });
  // end getStreak
  // on setStreak theStreak
  H.on(owner, "setStreak", async function setStreak($, theStreak) {
    let theMaxStreak = "";
    // put getMaxStreak() into theMaxStreak
    theMaxStreak = await H.call($, "getMaxStreak", [], 'function');
    // put theStreak into card field "streak" of card "stats"
    H.putInto(H.part($, "card", "field", "streak", H.card($, {key: "stats"})), theStreak, "into");
    // if theStreak > theMaxStreak then
    if (H.gt(theStreak, theMaxStreak)) {
      // setMaxStreak(theStreak)
      await H.call($, "setMaxStreak", [theStreak]);
    // end if
    }
  });
  // end setStreak
  // function getMaxStreak
  H.fn(owner, "getMaxStreak", async function getMaxStreak($) {
    let theValue = "";
    // put card field "max streak" of card "stats" into theValue
    theValue = H.value(H.part($, "card", "field", "max streak", H.card($, {key: "stats"})));
    // if theValue is empty or theValue = "" then
    if ((H.eq(theValue, "") || H.eq(theValue, ""))) {
      // put 0 into theValue
      theValue = 0;
    // end if
    }
    // return theValue
    return theValue;
  });
  // end getMaxStreak
  // on setMaxStreak theValue
  H.on(owner, "setMaxStreak", async function setMaxStreak($, theValue) {
    // put theValue into card field "max streak" of card "stats"
    H.putInto(H.part($, "card", "field", "max streak", H.card($, {key: "stats"})), theValue, "into");
  });
  // end setMaxStreak
  // function getWord
  H.fn(owner, "getWord", async function getWord($) {
    // return card field "word"
    return H.value(H.part($, "card", "field", "word"));
  });
  // end getWord
  // on setWord theWord
  H.on(owner, "setWord", async function setWord($, theWord) {
    // put theWord into card field "word"
    H.putInto(H.part($, "card", "field", "word"), theWord, "into");
  });
  // end setWord
}

// ---- script 9: card-2990/button-40 "New Game"
function script9(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // newGame
    await H.call($, "newGame", []);
  });
  // end mouseUp
}

// ---- script 10: card-2990/field-55 "letter S"
function script10(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown S"
    await H.send($, "keyDown S", null);
  });
  // end mouseDown
}

// ---- script 11: card-2990/field-56 "letter A"
function script11(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown A"
    await H.send($, "keyDown A", null);
  });
  // end mouseDown
}

// ---- script 12: card-2990/field-58 "letter Q"
function script12(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown Q"
    await H.send($, "keyDown Q", null);
  });
  // end mouseDown
}

// ---- script 13: card-2990/field-59 "letter W"
function script13(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown W"
    await H.send($, "keyDown W", null);
  });
  // end mouseDown
}

// ---- script 14: card-2990/field-60 "letter E"
function script14(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown E"
    await H.send($, "keyDown E", null);
  });
  // end mouseDown
}

// ---- script 15: card-2990/field-61 "letter R"
function script15(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown R"
    await H.send($, "keyDown R", null);
  });
  // end mouseDown
}

// ---- script 16: card-2990/field-62 "letter T"
function script16(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown T"
    await H.send($, "keyDown T", null);
  });
  // end mouseDown
}

// ---- script 17: card-2990/field-63 "letter Y"
function script17(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown Y"
    await H.send($, "keyDown Y", null);
  });
  // end mouseDown
}

// ---- script 18: card-2990/field-64 "letter U"
function script18(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown U"
    await H.send($, "keyDown U", null);
  });
  // end mouseDown
}

// ---- script 19: card-2990/field-65 "letter I"
function script19(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown I"
    await H.send($, "keyDown I", null);
  });
  // end mouseDown
}

// ---- script 20: card-2990/field-66 "letter O"
function script20(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown O"
    await H.send($, "keyDown O", null);
  });
  // end mouseDown
}

// ---- script 21: card-2990/field-67 "letter P"
function script21(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown P"
    await H.send($, "keyDown P", null);
  });
  // end mouseDown
}

// ---- script 22: card-2990/field-68 "enter"
function script22(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown " & numToChar(3)
    await H.send($, H.cat("keyDown ", H.f.numToChar(3)), null);
  });
  // end mouseDown
}

// ---- script 23: card-2990/field-69 "letter D"
function script23(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown D"
    await H.send($, "keyDown D", null);
  });
  // end mouseDown
}

// ---- script 24: card-2990/field-70 "letter F"
function script24(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown F"
    await H.send($, "keyDown F", null);
  });
  // end mouseDown
}

// ---- script 25: card-2990/field-71 "letter G"
function script25(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown G"
    await H.send($, "keyDown G", null);
  });
  // end mouseDown
}

// ---- script 26: card-2990/field-72 "letter H"
function script26(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown H"
    await H.send($, "keyDown H", null);
  });
  // end mouseDown
}

// ---- script 27: card-2990/field-73 "letter J"
function script27(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown J"
    await H.send($, "keyDown J", null);
  });
  // end mouseDown
}

// ---- script 28: card-2990/field-74 "letter K"
function script28(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown K"
    await H.send($, "keyDown K", null);
  });
  // end mouseDown
}

// ---- script 29: card-2990/field-75 "letter L"
function script29(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown L"
    await H.send($, "keyDown L", null);
  });
  // end mouseDown
}

// ---- script 30: card-2990/field-76 "del"
function script30(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown " & numToChar(8) -- delete key
    await H.send($, H.cat("keyDown ", H.f.numToChar(8)), null);
  });
  // end mouseDown
}

// ---- script 31: card-2990/field-77 "letter Z"
function script31(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown Z"
    await H.send($, "keyDown Z", null);
  });
  // end mouseDown
}

// ---- script 32: card-2990/field-78 "letter X"
function script32(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown X"
    await H.send($, "keyDown X", null);
  });
  // end mouseDown
}

// ---- script 33: card-2990/field-79 "letter C"
function script33(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown C"
    await H.send($, "keyDown C", null);
  });
  // end mouseDown
}

// ---- script 34: card-2990/field-80 "letter V"
function script34(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown V"
    await H.send($, "keyDown V", null);
  });
  // end mouseDown
}

// ---- script 35: card-2990/field-81 "letter B"
function script35(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown B"
    await H.send($, "keyDown B", null);
  });
  // end mouseDown
}

// ---- script 36: card-2990/field-82 "letter N"
function script36(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown N"
    await H.send($, "keyDown N", null);
  });
  // end mouseDown
}

// ---- script 37: card-2990/field-83 "letter M"
function script37(owner) {
  // on mouseDown
  H.on(owner, "mouseDown", async function mouseDown($) {
    // send "keyDown M"
    await H.send($, "keyDown M", null);
  });
  // end mouseDown
}

// ---- script 38: card-2990/button-86 "Help"
function script38(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go card "help"
    await H.go($, {key: "help"});
  });
  // end mouseUp
}

// ---- script 39: card-2990/button-87 "Stats"
function script39(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go card "stats"
    await H.go($, {key: "stats"});
  });
  // end mouseUp
}

// ---- script 40: card-2990/button-99 "Reset"
function script40(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // resetGame
    await H.call($, "resetGame", []);
  });
  // end mouseUp
}

// ---- script 41: card-2990/button-101 "Load"
function script41(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let it = "", stackPath = "", theAcceptable = "", i = "";
    // answer "Load words from text files? This will take a while." with "OK" or "Cancel"
    it = await H.answer("Load words from text files? This will take a while.", ["OK", "Cancel"]);
    // if it is "OK" then
    if (H.eq(it, "OK")) {
      // put "" into card field "words"
      H.putInto(H.part($, "card", "field", "words"), "", "into");
      // put "" into card field "acceptable 1"
      H.putInto(H.part($, "card", "field", "acceptable 1"), "", "into");
      // put "" into card field "acceptable 2"
      H.putInto(H.part($, "card", "field", "acceptable 2"), "", "into");
      // put "" into card field "acceptable 3"
      H.putInto(H.part($, "card", "field", "acceptable 3"), "", "into");
      // put getStackPath() into stackPath
      stackPath = await H.call($, "getStackPath", [], 'function');
      // put loadWords(stackPath, "wordleLA.text") into card field "words"
      H.putInto(H.part($, "card", "field", "words"), await H.call($, "loadWords", [stackPath, "wordleLA.text"], 'function'), "into");
      // put loadWords(stackPath, "wordleTA.text") into theAcceptable
      theAcceptable = await H.call($, "loadWords", [stackPath, "wordleTA.text"], 'function');
      // repeat with i = 1 to 3499
      for (i of H.range(1, 3499)) {
        await H.tick();
        // set cursor to busy
        H.setGlobal("cursor", "busy");
        // checkUserCancel
        await H.call($, "checkUserCancel", []);
        // put line i of theAcceptable into line i of card field "acceptable 1"
        H.putInto(H.part($, "card", "field", "acceptable 1"), H.chunk(theAcceptable, [["line", i]]), "into", [["line", i]]);
      // end repeat
      }
      // repeat with i = 3500 to 6999
      for (i of H.range(3500, 6999)) {
        await H.tick();
        // set cursor to busy
        H.setGlobal("cursor", "busy");
        // checkUserCancel
        await H.call($, "checkUserCancel", []);
        // put line i of theAcceptable into line (i - 3499) of card field "acceptable 2"
        H.putInto(H.part($, "card", "field", "acceptable 2"), H.chunk(theAcceptable, [["line", i]]), "into", [["line", (H.num(i) - 3499)]]);
      // end repeat
      }
      // repeat with i = 7000 to 10700
      for (i of H.range(7000, 10700)) {
        await H.tick();
        // set cursor to busy
        H.setGlobal("cursor", "busy");
        // checkUserCancel
        await H.call($, "checkUserCancel", []);
        // put line i of theAcceptable into line (i - 6999)  of card field "acceptable 3"
        H.putInto(H.part($, "card", "field", "acceptable 3"), H.chunk(theAcceptable, [["line", i]]), "into", [["line", (H.num(i) - 6999)]]);
      // end repeat
      }
      // set cursor to hand
      H.setGlobal("cursor", "hand");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 42: card-2990/button-125 "Gaming"
function script42(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // global gCode
    /* shared: H.g.gcode */
    // if gCode is false then
    if (H.eq(H.g.gcode, false)) {
      // put true into gCode
      H.g.gcode = true;
      // set the name of me to "Coding"
      H.setProp(H.me($), "name", "Coding");
    // else
    } else {
      // put false into gCode
      H.g.gcode = false;
      // set the name of me to "Gaming"
      H.setProp(H.me($), "name", "Gaming");
    // end if
    }
  });
  // end mouseUp
}

// ---- script 43: card-2990/button-126 "About"
function script43(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go to card "about"
    await H.go($, {key: "about"});
  });
  // end mouseUp
}

// ---- script 44: card card-11352 "stats"
function script44(owner) {
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    // drawChart
    await H.call($, "drawChart", []);
    // doStats
    await H.call($, "doStats", []);
  });
  // end openCard
  // on closeCard
  H.on(owner, "closeCard", async function closeCard($) {
    // reset paint
    H.resetPaint();
    // checkUserCancel
    await H.call($, "checkUserCancel", []);
    // clearScreen
    await H.call($, "clearScreen", []);
    // choose browse tool
    H.choose("browse");
  });
  // end closeCard
  // on doStats
  H.on(owner, "doStats", async function doStats($) {
    let theWins = "", thePlays = "";
    // put card field "wins" into theWins
    theWins = H.value(H.part($, "card", "field", "wins"));
    // put card field "plays" into thePlays
    thePlays = H.value(H.part($, "card", "field", "plays"));
    // if thePlays is empty or thePlays = 0  or theWins is empty or theWins = 0 then
    if ((((H.eq(thePlays, "") || H.eq(thePlays, 0)) || H.eq(theWins, "")) || H.eq(theWins, 0))) {
      // put 0 into card field "win percent"
      H.putInto(H.part($, "card", "field", "win percent"), 0, "into");
    // else
    } else {
      // put (theWins / thePlays) * 100 into card field "win percent"
      H.putInto(H.part($, "card", "field", "win percent"), (H.num(theWins) / H.num(thePlays)) * 100, "into");
    // end if
    }
  });
  // end doStats
  // on drawChart
  H.on(owner, "drawChart", async function drawChart($) {
    let labels = "", data = "data", units = "", title = "", chartRect = "", legendRect = "";
    // read before any put: HyperTalk uses the name itself (data)
    // if bg field data is not empty then
    if (!H.eq(H.value(H.part($, "bg", "field", data)), "")) {
      // checkUserCancel
      await H.call($, "checkUserCancel", []);
      // put stripReturns(bg fld "Labels") into labels
      labels = await H.call($, "stripReturns", [H.value(H.part($, "bg", "field", "Labels"))], 'function');
      // put stripReturns(bg fld "Data") into data
      data = await H.call($, "stripReturns", [H.value(H.part($, "bg", "field", "Data"))], 'function');
      // put "" into units
      units = "";
      // put "GUESS DISTRIBUTION" into title
      title = "GUESS DISTRIBUTION";
      // put rect of bg btn "Frame" into chartRect
      chartRect = H.prop(H.part($, "bg", "button", "Frame"), "rect");
      // put rect of bg btn "Legend" into legendRect
      legendRect = H.prop(H.part($, "bg", "button", "Legend"), "rect");
      // graph chartRect,data,labels,units,title
      await H.call($, "graph", [chartRect, data, labels, units, title]);
      // put true into bg fld "Drew Data"
      H.putInto(H.part($, "bg", "field", "Drew Data"), true, "into");
      // reset paint
      H.resetPaint();
    // end if
    }
  });
  // end drawChart
  // on graph chartRect,data,labels,units,title
  H.on(owner, "graph", async function graph($, chartRect, data, labels, units, title) {
    let maxValue = "", frameWidth = "", maxLabel = "", colWidth = "";
    // reset paint
    H.resetPaint();
    // checkUserCancel
    await H.call($, "checkUserCancel", []);
    // clearScreen
    await H.call($, "clearScreen", []);
    // put validatedData(data,labels) into data
    data = await H.call($, "validatedData", [data, labels], 'function');
    // put getMaxValue(data) into maxValue
    maxValue = await H.call($, "getMaxValue", [data], 'function');
    // put roundUp(maxValue) into maxValue
    maxValue = await H.call($, "roundUp", [maxValue], 'function');
    // put rectWidth(chartRect) into frameWidth
    frameWidth = await H.call($, "rectWidth", [chartRect], 'function');
    // if frameWidth > 185 then setFont geneva,10,center,bold
    if (H.gt(frameWidth, 185)) {
      await H.call($, "setFont", ["geneva", 10, "center", "bold"]);
    // else setFont geneva,9,center,bold
    } else {
      await H.call($, "setFont", ["geneva", 9, "center", "bold"]);
    }
    // choose text tool
    H.choose("text");
    // click at (item 1 of chartRect + frameWidth div 2),(item 2 of chartRect + the textHeight + 3)
    await H.clickAt($, (H.num(H.chunk(chartRect, [["item", 1]])) + H.div(frameWidth, 2)), (H.num(H.chunk(chartRect, [["item", 2]])) + H.num(H.f.textHeight()) + 3));
    // type line 1 of title -- draw the title
    await H.type($, H.chunk(title, [["line", 1]]));
    // choose line tool -- set the text
    H.choose("line");
    // choose text tool
    H.choose("text");
    // click at (item 1 of chartRect + frameWidth div 2),(item 2 of chartRect + (the textHeight * 2) + 3)
    await H.clickAt($, (H.num(H.chunk(chartRect, [["item", 1]])) + H.div(frameWidth, 2)), (H.num(H.chunk(chartRect, [["item", 2]])) + (H.num(H.f.textHeight()) * 2) + 3));
    // setFont geneva,9,center,plain
    await H.call($, "setFont", ["geneva", 9, "center", "plain"]);
    // type line 2 of title
    await H.type($, H.chunk(title, [["line", 2]]));
    // choose line tool
    H.choose("line");
    // setFont geneva,10,center,plain
    await H.call($, "setFont", ["geneva", 10, "center", "plain"]);
    // put maxChars(labels) into maxLabel
    maxLabel = await H.call($, "maxChars", [labels], 'function');
    // add max(20,(maxLabel * 8)) to item 1 of chartRect
    chartRect = H.put(chartRect, H.num(H.chunk(chartRect, [["item", 1]])) + H.f.max(20, (H.num(maxLabel) * 8)), "into", [["item", 1]]);
    // add 25 to item 2 of chartRect
    chartRect = H.put(chartRect, H.num(H.chunk(chartRect, [["item", 2]])) + 25, "into", [["item", 2]]);
    // subtract 16 from item 3 of chartRect
    chartRect = H.put(chartRect, H.num(H.chunk(chartRect, [["item", 3]])) - 16, "into", [["item", 3]]);
    // subtract 35 from item 4 of chartRect
    chartRect = H.put(chartRect, H.num(H.chunk(chartRect, [["item", 4]])) - 35, "into", [["item", 4]]);
    // put addIncrements(chartRect,maxValue,labels,units) into colWidth
    colWidth = await H.call($, "addIncrements", [chartRect, maxValue, labels, units], 'function');
    // doRows chartRect,maxValue,labels,data,colWidth
    await H.call($, "doRows", [chartRect, maxValue, labels, data, colWidth]);
    // choose browse tool
    H.choose("browse");
  });
  // end graph
  // on doRows chartRect,maxValue,labels,data,colWidth
  H.on(owner, "doRows", async function doRows($, chartRect, maxValue, labels, data, colWidth) {
    let barLeft = "", chartBottom = "", barBottom = "", frameHeight = "", maxLines = "", numIncrements = "", stepSize = "", realHeight = "", colHeight = "", lineNum = "", rowLength = "";
    // checkUserCancel
    await H.call($, "checkUserCancel", []);
    // setFont geneva,9,right
    await H.call($, "setFont", ["geneva", 9, "right"]);
    // put item 1 of chartRect into barLeft
    barLeft = H.chunk(chartRect, [["item", 1]]);
    // put item 4 of chartRect into chartBottom
    chartBottom = H.chunk(chartRect, [["item", 4]]);
    // put chartBottom into barBottom
    barBottom = chartBottom;
    // put rectHeight(chartRect) into frameHeight
    frameHeight = await H.call($, "rectHeight", [chartRect], 'function');
    // put max(number of lines in labels,number of lines in data) into maxLines
    maxLines = H.f.max(H.count("line", labels), H.count("line", data));
    // put max(number of lines in labels,number of lines in data) into numIncrements
    numIncrements = H.f.max(H.count("line", labels), H.count("line", data));
    // put frameHeight div numIncrements into stepSize
    stepSize = H.div(frameHeight, numIncrements);
    // put frameHeight div maxLines into realHeight
    realHeight = H.div(frameHeight, maxLines);
    // put round(.75 * realHeight) into colHeight
    colHeight = H.f.round(0.75 * H.num(realHeight));
    // set lineSize to 1
    H.setGlobal("lineSize", 1);
    // set pattern to 22 -- gray
    H.setGlobal("pattern", 22);
    // set filled to true
    H.setGlobal("filled", true);
    // if colHeight > the textHeight
    // then put barBottom - the textHeight div 3 into barBottom
    if (H.gt(colHeight, H.f.textHeight())) {
      barBottom = H.num(barBottom) - H.div(H.f.textHeight(), 3);
    }
    // repeat with lineNum = 1 to (numIncrements)
    for (lineNum of H.range(1, numIncrements)) {
      await H.tick();
      // checkUserCancel
      await H.call($, "checkUserCancel", []);
      // choose text tool -- type a label
      H.choose("text");
      // click at barLeft - 3,barBottom
      await H.clickAt($, H.num(barLeft) - 3, barBottom);
      // type line lineNum of labels
      await H.type($, H.chunk(labels, [["line", lineNum]]));
      // choose rectangle tool -- draw a bar
      H.choose("rectangle");
      // put round(line lineNum of data * colWidth) into rowLength
      rowLength = H.f.round(H.num(H.chunk(data, [["line", lineNum]])) * H.num(colWidth));
      // drag from barLeft,chartBottom to (barLeft + rowLength),chartBottom - colHeight
      await H.drag($, H.cat(barLeft, ",", chartBottom), H.cat((H.num(barLeft) + H.num(rowLength)), ",", H.num(chartBottom) - H.num(colHeight)));
      // choose text tool -- type the value
      H.choose("text");
      // click at (barLeft + rowLength + (length of line lineNum of data * 10)),barBottom
      await H.clickAt($, (H.num(barLeft) + H.num(rowLength) + (H.f.length(H.chunk(data, [["line", lineNum]])) * 10)), barBottom);
      // type line lineNum of data
      await H.type($, H.chunk(data, [["line", lineNum]]));
      // subtract stepSize from chartBottom
      chartBottom = H.num(chartBottom) - H.num(stepSize);
      // subtract stepSize from barBottom
      barBottom = H.num(barBottom) - H.num(stepSize);
    // end repeat
    }
  });
  // end doRows
  // function addIncrements chartRect,maxValue,labels,units
  H.fn(owner, "addIncrements", async function addIncrements($, chartRect, maxValue, labels, units) {
    let chartLeft = "", chartTop = "", chartRight = "", chartBottom = "", frameWidth = "", divisor = "", numIncrements = "", chartData = "", count = "", maxLines = "", realWidth = "", staggerLabels = "", lineIndex = "", vertAdj = "", chartWidth = "", unitVert = "";
    // checkUserCancel
    await H.call($, "checkUserCancel", []);
    // put item 1 of chartRect into chartLeft
    chartLeft = H.chunk(chartRect, [["item", 1]]);
    // put item 2 of chartRect into chartTop
    chartTop = H.chunk(chartRect, [["item", 2]]);
    // put item 3 of chartRect into chartRight
    chartRight = H.chunk(chartRect, [["item", 3]]);
    // put item 4 of chartRect into chartBottom
    chartBottom = H.chunk(chartRect, [["item", 4]]);
    // put rectWidth(chartRect) into frameWidth
    frameWidth = await H.call($, "rectWidth", [chartRect], 'function');
    // if maxValue div 10 = 0 then put 1 into divisor
    if (H.eq(H.div(maxValue, 10), 0)) {
      divisor = 1;
    // else put 10^(length(maxValue div 10)) into divisor
    } else {
      divisor = (10 ** H.f.length(H.div(maxValue, 10)));
    }
    // if maxValue div divisor = 1 then put divisor div 10 into divisor
    if (H.eq(H.div(maxValue, divisor), 1)) {
      divisor = H.div(divisor, 10);
    }
    // if divisor = 0 then put 1 into divisor
    if (H.eq(divisor, 0)) {
      divisor = 1;
    }
    // put maxValue div divisor into numIncrements
    numIncrements = H.div(maxValue, divisor);
    // if numIncrements = 0 then put maxValue into numIncrements
    if (H.eq(numIncrements, 0)) {
      numIncrements = maxValue;
    }
    // put empty into chartData
    chartData = "";
    // repeat with count = 1 to numIncrements + 1
    for (count of H.range(1, H.num(numIncrements) + 1)) {
      await H.tick();
      // put (divisor * count) - divisor into line count of chartData
      chartData = H.put(chartData, (H.num(divisor) * H.num(count)) - H.num(divisor), "into", [["line", count]]);
    // end repeat
    }
    // put number of lines in chartData into maxLines
    maxLines = H.count("line", chartData);
    // put frameWidth div maxLines into realWidth
    realWidth = H.div(frameWidth, maxLines);
    // if maxValue < 1 then put 1 into maxValue
    if (H.lt(maxValue, 1)) {
      maxValue = 1;
    }
    // put (length(chartData) * 6 > frameWidth) into staggerLabels
    staggerLabels = H.gt(H.f.length(chartData) * 6, frameWidth);
    // set pattern to 22 -- gray
    H.setGlobal("pattern", 22);
    // setFont geneva,9,center -- for the bottom labels
    await H.call($, "setFont", ["geneva", 9, "center"]);
    // repeat with lineIndex = 1 to maxLines
    for (lineIndex of H.range(1, maxLines)) {
      await H.tick();
      // checkUserCancel
      await H.call($, "checkUserCancel", []);
      // choose line tool
      H.choose("line");
      // choose text tool
      H.choose("text");
      // if (lineIndex mod 2 = 0) and staggerLabels then put the textHeight + 3 into vertAdj
      if ((H.eq(H.mod(lineIndex, 2), 0) && H.bool(staggerLabels))) {
        vertAdj = H.num(H.f.textHeight()) + 3;
      // else put 3 into vertAdj
      } else {
        vertAdj = 3;
      }
      // add realWidth to chartLeft
      chartLeft = H.num(chartLeft) + H.num(realWidth);
    // end repeat
    }
    // put item 1 of chartRect into chartLeft
    chartLeft = H.chunk(chartRect, [["item", 1]]);
    // put chartRight - chartLeft into chartWidth
    chartWidth = H.num(chartRight) - H.num(chartLeft);
    // if staggerLabels then put 3 into unitVert
    if (H.bool(staggerLabels)) {
      unitVert = 3;
    // else put 2 into unitVert
    } else {
      unitVert = 2;
    }
    // click at chartLeft + (chartWidth div 2),chartBottom + unitVert * the textHeight + 3
    await H.clickAt($, H.num(chartLeft) + H.div(chartWidth, 2), H.num(chartBottom) + H.num(unitVert) * H.num(H.f.textHeight()) + 3);
    // type units
    await H.type($, units);
    // choose line tool
    H.choose("line");
    // set lineSize to 1
    H.setGlobal("lineSize", 1);
    // set pattern to 12 -- black
    H.setGlobal("pattern", 12);
    // return realWidth/divisor
    return H.num(realWidth) / H.num(divisor);
  });
  // end addIncrements
  // on addALabel theLabel,horz,vert,vertAdj
  H.on(owner, "addALabel", async function addALabel($, theLabel, horz, vert, vertAdj) {
    // if theLabel is empty then exit addALabel
    if (H.eq(theLabel, "")) {
      return;
    }
    // checkUserCancel
    await H.call($, "checkUserCancel", []);
    // choose text tool
    H.choose("text");
    // click at horz,(vert + the textHeight + vertAdj + 3)
    await H.clickAt($, horz, (H.num(vert) + H.num(H.f.textHeight()) + H.num(vertAdj) + 3));
    // type theLabel
    await H.type($, theLabel);
  });
  // end addALabel
}

// ---- script 45: card-11352/button-70 "Wordle"; card-2231/button-25 "Wordle"; card-2460/button-2 "Wordle"; ... (4 owners)
function script45(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go card "game"
    await H.go($, {key: "game"});
  });
  // end mouseUp
}

// ---- script 46: card card-2231 "help"
function script46(owner) {
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    // resetCard
    await H.call($, "resetCard", []);
  });
  // end openCard
  // on closeCard
  H.on(owner, "closeCard", async function closeCard($) {
    // resetCard
    await H.call($, "resetCard", []);
  });
  // end closeCard
  // on resetCard
  H.on(owner, "resetCard", async function resetCard($) {
    let i = "", j = "", letterField = "";
    // lock screen
    H.lockScreen();
    // repeat with i = 1 to 3
    for (i of H.range(1, 3)) {
      await H.tick();
      // repeat with j = 1 to 5
      for (j of H.range(1, 5)) {
        await H.tick();
        // put "help " & i & j into letterField
        letterField = H.cat("help ", i, j);
        // set the textStyle of card field letterField to outline
        H.setProp(H.part($, "card", "field", letterField), "textStyle", "outline");
      // end repeat
      }
      // hide card field ("help text " & i)
      H.hide(H.part($, "card", "field", H.cat("help text ", i)));
    // end repeat
    }
    // unlock screen
    await H.unlockScreen();
  });
  // end resetCard
}

// ---- script 47: card-2231/button-24 "More Help"; card-2460/button-3 "Even More Help"
function script47(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go next
    await H.go($, {rel: "next"});
  });
  // end mouseUp
}

// ---- script 48: card-2231/button-26 "Test Me!"
function script48(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // set the textStyle of card field "help 11" to bold
    H.setProp(H.part($, "card", "field", "help 11"), "textStyle", "bold");
    // show card field "help text 1"
    H.show(H.part($, "card", "field", "help text 1"));
  });
  // end mouseUp
}

// ---- script 49: card-2231/button-27 "Test Me!"
function script49(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // set the textStyle of card field "help 23" to shadow, outline
    H.setProp(H.part($, "card", "field", "help 23"), "textStyle", H.cat("shadow", ",", "outline"));
    // show card field "help text 2"
    H.show(H.part($, "card", "field", "help text 2"));
  });
  // end mouseUp
}

// ---- script 50: card-2231/button-28 "Test Me!"
function script50(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let j = "", letterField = "";
    // repeat with j = 1 to 4
    for (j of H.range(1, 4)) {
      await H.tick();
      // put "help 3" & j into letterField
      letterField = H.cat("help 3", j);
      // set the textStyle of card field letterField to bold
      H.setProp(H.part($, "card", "field", letterField), "textStyle", "bold");
    // end repeat
    }
    // show card field "help text 3"
    H.show(H.part($, "card", "field", "help text 3"));
  });
  // end mouseUp
}

// ---- script 51: card card-2460 "even more help"
function script51(owner) {
  // on openCard
  H.on(owner, "openCard", async function openCard($) {
    // resetCard
    await H.call($, "resetCard", []);
  });
  // end openCard
  // on closeCard
  H.on(owner, "closeCard", async function closeCard($) {
    // resetCard
    await H.call($, "resetCard", []);
  });
  // end closeCard
  // on resetCard
  H.on(owner, "resetCard", async function resetCard($) {
    let j = "", letterField = "";
    // lock screen
    H.lockScreen();
    // repeat with j = 1 to 5
    for (j of H.range(1, 5)) {
      await H.tick();
      // put "help 1" & j into letterField
      letterField = H.cat("help 1", j);
      // set the style of card field letterField to rectangle
      H.setProp(H.part($, "card", "field", letterField), "style", "rectangle");
      // set the textStyle of card field letterField to outline
      H.setProp(H.part($, "card", "field", letterField), "textStyle", "outline");
    // end repeat
    }
    // put "F" into card field "help 21"
    H.putInto(H.part($, "card", "field", "help 21"), "F", "into");
    // put "U" into card field "help 22"
    H.putInto(H.part($, "card", "field", "help 22"), "U", "into");
    // put "R" into card field "help 23"
    H.putInto(H.part($, "card", "field", "help 23"), "R", "into");
    // put "B" into card field "help 24"
    H.putInto(H.part($, "card", "field", "help 24"), "B", "into");
    // put "Z" into card field "help 25"
    H.putInto(H.part($, "card", "field", "help 25"), "Z", "into");
    // hide card field "help text 1"
    H.hide(H.part($, "card", "field", "help text 1"));
    // hide card field "help text 2"
    H.hide(H.part($, "card", "field", "help text 2"));
    // unlock screen
    await H.unlockScreen();
  });
  // end resetCard
}

// ---- script 52: card-2460/button-11 "Test Me!"
function script52(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let j = "", letterField = "";
    // lock screen
    H.lockScreen();
    // repeat with j = 1 to 5
    for (j of H.range(1, 5)) {
      await H.tick();
      // put "help 1" & j into letterField
      letterField = H.cat("help 1", j);
      // set the style of card field letterField to shadow
      H.setProp(H.part($, "card", "field", letterField), "style", "shadow");
      // set the textStyle of card field letterField to bold
      H.setProp(H.part($, "card", "field", letterField), "textStyle", "bold");
    // end repeat
    }
    // show card field "help text 1"
    H.show(H.part($, "card", "field", "help text 1"));
    // unlock screen
    await H.unlockScreen();
  });
  // end mouseUp
}

// ---- script 53: card-2460/button-18 "Test Me!"
function script53(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    let j = "", letterField = "";
    // repeat for two times
    for (let n1 = 2; n1 > 0; n1--) {
      await H.tick();
      // lock screen
      H.lockScreen();
      // repeat with j = 1 to 5
      for (j of H.range(1, 5)) {
        await H.tick();
        // put "help 2" & j into letterField
        letterField = H.cat("help 2", j);
        // set the style of card field letterField to shadow
        H.setProp(H.part($, "card", "field", letterField), "style", "shadow");
      // end repeat
      }
      // unlock screen
      await H.unlockScreen();
      // lock screen
      H.lockScreen();
      // repeat with j = 1 to 5
      for (j of H.range(1, 5)) {
        await H.tick();
        // put "help 2" & j into letterField
        letterField = H.cat("help 2", j);
        // set the style of card field letterField to rectangle
        H.setProp(H.part($, "card", "field", letterField), "style", "rectangle");
      // end repeat
      }
      // unlock screen
      await H.unlockScreen();
    // end repeat
    }
    // repeat with j = 1 to 5
    for (j of H.range(1, 5)) {
      await H.tick();
      // put "help 2" & j into letterField
      letterField = H.cat("help 2", j);
      // put "" into card field letterField
      H.putInto(H.part($, "card", "field", letterField), "", "into");
    // end repeat
    }
    // show card field "help text 2"
    H.show(H.part($, "card", "field", "help text 2"));
  });
  // end mouseUp
}

// ---- script 54: card-2460/button-21 "Help"; card-5795/button-17 "More Help"
function script54(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // go prev
    await H.go($, {rel: "prev"});
  });
  // end mouseUp
}

// ---- script 55: card card-5795 "even more help"
function script55(owner) {
  // on clearScreen
  H.on(owner, "clearScreen", async function clearScreen($) {
    // choose "Select Tool"
    H.choose("select");
    // doMenu "Select All"
    await H.doMenu($, "Select All");
    // doMenu "Clear Picture"
    await H.doMenu($, "Clear Picture");
    // choose browse tool
    H.choose("browse");
  });
  // end clearScreen
}

// ---- script 56: card-5795/button-10 "about played"; card-5795/button-11 "about wins"; card-5795/button-12 "about losses"; ... (7 owners)
function script56(owner) {
  // on mouseEnter
  H.on(owner, "mouseEnter", async function mouseEnter($) {
    // global startPoint
    /* shared: H.g.startpoint */
    // global endPoint
    /* shared: H.g.endpoint */
    // put centerPoint(the rect of me) into startPoint
    H.g.startpoint = await H.call($, "centerPoint", [H.prop(H.me($), "rect")], 'function');
    // put centerPoint(the rect of card field (the short name of me)) into endPoint
    H.g.endpoint = await H.call($, "centerPoint", [H.prop(H.part($, "card", "field", H.prop(H.me($), "short name")), "rect")], 'function');
    // lock screen
    H.lockScreen();
    // show card field (the short name of me)
    H.show(H.part($, "card", "field", H.prop(H.me($), "short name")));
    // drawLine startPoint, endPoint
    await H.call($, "drawLine", [H.g.startpoint, H.g.endpoint]);
    // unlock screen
    await H.unlockScreen();
  });
  // end mouseEnter
  // on mouseLeave
  H.on(owner, "mouseLeave", async function mouseLeave($) {
    // global startPoint
    /* shared: H.g.startpoint */
    // global endPoint
    /* shared: H.g.endpoint */
    // lock screen
    H.lockScreen();
    // eraseLine startPoint, endPoint
    await H.call($, "eraseLine", [H.g.startpoint, H.g.endpoint]);
    // hide card field (the short name of me)
    H.hide(H.part($, "card", "field", H.prop(H.me($), "short name")));
    // unlock screen
    await H.unlockScreen();
  });
  // end mouseLeave
}

// ---- script 57: card-7057/button-4 "Go Back"
function script57(owner) {
  // on mouseUp
  H.on(owner, "mouseUp", async function mouseUp($) {
    // visual effect dissolve slow
    H.visual("dissolve slow");
    // go back
    await H.goBack($);
  });
  // end mouseUp
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-11532");  // background bkgnd-11532 "Graphs"
script2("bkgnd-11532/field-36");  // bkgnd-11532/field-36 "labels"
script3("bkgnd-11532/field-35");  // bkgnd-11532/field-35 "data"
script4("bkgnd-11532/field-70");  // bkgnd-11532/field-70 "percent total"
script4("bkgnd-11532/field-71");  // bkgnd-11532/field-71 "total"
script4("bkgnd-11532/button-72");  // bkgnd-11532/button-72 "Total:"
script5("bkgnd-11532/button-50");  // bkgnd-11532/button-50 "Legend"
script6("bkgnd-11532/button-51");  // bkgnd-11532/button-51 "growLegend"
script7("bkgnd-11532/field-63");  // bkgnd-11532/field-63 "graph info"
script8("card-2990");  // card card-2990 "game"
script9("card-2990/button-40");  // card-2990/button-40 "New Game"
script10("card-2990/field-55");  // card-2990/field-55 "letter S"
script11("card-2990/field-56");  // card-2990/field-56 "letter A"
script12("card-2990/field-58");  // card-2990/field-58 "letter Q"
script13("card-2990/field-59");  // card-2990/field-59 "letter W"
script14("card-2990/field-60");  // card-2990/field-60 "letter E"
script15("card-2990/field-61");  // card-2990/field-61 "letter R"
script16("card-2990/field-62");  // card-2990/field-62 "letter T"
script17("card-2990/field-63");  // card-2990/field-63 "letter Y"
script18("card-2990/field-64");  // card-2990/field-64 "letter U"
script19("card-2990/field-65");  // card-2990/field-65 "letter I"
script20("card-2990/field-66");  // card-2990/field-66 "letter O"
script21("card-2990/field-67");  // card-2990/field-67 "letter P"
script22("card-2990/field-68");  // card-2990/field-68 "enter"
script23("card-2990/field-69");  // card-2990/field-69 "letter D"
script24("card-2990/field-70");  // card-2990/field-70 "letter F"
script25("card-2990/field-71");  // card-2990/field-71 "letter G"
script26("card-2990/field-72");  // card-2990/field-72 "letter H"
script27("card-2990/field-73");  // card-2990/field-73 "letter J"
script28("card-2990/field-74");  // card-2990/field-74 "letter K"
script29("card-2990/field-75");  // card-2990/field-75 "letter L"
script30("card-2990/field-76");  // card-2990/field-76 "del"
script31("card-2990/field-77");  // card-2990/field-77 "letter Z"
script32("card-2990/field-78");  // card-2990/field-78 "letter X"
script33("card-2990/field-79");  // card-2990/field-79 "letter C"
script34("card-2990/field-80");  // card-2990/field-80 "letter V"
script35("card-2990/field-81");  // card-2990/field-81 "letter B"
script36("card-2990/field-82");  // card-2990/field-82 "letter N"
script37("card-2990/field-83");  // card-2990/field-83 "letter M"
script38("card-2990/button-86");  // card-2990/button-86 "Help"
script39("card-2990/button-87");  // card-2990/button-87 "Stats"
script40("card-2990/button-99");  // card-2990/button-99 "Reset"
script41("card-2990/button-101");  // card-2990/button-101 "Load"
script42("card-2990/button-125");  // card-2990/button-125 "Gaming"
script43("card-2990/button-126");  // card-2990/button-126 "About"
script44("card-11352");  // card card-11352 "stats"
script45("card-11352/button-70");  // card-11352/button-70 "Wordle"
script45("card-2231/button-25");  // card-2231/button-25 "Wordle"
script45("card-2460/button-2");  // card-2460/button-2 "Wordle"
script45("card-5795/button-18");  // card-5795/button-18 "Wordle"
script46("card-2231");  // card card-2231 "help"
script47("card-2231/button-24");  // card-2231/button-24 "More Help"
script47("card-2460/button-3");  // card-2460/button-3 "Even More Help"
script48("card-2231/button-26");  // card-2231/button-26 "Test Me!"
script49("card-2231/button-27");  // card-2231/button-27 "Test Me!"
script50("card-2231/button-28");  // card-2231/button-28 "Test Me!"
script51("card-2460");  // card card-2460 "even more help"
script52("card-2460/button-11");  // card-2460/button-11 "Test Me!"
script53("card-2460/button-18");  // card-2460/button-18 "Test Me!"
script54("card-2460/button-21");  // card-2460/button-21 "Help"
script54("card-5795/button-17");  // card-5795/button-17 "More Help"
script55("card-5795");  // card card-5795 "even more help"
script56("card-5795/button-10");  // card-5795/button-10 "about played"
script56("card-5795/button-11");  // card-5795/button-11 "about wins"
script56("card-5795/button-12");  // card-5795/button-12 "about losses"
script56("card-5795/button-13");  // card-5795/button-13 "about win percent"
script56("card-5795/button-14");  // card-5795/button-14 "about current streak"
script56("card-5795/button-15");  // card-5795/button-15 "about max streak"
script56("card-5795/button-16");  // card-5795/button-16 "about guess distribution"
script57("card-7057/button-4");  // card-7057/button-4 "Go Back"
};
