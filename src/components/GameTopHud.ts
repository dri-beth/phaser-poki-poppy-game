import { formatTime } from '../utils/helpers'
import { HUDTheme, getDirtRiskVariant } from './HUDTheme'

type HudVariant = 'normal' | 'compact'

export interface GameTopHudConfig {
  scene: Phaser.Scene
  x: number
  y: number
  width: number
  height: number
  compact?: boolean
  layoutVariant?: HudVariant
  fontScale?: number
  padding?: number
  level: number
  progress: number
  dirtValue: number
  dirtMax: number
  timerMs: number
  perfectCount: number
}

interface HudMetrics {
  padX: number
  topPad: number
  rowGap: number
  labelFont: number
  levelFont: number
  timerFont: number
  timerIconFont: number
  valueFont: number
  perfectFont: number
  barHeight: number
  levelY: number
  progressLabelY: number
  progressBarY: number
  dirtLabelY: number
  dirtBarY: number
  timerY: number
  chipY: number
  compactPerfect: boolean
  hideTimerIcon: boolean
}

export class GameTopHud extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Graphics
  private readonly levelText: Phaser.GameObjects.Text
  private readonly progressLabelText: Phaser.GameObjects.Text
  private readonly progressValueText: Phaser.GameObjects.Text
  private readonly progressTrack: Phaser.GameObjects.Graphics
  private readonly progressFill: Phaser.GameObjects.Graphics
  private readonly progressShine: Phaser.GameObjects.Graphics
  private readonly dirtLabelText: Phaser.GameObjects.Text
  private readonly dirtValueText: Phaser.GameObjects.Text
  private readonly dirtTrack: Phaser.GameObjects.Graphics
  private readonly dirtFill: Phaser.GameObjects.Graphics
  private readonly dirtShine: Phaser.GameObjects.Graphics
  private readonly timerIconText: Phaser.GameObjects.Text
  private readonly timerText: Phaser.GameObjects.Text
  private readonly perfectChip: Phaser.GameObjects.Container
  private readonly perfectBg: Phaser.GameObjects.Graphics
  private readonly perfectIcon: Phaser.GameObjects.Text
  private readonly perfectLabel: Phaser.GameObjects.Text
  private readonly perfectValue: Phaser.GameObjects.Text
  private panelWidth: number
  private panelHeight: number
  private variant: HudVariant
  private fontScale: number
  private customPadding?: number
  private metrics!: HudMetrics
  private readonly progressDisplay = { value: 0 }
  private readonly dirtDisplay = { value: 0 }
  private lastTimerSecond = -1
  private currentDirtVariant = getDirtRiskVariant(0)

  constructor(cfg: GameTopHudConfig) {
    super(cfg.scene, cfg.x, cfg.y)
    this.panelWidth = cfg.width
    this.panelHeight = cfg.height
    this.variant = cfg.layoutVariant ?? (cfg.compact ? 'compact' : 'normal')
    this.fontScale = cfg.fontScale ?? 1
    this.customPadding = cfg.padding

    this.panel = cfg.scene.add.graphics()
    this.levelText = cfg.scene.add.text(0, 0, `Level ${cfg.level}`, { fontSize: '22px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textPrimary, fontStyle: 'bold', resolution: 3 }).setOrigin(0, 0)
    this.progressLabelText = cfg.scene.add.text(0, 0, '🎯 Run', { fontSize: '11px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textSecondary, fontStyle: 'bold', resolution: 3 }).setOrigin(0, 0.5)
    this.progressValueText = cfg.scene.add.text(0, 0, `${Math.round(cfg.progress * 100)}%`, { fontSize: '11px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textPrimary, fontStyle: 'bold', resolution: 3 }).setOrigin(1, 0.5)
    this.progressTrack = cfg.scene.add.graphics()
    this.progressFill = cfg.scene.add.graphics()
    this.progressShine = cfg.scene.add.graphics()
    this.dirtLabelText = cfg.scene.add.text(0, 0, '🧹 Dirt', { fontSize: '11px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textSecondary, fontStyle: 'bold', resolution: 3 }).setOrigin(0, 0.5)
    this.dirtValueText = cfg.scene.add.text(0, 0, `${cfg.dirtValue} / ${cfg.dirtMax}`, { fontSize: '11px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textPrimary, fontStyle: 'bold', resolution: 3 }).setOrigin(1, 0.5)
    this.dirtTrack = cfg.scene.add.graphics()
    this.dirtFill = cfg.scene.add.graphics()
    this.dirtShine = cfg.scene.add.graphics()
    this.timerIconText = cfg.scene.add.text(0, 0, '⏱', { fontSize: '16px', fontFamily: HUDTheme.typography.fontFamily, resolution: 3 }).setOrigin(0.5)
    this.timerText = cfg.scene.add.text(0, 0, formatTime(cfg.timerMs), { fontSize: '24px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textPrimary, fontStyle: 'bold', resolution: 3 }).setOrigin(0, 0.5)
    this.perfectChip = cfg.scene.add.container(0, 0)
    this.perfectBg = cfg.scene.add.graphics()
    this.perfectIcon = cfg.scene.add.text(0, 0, '⭐', { fontSize: '15px', fontFamily: HUDTheme.typography.fontFamily, resolution: 3 }).setOrigin(0, 0.5)
    this.perfectLabel = cfg.scene.add.text(0, 0, 'Perfect', { fontSize: '11px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textSecondary, fontStyle: 'bold', resolution: 3 }).setOrigin(0, 0.5)
    this.perfectValue = cfg.scene.add.text(0, 0, `x${cfg.perfectCount}`, { fontSize: '13px', fontFamily: HUDTheme.typography.fontFamily, color: HUDTheme.colors.textPrimary, fontStyle: 'bold', resolution: 3 }).setOrigin(0, 0.5)

    this.perfectChip.add([this.perfectBg, this.perfectIcon, this.perfectLabel, this.perfectValue])
    this.add([
      this.panel,
      this.levelText,
      this.progressLabelText,
      this.progressTrack,
      this.progressFill,
      this.progressShine,
      this.progressValueText,
      this.dirtLabelText,
      this.dirtTrack,
      this.dirtFill,
      this.dirtShine,
      this.dirtValueText,
      this.timerIconText,
      this.timerText,
      this.perfectChip
    ])

    this.applyLayoutMetrics()
    this.setProgress(cfg.progress, `${Math.round(cfg.progress * 100)}%`, false)
    this.setDirt(cfg.dirtValue / cfg.dirtMax, `${cfg.dirtValue} / ${cfg.dirtMax}`, false)
    this.setPerfect(cfg.perfectCount, false)
    this.setTimer(cfg.timerMs, true)
    cfg.scene.add.existing(this)
    this.setDepth(HUDTheme.depth.hud)
  }

  setLayout(layout: {
    x: number
    y: number
    width: number
    height: number
    variant?: HudVariant
    fontScale?: number
    padding?: number
  }): this {
    this.setPosition(layout.x, layout.y)
    this.panelWidth = layout.width
    this.panelHeight = layout.height
    this.variant = layout.variant ?? this.variant
    this.fontScale = layout.fontScale ?? this.fontScale
    this.customPadding = layout.padding ?? this.customPadding
    this.applyLayoutMetrics()
    this.drawProgress()
    this.drawDirt()
    return this
  }

  setLevel(level: number): this {
    this.levelText.setText(`Level ${level}`)
    return this
  }

  setProgress(value: number, valueLabel?: string, pulse = false): this {
    const nextValue = Phaser.Math.Clamp(value, 0, 1)
    if (valueLabel) this.progressValueText.setText(valueLabel)
    this.scene.tweens.killTweensOf(this.progressDisplay)
    this.scene.tweens.add({
      targets: this.progressDisplay,
      value: nextValue,
      duration: 160,
      ease: 'Quad.easeOut',
      onUpdate: () => this.drawProgress(),
      onComplete: () => this.drawProgress()
    })
    if (pulse) this.pulse(this.progressValueText, 1.1, 150)
    return this
  }

  setDirt(value: number, valueLabel?: string, pulse = false): this {
    const nextValue = Phaser.Math.Clamp(value, 0, 1)
    if (valueLabel) this.dirtValueText.setText(valueLabel)
    this.currentDirtVariant = getDirtRiskVariant(nextValue)
    this.scene.tweens.killTweensOf(this.dirtDisplay)
    this.scene.tweens.add({
      targets: this.dirtDisplay,
      value: nextValue,
      duration: 160,
      ease: 'Quad.easeOut',
      onUpdate: () => this.drawDirt(),
      onComplete: () => this.drawDirt()
    })
    if (pulse) this.pulse(this.dirtValueText, 1.08, 150)
    return this
  }

  setTimer(ms: number, force = false): this {
    const shownSecond = Math.ceil(ms / 1000)
    if (!force && shownSecond === this.lastTimerSecond) return this
    this.lastTimerSecond = shownSecond
    this.timerText.setText(formatTime(ms))
    const color = ms <= 5000 ? '#b0362f' : ms <= 10000 ? '#d95a4e' : HUDTheme.colors.textPrimary
    this.timerText.setColor(color)
    this.scene.tweens.killTweensOf(this.timerText)
    this.timerText.setScale(1)
    return this
  }

  pulseTimer(ms: number): void {
    if (ms <= 5000) {
      this.timerText.setScale(1 + Math.sin(this.scene.time.now * 0.02) * 0.08)
      return
    }
    if (ms <= 10000) {
      this.timerText.setScale(1 + Math.sin(this.scene.time.now * 0.012) * 0.03)
      return
    }
    this.timerText.setScale(1)
  }

  setPerfect(count: number, pulse = true): this {
    this.perfectValue.setText(`x${count}`)
    if (pulse) this.pulse(this.perfectChip, 1.05, 160)
    return this
  }

  private applyLayoutMetrics(): void {
    this.metrics = this.computeMetrics()

    const leftX = -this.panelWidth / 2 + this.metrics.padX
    const rightX = this.panelWidth / 2 - this.metrics.padX
    const labelStyle = {
      fontFamily: HUDTheme.typography.fontFamily,
      fontStyle: 'bold',
      resolution: 3
    }

    this.levelText.setPosition(leftX, this.metrics.levelY).setFontSize(this.metrics.levelFont)
    this.progressLabelText
      .setPosition(leftX, this.metrics.progressLabelY)
      .setFontSize(this.metrics.labelFont)
      .setStyle({ ...labelStyle, color: HUDTheme.colors.textSecondary })
    this.progressValueText
      .setPosition(rightX, this.metrics.progressLabelY)
      .setFontSize(this.metrics.labelFont)
      .setStyle({ ...labelStyle, color: HUDTheme.colors.textPrimary })
    this.dirtLabelText
      .setPosition(leftX, this.metrics.dirtLabelY)
      .setFontSize(this.metrics.labelFont)
      .setStyle({ ...labelStyle, color: HUDTheme.colors.textSecondary })
    this.dirtValueText
      .setPosition(rightX, this.metrics.dirtLabelY)
      .setFontSize(this.metrics.labelFont)
      .setStyle({ ...labelStyle, color: HUDTheme.colors.textPrimary })

    this.timerIconText
      .setPosition(-this.metrics.timerFont * 0.62, this.metrics.timerY)
      .setFontSize(this.metrics.timerIconFont)
      .setVisible(!this.metrics.hideTimerIcon)
    this.timerText.setPosition(this.metrics.hideTimerIcon ? 0 : 6, this.metrics.timerY).setFontSize(this.metrics.timerFont)

    this.perfectChip.setPosition(0, this.metrics.chipY)
    this.perfectBg.clear()
    this.perfectBg.fillStyle(HUDTheme.colors.panelFill, 0.4)
    this.perfectBg.fillRoundedRect(-72, -16, 144, 32, 12)

    this.perfectIcon.setFontSize(this.metrics.perfectFont + 2)
    this.perfectLabel.setFontSize(this.metrics.labelFont)
    this.perfectValue.setFontSize(this.metrics.valueFont)

    if (this.metrics.compactPerfect) {
      this.perfectIcon.setPosition(-48, 0)
      this.perfectLabel.setVisible(false)
      this.perfectValue.setPosition(-16, 0)
    } else {
      this.perfectIcon.setPosition(-52, 0)
      this.perfectLabel.setVisible(true).setPosition(-26, -7)
      this.perfectValue.setPosition(-24, 8)
    }

    this.drawPanel()
  }

  private computeMetrics(): HudMetrics {
    const padX = this.customPadding ?? (this.variant === 'compact' ? 12 : 14)
    const topPad = this.variant === 'compact' ? 8 : 10
    const rowGap = this.panelHeight < 156 ? 24 : 28
    const scale = Phaser.Math.Clamp(this.fontScale, 0.88, 1.2)
    const base = this.variant === 'compact' ? 1 : 1.06
    const fontMul = base * scale
    const levelFont = Math.round(22 * fontMul)
    const labelFont = Math.round(13 * fontMul)
    const timerFont = Math.round(28 * fontMul)
    const timerIconFont = Math.round(18 * fontMul)
    const valueFont = Math.round(15 * fontMul)
    const perfectFont = Math.round(15 * fontMul)
    const barHeight = this.panelHeight < 156 ? 8 : 9
    const startY = -this.panelHeight / 2 + topPad
    const levelY = startY
    const progressLabelY = levelY + rowGap
    const progressBarY = progressLabelY + 10
    const dirtLabelY = progressBarY + rowGap + 2
    const dirtBarY = dirtLabelY + 10
    const timerY = dirtBarY + rowGap + 10
    const chipY = timerY + rowGap + 2

    return {
      padX,
      topPad,
      rowGap,
      labelFont,
      levelFont,
      timerFont,
      timerIconFont,
      valueFont,
      perfectFont,
      barHeight,
      levelY,
      progressLabelY,
      progressBarY,
      dirtLabelY,
      dirtBarY,
      timerY,
      chipY,
      compactPerfect: this.panelHeight < 160,
      hideTimerIcon: true
    }
  }

  private drawPanel(): void {
    const x = -this.panelWidth / 2
    const y = -this.panelHeight / 2
    this.panel.clear()
    this.panel.fillStyle(HUDTheme.colors.shadow, 0.06)
    this.panel.fillRoundedRect(x + 2, y + 3, this.panelWidth, this.panelHeight, HUDTheme.radius.panel)
    this.panel.fillStyle(HUDTheme.colors.panelFill, 0.72)
    this.panel.fillRoundedRect(x, y, this.panelWidth, this.panelHeight, HUDTheme.radius.panel)
    this.panel.lineStyle(1, HUDTheme.colors.panelStroke, 0.48)
    this.panel.strokeRoundedRect(x, y, this.panelWidth, this.panelHeight, HUDTheme.radius.panel)
  }

  private drawProgress(): void {
    const width = this.panelWidth - this.metrics.padX * 2
    const x = -width / 2
    const y = this.metrics.progressBarY
    const fillWidth = Math.max(0, Math.round(width * this.progressDisplay.value))

    this.progressTrack.clear()
    this.progressTrack.fillStyle(HUDTheme.colors.track, 0.88)
    this.progressTrack.fillRoundedRect(x, y, width, this.metrics.barHeight, HUDTheme.radius.bar)
    this.progressTrack.lineStyle(1, HUDTheme.colors.trackStroke, 0.24)
    this.progressTrack.strokeRoundedRect(x, y, width, this.metrics.barHeight, HUDTheme.radius.bar)

    this.progressFill.clear()
    if (fillWidth > 0) {
      this.progressFill.fillStyle(HUDTheme.colors.success, 1)
      this.progressFill.fillRoundedRect(x, y, fillWidth, this.metrics.barHeight, HUDTheme.radius.bar)
    }

    this.progressShine.clear()
    if (fillWidth > 12) {
      this.progressShine.fillStyle(0xffffff, 0.24)
      this.progressShine.fillRoundedRect(x + 3, y + 1, Math.max(0, fillWidth - 6), 2, 1)
    }
  }

  private drawDirt(): void {
    const width = this.panelWidth - this.metrics.padX * 2
    const x = -width / 2
    const y = this.metrics.dirtBarY
    const fillWidth = Math.max(0, Math.round(width * this.dirtDisplay.value))
    const color = this.currentDirtVariant === 'danger'
      ? HUDTheme.colors.danger
      : this.currentDirtVariant === 'warning'
        ? HUDTheme.colors.warning
        : HUDTheme.colors.success

    this.dirtTrack.clear()
    this.dirtTrack.fillStyle(HUDTheme.colors.track, 0.88)
    this.dirtTrack.fillRoundedRect(x, y, width, this.metrics.barHeight, HUDTheme.radius.bar)
    this.dirtTrack.lineStyle(1, HUDTheme.colors.trackStroke, 0.24)
    this.dirtTrack.strokeRoundedRect(x, y, width, this.metrics.barHeight, HUDTheme.radius.bar)

    this.dirtFill.clear()
    if (fillWidth > 0) {
      this.dirtFill.fillStyle(color, 1)
      this.dirtFill.fillRoundedRect(x, y, fillWidth, this.metrics.barHeight, HUDTheme.radius.bar)
    }

    this.dirtShine.clear()
    if (fillWidth > 12) {
      this.dirtShine.fillStyle(0xffffff, 0.2)
      this.dirtShine.fillRoundedRect(x + 3, y + 1, Math.max(0, fillWidth - 6), 2, 1)
    }
  }

  private pulse(
    target: Phaser.GameObjects.Container | Phaser.GameObjects.Text | Phaser.GameObjects.Image | Phaser.GameObjects.Graphics,
    scale: number,
    duration: number
  ): void {
    this.scene.tweens.killTweensOf(target)
    target.setScale(scale)
    this.scene.tweens.add({
      targets: target,
      scaleX: 1,
      scaleY: 1,
      duration,
      ease: 'Back.easeOut'
    })
  }
}
