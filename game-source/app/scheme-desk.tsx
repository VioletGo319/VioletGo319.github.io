"use client";
import { useState } from "react";
import { Check, ChevronRight, ScrollText, Sparkles } from "lucide-react";
import type { PublicGame } from "../lib/game";
import { cardInfo, cardUnavailable, commissionInfo, commissionOffers, commissionRewardText, HAND_LIMIT } from "../lib/intrigue";
import { currentEdict, nextEdict, turnsToReview } from "../lib/strategy";
import { economyAt } from "../lib/economy";
import { isAcademic } from "../lib/scholar";

export default function SchemeDesk({game,enabled,onMove,initialPage="commissions"}:{game:PublicGame;enabled:boolean;onMove:(action:string,extra?:Record<string,unknown>)=>void;initialPage?:"commissions"|"cards"|"court"}){
  const [page,setPage]=useState(initialPage),[cardIndex,setCardIndex]=useState(0);
  const p=game.self,s=p.intrigue,q=s.commission,edict=currentEdict(game),next=nextEdict(game);
  const index=Math.min(cardIndex,Math.max(0,s.hand.length-1)),selected=s.hand[index],card=selected?cardInfo(selected):null;
  const disabled=selected?cardUnavailable(game,selected):undefined;
  const reward=(id:Parameters<typeof commissionInfo>[0],multiplier=economyAt(p.pos).multiplier)=>commissionRewardText(game,id,multiplier,edict.commissionBonus);
  const canTake=enabled&&!q&&s.acceptedEra!==game.strategy.era&&!(isAcademic(p.pos)&&p.degree);
  return <div className="scheme-desk">
    <div className="scheme-switch" role="tablist" aria-label="谋略分类">{([["commissions","委托"],["cards","锦囊 "+s.hand.length],["court","朝局"]] as const).map(([id,title])=><button role="tab" aria-selected={page===id} onClick={()=>setPage(id)} key={id}>{title}</button>)}</div>
    {page==="commissions"?<>
      {q?<div className="commission-active"><div className="commission-label"><ScrollText size={16}/><span>私密委托</span><b>余 {q.deadline-s.turns} 次落子</b></div><h3>{commissionInfo(q.id).title}</h3><p>{commissionInfo(q.id).detail}</p><div className="commission-meter" role="progressbar" aria-label="委托进度" aria-valuenow={q.progress} aria-valuemax={commissionInfo(q.id).goal}><i style={{width:q.progress/commissionInfo(q.id).goal*100+"%"}}/></div><div className="commission-progress"><b>{q.progress} / {commissionInfo(q.id).goal}</b><span>{reward(q.id,q.multiplier)}</span></div><p className="scheme-note">接取时银两档位锁定；完成时按当期朝局加赏。</p><button className="text-button" disabled={!enabled} onClick={()=>onMove("abandon_commission")}>放弃委托 · 本期不再接取</button></div>:
      <><div className="scheme-topline"><span>选一份，顺势经营</span><small>已完成 {s.completed} 份</small></div><div className="commission-offers">{commissionOffers(game).map(c=><button key={c.id} disabled={!canTake} onClick={()=>onMove("commission",{commissionId:c.id})}><div><b>{c.title}</b><small>{c.detail}</small><em>{reward(c.id)}</em></div><ChevronRight size={15}/></button>)}</div><p className="scheme-note">{s.acceptedEra===game.strategy.era?"本期已接过委托，下一次考核后刷新接取资格。":isAcademic(p.pos)&&p.degree?"科甲已定，授官后再接委托。":"接取免费、不占筹谋；自己的第 4 次普通落子结算时到期，随后触发的事件不计。"}</p></>}
      <p className="scheme-notice" role="status"><Check size={12}/><span>{s.notice}</span></p>
    </>:page==="cards"?<>
      <div className="scheme-topline"><span>留一手，待风起</span><small>{s.hand.length} / {HAND_LIMIT} 张 · 每回合用 1 张</small></div>
      {card?<><div className="tactic-cards">{s.hand.map((id,i)=><button key={id+":"+i} aria-pressed={i===index} className={i===index?"selected":""} onClick={()=>setCardIndex(i)}><span>{cardInfo(id).seal}</span><b>{cardInfo(id).name}</b></button>)}</div><div className="tactic-detail"><b>{card.name}</b><p>{card.detail}</p><small>{disabled||"不占本回合筹谋，不可在殿试或待办事件中使用。"}</small><button className="discard-tactic" disabled={!enabled} onClick={()=>onMove("discard_tactic",{cardId:selected})}>弃置此牌</button></div><button className="primary-button desk-confirm" disabled={!enabled||!!disabled} onClick={()=>onMove("tactic",{cardId:selected})}><Sparkles size={15}/>{disabled||"使用 · "+card.name}</button></>:<div className="scheme-empty"><Sparkles size={28}/><h3>空囊待佳策</h3><p>完成委托可获得锦囊。</p><button className="secondary-button" onClick={()=>setPage("commissions")}>看看可接的委托</button></div>}
      <p className="scheme-note">{s.shield?"护身文书待用 · 下一次普通掷骰后消耗。":"锦囊与委托仅自己可见；满囊时奖励牌不入囊，请提前使用。"}</p>
    </>:<div className="court-forecast"><div className="court-now"><span>第 {game.strategy.era+1} 期 · 当前朝局</span><h3>{edict.title}</h3><p>{edict.detail}</p></div><div className="court-divider"><span>{turnsToReview(game)} 次普通落子后换期</span></div><div className="court-next"><span>下期风向</span><h3>{next.title}</h3><p>{next.detail}</p></div><p className="scheme-note">先办差攒政绩，还是趁加赏完成委托？进度与锦囊不会随换期清空。殿试三轮不推进朝局。</p></div>}
  </div>;
}
