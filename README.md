# 🃏 Guandan Coach --- AI 掼蛋教练

一个面向掼蛋学习、实战分析与复盘的开源 AI 项目。

目标不是只做"告诉你出哪张牌"的机器人，而是让 AI
理解牌局状态、搭档信号、牌权、炸弹、残局和历史出牌，并解释
**为什么这样打**。

## 🎯 项目目标

-   标准化牌局 Game State
-   自然语言输入牌局
-   判断"这一手怎么出"
-   判断"该不该炸、用哪个炸、炸后出什么"
-   推断对家牌型与主攻/助攻角色
-   追踪已出牌和动态控制牌
-   报1 / 报2 / 报3 / 报5残局模式
-   整局 Replay 与自动复盘
-   Benchmark 持续评估 AI 是否真的变强
-   手牌照片识别

## 🧠 核心原则

> 先看搭档，再看自己；先看牌权，再看牌大；炸之前先想炸后出什么。

AI 分析优先考虑：规则与级牌 → 四家剩余张数 → 手牌结构与弱路 → 主攻/助攻
→ 对家信号 → 已出关键牌 → 牌权 → 炸弹机会成本 → 对手威胁 → 推荐与备选。

## 🧪 Benchmark

"AI 说得像高手"不等于"AI 真的打得更好"。

项目将建立固定测试集，评价：

-   推荐出牌
-   炸弹决策
-   搭档推断
-   残局风险
-   事实 / 推断 / 假设区分
-   解释质量

## 🗺️ Roadmap

### Phase 1 --- Foundation

-   [ ] Game State Schema
-   [ ] Natural Language Parser
-   [ ] Bomb Decision
-   [ ] Partner Inference

### Phase 2 --- Memory & Replay

-   [ ] Played Cards Tracker
-   [ ] Dynamic Control / 登基牌
-   [ ] Full Replay

### Phase 3 --- Evaluation

-   [ ] 20 Smoke Tests
-   [ ] 100 Benchmark Cases
-   [ ] Expert Reference Answers
-   [ ] Regression Tests

### Phase 4 --- Vision & Product

-   [ ] 手牌照片识别
-   [ ] Web / Mobile UI
-   [ ] 实时 AI Coach

## 🤝 如何参与

1.  Fork repository
2.  创建 branch
3.  选择一个 Issue
4.  修改并测试
5.  提交 Pull Request

第一次参与可优先认领 `good first issue`。

详细说明见 `CONTRIBUTING.md`。

## 💡 不写代码也能贡献

欢迎贡献经典牌局、残局题、高质量参考答案、Prompt、Evaluation、UI/UX、图片识牌测试、Bug
报告和文档。

## 📌 原则

-   AI 推断不能伪装成事实
-   信息不足时给条件式建议
-   案例尽量可复现
-   新功能尽量配测试
-   "提高了"尽量用 Benchmark 证明
-   尊重原创与版权
