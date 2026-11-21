import UmbrellaDilemma from "./UmbrellaDilemma";
import { useEffect, useState } from "react";

function TitleScreen() {
  return (
    <main>
      <h1>T.H.I.N.G</h1>
      <p>Testing Humanity Integration for Natural Goodness</p>
      <a href="#/assessments">Open assessment portal</a>
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