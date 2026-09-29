/**
 * Boutique OS - Staff Management
 */
class StaffManager {
  static init() {
    StaffManager.renderCards();
    StaffManager.bindEvents();
  }

  static renderCards() {
    const container = document.getElementById('staff-cards-container');
    if (!container) return;
    const users = Database.get('users');
    container.innerHTML = '';

    users.forEach((user, idx) => {
      const isSuper = user.role === 'SUPER_ADMIN';
      const card = document.createElement('div');
      card.className = 'mobile-data-card';
      const badgeClass = user.role === 'SUPER_ADMIN' ? 'badge-super' : user.role === 'MANAGER' ? 'badge-manager' : 'badge-staff';
      const roleText = user.role === 'SUPER_ADMIN' ? 'مدیر ارشد (Super Admin)' : user.role === 'MANAGER' ? 'مدیر داخلی (Manager)' : 'صندوقدار / فروشنده سالن (Staff)';

      card.innerHTML = `
        <div class="data-card-header">
          <div>
            <div class="data-card-title">${user.name}</div>
            <div class="data-card-sub">نام کاربری: <code>${user.username}</code></div>
          </div>
          <span class="badge ${badgeClass}">${roleText}</span>
        </div>

        <div class="data-card-row">
          <span style="color:var(--text-muted);">وضعیت ورود پرسنل:</span>
          <span>
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${user.active ? 'var(--success)' : 'var(--danger)'}; margin-left:6px;"></span>
            <strong>${user.active ? 'فعال و مجاز' : 'مسدود شده'}</strong>
          </span>
        </div>

        <div class="data-card-actions">
          ${!isSuper ? `
            <button class="btn btn-secondary" style="flex:1; padding:6px 8px; font-size:0.75rem;" onclick="StaffManager.toggleStatus(${idx})">
              ${user.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
            </button>
            <button class="btn btn-secondary" style="flex:1; padding:6px 8px; font-size:0.75rem;" onclick="StaffManager.changePasswordModal(${idx})">
              تغییر رمز
            </button>
            <button class="btn btn-danger" style="padding:6px 10px; font-size:0.75rem;" onclick="StaffManager.deleteUser(${idx})">
              حذف
            </button>
          ` : `<span style="font-size:0.75rem; color:var(--text-muted); padding:6px 0;">کاربر اصلی غیرقابل تغییر</span>`}
        </div>
      `;
      container.appendChild(card);
    });
  }

  static openAddModal() {
    if (Auth.currentUser?.role !== 'SUPER_ADMIN' && Auth.currentUser?.role !== 'MANAGER') {
      return alert('تنها مدیران دسترسی به تعریف پرسنل دارند.');
    }
    document.getElementById('add-staff-modal').classList.add('active');
  }

  static closeAddModal() {
    document.getElementById('add-staff-modal').classList.remove('active');
    document.getElementById('add-staff-form').reset();
  }

  static bindEvents() {
    const form = document.getElementById('add-staff-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('staff-name').value.trim();
        const username = document.getElementById('staff-username').value.trim().toLowerCase();
        const pass = document.getElementById('staff-pass').value;
        const role = document.getElementById('staff-role').value;

        if (!name || !username || !pass) {
          return alert('تمام فیلدهای الزامی را پر کنید.');
        }

        const users = Database.get('users');
        if (users.some(u => u.username.toLowerCase() === username)) {
          return alert('این نام کاربری از قبل وجود دارد.');
        }

        const newUser = {
          id: 'usr-' + Date.now(),
          name, username, pass, role,
          active: true,
          createdDate: new Date().toLocaleDateString('fa-IR')
        };

        users.push(newUser);
        Database.set('users', users);
        Database.logActivity(Auth.currentUser?.name, `تعریف کارمند جدید: ${name} (${role})`, 'USER_CREATE', newUser.id);

        alert(`کارمند "${name}" با موفقیت در فضای ابری ساخته شد و اکنون از هر دستگاهی می‌تواند لاگین کند.`);
        StaffManager.closeAddModal();
        StaffManager.renderCards();
      };
    }
  }

  static toggleStatus(idx) {
    const users = Database.get('users');
    const u = users[idx];
    if (u.role === 'SUPER_ADMIN') return alert('امکان تغییر وضعیت مدیر ارشد وجود ندارد.');
    u.active = !u.active;
    Database.set('users', users);
    Database.logActivity(Auth.currentUser?.name, `تغییر وضعیت کاربر ${u.name} به ${u.active ? 'فعال' : 'غیرفعال'}`, 'USER_UPDATE', u.id);
    StaffManager.renderCards();
  }

  static changePasswordModal(idx) {
    const users = Database.get('users');
    const u = users[idx];
    const newPass = prompt(`رمز عبور جدید برای ${u.name} را وارد نمایید:`);
    if (newPass && newPass.trim().length >= 4) {
      u.pass = newPass.trim();
      Database.set('users', users);
      Database.logActivity(Auth.currentUser?.name, `تغییر رمز عبور کاربر ${u.name}`, 'USER_UPDATE', u.id);
      alert('رمز عبور کاربر تغییر کرد و در کلود ذخیره شد.');
    }
  }

  static deleteUser(idx) {
    const users = Database.get('users');
    const u = users[idx];
    if (u.role === 'SUPER_ADMIN') return alert('امکان حذف مدیر ارشد وجود ندارد.');
    if (!confirm(`آیا از حذف دسترسی کارمند "${u.name}" اطمینان دارید؟`)) return;

    users.splice(idx, 1);
    Database.set('users', users);
    Database.logActivity(Auth.currentUser?.name, `حذف دسترسی کارمند: ${u.name}`, 'USER_DELETE', u.id);
    StaffManager.renderCards();
  }
}
