# Contributing to Guandan Coach

感谢一起改进 AI 掼蛋教练。

## 基本流程

1.  Fork 项目
2.  从主分支创建 branch
3.  选择或创建 GitHub Issue
4.  完成修改
5.  运行相关测试
6.  提交 Pull Request
7.  在 PR 中说明改了什么、为什么改、如何验证

建议 branch：

``` text
feature/game-state-parser
fix/bomb-decision
eval/add-endgame-cases
docs/improve-readme
```

## PR 最好包含

-   问题
-   解决方案
-   是否改变 AI 行为
-   测试方法
-   示例输入 / 输出
-   Benchmark 前后变化（如适用）

## AI / Prompt 修改

不要只展示一个"看起来不错"的例子。尽量使用固定 Benchmark
前后比较，并记录模型、主要配置和行为变化。未知信息不得编造成事实。

## 牌局案例建议格式

``` yaml
id: ENDGAME-001
level: 7
cards_remaining:
  me: 6
  partner: 1
  upstream: 8
  downstream: 2
current_play:
  player: upstream
  type: pair
  cards: [K, K]
question: "我该怎么出？"
```

附推荐动作、可接受备选、关键牌理、哪些额外信息会改变答案。

## 不写代码也可以贡献

掼蛋高手审核、经典牌局、记牌题、残局题、UI 建议、文档和 Bug
报告都非常有价值。
