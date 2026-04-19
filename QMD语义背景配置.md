# obsidian_math-master 的 QMD 语义背景配置

这份配置将仓库中的知识分区转成可被 QMD 利用的语义上下文（context），用于提升混合检索和重排时的语义判别能力。

## 1) 建议的集合名称

建议把整个仓库作为一个集合：`math`。

```powershell
qmd collection add . --name math --mask "**/*.md"
```

## 2) 根级语义背景

```powershell
qmd context add "qmd://math" "考研数学 Obsidian 知识库；包含高等数学、线性代数、例题习题与手写解题过程。检索目标偏向知识点定位、题型归类、解法迁移与考点回忆。"
```

## 3) 分目录语义背景（可直接执行）

```powershell
qmd context add "qmd://math/0. 杂项" "通用工具与方法区：常用公式、均值不等式、应试技巧、灵感记录与杂项题目。用于快速补充证明技巧、估计技巧和应试策略。"

qmd context add "qmd://math/1-1. 函数的极限与连续" "高数极限与连续：邻域、无穷小无穷大、夹逼准则、重要极限、泰勒与洛必达。适合处理极限存在性、等价替换与极限计算策略。"
qmd context add "qmd://math/1-2. 数列极限" "数列极限专题：收敛判定、单调有界、放缩法、海涅定理及速度比较。用于离散序列收敛性与构造估计。"
qmd context add "qmd://math/1-3. 一元函数微分学" "一元微分学：导数概念、求导法则、高阶导数、隐函数/参数方程求导及应用。用于单调性、极值、曲线性质与建模题。"
qmd context add "qmd://math/1-4. 一元函数积分学" "一元积分学：不定积分、定积分、变限积分、反常积分及其计算与应用。用于积分技巧选择、几何量计算与物理应用。"
qmd context add "qmd://math/1-5. 多元函数微分学" "多元微分学：偏导、全微分、方向导数、梯度、极值与最值。用于多变量近似、优化与约束分析前置。"
qmd context add "qmd://math/1-6. 二重积分" "二重积分：概念、性质、对称性与计算。用于平面区域积分、坐标变换与几何物理量求解。"
qmd context add "qmd://math/1-7. 微分方程" "微分方程：一阶方程、高阶线性方程与应用。用于模型建立、通解结构和特解构造。"

qmd context add "qmd://math/2-1. 行列式" "线代行列式：定义性质、计算技巧、余子式与克拉默法则。用于解方程组、判可逆与代数结构判断。"
qmd context add "qmd://math/2-2. 矩阵" "线代矩阵：基本运算、初等变换、逆矩阵、秩、伴随矩阵与矩阵方程。用于线性变换表达与方程组矩阵化处理。"
qmd context add "qmd://math/2-3. 向量组" "向量组与线性相关性：秩、等价向量组、极大线性无关组。用于基底选择、维数判断与表示唯一性分析。"
qmd context add "qmd://math/2-4. 线性方程组" "线性方程组：齐次/非齐次、同解与公共解。用于解空间结构、自由变量与解的存在唯一性判断。"
qmd context add "qmd://math/2-5. 特征值与特征向量" "特征值专题：相似、对角化、实对称矩阵正交对角化。用于幂矩阵、二次型与稳定性相关问题。"
qmd context add "qmd://math/2-6. 二次型" "二次型：矩阵表示、标准形规范形、正定性判定。用于最值、曲面分类和线代-高数交叉题。"

qmd context add "qmd://math/Excalidraw" "可视化题解与流程图：例题、习题、1000题手写过程与图示化推导。用于还原思路路径和步骤级检索。"
qmd context add "qmd://math/教材" "教材分讲资料区：按章节组织的原始材料与题源映射。用于回溯概念来源与章节定位。"

qmd context add "qmd://math/高等数学主目录.md" "高等数学导航入口：组织高数各主题与跳转路径。"
qmd context add "qmd://math/线性代数主目录.md" "线性代数导航入口：组织线代主题与重点串联。"
qmd context add "qmd://math/欢迎！.md" "仓库起始页：使用说明、学习路径与入口引导。"
```

## 4) 推荐一次性流程

```powershell
qmd update
qmd embed
qmd query "如何判定正定二次型" -n 8 --min-score 0.25
```

## 5) 中文语料优化建议

如果你主要检索中文内容，建议切换多语言嵌入模型后强制重嵌入：

```powershell
$env:QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
qmd embed -f
```

以上配置重点利用“目录语义 + 主入口语义 + 题解语义”三层上下文，能更好地区分：
- 概念定义类问题
- 计算技巧类问题
- 题型迁移与解题流程类问题
