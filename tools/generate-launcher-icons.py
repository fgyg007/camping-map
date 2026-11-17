from pathlib import Path
from PIL import Image, ImageDraw

out=Path(__file__).resolve().parents[1] / 'android/app/src/main/res'
S=8
pine='#173D33'
ivory='#FFF0CC'
amber='#F0BE65'
tent=[(51,35),(75,73),(27,73)]
door=[(51,52),(63,73),(39,73)]
star=[(71,27),(73,33),(79,35),(73,37),(71,43),(69,37),(63,35),(69,33)]

def draw(size,kind):
    side=108*S
    im=Image.new('RGBA',(side,side))
    d=ImageDraw.Draw(im)
    xy=lambda points:[(int(x*S),int(y*S)) for x,y in points]
    if kind=='round':
        d.ellipse((0,0,side-1,side-1),fill=pine)
    elif kind=='legacy':
        d.rounded_rectangle((0,0,side-1,side-1),radius=22*S,fill=pine)
    fg=Image.new('RGBA',(side,side))
    mark=ImageDraw.Draw(fg)
    mark.polygon(xy(tent),fill=ivory)
    mark.polygon(xy(door),fill=(0,0,0,0))
    mark.polygon(xy(star),fill=amber)
    return Image.alpha_composite(im,fg).resize((size,size),Image.Resampling.LANCZOS)
for density,scale in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    for filename,kind in [('ic_launcher','legacy'),('ic_launcher_round','round'),('ic_launcher_foreground','foreground')]:
        draw(scale,kind).save(out/f'mipmap-{density}'/f'{filename}.png',optimize=True)
