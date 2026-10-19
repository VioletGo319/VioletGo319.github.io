/** Authored strategy expansion. Historical inspirations are cited in board.SOURCES. */
import { GROUPS, OFFICES, actionsAt, officeId, type Face, type Action } from "./board";
import { ownPlayer } from "./view";
import { silverAt, moneyText } from "./economy";
import { appointmentAction, isAcademic, isPalaceGate } from "./scholar";
import type { Game, PublicGame, Seat } from "./game";
import { demotionTarget, officeLanding, sameAuthority, type HassleKind } from "./offices";
export { demotionTarget } from "./offices";

export const GIFTS = [
  { id: "tea", name: "清茶一匣", cost: 5, favor: 1, risk: 0, description: "薄礼问候，慢慢攒人情" },
  { id: "book", name: "书画一卷", cost: 10, favor: 2, risk: 1, description: "投其所好，也留下往来痕迹" },
  { id: "treasure", name: "珍玩一盒", cost: 20, favor: 3, risk: 2, description: "人情来得快，嫌疑也更重" },
] as const;
export type GiftId = typeof GIFTS[number]["id"];
export type PlanKind = "gift" | "work" | "petition" | "relief" | "reflect" | "support" | "impeach" | "debate" | "hassle";
export type PlanInput = { kind: PlanKind; gift?: GiftId; hassle?: HassleKind };
export const PERSONALITIES = [
  { name: "风雅", likes: "book", description: "偏爱书画，合意礼物额外 +1 人情。" },
  { name: "务实", likes: "tea", description: "偏爱清茶，合意礼物额外 +1 人情。" },
  { name: "好奢", likes: "treasure", description: "偏爱珍玩，合意礼物额外 +1 人情。" },
  { name: "清正", likes: null, description: "收清茶、书画；拒收珍玩，不扣银两。" },
] as const;
export const EDICTS = [
  { title: "常行政务", detail: "办差得 2 政绩、4 两；本衙 3 人情可将「才」举荐为「德」。", workMerit: 2, workCoins: 4, giftRisk: 0, favorCost: 3, commissionBonus:0 },
  { title: "兴学修史", detail: "办差额外得 1 政绩，适合准备考核。", workMerit: 3, workCoins: 4, giftRisk: 0, favorCost: 3, commissionBonus:0 },
  { title: "御史巡察", detail: "本期每次主动送礼额外 +1 嫌疑。", workMerit: 2, workCoins: 4, giftRisk: 1, favorCost: 3, commissionBonus:0 },
  { title: "荐贤诏下", detail: "本衙举荐只需 2 人情；有赏银的委托额外赏 2 两 × 接取官阶。", workMerit: 2, workCoins: 4, giftRisk: 0, favorCost: 2, commissionBonus:2 },
  {title:"赈灾急令",detail:"办差得 2 政绩、3 两；有赏银的委托额外赏 4 两 × 接取官阶。",workMerit:2,workCoins:3,giftRisk:0,favorCost:3,commissionBonus:4},
  {title:"清议兴起",detail:"办差得 3 政绩、3 两；送礼额外 +1 嫌疑，有赏银的委托额外赏 2 两 × 接取官阶。",workMerit:3,workCoins:3,giftRisk:1,favorCost:3,commissionBonus:2},
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
  const samePosts = o.group === "temples" ? g.ids.filter(id => OFFICES[id].name.split("寺")[0] === o.name.split("寺")[0]) : g.ids;
  const top = samePosts[samePosts.length - 1];
  const target = o.id !== top ? top
    : officeId(o.group === "cabinet" ? "court.2" : "cabinet.5");
  const personality = PERSONALITIES[(GROUPS.indexOf(g) + Math.floor(game.strategy.era / 2)) % PERSONALITIES.length];
  const other = (1 - seat) as Seat;
  const receiver = game.players[other]?.pos === target && sameAuthority(o.id, target) ? other : null;
  return { target, office: OFFICES[target], group: g.key, department: g.name, personality, receiver,
    name: receiver === null ? "署中主官" : game.players[receiver].name };
}
export function giftQuote(game: Game | PublicGame, seat: Seat, id: GiftId) {
  const gift = GIFTS.find(g => g.id === id);
  if (!gift) throw new Error("请选择礼物。");
  const leader = leaderAt(game, seat);
  if (!leader) throw new Error("入仕后才能拜谒主官；三公与荣归不设此玩法。");
  return { ...gift, cost: silverAt(game.players[seat].pos, gift.cost), leader, favor: gift.favor + (leader.personality.likes === id ? 1 : 0),
    risk: gift.risk + currentEdict(game).giftRisk,
    refused: leader.personality.name === "清正" && id === "treasure" };
}
function rawRollPreview(game: Game | PublicGame, seat: Seat, face: Face) {
  const p = ownPlayer(game, seat), o = OFFICES[p.pos];
  const actions = actionsAt(p.pos), base = isAcademic(p.pos)&&p.degree?appointmentAction(p.pos,face):actions[face];
  const unchanged = { action: base, effectiveFace: face, reason: "", favorCost: 0, meritCost: 0, blocked: false };
  if(face==="赃"&&p.intrigue.shield&&!isAcademic(p.pos)&&!["court","home"].includes(o.group))return {...unchanged,action:{to:p.pos,coins:0,label:"护身文书挡下本次贬职与罚银，仍按赃增加嫌疑",short:"护身留任",kind:"stay"} as Action,reason:"护身文书"};
  // At four suspicion, even a real 德 cannot advance or retire at 太师.
  if (p.risk >= 4 && o.group !== "home" && face !== "赃")
    return { ...unchanged, action: { to: p.pos, coins: 0, label: "停升待查，本次留任且无赏银", short: "停升待查", kind: "stay" } as Action, reason: "嫌疑停升", blocked: true };
  if(isAcademic(p.pos))return !p.degree&&isPalaceGate(base.to)?{...unchanged,action:{...base,to:officeId("origin.9"),label:"会试中式，进入三轮殿试",short:"殿试"}}:unchanged;
  if (p.risk >= 3 || p.recommendationBlocked || ["court", "home"].includes(o.group)) return unchanged;
  const cost = currentEdict(game).favorCost;
  const recommended = o.group !== "origin" && (p.favor[o.group] || 0) >= cost;
  const changed = (effectiveFace: Face, reason: string, meritCost = 0, favorCost = 0) =>
    actions[effectiveFace].to === base.to ? unchanged : { ...unchanged, action: actions[effectiveFace], effectiveFace, reason, meritCost, favorCost };
  if (face === "功") {
    if (hasPrepared(game) && game.strategy.prep?.seat === seat && game.strategy.prep.kind === "petition")
      return changed("德", "政绩请荐");
    if (p.merit >= 4) return recommended ? changed("德", "政绩与人情合荐", 2, cost) : changed("才", "政绩擢升", 2);
  }
  if (face === "才" && recommended) return changed("德", "主官举荐", 0, cost);
  return unchanged;
}
export function rollPreview(game: Game | PublicGame, seat: Seat, face: Face) {
  const pos = game.players[seat].pos;
  let preview = rawRollPreview(game, seat, face), landing = officeLanding(game, seat, preview.action.to);
  const base = actionsAt(pos)[face], baseLanding = officeLanding(game, seat, base.to);
  // Automatic resources are not spent when occupation erases the upgraded route.
  if ((preview.meritCost || preview.favorCost) && (landing.to === pos || landing.to === baseLanding.to)) {
    preview = { action: base, effectiveFace: face, reason: "", meritCost: 0, favorCost: 0, blocked: false };
    landing = baseLanding;
  }
  const stopped = landing.occupant !== null && landing.to === pos;
  const action = landing.occupant === null&&landing.to===preview.action.to ? preview.action : { ...preview.action, to: landing.to,
    coins: stopped ? Math.min(0, preview.action.coins) : preview.action.coins,
    label: landing.note + (stopped ? "原位候缺，本次无升迁赏银" : ""), short: OFFICES[landing.to].name,
    kind: stopped ? "stay" as const : preview.action.kind };
  return { ...preview, action, landing };
}

export function riskBand(value: number) {
  if (value >= 6) return { label: "重案查办", level: "severe", detail: "停升；考核罚最多 30 两、降两职、政绩 −4、人情清空。" };
  if (value >= 4) return { label: "停升待查", level: "danger", detail: "德才功全部留任、无赏银；考核罚最多 20 两、降一职、政绩 −2、人情清空。" };
  if (value >= 3) return { label: "举荐受阻", level: "warning", detail: "不能送礼、请荐或获升迁助力；考核罚最多 6 两、政绩 −1、各衙人情 −1。" };
  return { label: "清誉尚在", level: "safe", detail: "升迁助力正常；3 点封举荐，4 点停升，6 点重罚。" };
}
export function investigationQuote(suspicion: number, cause: "review" | "impeach" | "inspection" = "review", pos = 0) {
  const base = suspicion >= 6 ? { fine: 30, steps: 2, meritLoss: 4, riskAfter: 3 }
    : { fine: cause === "review" ? 20 : 16, steps: 1, meritLoss: 2, riskAfter: 2 };
  return { ...base, fine: silverAt(pos, base.fine) };
}
export function lowerOffice(pos: number, steps: number) {
  for (let i = 0; i < steps; i++) pos = demotionTarget(pos);
  return pos;
}
/** Shared by the forecast and server settlement; no independent UI rules. */
function rawReviewPreview(game: Game | PublicGame, seat: Seat) {
  const p = ownPlayer(game, seat), group = OFFICES[p.pos].group, favorCost = currentEdict(game).favorCost;
  const result = { kind: "steady", title: "平稳留任", to: p.pos, coins: 0, merit: 0, riskAfter: p.risk,
    favorCost: 0, favorDecay: 0, clearFavor: false, detail: "政绩未满 4，继续积累；资源保留。" };
  if (p.risk >= 4) {
    const penalty = investigationQuote(p.risk, "review", p.pos), to = lowerOffice(p.pos, penalty.steps);
    return { ...result, kind: "penalty", title: p.risk >= 6 ? "重案查办" : "考核查办", to,
      coins: -Math.min(p.coins, penalty.fine), merit: -Math.min(p.merit, penalty.meritLoss), clearFavor: true, riskAfter: penalty.riskAfter,
      detail: "罚最多 " + penalty.fine + " 两，降 " + penalty.steps + " 职至「" + OFFICES[to].name + "」，政绩 −" + penalty.meritLoss + "，人情清空；嫌疑降至 " + penalty.riskAfter + "。" };
  }
  if (p.risk === 3) return { ...result, kind: "warning", title: "考核申诫", coins: -Math.min(p.coins, silverAt(p.pos, 6)), merit: -Math.min(p.merit, 1), favorDecay: 1, riskAfter: 2,
    detail: "留任，罚最多 " + silverAt(p.pos, 6) + " 两、政绩 −1、各衙人情 −1；嫌疑降至 2，不发考绩赏。" };
  if(isAcademic(p.pos))return {...result,title:p.degree?"金榜待授官":"寒窗待试",detail:p.degree?"科甲已定，下一骰按原判词授官；不再参加科举或凭政绩跳级。":"尚未入仕，不参与政绩升迁；花 2 两修习课业可加 2 学识，学识用于殿试。"};
  if (p.merit >= 4) {
    const court = ["court", "home"].includes(group);
    const joint = !court && group !== "origin" && (p.favor[group] || 0) >= favorCost;
    const to = court ? p.pos : actionsAt(p.pos)[joint ? "德" : "才"].to;
    return { ...result, kind: "reward", title: joint ? "考绩合荐" : "考核卓异", to, coins: silverAt(p.pos, 12), merit: -4, favorCost: joint ? favorCost : 0,
      detail: "消耗 4 政绩" + (joint ? "及本衙 " + favorCost + " 人情" : "") + "，赏 " + silverAt(p.pos, 12) + " 两；" + (court ? "三公留任，仍须凭原始「德」晋升或荣归。" : "按「" + (joint ? "德" : "才") + "」迁至「" + OFFICES[to].name + "」。") };
  }
  return result;
}
export function reviewOrder(game: Game | PublicGame): Seat[] {
  const first = ((game.strategy.era + game.match - 1) % 2) as Seat;
  return [first, (1 - first) as Seat].filter(seat => !!game.players[seat]);
}
export function reviewPreviews(game: Game) {
  const verdicts = game.players.map((_, seat) => rawReviewPreview(game, seat as Seat));
  const positions = { players: game.players.map(p => ({ ...p })) };
  const results = verdicts.map(v => ({ ...v, landing: { intended: v.to, to: v.to, occupant: null, note: "" } as ReturnType<typeof officeLanding> }));
  for (const seat of reviewOrder(game)) {
    let v = verdicts[seat], landing = officeLanding(positions, seat, v.to);
    if (v.favorCost) {
      const from = positions.players[seat].pos, normalTo = actionsAt(from).才.to;
      const normal = officeLanding(positions, seat, normalTo);
      if (landing.to === from || landing.to === normal.to) {
        v = { ...v, title: "考核卓异", to: normalTo, favorCost: 0,
          detail: "消耗 4 政绩，赏 " + silverAt(from, 12) + " 两，按「才」迁至「" + OFFICES[normalTo].name + "」；合荐未增加实际去向，不扣人情。" };
        landing = normal;
      }
    }
    results[seat] = { ...v, to: landing.to, landing,
      detail: v.detail + (landing.note ? " 落位时：" + landing.note : "") };
    positions.players[seat].pos = landing.to;
  }
  return results;
}
export function reviewPreview(game: Game | PublicGame, seat: Seat) {
  if (!("viewer" in game)) return reviewPreviews(game)[seat];
  // A private forecast uses this player's resources and current public positions
  // only. Never simulate the opponent's future review from their hidden ledger.
  let v = rawReviewPreview(game, seat), landing = officeLanding(game, seat, v.to);
  if (v.favorCost) {
    const from = game.players[seat].pos, to = actionsAt(from).才.to, normal = officeLanding(game, seat, to);
    if (landing.to === from || landing.to === normal.to) {
      v = { ...v, title: "考核卓异", to, favorCost: 0, detail: "消耗 4 政绩，赏 " + silverAt(from,12) + " 两，按「才」迁职；当前占位下合荐无收益，不扣人情。" };
      landing = normal;
    }
  }
  return { ...v, to: landing.to, landing, detail: v.detail + landing.note };
}
const ASSIGNMENTS: Record<string, string> = {
  origin: "寒窗课业", county: "清理县册", state: "修缮乡学", prefecture: "巡查粮仓", capitalCounty: "巡检坊市",
  capitalPrefecture: "疏理京畿", finance: "核实钱粮", justice: "复核刑案", province: "督办河工", hanlin: "修史校书",
  censor: "稽查案牍", temples: "整饬寺务", personnel: "考订官册", revenue: "清点库藏", rites: "筹办乡试",
  war: "核验军籍", penalty: "复审疑案", works: "修渠筑堤", cabinet: "拟议章奏", court: "辅理朝政",
};
export function assignmentAt(pos: number) { return ASSIGNMENTS[OFFICES[pos].group] || "办理公事"; }
