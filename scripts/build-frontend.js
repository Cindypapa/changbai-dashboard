const fs = require('fs');

// 读取备份的 HTML
let html = fs.readFileSync('/root/.openclaw/workspace/changbai-backup/index_latest.html', 'utf-8');

// ─── 1. 替换 script 部分为动态 API 版本 ───

// 找到 <script> 标签开始位置（第一个不含src的 script）
const scriptStartIdx = html.indexOf('<script>\n        function updateTime');

// 找到 MiniMax footer 前的 </script> 结束位置
const footerStartIdx = html.indexOf('<style>\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;');

if (scriptStartIdx === -1 || footerStartIdx === -1) {
  console.error('未找到脚本或样式标记');
  process.exit(1);
}

// 提取头部（HTML + CSS + 一直到 script 标签前）
const headPart = html.substring(0, scriptStartIdx);

// 提取 MiniMax footer（从 <style> 开始到最后）
const footerPart = html.substring(footerStartIdx);

// ─── 2. 重新设计：用一个 JS 框架来动态渲染所有页面 ───

const dashboardScript = `<script>
// ============================================================
// 长白街道综治中心指挥平台 - 动态数据渲染引擎
// 数据通过 API 动态加载，支持后台管理配置
// ============================================================

const API_BASE = '/changbai/api';

// 全局状态
let allData = {};         // 所有页面数据缓存
let charts = {};          // Chart.js 实例
let currentPage = 'overview';

// ─── 工具函数 ───
function $(id) { return document.getElementById(id); }

// ─── 时间更新 ───
function updateTime() {
    const now = new Date();
    const timeEl = $('currentTime');
    const dateEl = $('currentDate');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}
updateTime();
setInterval(updateTime, 1000);

// ─── 加载所有数据 ───
async function loadAllData() {
    try {
        const resp = await fetch(API_BASE + '/dashboard/all');
        const json = await resp.json();
        if (json.success) {
            allData = json.data;
            renderCurrentPage();
        }
    } catch (err) {
        console.error('数据加载失败:', err);
    }
}

// ─── 导航按钮 ───
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        const targetView = $(viewId + 'View');
        if (targetView) targetView.classList.add('active');
        currentPage = viewId;
        destroyAllCharts();
        renderCurrentPage();
    });
});

// ─── 渲染当前页面 ───
function renderCurrentPage() {
    if (!allData[currentPage]) return;
    const d = allData[currentPage];

    switch (currentPage) {
        case 'overview': renderOverview(d); break;
        case 'security': renderSecurity(d); break;
        case 'governance': renderGovernance(d); break;
        case 'cockpit': renderCockpit(d); break;
        case 'emergency': renderEmergency(d); break;
        case 'data-fusion': renderDataFusion(d); break;
    }
}

// ─── 销毁所有 Chart.js 实例 ───
function destroyAllCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    charts = {};
}

// ─── 通用图表创建 ───
function createChart(canvasId, config) {
    const ctx = $(canvasId);
    if (!ctx) return null;
    const chart = new Chart(ctx, config);
    charts[canvasId] = chart;
    return chart;
}

// ============================================================
// 页面渲染函数
// ============================================================

// ─── 综合态势 ───
function renderOverview(d) {
    // 统计卡片
    const statGrids = document.querySelectorAll('#overviewView .stat-grid .stat-item');
    d.stats.forEach((stat, i) => {
        if (statGrids[i]) {
            statGrids[i].querySelector('.stat-icon').textContent = stat.icon;
            const valEl = statGrids[i].querySelector('.stat-value');
            if (valEl) {
                valEl.textContent = stat.value;
                if (stat.animate) valEl.classList.add('realtime-value');
            }
            statGrids[i].querySelector('.stat-label').textContent = stat.label;
            const trendEl = statGrids[i].querySelector('.stat-trend');
            if (trendEl && stat.trend_text) {
                trendEl.innerHTML = '<span>' + stat.trend_text + '</span>';
                trendEl.className = 'stat-trend ' + (stat.trend_type === 'up' ? 'trend-up' : 'trend-down');
            }
        }
    });

    // 街道信息
    const streetName = document.querySelector('#overviewView .street-name');
    if (streetName) { streetName.textContent = d.street_info.name; }
    const streetCode = document.querySelector('#overviewView .street-code');
    if (streetCode) { streetCode.textContent = '区划代码：' + d.street_info.code; }
    const infoRows = document.querySelectorAll('#overviewView .info-row');
    d.street_info.details.forEach((item, i) => {
        if (infoRows[i]) {
            infoRows[i].querySelector('.info-label').textContent = item.label;
            infoRows[i].querySelector('.info-value').textContent = item.value;
        }
    });

    // 设备状态
    const deviceItems = document.querySelectorAll('#overviewView .device-item');
    d.device_status.forEach((dev, i) => {
        if (deviceItems[i]) {
            deviceItems[i].querySelector('.device-icon').textContent = dev.icon;
            const cntEl = deviceItems[i].querySelector('.device-count');
            if (cntEl) { cntEl.textContent = dev.count; cntEl.style.color = dev.color; }
            deviceItems[i].querySelector('.device-label').textContent = dev.label;
        }
    });

    // 地图标记
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
    mapImages.forEach(img => { if (d.map_image) img.src = d.map_image; });

    // 安全概览
    const securityItems = document.querySelectorAll('#overviewView .security-item');
    d.security_overview.forEach((item, i) => {
        if (securityItems[i]) {
            securityItems[i].querySelector('.security-icon').textContent = item.icon;
            securityItems[i].querySelector('.security-value').textContent = item.value;
            securityItems[i].querySelector('.security-label').textContent = item.label;
        }
    });

    // 事件列表
    const eventList = document.querySelector('#overviewView .event-list');
    if (eventList) {
        eventList.innerHTML = d.events.map(e => {
            const cls = e.type === 'alert' ? 'alert' : (e.type === 'warning' ? 'warning' : '');
            return '<div class="event-item ' + cls + '">' +
                '<div class="event-icon">' + e.icon + '</div>' +
                '<div class="event-content"><div class="event-title">' + e.title + '</div>' +
                '<div class="event-meta"><span>' + e.time + '</span>' + 
                (e.status ? '<span class="event-status">' + e.status + '</span>' : '') + '</div></div></div>';
        }).join('');
    }

    // 治安指数图表
    if (d.security_index_chart) {
        createChart('securityIndexChart', {
            type: 'line',
            data: {
                labels: d.security_index_chart.labels,
                datasets: [{
                    label: '治安指数', data: d.security_index_chart.data,
                    borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    fill: true, tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 70, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
            }
        });
    }
}

// ─── 安防监控 ───
function renderSecurity(d) {
    // 设备概况
    const statGrids = document.querySelectorAll('#securityView .stat-grid .stat-item');
    if (statGrids.length >= 4) {
        const statData = [
            { icon: '📹', value: d.device_stats.total, label: '监控点位', color: 'var(--accent-cyan)' },
            { icon: '🖥', value: d.device_stats.online, label: '在线设备', color: 'var(--accent-green)' },
            { icon: '🚨', value: d.device_stats.alert, label: '异常告警', color: 'var(--accent-red)' },
            { icon: '📊', value: d.device_stats.online_rate + '%', label: '在线率', color: '' }
        ];
        statData.forEach((s, i) => {
            if (statGrids[i]) {
                statGrids[i].querySelector('.stat-icon').textContent = s.icon;
                const valEl = statGrids[i].querySelector('.stat-value');
                if (valEl) { valEl.textContent = s.value; if (s.color) valEl.style.color = s.color; }
                statGrids[i].querySelector('.stat-label').textContent = s.label;
            }
        });
    }

    // 雪亮工程
    const xueliangRows = document.querySelectorAll('#securityView .info-list .info-row');
    d.xueliang_status.forEach((item, i) => {
        if (xueliangRows[i]) {
            xueliangRows[i].querySelector('.info-label').textContent = item.label;
            const valEl = xueliangRows[i].querySelector('.info-value');
            if (valEl) {
                valEl.textContent = item.text;
                valEl.style.color = item.status === 'online' ? 'var(--accent-green)' : 'var(--accent-orange)';
            }
        }
    });

    // 告警图表
    if (d.alert_chart) {
        createChart('alertChart', {
            type: 'bar',
            data: {
                labels: d.alert_chart.labels,
                datasets: [{
                    label: '告警数', data: d.alert_chart.data,
                    backgroundColor: 'rgba(255, 68, 68, 0.6)', borderColor: '#ff4444', borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
            }
        });
    }

    // 监控画面
    const videoGrid = document.querySelector('#securityView .video-grid');
    if (videoGrid) {
        videoGrid.innerHTML = d.cameras.map(cam => {
            let mediaHtml;
            if (cam.media_type === 'video' || cam.media_type === 'mp4') {
                mediaHtml = '<video src="' + cam.img + '" autoplay loop muted playsinline ' +
                    'style="width:100%;height:100%;object-fit:cover;"></video>';
            } else if (cam.media_type === 'rtsp') {
                mediaHtml = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--accent-orange);font-size:14px;">' +
                    '📡 RTSP流接入中...</div>';
            } else {
                mediaHtml = '<img src="' + cam.img + '" alt="' + cam.name + '" ' +
                    'style="width:100%;height:100%;object-fit:cover;" ' +
                    'onerror="this.parentElement.innerHTML=\\'<div style=\\\\'display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-gray);\\'>>无视频信号</div>\\'">';
            }
            return '<div class="video-item">' +
                '<div class="video-placeholder">' + mediaHtml + '</div>' +
                '<div class="video-overlay">' +
                '<span class="video-name">' + cam.id + ' ' + cam.name + '</span>' +
                '<span class="video-status"><span class="status-dot"></span>' +
                (cam.status === 'online' ? 'LIVE' : 'OFFLINE') + '</span></div></div>';
        }).join('');
    }

    // 人脸识别图表
    if (d.face_chart) {
        createChart('faceChart', {
            type: 'doughnut',
            data: {
                labels: d.face_chart.labels,
                datasets: [{ data: d.face_chart.data, backgroundColor: ['#00ff88', '#ff9900', '#ff4444'], borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { padding: 15 } } }
            }
        });
    }

    // 最近抓拍
    const capturesList = document.querySelector('#securityView .event-list');
    if (capturesList) {
        capturesList.innerHTML = d.recent_captures.map(c =>
            '<div class="event-item">' +
            '<div class="event-icon">👤</div>' +
            '<div class="event-content"><div class="event-title">' + c.type + '</div>' +
            '<div class="event-meta"><span>' + c.location + '</span><span>' + c.time + '</span></div></div></div>'
        ).join('');
    }
}

// ─── 社会综治 ───
function renderGovernance(d) {
    // 9+X 业务
    const bizGrid = document.querySelector('#governanceView .business-grid');
    if (bizGrid) {
        bizGrid.innerHTML = d.business_9x.map(b =>
            '<div class="business-item"><div class="business-icon">' + b.icon + '</div>' +
            '<div class="business-name">' + b.name + '</div>' +
            '<div class="business-count">' + b.count + '</div></div>'
        ).join('');
    }

    // 重点人员
    const peopleContainer = document.querySelector('#governanceView .key-people');
    if (peopleContainer) {
        peopleContainer.innerHTML = d.key_people.map(p =>
            '<div class="people-card-item"><div class="people-avatar">🚶</div>' +
            '<div class="people-detail"><div class="people-detail-name">' + p.name + '</div>' +
            '<div class="people-detail-type">' + p.type + '</div></div>' +
            '<span style="color:' + p.color + ';">' + p.count + '</span></div>'
        ).join('');
    }

    // 事件处理流程
    const stepsContainer = document.querySelector('#governanceView .workflow-steps');
    if (stepsContainer) {
        const line = '<div class="workflow-line"></div>';
        const steps = d.workflow.map(w =>
            '<div class="workflow-step"><div class="step-icon">' + w.icon + '</div>' +
            '<div class="step-name">' + w.name + '</div>' +
            '<div class="step-count">' + w.count + '</div></div>'
        ).join('');
        stepsContainer.innerHTML = line + steps;
    }

    // 网格分布
    const gridBars = document.querySelector('#governanceView .grid-distribution');
    if (gridBars) {
        gridBars.innerHTML = d.grid_distribution.map(g =>
            '<div class="grid-bar"><span class="grid-name">' + g.name + '</span>' +
            '<div class="grid-bar-track"><div class="grid-bar-fill" style="width:' + g.value + '%;">' + g.value + '件</div></div></div>'
        ).join('');
    }

    // 综治力量配置
    const forceContainer = document.querySelector('#governanceView .people-analysis');
    if (forceContainer) {
        forceContainer.innerHTML = d.governance_resources.map(r =>
            '<div class="people-card"><div class="people-title">' + r.title + '</div>' +
            '<div class="people-stats">' + r.stats.map(s =>
                '<div class="people-stat"><span class="label">' + s.label + '</span>' +
                '<span class="value"' + (s.color ? ' style="color:' + s.color + ';"' : '') + '>' + s.value + '</span></div>'
            ).join('') + '</div></div>'
        ).join('');
    }

    // 矛盾纠纷表格
    const disputeTable = document.querySelector('#governanceView .data-table tbody');
    if (disputeTable) {
        disputeTable.innerHTML = d.dispute_table.map(r =>
            '<tr><td>' + r.type + '</td><td>' + r.count + '</td>' +
            '<td style="color:' + r.status_color + ';">' + r.status + '</td></tr>'
        ).join('');
    }

    // 矛盾纠纷图表
    if (d.dispute_chart) {
        createChart('disputeChart', {
            type: 'bar',
            data: {
                labels: d.dispute_chart.labels,
                datasets: [
                    { label: '本月新增', data: d.dispute_chart.datasets[0].data, backgroundColor: 'rgba(0,212,255,0.6)', borderColor: '#00d4ff', borderWidth: 1 },
                    { label: '已化解', data: d.dispute_chart.datasets[1].data, backgroundColor: 'rgba(0,255,136,0.6)', borderColor: '#00ff88', borderWidth: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
            }
        });
    }
}

// ─── 决策驾驶舱 ───
function renderCockpit(d) {
    // 进度圆环
    const ringsContainer = document.querySelector('#cockpitView .progress-ring-container');
    if (ringsContainer) {
        ringsContainer.innerHTML = d.scores.map(s => {
            const circumference = 2 * Math.PI * 42; // r=42
            const offset = circumference - (s.value / 100) * circumference;
            return '<div class="progress-ring-item">' +
                '<div class="progress-ring">' +
                '<svg width="100" height="100"><circle class="bg" cx="50" cy="50" r="42"/>' +
                '<circle class="progress" cx="50" cy="50" r="42" stroke="' + s.color + '" ' +
                'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/></svg>' +
                '<span class="value" style="color:' + s.color + ';">' + s.value + '</span></div>' +
                '<div class="label">' + s.label + '</div></div>';
        }).join('');
    }

    // 趋势图
    if (d.trend_chart) {
        createChart('trendChart', {
            type: 'line',
            data: {
                labels: d.trend_chart.labels,
                datasets: d.trend_chart.datasets.map(ds => ({
                    label: ds.label, data: ds.data,
                    borderColor: ds.color, backgroundColor: ds.color.replace(')', ',0.1)').replace('rgb', 'rgba'),
                    fill: true, tension: 0.4
                }))
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
            }
        });
    }

    // 人口结构
    const popContainer = document.querySelector('#cockpitView .people-analysis');
    if (popContainer) {
        popContainer.innerHTML = d.population.map(p =>
            '<div class="people-card"><div class="people-title">' + p.title + '</div>' +
            '<div class="people-stats">' + p.stats.map(s =>
                '<div class="people-stat"><span class="label">' + s.label + '</span>' +
                '<span class="value">' + s.value + '</span></div>'
            ).join('') + '</div></div>'
        ).join('');
    }

    // 三个饼图
    if (d.pie_charts) {
        const pieConfigs = [
            { id: 'pieChart1', data: d.pie_charts[0] },
            { id: 'pieChart2', data: d.pie_charts[1] },
            { id: 'pieChart3', data: d.pie_charts[2] }
        ];
        pieConfigs.forEach(pc => {
            if (pc.data) {
                createChart(pc.id, {
                    type: 'pie',
                    data: {
                        labels: pc.data.labels,
                        datasets: [{ data: pc.data.data, backgroundColor: pc.data.colors }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: pc.data.title, font: { size: 12 } },
                            legend: { display: false }
                        }
                    }
                });
            }
        });
    }

    // 雷达图
    if (d.radar_chart) {
        createChart('cockpitChart', {
            type: 'radar',
            data: {
                labels: d.radar_chart.labels,
                datasets: d.radar_chart.datasets.map(ds => ({
                    label: ds.label, data: ds.data,
                    borderColor: ds.color,
                    backgroundColor: ds.color.replace(')', ',0.2)').replace('rgb', 'rgba'),
                    pointBackgroundColor: ds.color
                }))
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } }
            }
        });
    }

    // 社区排名
    const rankBars = document.querySelector('#cockpitView .grid-distribution');
    if (rankBars) {
        rankBars.innerHTML = d.community_rankings.map(r =>
            '<div class="grid-bar"><span class="grid-name">' + r.name + '</span>' +
            '<div class="grid-bar-track"><div class="grid-bar-fill" style="width:' + r.score + '%;' +
            (r.color ? ' background: ' + r.color + ';' : '') + '">' + r.score + '分</div></div></div>'
        ).join('');
    }

    // 运行指标
    const metricGrid = document.querySelector('#cockpitView .stat-grid');
    if (metricGrid) {
        metricGrid.innerHTML = d.runtime_metrics.map(m =>
            '<div class="stat-item"><div class="stat-icon">' + m.icon + '</div>' +
            '<div class="stat-value">' + m.value + '</div>' +
            '<div class="stat-label">' + m.label + '</div></div>'
        ).join('');
    }

    // 风险预警
    const riskList = document.querySelector('#cockpitView .event-list');
    if (riskList) {
        riskList.innerHTML = d.risk_warnings.map(r =>
            '<div class="event-item ' + (r.icon === '⚠️' ? 'warning' : '') + '">' +
            '<div class="event-icon">' + r.icon + '</div>' +
            '<div class="event-content"><div class="event-title">' + r.title + '</div>' +
            '<div class="event-meta"><span>' + r.desc + '</span></div></div></div>'
        ).join('');
    }
}

// ─── 应急指挥 ───
function renderEmergency(d) {
    // 预警级别
    const levelBtns = document.querySelectorAll('#emergencyView .level-btn');
    d.alert_levels.forEach((al, i) => {
        if (levelBtns[i]) {
            levelBtns[i].querySelector('.level-name').textContent = al.name;
            levelBtns[i].querySelector('.level-count').textContent = al.count;
            if (al.active) levelBtns[i].classList.add('active');
            else levelBtns[i].classList.remove('active');
        }
    });

    // 预警事件列表
    const alertEventList = document.querySelector('#emergencyView .alert-panel .event-list');
    if (alertEventList) {
        alertEventList.innerHTML = d.alert_events.map(e =>
            '<div class="event-item warning"><div class="event-icon">' + e.icon + '</div>' +
            '<div class="event-content"><div class="event-title">' + e.title + '</div>' +
            '<div class="event-meta"><span>' + e.time + '</span></div></div></div>'
        ).join('');
    }

    // 应急资源
    const resContainer = document.querySelector('#emergencyView .resource-distribution');
    if (resContainer) {
        resContainer.innerHTML = d.resources.map(r =>
            '<div class="resource-item"><div class="resource-icon">' + r.icon + '</div>' +
            '<div class="resource-num">' + r.count + '</div>' +
            '<div class="resource-name">' + r.name + '</div></div>'
        ).join('');
    }

    // 地图标记
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
    mapImages.forEach(img => { if (d.map_image) img.src = d.map_image; });

    // 处置力量
    const teamList = document.querySelector('#emergencyView .team-list');
    if (teamList) {
        teamList.innerHTML = d.dispatch_teams.map(t =>
            '<div class="team-item"><div class="team-avatar">' + t.icon + '</div>' +
            '<div class="team-info"><div class="team-name">' + t.name + '</div>' +
            '<div class="team-status" style="color:' + t.status_color + ';">● ' + t.status + '</div>' +
            '<div class="team-location">' + t.location + '</div></div>' +
            '<button class="tool-btn">📞</button></div>'
        ).join('');
    }

    // 通讯记录
    const commList = document.querySelector('#emergencyView .event-list:not(.alert-panel .event-list)');
    if (commList) {
        commList.innerHTML = d.comm_records.map(c =>
            '<div class="event-item"><div class="event-icon">' + c.icon + '</div>' +
            '<div class="event-content"><div class="event-title">' + c.title + '</div>' +
            '<div class="event-meta"><span>' + c.time + '</span><span>' + c.desc + '</span></div></div></div>'
        ).join('');
    }
}

// ─── 数据融合 ───
function renderDataFusion(d) {
    // 数据源状态
    const srcContainer = document.querySelector('#dataView .card:nth-child(1) > div:nth-child(2)');
    if (srcContainer) {
        srcContainer.innerHTML = d.data_sources.map(s =>
            '<div style="text-align: center; padding: 15px 25px; background: rgba(0, 40, 80, 0.5); border-radius: 8px; min-width: 150px;">' +
            '<div style="font-size: 32px;">' + s.icon + '</div>' +
            '<div style="font-size: 14px; margin-top: 8px;' +
            (s.status === 'online' ? 'color: var(--accent-green);' : 'color: var(--accent-orange);') + '">● ' + s.name + '</div>' +
            '<div style="font-size: 12px; color: var(--text-gray); margin-top: 4px;">' + s.status_text + '</div></div>'
        ).join('');
    }

    // 数据汇聚图表
    if (d.data_gather_chart) {
        createChart('dataGatherChart', {
            type: 'bar',
            data: {
                labels: d.data_gather_chart.labels,
                datasets: [{
                    label: '数据量(万条)', data: d.data_gather_chart.data,
                    backgroundColor: 'rgba(0, 212, 255, 0.6)', borderColor: '#00d4ff', borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } }
            }
        });
    }

    // 数据质量图表
    if (d.data_quality_chart) {
        createChart('dataQualityChart', {
            type: 'line',
            data: {
                labels: d.data_quality_chart.labels,
                datasets: d.data_quality_chart.datasets.map(ds => ({
                    label: ds.label, data: ds.data,
                    borderColor: ds.color,
                    backgroundColor: ds.color.replace(')', ',0.1)').replace('rgb', 'rgba'),
                    fill: true, tension: 0.4
                }))
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { min: 80, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
            }
        });
    }
}

// ─── 实时数据刷新（仅随机数值变化） ───
function updateRealtimeData() {
    const eventCount = document.querySelector('#overviewView .stat-value.realtime-value');
    if (eventCount && allData.overview) {
        eventCount.textContent = allData.overview.stats[0].value + Math.floor(Math.random() * 10) - 5;
    }
}
setInterval(updateRealtimeData, 5000);

// ─── 启动：加载数据并渲染 ───
Chart.defaults.color = '#b0b8c4';
Chart.defaults.borderColor = 'rgba(0, 212, 255, 0.1)';
loadAllData();
</script>`;

// ─── 拼装最终HTML ───
const finalHTML = headPart + dashboardScript + '\n\n' + footerPart;

// 写入文件
fs.writeFileSync('/root/.openclaw/workspace/changbai-dashboard/public/index.html', finalHTML, 'utf-8');
console.log('✅ 大屏页面已生成: public/index.html');
console.log('文件大小:', (finalHTML.length / 1024).toFixed(1), 'KB');
