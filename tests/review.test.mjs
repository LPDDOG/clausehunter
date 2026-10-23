import test from 'node:test';
import assert from 'node:assert/strict';
import { cases, types } from '../src/data/cases.js';
import { fresh, load, KEY } from '../src/lib/storage.js';
import { scoreCase } from '../src/lib/scoring.js';
import { reviewItems, reviewSource, latestAttempts, validateReviewProgress, mergeReviewProgress } from '../src/lib/review.js';
import { reviewList, reviewExercise } from '../src/components/review.js';
import { createBackup, parseBackup, mergeBackup } from '../src/lib/backup.js';
const c=cases[0], missed=c.clauses.find(x=>x.risk), neutral=c.clauses.find(x=>!x.risk);
const attempt=(selected,date='2026-10-23T00:00:00.000Z')=>({caseId:c.id,selected,date,...scoreCase(c,selected)});
const progress=(a,judgment,reviewedAt='2026-10-23T01:00:00.000Z')=>({source:reviewSource(a),judgment,reviewedAt});

test('按最新完整挑战收集错漏，包含漏判与误判，重复历史不重复收集',()=>{
  const state=fresh();state.attempts=[attempt([neutral.id]),attempt([neutral.id])];
  const items=reviewItems(state);
  assert.equal(items.length,4);assert.equal(items.filter(x=>x.error==='missed').length,3);
  assert.equal(items.find(x=>x.clause.id===neutral.id).error,'falsePositive');
  assert.equal(new Set(items.map(x=>x.clause.id)).size,items.length);
});
test('导入历史顺序不决定最新；最新全对后清单清空',()=>{
  const correct=c.clauses.filter(x=>x.risk).map(x=>x.id);
  const newer=attempt(correct,'2026-10-23T02:00:00.000Z'),older=attempt([]);
  assert.equal(latestAttempts([newer,older]).get(c.id),newer);
  const state=fresh();state.attempts=[newer,older];assert.equal(reviewItems(state).length,0);
});
test('回练答对移入已答对，答错保留，新挑战会使旧回练失效',()=>{
  const state=fresh(), a=attempt([]);state.attempts=[a];
  const original=JSON.stringify(state.attempts);
  state.reviewProgress[missed.id]=progress(a,true);
  assert.equal(reviewItems(state).find(x=>x.clause.id===missed.id).resolved,true);
  state.reviewProgress[missed.id]=progress(a,false);
  assert.equal(reviewItems(state).find(x=>x.clause.id===missed.id).resolved,false);
  state.reviewProgress[missed.id]=progress(a,true);
  assert.equal(JSON.stringify(state.attempts),original);
  state.attempts.push(attempt([],'2026-10-23T03:00:00.000Z'));
  const item=reviewItems(state).find(x=>x.clause.id===missed.id);
  assert.equal(item.resolved,false);assert.equal(item.progress,null);
});
test('误判正常条款的回练以不标记为正确，成功不改变原挑战分数',()=>{
  const state=fresh(),a=attempt([neutral.id]);state.attempts=[a];
  state.reviewProgress[neutral.id]=progress(a,false);
  assert.equal(reviewItems(state).find(x=>x.clause.id===neutral.id).resolved,true);
  assert.equal(state.attempts[0].score,a.score);
});
test('旧存储和v1.1备份兼容；损坏回练字段仅重置回练',()=>{
  const state=fresh();state.attempts=[attempt([])];delete state.reviewProgress;
  const storage={getItem:k=>k===KEY?JSON.stringify(state):null};
  assert.deepEqual(load(storage).data.reviewProgress,{});
  const old=JSON.parse(createBackup(state));delete old.data.reviewProgress;
  assert.deepEqual(parseBackup(JSON.stringify(old)).reviewProgress,{});
  state.reviewProgress={bad:{}};
  const loaded=load(storage);assert.ok(loaded.warning);assert.equal(loaded.data.attempts.length,1);
  assert.deepEqual(loaded.data.reviewProgress,{});
});
test('备份携带回练进度并可幂等恢复，不信任失效的源标识',()=>{
  const state=fresh(),a=attempt([]);state.attempts=[a];state.reviewProgress[missed.id]=progress(a,true);
  const incoming=parseBackup(createBackup(state)),merged=mergeBackup(fresh(),incoming);
  assert.equal(merged.added.reviews,1);
  assert.equal(reviewItems(merged.data).find(x=>x.clause.id===missed.id).resolved,true);
  assert.equal(mergeBackup(merged.data,incoming).added.reviews,0);
  const legacy=JSON.parse(createBackup(state));delete legacy.data.reviewProgress;
  assert.deepEqual(mergeBackup(merged.data,parseBackup(JSON.stringify(legacy))).data.reviewProgress,merged.data.reviewProgress);
  incoming.reviewProgress[missed.id].source='untrusted';
  assert.equal(reviewItems({...state,reviewProgress:incoming.reviewProgress}).find(x=>x.clause.id===missed.id).resolved,false);
});
test('跨设备冲突优先有效源，再按复习时间，更新的失败会重新待复习',()=>{
  const a=attempt([]),newer=attempt([],'2026-10-23T02:00:00.000Z');
  let out=mergeReviewProgress({[missed.id]:progress(newer,true)}, {[missed.id]:progress(a,false,'2026-10-23T05:00:00.000Z')},[a,newer]);
  assert.equal(out[missed.id].judgment,true);
  out=mergeReviewProgress({[missed.id]:progress(newer,true)}, {[missed.id]:progress(newer,false,'2026-10-23T05:00:00.000Z')},[a,newer]);
  assert.equal(out[missed.id].judgment,false);
  assert.throws(()=>validateReviewProgress({[missed.id]:{source:'x',judgment:true,reviewedAt:'invalid'}}));
  assert.throws(()=>validateReviewProgress({unknown:progress(a,true)}));
});
test('回练提交前不包含解析、风险级别或上次答案；支持状态和主题空状态',()=>{
  const state=fresh();state.attempts=[attempt([])];
  const item=reviewItems(state)[0];
  const html=reviewExercise(item,{choice:null,submitted:false},'隐藏的反馈文本',null);
  assert.ok(!html.includes('隐藏的反馈文本'));assert.ok(!html.includes('上次完整挑战中'));
  assert.ok(html.includes('data-action="review-submit" disabled'));
  assert.ok(reviewList(state,types,'done').includes('这个筛选条件下没有条款'));
  assert.ok(reviewList(state,types,'pending','labor').includes('这个筛选条件下没有条款'));
});
