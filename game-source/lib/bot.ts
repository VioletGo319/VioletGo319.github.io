/** Local opponent. The policy receives the same private projection as a player,
 * never the other player's ledger, sealed bid, or future random dice. */
import { FACES, OFFICES, prepare, resolveEvent, resolveHassle, roll, submitDebate, type Game, type PublicGame, type Seat } from "./game";
import { eventDefinition, randomInt, STANCES, type DebateBid } from "./encounters";
import { deskOptions } from "./mansion";
import { currentEdict, giftQuote, hasPrepared, type PlanInput } from "./strategy";
import { isAcademic } from "./scholar";
import { silverAt } from "./economy";
import type { HassleChoice } from "./offices";

export const BOT_NAME = "青岚先生";
export const SOLO_STORE = "tongyou-solo-v1";
export type BotMove = { action:"roll" } | { action:"prepare"; plan:PlanInput }
  | { action:"event"; id:string; choice:string }
  | { action:"hassle_response"; id:string; choice:HassleChoice }
  | { action:"debate"; id:string; bid:DebateBid };
type Random = (max:number)=>number;

/** Deterministic scheduling guard: human-owned decisions always stop the bot. */
export function botMayAct(view:PublicGame):boolean {
  if(view.status!=="playing")return false;
  if(view.exam)return view.exam.seat===view.viewer;
  if(view.hassle)return view.hassle.junior===view.viewer;
  if(view.event)return view.event.seat===view.viewer;
  if(view.debate)return !view.debate.ready[view.viewer];
  return view.turn===view.viewer;
}

export function chooseBotMove(view:PublicGame, random:Random=randomInt):BotMove|null {
  if(!botMayAct(view))return null;
  const p=view.self, seat=view.viewer, group=OFFICES[p.pos].group;
  if(view.exam)return {action:"roll"};
  if(view.hassle){
    const favor=p.favor[group]||0;
    const choice:HassleChoice=p.merit>=2?"appeal":favor>=2?"favor":"comply";
    return {action:"hassle_response",id:view.hassle.id,choice};
  }
  if(view.event){
    if(view.event.kind==="private")return null;
    const choices=eventDefinition(view.event.kind).choices.filter(c=>p.coins>=silverAt(p.pos,c.coins)&&p.merit>=c.merit);
    const priorities:Record<string,string[]>={
      literary:["defend","appeal","withdraw"],
      flood:p.coins>=silverAt(p.pos,22)&&p.merit<=5?["fund","organize"]:["organize"],
      letter:p.coins>=silverAt(p.pos,16)&&p.merit<=6?["retrieve","rewrite"]:["rewrite"],
      surplus:p.risk>=2||p.merit<4?["donate","keep"]:["keep"],
      banquet:!isAcademic(p.pos)&&group!=="court"&&(p.favor[group]||0)<currentEdict(view).favorCost?["visit","verse"]:["verse"],
      inspection:p.risk>=3?["records","check","wait"]:["wait"],
    };
    const choice=priorities[view.event.kind].find(id=>choices.some(c=>c.id===id))||choices[0].id;
    return {action:"event",id:view.event.id,choice};
  }
  if(view.debate){
    // Uniform stance: no access to the human's unrevealed choice, even if submitted first.
    return {action:"debate",id:view.debate.id,bid:{stance:STANCES[random(3)].id,stake:random(Math.min(2,p.merit)+1)}};
  }
  if(hasPrepared(view))return {action:"roll"};
  const work=deskOptions(view,"work").filter(o=>!o.unavailable);
  const plan=(id:string)=>work.find(o=>o.id===id)?.plan;
  const prepareMove=(value:PlanInput):BotMove=>({action:"prepare",plan:value});
  // Protect reputation before seeking office; both costs and income use the normal engine.
  if(p.risk>=2){
    const relief=p.coins>=silverAt(p.pos,16)&&plan("relief");
    return prepareMove(relief||plan("reflect")!);
  }
  if(isAcademic(p.pos)&&plan("work"))return prepareMove(plan("work")!);
  const duels=deskOptions(view,"duel").filter(o=>!o.unavailable);
  // Whether a rival's recommendation is already blocked is private. Choose the
  // two pressure tactics whose legality can be established from public offices.
  const hassles=duels.filter(o=>o.plan.kind==="hassle"&&o.plan.hassle!=="obstruct");
  if(hassles.length&&p.risk===0&&p.merit>=3&&random(100)<18)return prepareMove(hassles[random(hassles.length)].plan);
  if(duels.some(o=>o.id==="debate")&&random(100)<14)return prepareMove({kind:"debate"});
  const gifts=deskOptions(view,"gift").filter(o=>!o.unavailable&&p.risk+giftQuote(view,seat,o.plan.gift!).risk<3);
  if(gifts.length&&(p.favor[group]||0)<currentEdict(view).favorCost&&p.merit>=4&&random(100)<65){
    // Prefer a useful, affordable gift; higher gifts carry the same suspicion as for a human.
    const useful=gifts.filter(o=>giftQuote(view,seat,o.plan.gift!).favor+(p.favor[group]||0)>=currentEdict(view).favorCost);
    return prepareMove((useful[0]||gifts[0]).plan);
  }
  if(plan("petition")&&p.merit>=6&&random(100)<30)return prepareMove(plan("petition")!);
  if(plan("work"))return prepareMove(plan("work")!);
  return {action:"roll"};
}

/** Execute only after selecting from a PublicGame. No separate bot-only rules. */
export function applyBotMove(game:Game,seat:Seat,move:BotMove,random:Random=randomInt,now=Date.now()):Game {
  switch(move.action){
    case "roll":return roll(game,seat,FACES[random(4)],now,random(1000));
    case "prepare":return prepare(game,seat,move.plan,now);
    case "event":return resolveEvent(game,seat,move.id,move.choice,now);
    case "hassle_response":return resolveHassle(game,seat,move.id,move.choice,now);
    case "debate":return submitDebate(game,seat,move.id,move.bid,now);
  }
}
