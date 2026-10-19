/** Authored strategy expansion. Historical inspirations are cited in board.SOURCES. */
import { GROUPS, OFFICES, actionsAt, officeId, type Face } from "./board";
import type { Game, PublicGame, Seat } from "./game";

export const GIFTS = [
  { id: "tea", name: "清茶一匣", cost: 5, favor: 1, risk: 0, description: "薄礼问候，慢慢攒人情" },
  { id: "book", name: "书画一卷", cost: 10, favor: 2, risk: 1, description: "投其所好，也留下往来痕迹" },
  { id: "treasure", name: "珍玩一盒", cost: 20, favor: 3, risk: 2, description: "人情来得快，嫌疑也更重" },
] as const;
export type GiftId = typeof GIFTS[number]["id"];
export type PlanKind = "gift" | "work" | "petition" | "relief" | "support" | "impeach" | "debate";
export type PlanInput = { kind: PlanKind; gift?: GiftId };
export const PERSONALITIES = [
  { name: "风雅", likes: "book", description: "偏爱书画，合意礼物额外 +1 人情。" },
  { name: "务实", likes: "tea", description: "偏爱清茶，合意礼物额外 +1 人情。" },
  { name: "好奢", likes: "treasure", description: "偏爱珍玩，合意礼物额外 +1 人情。" },
  { name: "清正", likes: null, description: "收清茶、书画；拒收珍玩，不扣银两。" },
] as const;
export const EDICTS = [
  { title: "常行政务", detail: "办差得 2 政绩、4 两；本衙 3 人情可举荐。", workMerit: 2, workCoins: 4, giftRisk: 0, favorCost: 3 },
  { title: "兴学修史", detail: "办差额外得 1 政绩，适合准备考核。", workMerit: 3, workCoins: 4, giftRisk: 0, favorCost: 3 },
  { title: "御史巡察", detail: "本期每次主动送礼额外 +1 嫌疑。", workMerit: 2, workCoins: 4, giftRisk: 1, favorCost: 3 },
  { title: "荐贤诏下", detail: "本衙举荐只需 2 人情；办差照常。", workMerit: 2, workCoins: 4, giftRisk: 0, favorCost: 2 },
] as const;
export function currentEdict(game: Game | PublicGame) { return EDICTS[game.strategy.era % EDICTS.length]; }
export function nextEdict(game: Game | PublicGame) { return EDICTS[(game.strategy.era + 1) % EDICTS.length]; }
export function turnsToReview(game: Game | PublicGame) { return 6 - (game.moves - game.strategy.eraStart); }
export function hasPrepared(game: Game | PublicGame) { return game.strategy.prep?.move === game.moves; }
export function leaderAt(game: Game | PublicGame, seat: Seat) {
  const o = OFFICES[game.players[seat].pos];
  if (["origin", "court", "home"].includes(o.group)) return null;
  const g = GROUPS.find(g => g.key === o.group)!;
  // The highest holder seeks a recommendation from the next authority.
  const target = o.order < g.ids.length - 1 ? g.ids[g.ids.length - 1]
    : officeId(o.group === "cabinet" ? "court.2" : "cabinet.5");
  const personality = PERSONALITIES[(GROUPS.indexOf(g) + Math.floor(game.strategy.era / 2)) % PERSONALITIES.length];
  const other = (1 - seat) as Seat;
  const receiver = game.players[other]?.pos === target ? other : null;
  return { target, office: OFFICES[target], group: g.key, department: g.name, personality, receiver,
    name: receiver === null ? "署中主官" : game.players[receiver].name };
}
export function giftQuote(game: Game | PublicGame, seat: Seat, id: GiftId) {
  const gift = GIFTS.find(g => g.id === id);
  if (!gift) throw new Error("请选择礼物。");
  const leader = leaderAt(game, seat);
  if (!leader) throw new Error("入仕后才能拜谒主官；三公与荣归不设此玩法。");
  return { ...gift, leader, favor: gift.favor + (leader.personality.likes === id ? 1 : 0),
    risk: gift.risk + currentEdict(game).giftRisk,
    refused: leader.personality.name === "清正" && id === "treasure" };
}
export function rollPreview(game: Game | PublicGame, seat: Seat, face: Face) {
  const p = game.players[seat], o = OFFICES[p.pos];
  const base = actionsAt(p.pos)[face];
  if (o.group !== "court" && o.group !== "home" && face === "功") {
    if (hasPrepared(game) && game.strategy.prep?.seat === seat && game.strategy.prep.kind === "petition")
      return { action: actionsAt(p.pos).德, effectiveFace: "德" as Face, reason: "政绩请荐", favorCost: 0 };
    const cost = currentEdict(game).favorCost;
    if (o.group !== "origin" && base.to === p.pos && (p.favor[o.group] || 0) >= cost)
      return { action: actionsAt(p.pos).才, effectiveFace: "才" as Face, reason: "主官举荐", favorCost: cost };
  }
  return { action: base, effectiveFace: face, reason: "", favorCost: 0 };
}
const ASSIGNMENTS: Record<string, string> = {
  origin: "寒窗课业", county: "清理县册", state: "修缮乡学", prefecture: "巡查粮仓", capitalCounty: "巡检坊市",
  capitalPrefecture: "疏理京畿", finance: "核实钱粮", justice: "复核刑案", province: "督办河工", hanlin: "修史校书",
  censor: "稽查案牍", temples: "整饬寺务", personnel: "考订官册", revenue: "清点库藏", rites: "筹办乡试",
  war: "核验军籍", penalty: "复审疑案", works: "修渠筑堤", cabinet: "拟议章奏", court: "辅理朝政",
};
export function assignmentAt(pos: number) { return ASSIGNMENTS[OFFICES[pos].group] || "办理公事"; }
export function demotionTarget(pos: number) {
  const o = OFFICES[pos];
  if (o.order > 0) return officeId(o.group + "." + (o.order - 1));
  if (o.group === "court") return officeId("cabinet.5");
  return actionsAt(pos).赃.to;
}
