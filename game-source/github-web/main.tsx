import { createRoot } from "react-dom/client";
import GameClient from "../app/game-client";
import "../app/globals.css";

const appBase = new URL("./", document.baseURI).pathname;
createRoot(document.getElementById("root")!).render(
  <GameClient appBase={appBase} apiEndpoint="https://game.xinyuwang.net/api/room" githubEdition />
);
