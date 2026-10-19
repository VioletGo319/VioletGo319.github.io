/** The scoring and three throws are game design; the three honours follow museum terminology. */
import { OFFICES, actionsAt, officeId, type Action, type Face } from "./board";
export const LEARNING_MAX = 12, STUDY_COST = 2, STUDY_GAIN = 2;
export const EXAM_POINTS: Record<Face,number> = { 德:3, 才:2, 功:1, 赃:0 };
export const EXAM_ROUNDS = ["经义", "策论", "御前问对"] as const;
export const DEGREES = [
  { id:"third", title:"同进士出身", rank:"三甲", min:0, position:9 },
  { id:"second", title:"进士出身", rank:"二甲", min:7, position:9 },
  { id:"chuanlu", title:"传胪", rank:"二甲首名", min:11, position:10 },
  { id:"tanhua", title:"探花", rank:"一甲 · 进士及第", min:14, position:12 },
  { id:"bangyan", title:"榜眼", rank:"一甲 · 进士及第", min:17, position:13 },
  { id:"zhuangyuan", title:"状元", rank:"一甲 · 进士及第", min:19, position:14 },
] as const;
export type Degree = typeof DEGREES[number]["id"];
export const degreeInfo = (id:Degree) => DEGREES.find(d=>d.id===id)!;
export const isAcademic = (pos:number) => OFFICES[pos].group==="origin";
export const isPalaceGate = (pos:number) => isAcademic(pos)&&OFFICES[pos].order>=9;
export function examResult(learning:number, faces:Face[]) {
  const score=learning+faces.reduce((sum,f)=>sum+EXAM_POINTS[f],0);
  return { score, degree:[...DEGREES].reverse().find(d=>score>=d.min)!.id };
}
export function legacyDegree(pos:number):Degree|null {
  if(!isPalaceGate(pos))return null;
  return [...DEGREES].reverse().find(d=>d.position<=pos)?.id??"second";
}
// Keep every existing direct office destination. Academic-only arrows continue
// along the same face until the first office; a regressive/cyclic route waits.
export function appointmentAction(pos:number,face:Face):Action {
  const stay:Action={to:pos,coins:0,kind:"stay",short:"候铨",label:"暂候授官，已得科甲永久保留"};
  if(face==="赃")return stay;
  const visited=new Set<number>();let at=pos;
  while(!visited.has(at)) {
    visited.add(at);const a=actionsAt(at)[face];
    if(!isAcademic(a.to))return {...a,coins:0,kind:"transfer",short:OFFICES[a.to].name,label:"金榜授官："+OFFICES[a.to].department+"·"+OFFICES[a.to].name};
    if(a.to===at||OFFICES[a.to].order<OFFICES[at].order)return stay;
    at=a.to;
  }
  return stay;
}
export function careerFloor(player:{pos:number;degree?:Degree|null;appointed?:boolean},target:number) {
  if(!isAcademic(target))return target;
  if(player.appointed||!isAcademic(player.pos))return officeId("county.0");
  return player.degree?degreeInfo(player.degree).position:target;
}
