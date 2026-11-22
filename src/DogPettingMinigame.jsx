import GameRewardSummary from "./GameRewardSummary";

import React, { useEffect, useRef, useState } from "react";
import { GameHeader } from "./GameBars";

const dogSrc = "/assets/dog.png";
const dogLoveSrc = "/assets/dog_tongue.png";
const dogFrameSrc = "/assets/dog_frame2.png";
const dogAngrySrc = "/assets/DogLockIn.png"
const publicPath = process.env.PUBLIC_URL || "";
const backgroundSrc = "/assets/sunny-background.png";
const GAME_DURATION = 10000;
const tailImages = [
    "/assets/dog_tail1.png",
    "/assets/dog_tail2.png",
    "/assets/dog_tail3.png",
    "/assets/dog_tail2.png",
];
const tail_delay = 600;

const TAIL_INTERVAL = 150; // milliseconds between frames

const DogPettingMiniGame = ({
    onContinue = () => { },
    testLabel = "Test 4 / 4",
}) => {
    const [score, setScore] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(true);
    const [started, setStarted] = useState(false);
    const [hearts, setHearts] = useState([]);
    const [isPetting, setIsPetting] = useState(false);
    const [isPunched, setIsPunched] = useState(false);
    const [impactEmoji, setImpactEmoji] = useState(false);
    const [tailFrame, setTailFrame] = useState(0);
    const [showTail, setShowTail] = useState(false);
    const clickTimes = useRef([]);
    const punchTimeout = useRef(null);

    const startTime = useRef(null);
    const animationFrame = useRef(null);
    const pointerDown = useRef(false);
    const previousAngle = useRef(null);
    const accumulatedAngle = useRef(0);
    const heartId = useRef(0);

    // Do not begin counting down until the first pointer press on the dog.
    useEffect(() => {
        if (!started || !running) return;

        const animate = (timestamp) => {
            if (startTime.current === null) {
                startTime.current = timestamp;
            }

            const elapsed = Math.min(GAME_DURATION, timestamp - startTime.current);
            setElapsed(elapsed);
            if (elapsed >= GAME_DURATION) {
                setRunning(false);
                pointerDown.current = false;
                return;
            }

            animationFrame.current =
                requestAnimationFrame(animate);
        };

        animationFrame.current =
            requestAnimationFrame(animate);

        return () => {
            if (animationFrame.current !== null) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, [started, running]);

    useEffect(() => {
        if (hearts.length === 0) return;

        const timeout = setTimeout(() => {
            setHearts((current) =>
                current.filter((heart) => Date.now() - heart.createdAt < 900)
            );
        }, 900);

        return () => clearTimeout(timeout);
    }, [hearts]);
    useEffect(() => {
        if (!isPetting) {
            setShowTail(false);
            setTailFrame(0);
            return;
        }

        // Wait 300ms before showing the tail
        const showTimeout = setTimeout(() => {
            setShowTail(true);
        }, tail_delay);

        const interval = setInterval(() => {
            setTailFrame((current) => (current + 1) % tailImages.length);
        }, TAIL_INTERVAL);

        return () => {
            clearTimeout(showTimeout);
            clearInterval(interval);
        };
    }, [isPetting]);

    useEffect(() => {
        const imagesToPreload = [
            dogSrc,
            dogLoveSrc,
            dogAngrySrc,
            dogFrameSrc,
            backgroundSrc,
            ...tailImages,
        ];

        imagesToPreload.forEach((src) => {
            const image = new Image();
            image.src = (publicPath || "") + src;

            // Decode the image ahead of time where supported
            if (image.decode) {
                image.decode().catch(() => { });
            }
        });
    }, []);

    const getAngle = (event, element) => {
        const rect = element.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        return Math.atan2(
            event.clientY - centerY,
            event.clientX - centerX
        );
    };

    const addHeart = () => {
        const id = heartId.current++;

        setHearts((current) => [
            ...current,
            {
                id,
                createdAt: Date.now(),
                left: 40 + Math.random() * 20,
            },
        ]);
    };

    const handleDogClick = () => {
        if (!running) return;

        const now = Date.now();

        clickTimes.current = clickTimes.current.filter(
            (time) => now - time < 350
        );

        clickTimes.current.push(now);

        if (clickTimes.current.length >= 3) {
            setIsPetting(false);
            pointerDown.current = false;
            setScore((current) => current - 20);
            setIsPunched(true);
            setImpactEmoji(true);
            clickTimes.current = [];

            clearTimeout(punchTimeout.current);

            punchTimeout.current = setTimeout(() => {
                setIsPunched(false);
                setImpactEmoji(false);
            }, 500);
        }
    };

    const handlePointerDown = (event) => {
        if (!running) return;

        if (!started) {
            startTime.current = performance.now();
            setStarted(true);
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        setIsPetting(true);

        pointerDown.current = true;
        previousAngle.current = getAngle(
            event,
            event.currentTarget
        );
        accumulatedAngle.current = 0;
    };

    const handlePointerMove = (event) => {
        if (!running || !pointerDown.current) return;

        const angle = getAngle(event, event.currentTarget);

        let delta = angle - previousAngle.current;

        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        previousAngle.current = angle;

        accumulatedAngle.current += Math.abs(delta);

        if (accumulatedAngle.current >= Math.PI * 2) {
            accumulatedAngle.current -= Math.PI * 2;

            setScore((current) => current + 10);
            addHeart();
        }
    };

    const stopPetting = () => {
        pointerDown.current = false;
        previousAngle.current = null;
        accumulatedAngle.current = 0;
        setIsPetting(false);
    };

    // The countdown and its stripe pattern are independent: the track stays fixed.
    const timeRemainingPercent = Math.max(0, 100 * (1 - elapsed / GAME_DURATION));

    return (
        <div className="dog-game">
            <style>{`
          .dog-game {
            --thing-cream: rgb(248, 236, 221);
            --thing-ink: #43483a;
            --thing-olive: #74875e;
            --thing-sage: #a3b879;
            --thing-track: #e2dfd1;
            position: fixed;
            inset: 0;
            z-index: 9999;
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            color: var(--thing-ink);
            background: var(--thing-cream);
            font-family: "Trebuchet MS", Verdana, sans-serif;
            user-select: none;
            overscroll-behavior: none;
          }
          .dog-game * { box-sizing: border-box; }
          .dog-game button { font: inherit; }

          /* Shared THING header: same layout and colors as the other games. */
          .dog-header-content {
            width: 100%;
            max-width: 1460px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
          }
          .dog-header-heading {
            display: flex;
            align-items: center;
            gap: 16px;
            min-width: 0;
          }
          .dog-test-badge {
            flex: 0 0 auto;
            padding: 8px 16px;
            color: #fffaf0;
            background: var(--thing-olive);
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: .03em;
            white-space: nowrap;
          }
          .dog-heading-divider {
            flex: 0 0 auto;
            width: 1px;
            height: 34px;
            background: #9b9e8c;
          }
          .dog-heading-icon {
            width: 29px;
            height: 29px;
            flex: 0 0 auto;
            color: #536d47;
          }
          .dog-title {
            margin: 0;
            font-size: clamp(18px, 2.1vw, 26px);
            font-weight: 700;
            letter-spacing: -.02em;
            white-space: nowrap;
          }
          .dog-header-right {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: clamp(12px, 2vw, 25px);
            min-width: 0;
          }
          .dog-score-chip {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 8px 12px;
            border: 1px solid #c8c9b5;
            border-radius: 9px;
            background: rgba(255,255,255,.30);
            white-space: nowrap;
            font-size: 14px;
          }
          .dog-score-chip strong { color: #536d47; font-size: 17px; font-variant-numeric: tabular-nums; }
          .dog-timer {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: clamp(160px, 21vw, 290px);
            min-width: 0;
          }
          .dog-timer-heading {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 12px;
            font-weight: 700;
            color: #596b4c;
          }
          .dog-time-meter {
            position: relative;
            width: 100%;
            height: 14px;
            border: 1px solid #c7c6b8;
            border-radius: 20px;
            overflow: hidden;
            background: var(--thing-track);
          }
          .dog-time-fill {
            position: absolute;
            inset: 0;
            background: var(--thing-sage);
            transition: clip-path .06s linear;
          }
          /* Fixed separators: they never scale or move with the fill. */
          .dog-time-meter::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: repeating-linear-gradient(
              to right,
              transparent 0 13px,
              #f8ecdd 13px 16px
            );
          }

          /* Sunny pixel-art scene takes the full available space. */
          .dog-scene {
            position: relative;
            flex: 1 1 0;
            min-height: 0;
            width: 100%;
            overflow: hidden;
            isolation: isolate;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #c9d7b3;
          }
          .dog-scene-background {
            position: absolute;
            inset: 0;
            z-index: -2;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            image-rendering: pixelated;
            pointer-events: none;
          }
          .dog-scene-tint {
            position: absolute;
            inset: 0;
            z-index: -1;
            background: rgba(248,236,221,.08);
            pointer-events: none;
          }
          .dog-instructions {
            position: absolute;
            z-index: 8;
            top: clamp(12px, 2.5vh, 28px);
            left: 50%;
            transform: translateX(-50%);
            max-width: calc(100% - 30px);
            padding: 12px 22px;
            color: #536343;
            background: rgba(248,236,221,.94);
            border: 1px solid #c4bda9;
            border-radius: 12px;
            box-shadow: 0 6px 22px rgba(50,60,35,.10);
            font-size: 14px;
            font-weight: 650;
            text-align: center;
          }
          .dog-container {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: min(75vw, 520px, 65dvh);
            aspect-ratio: 1 / 1;
            flex: 0 0 auto;
          }
          .dog-image-clip {
            position: absolute;
            inset: 0;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .dog-image {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            image-rendering: pixelated;
            pointer-events: none;
            user-select: none;
            -webkit-user-drag: none;
          }
          .dog-image.punched { animation: dogPunch .3s ease; }
          @keyframes dogPunch {
            0%, 100% { transform: translate(0,0) scale(1); }
            25% { transform: translate(5px,-3px) scale(.94); }
            50% { transform: translate(-5px,2px) scale(.97); }
            75% { transform: translate(3px,-1px) scale(.99); }
          }
          .dog-tail {
            position: absolute;
            z-index: 1;
            left: 15%;
            width: 85%;
            height: auto;
            object-fit: contain;
            transform-origin: right center;
            image-rendering: pixelated;
            pointer-events: none;
          }
          .dog-frame {
                position: absolute;
                inset: 0;
                z-index: 4;
                width: 222%;
                height: 142%;
                object-fit: contain;
                image-rendering: pixelated;
                pointer-events: none;
                -webkit-user-drag: none;
                left: 50%;
                transform: translate(-50%, -13%);
          }
          .pet-area {
            position: absolute;
            z-index: 5;
            left: 50%;
            top: 43%;
            width: 52%;
            height: 52%;
            max-height: 100%;
            border-radius: 50%;
            transform: translate(-50%,-50%);
            touch-action: none;
            cursor: grab;
          }
          .pet-area:active { cursor: grabbing; }
          .heart {
            position: absolute;
            z-index: 7;
            left: var(--heart-left);
            top: 31%;
            font-size: clamp(23px, 3vw, 34px);
            pointer-events: none;
            animation: heartFloat .9s ease-out forwards;
          }
          @keyframes heartFloat {
            0% { opacity: 1; transform: translateY(0) scale(.5); }
            100% { opacity: 0; transform: translateY(-110px) scale(1.4); }
          }
          .impact-emoji {
            position: absolute;
            z-index: 7;
            top: 12%;
            right: 12%;
            font-size: clamp(32px, 6vw, 64px);
            pointer-events: none;
            animation: impactPop .5s ease-out forwards;
          }
          @keyframes impactPop {
            0% { opacity: 0; transform: scale(.2) rotate(-30deg); }
            35% { opacity: 1; transform: scale(1.4) rotate(15deg); }
            70% { opacity: 1; transform: scale(1) rotate(-10deg); }
            100% { opacity: 0; transform: scale(.7); }
          }

          @media (max-width: 820px) {
            .dog-header-content { gap: 12px; }
            .dog-header-heading { gap: 10px; }
            .dog-score-chip { padding: 6px 8px; font-size: 12px; }
            .dog-timer { width: 160px; }
          }
          @media (max-width: 640px) {
            .dog-header-content { flex-wrap: wrap; justify-content: center; gap: 12px; }
            .dog-header-heading { width: 100%; justify-content: center; }
            .dog-header-right { width: 100%; justify-content: space-between; }
            .dog-timer { flex: 1; width: auto; }
            .dog-test-badge { font-size: 12px; padding: 6px 9px; }
            .dog-heading-divider { height: 26px; }
            .dog-heading-icon { width: 24px; height: 24px; }
            .dog-title { font-size: 18px; }
            .dog-container { width: min(85vw, 430px, 55dvh); }
            .dog-instructions { font-size: 12px; padding: 9px 13px; }
          }
          @media (prefers-reduced-motion: reduce) {
            .heart, .impact-emoji, .dog-image.punched { animation-duration: .01ms; }
            .dog-time-fill { transition: none; }
          }
        `}</style>

            <GameHeader>
                <div className="dog-header-content">
                    <div className="dog-header-heading">
                        <span className="dog-test-badge">{testLabel}</span>
                        <span className="dog-heading-divider" aria-hidden="true" />
                        <svg className="dog-heading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M8.5 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM19 9.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                            <path d="M12 13c-2 0-3 2-4.5 3.5C6 18 7 20 9 20c1.2 0 1.7-.7 3-.7s1.8.7 3 .7c2 0 3-2 1.5-3.5C15 15 14 13 12 13Z" />
                        </svg>
                        <h1 className="dog-title">Dog Petting</h1>
                    </div>
                    <div className="dog-header-right">
                        <div className="dog-score-chip" aria-live="polite">
                            <span>Kindness points</span>
                            <strong>{score}</strong>
                        </div>
                        <div className="dog-timer">
                            <div
                                className="dog-time-meter"
                                role="progressbar"
                                aria-label="Time remaining"
                                aria-valuemin={0}
                                aria-valuemax={GAME_DURATION / 1000}
                                aria-valuenow={Math.ceil((GAME_DURATION - elapsed) / 1000)}
                            >
                                <div
                                    className="dog-time-fill"
                                    style={{ clipPath: `inset(0 ${100 - timeRemainingPercent}% 0 0)` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </GameHeader>

            <main className="dog-scene">
                <img className="dog-scene-background" src={publicPath + backgroundSrc} alt="" draggable={false} />
                <div className="dog-scene-tint" aria-hidden="true" />
                {running && (
                    <div className="dog-instructions">
                        Gently pet the dog by moving in circles
                    </div>
                )}

                <div className="dog-container">
                    {isPetting && !isPunched && showTail &&(
                        <img
                            className="dog-tail"
                            src={publicPath + tailImages[tailFrame]}
                            alt=""
                            draggable={false}
                        />
                    )}
                    <div className="dog-image-clip">
                        <img
                            className={`dog-image ${isPunched ? "punched" : ""}`}
                            src={publicPath + (isPunched ? dogAngrySrc : isPetting ? dogLoveSrc : dogSrc)}
                            alt="Dog"
                            draggable={false}
                        />
                    </div>
                    <img className="dog-frame" src={publicPath + dogFrameSrc} alt="" draggable={false} />
                    <div
                        className="pet-area"
                        aria-label="Pet the dog gently in circles"
                        onClick={handleDogClick}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={stopPetting}
                        onPointerCancel={stopPetting}
                        onLostPointerCapture={stopPetting}
                    />
                    {hearts.map((heart) => (
                        <div key={heart.id} className="heart" style={{ "--heart-left": `${heart.left}%` }}>
                            ❤️
                        </div>
                    ))}
                    {impactEmoji && <div className="impact-emoji">💢</div>}
                </div>

                {!running && (
                    <GameRewardSummary
                        title="Petting complete!"
                        rewards={[["Kindness points", score]]}
                        onContinue={() => onContinue(score)}
                    />
                )}
            </main>
        </div>
    );
};

export default DogPettingMiniGame;
