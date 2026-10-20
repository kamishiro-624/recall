/* App shell: deck selector, tabs, router */
/* shell */
function shell(){
 var s=$("#deck");s.innerHTML='<option value="all">All decks ('+DB.cards.length+')</option>'+DB.decks.map(function(d){return'<option value="'+d.id+'"'+(DB.cur===d.id?" selected":"")+'>'+esc(d.name)+' ('+DB.cards.filter(function(c){return c.deck===d.id}).length+')</option>'}).join("");
 s.value=DB.cur;
 var t=[["study","Study ("+dueList().length+" due)"],["add","Create"],["import","Import"],["lib","Library"]];
 $("#nav").innerHTML=t.map(function(x){return'<button data-t="'+x[0]+'" class="'+(tab===x[0]?"on":"")+'">'+x[1]+'</button>'}).join("");
 document.querySelectorAll("#nav button").forEach(function(b){b.onclick=function(){tab=b.dataset.t;sess=null;render()}})}
$("#deck").onchange=function(){DB.cur=this.value;save();sess=null;render()};
function render(){shell();var v=$("#view");({study:studyView,add:addView,import:importView,lib:libView})[tab](v)}
