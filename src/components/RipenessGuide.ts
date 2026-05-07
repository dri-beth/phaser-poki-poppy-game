import { FRUIT_TEXTURE_KEYS } from '../data/fruitAssets'
export type RipenessStageToken = 'green' | 'yellow' | 'orange' | 'red' | 'rotten'

export interface RipenessGuideConfig {
  scene: Phaser.Scene
  x: number
  y: number
  stages: readonly string[]
  targetStage: string
  animationEnabled?: boolean
  stageSpacing?: number
}

const STAGE_TINT: Record<RipenessStageToken, number> = {
  green: 0x7ccf5b,
  yellow: 0xffcf5a,
  orange: 0xffa94d,
  red: 0xf26b5d,
  rotten: 0x7a5c46
}

const STAGE_TEXTURE: Record<RipenessStageToken, string> = {
  green: FRUIT_TEXTURE_KEYS.unripe,
  yellow: FRUIT_TEXTURE_KEYS.midripe,
  orange: FRUIT_TEXTURE_KEYS.midripe,
  red: FRUIT_TEXTURE_KEYS.ripe,
  rotten: FRUIT_TEXTURE_KEYS.midripe
}

function isStageToken(value: string): value is RipenessStageToken {
  return value === 'green' || value === 'yellow' || value === 'orange' || value === 'red' || value === 'rotten'
}

export class RipenessGuide extends Phaser.GameObjects.Container {
  private readonly stageTokens: readonly RipenessStageToken[]
  private readonly targetStage: RipenessStageToken
  private readonly stageSpacing: number
  private animationEnabled = true
  private readonly animatedTargets: Phaser.GameObjects.GameObject[] = []
  private targetSprite: Phaser.GameObjects.Image | null = null
  private targetRing: Phaser.GameObjects.Arc | null = null
  private targetTapLabel: Phaser.GameObjects.Text | null = null
  private targetSparkle: Phaser.GameObjects.Text | null = null

  constructor(cfg: RipenessGuideConfig) {
    super(cfg.scene, cfg.x, cfg.y)

    const filteredStages = cfg.stages.filter(isStageToken)
    this.stageTokens = filteredStages.length > 0 ? filteredStages : ['green', 'yellow', 'orange', 'red', 'rotten']
    this.targetStage = isStageToken(cfg.targetStage) ? cfg.targetStage : 'red'
    this.stageSpacing = Math.max(36, cfg.stageSpacing ?? 56)
    this.animationEnabled = cfg.animationEnabled ?? true

    this.build()
    cfg.scene.add.existing(this)
    this.setDepth(28)
  }

  setAnimationEnabled(enabled: boolean): this {
    this.animationEnabled = enabled
    if (!enabled) {
      this.scene.tweens.killTweensOf(this.animatedTargets)
    } else {
      this.playLoops()
    }
    return this
  }

  override destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this.animatedTargets)
    super.destroy(fromScene)
  }

  private build(): void {
    const totalWidth = (this.stageTokens.length - 1) * this.stageSpacing
    const startX = -totalWidth / 2
    const iconSize = this.stageSpacing > 52 ? 40 : 34
    const smallSize = Math.round(iconSize * 0.86)
    const targetSize = Math.round(iconSize * 1.08)
    const arrowColor = '#b08f72'

    for (let i = 0; i < this.stageTokens.length; i++) {
      const token = this.stageTokens[i]
      const x = startX + i * this.stageSpacing
      const isTarget = token === this.targetStage
      const isEarly = !isTarget && token !== 'rotten'

      const textureKey = this.scene.textures.exists(STAGE_TEXTURE[token])
        ? STAGE_TEXTURE[token]
        : FRUIT_TEXTURE_KEYS.legacy
      const sprite = this.scene.add.image(x, 0, textureKey)
      sprite.setDisplaySize(isTarget ? targetSize : isEarly ? smallSize : iconSize, isTarget ? targetSize : isEarly ? smallSize : iconSize)
      if (textureKey === FRUIT_TEXTURE_KEYS.legacy) {
        sprite.setTint(STAGE_TINT[token])
      } else if (token === 'rotten') {
        sprite.setTint(0x8b6e57)
      } else if (token === 'orange') {
        sprite.setTint(0xffa94d)
      }
      sprite.setAlpha(token === 'rotten' ? 0.56 : isEarly ? 0.62 : 1)
      this.add(sprite)
      this.animatedTargets.push(sprite)

      if (isTarget) {
        this.targetSprite = sprite
        this.addTargetEmphasis(x, targetSize)
      }

      if (token === 'rotten') {
        const lateLabel = this.scene.add.text(x, 30, 'Too late', {
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          color: '#8c7352',
          resolution: 2
        }).setOrigin(0.5)
        this.add(lateLabel)
      }

      if (i < this.stageTokens.length - 1) {
        const arrowX = x + this.stageSpacing / 2
        const arrow = this.scene.add.text(arrowX, 0, '→', {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: arrowColor,
          resolution: 2
        }).setOrigin(0.5).setAlpha(0.45)
        this.add(arrow)
      }
    }

    if (this.animationEnabled) {
      this.playLoops()
    }
  }

  private addTargetEmphasis(x: number, iconSize: number): void {
    const ring = this.scene.add.circle(x, 0, iconSize * 0.72, 0xa9f16f, 0.16)
    ring.setStrokeStyle(2, 0x9de667, 0.85)
    this.add(ring)
    this.sendToBack(ring)
    this.targetRing = ring
    this.animatedTargets.push(ring)

    const tapLabel = this.scene.add.text(x, -34, 'TAP!', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#7ccf5b',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 2,
      resolution: 2
    }).setOrigin(0.5)
    this.add(tapLabel)
    this.targetTapLabel = tapLabel
    this.animatedTargets.push(tapLabel)

    const sparkle = this.scene.add.text(x + iconSize * 0.34, -iconSize * 0.32, '✦', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#fff6c7',
      resolution: 2
    }).setOrigin(0.5)
    this.add(sparkle)
    this.targetSparkle = sparkle
    this.animatedTargets.push(sparkle)
  }

  private playLoops(): void {
    if (this.targetSprite) {
      this.scene.tweens.add({
        targets: this.targetSprite,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 440,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    if (this.targetRing) {
      this.scene.tweens.add({
        targets: this.targetRing,
        scaleX: 1.06,
        scaleY: 1.06,
        alpha: 0.18,
        duration: 560,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    if (this.targetTapLabel) {
      this.scene.tweens.add({
        targets: this.targetTapLabel,
        y: -38,
        alpha: 0.8,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    if (this.targetSparkle) {
      this.scene.tweens.add({
        targets: this.targetSparkle,
        x: this.targetSparkle.x + 2,
        alpha: 0.55,
        duration: 640,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }
  }
}
