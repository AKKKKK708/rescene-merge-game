/*
 * Game rules rewritten for this project after reference to YHSome/BigNaiWa.
 * Reference: https://github.com/YHSome/BigNaiWa
 * See COPYRIGHT.md for attribution and usage restrictions.
 */
(function(root){
'use strict';
const Engine=typeof module==='object'?require('./physics.js'):root.RescenePhysics;
class Session{
 constructor(catalog,random=Math.random){this.catalog=catalog;this.random=random;this.world=new Engine.World(catalog);this.restart();}
 pick(){const v=this.random();return v<.28?1:v<.52?2:v<.72?3:v<.88?4:5;}
 nextDifferent(avoid){for(let tries=0;tries<6;tries++){const level=this.pick();if(level!==avoid)return level;}return this.pick();}
 restart(){this.world.clear();this.score=0;this.coins=0;this.earned=0;this.mode='playing';this.cooldown=0;this.aim=220;this.current=this.pick();this.next=this.nextDifferent(this.current);this.elapsed=0;this.notice=[];}
 drop(x=this.aim){if(this.mode!=='playing'||this.cooldown>0)return false;const b=this.world.create(this.current,x,67,0,90);this.world.fit(b);this.current=this.next;this.next=this.nextDifferent(this.current);this.cooldown=.36;return true;}
 step(dt){if(this.mode!=='playing')return [];this.elapsed+=dt;this.cooldown=Math.max(0,this.cooldown-dt);const coinsBefore=this.coins,events=this.world.step(dt);
  for(const e of events){const award=e.complete?500:e.level*(e.level-1)/2;this.score+=award;e.award=award;if(e.complete)this.coins++;const quota=Math.floor(this.score/2000);if(quota>this.earned){this.coins+=quota-this.earned;this.earned=quota;}}
  if(this.coins>coinsBefore)events.push({type:'coin',amount:this.coins-coinsBefore});
  let ended=false;
  for(const b of this.world.bodies){if(b.age<.8)continue;const stuck=b.box.top<135&&Math.hypot(b.vx,b.vy)<95;b.warning=stuck?b.warning+dt:Math.max(0,b.warning-dt*2);if(b.warning>1.6)ended=true;}
  if(ended){this.mode=this.coins?'revive':'over';events.push({type:'end',mode:this.mode});}return events;
 }
 revive(){if(this.mode!=='revive'||!this.coins)return false;this.world.bodies=this.world.bodies.filter(b=>b.box.top>=147);for(const b of this.world.bodies){b.warning=0;this.world.wake(b);}this.coins--;this.mode='playing';this.cooldown=.2;return true;}
 finish(){this.mode='over';}
}
if(typeof module==='object')module.exports=Session;else root.ResceneSession=Session;
})(globalThis);
