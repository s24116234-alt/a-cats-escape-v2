/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { LEVELS } from './game/levels';
import { GameState } from './game/types';
import { UIOverlay } from './components/UIOverlay';
import { StartMenu } from './components/StartMenu';
import { sound } from './audio/sound';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    timeRemaining: LEVELS[0].timeLimit,
    stress: 0,
    stamina: 100,
    isExhausted: false,
    hasDoorKey: false,
    emergencyButtonPressed: false,
    alarmActive: false,
    perfectBonusEligible: true,
    humanKnockdowns: 0,
    collectedItems: [],
    status: 'menu',
    currentLevelIndex: 0,
  });

  const [canPushTrap, setCanPushTrap] = useState(false);
  const [canPressButton, setCanPressButton] = useState(false);
  const [hissCooldown, setHissCooldown] = useState(0);
  const [exitProgress, setExitProgress] = useState(0);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('heisei_cat_escape_highscore') || '3500', 10);
    } catch {
      return 3500;
    }
  });

  // Initialize or Re-init engine when starting game
  const startGame = (levelIdx: number, keepScore = false) => {
    setCurrentLevelIdx(levelIdx);
    const selectedLevel = LEVELS[levelIdx] || LEVELS[0];

    if (!canvasRef.current) return;

    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const engine = new GameEngine(
      canvasRef.current,
      selectedLevel,
      {
        score: keepScore ? gameState.score : 0,
        timeRemaining: selectedLevel.timeLimit,
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
        currentLevelIndex: levelIdx,
      },
      (updatedState) => {
        setGameState({ ...updatedState });

        if (updatedState.score > highScore) {
          setHighScore(updatedState.score);
          try {
            localStorage.setItem('heisei_cat_escape_highscore', updatedState.score.toString());
          } catch {
            // ignore
          }
        }
      }
    );

    engineRef.current = engine;
    engine.start();
  };

  // Synchronize UI tick for smooth progress bar and trap prompt
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (engineRef.current && (gameState.status === 'playing' || gameState.status === 'paused')) {
        const engine = engineRef.current;
        setCanPushTrap(engine.getNearbyTrap() !== null);
        setCanPressButton(engine.getNearbyButton() !== null);
        setHissCooldown(engine.cat.hissCooldown);

        const currentLvl = LEVELS[currentLevelIdx] || LEVELS[0];
        const progress = Math.min(1, Math.max(0, engine.cat.x / currentLvl.exitX));
        setExitProgress(progress);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [gameState.status, currentLevelIdx]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (!engineRef.current || gameState.status !== 'playing') {
        if (e.code === 'KeyP' || e.code === 'Escape') {
          handlePauseToggle();
        }
        return;
      }

      const eng = engineRef.current;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          eng.keys.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          eng.keys.right = true;
          break;
        case 'ArrowUp':
        case 'KeyW':
          eng.keys.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          eng.keys.down = true;
          break;
        case 'Space':
        case 'Enter':
          eng.triggerInteract();
          break;
        case 'KeyX':
        case 'KeyE':
          eng.triggerHiss();
          break;
        case 'KeyP':
        case 'Escape':
          handlePauseToggle();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const eng = engineRef.current;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          eng.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          eng.keys.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
          eng.keys.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          eng.keys.down = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status]);

  const handlePauseToggle = () => {
    if (!engineRef.current) return;
    if (gameState.status === 'playing') {
      engineRef.current.pause();
    } else if (gameState.status === 'paused') {
      engineRef.current.resume();
    }
  };

  const handleRestart = () => {
    startGame(currentLevelIdx, false);
  };

  const handleReturnToMenu = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    sound.playStageBGM('menu');
    setGameState((prev) => ({
      ...prev,
      status: 'menu',
    }));
  };

  const handleNextLevel = () => {
    const nextIdx = currentLevelIdx + 1;
    if (nextIdx < LEVELS.length) {
      setCurrentLevelIdx(nextIdx);
      startGame(nextIdx, true); // Keep cumulative score across stages!
    } else {
      // Completed all stages! Loop to start or replay
      setCurrentLevelIdx(0);
      startGame(0, false);
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden p-0 sm:p-2 select-none">
      <div className="relative w-full h-full max-w-[1280px] max-h-[720px] aspect-video bg-black rounded-none sm:rounded-2xl border-0 sm:border-4 border-amber-900/60 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col justify-center">
        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover block"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* CRT Scanline Overlay */}
        {crtEnabled && (
          <div className="absolute inset-0 pointer-events-none z-30">
            <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px]" />
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]" />
          </div>
        )}

        {/* UI Overlay during game or victory/gameover modals */}
        {gameState.status !== 'menu' && (
          <UIOverlay
            state={gameState}
            level={LEVELS[currentLevelIdx] || LEVELS[0]}
            exitProgress={exitProgress}
            canPushTrap={canPushTrap}
            canPressButton={canPressButton}
            hissCooldown={hissCooldown}
            crtEnabled={crtEnabled}
            onToggleCrt={() => setCrtEnabled(!crtEnabled)}
            onPauseToggle={handlePauseToggle}
            onRestart={handleRestart}
            onNextLevel={handleNextLevel}
            onStartGame={(idx) => startGame(idx, false)}
            onReturnToMenu={handleReturnToMenu}
            onInteract={() => engineRef.current?.triggerInteract()}
            onHiss={() => engineRef.current?.triggerHiss()}
            onMoveLeft={(active) => {
              if (engineRef.current) engineRef.current.keys.left = active;
            }}
            onMoveRight={(active) => {
              if (engineRef.current) engineRef.current.keys.right = active;
            }}
            onJump={() => {
              if (engineRef.current && engineRef.current.cat.isGrounded) {
                if (!engineRef.current.cat.isExhausted && engineRef.current.cat.stamina >= 12) {
                  engineRef.current.cat.vy = -540;
                  engineRef.current.cat.isGrounded = false;
                  engineRef.current.cat.state = 'jump';
                  engineRef.current.cat.stamina = Math.max(0, engineRef.current.cat.stamina - 14);
                  sound.playJump();
                }
              }
            }}
          />
        )}

        {/* Start Menu when in menu status */}
        {gameState.status === 'menu' && (
          <div className="absolute inset-0 z-40">
            <StartMenu
              onStartGame={(idx) => startGame(idx, false)}
              highScore={highScore}
            />
          </div>
        )}
      </div>
    </div>
  );
}
