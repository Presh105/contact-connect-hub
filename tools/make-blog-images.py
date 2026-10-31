"""Generate topic-specific illustrations for every article (4 per article).

Run from the project root:  python3 tools/make-blog-images.py
Output in public/blog/: <slug>.jpg (cover), <slug>-2.jpg, <slug>-3.jpg (in-article, titled with a real
section heading) and <slug>-key-points.jpg. Also inserts the in-article image tags into the .md files
(idempotent). Needs Pillow and ideally the Inter font.
"""
import glob, os, re, hashlib
from PIL import Image, ImageDraw, ImageFont

W, H, S = 1200, 630, 2           # S = supersampling factor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "blog")
os.makedirs(OUT, exist_ok=True)

FONT_DIRS = ["/usr/share/fonts/opentype/inter/", "/usr/share/fonts/truetype/dejavu/"]
def font(weight, size):
    names = {"b": ["Inter-Bold.otf", "DejaVuSans-Bold.ttf"], "s": ["Inter-SemiBold.otf", "DejaVuSans-Bold.ttf"], "r": ["Inter-Regular.otf", "DejaVuSans.ttf"]}[weight]
    for d in FONT_DIRS:
        for n in names:
            if os.path.exists(d + n):
                return ImageFont.truetype(d + n, size * S)
    return ImageFont.load_default()

# (dark, mid, light)
PALETTES = [
    ((6, 78, 59), (16, 185, 129), (209, 250, 229)),
    ((30, 58, 138), (59, 130, 246), (219, 234, 254)),
    ((88, 28, 135), (168, 85, 247), (243, 232, 255)),
    ((154, 52, 18), (249, 115, 22), (255, 237, 213)),
    ((15, 23, 42), (51, 65, 85), (226, 232, 240)),
    ((131, 24, 67), (236, 72, 153), (252, 231, 243)),
    ((19, 78, 74), (20, 184, 166), (204, 251, 241)),
    ((120, 53, 15), (234, 179, 8), (254, 249, 195)),
    ((7, 89, 133), (14, 165, 233), (224, 242, 254)),
    ((127, 29, 29), (239, 68, 68), (254, 226, 226)),
]

MOTIFS = {
 "how-to-increase-whatsapp-status-views-in-nigeria": ("phone", "chart", "people"),
 "how-to-check-who-viewed-whatsapp-status": ("magnifier", "phone", "chart"),
 "best-time-to-post-whatsapp-status-nigeria": ("clock", "chart", "phone"),
 "whatsapp-status-content-ideas-for-vendors": ("camera", "checklist", "megaphone"),
 "product-photos-with-your-phone-for-whatsapp-status": ("camera", "phone", "checklist"),
 "whatsapp-business-app-setup-nigeria": ("store", "checklist", "chat"),
 "whatsapp-business-catalog-guide": ("store", "chat", "checklist"),
 "whatsapp-marketing-rules-what-is-allowed": ("shield", "megaphone", "warning"),
 "grow-small-business-whatsapp-network-nigeria": ("people", "chart", "phone"),
 "vcf-file-explained-import-contacts-android-iphone": ("file", "phone", "people"),
 "fix-vcf-import-not-working-android": ("file", "warning", "checklist"),
 "spot-whatsapp-scams-nigeria": ("warning", "shield", "chat"),
 "accept-payments-safely-whatsapp-sales-nigeria": ("coin", "shield", "checklist"),
 "how-to-price-products-on-whatsapp-nigeria": ("coin", "chart", "store"),
 "freelancers-find-clients-on-whatsapp-nigeria": ("people", "megaphone", "chat"),
 "two-step-verification-whatsapp-business-number": ("lock", "shield", "phone"),
 "nigeria-data-protection-act-whatsapp-contacts": ("shield", "file", "lock"),
 "how-to-make-money-on-whatsapp-in-nigeria": ("coin", "store", "chart"),
 "how-to-save-whatsapp-status-photos-and-videos": ("phone", "camera", "shield"),
 "whatsapp-business-vs-whatsapp-messenger": ("store", "chat", "phone"),
 "how-to-create-whatsapp-channel-nigeria": ("megaphone", "people", "chart"),
 "whatsapp-groups-vs-communities-which-to-use": ("people", "chat", "megaphone"),
 "start-small-business-nigeria-low-capital": ("store", "coin", "checklist"),
 "register-business-name-nigeria-cac-guide": ("file", "store", "checklist"),
 "write-a-simple-business-plan-nigeria": ("checklist", "chart", "coin"),
 "get-customers-without-ads-nigeria": ("megaphone", "people", "chart"),
 "recover-deleted-whatsapp-messages": ("chat", "file", "shield"),
 "move-whatsapp-chats-to-new-phone": ("phone", "file", "lock"),
 "whatsapp-web-and-linked-devices-safely": ("phone", "lock", "shield"),
 "whatsapp-click-to-chat-link-and-qr-code": ("qr", "chat", "phone"),
 "build-customer-trust-online-nigeria": ("shield", "people", "chat"),
 "whatsapp-vs-instagram-vs-tiktok-for-nigerian-sellers": ("phone", "camera", "chart"),
 "write-product-descriptions-that-sell": ("file", "camera", "checklist"),
}
DEFAULT_MOTIFS = ("phone", "chart", "people")

# ---------- motif drawers: draw centred at (cx, cy) with half-size r (in 1x px) ----------
def rr(d, box, rad, **kw):
    d.rounded_rectangle([v * S for v in box], rad * S, **kw)

def ell(d, box, **kw):
    d.ellipse([v * S for v in box], **kw)

def line(d, pts, w, fill):
    d.line([v * S for p in pts for v in p], fill=fill, width=int(w * S), joint="curve")

def poly(d, pts, **kw):
    d.polygon([(x * S, y * S) for x, y in pts], **kw)

def m_phone(d, cx, cy, r, fg, ac):
    w, h = r * 1.0, r * 1.9
    rr(d, (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), r * 0.18, outline=fg, width=int(r * 0.06 * S) or 3, fill=ac + (60,) if len(ac) == 3 else ac)
    for i in range(3):
        y = cy - h / 2 + r * 0.45 + i * r * 0.5
        ell(d, (cx - w / 2 + r * 0.12, y, cx - w / 2 + r * 0.12 + r * 0.3, y + r * 0.3), outline=fg, width=int(r * 0.05 * S) or 3)
        rr(d, (cx - w / 2 + r * 0.5, y + r * 0.04, cx + w / 2 - r * 0.12, y + r * 0.13), 4, fill=fg)
        rr(d, (cx - w / 2 + r * 0.5, y + r * 0.18, cx + w / 2 - r * 0.3, y + r * 0.25), 4, fill=fg + (150,) if len(fg) == 3 else fg)

def m_chat(d, cx, cy, r, fg, ac):
    rr(d, (cx - r, cy - r * 0.8, cx + r * 0.35, cy + r * 0.1), r * 0.2, fill=fg)
    poly(d, [(cx - r * 0.7, cy + r * 0.1), (cx - r * 0.9, cy + r * 0.45), (cx - r * 0.35, cy + r * 0.1)], fill=fg)
    rr(d, (cx - r * 0.2, cy - r * 0.1, cx + r, cy + r * 0.75), r * 0.2, fill=ac)
    poly(d, [(cx + r * 0.7, cy + r * 0.75), (cx + r * 0.9, cy + r * 1.05), (cx + r * 0.4, cy + r * 0.75)], fill=ac)
    for i, wdt in enumerate((0.9, 0.6)):
        rr(d, (cx - r * 0.85, cy - r * 0.6 + i * r * 0.28, cx - r * 0.85 + r * wdt * 0.9, cy - r * 0.5 + i * r * 0.28), 4, fill=ac)

def m_shield(d, cx, cy, r, fg, ac):
    pts = [(cx, cy - r), (cx + r * 0.85, cy - r * 0.6), (cx + r * 0.75, cy + r * 0.25), (cx, cy + r), (cx - r * 0.75, cy + r * 0.25), (cx - r * 0.85, cy - r * 0.6)]
    poly(d, pts, fill=fg)
    line(d, [(cx - r * 0.38, cy), (cx - r * 0.08, cy + r * 0.32), (cx + r * 0.45, cy - r * 0.3)], r * 0.14, ac)

def m_chart(d, cx, cy, r, fg, ac):
    base = cy + r * 0.85
    for i, hgt in enumerate((0.5, 0.9, 1.3, 1.8)):
        x = cx - r * 1.0 + i * r * 0.55
        rr(d, (x, base - r * hgt, x + r * 0.4, base), 6, fill=fg if i % 2 == 0 else ac)
    line(d, [(cx - r * 0.95, base - r * 0.6), (cx - r * 0.4, base - r * 1.1), (cx + r * 0.15, base - r * 0.9), (cx + r * 0.9, base - r * 1.75)], r * 0.06, fg)
    line(d, [(cx - r * 1.1, base + r * 0.08), (cx + r * 1.1, base + r * 0.08)], r * 0.05, fg)

def m_clock(d, cx, cy, r, fg, ac):
    ell(d, (cx - r, cy - r, cx + r, cy + r), outline=fg, width=int(r * 0.12 * S), fill=ac + (50,))
    for k in range(12):
        import math
        a = k * math.pi / 6
        line(d, [(cx + math.sin(a) * r * 0.82, cy - math.cos(a) * r * 0.82), (cx + math.sin(a) * r * 0.9, cy - math.cos(a) * r * 0.9)], r * 0.05, fg)
    line(d, [(cx, cy), (cx, cy - r * 0.6)], r * 0.09, fg)
    line(d, [(cx, cy), (cx + r * 0.42, cy + r * 0.2)], r * 0.09, fg)
    ell(d, (cx - r * 0.07, cy - r * 0.07, cx + r * 0.07, cy + r * 0.07), fill=fg)

def m_camera(d, cx, cy, r, fg, ac):
    rr(d, (cx - r, cy - r * 0.6, cx + r, cy + r * 0.7), r * 0.18, fill=fg)
    rr(d, (cx - r * 0.35, cy - r * 0.85, cx + r * 0.3, cy - r * 0.55), 8, fill=fg)
    ell(d, (cx - r * 0.5, cy - r * 0.38, cx + r * 0.5, cy + r * 0.62), fill=ac)
    ell(d, (cx - r * 0.32, cy - r * 0.2, cx + r * 0.32, cy + r * 0.44), fill=fg)
    ell(d, (cx - r * 0.12, cy - r * 0.02, cx + r * 0.12, cy + r * 0.22), fill=ac)
    ell(d, (cx + r * 0.65, cy - r * 0.45, cx + r * 0.82, cy - r * 0.28), fill=ac)

def m_people(d, cx, cy, r, fg, ac):
    pts = [(cx, cy - r * 0.2), (cx - r * 0.9, cy - r * 0.6), (cx + r * 0.9, cy - r * 0.6), (cx - r * 0.7, cy + r * 0.7), (cx + r * 0.7, cy + r * 0.7)]
    for a, b in ((0, 1), (0, 2), (0, 3), (0, 4), (1, 3), (2, 4), (1, 2)):
        line(d, [pts[a], pts[b]], r * 0.05, fg)
    for i, (x, y) in enumerate(pts):
        rad = r * (0.34 if i == 0 else 0.24)
        ell(d, (x - rad, y - rad, x + rad, y + rad), fill=ac if i == 0 else fg)
        ell(d, (x - rad * 0.4, y - rad * 0.6, x + rad * 0.4, y + rad * 0.1), fill=(255, 255, 255))
        rr(d, (x - rad * 0.7, y + rad * 0.2, x + rad * 0.7, y + rad * 0.75), rad * 0.3, fill=(255, 255, 255))

def m_coin(d, cx, cy, r, fg, ac):
    ell(d, (cx - r, cy - r, cx + r, cy + r), fill=fg)
    ell(d, (cx - r * 0.82, cy - r * 0.82, cx + r * 0.82, cy + r * 0.82), outline=ac, width=int(r * 0.07 * S))
    f = font("b", int(r * 1.15))
    d.text((cx * S, cy * S), "₦", font=f, fill=ac, anchor="mm")

def m_checklist(d, cx, cy, r, fg, ac):
    rr(d, (cx - r * 0.85, cy - r, cx + r * 0.85, cy + r), r * 0.14, fill=fg)
    for i in range(3):
        y = cy - r * 0.6 + i * r * 0.55
        rr(d, (cx - r * 0.62, y - r * 0.14, cx - r * 0.34, y + r * 0.14), 4, fill=ac)
        line(d, [(cx - r * 0.58, y), (cx - r * 0.5, y + r * 0.08), (cx - r * 0.38, y - r * 0.08)], r * 0.05, fg)
        rr(d, (cx - r * 0.2, y - r * 0.06, cx + r * (0.62 - 0.12 * i), y + r * 0.06), 4, fill=ac)

def m_magnifier(d, cx, cy, r, fg, ac):
    ell(d, (cx - r * 0.85, cy - r * 0.85, cx + r * 0.45, cy + r * 0.45), outline=fg, width=int(r * 0.16 * S), fill=ac + (70,))
    line(d, [(cx + r * 0.3, cy + r * 0.3), (cx + r * 0.95, cy + r * 0.95)], r * 0.2, fg)
    ell(d, (cx - r * 0.35, cy - r * 0.35, cx - r * 0.05, cy - r * 0.05), fill=ac)

def m_megaphone(d, cx, cy, r, fg, ac):
    poly(d, [(cx - r * 0.9, cy - r * 0.3), (cx - r * 0.2, cy - r * 0.3), (cx + r * 0.8, cy - r * 0.9), (cx + r * 0.8, cy + r * 0.9), (cx - r * 0.2, cy + r * 0.3), (cx - r * 0.9, cy + r * 0.3)], fill=fg)
    rr(d, (cx - r * 0.7, cy + r * 0.3, cx - r * 0.35, cy + r * 0.95), 6, fill=ac)
    for i, a in enumerate((-0.35, 0, 0.35)):
        line(d, [(cx + r * 1.0, cy + r * a * 1.3), (cx + r * 1.3, cy + r * a * 1.8)], r * 0.07, ac)

def m_qr(d, cx, cy, r, fg, ac):
    rr(d, (cx - r, cy - r, cx + r, cy + r), r * 0.1, fill=(255, 255, 255))
    def finder(x, y):
        rr(d, (x, y, x + r * 0.6, y + r * 0.6), 4, fill=fg)
        rr(d, (x + r * 0.1, y + r * 0.1, x + r * 0.5, y + r * 0.5), 3, fill=(255, 255, 255))
        rr(d, (x + r * 0.2, y + r * 0.2, x + r * 0.4, y + r * 0.4), 2, fill=fg)
    finder(cx - r * 0.85, cy - r * 0.85); finder(cx + r * 0.25, cy - r * 0.85); finder(cx - r * 0.85, cy + r * 0.25)
    import random
    rnd = random.Random(7)
    for i in range(6):
        for j in range(6):
            if rnd.random() > 0.45:
                x = cx + r * 0.25 + i * r * 0.1; y = cy + r * 0.25 + j * r * 0.1
                rr(d, (x, y, x + r * 0.08, y + r * 0.08), 1, fill=ac if (i + j) % 3 == 0 else fg)

def m_store(d, cx, cy, r, fg, ac):
    rr(d, (cx - r * 0.85, cy - r * 0.1, cx + r * 0.85, cy + r), 6, fill=fg)
    for i in range(6):
        x = cx - r * 0.95 + i * r * 0.32
        poly(d, [(x, cy - r * 0.1), (x + r * 0.32, cy - r * 0.1), (x + r * 0.28, cy - r * 0.7), (x + r * 0.04, cy - r * 0.7)], fill=ac if i % 2 == 0 else fg)
    poly(d, [(cx - r * 0.95, cy - r * 0.7), (cx + r * 0.95, cy - r * 0.7), (cx + r * 0.75, cy - r * 0.95), (cx - r * 0.75, cy - r * 0.95)], fill=ac)
    rr(d, (cx - r * 0.2, cy + r * 0.2, cx + r * 0.2, cy + r), 4, fill=ac)
    rr(d, (cx - r * 0.7, cy + r * 0.2, cx - r * 0.35, cy + r * 0.55), 4, fill=ac)
    rr(d, (cx + r * 0.35, cy + r * 0.2, cx + r * 0.7, cy + r * 0.55), 4, fill=ac)

def m_file(d, cx, cy, r, fg, ac):
    poly(d, [(cx - r * 0.7, cy - r), (cx + r * 0.3, cy - r), (cx + r * 0.7, cy - r * 0.55), (cx + r * 0.7, cy + r), (cx - r * 0.7, cy + r)], fill=fg)
    poly(d, [(cx + r * 0.3, cy - r), (cx + r * 0.3, cy - r * 0.55), (cx + r * 0.7, cy - r * 0.55)], fill=ac)
    d.text((cx * S, (cy + r * 0.1) * S), FILE_TEXT, font=font("b", int(r * 0.5)), fill=ac, anchor="mm")
    for i in range(2):
        rr(d, (cx - r * 0.45, cy + r * 0.5 + i * r * 0.22, cx + r * (0.45 - 0.25 * i), cy + r * 0.58 + i * r * 0.22), 3, fill=ac)

def m_warning(d, cx, cy, r, fg, ac):
    poly(d, [(cx, cy - r), (cx + r * 1.05, cy + r * 0.8), (cx - r * 1.05, cy + r * 0.8)], fill=fg)
    rr(d, (cx - r * 0.07, cy - r * 0.35, cx + r * 0.07, cy + r * 0.25), 4, fill=ac)
    ell(d, (cx - r * 0.09, cy + r * 0.37, cx + r * 0.09, cy + r * 0.55), fill=ac)

def m_lock(d, cx, cy, r, fg, ac):
    d.arc([(cx - r * 0.55) * S, (cy - r * 1.0) * S, (cx + r * 0.55) * S, (cy + r * 0.2) * S], 180, 360, fill=fg, width=int(r * 0.16 * S))
    line(d, [(cx - r * 0.55, cy - r * 0.4), (cx - r * 0.55, cy)], r * 0.16, fg)
    line(d, [(cx + r * 0.55, cy - r * 0.4), (cx + r * 0.55, cy)], r * 0.16, fg)
    rr(d, (cx - r * 0.85, cy - r * 0.1, cx + r * 0.85, cy + r * 0.95), r * 0.14, fill=fg)
    ell(d, (cx - r * 0.13, cy + r * 0.22, cx + r * 0.13, cy + r * 0.48), fill=ac)
    rr(d, (cx - r * 0.05, cy + r * 0.4, cx + r * 0.05, cy + r * 0.72), 3, fill=ac)

MOTIF_FN = {"phone": m_phone, "chat": m_chat, "shield": m_shield, "chart": m_chart, "clock": m_clock, "camera": m_camera,
            "people": m_people, "coin": m_coin, "checklist": m_checklist, "magnifier": m_magnifier, "megaphone": m_megaphone,
            "qr": m_qr, "store": m_store, "file": m_file, "warning": m_warning, "lock": m_lock}

FILE_TEXT = "DOC"

# ---------- helpers ----------
def parse(path):
    t = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", t, re.S)
    meta = {}
    for line_ in m.group(1).split("\n"):
        if ":" in line_:
            k, v = line_.split(":", 1)
            meta[k.strip()] = v.strip()
    meta["slug"] = os.path.basename(path)[:-3]
    meta["body"] = m.group(2)
    meta["h2"] = [l[3:].strip() for l in m.group(2).split("\n") if l.startswith("## ")]
    return meta

def bg(pal, variant, seed):
    small = Image.new("RGB", (60, 32))
    px = small.load()
    c1, c2 = pal[0], pal[1]
    for y in range(32):
        for x in range(60):
            if variant == 0: t = (x / 60 * 0.6 + y / 32 * 0.9) / 1.5
            elif variant == 1: t = x / 60
            else: t = y / 32
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    img = small.resize((W * S, H * S), Image.BICUBIC).convert("RGBA")
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    pat = h % 3
    if pat == 0:      # soft circles
        ell(d, (W - 420 + h % 70, -180, W + 180, 420), fill=(255, 255, 255, 24))
        ell(d, (-200, H - 260 - h % 50, 380, H + 220), fill=(255, 255, 255, 18))
    elif pat == 1:    # dot grid
        for gx in range(0, W, 46):
            for gy in range(0, H, 46):
                ell(d, (gx, gy, gx + 5, gy + 5), fill=(255, 255, 255, 38))
    else:             # diagonal stripes
        for k in range(-H, W, 90):
            line(d, [(k, H), (k + H, 0)], 26, (255, 255, 255, 16))
    return Image.alpha_composite(img, ov)

def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= maxw * S:
            cur = trial
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def brand(d, x, y, color=(255, 255, 255), dark=(15, 23, 42)):
    rr(d, (x, y, x + 38, y + 38), 10, fill=color)
    d.text(((x + 19) * S, (y + 19) * S), "S", font=font("b", 24), fill=dark, anchor="mm")
    d.text(((x + 52) * S, (y + 19) * S), "Status Connect", font=font("s", 25), fill=color, anchor="lm")

def fit_title(d, text, maxw, maxlines, start=64, minsize=38):
    size = start
    while True:
        f = font("b", size)
        lines = wrap(d, text, f, maxw)
        if len(lines) <= maxlines or size <= minsize:
            return f, lines[:maxlines + 1], size
        size -= 4

def disc(d, cx, cy, r, light):
    ell(d, (cx - r * 1.25, cy - r * 1.25, cx + r * 1.25, cy + r * 1.25), fill=light + (235,))

def make_image(meta, kind, idx, heading=None, motif=None, label=""):
    pal = PALETTES[idx % len(PALETTES)]
    dark, mid, light = pal
    variant = (idx + {"cover": 0, "a": 1, "b": 2}.get(kind, 0)) % 3
    img = bg(pal, variant, meta["slug"] + kind)
    d = ImageDraw.Draw(img, "RGBA")
    title = heading or meta["title"]
    fn = MOTIF_FN[motif]
    layout = (idx + {"cover": 0, "a": 1, "b": 2}.get(kind, 0)) % 3
    maxlines = 5 if kind == "cover" else 3
    start = 62 if kind == "cover" else 58
    if layout == 0:      # text left, motif right
        f, lines, size = fit_title(d, title, 680, maxlines, start)
        cx, cy, r = 940, 300, 150
        disc(d, cx, cy, r, light); fn(d, cx, cy, r, dark, mid)
        tx = 60
    elif layout == 1:    # motif left, text right
        f, lines, size = fit_title(d, title, 640, maxlines, start)
        cx, cy, r = 250, 300, 150
        disc(d, cx, cy, r, light); fn(d, cx, cy, r, dark, mid)
        tx = 500
    else:                # motif top-right corner, text bottom-left, big
        f, lines, size = fit_title(d, title, 760, maxlines, start - 4)
        cx, cy, r = 980, 190, 120
        disc(d, cx, cy, r, light); fn(d, cx, cy, r, dark, mid)
        tx = 60
    chip = (meta.get("tags", "Guide").split(",")[0]).strip().upper() if kind == "cover" else label.upper()
    cf = font("s", 21)
    cw = d.textlength(chip, font=cf) / S
    rr(d, (tx, 56, tx + cw + 36, 102), 23, fill=(255, 255, 255, 255))
    d.text(((tx + 18) * S, 79 * S), chip, font=cf, fill=dark, anchor="lm")
    lh = int(size * 1.18)
    total = lh * len(lines)
    y = max(140, 330 - total // 2) if layout != 2 else 150 + 40
    for ln in lines:
        d.text((tx * S, y * S), ln, font=f, fill=(255, 255, 255))
        y += lh
    brand(d, tx, H - 70)
    out = img.convert("RGB").resize((W, H), Image.LANCZOS)
    suffix = {"cover": "", "a": "-2", "b": "-3"}[kind]
    out.save(os.path.join(OUT, meta["slug"] + suffix + ".jpg"), quality=86, optimize=True)

def key_points(meta, idx):
    pal = PALETTES[idx % len(PALETTES)]
    dark, mid, light = pal
    img = Image.new("RGBA", (W * S, H * S), (248, 250, 252, 255))
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle((0, 0, W * S, 120 * S), fill=dark)
    d.text((60 * S, 30 * S), "KEY POINTS", font=font("s", 20), fill=light, anchor="lm")
    t = meta["title"]
    tsize = 34
    while d.textlength(t, font=font("b", tsize)) > (W - 120) * S and tsize > 22:
        tsize -= 2
    d.text((60 * S, 72 * S), t, font=font("b", tsize), fill=(255, 255, 255), anchor="lm")
    pts = [p.strip() for p in meta.get("takeaways", "").split("|") if p.strip()][:5]
    rowh = min(92, (H - 120 - 90) // max(len(pts), 1))
    y = 150
    for i, p in enumerate(pts, 1):
        ell(d, (60, y, 116, y + 56), fill=mid)
        d.text((88 * S, (y + 28) * S), str(i), font=font("b", 28), fill=(255, 255, 255), anchor="mm")
        f = font("s", 27)
        lines = wrap(d, p, f, W - 220)[:2]
        ty = y + (4 if len(lines) == 2 else 12)
        for ln in lines:
            d.text((140 * S, ty * S), ln, font=f, fill=(15, 23, 42))
            ty += 34
        y += rowh
    d.text((60 * S, (H - 36) * S), "statusconnect.com.ng", font=font("r", 22), fill=(100, 116, 139), anchor="lm")
    img.convert("RGB").resize((W, H), Image.LANCZOS).save(os.path.join(OUT, meta["slug"] + "-key-points.jpg"), quality=86, optimize=True)

def insert_images(path, meta):
    t = open(path, encoding="utf-8").read()
    slug = meta["slug"]
    if f"/blog/{slug}-2.jpg" in t:
        return
    blocks = t.split("\n\n")
    # find indexes of H2 blocks (not the FAQ)
    h2 = [i for i, b in enumerate(blocks) if b.startswith("## ") and "frequently asked" not in b.lower()]
    if len(h2) < 3:
        return
    a, b = h2[1], h2[min(len(h2) - 2, max(3, len(h2) * 2 // 3))]
    if b <= a:
        b = h2[-1]
    ha = blocks[h2[1]][3:].strip(); hb = blocks[b][3:].strip()
    img_a = f"![Illustration for the section: {ha}](/blog/{slug}-2.jpg)"
    img_b = f"![Illustration for the section: {hb}](/blog/{slug}-3.jpg)"
    # insert later one first so indexes stay valid; images go just before the heading
    blocks.insert(b, img_b)
    blocks.insert(a, img_a)
    open(path, "w", encoding="utf-8").write("\n\n".join(blocks))

if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(ROOT, "src", "content", "posts", "*.md")))
    for i, f in enumerate(files):
        meta = parse(f)
        FILE_TEXT = "VCF" if "vcf" in meta["slug"] else "DOC"
        m = MOTIFS.get(meta["slug"], DEFAULT_MOTIFS)
        h2 = [h for h in meta["h2"] if "frequently asked" not in h.lower()]
        ha = h2[1] if len(h2) > 1 else meta["title"]
        hb = h2[min(len(h2) - 2, max(3, len(h2) * 2 // 3))] if len(h2) > 3 else (h2[-1] if h2 else meta["title"])
        make_image(meta, "cover", i, motif=m[0])
        make_image(meta, "a", i, heading=ha, motif=m[1], label="Guide")
        make_image(meta, "b", i, heading=hb, motif=m[2], label="Guide")
        key_points(meta, i)
        insert_images(f, meta)
        print("ok", meta["slug"])
