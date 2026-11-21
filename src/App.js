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
