"use client";
import { useState } from "react";
import { Gift, ScrollText, Swords } from "lucide-react";
import type { PublicGame, Seat } from "../lib/game";
import { GROUPS, OFFICES } from "../lib/board";
import { GIFTS, assignmentAt, currentEdict, giftQuote, hasPrepared, leaderAt, nextEdict, turnsToReview, type GiftId, type PlanInput } from "../lib/strategy";

export default function StrategyPanel({ game, seat, enabled, onPlan }: {
  game: PublicGame; seat: Seat; enabled: boolean; onPlan: (plan: PlanInput) => void;
}) {
  const [tab, setTab] = useState<"gift" | "work" | "duel">("gift");
  const [selected, setSelected] = useState<GiftId>("tea");
  const p = game.players[seat], other = game.players[1-seat], o = OFFICES[p.pos];
  const leader = leaderAt(game, seat), edict = currentEdict(game), used = hasPrepared(game);
  const can = enabled && !used, quote = leader ? giftQuote(game, seat, selected) : null;
  const reason = used ? "本回合已办「" + game.strategy.prep!.label + "」，接下来掷骰。" : enabled ? "掷骰前可任选一项；也可以直接掷骰。" : "轮到你时，可先筹谋一次再掷骰。";
  return <section className="strategy-card" id="strategy">
    <div className="section-heading"><ScrollText size={17}/><h3>落子之前，先谋一手</h3><span>每回合 1 次</span></div>
    <p className="strategy-help" role="status">{reason}</p>
    <div className="resource-grid">
      <div><span>银两</span><strong>{p.coins}<small> 两</small></strong></div>
      <div><span>政绩</span><strong>{p.merit}<small> / 8</small></strong></div>
      <div className={p.risk >= 3 ? "risk-alert" : ""}><span>嫌疑</span><strong>{p.risk}<small> / 6</small></strong></div>
    </div>
    <div className="edict-card"><div><b>{edict.title}</b><small>距考核 {turnsToReview(game)} 次落子</small></div><p>{edict.detail}</p>
      <details><summary>查看考核与下一期</summary><p>每 6 次落子考核双方：嫌疑 ≥4，先查办、罚最多 15 两、降一职、人情清空、嫌疑归 1；否则政绩 ≥4，消耗 4 政绩、赏 12 两，按「才」迁职（三公留任）。两次考核后主官轮调，各衙人情 -1。下一期：{nextEdict(game).title}。</p>
      {game.strategy.report.map((text,i) => <p key={i}>{text}</p>)}</details>
    </div>
    <div className="strategy-tabs" role="tablist" aria-label="筹谋类型">
      <button role="tab" aria-selected={tab === "gift"} onClick={() => setTab("gift")}><Gift size={14}/>拜谒送礼</button>
      <button role="tab" aria-selected={tab === "work"} onClick={() => setTab("work")}><ScrollText size={14}/>办差经营</button>
      <button role="tab" aria-selected={tab === "duel"} onClick={() => setTab("duel")}><Swords size={14}/>朝堂争锋</button>
    </div>
    {tab === "gift" ? <div className="strategy-pane">
      {leader && quote ? <>
        <div className="leader-card"><span className="leader-seal">拜<br/>谒</span><div><small>{leader.office.department} · 本期主官</small><h4>{leader.office.name} <em>{leader.personality.name}</em></h4><p>{leader.personality.description}</p></div></div>
        {leader.receiver !== null && <p className="receiver-note">这个官位正是{leader.name}：礼金转给 TA；含嫌疑的礼物还会使 TA 嫌疑 +1。</p>}
        <div className="favor-meter"><span>{leader.department}人情 <b>{p.favor[o.group] || 0} / 6</b></span><div><i style={{ width: (p.favor[o.group] || 0) / 6 * 100 + "%" }}/></div></div>
        <p className="strategy-help">攒 {edict.favorCost} 人情后，掷「功」且原应留任时，自动消耗人情改按「才」行进。跨衙后人情留在原衙。</p>
        <div className="gift-choices">{GIFTS.map(g => { const q = giftQuote(game, seat, g.id); return <button key={g.id} aria-pressed={selected === g.id} onClick={() => setSelected(g.id)} className={selected === g.id ? "selected" : ""}><span>{g.name}</span><b>{g.cost} 两</b><small>{q.refused ? "主官拒收" : "人情 +" + q.favor + " · 嫌疑 +" + q.risk}</small></button>; })}</div>
        <button className="primary-button" disabled={!can || quote.refused || p.coins < quote.cost || (p.favor[o.group] || 0) >= 6} onClick={() => onPlan({kind:"gift",gift:selected})}><Gift size={16}/>{quote.refused ? "主官拒收，请换礼物" : "花 " + quote.cost + " 两 · 送上" + quote.name}</button>
      </> : <div className="empty-strategy"><Gift size={26}/><h4>{o.group === "origin" ? "先取功名，再拜主官" : "位至三公，循德荣归"}</h4><p>{o.group === "origin" ? "功名阶段可以办差课业、积累政绩、参与策论；入仕后开放拜谒送礼。" : "三公不接受请荐，仍需掷出原始「德」。可办差、资助知己或参加争辩。"}</p><button className="secondary-button" onClick={() => setTab("work")}>去办差经营</button></div>}
      {Object.entries(p.favor).some(([,n]) => n > 0) && <details className="favor-ledger"><summary>我的各衙人情簿</summary>{Object.entries(p.favor).filter(([,n]) => n > 0).map(([g,n]) => <p key={g}><span>{GROUPS.find(x => x.key === g)?.name}</span><b>{n} / 6</b></p>)}</details>}
    </div> : tab === "work" ? <div className="strategy-pane action-menu">
      <button disabled={!can} onClick={() => onPlan({kind:"work"})}><b>{assignmentAt(p.pos)}</b><span>无需银两 · 政绩 +{edict.workMerit}，银两 +{edict.workCoins}</span></button>
      <button disabled={!can || p.merit < 3 || ["court","home"].includes(o.group)} onClick={() => onPlan({kind:"petition"})}><b>政绩请荐 <small>3 政绩</small></b><span>本次掷「功」改按「德」；其他结果不变，不返还投入。三公不可用。</span></button>
      <button disabled={!can || p.coins < 8} onClick={() => onPlan({kind:"relief"})}><b>赈济乡里 <small>8 两</small></b><span>政绩 +1，嫌疑 -2</span></button>
      <button disabled={!can || p.coins < 10} onClick={() => onPlan({kind:"support"})}><b>同舟相助 <small>10 两</small></b><span>转给{other.name} 10 两，双方政绩各 +1</span></button>
    </div> : <div className="strategy-pane action-menu">
      <button disabled={!can || game.moves < game.strategy.debateAfterMove} onClick={() => onPlan({kind:"debate"})}><b>发起朝堂争辩</b><span>双方暗选论策与政绩投入，再同时揭晓。胜者赏银 10 两、政绩 +2；每 6 次落子最多发起一次。</span>{game.moves < game.strategy.debateAfterMove && <small>再落子 {game.strategy.debateAfterMove - game.moves} 次可发起</small>}</button>
      <button disabled={!can || p.merit < 2 || other.risk < 3} onClick={() => onPlan({kind:"impeach"})}><b>据实参奏 <small>2 政绩</small></b><span>{other.name}当前嫌疑 {other.risk} / 6。达到 3 可查办：罚最多 12 两、降一职、人情清空、嫌疑 -3。</span></button>
      <p className="strategy-help">未入仕也可作为策士献策。输掉争辩不降职，依然可以继续掷骰。</p>
    </div>}
  </section>;
}
