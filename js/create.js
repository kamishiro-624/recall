/* create / edit */
function readURL(f){return new Promise(function(res){var r=new FileReader();r.onload=function(){res(r.result)};r.readAsDataURL(f)})}
function readImg(f){return new Promise(function(res){readURL(f).then(function(u){var im=new Image();im.onload=function(){var s=Math.min(1,1000/Math.max(im.width,im.height));if(s===1||/svg|gif/.test(f.type))return res(u);var c=document.createElement("canvas");c.width=im.width*s;c.height=im.height*s;c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.82))};im.onerror=function(){res(u)};im.src=u})})}
function addView(v){
 var dn=form.deck||(DB.cur!=="all"?deckName(DB.cur):"")||"My deck";
 v.innerHTML='<div class="panel"><h2>'+(form.id?"Edit card":"Create a card")+'</h2><label for="fd">Deck</label><input type="text" id="fd" list="dl" value="'+esc(dn)+'"><datalist id="dl">'+DB.decks.map(function(d){return'<option value="'+esc(d.name)+'">'}).join("")+'</datalist>'+
 '<label for="fq">Prompt <span class="hint">(for fill-in-the-blank, write {{c1::the hidden words}} in a sentence)</span></label><textarea id="fq">'+esc(form.q)+'</textarea>'+
 '<label for="fa">Answer</label><textarea id="fa">'+esc(form.a)+'</textarea>'+
 '<label for="fi">Picture (optional)</label><input type="file" id="fi" accept="image/*">'+
 '<label for="fu">Audio (optional): upload or record</label><input type="file" id="fu" accept="audio/*"><div class="row"><button id="rec">Record audio</button><span class="hint" id="recs"></span></div><div id="pv">'+media(form)+'</div>'+
 '<div class="row"><button class="primary" id="sv">'+(form.id?"Save changes":"Add card")+'</button>'+(form.id?'<button id="cx">Cancel</button>':"")+'</div><p class="hint" id="msg" role="status"></p></div>';
 $("#fq").oninput=function(){form.q=this.value};$("#fa").oninput=function(){form.a=this.value};$("#fd").oninput=function(){form.deck=this.value};
 $("#fi").onchange=async function(){if(this.files[0]){form.img=await readImg(this.files[0]);$("#pv").innerHTML=media(form)}};
 $("#fu").onchange=async function(){if(this.files[0]){form.aud=await readURL(this.files[0]);$("#pv").innerHTML=media(form)}};
 var mr=null;$("#rec").onclick=async function(){
  if(mr){mr.stop();return}
  try{var st=await navigator.mediaDevices.getUserMedia({audio:true}),ch=[];mr=new MediaRecorder(st);mr.ondataavailable=function(e){ch.push(e.data)};
   mr.onstop=async function(){st.getTracks().forEach(function(t){t.stop()});form.aud=await readURL(new Blob(ch,{type:mr.mimeType||"audio/webm"}));mr=null;$("#rec").textContent="Record audio";$("#recs").textContent="Recorded.";$("#pv").innerHTML=media(form)};
   mr.start();this.textContent="Stop recording";$("#recs").textContent="Recording…"}catch(e){mr=null;$("#recs").textContent="Microphone isn't available here. Upload an audio file instead."}};
 $("#sv").onclick=function(){
  if(!form.q.trim()&&!form.img&&!form.aud){say("Add a prompt, picture or audio first.");return}
  if(!form.a.trim()&&kind(form)!=="fill-in"){say("Add an answer to check yourself against.");return}
  var d=ensureDeck(form.deck||dn);
  if(form.id){var c=DB.cards.find(function(x){return x.id===form.id});if(c){c.q=form.q;c.a=form.a;c.img=form.img;c.aud=form.aud;c.deck=d}form=blank();tab="lib";save();render();return}
  DB.cards.push(mk(form,d));save();form=blank();form.deck=deckName(d);say("Card added.");render();$("#msg").textContent="Card added."};
 if($("#cx"))$("#cx").onclick=function(){form=blank();tab="lib";render()}}
