#!/bin/bash
# 长白综治中心 Dashboard 部署脚本
set -e

WORKSPACE="/root/.openclaw/workspace/changbai-dashboard"
DEPLOY_DIR="/opt/changbai-dashboard"
DATA_DIR="/opt/changbai-data"
SERVICE_NAME="changbai-dashboard"
PORT=3100
NGINX_CONF="/etc/nginx/conf.d/changbai-dashboard.conf"

echo "🚀 长白综治中心 Dashboard 部署开始..."

# 1. 安装依赖
cd "$WORKSPACE"
echo "📦 安装依赖..."
npm install --production 2>&1 | tail -1

# 2. 创建部署目录
mkdir -p "$DEPLOY_DIR" "$DATA_DIR" "$DATA_DIR/uploads"
echo "📁 目录就绪"

# 3. 同步代码
echo "📋 同步代码..."
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'data' \
    "$WORKSPACE/" "$DEPLOY_DIR/"

# 4. 初始化数据文件（不覆盖已有数据）
for page in overview security governance cockpit emergency data-fusion; do
    if [ ! -f "$DATA_DIR/$page.json" ]; then
        if [ -f "$WORKSPACE/data/$page.json" ]; then
            cp "$WORKSPACE/data/$page.json" "$DATA_DIR/$page.json"
            echo "  ✅ 初始化 $page.json"
        fi
    fi
done

# 5. 创建 systemd 服务
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=长白综治中心 Dashboard API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$DEPLOY_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATA_DIR=$DATA_DIR
ExecStart=/root/.nvm/versions/node/v22.22.0/bin/node server/app.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 6. 在现有 Nginx 配置中插入 changbai location
NGINX_MAIN="/etc/nginx/conf.d/00-podcast-3.conf"
if ! grep -q "location /changbai/" "$NGINX_MAIN" 2>/dev/null; then
    # 在 "location / {" 之前插入 changbai location 块
    CHANGBAI_BLOCK='# 长白综治中心 - 上传文件
    location /changbai/uploads/ {
        alias /opt/changbai-data/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 长白综治中心 - API 代理
    location /changbai/api/ {
        proxy_pass http://127.0.0.1:3100/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 100m;
    }

    # 长白综治中心 - Admin 管理后台
    location /changbai/admin/ {
        alias /opt/changbai-dashboard/admin/;
        try_files $uri $uri/ /changbai/admin/index.html;
    }

    # 长白综治中心 - 大屏展示页
    location /changbai/ {
        alias /opt/changbai-dashboard/public/;
        try_files $uri $uri/ /changbai/index.html;
    }'
    sed -i '/^[[:space:]]*location \/ {$/i\'

# 7. 重启服务
echo "🔄 重启服务..."
systemctl daemon-reload
systemctl restart "$SERVICE_NAME"
systemctl enable "$SERVICE_NAME"

# 8. 重载 Nginx
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "✅ Nginx 重载成功"
else
    echo "⚠️  Nginx 配置有误，请检查"
fi

# 9. 验证
sleep 2
echo ""
echo "🔍 验证部署..."
SERVICE_STATUS=$(systemctl is-active "$SERVICE_NAME")
echo "  服务状态: $SERVICE_STATUS"

API_RESP=$(curl -s http://127.0.0.1:$PORT/api/dashboard/overview | head -c 100)
if [ -n "$API_RESP" ]; then
    echo "  API 测试: ✅ 正常响应"
else
    echo "  API 测试: ❌ 无响应"
fi

echo ""
echo "🎉 部署完成！"
echo "  大屏地址: http://服务器IP/changbai/"
echo "  管理后台: http://服务器IP/changbai/admin/"
echo "  API端点:  http://127.0.0.1:3100/api/"
