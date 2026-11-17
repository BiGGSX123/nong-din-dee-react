"""Generate one image with Gemini, optionally cut the white background out.

usage: GEMINI_API_KEY=... python3 -I gen.py --prompt-file p.txt --out out.png
         [--ref a.png ...] [--aspect 1:1|9:16] [--model gemini-3.1-flash-image] [--cutout]
"""
import argparse, base64, json, os, sys, urllib.request, io
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('--prompt-file', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--ref', action='append', default=[])
ap.add_argument('--aspect', default='1:1')
# cheaper "Nano Banana 2" model by default; pass --model gemini-3-pro-image
# for the pricier Pro model (what the shipped soil islands + mascot used)
ap.add_argument('--model', default='gemini-3.1-flash-image')
ap.add_argument('--cutout', action='store_true')
a = ap.parse_args()

key = os.environ['GEMINI_API_KEY']
prompt = open(a.prompt_file, encoding='utf-8').read()
parts = []
for r in a.ref:
    mime = 'image/webp' if r.endswith('.webp') else 'image/png'
    parts.append({'inline_data': {'mime_type': mime, 'data': base64.b64encode(open(r, 'rb').read()).decode()}})
parts.append({'text': prompt})
body = {
    'contents': [{'parts': parts}],
    'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': a.aspect}},
}
req = urllib.request.Request(
    f'https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent',
    data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
try:
    resp = json.load(urllib.request.urlopen(req, timeout=180))
except urllib.error.HTTPError as e:
    sys.exit(f'HTTP {e.code}: {e.read().decode()[:500]}')

img_bytes = None
for c in resp.get('candidates', []):
    for p in c.get('content', {}).get('parts', []):
        d = p.get('inlineData') or p.get('inline_data')
        if d:
            img_bytes = base64.b64decode(d['data'])
if not img_bytes:
    sys.exit('no image in response: ' + json.dumps(resp)[:500])

img = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
img.save(a.out.replace('.png', '.raw.png'))

if a.cutout:
    arr = np.array(img).astype(np.int16)
    rgb = arr[..., :3]
    # near-white = background candidate; only regions touching the border are removed,
    # so white salt crystals / highlights inside the subject survive
    near_white = (rgb.min(axis=2) > 232) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 18)
    labels, _ = ndimage.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    a_img = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    img.putalpha(a_img)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        # re-pad to square with ~8% margin
        w, h = img.size
        s = int(max(w, h) * 1.16)
        canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        canvas.paste(img, ((s - w) // 2, (s - h) // 2))
        img = canvas

img.save(a.out)
print('saved', a.out, img.size)
