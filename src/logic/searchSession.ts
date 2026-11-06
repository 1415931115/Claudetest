export class SearchSession {
  private readonly duration: number
  private elapsed = 0

  constructor(durationSeconds: number) {
    this.duration = durationSeconds
  }

  tick(deltaSeconds: number): void {
    this.elapsed = Math.min(this.elapsed + deltaSeconds, this.duration)
  }

  progress(): number {
    if (this.duration <= 0) return 1
    return this.elapsed / this.duration
  }

  isComplete(): boolean {
    return this.elapsed >= this.duration
  }

  release(): void {
    this.elapsed *= 0.6
  }

  interrupt(): void {
    this.elapsed = 0
  }

  noise(): number {
    return this.progress()
  }
}
