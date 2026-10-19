"use client";
import { useEffect, useState } from "react";
import { BookOpen, Castle, ChevronLeft, ChevronRight, Coins, Compass, Crown, Feather, KeyRound, LockKeyhole, Map, Pause, Play, Share2, ShieldAlert, Users } from "lucide-react";
import type { PublicGame } from "../lib/game";
import { REACTIONS } from "../lib/game";
import { FACES, OFFICES } from "../lib/board";
import { economyAt } from "../lib/economy";
import { currentEdict, hasPrepared, reviewPreview, riskBand, rollPreview, turnsToReview } from "../lib/strategy";
import CompactDesk from "./compact-desk";
import TurnTheater from "./turn-theater";
import NetworkPanel from "./network-panel";
import ExpandedBoard from "./expanded-board";
import EncounterPanel from "./encounter-panel";
import OfficePanel from "./office-panel";
import ExamPanel from "./exam-panel";
import { degreeInfo } from "../lib/scholar";
import type { DeskTab } from "../lib/mansion";

export type RoomTab = "desk" | "network" | "board" | "career" | "journal";
function Scenery({ tier }: { tier: number }) {
  return <div className={"mansion-scenery scene-tier-"+tier} aria-hidden="true"><div className="scenery-painting"/><div className="scenery-light"/><div className="scenery-motes"><i/><i/><i/><i/></div></div>;
}
export function Career({ game, onDetail }: { game: PublicGame; onDetail: (id:number)=>void }) {
  const [page,setPage]=useState<"routes"|"review">("routes"), p=game.self, review=reviewPreview(game,game.viewer);
  return <section className="career-room"><div className="room-section-title"><h2>我的仕途</h2><span>仅按你的私账推演</span></div>
    <div className="desk-tabs" role="tablist" aria-label="仕途视图"><button role="tab" aria-selected={page==="routes"} onClick={()=>setPage("routes")}>本次去向</button><button role="tab" aria-selected={page==="review"} onClick={()=>setPage("review")}>考核盘算</button></div>
    {page==="routes"?<><div className="private-routes">{FACES.map(face=>{const r=rollPreview(game,game.viewer,face);return <button key={face} onClick={()=>onDetail(r.action.to)}><span className={face==="赃"?"negative":""}>{face}<small>25%</small></span><div><b>{OFFICES[r.action.to].name}</b><small>{r.reason || (r.action.to===p.pos?"原位留任":"循判词迁职")}{r.landing.occupant!==null?" · 高位已占":""}</small><em>{r.action.tribute?"向对方收最多 "+r.action.tribute+" 两":(r.action.coins>=0?"+":"")+r.action.coins+" 两"}{r.meritCost?" · 耗 "+r.meritCost+" 政绩":""}{r.favorCost?" · 耗 "+r.favorCost+" 人情":""}</em></div><ChevronRight size={14}/></button>;})}</div><p className="room-footnote">已计入自己的助力与公开占位；之后仍可能触发相逢、考核和遭遇。</p></>:<div className={"private-review "+review.kind}><span className="review-countdown">{turnsToReview(game)} <small>次落子后考核</small></span><h3>{review.title}</h3><p>{review.detail}</p><p className="room-footnote">按双方当前官职估算，不推演对方私账。实际考核时职位可能先被腾出或占用。</p><div className="private-risk-scale">0–2 正常 · 3 封举荐<br/>4–5 停升降职 · 6 重案查办</div><p>{riskBand(p.risk).label} · 自省免费减 2 嫌疑。</p></div>}
  </section>;
}
export function Journal({ game, enabled, onMove }: { game:PublicGame; enabled:boolean; onMove:(action:string,extra?:Record<string,unknown>)=>void }) {
  const [page,setPage]=useState(0), pages=Math.max(1,Math.ceil(game.logs.length/3)), current=Math.min(page,pages-1);
  return <section className="room-journal"><div className="room-section-title"><h2>府中手记</h2><span>私账 + 公开见闻</span></div>
    <ol>{game.logs.slice(current*3,current*3+3).map(e=><li key={e.id}><span>{e.seat===game.viewer?"私笺":"见闻"}</span><p>{e.text}</p></li>)}</ol>
    {!game.logs.length&&<p className="notice">旧版含私账的记录已收起。从现在开始，自己的明细会记在这里。</p>}
    <div className="network-pagination"><button aria-label="较新手记" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></button><span>{current+1} / {pages}</span><button aria-label="较早手记" disabled={current===pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={16}/></button></div>
    {game.lastDebate&&<div className="room-last-debate"><b>上场廷议 · {game.lastDebate.title}</b><p>{game.lastDebate.text}</p></div>}
    <div className="room-reactions">{REACTIONS.map(t=><button key={t} disabled={!enabled} onClick={()=>onMove("react",{text:t})}>{t}</button>)}</div>
  </section>;
}
export default function PrivateRoom({ game, busy, rolling, connection, isLocal, roomCode, soloState, onBotPause, onMove, onDetail, onInvite, onBackup, locked, onUnlock }: {
  game:PublicGame; busy:boolean; rolling:boolean; connection:string; isLocal:boolean; roomCode?:string; soloState?:"thinking"|"paused"|"ready"; onBotPause?:()=>void;
  onMove:(action:string,extra?:Record<string,unknown>)=>void; onDetail:(id:number)=>void;
  onInvite:()=>void; onBackup:()=>void; locked:boolean; onUnlock:()=>void;
}) {
  const [tab,setTab]=useState<RoomTab>("desk"), [deskTab,setDeskTab]=useState<DeskTab>("work"), [deskKey,setDeskKey]=useState(0);
  const p=game.self, office=OFFICES[p.pos], economy=economyAt(p.pos), other=game.players[1-game.viewer], edict=currentEdict(game);
  const encounterPending=!!(game.event||game.debate||game.hassle),pending=encounterPending||!!game.exam, connected=isLocal||connection==="connected", enabled=!busy&&connected;
  const canRoll=enabled&&game.status==="playing"&&game.turn===game.viewer&&!encounterPending&&(!game.exam||game.exam.seat===game.viewer);
  const recent=game.reactions.find(r=>Date.now()-r.at<7000);
  const pendingKey=game.exam?.id||game.hassle?.id||game.debate?.id||game.event?.id;
  useEffect(()=>{if(pendingKey)setTab("desk");},[pendingKey]);
  function visit(){setDeskTab("gift");setDeskKey(k=>k+1);setTab("desk");}
  const tabs=[["desk","府务",Castle],["network","关系",Users],["board","棋盘",Map],["career","仕途",Compass],["journal","手记",BookOpen]] as const;
  return <div className={"private-room seat-theme-"+game.viewer}>
    <Scenery tier={economy.tier}/>
    {locked?<div className="private-door"><LockKeyhole size={32}/><span>请把手机交给</span><h1>{p.name}</h1><p>进入自己的府邸，再查看私账与筹谋。</p><button className="primary-button" onClick={onUnlock}>我是{p.name} · 开门入府</button><small>同屏试玩仅遮挡交接画面；远程模式使用各自手机隔离数据。</small></div>:<>
      <TurnTheater game={game} rolling={rolling}/>
      <header className="room-identity"><div className="room-seal"><Castle size={22}/><span>{game.viewer===0?"朱砂":"青玉"}</span><small>府</small></div><div className="room-owner"><small><span className="rank-dots" aria-label={"官阶银两第 "+economy.tier+" 档"}>{[1,2,3,4,5].map(n=><i key={n} className={n<=economy.tier?"lit":""}/>)}</span>{economy.title} · ×{economy.multiplier}</small><h1>{p.name}的府邸</h1><button onClick={()=>onDetail(p.pos)}>{office.department}<span>·</span><strong>{office.name}</strong>{p.degree&&<em className="degree-ribbon">{degreeInfo(p.degree).title}</em>}<ChevronRight size={12}/></button></div><div className="room-tools"><span className={connected?"online":"offline"}>{soloState?"单人对弈":isLocal?"同屏私席":connected?"已同步":"重连中"}</span>{soloState&&<button onClick={onBotPause} aria-label={soloState==="paused"?"继续人机":"暂停人机"} title={soloState==="paused"?"继续人机":"暂停人机"}>{soloState==="paused"?<Play size={16}/>:<Pause size={16}/>}</button>}{!isLocal&&<><button onClick={onInvite} aria-label="邀请与雅间号"><Share2 size={16}/></button><button onClick={onBackup} aria-label="保存自己的续局密钥"><KeyRound size={16}/></button></>}</div></header>
      <div className="private-ledger" aria-label="我的私账">{[{label:"银两",value:p.coins,unit:"两",max:0,Icon:Coins},{label:"学识",value:p.learning,unit:"/ 12",max:12,Icon:BookOpen},{label:"政绩",value:p.merit,unit:"/ 8",max:8,Icon:Feather},{label:"本衙人情",value:p.favor[office.group]||0,unit:"/ 6",max:6,Icon:Users},{label:"嫌疑",value:p.risk,unit:"/ 6",max:6,Icon:ShieldAlert}].map(({label,value,unit,max,Icon})=><div key={label} className={label==="嫌疑"&&p.risk>=3?"danger":""}><small><Icon size={11}/>{label}</small><b><span className="ledger-number" key={value}>{value}</span><em>{unit}</em></b>{max>0&&<i><span style={{width:value/max*100+"%"}}/></i>}</div>)}</div>
      <div className="rival-public"><LockKeyhole size={12}/><span role="status">{recent?game.players[recent.seat].name+"："+recent.text:other?other.name+" · "+OFFICES[other.pos].department+"·"+OFFICES[other.pos].name:"等知己赴约"}</span><small className={soloState==="thinking"?"bot-status thinking":"bot-status"} role="status">{soloState==="thinking"?"人机思考中":soloState==="paused"?"人机已暂停":"私账保密"}</small></div>
      <div className={"mansion-body room-view-"+tab} id="mansion-content" role="tabpanel" aria-label={tabs.find(t=>t[0]===tab)?.[1]}>
        {game.status==="waiting"?<div className="room-wait waiting-invitation"><div className="waiting-keyart" aria-hidden="true"/><HeartSeal/><h2>一府已备，待君赴约。</h2><p>同一棋局，各自府邸。</p><b>{roomCode}</b><button className="primary-button" onClick={onInvite}>邀请知己</button><small>对方不需要 GPT 账号。</small></div>:game.status==="finished"?<div className="room-wait victory-scene"><span className="victory-crown"><Crown size={40} strokeWidth={1.2}/></span><span className="victory-kicker">一局浮生 · 终赴青云</span><h2>{game.players[game.winner!].name}荣归</h2><p>{soloState?game.winner===game.viewer?"你先登青云，青岚先生愿再讨教。":"青岚先生先归，整装再争一局。":"各自经营，仍与你同游。"}</p><button className="primary-button" disabled={!enabled||(!isLocal&&game.rematch.includes(game.viewer))} onClick={()=>onMove("rematch")}>{game.rematch.includes(game.viewer)?"已邀再战，等对方点头":"再同游一局"}</button></div>:
          tab==="desk"?<>{game.exam?<ExamPanel game={game}/>:game.hassle?<OfficePanel game={game} seat={game.viewer} enabled={enabled} isLocal={isLocal&&!soloState} onMove={onMove}/>:game.event||game.debate?<EncounterPanel key={pendingKey+":"+game.viewer} game={game} seat={game.viewer} enabled={enabled} isLocal={false} onMove={onMove}/>:<CompactDesk key={deskKey} game={game} enabled={enabled&&game.turn===game.viewer} initialTab={deskTab} onCareer={()=>setTab("career")} onPlan={plan=>onMove("prepare",{plan})} onMove={onMove}/>}</>:
          tab==="network"?<NetworkPanel game={game} onVisit={visit}/>:tab==="board"?<ExpandedBoard game={game} activeSeat={game.viewer} onDetail={onDetail}/>:tab==="career"?<Career game={game} onDetail={onDetail}/>:<Journal game={game} enabled={enabled&&!isLocal} onMove={onMove}/>}
      </div>
      <div className={"room-turn "+(canRoll?"your-turn ":"")+(rolling?"dice-in-motion":"")}><span className="last-face-mini" aria-label={rolling?"正在掷骰":game.lastRoll?"上次骰面："+game.lastRoll.face:"等待掷骰"}>{rolling?"运":game.exam?.faces?.at(-1)||game.lastRoll?.face||"德"}</span><div><b>{soloState==="paused"?"人机已暂停":soloState==="thinking"?"青岚先生正在筹谋":game.exam?game.exam.seat===game.viewer?(game.exam.result?"金榜已定，待授官":"殿试连掷 · 第 "+(game.exam.completed+1)+" 轮"):"静候对方殿试":pending?"有待处理的事务":game.turn===game.viewer?"轮到你了":"静候"+game.players[game.turn].name}</b><small>{game.exam?"学识定根基 · 骰面定临场":edict.title+" · "+turnsToReview(game)+" 手后考核"}</small></div>{pending&&!game.exam?<button className="primary-button" onClick={()=>setTab("desk")}>回府处理<ChevronRight size={15}/></button>:<button className="primary-button" disabled={!canRoll} onClick={()=>onMove("roll")}>{rolling?"骰落…":game.status!=="playing"?"此局同游":game.turn!==game.viewer?"等待对方":game.exam?(game.exam.result?"掷骰 · 授官":"第 "+(game.exam.completed+1)+" 轮 · 应试"):hasPrepared(game)?"筹谋已定 · 掷骰":"掷骰 · 定官途"}{canRoll&&<ChevronRight size={15}/>}</button>}</div>
      <nav className="mansion-tabs" role="tablist" aria-label="府邸房间">{tabs.map(([id,label,Icon])=><button key={id} role="tab" aria-selected={tab===id} aria-controls="mansion-content" onClick={()=>setTab(id)}><Icon size={19}/><span>{label}</span>{id==="desk"&&pending&&<i/>}</button>)}</nav>
    </>}
  </div>;
}
function HeartSeal(){return <span className="heart-seal">同<br/>游</span>;}
