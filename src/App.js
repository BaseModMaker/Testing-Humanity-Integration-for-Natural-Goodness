import UmbrellaDilemma from "./UmbrellaDilemma";

export default function App() {
  return (
    <UmbrellaDilemma
      onScoresChange={(result) => {
        console.log("Umbrella score:", result);
      }}
      onComplete={(result) => {
        console.log("Umbrella test completed:", result);
      }}
    />
  );
}