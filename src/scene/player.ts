import * as THREE from 'three'

const WALK_SPEED = 3.4
const RUN_SPEED = 5.2
const SNEAK_SPEED = 2.0
const EYE_STANDING = 1.7
const EYE_CROUCHED = 1.05
const BOUNDS = 19.5
const MOUSE_SENSITIVITY = 0.0022
const MAX_PITCH = 1.45

interface LampTier {
  intensity: number
  distance: number
}

const LAMP_TIERS: readonly LampTier[] = [
  { intensity: 3, distance: 3 },
  { intensity: 12, distance: 7 },
  { intensity: 28, distance: 12 },
]

export type LampTierIndex = 0 | 1 | 2

export interface PlayerOptions {
  domElement: HTMLElement
  camera: THREE.PerspectiveCamera
}

export class Player {
  private readonly camera: THREE.PerspectiveCamera
  private readonly dom: HTMLElement
  private readonly lamp: THREE.SpotLight
  private readonly keys = new Set<string>()
  private readonly worldPosition = new THREE.Vector3(0, EYE_STANDING, 8)

  private yaw = 0
  private pitch = 0
  private locked = false
  private crouching = false
  private searching = false
  private tier: LampTierIndex = 1
  private eyeHeight = EYE_STANDING
  private horizontalSpeed = 0

  constructor(opts: PlayerOptions) {
    this.camera = opts.camera
    this.dom = opts.domElement

    this.lamp = new THREE.SpotLight(0xffd9a0, LAMP_TIERS[1].intensity)
    this.lamp.distance = LAMP_TIERS[1].distance
    this.lamp.angle = THREE.MathUtils.degToRad(26)
    this.lamp.penumbra = 0.4
    this.lamp.castShadow = true
    this.lamp.shadow.mapSize.set(1024, 1024)
    this.lamp.shadow.bias = -0.0005
    this.lamp.shadow.camera.near = 0.1
    this.lamp.shadow.camera.far = LAMP_TIERS[2].distance + 2
    this.lamp.position.set(0.25, -0.2, 0)

    this.lamp.target.position.set(0.25, -0.35, -1)
    this.camera.add(this.lamp)
    this.camera.add(this.lamp.target)

    this.dom.addEventListener('click', this.onClick)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    document.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    this.camera.position.copy(this.worldPosition)
  }

  dispose(): void {
    this.dom.removeEventListener('click', this.onClick)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    document.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  update(deltaSeconds: number): void {
    if (!this.locked) {
      this.horizontalSpeed = 0
      return
    }

    this.crouching = this.keys.has('ControlLeft') || this.keys.has('ControlRight')
    const targetEye = this.crouching ? EYE_CROUCHED : EYE_STANDING
    this.eyeHeight += (targetEye - this.eyeHeight) * Math.min(1, deltaSeconds * 12)

    let speed = this.crouching ? SNEAK_SPEED : WALK_SPEED
    if (!this.crouching && this.keys.has('ShiftLeft') && !this.searching) {
      speed = RUN_SPEED
    }
    if (this.searching) speed = 0

    let forward = 0
    let strafe = 0
    if (this.keys.has('KeyW')) forward += 1
    if (this.keys.has('KeyS')) forward -= 1
    if (this.keys.has('KeyD')) strafe += 1
    if (this.keys.has('KeyA')) strafe -= 1

    const length = Math.hypot(forward, strafe)
    if (length > 0) {
      forward /= length
      strafe /= length
    }

    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    const moveX = (-sin * forward + cos * strafe) * speed * deltaSeconds
    const moveZ = (-cos * forward - sin * strafe) * speed * deltaSeconds

    this.worldPosition.x = THREE.MathUtils.clamp(
      this.worldPosition.x + moveX,
      -BOUNDS,
      BOUNDS,
    )
    this.worldPosition.z = THREE.MathUtils.clamp(
      this.worldPosition.z + moveZ,
      -BOUNDS,
      BOUNDS,
    )
    this.horizontalSpeed = length > 0 ? speed : 0

    this.camera.position.set(
      this.worldPosition.x,
      this.eyeHeight,
      this.worldPosition.z,
    )
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }

  setLampTier(tier: LampTierIndex): void {
    this.tier = tier
    const spec = LAMP_TIERS[tier]
    this.lamp.intensity = spec.intensity
    this.lamp.distance = spec.distance
    this.lamp.shadow.camera.far = spec.distance + 2
    this.lamp.shadow.camera.updateProjectionMatrix()
  }

  lampTier(): LampTierIndex {
    return this.tier
  }

  setSearching(searching: boolean): void {
    this.searching = searching
  }

  isSearching(): boolean {
    return this.searching
  }

  isSneaking(): boolean {
    return this.crouching
  }

  speed(): number {
    return this.horizontalSpeed
  }

  position(): THREE.Vector3 {
    return this.worldPosition
  }

  isPointerLocked(): boolean {
    return this.locked
  }

  private readonly onClick = (): void => {
    if (!this.locked) {
      void this.dom.requestPointerLock()
    }
  }

  private readonly onPointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.dom
    if (!this.locked) this.keys.clear()
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.locked) return
    this.yaw -= event.movementX * MOUSE_SENSITIVITY
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - event.movementY * MOUSE_SENSITIVITY,
      -MAX_PITCH,
      MAX_PITCH,
    )
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyF' && this.locked) {
      this.setLampTier((((this.tier as number) + 1) % 3) as LampTierIndex)
      return
    }
    this.keys.add(event.code)
  }

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code)
  }
}
