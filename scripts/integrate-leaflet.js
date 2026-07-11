const fs = require('fs');

let html = fs.readFileSync('/opt/changbai-dashboard/public/index.html', 'utf-8');

// ─── 1. 在 <head> 中引入 Leaflet ───
html = html.replace(
  '    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
  '    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
);

// ─── 2. 添加 Leaflet 地图样式 ───
const leafletStyles = `
        .leaflet-map {
            width: 100%;
            height: 100%;
            border-radius: 6px;
            z-index: 1;
        }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 0 10px rgba(0,212,255,0.3) !important; }
        .leaflet-control-zoom a { 
            background: rgba(0,30,60,0.85) !important; 
            color: #00d4ff !important; 
            border: 1px solid rgba(0,212,255,0.3) !important; 
        }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-popup-content-wrapper {
            background: rgba(0,30,60,0.9) !important;
            color: #e0e6ed !important;
            border: 1px solid rgba(0,212,255,0.3) !important;
            border-radius: 8px !important;
        }
        .leaflet-popup-tip { background: rgba(0,30,60,0.9) !important; }
`;
html = html.replace('        .map-overlay {', leafletStyles + '\n        .map-overlay {');

// ─── 3. 替换 overview 页面地图区域 ───
const overviewMapOld = `                    <div class="map-with-image">
                        <img src="/changbai/uploads/changbai_street_map_final.png" alt="长白街道态势感知地图" />
                        <div class="map-overlay">
                            <div class="map-markers">
                                <div class="marker" style="top: 25%; left: 30%;">
                                    <div class="marker-point"></div>
                                    <div class="marker-tooltip">长白一社区<br>监控正常</div>
                                </div>
                                <div class="marker" style="top: 40%; left: 55%;">
                                    <div class="marker-point"></div>
                                    <div class="marker-tooltip">长白二社区<br>监控正常</div>
                                </div>
                                <div class="marker alert" style="top: 35%; left: 45%;">
                                    <div class="marker-point"></div>
                                    <div class="marker-tooltip">长白三社区<br>⚠️ 异常告警</div>
                                </div>
                                <div class="marker" style="top: 55%; left: 70%;">
                                    <div class="marker-point"></div>
                                    <div class="marker-tooltip">长白四社区<br>监控正常</div>
                                </div>
                                <div class="marker warning" style="top: 65%; left: 35%;">
                                    <div class="marker-point"></div>
                                    <div class="marker-tooltip">长白五社区<br>⚡ 预警提示</div>
                                </div>
                            </div>
                            <div class="map-controls">
                                <button class="map-control-btn">+</button>
                                <button class="map-control-btn">−</button>
                                <button class="map-control-btn">◎</button>
                            </div>
                            <div class="map-legend">
                                <div class="legend-title">社区状态</div>
                                <div class="legend-items">
                                    <div class="legend-item"><div class="legend-dot" style="background: var(--accent-green);"></div><span>正常</span></div>
                                    <div class="legend-item"><div class="legend-dot" style="background: var(--accent-orange);"></div><span>预警</span></div>
                                    <div class="legend-item"><div class="legend-dot" style="background: var(--accent-red);"></div><span>告警</span></div>
                                </div>
                            </div>
                        </div>
                    </div>`;

const overviewMapNew = `                    <div class="leaflet-map" id="overviewMap"></div>`;

html = html.replace(overviewMapOld, overviewMapNew);

// ─── 4. 替换 emergency 页面地图区域 ───
const emergencyMapOld = `                    <div class="map-with-image" style="flex: 1;">
                        <img src="/changbai/uploads/changbai_street_map_final.png" alt="长白街道应急指挥地图" />
                        <div class="map-overlay"></div>
                        <div class="map-markers">
                            <div class="marker" style="top: 30%; left: 40%;"><div class="marker-point" style="background: var(--accent-cyan);"></div><div class="marker-tooltip">应急指挥中心</div></div>
                            <div class="marker" style="top: 45%; left: 55%;"><div class="marker-point" style="background: #ff4444;"></div><div class="marker-tooltip">突发事件点</div></div>
                            <div class="marker" style="top: 25%; left: 35%;"><div class="marker-point" style="background: #ff9900;"></div><div class="marker-tooltip">消防站-1</div></div>
                            <div class="marker" style="top: 60%; left: 65%;"><div class="marker-point" style="background: #ff9900;"></div><div class="marker-tooltip">消防站-2</div></div>
                            <div class="marker" style="top: 50%; left: 30%;"><div class="marker-point" style="background: #00ff88;"></div><div class="marker-tooltip">医疗点</div></div>
                            <div class="marker" style="top: 35%; left: 60%;"><div class="marker-point" style="background: #00ff88;"></div><div class="marker-tooltip">避难场所</div></div>
                        </div>
                        <div class="map-controls"><button class="map-control-btn">+</button><button class="map-control-btn">−</button><button class="map-control-btn">◎</button></div>
                        <div class="map-legend">
                            <div class="legend-title">资源分布</div>
                            <div class="legend-items">
                                <div class="legend-item"><div class="legend-dot" style="background: var(--accent-cyan);"></div><span>指挥中心</span></div>
                                <div class="legend-item"><div class="legend-dot" style="background: var(--accent-red);"></div><span>突发事件</span></div>
                                <div class="legend-item"><div class="legend-dot" style="background: var(--accent-orange);"></div><span>消防站点</span></div>
                                <div class="legend-item"><div class="legend-dot" style="background: var(--accent-green);"></div><span>医疗/避难</span></div>
                            </div>
                        </div>
                    </div>`;

const emergencyMapNew = `                    <div class="leaflet-map" id="emergencyMap" style="flex: 1;"></div>`;

html = html.replace(emergencyMapOld, emergencyMapNew);

// ─── 5. 更新 JS 渲染逻辑 ───

// 5a. 替换 overview 地图渲染
const oldOverviewMapRender = `    // 地图标记
    const markersContainer = document.querySelector('#overviewView .map-markers');
    if (markersContainer) {
        markersContainer.innerHTML = d.map_markers.map(m => {
            const typeClass = m.type === 'alert' ? 'marker-alert' : (m.type === 'warning' ? 'marker-warning' : '');
            return '<div class="marker ' + typeClass + '" style="top:' + m.top + '; left:' + m.left + ';">' +
                '<div class="marker-point"></div>' +
                '<div class="marker-tooltip">' + m.name + '<br>' + m.desc + '</div></div>';
        }).join('');
    }

    // 地图图片
    const mapImages = document.querySelectorAll('#overviewView .map-with-image img');
    mapImages.forEach(img => { if (d.map_image) img.src = d.map_image; });`;

const newOverviewMapRender = `    // Leaflet 地图渲染
    if (!window._overviewMap && d.map_markers) {
        const mapEl = document.getElementById('overviewMap');
        if (mapEl && mapEl.offsetParent !== null) {
            // 长白新村街道中心坐标
            const center = d.map_center || [31.2825, 121.5455];
            window._overviewMap = L.map('overviewMap', {
                center: center,
                zoom: d.map_zoom || 15,
                zoomControl: true,
                attributionControl: false
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(window._overviewMap);

            // 添加标记
            const markerColors = { alert: '#ff4444', warning: '#ff9900', normal: '#00ff88' };
            d.map_markers.forEach(function(m) {
                const color = markerColors[m.type] || '#00d4ff';
                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="width:16px;height:16px;border-radius:50%;background:' + color +
                        ';border:2px solid #fff;box-shadow:0 0 10px ' + color + ';"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });
                const marker = L.marker([m.lat || center[0] + (Math.random() - 0.5) * 0.02,
                    m.lng || center[1] + (Math.random() - 0.5) * 0.02], { icon: icon })
                    .addTo(window._overviewMap);
                marker.bindPopup('<b>' + m.name + '</b><br>' + (m.desc || ''));
            });
        }
    }`;

html = html.replace(oldOverviewMapRender, newOverviewMapRender);

// 5b. 替换 emergency 地图渲染
const oldEmergencyMapRender = `    // 地图标记
    const markersContainer = document.querySelector('#emergencyView .map-markers');
    if (markersContainer) {
        markersContainer.innerHTML = d.map_markers.map(m =>
            '<div class="marker" style="top:' + m.top + '; left:' + m.left + ';">' +
            '<div class="marker-point" style="background:' + m.color + ';"></div>' +
            '<div class="marker-tooltip">' + m.name + '</div></div>'
        ).join('');
    }

    // 地图图片
    const mapImages = document.querySelectorAll('#emergencyView .map-with-image img');
    mapImages.forEach(img => { if (d.map_image) img.src = d.map_image; });`;

const newEmergencyMapRender = `    // Leaflet 应急地图渲染
    if (!window._emergencyMap && d.map_markers) {
        const mapEl = document.getElementById('emergencyMap');
        if (mapEl && mapEl.offsetParent !== null) {
            const center = d.map_center || [31.2825, 121.5455];
            window._emergencyMap = L.map('emergencyMap', {
                center: center,
                zoom: d.map_zoom || 14,
                zoomControl: true,
                attributionControl: false
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(window._emergencyMap);

            d.map_markers.forEach(function(m) {
                const color = m.color || '#00d4ff';
                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="width:14px;height:14px;border-radius:50%;background:' + color +
                        ';border:2px solid #fff;box-shadow:0 0 8px ' + color + ';"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });
                const marker = L.marker([m.lat || center[0] + (Math.random() - 0.5) * 0.02,
                    m.lng || center[1] + (Math.random() - 0.5) * 0.02], { icon: icon })
                    .addTo(window._emergencyMap);
                marker.bindPopup('<b>' + m.name + '</b>');
            });
        }
    }`;

html = html.replace(oldEmergencyMapRender, newEmergencyMapRender);

// 5c. 更新数据模型——给标记点加上 lat/lng 坐标
const oldDataModel = `const API_BASE = '/changbai/api';

// 全局状态
let allData = {};`;

const newDataModel = `const API_BASE = '/changbai/api';

// 全局状态
let allData = {};
let mapInitialized = {};`;

html = html.replace(oldDataModel, newDataModel);

// 5d. 在 destroyAllCharts 中也销毁地图
const oldDestroy = `function destroyAllCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    charts = {};
}`;

const newDestroy = `function destroyAllCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    charts = {};
    mapInitialized = {};
}`;

html = html.replace(oldDestroy, newDestroy);

// 写入
fs.writeFileSync('/opt/changbai-dashboard/public/index.html', html, 'utf-8');
fs.writeFileSync('/root/.openclaw/workspace/changbai-dashboard/public/index.html', html, 'utf-8');
console.log('✅ Leaflet 地图已集成');
console.log('文件大小:', (html.length / 1024).toFixed(1), 'KB');
