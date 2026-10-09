/* Local-only score ledger: no identity, network request or account required. */
(function(root){
class Scores {
 constructor(storage){this.storage=storage;this.rows=[];this.available=true;
  try{const rows=JSON.parse(storage.getItem('rescene.independent.recent')||'[]');if(Array.isArray(rows))this.rows=rows.filter(r=>r&&Number.isSafeInteger(r.score)&&r.score>=0&&Number.isFinite(r.time)).slice(0,10);}catch{this.available=false;}
 }
 add(score,reason){if(!Number.isSafeInteger(score)||score<0)return;this.rows.unshift({score,time:Date.now(),reason});this.rows=this.rows.slice(0,10);try{this.storage.setItem('rescene.independent.recent',JSON.stringify(this.rows));}catch{this.available=false;}}
}
if(typeof module==='object')module.exports=Scores;else root.ResceneScores=Scores;
})(globalThis);
