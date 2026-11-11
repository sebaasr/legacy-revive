# Hand simulation of the Game Genie stack HyperTalk (decode 6/8, to num 6), used to derive the expected
# values in eval/hypercard/scenarios.json. Check: decode8("ZKELOLUP") == (15233, 66, 147), the values saved in the stack.
# Hand simulation of the Game Genie HyperTalk (1-based chars); bin2dec/bin assumed: binary->decimal, decimal->16-bit binary
letters="APZLGITYEOXUKSVN"
bina="0000,0001,0010,0011,0100,0101,0110,0111,1000,1001,1010,1011,1100,1101,1110,1111".split(',')
def off(a,b): return b.find(a)+1 if a else 0
def setc(s,i,c):
    s=list(s); 
    while len(s)<i: s.append('')
    s[i-1]=c; return ''.join(s)
def decode6(t):
    scram="1678H234-IJKLABCDMNO5EFG"; pos="ABCDEFGHIJKLMNO"; data="********"; addr="***************"; tob=''
    for i in range(6): tob+=bina[off(t[i],letters)-1]
    for c in range(1,25):
        if c!=9:
            tch=tob[c-1]; ch=scram[c-1]
            if off(ch,pos)==0: data=setc(data,int(ch),tch)
            else: addr=setc(addr,off(ch,pos),tch)
    return int(addr,2),int(data,2)
def decode8(t):
    scram="1678H234-IJKLABCDMNO%EFG!^&*5@#$"; posa="ABCDEFGHIJKLMNO"; posc="!@#$%^&*"
    data="********";comp="********";addr="***************";tob=''
    for i in range(8): tob+=bina[off(t[i],letters)-1]
    for c in range(1,33):
        if c!=9:
            tch=tob[c-1]; ch=scram[c-1]
            if off(ch,posa)==0:
                if off(ch,posc)==0: data=setc(data,int(ch),tch)
                else: comp=setc(comp,off(ch,posc),tch)
            else: addr=setc(addr,off(ch,posa),tch)
    return int(addr,2),int(data,2),int(comp,2)
def tonum6(a,d):
    scram="1678H234-IJKLABCDMNO5EFG"; pos="ABCDEFGHIJKLMNO"
    A=format(a,'016b'); D=format(d,'016b'); tob="********0***************"; tc="******"
    for c in range(1,9):
        bp=off(str(c),scram)
        if bp: tob=setc(tob,bp,D[c+8-1])
    for c in range(1,17):
        bp=off(pos[c-1] if c<=len(pos) else '',scram)
        if bp: tob=setc(tob,bp,A[c])
    for i in range(1,7): tc=setc(tc,i,letters[int(tob[i*4-4:i*4],2)])
    return tc
for code in ["SXIOPO","AAAAAA","GOSSIP"]: print(code, decode6(code), tonum6(*decode6(code)))
print("8:", decode8("YEUZUGAA"))
