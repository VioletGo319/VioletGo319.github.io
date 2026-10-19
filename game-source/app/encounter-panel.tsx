"use client";
import { useEffect, useState } from "react";
import { Feather, LockKeyhole, ScrollText, Swords } from "lucide-react";
import type { PublicGame, Seat } from "../lib/game";
import { OFFICES } from "../lib/board";
import { STANCES, TOPICS, eventDefinition, type StanceId } from "../lib/encounters";

export default function EncounterPanel({ game, seat, isLocal, enabled, onMove }: {
  game: PublicGame; seat: Seat; isLocal: boolean; enabled: boolean;
  onMove: (action: string, extra: Record<string, unknown>) => void;
}) {
  const [stance, setStance] = useState<StanceId | null>(null), [stake, setStake] = useState(0), [covered, setCovered] = useState(true);
  useEffect(() => { setStance(null); setStake(0); setCovered(true); }, [game.debate?.id, seat]);
  if (game.event) {
    const ev = game.event, def = eventDefinition(ev.kind), p = game.players[ev.seat], mine = seat === ev.seat;
    return <section className={"encounter-card event-" + ev.kind} aria-label="随机事件">
      <div className="section-heading"><ScrollText size={18}/><span>随机事件 · {def.tag}</span></div><h2>{def.title}</h2><p className="encounter-story">{def.story}</p>
      <div className="encounter-owner">当事人：{p.name} · {p.coins} 两 · {p.merit} 政绩</div>
      {mine ? <><div className="action-menu">{def.choices.map(choice => <button key={choice.id} disabled={!enabled || p.coins < choice.coins || p.merit < choice.merit} onClick={() => onMove("event",{eventId:ev.id,choice:choice.id})}><b>{choice.title}</b><span>{choice.detail}</span></button>)}</div>
        {ev.kind === "literary" && !isLocal && <p className="strategy-help">对方可花 8 两替你查证；也可直接选上面的方案，无需等待。</p>}</> : <><p className="notice">正在等{p.name}选择，处理后轮到你落子。</p>
        {ev.kind === "literary" && <button className="primary-button" disabled={!enabled || game.players[seat].coins < 8} onClick={() => onMove("event",{eventId:ev.id,choice:"assist"})}>花 8 两替 TA 查证 · 双方政绩 +1</button>}</>}
      <p className="fine-print">架空遭遇 · 处理事件不消耗筹谋次数 · 资源变化均有上限</p>
    </section>;
  }
  if (game.debate) {
    const d = game.debate, topic = TOPICS[d.topic], p = game.players[seat];
    const ready = d.ready[seat], expert = (topic.expert as readonly string[]).includes(OFFICES[p.pos].group);
    return <section className="encounter-card debate-card" aria-label="朝堂争辩">
      <div className="section-heading"><Swords size={18}/><span>朝堂争辩 · 双方密封论策</span></div><h2>{topic.title}</h2>
      <p className="encounter-story">{topic.question}</p>
      <div className="debate-readiness">{game.players.map((p,i) => <span key={i}><LockKeyhole size={12}/>{p.name} · {d.ready[i] ? "已封存" : "待进言"}</span>)}</div>
      {isLocal && covered ? <div className="handoff-cover"><Feather size={28}/><h3>请把手机交给{p.name}</h3><p>上一份论策已隐藏，请各自选好后再交还。</p><button className="primary-button" onClick={() => setCovered(false)}>我是{p.name}，开始进言</button></div> : ready ? <div className="notice">你的论策已封存，等待对方。揭晓前不显示双方论策与投入，也不提前扣政绩。</div> : <>
        <p className="strategy-help">{p.name}执策 · 可用政绩 {p.merit}{expert ? " · 本官署专长 +1 分" : " · 本官署无专长加分"}</p>
        <div className="stance-choices">{STANCES.map((s,i) => <button key={s.id} className={stance === s.id ? "selected" : ""} aria-pressed={stance === s.id} onClick={() => setStance(s.id)} disabled={!enabled}><b>{s.title}</b><q>{topic.lines[i]}</q><small>{s.detail}</small></button>)}</div>
        <div className="stake-control"><span>投入政绩</span><div>{[0,1,2].map(n => <button key={n} aria-pressed={stake === n} className={stake === n ? "selected" : ""} disabled={!enabled || p.merit < n} onClick={() => setStake(n)}>{n}</button>)}</div></div>
        <button className="primary-button" disabled={!enabled || !stance || p.merit < stake} onClick={() => onMove("debate",{debateId:d.id,bid:{stance,stake}})}><LockKeyhole size={15}/>封存论策 · 投入 {stake} 政绩</button>
        <button className="text-button decline-debate" disabled={!enabled} onClick={() => onMove("debate",{debateId:d.id,bid:null})}>暂不争辩，继续这一回合</button>
      </>}
      <details className="duel-rules"><summary>如何计分？</summary><p>得分 = 投入政绩 + 克制对手 2 分 + 官署专长 1 分。典章克民情、民情克实务、实务克典章；同策不加克制分。双方揭晓时都扣除投入。胜者 +2 政绩、10 两，入仕者本衙人情 +1；另一方 +1 政绩。平局各 +1 政绩、4 两。相应官署专长：{[...new Set(OFFICES.filter(o => (topic.expert as readonly string[]).includes(o.group)).map(o => o.department))].join("、")}。这是游戏博弈规则，不是史实或观点正确性的判断。</p></details>
    </section>;
  }
  if (game.lastDebate) {
    const last = game.lastDebate;
    return <details className="debate-result"><summary>上场廷议 · {last.title}</summary><p>{last.text}</p>{last.bids?.map((b,i) => <p key={i}>{game.players[i].name}：{STANCES.find(s => s.id === b.stance)?.title} · 投入 {b.stake} · {last.scores?.[i]} 分</p>)}</details>;
  }
  return null;
}
