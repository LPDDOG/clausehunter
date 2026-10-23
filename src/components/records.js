import { escapeHTML as e, link, pill, icon } from './ui.js';

export function formatDate(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(d) : '早期记录 · 日期未知';
}
export const attemptId = (attempt, index) => attempt.id || `legacy-${index}`;
export function recordsToolbar() {
  return `<section class="backup-toolbar" aria-label="训练记录备份"><div><strong>${icon('file',17)} 把学习记录留在自己手里</strong><p>导出备份后，可在其他设备或本地／线上站点手动导入。</p></div><div class="backup-actions"><button class="btn secondary" data-action="export-backup">导出记录</button><button class="btn secondary" data-action="choose-backup">导入备份</button></div><input id="backup-file" type="file" accept=".json,application/json" hidden><p id="backup-status" class="backup-status" role="status" aria-live="polite"></p></section>`;
}
export function historyList(state, cases, filter = 'all', page = 1) {
  const entries = state.attempts.map((a, index) => ({ ...a, key: attemptId(a, index), c: cases.find(c => c.id === a.caseId) })).filter(a => a.c && (filter === 'all' || a.caseId === filter)).reverse();
  const count = entries.length, pages = Math.max(1, Math.ceil(count / 10));
  page = Math.max(1, Math.min(page, pages));
  return `<section class="section history-section" id="history-list"><div class="section-heading"><div><div class="eyebrow blue">REVIEW & REFLECT</div><h2>每次挑战，都可以回看</h2></div><span class="muted small">共 ${count} 次</span></div><div class="history-filters"><label class="field-label" for="history-filter">筛选历史关卡</label><select id="history-filter"><option value="all">全部关卡</option>${cases.map(c => `<option value="${c.id}" ${filter === c.id ? 'selected' : ''}>${c.title}</option>`).join('')}</select></div>${count ? `<div class="history-entries">${entries.slice((page-1)*10, page*10).map(a => `<article class="history-entry"><div><strong>${a.c.title}</strong><small>${e(formatDate(a.date))}</small></div><div class="history-metrics">${pill(`${a.score} 分`, a.score === 100 ? 'green' : 'blue-bg')}<span>漏判 ${a.missed ?? '—'} · 误判 ${a.falsePositive ?? '—'}</span></div>${link(`#/history/${e(a.key)}`, '复盘本次 →', 'text-link')}</article>`).join('')}</div><div class="history-pagination"><button class="btn secondary" data-action="history-page" data-page="${page-1}" ${page <= 1 ? 'disabled' : ''}>上一页</button><span>第 ${page} / ${pages} 页</span><button class="btn secondary" data-action="history-page" data-page="${page+1}" ${page >= pages ? 'disabled' : ''}>下一页</button></div>` : `<div class="empty-state"><h3>${filter === 'all' ? '完成一次挑战，就有一份复盘' : '这个关卡还没有挑战记录'}</h3><p>这里按每次提交保存记录，重新挑战后仍能回看以前的判断。</p>${link(filter === 'all' ? '#/challenges' : `#/challenge/${filter}`, '开始挑战')}</div>`}</section>`;
}
export function ruleHints(risk, value) {
  return risk.points.map(p => pill(`${value.includes(p) ? '✓ 已出现' : '○ 请自查'}：${e(p)}`, value.includes(p) ? 'green' : 'amber-bg')).join('');
}
