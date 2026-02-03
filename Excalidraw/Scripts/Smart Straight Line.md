`````markdown
/*
Smart Straight Line
*/

使用：
- 用画笔绘制线条后立即运行脚本（建议绑定快捷键）
- 若末端存在明显停留，则将手绘线条转换为规则直线

说明：
- 由于 Excalidraw 脚本无法直接监听绘制过程，这里通过“末端点聚集”近似判断 1 秒停留
- 可在脚本设置中调整“停留判定点数”和“停留半径”

```javascript
*/
(async () => {
try {
  ea.setView && ea.setView("active", true);

  const settings = ea.getScriptSettings ? ea.getScriptSettings() : {};
  if (!settings["停留判定点数"]) {
    settings["停留判定点数"] = {
      value: 12,
      description: "末端连续点数量阈值（近似 1 秒停留，可按需要调整）",
    };
  }
  if (!settings["停留半径(px)"]) {
    settings["停留半径(px)"] = {
      value: 2,
      description: "末端点聚集半径阈值（像素）",
    };
  }
  if (!settings["直线容差(px)"]) {
    settings["直线容差(px)"] = {
      value: 4,
      description: "点到直线的最大允许偏差（像素）",
    };
  }
  if (!settings["最小线长(px)"]) {
    settings["最小线长(px)"] = {
      value: 12,
      description: "最小线长，小于该值不转换（像素）",
    };
  }
  ea.setScriptSettings && ea.setScriptSettings(settings);

  const MIN_PAUSE_SAMPLES = Number(settings["停留判定点数"].value) || 12;
  const PAUSE_RADIUS = Number(settings["停留半径(px)"].value) || 2;
  const MAX_DEVIATION = Number(settings["直线容差(px)"].value) || 4;
  const MIN_LENGTH = Number(settings["最小线长(px)"].value) || 12;

  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const pointLineDistance = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return distance(p, a);
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    const proj = [a[0] + t * dx, a[1] + t * dy];
    return distance(p, proj);
  };

  const selected = ea.getViewSelectedElements();
  let target = null;
  if (selected.length === 1 && selected[0].type === "freedraw") {
    target = selected[0];
  } else {
    const view = ea.getViewElements();
    for (let i = view.length - 1; i >= 0; i--) {
      if (view[i].type === "freedraw") {
        target = view[i];
        break;
      }
    }
  }

  if (!target) {
    new Notice("未找到可处理的手绘线条（请先选中或刚绘制一条）", 5000);
    return;
  }

  const pts = Array.isArray(target.points) ? target.points : [];
  if (pts.length < 2) {
    new Notice("点数不足，无法判断", 4000);
    return;
  }

  const last = pts[pts.length - 1];
  let tailCount = 1;
  for (let i = pts.length - 2; i >= 0; i--) {
    if (distance(pts[i], last) <= PAUSE_RADIUS) {
      tailCount++;
    } else {
      break;
    }
  }

  if (tailCount < MIN_PAUSE_SAMPLES) {
    new Notice("未检测到末端停留（或停留不足）", 4000);
    return;
  }

  const endIndex = Math.max(1, pts.length - tailCount);
  const start = pts[0];
  const end = pts[endIndex];
  const lineLen = distance(start, end);
  if (lineLen < MIN_LENGTH) {
    new Notice("线段过短，已取消转换", 4000);
    return;
  }

  let maxDev = 0;
  for (let i = 0; i <= endIndex; i++) {
    const d = pointLineDistance(pts[i], start, end);
    if (d > maxDev) maxDev = d;
  }
  if (maxDev > MAX_DEVIATION) {
    new Notice("线条偏离直线过大，已取消转换", 4000);
    return;
  }

  const prevStyle = {
    strokeColor: ea.style.strokeColor,
    backgroundColor: ea.style.backgroundColor,
    strokeWidth: ea.style.strokeWidth,
    strokeStyle: ea.style.strokeStyle,
    opacity: ea.style.opacity,
    roughness: ea.style.roughness,
    roundness: ea.style.roundness,
    fillStyle: ea.style.fillStyle,
  };

  ea.style.strokeColor = target.strokeColor ?? ea.style.strokeColor;
  ea.style.backgroundColor = target.backgroundColor ?? ea.style.backgroundColor;
  ea.style.strokeWidth = target.strokeWidth ?? ea.style.strokeWidth;
  ea.style.strokeStyle = target.strokeStyle ?? ea.style.strokeStyle;
  ea.style.opacity = target.opacity ?? ea.style.opacity;
  ea.style.roughness = target.roughness ?? ea.style.roughness;
  ea.style.roundness = target.roundness ?? ea.style.roundness;
  ea.style.fillStyle = target.fillStyle ?? ea.style.fillStyle;

  const x1 = target.x + start[0];
  const y1 = target.y + start[1];
  const x2 = target.x + end[0];
  const y2 = target.y + end[1];

  let lineId = null;
  if (ea.addLine) {
    lineId = ea.addLine(x1, y1, x2, y2);
  } else if (ea.addArrow) {
    lineId = ea.addArrow(x1, y1, x2, y2);
  } else {
    throw new Error("无法创建直线元素（未找到 addLine）");
  }

  await ea.addElementsToView(false, true, true);
  if (lineId) {
    ea.selectElementsInView([lineId]);
  }

  const api = ea.getExcalidrawAPI && ea.getExcalidrawAPI();
  if (api && api.getSceneElements && api.updateScene) {
    const scene = api.getSceneElements();
    const updated = scene.map((el) =>
      el.id === target.id ? { ...el, isDeleted: true } : el,
    );
    api.updateScene({ elements: updated });
  } else {
    ea.copyViewElementsToEAforEditing([target]);
    ea.getElements().forEach((el) => (el.isDeleted = true));
    await ea.addElementsToView(false, true, true);
  }

  ea.style.strokeColor = prevStyle.strokeColor;
  ea.style.backgroundColor = prevStyle.backgroundColor;
  ea.style.strokeWidth = prevStyle.strokeWidth;
  ea.style.strokeStyle = prevStyle.strokeStyle;
  ea.style.opacity = prevStyle.opacity;
  ea.style.roughness = prevStyle.roughness;
  ea.style.roundness = prevStyle.roundness;
  ea.style.fillStyle = prevStyle.fillStyle;

  new Notice("已转换为规则直线", 3000);
} catch (e) {
  new Notice(`脚本错误: ${e?.message ?? e}`, 8000);
}
})();
`````

`````
