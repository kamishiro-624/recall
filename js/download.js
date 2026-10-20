/* Saving files: uses the Claude artifact downloads capability when present, otherwise a normal browser download */
var DL=null;
function saveFile(name,data){
 if(DL)return DL.save({filename:name,data:data});
 return new Promise(function(res,rej){
  try{var b=new Blob([data],{type:/\.json$/.test(name)?"application/json":/\.html$/.test(name)?"text/html":"text/plain"}),u=URL.createObjectURL(b),a=document.createElement("a");
   a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1000);res()}
  catch(e){rej(e)}})}
