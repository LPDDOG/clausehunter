import { cases, types } from './data/cases.js';
import { risks, sources } from './data/risks.js';
import { scoreCase } from './lib/scoring.js';
import { load, save, fresh } from './lib/storage.js';
import { badges, unlocked } from './lib/achievements.js';
import { escapeHTML as e, icon, link, pill } from './components/ui.js';
import { config } from './config.js';
import { createBackup, parseBackup, mergeBackup, MAX_BACKUP_BYTES } from './lib/backup.js';
import { recordsToolbar, historyList, attemptId, formatDate, ruleHints } from './components/records.js';

const loaded = load();
let state = loaded.data;
let filter = 'all';
let revisionId = '';
let showingReference = false;
let toastTimer;
let historyFilter = 'all';
let historyPage = 1;
const disclaimer = '本网站内容仅用于法律学习和合同审查训练，不构成正式法律意见。具体合同风险应结合交易事实、适用法律及专业意见判断。';
const best = id => Math.max(0, ...state.attempts.filter(a => a.caseId === id).map(a => a.score));
const done = id => state.attempts.some(a => a.caseId === id);
const typeOf = c => types.find(t => t.id === c.type);
const riskClauses = cases.flatMap(c => c.clauses.filter(x => x.risk).map(x => ({ contract: c, clause: x })));
function toast(message) {
  const t = document.querySelector('#toast');
  t.textContent = message; t.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
}
function persist() {
  if (!save(state)) toast('浏览器无法保存本地记录。当前操作仍有效，关闭页面后可能丢失，请检查存储权限。');
}
function header(page) {
  return `<header class="header"><div class="nav-wrap"><a class="brand" href="#/" aria-label="Clause Hunter 首页"><span class="brand-mark">${icon('file', 23)}</span><span>Clause<span class="brand-light">Hunter</span><small>合同找茬大师</small></span></a><nav aria-label="主导航">${[['challenges','合同挑战'],['revision','合同修订'],['scores','我的成绩'],['about','关于项目']].map(([id,label]) => `<a ${page === id || page === 'challenge' && id === 'challenges' || page === 'history' && id === 'scores' ? 'class="active" aria-current="page"' : ''} href="#/${id}">${label}</a>`).join('')}</nav><button class="theme-btn" data-action="theme" aria-label="切换${state.theme === 'dark' ? '浅色' : '深色'}模式">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button></div></header>`;
}
function footer() {
  return `<footer><div class="footer-top"><a class="brand" href="#/">${icon('shield')} Clause Hunter</a><span>把每一次审查，变成一次进步。</span><span>独立学习 · 本地保存 · 免费使用</span></div><p>${disclaimer}</p><div class="footer-bottom"><span>© ${new Date().getFullYear()} Clause Hunter · 为审慎思考而设计</span><a href="#/about">关于这个项目 ↗</a></div></footer>`;
}
function card(c, index) {
  const t = typeOf(c); const isDone = done(c.id);
  return `<a class="case-card" href="#/challenge/${c.id}"><div class="card-top"><span class="type-icon ${t.color}">${t.icon}</span>${pill(isDone ? `最佳 ${best(c.id)} 分` : c.difficulty, isDone ? 'green' : '')}</div><div class="eyebrow">${t.name} <span> / ${String(index + 1).padStart(2, '0')}</span></div><h3>${c.title}</h3><p>${c.subtitle}</p><div class="case-meta"><span>◷ 约 ${c.minutes} 分钟</span><span>6 条审查条款</span><span class="card-arrow">${icon('arrow',18)}</span></div></a>`;
}
function home() {
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow blue"><span class="live-dot"></span> 让法律知识，成为审查直觉</div><h1>你能发现合同里<br>隐藏的<span class="blue">风险</span>吗？<span class="title-dot"></span></h1><p class="hero-desc">在真实感商业场景中，训练你的合同审查能力。<br>从发现疑点到动手修订，让每一份合同都经得起推敲。</p><div class="hero-actions">${link('#/challenge/purchase-1', `开始挑战 ${icon('arrow',18)}`)}${link('#/challenges','查看训练关卡','btn secondary')}</div><div class="hero-proof"><span>${icon('check',15)} 无需注册</span><span>${icon('check',15)} 即时解析</span><span>${icon('check',15)} 进度本地保存</span></div></div><div class="preview-scene"><div class="document-preview"><div class="document-toolbar"><span><i></i><i></i><i></i></span><span>采购合同_审查中.pdf</span>${icon('file',15)}</div><div class="paper"><div class="document-kicker">CONTRACT REVIEW / 001</div><h3>办公设备采购合同</h3><div class="paper-parties">甲方：星澜科技有限公司<br>乙方：恒信设备供应有限公司</div><div class="paper-line"></div><h4>第二条 &nbsp; 付款安排</h4><p>甲方应在签约后三日内<span class="highlight">支付全部合同价款80万元</span>，乙方无需提供履约担保。</p><div class="preview-note"><span>⚑ 潜在风险</span><small>全额预付，缺少履约保障</small></div><h4>第四条 &nbsp; 验收方式</h4><p>设备送达后，以<span class="highlight amber">“能正常使用”</span>为标准验收，不另约定测试流程。</p><div class="paper-line short"></div><div class="paper-line"></div><div class="paper-stamp">CH<br><small>REVIEW</small></div></div></div><div class="floating-chip">${icon('search',22)}<span><strong>发现风险，是第一步</strong><small>理解风险，才是关键。</small></span><span class="chip-check">✓</span></div></div></section>
    <div class="stat-strip"><div><strong>05<span>种</span></strong><p>常见商业合同</p></div><div><strong>10<span>个</span></strong><p>独立业务场景</p></div><div><strong>30<span>处</span></strong><p>核心风险解析</p></div><div><strong>100<span>%</span></strong><p>免费 · 无需登录</p></div></div>
    <section class="section"><div class="section-heading"><div><div class="eyebrow blue">LEARN BY DOING</div><h2>像审查真实合同一样学习</h2></div><p>不只记住答案，更学会提出正确的问题。</p></div><div class="feature-grid">${[['search','01','发现隐藏风险','站在具体交易一方的立场，点击条款，标记你认为值得关注的问题。'],['chart','02','理解风险逻辑','查看评分与逐条解析，区分合规底线、商业风险和谈判空间。'],['edit','03','动手完善条款','写下自己的修改方案，对照参考文本，将判断变成可执行的条款。']].map(([ic,n,title,desc]) => `<article class="feature"><div>${icon(ic,23)}<span>${n}</span></div><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div></section>
    <section class="section home-cases"><div class="section-heading"><div><div class="eyebrow blue">YOUR NEXT CHALLENGE</div><h2>从一份合同开始</h2></div>${link('#/challenges',`全部 10 个关卡 ${icon('arrow',17)}`,'text-link')}</div><div class="case-grid">${[cases[0],cases[2],cases[6]].map(c=>card(c,cases.indexOf(c))).join('')}</div><div class="topic-row">${types.map(t=>link(`#/challenges/${t.id}`,`${t.icon} ${t.name}`,'topic-link')).join('')}</div></section><section class="callout"><div>${icon('shield',28)}<h3>合同审查，从来不只有“对”与“错”。</h3><p>在交易背景中理解风险，在商业目标中寻找平衡。</p></div>${link('#/challenge/purchase-1','开启第一次审查 →')}</section>`;
}
function challenges(type) {
  if (type && types.some(t=>t.id===type)) filter = type;
  const filtered = cases.filter(c=>filter === 'all' || c.type === filter);
  return `<div class="page-intro"><div class="eyebrow blue">CONTRACT CHALLENGES</div><h1>选择你的下一份合同</h1><p>五类商业场景，十次独立审查。每一个疑点，都值得认真推敲。</p></div><div class="list-summary"><span>${icon('file')} 训练题库 <strong>10</strong></span><span>已完成 <strong>${new Set(state.attempts.map(a=>a.caseId)).size} / 10</strong></span></div><div class="filters" role="group" aria-label="合同类型筛选">${[{id:'all',name:'全部合同'},...types].map(t=>`<button class="filter ${filter===t.id?'selected':''}" data-action="filter" data-id="${t.id}" aria-pressed="${filter===t.id}">${t.name}</button>`).join('')}</div><div class="case-grid all-cases">${filtered.map(c=>card(c,cases.indexOf(c))).join('')}</div><div class="info-note">${icon('shield')} 你将代表指定一方审查合同。偏向对方的条款并不当然违法，请结合业务背景判断。</div>`;
}
function challenge(c) {
  const draft = state.drafts[c.id];
  const selected = new Set(Array.isArray(draft?.selected) ? draft.selected : []);
  const result = draft?.submitted ? scoreCase(c, selected) : null;
  const status = x => !result ? selected.has(x.id) ? 'marked' : '' : x.risk ? selected.has(x.id) ? 'correct' : 'missed' : selected.has(x.id) ? 'incorrect' : '';
  const statusText = x => !result ? selected.has(x.id) ? '⚑ 已标记' : '点击标记' : x.risk ? selected.has(x.id) ? '✓ 正确识别' : '△ 漏判风险' : selected.has(x.id) ? '× 误判' : '— 无主要风险';
  return `<div class="breadcrumbs">${link('#/challenges',`${icon('back',16)} 返回关卡列表`,'text-link')}<span>/</span><span>${typeOf(c).name}</span></div><div class="challenge-title"><div><div class="eyebrow blue">CASE ${String(cases.indexOf(c)+1).padStart(2,'0')} / CONTRACT REVIEW</div><h1>${c.title}</h1></div>${pill(result ? '审查已完成' : '审查进行中',result?'green':'blue-bg')}</div><div class="scenario"><div><span class="field-label">业务背景</span><p>${c.background}</p></div><div><span class="field-label">你的审查立场</span><strong>${c.role}</strong><p>${c.goal}</p></div></div>
  <div class="review-layout"><section class="contract-panel"><div class="panel-heading"><span>${icon('file')} 合同条款</span><small>${result?'查看标记结果及下方解析':'点击条款，标记或取消潜在风险'}</small></div><div class="contract-paper"><div class="contract-doc-title"><small>模拟商业合同 · 教学节选</small><h2>${c.title.includes('合同')?c.title:typeOf(c).name+' · 合同节选'}</h2><p>审查视角：${c.role}</p></div>${c.clauses.map((x,i)=>`<button class="clause ${status(x)}" ${result?'disabled':''} data-action="toggle-clause" data-case="${c.id}" data-id="${x.id}" aria-pressed="${selected.has(x.id)}"><span class="clause-head"><strong>第${['一','二','三','四','五','六'][i]}条 &nbsp; ${x.title}</strong><span>${statusText(x)}</span></span><span class="clause-text">${x.text}</span></button>`).join('')}<div class="document-end">— 合同节选结束 —</div></div></section><aside class="workbench"><div class="panel-heading">${icon('search')} 审查工作台</div>${result?reportSummary(c,result):`<div class="bench-content"><div class="bench-label">已标记潜在风险</div><div class="marked-number">${selected.size}<span> / ${c.clauses.length} 条条款</span></div><div class="progress-track"><div style="width:${selected.size / c.clauses.length*100}%"></div></div><p class="muted small">标记数量不等于审查完成度。请逐条阅读后提交。</p><div class="marked-list">${selected.size?c.clauses.filter(x=>selected.has(x.id)).map(x=>`<div><span>⚑ ${x.title}</span><button data-action="toggle-clause" data-case="${c.id}" data-id="${x.id}" aria-label="取消标记${x.title}">×</button></div>`).join(''):`<div class="empty-small">${icon('file',32)}<p>从左侧合同中发现第一处疑点</p><small>也可以使用 Tab 与 Enter 标记</small></div>`}</div><button class="btn primary full" data-action="submit" data-id="${c.id}">提交审查结果 ${icon('arrow',17)}</button><p class="save-note">${icon('check',13)} 标记进度自动保存</p></div><div class="bench-tip"><strong>审查提示</strong><p>关注“谁来承担风险”“义务是否明确”“发生问题如何退出”。无需把每一条都标为风险。</p></div>`}</aside></div>${result?feedback(c,selected):''}`;
}
function reportSummary(c,r) {
  return `<div class="bench-content"><div class="bench-label">本次审查得分</div><div class="score-number ${r.score===100?'green-text':''}">${r.score}<small>/ 100</small></div><div class="result-counts"><div><strong>${r.correct}</strong><span>正确识别</span></div><div><strong>${r.missed}</strong><span>漏判</span></div><div><strong>${r.falsePositive}</strong><span>误判</span></div></div><div class="best-line">本关最佳成绩 <strong>${best(c.id)} 分</strong></div><details class="formula"><summary>查看评分计算</summary><p>得分 = max(0, 四舍五入(100 × 正确识别数 ÷ 实际风险数 − 15 × 误判数))</p><p>本次：100 × ${r.correct} ÷ ${r.total} − 15 × ${r.falsePositive}，最终为 ${r.score} 分。漏判通过降低识别比例扣分，不重复扣分。</p></details><button class="btn primary full" data-action="retry" data-id="${c.id}">重新挑战</button>${link('#/challenges','返回关卡列表','btn secondary full')}</div>`;
}
function feedback(c,selected) {
  return `<section class="section feedback"><div class="section-heading"><div><div class="eyebrow blue">REVIEW REPORT</div><h2>逐条看懂每一处判断</h2></div><p>风险等级为教学场景中的相对评级。</p></div>${c.clauses.map((x,i)=>{
    const r = risks[x.risk];
    return `<details class="feedback-item" ${r?'open':''}><summary><span>${pill(r ? selected.has(x.id)?'正确识别':'漏判风险' : selected.has(x.id)?'误判':'中性条款',r?selected.has(x.id)?'green':'amber-bg':selected.has(x.id)?'red':'')}<strong>第${i+1}条 · ${r?r.title:x.title}</strong></span><span class="expand-icon">＋</span></summary><div class="feedback-body"><div class="original"><span class="field-label">原始条款</span><p>${x.text}</p></div>${r?`<div class="risk-meta">${pill(r.level+'风险',r.level==='高'?'red':'amber-bg')}${pill(r.nature)}</div><div class="analysis-grid"><div><h4>风险原因</h4><p>${r.reason}</p></div><div><h4>商业影响</h4><p>${r.impact}</p></div></div><h4>修改建议</h4><p>${r.suggestion}</p><div class="reference"><div><strong>参考修改文本</strong><button class="text-link" data-action="copy" data-id="${x.risk}">${icon('copy',15)} 复制条款</button></div><p>${r.reference}</p></div><div class="legal-source"><h4>法律依据与适用边界</h4><p>${r.basis}</p><a href="${sources[r.source].url}" target="_blank" rel="noopener noreferrer">${sources[r.source].title} ↗</a><small>来源核对日期：2026-10-23。适用范围及后续更新应在真实交易中再次核对。</small></div>${link(`#/revision/${x.id}`,`练习修订这条条款 ${icon('arrow',16)}`,'text-link')}`:`<p>${x.neutral}</p>`}</div></details>`;
  }).join('')}</section>`;
}
function revision(id) {
  const item = riskClauses.find(x=>x.clause.id === (id || revisionId)) || riskClauses[0];
  revisionId = item.clause.id;
  const { clause:x, contract:c } = item; const r=risks[x.risk];
  const value = state.revisions[x.id] || '';
  return `<div class="page-intro"><div class="eyebrow blue">CLAUSE WORKSHOP</div><h1>把风险，改成更好的条款。</h1><p>用自己的语言提出方案，再与参考文本对照思考。</p></div><label class="field-label" for="revision-select">选择练习条款</label><select id="revision-select">${cases.map(c=>`<optgroup label="${c.title}">${c.clauses.filter(x=>x.risk).map(x=>`<option value="${x.id}" ${x.id===revisionId?'selected':''}>${x.title}</option>`).join('')}</optgroup>`).join('')}</select><div class="revision-context"><span>${pill(typeOf(c).name)} ${pill(c.role,'blue-bg')}</span><p><strong>业务背景：</strong>${c.background}</p><p><strong>审查目标：</strong>${c.goal}</p></div><div class="revision-grid"><section class="panel"><div class="panel-heading">${icon('file')} 原始条款</div><div class="padded"><h3>${x.title}</h3><p class="original revision-original">${x.text}</p><h4>本次修订方向</h4><p>${r.suggestion}</p><div class="info-note">不追求与示例逐字一致，重点是解决问题并保持可执行性。</div></div></section><section class="panel"><div class="panel-heading">${icon('edit')} 我的修订</div><div class="padded"><label class="field-label" for="revision-input">写下你认为更合理的条款</label><textarea id="revision-input" maxlength="20000" placeholder="试着明确权利义务、时间节点以及违约后的处理方式……">${e(value)}</textarea><div class="editor-meta"><span id="char-count">${value.length} 字</span><span>自动保存到本机</span></div><button class="btn primary full" data-action="reference">查看参考方案 ${icon('arrow',17)}</button></div></section></div>${showingReference?`<section class="reference-comparison"><div class="section-heading"><div><div class="eyebrow blue">COMPARE & REFLECT</div><h2>对照与反思</h2></div></div><div class="revision-grid"><div class="panel padded"><h3>你的修改</h3><p class="user-text">${value.trim()?e(value):'你尚未输入修改文本。可先阅读参考，再回到编辑框练习。'}</p></div><div class="panel padded"><div class="copy-heading"><h3>参考方案</h3><button class="text-link" data-action="copy" data-id="${x.risk}">${icon('copy',16)} 复制</button></div><p>${r.reference}</p></div></div><div class="rule-result"><h3>规则化自查</h3><p>系统仅提供规则化检查，不代表对法律文本质量的完整判断。</p><div id="rule-hints">${ruleHints(r,value)}</div><p class="small muted">这里只检测字面词语，不能判断语义、逻辑或有效性；使用其他表述不代表错误，出现关键词也不代表条款合格。</p><h4>修改时请考虑</h4><p>${r.reason} ${r.suggestion}</p></div></section>`:''}`;
}
function scores() {
  const attempts = state.attempts; const completed = cases.filter(c=>done(c.id));
  const average = attempts.length ? Math.round(attempts.reduce((n,a)=>n+a.score,0)/attempts.length) : 0;
  return `<div class="page-intro"><div class="eyebrow blue">YOUR LEARNING RECORD</div><h1>每一次审查，都留下进步。</h1><p>记录保存在当前浏览器，不会自动同步。你可以导出备份后手动迁移。</p></div>${recordsToolbar()}<div class="score-stats">${[['已完成关卡',`${completed.length}<small>/ 10</small>`],['总挑战次数',attempts.length],['历史平均分',`${average}<small>/ 100</small>`],['已解锁成就',`${state.achievements.length}<small>/ 5</small>`]].map(([l,v])=>`<div class="panel padded"><span class="field-label">${l}</span><strong>${v}</strong></div>`).join('')}</div><div class="scores-grid"><section class="panel padded"><h3>各合同主题表现</h3><p class="muted small">已完成关卡的最佳成绩均值；未练习主题单独标注。</p>${types.map(t=>{const cs=cases.filter(c=>c.type===t.id&&done(c.id)); const n=cs.length?Math.round(cs.reduce((n,c)=>n+best(c.id),0)/cs.length):0;return `<div class="bar-row"><span>${t.name}</span><div class="progress-track" role="meter" aria-label="${t.name}最佳平均分" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><div style="width:${n}%"></div></div><strong>${cs.length?n+' 分':'未练习'}</strong></div>`}).join('')}</section><section class="panel padded"><h3>成就收藏</h3><div class="badge-grid">${badges.map(b=>`<div class="badge ${state.achievements.includes(b.id)?'unlocked':''}"><span>${b.icon}</span><strong>${b.name}</strong><small>${b.description}</small><em>${state.achievements.includes(b.id)?'已解锁':'待解锁'}</em></div>`).join('')}</div></section></div><section class="section"><div class="section-heading"><h2>关卡记录</h2><button class="text-link danger" data-action="reset">重置本地训练记录</button></div>${attempts.length?`<div class="records">${cases.map(c=>`<div><span><small>${typeOf(c).name}</small><strong>${c.title}</strong></span><span>${done(c.id)?`最佳 <b>${best(c.id)}</b> 分`:'尚未完成'}</span>${link(`#/challenge/${c.id}`,done(c.id)?'查看关卡 →':'开始挑战 →','text-link')}</div>`).join('')}</div>`:`<div class="empty-state">${icon('chart',40)}<h3>第一份审查记录，等你开启</h3><p>完成任意关卡，即可在这里查看成绩与成就。</p>${link('#/challenges','去选一份合同')}</div>`}</section>${historyList(state,cases,historyFilter,historyPage)}`;
}
function history(id) {
  const attempt = state.attempts.find((a, i) => attemptId(a, i) === id);
  const c = cases.find(c => c.id === attempt?.caseId);
  if (!c) return `<div class="empty-state"><h1>找不到这份挑战记录</h1><p>记录可能已在本机重置，请从我的成绩重新选择。</p>${link('#/scores', '返回我的成绩')}</div>`;
  const result = scoreCase(c, attempt.selected);
  return `<div class="breadcrumbs">${link('#/scores', `${icon('back',16)} 返回我的成绩`, 'text-link')}<span>/</span><span>历史复盘</span></div><div class="page-intro"><div class="eyebrow blue">PAST REVIEW</div><h1>${c.title}</h1><p>提交时间：${e(formatDate(attempt.date))} · 保留当时的标记，按当前题库展示解析。</p></div><div class="history-report panel padded"><div><span class="field-label">本次记录</span><strong class="history-score">${result.score}<small> / 100</small></strong></div><div class="result-counts"><div><strong>${result.correct}</strong><span>正确识别</span></div><div><strong>${result.missed}</strong><span>漏判</span></div><div><strong>${result.falsePositive}</strong><span>误判</span></div></div>${link(`#/challenge/${c.id}`, '前往本关练习 →', 'btn secondary')}</div><div class="info-note">审查立场：${c.role}。${c.goal} 此页不会改动你正在进行的挑战。</div>${feedback(c, new Set(attempt.selected))}`;
}
function about() {
  return `<div class="page-intro"><div class="eyebrow blue">ABOUT THE PROJECT</div><h1>让审查能力，在实践中生长。</h1><p>一个关于法律、商业与审慎判断的学习项目。</p></div><section class="panel padded about-lead"><span class="type-icon blue">${icon('shield',28)}</span><h2>Clause Hunter｜合同找茬大师</h2><p>Clause Hunter 是一个面向法学生与法律从业者的交互式合同审查训练项目，旨在通过模拟商业合同场景，帮助用户建立风险识别、商业理解与条款修订意识。</p><p>这里的案例均为虚构教学场景。训练中区分可能涉及违法或无效的合规风险、并不当然违法的商业风险，以及可以进一步优化的谈判安排。每次判断都应回到审查方立场与业务事实。</p></section><div class="feature-grid about-tech">${[['前端技术','原生 HTML、CSS 与 JavaScript；无需运行时依赖，使用哈希路由，支持静态托管与手机访问。'],['数据存储方式','使用浏览器 LocalStorage 保存挑战记录、条款标记、修订草稿和主题偏好，无需注册。'],['规则化评分设计','按正确识别比例计分，误判每条扣15分，最低0分。每次评分均可查看计算过程。'],['AI辅助开发说明','本项目的代码与初版教学素材由AI辅助编写，法条参考经公开来源核对，仍可能存在疏漏；未经过执业律师逐案复核。运行期间不调用AI，也不提供AI法律批改。']].map(([t,d])=>`<article class="panel padded"><h3>${t}</h3><p>${d}</p></article>`).join('')}</div><section class="panel padded source-list"><h3>法律来源与内容维护</h3><p>来源核对日期：2026-10-23。真实合同中的地区规则、司法解释、行业要求及跨境法律适用需要另外核验。</p>${Object.values(sources).map(s=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} ↗</a>`).join('')}<p>跨境案例应先识别CISG、补充准据法、约定交易规则与争议解决机制的关系。贸易术语不决定合同的全部法律问题。</p></section><section class="callout"><div><h3>开放、轻量，也方便继续完善。</h3><p>${config.githubUrl?'欢迎在项目仓库查看源码。':'GitHub 仓库链接尚未配置，可在 src/config.js 中填写。'}</p></div>${/^https:\/\/github\.com\//.test(config.githubUrl)?`<a class="btn secondary" href="${e(config.githubUrl)}" target="_blank" rel="noopener noreferrer">访问 GitHub ↗</a>`:''}</section>`;
}
function render() {
  const [page='',id=''] = location.hash.replace(/^#\/?/,'').split('/');
  let content;
  if (!page) content=home();
  else if(page==='challenges') content=challenges(id);
  else if(page==='challenge') {const c=cases.find(x=>x.id===id);content=c?challenge(c):`<div class="empty-state"><h1>找不到这个关卡</h1>${link('#/challenges','返回关卡列表')}</div>`;}
  else if(page==='revision') content=revision(id);
  else if(page==='scores') content=scores();
  else if(page==='history') content=history(id);
  else if(page==='about') content=about();
  else content=`<div class="empty-state"><h1>页面不存在</h1>${link('#/','返回首页')}</div>`;
  document.documentElement.dataset.theme=state.theme;
  document.querySelector('#app').innerHTML=`${header(page)}<main id="main" class="container ${page?'inner-page':''}" tabindex="-1">${content}</main>${footer()}<dialog id="confirm-dialog"><div class="dialog-content"></div></dialog>`;
  document.title=`${({'challenges':'合同挑战','challenge':'合同审查','revision':'合同修订','scores':'我的成绩','history':'历史复盘','about':'关于项目'})[page] || '发现合同里的隐藏风险'} · Clause Hunter`;
}
function confirmAction(title,message,label,callback) {
  const d=document.querySelector('#confirm-dialog');
  d.querySelector('.dialog-content').innerHTML=`<h2 id="dialog-title">${title}</h2><p>${message}</p><div class="dialog-actions"><button class="btn secondary" id="cancel-dialog">取消</button><button class="btn primary" id="accept-dialog">${label}</button></div>`;
  d.setAttribute('aria-labelledby','dialog-title');d.showModal();
  d.querySelector('#cancel-dialog').onclick=()=>d.close();
  d.querySelector('#accept-dialog').onclick=()=>{d.close();callback();};
}
function submit(c) {
  const selected = state.drafts[c.id]?.selected || [];
  const result=scoreCase(c,selected);
  state.drafts[c.id]={selected,submitted:true};
  state.attempts.push({id:crypto.randomUUID(),caseId:c.id,...result,selected:[...selected],date:new Date().toISOString()});
  const next=unlocked(state.attempts,cases), newBadges=next.filter(id=>!state.achievements.includes(id));
  state.achievements=next; persist();render();
  document.querySelector('.workbench').scrollIntoView({behavior:'smooth',block:'start'});
  toast(newBadges.length?`✦ 解锁成就：${newBadges.map(id=>badges.find(b=>b.id===id).name).join('、')}`:'审查已提交，完整解析已展开。');
}
document.addEventListener('click',async ev=>{
  if (ev.target.closest('.skip')) { ev.preventDefault(); document.querySelector('#main').focus(); return; }
  const b=ev.target.closest('[data-action]');if(!b)return;
  const {action,id}=b.dataset;
  if(action==='theme'){state.theme=state.theme==='light'?'dark':'light';persist();render();}
  if(action==='filter'){filter=id;render();}
  if(action==='history-page') { historyPage = Math.max(1, Number(b.dataset.page) || 1); render(); document.querySelector('#history-list')?.scrollIntoView({behavior:'smooth'}); }
  if(action==='export-backup') {
    try {
      const blob = new Blob([createBackup(state)], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `clause-hunter-${new Date().toISOString().slice(0,10)}.json`;
      document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      backupStatus('备份已准备下载，包含成绩、审查进度与修订草稿。请妥善保管文件。');
    } catch { backupStatus('未能生成备份，请重试。现有记录未改变。', true); }
  }
  if(action==='choose-backup') document.querySelector('#backup-file').click();
  if(action==='toggle-clause'){
    const c=cases.find(x=>x.id===b.dataset.case);if(!c||state.drafts[c.id]?.submitted)return;
    const s=new Set(state.drafts[c.id]?.selected||[]);s.has(id)?s.delete(id):s.add(id);
    state.drafts[c.id]={selected:[...s],submitted:false};persist();
    const scroll=window.scrollY;render();window.scrollTo(0,scroll);
    document.querySelector(`.clause[data-id="${id}"]`)?.focus({preventScroll:true});
  }
  if(action==='submit'){
    const c=cases.find(x=>x.id===id);if(state.drafts[id]?.submitted)return;
    const count=state.drafts[id]?.selected?.length||0;
    confirmAction('提交本次审查？',count?`你已标记 ${count} 条潜在风险。提交后将计分并展示答案。`:'你尚未标记任何条款，提交后得分为0。你也可以取消并继续审查。','确认提交',()=>submit(c));
  }
  if(action==='retry') {state.drafts[id]={selected:[],submitted:false};persist();render();toast('已开启新一轮审查，历史最佳成绩已保留。');window.scrollTo({top:0,behavior:'smooth'});}
  if(action==='reference'){showingReference=true;render();document.querySelector('.reference-comparison').scrollIntoView({behavior:'smooth'});}
  if(action==='copy'){
    try {await navigator.clipboard.writeText(risks[id].reference);toast('参考条款已复制');}
    catch {const ta=document.createElement('textarea');ta.value=risks[id].reference;document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();toast(ok?'参考条款已复制':'无法自动复制，请选中参考文本手动复制。');}
  }
  if(action==='reset') confirmAction('重置本地训练记录？','将清除挑战成绩、成就、审查进度和修订草稿，无法恢复。主题偏好保留。','确认清除',()=>{state={...fresh(),theme:state.theme};persist();render();toast('本地训练记录已清除');});
});
document.addEventListener('input',ev=>{
  if(ev.target.id!=='revision-input')return;
  state.revisions[revisionId]=ev.target.value;persist();document.querySelector('#char-count').textContent=`${ev.target.value.length} 字`;
  // 只更新对照内容，不重建编辑框，避免输入时光标与焦点跳动。
  if (showingReference) {
    const risk = risks[riskClauses.find(x=>x.clause.id===revisionId).clause.risk];
    document.querySelector('.user-text').textContent = ev.target.value.trim() ? ev.target.value : '你尚未输入修改文本。可先阅读参考，再回到编辑框练习。';
    document.querySelector('#rule-hints').innerHTML = ruleHints(risk, ev.target.value);
  }
});
function backupStatus(message, error = false) {
  const target = document.querySelector('#backup-status');
  if (target) { target.textContent = message; target.classList.toggle('error',error); }
  else toast(message);
}
document.addEventListener('change',async ev=>{
  if(ev.target.id==='revision-select'){showingReference=false;location.hash=`/revision/${ev.target.value}`;}
  if(ev.target.id==='history-filter'){historyFilter=ev.target.value;historyPage=1;render();document.querySelector('#history-filter').focus({preventScroll:true});}
  if(ev.target.id==='backup-file') {
    const file = ev.target.files?.[0]; ev.target.value=''; if(!file)return;
    try {
      if(file.size>MAX_BACKUP_BYTES)throw Error('文件超过5MB，无法导入。');
      const incoming = parseBackup(await file.text());
      const preview = mergeBackup(state,incoming).added;
      if (!preview.attempts && !preview.drafts && !preview.revisions) { backupStatus('备份中的记录已存在，没有新增内容。'); return; }
      confirmAction('合并这份训练备份？',`将新增 ${preview.attempts} 次挑战、${preview.drafts} 份审查进度、${preview.revisions} 份修订草稿。本机已有进度和非空草稿优先保留，重复挑战不重复计数。分数与成就按当前题库重新计算。`,'确认合并',()=>{
        const merged=mergeBackup(state,incoming);
        if(!save(merged.data)) { backupStatus('本地存储空间不足或不可用，导入未生效，现有记录保持不变。',true); return; }
        state=merged.data;render();backupStatus(`导入完成，新增 ${merged.added.attempts} 次挑战。原有记录已保留。`);
      });
    } catch(error) { backupStatus(error.message || '无法读取备份文件，现有记录未改变。',true); }
  }
});
window.addEventListener('hashchange',()=>{showingReference=false;render();window.scrollTo(0,0);document.querySelector('#main').focus({preventScroll:true});});
render();
if(loaded.warning)toast(loaded.warning);
