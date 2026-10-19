import { FACES, OFFICES, actionsAt, HOME_ID, LEGACY_MAP } from "./board";
import type { Face } from "./board";
import { assignmentAt, currentEdict, demotionTarget, giftQuote, hasPrepared, investigationQuote, lowerOffice, reviewPreviews, rollPreview, type PlanInput } from "./strategy";
import { HASSLES, exclusiveOffice, hassleAvailability, hierarchy, officeLanding, sameAuthority, type HassleKind, type HassleChoice } from "./offices";
import { EVENTS, STANCES, TOPICS, eventDefinition, type EventId, type DebateBid } from "./encounters";
export { FACES, OFFICES, actionsAt } from "./board";
export type { Face, Action } from "./board";
export type Seat = 0 | 1;
export interface Player { name: string; pos: number; coins: number; tokenHash: string; lastSeen: number;
  merit: number; risk: number; favor: Record<string, number>; recommendationBlocked: boolean }
export interface Entry { id: number; seat: Seat | null; face?: Face; text: string; at: number }
export interface Game {
  rulesVersion: 5;
  players: Player[]; status: "waiting" | "playing" | "finished";
  turn: Seat; winner: Seat | null; round: number; moves: number; match: number;
  lastRoll: { face: Face; effectiveFace?: Face; reason?: string; occupancyNote?: string; seat: Seat; from: number; to: number; at: number } | null;
  logs: Entry[]; rematch: Seat[]; reactions: { seat: Seat; text: string; at: number }[];
  strategy: { prep: { move: number; seat: Seat; kind: PlanInput["kind"]; label: string } | null;
    era: number; eraStart: number; report: string[]; debateAfterMove: number; hassleAfterMove: number };
  hassle: { id: string; kind: HassleKind; senior: Seat; junior: Seat; department: string } | null;
  event: { id: string; kind: EventId; seat: Seat } | null;
  debate: { id: string; topic: number; initiator: Seat; bids: Partial<Record<Seat, DebateBid>> } | null;
  lastDebate: { title: string; text: string; bids?: DebateBid[]; scores?: number[] } | null;
}
export type PublicGame = Omit<Game, "players" | "debate"> & { players: Omit<Player, "tokenHash">[];
  debate: (Omit<NonNullable<Game["debate"]>, "bids"> & { ready: boolean[] }) | null };
export function cleanName(name: unknown): string {
  if (typeof name !== "string") throw new Error("请先写下你的名字。");
  const value = name.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!value || [...value].length > 12) throw new Error("名字请填写 1–12 个字。");
  return value;
}
export function makePlayer(name: string, tokenHash = "", now = Date.now()): Player {
  return { name: cleanName(name), tokenHash, pos: 0, coins: 20, lastSeen: now, merit: 0, risk: 0, favor: {}, recommendationBlocked: false };
}
export function newGame(player: Player, now = Date.now()): Game {
  return { rulesVersion: 5, players: [player], status: "waiting", turn: 0, winner: null,
    round: 1, moves: 0, match: 1, lastRoll: null, rematch: [], reactions: [],
    strategy: { prep: null, era: 0, eraStart: 0, report: [], debateAfterMove: 0, hassleAfterMove: 0 },
    event: null, debate: null, lastDebate: null, hassle: null,
    logs: [{ id: 0, seat: 0, text: player.name + "铺开棋盘，静候知己。", at: now }] };
}
export function publicGame(game: Game): PublicGame {
  const { debate, ...rest } = game;
  // Never serialize sealed choices or stakes before both players have committed.
  return { ...rest, players: game.players.map(({ tokenHash: _tokenHash, ...p }) => p),
    debate: debate ? { id: debate.id, topic: debate.topic, initiator: debate.initiator, ready: [!!debate.bids[0], !!debate.bids[1]] } : null };
}
function log(game: Game, seat: Seat | null, text: string, now: number, face?: Face) {
  game.logs.unshift({ id: (game.logs[0]?.id ?? 0) + 1, seat, text, at: now, ...(face ? { face } : {}) });
  game.logs = game.logs.slice(0, 60);
}
export function addPlayer(game: Game, player: Player, now = Date.now()): Game {
  if (game.players.length >= 2) throw new Error("这间雅间已有两位棋友。");
  if (game.status !== "waiting") throw new Error("本局已经开始。");
  const next = structuredClone(game);
  next.players.push(player);
  next.status = "playing";
  log(next, 1, player.name + "入席。两位从白丁起步，先荣归者胜。", now);
  return next;
}
function requireTurn(game: Game, seat: Seat) {
  if (game.status !== "playing") throw new Error("请等待两位棋友入席，或开始新一局。");
  if (game.event || game.debate || game.hassle) throw new Error("请先处理眼前的遭遇、朝堂争辩或同衙刁难。");
  if (game.turn !== seat) throw new Error("还没轮到你，请等对方落子。");
}
function merit(p: Player, amount: number) { p.merit = Math.min(8, Math.max(0, p.merit + amount)); }
function risk(p: Player, amount: number) { p.risk = Math.min(6, Math.max(0, p.risk + amount)); }
function pay(p: Player, amount: number) {
  if (p.coins < amount) throw new Error("银两不足，可以先办差赚取银两。");
  p.coins -= amount;
}
function spendMerit(p: Player, amount: number) {
  if (p.merit < amount) throw new Error("政绩不足，先办差或掷出「功」积累吧。");
  p.merit -= amount;
}
function meeting(game: Game, seat: Seat, from: number, now: number) {
  const p = game.players[seat], other = game.players[1 - seat];
  if (p.pos === from || p.pos === other.pos || !sameAuthority(p.pos, other.pos)) return;
  const [junior, senior] = OFFICES[p.pos].order < OFFICES[other.pos].order ? [p, other] : [other, p];
  const amount = Math.min(10, junior.coins);
  junior.coins -= amount; senior.coins += amount;
  log(game, seat, "同衙相逢：" + junior.name + "向" + senior.name + "送见面礼 " + amount + " 两（不加人情或嫌疑）。", now);
}
export function prepare(game: Game, seat: Seat, input: PlanInput, now = Date.now()): Game {
  requireTurn(game, seat);
  if (hasPrepared(game)) throw new Error("这回合已经筹谋过了，接下来掷骰吧。");
  if (!input || typeof input !== "object") throw new Error("请选择一项筹谋。");
  const next = structuredClone(game), p = next.players[seat], other = next.players[1 - seat];
  const edict = currentEdict(next);
  let label: string;
  if (input.kind === "gift") {
    if (p.risk >= 3) throw new Error("嫌疑已达 3，主官暂避往来。先自省或赈济降低嫌疑。");
    const q = giftQuote(next, seat, input.gift!);
    if (q.refused) throw new Error("这位主官清正，拒收珍玩。未扣银两，请换一份礼物或办差。");
    if ((p.favor[q.leader.group] || 0) >= 6) throw new Error("本衙人情已满 6 点，先让主官举荐吧。");
    pay(p, q.cost);
    const added = Math.min(q.favor, 6 - (p.favor[q.leader.group] || 0));
    p.favor[q.leader.group] = (p.favor[q.leader.group] || 0) + added;
    risk(p, q.risk);
    let received = "";
    if (q.leader.receiver !== null) {
      other.coins += q.cost;
      if (q.risk > 0) risk(other, 1);
      received = "礼金转给" + other.name + (q.risk > 0 ? "，对方嫌疑 +1" : "") + "。";
    }
    label = "拜谒 · " + q.name;
    log(next, seat, p.name + "花 " + q.cost + " 两向" + q.leader.office.department + "·" + q.leader.office.name +
      "送上「" + q.name + "」，" + q.leader.department + "人情 +" + added + "，嫌疑 +" + q.risk + "。" + received, now);
  } else if (input.kind === "work") {
    merit(p, edict.workMerit); p.coins += edict.workCoins;
    label = assignmentAt(p.pos);
    log(next, seat, p.name + "办理「" + label + "」，政绩 +" + edict.workMerit + "（上限 8），银两 +" + edict.workCoins + "。", now);
  } else if (input.kind === "petition") {
    if (["court", "home"].includes(OFFICES[p.pos].group)) throw new Error("三公需凭原始「德」晋升，不能请荐。");
    if (p.risk >= 3) throw new Error("嫌疑已达 3，请荐受阻。先自省或赈济降低嫌疑。");
    if (p.recommendationBlocked) throw new Error("荐书被压，本次掷骰不能请荐；掷骰后解除。");
    spendMerit(p, 3); label = "政绩请荐";
    log(next, seat, p.name + "花 3 政绩请荐：本次若掷出「功」，改按「德」判词行进；其余骰面不变，不退政绩。", now);
  } else if (input.kind === "relief") {
    pay(p, 8); merit(p, 1); risk(p, -2); label = "赈济乡里";
    log(next, seat, p.name + "出资 8 两赈济乡里，政绩 +1、嫌疑 -2（最低为 0）。", now);
  } else if (input.kind === "reflect") {
    if (p.risk === 0) throw new Error("目前没有嫌疑，无需自省。");
    risk(p, -2); merit(p, -1); label = "闭门自省";
    log(next, seat, p.name + "暂停经营、闭门自省：不花银两，嫌疑 -2、政绩 -1（最低为 0）。", now);
  } else if (input.kind === "support") {
    pay(p, 10); other.coins += 10; merit(p, 1); merit(other, 1); label = "同舟相助";
    log(next, seat, p.name + "把 10 两交给" + other.name + "应急，两人各得 1 政绩。", now);
  } else if (input.kind === "impeach") {
    if (other.risk < 3) throw new Error("对方嫌疑未到 3，证据不足，不能参奏。");
    spendMerit(p, 2); const before = other.pos, penalty = investigationQuote(other.risk, "impeach"), fine = Math.min(penalty.fine, other.coins);
    const landing = officeLanding(next, (1 - seat) as Seat, lowerOffice(other.pos, penalty.steps));
    other.coins -= fine; other.pos = landing.to; merit(other, -penalty.meritLoss); other.risk = penalty.riskAfter; other.favor = {};
    label = "据实参奏";
    log(next, seat, p.name + "花 2 政绩参奏：" + other.name + "被罚 " + fine + " 两、降 " + penalty.steps + " 职至" + OFFICES[other.pos].department + "·" + OFFICES[other.pos].name + "，政绩 -" + penalty.meritLoss + "、人情清空、嫌疑降至 " + penalty.riskAfter + "。", now);
    if (landing.note) log(next, (1 - seat) as Seat, landing.note, now);
    meeting(next, (1 - seat) as Seat, before, now);
  } else if (input.kind === "hassle") {
    const unavailable = hassleAvailability(next, seat);
    if (unavailable) throw new Error(unavailable);
    const type = HASSLES.find(h => h.id === input.hassle);
    if (!type) throw new Error("请选择一种刁难方式。");
    if (type.id === "obstruct" && other.recommendationBlocked) throw new Error("对方荐书已被压住，不能重复施加。");
    const relation = hierarchy(next)!;
    spendMerit(p, 1); risk(p, 1); label = "同衙刁难 · " + type.title;
    next.hassle = { id: next.match + ":" + next.moves + ":hassle", kind: type.id, ...relation };
    next.strategy.hassleAfterMove = next.moves + 6;
    log(next, seat, p.name + "在" + relation.department + "向下级" + other.name + "发出「" + type.title + "」：自身政绩 -1、嫌疑 +1。等待下级应对。", now);
  } else if (input.kind === "debate") {
    if (next.moves < next.strategy.debateAfterMove) throw new Error("朝堂才议过一场，稍后再议。");
    const topic = (next.moves + next.match - 1) % TOPICS.length;
    next.debate = { id: next.match + ":" + next.moves + ":debate", topic, initiator: seat, bids: {} };
    next.strategy.debateAfterMove = next.moves + 6;
    label = "朝堂争辩";
    log(next, seat, p.name + "发起朝堂争辩「" + TOPICS[topic].title + "」。双方密封论策，提交后一起揭晓。", now);
  } else throw new Error("未知的筹谋方式。");
  next.strategy.prep = { move: game.moves, seat, kind: input.kind, label };
  p.lastSeen = now;
  return next;
}
function review(game: Game, now: number) {
  if (game.moves - game.strategy.eraStart < 6) return;
  const reports: string[] = [];
  // Determine both verdicts from the same snapshot before resolving meeting fees.
  const before = game.players.map(p => p.pos);
  const verdicts = reviewPreviews(game);
  for (const [seat, p] of game.players.entries()) {
    const verdict = verdicts[seat], group = OFFICES[p.pos].group;
    p.pos = verdict.to; p.coins += verdict.coins; merit(p, verdict.merit); p.risk = verdict.riskAfter;
    if (verdict.clearFavor) p.favor = {};
    else {
      if (verdict.favorCost) p.favor[group] -= verdict.favorCost;
      if (verdict.favorDecay) for (const key of Object.keys(p.favor)) p.favor[key] = Math.max(0, p.favor[key] - verdict.favorDecay);
    }
    const text = p.name + verdict.title + "：" + verdict.detail + "现有 " + p.coins + " 两、" + p.merit + " 政绩。";
    reports.push(text); log(game, null, text, now);
  }
  // Charge at most one meeting when both are simultaneously reviewed.
  if (game.players[0].pos !== before[0]) meeting(game, 0, before[0], now);
  else if (game.players[1].pos !== before[1]) meeting(game, 1, before[1], now);
  game.strategy.era++;
  game.strategy.eraStart = game.moves;
  if (game.strategy.era % 2 === 0) {
    for (const p of game.players) for (const key of Object.keys(p.favor)) p.favor[key] = Math.max(0, p.favor[key] - 1);
    const notice = "主官轮调：各衙人情 -1，主官喜好更替。";
    reports.push(notice); log(game, null, notice, now);
  }
  game.strategy.report = reports;
  log(game, null, "新一期朝局：「" + currentEdict(game).title + "」。" + currentEdict(game).detail, now);
}
export function roll(game: Game, seat: Seat, face: Face, now = Date.now(), eventDraw = 999): Game {
  requireTurn(game, seat);
  if (game.status !== "playing") throw new Error("请等待两位棋友入席。");
  if (game.turn !== seat) throw new Error("还没轮到你，等对方掷骰吧。");
  if (!FACES.includes(face)) throw new Error("无效的骰面。");
  const next = structuredClone(game);
  const player = next.players[seat];
  const from = player.pos;
  const resolution = rollPreview(next, seat, face), action = resolution.action;
  if (resolution.favorCost) player.favor[OFFICES[from].group] -= resolution.favorCost;
  if (resolution.meritCost) spendMerit(player, resolution.meritCost);
  player.pos = action.to; player.recommendationBlocked = false;
  player.coins = Math.max(0, player.coins + action.coins);
  if (action.tribute) {
    const other = next.players[1 - seat];
    const tribute = Math.min(action.tribute, other.coins);
    other.coins -= tribute; player.coins += tribute;
    if (tribute > 0) risk(player, 1);
    log(next, seat, "高位索贿：" + other.name + "交出 " + tribute + " 两给" + player.name + "。", now);
  }
  player.lastSeen = now;
  next.moves++;
  next.round = Math.floor(next.moves / 2) + 1;
  if (face === "功") merit(player, 1);
  if (face === "赃" && OFFICES[from].group !== "origin" && !action.tribute) risk(player, 1);
  next.lastRoll = { face, effectiveFace: resolution.effectiveFace, reason: resolution.reason, occupancyNote: resolution.landing.note, seat, from, to: player.pos, at: now };
  log(next, seat, player.name + "掷出「" + face + "」" + (resolution.reason ? "，" + resolution.reason +
    (resolution.meritCost ? "，消耗 " + resolution.meritCost + " 政绩" : "") +
    (resolution.favorCost ? "，消耗 " + resolution.favorCost + " 人情" : "") + (resolution.blocked ? "" : "，按「" + resolution.effectiveFace + "」行进") : "") + "：" + action.label + "。" +
    (face === "功" ? "政绩 +1（上限 8）。" : "") + (face === "赃" && OFFICES[from].group !== "origin" && !action.tribute ? "嫌疑 +1（上限 6）。" : ""), now, face);
  // A newly reached office triggers a meeting; remaining in office never charges twice.
  meeting(next, seat, from, now);
  next.strategy.prep = null;
  if (player.pos === HOME_ID) {
    next.status = "finished"; next.winner = seat;
    log(next, seat, player.name + "荣归故里，赢下这局！下一局，再与你同游。", now);
  } else {
    review(next, now); next.turn = (1 - seat) as Seat;
    if (!Number.isInteger(eventDraw) || eventDraw < 0 || eventDraw > 999) throw new Error("事件抽取无效。");
    if (eventDraw < 300) {
      const event = EVENTS[Math.floor(eventDraw / 50)];
      next.event = { id: next.match + ":" + next.moves + ":" + event.id, kind: event.id, seat };
      log(next, seat, player.name + "遇到「" + event.title + "」，须先作出选择。", now);
    }
  }
  return next;
}

export function resolveEvent(game: Game, seat: Seat, eventId: string, choiceId: string, now = Date.now()): Game {
  if (game.status !== "playing" || !game.event || game.event.id !== eventId) throw new Error("这件事已处理，请同步棋局。");
  const next = structuredClone(game), event = next.event!, p = next.players[event.seat];
  if (choiceId === "assist") {
    if (seat === event.seat || event.kind !== "literary") throw new Error("这次不能代为援手。");
    const helper = next.players[seat]; pay(helper, 8); merit(helper, 1); merit(p, 1);
    log(next, seat, helper.name + "花 8 两替" + p.name + "寻回原稿，笔祸平息，两人各得 1 政绩。", now);
    next.event = null; return next;
  }
  if (seat !== event.seat) throw new Error("让当事人自己作决定吧。");
  const def = eventDefinition(event.kind), choice = def.choices.find(c => c.id === choiceId);
  if (!choice) throw new Error("请选择事件中的应对方式。");
  pay(p, choice.coins); spendMerit(p, choice.merit);
  const before = p.pos;
  if (event.kind === "literary") {
    if (choiceId === "defend") risk(p, -1);
    if (choiceId === "withdraw") p.pos = demotionTarget(p.pos);
  } else if (event.kind === "flood") {
    if (choiceId === "fund") merit(p, 3);
    if (choiceId === "organize") merit(p, 1);
    if (choiceId === "pocket") { p.coins += 12; risk(p, 2); }
  } else if (event.kind === "letter") {
    if (choiceId === "retrieve") merit(p, 2);
    if (choiceId === "rewrite") merit(p, 1);
    if (choiceId === "blame") { p.coins += 8; risk(p, 1); }
  } else if (event.kind === "surplus") {
    if (choiceId === "keep") p.coins += 10;
    if (choiceId === "donate") { merit(p, 2); risk(p, -1); }
    if (choiceId === "skim") { p.coins += 18; risk(p, 2); }
  } else if (event.kind === "banquet") {
    const group = OFFICES[p.pos].group;
    if (choiceId === "visit") {
      if (["origin", "court", "home"].includes(group)) merit(p, 1);
      else p.favor[group] = Math.min(6, (p.favor[group] || 0) + 2);
    }
    if (choiceId === "verse") merit(p, 2);
    if (choiceId === "together") for (const player of next.players) { merit(player, 1); player.coins += 4; }
  } else if (event.kind === "inspection") {
    if (choiceId === "records" || choiceId === "check") risk(p, -2);
    if (choiceId === "wait") {
      if (p.risk >= 3) {
        const penalty = investigationQuote(p.risk, "inspection");
        p.coins = Math.max(0, p.coins - penalty.fine); p.pos = lowerOffice(p.pos, penalty.steps);
        merit(p, -penalty.meritLoss); p.risk = penalty.riskAfter; p.favor = {};
      }
      else { p.coins += 6; merit(p, 1); }
    }
  }
  const landing = officeLanding(next, seat, p.pos); p.pos = landing.to;
  log(next, seat, p.name + "在「" + def.title + "」选择「" + choice.title + "」。现有 " + p.coins + " 两、" + p.merit + " 政绩、" + p.risk + " 嫌疑" + (p.pos !== before ? "，转至" + OFFICES[p.pos].name : "") + "。" + landing.note, now);
  meeting(next, seat, before, now);
  next.event = null; p.lastSeen = now;
  return next;
}
export function resolveHassle(game: Game, seat: Seat, id: string, choice: HassleChoice, now = Date.now()): Game {
  if (game.status !== "playing" || !game.hassle || game.hassle.id !== id) throw new Error("这次刁难已结束，请同步棋局。");
  const h = game.hassle;
  if (choice === "withdraw" ? seat !== h.senior : seat !== h.junior) throw new Error("只能由当事下级应对，或由发起的上级撤回。");
  const next = structuredClone(game), senior = next.players[h.senior], junior = next.players[h.junior];
  let text: string;
  if (choice === "withdraw") text = senior.name + "撤回刁难；已付政绩、嫌疑及本回合筹谋不返还。";
  else if (choice === "favor") {
    const group = OFFICES[junior.pos].group;
    if ((junior.favor[group] || 0) < 2) throw new Error("本衙人情不足 2，可选择照办或申诉。");
    junior.favor[group] -= 2; text = junior.name + "消耗 2 本衙人情托人斡旋，化解刁难。";
  } else if (choice === "appeal") {
    spendMerit(junior, 2); risk(senior, 2); merit(senior, -1);
    text = junior.name + "花 2 政绩据理申诉，刁难撤销；" + senior.name + "滥权露出破绽，嫌疑 +2、政绩 -1。";
  } else if (choice === "comply") {
    if (h.kind === "paperwork") { const loss = Math.min(2, junior.merit); merit(junior, -2); text = junior.name + "加班补办差事，政绩 -" + loss + "。"; }
    else if (h.kind === "tribute") { const amount = Math.min(6, junior.coins); junior.coins -= amount; senior.coins += amount; text = junior.name + "向" + senior.name + "交出 " + amount + " 两孝敬，往来已记入本局小记。"; }
    else { junior.recommendationBlocked = true; text = junior.name + "的荐书被压：下次本人掷骰不享受政绩、人情或请荐助力；普通判词与考核照常，掷骰后自动解除。"; }
  } else throw new Error("请选择照办、托人斡旋或据理申诉。");
  next.hassle = null; next.players[seat].lastSeen = now;
  log(next, seat, text + "继续由" + senior.name + "掷骰；下级自己的筹谋次数保留。", now);
  return next;
}
export function submitDebate(game: Game, seat: Seat, id: string, bid: DebateBid | null, now = Date.now()): Game {
  if (game.status !== "playing" || !game.debate || game.debate.id !== id) throw new Error("这场争辩已结束，请同步棋局。");
  if (game.debate.bids[seat]) throw new Error("论策已经封存，不能改选。");
  const next = structuredClone(game), d = next.debate!, topic = TOPICS[d.topic];
  if (bid === null) {
    const text = next.players[seat].name + "选择暂不争辩；不扣双方政绩，发起者本回合的筹谋仍已用过。";
    next.lastDebate = { title: topic.title, text }; next.debate = null; log(next, seat, text, now); return next;
  }
  if (!bid || !STANCES.some(s => s.id === bid.stance) || !Number.isInteger(bid.stake) || bid.stake < 0 || bid.stake > 2)
    throw new Error("请选择论策，并投入 0–2 政绩。");
  if (next.players[seat].merit < bid.stake) throw new Error("政绩不足，请降低投入。");
  // Hold costs until reveal, so the first sealed stake cannot be inferred from balances.
  d.bids[seat] = { stance: bid.stance, stake: bid.stake };
  if (d.bids[0] && d.bids[1]) {
    const bids = [d.bids[0], d.bids[1]];
    const scores = bids.map((b, i) => b.stake + (STANCES.find(s => s.id === b.stance)!.beats === bids[1-i].stance ? 2 : 0) +
      ((topic.expert as readonly string[]).includes(OFFICES[next.players[i].pos].group) ? 1 : 0));
    for (let i = 0; i < 2; i++) spendMerit(next.players[i], bids[i].stake);
    let text: string;
    if (scores[0] === scores[1]) {
      for (const p of next.players) { merit(p, 1); p.coins += 4; }
      text = "两说并存，双方各得 1 政绩、4 两。";
    } else {
      const winner = scores[0] > scores[1] ? 0 : 1, p = next.players[winner];
      merit(p, 2); p.coins += 10; merit(next.players[1-winner], 1);
      const group = OFFICES[p.pos].group;
      if (!["origin", "court", "home"].includes(group)) p.favor[group] = Math.min(6, (p.favor[group] || 0) + 1);
      text = p.name + "论策获采，赏 10 两、政绩 +2，入仕者本衙人情 +1；另一方政绩 +1。";
    }
    text = next.players[0].name + " " + scores[0] + " 分，" + next.players[1].name + " " + scores[1] + " 分。" + text;
    next.lastDebate = { title: topic.title, bids, scores, text };
    next.debate = null; log(next, null, "「" + topic.title + "」揭晓：" + text, now);
  }
  return next;
}
export const REACTIONS = ["承让承让", "等我追上你", "为你喝彩", "手下留情"] as const;
export function react(game: Game, seat: Seat, text: string, now = Date.now()): Game {
  if (!(REACTIONS as readonly string[]).includes(text)) throw new Error("请选择棋盘上的传情短句。");
  const last = game.reactions.find(r => r.seat === seat);
  if (last && now - last.at < 2500) throw new Error("让信笺飞一会儿。");
  const next = structuredClone(game);
  next.reactions = [{ seat, text, at: now }, ...next.reactions].slice(0, 4);
  return next;
}
export function requestRematch(game: Game, seat: Seat, now = Date.now()): Game {
  if (game.status !== "finished") throw new Error("请先完成当前这局。");
  const next = structuredClone(game);
  if (!next.rematch.includes(seat)) next.rematch.push(seat);
  if (next.rematch.length === 2) {
    const reset = addPlayer(newGame(makePlayer(next.players[0].name, next.players[0].tokenHash, now), now),
      makePlayer(next.players[1].name, next.players[1].tokenHash, now), now);
    reset.match = game.match + 1;
    reset.turn = ((reset.match - 1) % 2) as Seat;
    return reset;
  }
  return next;
}

export function upgradeGame(game: Game): Game {
  if (game.rulesVersion === 5) return game;
  const next = structuredClone(game);
  const oldVersion = game.rulesVersion as number;
  if (oldVersion !== 3 && oldVersion !== 4) {
    if (oldVersion !== 2) {
      next.players = next.players.map(p => ({ ...p, pos: LEGACY_MAP[p.pos] ?? 0 }));
      if (next.lastRoll) next.lastRoll = { ...next.lastRoll, from: LEGACY_MAP[next.lastRoll.from] ?? 0, to: LEGACY_MAP[next.lastRoll.to] ?? 0 };
    }
    next.players = next.players.map(p => ({ ...p, merit: 0, risk: 0, favor: {} }));
    next.strategy = { prep: null, era: 0, eraStart: next.moves, report: [], debateAfterMove: next.moves, hassleAfterMove: next.moves };
    next.event = null; next.debate = null; next.lastDebate = null;
    log(next, null, "旧图已迁移，保留官职、银两与回合；新增谋略资源从 0 起，6 次落子后首次考核。", next.logs[0]?.at ?? 0);
  }
  next.rulesVersion = 5; next.hassle = null; next.strategy.hassleAfterMove = next.moves;
  next.players = next.players.map(p => ({ ...p, recommendationBlocked: false }));
  const [a, b] = next.players;
  if (b && a.pos === b.pos && exclusiveOffice(a.pos)) {
    const last = next.lastRoll;
    const newcomer = last?.to === a.pos && last.from !== last.to ? last.seat : (next.match % 2) as Seat;
    const landing = officeLanding(next, newcomer, next.players[newcomer].pos);
    next.players[newcomer].pos = landing.to;
    log(next, newcomer, "旧局同职整理：" + landing.note + "依据最近到任记录判定；记录不足时本局先手保留原位。不补收见面礼或扣资源。", next.logs[0]?.at ?? 0);
  }
  log(next, null, "中央高位启用卡位与同衙刁难：地方官可同格、视为不同地方任职，不触发双方同衙送礼；旧局资源与已付筹谋保留。", next.logs[0]?.at ?? 0);
  return next;
}
