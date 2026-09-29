/**
 * Boutique OS - App Orchestrator
 */
let deferredPrompt = null;

class App {
  static async init() {
    App.registerServiceWorker();
    App.setupDrawer();
    App.setupSmartPWAPrompt();
    
    await Database.init();

    App.setupNavigation();
    App.checkLoginState();
    App.applyStoredThemeAndFont();
    App.updateDashboard();
    App.setupNotifications();

    POS.init();
    POS.renderHeldCarts();
    ProductsManager.init();
    CustomersManager.init();
    StaffManager.init();
    App.renderLogs();
    App.bindSettingsForm();
  }

  static registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(console.error);
    }
  }

  static setupDrawer() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const openBtn = document.getElementById('hamburger-btn');
    const closeBtn = document.getElementById('close-drawer-btn');

    const openDrawer = () => {
      sidebar.classList.add('active');
      backdrop.classList.add('active');
    };

    const closeDrawer = () => {
      sidebar.classList.remove('active');
      backdrop.classList.remove('active');
    };

    if (openBtn) openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });
  }

  static setupSmartPWAPrompt() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      return;
    }

    if (localStorage.getItem('pwa_prompt_dismissed') === 'true') {
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      setTimeout(() => {
        const modal = document.getElementById('pwa-install-modal');
        if (modal) modal.classList.add('active');
      }, 4000);
    });

    const installBtn = document.getElementById('btn-pwa-modal-install');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            localStorage.setItem('pwa_prompt_dismissed', 'true');
          }
          deferredPrompt = null;
        } else {
          alert('در مرورگر موبایل، روی منوی سه نقطه بزنید و "Add to Home screen" یا "Install app" را لمس کنید.');
          localStorage.setItem('pwa_prompt_dismissed', 'true');
        }
        document.getElementById('pwa-install-modal').classList.remove('active');
      });
    }
  }

  static dismissPWAPrompt() {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    const modal = document.getElementById('pwa-install-modal');
    if (modal) modal.classList.remove('active');
  }

  static setupNotifications() {
    const btn = document.getElementById('notif-bell-btn');
    const dropdown = document.getElementById('notif-dropdown');
    const badge = document.getElementById('notif-badge-count');
    const list = document.getElementById('notif-items-list');

    const updateNotifs = () => {
      const notifs = Database.getSmartNotifications();
      badge.textContent = notifs.length;
      badge.style.display = notifs.length > 0 ? 'flex' : 'none';

      if (notifs.length === 0) {
        list.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:10px;">اعلان جدیدی وجود ندارد.</div>';
      } else {
        list.innerHTML = notifs.map(n => `
          <div class="notif-item">
            <span style="font-size:1.1rem;">${n.icon}</span>
            <div>
              <div style="font-weight:700; color:#fff;">${n.title}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${n.msg}</div>
            </div>
          </div>
        `).join('');
      }
    };

    updateNotifs();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
    });
  }

  static applyStoredThemeAndFont() {
    const settings = Database.get('settings') || {};
    if (settings.theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }

    if (settings.fontName) {
      document.documentElement.style.setProperty('--font-family', `'${settings.fontName}', system-ui, sans-serif`);
    }

    const logoImg = document.getElementById('header-boutique-logo');
    const logoFallback = document.getElementById('header-logo-fallback');
    const storeNameEl = document.getElementById('header-store-name');

    if (storeNameEl) storeNameEl.textContent = settings.storeName || 'بوتیک کلود OS';

    if (logoImg) {
      logoImg.src = settings.logo || './media/logo.png';
      logoImg.onload = () => {
        logoImg.style.display = 'block';
        if (logoFallback) logoFallback.style.display = 'none';
      };
      logoImg.onerror = () => {
        logoImg.style.display = 'none';
        if (logoFallback) logoFallback.style.display = 'flex';
      };
    }
  }

  static checkLoginState() {
    const user = Auth.checkSession();
    if (!user) {
      document.getElementById('login-modal').classList.add('active');
    } else {
      document.getElementById('login-modal').classList.remove('active');
      document.getElementById('header-user-name').textContent = user.name;
      const b = document.getElementById('header-user-badge');
      b.textContent = user.role;
      b.className = `badge ${user.role === 'SUPER_ADMIN' ? 'badge-super' : user.role === 'MANAGER' ? 'badge-manager' : 'badge-staff'}`;
    }
  }

  static setupNavigation() {
    const links = document.querySelectorAll('[data-target]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');

        if (targetId === 'view-settings' && Auth.currentUser?.role !== 'SUPER_ADMIN') {
          return alert('فقط مدیر ارشد (Super Admin) به بخش تنظیمات هویت بوتیک دسترسی دارد.');
        }

        document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(l => l.classList.remove('active'));

        const page = document.getElementById(targetId);
        if (page) page.classList.add('active');

        document.querySelectorAll(`[data-target="${targetId}"]`).forEach(l => l.classList.add('active'));

        if (targetId === 'view-dashboard') App.updateDashboard();
        if (targetId === 'view-products') ProductsManager.renderCards();
        if (targetId === 'view-customers') CustomersManager.renderCards();
        if (targetId === 'view-staff') StaffManager.renderCards();
        if (targetId === 'view-logs') App.renderLogs();
      });
    });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-user').value;
        const p = document.getElementById('login-pass').value;
        const res = Auth.login(u, p);
        if (res.success) {
          App.checkLoginState();
        } else {
          alert(res.message);
        }
      });
    }

    const scanBtn = document.getElementById('btn-scan-barcode');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        BarcodeScanner.start((product) => {
          POS.addToCart(product);
        });
      });
    }
  }

  static bindSettingsForm() {
    const form = document.getElementById('boutique-settings-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const settings = Database.get('settings') || {};
        settings.storeName = document.getElementById('set-name').value.trim();
        settings.phone = document.getElementById('set-phone').value.trim();
        settings.city = document.getElementById('set-city').value.trim();
        settings.instagram = document.getElementById('set-insta').value.trim();
        settings.receiptFooter = document.getElementById('set-footer').value.trim();
        settings.theme = document.getElementById('set-theme').value;
        settings.fontName = document.getElementById('set-font').value;

        Database.set('settings', settings);
        Database.logActivity(Auth.currentUser?.name, 'به‌روزرسانی تنظیمات هویت، تم و ظاهر بوتیک', 'SETTINGS_UPDATE');
        App.applyStoredThemeAndFont();
        alert('تنظیمات با موفقیت در فضای ابری ذخیره و اعمال شد.');
      };
    }
  }

  static updateDashboard() {
    const invoices = Database.get('invoices');
    const products = Database.get('products');
    const customers = Database.get('customers');

    const totalSales = invoices.reduce((sum, i) => sum + i.total, 0);
    const lowStock = products.filter(p => p.stock <= p.minStock).length;
    const totalDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

    document.getElementById('dash-today-sales').textContent = totalSales.toLocaleString() + ' ت';
    document.getElementById('dash-invoices-count').textContent = invoices.length;
    document.getElementById('dash-products-count').textContent = products.length;
    document.getElementById('dash-low-stock').textContent = lowStock;
    document.getElementById('dash-total-debt').textContent = totalDebt.toLocaleString() + ' ت';

    const tbody = document.getElementById('dash-recent-sales');
    if (tbody) {
      tbody.innerHTML = '';
      invoices.slice(0, 5).forEach(inv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding:10px;">${inv.id}</td>
          <td>${inv.date}</td>
          <td><strong>${inv.total.toLocaleString()} ت</strong></td>
          <td>${inv.method}</td>
          <td>${inv.seller}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  static renderLogs() {
    const list = document.getElementById('activity-logs-list');
    if (!list) return;
    const logs = Database.get('activity_logs');
    list.innerHTML = logs.map(l => `
      <div style="padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.82rem; display:flex; justify-content:space-between;">
        <span><strong>${l.user}</strong>: ${l.action}</span>
        <span style="color:var(--text-muted); font-size:0.75rem;">${l.date} ${l.time}</span>
      </div>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', App.init);
