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
import { AudioManager } from '../core/AudioManager'
import { SaveManager, SAVE_KEYS } from '../core/SaveManager'
import { config } from '../core/Config'
import { GAME_CONFIG } from '../data/gameConfig'
import { BALANCING } from '../data/balancing'

const CX = GAME_CONFIG.width / 2
const CY = GAME_CONFIG.height / 2

const BACKDROP_COLORS = [0xffc857, 0xff8c42, 0xf26b5d, 0x7ccf5b, 0x89c2ff]

export class MenuScene extends Phaser.Scene {
  private muteButton!: UIButton
  private enterKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key
  private escapeKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'MenuScene' })
  }

  create(): void {
    this.cameras.main.setBackgroundColor(config.game.backgroundColor)
    this.cameras.main.fadeIn(BALANCING.sceneFadeDuration, 0, 0, 0)

    this.createBackground()
    this.createBackdropFruitGrid()
    this.createTitle()
    this.createButtons()
    this.createFooter()
    this.setupKeyboard()

    // TODO: analytics hook - menu_viewed
  }

  private createBackground(): void {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0xf7ead4, 0xf7ead4, 0xe9f4dc, 0xe7f0ff, 1)
    bg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)

    bg.fillStyle(0xffffff, 0.1)
    bg.fillCircle(CX - 140, 160, 180)
    bg.fillStyle(0xffb18f, 0.08)
    bg.fillCircle(CX + 120, GAME_CONFIG.height - 160, 210)
  }

  private createBackdropFruitGrid(): void {
    const cols = 4
    const rows = 3
    const startX = 82
    const startY = 170
    const gapX = 98
    const gapY = 120

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const fruit = this.add.image(startX + col * gapX, startY + row * gapY, 'fruit')
        fruit.setDisplaySize(54, 54)
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

  private createTitle(): void {
    this.add
      .text(CX, CY - 170, config.game.title, {
        fontSize: '54px',
        fontFamily: 'Arial, sans-serif',
        color: '#7a3e2c',
        fontStyle: 'bold',
        resolution: 2,
        stroke: '#ffffff',
        strokeThickness: 4
      })
      .setOrigin(0.5)

    this.add
      .text(CX, CY - 102, 'Tap fruit at peak ripeness', {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#8c7352',
        resolution: 2
      })
      .setOrigin(0.5)
  }

  private createButtons(): void {
    new UIButton({
      scene: this,
      x: CX,
      y: CY + 20,
      width: 240,
      height: 64,
      label: 'PLAY',
      fontSize: 26,
      color: 0xf26b5d,
      hoverColor: 0xff7f73,
      pressColor: 0xd95a4e,
      onClick: () => this.startGame()
    })

    const muteLabel = AudioManager.muted ? 'Muted' : 'Sound On'
    this.muteButton = new UIButton({
      scene: this,
      x: CX,
      y: CY + 104,
      width: 180,
      height: 48,
      label: muteLabel,
      fontSize: 18,
      color: 0x8c7352,
      hoverColor: 0xa28967,
      pressColor: 0x6d5740,
      onClick: () => this.toggleMute()
    })
  }

  private createFooter(): void {
    const hs = SaveManager.load<number>(SAVE_KEYS.highScore, 0)
    if (hs > 0) {
      this.add
        .text(CX, CY + 170, `Best Harvest: ${hs.toLocaleString()}`, {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#7a3e2c',
          resolution: 2
        })
        .setOrigin(0.5)
    } else {
      this.add
        .text(CX, CY + 170, 'One tap at a time.', {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#7a3e2c',
          resolution: 2
        })
        .setOrigin(0.5)
    }

    this.add
      .text(CX, GAME_CONFIG.height - 20, `v${config.game.version}`, {
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
    this.enterKey?.destroy()
    this.spaceKey?.destroy()
    this.escapeKey?.destroy()
  }
}
