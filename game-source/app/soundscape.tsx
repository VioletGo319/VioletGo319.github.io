"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX, X } from "lucide-react";
import type { PublicGame } from "../lib/game";
import { economyAt } from "../lib/economy";

// Original pentatonic score, synthesized locally: no audio downloads or tracking.
const SCORE=[62,0,69,67,65,0,62,57,60,0,65,67,69,0,67,65,62,0,57,60,62,65,67,0,69,0,72,69,67,65,62,0];
export default function Soundscape({game}:{game:PublicGame|null}) {
  const [open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[volume,setVolume]=useState(.22),[effects,setEffects]=useState(true),[error,setError]=useState("");
  const ctx=useRef<AudioContext|null>(null), master=useRef<GainNode|null>(null), timer=useRef<ReturnType<typeof setInterval>|null>(null);
  const nextTime=useRef(0), beat=useRef(0), shouldPlay=useRef(false), effectOn=useRef(true), previous=useRef<{seat:number;match:number;moves:number;coins:number;merit:number;risk:number}|null>(null);
  function note(midi:number,time:number,length:number,gain=.12){
    const c=ctx.current,m=master.current;if(!c||!m)return;
    // Soft plucked harmonics with a low-pass filter, not a recording imitation.
    const env=c.createGain(),filter=c.createBiquadFilter();filter.type="lowpass";filter.frequency.value=1800;
    env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(gain,time+.014);env.gain.exponentialRampToValueAtTime(.0001,time+length);
    env.connect(filter);filter.connect(m);
    for(const [harmonic,level] of [[1,1],[2,.22],[3,.08]]){
      const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=440*Math.pow(2,(midi-69)/12)*harmonic;g.gain.value=level;o.connect(g);g.connect(env);o.start(time);o.stop(time+length+.05);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    setTimeout(()=>{env.disconnect();filter.disconnect();},Math.max(0,(time-c.currentTime+length+.15)*1000));
  }
  function schedule(){const c=ctx.current;if(!c||!shouldPlay.current||c.state!=="running")return;
    if(nextTime.current<c.currentTime)nextTime.current=c.currentTime+.05;
    while(nextTime.current<c.currentTime+.85){const n=SCORE[beat.current%SCORE.length];if(n)note(n,nextTime.current,2.6,.14);
      if(beat.current%8===0)note(beat.current%16===0?38:45,nextTime.current,4.5,.1);
      beat.current++;nextTime.current+=.72;}
  }
  async function toggle(){setError("");if(shouldPlay.current){shouldPlay.current=false;setPlaying(false);await ctx.current?.suspend();return;}
    try{if(!ctx.current){const Audio=window.AudioContext || (window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!Audio)throw new Error("unsupported");const c=new Audio();ctx.current=c;const m=c.createGain();m.gain.value=volume;master.current=m;m.connect(c.destination);}
      await ctx.current.resume();shouldPlay.current=true;setPlaying(true);nextTime.current=ctx.current.currentTime+.05;schedule();
      if(!timer.current)timer.current=setInterval(schedule,350);
    }catch{setError("当前浏览器未能播放，请再点一次，或换到 Safari / Chrome。");}
  }
  useEffect(()=>{effectOn.current=effects;},[effects]);
  useEffect(()=>{if(master.current&&ctx.current)master.current.gain.setTargetAtTime(volume,ctx.current.currentTime,.08);},[volume]);
  useEffect(()=>{const visibility=()=>{if(document.hidden)void ctx.current?.suspend();else if(shouldPlay.current)void ctx.current?.resume().then(()=>{if(ctx.current)nextTime.current=ctx.current.currentTime+.05;}).catch(()=>{setPlaying(false);shouldPlay.current=false;});};document.addEventListener("visibilitychange",visibility);return()=>{document.removeEventListener("visibilitychange",visibility);if(timer.current)clearInterval(timer.current);shouldPlay.current=false;void ctx.current?.close();};},[]);
  useEffect(()=>{
    if(!game){previous.current=null;return;}const p=game.self, old=previous.current;
    previous.current={seat:game.viewer,match:game.match,moves:game.moves,coins:p.coins,merit:p.merit,risk:p.risk};
    const c=ctx.current;if(!old||old.seat!==game.viewer||old.match!==game.match||old.moves===game.moves||!shouldPlay.current||!effectOn.current||!c||c.state!=="running")return;
    const bad=p.coins<old.coins||p.risk>old.risk, good=p.coins>old.coins||p.merit>old.merit;if(!bad&&!good)return;
    const notes=bad?[57,53]:[74,77,81], gain=.08+economyAt(p.pos).tier*.012;
    notes.forEach((n,i)=>note(n,c.currentTime+.04+i*.16,1.1,gain));
  },[game?.moves,game?.match,game?.viewer]);
  return <div className="soundscape"><button className="nav-button" aria-label="背景音乐与音效" aria-expanded={open} onClick={()=>setOpen(!open)}>{playing?<Music2 size={17}/>:<VolumeX size={17}/>}<span>琴音</span></button>
    {open&&<section className="sound-popover" aria-label="声音设置"><button className="sound-close" aria-label="关闭声音设置" onClick={()=>setOpen(false)}><X size={17}/></button><h3>庭前听琴</h3><p>原创五声琴音 · 点按后播放</p><button className="primary-button" onClick={()=>void toggle()}>{playing?"暂停音乐与音效":"播放琴音"}</button><label>音量 <b>{Math.round(volume*100)}%</b><input aria-label="背景音乐音量" type="range" min="0" max="0.6" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><label className="sound-check"><input type="checkbox" checked={effects} onChange={e=>setEffects(e.target.checked)}/>赏罚音效</label><small>官阶越高，提示稍强；切到后台自动静音。</small>{error&&<p role="alert">{error}</p>}</section>}
  </div>;
}
