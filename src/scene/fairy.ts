import * as THREE from 'three'
import { FairyBrain, FairyState } from '../logic/fairyBrain'
import type { Player } from './player'

const PERCEPTION_INTERVAL = 0.1
const SIGHT_BY_LAMP_TIER: readonly number[] = [0, 8, 16]
const KILL_DISTANCE = 0.9
const PATROL_SPEED = 1.1
const CHASE_SPEED = 4.2
const EYE_HEIGHT = 1.4
const WAYPOINT_RADIUS = 0.6
const LOSING_SIGHT_SECONDS = 2.5
const INVESTIGATE_SECONDS = 3.0

export type FairyResult = 'alive' | 'killed'

export class Fairy {
  private readonly group: THREE.Group
  private brain = new FairyBrain(LOSING_SIGHT_SECONDS, INVESTIGATE_SECONDS)
  private readonly raycaster = new THREE.Raycaster()
  private readonly patrolPoints: THREE.Vector3[]
  private readonly occluders: THREE.Object3D[]
  private readonly lastKnown = new THREE.Vector3()
  private readonly origin: THREE.Vector3

  private perceptionTimer = 0
  private waypoint = 0

  constructor(
    scene: THREE.Scene,
    patrolPoints: THREE.Vector3[],
    occluders: THREE.Object3D[],
  ) {
    if (patrolPoints.length === 0) {
      throw new Error('Fairy needs at least one patrol point')
    }
    this.patrolPoints = patrolPoints
    this.occluders = occluders
    this.origin = patrolPoints[0]?.clone() ?? new THREE.Vector3()

    this.group = new THREE.Group()
    this.group.position.copy(this.origin)

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.2, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0xd8d8e4,
        roughness: 0.45,
        metalness: 0,
        emissive: 0x1a1a24,
      }),
    )
    body.position.y = 0.95
    body.castShadow = true
    this.group.add(body)

    scene.add(this.group)
  }

  update(deltaSeconds: number, player: Player): FairyResult {
    const position = this.group.position
    const target = player.position()
    const flatDistance = Math.hypot(position.x - target.x, position.z - target.z)

    if (flatDistance <= KILL_DISTANCE) return 'killed'

    this.perceptionTimer += deltaSeconds
    if (this.perceptionTimer >= PERCEPTION_INTERVAL) {
      const step = this.perceptionTimer
      this.perceptionTimer = 0
      const sees = this.canSee(player, flatDistance)
      const hears = player.speed() > 3.0 || player.isSearching()
      this.brain.tick(step, sees, hears)
      if (sees) this.lastKnown.copy(target)
    }

    const state = this.brain.state()
    if (state === FairyState.Chase) {
      this.moveToward(target, CHASE_SPEED, deltaSeconds)
    } else if (state === FairyState.Lost) {
      this.moveToward(this.lastKnown, CHASE_SPEED * 0.6, deltaSeconds)
    } else {
      const waypoint = this.patrolPoints[this.waypoint]
      if (waypoint !== undefined) {
        if (this.flatDistanceTo(waypoint) <= WAYPOINT_RADIUS) {
          this.waypoint = (this.waypoint + 1) % this.patrolPoints.length
        } else {
          this.moveToward(waypoint, PATROL_SPEED, deltaSeconds)
        }
      }
    }

    return 'alive'
  }

  reset(): void {
    this.brain = new FairyBrain(LOSING_SIGHT_SECONDS, INVESTIGATE_SECONDS)
    this.perceptionTimer = 0
    this.waypoint = 0
    this.lastKnown.set(0, 0, 0)
    this.group.position.copy(this.origin)
  }

  position(): THREE.Vector3 {
    return this.group.position
  }

  private flatDistanceTo(point: THREE.Vector3): number {
    return Math.hypot(
      this.group.position.x - point.x,
      this.group.position.z - point.z,
    )
  }

  private moveToward(point: THREE.Vector3, speed: number, deltaSeconds: number): void {
    const dx = point.x - this.group.position.x
    const dz = point.z - this.group.position.z
    const distance = Math.hypot(dx, dz)
    if (distance < 0.001) return
    const step = Math.min(speed * deltaSeconds, distance)
    this.group.position.x += (dx / distance) * step
    this.group.position.z += (dz / distance) * step
  }

  private canSee(player: Player, flatDistance: number): boolean {
    const sightRange = SIGHT_BY_LAMP_TIER[player.lampTier()] ?? 0
    if (flatDistance > sightRange) return false

    const target = player.position()
    this.raycaster.set(
      new THREE.Vector3(
        this.group.position.x,
        EYE_HEIGHT,
        this.group.position.z,
      ),
      new THREE.Vector3(
        target.x - this.group.position.x,
        0,
        target.z - this.group.position.z,
      ).normalize(),
    )
    this.raycaster.far = flatDistance
    const hits = this.raycaster.intersectObjects(this.occluders, false)
    return hits.length === 0
  }
}
