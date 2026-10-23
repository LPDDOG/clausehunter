export function scoreCase(contract, selections) {
  const selected = new Set(selections);
  const risks = contract.clauses.filter(c => c.risk);
  const correct = risks.filter(c => selected.has(c.id)).length;
  const missed = risks.length - correct;
  const falsePositive = contract.clauses.filter(c => !c.risk && selected.has(c.id)).length;
  // 覆盖率占满分，误判每条扣 15 分；最后四舍五入并限制为 0～100。
  return { score: Math.max(0, Math.round(100 * correct / risks.length - 15 * falsePositive)), correct, missed, falsePositive, total: risks.length };
}
