const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists (critical for Render ephemeral storage)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json());
app.use(require('express-session')({
  secret: process.env.SESSION_SECRET || 'pos-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));
const serveStatic = require('serve-static');
app.use(serveStatic(path.join(__dirname, 'public')));

// Initialize DB and auto-seed if first run
const db = getDb();
const tenantCount = db.prepare('SELECT COUNT(*) as cnt FROM tenants').get().cnt;
if (tenantCount === 0) {
  console.log('First run — seeding default data...');
  // Insert admin tenant
  const crypto = require('crypto');
  const adminHash = crypto.createHash('sha256').update('admin123').digest('hex');
  db.prepare("INSERT INTO tenants (username, password_hash, store_name, status) VALUES (?, ?, ?, 'active')").run('admin', adminHash, '系统管理');
  console.log('Created admin tenant (admin/admin123)');

  // Generate default printer API key for admin
  const printerKey = crypto.randomBytes(16).toString('hex');
  db.prepare("INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (1, 'printer_api_key', ?)").run(printerKey);
  db.prepare("INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (1, 'printer_enabled', 'false')").run();
  db.prepare("INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (1, 'printer_name', '')").run();
}

// Auto-seed menu data if tenant has no categories
const categoryCount = db.prepare('SELECT COUNT(*) as cnt FROM categories WHERE tenant_id = 1').get().cnt;
if (categoryCount === 0) {
  console.log('Seeding default menu data for admin tenant...');
  const insertCat = db.prepare('INSERT INTO categories (tenant_id, name, sort_order) VALUES (?, ?, ?)');
  insertCat.run(1, '主餐', 1);
  insertCat.run(1, '小食', 2);
  insertCat.run(1, '飲品', 3);

  const insertItem = db.prepare(
    'INSERT INTO items (tenant_id, category_id, name, base_price, is_available, emoji) VALUES (?, ?, ?, ?, 1, ?)'
  );
  insertItem.run(1, 1, '排骨飯', 80, '🍖');
  insertItem.run(1, 1, '雞腿飯', 90, '🍗');
  insertItem.run(1, 1, '滷肉飯', 50, '🍛');
  insertItem.run(1, 2, '薯條', 30, '🍟');
  insertItem.run(1, 2, '雞塊', 40, '🍗');
  insertItem.run(1, 3, '紅茶', 20, '🍵');
  insertItem.run(1, 3, '綠茶', 20, '🍵');

  const insertSize = db.prepare('INSERT INTO item_sizes (tenant_id, item_id, name, price_adjust) VALUES (?, ?, ?, ?)');
  [1, 2, 3].forEach(itemId => {
    insertSize.run(1, itemId, '小份', 0);
    insertSize.run(1, itemId, '大份', 10);
  });

  const insertTopping = db.prepare('INSERT INTO item_toppings (tenant_id, item_id, name, price_adjust) VALUES (?, ?, ?, ?)');
  [1, 2, 3, 4, 5, 6, 7].forEach(itemId => {
    insertTopping.run(1, itemId, '加蛋', 10);
    insertTopping.run(1, itemId, '加辣', 0);
  });
  console.log('Default menu seeded for admin tenant.');
}

// Migration: generate printer_api_key for tenants that don't have one
const crypto = require('crypto');
const tenantsWithoutKey = db.prepare(`
  SELECT t.id FROM tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM settings s WHERE s.tenant_id = t.id AND s.key = 'printer_api_key'
  )
`).all();
for (const t of tenantsWithoutKey) {
  const key = crypto.randomBytes(16).toString('hex');
  db.prepare("INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (?, 'printer_api_key', ?)").run(t.id, key);
  console.log(`Generated printer API key for tenant ${t.id}`);
}

// Migration: add expires_at column for existing databases
try {
  db.exec("ALTER TABLE tenants ADD COLUMN expires_at TEXT DEFAULT NULL");
  console.log('Migration: added expires_at column');
} catch (e) {
  // column already exists, ignore
}

// Auto-disable expired tenants (runs every startup)
const expiredCount = db.prepare(
  "UPDATE tenants SET status = 'disabled' WHERE status = 'active' AND expires_at IS NOT NULL AND date(expires_at) < date('now','localtime')"
).run();
if (expiredCount.changes > 0) {
  console.log(`Auto-disabled ${expiredCount.changes} expired tenant(s)`);
}

app.use('/api/public', require('./routes/public'));
app.use('/api/printer', require('./routes/printer'));
app.use('/api', require('./routes/auth').router);
app.use('/api', require('./routes/tenants'));
app.use('/api', require('./routes/menu'));
app.use('/api', require('./routes/orders'));
app.use('/api', require('./routes/reports'));
app.use('/api', require('./routes/settings'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`POS Server running at http://localhost:${PORT}`);
});
