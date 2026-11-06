export enum FairyState {
  Patrol,
  Chase,
  Lost,
}

export class FairyBrain {
  private readonly loseSightSeconds: number
  private readonly investigateSeconds: number
  private current: FairyState = FairyState.Patrol
  private loseTimer = 0
  private lostTimer = 0

  constructor(loseSightSeconds: number, investigateSeconds: number) {
    this.loseSightSeconds = loseSightSeconds
    this.investigateSeconds = investigateSeconds
  }

  tick(
    deltaSeconds: number,
    seesPlayer: boolean,
    hearsPlayer: boolean,
  ): FairyState {
    if (seesPlayer || hearsPlayer) {
      this.current = FairyState.Chase
      this.loseTimer = 0
      this.lostTimer = 0
      return this.current
    }

    if (this.current === FairyState.Chase) {
      this.loseTimer += deltaSeconds
      if (this.loseTimer >= this.loseSightSeconds) {
        this.current = FairyState.Lost
        this.lostTimer = 0
      }
    } else if (this.current === FairyState.Lost) {
      this.lostTimer += deltaSeconds
      if (this.lostTimer >= this.investigateSeconds) {
        this.current = FairyState.Patrol
        this.lostTimer = 0
      }
    }

    return this.current
  }

  state(): FairyState {
    return this.current
  }
}
