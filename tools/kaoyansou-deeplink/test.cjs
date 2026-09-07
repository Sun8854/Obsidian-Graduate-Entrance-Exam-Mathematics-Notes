// Offline DOM fixture based on the public Home and QuestionCard bundles.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('tools/kaoyansou-deeplink/kaoyansou-deeplink.user.js', 'utf8');
new vm.Script(source);
async function scenario(hash, startPaper = 2, pathname = '/math') {
  const clicks = [], copied = [], timers = [], listeners = {};
  let cardOpen = false, yearSelected = false, ready = false, loaded = startPaper === 2;
  function el(text = '', onClick = () => {}) {
    return {textContent: text, style: {}, children: [], selected: false,
      getClientRects: () => [1], classList: {contains: () => false},
      getAttribute: () => null, setAttribute() {}, scrollIntoView() {},
      append(child) { this.children.push(child); },
      addEventListener(type, fn) {this[type] = fn;}, click: onClick,
      querySelector: () => null, querySelectorAll: () => []};
  }
  const body = el(), chips = [1, 2, 3].map(p => {
    const c = el(['数学一', '数学二', '数学三'][p - 1], () => {
      clicks.push('paper' + p); chips.forEach(x => x.selected = false); c.selected = true;
      timers.push(setTimeout(() => {loaded = true;}, 20));
    });
    c.selected = p === startPaper; c.classList.contains = () => c.selected; return c;
  });
  const tab = el('年份汇总', () => {clicks.push('yearTab'); ready = true;});
  const year = el('', () => {clicks.push('year2017'); yearSelected = true;});
  year.classList.contains = () => yearSelected;
  year.querySelector = () => el('2017年');
  const row = el('', () => {clicks.push('question18'); cardOpen = true;});
  row.querySelector = () => el('18');
  const analysis = el('解析', () => {clicks.push('analysis'); analysis.selected = true;});
  analysis.classList.contains = () => analysis.selected;
  const card = el();
  card.querySelector = () => el('真题 · 2017年 · 18');
  card.querySelectorAll = () => [analysis];
  const document = {body, createElement: () => el(), querySelectorAll(selector) {
    return ({'.knowledge-panel__subject-chip': chips, '.practice-mode-bar__tab': [tab],
      '.year-item': ready ? [year] : [], '.year-paper-row': yearSelected && loaded ? [row] : [],
      '.single-question-dialog-surface .question-card-wrapper': cardOpen ? [card] : []})[selector] || [];
  }};
  const context = {document, location: {pathname, hash}, URLSearchParams, URL, setInterval() {},
    performance: {now: () => 1, getEntriesByType: () => loaded ? [{startTime: 2, name: 'https://zhenti.kaoyansou.cn/api/question/subject/6'}] : []},
    setTimeout(fn) {const t = setTimeout(fn, 1); timers.push(t); return t;},
    window: {addEventListener: (key, fn) => {listeners[key] = fn;}, prompt: () => null},
    GM_setClipboard: text => copied.push(text), console};
  vm.runInNewContext(source, context);
  await new Promise(resolve => setTimeout(resolve, 100));
  const panel = body.children[0];
  return {clicks, copied, panel, stop() {panel.children.find(x => x.textContent === '停止').click(); timers.forEach(clearTimeout);}};
}
(async () => {
  const direct = await scenario('#year=2017&paper=2&question=18', 1);
  assert.deepEqual(direct.clicks, ['paper2', 'yearTab', 'year2017', 'question18', 'analysis']);
  assert.match(direct.panel.children[0].textContent, /已打开/);
  direct.panel.children.find(x => x.textContent === '复制当前题目链接').click();
  assert.equal(direct.copied[0], '[18](https://zhenti.kaoyansou.cn/math#year=2017&paper=2&question=18)');
  direct.stop();
  const bad = await scenario('#year=2017&paper=9&question=18');
  assert.deepEqual(bad.clicks, []); assert.match(bad.panel.children[0].textContent, /参数/); bad.stop();
  const plain = await scenario(''); assert.deepEqual(plain.clicks, []); plain.stop();
  const entrance = await scenario('', 2, '/'); assert.equal(entrance.panel.children[1].textContent, '复制当前题目链接'); entrance.stop();
  const slash = await scenario('#year=2017&paper=2&question=18', 2, '/math/');
  assert.match(slash.panel.children[0].textContent, /已打开/); slash.stop();
  console.log('PASS: delayed subject load, year/question navigation, analysis activation, Markdown copy, invalid parameters, ordinary-page no-op.');
})().catch(error => {console.error(error); process.exitCode = 1;});
