const router = require('express').Router();
const crypto = require('crypto');
const { getDb } = require('../db/database');
const { requireAuth } = require('./auth');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

router.get('/tenants', requireAuth, (req, res) => {
  const db = getDb();
  const tenants = db.prepare("SELECT id, username, store_name, status, expires_at, created_at FROM tenants ORDER BY id").all();
  res.json(tenants);
});

router.post('/tenants', requireAuth, (req, res) => {
  const db = getDb();
  const { username, password, store_name } = req.body;
  if (!username || !password || !store_name) {
    return res.status(400).json({ error: 'username, password, and store_name are required' });
  }

  const hash = hashPassword(password);
  const r = db.prepare(
    'INSERT INTO tenants (username, password_hash, store_name) VALUES (?, ?, ?)'
  ).run(username, hash, store_name);

  const newTenantId = Number(r.lastInsertRowid);

  // Generate printer API key for new tenant
  const printerKey = crypto.randomBytes(16).toString('hex');
  db.prepare("INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (?, 'printer_api_key', ?)").run(newTenantId, printerKey);
  db.prepare("INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (?, 'printer_enabled', 'false')").run(newTenantId);
  db.prepare("INSERT OR IGNORE INTO settings (tenant_id, key, value) VALUES (?, 'printer_name', '')").run(newTenantId);

  const tenant = db.prepare('SELECT id, username, store_name, status, created_at FROM tenants WHERE id = ?').get(newTenantId);
  res.status(201).json(tenant);
});

router.put('/tenants/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { status, expires_at } = req.body;

  if (status && !['active', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or disabled' });
  }

  // Build dynamic update
  const fields = [];
  const params = [];
  if (status) {
    fields.push('status = ?');
    params.push(status);
  }
  if (expires_at !== undefined) {
    // null or date string
    if (expires_at === null || expires_at === '') {
      fields.push('expires_at = NULL');
    } else {
      fields.push('expires_at = ?');
      params.push(expires_at);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'status or expires_at required' });
  }

  params.push(req.params.id);
  const r = db.prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  if (r.changes === 0) return res.status(404).json({ error: 'tenant not found' });

  const tenant = db.prepare('SELECT id, username, store_name, status, expires_at, created_at FROM tenants WHERE id = ?').get(req.params.id);
  res.json(tenant);
});

router.delete('/tenants/:id', requireAuth, (req, res) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'tenant not found' });
  res.json({ success: true });
});

module.exports = router;
