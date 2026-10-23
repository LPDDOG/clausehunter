export const badges = [
  { id: 'first', icon: '✦', name: '初次审查', description: '完成第一个关卡' },
  { id: 'perfect', icon: '◎', name: '火眼金睛', description: '任意关卡获得 100 分' },
  { id: 'precise', icon: '✓', name: '零误判', description: '识别至少一处风险且单关零误判' },
  { id: 'themes', icon: '◇', name: '合同猎人', description: '完成五个不同合同主题' },
  { id: 'all', icon: '✧', name: '审查达人', description: '完成全部十个关卡' }
];
export function unlocked(attempts, cases) {
  const valid = attempts.filter(a => cases.some(c => c.id === a.caseId));
  const completed = new Set(valid.map(a => a.caseId));
  const themes = new Set(cases.filter(c => completed.has(c.id)).map(c => c.type));
  return [valid.length > 0 && 'first', valid.some(a => a.score === 100) && 'perfect', valid.some(a => a.correct > 0 && a.falsePositive === 0) && 'precise', themes.size === 5 && 'themes', completed.size === cases.length && 'all'].filter(Boolean);
}
