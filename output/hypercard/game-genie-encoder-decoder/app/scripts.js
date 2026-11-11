// HyperTalk scripts of Game Genie Encoder_Decoder (Game Genie Encoder_Decoder.stak), translated to JavaScript by
// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.
// One function per distinct script; it registers the script's handlers on the owner it is given.
// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).
window.HC_SCRIPTS = function (H) {
'use strict';

// ---- script 0: stack script
function script0(owner) {
  // on openstack
  H.on(owner, "openstack", async function openstack($) {
    // start using stack "genie des jeux"
    H.unsupported("start using", "start using stack \"genie des jeux\"");
  });
  // end openstack
  // on closestack
  H.on(owner, "closestack", async function closestack($) {
    // stop using stack "genie des jeux"
    H.unsupported("stop using", "stop using stack \"genie des jeux\"");
  });
  // end closestack
}

// ---- script 1: bkgnd-2577/field-2 "letterS"
function script1(owner) {
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    let cr = "";
    // put word 2 of the clickchunk  into cr
    cr = H.chunk(H.f.clickChunk(), [["word", 2]]);
    // put char (cr+1) div 2 of "AEPOZXLUGKISTVYN" after cd fld tcoda
    H.putInto(H.part($, "card", "field", "tcoda"), H.chunk("AEPOZXLUGKISTVYN", [["char", H.div((H.num(cr) + 1), 2)]]), "after");
  });
  // end mouseup
}

// ---- script 2: card-2996/button-1 "decode 6"
function script2(owner) {
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    let tcod = "", letters = "", bina = "", scram = "", pos = "", data = "", address = "", tobin = "", i = "", c = "", tch = "";
    // put cd fld tcoda into tcod
    tcod = H.value(H.part($, "card", "field", "tcoda"));
    // put "APZLGITYEOXUKSVN" into letters
    letters = "APZLGITYEOXUKSVN";
    // put "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111" into bina
    bina = "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111";
    // put "1678H234-IJKLABCDMNO5EFG" into scram
    scram = "1678H234-IJKLABCDMNO5EFG";
    // put "ABCDEFGHIJKLMNO" into pos
    pos = "ABCDEFGHIJKLMNO";
    // put "********" into data
    data = "********";
    // put "***************" into address
    address = "***************";
    // put empty into tobin
    tobin = "";
    // repeat with i=1 to 6
    for (i of H.range(1, 6)) {
      await H.tick();
      // put item offset (char i of tcod,letters) of bina after tobin
      tobin = H.put(tobin, H.chunk(bina, [["item", H.f.offset(H.chunk(tcod, [["char", i]]), letters)]]), "after");
    // end repeat
    }
    // repeat with c=1 to 24
    for (c of H.range(1, 24)) {
      await H.tick();
      // if c <>9 then
      if (!H.eq(c, 9)) {
        // put char c of tobin into tch
        tch = H.chunk(tobin, [["char", c]]);
        // if offset ((char c of scram),pos)=0 then
        if (H.eq(H.f.offset(H.chunk(scram, [["char", c]]), pos), 0)) {
          // put tch into char  (char c of scram) of data
          data = H.put(data, tch, "into", [["char", H.chunk(scram, [["char", c]])]]);
        // else
        } else {
          // put tch into char offset (char c of scram,pos) of address
          address = H.put(address, tch, "into", [["char", H.f.offset(H.chunk(scram, [["char", c]]), pos)]]);
        // end if
        }
      // end if
      }
    // end repeat
    }
    // put bin2dec (address) into cd fld addr
    H.putInto(H.part($, "card", "field", "addr"), await H.call($, "bin2dec", [address], 'function'), "into");
    // put bin2dec (data) into cd fld dat
    H.putInto(H.part($, "card", "field", "dat"), await H.call($, "bin2dec", [data], 'function'), "into");
    // put empty into cd fld com
    H.putInto(H.part($, "card", "field", "com"), "", "into");
  });
  // end mouseup
}

// ---- script 3: card-2996/field-4 "tcoda"
function script3(owner) {
  // on returninfield
  H.on(owner, "returninfield", async function returninfield($) {
    // send mouseup to cd btn "decode"
    await H.send($, "mouseup", H.part($, "card", "button", "decode"));
  });
  // end returninfield
}

// ---- script 4: card-2996/button-8 "decode 8"
function script4(owner) {
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    let tcod = "", letters = "", bina = "", scram = "", posa = "", posc = "", data = "", compare = "", address = "", tobin = "", i = "", c = "", tch = "", chs = "";
    // put cd fld tcoda into tcod
    tcod = H.value(H.part($, "card", "field", "tcoda"));
    // put "APZLGITYEOXUKSVN" into letters
    letters = "APZLGITYEOXUKSVN";
    // put "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111" into bina
    bina = "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111";
    // put "1678H234-IJKLABCDMNO%EFG!^&*5@#$" into scram
    scram = "1678H234-IJKLABCDMNO%EFG!^&*5@#$";
    // put "ABCDEFGHIJKLMNO" into posa
    posa = "ABCDEFGHIJKLMNO";
    // put "!@#$%^&*" into posc
    posc = "!@#$%^&*";
    // put "********" into data
    data = "********";
    // put "********" into compare
    compare = "********";
    // put "***************" into address
    address = "***************";
    // put empty into tobin
    tobin = "";
    // repeat with i=1 to 8
    for (i of H.range(1, 8)) {
      await H.tick();
      // put item offset (char i of tcod,letters) of bina after tobin
      tobin = H.put(tobin, H.chunk(bina, [["item", H.f.offset(H.chunk(tcod, [["char", i]]), letters)]]), "after");
    // end repeat
    }
    // repeat with c=1 to 32
    for (c of H.range(1, 32)) {
      await H.tick();
      // if c <>9 then
      if (!H.eq(c, 9)) {
        // put char c of tobin into tch
        tch = H.chunk(tobin, [["char", c]]);
        // put char c of scram into chs
        chs = H.chunk(scram, [["char", c]]);
        // if offset ((chs),posa)=0 then
        if (H.eq(H.f.offset(chs, posa), 0)) {
          // if offset ((chs),posc)=0 then
          if (H.eq(H.f.offset(chs, posc), 0)) {
            // put tch into char  (chs) of data
            data = H.put(data, tch, "into", [["char", chs]]);
          // else
          } else {
            // put tch into char offset (chs,posc) of compare
            compare = H.put(compare, tch, "into", [["char", H.f.offset(chs, posc)]]);
          // end if
          }
        // else
        } else {
          // put tch into char offset (chs,posa) of address
          address = H.put(address, tch, "into", [["char", H.f.offset(chs, posa)]]);
        // end if
        }
      // end if
      }
    // end repeat
    }
    // put bin2dec (address) into cd fld addr
    H.putInto(H.part($, "card", "field", "addr"), await H.call($, "bin2dec", [address], 'function'), "into");
    // put bin2dec (data) into cd fld dat
    H.putInto(H.part($, "card", "field", "dat"), await H.call($, "bin2dec", [data], 'function'), "into");
    // put bin2dec (compare) into cd fld com
    H.putInto(H.part($, "card", "field", "com"), await H.call($, "bin2dec", [compare], 'function'), "into");
  });
  // end mouseup
}

// ---- script 5: card-2996/button-9 "to num 6"
function script5(owner) {
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    let tcod = "", address = "", data = "", letters = "", bina = "", scram = "", pos = "", tobin = "", c = "", bitpos = "", i = "";
    // put "******" into tcod
    tcod = "******";
    // put bin (cd fld "addr") into address
    address = await H.call($, "bin", [H.value(H.part($, "card", "field", "addr"))], 'function');
    // put bin (cd fld "dat") into data
    data = await H.call($, "bin", [H.value(H.part($, "card", "field", "dat"))], 'function');
    // put "APZLGITYEOXUKSVN" into letters
    letters = "APZLGITYEOXUKSVN";
    // put "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111" into bina
    bina = "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111";
    // put "1678H234-IJKLABCDMNO5EFG" into scram
    scram = "1678H234-IJKLABCDMNO5EFG";
    // put "ABCDEFGHIJKLMNO" into pos
    pos = "ABCDEFGHIJKLMNO";
    // put "********0***************" into tobin
    tobin = "********0***************";
    // repeat with c=1 to 8
    for (c of H.range(1, 8)) {
      await H.tick();
      // put offset (c,scram) into bitpos
      bitpos = H.f.offset(c, scram);
      // if bitpos<>0 then  put char c+8 of data into char bitpos of tobin
      if (!H.eq(bitpos, 0)) {
        tobin = H.put(tobin, H.chunk(data, [["char", H.num(c) + 8]]), "into", [["char", bitpos]]);
      }
    // end repeat
    }
    // repeat with c=1 to 16
    for (c of H.range(1, 16)) {
      await H.tick();
      // put offset (char c of pos,scram) into bitpos
      bitpos = H.f.offset(H.chunk(pos, [["char", c]]), scram);
      // if bitpos<>0 then put char c+1 of address into char bitpos of tobin
      if (!H.eq(bitpos, 0)) {
        tobin = H.put(tobin, H.chunk(address, [["char", H.num(c) + 1]]), "into", [["char", bitpos]]);
      }
    // end repeat
    }
    // repeat with i=1 to 6
    for (i of H.range(1, 6)) {
      await H.tick();
      // put char bin2dec (char i*4-3 to i*4 of tobin )+1 of letters into char i of tcod
      tcod = H.put(tcod, H.chunk(letters, [["char", H.num(await H.call($, "bin2dec", [H.chunk(tobin, [["char", H.num(i) * 4 - 3, H.num(i) * 4]])], 'function')) + 1]]), "into", [["char", i]]);
    // end repeat
    }
    // put tcod into cd fld tcoda
    H.putInto(H.part($, "card", "field", "tcoda"), tcod, "into");
    // if the optionkey is down then put tcod
    if (H.eq(H.f.optionKey(), "down")) {
      H.putInto(H.msgBox(), tcod, "into");
    }
  });
  // end mouseup
}

// ---- script 6: card-2996/button-10 "to num 8"
function script6(owner) {
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    let tcod = "", address = "", data = "", compare = "", letters = "", bina = "", scram = "", posa = "", posc = "", tobin = "", c = "", bitpos = "", i = "";
    // put "******" into tcod
    tcod = "******";
    // put bin (cd fld "addr") into address
    address = await H.call($, "bin", [H.value(H.part($, "card", "field", "addr"))], 'function');
    // put bin (cd fld "dat") into data
    data = await H.call($, "bin", [H.value(H.part($, "card", "field", "dat"))], 'function');
    // put bin (cd fld "com") into compare
    compare = await H.call($, "bin", [H.value(H.part($, "card", "field", "com"))], 'function');
    // put "APZLGITYEOXUKSVN" into letters
    letters = "APZLGITYEOXUKSVN";
    // put "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111" into bina
    bina = "0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111";
    // put "1678H234-IJKLABCDMNO%EFG!^&*5@#$" into scram
    scram = "1678H234-IJKLABCDMNO%EFG!^&*5@#$";
    // put "ABCDEFGHIJKLMNO" into posa
    posa = "ABCDEFGHIJKLMNO";
    // put "!@#$%^&*" into posc
    posc = "!@#$%^&*";
    // put "********1***********************" into tobin
    tobin = "********1***********************";
    // repeat with c=1 to 8
    for (c of H.range(1, 8)) {
      await H.tick();
      // put offset (c,scram) into bitpos
      bitpos = H.f.offset(c, scram);
      // if bitpos<>0 then  put char c+8 of data into char bitpos of tobin
      if (!H.eq(bitpos, 0)) {
        tobin = H.put(tobin, H.chunk(data, [["char", H.num(c) + 8]]), "into", [["char", bitpos]]);
      }
    // end repeat
    }
    // repeat with c=1 to 8
    for (c of H.range(1, 8)) {
      await H.tick();
      // put offset (char c of posc,scram) into bitpos
      bitpos = H.f.offset(H.chunk(posc, [["char", c]]), scram);
      // if bitpos<>0 then  put char c+8 of compare into char bitpos of tobin
      if (!H.eq(bitpos, 0)) {
        tobin = H.put(tobin, H.chunk(compare, [["char", H.num(c) + 8]]), "into", [["char", bitpos]]);
      }
    // end repeat
    }
    // repeat with c=1 to 16
    for (c of H.range(1, 16)) {
      await H.tick();
      // put offset (char c of posa,scram) into bitpos
      bitpos = H.f.offset(H.chunk(posa, [["char", c]]), scram);
      // if bitpos<>0 then put char c+1 of address into char bitpos of tobin
      if (!H.eq(bitpos, 0)) {
        tobin = H.put(tobin, H.chunk(address, [["char", H.num(c) + 1]]), "into", [["char", bitpos]]);
      }
    // end repeat
    }
    // repeat with i=1 to 8
    for (i of H.range(1, 8)) {
      await H.tick();
      // put char bin2dec (char i*4-3 to i*4 of tobin )+1 of letters into char i of tcod
      tcod = H.put(tcod, H.chunk(letters, [["char", H.num(await H.call($, "bin2dec", [H.chunk(tobin, [["char", H.num(i) * 4 - 3, H.num(i) * 4]])], 'function')) + 1]]), "into", [["char", i]]);
    // end repeat
    }
    // put tcod into cd fld tcoda
    H.putInto(H.part($, "card", "field", "tcoda"), tcod, "into");
    // if the optionkey is down then put tcod
    if (H.eq(H.f.optionKey(), "down")) {
      H.putInto(H.msgBox(), tcod, "into");
    }
  });
  // end mouseup
}

// ---- script 7: card-2996/field-11 "addr"; card-2996/field-12 "dat"; card-2996/field-13 "com"
function script7(owner) {
  // on returninfield
  H.on(owner, "returninfield", async function returninfield($) {
    // send mouseup to cd btn "encode"
    await H.send($, "mouseup", H.part($, "card", "button", "encode"));
  });
  // end returninfield
}

// ---- script 8: card-2996/button-14 "decode"
function script8(owner) {
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    let car = "", lc = "", tc = "", i = "", it = "";
    // put "AEPOZXLUGKISTVYN" into car
    car = "AEPOZXLUGKISTVYN";
    // put the length of cd fld tcoda into lc
    lc = H.f.length(H.value(H.part($, "card", "field", "tcoda")));
    // put cd fld tcoda into tc
    tc = H.value(H.part($, "card", "field", "tcoda"));
    // repeat with i=1 to lc
    for (i of H.range(1, lc)) {
      await H.tick();
      // if offset (char i of tc,car)=0 then
      if (H.eq(H.f.offset(H.chunk(tc, [["char", i]]), car), 0)) {
        // answer "Wrong character(s) in Code field"
        it = await H.answer("Wrong character(s) in Code field");
        // select char i  of cd fld tcoda
        H.select(H.part($, "card", "field", "tcoda"), [["char", i]], "on");
        // exit mouseup
        return;
      // end if
      }
    // end repeat
    }
    // if lc=6 or the optionkey is down then
    if ((H.eq(lc, 6) || H.eq(H.f.optionKey(), "down"))) {
      // send mouseup to cd btn "decode 6"
      await H.send($, "mouseup", H.part($, "card", "button", "decode 6"));
    // else
    } else {
      // if lc=8 then  send mouseup to cd btn "decode 8"
      if (H.eq(lc, 8)) {
        await H.send($, "mouseup", H.part($, "card", "button", "decode 8"));
      }
    // end if
    }
  });
  // end mouseup
}

// ---- script 9: card-2996/button-15 "encode"
function script9(owner) {
  // on mouseup
  H.on(owner, "mouseup", async function mouseup($) {
    let co = "", da = "", adr = "", it = "";
    // put cd fld com into co
    co = H.value(H.part($, "card", "field", "com"));
    // put cd fld dat into da
    da = H.value(H.part($, "card", "field", "dat"));
    // put cd fld addr into adr
    adr = H.value(H.part($, "card", "field", "addr"));
    // if adr<0 or adr>65535 then
    if ((H.lt(adr, 0) || H.gt(adr, 65535))) {
      // answer "The address must be >0 and  <65535"
      it = await H.answer("The address must be >0 and  <65535");
      // select char 1 to 100  of cd fld addr
      H.select(H.part($, "card", "field", "addr"), [["char", 1, 100]], "on");
      // exit mouseup
      return;
    // end if
    }
    // if da>259 or da<0 then
    if ((H.gt(da, 259) || H.lt(da, 0))) {
      // answer "The value must be >0 and  <255"
      it = await H.answer("The value must be >0 and  <255");
      // select char 1 to 100  of cd fld dat
      H.select(H.part($, "card", "field", "dat"), [["char", 1, 100]], "on");
      // exit mouseup
      return;
    // end if
    }
    // if (co<0 or co>259) and co<> empty then
    if (((H.lt(co, 0) || H.gt(co, 259)) && !H.eq(co, ""))) {
      // answer "The compare value must be >0 and  <255"
      it = await H.answer("The compare value must be >0 and  <255");
      // select char 1 to 100  of cd fld com
      H.select(H.part($, "card", "field", "com"), [["char", 1, 100]], "on");
      // exit mouseup
      return;
    // end if
    }
    // if co is empty  then
    if (H.eq(co, "")) {
      // send mouseup to cd btn "to num 6"
      await H.send($, "mouseup", H.part($, "card", "button", "to num 6"));
    // else
    } else {
      // send mouseup to cd btn "to num 8"
      await H.send($, "mouseup", H.part($, "card", "button", "to num 8"));
    // end if
    }
  });
  // end mouseup
}

// ---- attach scripts to their owners
script0(H.STACK);  // stack script
script1("bkgnd-2577/field-2");  // bkgnd-2577/field-2 "letterS"
script2("card-2996/button-1");  // card-2996/button-1 "decode 6"
script3("card-2996/field-4");  // card-2996/field-4 "tcoda"
script4("card-2996/button-8");  // card-2996/button-8 "decode 8"
script5("card-2996/button-9");  // card-2996/button-9 "to num 6"
script6("card-2996/button-10");  // card-2996/button-10 "to num 8"
script7("card-2996/field-11");  // card-2996/field-11 "addr"
script7("card-2996/field-12");  // card-2996/field-12 "dat"
script7("card-2996/field-13");  // card-2996/field-13 "com"
script8("card-2996/button-14");  // card-2996/button-14 "decode"
script9("card-2996/button-15");  // card-2996/button-15 "encode"
};
