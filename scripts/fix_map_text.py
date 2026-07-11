#!/usr/bin/env python3
"""
处理长白街道底图：把 "Changbai Xincun" 英文标注改为 "长白新村"
由于 PNG 是位图，无法直接编辑文字。采用方案：
在英文标注位置覆盖绘图中文字，使用与底图相近的深蓝底色 + 白字
"""

from PIL import Image, ImageDraw, ImageFont
import os

INPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map.png"
OUTPUT = "/root/.openclaw/workspace/changbai-dashboard/public/changbai_street_map_v2.png"
OUTPUT_V2 = "/opt/changbai-data/uploads/changbai_street_map_v2.png"

img = Image.open(INPUT)
print(f"图片尺寸: {img.size}, 模式: {img.mode}")

# 根据图片分析，"Changbai Xincun" 有两处：
# 处1: 左上部高亮矩形区域，大约在 (x≈250, y≈120) 位置
# 处2: 中部高亮矩形区域，大约在 (x≈380, y≈370) 位置
# 标注文字覆盖区域大约 200×30 像素

draw = ImageDraw.Draw(img)

# 覆盖区域配置： (x1, y1, x2, y2) 和对应文字
regions = [
    # 左上部 Changbai Xincun
    {
        "box": (180, 95, 400, 135),
        "text": "长白新村",
        "font_size": 18,
    },
    # 中部 Changbai Xincun
    {
        "box": (300, 340, 520, 380),
        "text": "长白新村",
        "font_size": 18,
    },
]

# 尝试加载中文字体
font_paths = [
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
]

font = None
for fp in font_paths:
    if os.path.exists(fp):
        font = ImageFont.truetype(fp, 18)
        print(f"使用字体: {fp}")
        break

if font is None:
    font = ImageFont.load_default()
    print("⚠️ 未找到中文字体，使用默认字体")

# 处理每个区域
for r in regions:
    x1, y1, x2, y2 = r["box"]
    # 1. 先用深色矩形覆盖原文字
    draw.rectangle([x1, y1, x2, y2], fill=(7, 18, 33))  # 近似 bg-dark 颜色
    # 2. 画中文文字
    text = r["text"]
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x1 + (x2 - x1 - tw) / 2
    ty = y1 + (y2 - y1 - th) / 2
    draw.text((tx, ty), text, fill=(122, 200, 230), font=font)  # 浅青色
    print(f"✅ 覆盖区域 ({x1},{y1})-({x2},{y2}) → {text}")

img.save(OUTPUT, "PNG")
img.save(OUTPUT_V2, "PNG")

print(f"\n输出文件:")
print(f"  {OUTPUT}")
print(f"  {OUTPUT_V2}")
print(f"文件大小: {os.path.getsize(OUTPUT):,} bytes")

# 同时更新 JSON 数据指向新底图
import json
for page in ['overview', 'emergency']:
    json_path = f"/opt/changbai-data/{page}.json"
    with open(json_path, 'r') as f:
        data = json.load(f)
    data['map_image'] = '/changbai/uploads/changbai_street_map_v2.png'
    with open(json_path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📝 已更新 {page}.json → map_image 指向本地文件")
