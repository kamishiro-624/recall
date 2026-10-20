/* App shell: deck selector, tabs, router */
function shell(){
 var s=$("#deck");s.innerHTML='<option value="all">All decks ('+DB.cards.length+')</option>'+DB.decks.map(function(d){return'<option value="'+d.id+'">'+esc(d.name)+' ('+DB.cards.filter(function(c){return c.deck===d.id}).length+')</option>'}).join("");
 s.value=DB.cur;
 var t=[["dash","Dashboard"],["study","Study ("+(reviewDue().length+lessonCount())+")"],["add","Create"],["import","Import"],["lib","Library"],["set","Settings"]];
 $("#nav").innerHTML=t.map(function(x){return'<button data-t="'+x[0]+'" class="'+(tab===x[0]?"on":"")+'">'+x[1]+'</button>'}).join("");
 document.querySelectorAll("#nav button").forEach(function(b){b.onclick=function(){tab=b.dataset.t;render()}})}
$("#deck").onchange=function(){DB.cur=this.value;save();sess=null;render()};
function render(){shell();var v=$("#view");v.className=tab==="dash"?"":"wrap";({dash:dashView,study:studyView,add:addView,import:importView,lib:libView,set:setView})[tab](v)}
