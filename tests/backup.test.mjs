import test from 'node:test';
import assert from 'node:assert/strict';
import { cases } from '../src/data/cases.js';
import { fresh } from '../src/lib/storage.js';
import { scoreCase } from '../src/lib/scoring.js';
import { createBackup, parseBackup, mergeBackup, MAX_BACKUP_BYTES } from '../src/lib/backup.js';
import { historyList, attemptId, ruleHints } from '../src/components/records.js';
import { risks } from '../src/data/risks.js';
const c=cases[0];
function sample() {
  const state=fresh(), selected=c.clauses.filter(x=>x.risk).map(x=>x.id);
  state.attempts=[{id:'test-attempt',caseId:c.id,date:'2026-10-23T06:00:00.000Z',selected,...scoreCase(c,selected)}];
  state.drafts[c.id]={selected,submitted:true};
  state.revisions[selected[0]]='依验收节点分期付款';
  return state;
}
test('备份导出导入恢复挑战、标记和草稿，重新计算分数成就',()=>{
  const original=sample(), backup=JSON.parse(createBackup(original));
  backup.data.attempts[0].score=-999;
  const parsed=parseBackup(JSON.stringify(backup)), merged=mergeBackup(fresh(),parsed);
  assert.equal(merged.data.attempts[0].score,100);
  assert.deepEqual(merged.data.achievements,['first','perfect','precise']);
  assert.deepEqual(merged.data.drafts,original.drafts);
  assert.deepEqual(merged.data.revisions,original.revisions);
  assert.deepEqual(merged.added,{attempts:1,drafts:1,revisions:1,reviews:0});
});
test('合并幂等、保留本机未提交进度、非空草稿、主题和原始记录ID',()=>{
  const current=sample();current.theme='dark';
  current.drafts[c.id]={selected:[],submitted:false};
  current.revisions[c.clauses[1].id]='本机尚未写完的条款';
  const snapshot=JSON.stringify(current), imported=parseBackup(createBackup(sample()));
  imported.attempts[0].selected.reverse();
  const merged=mergeBackup(current,imported);
  assert.equal(JSON.stringify(current),snapshot);
  assert.equal(merged.data.attempts.length,1);
  assert.equal(merged.data.attempts[0].id,'test-attempt');
  assert.equal(merged.data.theme,'dark');
  assert.deepEqual(merged.data.drafts[current.attempts[0].caseId],current.drafts[c.id]);
  assert.deepEqual(merged.data.revisions,current.revisions);
  assert.deepEqual(merged.added,{attempts:0,drafts:0,revisions:0,reviews:0});
});
test('不同时间的相同答案保留为独立挑战，重复文件内记录去重',()=>{
  const incoming=sample(); incoming.attempts.push({...incoming.attempts[0]},{...incoming.attempts[0],date:'2026-10-23T07:00:00.000Z'});
  const result=mergeBackup(fresh(),parseBackup(createBackup(incoming)));
  assert.equal(result.data.attempts.length,2);
  assert.equal(mergeBackup(result.data,parseBackup(createBackup(incoming))).data.attempts.length,2);
});
test('无效文件、未知版本、超限和伪造条款均拒绝',()=>{
  for(const text of ['not json','null','{}',JSON.stringify({app:'other',backupVersion:1}),JSON.stringify({app:'clause-hunter',backupVersion:2}), ' '.repeat(MAX_BACKUP_BYTES+1)])assert.throws(()=>parseBackup(text));
  for(const mutate of [
    d=>d.attempts[0].caseId='unknown',
    d=>d.attempts[0].selected=['other-case-clause'],
    d=>d.attempts[0].date='invalid-date',
    d=>d.attempts=[null],
    d=>d.drafts[c.id].submitted='yes',
    d=>d.revisions[c.clauses[1].id]='x'.repeat(20001),
    d=>d.revisions.__unexpected='bad',
    d=>d.attempts=new Array(10001).fill(d.attempts[0])
  ]){const s=sample();mutate(s);assert.throws(()=>parseBackup(createBackup(s)));}
});
test('历史分页、关卡筛选和旧记录链接兼容',()=>{
  const s=sample(); delete s.attempts[0].id;
  assert.equal(attemptId(s.attempts[0],0),'legacy-0');
  for(let i=1;i<12;i++)s.attempts.push({...s.attempts[0],id:`attempt-${i}`});
  const first=historyList(s,cases,'all',1),second=historyList(s,cases,'all',2);
  assert.equal((first.match(/class="history-entry"/g)||[]).length,10);
  assert.equal((second.match(/class="history-entry"/g)||[]).length,2);
  assert.ok(second.includes('#/history/legacy-0'));
  assert.ok(historyList(s,cases,'labor-1').includes('这个关卡还没有挑战记录'));
});
test('规则提示随文本变化且仅作字面检测',()=>{
  assert.ok(ruleHints(risks.prepay,'分期 验收 返还').includes('✓ 已出现：分期'));
  assert.ok(ruleHints(risks.prepay,'另一份合理表述').includes('○ 请自查：分期'));
});
