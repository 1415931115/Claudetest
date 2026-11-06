const SEARCHING_NOISE = 10
const RUNNING_NOISE = 16
const WALKING_NOISE = 6
const SNEAKING_NOISE = 2

const RUNNING_SPEED = 4.5
const WALKING_SPEED = 2.5
const MOVING_SPEED = 0.05

/**
 * How far a fairy can hear the player, in metres.
 * Speed thresholds rather than a boolean, because the player's speed is the
 * only thing the fairy can actually observe.
 */
export function noiseRadius(speed: number, searching: boolean): number {
  if (searching) return SEARCHING_NOISE
  if (speed >= RUNNING_SPEED) return RUNNING_NOISE
  if (speed >= WALKING_SPEED) return WALKING_NOISE
  if (speed > MOVING_SPEED) return SNEAKING_NOISE
  return 0
}

/** The lamp is nailed to the search: you cannot dim it while both hands work. */
export function canChangeLamp(searching: boolean): boolean {
  return !searching
}

/**
 * The world only advances while the pointer is locked. Without this, a player
 * who presses Esc to reach for the mouse watches a fairy walk into them.
 */
export function shouldSimulate(pointerLocked: boolean): boolean {
  return pointerLocked
}
