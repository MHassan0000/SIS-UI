"""Render original geometric artwork for extension icons."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
icons = root / 'extension/icons'
icons.mkdir(parents=True, exist_ok=True)
im = Image.new('RGBA', (512, 512))
d = ImageDraw.Draw(im)
d.rounded_rectangle((64,64,448,448), radius=84, fill='#1d624e')
d.rounded_rectangle((152,120,336,374), radius=22, fill='#f3f6f2')
for y, end in [(172,294),(210,294),(248,256)]:
    d.rounded_rectangle((184,y,end,y+12),radius=6,fill='#81a695')
d.ellipse((260,272,392,404),fill='#d8b95e')
d.line([(292,340),(316,364),(363,316)],fill='#18302c',width=14,joint='curve')
for size in [16,32,48,128]:
    im.resize((size,size),Image.Resampling.LANCZOS).save(icons / f'icon-{size}.png')
print('Created extension icons.')
