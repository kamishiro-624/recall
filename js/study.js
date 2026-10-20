/* study */
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function front(c){return kind(c)==="fill-in"?clozeHTML(c.q,false):(c.q?esc(c.q):"What is this?")}
function back(c){return kind(c)==="fill-in"?clozeHTML(c.q,true)+(c.a?"\n"+esc(c.a):""):esc(c.a)}
function studyView(v){
 if(!DB.cards.length){v.innerHTML='<div class="panel"><h2>Start with some notes</h2><p>Upload a slide deck or document, paste notes, or build cards by hand. Cards can hold text, fill-in-the-blank, images and audio.</p><div class="row"><button class="primary" data-g="import">Import a file</button><button data-g="add">Create a card</button><button id="sm">Load sample deck</button></div></div>';
  v.querySelectorAll("[data-g]").forEach(function(b){b.onclick=function(){tab=b.dataset.g;render()}});
  $("#sm").onclick=function(){var d=ensureDeck("Cell biology sample");[["Mitochondria","Organelles that make most of a cell's ATP"],["The {{c1::nucleus}} stores a cell's DNA and controls its activity.",""],["Osmosis","Water moving across a membrane toward higher solute concentration"],["Chloroplasts capture light for {{c1::photosynthesis}}.",""]].forEach(function(x){DB.cards.push(mk({q:x[0],a:x[1]},d))});DB.cur="all";save();render()};return}
 if(!sess){var d=dueList();
  if(!d.length){var sc=scoped();var nx=sc.length?Math.min.apply(null,sc.map(function(c){return c.due})):Date.now();var h=Math.max(1,Math.round((nx-Date.now())/36e5));
   v.innerHTML='<div class="panel"><h2>All caught up</h2><p>'+(sc.length?"Next card is due in about "+(h>47?Math.round(h/24)+" days":h+" hours")+". Reviewing just as you start to forget builds the strongest memory.":"This deck has no cards yet.")+'</p>'+(sc.length?'<button id="all">Drill everything anyway</button>':"")+'</div>';
   if(sc.length)$("#all").onclick=function(){sess={q:shuffle(sc.slice()),i:0,r:0,res:{miss:0,shaky:0,got:0}};render()};return}
  sess={q:shuffle(d.slice()),i:0,r:0,res:{miss:0,shaky:0,got:0}}}
 if(sess.i>=sess.q.length){var s=sess.res;v.innerHTML='<div class="panel"><h2>Session done</h2><p>'+s.got+' remembered, '+s.shaky+' shaky, '+s.miss+' missed.</p><p class="hint">Missed cards come back soon; cards you know move to longer gaps.</p><button class="primary" id="d">Back to cards</button></div>';$("#d").onclick=function(){sess=null;render()};return}
 var c=sess.q[sess.i];
 v.innerHTML='<div class="panel"><div class="meta ui"><span>Card '+(sess.i+1)+' of '+sess.q.length+' · '+kind(c)+'</span><span>Box '+c.box+' of 5</span></div><div class="bar"><i style="width:'+(sess.i/sess.q.length*100)+'%"></i></div>'+media(c)+'<p class="q">'+front(c)+'</p>'+
 (sess.r?'<div class="mine" id="mine"></div><div class="answer">'+back(c)+'</div><p class="hint">How close was your answer? (keys 1, 2, 3)</p><div class="row rate"><button class="r-miss" data-r="1">1 · Missed it</button><button class="r-shaky" data-r="2">2 · Shaky</button><button class="r-got" data-r="3">3 · Got it</button></div>'
 :'<label for="u">Say or type what you remember before you look. Guessing counts.</label><textarea id="u" placeholder="Your answer"></textarea><div class="row"><button class="primary" id="rv">Show answer</button></div>')+'</div>';
 if(!sess.r){var u=$("#u");u.focus();$("#rv").onclick=function(){sess.mine=u.value.trim();sess.r=1;render()}}
 else{$("#mine").textContent=sess.mine?"You wrote: "+sess.mine:"No attempt written.";document.querySelectorAll(".rate button").forEach(function(b){b.onclick=function(){grade(c,+b.dataset.r)}})}}
document.addEventListener("keydown",function(e){if(tab==="study"&&sess&&sess.r&&/^[123]$/.test(e.key)&&e.target.tagName!=="TEXTAREA")grade(sess.q[sess.i],+e.key)});
function grade(c,r){c.seen++;if(r===3){c.box=Math.min(5,c.box+1);sess.res.got++}else if(r===2)sess.res.shaky++;else{c.box=1;sess.res.miss++}
 c.due=r===1?Date.now()+DAY*0.01:Date.now()+GAPS[c.box-1]*DAY;save();sess.i++;sess.r=0;sess.mine="";render()}
