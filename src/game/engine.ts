import { sound } from '../audio/sound';
import {
  AquariumDeco,
  CatState,
  CatTree,
  EmergencyButton,
  FloatingText,
  GameLevel,
  GameState,
  HeiseiItem,
  Human,
  Platform,
  RobotVacuum,
  SecurityCamera,
  SoundRipple,
  TrapItem,
} from './types';
import { SPRITE_REGIONS, SPRITE_SHEET_URL } from './sprites';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public level: GameLevel;
  public state: GameState;

  // Cat Entity
  public cat = {
    x: 100,
    y: 430,
    vx: 0,
    vy: 0,
    w: 52,
    h: 36,
    facing: 'right' as 'left' | 'right',
    state: 'idle' as CatState,
    isGrounded: true,
    hissTimer: 0,
    hissCooldown: 0,
    panicTimer: 0,
    invincibleTimer: 0,
    walkFrame: 0,
    stamina: 100,
    isExhausted: false,
    isOnCatTree: false,
  };

  // Camera
  public cameraX = 0;
  public viewportWidth = 960;
  public viewportHeight = 540;

  // Visuals & Assets
  private spriteSheetImg: HTMLImageElement | null = null;
  private isSpriteLoaded = false;
  private floatingTexts: FloatingText[] = [];
  private soundRipples: SoundRipple[] = [];
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
    maxLife: number;
    shape?: 'circle' | 'star' | 'bubble' | 'wind' | 'heart' | 'plus';
  }> = [];

  // Input states
  public keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    interact: false,
    hiss: false,
  };

  private lastTime = 0;
  private animId: number | null = null;
  private onStateChangeCallback: ((state: GameState) => void) | null = null;
  private nearbyTrap: TrapItem | null = null;
  private nearbyButton: EmergencyButton | null = null;
  private alarmCooldown = 0;
  private inVisionAlertTimer = 0;

  constructor(
    canvas: HTMLCanvasElement,
    level: GameLevel,
    initialState: GameState,
    onStateChange?: (state: GameState) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.level = JSON.parse(JSON.stringify(level));
    this.state = {
      ...initialState,
      stamina: 100,
      isExhausted: false,
      hasDoorKey: false,
      emergencyButtonPressed: false,
      alarmActive: false,
    };
    this.onStateChangeCallback = onStateChange || null;

    this.loadAssets();
    this.resize();
  }

  private loadAssets() {
    this.spriteSheetImg = new Image();
    this.spriteSheetImg.src = SPRITE_SHEET_URL;
    this.spriteSheetImg.onload = () => {
      this.isSpriteLoaded = true;
    };
  }

  public resize() {
    const dpr = window.devicePixelRatio || 1;
    this.viewportWidth = this.canvas.clientWidth || 960;
    this.viewportHeight = this.canvas.clientHeight || 540;

    this.canvas.width = this.viewportWidth * dpr;
    this.canvas.height = this.viewportHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  public setOnStateChange(callback: (state: GameState) => void) {
    this.onStateChangeCallback = callback;
  }

  public loadLevel(level: GameLevel, keepScore = false) {
    this.level = JSON.parse(JSON.stringify(level));
    this.cat.x = 100;
    this.cat.y = 430;
    this.cat.vx = 0;
    this.cat.vy = 0;
    this.cat.facing = 'right';
    this.cat.state = 'idle';
    this.cat.hissTimer = 0;
    this.cat.hissCooldown = 0;
    this.cat.panicTimer = 0;
    this.cat.invincibleTimer = 0;
    this.cat.stamina = 100;
    this.cat.isExhausted = false;
    this.cat.isOnCatTree = false;

    this.cameraX = 0;
    this.floatingTexts = [];
    this.soundRipples = [];
    this.particles = [];
    this.alarmCooldown = 0;

    this.state = {
      ...this.state,
      timeRemaining: level.timeLimit,
      stress: 0,
      stamina: 100,
      isExhausted: false,
      hasDoorKey: false,
      emergencyButtonPressed: false,
      alarmActive: false,
      perfectBonusEligible: true,
      humanKnockdowns: 0,
      collectedItems: [],
      status: 'playing',
      score: keepScore ? this.state.score : 0,
      currentLevelIndex: level.stageNumber - 1,
    };

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  public start() {
    this.lastTime = performance.now();
    const track = ('stage' + this.level.stageNumber) as 'stage1' | 'stage2' | 'stage3' | 'stage4';
    sound.playStageBGM(track);
    this.loop(this.lastTime);
  }

  public stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  public pause() {
    if (this.state.status === 'playing') {
      this.state.status = 'paused';
      sound.stopBGM();
      if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
    }
  }

  public resume() {
    if (this.state.status === 'paused') {
      this.state.status = 'playing';
      const track = ('stage' + this.level.stageNumber) as 'stage1' | 'stage2' | 'stage3' | 'stage4';
      sound.playStageBGM(track);
      this.lastTime = performance.now();
      if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
    }
  }

  public triggerInteract() {
    if (this.state.status !== 'playing') return;

    // Check emergency button first
    if (this.nearbyButton && !this.nearbyButton.isPressed) {
      this.pressEmergencyButton(this.nearbyButton);
      return;
    }

    // Check traps
    if (
      this.nearbyTrap &&
      !this.nearbyTrap.isPushed &&
      (!this.nearbyTrap.cooldownTimer || this.nearbyTrap.cooldownTimer <= 0)
    ) {
      this.pushTrap(this.nearbyTrap);
    } else {
      sound.playMeow();
      this.emitSoundRipple(this.cat.x + 20, this.cat.y + 15, 180);
      this.addFloatingText('喵？', this.cat.x, this.cat.y - 20, '#fef08a');
    }
  }

  private pressEmergencyButton(btn: EmergencyButton) {
    btn.isPressed = true;
    this.state.emergencyButtonPressed = true;
    sound.playButtonPush();
    sound.playDoorUnlock();
    this.addFloatingText('🚨 非常口已解除鎖定！快逃！+300pt', btn.x - 60, btn.y - 30, '#4ade80', 16);
    this.state.score += 300;

    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: btn.x + 18,
        y: btn.y + 24,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: '#4ade80',
        size: 4 + Math.random() * 3,
        life: 0.7,
        maxLife: 0.7,
        shape: 'star',
      });
    }

    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }

  public triggerHiss() {
    if (this.state.status !== 'playing') return;
    if (this.cat.hissCooldown > 0) {
      this.addFloatingText('CD中...', this.cat.x, this.cat.y - 20, '#94a3b8');
      return;
    }

    this.cat.hissTimer = 0.5;
    this.cat.hissCooldown = 4.0;
    this.cat.state = 'hiss';
    sound.playHiss();

    this.emitSoundRipple(this.cat.x + 20, this.cat.y + 15, 320);
    this.addFloatingText('嘶——！(別碰我！)', this.cat.x, this.cat.y - 30, '#ef4444', 16);

    const hissRange = 240;
    this.level.humans.forEach((human) => {
      if (human.state === 'slip' || human.state === 'stunned') return;
      const isSameDir =
        (this.cat.facing === 'right' && human.x > this.cat.x && human.x - this.cat.x < hissRange) ||
        (this.cat.facing === 'left' && human.x < this.cat.x && this.cat.x - human.x < hissRange);

      if (isSameDir && Math.abs(human.y - this.cat.y) < 130) {
        human.state = 'surprised';
        human.stateTimer = 2.4;
        human.alertMark = 'question';
        human.alertTimer = 2.2;
        sound.playHumanSurprise();
        this.addFloatingText('!? 被嚇退了！', human.x, human.y - 20, '#fbbf24');
      }
    });

    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.cat.x + 20,
        y: this.cat.y + 15,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 2,
        color: '#fb923c',
        size: 3 + Math.random() * 3,
        life: 0.4,
        maxLife: 0.4,
        shape: 'star',
      });
    }
  }

  private pushTrap(trap: TrapItem) {
    trap.isPushed = true;
    trap.vx = this.cat.facing === 'right' ? 3.5 : -3.5;
    trap.vy = -1.5;
    sound.playPush();

    const label =
      trap.type === 'fishbowl'
        ? '推落金魚缸！'
        : trap.type === 'hairDryer'
        ? '啟動吹風機！'
        : '推落商品！';
    this.addFloatingText(label, trap.x, trap.y - 20, '#38bdf8', 16);

    trap.cooldownTimer = trap.cooldownMax || 10.0;
    this.emitSoundRipple(trap.x, trap.y, 280);

    this.state.score += 50;
    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }

  public emitSoundRipple(x: number, y: number, alertRadius = 300) {
    this.soundRipples.push({
      id: Math.random().toString(),
      x,
      y,
      radius: 10,
      maxRadius: alertRadius * 0.7,
      alertRadius,
      alpha: 0.85,
    });

    this.level.humans.forEach((h) => {
      if (h.state === 'slip' || h.state === 'stunned' || h.state === 'chase' || h.state === 'panic') return;
      const dist = Math.abs(h.x - x);
      if (dist < alertRadius) {
        h.state = 'investigate';
        h.stateTimer = 3.5;
        h.targetX = x;
        h.facing = x > h.x ? 'right' : 'left';
        h.alertMark = 'question';
        h.alertTimer = 1.8;
      }
    });
  }

  public getNearbyTrap() {
    return this.nearbyTrap;
  }

  public getNearbyButton() {
    return this.nearbyButton;
  }

  private loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.state.status === 'playing') {
      this.update(dt);
    }

    this.render();

    this.animId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const prevSec = Math.ceil(this.state.timeRemaining);
    this.state.timeRemaining -= dt;
    const currSec = Math.ceil(this.state.timeRemaining);

    if (this.state.timeRemaining <= 15 && this.state.timeRemaining > 0 && currSec !== prevSec) {
      sound.playTickWarning();
    }

    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.triggerGameOver('時間用盡！被店員包圍抓住了！');
      return;
    }

    if (this.cat.hissCooldown > 0) {
      this.cat.hissCooldown = Math.max(0, this.cat.hissCooldown - dt);
    }
    if (this.cat.hissTimer > 0) {
      this.cat.hissTimer -= dt;
      if (this.cat.hissTimer <= 0) {
        this.cat.state = 'idle';
      }
    }
    if (this.cat.panicTimer > 0) {
      this.cat.panicTimer -= dt;
    }
    if (this.cat.invincibleTimer > 0) {
      this.cat.invincibleTimer -= dt;
    }
    if (this.alarmCooldown > 0) {
      this.alarmCooldown -= dt;
      if (this.alarmCooldown <= 0) {
        this.state.alarmActive = false;
      }
    }

    // Cat Tree Immunity & Hiding Check (Stage 4)
    this.cat.isOnCatTree = false;
    if (this.level.catTrees) {
      for (const tree of this.level.catTrees) {
        if (
          this.cat.x + this.cat.w > tree.x &&
          this.cat.x < tree.x + tree.w &&
          this.cat.y < 420
        ) {
          this.cat.isOnCatTree = true;
          break;
        }
      }
    }

    // Stamina Mechanics
    const isMoving = this.keys.left || this.keys.right;
    if (isMoving && this.cat.isGrounded) {
      this.cat.stamina = Math.max(0, this.cat.stamina - dt * 18);
      if (this.cat.stamina <= 0 && !this.cat.isExhausted) {
        this.cat.isExhausted = true;
        this.addFloatingText('體力耗盡！氣喘吁吁...', this.cat.x, this.cat.y - 25, '#f87171', 14);
      }
    } else {
      const regenRate = this.cat.isOnCatTree ? 40 : this.cat.y < 350 ? 32 : 24;
      this.cat.stamina = Math.min(100, this.cat.stamina + dt * regenRate);
      if (this.cat.stamina >= 28 && this.cat.isExhausted) {
        this.cat.isExhausted = false;
        this.addFloatingText('體力恢復！', this.cat.x, this.cat.y - 25, '#4ade80', 14);
      }
    }
    this.state.stamina = this.cat.stamina;
    this.state.isExhausted = this.cat.isExhausted;

    // Stress recovery
    if ((this.cat.y < 350 || this.cat.isOnCatTree) && this.state.stress > 0) {
      this.state.stress = Math.max(0, this.state.stress - dt * (this.cat.isOnCatTree ? 5 : 2.8));
    }

    let currentSpeed = 220;
    if (this.cat.isExhausted) {
      currentSpeed = 120;
    } else if (this.cat.panicTimer > 0) {
      currentSpeed = 310;
    }

    if (this.cat.hissTimer <= 0) {
      if (this.keys.left) {
        this.cat.vx = -currentSpeed;
        this.cat.facing = 'left';
        this.cat.walkFrame += dt * (this.cat.isExhausted ? 4 : 8);
        if (this.cat.isGrounded) {
          this.cat.state = this.cat.isExhausted ? 'exhausted' : this.cat.panicTimer > 0 ? 'panic' : 'run';
        }

        if (!this.cat.isExhausted && Math.random() < dt * 1.5) {
          this.emitSoundRipple(this.cat.x + 20, this.cat.y + 30, 200);
        }
      } else if (this.keys.right) {
        this.cat.vx = currentSpeed;
        this.cat.facing = 'right';
        this.cat.walkFrame += dt * (this.cat.isExhausted ? 4 : 8);
        if (this.cat.isGrounded) {
          this.cat.state = this.cat.isExhausted ? 'exhausted' : this.cat.panicTimer > 0 ? 'panic' : 'run';
        }

        if (!this.cat.isExhausted && Math.random() < dt * 1.5) {
          this.emitSoundRipple(this.cat.x + 20, this.cat.y + 30, 200);
        }
      } else {
        this.cat.vx *= 0.6;
        if (Math.abs(this.cat.vx) < 5) this.cat.vx = 0;
        if (this.cat.isGrounded && this.cat.hissTimer <= 0) {
          this.cat.state = this.cat.isExhausted ? 'exhausted' : this.cat.panicTimer > 0 ? 'panic' : 'idle';
        }
      }

      if (this.keys.up && this.cat.isGrounded) {
        if (!this.cat.isExhausted && this.cat.stamina >= 12) {
          this.cat.vy = -540;
          this.cat.isGrounded = false;
          this.cat.state = 'jump';
          this.cat.stamina = Math.max(0, this.cat.stamina - 14);
          sound.playJump();
        } else if (this.cat.isExhausted) {
          this.addFloatingText('太累了跳不動！', this.cat.x, this.cat.y - 20, '#f87171', 12);
        }
      }
    }

    this.cat.vy += 1200 * dt;
    this.cat.x += this.cat.vx * dt;
    this.cat.y += this.cat.vy * dt;

    if (this.cat.x < 20) this.cat.x = 20;
    if (this.cat.x > this.level.worldWidth - 50) this.cat.x = this.level.worldWidth - 50;

    // Platform collisions
    const prevVy = this.cat.vy;
    this.cat.isGrounded = false;
    for (const plat of this.level.platforms) {
      if (
        this.cat.x + this.cat.w > plat.x &&
        this.cat.x < plat.x + plat.w &&
        this.cat.y + this.cat.h >= plat.y &&
        this.cat.y + this.cat.h <= plat.y + 24 &&
        this.cat.vy >= 0
      ) {
        this.cat.y = plat.y - this.cat.h;
        this.cat.vy = 0;
        this.cat.isGrounded = true;

        if (prevVy > 400) {
          this.emitSoundRipple(this.cat.x + 20, this.cat.y + 30, 260);
          this.addFloatingText('咚！(落地聲)', this.cat.x, this.cat.y - 15, '#cbd5e1', 12);
        }
        break;
      }
    }

    // Camera follow
    const targetCamX = this.cat.x - this.viewportWidth * 0.35;
    this.cameraX += (targetCamX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.cameraX, this.level.worldWidth - this.viewportWidth));

    // Nearby Trap & Button checks
    this.nearbyTrap = null;
    for (const trap of this.level.traps) {
      if (!trap.isPushed && (!trap.cooldownTimer || trap.cooldownTimer <= 0)) {
        const dist = Math.hypot(this.cat.x + 20 - trap.x, this.cat.y - trap.y);
        if (dist < 85) {
          this.nearbyTrap = trap;
          break;
        }
      }
    }

    this.nearbyButton = null;
    if (this.level.emergencyButton && !this.level.emergencyButton.isPressed) {
      const btn = this.level.emergencyButton;
      const dist = Math.hypot(this.cat.x + 20 - (btn.x + btn.w / 2), this.cat.y - btn.y);
      if (dist < 75) {
        this.nearbyButton = btn;
      }
    }

    // Update Robot Vacuums (Stage 3)
    if (this.level.vacuums) {
      for (const vac of this.level.vacuums) {
        vac.x += vac.vx;
        if (vac.x <= vac.minX || vac.x >= vac.maxX) {
          vac.vx *= -1;
        }

        if (vac.alarmTimer > 0) {
          vac.alarmTimer -= dt;
        }

        // Collision with cat
        const isVacOverlap =
          this.cat.x + this.cat.w > vac.x &&
          this.cat.x < vac.x + vac.w &&
          this.cat.y + this.cat.h >= vac.y &&
          this.cat.y < vac.y + vac.h;

        if (isVacOverlap && vac.alarmTimer <= 0) {
          vac.alarmTimer = 3.0;
          sound.playVacuumAlarm();
          this.emitSoundRipple(vac.x + vac.w / 2, vac.y, 380);
          this.addFloatingText('🚨 嗶嗶嗶！踩到掃地機器人了！', vac.x - 40, vac.y - 25, '#ef4444', 15);
          this.cat.vy = -260; // bounce cat up

          // Humans rush over
          this.level.humans.forEach((h) => {
            if (h.state !== 'slip' && h.state !== 'stunned') {
              h.state = 'chase';
              h.alertMark = 'alert';
              h.alertTimer = 3.0;
            }
          });
        }
      }
    }

    // Update Traps
    for (const trap of this.level.traps) {
      if (trap.cooldownTimer && trap.cooldownTimer > 0) {
        trap.cooldownTimer -= dt;
        if (trap.cooldownTimer <= 0) {
          trap.cooldownTimer = 0;
          trap.isPushed = false;
          trap.hasFallen = false;
          trap.hasHitHuman = false;
          trap.x = trap.initialX;
          trap.y = trap.initialY;
          trap.vx = 0;
          trap.vy = 0;
          trap.cans = undefined;
          trap.fishes = undefined;
          this.addFloatingText('貨架已補貨！可再次推落！', trap.x - 20, trap.y - 30, '#4ade80', 13);
        }
      }

      // Hair Dryer Wind gust
      if (trap.windTimer && trap.windTimer > 0) {
        trap.windTimer -= dt;
        // Spawn wind particles
        for (let i = 0; i < 2; i++) {
          this.particles.push({
            x: trap.x + (trap.vx >= 0 ? 30 : -10),
            y: trap.y + 15 + (Math.random() - 0.5) * 15,
            vx: (trap.vx >= 0 ? 1 : -1) * (6 + Math.random() * 4),
            vy: (Math.random() - 0.5) * 2,
            color: '#a5f3fc',
            size: 4 + Math.random() * 4,
            life: 0.35,
            maxLife: 0.35,
            shape: 'wind',
          });
        }

        // Scare humans caught in wind
        for (const human of this.level.humans) {
          if (human.state === 'slip' || human.state === 'stunned') continue;
          if (Math.abs(human.x - trap.x) < 220 && Math.abs(human.y - trap.y) < 80) {
            human.state = 'panic';
            human.stateTimer = 4.5;
            human.alertMark = 'question';
            human.alertTimer = 3.0;
            this.addFloatingText('「哇啊啊！好吵的吹風機！」', human.x, human.y - 25, '#38bdf8', 13);
          }
        }
      }

      if (trap.isPushed && !trap.hasFallen) {
        trap.vy += 900 * dt;
        trap.x += trap.vx;
        trap.y += trap.vy * dt;

        if (trap.y >= 490) {
          trap.y = 490;
          trap.hasFallen = true;

          this.emitSoundRipple(trap.x, 490, 360);

          if (trap.type === 'fishbowl') {
            sound.playFishbowlCrash();
            this.addFloatingText('鏘啷！金魚缸碎裂！水灘漫延！', trap.x - 40, trap.y - 35, '#38bdf8', 15);
            trap.puddleX = trap.x - 90;
            trap.puddleW = 180;
            trap.puddleDuration = 12.0; // Extra long puddle!

            // Flopping fish particles
            trap.fishes = [
              { x: trap.x - 20, y: 505, vx: -2, vy: -3, color: '#f97316', rot: 0 },
              { x: trap.x + 20, y: 505, vx: 2, vy: -4, color: '#ea580c', rot: 0 },
            ];
          } else if (trap.type === 'hairDryer') {
            sound.playHairDryer();
            this.addFloatingText('轟轟轟！吹風機強風大作！', trap.x - 30, trap.y - 35, '#a5f3fc', 15);
            trap.windTimer = 4.0;
          } else if (trap.type === 'cans') {
            sound.playCansCrash();
            this.addFloatingText('嘩啦啦！罐頭散落！', trap.x, trap.y - 30, '#f97316', 15);
            trap.cans = [];
            for (let i = 0; i < 7; i++) {
              trap.cans.push({
                x: trap.x + (Math.random() - 0.5) * 40,
                y: trap.y - 10,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 8 - 4,
                rot: Math.random() * Math.PI * 2,
              });
            }
          } else if (trap.type === 'bucket') {
            sound.playBucketSlip();
            this.addFloatingText('嘩啦！肥皂水窪！', trap.x, trap.y - 30, '#06b6d4', 15);
            trap.puddleX = trap.x - 60;
            trap.puddleW = 120;
            trap.puddleDuration = 8.0;
          } else if (trap.type === 'food') {
            sound.playFoodSpill();
            this.addFloatingText('噗嚕嚕！飼料傾倒！', trap.x, trap.y - 30, '#84cc16', 15);
          }
        }
      }

      if (trap.puddleDuration && trap.puddleDuration > 0) {
        trap.puddleDuration -= dt;
      }

      // Flopping goldfish physics
      if (trap.fishes) {
        trap.fishes.forEach((f) => {
          f.rot += dt * 8;
          f.vy += 400 * dt;
          f.y += f.vy * dt;
          f.x += f.vx * dt;
          if (f.y > 508) {
            f.y = 508;
            f.vy = -Math.random() * 4 - 2; // flopping!
            f.vx = (Math.random() - 0.5) * 2;
          }
        });
      }

      if (trap.cans) {
        trap.cans.forEach((c) => {
          c.vy += 600 * dt;
          c.x += c.vx;
          c.y += c.vy * dt;
          c.rot += dt * 4;
          if (c.y > 510) {
            c.y = 510;
            c.vy = -c.vy * 0.4;
          }
        });
      }

      // Trap hit human check
      if (trap.isPushed) {
        for (const human of this.level.humans) {
          if (human.state === 'slip' || human.state === 'stunned') continue;

          if (!trap.hasHitHuman && !trap.hasFallen) {
            const hit =
              trap.x + trap.w > human.x &&
              trap.x < human.x + human.w &&
              trap.y + trap.h > human.y &&
              trap.y < human.y + human.h;

            if (hit) {
              trap.hasHitHuman = true;
              this.knockdownHuman(
                human,
                trap.type === 'fishbowl' || trap.type === 'bucket' ? 'slip' : 'stunned',
                trap.type === 'fishbowl' ? 7.5 : 4.5
              );
            }
          }

          if (
            (trap.type === 'bucket' || trap.type === 'fishbowl') &&
            trap.puddleDuration &&
            trap.puddleDuration > 0 &&
            trap.puddleX !== undefined &&
            trap.puddleW !== undefined
          ) {
            if (human.x + human.w > trap.puddleX && human.x < trap.puddleX + trap.puddleW) {
              this.knockdownHuman(human, 'slip', trap.type === 'fishbowl' ? 7.5 : 4.5);
            }
          }

          if (trap.hasFallen && !trap.hasHitHuman && Math.abs(human.x - trap.x) < 35) {
            trap.hasHitHuman = true;
            this.knockdownHuman(human, 'slip', 4.5);
          }
        }
      }
    }

    // Security Cameras
    if (this.level.cameras) {
      for (const cam of this.level.cameras) {
        cam.angle += cam.sweepSpeed * cam.direction * dt;
        if (cam.angle >= cam.maxAngle) {
          cam.angle = cam.maxAngle;
          cam.direction = -1;
        } else if (cam.angle <= cam.minAngle) {
          cam.angle = cam.minAngle;
          cam.direction = 1;
        }

        if (cam.alarmFlashTimer > 0) {
          cam.alarmFlashTimer -= dt;
          if (cam.alarmFlashTimer <= 0) {
            cam.isAlerted = false;
          }
        }

        const catCenterX = this.cat.x + this.cat.w / 2;
        const catCenterY = this.cat.y + this.cat.h / 2;
        const dx = catCenterX - cam.x;
        const dy = catCenterY - cam.y;
        const dist = Math.hypot(dx, dy);

        // If cat is hidden on cat tree, camera cannot spot!
        if (dist <= cam.coneLength && dy > 0 && !this.cat.isOnCatTree) {
          const angleToCat = Math.atan2(dy, dx);
          let angleDiff = Math.abs(angleToCat - cam.angle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          if (angleDiff <= cam.coneFov / 2) {
            if (!cam.isAlerted) {
              cam.isAlerted = true;
              cam.alarmFlashTimer = 3.5;
              this.state.alarmActive = true;
              this.alarmCooldown = 3.5;
              sound.playAlarm();
              this.addFloatingText('🚨 警報響起！監視器發現貓咪！', this.cat.x - 30, this.cat.y - 40, '#ef4444', 16);

              this.level.humans.forEach((h) => {
                if (h.state !== 'slip' && h.state !== 'stunned' && h.state !== 'panic') {
                  h.state = 'chase';
                  h.alertMark = 'alert';
                  h.alertTimer = 3.0;
                }
              });
            }
          }
        }
      }
    }

    // Human AI: Progressive Speed, Vision, Flanking
    const activeChasers = this.level.humans.filter((h) => h.state === 'chase');
    let catInVisionThisFrame = false;

    for (let i = 0; i < this.level.humans.length; i++) {
      const human = this.level.humans[i];
      if (human.alertTimer > 0) human.alertTimer -= dt;

      if (human.state === 'slip' || human.state === 'stunned') {
        human.stateTimer -= dt;
        if (human.stateTimer <= 0) {
          human.state = 'patrol';
          human.alertMark = 'none';
          human.isFlanker = false;
        }
        continue;
      }

      if (human.state === 'panic') {
        human.stateTimer -= dt;
        human.x += (human.facing === 'right' ? -1 : 1) * human.speed * 1.5; // runs away!
        if (human.stateTimer <= 0) {
          human.state = 'patrol';
        }
        continue;
      }

      if (human.state === 'surprised') {
        human.stateTimer -= dt;
        if (human.stateTimer <= 0) {
          human.state = 'patrol';
          human.isFlanker = false;
        }
        continue;
      }

      // Check Vision Cone (Skipped if Cat is high on Cat Tree!)
      if (!this.cat.isOnCatTree) {
        const humanEyeX = human.x + human.w / 2;
        const humanEyeY = human.y + 35;
        const catCenterX = this.cat.x + this.cat.w / 2;
        const catCenterY = this.cat.y + this.cat.h / 2;

        const vdx = catCenterX - humanEyeX;
        const vdy = catCenterY - humanEyeY;
        const vDist = Math.hypot(vdx, vdy);

        const facingAngle = human.facing === 'right' ? 0 : Math.PI;
        const catAngle = Math.atan2(vdy, vdx);
        let vDiff = Math.abs(catAngle - facingAngle);
        while (vDiff > Math.PI) vDiff = Math.abs(vDiff - Math.PI * 2);

        if (vDist <= human.visionRange && vDiff <= human.visionFov / 2) {
          catInVisionThisFrame = true;
          // Prolong chase duration based on stage level
          human.chaseDuration = Math.max(human.chaseDuration || 0, 4.5 + this.level.stageNumber * 1.5);
          if (human.state !== 'chase') {
            human.state = 'chase';
            human.alertMark = 'alert';
            human.alertTimer = 2.5;
            sound.playHumanSurprise();
            this.addFloatingText('「發現貓咪了！」', human.x, human.y - 25, '#ef4444', 13);
          }
        }
      }

      human.isFlanker = false;
      if (activeChasers.length >= 2) {
        const sorted = [...activeChasers].sort(
          (a, b) => Math.abs(a.x - this.cat.x) - Math.abs(b.x - this.cat.x)
        );
        if (human.id === sorted[1].id) {
          human.isFlanker = true;
          human.targetX = sorted[0].x < this.cat.x ? this.cat.x + 160 : this.cat.x - 160;
        }
      }

      // Movement
      const baseHumanSpeed = human.speed * this.level.humanSpeedMultiplier;
      if (human.state === 'chase') {
        if (human.chaseDuration !== undefined && human.chaseDuration > 0) {
          human.chaseDuration -= dt;
          if (human.chaseDuration <= 0) {
            human.state = 'investigate';
            human.stateTimer = 2.5;
            human.targetX = this.cat.x;
            human.alertMark = 'question';
            human.alertTimer = 1.5;
          }
        }
        const chaseSpeed = baseHumanSpeed * 1.55;
        let destX = this.cat.x;
        if (human.isFlanker && human.targetX !== undefined && human.targetX !== null) {
          destX = human.targetX;
        }

        human.facing = destX > human.x ? 'right' : 'left';
        human.x += (human.facing === 'right' ? 1 : -1) * chaseSpeed;
      } else if (human.state === 'investigate') {
        human.stateTimer -= dt;
        const targetX = human.targetX ?? human.x;
        human.facing = targetX > human.x ? 'right' : 'left';
        human.x += (human.facing === 'right' ? 1 : -1) * baseHumanSpeed * 1.1;

        if (Math.abs(human.x - targetX) < 15 || human.stateTimer <= 0) {
          human.state = 'patrol';
          human.alertMark = 'none';
        }
      } else {
        human.state = 'patrol';
        human.x += (human.facing === 'right' ? 1 : -1) * baseHumanSpeed;
        if (human.x >= human.patrolMaxX) human.facing = 'left';
        if (human.x <= human.patrolMinX) human.facing = 'right';
      }

      // Touch Cat check (Skipped if Cat is high on Cat Tree!)
      if (this.cat.invincibleTimer <= 0 && !this.cat.isOnCatTree) {
        const touchDist = 45;
        const isOverlap =
          Math.abs(this.cat.x + 20 - (human.x + human.w / 2)) < touchDist &&
          Math.abs(this.cat.y + 15 - (human.y + human.h / 2)) < 55;

        if (isOverlap) {
          this.handleHumanTouchedCat(human);
        }
      }
    }

    // 警戒條（壓力值）懲罰：當貓咪在人類視野內停留時，以雙倍速度飆升！
    if (catInVisionThisFrame && !this.cat.isOnCatTree && this.cat.invincibleTimer <= 0) {
      const sightStressRate = 22 * this.level.stressRateMultiplier;
      this.state.stress = Math.min(100, this.state.stress + dt * sightStressRate);
      this.inVisionAlertTimer += dt;
      if (this.inVisionAlertTimer >= 0.7) {
        this.inVisionAlertTimer = 0;
        this.addFloatingText('⚠️ 在人類視線中！壓力狂飆！', this.cat.x - 30, this.cat.y - 30, '#ef4444', 14);
      }
      if (this.state.stress >= 100) {
        this.triggerGameOver('壓力爆表！被人類視線緊追強制抓捕！');
        return;
      }
    } else {
      this.inVisionAlertTimer = 0;
    }

    // Door Key collection
    if (this.level.doorKey && !this.level.doorKey.isCollected) {
      const key = this.level.doorKey;
      key.bobOffset += dt * 4;
      const keyBobY = key.y + Math.sin(key.bobOffset) * 6;

      const touchKey =
        this.cat.x + this.cat.w > key.x &&
        this.cat.x < key.x + key.w &&
        this.cat.y + this.cat.h > keyBobY &&
        this.cat.y < keyBobY + key.h;

      if (touchKey) {
        key.isCollected = true;
        this.state.hasDoorKey = true;
        this.state.score += 250;
        sound.playKeyPickup();
        sound.playDoorUnlock();
        this.addFloatingText(`🔑 取得${key.label}！大門已解鎖！+250pt`, key.x - 50, key.y - 30, '#facc15', 16);

        for (let i = 0; i < 15; i++) {
          this.particles.push({
            x: key.x + 16,
            y: key.y + 16,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            color: '#facc15',
            size: 4 + Math.random() * 3,
            life: 0.8,
            maxLife: 0.8,
            shape: 'star',
          });
        }
        if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
      }
    }

    // Heisei Collectibles
    for (const item of this.level.heiseiItems) {
      if (!item.isCollected) {
        item.bobOffset += dt * 4;
        const bobY = item.y + Math.sin(item.bobOffset) * 6;
        const touch =
          this.cat.x + this.cat.w > item.x &&
          this.cat.x < item.x + item.w &&
          this.cat.y + this.cat.h > bobY &&
          this.cat.y < bobY + item.h;

        if (touch) {
          item.isCollected = true;
          this.state.score += 200;
          this.state.collectedItems.push(item.type);
          sound.playCollectItem();
          this.addFloatingText(`獲得！${item.name} +200pt`, item.x - 30, item.y - 30, '#fbbf24', 15);

          for (let i = 0; i < 12; i++) {
            this.particles.push({
              x: item.x + 18,
              y: item.y + 20,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: '#facc15',
              size: 4 + Math.random() * 3,
              life: 0.6,
              maxLife: 0.6,
              shape: 'star',
            });
          }
          if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
        }
      }
    }

    // Recovery Items (高級木天蓼, 高級貓肉泥, 高級貓罐頭) with 20s Respawn Mechanism
    if (this.level.recoveryItems) {
      for (const item of this.level.recoveryItems) {
        if (!item.isActive) {
          item.respawnCooldown -= dt;
          if (item.respawnCooldown <= 0) {
            item.isActive = true;
            item.respawnCooldown = 0;
            // Respawn sparkle particles
            for (let i = 0; i < 10; i++) {
              this.particles.push({
                x: item.x + item.w / 2,
                y: item.y + item.h / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 2,
                color: item.type === 'churu' ? '#f472b6' : item.type === 'matatabi' ? '#4ade80' : '#facc15',
                size: 3 + Math.random() * 3,
                life: 0.7,
                maxLife: 0.7,
                shape: 'star',
              });
            }
            this.addFloatingText(`✨ ${item.name} 重新刷新！`, item.x - 20, item.y - 25, '#4ade80', 13);
          }
        } else {
          item.bobOffset += dt * 3.5;
          item.glowTimer += dt;
          const bobY = item.y + Math.sin(item.bobOffset) * 4;

          const touch =
            this.cat.x + this.cat.w > item.x &&
            this.cat.x < item.x + item.w &&
            this.cat.y + this.cat.h > bobY &&
            this.cat.y < bobY + item.h;

          if (touch) {
            item.isActive = false;
            item.respawnCooldown = item.respawnTimeMax || 20.0;

            const prevStress = this.state.stress;
            this.state.stress = Math.max(0, this.state.stress - item.healAmount);
            sound.playHeal();
            this.state.score += 150;

            const text =
              item.type === 'churu'
                ? `💖 享用【高級貓肉泥】！壓力 -${item.healAmount}%！好幸福～`
                : item.type === 'matatabi'
                ? `🌿 狂嗅【高級木天蓼】！壓力 -${item.healAmount}%！超放鬆～`
                : `🐟 享用【頂級貓罐頭】！壓力 -${item.healAmount}%！元氣滿滿！`;
            this.addFloatingText(text, item.x - 50, item.y - 35, '#22c55e', 14);

            // Particles: hearts, green pluses, stars
            for (let i = 0; i < 7; i++) {
              this.particles.push({
                x: item.x + item.w / 2,
                y: item.y + item.h / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 5 - 2,
                color: item.type === 'churu' ? '#f472b6' : '#22c55e',
                size: 5 + Math.random() * 3,
                life: 0.9,
                maxLife: 0.9,
                shape: item.type === 'churu' ? 'heart' : 'plus',
              });
            }
            for (let i = 0; i < 6; i++) {
              this.particles.push({
                x: item.x + item.w / 2,
                y: item.y + item.h / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: '#facc15',
                size: 4 + Math.random() * 2,
                life: 0.7,
                maxLife: 0.7,
                shape: 'star',
              });
            }

            if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
          }
        }
      }
    }

    // Exit Reach & Conditions
    if (this.cat.x >= this.level.exitX - 35) {
      let isUnlocked = true;
      let lockMsg = '';

      // Stage 1 & 2: Key check
      if (this.level.doorKey && !this.state.hasDoorKey) {
        isUnlocked = false;
        lockMsg = `🔒 需要取得「${this.level.doorKey.label}」才能脫逃！`;
      }
      // Stage 3: Emergency Button check
      else if (this.level.emergencyButton && !this.state.emergencyButtonPressed) {
        isUnlocked = false;
        lockMsg = '🔒 非常口已鎖定！請先按下房間深處的「緊急出口按鈕」！';
      }
      // Stage 4: Required Heisei Items count check
      else if (
        this.level.requiredHeiseiItemsCount &&
        this.state.collectedItems.length < this.level.requiredHeiseiItemsCount
      ) {
        isUnlocked = false;
        const remain = this.level.requiredHeiseiItemsCount - this.state.collectedItems.length;
        lockMsg = `🔒 安全裝置未解除！還需收集 ${remain} 個平成復古道具！`;
      }

      if (!isUnlocked) {
        this.cat.x = this.level.exitX - 45;
        this.addFloatingText(lockMsg, this.level.exitX - 110, 240, '#f87171', 14);
      } else {
        this.triggerStageClear();
        return;
      }
    }

    // Sound ripples & text decay
    this.soundRipples = this.soundRipples.filter((r) => {
      r.radius += dt * 140;
      r.alpha -= dt * 1.2;
      return r.alpha > 0 && r.radius < r.maxRadius;
    });

    this.floatingTexts = this.floatingTexts.filter((t) => {
      t.y += t.vy * dt;
      t.alpha -= dt * 0.8;
      return t.alpha > 0;
    });

    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      return p.life > 0;
    });

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  private knockdownHuman(human: Human, type: 'slip' | 'stunned', duration = 4.5) {
    human.state = type;
    human.stateTimer = duration;
    human.alertMark = 'anger';
    human.alertTimer = duration - 1.0;
    this.state.score += 300;
    this.state.humanKnockdowns++;

    if (type === 'slip') {
      sound.playHumanSlip();
      const msg = duration > 6 ? '大摔特摔！長時間昏迷倒地！ +300pt' : '跌倒啦！(摔個四腳朝天) +300pt';
      this.addFloatingText(msg, human.x - 20, human.y - 35, '#38bdf8', 15);
    } else {
      sound.playCansCrash();
      this.addFloatingText('被擊暈了！星星直冒 +300pt', human.x, human.y - 35, '#eab308', 15);
    }

    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: human.x + 30,
        y: human.y - 10,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 1,
        color: '#fde047',
        size: 5,
        life: 0.8,
        maxLife: 0.8,
        shape: 'star',
      });
    }

    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }

  private handleHumanTouchedCat(human: Human) {
    this.cat.invincibleTimer = 1.2;
    this.cat.panicTimer = 2.0;
    this.state.perfectBonusEligible = false;

    // Progressive stress multiplier
    const baseDamage = human.type === 'clerk' ? 25 : 20;
    const damage = Math.round(baseDamage * this.level.stressRateMultiplier);
    this.state.stress = Math.min(100, this.state.stress + damage);
    sound.playTouchPanic();

    const text =
      human.type === 'clerk'
        ? `「被水噴到了！別碰我！」+${damage}% 壓力`
        : `「被魔爪撫摸了！好討厭！」+${damage}% 壓力`;
    this.addFloatingText(text, this.cat.x - 30, this.cat.y - 35, '#ef4444', 15);

    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.cat.x + 10,
        y: this.cat.y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 2,
        color: '#60a5fa',
        size: 4,
        life: 0.5,
        maxLife: 0.5,
        shape: 'circle',
      });
    }

    if (this.state.stress >= 100) {
      this.triggerGameOver('壓力爆表！被抓住強行洗香香了！');
    } else {
      if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
    }
  }

  private triggerStageClear() {
    sound.playVictory();
    const timeBonus = Math.floor(this.state.timeRemaining * 10);
    this.state.score += timeBonus;

    if (this.state.perfectBonusEligible) {
      this.state.score += 500;
    }

    if (this.level.stageNumber >= 4) {
      this.state.status = 'all_clear'; // Final Stage Complete!
    } else {
      this.state.status = 'stage_clear';
    }

    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }

  private triggerGameOver(reason: string) {
    this.state.status = 'game_over';
    sound.playGameOver();
    this.addFloatingText(reason, this.cat.x - 50, this.cat.y - 40, '#f87171', 18);
    if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
  }

  public addFloatingText(text: string, x: number, y: number, color = '#ffffff', size = 14) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      vy: -35,
      alpha: 1.0,
      color,
      size,
    });
  }

  // --- RENDERING ---

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // 1. Stage-Themed Background
    this.drawBackground(ctx);

    // 2. Platforms & Shelves
    this.drawPlatforms(ctx);

    // 3. Stage-Specific Environment (Aquariums, Vacuums, Cat Tree, Cameras)
    this.drawStageEnvironments(ctx);

    // 4. Traps with Cooldown Restock
    this.drawTraps(ctx);

    // 5. Door Key, Emergency Button & Items
    this.drawKeysAndItems(ctx);

    // 6. Exit Door with theme & locked/unlocked state
    this.drawExitDoor(ctx);

    // 7. Humans & Vision Cones
    this.drawHumans(ctx);

    // 8. Sound Ripples
    this.drawSoundRipples(ctx);

    // 9. Cat
    this.drawCat(ctx);

    // 10. Particles & Text
    this.drawEffects(ctx);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const theme = this.level.theme;

    if (theme === 'aquarium') {
      // Deep Blue Aquatic Salon
      ctx.fillStyle = this.state.alarmActive ? '#1e1b4b' : '#0c2340';
      ctx.fillRect(this.cameraX, 0, this.viewportWidth, 500);

      // Water light caustic reflections
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      const wave = Math.sin(performance.now() * 0.003) * 20;
      for (let x = 0; x < this.level.worldWidth; x += 180) {
        ctx.beginPath();
        ctx.ellipse(x + wave, 120, 80, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neon Sign "水族沙龍"
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(500, 45, 180, 36);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px "DotGothic16", sans-serif';
      ctx.fillText('★ 水族沙龍 ★', 535, 68);

      // Floor: Aquatic blue stone tiles
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 500, this.level.worldWidth, 100);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      for (let x = 0; x < this.level.worldWidth; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 500);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
    } else if (theme === 'salon') {
      // Midnight Dim Salon
      ctx.fillStyle = this.state.alarmActive ? '#450a0a' : '#111827';
      ctx.fillRect(this.cameraX, 0, this.viewportWidth, 500);

      // Neon Sign "寵物美容"
      ctx.fillStyle = '#db2777';
      ctx.fillRect(450, 40, 180, 38);
      ctx.fillStyle = '#fbcfe8';
      ctx.font = 'bold 16px "DotGothic16", sans-serif';
      ctx.fillText('🐾 寵物美容 ✂️', 485, 65);

      // Overhead pendant lamps with soft warm spotlights
      for (let lx = 350; lx < this.level.worldWidth - 300; lx += 450) {
        ctx.save();
        ctx.fillStyle = '#475569';
        ctx.fillRect(lx - 2, 40, 4, 30);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(lx, 74, 14, Math.PI, 0);
        ctx.fill();

        // Spotlight cone
        const spotGrad = ctx.createRadialGradient(lx, 75, 10, lx, 320, 220);
        spotGrad.addColorStop(0, 'rgba(254, 240, 138, 0.16)');
        spotGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.moveTo(lx, 75);
        ctx.lineTo(lx - 120, 500);
        ctx.lineTo(lx + 120, 500);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Floor: Ceramic salon tiles
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 500, this.level.worldWidth, 100);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < this.level.worldWidth; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 500);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
    } else if (theme === 'mega_mall') {
      // Grand Bright Mega Mall
      ctx.fillStyle = this.state.alarmActive ? '#fee2e2' : '#f8fafc';
      ctx.fillRect(this.cameraX, 0, this.viewportWidth, 500);

      // Huge Red Signs "巨大ペットモール 寵物廣場"
      for (let sx = 400; sx < this.level.worldWidth - 500; sx += 800) {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(sx, 48, 260, 42);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "DotGothic16", sans-serif';
        ctx.fillText('巨大ペットモール 寵物廣場', sx + 22, 75);
      }

      // Bright mall floor
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 500, this.level.worldWidth, 100);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      for (let x = 0; x < this.level.worldWidth; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 500);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
    } else {
      // Stage 1: Warm beige retro pet shop
      ctx.fillStyle = this.state.alarmActive ? '#fee2e2' : '#f5efe6';
      ctx.fillRect(this.cameraX, 0, this.viewportWidth, 500);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 40, this.level.worldWidth, 12);
      ctx.fillStyle = this.state.alarmActive ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(0, 43, this.level.worldWidth, 6);

      // Posters
      for (let x = 120; x < this.level.worldWidth - 400; x += 400) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x, 90, 85, 110);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, 94, 77, 102);

        ctx.fillStyle = '#fb923c';
        ctx.fillRect(x + 10, 100, 65, 50);
        ctx.fillStyle = '#0f172a';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('NEKO', x + 24, 170);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 485, this.level.worldWidth, 15);
      ctx.fillStyle = '#e2d9cc';
      ctx.fillRect(0, 500, this.level.worldWidth, 100);
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D) {
    for (const p of this.level.platforms) {
      if (p.type === 'floor') continue;

      if (p.type === 'shelf') {
        ctx.fillStyle = this.level.theme === 'aquarium' ? '#0369a1' : '#334155';
        ctx.fillRect(p.x + 8, p.y + p.h, 6, 500 - (p.y + p.h));
        ctx.fillRect(p.x + p.w - 14, p.y + p.h, 6, 500 - (p.y + p.h));

        ctx.fillStyle = '#475569';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(p.x, p.y, p.w, 4);

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);

        for (let bx = p.x + 10; bx < p.x + p.w - 30; bx += 38) {
          ctx.fillStyle = '#f87171';
          ctx.fillRect(bx, p.y - 28, 30, 28);
          ctx.fillStyle = '#fecaca';
          ctx.fillRect(bx + 4, p.y - 24, 22, 10);
        }
      } else if (p.type === 'box') {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
      } else if (p.type === 'counter') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(p.x, p.y, p.w, 8);
      } else if (p.type === 'cat_tree') {
        // High Wooden Cat Tree Platform
        ctx.fillStyle = '#d97706';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 4);
      }
    }
  }

  // Draw Unique Stage Environments
  private drawStageEnvironments(ctx: CanvasRenderingContext2D) {
    // Stage 2: Large Aquariums
    if (this.level.aquariums) {
      for (const aq of this.level.aquariums) {
        ctx.save();
        // Glass aquarium body
        ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';
        ctx.fillRect(aq.x, aq.y, aq.w, aq.h);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.strokeRect(aq.x, aq.y, aq.w, aq.h);

        // Water bubbles rising
        const now = performance.now() * 0.002;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 5; i++) {
          const by = aq.y + aq.h - ((now * 60 + i * 35) % aq.h);
          const bx = aq.x + 30 + i * 55 + Math.sin(now + i) * 8;
          ctx.beginPath();
          ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }

        // Sunken pirate ship or castle inside
        if (aq.theme === 'pirate_ship') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(aq.x + 40, aq.y + aq.h - 50, 90, 40);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(aq.x + 80, aq.y + aq.h - 90, 6, 40); // mast
        } else {
          ctx.fillStyle = '#475569';
          ctx.fillRect(aq.x + 50, aq.y + aq.h - 60, 70, 50);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(aq.x + 65, aq.y + aq.h - 95, 40, 35); // tower
        }

        // Swimming tropical fish
        ctx.fillStyle = '#f97316';
        const fx = aq.x + 50 + ((now * 40) % (aq.w - 80));
        const fy = aq.y + 40 + Math.sin(now * 3) * 12;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 9, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Stage 3: Robot Vacuums (掃地機器人)
    if (this.level.vacuums) {
      for (const vac of this.level.vacuums) {
        ctx.save();
        // Round vacuum body
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(vac.x + vac.w / 2, vac.y + vac.h / 2, vac.w / 2, vac.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner glowing sensor LED
        ctx.fillStyle = vac.alarmTimer > 0 ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.arc(vac.x + vac.w / 2, vac.y + vac.h / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        if (vac.alarmTimer > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 16px "Press Start 2P", monospace';
          ctx.fillText('!', vac.x + vac.w / 2 - 5, vac.y - 8);
        }

        ctx.restore();
      }
    }

    // Stage 4: Tall Multi-Tier Cat Tree (巨大貓跳台)
    if (this.level.catTrees) {
      for (const ct of this.level.catTrees) {
        ctx.save();
        // Scratching post poles
        ctx.fillStyle = '#b45309';
        ctx.fillRect(ct.x + 20, ct.y, 14, ct.h);
        ctx.fillRect(ct.x + ct.w - 34, ct.y + 80, 14, ct.h - 80);

        // Rope texture rings
        ctx.fillStyle = '#fde68a';
        for (let ry = ct.y; ry < ct.y + ct.h; ry += 12) {
          ctx.fillRect(ct.x + 20, ry, 14, 3);
          ctx.fillRect(ct.x + ct.w - 34, ry, 14, 3);
        }

        // Cat condo box in middle
        ctx.fillStyle = '#d97706';
        ctx.fillRect(ct.x + 40, ct.y + 110, 80, 75);
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(ct.x + 80, ct.y + 148, 22, 0, Math.PI * 2); // hole
        ctx.fill();

        // Top perch banner
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px "DotGothic16", sans-serif';
        ctx.fillText('🐾 貓跳台 (完全隱匿)', ct.x + 10, ct.y - 12);
        ctx.restore();
      }
    }

    // Security Cameras
    if (this.level.cameras) {
      for (const cam of this.level.cameras) {
        ctx.save();
        const halfFov = cam.coneFov / 2;
        const startAngle = cam.angle - halfFov;
        const endAngle = cam.angle + halfFov;

        ctx.save();
        const coneGrad = ctx.createRadialGradient(cam.x, cam.y, 10, cam.x, cam.y, cam.coneLength);
        if (cam.isAlerted) {
          coneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
          coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
        } else {
          coneGrad.addColorStop(0, 'rgba(244, 63, 94, 0.35)');
          coneGrad.addColorStop(1, 'rgba(244, 63, 94, 0.02)');
        }

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(cam.x, cam.y);
        ctx.arc(cam.x, cam.y, cam.coneLength, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Bracket
        ctx.fillStyle = '#334155';
        ctx.fillRect(cam.x - 8, 40, 16, 12);

        // Body
        ctx.translate(cam.x, cam.y);
        ctx.rotate(cam.angle - Math.PI / 2);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-10, -6, 20, 24);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 18, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cam.isAlerted || Math.floor(performance.now() / 400) % 2 === 0 ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, 18, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  private drawTraps(ctx: CanvasRenderingContext2D) {
    for (const trap of this.level.traps) {
      // Puddle
      if (
        (trap.type === 'bucket' || trap.type === 'fishbowl') &&
        trap.puddleDuration &&
        trap.puddleDuration > 0 &&
        trap.puddleX !== undefined &&
        trap.puddleW !== undefined
      ) {
        ctx.save();
        ctx.fillStyle = trap.type === 'fishbowl' ? 'rgba(56, 189, 248, 0.75)' : 'rgba(56, 189, 248, 0.65)';
        ctx.beginPath();
        ctx.ellipse(trap.puddleX + trap.puddleW / 2, 500, trap.puddleW / 2, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shards if fishbowl
        if (trap.type === 'fishbowl') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(trap.puddleX + 15 + i * 25, 498 + (i % 3) * 2, 5, 2);
          }
        }
        ctx.restore();
      }

      // Flopping fish
      if (trap.fishes) {
        trap.fishes.forEach((f) => {
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rot);
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Restock Cooldown
      if (trap.cooldownTimer && trap.cooldownTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
        ctx.fillRect(trap.initialX - 4, trap.initialY - 4, trap.w + 8, trap.h + 8);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(trap.initialX - 4, trap.initialY - 4, trap.w + 8, trap.h + 8);

        const cdProgress = (10.0 - trap.cooldownTimer) / 10.0;
        ctx.beginPath();
        ctx.arc(trap.initialX + trap.w / 2, trap.initialY + trap.h / 2, 12, -Math.PI / 2, -Math.PI / 2 + cdProgress * Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.fillText(`${Math.ceil(trap.cooldownTimer)}s`, trap.initialX + trap.w / 2 - 10, trap.initialY + trap.h / 2 + 3);
        ctx.restore();
      }

      // Trap item standing
      if (!trap.cooldownTimer || trap.cooldownTimer <= 0) {
        if (trap.type === 'fishbowl') {
          // Render cute glass fishbowl with goldfish
          ctx.save();
          ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
          ctx.beginPath();
          ctx.arc(trap.x + trap.w / 2, trap.y + trap.h / 2, trap.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Goldfish inside
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.ellipse(trap.x + trap.w / 2, trap.y + trap.h / 2 + 2, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (trap.type === 'hairDryer') {
          // Render pink table hair dryer
          ctx.save();
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(trap.x, trap.y + 10, 32, 18); // barrel
          ctx.fillRect(trap.x + 8, trap.y + 24, 12, 18); // handle
          ctx.fillStyle = '#db2777';
          ctx.fillRect(trap.x + 28, trap.y + 13, 8, 12); // nozzle
          ctx.restore();
        } else if (this.isSpriteLoaded && this.spriteSheetImg) {
          let region = SPRITE_REGIONS.cansTower;
          if (trap.type === 'cans') {
            region = trap.hasFallen ? SPRITE_REGIONS.cansTumbled : SPRITE_REGIONS.cansTower;
          } else if (trap.type === 'bucket') {
            region = trap.hasFallen ? SPRITE_REGIONS.bucketPuddle : SPRITE_REGIONS.bucketRag;
          } else if (trap.type === 'food') {
            region = trap.hasFallen ? SPRITE_REGIONS.foodSpilled : SPRITE_REGIONS.foodBag;
          }

          const sw = this.spriteSheetImg.naturalWidth;
          const sh = this.spriteSheetImg.naturalHeight;
          ctx.drawImage(
            this.spriteSheetImg,
            region.u * sw,
            region.v * sh,
            region.w * sw,
            region.h * sh,
            trap.x,
            trap.y,
            trap.w,
            trap.h
          );
        } else {
          ctx.fillStyle = '#f97316';
          ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        }

        // Push prompt
        if (!trap.isPushed && this.nearbyTrap === trap) {
          ctx.save();
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(trap.x - 25, trap.y - 36, 100, 26, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#854d0e';
          ctx.font = 'bold 11px "DotGothic16", sans-serif';
          ctx.fillText('SPACE 推落！', trap.x - 18, trap.y - 20);
          ctx.restore();
        }
      }

      if (trap.cans) {
        trap.cans.forEach((c) => {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-8, -6, 16, 12);
          ctx.restore();
        });
      }
    }
  }

  private drawKeysAndItems(ctx: CanvasRenderingContext2D) {
    // 1. Door Key
    if (this.level.doorKey && !this.level.doorKey.isCollected) {
      const key = this.level.doorKey;
      const keyBobY = key.y + Math.sin(key.bobOffset) * 6;

      ctx.save();
      const grad = ctx.createRadialGradient(
        key.x + key.w / 2,
        keyBobY + key.h / 2,
        4,
        key.x + key.w / 2,
        keyBobY + key.h / 2,
        32
      );
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.85)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(key.x + key.w / 2, keyBobY + key.h / 2, 32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(key.x + 12, keyBobY + 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(key.x + 12, keyBobY + 12, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.fillRect(key.x + 18, keyBobY + 9, 14, 6);
      ctx.fillRect(key.x + 26, keyBobY + 15, 4, 6);
      ctx.fillRect(key.x + 30, keyBobY + 15, 3, 4);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11px "DotGothic16", sans-serif';
      ctx.fillText(`🔑 ${key.label}`, key.x - 20, keyBobY - 10);
      ctx.restore();
    }

    // 2. Emergency Button (Stage 3)
    if (this.level.emergencyButton) {
      const btn = this.level.emergencyButton;
      ctx.save();
      // Wall housing
      ctx.fillStyle = '#334155';
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

      // Red / Green button switch
      ctx.fillStyle = btn.isPressed ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(btn.x + btn.w / 2, btn.y + btn.h / 2 + 4, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "Press Start 2P", monospace';
      ctx.fillText(btn.isPressed ? 'OK' : 'PUSH', btn.x + 4, btn.y + 12);

      if (!btn.isPressed && this.nearbyButton === btn) {
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11px "DotGothic16", sans-serif';
        ctx.fillText('SPACE 按下！', btn.x - 14, btn.y - 12);
      }
      ctx.restore();
    }

    // 3. Heisei Items
    for (const item of this.level.heiseiItems) {
      if (item.isCollected) continue;
      const bobY = item.y + Math.sin(item.bobOffset) * 6;

      ctx.save();
      const grad = ctx.createRadialGradient(
        item.x + item.w / 2,
        bobY + item.h / 2,
        4,
        item.x + item.w / 2,
        bobY + item.h / 2,
        28
      );
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.7)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2, bobY + item.h / 2, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (this.isSpriteLoaded && this.spriteSheetImg) {
        const region =
          item.type === 'tamagotchi'
            ? SPRITE_REGIONS.tamagotchi
            : item.type === 'flipPhoneBlack'
            ? SPRITE_REGIONS.flipPhoneBlack
            : SPRITE_REGIONS.flipPhoneBlue;

        const sw = this.spriteSheetImg.naturalWidth;
        const sh = this.spriteSheetImg.naturalHeight;
        ctx.drawImage(
          this.spriteSheetImg,
          region.u * sw,
          region.v * sh,
          region.w * sw,
          region.h * sh,
          item.x,
          bobY,
          item.w,
          item.h
        );
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(item.x, bobY, item.w, item.h);
      }
    }

    // 4. Recovery Items (高級木天蓼, 高級貓肉泥, 高級貓罐頭) with 20s Respawn Altar
    if (this.level.recoveryItems) {
      for (const item of this.level.recoveryItems) {
        if (!item.isActive) {
          // Draw respawn pedestal & remaining seconds
          ctx.save();
          ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(item.x + item.w / 2, item.y + item.h / 2, 16, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 9px "DotGothic16", sans-serif';
          ctx.fillText(`⏳${Math.ceil(item.respawnCooldown)}s 刷新`, item.x - 18, item.y - 6);
          ctx.restore();
          continue;
        }

        const bobY = item.y + Math.sin(item.bobOffset) * 4;

        ctx.save();
        // Glowing aura
        const auraColor =
          item.type === 'churu'
            ? 'rgba(244, 114, 182, 0.65)'
            : item.type === 'matatabi'
            ? 'rgba(74, 222, 128, 0.65)'
            : 'rgba(250, 204, 21, 0.65)';

        const grad = ctx.createRadialGradient(
          item.x + item.w / 2,
          bobY + item.h / 2,
          2,
          item.x + item.w / 2,
          bobY + item.h / 2,
          24
        );
        grad.addColorStop(0, auraColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(item.x + item.w / 2, bobY + item.h / 2, 24, 0, Math.PI * 2);
        ctx.fill();

        // Pixel Art Item Rendering based on user reference image
        if (item.type === 'matatabi') {
          // Section 1: 高級木天蓼 (Matatabi Stick & Herb Bag)
          ctx.save();
          ctx.translate(item.x + 8, bobY + 12);
          ctx.rotate(-0.32);
          ctx.fillStyle = '#854d0e'; // woody brown
          ctx.fillRect(-10, -3, 24, 7);
          ctx.fillStyle = '#a16207'; // bark edge
          ctx.fillRect(-10, -2, 24, 3);
          ctx.fillStyle = '#fef08a'; // cut tip
          ctx.fillRect(-11, -3, 3, 7);

          // Green leaves
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.ellipse(3, -7, 6, 3, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(8, 7, 5, 3, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Small cloth herb pouch
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.arc(item.x + 26, bobY + 15, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.fillRect(item.x + 23, bobY + 9, 6, 2);

        } else if (item.type === 'churu') {
          // Section 2: 高級貓肉泥 (Churu Treat Pouch)
          ctx.fillStyle = '#e11d48'; // red/pink wrapper
          ctx.fillRect(item.x, bobY + 6, 28, 10);
          ctx.fillStyle = '#f59e0b'; // golden striped edges
          ctx.fillRect(item.x, bobY + 6, 4, 10);
          ctx.fillRect(item.x + 24, bobY + 6, 4, 10);

          // Cat silhouette on package
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(item.x + 14, bobY + 11, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Extruded delicious creamy treat puree
          ctx.fillStyle = '#fda4af';
          ctx.beginPath();
          ctx.arc(item.x + 29, bobY + 11, 4, 0, Math.PI * 2);
          ctx.fill();

          // Floating mini heart
          const heartY = bobY - 4 + Math.sin(item.glowTimer * 4) * 2;
          ctx.fillStyle = '#f43f5e';
          ctx.font = '10px sans-serif';
          ctx.fillText('💖', item.x + 8, heartY);

        } else {
          // Section 3: 高級貓罐頭 (Premium Open Cat Food Can)
          ctx.fillStyle = '#0284c7'; // blue retro can
          ctx.fillRect(item.x + 3, bobY + 8, 26, 13);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(item.x + 3, bobY + 17, 26, 4);

          // Open top with gold/silver rim
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.ellipse(item.x + 16, bobY + 8, 13, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Savory meat inside
          ctx.fillStyle = '#b91c1c';
          ctx.beginPath();
          ctx.ellipse(item.x + 16, bobY + 8, 9, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Open pulled lid
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.ellipse(item.x + 8, bobY + 2, 7, 4, -0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Stress recovery badge above item
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 10px "DotGothic16", sans-serif';
        ctx.fillText(`💚-${item.healAmount}%`, item.x - 2, bobY - 6);

        ctx.restore();
      }
    }
  }

  private drawExitDoor(ctx: CanvasRenderingContext2D) {
    const exitX = this.level.exitX;
    let isUnlocked = true;
    if (this.level.doorKey && !this.state.hasDoorKey) isUnlocked = false;
    if (this.level.emergencyButton && !this.state.emergencyButtonPressed) isUnlocked = false;
    if (
      this.level.requiredHeiseiItemsCount &&
      this.state.collectedItems.length < this.level.requiredHeiseiItemsCount
    ) {
      isUnlocked = false;
    }

    ctx.save();
    ctx.fillStyle = isUnlocked ? '#059669' : '#991b1b';
    ctx.fillRect(exitX, 100, 180, 400);

    ctx.fillStyle = isUnlocked ? 'rgba(186, 230, 253, 0.45)' : 'rgba(254, 202, 202, 0.45)';
    ctx.fillRect(exitX + 10, 140, 75, 350);
    ctx.fillRect(exitX + 95, 140, 75, 350);

    ctx.strokeStyle = isUnlocked ? '#047857' : '#7f1d1d';
    ctx.lineWidth = 4;
    ctx.strokeRect(exitX + 10, 140, 75, 350);
    ctx.strokeRect(exitX + 95, 140, 75, 350);

    ctx.fillStyle = isUnlocked ? '#10b981' : '#dc2626';
    ctx.fillRect(exitX + 20, 105, 140, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillText(this.level.exitLabel, exitX + 26, 126);

    ctx.fillStyle = isUnlocked ? '#059669' : '#dc2626';
    ctx.beginPath();
    ctx.arc(exitX + 90, 300, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px "DotGothic16", sans-serif';
    ctx.fillText(isUnlocked ? '🔓' : '🔒', exitX + 79, 307);

    const pulse = Math.sin(performance.now() * 0.006) * 6;
    ctx.fillStyle = isUnlocked ? '#f59e0b' : '#f87171';
    ctx.font = 'bold 15px "DotGothic16", sans-serif';
    ctx.fillText(isUnlocked ? '★ 逃脫點 ★' : '未解除鎖定！', exitX + 42, 350 + pulse);

    ctx.restore();
  }

  private drawSoundRipples(ctx: CanvasRenderingContext2D) {
    for (const r of this.soundRipples) {
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${r.alpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawHumans(ctx: CanvasRenderingContext2D) {
    for (const human of this.level.humans) {
      ctx.save();

      // Vision cone
      if (human.state !== 'slip' && human.state !== 'stunned' && human.state !== 'panic') {
        const eyeX = human.x + human.w / 2;
        const eyeY = human.y + 35;
        const baseAngle = human.facing === 'right' ? 0 : Math.PI;
        const halfFov = human.visionFov / 2;

        ctx.save();
        const coneGrad = ctx.createRadialGradient(eyeX, eyeY, 15, eyeX, eyeY, human.visionRange);
        if (human.state === 'chase') {
          coneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
          coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
        } else {
          coneGrad.addColorStop(0, 'rgba(250, 204, 21, 0.22)');
          coneGrad.addColorStop(1, 'rgba(250, 204, 21, 0.01)');
        }

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY);
        ctx.arc(eyeX, eyeY, human.visionRange, baseAngle - halfFov, baseAngle + halfFov);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (human.isFlanker) {
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 11px "DotGothic16", sans-serif';
        ctx.fillText('【包夾中！】', human.x - 10, human.y - 28);
      }

      if (human.alertMark !== 'none') {
        ctx.save();
        ctx.fillStyle = human.alertMark === 'question' ? '#38bdf8' : '#ef4444';
        ctx.font = 'bold 22px "Press Start 2P", monospace';
        const symbol = human.alertMark === 'question' ? '?' : '!';
        ctx.fillText(symbol, human.x + human.w / 2 - 8, human.y - 12);
        ctx.restore();
      }

      // Sprite
      if (this.isSpriteLoaded && this.spriteSheetImg) {
        let region =
          human.type === 'clerk' ? SPRITE_REGIONS.clerkSide : SPRITE_REGIONS.customerSide;

        if (human.state === 'slip' || human.state === 'stunned') {
          region =
            human.type === 'clerk'
              ? SPRITE_REGIONS.clerkShowerCatch
              : SPRITE_REGIONS.customerReachSlip;
        } else if (human.state === 'chase') {
          region =
            human.type === 'clerk'
              ? SPRITE_REGIONS.clerkShowerCatch
              : SPRITE_REGIONS.customerReachSlip;
        }

        const sw = this.spriteSheetImg.naturalWidth;
        const sh = this.spriteSheetImg.naturalHeight;

        ctx.translate(human.x + human.w / 2, human.y + human.h / 2);
        if (human.facing === 'left') {
          ctx.scale(-1, 1);
        }

        if (human.state === 'slip') {
          ctx.rotate(Math.PI / 2.3);
        }

        ctx.drawImage(
          this.spriteSheetImg,
          region.u * sw,
          region.v * sh,
          region.w * sw,
          region.h * sh,
          -human.w / 2,
          -human.h / 2,
          human.w,
          human.h
        );
      } else {
        ctx.fillStyle = human.type === 'clerk' ? '#ec4899' : '#10b981';
        ctx.fillRect(human.x, human.y, human.w, human.h);
      }

      ctx.restore();

      ctx.fillStyle = this.level.theme === 'salon' || this.level.theme === 'aquarium' ? '#e2e8f0' : '#334155';
      ctx.font = '10px "DotGothic16", sans-serif';
      ctx.fillText(human.name, human.x - 10, human.y + human.h + 14);
    }
  }

  private drawCat(ctx: CanvasRenderingContext2D) {
    const cat = this.cat;
    ctx.save();

    if (cat.invincibleTimer > 0 && Math.floor(cat.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (cat.panicTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cat.x + cat.w / 2, cat.y + cat.h / 2, cat.w * 0.8, cat.h * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (cat.isOnCatTree) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px "DotGothic16", sans-serif';
      ctx.fillText('【隱匿中】', cat.x - 5, cat.y - 12);
    } else if (cat.isExhausted) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px "DotGothic16", sans-serif';
      ctx.fillText('💦 呼...呼...', cat.x - 5, cat.y - 12);
    }

    ctx.translate(cat.x + cat.w / 2, cat.y + cat.h / 2);
    if (cat.facing === 'left') {
      ctx.scale(-1, 1);
    }

    if (cat.state === 'run') {
      ctx.translate(0, Math.sin(cat.walkFrame * 2) * 3);
    }

    if (this.isSpriteLoaded && this.spriteSheetImg) {
      let region = SPRITE_REGIONS.catWalkSide;
      if (cat.state === 'hiss') {
        region = SPRITE_REGIONS.catHiss;
      } else if (cat.state === 'jump') {
        region = SPRITE_REGIONS.catPounce;
      } else if (cat.state === 'panic') {
        region = SPRITE_REGIONS.catPounce;
      }

      const sw = this.spriteSheetImg.naturalWidth;
      const sh = this.spriteSheetImg.naturalHeight;

      ctx.drawImage(
        this.spriteSheetImg,
        region.u * sw,
        region.v * sh,
        region.w * sw,
        region.h * sh,
        -cat.w / 2,
        -cat.h / 2,
        cat.w,
        cat.h
      );
    } else {
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-cat.w / 2, -cat.h / 2, cat.w, cat.h);
    }

    ctx.restore();
  }

  private drawEffects(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;

      if (p.shape === 'heart') {
        // Pixel-cute heart
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.bezierCurveTo(p.x - s, p.y - s, p.x - s * 1.5, p.y + s * 0.5, p.x, p.y + s * 1.4);
        ctx.bezierCurveTo(p.x + s * 1.5, p.y + s * 0.5, p.x + s, p.y - s, p.x, p.y);
        ctx.fill();
      } else if (p.shape === 'plus') {
        // Green recovery plus sign
        const s = p.size;
        const w = s * 0.35;
        ctx.fillRect(p.x - w, p.y - s, w * 2, s * 2);
        ctx.fillRect(p.x - s, p.y - w, s * 2, w * 2);
      } else if (p.shape === 'star') {
        // Twinkling sparkle star
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.28, p.y - s * 0.28);
        ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x + s * 0.28, p.y + s * 0.28);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.28, p.y + s * 0.28);
        ctx.lineTo(p.x - s, p.y);
        ctx.lineTo(p.x - s * 0.28, p.y - s * 0.28);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = `bold ${t.size || 14}px "DotGothic16", sans-serif`;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  public destroy() {
    this.stop();
    sound.stopBGM();
  }
}
