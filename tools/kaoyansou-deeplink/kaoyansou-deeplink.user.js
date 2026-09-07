// ==UserScript==
// @name         研可岸真题 · Obsidian 题目直达
// @namespace    local.kaoyansou.deeplink
// @version      1.0.1
// @description  按卷种、年份、题号打开原站解析，并复制 Obsidian 链接。
// @match        https://zhenti.kaoyansou.cn/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  // Run on the site entrance too: Vue can enter /math without a document load.
  const isMathPage = () => /^\/math\/?$/.test(location.pathname);
  const papers = {1: '数学一', 2: '数学二', 3: '数学三'};
  const normalize = value => String(value || '').replace(/\s+/g, '').trim();
  const visible = el => !!el && el.getClientRects().length > 0;
  const all = (selector, root = document) => [...root.querySelectorAll(selector)].filter(visible);
  const exact = (selector, text, root) => all(selector, root).find(el => normalize(el.textContent) === normalize(text));
  const active = el => el?.classList.contains('active') || el?.getAttribute('aria-selected') === 'true';
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  let generation = 0;

  function validate(year, paper, question) {
    if (!/^\d{4}$/.test(String(year)) || +year < 1980 || +year > 2100 ||
        !/^[123]$/.test(String(paper)) || !/^\d{1,2}$/.test(String(question)) ||
        +question < 1 || +question > 99) {
      throw new Error('参数应为：四位年份、卷种 1/2/3、题号 1—99。');
    }
    return {year: +year, paper: +paper, question: +question};
  }

  function parseLink() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (!['year', 'paper', 'question'].some(key => p.has(key))) return null;
    return validate(p.get('year'), p.get('paper'), p.get('question'));
  }

  function linkFor(target) {
    return `https://zhenti.kaoyansou.cn/math#year=${target.year}&paper=${target.paper}&question=${target.question}`;
  }

  const panel = document.createElement('aside');
  panel.id = 'ks-deeplink-panel';
  panel.style.cssText = 'position:fixed;right:16px;bottom:84px;z-index:2147483647;background:white;color:#222;border:1px solid #ddd;border-radius:10px;padding:10px;box-shadow:0 3px 16px #0002;font:13px/1.5 sans-serif;max-width:290px';
  const status = document.createElement('div');
  status.textContent = '真题直达 v1.0.1：脚本已运行';
  status.setAttribute('role', 'status');
  panel.append(status);
  function button(label, fn) {
    const el = document.createElement('button');
    el.textContent = label;
    el.type = 'button';
    el.style.cssText = 'margin:7px 5px 0 0;padding:5px 8px;cursor:pointer';
    el.addEventListener('click', fn);
    panel.append(el);
  }
  const tell = text => {status.textContent = text;};
  document.body.append(panel);
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('显示真题直达面板', () => {
      if (!panel.isConnected) document.body.append(panel);
      panel.style.display = 'block';
      tell('真题直达 v1.0.1：脚本已运行');
    });
  }

  async function waitFor(find, message, run, timeout = 20000) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      if (run !== generation) throw new Error('操作已取消');
      const value = find();
      if (value) return value;
      await pause(150);
    }
    throw new Error(message + '。请确认已登录、使用桌面版且页面加载完成，再点“重试直达”。');
  }

  function currentCard() {
    return all('.single-question-dialog-surface .question-card-wrapper')[0] || null;
  }

  function metadata(card) {
    const text = card?.querySelector('.question-meta')?.textContent || '';
    const match = text.match(/真题\s*·\s*(\d{4})年\s*·\s*(\d+)\s*$/);
    return match ? {year: +match[1], question: +match[2]} : null;
  }

  async function openTarget() {
    const run = ++generation;
    try {
      if (!isMathPage()) {
        tell('脚本已运行。请进入桌面版数学页面 /math 后使用题目直达。');
        return;
      }
      const target = parseLink();
      if (!target) {tell('当前地址没有题目参数；可用“生成链接”。'); return;}
      tell(`正在定位 ${target.year} 年${papers[target.paper]}第 ${target.question} 题…`);
      const oldCard = currentCard();
      if (oldCard) {
        const close = oldCard.closest('.question-dialog')?.querySelector('.dialog-floating-close');
        if (!visible(close)) throw new Error('请先关闭当前题目弹窗，再点“重试直达”。');
        close.click();
        await waitFor(() => !currentCard(), '当前题目弹窗未关闭', run);
      }
      const chip = await waitFor(() => exact('.knowledge-panel__subject-chip', papers[target.paper]), '没有找到卷种按钮', run);
      if (!active(chip)) {
        const started = performance.now();
        chip.click();
        await waitFor(() => active(exact('.knowledge-panel__subject-chip', papers[target.paper])), '卷种未切换', run);
        // Wait for the real subject request, not just the immediately updated chip.
        await waitFor(() => performance.getEntriesByType('resource').some(entry =>
          entry.startTime >= started && new URL(entry.name).pathname.endsWith(`/question/subject/${target.paper + 4}`)
        ), '目标卷种的题目尚未加载完成', run);
        await pause(150);
      }
      const yearTab = await waitFor(() => exact('.practice-mode-bar__tab', '年份汇总'), '没有找到年份汇总', run);
      if (!active(yearTab)) yearTab.click();
      const yearRow = await waitFor(() => all('.year-item').find(el => normalize(el.querySelector('.year-text')?.textContent) === `${target.year}年`), '没有找到目标年份', run);
      if (!active(yearRow)) yearRow.click();
      await waitFor(() => active(all('.year-item').find(el => normalize(el.querySelector('.year-text')?.textContent) === `${target.year}年`)), '年份未选中', run);
      const row = await waitFor(() => all('.year-paper-row').find(el => Number(el.querySelector('.year-paper-row__index')?.textContent.trim()) === target.question), '当前试卷没有找到该题号', run);
      if (run !== generation) return;
      row.scrollIntoView({block: 'center'});
      row.click();
      const card = await waitFor(() => {
        const c = currentCard(), meta = metadata(c);
        return meta?.year === target.year && meta.question === target.question ? c : null;
      }, '弹窗年份或题号不符', run);
      const analysis = await waitFor(() => exact('button.action-item', '解析', card), '没有找到解析按钮', run);
      if (!active(analysis)) analysis.click();
      await waitFor(() => active(analysis), '解析标签未打开', run);
      tell(`已打开 ${target.year} 年${papers[target.paper]}第 ${target.question} 题解析。`);
    } catch (error) {
      if (run === generation) tell(error.message);
    }
  }

  function copy(target) {
    const markdown = `[${target.question}](${linkFor(target)})`;
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(markdown, 'text');
      tell('已复制 Obsidian 链接，粘贴到笔记即可。');
    } else {
      window.prompt('复制下面的内容到 Obsidian：', markdown);
    }
  }

  button('复制当前题目链接', () => {
    const meta = metadata(currentCard());
    const selected = all('.knowledge-panel__subject-chip').find(active);
    const paper = Object.keys(papers).find(key => papers[key] === normalize(selected?.textContent));
    if (!meta || !paper) {
      tell('请在年份汇总中打开一道真题；也可点“生成链接”手动输入。');
      return;
    }
    copy(validate(meta.year, paper, meta.question));
  });
  button('生成链接', () => {
    const value = window.prompt('输入：年份 卷种 题号（卷种：1=数学一，2=数学二，3=数学三）', '2017 2 18');
    if (value === null) return;
    try {
      const parts = value.trim().split(/[\s,，]+/);
      if (parts.length !== 3) throw new Error('请输入三个数字，例如：2017 2 18。');
      copy(validate(...parts));
    } catch (error) {tell(error.message);}
  });
  button('重试直达', openTarget);
  button('停止', () => {generation++; tell('已停止自动定位。');});
  let lastRoute = location.pathname + location.hash;
  window.addEventListener('hashchange', () => {
    lastRoute = location.pathname + location.hash;
    openTarget();
  });
  setInterval(() => {
    if (!panel.isConnected && document.body) document.body.append(panel);
    const route = location.pathname + location.hash;
    if (route !== lastRoute) {
      lastRoute = route;
      // hashchange handles same-page links; this also covers SPA pushState.
      if (location.hash) openTarget();
    }
  }, 1000);
  if (location.hash) openTarget();
})();
