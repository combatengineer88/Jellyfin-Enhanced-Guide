(() => {
"use strict";
if (window.EnhancedGuide) window.EnhancedGuide.stop();
const style=document.createElement("style");
style.textContent=`.programCell.eg-art{background-repeat:no-repeat!important;background-size:auto 96%!important;background-position:4px center!important;padding-left:var(--eg-offset,52px)!important;box-sizing:border-box!important;border-radius:6px!important}.programCell.eg-art:focus-visible{outline:2px solid #38bdf8!important}`;
document.head.append(style);
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
 if(hits.length!==1) return p.ImageTags?.Primary?p:null;
 let item=hits[0];
 if(type==="Series"&&p.ParentIndexNumber!=null){
 const seasons=await get("Shows/"+item.Id+"/Seasons",{UserId:user});
 const season=(seasons.Items||[]).find(x=>x.IndexNumber===p.ParentIndexNumber&&x.ImageTags?.Primary);
 if(season) item=season;
 }
 return item.ImageTags?.Primary?item:p.ImageTags?.Primary?p:null;
}
function paint(cell,item,id){
 if(!item||stopped||!cell.isConnected||cell.dataset.id!==id||cell.clientWidth<100)return;
 const h=Math.min(76,Math.max(24,cell.clientHeight-4));
 const w=Math.round(h*2/3)+8;
 const url=api().getUrl("Items/"+item.Id+"/Images/Primary",{maxHeight:160,tag:item.ImageTags.Primary});
 cell.style.backgroundImage="url("+JSON.stringify(url)+")";
 cell.style.setProperty("--eg-offset",w+"px");cell.classList.add("eg-art");touched.add(cell);
}
async function scan(){
 if(running||stopped||!api()?.getCurrentUserId?.())return;
 running=true;
 try{
 const user=api().getCurrentUserId();
 for(const cell of document.querySelectorAll(".programCell[data-id]")){
 if(stopped)break;
 const id=cell.dataset.id,key=user+":"+id;
 if(!id||cell.clientWidth<100)continue;
 if(cache.has(key)){paint(cell,cache.get(key),id);continue;}
 if(pending.has(key))continue;
 pending.add(key);
 try{const item=await match(id);if(cache.size>=1000)cache.clear();cache.set(key,item);paint(cell,item,id);}
 catch(e){console.debug("[Enhanced Guide] lookup failed",e);cache.set(key,null);}
 finally{pending.delete(key);}
 }
 }finally{running=false;}
}
const timer=setInterval(scan,1800);
window.EnhancedGuide={scan,stop(){stopped=true;clearInterval(timer);style.remove();for(const cell of touched){cell.classList.remove("eg-art");cell.style.removeProperty("background-image");cell.style.removeProperty("--eg-offset");}cache.clear();}};
scan();
console.info("[Enhanced Guide] preview active");
})();