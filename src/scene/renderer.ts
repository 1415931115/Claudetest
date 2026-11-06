import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export interface RenderPipeline {
  renderer: THREE.WebGLRenderer
  composer: EffectComposer
  setSize(width: number, height: number): void
  render(): void
}

const BLOOM_STRENGTH = 0.35
const BLOOM_RADIUS = 0.4
const BLOOM_THRESHOLD = 0.85

export function createRenderPipeline(
  canvas: HTMLCanvasElement,
  scene: THREE.Scene,
  camera: THREE.Camera,
): RenderPipeline {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  )
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const pipeline: RenderPipeline = {
    renderer,
    composer,
    setSize(width: number, height: number): void {
      renderer.setSize(width, height)
      composer.setSize(width, height)
      bloom.resolution.set(width / 2, height / 2)
    },
    render(): void {
      composer.render()
    },
  }

  pipeline.setSize(window.innerWidth, window.innerHeight)
  return pipeline
}
