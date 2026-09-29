/**
 * Boutique OS - Products Management
 */
class ProductsManager {
  static init() {
    ProductsManager.renderCards();
    ProductsManager.bindEvents();
  }

  static renderCards() {
    const container = document.getElementById('products-cards-container');
    if (!container) return;
    const products = Database.get('products');
    container.innerHTML = '';

    products.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'mobile-data-card';
      const isLow = p.stock <= p.minStock;

      card.innerHTML = `
        <div class="data-card-header">
          <div>
            <div class="data-card-title">${p.name}</div>
            <div class="data-card-sub">${p.cat} | برند: ${p.brand || '-'}</div>
          </div>
          <span class="badge" style="background:rgba(255,255,255,0.06);">${p.sku}</span>
        </div>

        <div class="data-card-row">
          <span style="color:var(--text-muted);">سایز و رنگ:</span>
          <strong>${p.size} / ${p.color}</strong>
        </div>

        <div class="data-card-row">
          <span style="color:var(--text-muted);">قیمت فروش:</span>
          <strong style="color:var(--cyan);">${p.priceSell.toLocaleString()} تومان</strong>
        </div>

        <div class="data-card-row">
          <span style="color:var(--text-muted);">موجودی انبار:</span>
          <span style="color:${isLow ? 'var(--danger)' : 'var(--success)'}; font-weight:800;">
            ${p.stock} عدد ${isLow ? '(کسری انبار)' : ''}
          </span>
        </div>

        <div class="data-card-actions">
          <button class="btn btn-secondary" style="flex:1; padding:6px 8px; font-size:0.75rem;" onclick="ProductsManager.quickStockAdjust(${idx})">اصلاح موجودی</button>
          <button class="btn btn-danger" style="padding:6px 12px; font-size:0.75rem;" onclick="ProductsManager.delete(${idx})">حذف</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  static openAddModal() {
    if (!Auth.can('manage_products')) return alert('شما دسترسی کافی برای ثبت یا تغییر محصول ندارید.');
    document.getElementById('add-product-modal').classList.add('active');
  }

  static closeAddModal() {
    document.getElementById('add-product-modal').classList.remove('active');
    document.getElementById('add-product-form').reset();
  }

  static bindEvents() {
    const form = document.getElementById('add-product-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('prd-name').value.trim();
        const sku = document.getElementById('prd-sku').value.trim().toUpperCase();
        const cat = document.getElementById('prd-cat').value;
        const brand = document.getElementById('prd-brand').value.trim();
        const size = document.getElementById('prd-size').value.trim();
        const color = document.getElementById('prd-color').value.trim();
        const priceBuy = parseInt(document.getElementById('prd-buy').value) || 0;
        const priceSell = parseInt(document.getElementById('prd-sell').value) || 0;
        const stock = parseInt(document.getElementById('prd-stock').value) || 0;
        const minStock = parseInt(document.getElementById('prd-minstock').value) || 3;

        const products = Database.get('products');
        const newProduct = {
          id: 'PRD-' + Date.now(),
          name, sku, cat, brand, size, color, priceBuy, priceSell, stock, minStock
        };

        products.push(newProduct);
        Database.set('products', products);
        Database.logActivity(Auth.currentUser?.name, `ثبت محصول جدید: ${name} (${sku})`, 'PRODUCT', sku);

        alert('محصول با موفقیت ذخیره و در فضای ابری همگام شد.');
        ProductsManager.closeAddModal();
        ProductsManager.renderCards();
        POS.renderCatalog();
        App.updateDashboard();
      };
    }
  }

  static quickStockAdjust(idx) {
    const products = Database.get('products');
    const p = products[idx];
    const newStock = prompt(`تعداد موجودی جدید برای ${p.name} را وارد کنید:`, p.stock);
    if (newStock !== null) {
      const s = parseInt(newStock);
      if (!isNaN(s) && s >= 0) {
        p.stock = s;
        Database.set('products', products);
        Database.logActivity(Auth.currentUser?.name, `اصلاح موجودی کالا "${p.name}" به ${s} عدد`, 'STOCK_ADJUST', p.sku);
        ProductsManager.renderCards();
        POS.renderCatalog();
        App.updateDashboard();
      }
    }
  }

  static delete(index) {
    if (!Auth.can('manage_products')) return alert('عدم دسترسی کافی!');
    if (!confirm('آیا از حذف این کالا اطمینان دارید؟')) return;
    const products = Database.get('products');
    const removed = products.splice(index, 1)[0];
    Database.set('products', products);
    Database.logActivity(Auth.currentUser?.name, `حذف محصول: ${removed.name}`, 'PRODUCT', removed.sku);
    ProductsManager.renderCards();
    POS.renderCatalog();
    App.updateDashboard();
  }
}
