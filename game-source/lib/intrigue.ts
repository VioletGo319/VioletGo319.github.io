/** Original game mechanics: private commissions and consumable tactics. */
import type { Game, PublicGame } from "./game";
import { OFFICES } from "./board";
import { isAcademic } from "./scholar";
export const HAND_LIMIT=4;
export const CARDS=[
  {id:"calm",name:"清白卷宗",seal:"清",detail:"嫌疑 −2。留到查办前，为自己争一次转机。"},
  {id:"study",name:"经义手札",seal:"学",detail:"未定科甲时学识 +2，上限 12；不增加银两或政绩。"},
  {id:"letter",name:"引荐帖",seal:"荐",detail:"本衙人情 +2，上限 6；嫌疑达到 3 时不可用，功名与三公不可用。"},
  {id:"grant",name:"俸银凭票",seal:"银",detail:"入仕后领 6 两 × 当前官阶。"},
  {id:"shield",name:"护身文书",seal:"守",detail:"下次普通掷骰若为赃，原位留任、免该骰罚银，仍增加嫌疑；其他骰面照常并消耗保护。功名与三公不可用。"},
  {id:"resolve",name:"幕僚献策",seal:"策",detail:"入仕后政绩 +2，上限 8。可配合办差、人情与考核。"},
] as const;
export type CardId=typeof CARDS[number]["id"];
export type CommissionEvent="study"|"work"|"gift"|"relief"|"reflect"|"debate"|"travel"|"exam";
export const COMMISSIONS=[
  {id:"learning",title:"磨砚修经",academic:true,event:"study",goal:2,detail:"完成 2 次寒窗课业",coins:0,merit:0,learning:1,card:"study"},
  {id:"examination",title:"赴京应试",academic:true,event:"exam",goal:1,detail:"首次进入殿试",coins:0,merit:0,learning:1,card:"calm"},
  {id:"scholar",title:"功名渐进",academic:true,event:"travel",goal:2,detail:"靠普通掷骰迁至新格 2 次",coins:0,merit:0,learning:1,card:"shield"},
  {id:"records",title:"整饬案牍",academic:false,event:"work",goal:2,detail:"完成 2 次办差",coins:8,merit:1,learning:0,card:"resolve"},
  {id:"relief",title:"济民急务",academic:false,event:"relief",goal:2,detail:"赈济乡里或在河患中赈灾 / 亲赴堤岸，累计 2 次",coins:10,merit:2,learning:0,card:"calm"},
  {id:"network",title:"走访衙署",academic:false,event:"gift",goal:2,detail:"完成 2 次拜谒送礼",coins:4,merit:1,learning:0,card:"letter"},
  {id:"reputation",title:"整肃家声",academic:false,event:"reflect",goal:2,detail:"自省或主动向御史交案牍 / 自请复查，累计 2 次",coins:6,merit:1,learning:0,card:"shield"},
  {id:"counsel",title:"廷议建言",academic:false,event:"debate",goal:1,detail:"赢得 1 场朝堂争辩，平局不计",coins:8,merit:1,learning:0,card:"grant"},
  {id:"journey",title:"历练四方",academic:false,event:"travel",goal:2,detail:"靠普通掷骰迁至新格 2 次",coins:6,merit:1,learning:0,card:"shield"},
] as const;
export type CommissionId=typeof COMMISSIONS[number]["id"];
export type PrivateIntrigue={
  turns:number;hand:CardId[];usedAtMove:number;shield:boolean;
  commission:{id:CommissionId;progress:number;deadline:number;multiplier:number}|null;
  acceptedEra:number;completed:number;notice:string;
};
export function newIntrigue():PrivateIntrigue{return {turns:0,hand:["calm"],usedAtMove:-1,shield:false,commission:null,acceptedEra:-1,completed:0,notice:"获赠清白卷宗，可在自己的回合使用。"};}
export function cardInfo(id:CardId){return CARDS.find(c=>c.id===id)!;}
export function commissionInfo(id:CommissionId){return COMMISSIONS.find(c=>c.id===id)!;}
export function commissionOffers(game:PublicGame){
  if(isAcademic(game.self.pos))return COMMISSIONS.filter(c=>c.academic);
  const pool=COMMISSIONS.filter(c=>!c.academic&&c.id!=="records");
  const start=(game.strategy.era+game.match-1)%pool.length;
  return [commissionInfo("records"),pool[start],pool[(start+2)%pool.length]];
}
export function cardUnavailable(game:PublicGame,id:CardId):string|undefined {
  const p=game.self,academic=isAcademic(p.pos),group=OFFICES[p.pos].group;
  if(!CARDS.some(c=>c.id===id)||!p.intrigue.hand.includes(id))return "囊中没有此锦囊";
  if(p.intrigue.usedAtMove===game.moves)return "本回合已用过锦囊";
  if(id==="calm"&&p.risk===0)return "目前没有嫌疑";
  if(id==="study"&&(!academic||p.degree||p.learning>=12))return "未定科甲且学识未满时可用";
  if((id==="grant"||id==="resolve")&&academic)return "入仕后可用";
  if(id==="resolve"&&p.merit>=8)return "政绩已满";
  if(id==="letter")return academic||group==="court"?"此处不设举荐":p.risk>=3?"先降低嫌疑":(p.favor[group]||0)>=6?"本衙人情已满":undefined;
  if(id==="shield")return academic||group==="court"?"功名与三公不可用":p.intrigue.shield?"已有护身文书待用":undefined;
}
export function commissionRewardText(game:Game|PublicGame,id:CommissionId,multiplier:number,bonus:number){
  const c=commissionInfo(id);
  return [c.coins?`${(c.coins+bonus)*multiplier} 两`:"",c.merit?`政绩 +${c.merit}`:"",c.learning?`学识 +${c.learning}`:"",`「${cardInfo(c.card).name}」`].filter(Boolean).join(" · ");
}
