/*
 * Rewritten implementation informed by YHSome/BigNaiWa:
 * https://github.com/YHSome/BigNaiWa
 * The reference includes PBD-style position constraints, contact friction,
 * rebound and displacement-driven rotation. See COPYRIGHT.md for the full
 * attribution, limitations and third-party rights notice.
 */
(function (root) {
'use strict';
const dot=(a,b)=>a.x*b.x+a.y*b.y;
function geometry(body) {
 const c=Math.cos(body.angle),s=Math.sin(body.angle);
 body.vertices=body.outline.map(p=>({x:body.x+(p[0]*c-p[1]*s)*body.radius,y:body.y+(p[0]*s+p[1]*c)*body.radius}));
 body.circles=body.discs.map(([x,y,r],i)=>({x:body.x+(x*c-y*s)*body.radius,y:body.y+(x*s+y*c)*body.radius,r:r*body.radius,i}));
 body.box={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 for(const p of body.circles){const b=body.box;b.left=Math.min(b.left,p.x-p.r);b.right=Math.max(b.right,p.x+p.r);b.top=Math.min(b.top,p.y-p.r);b.bottom=Math.max(b.bottom,p.y+p.r);}
}
function bodyContacts(a,b,skin=.6){
 if(a.box.right+skin<b.box.left||b.box.right+skin<a.box.left||a.box.bottom+skin<b.box.top||b.box.bottom+skin<a.box.top)return [];
 let fallback=null;
 for(const ca of a.circles)for(const cb of b.circles){
  const dx=cb.x-ca.x,dy=cb.y-ca.y,rr=ca.r+cb.r;
  if(dx*dx+dy*dy>(rr+skin)**2)continue;
  const length=Math.hypot(dx,dy),depth=rr-length;
  const n=length>1e-6?{x:dx/length,y:dy/length}:{x:0,y:1};
  const pa={x:ca.x+n.x*ca.r,y:ca.y+n.y*ca.r},pb={x:cb.x-n.x*cb.r,y:cb.y-n.y*cb.r};
  const contact={a,b,n,depth,points:[{x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2}],key:a.id+':'+b.id};
  if(!fallback||depth>fallback.depth)fallback=contact;
 }
 // One deepest local overlap drives each pair, retaining irregular squeeze directions.
 return fallback?[fallback]:[];
}
function intersect(a,b,skin=.6){return bodyContacts(a,b,skin)[0]||null;}
function wallContacts(b,w,h){
 const result=[];
 for(const [axis,edge,n] of [['left',0,{x:-1,y:0}],['right',w,{x:1,y:0}],['bottom',h,{x:0,y:1}],['top',0,{x:0,y:-1}]]){
  const depth=axis==='left'?-b.box.left:axis==='top'?-b.box.top:b.box[axis]-edge;
  if(depth < -.6)continue;
  const candidates=b.circles.map(c=>({x:c.x+n.x*c.r,y:c.y+n.y*c.r}));
  const farthest=Math.max(...candidates.map(p=>dot(p,n)));
  const points=candidates.filter(p=>farthest-dot(p,n)<.6);
  result.push({a:b,b:null,n,depth,points:points.length>2?[points[0],points.at(-1)]:points,key:'wall:'+b.id+':'+axis});
 }
 return result;
}
class World {
 constructor(catalog){this.catalog=catalog;this.width=440;this.height=720;this.gravity=2600;this.bodies=[];this.clock=0;this.serial=0;this.events=[];}
 create(level,x,y,vx=0,vy=0){
  const spec=this.catalog[level-1],radius=spec.size,mass=radius*radius;
  const body={id:++this.serial,level,x,y,vx,vy,angle:0,spin:0,radius,outline:spec.hull,discs:spec.discs||[[0,0,1]],inverseMass:1/mass,inverseInertia:1/(mass*radius*radius*.65),sleeping:false,rest:0,supported:false,age:0,warning:0,stretch:0,impactAngle:0};
  geometry(body);this.bodies.push(body);return body;
 }
 clear(){this.bodies=[];this.events=[];this.clock=0;}
 wake(b){if(b){b.sleeping=false;b.rest=0;}}
 fit(b){geometry(b);let dx=Math.max(0,-b.box.left)-Math.max(0,b.box.right-this.width),dy=Math.max(0,-b.box.top)-Math.max(0,b.box.bottom-this.height);b.x+=dx;b.y+=dy;geometry(b);}
 sampleContacts(){
  const contacts=[];
  for(let i=0;i<this.bodies.length;i++){
   const a=this.bodies[i];contacts.push(...wallContacts(a,this.width,this.height));
   for(let j=i+1;j<this.bodies.length;j++){const b=this.bodies[j];contacts.push(...bodyContacts(a,b));}
  }
  return contacts;
 }
 // Integrate freely first; constraint displacement then becomes part of motion.
 predict(dt){
  for(const body of this.bodies){
   body.age+=dt;body.sleeping=false;body.supported=false;body.touched=false;
   body.start={x:body.x,y:body.y};
   body.vy+=this.gravity*dt;
   body.incoming={x:body.vx,y:body.vy};
   body.x+=body.vx*dt;body.y+=body.vy*dt;
   body.stretch*=Math.exp(-9*dt);geometry(body);
  }
 }
 project(contact){
  const {a,b,n,depth}=contact;
  if(depth<=.05)return;
  const total=a.inverseMass+(b?b.inverseMass:0);
  const distance=b?Math.min(3.6,(depth-.05)*.9):depth;
  const share=distance/total;
  a.x-=n.x*share*a.inverseMass;a.y-=n.y*share*a.inverseMass;a.touched=true;
  if(n.y>.35)a.supported=true;geometry(a);
  if(b){b.x+=n.x*share*b.inverseMass;b.y+=n.y*share*b.inverseMass;b.touched=true;if(n.y<-.35)b.supported=true;geometry(b);}
 }
 resolvePositions(){
  for(let pass=0;pass<6;pass++){
   for(let i=0;i<this.bodies.length;i++){
    const a=this.bodies[i];
    for(const wall of wallContacts(a,this.width,this.height))this.project(wall);
    for(let j=i+1;j<this.bodies.length;j++){
     const contact=intersect(a,this.bodies[j],0);
     if(contact)this.project(contact);
    }
   }
  }
  for(const body of this.bodies)this.fit(body);
 }
 recoverMotion(dt){
  for(const body of this.bodies){
   const dx=body.x-body.start.x,dy=body.y-body.start.y;
   body.vx=dx/dt*(body.touched?.955:1);body.vy=dy/dt;
   const roll=dx/body.radius*.85;
   body.angle+=roll;body.spin=roll/dt;
   geometry(body);this.fit(body);
  }
 }
 rebound(contacts){
  for(const {a,b,n} of contacts){
   const before=dot({x:(b?b.incoming.x:0)-a.incoming.x,y:(b?b.incoming.y:0)-a.incoming.y},n);
   if(before>=-55)continue;
   const separating=dot({x:(b?b.vx:0)-a.vx,y:(b?b.vy:0)-a.vy},n);
   const needed=Math.max(0,-before*(b?.38:.45)-separating);
   const impulse=needed/(a.inverseMass+(b?b.inverseMass:0));
   a.vx-=n.x*impulse*a.inverseMass;a.vy-=n.y*impulse*a.inverseMass;
   if(b){b.vx+=n.x*impulse*b.inverseMass;b.vy+=n.y*impulse*b.inverseMass;}
   if(needed>0)for(const body of [a,b])if(body){body.stretch=Math.max(body.stretch,Math.min(.30,-before/1500));body.impactAngle=Math.atan2(n.y,n.x);}
  }
 }
 substep(dt){
  this.clock+=dt;this.predict(dt);
  const contacts=this.sampleContacts(),removed=new Set(),pending=[];
  for(const contact of contacts){
   const {a,b}=contact;
   if(!b||a.level!==b.level||removed.has(a)||removed.has(b))continue;
   removed.add(a);removed.add(b);pending.push({a,b});
  }
  this.bodies=this.bodies.filter(body=>!removed.has(body));
  const impacts=contacts.filter(c=>!removed.has(c.a)&&!removed.has(c.b)&&c.depth>0);
  this.resolvePositions();this.recoverMotion(dt);this.rebound(impacts);
  for(const {a,b} of pending){
   const level=a.level+1,x=(a.x+b.x)/2,y=(a.y+b.y)/2;
   if(level<=this.catalog.length){const born=this.create(level,x,y,(a.vx+b.vx)/2,(a.vy+b.vy)/2-60);born.stretch=.2;this.fit(born);}
   this.events.push({type:'merge',level:Math.min(level,this.catalog.length),complete:level>this.catalog.length,x,y});
  }
 }
 step(dt){const pieces=Math.max(1,Math.ceil(dt*180));for(let i=0;i<pieces;i++)this.substep(dt/pieces);const events=this.events;this.events=[];return events;}
}
const api={World,intersect,geometry,bodyContacts};if(typeof module==='object')module.exports=api;else root.RescenePhysics=api;
})(globalThis);
