export type CatState = 'idle' | 'run' | 'jump' | 'hiss' | 'panic' | 'exhausted';

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: 'shelf' | 'box' | 'counter' | 'floor' | 'cat_tree';
  label?: string;
}

export type TrapType = 'cans' | 'bucket' | 'food' | 'fishbowl' | 'hairDryer';

export interface CanParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
}

export interface FishParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rot: number;
}

export interface TrapItem {
  id: string;
  type: TrapType;
  x: number;
  y: number;
  w: number;
  h: number;
  initialX: number;
  initialY: number;
  vx: number;
  vy: number;
  isPushed: boolean;
  hasFallen: boolean;
  hasHitHuman: boolean;
  cooldownTimer?: number;
  cooldownMax?: number;
  puddleX?: number;
  puddleW?: number;
  puddleDuration?: number;
  cans?: CanParticle[];
  fishes?: FishParticle[];
  windTimer?: number; // for hair dryer
}

export type HeiseiItemType = 'flipPhoneBlue' | 'flipPhoneBlack' | 'tamagotchi';

export type RecoveryItemType = 'matatabi' | 'churu' | 'canned_food';

export interface RecoveryItem {
  id: string;
  type: RecoveryItemType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  healAmount: number; // 30 ~ 50%
  isActive: boolean;
  respawnCooldown: number; // seconds remaining until respawn
  respawnTimeMax: number; // 20 seconds
  bobOffset: number;
  glowTimer: number;
}

export interface HeiseiItem {
  id: string;
  type: HeiseiItemType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isCollected: boolean;
  bobOffset: number;
}

export interface DoorKey {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isCollected: boolean;
  bobOffset: number;
  label: string;
  type?: 'front_door' | 'backdoor';
}

export interface EmergencyButton {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isPressed: boolean;
}

export interface RobotVacuum {
  id: string;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  alarmTimer: number;
}

export interface AquariumDeco {
  x: number;
  y: number;
  w: number;
  h: number;
  theme: 'pirate_ship' | 'castle';
  bubbleTimer: number;
}

export interface CatTree {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SecurityCamera {
  id: string;
  x: number;
  y: number;
  angle: number;
  minAngle: number;
  maxAngle: number;
  sweepSpeed: number;
  direction: 1 | -1;
  coneLength: number;
  coneFov: number;
  isAlerted: boolean;
  alarmFlashTimer: number;
}

export interface SoundRipple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alertRadius: number;
  alpha: number;
}

export type HumanType = 'clerk' | 'customer';
export type HumanState = 'patrol' | 'chase' | 'slip' | 'stunned' | 'surprised' | 'investigate' | 'flank' | 'panic';

export interface Human {
  id: string;
  type: HumanType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 'left' | 'right';
  state: HumanState;
  stateTimer: number;
  patrolMinX: number;
  patrolMaxX: number;
  speed: number;
  alertMark: 'none' | 'alert' | 'question' | 'anger';
  alertTimer: number;
  visionRange: number;
  visionFov: number;
  targetX?: number | null;
  isFlanker?: boolean;
  chaseDuration?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  color: string;
  size?: number;
}

export type StageTheme = 'pet_shop' | 'aquarium' | 'salon' | 'mega_mall';
export type ExitType = 'front_door' | 'backdoor' | 'emergency_exit' | 'mall_security_door';

export interface GameLevel {
  id: number;
  stageNumber: number; // 1, 2, 3, 4
  name: string;
  stageTitle: string; // e.g. "STAGE 2 / 4"
  subtitle: string;
  theme: StageTheme;
  exitType: ExitType;
  exitLabel: string;
  missionTargetText: string;
  worldWidth: number;
  timeLimit: number;
  platforms: Platform[];
  traps: TrapItem[];
  heiseiItems: HeiseiItem[];
  recoveryItems?: RecoveryItem[];
  doorKey?: DoorKey;
  emergencyButton?: EmergencyButton;
  vacuums?: RobotVacuum[];
  aquariums?: AquariumDeco[];
  catTrees?: CatTree[];
  cameras?: SecurityCamera[];
  humans: Human[];
  exitX: number;
  requiredHeiseiItemsCount?: number;
  humanSpeedMultiplier: number;
  stressRateMultiplier: number;
}

export interface GameState {
  score: number;
  timeRemaining: number;
  stress: number;
  stamina: number;
  isExhausted: boolean;
  hasDoorKey: boolean;
  emergencyButtonPressed: boolean;
  alarmActive: boolean;
  perfectBonusEligible: boolean;
  humanKnockdowns: number;
  collectedItems: HeiseiItemType[];
  status: 'menu' | 'playing' | 'paused' | 'stage_clear' | 'all_clear' | 'game_over';
  currentLevelIndex: number;
}
