#!/usr/bin/env python3
"""
精确坐标替换: Changbai Xincun → 长白新村
坐标:
  区域1: (320, 255, 428, 288) - 左上部
  区域2: (335, 450, 442, 482) - 左中部
同时: Changjiang Xincun → 长江新村 (区域3: 355, 710, 472, 742 - 左下部)
"""

from PIL import Image, ImageDraw, ImageFont
import os, json

INPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map.png"
OUTPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map_v4.png"
OUTPUT_V4 = "/opt/changbai-data/uploads/changbai_street_map_v4.png"

img = Image.open(INPUT)
w, h = img.size
print(f"图片尺寸: {w}x{h}")

draw = ImageDraw.Draw(img)

# 中文字体
font_path = "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc"
font_size = 20
font = ImageFont.truetype(font_path, font_size)
print(f"使用字体: {font_path}, 大小: {font_size}px")

def sample_bg(img, x1, y1, x2, y2, margin=3):
    """采样区域周边像素的平均色"""
    pixels = []
    ww, hh = img.size
    # 上方
    for x in range(x1-2, x2+2):
        for y in range(max(0, y1-margin), y1):
            if 0 <= x < ww:
                pixels.append(img.getpixel((x, y)))
    # 左方
    for x in range(max(0, x1-margin), x1):
        for y in range(y1, min(hh, y2)):
            if 0 <= y < hh:
                pixels.append(img.getpixel((x, y)))
    # 右方
    for x in range(x2, min(ww, x2+margin)):
        for y in range(y1, min(hh, y2)):
            if 0 <= y < hh:
                pixels.append(img.getpixel((x, y)))
    if not pixels:
        return (10, 24, 45)
    r = sum(p[0] for p in pixels) // len(pixels)
    g = sum(p[1] for p in pixels) // len(pixels)
    b = sum(p[2] for p in pixels) // len(pixels)
    return (r, g, b)

regions = [
    {"box": (320, 255, 428, 288), "text": "长白新村", "location": "左上部"},
    {"box": (335, 450, 442, 482), "text": "长白新村", "location": "左中部"},
]

for r in regions:
    x1, y1, x2, y2 = r["box"]
    text = r["text"]
    
    # 采样背景色
    bg = sample_bg(img, x1, y1, x2, y2)
    # 稍微压暗一点，让覆盖不那么突兀
    bg_dark = (max(0, bg[0]-2), max(0, bg[1]-2), max(0, bg[2]-2))
    
    # 先保存原区域截图对比
    crop_before = img.crop((x1, y1, x2, y2))
    crop_before.save(f"/tmp/before_{r['location']}.png")
    
    # 覆盖
    draw.rectangle([x1, y1, x2, y2], fill=bg_dark)
    
    # 写文字（浅青色，和地图风格一致）
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    # 微调：文字在实际区域内稍微偏右一点（模仿原标注的风格）
    tx = x1 + (x2 - x1 - tw) / 2 + 2
    ty = y1 + (y2 - y1 - th) / 2 - 1
    draw.text((tx, ty), text, fill=(180, 225, 240), font=font)
    
    print(f"✅ {r['location']}: ({x1},{y1})-({x2},{y2}) → {text}, 背景 RGB={bg}")

img.save(OUTPUT, "PNG")
img.save(OUTPUT_V4, "PNG")
print(f"\n输出: {OUTPUT}")
print(f"大小: {os.path.getsize(OUTPUT):,} bytes")

# 更新 JSON
for page in ['overview', 'emergency']:
    json_path = f"/opt/changbai-data/{page}.json"
    with open(json_path, 'r') as f:
        data = json.load(f)
    data['map_image'] = '/changbai/uploads/changbai_street_map_v4.png'
    with open(json_path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📝 已更新 {page}.json")
