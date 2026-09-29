/**
 * Boutique OS - Customers Management
 */
class CustomersManager {
  static init() {
    CustomersManager.renderCards();
    CustomersManager.bindEvents();
  }

  static renderCards() {
    const container = document.getElementById('customers-cards-container');
    if (!container) return;
    const customers = Database.get('customers');
    container.innerHTML = '';

    customers.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'mobile-data-card';

      card.innerHTML = `
        <div class="data-card-header">
          <div>
            <div class="data-card-title">${c.name}</div>
            <div class="data-card-sub">عضویت: ${c.date || '-'} | آدرس: ${c.address || '-'}</div>
          </div>
          <span class="badge" style="background:rgba(6,182,212,0.15); color:var(--cyan);">${c.phone}</span>
        </div>

        <div class="data-card-row">
          <span style="color:var(--text-muted);">کل خرید:</span>
          <strong>${(c.totalSpent || 0).toLocaleString()} ت</strong>
        </div>

        <div class="data-card-row">
          <span style="color:var(--text-muted);">وضعیت بدهی / مانده نسیه:</span>
          <span style="color:${c.debt > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:800;">
            ${c.debt > 0 ? c.debt.toLocaleString() + ' ت بدهکار' : 'تسویه کامل'}
          </span>
        </div>

        <div class="data-card-actions">
          <button class="btn btn-cyan" style="flex:1; padding:6px 8px; font-size:0.75rem;" onclick="CustomersManager.settleDebtModal(${idx})">تسویه بدهی</button>
          <button class="btn btn-secondary" style="flex:1; padding:6px 8px; font-size:0.75rem;" onclick="CustomersManager.addDebtModal(${idx})">+ بدهی جدید</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  static openAddModal() {
    document.getElementById('add-customer-modal').classList.add('active');
  }

  static closeAddModal() {
    document.getElementById('add-customer-modal').classList.remove('active');
    document.getElementById('add-customer-form').reset();
  }

  static bindEvents() {
    const form = document.getElementById('add-customer-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('cst-name').value.trim();
        const phone = document.getElementById('cst-phone').value.trim();
        const address = document.getElementById('cst-address').value.trim();
        const debt = parseInt(document.getElementById('cst-debt').value) || 0;

        const customers = Database.get('customers');
        const newCustomer = {
          id: 'CST-' + Date.now(),
          name, phone, address, debt,
          totalSpent: 0,
          ordersCount: 0,
          date: new Date().toLocaleDateString('fa-IR')
        };

        customers.push(newCustomer);
        Database.set('customers', customers);
        Database.logActivity(Auth.currentUser?.name, `ثبت پرونده مشتری جدید: ${name}`, 'CUSTOMER_CREATE', phone);

        alert('پرونده مشتری با موفقیت تشکیل و در سرور ابری ثبت شد.');
        CustomersManager.closeAddModal();
        CustomersManager.renderCards();
        App.updateDashboard();
      };
    }
  }

  static settleDebtModal(idx) {
    const customers = Database.get('customers');
    const c = customers[idx];
    if (c.debt <= 0) return alert('این مشتری هیچ بدهی ثبت‌شده‌ای ندارد.');
    const amount = prompt(`مبلغ پرداختی مشتری (${c.name}) جهت تسویه بدهی را وارد کنید:`, c.debt);
    if (amount) {
      const val = parseInt(amount);
      if (!isNaN(val) && val > 0) {
        c.debt = Math.max(0, c.debt - val);
        Database.set('customers', customers);
        Database.logActivity(Auth.currentUser?.name, `تسویه بدهی مشتری ${c.name} به مبلغ ${val.toLocaleString()} ت`, 'DEBT_SETTLE', c.phone);
        alert(`پرداخت ثبت شد. مانده بدهی: ${c.debt.toLocaleString()} ت`);
        CustomersManager.renderCards();
        App.updateDashboard();
      }
    }
  }

  static addDebtModal(idx) {
    const customers = Database.get('customers');
    const c = customers[idx];
    const amount = prompt(`مبلغ بدهی نسیه جدید برای مشتری (${c.name}) را وارد نمایید:`);
    if (amount) {
      const val = parseInt(amount);
      if (!isNaN(val) && val > 0) {
        c.debt += val;
        Database.set('customers', customers);
        Database.logActivity(Auth.currentUser?.name, `ثبت بدهی نسیه برای ${c.name} به مبلغ ${val.toLocaleString()} ت`, 'DEBT_ADD', c.phone);
        CustomersManager.renderCards();
        App.updateDashboard();
      }
    }
  }
}
