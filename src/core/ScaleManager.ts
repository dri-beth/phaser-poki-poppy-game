export class ScaleManager {
  static init(): void {
    window.addEventListener('orientationchange', () => {
      // Trigger a resize pass after browser orientation settles.
      window.setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 80)
    })
    window.addEventListener('resize', () => {
      // Non-blocking hook kept for responsive scene layouts.
    })
  }

  static getPhaserScaleConfig(): Phaser.Types.Core.ScaleConfig {
    return {
      mode: Phaser.Scale.RESIZE,
      parent: 'game-container',
      expandParent: true
    }
  }

  static get viewportWidth(): number {
    return window.innerWidth
  }

  static get viewportHeight(): number {
    return window.innerHeight
  }

  static get isLandscape(): boolean {
    return window.innerWidth > window.innerHeight
  }
}
