import test from 'node:test';
import assert from 'node:assert/strict';
import { cases, types } from '../src/data/cases.js';
import { risks, sources } from '../src/data/risks.js';
import { scoreCase } from '../src/lib/scoring.js';
import { unlocked } from '../src/lib/achievements.js';
import { fresh, load, save, KEY } from '../src/lib/storage.js';

test('十关数据结构完整、答案和参考均可解析',()=>{
  assert.equal(cases.length,10);
  assert.equal(new Set(cases.map(c=>c.id)).size,10);
  for(const t of types)assert.equal(cases.filter(c=>c.type===t.id).length,2);
  const ids=new Set();
  for(const c of cases){
    assert.ok(c.role&&c.goal&&c.background);
    assert.ok(c.clauses.length>=5&&c.clauses.length<=8);
    assert.ok(c.clauses.filter(x=>x.risk).length>=2&&c.clauses.filter(x=>x.risk).length<=4);
    for(const x of c.clauses){
      assert.ok(!ids.has(x.id));ids.add(x.id);
      if(!x.risk)continue;
      const r=risks[x.risk]; assert.ok(r,`${x.risk} 应有解析`);
      for(const key of ['title','level','nature','reason','impact','suggestion','reference','basis'])assert.ok(r[key]);
      assert.ok(r.points.length>0);assert.ok(sources[r.source]?.url.startsWith('https://'));
    }
  }
});
for(const c of cases)test(`${c.id}：穷举所有标记组合并核对评分边界`,()=>{
  for(let mask=0;mask<2**c.clauses.length;mask++){
    const selected=c.clauses.filter((x,i)=>mask&(1<<i)).map(x=>x.id);
    const s=scoreCase(c,selected);assert.ok(s.score>=0&&s.score<=100);
    assert.equal(s.correct+s.missed,s.total);
    if(s.correct===0)assert.equal(s.score,0);
  }
  const all=c.clauses.filter(x=>x.risk).map(x=>x.id);
  assert.equal(scoreCase(c,all).score,100);
  assert.equal(scoreCase(c,[]).score,0);
  const falseId=c.clauses.find(x=>!x.risk).id;
  assert.equal(scoreCase(c,[...all,falseId]).score,85);
  assert.equal(scoreCase(c,[...all,...all]).score,100);
});
test('成就按已完成关卡及主题解锁，无标记0分不能解锁零误判',()=>{
  assert.deepEqual(unlocked([],cases),[]);
  assert.deepEqual(unlocked([{caseId:cases[0].id,...scoreCase(cases[0],[])}],cases),['first']);
  const attempts=cases.map(c=>({caseId:c.id,...scoreCase(c,c.clauses.filter(x=>x.risk).map(x=>x.id))}));
  assert.deepEqual(unlocked(attempts,cases),['first','perfect','precise','themes','all']);
});
test('本地记录、主题、修订草稿可序列化恢复，异常存储降级',()=>{
  const memory=new Map();const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
  const d=fresh();d.theme='dark';d.revisions['purchase-1-2']='分期付款';d.drafts['purchase-1']={selected:['purchase-1-2'],submitted:false};
  d.attempts.push({caseId:'purchase-1',...scoreCase(cases[0],['purchase-1-2']),selected:['purchase-1-2']});
  assert.equal(save(d,storage),true);assert.deepEqual(load(storage).data,d);
  storage.setItem(KEY,'broken');assert.ok(load(storage).warning);
  storage.setItem(KEY,JSON.stringify({...fresh(),attempts:[{}]}));assert.ok(load(storage).warning);
  assert.equal(save(d,{setItem(){throw Error('quota')}}),false);
  assert.ok(load({getItem(){throw Error('denied')}}).warning);
});
