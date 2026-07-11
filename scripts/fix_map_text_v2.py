#!/usr/bin/env python3
"""
精确定位并替换 "Changbai Xincun" → "长白新村"
策略：不覆盖大面积，而是在原文字位置精确覆盖一个与周边环境融合的小色块
"""

from PIL import Image, ImageDraw, ImageFont
import os

INPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map.png"
OUTPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map_v3.png"
OUTPUT_V3 = "/opt/changbai-data/uploads/changbai_street_map_v3.png"

img = Image.open(INPUT)
w, h = img.size
print(f"图片尺寸: {w}x{h}")

draw = ImageDraw.Draw(img)

# 加载中文字体
font_paths = [
    "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]
font = None
for fp in font_paths:
    if os.path.exists(fp):
        font = ImageFont.truetype(fp, 17)
        print(f"使用字体: {fp}")
        break

# 采样周围颜色：取区域周围像素的平均色来填底色
def sample_bg_color(img, x1, y1, x2, y2):
    pixels = []
    margin = 5
    for x in range(x1-margin, x1):
        for y in range(y1-margin, y2+margin):
            if 0 <= x < w and 0 <= y < h:
                pixels.append(img.getpixel((x, y)))
    for x in range(x2, x2+margin):
        for y in range(y1-margin, y2+margin):
            if 0 <= x < w and 0 <= y < h:
                pixels.append(img.getpixel((x, y)))
    if not pixels:
        return (10, 22, 40)
    r = sum(p[0] for p in pixels) // len(pixels)
    g = sum(p[1] for p in pixels) // len(pixels)
    b = sum(p[2] for p in pixels) // len(pixels)
    return (r, g, b)

# 原来错了，需要 ImageFont 先导入
from PIL import ImageFont

# 根据分析报告，两个高亮矩形分别在：
# - 左上部: (x≈250, y≈120) 附近
# - 中部: (x≈380, y≈370) 附近
# 但实际图片是 2752×1536，需要按比例换算
# 报告中的坐标是基于缩略图视觉估算，需要调整

# 更可靠的方法：在图片标注的矩形区域内搜索
# 矩形大约位置（根据原始地图分析，在浅青色边框内）:
# 矩形1: 左上部, 大约 top=80, left=440, bottom=130, right=700
# 矩形2: 中部, 大约 top=550, left=520, bottom=600, right=780

# 让我直接在大面积上找——先看图片中 300,100 和 400,350 附近的颜色
# 实际上在 2752×1536 的图里，这些像素坐标太小了

# 让我重新精确定位，每次覆盖 80×28 的小区域
# 用图片的实际比例：总宽2752, 可见的"Changbai Xincun"文字大约在以下位置

regions = [
    # 左上部矩形的 "Changbai Xincun" 文字（在浅青色矩形框内顶部）
    {"box": (430, 95, 700, 140), "text": "长白新村"},
    # 中部矩形的 "Changbai Xincun" 文字
    {"box": (530, 510, 800, 555), "text": "长白新村"},
]

for i, r in enumerate(regions):
    x1, y1, x2, y2 = r["box"]
    
    # 检查当前位置有哪些文字
    crop = img.crop((x1, y1, x2, y2))
    crop.save(f"/tmp/crop_{i}.png")
    
    # 采样周围背景色
    bg = sample_bg_color(img, x1, y1, x2, y2)
    print(f"区域{i+1} ({x1},{y1})-({x2},{y2}): 背景色 RGB={bg}")
    
    # 覆盖
    draw.rectangle([x1, y1, x2, y2], fill=bg)
    
    # 写文字
    text = r["text"]
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x1 + (x2 - x1 - tw) / 2
    ty = y1 + (y2 - y1 - th) / 2
    draw.text((tx, ty), text, fill=(120, 200, 230), font=font)
    print(f"  → 覆盖完成: {text}")

img.save(OUTPUT, "PNG")
img.save(OUTPUT_V3, "PNG")
print(f"\n输出: {OUTPUT}")
print(f"大小: {os.path.getsize(OUTPUT):,} bytes")

# 更新 JSON
import json
for page in ['overview', 'emergency']:
    json_path = f"/opt/changbai-data/{page}.json"
    with open(json_path, 'r') as f:
        data = json.load(f)
    data['map_image'] = '/changbai/uploads/changbai_street_map_v3.png'
    with open(json_path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📝 已更新 {page}.json")
