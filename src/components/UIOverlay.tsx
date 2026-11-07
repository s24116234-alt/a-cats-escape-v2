import React from 'react';
import { GameLevel, GameState, HeiseiItemType } from '../game/types';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Tv, Key, AlertTriangle, Trophy, CheckCircle, Sparkles } from 'lucide-react';
import { sound } from '../audio/sound';

interface UIOverlayProps {
  state: GameState;
  level: GameLevel;
  exitProgress: number;
  canPushTrap: boolean;
  canPressButton: boolean;
  hissCooldown: number;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onStartGame: (levelIndex: number) => void;
  onInteract: () => void;
  onHiss: () => void;
  onMoveLeft: (active: boolean) => void;
  onMoveRight: (active: boolean) => void;
  onJump: () => void;
  onReturnToMenu: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  state,
  level,
  exitProgress,
  canPushTrap,
  canPressButton,
  hissCooldown,
  crtEnabled,
  onToggleCrt,
  onPauseToggle,
  onRestart,
  onNextLevel,
  onStartGame,
  onInteract,
  onHiss,
  onMoveLeft,
  onMoveRight,
  onJump,
  onReturnToMenu,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getIsMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatScore = (score: number) => {
    return score.toString().padStart(6, '0');
  };

  const hasItem = (type: HeiseiItemType) => state.collectedItems.includes(type);

  // Status text for current stage mission
  const getMissionStatus = () => {
    if (level.stageNumber === 1 || level.stageNumber === 2) {
      return state.hasDoorKey ? '🔑 鑰匙已取得！速往出口脫逃！' : level.missionTargetText;
    } else if (level.stageNumber === 3) {
      return state.emergencyButtonPressed
        ? '🚨 非常口已解鎖！快往門口逃！'
        : '非常口ボタンを探せ！尋找緊急出口按鈕！';
    } else {
      const count = state.collectedItems.length;
      return count >= 2
        ? '🔓 安全裝置已解除！出口已開！'
        : `セキュリティ解除！收集 2 個平成道具 (${count}/2)`;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 font-['DotGothic16',sans-serif]">
      {/* TOP HEADER HUD */}
      <div className="flex items-start justify-between w-full pointer-events-auto">
        {/* Left Side: Avatar, Stress Bar, Stamina Bar, Score, Time, Stage */}
        <div className="flex flex-col gap-1.5 bg-black/75 backdrop-blur-sm p-2.5 rounded-xl border-2 border-amber-600/70 shadow-xl text-white">
          <div className="flex items-center gap-3">
            {/* Retro Cat Avatar */}
            <div
              className={`relative w-12 h-12 rounded-lg bg-amber-500 border-2 border-white flex items-center justify-center overflow-hidden shadow-inner ${
                state.isExhausted ? 'opacity-70 animate-pulse' : ''
              }`}
            >
              <span className="text-2xl transform hover:scale-110 transition-transform">
                {state.isExhausted ? '😿' : '🐱'}
              </span>
              {state.stress > 70 && (
                <span className="absolute top-0 right-0 text-xs animate-ping">💢</span>
              )}
            </div>

            {/* Meters: Stress (警戒條) & Stamina (體力條) */}
            <div className="flex flex-col gap-1">
              {/* Stress Meter */}
              <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                <span className="flex items-center gap-1">
                  <span className="text-red-500 text-sm">❤️</span>
                  <span>壓力值 / 警戒條</span>
                </span>
                <span
                  className={
                    state.stress > 75 ? 'text-red-400 font-extrabold animate-pulse' : 'text-amber-100'
                  }
                >
                  {Math.round(state.stress)}%
                </span>
              </div>
              <div className="w-48 sm:w-56 h-3 bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative shadow-inner">
                <div
                  className={`h-full transition-all duration-200 ${
                    state.stress > 75
                      ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-400 animate-pulse'
                      : state.stress > 40
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, state.stress)}%` }}
                />
              </div>

              {/* Stamina Meter */}
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-200">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">⚡</span>
                  <span>貓咪體力</span>
                  {state.isExhausted && (
                    <span className="text-red-400 text-[10px] animate-pulse">【氣喘吁吁】</span>
                  )}
                </span>
                <span className={state.isExhausted ? 'text-red-400 font-bold' : 'text-emerald-100'}>
                  {Math.round(state.stamina)}%
                </span>
              </div>
              <div className="w-48 sm:w-56 h-2 bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-100 ${
                    state.isExhausted
                      ? 'bg-red-500 animate-pulse'
                      : state.stamina < 30
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, state.stamina)}%` }}
                />
              </div>
            </div>
          </div>

          {/* STAGE & SCORE & TIME ROW */}
          <div className="flex items-center justify-between font-['Press_Start_2P'] text-[10px] pt-1 border-t border-slate-700/80">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
              {level.stageTitle}
            </span>
            <div className="text-yellow-400">
              SCORE: <span className="text-white">{formatScore(state.score)}</span>
            </div>
            <div
              className={`flex items-center gap-1 ${
                state.timeRemaining <= 20 ? 'text-rose-400 font-black animate-pulse' : 'text-amber-300'
              }`}
            >
              <span>{state.timeRemaining <= 20 ? '⏱️!' : 'TIME:'}</span>
              <span
                className={`px-1 py-0.5 rounded ${
                  state.timeRemaining <= 20
                    ? 'text-white bg-rose-600 border border-rose-400 font-black'
                    : 'text-white'
                }`}
              >
                {formatTime(state.timeRemaining)}
              </span>
            </div>
          </div>

          {/* Mission Indicator & Heisei Items & BGM Info */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-amber-200 font-bold">道具:</span>
              <div
                title="平成摺疊手機 (海軍藍)"
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-all ${
                  hasItem('flipPhoneBlue')
                    ? 'bg-blue-600 border-yellow-300 shadow-md shadow-blue-400/50 scale-105'
                    : 'bg-slate-800/80 border-slate-600 opacity-40'
                }`}
              >
                📱
              </div>
              <div
                title="經典初代電子雞"
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-all ${
                  hasItem('tamagotchi')
                    ? 'bg-pink-600 border-yellow-300 shadow-md shadow-pink-400/50 scale-105'
                    : 'bg-slate-800/80 border-slate-600 opacity-40'
                }`}
              >
                🐣
              </div>
              <div
                title="商務黑金摺疊機"
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-all ${
                  hasItem('flipPhoneBlack')
                    ? 'bg-amber-700 border-yellow-300 shadow-md shadow-amber-400/50 scale-105'
                    : 'bg-slate-800/80 border-slate-600 opacity-40'
                }`}
              >
                📞
              </div>
            </div>

            {/* Mission Objective Badge & Stage BGM */}
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono">
                {level.stageNumber === 1 && '🎵 16-bit 輕快電音'}
                {level.stageNumber === 2 && '🎵 水族晶片音'}
                {level.stageNumber === 3 && '🎵 爵士潛行風'}
                {level.stageNumber === 4 && '🎵 終極熱血電音'}
              </span>
              <div className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-yellow-300 truncate max-w-[200px]">
                {getMissionStatus()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Escape Goal & Controls */}
        <div className="flex flex-col items-end gap-2">
          {/* Escape Goal Progress Bar */}
          <div className="bg-black/75 backdrop-blur-sm p-2 rounded-xl border-2 border-emerald-600/70 shadow-lg text-white">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
              <span>{level.exitLabel}</span>
              <span className="text-[11px] font-['Press_Start_2P']">
                {Math.round(exitProgress * 100)}%
              </span>
            </div>
            <div className="w-36 sm:w-44 h-3 bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
                style={{ width: `${Math.min(100, Math.max(0, exitProgress * 100))}%` }}
              />
              <span
                className="absolute -top-1.5 text-xs transition-all duration-150"
                style={{ left: `calc(${Math.min(92, Math.max(0, exitProgress * 100))}% - 4px)` }}
              >
                🐾
              </span>
            </div>
          </div>

          {/* Alert Banner */}
          {state.alarmActive && (
            <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-3 py-1 rounded-lg border border-red-300 font-bold text-xs animate-bounce shadow-lg shadow-red-500/50">
              <AlertTriangle size={14} />
              <span>🚨 警報響起！店員全體包夾中！</span>
            </div>
          )}

          {/* Quick Buttons */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-lg border border-slate-700">
            <button
              onClick={onToggleCrt}
              title="切換平成 CRT 電視掃描線效果"
              className={`p-1.5 rounded border transition-colors ${
                crtEnabled
                  ? 'bg-amber-600 border-yellow-400 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Tv size={16} />
            </button>
            <button
              onClick={handleToggleSound}
              title="聲音開關"
              className="p-1.5 rounded bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={onPauseToggle}
              title="暫停"
              className="p-1.5 rounded bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Pause size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS & HINTS */}
      <div className="w-full pointer-events-auto flex flex-col items-center gap-2">
        {/* Context Prompts */}
        {canPressButton && (
          <div className="bg-red-500 text-white font-extrabold px-4 py-1.5 rounded-full border-2 border-white shadow-xl animate-bounce text-sm">
            🔴 按【空白鍵 SPACE】按下緊急出口按鈕！
          </div>
        )}

        {canPushTrap && !canPressButton && (
          <div className="bg-yellow-400 text-slate-900 font-extrabold px-4 py-1.5 rounded-full border-2 border-yellow-200 shadow-xl animate-bounce text-sm">
            ⚡ 按【空白鍵 SPACE】推落商品擊倒店員！(10 秒冷卻)
          </div>
        )}

        {/* Mobile / Touch Screen Virtual Gamepad */}
        <div className="flex sm:hidden w-full items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-2">
            <button
              onTouchStart={() => onMoveLeft(true)}
              onTouchEnd={() => onMoveLeft(false)}
              onMouseDown={() => onMoveLeft(true)}
              onMouseUp={() => onMoveLeft(false)}
              className="w-14 h-14 bg-slate-800/90 active:bg-amber-600 border-2 border-slate-600 active:border-white rounded-xl text-white font-bold text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              ◀
            </button>
            <button
              onTouchStart={() => onMoveRight(true)}
              onTouchEnd={() => onMoveRight(false)}
              onMouseDown={() => onMoveRight(true)}
              onMouseUp={() => onMoveRight(false)}
              className="w-14 h-14 bg-slate-800/90 active:bg-amber-600 border-2 border-slate-600 active:border-white rounded-xl text-white font-bold text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onHiss}
              disabled={hissCooldown > 0}
              className={`w-14 h-14 rounded-full border-2 font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all ${
                hissCooldown > 0
                  ? 'bg-slate-800 border-slate-600 text-slate-500'
                  : 'bg-rose-600 active:bg-rose-500 border-rose-300 text-white'
              }`}
            >
              <span>😾</span>
              <span>{hissCooldown > 0 ? `${hissCooldown.toFixed(1)}s` : '威嚇'}</span>
            </button>

            <button
              onClick={onInteract}
              className={`w-14 h-14 rounded-full border-2 font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all ${
                canPressButton
                  ? 'bg-red-500 border-white text-white animate-pulse'
                  : canPushTrap
                  ? 'bg-yellow-500 border-white text-slate-950 animate-pulse'
                  : 'bg-amber-600 active:bg-amber-500 border-amber-300 text-white'
              }`}
            >
              <span>{canPressButton ? '🔴' : '🐾'}</span>
              <span>{canPressButton ? '按鍵' : '推落'}</span>
            </button>

            <button
              onClick={onJump}
              disabled={state.isExhausted}
              className={`w-14 h-14 rounded-full border-2 text-white font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform ${
                state.isExhausted
                  ? 'bg-slate-800 border-slate-600 opacity-50'
                  : 'bg-emerald-600 active:bg-emerald-500 border-emerald-300'
              }`}
            >
              <span>⬆</span>
              <span>跳躍</span>
            </button>
          </div>
        </div>

        {/* Desktop Keyboard Hints */}
        <div className="hidden sm:flex items-center justify-center gap-3 bg-black/80 px-4 py-1.5 rounded-full border border-slate-700 text-slate-200 text-xs shadow-md">
          <span>移動: <span className="text-amber-400 font-bold">← / → (A / D)</span></span>
          <span>•</span>
          <span>跳躍: <span className="text-emerald-400 font-bold">↑ / W (消耗體力)</span></span>
          <span>•</span>
          <span>互動/推落/按鈕: <span className="text-yellow-400 font-bold">SPACE</span></span>
          <span>•</span>
          <span>炸毛威嚇: <span className="text-rose-400 font-bold">X / E ({hissCooldown > 0 ? `${hissCooldown.toFixed(1)}s` : '可使用'})</span></span>
        </div>
      </div>

      {/* MODAL: STAGE CLEAR (Stages 1-3) */}
      {state.status === 'stage_clear' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border-4 border-yellow-400 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-2 animate-bounce">🚪 🐾 ✨</div>
            <div className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs mb-1">
              {level.stageTitle}
            </div>
            <h2 className="text-2xl font-black text-yellow-300 tracking-wider mb-1">
              STAGE CLEAR！成功脫逃！
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              成功突破 {level.name}！甩開了所有人類的魔爪！
            </p>

            <div className="w-full bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-sm space-y-2 mb-5">
              <div className="flex justify-between text-slate-300">
                <span>擊退/絆倒人類 ({state.humanKnockdowns} 次)</span>
                <span className="text-yellow-400 font-bold">+{state.humanKnockdowns * 300} pt</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>平成道具收集 ({state.collectedItems.length} 件)</span>
                <span className="text-amber-400 font-bold">+{state.collectedItems.length * 200} pt</span>
              </div>
              {state.perfectBonusEligible && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>完美無碰觸 (No Thank You Bonus)</span>
                  <span>+500 pt</span>
                </div>
              )}
              <div className="flex justify-between text-cyan-300">
                <span>剩餘時間獎勵</span>
                <span>+{Math.floor(state.timeRemaining * 10)} pt</span>
              </div>
              <div className="border-t border-slate-600 pt-2 flex justify-between font-['Press_Start_2P'] text-base text-yellow-300">
                <span>TOTAL:</span>
                <span>{state.score}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onRestart}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-slate-200 transition-colors flex items-center justify-center gap-1"
              >
                <RotateCcw size={16} /> 重玩本關
              </button>
              <button
                onClick={onNextLevel}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base shadow-lg shadow-yellow-500/30 transition-transform active:scale-95"
              >
                前往下一關 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALL CLEAR (STAGE 4 GRAND VICTORY!) */}
      {state.status === 'all_clear' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-amber-950 border-4 border-yellow-400 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="text-6xl mb-2 animate-bounce">🏆 🐱 👑</div>
            <div className="px-4 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black text-sm mb-2 shadow-lg">
              全 4 關完全通關！ALL CLEAR！
            </div>
            <h2 className="text-3xl font-black text-yellow-300 tracking-wider mb-2">
              平成喵星人・完全制霸大脫逃！
            </h2>
            <p className="text-sm text-slate-200 mb-5 leading-relaxed">
              阿橘成功穿越個人寵物店、水族沙龍、深夜美容室，<br />
              並突破了大型寵物綜合購物中心的重重監視器與包夾防線！<br />
              <span className="text-amber-300 font-bold">「喵哈哈！天高任我游，絕對不洗澡，重獲完全自由！」</span>
            </p>

            <div className="w-full bg-slate-800/90 rounded-2xl p-4 border border-yellow-500/50 text-sm space-y-2 mb-6 shadow-inner">
              <div className="flex justify-between text-slate-300">
                <span>最終累計得分</span>
                <span className="font-['Press_Start_2P'] text-yellow-300 text-lg">{state.score} pt</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>總共擊退人類次數</span>
                <span className="text-yellow-400 font-bold">{state.humanKnockdowns} 次</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>平成復古道具收集率</span>
                <span className="text-amber-400 font-bold">{state.collectedItems.length} 件</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onReturnToMenu}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-slate-200 transition-colors"
              >
                回主選單 (故事與說明)
              </button>
              <button
                onClick={() => onStartGame(0)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base shadow-xl shadow-yellow-500/30 transition-transform active:scale-95"
              >
                再玩一次！(NEW GAME)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GAME OVER */}
      {state.status === 'game_over' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-gradient-to-b from-slate-900 to-rose-950 border-4 border-red-500 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-2">🛁 😿 🚿</div>
            <div className="px-3 py-1 rounded-full bg-red-600 text-white font-bold text-xs mb-1">
              {level.stageTitle}
            </div>
            <h2 className="text-2xl font-black text-red-400 tracking-wider mb-1">
              GAME OVER！被捕獲！
            </h2>
            <p className="text-sm text-rose-200 mb-4">
              阿橘在 {level.name} 被抓住了！被強行抱進浴室洗香香...
              <br />
              <span className="text-xs text-slate-400">「喵嗚——！放開我！我的威嚴全沒了！」</span>
            </p>

            <div className="w-full bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-sm mb-5 font-['Press_Start_2P']">
              <span className="text-slate-400 text-xs">FINAL SCORE:</span>
              <div className="text-xl text-yellow-400 mt-1">{state.score}</div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onReturnToMenu}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-slate-200 transition-colors"
              >
                回主選單 (故事與說明)
              </button>
              <button
                onClick={onRestart}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold shadow-lg shadow-red-500/30 transition-transform active:scale-95"
              >
                再次挑戰本關！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAUSED */}
      {state.status === 'paused' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-sm w-full p-6 text-white text-center flex flex-col items-center">
            <div className="text-xs text-amber-400 font-bold mb-1">{level.stageTitle}</div>
            <h2 className="text-xl font-bold text-yellow-400 mb-3 font-['Press_Start_2P']">
              PAUSED 暫停中
            </h2>
            <p className="text-sm text-slate-300 mb-5">阿橘正在紙箱後方暫時歇息...</p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={onPauseToggle}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Play size={16} /> 繼續脫逃
              </button>
              <button
                onClick={onRestart}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> 重新開始本關
              </button>
              <button
                onClick={onReturnToMenu}
                className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                ◀ 返回故事與操作選單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
