import type { PokiPlugin } from '@poki/phaser-3'

function getPokiPlugin(scene: Phaser.Scene): PokiPlugin | null {
  const plugin = scene.plugins.get('poki')
  if (!plugin) {
    return null
  }

  return plugin as PokiPlugin
}

export function pokiGameLoadingFinished(scene: Phaser.Scene): void {
  getPokiPlugin(scene)?.gameLoadingFinished()
}

export function pokiGameplayStart(scene: Phaser.Scene): void {
  getPokiPlugin(scene)?.gameplayStart()
}

export function pokiGameplayStop(scene: Phaser.Scene): void {
  getPokiPlugin(scene)?.gameplayStop()
}
