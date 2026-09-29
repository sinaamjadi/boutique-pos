const DEFAULT_STORE = {
  products: [
    { id: 'PRD-101', name: 'تی‌شرت نئونی اورسایز', sku: 'TS-NEON-01', cat: 'تی‌شرت', brand: 'Zara', priceBuy: 250000, priceSell: 480000, discount: 0, stock: 18, minStock: 5, color: 'مشکی', size: 'L' },
    { id: 'PRD-102', name: 'شلوار جین مام استایل', sku: 'JN-MOM-02', cat: 'شلوار', brand: 'Pull&Bear', priceBuy: 520000, priceSell: 980000, discount: 0, stock: 3, minStock: 4, color: 'آبی روشن', size: '42' },
    { id: 'PRD-103', name: 'پیراهن کوبایی کتان', sku: 'SH-CUB-03', cat: 'پیراهن', brand: 'Mango', priceBuy: 380000, priceSell: 720000, discount: 0, stock: 1, minStock: 3, color: 'سفید', size: 'XL' },
    { id: 'PRD-104', name: 'کت چرم اسلیم فیت', sku: 'JK-LEA-04', cat: 'لباس مردانه', brand: 'Massimo Dutti', priceBuy: 1800000, priceSell: 3200000, discount: 100000, stock: 6, minStock: 2, color: 'مشکی', size: 'L' }
  ],
  customers: [
    { id: 'CST-01', name: 'امیر رضایی', phone: '09121112233', address: 'تهران، سعادت آباد', debt: 250000, totalSpent: 4200000, ordersCount: 5, date: '1403/01/15' },
    { id: 'CST-02', name: 'سارا محمدی', phone: '09355556677', address: 'تهران، ونک', debt: 0, totalSpent: 8900000, ordersCount: 9, date: '1403/02/10' }
  ],
  settings: {
    storeName: 'بوتیک سایبر استایل',
    logo: './media/logo.png',
    phone: '021-88889999',
    mobile: '09120000000',
    city: 'تهران',
    address: 'مرکز تجاری کوروش، طبقه اول، پلاک ۴۲',
    instagram: '@cyber_boutique',
    telegram: '@cyber_pos',
    whatsapp: '09120000000',
    receiptFooter: 'اجناس فروخته شده تا ۴۸ ساعت با ارائه فاکتور تعویض می‌گردند.',
    theme: 'dark',
    fontName: 'Vazirmatn'
  },
  users: [
    { id: 'usr-1', username: 'superadmin', pass: 'admin123', name: 'مدیر ارشد', role: 'SUPER_ADMIN', active: true },
    { id: 'usr-2', username: 'manager', pass: '123456', name: 'مدیر فروشگاه', role: 'MANAGER', active: true },
    { id: 'usr-3', username: 'staff1', pass: '123456', name: 'فروشنده سالن', role: 'STAFF', active: true }
  ],
  invoices: [],
  activity_logs: [],
  held_carts: [],
  categories: ['لباس زنانه', 'لباس مردانه', 'شلوار', 'تی‌شرت', 'پیراهن', 'کفش', 'کیف', 'اکسسوری']
};

let memCache = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/data') {
      try {
        let data = null;
        if (env && env.BOUTIQUE_DB) {
          const raw = await env.BOUTIQUE_DB.get('global_boutique_data');
          if (raw) data = JSON.parse(raw);
        }
        if (!data) {
          data = memCache || DEFAULT_STORE;
        }
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify(memCache || DEFAULT_STORE), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (url.pathname === '/api/save' && request.method === 'POST') {
      try {
        const body = await request.json();
        memCache = body;
        if (env && env.BOUTIQUE_DB) {
          await env.BOUTIQUE_DB.put('global_boutique_data', JSON.stringify(body));
        }
        return new Response(JSON.stringify({ success: true, timestamp: Date.now() }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not found', { status: 404 });
  }
};
