import { cases } from '../data/cases.js';
import { scoreCase } from './scoring.js';
import { unlocked } from './achievements.js';
import { validateReviewProgress, mergeReviewProgress } from './review.js';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const invalid = message => { throw new Error(message || '备份格式不正确，请选择由本站导出的 JSON 文件。'); };
const findCase = id => cases.find(c => c.id === id) || invalid('备份包含当前题库不支持的关卡，未导入任何记录。');
function selections(c, value) {
  if (!Array.isArray(value) || value.length > c.clauses.length || value.some(id => typeof id !== 'string' || !c.clauses.some(x => x.id === id))) invalid('备份中有不属于该关卡的条款标记。');
  return [...new Set(value)];
}
// 不信任导入文件中的分数或成就：按当前题库重新计算。
function validateData(data) {
  if (!isRecord(data) || !Array.isArray(data.attempts) || data.attempts.length > 10000 || !isRecord(data.drafts) || !isRecord(data.revisions)) invalid();
  const attempts = data.attempts.map(a => {
    if (!isRecord(a) || typeof a.caseId !== 'string' || typeof a.date !== 'string' || a.date.length > 64 || !Number.isFinite(Date.parse(a.date))) invalid('挑战记录缺少有效日期或关卡信息。');
    const c = findCase(a.caseId), selected = selections(c, a.selected);
    return { caseId: c.id, date: new Date(a.date).toISOString(), selected, ...scoreCase(c, selected) };
  });
  const drafts = {}, revisions = {};
  for (const [id, d] of Object.entries(data.drafts)) {
    const c = findCase(id);
    if (!isRecord(d) || typeof d.submitted !== 'boolean') invalid('备份中的审查草稿格式不正确。');
    drafts[id] = { selected: selections(c, d.selected), submitted: d.submitted };
  }
  for (const [id, text] of Object.entries(data.revisions)) {
    if (!cases.some(c => c.clauses.some(x => x.id === id && x.risk)) || typeof text !== 'string' || text.length > 20000) invalid('备份中含无效或超过两万字的修订草稿。');
    revisions[id] = text;
  }
  return { attempts, drafts, revisions, reviewProgress: validateReviewProgress(data.reviewProgress) };
}
export function createBackup(state) {
  return JSON.stringify({ app: 'clause-hunter', backupVersion: 1, exportedAt: new Date().toISOString(), data: { attempts: state.attempts, drafts: state.drafts, revisions: state.revisions, reviewProgress: state.reviewProgress || {} } }, null, 2);
}
export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) invalid('文件超过5MB，无法导入。');
  let value;
  try { value = JSON.parse(text); } catch { invalid('文件不是有效的 JSON，未更改现有记录。'); }
  if (!isRecord(value) || value.app !== 'clause-hunter' || value.backupVersion !== 1) invalid();
  return validateData(value.data);
}
const fingerprint = a => JSON.stringify([a.caseId, Number.isFinite(Date.parse(a.date)) ? new Date(a.date).toISOString() : a.date, [...a.selected].sort()]);
export function mergeBackup(current, incoming) {
  const attempts = [...current.attempts], known = new Set(attempts.map(fingerprint));
  for (const a of incoming.attempts) {
    const key = fingerprint(a);
    if (!known.has(key)) { attempts.push({ ...a, selected: [...a.selected] }); known.add(key); }
  }
  // 本机已有的标记与非空修订优先，不覆盖正在进行的练习。
  const drafts = { ...incoming.drafts, ...current.drafts };
  const revisions = { ...incoming.revisions };
  for (const [id, text] of Object.entries(current.revisions)) if (text.trim() || !revisions[id]) revisions[id] = text;
  const reviewProgress = mergeReviewProgress(current.reviewProgress, incoming.reviewProgress, attempts);
  const added = {
    attempts: attempts.length - current.attempts.length,
    drafts: Object.keys(drafts).length - Object.keys(current.drafts).length,
    revisions: Object.keys(revisions).filter(id => revisions[id].trim() && !current.revisions[id]?.trim()).length,
    reviews: Object.entries(reviewProgress).filter(([id,p]) => JSON.stringify(p) !== JSON.stringify(current.reviewProgress?.[id])).length
  };
  const data = { ...current, attempts, drafts, revisions, reviewProgress, achievements: unlocked(attempts, cases) };
  return { data, added };
}
