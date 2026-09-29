/**
 * Boutique OS - Authentication & Permission Guard
 */
class Auth {
  static currentUser = null;

  static checkSession() {
    const raw = sessionStorage.getItem('boutique_session');
    if (raw) {
      Auth.currentUser = JSON.parse(raw);
      return Auth.currentUser;
    }
    return null;
  }

  static login(username, password) {
    const users = Database.get('users');
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.pass === password && u.active);
    if (user) {
      Auth.currentUser = user;
      sessionStorage.setItem('boutique_session', JSON.stringify(user));
      Database.logActivity(user.name, 'ورود به سامانه', 'AUTH', user.id);
      return { success: true, user };
    }
    return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است یا کاربر غیرفعال می‌باشد.' };
  }

  static logout() {
    if (Auth.currentUser) {
      Database.logActivity(Auth.currentUser.name, 'خروج از حساب', 'AUTH', Auth.currentUser.id);
    }
    Auth.currentUser = null;
    sessionStorage.removeItem('boutique_session');
    window.location.reload();
  }

  static can(permissionKey) {
    if (!Auth.currentUser) return false;
    if (Auth.currentUser.role === 'SUPER_ADMIN') return true;
    if (Auth.currentUser.role === 'MANAGER') {
      const allowed = ['view_dashboard', 'manage_products', 'manage_inventory', 'manage_customers', 'make_sale', 'view_reports', 'view_debt'];
      return allowed.includes(permissionKey);
    }
    if (Auth.currentUser.role === 'STAFF') {
      const allowed = ['view_dashboard', 'make_sale', 'view_products'];
      return allowed.includes(permissionKey);
    }
    return false;
  }
}
