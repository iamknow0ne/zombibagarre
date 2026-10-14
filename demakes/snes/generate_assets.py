"""Original pixel art and BRR synthesis. Python standard library only; deterministic."""
from pathlib import Path
import math, random, struct, zlib
OUT = Path(__file__).parent / 'assets'
OUT.mkdir(exist_ok=True)
rng=random.Random(83199)
palette=[(10,16,27),(21,35,43),(33,52,57),(48,72,71),(73,94,86),(112,127,106),(190,184,143),(236,219,160),(22,62,69),(32,105,112),(73,159,156),(151,198,173),(89,38,46),(158,55,54),(211,113,58),(245,171,74)]
def pal(name, colors):
    OUT.joinpath(name+'.pal').write_bytes(b''.join(struct.pack('<H',(r//8)|((g//8)<<5)|((b//8)<<10)) for r,g,b in colors))
def planar(tile):
    data=bytearray(32)
    for y in range(8):
        for x in range(8):
            c=tile[y][x]
            for b in range(4): data[(b//2)*16+y*2+b%2] |= ((c>>b)&1)<<(7-x)
    return bytes(data)
def png(name,pix,colors):
    w,h=len(pix[0]),len(pix)
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
    raw=b''.join(b'\0'+b''.join(bytes(colors[c]) for c in row) for row in pix)
    OUT.joinpath(name+'.png').write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
world=[[1]*256 for _ in range(224)]
def rect(img,x,y,w,h,c):
    for yy in range(max(0,y),min(len(img),y+h)):
        for xx in range(max(0,x),min(len(img[0]),x+w)):img[yy][xx]=c
# Dusk city, asphalt with deterministic grit, kerbs, drains and road markings.
for y in range(24,216):
    for x in range(8,248):world[y][x]=2 if rng.randrange(80)==0 else 1
for y in range(32,210,24):rect(world,124,y,3,11,5)
for x in range(12,246,24):rect(world,x,114,11,2,5)
for x in (8,240):rect(world,x,24,8,192,3)
for y in (24,208):rect(world,8,y,240,8,3)
for x,y,w,h in [(24,38,64,48),(168,38,64,48),(24,148,64,48),(168,148,64,48)]:
    rect(world,x+3,y+4,w+3,h+4,0);rect(world,x,y,w,h,4);rect(world,x+2,y+2,w-4,h-8,2)
    for xx in range(x+5,x+w-5,12):
        rect(world,xx,y+6,7,7,8);rect(world,xx,y+7,6,3,10)
        rect(world,xx,y+h-6,7,4,14)
    rect(world,x+8,y+21,w-16,2,3)
    rect(world,x+w-20,y+16,12,18,3);rect(world,x+w-18,y+18,8,14,4)
    for yy in range(y+19,y+31,3):rect(world,x+w-18,yy,8,1,1)
# Original little garden islands and luminous drain/fountain accents.
for x,y in [(102,57),(144,175),(103,177),(147,59)]:
    rect(world,x-6,y-5,12,12,0)
    for yy in range(-5,6):
        for xx in range(-5,6):
            if xx*xx+yy*yy<27:world[y+yy][x+xx]=3+(abs(xx+yy)%3==0)
    rect(world,x-1,y-1,2,6,6)
for x,y in [(45,103),(203,126)]:
    rect(world,x,y,12,5,0)
    for xx in range(x+1,x+11,3):rect(world,xx,y+1,1,3,4)
# Deduplicate 8x8 tiles so the resource budget is explicit.
tiles=[bytes(32)];lookup={tiles[0]:0};tilemap=[]
for ty in range(32):
    for tx in range(32):
        tile=[[world[ty*8+y][tx*8+x] if ty*8+y<224 else 0 for x in range(8)] for y in range(8)]
        b=planar(tile)
        if b not in lookup:lookup[b]=len(tiles);tiles.append(b)
        tilemap.append(lookup[b])
assert len(tiles)<512
OUT.joinpath('world.pic').write_bytes(b''.join(tiles));OUT.joinpath('world.map').write_bytes(struct.pack('<1024H',*tilemap));pal('world',palette);png('world',world,palette)
# Hand-authored 5x7 block alphabet. Each glyph occupies a transparent 8x8 tile.
patterns={
'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],'C':['01111','10000','10000','10000','10000','10000','01111'],'D':['11110','10001','10001','10001','10001','10001','11110'],'E':['11111','10000','10000','11110','10000','10000','11111'],'F':['11111','10000','10000','11110','10000','10000','10000'],'G':['01111','10000','10000','10111','10001','10001','01111'],'H':['10001','10001','10001','11111','10001','10001','10001'],'I':['111','010','010','010','010','010','111'],'J':['00111','00010','00010','00010','10010','10010','01100'],'K':['10001','10010','10100','11000','10100','10010','10001'],'L':['10000','10000','10000','10000','10000','10000','11111'],'M':['10001','11011','10101','10101','10001','10001','10001'],'N':['10001','11001','10101','10011','10001','10001','10001'],'O':['01110','10001','10001','10001','10001','10001','01110'],'P':['11110','10001','10001','11110','10000','10000','10000'],'Q':['01110','10001','10001','10001','10101','10010','01101'],'R':['11110','10001','10001','11110','10100','10010','10001'],'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],'U':['10001','10001','10001','10001','10001','10001','01110'],'V':['10001','10001','10001','10001','10001','01010','00100'],'W':['10001','10001','10001','10101','10101','11011','10001'],'X':['10001','10001','01010','00100','01010','10001','10001'],'Y':['10001','10001','01010','00100','00100','00100','00100'],'Z':['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['010','110','010','010','010','010','111'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['10010','10010','10010','11111','00010','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
'-':['00000','00000','00000','11111','00000','00000','00000'],':':['0','1','0','0','1','0','0'],'/':['00001','00001','00010','00100','01000','10000','10000'],'+':['00000','00100','00100','11111','00100','00100','00000'],'.':['0','0','0','0','0','1','0']}
font=[]
for n in range(128):
    t=[[0]*8 for _ in range(8)]
    for y,row in enumerate(patterns.get(chr(n),[])):
        for x,v in enumerate(row):t[y][x+1]=1 if v=='1' else 0
    font.append(planar(t))
OUT.joinpath('font.pic').write_bytes(b''.join(font));pal('font',[(0,0,0),(244,219,160)]+[(0,0,0)]*14)
# 16x16 metasprites arranged in SNES 16-tile-wide sprite layout.
sheet=[[0]*128 for _ in range(96)]
def actor(kind,face,step):
    p=[[0]*16 for _ in range(16)]
    # Dark outline, boots, teal survivor armour or infected green coat.
    rect(p,4,4,8,10,1);rect(p,5,4,6,4,6 if kind==0 else 5)
    rect(p,4,8,8,5,9 if kind==0 else (3 if kind==1 else 12))
    rect(p,5,9,5,2,10 if kind==0 else 4);rect(p,5,13,2,2,2);rect(p,9,13-step,2,2,2)
    if kind==0:
        rect(p,4,3,8,2,2);rect(p,5,3,6,1,9);rect(p,3,7,2,3,6)
        if face==0:rect(p,7,10,3,6,2);rect(p,8,15,2,1,7)
        elif face==1:rect(p,7,0,3,7,2);rect(p,8,0,2,1,7)
        elif face==2:rect(p,10,7,6,3,2);rect(p,15,7,1,2,7)
        else:rect(p,0,7,6,3,2);rect(p,0,7,1,2,7)
        if face!=1:rect(p,6,6,4,1,15)
    else:
        rect(p,3,8,2,5-step,5);rect(p,11,7+step,2,5,5);rect(p,5,6,2,1,13);rect(p,9,6,2,1,13)
    return p
frames=[actor(0,d,s) for d in range(4) for s in range(2)]+[actor(k,0,s) for k in (1,2) for s in range(2)]
for stage in range(4):
    p=[[0]*16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            r=(x-7)**2+(y-7)**2
            if r<(3+stage*2)**2 and rng.randrange(5):p[y][x]=13 if stage>1 else (7 if r<8 else 15)
    frames.append(p)
p=[[0]*16 for _ in range(16)];rect(p,6,6,4,4,7);rect(p,7,5,2,6,15);frames.append(p)
p=[[0]*16 for _ in range(16)];rect(p,4,5,8,7,12);rect(p,6,3,4,10,13);frames.append(p)
# grenade ring/cursor: one tile sprite showing a fine amber sight.
p=[[0]*16 for _ in range(16)]
for x,y in [(7,2),(7,3),(7,11),(7,12),(2,7),(3,7),(11,7),(12,7)]:p[y][x]=7
frames.append(p)
for i,p in enumerate(frames):
    ox=(i%8)*16;oy=(i//8)*16
    for y in range(16):
        for x in range(16):sheet[oy+y][ox+x]=p[y][x]
OUT.joinpath('actors.pic').write_bytes(b''.join(planar([row[x:x+8] for row in sheet[y:y+8]]) for y in range(0,96,8) for x in range(0,128,8)))
pal('actors',palette);png('actors',sheet,palette)
# Filter-zero BRR: deterministic short noisy gun crack, no sampled material.
brr=bytearray()
for block in range(48):
    brr.append((10<<4)|(1 if block==47 else 0))
    amp=7*(1-block/48)**2
    samples=[max(-8,min(7,int(rng.uniform(-amp,amp))))&15 for _ in range(16)]
    brr.extend((samples[i]<<4)|samples[i+1] for i in range(0,16,2))
OUT.joinpath('shot.brr').write_bytes(brr)
print(f'Original assets: {len(tiles)} world tiles, {len(frames)} actor frames, {len(brr)} BRR bytes')
