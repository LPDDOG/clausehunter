export const KEY = 'clause-hunter-v1';
export const fresh = () => ({ version: 1, attempts: [], drafts: {}, revisions: {}, achievements: [], theme: 'light' });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = value => Array.isArray(value) && value.every(x => typeof x === 'string');
export function load(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage.getItem(KEY);
    if (!raw) return { data: fresh(), warning: '' };
    const d = JSON.parse(raw);
    if (!record(d) || d.version !== 1 || !Array.isArray(d.attempts) || !record(d.drafts) || !record(d.revisions) || !strings(d.achievements)) throw Error();
    // 防止损坏的草稿结构在恢复页面时导致整页报错。
    if (Object.values(d.drafts).some(x => !record(x) || !strings(x.selected) || typeof x.submitted !== 'boolean')) throw Error();
    if (Object.values(d.revisions).some(x => typeof x !== 'string')) throw Error();
    if (d.attempts.some(a => typeof a.caseId !== 'string' || !Number.isFinite(a.score) || a.score < 0 || a.score > 100 || !Array.isArray(a.selected))) throw Error();
    return { data: { ...fresh(), ...d, theme: d.theme === 'dark' ? 'dark' : 'light' }, warning: '' };
  } catch { return { data: fresh(), warning: '本地记录无法读取或格式异常，当前使用临时记录；下次保存会尝试恢复存储。' }; }
}
export function save(data, storage) {
  try { storage ??= globalThis.localStorage; storage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
