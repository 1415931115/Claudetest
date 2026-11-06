# 蟠桃园 · 计划一：可跑的骨架 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `executing-plans` skill to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Godot 里跑出第一个能玩的闭环——黑暗中提灯走、蹲到桃树下搜索、背包塞满、被仙女发现后玩命跑、撤出去。

**Architecture:** 纯逻辑（背包、搜索、仙女决策）写成不依赖场景的 RefCounted 类，用 headless 测试覆盖；场景层只负责把输入、光照、物理和这些类接起来。逻辑与渲染分开，是因为这台机器上唯一能自动验证的就是逻辑。

**Tech Stack:** Godot 4.4+，GDScript，Forward+ 渲染器，零第三方插件。

**Spec:** `outputs/2026-11-05-peach-garden-design.md`

## Global Constraints

- 性能目标：中等 CPU + GTX 1050，1080p，稳定 60 帧以上。
- 全场景只有一盏会投影的光源：玩家手里的灯。其余靠极低环境光与雾。
- 关闭 SDFGI、VoxelGI、体积雾、SSAO、SSIL、高成本后处理。
- 仙女 AI 的感知检测按 5–10 Hz 节流，不做每帧全图寻路。
- 无联机、无战斗、无装备、无天兵。
- 所有仙女碰到玩家即秒杀；玩家没有任何反击手段。
- 搜索过程中玩家完全不能移动；中途松手进度回退；被仙女打断则清零。
- 撤离即触即走，不读条。
- 死亡或撤离失败：本趟所得全丢；撤离成功那一刻落盘。
- 项目根目录：`peach-garden/`。所有路径相对于它。

## Review Focus

- **松手与被打断同时发生**：玩家松开搜索键的同一帧仙女打断搜索时，进度必须清零而不是只回退 40%。
- **格子放置的边界与重叠**：物品贴着右边界或下边界放置、以及两件物品对角相邻时，不得越界或重叠。
- **仙女丢失目标的计时**：玩家静止不动与持续奔跑时，丢失目标所需时间必须不同，否则玩家可以站在原地看着仙女绕圈。
- **撤离落盘时机**：撤离触发的同一帧玩家仍在仙女追击范围内时，写盘结果必须确定，不能出现"已入库但玩家已死"。
- **最暗一档灯的可玩性下限**：在"几乎熄灭"档位下，玩家必须仍能看见脚前一米内的地面与背包界面，否则这一档等于不可用。

---

## Task 1: 工程骨架与 headless 测试入口

**Files:**
- Create: `project.godot`
- Create: `tests/run_all.gd`
- Create: `tests/test_smoke.gd`
- Create: `main.tscn`

**Interfaces:**
- Consumes: 无。
- Produces: 测试入口 `run_all.gd` 的约定——每个 `tests/test_*.gd` 暴露 `func run(t: TestContext) -> void`；`TestContext` 提供 `assert_eq(actual, expected, message)`、`assert_true(value, message)`、`assert_false(value, message)`。`run_all.gd` 扫描 `res://tests/` 下所有 `test_*.gd`，全部通过时退出码 0，任一失败时退出码 1 并打印失败项。

- [ ] **Step 1: 写失败的测试**

```gdscript
# tests/test_smoke.gd
func run(t) -> void:
	t.assert_eq(1 + 1, 2, "arithmetic works")
	t.assert_true(false, "this must fail until the harness exists")
```

- [ ] **Step 2: 运行，确认它以"找不到测试框架"而失败**

Run: `godot --headless --script res://tests/run_all.gd`
Expected: 报错，`res://tests/run_all.gd` 不存在

- [ ] **Step 3: 写 `tests/run_all.gd`**

`TestContext` 用一个内部类实现，持有失败计数。`run_all.gd` 用 `DirAccess.get_files_at("res://tests/")` 找 `test_*.gd`，`load()` 后 `new()`，调 `run(ctx)`。结尾 `print` 汇总并 `quit(1 if failed else 0)`。

- [ ] **Step 4: 运行，确认这条断言按预期失败**

Run: `godot --headless --script res://tests/run_all.gd`
Expected: `FAIL: this must fail until the harness exists`，退出码 1

- [ ] **Step 5: 删掉那条故意失败的断言，重跑**

Expected: `PASS 1/1`，退出码 0

- [ ] **Step 6: 建 `project.godot` 与空的 `main.tscn`**

`project.godot` 需含：`config/name="蟠桃园"`、`run/main_scene="res://main.tscn"`、`rendering/renderer/rendering_method="forward_plus"`、`rendering/environment/defaults/default_environment=""`、显示窗口 1920x1080、输入映射（`move_forward/back/left/right`、`crouch`、`search`、`lamp_toggle`、`interact`、`pause`）；`rendering/lights_and_shadows/directional_shadow/soft_shadow_filter_quality=0`，`rendering/anti_aliasing/quality/msaa_3d=0`。

- [ ] **Step 7: 确认工程能打开**

Run: `godot --headless --quit`
Expected: 无报错，退出码 0

- [ ] **Step 8: 提交**

```bash
git add project.godot main.tscn tests/
git commit -m "feat: godot project skeleton with zero-dependency headless test harness"
```

---

## Task 2: 格子背包

**Files:**
- Create: `scripts/inventory.gd`
- Test: `tests/test_inventory.gd`

**Interfaces:**
- Consumes: `TestContext`（Task 1）。
- Produces: `class_name Inventory extends RefCounted`；`const COLS := 8`、`const ROWS := 6`；`func can_place(item_size: Vector2i, cell: Vector2i) -> bool`；`func place(item_size: Vector2i, value: int, cell: Vector2i) -> bool`；`func remove_at(cell: Vector2i) -> int`（返回被移除物品的价值，该格无物品时返回 `-1`）；`func total_value() -> int`；`func occupied_cells() -> int`。

- [ ] **Step 1: 写失败的测试**

```gdscript
# tests/test_inventory.gd
const Inventory = preload("res://scripts/inventory.gd")

func run(t) -> void:
	var inv = Inventory.new()
	t.assert_true(inv.place(Vector2i(2, 1), 10, Vector2i(0, 0)), "fits in empty bag")
	t.assert_eq(inv.total_value(), 10, "value counted")
	t.assert_false(inv.can_place(Vector2i(2, 1), Vector2i(1, 0)), "overlaps existing item")
	t.assert_false(inv.can_place(Vector2i(2, 1), Vector2i(7, 0)), "overflows right edge")
	t.assert_false(inv.can_place(Vector2i(2, 1), Vector2i(0, 5)), "overflows bottom edge")
	t.assert_true(inv.can_place(Vector2i(1, 1), Vector2i(7, 5)), "single cell at far corner")
	t.assert_eq(inv.remove_at(Vector2i(0, 0)), 10, "remove returns value")
	t.assert_eq(inv.remove_at(Vector2i(0, 0)), -1, "removing empty cell reports -1")
	t.assert_eq(inv.total_value(), 0, "bag empty after removal")
```

- [ ] **Step 2: 运行，确认失败**

Run: `godot --headless --script res://tests/run_all.gd`
Expected: 报错 `Could not preload res://scripts/inventory.gd`

- [ ] **Step 3: 实现 `scripts/inventory.gd`**

占用状态用一个 `Dictionary[Vector2i, int]`（格子 → 物品 id），物品记录放 `Array`。`can_place` 先检查四条边界，再逐格查占用。

- [ ] **Step 4: 运行，确认全部通过**

Expected: `PASS 9/9`，退出码 0

- [ ] **Step 5: 提交**

```bash
git add scripts/inventory.gd tests/test_inventory.gd
git commit -m "feat: grid inventory with boundary and overlap checks"
```

---

## Task 3: 搜索会话

**Files:**
- Create: `scripts/search_session.gd`
- Test: `tests/test_search.gd`

**Interfaces:**
- Consumes: 无。
- Produces: `class_name SearchSession extends RefCounted`；`_init(duration: float)`；`func tick(delta: float) -> void`；`func progress() -> float`（0..1）；`func is_complete() -> bool`；`func release() -> void`（玩家松手，进度乘以 0.6）；`func interrupt() -> void`（被动打断，进度清零）；`func noise() -> float`（0..1，随进度线性上升）。

- [ ] **Step 1: 写失败的测试**

```gdscript
# tests/test_search.gd
const SearchSession = preload("res://scripts/search_session.gd")

func run(t) -> void:
	var s = SearchSession.new(4.0)
	t.assert_eq(s.progress(), 0.0, "starts empty")
	s.tick(2.0)
	t.assert_eq(s.progress(), 0.5, "halfway after 2 of 4 seconds")
	t.assert_false(s.is_complete(), "not complete at half")
	s.tick(2.0)
	t.assert_true(s.is_complete(), "complete after 4 seconds")
	t.assert_eq(s.progress(), 1.0, "clamped at 1.0")

	var r = SearchSession.new(4.0)
	r.tick(2.0)
	r.release()
	t.assert_eq(r.progress(), 0.3, "release keeps 60% of progress")

	var i = SearchSession.new(4.0)
	i.tick(2.0)
	i.interrupt()
	t.assert_eq(i.progress(), 0.0, "interrupt wipes progress")

	var n = SearchSession.new(4.0)
	t.assert_eq(n.noise(), 0.0, "silent before starting")
	n.tick(2.0)
	t.assert_eq(n.noise(), 0.5, "noise follows progress")
```

- [ ] **Step 2: 运行，确认失败**

Run: `godot --headless --script res://tests/run_all.gd`
Expected: `Could not preload res://scripts/search_session.gd`

- [ ] **Step 3: 实现 `scripts/search_session.gd`**

`_elapsed` 累加并 `clampf` 到 `duration`；`release()` 与 `interrupt()` 都作用在 `_elapsed` 上。

- [ ] **Step 4: 运行，确认全部通过**

Expected: `PASS 9/9`，退出码 0

- [ ] **Step 5: 提交**

```bash
git add scripts/search_session.gd tests/test_search.gd
git commit -m "feat: search session with release decay and interrupt"
```

---

## Task 4: 仙女决策内核

**Files:**
- Create: `scripts/fairy_brain.gd`
- Test: `tests/test_fairy_brain.gd`

**Interfaces:**
- Consumes: 无。
- Produces: `class_name FairyBrain extends RefCounted`；`enum State { PATROL, INVESTIGATE, CHASE, LOST }`；`_init(lose_sight_seconds: float, investigate_seconds: float)`；`func tick(delta: float, sees_player: bool, hears_player: bool) -> State`；`func state() -> State`。

行为规则：`sees_player` 或 `hears_player` 为真时进入 `CHASE` 并重置计时；连续 `lose_sight_seconds` 秒两者都为假时进入 `LOST`；`LOST` 持续 `investigate_seconds` 秒后回到 `PATROL`。玩家静止（`hears_player` 为假）时，`sees_player` 一旦为假就开始计丢失时间；玩家奔跑（`hears_player` 持续为真）时计时永远被重置。

- [ ] **Step 1: 写失败的测试**

```gdscript
# tests/test_fairy_brain.gd
const FairyBrain = preload("res://scripts/fairy_brain.gd")

func run(t) -> void:
	var b = FairyBrain.new(3.0, 2.0)
	t.assert_eq(b.state(), FairyBrain.State.PATROL, "starts patrolling")
	b.tick(0.1, true, false)
	t.assert_eq(b.state(), FairyBrain.State.CHASE, "chases on sight")
	b.tick(2.9, false, false)
	t.assert_eq(b.state(), FairyBrain.State.CHASE, "still chasing before timeout")
	b.tick(0.2, false, false)
	t.assert_eq(b.state(), FairyBrain.State.LOST, "loses player after timeout")
	b.tick(2.0, false, false)
	t.assert_eq(b.state(), FairyBrain.State.PATROL, "returns to patrol")

	var noise = FairyBrain.new(3.0, 2.0)
	noise.tick(0.1, true, false)
	noise.tick(10.0, false, true)
	t.assert_eq(noise.state(), FairyBrain.State.CHASE, "running player is never lost")
```

- [ ] **Step 2: 运行，确认失败**

Run: `godot --headless --script res://tests/run_all.gd`
Expected: `Could not preload res://scripts/fairy_brain.gd`

- [ ] **Step 3: 实现 `scripts/fairy_brain.gd`**

- [ ] **Step 4: 运行，确认全部通过**

Expected: `PASS 6/6`，退出码 0

- [ ] **Step 5: 提交**

```bash
git add scripts/fairy_brain.gd tests/test_fairy_brain.gd
git commit -m "feat: fairy decision core with sight loss and hearing override"
```

---

## Task 5: 第一人称玩家与手提灯

**Files:**
- Create: `scripts/player.gd`
- Create: `scenes/player.tscn`
- Modify: `main.tscn`

**Interfaces:**
- Consumes: 无（输入动作来自 `project.godot`）。
- Produces: 场景 `player.tscn`，根节点 `CharacterBody3D` 名 `Player`，含 `Camera3D` 子节点 `Head` 与 `SpotLight3D` 子节点 `Lamp`。脚本暴露 `func set_lamp_tier(tier: int) -> void`（0=几乎熄灭，1=常亮，2=提亮）与 `func is_sneaking() -> bool`。

三档参数：档 0 的 `light_energy = 0.35`、`spot_range = 3.0`；档 1 为 `1.2 / 7.0`；档 2 为 `2.4 / 12.0`。`spot_angle = 26`，`shadow_enabled = true`，`distance_fade_enabled = false`。蹲下时移速 2.0，行走 3.4，奔跑 5.2（奔跑仅在非搜索状态可用）。

- [ ] **Step 1: 建 `scenes/player.tscn`**

`CharacterBody3D` → `CollisionShape3D`（CapsuleShape3D，高 1.8）→ `Head`（`Camera3D`，y=1.6）→ `Lamp`（`SpotLight3D`，挂在 Head 下，`spot_range = 7.0`）。

- [ ] **Step 2: 写 `scripts/player.gd`**

`_physics_process` 里读输入、算方向、`move_and_slide()`；`crouch` 按下时把 `Head.position.y` 插值到 1.1。

- [ ] **Step 3: 在 `main.tscn` 里放一个玩家与一小块地板，肉眼确认能走**

Run: `godot --headless --quit` 先确认无脚本错误；然后在编辑器里按 F5 自己走一遍。
Expected: 能前后左右移动，灯亮着，蹲下视角变低。

- [ ] **Step 4: 提交**

```bash
git add scripts/player.gd scenes/player.tscn main.tscn
git commit -m "feat: first-person player with three-tier hand lamp"
```

---

## Task 6: 黑暗场景、桃树、搜索交互与撤离

**Files:**
- Create: `scripts/level.gd`
- Create: `scenes/peach_tree.tscn`
- Create: `scenes/extraction.tscn`
- Modify: `main.tscn`

**Interfaces:**
- Consumes: `Inventory`（Task 2）、`SearchSession`（Task 3）、`player.gd`（Task 5）。
- Produces: `scenes/peach_tree.tscn` 根节点带 `func interact(player) -> void`；`scenes/extraction.tscn` 的 `Area3D` 在 `body_entered` 时调 `signal extracted(total_value: int)`。

- [ ] **Step 1: 搭场景**

一块 40x40 的地面、四周围墙、8 棵桃树（`CSGBox3D` 充当树干 + `SphereMesh` 充当树冠即可，不做美术）、一个撤离点（`Area3D` + 可见的发光圆环）。`WorldEnvironment` 里：`ambient_light_energy = 0.04`，`fog_enabled = true`，`fog_density = 0.06`，不启用体积雾。

- [ ] **Step 2: 接搜索**

玩家进入桃树 `Area3D` 且按住 `search` 时创建 `SearchSession`，每帧 `tick(delta)`；松手调 `release()` 并交给 `Inventory`（放不下就留在地上）。搜索进度用一个 `ProgressBar` 显示，屏幕中央偏下。

- [ ] **Step 3: 接撤离**

`extraction.tscn` 的 `body_entered` 触发 → 打印背包总价值 → 重置场景。

- [ ] **Step 4: 手感验收，肉眼确认四条**

Run: 编辑器内 F5，自己玩一遍。
Expected: ① 不拿灯几乎看不见东西；② 搜索时人钉住不能动，松手进度退回去一截；③ 背包放不下的桃子留在地上；④ 走进撤离点会回到起点并打印价值。

- [ ] **Step 5: 提交**

```bash
git add scripts/level.gd scenes/ main.tscn
git commit -m "feat: dark peach garden scene with search, backpack pickup, and extraction"
```

---

## Task 7: 一只会追人的仙女

**Files:**
- Create: `scripts/fairy_body.gd`
- Create: `scenes/fairy.tscn`
- Modify: `main.tscn`

**Interfaces:**
- Consumes: `FairyBrain`（Task 4）、`player.gd`（Task 5）。
- Produces: `scenes/fairy.tscn`，根节点 `CharacterBody3D` 名 `Fairy`，脚本暴露 `func kill_player() -> void`，玩家被碰到时由 `Area3D` 的 `body_entered` 调用。

- [ ] **Step 1: 搭一只仙女**

`CharacterBody3D` + `CollisionShape3D` + `MeshInstance3D`（用一个白色的 `CapsuleMesh` 占位，怪物模型以后再说）+ 一个 `Area3D`（碰撞半径 0.8，作为秒杀判定）。

- [ ] **Step 2: 写 `scripts/fairy_body.gd`**

每 0.1 秒（不是每帧）做一次感知判定：`sees_player` 用 `RayCast3D` 从仙女眼睛指向玩家并检查是否被墙挡住，且距离小于当前灯档对应的可见距离；`hears_player` 用玩家速度判断（奔跑为真，行走为假，搜索中为真）。把结果喂给 `FairyBrain.tick()`，按返回的状态决定移动目标：`PATROL` 沿 `Path3D` 走，`CHASE` 朝玩家走，`LOST` 走向最后已知位置。

- [ ] **Step 3: 接秒杀**

`kill_player()` 打印一次死亡，重置场景。

- [ ] **Step 4: 手感验收**

Run: 编辑器内 F5。
Expected: ① 关灯蹲着不动，仙女走过去不发现你；② 开亮灯站着，她从远处直接过来；③ 你跑起来她会跟着你的方向；④ 被她碰到立刻重开。

- [ ] **Step 5: 提交**

```bash
git add scripts/fairy_body.gd scenes/fairy.tscn main.tscn
git commit -m "feat: fairy body wiring brain to perception, movement, and instakill"
```

---

## Task 8: 骨架的整体验收

**Files:**
- Modify: `README.md`（新建）

**Interfaces:**
- Consumes: 前面全部。
- Produces: 无。

- [ ] **Step 1: 跑一遍全部 headless 测试**

Run: `godot --headless --script res://tests/run_all.gd`
Expected: `PASS 25/25`，退出码 0

- [ ] **Step 2: 完整玩一局并记录帧率**

Run: 编辑器内 F5，开着 Godot 的监视器面板看 `FPS`。
Expected: 1080p 下稳定 60 帧以上；若不到，先关掉 `WorldEnvironment` 的雾，再看是不是灯的光影距离太大。

- [ ] **Step 3: 写 `README.md`**

写清：怎么跑测试、怎么开游戏、三档灯的键位、当前已知的缺口（没有仓库、没有灵石、只有一只仙女、美术全是占位几何体）。

- [ ] **Step 4: 提交**

```bash
git add README.md
git commit -m "docs: how to run tests and play the first playable build"
```
