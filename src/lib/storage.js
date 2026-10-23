export const KEY = 'clause-hunter-v1';
export const fresh = () => ({ version: 1, attempts: [], drafts: {}, revisions: {}, achievements: [], theme: 'light' });
export function load(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage.getItem(KEY);
    if (!raw) return { data: fresh(), warning: '' };
    const d = JSON.parse(raw);
    if (d.version !== 1 || !Array.isArray(d.attempts) || !d.drafts || !d.revisions || !Array.isArray(d.achievements)) throw Error();
    if (d.attempts.some(a => typeof a.caseId !== 'string' || !Number.isFinite(a.score) || a.score < 0 || a.score > 100 || !Array.isArray(a.selected))) throw Error();
    return { data: { ...fresh(), ...d, theme: d.theme === 'dark' ? 'dark' : 'light' }, warning: '' };
  } catch { return { data: fresh(), warning: '本地记录无法读取或格式异常，当前使用临时记录；下次保存会尝试恢复存储。' }; }
}
export function save(data, storage) {
  try { storage ??= globalThis.localStorage; storage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
