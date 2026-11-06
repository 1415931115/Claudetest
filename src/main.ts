import * as THREE from 'three'
import { createRenderPipeline } from './scene/renderer'
import { Player } from './scene/player'
import { createLevel } from './scene/level'
import { PeachGrove } from './scene/peachTree'
import { Fairy } from './scene/fairy'
import { Hud } from './ui/hud'
import { PerfMeter } from './ui/perfMeter'
import { Inventory, COLS, ROWS, type Cell, type ItemSize } from './logic/inventory'
import { SearchSession } from './logic/searchSession'
import { shouldSimulate } from './logic/rules'

const PEACH_SIZE: ItemSize = { w: 2, h: 2 }
const PEACH_VALUE = 40
const SEARCH_SECONDS = 3
const SEARCH_RADIUS = 2.0
const EXTRACTION_RADIUS = 1.5

const app = document.querySelector<HTMLDivElement>('#app')
if (app === null) {
  throw new Error('#app not found in index.html')
}

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
)
scene.add(camera)

const canvas = document.createElement('canvas')
app.appendChild(canvas)

const pipeline = createRenderPipeline(canvas, scene, camera)
const level = createLevel(scene)
const grove = new PeachGrove(scene)
const fairy = new Fairy(
  scene,
  [
    new THREE.Vector3(-14, 0, -14),
    new THREE.Vector3(0, 0, -14),
    new THREE.Vector3(12, 0, -8),
    new THREE.Vector3(12, 0, 10),
    new THREE.Vector3(-2, 0, 14),
    new THREE.Vector3(-14, 0, 6),
  ],
  level.occluders,
)
const player = new Player({ domElement: canvas, camera })
player.respawn(level.spawn)
const hud = new Hud(app)
const perf = new PerfMeter(app, pipeline.renderer)

let inventory = new Inventory()
const sessions = new Map<number, SearchSession>()

let activeTree = -1
let searchHeld = false

const hint = document.createElement('div')
hint.textContent =
  '点击画面开始 · WASD 移动 · Ctrl 蹲下 · Shift 疾走 · E 搜索 · F 调灯 · Esc 释放鼠标'
hint.style.cssText = [
  'position:fixed',
  'left:50%',
  'top:50%',
  'transform:translate(-50%,-50%)',
  'padding:16px 22px',
  'border-radius:8px',
  'background:rgba(0,0,0,0.65)',
  'color:#e8dcc8',
  'font:14px/1.6 system-ui,sans-serif',
  'text-align:center',
  'pointer-events:none',
  'transition:opacity .3s',
].join(';')
app.appendChild(hint)

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas
  hint.style.opacity = locked ? '0' : '1'
  if (!locked) {
    searchHeld = false
    endSearch(true)
  }
})

function findFreeCell(size: ItemSize): Cell | null {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell: Cell = { x, y }
      if (inventory.canPlace(size, cell)) return cell
    }
  }
  return null
}

function refreshBag(): void {
  hud.setBag(inventory.totalValue(), inventory.occupiedCells())
}

function startSearch(): void {
  if (activeTree >= 0) return
  if (!player.isPointerLocked()) return
  const index = grove.nearestWithin(player.position(), SEARCH_RADIUS)
  if (index < 0 || grove.isHarvested(index)) return
  if (!sessions.has(index)) sessions.set(index, new SearchSession(SEARCH_SECONDS))
  activeTree = index
  player.setSearching(true)
}

function endSearch(released: boolean): void {
  if (activeTree < 0) return
  const session = sessions.get(activeTree)
  if (session !== undefined && released) session.release()
  activeTree = -1
  player.setSearching(false)
  hud.setSearchProgress(null)
}

function completeSearch(): void {
  const tree = activeTree
  if (tree < 0) return
  const cell = findFreeCell(PEACH_SIZE)
  if (cell === null) {
    hud.showToast('背包装不下')
    sessions.delete(tree)
    endSearch(false)
    return
  }
  inventory.place(PEACH_SIZE, PEACH_VALUE, cell)
  grove.harvest(tree)
  sessions.delete(tree)
  hud.showToast(`摘到蟠桃 · 价值 ${PEACH_VALUE}`)
  refreshBag()
  endSearch(false)
}

function updateSearch(deltaSeconds: number): void {
  if (searchHeld && activeTree < 0) startSearch()
  if (!searchHeld && activeTree >= 0) {
    endSearch(true)
    return
  }
  if (activeTree < 0) return

  const session = sessions.get(activeTree)
  if (session === undefined) return
  session.tick(deltaSeconds)
  hud.setSearchProgress(session.progress())
  if (session.isComplete()) completeSearch()
}

function resetRun(reason: string, total: number): void {
  console.log(`[run] ${reason} value=${total}`)
  hud.showToast(`${reason} · 价值 ${total}`)
  inventory = new Inventory()
  grove.reset()
  sessions.clear()
  fairy.reset()
  searchHeld = false
  activeTree = -1
  player.setSearching(false)
  hud.setSearchProgress(null)
  player.respawn(level.spawn)
  refreshBag()
}

function updateExtraction(): void {
  const position = player.position()
  const distance = Math.hypot(
    position.x - level.extraction.x,
    position.z - level.extraction.z,
  )
  if (distance <= EXTRACTION_RADIUS) {
    resetRun('撤离成功', inventory.totalValue())
  }
}

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.code === 'KeyE') searchHeld = true
})
window.addEventListener('keyup', (event: KeyboardEvent) => {
  if (event.code === 'KeyE') searchHeld = false
})

function resize(): void {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  pipeline.setSize(width, height)
}

window.addEventListener('resize', resize)

const clock = new THREE.Clock()

function frame(): void {
  const delta = Math.min(clock.getDelta(), 0.05)
  player.update(delta)
  if (shouldSimulate(player.isPointerLocked())) {
    updateSearch(delta)
    updateExtraction()
    if (fairy.update(delta, player) === 'killed') {
      resetRun('被发现了', inventory.totalValue())
    }
  }
  pipeline.render()
  perf.update(delta)
  requestAnimationFrame(frame)
}

refreshBag()
requestAnimationFrame(frame)
