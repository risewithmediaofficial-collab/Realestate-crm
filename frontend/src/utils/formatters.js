export const formatCurrency = (amount, currency = 'INR') => {
  if (!amount && amount !== 0) return '—';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
};

export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d)) return '—';
  const defaults = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-IN', { ...defaults, ...options });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return formatDate(date);
};

export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
};

export const getInitials = (name = '') => {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
};

export const getScoreColor = (score) => {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
};

export const formatPhone = (phone) => {
  if (!phone) return '—';
  return phone.replace(/(\+91)?(\d{5})(\d{5})/, '+91 $2 $3');
};

export const truncate = (str, len = 40) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
};

export const formatArea = (area) => {
  if (!area) return '—';
  return `${area.toLocaleString('en-IN')} sq.ft`;
};
