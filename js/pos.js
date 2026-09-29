/**
 * Boutique OS - POS Engine
 */
class POS {
  static cart = [];
  static activeDiscount = 0;

  static init() {
    POS.renderCatalog();
    POS.bindEvents();
  }

  static renderCatalog(filter = '') {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;
    const products = Database.get('products');
    grid.innerHTML = '';

    const filtered = products.filter(p => 
      p.name.includes(filter) || p.sku.toLowerCase().includes(filter.toLowerCase()) || p.cat.includes(filter)
    );

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const isOut = p.stock <= 0;
      card.innerHTML = `
        <div style="font-weight:700; font-size:0.92rem; color:#fff;">${p.name}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${p.cat} | سایز: ${p.size} | رنگ: ${p.color}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
          <span style="color:var(--cyan); font-weight:800;">${p.priceSell.toLocaleString()} ت</span>
          <span style="font-size:0.72rem; color:${isOut ? 'var(--danger)' : 'var(--success)'}; font-weight:700;">
            ${isOut ? 'ناموجود' : p.stock + ' عدد'}
          </span>
        </div>
      `;
      if (!isOut) {
        card.addEventListener('click', () => POS.addToCart(p));
      } else {
        card.style.opacity = '0.5';
        card.style.cursor = 'not-allowed';
      }
      grid.appendChild(card);
    });
  }

  static addToCart(product) {
    const existing = POS.cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty < product.stock) {
        existing.qty++;
      } else {
        alert('حداکثر موجودی این کالا در انبار همین تعداد است.');
      }
    } else {
      POS.cart.push({ ...product, qty: 1 });
    }
    POS.renderCart();
  }

  static renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    container.innerHTML = '';

    let subtotal = 0;

    POS.cart.forEach((item, index) => {
      const rowTotal = item.qty * item.priceSell;
      subtotal += rowTotal;

      const div = document.createElement('div');
      div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.85rem;';
      div.innerHTML = `
        <div>
          <div style="color:#fff; font-weight:600;">${item.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${item.size} - ${item.color}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.8rem;" onclick="POS.changeQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.8rem;" onclick="POS.changeQty(${index}, 1)">+</button>
          <span style="min-width:70px; text-align:left; color:var(--cyan);">${rowTotal.toLocaleString()}</span>
        </div>
      `;
      container.appendChild(div);
    });

    const discountAmount = POS.activeDiscount;
    const finalAmount = Math.max(0, subtotal - discountAmount);

    document.getElementById('cart-subtotal').textContent = subtotal.toLocaleString() + ' تومان';
    document.getElementById('cart-discount').textContent = discountAmount.toLocaleString() + ' تومان';
    document.getElementById('cart-total').textContent = finalAmount.toLocaleString() + ' تومان';
  }

  static changeQty(index, delta) {
    const item = POS.cart[index];
    const products = Database.get('products');
    const orig = products.find(p => p.id === item.id);
    item.qty += delta;
    if (item.qty <= 0) {
      POS.cart.splice(index, 1);
    } else if (orig && item.qty > orig.stock) {
      item.qty = orig.stock;
      alert('موجودی انبار کافی نیست.');
    }
    POS.renderCart();
  }

  static applyDiscountModal() {
    const val = prompt('مبلغ تخفیف را به تومان وارد کنید (یا درصدی مانند 10%):');
    if (!val) return;
    let subtotal = POS.cart.reduce((sum, item) => sum + (item.priceSell * item.qty), 0);
    if (val.includes('%')) {
      const pct = parseFloat(val.replace('%', ''));
      if (!isNaN(pct)) {
        POS.activeDiscount = Math.round((subtotal * pct) / 100);
      }
    } else {
      const num = parseInt(val.replace(/,/g, ''));
      if (!isNaN(num)) {
        POS.activeDiscount = num;
      }
    }
    POS.renderCart();
  }

  static clearCart() {
    POS.cart = [];
    POS.activeDiscount = 0;
    POS.renderCart();
  }

  static holdCurrentCart() {
    if (POS.cart.length === 0) return alert('سبد خرید خالی است.');
    const held = Database.get('held_carts');
    held.push({
      id: 'HOLD-' + Date.now(),
      cart: [...POS.cart],
      discount: POS.activeDiscount,
      time: new Date().toLocaleTimeString('fa-IR'),
      note: 'سبد رزرو سالن #' + (held.length + 1)
    });
    Database.set('held_carts', held);
    POS.clearCart();
    alert('سبد خرید رزرو سالن شد.');
    POS.renderHeldCarts();
  }

  static renderHeldCarts() {
    const container = document.getElementById('held-carts-list');
    if (!container) return;
    const held = Database.get('held_carts');
    container.innerHTML = '';
    held.forEach((h, idx) => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.cssText = 'padding:5px 8px; font-size:0.75rem; margin:2px;';
      b.textContent = `${h.note} (${h.time})`;
      b.onclick = () => {
        POS.cart = h.cart;
        POS.activeDiscount = h.discount;
        held.splice(idx, 1);
        Database.set('held_carts', held);
        POS.renderCart();
        POS.renderHeldCarts();
      };
      container.appendChild(b);
    });
  }

  static checkout(method) {
    if (POS.cart.length === 0) return alert('سبد خرید خالی است.');

    let subtotal = POS.cart.reduce((sum, item) => sum + (item.priceSell * item.qty), 0);
    let finalAmount = Math.max(0, subtotal - POS.activeDiscount);

    const products = Database.get('products');
    POS.cart.forEach(item => {
      const p = products.find(x => x.id === item.id);
      if (p) p.stock -= item.qty;
    });
    Database.set('products', products);

    const invoices = Database.get('invoices');
    const invoiceId = 'INV-' + (invoices.length + 1001);
    const invoice = {
      id: invoiceId,
      date: new Date().toLocaleDateString('fa-IR'),
      time: new Date().toLocaleTimeString('fa-IR'),
      customer: 'مشتری حضوری',
      items: [...POS.cart],
      subtotal,
      discount: POS.activeDiscount,
      total: finalAmount,
      method: method,
      seller: Auth.currentUser ? Auth.currentUser.name : 'صندوقدار'
    };
    invoices.unshift(invoice);
    Database.set('invoices', invoices);

    Database.logActivity(invoice.seller, `ثبت فروش فاکتور ${invoiceId} به مبلغ ${finalAmount.toLocaleString()} تومان (${method})`, 'SALE', invoiceId);

    POS.printReceipt(invoice);
    POS.clearCart();
    POS.renderCatalog();
    App.updateDashboard();
  }

  static printReceipt(inv) {
    const settings = Database.get('settings');
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
      <div style="text-align:center; margin-bottom:8px;">
        <img src="${settings.logo || './media/logo.png'}" onerror="this.style.display='none'" style="max-height:45px; margin:0 auto 4px;">
        <div style="font-weight:bold; font-size:16px;">${settings.storeName}</div>
        <div style="font-size:11px;">تلفن: ${settings.phone} | ${settings.city}</div>
      </div>
      <div style="border-bottom:1px dashed #000; margin:6px 0;"></div>
      <div>شماره فاکتور: ${inv.id}</div>
      <div>تاریخ: ${inv.date} - ${inv.time}</div>
      <div>فروشنده: ${inv.seller} | پرداخت: ${inv.method}</div>
      <div style="border-bottom:1px dashed #000; margin:6px 0;"></div>
      ${inv.items.map(i => `
        <div style="display:flex; justify-content:space-between;">
          <span>${i.name} (${i.size}) x${i.qty}</span>
          <span>${(i.qty * i.priceSell).toLocaleString()}</span>
        </div>
      `).join('')}
      <div style="border-bottom:1px dashed #000; margin:6px 0;"></div>
      <div style="display:flex; justify-content:space-between;">
        <span>تخفیف:</span>
        <span>${inv.discount.toLocaleString()} تومان</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px;">
        <span>مبلغ نهایی:</span>
        <span>${inv.total.toLocaleString()} تومان</span>
      </div>
      <div style="text-align:center; margin-top:8px; font-size:10px;">${settings.receiptFooter}</div>
    `;
    window.print();
  }

  static bindEvents() {
    const searchInput = document.getElementById('pos-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => POS.renderCatalog(e.target.value));
    }
  }
}
