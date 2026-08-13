# Benchmark Specification v0.1

## 第一阶段：20题

  类别                数量
  ----------------- ------
  炸弹决策               5
  搭档判断               4
  残局                   5
  记牌 / 登基牌          3
  牌权 / 主攻助攻        3

## 每题字段

``` yaml
id:
category:
difficulty:
level:
game_state:
question:
reference:
  preferred_action:
  acceptable_actions:
  unacceptable_actions:
  key_reasoning:
  information_that_changes_answer:
```

## 评分（10分）

-   推荐动作：4
-   核心牌理：2
-   搭档 / 对手判断：1
-   风险识别：1
-   事实与推断区分：1
-   表达清晰：1

每次重大修改比较 baseline、new_version 和
delta，并检查分类退步、hallucination 与过度自信。
