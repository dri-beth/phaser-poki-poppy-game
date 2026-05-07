/**
 * MenuScene.ts
 * Fruit Pop title screen.
 *
 * Responsibilities:
 * - Animated fruit backdrop
 * - Play button -> CountdownScene
 * - Mute toggle button
 * - Saved best score display
 */

import { UIButton } from '../components/UIButton'
import { RipenessGuide } from '../components/RipenessGuide'
import { AudioManager } from '../core/AudioManager'
import { SaveManager, SAVE_KEYS } from '../core/SaveManager'
import { config } from '../core/Config'
import { ScaleManager } from '../core/ScaleManager'
import { getViewportLayout, type ViewportLayout } from '../core/ViewportLayout'
import { BALANCING } from '../data/balancing'
import { pokiBridge } from '../lib/poki/PokiBridge'

const BACKDROP_COLORS = [0xffc857, 0xff8c42, 0xf26b5d, 0x7ccf5b, 0x89c2ff]

export class MenuScene extends Phaser.Scene {
  private muteButton!: UIButton
  private ripenessGuide: RipenessGuide | null = null
  private enterKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key
  private escapeKey!: Phaser.Input.Keyboard.Key
  private menuProfile!: MenuProfile

  constructor() {
    super({ key: 'MenuScene' })
  }

  create(): void {
    const layout = getViewportLayout()
    this.menuProfile = this.getMenuProfile(layout)
    this.cameras.main.setBackgroundColor(config.game.backgroundColor)
    this.cameras.main.fadeIn(BALANCING.sceneFadeDuration, 0, 0, 0)
    pokiBridge.init(this)

    this.createBackground(layout)
    this.createBackdropFruitGrid(layout)
    this.createTitle(layout)
    this.createRipenessGuide(layout)
    this.createButtons(layout)
    this.createFooter(layout)
    this.setupKeyboard()

    // TODO: analytics hook - menu_viewed
  }

  private createBackground(layout: ViewportLayout): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const bg = this.add.graphics()
    bg.fillGradientStyle(0xf7ead4, 0xf7ead4, 0xe9f4dc, 0xe7f0ff, 1)
    bg.fillRect(0, 0, width, height)

    bg.fillStyle(0xffffff, 0.1)
    bg.fillCircle(layout.cx - width * 0.28, height * 0.2, Math.min(190, width * 0.42))
    bg.fillStyle(0xffb18f, 0.08)
    bg.fillCircle(layout.cx + width * 0.24, height - height * 0.18, Math.min(230, width * 0.48))
  }

  private createBackdropFruitGrid(layout: ViewportLayout): void {
    const cols = 4
    const rows = 3
    const fruitSize = layout.isLandscape ? 46 : this.menuProfile.isCompact ? 50 : 54
    const gapX = layout.isLandscape ? 84 : this.menuProfile.isCompact ? 88 : 94
    const gapY = layout.isLandscape ? 94 : this.menuProfile.isCompact ? 100 : 108
    const gridWidth = (cols - 1) * gapX
    const startX = layout.cx - gridWidth / 2
    const startY = this.menuProfile.titleY - (layout.isLandscape ? 36 : 54)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const fruit = this.add.image(startX + col * gapX, startY + row * gapY, 'fruit')
        fruit.setDisplaySize(fruitSize, fruitSize)
        fruit.setAlpha(0.18)
        fruit.setTint(BACKDROP_COLORS[(row + col) % BACKDROP_COLORS.length])
        fruit.setRotation((row - col) * 0.04)

        this.tweens.add({
          targets: fruit,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 1800 + row * 120,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: (row + col) * 90
        })
      }
    }
  }

  private createTitle(layout: ViewportLayout): void {
    const titleY = this.menuProfile.titleY
    const subtitleY = this.menuProfile.subtitleY
    const titleSize = this.menuProfile.titleFontSize
    const subtitleSize = this.menuProfile.subtitleFontSize

    this.add
      .text(layout.cx, titleY, config.game.title, {
        fontSize: titleSize,
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2,
        stroke: '#ffffff',
        strokeThickness: 4
      })
      .setOrigin(0.5)

    this.add
      .text(layout.cx, subtitleY, 'Tap fruit at peak ripeness', {
        fontSize: subtitleSize,
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)
  }

  private createRipenessGuide(layout: ViewportLayout): void {
    this.ripenessGuide = new RipenessGuide({
      scene: this,
      x: layout.cx,
      y: this.menuProfile.guideY,
      stages: ['green', 'yellow', 'orange', 'red', 'rotten'],
      targetStage: 'red',
      animationEnabled: true,
      stageSpacing: this.menuProfile.guideSpacing
    })
  }

  private createButtons(layout: ViewportLayout): void {
    const playY = this.menuProfile.playY
    const muteY = this.menuProfile.muteY
    const playWidth = this.menuProfile.playWidth
    const playFont = this.menuProfile.playFontSize
    const muteWidth = this.menuProfile.muteWidth
    const muteFont = this.menuProfile.muteFontSize

    new UIButton({
      scene: this,
      x: layout.cx,
      y: playY,
      width: playWidth,
      height: 64,
      label: 'PLAY',
      fontSize: playFont,
      color: 0xf26b5d,
      hoverColor: 0xff7f73,
      pressColor: 0xd95a4e,
      onClick: () => this.startGame()
    })

    const muteLabel = AudioManager.muted ? 'Muted' : 'Sound On'
    this.muteButton = new UIButton({
      scene: this,
      x: layout.cx,
      y: muteY,
      width: muteWidth,
      height: 48,
      label: muteLabel,
      fontSize: muteFont,
      color: 0x8c7352,
      hoverColor: 0xa28967,
      pressColor: 0x6d5740,
      onClick: () => this.toggleMute()
    })
  }

  private createFooter(layout: ViewportLayout): void {
    const footerY = this.menuProfile.footerY
    const hs = SaveManager.load<number>(SAVE_KEYS.highScore, 0)
    if (hs > 0) {
      this.add
        .text(layout.cx, footerY, `Best Harvest: ${hs.toLocaleString()}`, {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#7a3e2c',
          resolution: 2
        })
        .setOrigin(0.5)
    } else {
      this.add
        .text(layout.cx, footerY, 'One tap at a time.', {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#7a3e2c',
          resolution: 2
        })
        .setOrigin(0.5)
    }

    this.add
      .text(layout.cx, layout.footerBottom, `v${config.game.version}`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)
  }

  private setupKeyboard(): void {
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    this.enterKey.on('down', this.startGame, this)
    this.spaceKey.on('down', this.startGame, this)
    this.escapeKey.on('down', this.toggleMute, this)
  }

  private startGame(): void {
    // TODO: analytics hook - game_started
    this.cameras.main.fadeOut(BALANCING.sceneFadeDuration, 0, 0, 0)
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => this.scene.start('CountdownScene', { level: 1 })
    )
  }

  private toggleMute(): void {
    const nowMuted = AudioManager.toggleMute()
    this.muteButton.setText(nowMuted ? 'Muted' : 'Sound On')
  }

  shutdown(): void {
    if (this.ripenessGuide) {
      this.ripenessGuide.destroy()
      this.ripenessGuide = null
    }
    this.enterKey?.destroy()
    this.spaceKey?.destroy()
    this.escapeKey?.destroy()
  }

  private getMenuProfile(layout: ViewportLayout): MenuProfile {
    const viewportWidth = ScaleManager.viewportWidth
    const viewportHeight = ScaleManager.viewportHeight
    const isCompact = viewportWidth <= 360 || viewportHeight <= 700 || (layout.isLandscape && viewportHeight <= 500)
    const isTightLandscape = layout.isLandscape && viewportWidth <= 700
    const height = this.cameras.main.height
    const topBand = layout.isLandscape ? 104 : isCompact ? 120 : 136
    const bottomBand = Math.min(layout.footerBottom - 26, height - (layout.isLandscape ? 46 : 56))
    const freeHeight = Math.max(300, bottomBand - topBand)
    const step = freeHeight / 5

    const titleY = topBand + step * 0.45
    const subtitleY = topBand + step * 1.05
    const guideY = topBand + step * 1.6
    const playY = topBand + step * 2.45
    const muteY = topBand + step * 3.25
    const footerY = topBand + step * 4.15
    const guideSpacing = layout.isLandscape ? (isTightLandscape ? 34 : 38) : isCompact ? 40 : 46

    return {
      isCompact,
      titleY,
      subtitleY,
      guideY,
      guideSpacing,
      playY,
      playWidth: layout.isLandscape ? (isTightLandscape ? 220 : 230) : isCompact ? 220 : 240,
      playFontSize: layout.isLandscape ? (isTightLandscape ? 24 : 26) : isCompact ? 24 : 26,
      muteY,
      muteWidth: layout.isLandscape ? 170 : isCompact ? 170 : 180,
      muteFontSize: isCompact ? 17 : 18,
      footerY,
      subtitleFontSize: isCompact ? '18px' : '20px',
      titleFontSize: layout.isLandscape ? (isTightLandscape ? '48px' : '50px') : isCompact ? '50px' : '54px'
    }
  }
}

interface MenuProfile {
  isCompact: boolean
  titleY: number
  subtitleY: number
  guideY: number
  guideSpacing: number
  playY: number
  playWidth: number
  playFontSize: number
  muteY: number
  muteWidth: number
  muteFontSize: number
  footerY: number
  subtitleFontSize: string
  titleFontSize: string
}
