
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

// --------------------------------------------------
// ASSETS
// --------------------------------------------------

const PUBLIC = process.env.PUBLIC_URL || "";

const ASSETS = {
  background: `${PUBLIC}/assets/rain_background.png`,
  umbrella: `${PUBLIC}/assets/umbrella.png`,
  robot: `${PUBLIC}/assets/Robot Sprite 3.png`,
  cat: `${PUBLIC}/assets/cat.png`,
  elder: `${PUBLIC}/assets/elder.png`,
};

// --------------------------------------------------
// GAME SETTINGS
// --------------------------------------------------

const WIDTH = 900;
const HEIGHT = 540;
const DURATION = 20;
const DROPS_FOR_100 = 150;
const RAIN_PER_SECOND = 80;

const CHARACTERS = [
  {
    id: "robot",
    x: 190,
    y: 350,
    width: 118,
    height: 160,
  },
  {
    id: "cat",
    x: 450,
    y: 390,
    width: 105,
    height: 90,
  },
  {
    id: "elder",
    x: 705,
    y: 310,
    width: 112,
    height: 170,
  },
];

function initialProgress() {
  return {
    elapsed: 0,
    blocked: 0,
    shelter: {
      robot: 0,
      cat: 0,
      elder: 0,
    },
  };
}

function initialCursor() {
  return {
    x: WIDTH / 2,
    y: 250,
    visible: false,
  };
}

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

// --------------------------------------------------
// SCORING
// --------------------------------------------------

function buildResult(progress) {
  const protectedSeconds = {};

  for (const character of CHARACTERS) {
    protectedSeconds[character.id] =
      Math.round(
        progress.shelter[character.id] * 10
      ) / 10;
  }

  const mostProtected = CHARACTERS.reduce(
    (best, character) =>
      progress.shelter[character.id] >
      progress.shelter[best.id]
        ? character
        : best,
    CHARACTERS[0]
  );

  const score = Math.min(
    100,
    Math.round(
      (progress.blocked / DROPS_FOR_100) * 100
    )
  );

  return {
    testId: "umbrella-dilemma",
    score,
    scores: {
      rainProtection: score,
    },
    blockedDrops: progress.blocked,
    protectedSeconds,
    mostProtected:
      progress.shelter[mostProtected.id] > 0
        ? mostProtected.id
        : null,
    duration: Math.round(progress.elapsed * 10) / 10,
    completed: true,
    passed: true,
  };
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function UmbrellaDilemma({
  onScoresChange,
  onComplete,
}) {
  const canvasRef = useRef(null);

  const [cursor, setCursor] = useState(initialCursor);
  const [hud, setHud] = useState({
    ...initialProgress(),
    started: false,
    finished: false,
  });

  const umbrellaRef = useRef(initialCursor());
  const progressRef = useRef(initialProgress());
  const dropsRef = useRef([]);
  const splashesRef = useRef([]);

  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  const scoresCallbackRef = useRef(onScoresChange);
  const completeCallbackRef = useRef(onComplete);

  useEffect(() => {
    scoresCallbackRef.current = onScoresChange;
    completeCallbackRef.current = onComplete;
  }, [onScoresChange, onComplete]);

  // ------------------------------------------------
  // FINISH THE TEST
  // ------------------------------------------------

  const finishRound = useCallback(() => {
    if (
      finishedRef.current ||
      !startedRef.current
    ) {
      return;
    }

    finishedRef.current = true;

    const progress = progressRef.current;
    const result = buildResult(progress);

    setHud({
      elapsed: progress.elapsed,
      blocked: progress.blocked,
      shelter: { ...progress.shelter },
      started: true,
      finished: true,
    });

    scoresCallbackRef.current?.(result);
    completeCallbackRef.current?.(result);
  }, []);

  // ------------------------------------------------
  // RESTART
  // ------------------------------------------------

  function resetRound() {
    startedRef.current = false;
    finishedRef.current = false;

    progressRef.current = initialProgress();
    dropsRef.current = [];
    splashesRef.current = [];

    umbrellaRef.current = initialCursor();
    setCursor(initialCursor());

    setHud({
      ...initialProgress(),
      started: false,
      finished: false,
    });

    scoresCallbackRef.current?.({
      testId: "umbrella-dilemma",
      score: 0,
      scores: {},
      blockedDrops: 0,
      protectedSeconds: {
        robot: 0,
        cat: 0,
        elder: 0,
      },
      mostProtected: null,
      duration: 0,
      completed: false,
      passed: false,
    });
  }

  // ------------------------------------------------
  // UMBRELLA POSITION
  // ------------------------------------------------

  function moveUmbrella(event) {
    if (finishedRef.current) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) *
      WIDTH;

    const y =
      ((event.clientY - rect.top) / rect.height) *
      HEIGHT;

    const next = {
      x: clamp(x, 90, WIDTH - 90),
      y: clamp(y, 65, HEIGHT - 80),
      visible: true,
    };

    umbrellaRef.current = next;
    setCursor(next);

    // Timer starts when player first interacts
    if (!startedRef.current) {
      startedRef.current = true;

      setHud((previous) => ({
        ...previous,
        started: true,
      }));
    }
  }

  function hideUmbrella() {
    const next = {
      ...umbrellaRef.current,
      visible: false,
    };

    umbrellaRef.current = next;
    setCursor(next);
  }

  function handlePointerDown(event) {
    if (finishedRef.current) return;

    event.preventDefault();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    moveUmbrella(event);
  }

  function handlePointerUp(event) {
    if (
      event.currentTarget.hasPointerCapture?.(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  // ------------------------------------------------
  // RAIN ANIMATION
  // ------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId;
    let previousTime = 0;
    let spawnAccumulator = 0;
    let hudAccumulator = 0;

    function frame(timestamp) {
      const dt = previousTime
        ? Math.min((timestamp - previousTime) / 1000, 0.05)
        : 0;

      previousTime = timestamp;

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const umbrella = umbrellaRef.current;
      const active =
        startedRef.current &&
        !finishedRef.current;

      // --------------------------------------------
      // SPAWN RAINDROPS
      // --------------------------------------------

      spawnAccumulator += dt * RAIN_PER_SECOND;

      while (spawnAccumulator >= 1) {
        spawnAccumulator--;

        dropsRef.current.push({
          x: Math.random() * WIDTH,
          y: -15,
          speed: 240 + Math.random() * 130,
          drift: 10 + Math.random() * 20,
          length: 8 + Math.random() * 6,
        });
      }

      // --------------------------------------------
      // MOVE RAINDROPS
      // --------------------------------------------

      const remainingDrops = [];

      for (const drop of dropsRef.current) {
        const oldY = drop.y;

        drop.y += drop.speed * dt;
        drop.x += drop.drift * dt;

        let blocked = false;

        // Umbrella collision: curved canopy
        if (
          umbrella.visible &&
          !finishedRef.current
        ) {
          const dx = drop.x - umbrella.x;
          const distance = Math.abs(dx);

          if (distance < 82) {
            const curve =
              Math.pow(distance / 82, 2) * 38;

            const canopyY =
              umbrella.y - 43 + curve;

            // Drop crosses the canopy
            if (
              oldY <= canopyY &&
              drop.y >= canopyY &&
              canopyY > 0 &&
              canopyY < 480
            ) {
              blocked = true;

              if (active) {
                progressRef.current.blocked++;
              }

              // Tiny pixel splash
              splashesRef.current.push({
                x: drop.x,
                y: canopyY,
                life: 0.22,
              });
            }
          }
        }

        if (blocked) continue;

        // Remove drops reaching ground
        if (drop.y > HEIGHT - 42) continue;

        remainingDrops.push(drop);

        // Pixel-art raindrop
        ctx.fillStyle = "#78bcd7";

        ctx.fillRect(
          Math.round(drop.x),
          Math.round(drop.y),
          3,
          Math.round(drop.length)
        );

        // Lighter highlight
        ctx.fillStyle = "#c4f4ff";

        ctx.fillRect(
          Math.round(drop.x),
          Math.round(drop.y),
          1,
          4
        );
      }

      dropsRef.current = remainingDrops;

      // --------------------------------------------
      // DRAW SPLASHES
      // --------------------------------------------

      const remainingSplashes = [];

      for (const splash of splashesRef.current) {
        splash.life -= dt;

        if (splash.life <= 0) continue;

        remainingSplashes.push(splash);

        const spread =
          (0.22 - splash.life) * 60;

        ctx.fillStyle = "#b7f6ff";

        ctx.fillRect(
          Math.round(splash.x - spread),
          Math.round(splash.y - 3),
          4,
          3
        );

        ctx.fillRect(
          Math.round(splash.x + spread),
          Math.round(splash.y - 5),
          4,
          3
        );
      }

      splashesRef.current = remainingSplashes;

      // --------------------------------------------
      // TRACK PROTECTION
      // --------------------------------------------

      if (active) {
        const progress = progressRef.current;

        progress.elapsed = Math.min(
          DURATION,
          progress.elapsed + dt
        );

        for (const character of CHARACTERS) {
          // Umbrella must be above the character
          const horizontallyAligned =
            Math.abs(
              umbrella.x - character.x
            ) < 88;

          const verticallyAligned =
            umbrella.y < character.y + 15 &&
            umbrella.y > character.y - 110;

          if (
            umbrella.visible &&
            horizontallyAligned &&
            verticallyAligned
          ) {
            progress.shelter[character.id] += dt;
          }
        }

        if (progress.elapsed >= DURATION) {
          finishRound();
        }
      }

      // --------------------------------------------
      // UPDATE REACT HUD
      // --------------------------------------------

      hudAccumulator += dt;

      if (
        hudAccumulator >= 0.1 &&
        active
      ) {
        hudAccumulator = 0;

        const progress = progressRef.current;

        setHud({
          elapsed: progress.elapsed,
          blocked: progress.blocked,
          shelter: { ...progress.shelter },
          started: true,
          finished: finishedRef.current,
        });
      }

      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [finishRound]);

  // ------------------------------------------------
  // LIVE UI VALUES
  // ------------------------------------------------

  const timePercentage =
    (hud.elapsed / DURATION) * 100;

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <div className="umbrella-game">
      <style>{`
        /* Fill the entire browser viewport instead of a 750px card. */
        .umbrella-game {
          position: fixed;
          inset: 0;
          z-index: 1000;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          max-width: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
          overflow: hidden;
          overscroll-behavior: none;
          background: #142c2a;
          color: #9dfaff;
          font-family: sans-serif;
          user-select: none;
        }

        .umbrella-game * {
          box-sizing: border-box;
        }

        /* CHARACTER PROTECTION METERS */

        .umbrella-characters {
          display: flex;
          flex: 0 0 auto;
          justify-content: center;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: max(8px, env(safe-area-inset-top)) 12px 8px;
          background: #142c2a;
        }

        .umbrella-character-card {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 6px 12px;
          border: 1px solid #50766d;
          background: #142c2a;
          border-radius: 12px;
          min-width: 115px;
        }

        .umbrella-character-card img {
          width: 32px;
          height: 38px;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .umbrella-character-meter {
          width: clamp(38px, 9vw, 165px);
          height: 8px;
          border-radius: 2px;
          background: #314640;
          overflow: hidden;
        }

        .umbrella-character-fill {
          height: 100%;
          background: #9ef9db;
          box-shadow: 0 0 8px #9ef9db;
          transition: width 0.1s linear;
        }

        /* GAME SCENE */

        .umbrella-stage {
          position: relative;
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          height: auto;
          aspect-ratio: auto;
          overflow: hidden;
          background: linear-gradient(
            #263e49 0%,
            #49665d 65%,
            #3c5144 100%
          );
          border: 0;
          border-radius: 0;
          cursor: auto;
          touch-action: none;
        }

        .umbrella-background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
          pointer-events: none;
          z-index: 0;
        }

        .umbrella-ground {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 10%;
          background: rgba(13, 29, 29, 0.18);
          pointer-events: none;
          z-index: 1;
        }

        .umbrella-character {
          position: absolute;
          z-index: 2;
          object-fit: contain;
          image-rendering: pixelated;
          pointer-events: none;
          -webkit-user-drag: none;
        }

        .umbrella-rain {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 3;
          image-rendering: pixelated;
          pointer-events: none;
        }

        .umbrella-cursor {
          position: absolute;
          width: 30%;
          height: auto;
          transform: translate(-50%, -43%);
          object-fit: contain;
          image-rendering: pixelated;
          pointer-events: none;
          -webkit-user-drag: none;
          z-index: 4;
          filter: drop-shadow(
            0 5px 3px rgba(0, 0, 0, 0.22)
          );
        }

        /* CONTROLS */

        .umbrella-bottom {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 8px 12px 4px;
          background: #142c2a;
        }

        .umbrella-button {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border: 1px solid #50766d;
          border-radius: 12px;
          color: #b4e7df;
          background: #142c2a;
          font-size: 25px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .umbrella-button:hover:not(:disabled) {
          background: #244b45;
        }

        .umbrella-button.confirm {
          background: #a2efd8;
          color: #123e37;
        }

        .umbrella-button.confirm:hover:not(:disabled) {
          background: #c8ffeb;
        }

        .umbrella-button:disabled {
          opacity: 0.35;
          cursor: default;
        }

        /* TIME PROGRESS */

        .umbrella-timer {
          width: 100%;
          max-width: 300px;
          height: 12px;
          border: 1px solid #50766d;
          border-radius: 4px;
          background: #142c2a;
          overflow: hidden;
        }

        .umbrella-timer-fill {
          height: 100%;
          background: #83cfc0;
          transition: width 0.1s linear;
        }

        /* COMPLETION */

        .umbrella-finished {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(8, 30, 28, 0.35);
          z-index: 5;
          pointer-events: none;
        }

        .umbrella-finished-symbol {
          display: grid;
          place-items: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid #a2efd8;
          background: #142c2a;
          color: #a2efd8;
          font-size: 45px;
          box-shadow: 0 0 25px rgba(162, 239, 216, 0.4);
        }

        @media (max-width: 500px) {
          .umbrella-character-card {
            min-width: 0;
            padding: 5px;
            gap: 4px;
          }

          .umbrella-character-card img {
            width: 25px;
            height: 30px;
          }

          .umbrella-character-meter {
            width: 38px;
          }

          .umbrella-characters {
            gap: 6px;
          }

          .umbrella-button {
            width: 42px;
            height: 42px;
          }
        }
      `}</style>

      {/* CHARACTER PROTECTION METERS */}

      <div className="umbrella-characters">
        {CHARACTERS.map((character) => {
          const sheltered =
            hud.shelter[character.id] || 0;

          return (
            <div
              className="umbrella-character-card"
              key={character.id}
              aria-label={
                `${character.id}: ` +
                `${sheltered.toFixed(1)} seconds sheltered`
              }
            >
              <img
                src={ASSETS[character.id]}
                alt=""
                draggable={false}
              />

              <div className="umbrella-character-meter">
                <div
                  className="umbrella-character-fill"
                  style={{
                    width: `${
                      Math.min(
                        100,
                        (sheltered / DURATION) * 100
                      )
                    }%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* INTERACTIVE SCENE */}

        <div
          className="umbrella-stage"
          style={{
            cursor: hud.finished ? "auto" : "none",
          }}
          aria-label="Move the umbrella to shelter characters from rain"
          onPointerEnter={moveUmbrella}
          onPointerMove={moveUmbrella}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={hideUmbrella}
        >
        <img
          className="umbrella-background"
          src={ASSETS.background}
          alt=""
          draggable={false}
        />

        <div className="umbrella-ground" />

        {/* CHARACTER SPRITES */}

        {CHARACTERS.map((character) => (
          <img
            key={character.id}
            className="umbrella-character"
            src={ASSETS[character.id]}
            alt={character.id}
            draggable={false}
            style={{
              left: `${
                ((character.x - character.width / 2) /
                  WIDTH) *
                100
              }%`,
              top: `${(character.y / HEIGHT) * 100}%`,
              width: `${
                (character.width / WIDTH) * 100
              }%`,
              height: `${
                (character.height / HEIGHT) * 100
              }%`,
            }}
          />
        ))}

        {/* ANIMATED RAIN */}

        <canvas
          ref={canvasRef}
          className="umbrella-rain"
          width={WIDTH}
          height={HEIGHT}
          aria-hidden="true"
        />

        {/* UMBRELLA FOLLOWING THE CURSOR */}

        {cursor.visible && !hud.finished && (
          <img
            className="umbrella-cursor"
            src={ASSETS.umbrella}
            alt=""
            draggable={false}
            style={{
              left: `${(cursor.x / WIDTH) * 100}%`,
              top: `${(cursor.y / HEIGHT) * 100}%`,
            }}
          />
        )}

        {/* FINISHED STATE */}

        {hud.finished && (
          <div className="umbrella-finished">
            <div className="umbrella-finished-symbol">
              ✓
            </div>
          </div>
        )}
      </div>

      {/* CONTROLS AND TIMER */}

      <div className="umbrella-bottom">
        <button
          type="button"
          className="umbrella-button"
          aria-label="Restart game"
          onClick={resetRound}
        >
          ↺
        </button>

        <div
          className="umbrella-timer"
          role="progressbar"
          aria-label="Time elapsed"
          aria-valuemin={0}
          aria-valuemax={DURATION}
          aria-valuenow={Math.round(hud.elapsed)}
        >
          <div
            className="umbrella-timer-fill"
            style={{
              width: `${timePercentage}%`,
            }}
          />
        </div>

        <button
          type="button"
          className="umbrella-button confirm"
          aria-label="Save score and finish"
          disabled={!hud.started || hud.finished}
          onClick={finishRound}
        >
          ✓
        </button>
      </div>
    </div>
  );
}
