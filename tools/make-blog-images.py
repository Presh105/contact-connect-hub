"""Generate a cover image and a key-points graphic for every article.

Run from the project root:  python3 tools/make-blog-images.py
Needs Pillow and the Inter font (falls back to DejaVu). Output: public/blog/<slug>.jpg
and public/blog/<slug>-key-points.jpg (both 1200x630).
"""
import glob, os, re, hashlib
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "blog")
os.makedirs(OUT, exist_ok=True)

FONT_DIRS = ["/usr/share/fonts/opentype/inter/", "/usr/share/fonts/truetype/dejavu/"]
def font(weight, size):
    names = {"b": ["Inter-Bold.otf", "DejaVuSans-Bold.ttf"], "s": ["Inter-SemiBold.otf", "DejaVuSans-Bold.ttf"], "r": ["Inter-Regular.otf", "DejaVuSans.ttf"]}[weight]
    for d in FONT_DIRS:
        for n in names:
            p = d + n
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()

PALETTES = [
    ((6, 78, 59), (16, 185, 129), (167, 243, 208)),    # emerald
    ((30, 58, 138), (59, 130, 246), (191, 219, 254)),  # blue
    ((88, 28, 135), (168, 85, 247), (233, 213, 255)),  # purple
    ((154, 52, 18), (249, 115, 22), (254, 215, 170)),  # orange
    ((17, 24, 39), (55, 65, 81), (156, 163, 175)),     # slate
    ((131, 24, 67), (236, 72, 153), (251, 207, 232)),  # pink
    ((19, 78, 74), (20, 184, 166), (153, 246, 228)),   # teal
]

def parse(path):
    t = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", t, re.S)
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    meta["slug"] = os.path.basename(path)[:-3]
    return meta

def gradient(c1, c2):
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = (x * 0.6 + y * 0.9) / (W * 0.6 + H * 0.9)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img

def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= maxw:
            cur = trial
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def decor(img, pal, seed):
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    # big soft circles
    d.ellipse((W - 420 + (h % 60), -160, W + 160, 420), fill=(255, 255, 255, 26))
    d.ellipse((W - 260, H - 300 + (h % 40), W + 200, H + 140), fill=(255, 255, 255, 20))
    # phone outline
    px, py, pw, ph = W - 330, 120, 190, 380
    d.rounded_rectangle((px, py, px + pw, py + ph), 34, outline=(255, 255, 255, 120), width=5, fill=(255, 255, 255, 22))
    d.rounded_rectangle((px + pw // 2 - 28, py + 14, px + pw // 2 + 28, py + 22), 4, fill=(255, 255, 255, 140))
    # status-ring bubbles inside phone
    for i in range(3):
        cy = py + 70 + i * 100
        d.ellipse((px + 24, cy, px + 24 + 56, cy + 56), outline=(255, 255, 255, 200), width=5)
        d.rounded_rectangle((px + 94, cy + 8, px + pw - 22, cy + 22), 6, fill=(255, 255, 255, 150))
        d.rounded_rectangle((px + 94, cy + 32, px + pw - 52, cy + 44), 6, fill=(255, 255, 255, 90))
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB"))

def brand(d, y=H - 64, color=(255, 255, 255)):
    d.rounded_rectangle((60, y, 100, y + 40), 10, fill=color)
    d.text((72, y + 5), "S", font=font("b", 26), fill=(15, 23, 42))
    d.text((114, y + 6), "Status Connect", font=font("s", 26), fill=color)

def cover(meta, idx):
    pal = PALETTES[idx % len(PALETTES)]
    img = gradient(pal[0], pal[1])
    decor(img, pal, meta["slug"])
    d = ImageDraw.Draw(img)
    tag = (meta.get("tags", "Guide").split(",")[0]).strip().upper()
    tf = font("s", 22)
    tw = d.textlength(tag, font=tf)
    d.rounded_rectangle((60, 60, 60 + tw + 36, 108), 24, fill=(255, 255, 255))
    d.text((78, 69), tag, font=tf, fill=pal[0])
    title = meta["title"]
    size = 62
    while True:
        tfnt = font("b", size)
        lines = wrap(d, title, tfnt, 700)
        if len(lines) <= 5 or size <= 44:
            break
        size -= 4
    y = 150
    for ln in lines:
        d.text((60, y), ln, font=tfnt, fill=(255, 255, 255))
        y += int(size * 1.2)
    brand(d)
    img.save(os.path.join(OUT, meta["slug"] + ".jpg"), quality=86, optimize=True)

def key_points(meta, idx):
    pal = PALETTES[idx % len(PALETTES)]
    img = Image.new("RGB", (W, H), (248, 250, 252))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 120), fill=pal[0])
    d.text((60, 28), "KEY POINTS", font=font("s", 20), fill=pal[2])
    t = meta["title"]
    tsize = 34
    while d.textlength(t, font=font("b", tsize)) > W - 120 and tsize > 22:
        tsize -= 2
    d.text((60, 56), t, font=font("b", tsize), fill=(255, 255, 255))
    pts = [p.strip() for p in meta.get("takeaways", "").split("|") if p.strip()][:5]
    n = max(len(pts), 1)
    rowh = min(92, (H - 120 - 90) // n)
    y = 150
    for i, p in enumerate(pts, 1):
        d.ellipse((60, y, 60 + 56, y + 56), fill=pal[1])
        nf = font("b", 28)
        d.text((60 + 28 - d.textlength(str(i), font=nf) / 2, y + 10), str(i), font=nf, fill=(255, 255, 255))
        f = font("s", 27)
        lines = wrap(d, p, f, W - 220)[:2]
        ty = y + (4 if len(lines) == 2 else 12)
        for ln in lines:
            d.text((140, ty), ln, font=f, fill=(15, 23, 42))
            ty += 34
        y += rowh
    d.text((60, H - 48), "statusconnect.com.ng", font=font("r", 22), fill=(100, 116, 139))
    img.save(os.path.join(OUT, meta["slug"] + "-key-points.jpg"), quality=86, optimize=True)

if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(ROOT, "src", "content", "posts", "*.md")))
    for i, f in enumerate(files):
        m = parse(f)
        cover(m, i)
        key_points(m, i)
        print("ok", m["slug"])
