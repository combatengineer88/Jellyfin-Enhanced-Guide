(() => {
"use strict";
if (window.EnhancedGuide) window.EnhancedGuide.stop();
const style=document.createElement("style");
style.textContent=`.programCell.eg-art{background-repeat:no-repeat!important;background-size:auto 96%!important;background-position:4px center!important;padding-left:var(--eg-offset,52px)!important;box-sizing:border-box!important;border-radius:6px!important}.programCell.eg-art:focus-visible{outline:2px solid #38bdf8!important}`;
document.head.append(style);
const defaults={mode:"Poster",height:110,poster:64,progress:true,details:true};
let prefs={...defaults};try{Object.assign(prefs,JSON.parse(localStorage.getItem("eg-settings-v11")||"{}"));}catch{}
const panel=document.createElement("div");panel.id="eg-panel";panel.hidden=true;
panel.innerHTML='<strong>Enhanced Guide</strong><label>Layout <select id="eg-mode"><option>Poster</option><option>Classic</option><option>Cinematic</option><option>Compact</option></select></label><label>Row height <input id="eg-height" type="range" min="60" max="160" step="10"></label><label>Poster width <input id="eg-poster" type="range" min="30" max="95" step="5"></label><label><input id="eg-progress" type="checkbox"> Playback progress</label><label><input id="eg-details" type="checkbox"> Episode details</label><button id="eg-reset">Restore defaults</button><button id="eg-close">Close</button>';
document.body.append(panel);
const toggle=document.createElement("button");toggle.id="eg-toggle";toggle.textContent="Guide settings";toggle.hidden=true;document.body.append(toggle);
toggle.onclick=()=>{panel.hidden=!panel.hidden;};panel.querySelector("#eg-close").onclick=()=>panel.hidden=true;
function apply(){
 const root=document.documentElement;root.dataset.egMode=prefs.mode;
 root.style.setProperty("--eg-height",(prefs.mode==="Compact"?60:prefs.mode==="Classic"?70:prefs.height)+"px");
 root.style.setProperty("--eg-poster",(prefs.mode==="Compact"?32:prefs.mode==="Classic"?40:prefs.poster)+"px");
 for(const k of ["mode","height","poster","progress","details"]){const e=panel.querySelector("#eg-"+k);if(e.type==="checkbox")e.checked=prefs[k];else e.value=prefs[k];}
 root.classList.toggle("eg-progress",prefs.progress);root.classList.toggle("eg-details",prefs.details);
 try{localStorage.setItem("eg-settings-v11",JSON.stringify(prefs));}catch{}
}
for(const k of ["mode","height","poster","progress","details"]){const e=panel.querySelector("#eg-"+k);e.oninput=()=>{prefs[k]=e.type==="checkbox"?e.checked:e.type==="range"?Number(e.value):e.value;apply();};}
panel.querySelector("#eg-reset").onclick=()=>{prefs={...defaults};apply();};apply();
style.textContent+=`
#eg-toggle{position:fixed;right:24px;bottom:24px;z-index:1000;background:#087da5;color:white;border:0;border-radius:8px;padding:12px;cursor:pointer}
#eg-panel{position:fixed;right:24px;bottom:76px;z-index:1001;background:#172334;color:white;border:1px solid #40536b;border-radius:12px;padding:18px;width:250px;box-shadow:0 8px 30px #0008}
#eg-panel label{display:flex;align-items:center;justify-content:space-between;margin:12px 0;gap:8px}#eg-panel button{margin:5px;padding:6px}
.programCell{min-height:var(--eg-height)!important;border-radius:8px!important;box-shadow:inset 0 0 0 1px #ffffff18;background-color:#203044!important;overflow:hidden}
.guideChannel,.channelCell,.programRow,.guideRow{min-height:var(--eg-height)!important;height:var(--eg-height)!important}
.programCell.eg-art{background-size:var(--eg-poster) auto!important;padding-left:calc(var(--eg-poster) + 12px)!important}
[data-eg-mode="Cinematic"] .programCell.eg-art{background-size:cover!important;background-position:center!important;padding-left:12px!important;text-shadow:0 1px 5px black}
.eg-meta{display:none;font-size:11px;opacity:.85;pointer-events:none}.eg-details .eg-meta{display:block}
.eg-bar{display:none;position:absolute;bottom:2px;left:0;height:4px;background:#00a4dc;pointer-events:none}.eg-progress .eg-bar{display:block}
`;
const cache=new Map(), pending=new Set(), touched=new Set();
let running=false, stopped=false;
const norm=s=>String(s||"").normalize("NFKC").trim().toLowerCase();
const api=()=>window.ApiClient;
async function get(path,params={}) {
 const a=api(); return a.getJSON(a.getUrl(path,params));
}
async function match(id) {
 const a=api(), user=a.getCurrentUserId();
 const p=await get("LiveTv/Programs/"+encodeURIComponent(id),{UserId:user});
 const title=p.Name;
 if(!title) return null;
 const type=p.IsMovie?"Movie":"Series";
 const result=await get("Items",{UserId:user,Recursive:true,IncludeItemTypes:type,SearchTerm:title,Limit:30,Fields:"ProviderIds"});
 let hits=(result.Items||[]).filter(x=>norm(x.Name)===norm(title));
 if(p.ProductionYear&&hits.length>1) hits=hits.filter(x=>x.ProductionYear===p.ProductionYear);
 if(hits.length!==1) return {art:p.ImageTags?.Primary?p:null,p};
 let item=hits[0];
 if(type==="Series"&&p.ParentIndexNumber!=null){
 const seasons=await get("Shows/"+item.Id+"/Seasons",{UserId:user});
 const season=(seasons.Items||[]).find(x=>x.IndexNumber===p.ParentIndexNumber&&x.ImageTags?.Primary);
 if(season) item=season;
 }
 return {art:item.ImageTags?.Primary?item:p.ImageTags?.Primary?p:null,p};
}
function paint(cell,data,id){
 if(!data||stopped||!cell.isConnected||cell.dataset.id!==id)return;
 const {art:item,p}=data;
 if(cell.dataset.egId!==id){cell.querySelectorAll(".eg-meta,.eg-bar").forEach(e=>e.remove());cell.classList.remove("eg-art");cell.style.removeProperty("background-image");cell.dataset.egId=id;}
 if(item&&cell.clientWidth>=80){
 const url=api().getUrl("Items/"+item.Id+"/Images/Primary",{maxHeight:300,tag:item.ImageTags.Primary});
 const backdrop=prefs.mode==="Cinematic"&&item.BackdropImageTags?.length;
 const image=backdrop?api().getUrl("Items/"+item.Id+"/Images/Backdrop/0",{maxWidth:640,tag:item.BackdropImageTags[0]}):url;
 cell.style.backgroundImage=(prefs.mode==="Cinematic"?"linear-gradient(90deg,#101827e8,#10182755),":"")+"url("+JSON.stringify(image)+")";
 cell.classList.add("eg-art");
 }
 if(!cell.querySelector(".eg-meta")){
 const m=document.createElement("span");m.className="eg-meta";
 m.textContent=[p.ParentIndexNumber!=null&&p.IndexNumber!=null?"S"+p.ParentIndexNumber+" E"+p.IndexNumber:"",p.ProductionYear||"",p.OfficialRating||""].filter(Boolean).join(" · ");cell.append(m);
 }
 if(p.Overview)cell.title=p.Overview;
 const start=Date.parse(p.StartDate),end=Date.parse(p.EndDate),now=Date.now();
 let bar=cell.querySelector(".eg-bar");
 if(now>=start&&now<end){if(!bar){bar=document.createElement("span");bar.className="eg-bar";cell.append(bar);}bar.style.width=((now-start)/(end-start)*100)+"%";}else bar?.remove();
 touched.add(cell);
}
async function scan(){
 if(stopped)return;toggle.hidden=!document.querySelector(".programCell");if(toggle.hidden)panel.hidden=true;if(running||!api()?.getCurrentUserId?.())return;
 running=true;
 try{
 const user=api().getCurrentUserId();
 for(const cell of document.querySelectorAll(".programCell[data-id]")){
 if(stopped)break;
 const id=cell.dataset.id,key=user+":"+id;
 if(!id||cell.clientWidth<55)continue;
 if(cache.has(key)){paint(cell,cache.get(key),id);continue;}
 if(pending.has(key))continue;
 pending.add(key);
 try{const item=await match(id);if(cache.size>=1000)cache.clear();cache.set(key,item);paint(cell,item,id);}
 catch(e){console.debug("[Enhanced Guide] lookup failed",e);}
 finally{pending.delete(key);}
 }
 }finally{running=false;}
}
const timer=setInterval(scan,1800);
window.EnhancedGuide={scan,stop(){stopped=true;clearInterval(timer);style.remove();panel.remove();toggle.remove();delete document.documentElement.dataset.egMode;document.documentElement.classList.remove("eg-progress","eg-details");for(const cell of touched){cell.classList.remove("eg-art");cell.querySelectorAll(".eg-meta,.eg-bar").forEach(e=>e.remove());cell.style.removeProperty("background-image");cell.style.removeProperty("--eg-offset");}cache.clear();}};
scan();
console.info("[Enhanced Guide] preview active");
})();