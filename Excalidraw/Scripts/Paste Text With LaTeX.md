/*
Paste Text With LaTeX
}

使用：选中已有文本后运行脚本。

```javascript
*/
try {
  ea.setView && ea.setView("active", true);
  new Notice("开始转换…", 4000);

  const GAP_X = 6;
  const GAP_Y = 8;
  const DEFAULT_LINE_HEIGHT = 24;

const selected = ea.getViewSelectedElements().filter((el) => el.type === "text");
if (selected.length === 0) {
  new Notice("请先选中文本元素");
  return;
}

selected.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
const raw = selected
  .map((el) => el.rawText ?? el.originalText ?? el.text ?? "")
  .join("\n");
if (!raw.trim()) {
  new Notice("未检测到文本内容");
  return;
}

const bounds = ea.getBoundingBox(selected);
let startX = bounds.topX;
let cursorY = bounds.topY;

const lines = raw.replace(/\r\n/g, "\n").split("\n");
const createdIds = [];
let hasFailure = false;

const tokenize = (line) => {
  const tokens = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: line.slice(lastIndex, match.index) });
    }
    const rawToken = match[0];
    if (rawToken.startsWith("$$")) {
      tokens.push({ type: "latex", value: rawToken.slice(2, -2).trim(), display: true });
    } else {
      tokens.push({ type: "latex", value: rawToken.slice(1, -1).trim(), display: false });
    }
    lastIndex = match.index + rawToken.length;
  }
  if (lastIndex < line.length) {
    tokens.push({ type: "text", value: line.slice(lastIndex) });
  }
  return tokens;
};

for (const line of lines) {
  if (!line.trim()) {
    cursorY += DEFAULT_LINE_HEIGHT + GAP_Y;
    continue;
  }

  const tokens = tokenize(line);

  // 预计算尺寸
  const measurements = [];
  for (const token of tokens) {
    if (token.type === "text") {
      const textValue = token.value;
      if (!textValue) {
        measurements.push({ width: 0, height: 0 });
        continue;
      }
      const m = ea.measureText(textValue);
      measurements.push({ width: m.width, height: m.height });
    } else {
      const tex = token.value;
      if (!tex) {
        measurements.push({ width: 0, height: 0 });
        continue;
      }
      try {
        const d = await ea.tex2dataURL(tex, 4);
        if (!d) {
          const fallback = ea.measureText(`$${tex}$`);
          measurements.push({ width: fallback.width, height: fallback.height, display: token.display });
          hasFailure = true;
        } else {
          measurements.push({ width: d.size.width, height: d.size.height, display: token.display });
        }
      } catch (e) {
        const fallback = ea.measureText(`$${tex}$`);
        measurements.push({ width: fallback.width, height: fallback.height, display: token.display });
        hasFailure = true;
      }
    }
  }

  let lineHeight = Math.max(DEFAULT_LINE_HEIGHT, ...measurements.map((m) => m.height || 0));
  let cursorX = startX;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const size = measurements[i] ?? { width: 0, height: 0 };

    if (token.type === "text") {
      if (token.value) {
        const id = ea.addText(cursorX, cursorY, token.value);
        createdIds.push(id);
      }
      cursorX += size.width + GAP_X;
      continue;
    }

    if (token.type === "latex") {
      if (token.value) {
        if (token.display && tokens.length === 1) {
          // 若整行仅有一个 $$...$$，居中显示
          cursorX = startX - size.width / 2;
        }
        try {
          const id = await ea.addLaTex(cursorX, cursorY, token.value);
          if (id) {
            createdIds.push(id);
          } else {
            const fallbackId = ea.addText(cursorX, cursorY, `$${token.value}$`);
            createdIds.push(fallbackId);
            hasFailure = true;
          }
        } catch (e) {
          const fallbackId = ea.addText(cursorX, cursorY, `$${token.value}$`);
          createdIds.push(fallbackId);
          hasFailure = true;
        }
      }
      cursorX += size.width + GAP_X;
    }
  }

  cursorY += lineHeight + GAP_Y;
}

await ea.addElementsToView(false, false, true);
if (createdIds.length > 0) {
  ea.selectElementsInView(createdIds);
}

let createdView = ea.getViewSelectedElements();
if (createdIds.length > 0 && createdView.length === 0) {
  new Notice("未能选中新生成的元素，已取消删除原文本");
  return;
}

if (createdView.length > 0) {
  const createdBox = ea.getBoundingBox(createdView);
  const targetCenter = {
    x: bounds.topX + bounds.width / 2,
    y: bounds.topY + bounds.height / 2,
  };
  const createdCenter = {
    x: createdBox.topX + createdBox.width / 2,
    y: createdBox.topY + createdBox.height / 2,
  };
  const dx = targetCenter.x - createdCenter.x;
  const dy = targetCenter.y - createdCenter.y;

  ea.copyViewElementsToEAforEditing(createdView);
  ea.getElements().forEach((el) => {
    el.x += dx;
    el.y += dy;
  });
  await ea.addElementsToView(false, false, true);
  ea.selectElementsInView(createdIds);
}

if (createdIds.length > 0) {
  ea.copyViewElementsToEAforEditing(selected);
  ea.getElements().forEach((el) => (el.isDeleted = true));
  await ea.addElementsToView(false, false, true);
}

if (hasFailure) {
  new Notice("部分公式未能渲染，已以文本回退显示");
}

new Notice("转换完成", 4000);
} catch (e) {
  new Notice(`脚本错误: ${e?.message ?? e}`, 8000);
}
````
