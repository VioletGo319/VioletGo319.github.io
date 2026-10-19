/** Authored high-office rules. Local titles represent separate jurisdictions. */
import { OFFICES, actionsAt, officeId } from "./board";
import type { Game, PublicGame, Seat } from "./game";

export const EXCLUSIVE_FROM: Record<string, number> = {
  court: 0, cabinet: 3, personnel: 4, revenue: 4, rites: 4, war: 4, penalty: 4, works: 4,
  censor: 3, hanlin: 6, temples: 3,
};
export const OFFICE_SCOPE = "三公全席；内阁学士及以上；六部侍郎、尚书；都察院佥都御史及以上；翰林学士；九卿区的少卿、卿。";
export function exclusiveOffice(pos: number) {
  const o = OFFICES[pos], threshold = EXCLUSIVE_FROM[o.group];
  return threshold !== undefined && o.order >= threshold;
}
export function authorityAt(pos: number) {
  if (!exclusiveOffice(pos)) return null;
  const o = OFFICES[pos];
  return o.group === "temples" ? o.name.split("寺")[0] + "寺" : o.department;
}
export function sameAuthority(a: number, b: number) {
  const department = authorityAt(a);
  return department !== null && department === authorityAt(b);
}
export function hierarchy(game: Game | PublicGame) {
  if (game.players.length !== 2) return null;
  const [a, b] = game.players;
  if (a.pos === b.pos || !sameAuthority(a.pos, b.pos)) return null;
  const senior = (OFFICES[a.pos].order > OFFICES[b.pos].order ? 0 : 1) as Seat;
  return { senior, junior: (1 - senior) as Seat, department: authorityAt(a.pos)! };
}
export function demotionTarget(pos: number) {
  const o = OFFICES[pos];
  if (o.order > 0) return officeId(o.group + "." + (o.order - 1));
  if (o.group === "court") return officeId("cabinet.5");
  return actionsAt(pos).赃.to;
}
export type Landing = { intended: number; to: number; occupant: Seat | null; note: string };
export function officeLanding(game: Pick<Game | PublicGame, "players">, seat: Seat, target: number): Landing {
  const otherSeat = (1 - seat) as Seat, other = game.players[otherSeat];
  if (!exclusiveOffice(target) || !other || other.pos !== target)
    return { intended: target, to: target, occupant: null, note: "" };
  // With two players there is one occupied destination; the next lower slot is free.
  // The predecessor may be a nonexclusive junior post or the next lower office group.
  const to = demotionTarget(target);
  return { intended: target, to, occupant: otherSeat,
    note: "「" + OFFICES[target].name + "」由" + other.name + "在任，避位至「" + OFFICES[to].department + "·" + OFFICES[to].name + "」。" };
}
export const HASSLES = [
  { id: "paperwork", title: "加派差事", detail: "下级照办则政绩 −2，最低为 0。" },
  { id: "tribute", title: "索取孝敬", detail: "下级照办则向上级交 6 两；不足只交现有银两。" },
  { id: "obstruct", title: "压住荐书", detail: "下级照办则下次掷骰无法使用政绩、人情或请荐助力；普通判词和考核照常。" },
] as const;
export type HassleKind = typeof HASSLES[number]["id"];
export type HassleChoice = "comply" | "favor" | "appeal" | "withdraw";
export function hassleAvailability(game: Game | PublicGame, seat: Seat) {
  const relation = hierarchy(game), p = game.players[seat];
  if (!relation) return "双方须同在一个中央高阶官署；地方官和不同寺署不成立上下级关系。";
  if (relation.senior !== seat) return "你目前是下级，可以积累政绩、人情应对，或在对方嫌疑足够时参奏。";
  if (p.risk >= 4) return "你正在停升待查，不能向下级施压。";
  if (p.merit < 1) return "发起需要 1 政绩。";
  if (game.moves < game.strategy.hassleAfterMove) return "再落子 " + (game.strategy.hassleAfterMove - game.moves) + " 次才能再次刁难。";
  return "";
}
