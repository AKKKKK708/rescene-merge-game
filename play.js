/*
 * Browser controller and canvas renderer for this adaptation.
 * Gameplay/physics reference disclosure: https://github.com/YHSome/BigNaiWa
 * See COPYRIGHT.md for the complete attribution and rights statement.
 */
(function(){
'use strict';
const media=window.ResceneMedia,game=new window.ResceneSession(media.catalog),audio=new window.ResceneAudio(media.recordings);
const el=id=>document.getElementById(id),canvas=el('board'),paint=canvas.getContext('2d'),dialog=el('result');
const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}},write=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};
let record=Number(read('rescene.independent.best','0'))||0,muted=read('rescene.independent.mute','0')==='1',last=0,carry=0,dragging=false,mouseX=220,particles=[],popups=[],modalMode='',unlocked=1;
let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('storage unavailable')},setItem(){throw Error('storage unavailable')}};}
const ledger=new window.ResceneScores(storage);let played=false,saved=false;
record=Math.max(record,...ledger.rows.map(r=>r.score));
function renderHistory(){el('history-best').textContent=record;const list=el('score-history');list.innerHTML='';if(!ledger.rows.length){const li=document.createElement('li');li.textContent='暂无记录';list.append(li);}else ledger.rows.forEach((row,i)=>{const li=document.createElement('li');const date=new Date(row.time).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});li.textContent=(i+1)+'. '+row.score+' 分 · '+date+(row.reason==='restart'?' · 重开':'');list.append(li);});if(!ledger.available)el('history-note').textContent='当前浏览器无法保存记录，关闭页面后本次记录可能丢失。';}
function saveRound(reason){if(saved||(!played&&game.score===0))return;saved=true;record=Math.max(record,game.score);write('rescene.independent.best',record);ledger.add(game.score,reason);renderHistory();}
audio.enabled=!muted;renderHistory();
const sprites=media.catalog.map(item=>{const img=new Image();img.src=item.image;return img;});
const roster=el('roster');media.catalog.forEach(item=>{const li=document.createElement('li');const img=document.createElement('img');img.src=item.image;img.alt='第'+item.level+'级';li.append(img);roster.append(li);});
const panels=[el('score-details'),el('collection-details')];
const panelOpen=()=>panels.some(panel=>panel.open);
for(const [name,id] of [['scores','score-details'],['collection','collection-details']]){
 el(name+'-open').onclick=()=>{dragging=false;carry=0;audio.stop();el(id).showModal();};
 el(name+'-close').onclick=()=>el(id).close();
 el(id).addEventListener('close',()=>{last=0;carry=0;});
}
let lastView='',coinLife=0,coinAmount=0;
function coinNotice(amount){coinAmount=coinLife>0?coinAmount+amount:amount;coinLife=1;el('coin-toast').hidden=false;el('coin-message').textContent='获得复活币 +'+coinAmount;audio.cue('coin');}

function refresh(){
 if(game.mode==='over')saveRound('ended');
 const view=[game.score,record,game.coins,game.current,game.next,muted,game.mode,unlocked].join(':');if(view===lastView)return;lastView=view;
 el('points').textContent=game.score;el('record').textContent=record;el('tokens').textContent=game.coins;
 el('current-label').textContent=game.current+' · '+media.catalog[game.current-1].title;
 el('next-label').textContent='下一个';el('history-best').textContent=record;
 el('up-next').src=media.catalog[game.next-1].image;el('up-next').alt='下一位：'+media.catalog[game.next-1].title;
 el('sound').textContent=muted?'声音 关':'声音 开';el('sound').setAttribute('aria-pressed',String(!muted));
 [...roster.children].forEach((li,i)=>li.classList.toggle('unlocked',i<unlocked));
 if(game.mode!=='playing'&&modalMode!==game.mode){
  modalMode=game.mode;audio.cue('end');el('result-title').textContent=game.mode==='revive'?'是否复活':'游戏结束';el('result-copy').textContent=game.mode==='revive'?'使用一枚复活币，清理警戒线以上的角色。':'本局得分';el('result-points').textContent=game.score;el('revive').hidden=game.mode!=='revive';el('finish').hidden=game.mode!=='revive';el('restart').hidden=game.mode==='revive';if(!dialog.open)dialog.showModal();
 }
}
function reset(){saveRound('restart');played=false;saved=false;coinLife=0;coinAmount=0;el('coin-toast').hidden=true;audio.stop();game.restart();particles=[];popups=[];unlocked=1;modalMode='';if(dialog.open)dialog.close();el('status').textContent='';refresh();}
function aim(event){const rect=canvas.getBoundingClientRect();mouseX=(event.clientX-rect.left)/rect.width*440;const spec=media.catalog[game.current-1];const xs=spec.hull.map(v=>v[0]*spec.size);game.aim=Math.max(-Math.min(...xs)+1,Math.min(439-Math.max(...xs),mouseX));}
function drop(){if(panelOpen())return;audio.unlock();if(game.drop()){played=true;audio.tone(155,.03,.035);refresh();}}
canvas.addEventListener('pointerdown',event=>{if(game.mode!=='playing'||panelOpen())return;audio.unlock();aim(event);canvas.focus({preventScroll:true});if(event.pointerType==='mouse'){drop();}else{dragging=true;canvas.setPointerCapture(event.pointerId);}event.preventDefault();});
canvas.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'||dragging)aim(event);});
canvas.addEventListener('pointerup',event=>{if(dragging){aim(event);dragging=false;drop();}});canvas.addEventListener('pointercancel',()=>dragging=false);
window.addEventListener('keydown',event=>{if(event.target.closest('button,summary,input,textarea')||dialog.open||panelOpen())return;if(['ArrowLeft','ArrowRight','Space','Enter'].includes(event.code))event.preventDefault();if(event.code==='ArrowLeft')game.aim=Math.max(30,game.aim-12);if(event.code==='ArrowRight')game.aim=Math.min(410,game.aim+12);if(event.code==='Space'||event.code==='Enter')drop();if(event.code==='KeyR')reset();});
el('sound').onclick=()=>{muted=!muted;audio.setEnabled(!muted);write('rescene.independent.mute',muted?'1':'0');refresh();};el('again').onclick=reset;el('restart').onclick=reset;
el('revive').onclick=()=>{audio.unlock();if(game.revive()){audio.cue('revive');modalMode='';dialog.close();refresh();}};el('finish').onclick=()=>{game.finish();refresh();};dialog.addEventListener('cancel',event=>event.preventDefault());
function character(level,x,y,r,angle=0,stretch=0,axis=0,alpha=1){
 const img=sprites[level-1];if(!img.complete||!img.naturalWidth)return;
 paint.save();paint.globalAlpha=alpha;paint.translate(x,y);paint.rotate(axis);paint.scale(1-stretch,1+stretch*.75);paint.rotate(angle-axis);
 const size=r*512/240;paint.drawImage(img,-size/2,-size/2,size,size);paint.restore();
}
function celebrate(event){
 audio.merge(event.level,event.complete);unlocked=Math.max(unlocked,event.level);
 for(let i=0;i<(event.complete?48:16);i++){const angle=Math.random()*Math.PI*2,speed=90+Math.random()*170;particles.push({x:event.x,y:event.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-60,life:.5+Math.random()*.4,size:4+(i%3)*2,color:['#355721','#719637','#f0fac5'][i%3]});}
 popups.push({x:event.x,y:event.y,text:'+'+event.award,life:1});el('status').textContent=event.complete?'RESCENE 合体！复活币 +1':'合成了 '+media.catalog[event.level-1].title;
 if(game.score>record){record=game.score;write('rescene.independent.best',record);}
}
function draw(dt){
 if(coinLife>0){coinLife-=dt;if(coinLife<=0){el('coin-toast').hidden=true;coinAmount=0;}}
 const dpr=Math.min(2,devicePixelRatio||1),w=canvas.clientWidth,h=canvas.clientHeight;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 paint.setTransform(canvas.width/440,0,0,canvas.height/720,0,0);paint.clearRect(0,0,440,720);
 
 const warning=game.world.bodies.some(b=>b.warning>.2);paint.strokeStyle=warning?'#8a4523':'#718d3c';paint.lineWidth=1.5;paint.setLineDash([5,8]);paint.beginPath();paint.moveTo(12,135);paint.lineTo(428,135);paint.stroke();paint.setLineDash([]);paint.font='10px system-ui';paint.fillStyle=warning?'#8a4523':'#182018';paint.fillText(warning?'小心，快碰到警戒线了':'警戒线',16,124);
 for(const b of game.world.bodies){character(b.level,b.x,b.y,b.radius,b.angle,b.stretch,b.impactAngle);}
 if(game.mode==='playing'){paint.strokeStyle='#4c702e66';paint.setLineDash([3,7]);paint.beginPath();paint.moveTo(game.aim,90);paint.lineTo(game.aim,705);paint.stroke();paint.setLineDash([]);character(game.current,game.aim,67,media.catalog[game.current-1].size,0,0,0,game.cooldown>0?.42:.88);}
 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;paint.globalAlpha=p.life>.18?1:.5;paint.fillStyle=p.color;const px=Math.round(p.x/4)*4,py=Math.round(p.y/4)*4;paint.fillRect(px,py,p.size,p.size);}paint.globalAlpha=1;particles=particles.filter(p=>p.life>0);
 for(const p of popups){p.life-=dt;p.y-=32*dt;paint.globalAlpha=Math.max(0,p.life);paint.font='bold 24px system-ui';paint.textAlign='center';paint.fillStyle='#182018';paint.fillText(p.text,p.x,p.y);}paint.globalAlpha=1;paint.textAlign='start';popups=popups.filter(p=>p.life>0);
}
function frame(now){if(panelOpen()){last=now;carry=0;requestAnimationFrame(frame);return;}const dt=last?Math.min(.08,(now-last)/1000):0;last=now;carry+=dt;let steps=0;while(carry>=1/60&&steps++<5){for(const event of game.step(1/60)){if(event.type==='merge')celebrate(event);if(event.type==='coin')coinNotice(event.amount);}carry-=1/60;}if(steps>=5)carry=0;draw(dt);refresh();requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{last=0;carry=0;if(document.hidden)audio.stop();});
refresh();requestAnimationFrame(frame);
window.ResceneClub={game,reset};
})();
