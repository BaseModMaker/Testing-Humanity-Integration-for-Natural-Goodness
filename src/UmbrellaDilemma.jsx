
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { GameHeader } from "./GameBars";

// --------------------------------------------------
// ASSETS
// --------------------------------------------------

const PUBLIC = process.env.PUBLIC_URL || "";

const ASSETS = {
  background: `${PUBLIC}/assets/rain_background.png`,
  // Preferred filenames from the updated art assets.
  transition: `${PUBLIC}/assets/rain_transition.png`,
  sunny: `${PUBLIC}/assets/sunny_background.png`,
  // Older file naming is supported as a fallback.
  transitionLegacy: `${PUBLIC}/assets/rain-transition.png`,
  sunnyLegacy: `${PUBLIC}/assets/sunny-background.png`,
  umbrella: `${PUBLIC}/assets/umbrella.png`,
  robot_shadow : `${PUBLIC}/assets/Robot Sprite 3 shadow.png`,
  cat_shadow: `${PUBLIC}/assets/cat shadow.png`,
  elder_shadow: `${PUBLIC}/assets/elder shadow.png`,
};

// --------------------------------------------------
// GAME SETTINGS
// --------------------------------------------------

const WIDTH = 900;
const HEIGHT = 540;
const DURATION = 12;
const SHELTER_MILESTONES = [2, 5, 8, 11];
const RAIN_PER_SECOND = 80;
// Short visual thunder intro before raindrops begin.
const THUNDER_INTRO_MS = 1550;
// First crossfade the rain into the cloudy transitional scene,
// then fade in sunshine. Show the Continue dialog only afterward.
const WEATHER_TRANSITION_MS = 750;
const WEATHER_SUNRISE_MS = 750;
const RESULTS_DELAY_MS = 200;

const CHARACTERS = [
  {
    id: "robot_shadow",
    payoffs: [[20, 0, 0], [40, 0, 0], [60, 0, 0], [80, 0, 0]],
    x: 190,
    y: 350,
    width: 118,
    height: 160,
  },
  {
    id: "cat_shadow",
    payoffs: [[15, 10, 20], [30, 20, 40], [40, 30, 60], [50, 40, 80]],
    x: 450,
    y: 390,
    width: 105,
    height: 90,
  },
  {
    id: "elder_shadow",
    payoffs: [[18, 6, 0], [35, 12, 0], [50, 18, 0], [65, 25, 0]],
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
      robot_shadow: 0,
      cat_shadow: 0,
      elder_shadow: 0,
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

function getShelterMilestoneCount(seconds) {
  return SHELTER_MILESTONES.filter((threshold) => seconds + 1e-9 >= threshold).length;
}

function getUmbrellaScores(shelter) {
  const scores = { rainProtection: 0, empathy: 0, ecology: 0 };
  for (const character of CHARACTERS) {
    const milestones = getShelterMilestoneCount(shelter[character.id]);
    const [preservation, empathy, ecology] = character.payoffs[milestones - 1] ?? [0, 0, 0];
    scores.rainProtection += preservation;
    scores.empathy += empathy;
    scores.ecology += ecology;
  }
  return scores;
}

export function buildUmbrellaResult(progress) {
  const protectedSeconds = {};
  for (const character of CHARACTERS) {
    const seconds = progress.shelter[character.id];
    protectedSeconds[character.id] = Math.round(seconds * 10) / 10;
  }

  const mostProtected = CHARACTERS.reduce(
    (best, character) =>
      progress.shelter[character.id] >
      progress.shelter[best.id]
        ? character
        : best,
    CHARACTERS[0]
  );

  const scores = getUmbrellaScores(progress.shelter);

  return {
    testId: "umbrella-dilemma",
    score: scores.rainProtection,
    scores,
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
  const [stormReady, setStormReady] = useState(false);
  const [weatherPhase, setWeatherPhase] = useState("rain");
  const [showResults, setShowResults] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const continueButtonRef = useRef(null);
  const continuedRef = useRef(false);
  // The animation loop reads the ref so it does not restart when the intro ends.
  const stormReadyRef = useRef(false);
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
  // THUNDER INTRO: flash first, then start the rain.
  // This does not consume any of the player's 12-second round.
  // ------------------------------------------------

  useEffect(() => {
    const timeout = setTimeout(() => {
      stormReadyRef.current = true;
      setStormReady(true);
    }, THUNDER_INTRO_MS);

    return () => clearTimeout(timeout);
  }, []);

  // ------------------------------------------------
  // WEATHER AND RESULTS SEQUENCE
  // ------------------------------------------------
  // The stage stays mounted throughout the crossfades so the characters,
  // background and rain do not jump while we switch artwork.
  useEffect(() => {
    if (!hud.finished) return;

    const toSunny = setTimeout(() => {
      setWeatherPhase("sunny");
    }, WEATHER_TRANSITION_MS);

    const toResults = setTimeout(() => {
      setShowResults(true);
    }, WEATHER_TRANSITION_MS + WEATHER_SUNRISE_MS + RESULTS_DELAY_MS);

    return () => {
      clearTimeout(toSunny);
      clearTimeout(toResults);
    };
  }, [hud.finished]);

  useEffect(() => {
    if (showResults) continueButtonRef.current?.focus();
  }, [showResults]);

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
    umbrellaRef.current = { ...umbrellaRef.current, visible: false };
    setCursor((previous) => ({ ...previous, visible: false }));
    setWeatherPhase("transition");

    const progress = progressRef.current;
    const result = buildUmbrellaResult(progress);
    setFinalResult(result);

    setHud({
      elapsed: progress.elapsed,
      blocked: progress.blocked,
      shelter: { ...progress.shelter },
      started: true,
      finished: true,
    });

    // Save the final score immediately; navigation waits for Continue.
    scoresCallbackRef.current?.(result);
  }, []);

  function handleContinue() {
    if (!showResults || !finalResult || continuedRef.current) return;
    continuedRef.current = true;
    // The parent App chooses which minigame comes next.
    completeCallbackRef.current?.(finalResult);
  }

  // ------------------------------------------------
  // UMBRELLA POSITION
  // ------------------------------------------------

  function moveUmbrella(event) {
    if (!stormReadyRef.current || finishedRef.current) return;

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
    if (!stormReadyRef.current || finishedRef.current) return;

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

      // Keep the final rain frame on canvas during its fade-out.
      if (finishedRef.current) return;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const umbrella = umbrellaRef.current;
      const active =
        startedRef.current &&
        !finishedRef.current;

      // --------------------------------------------
      // SPAWN RAINDROPS
      // --------------------------------------------

      // Don't generate or animate raindrops until the thunder has ended.
      if (stormReadyRef.current) {
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

        const roundTime = Math.min(dt, DURATION - progress.elapsed);
        progress.elapsed += roundTime;

        for (const character of CHARACTERS) {
          // Umbrella must be above the character
          const horizontallyAligned =
            Math.abs(
              umbrella.x - character.x
            ) < 88;

          const aboveCharacter = umbrella.y < character.y + 15;

          if (
            umbrella.visible &&
            horizontallyAligned &&
            aboveCharacter
          ) {
            progress.shelter[character.id] += roundTime;
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

  // Header countdown bar starts full and empties as the round progresses.
  const timeRemainingPercent = Math.max(
    0,
    100 * (1 - hud.elapsed / DURATION)
  );
  const remainingSeconds = Math.max(0, DURATION - hud.elapsed);

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

        .umbrella-header-status {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: clamp(12px, 2vw, 24px);
          flex: 1 1 auto;
          min-width: 0;
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

        /* Three distinct backgrounds overlap at exactly the same coordinates.
           Only the upper two fade in, so there is never an abrupt image swap. */
        .umbrella-weather {
          opacity: 0;
          will-change: opacity;
        }
        .umbrella-weather-transition {
          transition: opacity ${WEATHER_TRANSITION_MS}ms ease-in-out;
        }
        .umbrella-weather-sunny {
          transition: opacity ${WEATHER_SUNRISE_MS}ms ease-in-out;
        }
        .umbrella-stage[data-weather="transition"] .umbrella-weather-transition,
        .umbrella-stage[data-weather="sunny"] .umbrella-weather-transition {
          opacity: 1;
        }
        .umbrella-stage[data-weather="sunny"] .umbrella-weather-sunny {
          opacity: 1;
        }
        .umbrella-stage[data-finished="true"] .umbrella-rain {
          opacity: 0;
          transition: opacity 900ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .umbrella-weather-transition,
          .umbrella-weather-sunny,
          .umbrella-stage[data-finished="true"] .umbrella-rain {
            transition-duration: 0ms;
          }
        }

        /* Natural-looking lightning: thin branched channels and two brief sky flashes. */
        .umbrella-thunder-intro {
          position: absolute;
          inset: 0;
          z-index: 5;
          overflow: hidden;
          pointer-events: none;
          background: rgba(16, 27, 44, .21);
          animation: umbrella-thunder-shade 1550ms ease-out both;
        }

        .umbrella-thunder-intro::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0;
          background: radial-gradient(
            ellipse at 67% 18%,
            rgba(246, 250, 255, .92) 0%,
            rgba(208, 227, 255, .48) 36%,
            rgba(206, 223, 246, .15) 73%,
            transparent 100%
          );
          animation: umbrella-sky-flash 1550ms linear both;
        }

        .umbrella-lightning-field {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          opacity: 0;
          animation: umbrella-lightning-strike 1550ms linear both;
        }

        .umbrella-lightning-halo {
          fill: none;
          stroke: #c6e4ff;
          stroke-width: 11;
          stroke-linejoin: round;
          stroke-linecap: round;
          opacity: .7;
          filter: url(#umbrella-lightning-glow);
        }

        .umbrella-lightning-core {
          fill: none;
          stroke: #f8fbff;
          stroke-width: 2.4;
          stroke-linejoin: round;
          stroke-linecap: round;
        }

        .umbrella-lightning-branches {
          fill: none;
          stroke: #e4f1ff;
          stroke-width: 1.25;
          stroke-linejoin: round;
          stroke-linecap: round;
        }

        /* The bright channels appear for fractions of a second, never as a logo. */
        @keyframes umbrella-lightning-strike {
          0%, 13%, 20%, 27%, 35%, 100% { opacity: 0; }
          15%, 16% { opacity: 1; }
          29% { opacity: .8; }
        }

        @keyframes umbrella-sky-flash {
          0%, 12%, 21%, 26%, 37%, 100% { opacity: 0; }
          15% { opacity: .72; }
          17% { opacity: .25; }
          29% { opacity: .45; }
          31% { opacity: .12; }
        }

        @keyframes umbrella-thunder-shade {
          0%, 58% { background: rgba(16, 27, 44, .21); }
          100% { background: transparent; }
        }

        @media (prefers-reduced-motion: reduce) {
          .umbrella-thunder-intro,
          .umbrella-thunder-intro::before,
          .umbrella-lightning-field { animation: none; }
          .umbrella-thunder-intro { background: transparent; }
          .umbrella-lightning-field { opacity: 0; }
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

        /* Countdown bar in the shared header (no footer) */
        .umbrella-time-meter {
          flex: 0 1 210px;
          width: clamp(110px, 17vw, 210px);
          min-width: 100px;
          height: 15px;
          border: 1px solid #c7c6b8;
          border-radius: 20px;
          background: var(--thing-track);
          overflow: hidden;
        }

        .umbrella-time-fill {
          height: 100%;
          border-radius: 20px;
          background: repeating-linear-gradient(
            to right,
            var(--thing-sage) 0 13px,
            #e0ead1 13px 15px
          );
          transition: width .1s linear;
        }

        /* Results dialog only appears once the sunny scene is fully visible. */
        .umbrella-results-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(25, 42, 36, .32);
          backdrop-filter: blur(2px);
          animation: umbrella-overlay-in 300ms ease-out both;
        }
        .umbrella-results-card {
          width: min(440px, 100%);
          padding: clamp(22px, 4vw, 36px);
          color: var(--thing-ink);
          background: rgb(248, 236, 221);
          border: 1px solid #a5a18a;
          border-radius: 20px;
          box-shadow: 0 18px 54px rgba(28, 41, 33, .23);
          text-align: center;
          animation: umbrella-dialog-in 380ms cubic-bezier(.2, .8, .2, 1) both;
        }
        .umbrella-results-icon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          margin: 0 auto 14px;
          border: 2px solid #829b6c;
          border-radius: 50%;
          color: #597449;
          background: #e4ebcf;
          font-size: 30px;
        }
        .umbrella-results-eyebrow {
          margin: 0 0 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #738563;
        }
        .umbrella-results-title {
          margin: 0 0 8px;
          font-size: clamp(24px, 4vw, 30px);
          letter-spacing: -.025em;
        }
        .umbrella-results-copy {
          margin: 0 0 22px;
          color: #646b58;
          font-size: 14px;
          line-height: 1.5;
        }
        .umbrella-results-scores {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 24px;
        }
        .umbrella-results-score {
          padding: 11px 7px;
          border: 1px solid #c8c5b1;
          border-radius: 12px;
          background: rgba(255, 255, 255, .36);
        }
        .umbrella-results-score strong {
          display: block;
          margin-bottom: 3px;
          font-size: 23px;
          color: #5b754b;
          font-variant-numeric: tabular-nums;
        }
        .umbrella-results-score span {
          display: block;
          font-size: 11px;
          color: #667057;
        }
        .umbrella-next-button {
          width: 100%;
          min-height: 49px;
          padding: 12px 18px;
          border: 1px solid #5e754e;
          border-radius: 12px;
          background: #778f63;
          color: #fffaf0;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 150ms ease, transform 150ms ease;
        }
        .umbrella-next-button:hover { background: #617d50; }
        .umbrella-next-button:active { transform: scale(.985); }
        .umbrella-next-button:focus-visible {
          outline: 3px solid #a7c989;
          outline-offset: 3px;
        }
        @keyframes umbrella-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes umbrella-dialog-in {
          from { opacity: 0; transform: translateY(14px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .umbrella-results-card,
          .umbrella-results-overlay { animation: none; }
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
          .umbrella-header-status {
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
            gap: 8px 12px;
          }
          .umbrella-characters { justify-content: center; width: auto; }
          .umbrella-character-card { flex: 1; max-width: 105px; justify-content: center; }
          .umbrella-character-meter { width: 38px; }
          .umbrella-time-meter { flex: 1 1 150px; width: auto; max-width: 320px; }
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
            <span className="umbrella-test-badge">Test 1 / 4</span>
            <span className="umbrella-heading-divider" aria-hidden="true" />
            <h1 className="umbrella-title">
              <span className="umbrella-title-symbol" aria-hidden="true">☂</span>
              The Umbrella Dilemma
            </h1>
          </div>

          <div className="umbrella-header-status">
            {/* Individual character protection indicators */}
            <div className="umbrella-characters" aria-label="Character protection progress">
              {CHARACTERS.map((character) => {
                const sheltered = hud.shelter[character.id] || 0;
                const percent = Math.min(100, (sheltered / DURATION) * 100);
                const shelterTime = `${sheltered.toFixed(1)} seconds sheltered`;
                return (
                  <div
                    className="umbrella-character-card"
                    key={character.id}
                    title={`${character.id}: ${shelterTime}`}
                  >
                    <img src={ASSETS[character.id]} alt={character.id} draggable={false} />
                    <div
                      className="umbrella-character-meter"
                      role="progressbar"
                      aria-label={`${character.id} shelter time`}
                      aria-valuenow={Math.round(percent)}
                      aria-valuetext={shelterTime}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="umbrella-character-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Countdown displayed as a shrinking bar */}
            <div
              className="umbrella-time-meter"
              role="progressbar"
              aria-label="Time remaining"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(timeRemainingPercent)}
              aria-valuetext={`${Math.ceil(remainingSeconds)} seconds remaining`}
            >
              <div
                className="umbrella-time-fill"
                style={{ width: `${timeRemainingPercent}%` }}
              />
            </div>
          </div>
        </div>
      </GameHeader>

      {/* Original interactive canvas/character mechanics are unchanged. */}
      <div
        className="umbrella-stage"
        data-finished={hud.finished}
        data-weather={weatherPhase}
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
        <img
          className="umbrella-background umbrella-weather umbrella-weather-transition"
          src={ASSETS.transition}
          onError={(event) => {
            // Support the earlier hyphenated asset name without a reload loop.
            if (!event.currentTarget.src.endsWith("rain-transition.png")) {
              event.currentTarget.src = ASSETS.transitionLegacy;
            }
          }}
          alt=""
          draggable={false}
        />
        <img
          className="umbrella-background umbrella-weather umbrella-weather-sunny"
          src={ASSETS.sunny}
          onError={(event) => {
            if (!event.currentTarget.src.endsWith("sunny-background.png")) {
              event.currentTarget.src = ASSETS.sunnyLegacy;
            }
          }}
          alt=""
          draggable={false}
        />
        <div className="umbrella-ground" />

        {/* A branching lightning strike briefly lights the sky before rain starts. */}
        {!stormReady && !hud.finished && (
          <div className="umbrella-thunder-intro" aria-hidden="true">
            <svg
              className="umbrella-lightning-field"
              viewBox="0 0 900 540"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter
                  id="umbrella-lightning-glow"
                  x="-70%"
                  y="-70%"
                  width="240%"
                  height="240%"
                >
                  <feGaussianBlur stdDeviation="7" />
                </filter>
              </defs>
              {/* Uneven main discharge: thin and branched, like actual lightning. */}
              <path
                className="umbrella-lightning-halo"
                d="M628 -16 L624 30 L604 57 L620 79 L595 104 L605 126 L570 161 L579 182 L552 209 L562 238 L530 269 L540 291 L512 321"
              />
              <path
                className="umbrella-lightning-core"
                d="M628 -16 L624 30 L604 57 L620 79 L595 104 L605 126 L570 161 L579 182 L552 209 L562 238 L530 269 L540 291 L512 321"
              />
              <path
                className="umbrella-lightning-branches"
                d="M620 79 L651 91 L668 116 L691 125 M605 126 L633 149 L642 178 L664 192 M570 161 L540 170 L522 190 L504 196 M562 238 L587 252 L592 279 L607 291 M540 291 L517 301 L505 329 L490 341 M604 57 L585 73 L576 92"
              />
            </svg>
          </div>
        )}

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

        {showResults && finalResult && (
          <div className="umbrella-results-overlay">
            <section
              className="umbrella-results-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="umbrella-results-title"
              aria-describedby="umbrella-results-description"
            >
              <div className="umbrella-results-icon" aria-hidden="true">✓</div>
              <p className="umbrella-results-eyebrow">Test 1 / 4 completed</p>
              <h2 id="umbrella-results-title" className="umbrella-results-title">
                The rain has passed
              </h2>
              <p id="umbrella-results-description" className="umbrella-results-copy">
                Every choice matters. Here's how you did.
              </p>
              <div className="umbrella-results-scores" aria-label="Your scores">
                <div className="umbrella-results-score">
                  <strong>{finalResult.scores.rainProtection}</strong>
                  <span>Protection</span>
                </div>
                <div className="umbrella-results-score">
                  <strong>{finalResult.scores.empathy}</strong>
                  <span>Empathy</span>
                </div>
                <div className="umbrella-results-score">
                  <strong>{finalResult.scores.ecology}</strong>
                  <span>Ecology</span>
                </div>
              </div>
              <button
                ref={continueButtonRef}
                type="button"
                className="umbrella-next-button"
                onClick={handleContinue}
              >
                Continue to next test →
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
