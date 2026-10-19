"use client";
import { useState } from "react";
import { ArrowUpRight, BadgeCheck, BookOpen, Check, ChevronRight, Feather, Gift, HandCoins, HeartHandshake, Landmark, Leaf, ScrollText, Shield, Sparkles, Swords, Coffee, type LucideIcon } from "lucide-react";
import { isAcademic } from "../lib/scholar";
import type { PublicGame } from "../lib/game";
import { deskOptions, type DeskTab } from "../lib/mansion";
import { hasPrepared, leaderAt, reviewPreview, turnsToReview, type PlanInput } from "../lib/strategy";
import { commissionInfo } from "../lib/intrigue";
import SchemeDesk from "./scheme-desk";

const ACTION_ICONS: Record<string, LucideIcon> = { work:Feather, petition:ScrollText, reflect:Leaf, relief:HandCoins, support:HeartHandshake, debate:Swords, impeach:Shield, tea:Coffee, book:BookOpen, treasure:Sparkles, paperwork:Landmark, tribute:HandCoins, obstruct:Shield };

export default function CompactDesk({ game, enabled, initialTab, onPlan, onCareer, onMove }: { game: PublicGame; enabled: boolean; initialTab: DeskTab; onPlan: (plan: PlanInput) => void; onCareer?:()=>void;onMove?:(action:string,extra?:Record<string,unknown>)=>void }) {
  const [tab, setTab] = useState<DeskTab|"schemes">(initialTab), [choice, setChoice] = useState("");
  const options = tab==="schemes"?[]:deskOptions(game, tab), selected = options.find(o=>o.id===choice) ?? options[0];
  const prepared = hasPrepared(game), ownTurn = game.turn === game.viewer, leader = leaderAt(game,game.viewer);
  const review=reviewPreview(game,game.viewer);
  return <section className="compact-desk" aria-label="府内筹谋">
    <div className="desk-heading"><div><span>第 {game.moves+1} 手</span><h2>{isAcademic(game.self.pos)?"寒窗修业":"府中筹谋"}</h2></div>{onCareer&&<button onClick={onCareer}><span>{isAcademic(game.self.pos)?"学识用于殿试":turnsToReview(game)+" 手后考核"}</span><b>{isAcademic(game.self.pos)?game.self.learning+" / 12 学识":review.title}<ArrowUpRight size={13}/></b></button>}</div>
    <div className="desk-tabs" role="tablist" aria-label="府务分类">{([["work","办差",Feather],["gift","拜谒",Gift],["duel","争锋",Swords],["schemes","谋略",ScrollText]] as const).map(([id,label,Icon])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>{setTab(id);setChoice("");}}><Icon size={14}/>{label}{id==="schemes"&&<small className="scheme-count">{game.self.intrigue.hand.length}</small>}</button>)}</div>
    {tab!=="schemes"&&<p className={"desk-status "+(prepared&&ownTurn?"prepared":"")}><span className="status-dot"/>{game.self.intrigue.notice.startsWith("委托完成")?game.self.intrigue.notice:game.self.intrigue.commission?"委托「"+commissionInfo(game.self.intrigue.commission.id).title+"」进行中 · 在谋略中查看":prepared ? ownTurn ? "筹谋已定，下一步掷骰启程。" : "对方正在府内筹谋。" : ownTurn ? "先办一件事，再让骰子决定下一站。" : "静候知己落子，先看看你的下一步。"}</p>}
    {tab==="gift" && leader && <div className="desk-leader"><b>{leader.office.department} · {leader.office.name}</b><span>{leader.personality.name} · {leader.personality.description}</span></div>}
    {tab==="schemes"?<SchemeDesk game={game} enabled={enabled} onMove={onMove||(()=>{})}/>:options.length ? <><div className={"desk-options " + (tab==="gift"?"three":"")}>{options.map(o=>{const Icon=ACTION_ICONS[o.id]||Gift;return <button key={o.id} aria-pressed={selected?.id===o.id} onClick={()=>setChoice(o.id)} className={(selected?.id===o.id?"selected ":"")+(o.unavailable?"unavailable":"")}><span className="action-emblem"><Icon size={21} strokeWidth={1.5}/></span><div><b>{o.title}</b><small>{o.cost}</small></div>{selected?.id===o.id&&<Check className="action-check" size={11}/>}</button>;})}</div>
      <div className="desk-selection" role="status"><div className="selection-label"><b>{selected.title}</b><span>{selected.unavailable?"暂不可办":"此策效果"}</span></div><p>{selected.detail}</p><span>{selected.unavailable || "每回合可筹谋一次，也可直接掷骰。"}</span></div>
      <button className="primary-button desk-confirm" disabled={!enabled || prepared || !!selected.unavailable} onClick={()=>onPlan(selected.plan)}>{prepared&&ownTurn?<BadgeCheck size={16}/>:<Check size={15}/>}<span>{selected.unavailable || (!ownTurn ? "等待你的回合" : prepared ? "已完成筹谋" : "就办这件事 · " + selected.title)}</span>{enabled&&!prepared&&!selected.unavailable&&<ChevronRight size={15}/>}</button></> : <div className="desk-empty"><span className="empty-emblem"><Gift size={30} strokeWidth={1}/></span><h3>以功名为始，以人情相知。</h3><p>入仕后可向本衙主官拜谒。三公不设送礼举荐。</p><button className="secondary-button" onClick={()=>setTab("work")}>去办差经营</button></div>}
  </section>;
}
