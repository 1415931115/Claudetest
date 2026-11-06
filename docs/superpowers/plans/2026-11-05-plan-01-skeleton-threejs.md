# 蟠桃园 · 计划一：可跑的骨架（Three.js 版）— 实现计划

> 本文件取代 `2026-11-05-plan-01-skeleton.md`（Godot 版）。引擎改用 Three.js 后，那份计划作废。

> **For agentic workers:** REQUIRED SUB-SKILL: Use the `executing-plans` skill to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在浏览器里跑出第一个能玩的闭环——黑暗中提灯走、蹲到桃树下搜索、背包塞满、被仙女发现后玩命跑、撤出去。

**Architecture:** 纯逻辑（背包、搜索、仙女决策）写成不 import three 的 TypeScript 模块，用 Vitest 在 Node 里覆盖；`src/scene/**` 只负责把输入、光照、渲染和这些模块接起来。这条边界是硬规矩——它保证我能自动验证的部分，和只有你能用眼睛判断的部分，不会混在一起。

**Tech Stack:** Three.js（WebGL2）、TypeScript（strict）、Vite、Vitest。

**Spec:** `outputs/2026-11-05-peach-garden-design.md`

## Global Constraints

- 性能目标：GTX 1060，1080p，稳定 60 帧以上。
- 全场景只有一盏投阴影的光源：玩家手里的 SpotLight，阴影贴图 1024×1024。
- 不开 SSAO、不开体积雾、不开实时反射、不开 MSAA；`renderer.setPixelRatio(Math.min(devicePixelRatio, 1))`。
- 泛光走半分辨率；后处理链固定为 RenderPass → UnrealBloomPass → OutputPass。
- 色调映射固定 ACESFilmic，曝光 1.0。
- 树与静态道具用 `InstancedMesh` 合批，draw call 上限 600。
- `src/logic/**` 不得 import `three`，也不得 import 任何 DOM API。
- 仙子 AI 的感知检测按 5–10 Hz 节流，不做每帧全图寻路。
- 无联机、无战斗、无装备、无天兵。所有仙女碰到玩家即秒杀，玩家无反击手段。
- 搜索过程中玩家完全不能移动；中途松手进度回退到 60%；被仙女打断则清零。
- 撤离即触即走，不读条。
- 死亡或撤离失败：本趟所得全丢；撤离成功那一刻落盘。
- TypeScript `strict: true`，不允许 `any` 逃逸（`noImplicitAny`、`strictNullChecks` 均开）。
- 项目根目录：`peach-garden/`。所有路径相对于它。

## Review Focus

- **松手与被打断同帧**：玩家松开搜索键的同一帧仙女打断搜索时，进度必须清零，不是只回退 40%。
- **格子放置的边界与重叠**：物品贴着右边界或下边界放置、以及两件物品对角相邻时，不得越界或重叠。
- **仙女丢失目标的计时**：玩家静止与持续奔跑时，丢失目标所需时间必须不同，否则玩家可以站着看仙女绕圈。
- **指针锁丢失**：玩家按 Esc 退出指针锁时必须立刻暂停（仙女停住、计时停住），否则玩家会在看鼠标的时候被秒杀——浏览器里这是个很容易漏掉的洞。
- **最暗一档灯的可玩性下限**：在"几乎熄灭"档，经 ACES 映射后玩家必须仍能看清脚前一米的地面和背包界面，否则这一档等于不可用。

---

## Task 1: 工程骨架与 Vitest 跑通

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces: `npm test` 运行 Vitest；`npm run dev` 起 Vite 开发服务器；`npm run build` 类型检查并构建。`tsconfig.json` 开 `strict: true`、`moduleResolution: "bundler"`、`types: ["vite/client"]`。

- [ ] **Step 1: 写失败的测试**

```ts
// tests/smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('has a working test runner', () => {
    expect(1 + 1).toBe(2)
    expect(false).toBe(true)
  })
})
```

- [ ] **Step 2: 运行，确认它以"没有测试框架"失败**

Run: `npm test`
Expected: 报错，`vitest` 未安装

- [ ] **Step 3: 建 `package.json`**

依赖：`three`；开发依赖：`typescript`、`vite`、`vitest`、`@types/three`。脚本：`"dev": "vite"`、`"build": "tsc --noEmit && vite build"`、`"test": "vitest run"`。

```bash
npm install
```

- [ ] **Step 4: 运行，确认那条故意失败的断言真的失败**

Run: `npm test`
Expected: `1 failed`，退出码 1

- [ ] **Step 5: 删掉刻意失败的那行，重跑**

Run: `npm test`
Expected: `1 passed`，退出码 0

- [ ] **Step 6: 建 `index.html` 与只清屏的 `src/main.ts`**

`main.ts` 建一个 `WebGLRenderer`，挂到 `#app`，清成深灰 (`0x0a0a0c`)，接 `requestAnimationFrame` 循环。先不引入 three 的其它东西。

- [ ] **Step 7: 确认构建与开发服务器都通**

Run: `npm run build`
Expected: 无类型错误，产出 `dist/`

Run: `npm run dev`，浏览器打开提示的地址。
Expected: 一个几乎全黑的页面，控制台无报错。

- [ ] **Step 8: 提交**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/ tests/
git commit -m "feat: vite + typescript + vitest skeleton for the three.js build"
```

---

## Task 2: 格子背包

**Files:**
- Create: `src/logic/inventory.ts`
- Test: `tests/inventory.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces:

```ts
export const COLS = 8
export const ROWS = 6
export interface ItemSize { w: number; h: number }
export interface Cell { x: number; y: number }
export class Inventory {
  canPlace(size: ItemSize, cell: Cell): boolean
  place(size: ItemSize, value: number, cell: Cell): boolean
  removeAt(cell: Cell): number   // 返回该处物品价值；该格为空返回 -1
  totalValue(): number
  occupiedCells(): number
}
```

- [ ] **Step 1: 写失败的测试**

```ts
// tests/inventory.test.ts
import { describe, it, expect } from 'vitest'
import { Inventory } from '../src/logic/inventory'

describe('Inventory', () => {
  it('places an item in an empty bag', () => {
    const inv = new Inventory()
    expect(inv.place({ w: 2, h: 1 }, 10, { x: 0, y: 0 })).toBe(true)
    expect(inv.totalValue()).toBe(10)
    expect(inv.occupiedCells()).toBe(2)
  })

  it('refuses overlap, right overflow, and bottom overflow', () => {
    const inv = new Inventory()
    inv.place({ w: 2, h: 1 }, 10, { x: 0, y: 0 })
    expect(inv.canPlace({ w: 2, h: 1 }, { x: 1, y: 0 })).toBe(false)
    expect(inv.canPlace({ w: 2, h: 1 }, { x: 7, y: 0 })).toBe(false)
    expect(inv.canPlace({ w: 2, h: 1 }, { x: 0, y: 5 })).toBe(false)
  })

  it('accepts a single cell in the far corner', () => {
    const inv = new Inventory()
    expect(inv.canPlace({ w: 1, h: 1 }, { x: 7, y: 5 })).toBe(true)
  })

  it('returns value on removal and -1 on an empty cell', () => {
    const inv = new Inventory()
    inv.place({ w: 2, h: 1 }, 10, { x: 0, y: 0 })
    expect(inv.removeAt({ x: 0, y: 0 })).toBe(10)
    expect(inv.removeAt({ x: 0, y: 0 })).toBe(-1)
    expect(inv.totalValue()).toBe(0)
    expect(inv.occupiedCells()).toBe(0)
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: 报错，找不到 `../src/logic/inventory`

- [ ] **Step 3: 实现 `src/logic/inventory.ts`**

内部用 `Map<string, number>`（键为 `"x,y"`）记录占用，`Array` 记录物品。`canPlace` 先查四条边界，再逐格查占用。

- [ ] **Step 4: 运行，确认全部通过**

Run: `npm test`
Expected: `4 passed`

- [ ] **Step 5: 提交**

```bash
git add src/logic/inventory.ts tests/inventory.test.ts
git commit -m "feat: grid inventory with boundary and overlap checks"
```

---

## Task 3: 搜索会话

**Files:**
- Create: `src/logic/searchSession.ts`
- Test: `tests/searchSession.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces:

```ts
export class SearchSession {
  constructor(durationSeconds: number)
  tick(deltaSeconds: number): void
  progress(): number      // 0..1
  isComplete(): boolean
  release(): void         // 玩家松手：进度 ×0.6
  interrupt(): void       // 被动打断：进度归零
  noise(): number         // 0..1，随进度线性上升
}
```

- [ ] **Step 1: 写失败的测试**

```ts
// tests/searchSession.test.ts
import { describe, it, expect } from 'vitest'
import { SearchSession } from '../src/logic/searchSession'

describe('SearchSession', () => {
  it('progresses linearly and clamps at completion', () => {
    const s = new SearchSession(4)
    expect(s.progress()).toBe(0)
    s.tick(2)
    expect(s.progress()).toBeCloseTo(0.5)
    expect(s.isComplete()).toBe(false)
    s.tick(2)
    expect(s.isComplete()).toBe(true)
    expect(s.progress()).toBe(1)
    s.tick(99)
    expect(s.progress()).toBe(1)
  })

  it('keeps 60% of progress on release', () => {
    const s = new SearchSession(4)
    s.tick(2)
    s.release()
    expect(s.progress()).toBeCloseTo(0.3)
  })

  it('wipes progress when interrupted', () => {
    const s = new SearchSession(4)
    s.tick(2)
    s.interrupt()
    expect(s.progress()).toBe(0)
  })

  it('is silent before starting and noisy while searching', () => {
    const s = new SearchSession(4)
    expect(s.noise()).toBe(0)
    s.tick(2)
    expect(s.noise()).toBeCloseTo(0.5)
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: 找不到 `../src/logic/searchSession`

- [ ] **Step 3: 实现 `src/logic/searchSession.ts`**

`elapsed` 累加并 `Math.min(elapsed, duration)`；`release()` 与 `interrupt()` 都作用在 `elapsed` 上。

- [ ] **Step 4: 运行，确认全部通过**

Run: `npm test`
Expected: `4 passed`

- [ ] **Step 5: 提交**

```bash
git add src/logic/searchSession.ts tests/searchSession.test.ts
git commit -m "feat: search session with release decay and interrupt"
```

---

## Task 4: 仙女决策内核

**Files:**
- Create: `src/logic/fairyBrain.ts`
- Test: `tests/fairyBrain.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces:

```ts
export enum FairyState { Patrol, Chase, Lost }
export class FairyBrain {
  constructor(loseSightSeconds: number, investigateSeconds: number)
  tick(deltaSeconds: number, seesPlayer: boolean, hearsPlayer: boolean): FairyState
  state(): FairyState
}
```

规则：`seesPlayer || hearsPlayer` 为真时进入 `Chase` 并重置计时；两者连续 `loseSightSeconds` 秒都为假时转 `Lost`；`Lost` 持续 `investigateSeconds` 秒后回 `Patrol`。玩家奔跑会让 `hearsPlayer` 持续为真，于是计时永远被重置——这就是"跑起来甩不掉"的机制来源。

- [ ] **Step 1: 写失败的测试**

```ts
// tests/fairyBrain.test.ts
import { describe, it, expect } from 'vitest'
import { FairyBrain, FairyState } from '../src/logic/fairyBrain'

describe('FairyBrain', () => {
  it('starts patrolling and chases on sight', () => {
    const b = new FairyBrain(3, 2)
    expect(b.state()).toBe(FairyState.Patrol)
    b.tick(0.1, true, false)
    expect(b.state()).toBe(FairyState.Chase)
  })

  it('loses the player after the timeout, then returns to patrol', () => {
    const b = new FairyBrain(3, 2)
    b.tick(0.1, true, false)
    b.tick(2.9, false, false)
    expect(b.state()).toBe(FairyState.Chase)
    b.tick(0.2, false, false)
    expect(b.state()).toBe(FairyState.Lost)
    b.tick(2, false, false)
    expect(b.state()).toBe(FairyState.Patrol)
  })

  it('never loses a running player', () => {
    const b = new FairyBrain(3, 2)
    b.tick(0.1, true, false)
    b.tick(10, false, true)
    expect(b.state()).toBe(FairyState.Chase)
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: 找不到 `../src/logic/fairyBrain`

- [ ] **Step 3: 实现 `src/logic/fairyBrain.ts`**

- [ ] **Step 4: 运行，确认全部通过**

Run: `npm test`
Expected: `3 passed`

- [ ] **Step 5: 提交**

```bash
git add src/logic/fairyBrain.ts tests/fairyBrain.test.ts
git commit -m "feat: fairy decision core with sight loss and hearing override"
```

---

## Task 5: 暗场景、第一人称控制器与三档提灯

**Files:**
- Create: `src/scene/player.ts`
- Create: `src/scene/renderer.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: 无。
- Produces:

```ts
// src/scene/player.ts
export interface PlayerOptions { domElement: HTMLElement; camera: THREE.PerspectiveCamera }
export class Player {
  constructor(opts: PlayerOptions)
  update(deltaSeconds: number): void
  setLampTier(tier: 0 | 1 | 2): void
  isSneaking(): boolean
  speed(): number              // 米/秒，用于仙女听觉判定
  position(): THREE.Vector3
  isPointerLocked(): boolean
}
```

三档灯参数：档 0 `intensity 3`、`distance 3`；档 1 `12 / 7`；档 2 `28 / 12`。`angle = MathUtils.degToRad(26)`、`penumbra = 0.4`、`castShadow = true`、`shadow.mapSize = 1024`、`shadow.bias = -0.0005`。移速：蹲 2.0、走 3.4、跑 5.2（搜索中禁用奔跑）。

- [ ] **Step 1: 写 `src/scene/renderer.ts`**

导出 `createRenderer(canvas)`：`WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })`、`setPixelRatio(Math.min(window.devicePixelRatio, 1))`、`toneMapping = ACESFilmicToneMapping`、`toneMappingExposure = 1.0`、`shadowMap.enabled = true`、`shadowMap.type = PCFShadowMap`。后处理链：`EffectComposer` → `RenderPass` → `UnrealBloomPass`（`resolution` 取半宽半高，`strength 0.35`、`radius 0.4`、`threshold 0.85`）→ `OutputPass`。

- [ ] **Step 2: 写 `src/scene/player.ts`**

指针锁 + WASD + 蹲 + 重力；`camera.position.y` 在 1.7（站）与 1.05（蹲）之间插值。SpotLight 挂在 camera 下，位置 `(0.25, -0.2, 0)`。

- [ ] **Step 3: 在 `main.ts` 里放一块 40×40 的地面和四面墙**

材质用 `MeshStandardMaterial` (color `0x6b6b6b`, roughness 0.9)，`receiveShadow = true`。`scene.fog = new THREE.FogExp2(0x000000, 0.06)`，`HemisphereLight(0x223344, 0x000000, 0.06)`。

- [ ] **Step 4: 亲手走一遍**

Run: `npm run dev`
Expected: 出门就是黑的，只有灯照亮脚前一块；按 WASD 能走，蹲下视角降低，三档灯按到最暗时几乎全黑但**仍看得见脚前约一米的地面**。若最暗档完全看不见，把它调到 `intensity 6 / distance 3.5` 再试。

- [ ] **Step 5: 提交**

```bash
git add src/scene/ src/main.ts
git commit -m "feat: first-person controller with three-tier hand lamp and aces pipeline"
```

---

## Task 6: 桃树、搜索交互与撤离

**Files:**
- Create: `src/scene/level.ts`
- Create: `src/scene/peachTree.ts`
- Create: `src/ui/hud.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `Inventory`（Task 2）、`SearchSession`（Task 3）、`Player`（Task 5）。
- Produces:

```ts
// src/ui/hud.ts
export class Hud {
  setSearchProgress(p: number | null): void   // null 隐藏进度条
  setBag(value: number, cells: number): void
  showToast(text: string): void
}
```

- [ ] **Step 1: 搭场景**

地面、围墙、8 棵桃树（树干 `CylinderGeometry`、树冠 `IcosahedronGeometry`，都用 `InstancedMesh` 合批合到一个 geometry 里），一个撤离点（`RingGeometry` + 发光材质的地面标记）。所有静态物体 `receiveShadow = true`、`castShadow` 只给树冠。

- [ ] **Step 2: 写搜索交互**

玩家与树的距离小于 2.0 米且按住搜索键时，创建 `SearchSession(3)` 每帧 `tick`；松手调 `release()`；进度满则 `inventory.place()`，放不下就用 `showToast("背包装不下")` 提示并保留在地上（树的可采状态不变）。搜索中把玩家移速强制为 0。

- [ ] **Step 3: 写撤离**

玩家走进撤离点半径 1.5 米内即触发：`console.log` 背包总价值，`showToast`，然后重置场景状态（背包清空、树复原、玩家回出生点）。

- [ ] **Step 4: 亲手验收四条**

Run: `npm run dev`
Expected: ① 不拿灯几乎看不见；② 搜索时人钉住不能动，松手进度退回去一截；③ 背包放不下的桃子提示且留在地上；④ 走进撤离点会重置并显示总价值。

- [ ] **Step 5: 提交**

```bash
git add src/scene/level.ts src/scene/peachTree.ts src/ui/hud.ts src/main.ts
git commit -m "feat: peach garden level with search interaction and extraction"
```

---

## Task 7: 一只会追人的仙女

**Files:**
- Create: `src/scene/fairy.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `FairyBrain`（Task 4）、`Player`（Task 5）。
- Produces: `export class Fairy { constructor(scene, patrol: THREE.Vector3[]); update(delta, player: Player): 'alive' | 'killed' }`

- [ ] **Step 1: 搭一只仙女**

`CapsuleGeometry(0.35, 1.2)` + 白色 `MeshStandardMaterial`（占位，怪物模型以后再说），`castShadow = true`，挂在 `THREE.Group` 下，Group 负责位移。

- [ ] **Step 2: 写感知与移动**

每 0.1 秒判定一次（用累加器，不是每帧）：`seesPlayer` = 距离小于当前灯档可见距离（档 0/1/2 分别 0 / 8 / 16 米）且从仙女眼睛向玩家发一条射线没有被墙挡住；`hearsPlayer` = `player.speed() > 3.0` 或玩家正在搜索。把结果喂给 `FairyBrain.tick()`，按状态决定目标点：`Patrol` 沿巡逻点循环、`Chase` 朝玩家、`Lost` 朝最后已知位置，走到后转 `Patrol`。

- [ ] **Step 3: 接秒杀**

与玩家距离小于 0.9 米时返回 `'killed'`；`main.ts` 收到就重置场景并 `showToast("被发现了")`。

- [ ] **Step 4: 亲手验收四条**

Run: `npm run dev`
Expected: ① 关灯蹲着不动，仙女走过去不发现你；② 开亮灯站着，她从远处过来；③ 你跑起来她跟着你的方向；④ 碰到你立刻重开。

- [ ] **Step 5: 提交**

```bash
git add src/scene/fairy.ts src/main.ts
git commit -m "feat: fairy with throttled perception, patrol, chase, and instakill"
```

---

## Task 8: 性能与整体验收

**Files:**
- Create: `src/ui/perfMeter.ts`
- Create: `README.md`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: 前面全部。
- Produces: 无。

- [ ] **Step 1: 加一个性能面板**

`perfMeter.ts` 每秒刷新一次：FPS、`renderer.info.render.calls`、`renderer.info.render.triangles`。按 `F3` 显隐。

- [ ] **Step 2: 在 1060 上实测**

Run: `npm run dev`，按 F3，站到桃林中央、把灯开到最亮、让仙女追着你跑。
Expected: FPS 稳定 60 以上；draw calls 低于 600；三角形低于 30 万。若不到，按这个顺序砍：泛光强度→阴影贴图 1024 降到 512→雾密度提高把远处藏掉→树冠实例数。

- [ ] **Step 3: 跑一遍全部逻辑测试**

Run: `npm test`
Expected: `12 passed`（骨架 1 + 背包 4 + 搜索 4 + 仙女 3）

- [ ] **Step 4: 写 `README.md`**

写清：`npm install`、`npm run dev`、`npm test`、键位（WASD / Ctrl 蹲 / E 搜索 / F 切灯 / Esc 释放鼠标）、当前缺口（没有仓库、没有灵石、只有一只仙女、美术全是占位几何体）。

- [ ] **Step 5: 提交**

```bash
git add src/ui/perfMeter.ts README.md src/main.ts
git commit -m "docs: perf meter and how to run the first playable build"
```
