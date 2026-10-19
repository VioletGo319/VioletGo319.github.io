/**
 * Research-informed game adaptation, not a transcription of one surviving board.
 * Museum-verified: concentric layout, grouped offices, four-result per-square rules;
 * and the exact 白丁 result mapping quoted by the Palace Museum.
 * Other transitions, office ordering and currency effects are authored for this game.
 */
export const FACES = ["德", "才", "功", "赃"] as const;
export type Face = typeof FACES[number];
export type Action = { to: number; coins: number; label: string; short: string; kind: "promotion" | "transfer" | "stay" | "demotion" | "tribute" | "finish"; tribute?: number; verified?: boolean };
export type Group = { key: string; name: string; layer: "origin" | "outer" | "middle" | "center"; x: number; y: number; w: number; h: number; cols: number; description: string; ids: number[] };
export type Office = { id: number; key: string; name: string; department: string; group: string; order: number; stage: string; description: string };
export const BOARD_WIDTH = 1200, BOARD_HEIGHT = 1260;
export const SOURCES = [
  { title: "故宫博物院 · 折叠式《升官图》", url: "https://www.dpm.org.cn/collection/utensil/232141.html", note: "三圈布局、衙门分区、四字陀螺与白丁判词。" },
  { title: "国立台湾历史博物馆 · 木板印升官图", url: "https://collections.nmth.gov.tw/CollectionContent.aspx?a=132&rno=2006.002.1694", note: "中心三公、15 种功名出身及逐格奖惩结构。" },
  { title: "洛阳民俗博物馆 ·《上官图》游戏图", url: "https://www.lymsmuseum.cn/collect/judge/59.html", note: "按判词跨官职跳转的实际路径，也说明不同图本规则有别。" },
  { title: "故宫博物院 · 庶吉士", url: "https://www.dpm.org.cn/lemmas/245384.html", note: "留馆与散馆的分流背景，作为翰林、地方仕途的设计参考。" },
  { title: "柳向春 · 记牛津大学所藏的一张升官图", url: "https://image.chinawriter.com.cn/n1/2025/0616/c442005-40501186.html", note: "引录牛津藏本向上司送见礼五筹的规则；不等于送礼保证晋升。" },
  { title: "山东法院 · 从考绩制度看清代的行政监督", url: "https://www.sdcourt.gov.cn/dyzy/372897/372830/42729193/index.html", note: "京察、大计与官员考核背景；本作的回合、门槛和奖励为创作。" },
  { title: "故宫博物院 · 文字狱", url: "https://www.dpm.org.cn/lemmas/241825.html", note: "因著述诗文遭致刑狱的概念背景；本作事件为架空受牵连情节。" },
  { title: "兰州大学课程资料 · 廷议", url: "https://courses.lzu.edu.cn/courses/100272/html/kczy/sycd7.html", note: "廷臣集议政事的背景；双人暗选和克制计分完全为游戏机制。" },
];
export const GROUPS: Group[] = [];
export const OFFICES: Office[] = [];
const ids: Record<string, number> = {};
function group(key: string, name: string, layer: Group["layer"], geometry: [number,number,number,number,number], description: string, entries: string[]) {
  const [x,y,w,h,cols] = geometry;
  const g: Group = { key,name,layer,x,y,w,h,cols,description,ids:[] };
  entries.forEach((name, order) => {
    const id = OFFICES.length, k = key + "." + order;
    ids[k] = id; g.ids.push(id);
    OFFICES.push({ id, key:k, name, department:g.name, group:key, order,
      stage: layer === "origin" ? "功名出身" : layer === "center" ? "朝堂中枢" : layer === "outer" ? "地方仕途" : "京官仕途",
      description: description + " 本区第 " + (order + 1) + " 位；次序用于本作升降与相逢结算。" });
  });
  GROUPS.push(g);
}
group("origin","功名出身","origin",[0,1070,1200,190,15],"寒窗、科举与出仕。不同功名会通往翰林、六部或地方衙门。",
  ["白丁","童生","案首","监生","秀才","廪生","贡生","举人","解元","进士","传胪","会元","探花","榜眼","状元"]);
group("county","外县衙门","outer",[0,180,180,290,1],"从县署杂职到知县，办理一县政务。",["典史","主簿","县丞","知县"]);
group("state","外州衙门","outer",[0,470,180,290,1],"州署分理政事，上接府级官署。",["吏目","州判","州同","知州"]);
group("prefecture","外府衙门","outer",[0,760,180,310,1],"府署统辖属县，也可转入省级官署。",["知事","经历","通判","同知","知府"]);
group("capitalCounty","京县衙门","outer",[1020,180,180,400,1],"京畿县署，与京府和中央各部相连。",["典史","主簿","县丞","知县"]);
group("capitalPrefecture","京府衙门","outer",[1020,580,180,490,1],"京府政务，兼具地方与京官仕途的交会。",["知事","经历","治中","府丞","府尹"]);
group("finance","布政司衙门","outer",[0,0,400,180,4],"一省民政钱粮，向督抚与户部衔接。",["库大使","理问","参议","布政使"]);
group("justice","按察司衙门","outer",[800,0,400,180,4],"一省刑名监察，向都察院与刑部衔接。",["照磨","知事","佥事","按察使"]);
group("province","外省衙门","outer",[400,0,400,180,4],"分道治理至督抚统辖，地方仕途可直通三公。",["粮道","分巡道","巡抚","总督"]);
group("hanlin","翰林院","middle",[180,180,840,160,9],"文章、修史与讲读。庶吉士在本作中可留馆，也可散馆外任。",
  ["庶吉士","检讨","编修","修撰","侍讲","侍读","侍讲学士","侍读学士","掌院学士"]);
group("censor","都察院","middle",[180,340,180,490,1],"纠察官纪，迁转可通往地方巡抚及内阁。",
  ["经历","都事","监察御史","佥都御史","副都御史","都御史"]);
group("temples","九卿诸寺","middle",[840,340,180,490,3],"将诸寺官职汇为一个游戏分区；其列序不代表历史上的单一晋升链。",
  ["太常寺主簿","鸿胪寺丞","太仆寺丞","光禄寺少卿","鸿胪寺卿","太仆寺少卿","大理寺少卿","太常寺卿","大理寺卿"]);
const ministries = [["personnel","吏部","官员铨选与考核"],["revenue","户部","户籍、田赋与钱粮"],["rites","礼部","礼仪、学校与科举"],["war","兵部","武官选用与军政"],["penalty","刑部","刑名与司法"],["works","工部","工程、营造与水利"]];
ministries.forEach(([key,name,desc], i) => group(key,name,"middle",[180+i*140,830,140,240,1],desc+"。六部分开设署，升降可转衙，而非一路顺走。",
  ["笔帖式","主事","员外郎","郎中","右侍郎","左侍郎","尚书"]));
group("cabinet","内阁","center",[360,340,480,140,6],"起草诏令、辅理政务，内阁重臣可进三公。",
  ["中书舍人","侍读","侍读学士","内阁学士","协办大学士","大学士"]);
group("court","三公","center",[360,480,480,290,3],"太保、太傅、太师。本作保留高位索贿的讽喻，唯太师逢德可荣归。",
  ["太保","太傅","太师"]);
group("home","荣归故里","center",[360,770,480,60,1],"先荣归者胜。功成身退，卸下朝服，与君共看山河。",["荣归"]);
export function officeId(key: string) {
  const result = ids[key];
  if (result === undefined) throw new Error("Unknown office key: " + key);
  return result;
}
export const HOME_ID = officeId("home.0"), TAISHI_ID = officeId("court.2");
export const BOARD_COUNT = OFFICES.length;
const tables: Record<Face,Action>[] = [];
function row(from: number, targets: [string,string,string,string], options: { verified?: boolean } = {}) {
  const here = OFFICES[from];
  tables[from] = Object.fromEntries(FACES.map((face, index) => {
    const to = officeId(targets[index]), target = OFFICES[to], stay = from === to;
    const kind: Action["kind"] = to === HOME_ID ? "finish" : stay ? "stay" : face === "赃" ? "demotion" : target.group === here.group ? "promotion" : "transfer";
    const prefix = kind === "finish" ? "" : kind === "stay" ? "" : kind === "demotion" ? (to === 0 ? "革职为" : "贬至") : kind === "transfer" ? "调任" : "升为";
    const fullTarget = target.group === here.group || target.group === "origin" || target.group === "court" ? target.name : target.department + "·" + target.name;
    const coins = kind === "finish" ? 20 : here.group === "origin" ? 0 : face === "赃" ? -10 : face === "德" ? 10 : face === "才" ? 6 : 4;
    return [face, { to, coins, short: stay ? "留任" : target.name, label: stay ? (here.group === "origin" ? "原位候试" : face === "赃" ? "留任，罚俸 10 两" : "留任，俸银 4 两") : kind === "finish" ? "荣归故里" : prefix + fullTarget, kind, ...(options.verified ? { verified:true } : {}) }];
  })) as Record<Face,Action>;
}
const originRows: [string,string,string,string][] = [
  ["origin.3","origin.2","origin.1","origin.0"],
  ["origin.4","origin.3","origin.2","origin.0"],
  ["origin.5","origin.4","origin.3","origin.1"],
  ["origin.6","county.1","origin.4","origin.0"],
  ["origin.7","origin.5","origin.4","origin.1"],
  ["origin.8","origin.6","origin.5","origin.4"],
  ["origin.9","capitalCounty.1","county.2","origin.3"],
  ["origin.11","origin.9","county.3","origin.4"],
  ["origin.11","origin.10","personnel.1","origin.7"],
  ["origin.14","origin.12","hanlin.0","origin.6"],
  ["origin.13","hanlin.2","hanlin.0","origin.9"],
  ["origin.14","origin.13","hanlin.3","origin.8"],
  ["hanlin.4","hanlin.2","hanlin.1","origin.9"],
  ["hanlin.5","hanlin.3","hanlin.2","origin.9"],
  ["hanlin.8","hanlin.6","hanlin.3","origin.12"],
];
originRows.forEach((r,i) => row(i,r,{ verified:i===0 }));
// Explicit departmental gateways; destinations are named offices, not a global index increment.
const gateways: Record<string,[string,string,string]> = {
  county:["prefecture.2","state.3","origin.4"],
  state:["prefecture.4","prefecture.3","county.0"],
  prefecture:["finance.2","justice.2","state.0"],
  capitalCounty:["capitalPrefecture.3","personnel.3","county.0"],
  capitalPrefecture:["rites.5","censor.4","capitalCounty.0"],
  finance:["province.2","revenue.4","prefecture.0"],
  justice:["province.2","penalty.4","prefecture.1"],
  province:["court.0","war.6","prefecture.3"],
  hanlin:["cabinet.3","rites.4","county.2"],
  censor:["cabinet.3","penalty.6","justice.0"],
  temples:["rites.6","cabinet.2","capitalPrefecture.1"],
  personnel:["cabinet.4","cabinet.3","county.1"],
  revenue:["cabinet.4","cabinet.3","finance.0"],
  rites:["cabinet.4","cabinet.3","hanlin.1"],
  war:["cabinet.4","cabinet.3","state.1"],
  penalty:["cabinet.4","cabinet.3","justice.0"],
  works:["cabinet.4","cabinet.3","prefecture.0"],
  cabinet:["court.2","court.0","personnel.2"],
};
for (const g of GROUPS) {
  if (!(g.key in gateways)) continue;
  const [deExit,caiExit,fall] = gateways[g.key], n = g.ids.length;
  g.ids.forEach((id,i) => row(id,[
    i+2 < n ? g.key+"."+(i+2) : deExit,
    i+1 < n ? g.key+"."+(i+1) : caiExit,
    g.key+"."+i,
    i>=2 ? g.key+"."+(i-2) : i===1 ? g.key+".0" : fall,
  ]));
}
function route(from: string, face: Face, to: string, label?: string) {
  const id=officeId(from), target=officeId(to), dest=OFFICES[target];
  const a=tables[id][face];
  tables[id][face]={...a,to:target,kind:face==="赃"?"demotion":"transfer",short:dest.name,label:label || (face==="赃"?"贬至":"调任")+dest.department+"·"+dest.name};
}
route("hanlin.0","功","county.3","散馆外任：外县知县");
route("hanlin.1","德","censor.2","察举入台：监察御史");
route("hanlin.3","才","rites.2","调任礼部员外郎");
route("censor.2","德","province.1","奉命巡行：分巡道");
route("censor.3","才","justice.3","外任按察使");
route("county.2","德","state.2");
route("state.2","才","prefecture.2");
route("prefecture.2","德","capitalPrefecture.2");
route("capitalPrefecture.2","德","temples.3");
route("finance.1","德","revenue.2");
route("justice.1","德","censor.2");
route("province.0","才","finance.3");
route("province.1","才","province.2");
route("province.2","德","province.3");
route("province.2","才","works.6");
route("personnel.3","德","temples.4");
route("revenue.3","德","finance.3");
route("rites.3","德","temples.7");
route("war.3","德","temples.5");
route("penalty.3","德","temples.8");
route("works.3","德","province.0");
route("temples.1","才","capitalPrefecture.2");
route("temples.4","才","rites.4");
route("temples.6","才","penalty.4");
route("cabinet.2","才","hanlin.8");
route("cabinet.4","德","court.1");
for (let i=0;i<3;i++) {
  const id=officeId("court."+i), to=i<2?officeId("court."+(i+1)):HOME_ID;
  tables[id]={
    德:{to,coins:i===2?20:10,label:i===2?"荣归故里":"晋升"+OFFICES[to].name,short:OFFICES[to].name,kind:i===2?"finish":"promotion"},
    才:{to:id,coins:0,tribute:10,label:"向对手索贿 10 两，留任",short:"索贿十两",kind:"tribute"},
    功:{to:id,coins:0,tribute:8,label:"向对手索贿 8 两，留任",short:"索贿八两",kind:"tribute"},
    赃:{to:id,coins:0,tribute:5,label:"向对手索贿 5 两，留任",short:"索贿五两",kind:"tribute"},
  };
}
tables[HOME_ID]=Object.fromEntries(FACES.map(f=>[f,{to:HOME_ID,coins:0,label:"已荣归",short:"已荣归",kind:"stay"}])) as Record<Face,Action>;
export function actionsAt(position:number): Record<Face,Action> {
  if (!Number.isInteger(position) || !tables[position]) throw new Error("棋子位置无效，请重新同步。");
  return tables[position];
}
export function officeRect(id:number) {
  const o=OFFICES[id], g=GROUPS.find(g=>g.key===o.group)!;
  const rows=Math.ceil(g.ids.length/g.cols), header=g.key==="home"?0:28;
  const w=g.w/g.cols,h=(g.h-header)/rows;
  return { x:g.x+(o.order%g.cols)*w,y:g.y+header+Math.floor(o.order/g.cols)*h,w,h };
}
export function officeCenter(id:number) { const r=officeRect(id);return {x:r.x+r.w/2,y:r.y+r.h/2}; }
// Map the original 25 squares to semantic destinations in the expanded board.
export const LEGACY_MAP = ["origin.0","origin.1","origin.4","origin.7","origin.6","origin.9","hanlin.0","hanlin.2","hanlin.1","personnel.1","personnel.2","personnel.3","county.3","prefecture.2","prefecture.4","justice.3","finance.3","province.2","personnel.5","personnel.6","cabinet.5","court.0","court.1","court.2","home.0"].map(officeId);
