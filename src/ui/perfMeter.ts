import type * as THREE from 'three'

const REFRESH_SECONDS = 1

export class PerfMeter {
  private readonly el: HTMLDivElement
  private readonly renderer: THREE.WebGLRenderer
  private frames = 0
  private elapsed = 0

  constructor(root: HTMLElement, renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.el = document.createElement('div')
    this.el.style.cssText = [
      'position:fixed',
      'right:20px',
      'top:20px',
      'color:#8ef0b0',
      'font:12px/1.5 ui-monospace,monospace',
      'padding:6px 10px',
      'border-radius:6px',
      'background:rgba(0,0,0,0.6)',
      'pointer-events:none',
      'display:none',
    ].join(';')
    root.appendChild(this.el)

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.code === 'F3') {
        const hidden = this.el.style.display === 'none'
        this.el.style.display = hidden ? 'block' : 'none'
      }
    })
  }

  update(deltaSeconds: number): void {
    this.frames += 1
    this.elapsed += deltaSeconds
    if (this.elapsed < REFRESH_SECONDS) return

    const fps = this.frames / this.elapsed
    const info = this.renderer.info.render
    this.el.textContent = [
      `fps ${fps.toFixed(0)}`,
      `calls ${info.calls}`,
      `tris ${(info.triangles / 1000).toFixed(0)}k`,
    ].join(' · ')

    this.frames = 0
    this.elapsed = 0
  }
}
