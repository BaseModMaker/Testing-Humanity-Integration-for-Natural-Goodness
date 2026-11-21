
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { GameHeader, GameFooter } from "./GameBars";

// --------------------------------------------------
// ASSETS
// --------------------------------------------------

const PUBLIC = process.env.PUBLIC_URL || "";

const ASSETS = {
  background: `${PUBLIC}/assets/rain_background.png`,
  umbrella: `${PUBLIC}/assets/umbrella.png`,
  shadow: `${PUBLIC}/assets/shadow.png`,
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
    shadow: {
      width: "100%",
      bottom: "-12px",
      left: "50%",
      opacity: 0.8,
    },
  },
  {
    id: "cat",
    x: 450,
    y: 390,
    width: 105,
    height: 90,
    shadow: {
      width: "100%",
      bottom: "-12px",
      left: "50%",
      opacity: 0.8,
    },
  },
  {
    id: "elder",
    x: 705,
    y: 310,
    width: 112,
    height: 170,
    shadow: {
      width: "100%",
      bottom: "-12px",
      left: "50%",
      opacity: 0.8,
    },
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
  // THEMED UI - based on the THING solarpunk mockup
  // ------------------------------------------------

  const careScore = Math.min(
    100,
    Math.round((hud.blocked / DROPS_FOR_100) * 100)
  );
  const timeLeft = Math.max(0, Math.ceil(DURATION - hud.elapsed));

  return (
    <div className="umbrella-game">
      <style>{`
        .umbrella-game {
          --thing-cream: rgb(248, 236, 221);
          --thing-ink: #43483a;
          --thing-olive: #788d66;
          --thing-olive-dark: #556e4b;
          --thing-sage: #9ab772;
          --thing-line: #777b68;
          --thing-track: #dfddd0;
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          box-sizing: border-box;
          overflow: hidden;
          border: 1px solid var(--thing-ink);
          border-radius: 14px;
          background: var(--thing-cream);
          color: var(--thing-ink);
          font-family: "Trebuchet MS", Verdana, sans-serif;
          user-select: none;
          overscroll-behavior: none;
        }

        .umbrella-game * { box-sizing: border-box; }

        /* HEADER: test label, title, and customizable character HUD */
        .umbrella-header-content {
          width: 100%;
          max-width: 1460px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .umbrella-heading {
          display: flex;
          align-items: center;
          gap: 19px;
          min-width: 0;
          flex: 0 1 auto;
        }

        .umbrella-test-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--thing-olive);
          color: #fffaf0;
          border-radius: 8px;
          min-height: 36px;
          padding: 7px 16px;
          font-size: 15px;
          letter-spacing: 0.04em;
          font-weight: 700;
          white-space: nowrap;
        }

        .umbrella-heading-divider {
          height: 34px;
          width: 1px;
          background: #9b9e8c;
          flex-shrink: 0;
        }

        .umbrella-title {
          font-size: clamp(18px, 2.05vw, 26px);
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: -0.02em;
          margin: 0;
          white-space: nowrap;
        }

        .umbrella-title-symbol {
          font-size: 29px;
          line-height: 1;
          margin-right: 11px;
          vertical-align: -3px;
          font-family: system-ui, sans-serif;
        }

        .umbrella-characters {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 0 1 auto;
          min-width: 0;
        }

        .umbrella-character-card {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 90px;
          padding: 5px 9px;
          border: 1px solid #c8c9b5;
          border-radius: 9px;
          background: rgba(255,255,255,.30);
        }

        .umbrella-character-card img {
          display: block;
          width: 30px;
          height: 35px;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .umbrella-character-meter {
          width: clamp(34px, 5vw, 65px);
          height: 8px;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid #c5c8b5;
          background: var(--thing-track);
        }

        .umbrella-character-fill {
          height: 100%;
          background: var(--thing-sage);
          transition: width .12s linear;
        }

        /* SCENE: preserve the pixel artwork and the original game */
        .umbrella-stage {
          position: relative;
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          overflow: hidden;
          background: #92b9bd;
          touch-action: none;
        }

        .umbrella-background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
          z-index: 0;
          pointer-events: none;
        }

        .umbrella-ground {
          position: absolute;
          inset: auto 0 0;
          height: 16%;
          background: linear-gradient(transparent, rgba(35,60,52,.13));
          z-index: 1;
          pointer-events: none;
        }

        .umbrella-character-wrapper {
          position: absolute;
          z-index: 2;
          pointer-events: none;
        }

        .umbrella-character-shadow {
          position: absolute;
          transform: translateX(-50%);
          height: auto;
          z-index: 0;
          pointer-events: none;
          -webkit-user-drag: none;
        }

        .umbrella-character {
          position: relative;
          z-index: 1;
          display: block;
          width: 100%;
          height: 100%;
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
          filter: drop-shadow(0 5px 3px rgba(0,0,0,.12));
        }

        /* FOOTER: mockup-inspired Care Score */
        .umbrella-footer-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .umbrella-care-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-width: 0;
          flex: 1;
        }

        .umbrella-care-label {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-size: 16px;
          font-weight: 700;
          white-space: nowrap;
        }

        .umbrella-care-leaf {
          font-size: 25px;
          line-height: 1;
        }

        .umbrella-care-meter {
          width: min(36vw, 340px);
          min-width: 100px;
          height: 17px;
          border: 1px solid #c7c6b8;
          border-radius: 20px;
          background: var(--thing-track);
          overflow: hidden;
        }

        .umbrella-care-fill {
          height: 100%;
          border-radius: 20px;
          background: repeating-linear-gradient(
            to right,
            var(--thing-sage) 0 13px,
            #e0ead1 13px 15px
          );
          transition: width .14s ease-out;
        }

        .umbrella-care-number {
          min-width: 66px;
          font-size: 17px;
          font-weight: 700;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .umbrella-care-total { color: #6e705f; font-weight: 400; }

        .umbrella-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }

        .umbrella-control {
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #a6aa94;
          border-radius: 8px;
          padding: 0 14px;
          background: rgba(255,255,255,.38);
          color: var(--thing-ink);
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color .15s ease;
        }

        .umbrella-control:hover:not(:disabled) { background: #e9e7d4; }
        .umbrella-control:focus-visible { outline: 3px solid #8ca77d; outline-offset: 2px; }
        .umbrella-control:disabled { opacity: .42; cursor: default; }
        .umbrella-control.primary {
          color: #fffdf1;
          background: var(--thing-olive-dark);
          border-color: var(--thing-olive-dark);
        }
        .umbrella-control.primary:hover:not(:disabled) { background: #405b39; }
        .umbrella-time {
          font-size: 13px;
          color: #747866;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .umbrella-finished {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(248,236,221,.28);
          z-index: 5;
          pointer-events: none;
        }
        .umbrella-finished-symbol {
          display: grid;
          place-items: center;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 3px solid #6c8851;
          background: var(--thing-cream);
          color: #6c8851;
          font-size: 54px;
          box-shadow: 0 5px 24px rgba(26,44,29,.2);
        }

        @media (max-width: 1000px) {
          .umbrella-header-content { gap: 12px; }
          .umbrella-characters { gap: 5px; }
          .umbrella-character-card { min-width: 0; padding: 4px 5px; }
          .umbrella-character-card img { width: 24px; height: 30px; }
          .umbrella-character-meter { width: 33px; }
          .umbrella-heading { gap: 12px; }
        }

        @media (max-width: 720px) {
          .umbrella-game { border-radius: 0; }
          .umbrella-header-content { flex-direction: column; gap: 11px; }
          .umbrella-heading { justify-content: center; }
          .umbrella-title { font-size: 19px; }
          .umbrella-test-badge { min-height: 31px; font-size: 12px; padding: 5px 10px; }
          .umbrella-heading-divider { height: 26px; }
          .umbrella-title-symbol { font-size: 21px; margin-right: 5px; }
          .umbrella-characters { justify-content: center; width: 100%; }
          .umbrella-character-card { flex: 1; max-width: 105px; justify-content: center; }
          .umbrella-character-meter { width: 38px; }
          .umbrella-footer-content { flex-wrap: wrap; gap: 10px; }
          .umbrella-care-content { order: 0; flex: 1 1 100%; gap: 9px; }
          .umbrella-care-meter { width: min(42vw, 220px); min-width: 70px; }
          .umbrella-care-label { font-size: 13px; }
          .umbrella-care-leaf { font-size: 19px; }
          .umbrella-care-number { min-width: 55px; font-size: 14px; }
          .umbrella-actions { order: 1; margin: 0 auto; }
          .umbrella-time { order: 2; margin-left: auto; }
          .umbrella-control { height: 35px; font-size: 12px; }
        }
        @media (max-width: 370px) {
          .umbrella-title { font-size: 15px; }
          .umbrella-title-symbol { display: none; }
          .umbrella-heading { gap: 8px; }
        }
      `}</style>

      <GameHeader>
        <div className="umbrella-header-content">
          <div className="umbrella-heading">
            <span className="umbrella-test-badge">Test 2 / 2</span>
            <span className="umbrella-heading-divider" aria-hidden="true" />
            <h1 className="umbrella-title">
              <span className="umbrella-title-symbol" aria-hidden="true">☂</span>
              The Umbrella Dilemma
            </h1>
          </div>

          {/* Per-game header content: characters being protected */}
          <div className="umbrella-characters" aria-label="Character protection progress">
            {CHARACTERS.map((character) => {
              const sheltered = hud.shelter[character.id] || 0;
              const percent = Math.min(100, (sheltered / DURATION) * 100);
              return (
                <div
                  className="umbrella-character-card"
                  key={character.id}
                  title={`${character.id}: ${sheltered.toFixed(1)} seconds sheltered`}
                >
                  <img src={ASSETS[character.id]} alt={character.id} draggable={false} />
                  <div
                    className="umbrella-character-meter"
                    role="progressbar"
                    aria-label={`${character.id} shelter time`}
                    aria-valuenow={Math.round(percent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="umbrella-character-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GameHeader>

      {/* Original interactive canvas/character mechanics are unchanged. */}
      <div
        className="umbrella-stage"
        style={{ cursor: hud.finished ? "auto" : "none" }}
        aria-label="Move the umbrella to shelter characters from rain"
        onPointerEnter={moveUmbrella}
        onPointerMove={moveUmbrella}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={hideUmbrella}
      >
        <img className="umbrella-background" src={ASSETS.background} alt="" draggable={false} />
        <div className="umbrella-ground" />

        {CHARACTERS.map((character) => (
          <div
            key={character.id}
            className="umbrella-character-wrapper"
            style={{
              left: `${((character.x - character.width / 2) / WIDTH) * 100}%`,
              top: `${(character.y / HEIGHT) * 100}%`,
              width: `${(character.width / WIDTH) * 100}%`,
              height: `${(character.height / HEIGHT) * 100}%`,
            }}
          >
            <img
              className="umbrella-character-shadow"
              src={ASSETS.shadow}
              alt=""
              draggable={false}
              style={{
                width: character.shadow.width,
                bottom: character.shadow.bottom,
                left: character.shadow.left,
                opacity: character.shadow.opacity,
              }}
            />
            <img
              className="umbrella-character"
              src={ASSETS[character.id]}
              alt={character.id}
              draggable={false}
            />
          </div>
        ))}

        <canvas
          ref={canvasRef}
          className="umbrella-rain"
          width={WIDTH}
          height={HEIGHT}
          aria-hidden="true"
        />

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

        {hud.finished && (
          <div className="umbrella-finished">
            <div className="umbrella-finished-symbol" aria-label="Test complete">✓</div>
          </div>
        )}
      </div>

      <GameFooter>
        <div className="umbrella-footer-content">
          <div className="umbrella-time" aria-label={`${timeLeft} seconds remaining`}>
            {timeLeft}s left
          </div>

          {/* Per-game footer content: Care Score */}
          <div className="umbrella-care-content">
            <span className="umbrella-care-label">
              <span className="umbrella-care-leaf" aria-hidden="true">🌱</span>
              Care Score
            </span>
            <div
              className="umbrella-care-meter"
              role="progressbar"
              aria-label="Care score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={careScore}
            >
              <div className="umbrella-care-fill" style={{ width: `${careScore}%` }} />
            </div>
            <span className="umbrella-care-number">
              {careScore} <span className="umbrella-care-total">/ 100</span>
            </span>
          </div>

          <div className="umbrella-actions">
            <button className="umbrella-control" type="button" onClick={resetRound}>
              Restart
            </button>
            <button
              className="umbrella-control primary"
              type="button"
              disabled={!hud.started || hud.finished}
              onClick={finishRound}
            >
              Finish ✓
            </button>
          </div>
        </div>
      </GameFooter>
    </div>
  );
}
