/* Core: state, helpers, storage (IndexedDB) and the card model */
var GAPS=[0,1,3,7,14],DAY=864e5,DB={decks:[],cards:[],cur:"all"},tab="study",sess=null,form=blank(),imp={direct:[],secs:[],items:[],deck:"",msg:""};
var CLOZE=/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;
function $(s,r){return(r||document).querySelector(s)}
function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36)}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function blank(){return{id:"",deck:"",q:"",a:"",img:"",aud:""}}
function say(t){$("#sr").textContent=t;var m=$("#msg");if(m)m.textContent=t}
/* storage: IndexedDB so images and audio fit */
function idb(){return new Promise(function(res,rej){var r=indexedDB.open("recall",1);r.onupgradeneeded=function(){r.result.createObjectStore("kv")};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
async function loadDB(){try{var d=await idb();var v=await new Promise(function(res){var q=d.transaction("kv").objectStore("kv").get("db");q.onsuccess=function(){res(q.result)};q.onerror=function(){res(null)}});if(v&&v.cards)DB=v}catch(e){}}
var tmr;function save(){clearTimeout(tmr);tmr=setTimeout(async function(){try{var d=await idb();d.transaction("kv","readwrite").objectStore("kv").put(DB,"db")}catch(e){}},250)}
/* model */
function ensureDeck(n){n=(n||"").trim()||"My deck";var d=DB.decks.find(function(x){return x.name.toLowerCase()===n.toLowerCase()});if(!d){d={id:uid(),name:n};DB.decks.push(d)}return d.id}
function scoped(){return DB.cards.filter(function(c){return DB.cur==="all"||c.deck===DB.cur})}
function dueList(){var n=Date.now();return scoped().filter(function(c){return c.due<=n})}
function mk(o,deck){return{id:uid(),deck:deck,q:o.q||"",a:o.a||"",img:o.img||"",aud:o.aud||"",box:1,due:0,seen:0}}
function kind(c){return/\{\{c\d+::/.test(c.q)?"fill-in":c.img?"image":c.aud?"audio":"text"}
function clozeHTML(q,show){return esc(q).replace(CLOZE,show?"<mark>$1</mark>":'<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>')}
function clozePlain(q){var a=[];var p=q.replace(CLOZE,function(m,w){a.push(w);return"_____"});return{p:p,a:a.join(", ")}}
function media(c){return(c.img?'<img class="pic" alt="Card picture" src="'+c.img+'">':"")+(c.aud?'<audio controls src="'+c.aud+'"></audio>':"")}
function deckName(id){var d=DB.decks.find(function(x){return x.id===id});return d?d.name:""}
