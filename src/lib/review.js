import { cases } from '../data/cases.js';

// 源标识不依赖记录ID，因此旧记录及跨设备导入也能对应复习进度。
export const reviewSource = attempt => JSON.stringify([attempt.caseId, attempt.date || '', [...attempt.selected].sort()]);
export function latestAttempts(attempts) {
  const latest = new Map();
  for (const attempt of attempts) {
    const previous = latest.get(attempt.caseId);
    const stamp = Date.parse(attempt.date), previousStamp = Date.parse(previous?.date);
    if (!previous || !Number.isFinite(previousStamp) || Number.isFinite(stamp) && stamp >= previousStamp) latest.set(attempt.caseId, attempt);
  }
  return latest;
}
export function reviewItems(state) {
  const latest = latestAttempts(state.attempts), items = [];
  for (const contract of cases) {
    const attempt = latest.get(contract.id);
    if (!attempt) continue;
    const selected = new Set(attempt.selected), source = reviewSource(attempt);
    for (const clause of contract.clauses) {
      if (Boolean(clause.risk) === selected.has(clause.id)) continue;
      const saved = state.reviewProgress?.[clause.id];
      const progress = saved?.source === source ? saved : null;
      items.push({ contract, clause, source, error: clause.risk ? 'missed' : 'falsePositive', progress, resolved: Boolean(progress && progress.judgment === Boolean(clause.risk)) });
    }
  }
  return items;
}
export function validateReviewProgress(value = {}) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw Error('复习进度格式不正确。');
  const progress = {};
  for (const [id, p] of Object.entries(value)) {
    if (!cases.some(c => c.clauses.some(x => x.id === id)) || !p || typeof p !== 'object' || Array.isArray(p) || typeof p.source !== 'string' || p.source.length > 1500 || typeof p.judgment !== 'boolean' || typeof p.reviewedAt !== 'string' || p.reviewedAt.length > 64 || !Number.isFinite(Date.parse(p.reviewedAt))) throw Error('复习进度中含无效条款或日期。');
    progress[id] = { source: p.source, judgment: p.judgment, reviewedAt: new Date(p.reviewedAt).toISOString() };
  }
  return progress;
}
export function mergeReviewProgress(current = {}, incoming = {}, attempts) {
  const latest = latestAttempts(attempts), merged = {};
  for (const contract of cases) for (const clause of contract.clauses) {
    const local = current[clause.id], remote = incoming[clause.id];
    const attempt = latest.get(contract.id), source = attempt && reviewSource(attempt);
    // 优先匹配合并后的最新挑战，再比较复习时间；同一时间保留本机结果。
    if (!local) { if (remote) merged[clause.id] = { ...remote }; continue; }
    if (!remote) { merged[clause.id] = { ...local }; continue; }
    const localMatches = local.source === source, remoteMatches = remote.source === source;
    merged[clause.id] = { ...(localMatches !== remoteMatches ? localMatches ? local : remote : Date.parse(remote.reviewedAt) > Date.parse(local.reviewedAt) ? remote : local) };
  }
  return merged;
}
