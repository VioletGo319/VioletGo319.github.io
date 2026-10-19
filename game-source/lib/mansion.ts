import type { PublicGame } from "./game";
import { GROUPS, OFFICES } from "./board";
import { silverAt } from "./economy";
import { HASSLES, hassleAvailability, hierarchy } from "./offices";
import { GIFTS, assignmentAt, currentEdict, giftQuote, leaderAt, type PlanInput } from "./strategy";

export type DeskTab = "work" | "gift" | "duel";
export type DeskOption = { id: string; title: string; detail: string; cost: string; plan: PlanInput; unavailable?: string };
export function deskOptions(game: PublicGame, tab: DeskTab): DeskOption[] {
  const p = game.self, seat = game.viewer, o = OFFICES[p.pos], e = currentEdict(game);
  const cost = (base: number) => silverAt(p.pos, base);
  const money = (base: number) => p.coins < cost(base) ? "银两不足" : undefined;
  if (tab === "gift") {
    if (!leaderAt(game, seat)) return [];
    return GIFTS.map(g => {
      const q = giftQuote(game, seat, g.id);
      return { id: g.id, title: g.name, cost: q.cost + " 两", plan: { kind: "gift", gift: g.id },
        detail: q.leader.office.name + " · 人情 +" + q.favor + " · 嫌疑 +" + q.risk,
        unavailable: p.risk >= 3 ? "嫌疑过高，先自省" : q.refused ? "主官拒收此礼" : (p.favor[o.group] || 0) >= 6 ? "本衙人情已满" : p.coins < q.cost ? "银两不足" : undefined };
    });
  }
  if (tab === "work") return [
    { id: "work", title: assignmentAt(p.pos), cost: "免费", detail: "政绩 +" + e.workMerit + " · 银两 +" + cost(e.workCoins), plan: { kind: "work" } },
    { id: "petition", title: "政绩请荐", cost: "3 政绩", detail: "本次功按德行进；其他骰面不退款。", plan: { kind: "petition" }, unavailable: ["court", "home"].includes(o.group) ? "三公不可请荐" : p.risk >= 3 ? "嫌疑过高" : p.recommendationBlocked ? "荐书被压" : p.merit < 3 ? "政绩不足" : undefined },
    { id: "reflect", title: "闭门自省", cost: "免费", detail: "嫌疑 −2 · 政绩 −1，最低为 0。", plan: { kind: "reflect" }, unavailable: p.risk === 0 ? "目前清誉尚在" : undefined },
    { id: "relief", title: "赈济乡里", cost: cost(8) + " 两", detail: "政绩 +1 · 嫌疑 −2。", plan: { kind: "relief" }, unavailable: money(8) },
    { id: "support", title: "资助知己", cost: cost(10) + " 两", detail: "转给对方 " + cost(10) + " 两，双方各得 1 政绩。", plan: { kind: "support" }, unavailable: money(10) },
  ];
  const blocked = hassleAvailability(game, seat), relation = hierarchy(game);
  return [
    { id: "debate", title: "朝堂争辩", cost: "暗选论策", detail: "双方各投入 0–2 政绩。胜者按本人官阶领赏，投入不向对方公开。", plan: { kind: "debate" }, unavailable: game.moves < game.strategy.debateAfterMove ? "再落子 " + (game.strategy.debateAfterMove - game.moves) + " 次开放" : undefined },
    { id: "impeach", title: "密折参奏", cost: "2 政绩", detail: "对方嫌疑保密。获准才查办；未获采纳则自身嫌疑 +1，政绩与筹谋仍扣。", plan: { kind: "impeach" }, unavailable: p.merit < 2 ? "政绩不足" : undefined },
    ...(relation ? HASSLES.map(h => ({ id: h.id, title: h.title, cost: "1 政绩 · 嫌疑 +1", detail: h.id === "tribute" ? "令下级交最多 " + silverAt(game.players[relation.senior].pos,6) + " 两；可遭反制。" : h.detail, plan: { kind: "hassle" as const, hassle: h.id }, unavailable: blocked || undefined })) : []),
  ];
}
export function networkAt(game: PublicGame) {
  const p = game.self, group = OFFICES[p.pos].group, threshold = currentEdict(game).favorCost;
  return GROUPS.filter(g => !["origin", "court", "home"].includes(g.key) && (g.key === group || (p.favor[g.key] || 0) > 0))
    .map(g => ({ key: g.key, name: g.name, favor: p.favor[g.key] || 0, current: g.key === group,
      ready: (p.favor[g.key] || 0) >= threshold, threshold }))
    .sort((a,b) => Number(b.current)-Number(a.current) || b.favor-a.favor);
}
