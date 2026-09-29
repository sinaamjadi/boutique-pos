/**
 * Boutique OS - Cloud Sync Engine
 */
class Database {
  static store = null;
  static isSyncing = false;

  static async init() {
    try {
      const res = await fetch('./api/data');
      if (res.ok) {
        Database.store = await res.json();
        localStorage.setItem('boutique_cached_store', JSON.stringify(Database.store));
        Database.updateSyncStatus('آنلاین (همگام)', true);
      } else {
        throw new Error('Server returned ' + res.status);
      }
    } catch (err) {
      console.warn('Using offline cache:', err);
      const cached = localStorage.getItem('boutique_cached_store');
      if (cached) {
        Database.store = JSON.parse(cached);
      }
      Database.updateSyncStatus('آفلاین موقت', false);
    }

    setInterval(() => Database.pullCloudData(), 15000);
  }

  static updateSyncStatus(text, isOnline) {
    const el = document.getElementById('cloud-sync-status');
    const dot = document.getElementById('cloud-sync-dot');
    if (el) el.textContent = text;
    if (dot) {
      dot.style.background = isOnline ? 'var(--success)' : 'var(--warning)';
      dot.style.boxShadow = isOnline ? '0 0 8px var(--success)' : 'none';
    }
  }

  static async pullCloudData() {
    if (Database.isSyncing) return;
    try {
      const res = await fetch('./api/data');
      if (res.ok) {
        const fresh = await res.json();
        Database.store = fresh;
        localStorage.setItem('boutique_cached_store', JSON.stringify(fresh));
        Database.updateSyncStatus('آنلاین (همگام)', true);
      }
    } catch (e) {
      Database.updateSyncStatus('آفلاین موقت', false);
    }
  }

  static async pushCloudData() {
    Database.isSyncing = true;
    Database.updateSyncStatus('در حال ذخیره ابری...', true);
    try {
      localStorage.setItem('boutique_cached_store', JSON.stringify(Database.store));
      const res = await fetch('./api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Database.store)
      });
      if (res.ok) {
        Database.updateSyncStatus('آنلاین (همگام)', true);
      } else {
        Database.updateSyncStatus('خطا در ذخیره ابری', false);
      }
    } catch (err) {
      console.error('Failed to save to cloud:', err);
      Database.updateSyncStatus('عدم دسترسی به سرور', false);
    } finally {
      Database.isSyncing = false;
    }
  }

  static get(key) {
    if (!Database.store) {
      const cached = localStorage.getItem('boutique_cached_store');
      Database.store = cached ? JSON.parse(cached) : {};
    }
    return Database.store[key] || [];
  }

  static set(key, value) {
    if (!Database.store) Database.store = {};
    Database.store[key] = value;
    Database.pushCloudData();
  }

  static logActivity(user, action, type, recordId) {
    const logs = Database.get('activity_logs');
    logs.unshift({
      id: 'LOG-' + Date.now(),
      user: user || 'سیستم',
      action,
      type,
      recordId: recordId || '-',
      time: new Date().toLocaleTimeString('fa-IR'),
      date: new Date().toLocaleDateString('fa-IR')
    });
    if (logs.length > 250) logs.pop();
    Database.set('activity_logs', logs);
  }

  static getSmartNotifications() {
    const notifs = [];
    const products = Database.get('products');
    const customers = Database.get('customers');

    products.forEach(p => {
      if (p.stock <= p.minStock) {
        notifs.push({
          type: 'danger',
          icon: '🔴',
          title: 'کسری موجودی انبار',
          msg: `کالای "${p.name}" (${p.size}/${p.color}) فقط ${p.stock} عدد باقی مانده است.`
        });
      }
    });

    customers.forEach(c => {
      if (c.debt > 0) {
        notifs.push({
          type: 'warning',
          icon: '🟠',
          title: 'بدهی سررسید شده مشتری',
          msg: `مشتری "${c.name}" دارای ${c.debt.toLocaleString()} تومان بدهی تسویه‌نشده است.`
        });
      }
    });

    return notifs;
  }
}
