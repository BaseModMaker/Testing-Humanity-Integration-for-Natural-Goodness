import UmbrellaDilemma from "./UmbrellaDilemma";
import { useEffect, useState } from "react";
import "./App.css";

function TitleScreen() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundImage: `url("${process.env.PUBLIC_URL}/assets/thing_background.png")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "150px",
          right: "220px",
          width: "200px",
          zIndex: 10,
        }}
      >
        {/* Shadow */}
        <img
          src={`${process.env.PUBLIC_URL}/assets/shadow.png`}
          alt="shadow"
          style={{
            position: "absolute",
            bottom: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            opacity: 0.8,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {/* Robot */}
        <img
          src={`${process.env.PUBLIC_URL}/assets/Robot Sprite 2.png`}
          alt="robot"
          style={{
            position: "relative",
            width: "100%",
            height: "auto",
            display: "block",
            zIndex: 1,
          }}
        />
      </div>

      <div
        style={{
          width: "60vw",
          alignSelf: "center",
          position: "relative",
          isolation: "isolate",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-40%",
            zIndex: -1,
            pointerEvents: "none",
            background: `radial-gradient(
              ellipse at center,
              rgba(255,255,255,1) 0%,
              rgba(255,255,255,0.95) 15%,
              rgba(255,255,255,0.6) 30%,
              rgba(255,255,255,0.15) 50%,
              rgba(255,255,255,0) 70%
            )`,
            width: '50vw',
            height: '50vw',
            margin: 'auto'
          }}
        />
        <h1 style={{ margin: "0 0 1rem" }}>
          <img
            src={`${process.env.PUBLIC_URL}/assets/home_logo.png`}
            alt="T.H.I.N.G"
            style={{
              display: "block",
              width: "min(80%, 700px)",
              height: "auto",
              margin: "0 auto",
              imageRendering: "pixelated",
            }}
          />
        </h1>
        <p className="title-subtitle">Testing Humanity Integration for Natural Goodness</p>
        <a className="title-portal-link" href="#/assessments">Open assessment portal</a>
      </div>
    </main>
  );
}

function MainScreen() {
  return (
    <main>
      <h1>Assessments</h1>
      <ul>
        <li>
          <a href="#/assessments/umbrella">Umbrella Dilemma</a>
        </li>
      </ul>
    </main>
  );
}


export default function App() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    function updateRoute() {
      setRoute(window.location.hash);
    }

    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  switch (route) {
    case "#/assessments":
      return <MainScreen />;

    case "#/assessments/umbrella":
      return (
        <main>
          <a href="#/assessments">Back to assessments</a>
          <UmbrellaDilemma
            onScoresChange={(result) => {
              console.log("Umbrella score:", result);
            }}
            onComplete={(result) => {
              console.log("Umbrella test completed:", result);
            }}
          />
        </main>
      );

    default:
      return <TitleScreen />;
  }
}
