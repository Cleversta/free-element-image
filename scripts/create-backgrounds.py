"""Generate the original Freelement landscape collection as editable SVG artwork.
Run from any directory with python3 scripts/create-backgrounds.py.
"""
from pathlib import Path
import json
import math
import random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/crafted-landscapes'
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(28)
scenes = []


def path(d, fill, stroke=None, width=1, opacity=1):
    return f'<path d="{d}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"' if stroke else '') + (f' opacity="{opacity}"' if opacity != 1 else '') + '/>'


def ellipse(x, y, rx, ry, fill, opacity=1):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" opacity="{opacity}"/>'


def cloud(x, y, s=1, color='#fff8e8', opacity=.65):
    return f'<g transform="translate({x} {y}) scale({s})" opacity="{opacity}">' + path('M-100 16 Q-118 1-87-7 Q-82-40-50-35 Q-33-68 1-44 Q40-56 50-20 Q90-30 100 3 Q135 12 104 21 Q-5 29-100 16Z', color) + '</g>'


def birds(x, y, color='#335263', n=3):
    return ''.join(path(f'M{x+i*33} {y+(i%2)*13}q8-9 16 0q8-9 16-1','none',color,2,.65) for i in range(n))


def pine(x, y, s=1, colors=('#294b43', '#3e6654')):
    return f'<g transform="translate({x} {y}) scale({s})">' + path('M-4 0L-3-155 4-155 5 0Z','#6c5547') + path('M0-193Q-12-166-31-153L-13-155Q-30-127-48-117L-26-120Q-38-88-66-72L-39-74Q-49-47-80-26Q-16-18 0-29Q36-12 78-28Q45-52 37-76L61-72Q39-93 24-123L44-119Q21-142 14-159L30-156Z',colors[0]) + path('M0-186L-4-147-25-152-11-134-10-112-35-116-17-96-15-71-48-72-22-45-24-29Q-9-22 0-29Z',colors[1]) + '</g>'


def tree(x, y, s=1, colors=('#3c654d', '#537c56', '#74965e'), blossom=False):
    result = f'<g transform="translate({x} {y}) scale({s})">'
    result += ellipse(0, 0, 73, 12, '#203e35', .12)
    result += path('M-8 0Q-7-65-19-102L-56-144-48-147-11-114-8-179 3-179 8-119 46-150 51-145 10-99 10 0Z', '#715b4c')
    result += path('M-68-96C-115-103-112-150-88-165C-100-197-58-224-29-211C-17-242 32-239 48-212C89-225 120-195 106-164C139-136 105-95 80-100C50-70-35-77-68-96Z', colors[0])
    result += path('M-85-161C-96-195-53-213-23-202C-10-232 28-219 40-201C68-213 104-190 93-168C50-178 25-142-8-155C-44-130-70-146-85-161Z', colors[1])
    result += path('M-69-186Q-46-213-17-196Q5-226 29-204Q8-179-17-184Q-39-165-69-186Z', colors[2])
    if blossom:
        for _ in range(30):
            xx=rng.randint(-85,85); yy=rng.randint(-198,-110)
            result += ellipse(xx, yy, rng.randint(2,5), rng.randint(2,4), '#ffe6d7', .7)
    return result + '</g>'


def grass(x, y, s=1, color='#426344'):
    return f'<g transform="translate({x} {y}) scale({s})">' + path('M0 0Q-3-19-15-26Q-5-9-6 0M0 0Q1-24 14-36Q5-14 5 0M3 0Q14-19 27-18Q12-8 11 0',color) + '</g>'


def flowers(area, count, palette, stalk='#607b4b'):
    x0,y0,x1,y1=area
    result=''
    for _ in range(count):
        x=rng.randint(x0,x1);y=rng.randint(y0,y1);s=(y-400)/400
        r=max(1.2,3*s);c=rng.choice(palette)
        result+=path(f'M{x} {y}q3-8 0-{int(12*s)}','none',stalk,1.2)
        for dx,dy in [(-r,0),(r,0),(0,-r),(0,r)]: result+=ellipse(round(x+dx,1),round(y-12*s+dy,1),round(r,1),round(r*.85,1),c)
        result+=ellipse(x,round(y-12*s,1),round(r*.55,1),round(r*.55,1),'#f6d17c')
    return result


def ripples(area, count, color='#e0f3df'):
    x0,y0,x1,y1=area
    return ''.join(path(f'M{rng.randint(x0,x1)} {rng.randint(y0,y1)}h{rng.randint(12,70)}','none',color,rng.choice([1,2,3]),rng.uniform(.12,.35)) for _ in range(count))


def make(slug, name, description, sky, land, water, art):
    defs=f'''<defs>
<linearGradient id="sky" x2="0" y2="1"><stop stop-color="{sky[0]}"/><stop offset="1" stop-color="{sky[1]}"/></linearGradient>
<linearGradient id="land" x2=".3" y2="1"><stop stop-color="{land[0]}"/><stop offset="1" stop-color="{land[1]}"/></linearGradient>
<linearGradient id="water" x2="0" y2="1"><stop stop-color="{water[0]}"/><stop offset="1" stop-color="{water[1]}"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#fff5d6" stop-opacity=".45"/><stop offset="1" stop-color="#fff5d6" stop-opacity="0"/></radialGradient>
<linearGradient id="aurora" x2=".2" y2="1"><stop stop-color="#83edc0" stop-opacity="0"/><stop offset=".5" stop-color="#88e6c5" stop-opacity=".55"/><stop offset="1" stop-color="#87a8ea" stop-opacity="0"/></linearGradient>
</defs>'''
    content=f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc"><title id="title">{name}</title><desc id="desc">{description} Original Freelement vector landscape.</desc>{defs}<path fill="url(#sky)" d="M0 0h1200v800H0z"/>{art}</svg>\n'
    (OUT/f'{slug}.svg').write_text(content)
    scenes.append({'name':name,'description':description,'sky':sky[1],'ground':land[1],'src':f'/assets/crafted-landscapes/{slug}.svg','kind':'full'})

# 01 — A wide turquoise lake, sharply cut peaks, and a quiet meadow shore.
a=ellipse(855,155,185,185,'url(#glow)')+ellipse(855,155,45,45,'#fff3d2')+cloud(268,120,1.2)+cloud(960,80,.8)
a+=path('M0 394L110 238 205 293 364 100 531 330 634 207 823 377 972 177 1200 371V550H0Z','#8aafb5')
a+=path('M205 293L364 100 531 330 413 266 363 184 314 254Z','#527d8c')+path('M293 192L364 100 424 185 386 164 367 185 344 158 327 192Z','#f1f5e9')
a+=path('M823 377L972 177 1200 371 1080 327 986 247 914 336Z','#71989e')+path('M934 230L972 177 1027 229 988 216 968 239 957 216Z','#e8f0e9')
a+=path('M0 413Q244 358 440 432Q718 385 1200 423V800H0Z','url(#water)')
a+=path('M228 440L370 615 482 441Z','#86b8b8',opacity=.4)+path('M838 441L975 574 1090 443Z','#aed0c8',opacity=.25)
a+=ripples((120,446,1100,652),45)
a+=path('M0 463Q154 484 254 548Q385 617 642 670Q934 690 1200 606V800H0Z','#d2d8aa')
a+=path('M0 474Q130 497 233 561Q372 634 650 697Q981 711 1200 626V800H0Z','url(#land)')
a+=pine(47,533,1.45)+pine(158,552,.94)+pine(1100,621,1.28)+pine(1188,607,1.65)
a+=path('M250 800Q461 690 732 733Q901 750 961 800Z','#acbc83',opacity=.7)
a+=flowers((24,691,223,790),32,['#fff5d7','#d7b9db'])+flowers((984,698,1170,789),26,['#fff5d7'])+birds(563,189)
make('alpine-mirror-lake','Alpine Mirror Lake','Snow-capped peaks, turquoise reflections, and a pine-framed meadow.',('#84b7ce','#eef0d7'),('#95b47c','#517957'),('#7db5b5','#b4d5c5'),a)

# 02 — Limestone headlands and curving bands of shallow turquoise surf.
a=ellipse(864,138,210,210,'url(#glow)')+ellipse(864,138,44,44,'#fff7d8')+cloud(241,104,.9)
a+=path('M0 323Q580 307 1200 329V800H0Z','url(#water)')
a+=path('M0 297L80 230 159 252 226 350 320 396 412 421 394 479 193 470 0 437Z','#b4c5ad')
a+=path('M0 332L113 308 163 348 203 411 336 431 402 466 199 482 0 450Z','#e8d8b5')
a+=path('M0 301L89 258 152 277 218 370 183 388 111 346 0 365Z','#709277')
a+=path('M1200 365Q1054 399 1033 482Q927 561 763 589Q477 610 197 737L64 800H1200Z','#f7e6bc')
a+=path('M1200 384Q1088 420 1072 485Q945 584 773 605Q436 654 262 753L216 800H0V765Q350 598 742 568Q944 553 999 478Q1047 386 1200 351Z','#80d1c5',opacity=.75)
a+=path('M1200 381Q1058 418 1048 488Q935 583 752 600Q413 640 196 772','none','#eef6df',9,.9)
a+=path('M1200 434Q1141 465 1136 516Q1064 581 934 625','none','#fff4d9',4,.8)
a+=path('M1200 592Q999 647 933 800H1200Z','url(#land)')
a+=path('M1022 730Q971 773 967 800H1200V699Z','#b8bf83')
a+=ripples((398,367,914,492),32,'#efffe9')+birds(478,197,'#557b87',4)
for x,y,s in [(1136,699,1.8),(1069,738,1.3),(1178,773,1.5)]:a+=grass(x,y,s,'#657d61')
a+=ellipse(693,723,19,7,'#d0bc96')+ellipse(479,757,9,5,'#c2b694')
make('sunlit-coastal-cove','Sunlit Coastal Cove','Pale limestone cliffs, clear shallows, and a sweeping sandy beach.',('#91cbd4','#e7eee0'),('#92a879','#6d875e'),('#4c9bb0','#8ed6c6'),a)

# 03 — Nested contour terraces have their own strong geometry.
a=ellipse(324,139,190,190,'url(#glow)')+ellipse(324,139,43,43,'#fff0b9')+cloud(876,137,1.1,'#fff6d7',.4)
a+=path('M0 385Q122 129 253 344Q430 73 560 324Q743 143 875 360Q1073 104 1200 329V800H0Z','#8bad9c')
a+=path('M0 411Q185 301 348 398Q577 260 792 405Q1010 282 1200 372V800H0Z','#618c78')
a+=path('M0 467C147 340 330 400 437 427S713 323 847 394S1060 414 1200 353V800H0Z','#8aa75e')
terraces=[('M0 495C175 359 307 451 481 454S732 349 894 438S1111 468 1200 396', '#b7cb77'),('M0 547C151 395 342 515 537 493S752 397 932 478S1110 537 1200 471','#cdd584'),('M0 600C159 467 362 570 567 545S776 469 966 548S1120 585 1200 533','#9dbf69'),('M0 673C211 506 377 639 614 606S804 538 1002 615S1131 669 1200 613','#bfce7b'),('M0 747C239 558 380 717 678 677S874 613 1091 700S1147 732 1200 706','#a8c572')]
for d,c in terraces:
 a+=path(d+'L1200 800H0Z',c)+path(d,'none','#436f5c',17)+path(d,'none','#e1dd9f',4)
a+=path('M0 723Q159 655 260 800H0Z','url(#land)')+path('M1200 621Q1069 712 1030 800H1200Z','#557c51')
a+=tree(99,599,.52,('#436a54','#658966','#92aa77'))
a+=path('M863 421h62v42h-62Z','#ac8858')+path('M850 426L895 393 939 426Z','#695b4b')+path('M889 442h13v21h-13Z','#5b624a')
a+=birds(571,212,'#5a796f')
make('emerald-rice-terraces','Emerald Rice Terraces','Layered rice paddies wind around green hills and a small field shelter.',('#a8cec5','#eee5b5'),('#8aa566','#547b4d'),('#abc99a','#73966a'),a)

# 04 — Receding violet rows lead to a warm farmhouse on the horizon.
a=ellipse(824,208,240,190,'url(#glow)')+ellipse(824,208,52,52,'#ffe4aa')+cloud(216,117,1.45,'#f9cdb6',.45)+cloud(1000,114,1.1,'#ffe2c5',.4)
a+=path('M0 370Q232 273 438 341Q701 282 910 345Q1093 292 1200 335V800H0Z','#9997a5')
a+=path('M0 432Q264 359 540 422Q845 355 1200 415V800H0Z','#777f78')
a+=path('M0 475Q541 419 1200 464V800H0Z','url(#land)')
a+=path('M696 431h103v-71H696Z','#ead1a5')+path('M680 366L746 322 816 366Z','#966a68')
a+=path('M734 431v-36q12-16 25 0v36Z','#6b6264')+path('M708 377h16v20h-16Zm62 0h16v20h-16Z','#8d8f87')
for x in [622,842,876]:a+=pine(x,441,.42,('#495b60','#657363'))
for i in range(10):
 x=i*160-170;target=573+(i-4)*34
 a+=path(f'M{x} 800Q{x+57} 598 {target} 466L{target+20} 466Q{x+133} 615 {x+130} 800Z',rng.choice(['#797096','#8c79a2','#a58aaf']))
 a+=path(f'M{x+24} 800Q{x+76} 601 {target+9} 472','none','#c4a3c6',7,.55)
a+=path('M510 800Q543 587 572 467H589Q616 621 671 800Z','#d4b6a0')
for _ in range(130):
 x=rng.randrange(0,1200); y=rng.randrange(570,800)
 if 510<x<680:continue
 a+=ellipse(x,y,2.4,5.2,rng.choice(['#bca0c8','#d4bad6','#655f85']),.8)
a+=birds(400,227,'#7e6c83')
make('lavender-golden-hour','Lavender Golden Hour','Violet flower rows and a stone farmhouse beneath a peach evening sky.',('#ba9ab8','#f6d8b8'),('#939577','#6c7361'),('#a4abb2','#7f8e99'),a)

# 05 — Tall, pale vertical trunks frame a luminous open forest clearing.
a=ellipse(615,234,310,230,'url(#glow)')
a+=path('M0 428Q247 323 502 398Q810 305 1200 390V800H0Z','#b7c7a4')
for x in range(20,1200,86):
 y=rng.randint(290,460)
 a+=path(f'M{x} 565L{x+9} {y-205} {x+16} {y-205} {x+22} 565Z','#9bad92',opacity=.5)
 a+=ellipse(x+10,y-193,60,90,'#a4ba91',.6)
a+=path('M0 537Q320 405 631 492Q935 409 1200 510V800H0Z','url(#land)')
a+=path('M426 800Q544 640 668 505Q614 650 689 800Z','#e8dcb5')
a+=path('M0 675Q218 529 401 599Q467 624 517 696L454 800H0Z','#789569')+path('M754 638Q966 521 1200 588V800H892Z','#7b9c6d')
for x,y,s in [(51,718,1.4),(194,606,1),(295,535,.72),(1048,619,1.2),(1190,708,1.55),(935,531,.7)]:
 a+=f'<g transform="translate({x} {y}) scale({s})">'+path('M-12 0L-7-435 12-435 16 0Z','#f0eee0')+path('M7 0L5-435 12-435 16 0Z','#c6cdb4')
 for yy in range(-406,-20,43):a+=path(f'M-9 {yy}l{rng.randint(8,19)}-3M3 {yy+15}h9','none','#7b8476',4,.85)
 a+=path('M0-229L-61-319M8-310L69-369','none','#ebe9d7',8)
 a+='</g>'
for x,y,s in [(42,124,1.3),(214,148,.9),(354,210,.68),(915,183,.8),(1105,135,1.3)]:
 a+=tree(x,y+140,s,('#70976b','#91b47e','#b8ca8c'))
a+=flowers((10,671,375,797),65,['#f5eed2','#dfe3d6'])+flowers((913,673,1190,797),45,['#f5eed2'])
make('silver-birch-clearing','Silver Birch Clearing','White birch trunks and soft woodland light frame a quiet winding path.',('#cedec8','#f3efd1'),('#bac697','#879f72'),('#b5ccaa','#779c83'),a)

# 06 — Monumental sandstone arch: geometric desert composition, no generic hills.
a=ellipse(877,174,215,215,'url(#glow)')+ellipse(877,174,57,57,'#fff0c7')
a+=path('M0 385L181 335 227 256 390 260 415 341 554 360 657 298 820 297 863 373 1076 338 1200 355V800H0Z','#cd9e88')
a+=path('M0 490L212 427 346 461 528 419 722 448 925 409 1200 465V800H0Z','#dcb393')
a+=path('M0 576Q340 464 647 543Q926 473 1200 522V800H0Z','url(#land)')
# Even-odd arch opening keeps the sky and distant mesas visible.
a+='<path fill="#a76754" fill-rule="evenodd" d="M13 650L53 301Q77 90 267 119Q456 145 454 650ZM164 650L164 364Q170 268 228 267Q291 268 304 353L311 650Z"/>'
a+=path('M13 650L53 301Q77 90 267 119Q369 133 415 274Q330 183 242 186Q118 170 102 335L75 650Z','#c88968')
a+=path('M90 220Q189 139 301 181M68 284Q114 238 147 232M36 451L117 423M28 515L111 492M340 463L426 474M342 523L437 538','none','#e0a780',8,.6)
a+=path('M0 688Q203 624 415 692Q602 738 885 657Q1103 601 1200 633V800H0Z','#d6a77b')
a+=path('M510 800Q626 696 955 634Q676 728 728 800Z','#edc595')
for x,y,s in [(1037,617,1),(1102,711,1.4),(849,663,.6)]:
 a+=f'<g transform="translate({x} {y}) scale({s})">'+path('M-8 0V-88Q0-105 8-88V-47H26V-70Q33-78 39-70V-38Q39-29 9-29V0ZM-8-54H-28Q-34-54-34-63V-86Q-28-94-23-86V-67H-8Z','#648679')+path('M0-90V-3','none','#99a485',3)+'</g>'
a+=grass(937,748,1.4,'#a78a61')+grass(399,719,.9,'#a78a61')+birds(620,217,'#9b7c6c',2)
make('sandstone-arch-canyon','Sandstone Arch Canyon','A sculpted sandstone arch, distant mesas, and warm desert trails.',('#d7ac9b','#f6dec0'),('#ebc398','#d6a478'),('#d4b18c','#af8771'),a)

# 07 — Night sky with flowing aurora above a reflective frozen river.
a=''
for _ in range(100):a+=ellipse(rng.randint(12,1188),rng.randint(12,344),rng.choice([1,1,1.5,2]),rng.choice([1,1,1.5,2]),'#e0efe8',rng.uniform(.25,.85))
a+=path('M-70 175C121 435 366-25 589 128S954 394 1286 49L1286-29C983 279 837 130 623 48S1020-163-70 69Z','url(#aurora)')
a+=path('M-20 190C232 372 376 4 593 142S974 347 1219 89','none','#abf0cb',3,.22)
a+=ellipse(930,118,36,36,'#e4eee0')+ellipse(944,104,33,33,'#243e56')
a+=path('M0 447L140 325 225 391 362 242 568 440 735 301 930 414 1109 259 1200 390V800H0Z','#47677d')
a+=path('M279 326L362 242 464 340 395 310 364 287 333 324Z','#b4ced2')+path('M1036 337L1109 259 1171 350 1112 300Z','#a5c4cf')
a+=path('M0 507Q245 451 471 498Q813 432 1200 487V800H0Z','url(#land)')
a+=path('M703 489Q542 564 701 597Q864 638 472 800H207Q761 631 580 604Q442 566 672 489Z','url(#water)')
a+=path('M703 489Q542 564 701 597Q864 638 472 800','none','#e0ebe3',8,.65)
for x,y,s in [(37,607,1.4),(132,573,.8),(1109,607,1.4),(1193,587,1.05),(1008,535,.6),(199,531,.5)]:
 a+=pine(x,y,s,('#29495d','#547b87'))+path(f'M{x-43*s} {y-77*s}Q{x} {y-88*s} {x+38*s} {y-76*s}','none','#d1e3dd',5*s,.75)
a+=path('M0 684Q158 610 370 695Q516 719 464 800H0Z','#d6e2df')+path('M835 709Q1031 598 1200 647V800H683Z','#a5c3ce')
a+=path('M894 739Q999 686 1121 697','none','#e2ece7',4,.65)
make('northern-lights-river','Northern Lights River','Flowing green aurora above snowy pines and a winding blue river.',('#17293f','#436879'),('#b2cbd2','#86adbd'),('#629dba','#426e8f'),a)

# 08 — A cherry blossom canopy and red bridge across a spring river.
a=ellipse(822,143,190,190,'url(#glow)')+cloud(678,122,1.15,'#fff1e5',.65)
a+=path('M0 428Q185 281 428 375Q652 264 874 374Q1058 304 1200 384V800H0Z','#a9b8a0')
a+=path('M0 478Q302 352 579 455Q890 361 1200 452V800H0Z','#859f86')
a+=path('M0 503Q535 431 1200 488V800H0Z','url(#land)')
a+=path('M789 472Q621 526 736 588Q855 660 505 800H945Q1173 649 928 580Q729 520 838 472Z','url(#water)')
a+=path('M790 472Q621 526 736 588Q855 660 505 800','none','#f0e6c6',9,.75)
a+=path('M565 590Q741 455 935 591L927 609Q743 484 575 609Z','#aa6058')
a+=path('M574 558Q751 425 925 560','none','#bc7060',10)
for x,y in [(592,548),(637,521),(682,505),(730,500),(778,503),(826,519),(872,542),(911,559)]:a+=path(f'M{x} {y}v37','none','#a85c54',7)
a+=tree(67,628,1.85,('#be8291','#dfa3aa','#f4c8c4'),True)+tree(1152,596,1.25,('#c68796','#e5abb1','#f5d0cb'),True)
a+=tree(318,489,.53,('#c6919c','#dfb4b9','#f3d0c7'),True)
a+=path('M0 736Q247 628 498 703L693 800H0Z','#a2b481')
a+=flowers((20,713,430,797),42,['#f4d7cf','#fff0dc'])
for _ in range(38):a+=ellipse(rng.randint(17,1132),rng.randint(293,785),4,2,'#f3d0cb',.8)
make('cherry-blossom-bridge','Cherry Blossom Bridge','Pink cherry canopies and an arched footbridge over a gentle spring river.',('#b9d5cf','#f5e8cd'),('#b7c395','#8da577'),('#aecac0','#789fa4'),a)

# 09 — Ochre roads and vineyards below a small terracotta-roof village.
a=cloud(263,121,1.1,'#fff2d3',.65)+ellipse(942,141,50,50,'#fff0b8')
a+=path('M0 403Q129 232 354 365Q563 238 773 348Q1018 218 1200 361V800H0Z','#a4ae82')
a+=path('M0 489Q310 290 604 415Q854 341 1200 453V800H0Z','#7e976a')
for x,y,w,h in [(725,365,80,72),(800,379,62,62),(860,370,94,69),(821,324,29,91)]:
 a+=path(f'M{x} {y}h{w}v{-h}h{-w}Z','#e6c79a')+path(f'M{x-8} {y-h}l{w/2+8}-{w*.3} {w/2+8} {w*.3}Z','#a36c53')
 a+=path(f'M{x+w*.35} {y}v-22h14v22Z','#726c53')
 if w>40:a+=path(f'M{x+12} {y-h+17}h12v16h-12Z','#6d826b')
for x in [686,979,1009]:a+=pine(x,389,.5,('#4b6350','#617b57'))
a+=path('M0 506Q329 390 585 475Q854 396 1200 488V800H0Z','url(#land)')
for i in range(9):
 x=i*163-120;top=436+i*31
 a+=path(f'M{x} 800Q{x+81} 599 {top} 485L{top+17} 485Q{x+143} 616 {x+114} 800Z','#627b4e')
 a+=path(f'M{x+36} 800Q{x+104} 610 {top+7} 491','none','#aac17a',11,.55)
a+=path('M742 800Q541 661 641 602Q760 527 800 455H825Q796 549 700 610Q598 659 927 800Z','#dec394')
a+=tree(69,623,1.05,('#576f51','#7c9161','#a3b575'))+tree(1124,632,1.1,('#536d50','#748b5b','#9db077'))
a+=grass(1040,774,1.7,'#687e4d')+birds(397,215,'#707e6a',3)
make('tuscan-vineyard','Tuscan Vineyard','Sunlit vineyard rows, cypress trees, and a terracotta-roof hill village.',('#a9c3c1','#eee0b8'),('#b8bb79','#8c995e'),('#a2b8a0','#698c82'),a)

# 10 — A high waterfall drops from dense jungle into a teal pool.
a=ellipse(653,171,231,185,'url(#glow)')
a+=path('M0 340Q193 245 355 335L451 232 760 244 862 349Q1041 232 1200 289V800H0Z','#779e88')
a+=path('M0 398Q242 329 399 389L460 287 763 294 854 407Q1045 302 1200 353V800H0Z','#4d8073')
a+=path('M431 562L450 296 554 271 754 300 828 573Z','#627e6e')
a+=path('M450 297L531 281 504 551 431 562Z','#415f58')+path('M690 299L754 300 828 573 724 538Z','#3f655c')
a+=path('M543 303Q591 312 646 302L662 539Q705 576 750 605L499 605Q555 568 544 525Z','#c5eee0')
a+=path('M559 317Q583 409 567 527M609 318Q594 414 620 548M630 324Q627 458 642 520','none','#f1f8df',10,.8)
a+=path('M0 594Q234 459 471 561Q829 480 1200 560V800H0Z','url(#land)')
a+=ellipse(653,641,393,141,'url(#water)')+ellipse(648,599,124,23,'#c9edda',.6)+ripples((324,618,904,729),38)
a+=path('M0 606Q187 551 345 673L369 800H0Z','#437963')+path('M1200 543Q1020 556 970 709L873 800H1200Z','#396e5b')
for x,y,s in [(55,579,1.65),(209,486,.9),(1094,537,1.5),(1200,450,1.55)]:a+=tree(x,y,s,('#356b59','#508568','#7aa57b'))
for x,y,s in [(51,752,2.7),(187,790,2.2),(1082,759,3),(1171,781,2.5)]:a+=grass(x,y,s,'#91b36f')
a+=flowers((17,716,237,793),17,['#ebae85','#efd0a0'])+ellipse(785,674,26,8,'#618f68')+ellipse(869,656,17,6,'#68976e')
make('hidden-jungle-falls','Hidden Jungle Falls','A ribbon waterfall and jade pool enclosed by lush tropical forest.',('#a4ccc4','#dce8c8'),('#74a17d','#417e66'),('#90cbbb','#469d98'),a)

# 11 — Copper woodland edges, a winding creek, and a low stone footbridge.
a=ellipse(540,179,220,195,'url(#glow)')+cloud(810,115,1.15,'#f9e6c5',.5)
a+=path('M0 406Q260 259 500 382Q801 270 1200 364V800H0Z','#b5b394')
a+=path('M0 474Q210 361 487 442Q800 346 1200 441V800H0Z','#969b7a')
a+=path('M0 543Q266 444 535 505Q940 442 1200 525V800H0Z','url(#land)')
a+=path('M633 488Q456 548 554 601Q667 682 418 800H692Q830 689 643 599Q539 547 679 488Z','url(#water)')
a+=path('M635 490Q458 550 554 601Q667 682 418 800','none','#e9d4ab',8,.8)
a+=path('M409 589Q552 511 705 570L707 601Q555 547 418 620Z','#b4aa8c')+path('M419 577Q555 502 704 558','none','#d4c7a4',10)
for x in range(439,700,29):a+=path(f'M{x} {555+int((x-553)**2/700)}l-3 22','none','#8e8a77',2,.6)
for x,y,s,cols in [(76,634,1.7,('#a96a42','#c88b4e','#e1b46c')),(252,529,.85,('#a07545','#bd9756','#d4b77b')),(1081,612,1.5,('#a85e46','#c9804e','#e1aa68')),(921,509,.78,('#ac7148','#c79053','#dfb76f'))]:a+=tree(x,y,s,cols)
a+=path('M0 718Q205 605 414 696L447 800H0Z','#b4a574')+path('M781 686Q1010 604 1200 658V800H701Z','#c4ae79')
for _ in range(95):
 x=rng.choice([rng.randrange(0,388),rng.randrange(815,1200)]);y=rng.randrange(632,800)
 a+=ellipse(x,y,rng.randint(2,5),2,rng.choice(['#cc9151','#e2bf77','#956b48']),.85)
a+=birds(563,185,'#807e6f',2)
make('copperwood-creek','Copperwood Creek','Amber canopies, scattered leaves, and a small stone bridge beside a creek.',('#c2cbb6','#eee0bb'),('#c4ba89','#9e9f72'),('#bdd4c3','#81b2b1'),a)

# 12 — Open meadow with organic distant hills, a winding path, and floral borders.
a=ellipse(313,149,170,170,'url(#glow)')+ellipse(313,149,39,39,'#fff3c9')+cloud(752,101,1.3)+cloud(1032,206,.85)+cloud(63,196,.7)
a+=path('M0 383Q185 266 393 352T790 321Q969 269 1200 369V800H0Z','#a7bc98')
a+=path('M0 436Q192 357 371 434Q530 477 749 387Q976 310 1200 420V800H0Z','#84a47c')
a+=path('M0 527Q248 383 538 496Q813 399 1200 501V800H0Z','url(#land)')
a+=path('M469 800Q681 672 663 599Q648 531 748 463Q705 530 718 592Q754 688 674 800Z','#ddd6ab')
a+=path('M0 664Q231 550 499 665L448 800H0Z','#86a570')+path('M826 642Q1035 569 1200 611V800H755Z','#729663')
a+=tree(94,537,.95,('#547c59','#73965f','#9bb779'))+tree(1111,509,.77,('#527b5b','#749867','#a0b985'))
# Very small distant fence gives scale without obstructing the open meadow.
a+=path('M175 504Q348 480 455 517','none','#b3b28a',4)
for x in range(180,455,31):a+=path(f'M{x} {495+int((x-300)**2/900)}v25','none','#a6a580',4)
a+=flowers((0,654,422,799),135,['#f6eaca','#eac5c4','#b3a2c4','#fff5de'])+flowers((852,642,1197,799),107,['#f8e6b7','#eee9d2','#c2b3d5'])
a+=birds(498,183,'#658876',4)
make('wildflower-trail','Wildflower Trail','An open spring meadow with a winding trail and delicate floral borders.',('#a2c8d4','#f1edd4'),('#b1c28a','#789b68'),('#b5d4c1','#81b3a5'),a)

(ROOT/'data/scene-backgrounds.json').write_text(json.dumps(scenes,indent=2)+'\n')
catalog_path=ROOT/'data/assets.json'
catalog=[a for a in json.loads(catalog_path.read_text()) if a['style']!='crafted-landscapes']
for scene in scenes:
    slug=Path(scene['src']).stem
    catalog.append({'id':'scene-'+slug,'type':'background','variant':slug,'style':'crafted-landscapes','src':scene['src'],'placement':['background'],'depth':['background'],'minScale':1,'maxScale':1,'collision':'none','transparent':False,'fullCanvas':True})
catalog_path.write_text(json.dumps(catalog,indent=2)+'\n')
print(f'Created {len(scenes)} SVG scenes; catalog contains {len(catalog)} assets.')
