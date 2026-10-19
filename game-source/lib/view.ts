import type { Game, PublicGame, Seat } from "./game";

/** Only the authenticated viewer may request a private ledger. */
export function ownPlayer(game: Game | PublicGame, seat: Seat) {
  if ("viewer" in game) {
    if (game.viewer !== seat) throw new Error("只能查看自己的府内账册。");
    return game.self;
  }
  return game.players[seat];
}
