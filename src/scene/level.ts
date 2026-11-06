import * as THREE from 'three'

const GROUND_SIZE = 40
const WALL_HEIGHT = 3
const EXTRACTION_POSITION = new THREE.Vector3(-16, 0, -16)
const SPAWN_POSITION = new THREE.Vector3(0, 1.7, 8)

export interface Level {
  readonly extraction: THREE.Vector3
  readonly spawn: THREE.Vector3
  readonly occluders: THREE.Object3D[]
}

export function createLevel(scene: THREE.Scene): Level {
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.FogExp2(0x000000, 0.06)
  scene.add(new THREE.HemisphereLight(0x223344, 0x000000, 0.06))

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b6b6b,
    roughness: 0.9,
    metalness: 0,
  })
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    groundMaterial,
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4038,
    roughness: 0.95,
    metalness: 0,
  })
  const wallGeometry = new THREE.BoxGeometry(GROUND_SIZE, WALL_HEIGHT, 0.5)
  const occluders: THREE.Object3D[] = []
  const half = GROUND_SIZE / 2
  const walls: ReadonlyArray<{ x: number; z: number; rotY: number }> = [
    { x: 0, z: -half, rotY: 0 },
    { x: 0, z: half, rotY: 0 },
    { x: -half, z: 0, rotY: Math.PI / 2 },
    { x: half, z: 0, rotY: Math.PI / 2 },
  ]
  for (const spec of walls) {
    const wall = new THREE.Mesh(wallGeometry, wallMaterial)
    wall.position.set(spec.x, WALL_HEIGHT / 2, spec.z)
    wall.rotation.y = spec.rotY
    wall.receiveShadow = true
    wall.castShadow = true
    scene.add(wall)
    occluders.push(wall)
  }

  const extractionRing = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0x6fd1c8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    }),
  )
  extractionRing.rotation.x = -Math.PI / 2
  extractionRing.position.copy(EXTRACTION_POSITION)
  extractionRing.position.y = 0.02
  scene.add(extractionRing)

  const extractionPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6),
    new THREE.MeshStandardMaterial({
      color: 0x6fd1c8,
      emissive: 0x1d4a46,
      roughness: 0.6,
      metalness: 0,
    }),
  )
  extractionPost.position.copy(EXTRACTION_POSITION)
  extractionPost.position.y = 1.1
  scene.add(extractionPost)

  return {
    extraction: EXTRACTION_POSITION,
    spawn: SPAWN_POSITION,
    occluders,
  }
}
