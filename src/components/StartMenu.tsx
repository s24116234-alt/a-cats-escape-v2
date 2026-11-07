import React, { useEffect, useState } from 'react';
import { Play, Trophy, Sparkles, Move, Zap, HeartCrack, DoorOpen, ListOrdered } from 'lucide-react';
import { sound } from '../audio/sound';
import { LEVELS } from '../game/levels';

interface StartMenuProps {
  onStartGame: (levelIndex: number) => void;
  highScore: number;
}

export const StartMenu: React.FC<StartMenuProps> = ({ onStartGame, highScore }) => {
  const [showStageSelect, setShowStageSelect] = useState(false);

  const handleStart = (levelIdx = 0) => {
    sound.playMeow();
    onStartGame(levelIdx);
  };

  // Listen to Spacebar or Enter to start game immediately from intro screen
  useEffect(() => {
    const startMenuAudio = () => {
      sound.playStageBGM('menu');
    };
    window.addEventListener('click', startMenuAudio, { once: true });
    window.addEventListener('keydown', startMenuAudio, { once: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStart(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', startMenuAudio);
      window.removeEventListener('keydown', startMenuAudio);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-amber-100 via-orange-100 to-amber-200 overflow-y-auto font-['DotGothic16',sans-serif]">
      {/* Retro Dotted Background */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Main Heisei Retro Frame Box */}
      <div className="relative z-10 max-w-2xl w-full bg-slate-900 border-4 border-amber-500 rounded-3xl shadow-2xl p-4 sm:p-6 text-white text-center flex flex-col items-center">
        {/* Top Badges */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold font-['Press_Start_2P']">
            HEISEI 1998
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">
            故事導入與操作指引
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-yellow-300 text-[10px] font-['Press_Start_2P']">
            HI: {highScore.toString().padStart(6, '0')}
          </span>
        </div>

        {/* Title */}
        <div className="relative my-1">
          <div className="text-2xl sm:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-amber-200 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            平成喵星人大逃亡
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-400 tracking-widest mt-0.5">
            ～ 別 碰 我！～
          </div>
        </div>

        {!showStageSelect ? (
          <>
            {/* 1. 故事背景 (Story) - 平成復古可愛邊框 UI */}
            <div className="w-full bg-gradient-to-r from-amber-950/70 via-slate-800/80 to-amber-950/70 border-2 border-amber-400/70 rounded-2xl p-3 sm:p-3.5 my-2.5 text-left shadow-lg relative">
              <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-amber-500 text-slate-950 text-xs font-black rounded-full flex items-center gap-1 shadow">
                <span>📖</span>
                <span>【故事背景】</span>
              </div>

              <div className="flex items-start gap-3 mt-1.5">
                {/* Cat Avatar in dialogue */}
                <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-500 border-2 border-white flex items-center justify-center text-2xl shadow-inner mt-0.5">
                  😾
                </div>

                <div className="text-xs sm:text-[13px] text-amber-100 leading-relaxed space-y-1">
                  <p className="font-bold text-yellow-300">
                    我是一隻「超——級討厭被人類碰觸」的貓咪！
                  </p>
                  <p className="text-slate-200">
                    但這裡偏偏是每天都有無數人類伸出魔爪的寵物店……
                    <br />
                    不管是「摸摸」、「抱抱」還是「洗澡淋浴」，我都<span className="text-rose-400 font-extrabold underline decoration-rose-400">絕對不要——！</span>
                  </p>
                  <p className="text-amber-200/90 pt-0.5">
                    趁著店員和顧客不注意，推落店裡的商品擊退他們！
                    <br />
                    借用玩家（你）的力量，一起從這間寵物店逃脫出去吧！
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 操作說明 (Tutorial) & 遊戲規則 */}
            <div className="w-full bg-slate-800/85 border-2 border-slate-700 rounded-2xl p-3 sm:p-3.5 mb-3 text-left shadow-md">
              <div className="text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5 border-b border-slate-700 pb-1">
                <span>🎮</span>
                <span>【操作說明 & 遊戲規則】</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 移動 / 跳躍 */}
                <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
                  <div className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0">
                    <Move size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-amber-300">移動 / 跳躍</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      【 方向鍵 】 或 【 W / A / S / D 】跳上貨架與障礙避開魔爪。
                    </p>
                  </div>
                </div>

                {/* 推落機制 / 觸發陷阱 */}
                <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
                  <div className="p-1 rounded bg-yellow-500/20 text-yellow-400 shrink-0">
                    <Zap size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-yellow-300">推落機制 / 觸發陷阱</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      【 空白鍵 (SPACE) 】靠近貨架商品時按下，推落砸暈或滑倒人類！
                    </p>
                  </div>
                </div>

                {/* 遊戲規則 (警戒壓力條) */}
                <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
                  <div className="p-1 rounded bg-rose-500/20 text-rose-400 shrink-0">
                    <HeartCrack size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-rose-400">遊戲規則（壓力條）</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      被人類碰觸或進入視線時壓力值會上升！達 100% 就會被抓到強制洗澡 Game Over！
                    </p>
                  </div>
                </div>

                {/* 恢復道具 (降壓機制 & 20s刷新) */}
                <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-400">恢復道具 (降低壓力 30%~50%)</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      吃下【高級木天蓼 / 貓肉泥 / 貓罐頭】可立即降壓！被吃掉後約 20 秒會重新刷新！
                    </p>
                  </div>
                </div>

                {/* 最終目標 */}
                <div className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80 sm:col-span-2">
                  <div className="p-1 rounded bg-cyan-500/20 text-cyan-400 shrink-0">
                    <DoorOpen size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-cyan-300">最終目標</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      躲避人類（或用商品砸倒他們），達成該關目標，順利抵達脫逃出口！
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 大大的「開始遊戲！」按鈕 */}
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => handleStart(0)}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-lg sm:text-xl shadow-xl shadow-amber-500/40 flex items-center justify-center gap-2.5 transform active:scale-95 transition-all animate-pulse"
              >
                <Play fill="currentColor" size={24} />
                <span>開始遊戲！ (START GAME)</span>
                <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded-full font-bold ml-1 hidden sm:inline-block">
                  [ 空白鍵 SPACE ]
                </span>
              </button>

              {/* 關卡選擇輔助按鈕 */}
              <button
                onClick={() => setShowStageSelect(true)}
                className="py-1.5 px-4 rounded-xl text-slate-400 hover:text-amber-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <ListOrdered size={14} />
                <span>想要挑選特定關卡？點此切換「4 大關卡選擇」➔</span>
              </button>
            </div>
          </>
        ) : (
          /* 關卡選擇視窗 */
          <div className="w-full flex flex-col gap-2.5 my-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 pb-1 border-b border-slate-700">
              <span>全 4 關卡清單</span>
              <button
                onClick={() => setShowStageSelect(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
              >
                ◀ 返回故事說明
              </button>
            </div>

            <div className="flex flex-col gap-2 text-left max-h-60 overflow-y-auto pr-1">
              {LEVELS.map((level, idx) => (
                <div
                  key={level.id}
                  onClick={() => handleStart(idx)}
                  className="p-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-400 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-['Press_Start_2P']">
                        STAGE {level.stageNumber}
                      </span>
                      <span className="font-bold text-amber-200 group-hover:text-yellow-200 text-sm">
                        {level.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 line-clamp-1">{level.subtitle}</div>
                  </div>
                  <button className="px-3 py-1 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shrink-0 ml-2">
                    開始 ➔
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleStart(0)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-base shadow-lg transition-transform active:scale-95 mt-1"
            >
              從第 1 關開始遊戲！
            </button>
          </div>
        )}

        {/* Footer Credit */}
        <div className="mt-3 text-[11px] text-slate-400">
          《平成喵星人大逃亡 ～別碰我！～》 • 復古動作脫逃遊戲
        </div>
      </div>
    </div>
  );
};
