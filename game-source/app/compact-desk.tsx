"use client";
import { useState } from "react";
import type { PublicGame } from "../lib/game";
import { deskOptions, type DeskTab } from "../lib/mansion";
import { hasPrepared, leaderAt, type PlanInput } from "../lib/strategy";

export default function CompactDesk({ game, enabled, initialTab, onPlan }: { game: PublicGame; enabled: boolean; initialTab: DeskTab; onPlan: (plan: PlanInput) => void }) {
  const [tab, setTab] = useState<DeskTab>(initialTab), [choice, setChoice] = useState("");
  const options = deskOptions(game, tab), selected = options.find(o=>o.id===choice) ?? options[0];
  const prepared = hasPrepared(game), ownTurn = game.turn === game.viewer, leader = leaderAt(game,game.viewer);
  return <section className="compact-desk" aria-label="府内筹谋">
    <div className="desk-tabs" role="tablist" aria-label="府务分类">{([["work","办差经营"],["gift","拜谒送礼"],["duel","朝堂争锋"]] as const).map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>{setTab(id);setChoice("");}}>{label}</button>)}</div>
    <p className="desk-status">{prepared ? ownTurn ? "本回合已筹谋，点下方掷骰。" : "对方正在府内筹谋。" : ownTurn ? "掷骰前可办一件事，也可直接掷骰。" : "静候对方 · 可以先查看你的关系与仕途。"}</p>
    {tab==="gift" && leader && <div className="desk-leader"><b>{leader.office.department} · {leader.office.name}</b><span>{leader.personality.name} · {leader.personality.description}</span></div>}
    {options.length ? <><div className={"desk-options " + (tab==="gift"?"three":"")}>{options.map(o=><button key={o.id} aria-pressed={selected?.id===o.id} onClick={()=>setChoice(o.id)} className={selected?.id===o.id?"selected":""}><b>{o.title}</b><small>{o.cost}</small></button>)}</div>
      <div className="desk-selection" role="status"><b>{selected.title}</b><p>{selected.detail}</p><span>{selected.unavailable || "每回合一次 · 执行后再掷骰"}</span></div>
      <button className="primary-button desk-confirm" disabled={!enabled || prepared || !!selected.unavailable} onClick={()=>onPlan(selected.plan)}>{selected.unavailable || (!ownTurn ? "等待你的回合" : prepared ? "已完成筹谋" : "确认 · " + selected.title)}</button></> : <div className="desk-empty"><span>尚未结交主官</span><h3>以功名为始，以人情相知。</h3><p>入仕后可向本衙主官拜谒。三公不设送礼举荐。</p><button className="secondary-button" onClick={()=>setTab("work")}>去办差经营</button></div>}
  </section>;
}
