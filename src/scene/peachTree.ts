import * as THREE from 'three'

const LAYOUT: ReadonlyArray<{ x: number; z: number }> = [
  { x: -11, z: -12 },
  { x: -3, z: -13 },
  { x: 6, z: -11 },
  { x: 13, z: -4 },
  { x: 11, z: 7 },
  { x: 2, z: 12 },
  { x: -7, z: 9 },
  { x: -14, z: 2 },
]

const TRUNK_HEIGHT = 3
const CANOPY_HEIGHT = 3.2
const PEACH_HEIGHT = 2.5

export class PeachGrove {
  readonly positions: THREE.Vector3[]

  private readonly trunks: THREE.InstancedMesh
  private readonly canopies: THREE.InstancedMesh
  private readonly peaches: THREE.InstancedMesh
  private readonly harvested = new Set<number>()

  constructor(scene: THREE.Scene) {
    this.positions = LAYOUT.map((p) => new THREE.Vector3(p.x, 0, p.z))

    const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.35, TRUNK_HEIGHT, 8)
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2b20,
      roughness: 0.95,
      metalness: 0,
    })
    const canopyGeometry = new THREE.IcosahedronGeometry(1.8, 1)
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f4a2a,
      roughness: 0.85,
      metalness: 0,
    })
    const peachGeometry = new THREE.SphereGeometry(0.35, 12, 10)
    const peachMaterial = new THREE.MeshStandardMaterial({
      color: 0xd88a72,
      roughness: 0.55,
      metalness: 0,
      emissive: 0x281008,
    })

    this.trunks = new THREE.InstancedMesh(
      trunkGeometry,
      trunkMaterial,
      this.positions.length,
    )
    this.canopies = new THREE.InstancedMesh(
      canopyGeometry,
      canopyMaterial,
      this.positions.length,
    )
    this.peaches = new THREE.InstancedMesh(
      peachGeometry,
      peachMaterial,
      this.positions.length,
    )

    this.trunks.receiveShadow = true
    this.canopies.castShadow = true
    this.canopies.receiveShadow = true
    this.peaches.castShadow = true

    const dummy = new THREE.Object3D()
    this.positions.forEach((position, index) => {
      dummy.position.set(position.x, TRUNK_HEIGHT / 2, position.z)
      dummy.rotation.set(0, index * 0.7, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      this.trunks.setMatrixAt(index, dummy.matrix)

      dummy.position.set(position.x, CANOPY_HEIGHT, position.z)
      dummy.scale.set(1, 0.9, 1)
      dummy.updateMatrix()
      this.canopies.setMatrixAt(index, dummy.matrix)

      dummy.position.set(position.x + 0.9, PEACH_HEIGHT, position.z + 0.4)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      this.peaches.setMatrixAt(index, dummy.matrix)
    })

    this.trunks.instanceMatrix.needsUpdate = true
    this.canopies.instanceMatrix.needsUpdate = true
    this.peaches.instanceMatrix.needsUpdate = true

    scene.add(this.trunks)
    scene.add(this.canopies)
    scene.add(this.peaches)
  }

  nearestWithin(point: THREE.Vector3, radius: number): number {
    let best = -1
    let bestDistance = radius
    for (let i = 0; i < this.positions.length; i++) {
      const position = this.positions[i]
      if (position === undefined) continue
      const distance = Math.hypot(position.x - point.x, position.z - point.z)
      if (distance <= bestDistance) {
        bestDistance = distance
        best = i
      }
    }
    return best
  }

  isHarvested(index: number): boolean {
    return this.harvested.has(index)
  }

  harvest(index: number): void {
    if (this.harvested.has(index)) return
    this.harvested.add(index)
    const dummy = new THREE.Object3D()
    dummy.position.set(0, -1000, 0)
    dummy.scale.set(0, 0, 0)
    dummy.updateMatrix()
    this.peaches.setMatrixAt(index, dummy.matrix)
    this.peaches.instanceMatrix.needsUpdate = true
  }

  reset(): void {
    this.harvested.clear()
    const dummy = new THREE.Object3D()
    this.positions.forEach((position, index) => {
      dummy.position.set(position.x + 0.9, PEACH_HEIGHT, position.z + 0.4)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      this.peaches.setMatrixAt(index, dummy.matrix)
    })
    this.peaches.instanceMatrix.needsUpdate = true
  }
}
