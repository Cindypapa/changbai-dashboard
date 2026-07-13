const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3100;

// 数据目录
const DATA_DIR = process.env.DATA_DIR || '/opt/changbai-data';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 确保目录存在
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── 用户管理 ───

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    // 初始化默认管理员 — 默认密码从环境变量读取
    const defaultPwd = process.env.ADMIN_DEFAULT_PASSWORD || 'changbai2026';
    const defaultUsers = [
      { id: 'admin', username: 'admin', password: hashPassword(defaultPwd), role: 'admin', createdAt: new Date().toISOString() }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    console.log('默认管理员已创建，请尽快修改密码');
    return defaultUsers;
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + 'changbai_salt_2026').digest('hex');
}

// 简单 token 存储（生产环境建议用 JWT）
const tokens = {};

function createToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokens[token] = { userId, expires: Date.now() + 24 * 60 * 60 * 1000 };
  return token;
}

function verifyToken(token) {
  const entry = tokens[token];
  if (!entry || entry.expires < Date.now()) {
    if (entry) delete tokens[token];
    return null;
  }
  return entry.userId;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未认证' });
  }
  const userId = verifyToken(authHeader.slice(7));
  if (!userId) {
    return res.status(401).json({ error: 'token 无效或已过期' });
  }
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: '用户不存在' });
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ─── API: 仪表盘数据读取 ───

const pageFiles = ['overview', 'security', 'governance', 'cockpit', 'emergency', 'data-fusion'];

// 获取所有页面数据（必须在 :page 路由之前）
app.get('/api/dashboard/all', (req, res) => {
  try {
    const allData = {};
    pageFiles.forEach(page => {
      const filePath = path.join(DATA_DIR, `${page}.json`);
      if (fs.existsSync(filePath)) {
        allData[page] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    });
    res.json({ success: true, data: allData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个页面数据
app.get('/api/dashboard/:page', (req, res) => {
  const { page } = req.params;
  if (!pageFiles.includes(page)) return res.status(404).json({ error: '页面不存在' });
  try {
    const filePath = path.join(DATA_DIR, `${page}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '数据文件不存在' });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: 认证 ───

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: '用户名不存在' });
  if (user.password !== hashPassword(password)) return res.status(401).json({ error: '密码错误' });
  const token = createToken(user.id);
  res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: { id: req.user.id, username: req.user.username, role: req.user.role, avatar: req.user.avatar, createdAt: req.user.createdAt } });
});

// ─── 账号设置（头像、密码等） ───
app.get('/api/auth/settings', authMiddleware, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ success: true, avatar: user.avatar || '', username: user.username });
});

app.post('/api/auth/settings', authMiddleware, (req, res) => {
  const { password, avatar } = req.body;
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });

  if (password) {
    if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });
    users[idx].password = hashPassword(password);
  }
  if (avatar !== undefined) {
    users[idx].avatar = avatar;
  }
  writeUsers(users);
  res.json({ success: true, message: '设置已保存' });
});

// ─── API: 用户管理（需管理员权限） ───

app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  const users = readUsers();
  const safe = users.map(({ id, username, role, createdAt }) => ({ id, username, role, createdAt }));
  res.json({ success: true, users: safe });
});

app.post('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (!['admin', 'editor'].includes(role)) return res.status(400).json({ error: '无效的角色' });
  const users = readUsers();
  if (users.find(u => u.username === username)) return res.status(400).json({ error: '用户名已存在' });
  const newUser = {
    id: `u_${Date.now()}`,
    username,
    password: hashPassword(password),
    role,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeUsers(users);
  res.json({ success: true, message: '用户已创建' });
});

app.put('/api/admin/users/:id/password', authMiddleware, adminOnly, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '密码不能为空' });
  const users = readUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  user.password = hashPassword(password);
  writeUsers(users);
  res.json({ success: true, message: '密码已更新' });
});

app.delete('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
  const { id } = req.params;
  if (id === 'admin') return res.status(400).json({ error: '不能删除内置管理员' });
  const users = readUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  users.splice(idx, 1);
  writeUsers(users);
  res.json({ success: true, message: '用户已删除' });
});

// ─── API: 后台数据管理（需认证） ───

// 保存数据
app.post('/api/admin/save', authMiddleware, (req, res) => {
  try {
    const { page, data } = req.body;
    if (!page || !data) return res.status(400).json({ error: '缺少 page 或 data 参数' });
    if (!pageFiles.includes(page)) return res.status(400).json({ error: '无效的页面名称' });

    const filePath = path.join(DATA_DIR, `${page}.json`);
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonStr, 'utf-8');
    res.json({ success: true, message: `${page} 数据已保存` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 上传媒体文件
app.post('/api/admin/upload-media', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未提供文件' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url, filename: req.file.originalname });
});

// 获取已上传媒体列表
app.get('/api/admin/media-list', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|webm|avi)$/i.test(f))
      .map(f => ({
        name: f,
        url: `/uploads/${f}`,
        time: fs.statSync(path.join(UPLOADS_DIR, f)).mtime.toISOString()
      }))
      .sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除媒体文件
app.delete('/api/admin/media/:filename', authMiddleware, (req, res) => {
  try {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: '已删除' });
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 初始化数据 ───
function initData() {
  const sourceDir = path.join(__dirname, '..', 'data');
  pageFiles.forEach(page => {
    const destPath = path.join(DATA_DIR, `${page}.json`);
    if (!fs.existsSync(destPath)) {
      const srcPath = path.join(sourceDir, `${page}.json`);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Initialized: ${page}.json`);
      }
    }
  });
}

initData();

app.listen(PORT, '127.0.0.1', () => {
  console.log(`长白综治中心 Dashboard API 启动: http://127.0.0.1:${PORT}`);
});
