/* Dashboard: modular widgets (show/hide and reorder) */
function act(x){return x.r+x.q+x.l>0}
function bar(label,v,max){var p=max>0?Math.min(100,v/max*100):0;return'<div class="meta ui" style="margin-top:8px"><span>'+label+'</span><span>'+v+(max>0?" / "+max:" · no limit")+'</span></div><div class="bar"><i style="width:'+p+'%"></i></div>'}
var WDEFS={
 reviews:{t:"Reviews",w:1,r:function(){var n=reviewDue().length;return'<div class="big">'+n+'</div><p class="hint">ready to review'+(S().maxReviews>0?" · daily cap "+S().maxReviews:"")+'</p><button class="primary" data-go="reviews"'+(n?"":" disabled")+'>Start reviews</button>'}},
 lessons:{t:"Lessons",w:1,r:function(){var n=lessonCount();return'<div class="big">'+n+'</div><p class="hint">'+inStage("new").length+' new · '+inStage("learning").length+' in learning</p><button class="primary" data-go="lessons"'+(n?"":" disabled")+'>Start lessons</button>'}},
 daily:{t:"Today",w:1,r:function(){var L=lgp();return bar("New cards learned",L.l,S().newPerDay)+bar("Reviews done",L.r,S().maxReviews)+'<p class="hint" style="margin-bottom:0">Change limits in Settings.</p>'}},
 stages:{t:"Progress by stage",w:2,r:function(){var n=[0,0,0,0,0,0],tot=0;scoped().forEach(function(c){n[c.stage==="new"?0:c.stage==="learning"?1:c.box<=2?2:c.box]++;tot++});
  var nm=["New","Learning","Familiar","Solid","Strong","Mastered"],col=["var(--line)","var(--mid)","var(--acc)","var(--acc)","var(--acc)","var(--ok)"],op=[1,1,.4,.65,.9,1];
  return'<div class="stack" role="img" aria-label="Cards by stage">'+n.map(function(x,i){return x?'<i style="width:'+(x/tot*100)+'%;background:'+col[i]+';opacity:'+op[i]+'"></i>':""}).join("")+'</div><div class="legend">'+n.map(function(x,i){return'<span><i style="background:'+col[i]+';opacity:'+op[i]+'"></i>'+nm[i]+' <b>'+x+'</b></span>'}).join("")+'</div>'}},
 forecast:{t:"Review forecast",w:2,r:function(){var d=[0,0,0,0,0,0,0],st=new Date();st.setHours(0,0,0,0);
  inStage("review").forEach(function(c){var i=c.due<=Date.now()?0:Math.floor((c.due-st.getTime())/DAY);if(i>=0&&i<7)d[i]++});
  var mx=Math.max.apply(null,d.concat([1])),dn=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return'<div class="fc">'+d.map(function(x,i){return'<div><span class="ui">'+x+'</span><i style="height:'+(x/mx*64+4)+'px"></i><small>'+(i?dn[new Date(st.getTime()+i*DAY).getDay()]:"Today")+'</small></div>'}).join("")+'</div>'}},
 streak:{t:"Streak",w:1,r:function(){var s=0,d=new Date();if(!act(lgp(d)))d.setDate(d.getDate()-1);while(act(lgp(d))&&s<1000){s++;d.setDate(d.getDate()-1)}
  var r=0,c=0;for(var i=0;i<7;i++){var x=lgp(new Date(Date.now()-i*DAY));r+=x.r;c+=x.c}
  return'<div class="big">'+s+'</div><p class="hint">day streak</p><p class="hint" style="margin-bottom:0">Review accuracy this week: <b>'+(r?Math.round(c/r*100)+"%":"none yet")+'</b></p>'}},
 activity:{t:"Activity",w:2,r:function(){var h="";for(var i=27;i>=0;i--){var d=new Date(Date.now()-i*DAY),x=lgp(d),n=x.r+x.q+x.l;h+='<i class="hm l'+(n===0?0:n<10?1:n<30?2:3)+'" title="'+today(d)+": "+n+' answers"></i>'}return'<div class="heat">'+h+'</div><p class="hint" style="margin-bottom:0">Last 28 days, darker means more answers.</p>'}},
 decks:{t:"Decks",w:1,r:function(){if(!DB.decks.length)return'<p class="hint">No decks yet.</p>';
  return DB.decks.map(function(d){var cs=DB.cards.filter(function(c){return c.deck===d.id}),due=cs.filter(function(c){return c.stage==="review"&&c.due<=Date.now()}).length,nw=cs.filter(function(c){return c.stage!=="review"}).length;
   return'<div class="item" style="padding:6px 0"><div class="body"><div>'+esc(d.name)+'</div><div class="a">'+cs.length+' cards · '+due+' due · '+nw+' to learn</div></div><button class="sm" data-deck="'+d.id+'"'+(DB.cur===d.id?' disabled':'')+'>'+(DB.cur===d.id?"Viewing":"View")+'</button></div>'}).join("")+(DB.cur!=="all"?'<div class="row"><button class="sm" data-deck="all">Show all decks</button></div>':"")}},
 trouble:{t:"Trouble spots",w:1,r:function(){var l=scoped().filter(function(c){return c.miss>0}).sort(function(a,b){return b.miss-a.miss}).slice(0,5);
  return l.length?l.map(function(c){return'<div class="item" style="padding:6px 0"><div class="body"><div>'+esc((c.q||"(picture or audio)").replace(/\n/g," "))+'</div></div><span class="chip">missed '+c.miss+'×</span></div>'}).join(""):'<p class="hint">Cards you miss most will show up here.</p>'}},
 actions:{t:"Quick actions",w:1,r:function(){return'<div class="row" style="margin:0"><button data-go="add">Create card</button><button data-go="import">Import file</button><button data-go="lib">Library &amp; export</button><button data-go="set">Settings</button><button data-go="practice">Practice (no scheduling)</button></div>'}}
};
var WORDER=["reviews","lessons","daily","stages","forecast","streak","activity","decks","trouble","actions"];
function normWidgets(){var cur=Array.isArray(DB.widgets)?DB.widgets.filter(function(x){return WDEFS[x.id]}):[];WORDER.forEach(function(id){if(!cur.some(function(x){return x.id===id}))cur.push({id:id,on:true})});DB.widgets=cur}
function emptyPanel(){return'<div class="panel"><h2>Welcome to Recall</h2><p>Add some notes to get started. Upload a slide deck or document, paste notes, or build a card by hand. Cards can hold text, fill-in-the-blank, images and audio.</p><div class="row"><button class="primary" data-go="import">Import a file</button><button data-go="add">Create a card</button><button id="sm">Load sample deck</button></div></div>'}
function loadSample(){var d=ensureDeck("Cell biology sample");[["Mitochondria","Organelles that make most of a cell's ATP"],["The {{c1::nucleus}} stores a cell's DNA and controls its activity.",""],["Osmosis","Water moving across a membrane toward higher solute concentration"],["Chloroplasts capture light for {{c1::photosynthesis}}.",""],["Enzyme","A protein that speeds up a chemical reaction without being used up"]].forEach(function(x){if(!findDup({q:x[0]},d))DB.cards.push(mk({q:x[0],a:x[1]},d))});DB.cur="all";save();render()}
function go(g){if(g==="reviews")startReviews();else if(g==="lessons")startLessons();else if(g==="practice")startPractice();else{tab=g;render()}}
function wire(v){v.querySelectorAll("[data-go]").forEach(function(b){b.onclick=function(){go(b.dataset.go)}});if($("#sm",v))$("#sm",v).onclick=loadSample}
function dashView(v){
 if(!DB.cards.length){v.innerHTML=emptyPanel();wire(v);return}
 var ws=DB.widgets;
 v.innerHTML='<div class="row" style="margin:0 0 12px;justify-content:space-between"><h2 style="margin:0">'+(DB.cur==="all"?"All decks":esc(deckName(DB.cur)))+'</h2><button id="cz" class="'+(editDash?"on":"")+'">'+(editDash?"Done":"Customize")+'</button></div>'+(editDash?'<p class="hint">Show or hide widgets and move them up or down.</p>':"")+
 '<div class="grid">'+ws.map(function(w,i){var d=WDEFS[w.id];if(!w.on&&!editDash)return"";
  return'<section class="w'+(d.w===2?" w2":"")+(w.on?"":" off")+'" aria-label="'+d.t+'"><div class="wh"><h3>'+d.t+'</h3>'+(editDash?'<span class="wc"><label class="inl"><input type="checkbox" data-vis="'+i+'"'+(w.on?" checked":"")+'> Show</label><button class="sm" data-mv="'+i+'" data-dir="-1" aria-label="Move '+d.t+' earlier">↑</button><button class="sm" data-mv="'+i+'" data-dir="1" aria-label="Move '+d.t+' later">↓</button></span>':"")+'</div>'+(w.on?d.r():'<p class="hint">Hidden</p>')+'</section>'}).join("")+'</div>';
 wire(v);
 $("#cz").onclick=function(){editDash=!editDash;render()};
 v.querySelectorAll("[data-vis]").forEach(function(c){c.onchange=function(){DB.widgets[+c.dataset.vis].on=c.checked;save();render()}});
 v.querySelectorAll("[data-mv]").forEach(function(b){b.onclick=function(){var i=+b.dataset.mv,j=i+ +b.dataset.dir;if(j<0||j>=DB.widgets.length)return;var t=DB.widgets[i];DB.widgets[i]=DB.widgets[j];DB.widgets[j]=t;save();render()}});
 v.querySelectorAll("[data-deck]").forEach(function(b){b.onclick=function(){DB.cur=b.dataset.deck;sess=null;save();render()}})}
