"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, BookOpen, ChevronRight, Crown, Dices, Heart, RotateCcw, ScrollText, Sparkles, Users } from "lucide-react";
import ExpandedBoard from "./expanded-board";
import { BOARD_COUNT, FACES, OFFICES } from "../lib/board";
import { actionsAt } from "../lib/game";
import { randomInt } from "../lib/encounters";
import { cardInfo, type CardId } from "../lib/intrigue";

const SHOW_CARDS: CardId[] = ["calm", "letter", "shield"];
export default function GameLobby({appBase,onEnter,onDetail,onRules,resume}:{
  appBase:string;onEnter:(mode:"create"|"join"|"solo")=>void;onDetail:(id:number)=>void;onRules:()=>void;resume:ReactNode;
}) {
  const [face,setFace]=useState(0),[rolling,setRolling]=useState(false),[tried,setTried]=useState(false);
  const [card,setCard]=useState(0),[boardOpen,setBoardOpen]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null),lock=useRef(false);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  function tryDie(){if(lock.current)return;lock.current=true;setRolling(true);timer.current=setTimeout(()=>{setFace(randomInt(4));setTried(true);setRolling(false);lock.current=false;},700);}
  const preview=actionsAt(0)[FACES[face]],tactic=cardInfo(SHOW_CARDS[card]);
  return <div className="game-lobby">
    <section className="invitation-hero" aria-labelledby="game-title">
      <img className="hero-key-art" src={appBase+"art/lantern-duet-v2.webp"} width="1536" height="1024" alt="灯火京城里，朱砂与青玉两位棋友在微缩棋盘前对坐" fetchPriority="high"/>
      <div className="hero-shade" aria-hidden="true"/>
      <div className="hero-fireflies" aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i}/>)}</div>
      <div className="hero-title-copy"><p className="hero-kicker"><span/>同游 · 古风双人棋游</p><h1 id="game-title">一掷入仕。<br/><em>与你，步步青云。</em></h1><p className="hero-subtitle">揣着二十两，赴一场青云之约。<br/>你我各藏心事，也各有奇招。</p></div>
      <span className="hero-side-seal" aria-hidden="true">小小棋局<br/>满朝风云</span>
      <div className="hero-choices">
        <p className="choose-caption"><span/> 今夜，怎么入局？ <span/></p>
        <div className="mode-choices">
          <button className="mode-card mode-duet" onClick={()=>onEnter("create")}><span className="mode-icon"><Users size={24}/></span><span><strong>双人同游</strong><small>邀心上人，共争一场功名</small></span><ArrowRight size={20}/><em>远程联机</em></button>
          <button className="mode-card mode-solo" onClick={()=>onEnter("solo")}><span className="mode-icon"><Crown size={24}/></span><span><strong>单人闯仕途</strong><small>青岚先生，已在此候你</small></span><ArrowRight size={20}/><em>人机对弈</em></button>
        </div>
        <div className="hero-under-actions"><button onClick={()=>onEnter("join")}>已有雅间号？<b>赴约入席 <ChevronRight size={13}/></b></button><span><Heart size={12}/> 无需 GPT 账号</span></div>
      </div>
      <a className="hero-explore" href="#first-taste">先感受一局 <ArrowDown size={14}/></a>
    </section>
    {resume}
    <section className="first-taste" id="first-taste" aria-labelledby="first-taste-title">
      <div className="taste-heading"><div><p>落子之前 · 先尝一味</p><h2 id="first-taste-title">运气是引子，<em>心思才是好戏。</em></h2></div><button onClick={onRules}><BookOpen size={15}/>看完整玩法</button></div>
      <div className="taste-grid">
        <article className="taste-card taste-dice"><div className="taste-label"><span>壹 / 一骰改命</span><Dices size={17}/></div><div className="taste-stage dice-stage"><button className={"sample-die "+(rolling?"tumbling":"")} onClick={tryDie} disabled={rolling} aria-label="试玩掷骰，不影响棋局"><span>{rolling?"运":FACES[face]}</span><i/><i/><i/><i/></button><span className="dice-shadow"/><div className="face-ring" aria-hidden="true">德 · 才 · 功 · 赃</div></div><div className="taste-copy" aria-live="polite"><h3>{rolling?"官途，且听骰落…":tried?"白丁 → "+OFFICES[preview.to].name:"下一掷，会到哪里？"}</h3><p>{tried&&!rolling?"白丁的「"+FACES[face]+"」判词："+preview.label:"掷起四字骰，看看你的第一步官途。"}</p></div><button className="taste-action" onClick={tryDie} disabled={rolling}>{tried?<RotateCcw size={13}/>:<Sparkles size={13}/>} {rolling?"骰子转动中":"免费试掷一次"}<ArrowRight size={14}/></button><small className="demo-note">试玩演示 · 不影响任何存档</small></article>
        <article className="taste-card taste-intrigue"><div className="taste-label"><span>贰 / 暗藏锦囊</span><ScrollText size={17}/></div><div className="taste-stage card-stage"><span className="back-card"/><button key={card} className="sample-tactic" onClick={()=>setCard((card+1)%SHOW_CARDS.length)} aria-label="翻看下一张锦囊"><small>同游 · 秘策</small><b>{tactic.seal}</b><span>{tactic.name}</span><i>✦</i></button></div><div className="taste-copy" aria-live="polite"><h3>{tactic.name}</h3><p>{tactic.detail}</p></div><button className="taste-action" onClick={()=>setCard((card+1)%SHOW_CARDS.length)}>翻开另一张 <ArrowRight size={14}/></button><small className="demo-note">完成委托得锦囊 · 好牌藏在自己手里</small></article>
        <article className="taste-card taste-rivalry"><div className="taste-label"><span>叁 / 亦友亦对手</span><Users size={17}/></div><div className="taste-stage rivalry-stage" aria-hidden="true"><span className="rival-seal vermilion"><i>朱砂</i><b>客</b></span><span className="rival-thread"><i/>一席之争<i/></span><span className="rival-seal jade"><i>青玉</i><b>客</b></span><div className="secret-papers"><span>私账 <b>•••</b></span><span>锦囊 <b>?</b></span><span>论策 <b>?</b></span></div></div><div className="taste-copy"><h3>知己在身侧，心思在暗处。</h3><p>各自经营府邸，朝堂上再见真招。谁先登青云，谁就先荣归。</p></div><button className="taste-action" onClick={()=>onEnter("create")}>约一个人，入这场局 <ArrowRight size={14}/></button><small className="demo-note">独立私账 · 自动存档 · 随时续局</small></article>
      </div>
    </section>
    <details className="lobby-atlas" onToggle={e=>setBoardOpen(e.currentTarget.open)}><summary><span className="atlas-scroll-icon"><ScrollText size={26}/></span><span><b>一卷升官图，{BOARD_COUNT} 席人间事。</b><small>功名 · 地方 · 京官 · 三公，展开细看每一席的去向</small></span><span className="atlas-summary-action">{boardOpen?"收起棋卷":"展开棋卷"}<ChevronRight size={17}/></span></summary>{boardOpen&&<div className="lobby-atlas-content"><ExpandedBoard game={null} activeSeat={0} onDetail={onDetail}/></div>}</details>
  </div>;
}
