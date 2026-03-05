
设数列  $\{x_{n}\}$  ，  $\{y_{n}\}$  在  $n\to \infty$  的过程中同时趋于  $a$  ，记  $u_{n} = |x_{n} - a|$  ，  $\nu_{n} = |y_{n} - a|$  ，  $I = \lim_{n\to \infty}\frac{u_n}{\nu_n}$  且当 $n\to \infty$  时，  $u_{n}$  和  $\nu_{n}$  **都是无穷小量**，则有

若  $I = 0$  ，则说明  $x_{n}$  的收敛速度比  $y_{n}$  的收敛速度快；（**高阶**）

若  $I = b$  （ $b$  为大于零的常数），则说明  $x_{n}$  的收敛速度是  $y_{n}$  **的**  $\frac{1}{b}$  **倍**；（**同阶**）

若  $I = \infty$  ，则说明  $x_{n}$  的收敛速度比  $y_{n}$  的收敛速度慢.（**低阶**）

**如**：  $x_{n} = \frac{1}{n},y_{n} = \frac{1}{\sqrt{n}},\lim_{n\to \infty}x_{n} = \lim_{n\to \infty}y_{n} = 0$  ，故  $I = \lim_{n\to \infty}\frac{\left|\frac{1}{n} - 0\right|}{\left|\frac{1}{\sqrt{n}} - 0\right|} = 0$  ，于是  $x_{n}$  比  $y_{n}$  收敛于0的速度快.

数列极限定义为  $\lim_{n\to \infty}x_n = a\Leftrightarrow$  任意  $\varepsilon >0$  ，存在  $N > 0$  ，当  $n > N$  时，恒有  $\left|x_{n} - a\right| <   \varepsilon$  .此定义中不体现收敛速度，这是命制选择题的理论依据.