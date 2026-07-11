#!/usr/bin/env python3
"""
修正底图标注:
1. 2x"Changbai Xincun" → "长白新村" (已处理，重新处理)
2. 1x"Changjiang Xincun" → "长白新村" (AI生成错误，长白街道没有长江新村)
3. 2x"Kongjiang Xincun" → "控江新村" (已有中文对应，保留英文)
4. "Yaaming Park" → "延吉公园" (实际英文标注错误)

坐标参考(图片2752×1536):
- Changbai Xincun 左上方: (320,255,428,288)
- Changbai Xincun 左中部: (335,450,442,482)
- Changjiang Xincun 左下部: (355,710,472,742)
- Kongjiang Xincun 右侧中: ~(1500,590,1630,622)
- Kongjiang Xincun 右侧下: ~(1500,980,1630,1012)
- Yaaming Park 右侧中: ~(1700,610,1840,640)
"""

from PIL import Image, ImageDraw, ImageFont
import os, json

INPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map.png"
OUTPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map_final.png"
OUTPUT_UPLOADS = "/opt/changbai-data/uploads/changbai_street_map_final.png"

img = Image.open(INPUT).copy()
print(f"图片尺寸: {img.size}")

draw = ImageDraw.Draw(img)

font_path = "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc"
font = ImageFont.truetype(font_path, 20)

def sample_bg(img, x1, y1, x2, y2, margin=4):
    pixels = []
    ww, hh = img.size
    for x in range(max(0, x1-margin), min(ww, x2+margin)):
        for y in [max(0, y1-margin), max(0, y1-1), min(hh-1, y2+1), min(hh-1, y2+margin)]:
            if 0 <= x < ww and 0 <= y < hh:
                pixels.append(img.getpixel((x, y)))
    if not pixels:
        return (10, 24, 45)
    r = sum(p[0] for p in pixels) // len(pixels)
    g = sum(p[1] for p in pixels) // len(pixels)
    b = sum(p[2] for p in pixels) // len(pixels)
    return (r, g, b)

def replace_text(region, text_cn):
    x1, y1, x2, y2 = region
    bg = sample_bg(img, x1, y1, x2, y2)
    draw.rectangle([x1, y1, x2, y2], fill=bg)
    
    bbox = draw.textbbox((0, 0), text_cn, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x1 + (x2 - x1 - tw) / 2 + 2
    ty = y1 + (y2 - y1 - th) / 2 - 1
    draw.text((tx, ty), text_cn, fill=(200, 230, 245), font=font)

# 1. Changbai Xincun → 长白新村
replace_text((320, 255, 428, 288), "长白新村")
replace_text((335, 450, 442, 482), "长白新村")
print("✅ 2处 Changbai Xincun → 长白新村")

# 2. Changjiang Xincun → 长白新村 (AI 生成错误，实际没有长江新村)
replace_text((355, 710, 472, 742), "长白新村")
print("✅ 1处 Changjiang Xincun → 长白新村 (修正AI错误标注)")

# 3. Kongjiang Xincun → 控江新村 (保留正确地名)
replace_text((1485, 585, 1630, 625), "控江新村")
replace_text((1490, 975, 1635, 1015), "控江新村")
print("✅ 2处 Kongjiang Xincun → 控江新村")

# 4. Yaaming Park → 延吉公园 (英文明显错误,应为 Yanji Park)
replace_text((1700, 610, 1850, 645), "延吉公园")
print("✅ 1处 Yaaming Park → 延吉公园")

# 保存
img.save(OUTPUT, "PNG", optimize=True)
img.save(OUTPUT_UPLOADS, "PNG", optimize=True)
print(f"\n最终输出: {OUTPUT}")
print(f"文件大小: {os.path.getsize(OUTPUT):,} bytes")

# 更新 JSON
for page in ['overview', 'emergency']:
    json_path = f"/opt/changbai-data/{page}.json"
    with open(json_path, 'r') as f:
        data = json.load(f)
    data['map_image'] = '/changbai/uploads/changbai_street_map_final.png'
    with open(json_path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📝 已更新 {page}.json")
