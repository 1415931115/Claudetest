export class Hud {
  private readonly bar: HTMLDivElement
  private readonly fill: HTMLDivElement
  private readonly bag: HTMLDivElement
  private readonly toast: HTMLDivElement
  private toastTimer: number | null = null

  constructor(root: HTMLElement) {
    this.bar = document.createElement('div')
    this.bar.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:18%',
      'transform:translateX(-50%)',
      'width:220px',
      'height:6px',
      'border-radius:3px',
      'background:rgba(255,255,255,0.12)',
      'opacity:0',
      'transition:opacity .12s',
      'pointer-events:none',
    ].join(';')

    this.fill = document.createElement('div')
    this.fill.style.cssText = [
      'height:100%',
      'width:0%',
      'border-radius:3px',
      'background:#e8c27a',
    ].join(';')
    this.bar.appendChild(this.fill)

    this.bag = document.createElement('div')
    this.bag.style.cssText = [
      'position:fixed',
      'left:20px',
      'bottom:20px',
      'color:#e8dcc8',
      'font:13px/1.5 ui-monospace,monospace',
      'opacity:.75',
      'pointer-events:none',
    ].join(';')

    this.toast = document.createElement('div')
    this.toast.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:28%',
      'transform:translateX(-50%)',
      'color:#e8dcc8',
      'font:14px/1.5 system-ui,sans-serif',
      'padding:6px 12px',
      'border-radius:6px',
      'background:rgba(0,0,0,0.6)',
      'opacity:0',
      'transition:opacity .2s',
      'pointer-events:none',
    ].join(';')

    root.appendChild(this.bar)
    root.appendChild(this.bag)
    root.appendChild(this.toast)

    this.setBag(0, 0)
  }

  setSearchProgress(progress: number | null): void {
    if (progress === null) {
      this.bar.style.opacity = '0'
      return
    }
    this.bar.style.opacity = '1'
    this.fill.style.width = `${Math.round(progress * 100)}%`
  }

  setBag(value: number, cells: number): void {
    this.bag.textContent = `价值 ${value} · 占格 ${cells}`
  }

  showToast(text: string): void {
    this.toast.textContent = text
    this.toast.style.opacity = '1'
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.toast.style.opacity = '0'
      this.toastTimer = null
    }, 1500)
  }
}
