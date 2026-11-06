import * as THREE from 'three'
import { createRenderPipeline } from './scene/renderer'
import { Player } from './scene/player'

const app = document.querySelector<HTMLDivElement>('#app')
if (app === null) {
  throw new Error('#app not found in index.html')
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)
scene.fog = new THREE.FogExp2(0x000000, 0.06)

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

scene.add(new THREE.HemisphereLight(0x223344, 0x000000, 0.06))

const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x6b6b6b,
  roughness: 0.9,
  metalness: 0,
})
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a4038,
  roughness: 0.95,
  metalness: 0,
})
const wallGeometry = new THREE.BoxGeometry(40, 3, 0.5)
const walls: Array<{ x: number; z: number; rotY: number }> = [
  { x: 0, z: -20, rotY: 0 },
  { x: 0, z: 20, rotY: 0 },
  { x: -20, z: 0, rotY: Math.PI / 2 },
  { x: 20, z: 0, rotY: Math.PI / 2 },
]
for (const spec of walls) {
  const wall = new THREE.Mesh(wallGeometry, wallMaterial)
  wall.position.set(spec.x, 1.5, spec.z)
  wall.rotation.y = spec.rotY
  wall.receiveShadow = true
  wall.castShadow = true
  scene.add(wall)
}

const player = new Player({ domElement: canvas, camera })

const hint = document.createElement('div')
hint.textContent = '点击画面开始 · WASD 移动 · Ctrl 蹲下 · Shift 疾走 · F 调灯 · Esc 释放鼠标'
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
  hint.style.opacity = document.pointerLockElement === canvas ? '0' : '1'
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
  pipeline.render()
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
