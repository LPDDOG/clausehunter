export const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const icon = (name, size = 20) => {
  const paths = { arrow: 'M4 12h16m-6-6 6 6-6 6', moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z', sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0', file: 'M14 3H6v18h13V8l-5-5Zm0 0v5h5M9 12h7M9 16h5', check: 'm5 12 4 4L19 6', shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6', edit: 'm14 5 5 5M4 20l5-1L21 7l-5-5L4 14v6Z', chart: 'M4 20V4m0 16h17M9 16v-5m5 5V7m5 9V3', back: 'm10 5-7 7 7 7M3 12h18', copy: 'M8 8h12v13H8V8ZM4 16V3h12', search: 'm16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0' };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
};
export const link = (href, label, cls = 'btn primary') => `<a class="${cls}" href="${href}">${label}</a>`;
export const pill = (label, cls = '') => `<span class="pill ${cls}">${label}</span>`;
