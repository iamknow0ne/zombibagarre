/* Zombie Bagarre: Night Shift. Original SNES homebrew vertical slice.
 * Fixed pools, integer motion, no browser runtime or commercial game data. */
#include <snes.h>
extern char world_tiles,world_tiles_end,world_palette,world_map;
extern char font_tiles,font_palette,actor_tiles,actor_tiles_end,actor_palette;
extern char shot_sound,shot_sound_end;
#define ENEMIES 14
#define BULLETS 12
#define EFFECTS 8
#define PLAY 1
#define TITLE 0
#define DEAD 2
#define PAUSE 3
s16 px,py,aimx,aimy,face,health,score,wave,spawned,killed,quota,grenades;
u16 frame,pad,oldpad,pressed,hud[1024],state,shotwait,hurt,dash,dashwait,spawntime,flash,wavetime,weapon;
s16 ex[ENEMIES],ey[ENEMIES],eh[ENEMIES];
s16 bx[BULLETS],by[BULLETS],bdx[BULLETS],bdy[BULLETS],bl[BULLETS];
s16 fx[EFFECTS],fy[EFFECTS],fl[EFFECTS],ft[EFFECTS];
u16 seed=3917;
brrsamples gun_sound;
s16 ab(s16 n){return n<0?-n:n;}
u16 random16(void){seed^=seed<<7;seed^=seed>>9;seed^=seed<<8;return seed;}
u16 actorTile(u16 n){return (n/8)*32+(n%8)*2;}
u16 blocked(s16 x,s16 y){
 if(x<10||x>230||y<27||y>196)return 1;
 if(((x+11>24&&x+4<88)||(x+11>168&&x+4<232))&&((y+14>38&&y+8<86)||(y+14>148&&y+8<196)))return 1;
 return 0;
}
void text(u16 x,u16 y,char *s){while(*s&&x<32){hud[y*32+x]=(u16)(*s)|0x2400;x++;s++;}}
void number(u16 x,u16 y,u16 n){hud[y*32+x]=48+(n/100)%10|0x2400;hud[y*32+x+1]=48+(n/10)%10|0x2400;hud[y*32+x+2]=48+n%10|0x2400;}
void drawHud(void){
 u16 i;for(i=0;i<1024;i++)hud[i]=0;
 text(1,1,"HP");for(i=0;i<health;i++)text(4+i,1,"+");text(11,1,"WAVE");number(16,1,wave);text(22,1,"K");number(24,1,score);
 if(weapon)text(1,2,"SHOTGUN");else text(1,2,"PISTOL");text(12,2,"BOMBS");number(18,2,grenades);
 text(1,27,"R:SWAP A:BOMB X:DASH L:LOCK");
 if(state==TITLE){
  text(5,7,"Z O M B I E");text(5,9,"B A G A R R E");text(9,11,"NIGHT SHIFT");
  text(7,14,"PRESS START");text(4,17,"D-PAD MOVE / FACE");text(4,19,"HOLD Y OR B TO FIRE");text(4,21,"SURVIVE THE CITY");text(7,24,"SNES PROTOTYPE");
 }
 if(state==DEAD){text(8,10,"YOU FELL");text(6,12,"THE HORDE REMAINS");text(6,16,"START TO RETRY");}
 if(state==PAUSE){text(11,11,"PAUSED");text(6,15,"START TO RESUME");}
 if(state==PLAY&&wavetime){text(9,11,"NIGHT WAVE");number(20,11,wave);text(5,13,"KEEP MOVING. STAY ALIVE.");}

}
void effect(s16 x,s16 y,u16 type){u16 i;for(i=0;i<EFFECTS;i++)if(!fl[i]){fx[i]=x;fy[i]=y;fl[i]=20;ft[i]=type;return;}}
void kill(u16 i){eh[i]=0;score++;killed++;effect(ex[i],ey[i],1);}
void reset(void){
 u16 i;px=120;py=104;aimx=0;aimy=-1;face=1;health=5;score=0;wave=1;quota=8;spawned=0;killed=0;grenades=3;weapon=0;
 shotwait=0;hurt=0;dash=0;dashwait=0;spawntime=70;flash=0;wavetime=100;state=PLAY;
 for(i=0;i<ENEMIES;i++)eh[i]=0;for(i=0;i<BULLETS;i++)bl[i]=0;for(i=0;i<EFFECTS;i++)fl[i]=0;
}
void shoot(s16 dx,s16 dy){u16 i;for(i=0;i<BULLETS;i++)if(!bl[i]){bx[i]=px+1;by[i]=py;bdx[i]=dx;bdy[i]=dy;bl[i]=38;return;}}
void spawn(void){
 u16 i,side;for(i=0;i<ENEMIES;i++)if(!eh[i]){
 side=random16()%4;
 if(side==0){ex[i]=112+random16()%24;ey[i]=28;}
 if(side==1){ex[i]=112+random16()%24;ey[i]=195;}
 if(side==2){ex[i]=12;ey[i]=94+random16()%30;}
 if(side==3){ex[i]=229;ey[i]=94+random16()%30;}
 eh[i]=(wave>3&&i%3==0)?2:1;spawned++;return;
 }
}
void update(void){
 s16 mx,my,speed,nx,ny,dx,dy,best,distance,scale;u16 i,j;
 if(pressed&KEY_START){if(state==TITLE||state==DEAD)reset();else if(state==PLAY)state=PAUSE;else state=PLAY;return;}
 if(state!=PLAY)return;
 if(hurt)hurt--;if(shotwait)shotwait--;if(dashwait)dashwait--;if(dash)dash--;if(flash)flash--;if(wavetime)wavetime--;
 mx=0;my=0;if(pad&KEY_LEFT)mx=-1;if(pad&KEY_RIGHT)mx=1;if(pad&KEY_UP)my=-1;if(pad&KEY_DOWN)my=1;
 if((mx||my)&&!(pad&KEY_L)){aimx=mx;aimy=my;if(mx)face=mx>0?2:3;else face=my>0?0:1;}
 if(pressed&KEY_R)weapon=1-weapon;
 if((pressed&KEY_X)&&!dashwait&&(mx||my)){dash=10;dashwait=70;hurt=14;}
 speed=dash?3:1;if(!dash&&frame%3==0)speed=2;
 nx=px+mx*speed;ny=py+my*speed;if(!blocked(nx,py))px=nx;if(!blocked(px,ny))py=ny;
 if((pad&(KEY_Y|KEY_B))&&!shotwait){
  dx=aimx*5;dy=aimy*5;
  /* Soft aim assistance: targets near the facing direction, never behind. */
  best=100;
  if(!(pad&KEY_L))for(i=0;i<ENEMIES;i++)if(eh[i]){
   nx=ex[i]-px;ny=ey[i]-py;distance=ab(nx)+ab(ny);
   if(distance<best&&(nx*aimx+ny*aimy)>0){best=distance;dx=nx;dy=ny;}
  }
  scale=ab(dx)>ab(dy)?ab(dx):ab(dy);if(!scale)scale=1;dx=dx*5/scale;dy=dy*5/scale;
  shoot(dx,dy);if(weapon){shoot(dx+(dy?1:0),dy+(dx?1:0));shoot(dx-(dy?1:0),dy-(dx?1:0));}
  shotwait=weapon?24:11;effect(px+aimx*10,py+aimy*10,0);spcPlaySound(0);
 }
 if((pressed&KEY_A)&&grenades){
  grenades--;flash=14;spcPlaySound(0);
  for(i=0;i<ENEMIES;i++)if(eh[i]&&ab(ex[i]-px)+ab(ey[i]-py)<110)kill(i);
  for(i=0;i<4;i++)effect(px+(i%2?24:-24),py+(i/2?24:-24),2);
 }
 if(spawntime)spawntime--;else if(spawned<quota){spawn();spawntime=wave<8?48-wave*4:16;}
 for(i=0;i<ENEMIES;i++)if(eh[i]){
  if((frame+i)%3!=0){
   dx=ex[i]<px?1:(ex[i]>px?-1:0);dy=ey[i]<py?1:(ey[i]>py?-1:0);
   if(!blocked(ex[i]+dx,ey[i]))ex[i]+=dx;
   else if(!blocked(ex[i],ey[i]+(ey[i]<112?1:-1)))ey[i]+=(ey[i]<112?1:-1);
   if(!blocked(ex[i],ey[i]+dy))ey[i]+=dy;
  }
  if(!hurt&&ab(ex[i]-px)<10&&ab(ey[i]-py)<10){health--;hurt=75;effect(px,py,1);if(health<=0){state=DEAD;return;}}
 }
 for(i=0;i<BULLETS;i++)if(bl[i]){
  bl[i]--;bx[i]+=bdx[i];by[i]+=bdy[i];
  if(blocked(bx[i],by[i])){bl[i]=0;effect(bx[i],by[i],0);}
  else for(j=0;j<ENEMIES;j++)if(eh[j]&&ab(bx[i]-ex[j])<10&&ab(by[i]-ey[j])<10){
   bl[i]=0;eh[j]--;if(!eh[j])kill(j);else effect(ex[j],ey[j],1);break;
  }
 }
 if(killed>=quota){wave++;quota=6+wave*2;if(quota>36)quota=36;spawned=0;killed=0;spawntime=120;wavetime=100;if(health<5)health++;if(grenades<5)grenades++;}
 for(i=0;i<EFFECTS;i++)if(fl[i])fl[i]--;
}
void draw(void){
 u16 i,pose,id;
 oamClear(0,0);
 if(state!=TITLE){
  pose=face*2+((frame/9)%2);if((hurt/4)%2==0){oamSet(0,px,py,3,0,0,actorTile(pose),0);oamSetEx(0,OBJ_SMALL,OBJ_SHOW);}
  oamSet(4,px+aimx*20,py+aimy*20,3,0,0,actorTile(18),0);oamSetEx(4,OBJ_SMALL,OBJ_SHOW);
 }
 for(i=0;i<ENEMIES;i++)if(eh[i]){id=(i+2)*4;pose=8+(eh[i]>1?2:0)+(frame/12+i)%2;oamSet(id,ex[i],ey[i],2,0,0,actorTile(pose),0);oamSetEx(id,OBJ_SMALL,OBJ_SHOW);}
 for(i=0;i<BULLETS;i++)if(bl[i]){id=(i+18)*4;oamSet(id,bx[i],by[i],3,0,0,actorTile(16),0);oamSetEx(id,OBJ_SMALL,OBJ_SHOW);}
 for(i=0;i<EFFECTS;i++)if(fl[i]){id=(i+32)*4;pose=ft[i]==1?17:(12+(20-fl[i])/5);oamSet(id,fx[i],fy[i],3,0,0,actorTile(pose),0);oamSetEx(id,OBJ_SMALL,OBJ_SHOW);}
}
int main(void){
 spcBoot();spcAllocateSoundRegion(4);spcSetSoundEntry(10,8,4,&shot_sound_end-&shot_sound,&shot_sound,&gun_sound);
 bgInitTileSet(0,&world_tiles,&world_palette,0,&world_tiles_end-&world_tiles,32,BG_16COLORS,0x2000);
 bgInitMapSet(0,&world_map,2048,SC_32x32,0x6000);
 bgInitTileSet(1,&font_tiles,&font_palette,1,4096,32,BG_16COLORS,0x4000);
 bgSetMapPtr(1,0x6800,SC_32x32);
 oamInitGfxSet(&actor_tiles,&actor_tiles_end-&actor_tiles,&actor_palette,32,0,0x0000,OBJ_SIZE16_L32);
 setMode(BG_MODE1,0);bgSetDisable(2);reset();state=TITLE;frame=0;oldpad=0;pad=0;pressed=0;drawHud();dmaCopyVram((u8*)hud,0x6800,2048);setScreenOn();
 while(1){
  pad=padsCurrent(0);pressed=pad&~oldpad;oldpad=pad;
  update();draw();
  if(frame%6==0||pressed)drawHud();
  spcProcess();WaitForVBlank();
  if(frame%6==0||pressed)dmaCopyVram((u8*)hud,0x6800,2048);
  setBrightness(flash?12:15);frame++;
 }
 return 0;
}
