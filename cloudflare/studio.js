
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

fetch('/api/session',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(s=>{const link=document.getElementById('adminNav');if(s?.isAdmin&&link){link.hidden=false;link.style.display='inline-flex'}}).catch(()=>{});
const fontSample=document.getElementById('fontPreview');
function updateFontSample(){const font=document.getElementById('kitFont').value;fontSample.style.fontFamily=`"${font}",sans-serif`;fontSample.style.color=document.getElementById('textColor').value;fontSample.textContent=(document.getElementById('playerName').value||'NUTRIA')+' '+(document.getElementById('playerNumber').value||'10');}
for(const id of ['kitFont','playerName','playerNumber','textColor'])document.getElementById(id).addEventListener('input',updateFontSample);
updateFontSample();
try {
const stage = document.getElementById('stage');
const loading = document.getElementById('loading');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, stage.clientWidth/stage.clientHeight, 0.01, 100);
camera.position.set(0,0,6);

const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
const mobileLayout=window.matchMedia('(max-width:800px)');
renderer.setPixelRatio(Math.min(devicePixelRatio,mobileLayout.matches?1.5:2));
renderer.setSize(stage.clientWidth,stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .06;
controls.minDistance = 2;
controls.maxDistance = 16;
controls.enablePan=false;
const orbitButton=document.getElementById('mobileOrbit');
const returnButton=document.getElementById('returnToKit');
let mobileRotation=false,stageVisible=true;
function updateTouchMode(){
 controls.enabled=!mobileLayout.matches||mobileRotation;
 stage.classList.toggle('is-interacting',mobileLayout.matches&&mobileRotation);
 orbitButton.setAttribute('aria-pressed',String(mobileRotation));
 orbitButton.textContent=mobileRotation?'Termina rotazione · scorri la pagina':'Attiva rotazione 3D';
 stage.querySelector('.hint').textContent=mobileLayout.matches?(mobileRotation?'Un dito per ruotare · due dita per zoom':'Scorri la pagina · attiva la rotazione con il pulsante'):'Trascina per ruotare · rotella per zoom';
}
orbitButton.addEventListener('click',()=>{mobileRotation=!mobileRotation;updateTouchMode()});
mobileLayout.addEventListener('change',()=>{mobileRotation=false;updateTouchMode();resize()});
returnButton.addEventListener('click',()=>stage.scrollIntoView({behavior:'smooth',block:'center'}));
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
 stageVisible=entries[0].isIntersecting;
 returnButton.hidden=stageVisible||entries[0].boundingClientRect.top>0;
},{threshold:.1}).observe(stage);
updateTouchMode();
function minimumFitDistance(aspect){
 const verticalFov=THREE.MathUtils.degToRad(camera.fov);
 return 1.12*Math.max(3.5/(2*Math.tan(verticalFov/2)),2.7/(2*Math.tan(verticalFov/2)*Math.max(aspect,.2)));
}

scene.add(new THREE.HemisphereLight(0xffffff,0x333333,2.2));
const key = new THREE.DirectionalLight(0xffffff,3); key.position.set(3,4,5); scene.add(key);
const rim = new THREE.DirectionalLight(0xd7a928,1.3); rim.position.set(-4,1,-3); scene.add(rim);

let realKit = null;
let chosenColor = '#202323';
let currentView = 'Kit';
let shortsStyle='auto';
let currentPattern='solid', patternColor='#d7a928', patternSize=32;
let collarColor='#202323', sleeveColor='#202323', shortsColor='#202323', socksColor='#202323';
let collarCustom=false, sleeveCustom=false, shortsCustom=false, socksCustom=false;
let backPrint=null;
let teamCrest = null;
let teamShortsCrest = null;
let nutriaLogoScale = 1.35;
let teamLogoScale = 1;
let nutriaLogoX = 0, nutriaLogoY = 0;
let nutriaShortsScale = 1, nutriaShortsX = 0, nutriaShortsY = 0;
let backNameScale = 1.25, backNumberScale = 1.40, backNameY = 0, backNumberY = 0;
let teamLogoX = 0, teamLogoY = 0;
let nutriaLogoTexture = null;
let teamLogoTexture = null;
let frontSponsorTexture=null,backSponsorTexture=null,frontSponsor=null,backSponsor=null,frontSponsorScale=1,backSponsorScale=1,frontSponsorY=0,backSponsorY=0;
let frontSponsorPlane=null, backSponsorPlane=null;

let nutriaChestLogo = null;
let nutriaShortsLogo = null;
let shortsNumberMesh = null;
let teamChestLogo3D = null;
let backNameMesh = null;
let backNumberMesh = null;
let jerseyMesh = null;
let collarMesh = null;
let sleevesMesh = null;
let shortsMesh = null;
let socksMesh = null;
let nutriaFixedMesh = null;
let kitBox = null;
const originalMeshes = [];

function materialsOf(mesh){
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function fitKit(){
  realKit.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(realKit);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x,size.y,size.z);
  if(maxDimension > 0) realKit.scale.setScalar(3.5/maxDimension);

  realKit.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(realKit);
  const center = box.getCenter(new THREE.Vector3());
  realKit.position.sub(center);
  realKit.updateMatrixWorld(true);

  kitBox = new THREE.Box3().setFromObject(realKit);
  camera.position.set(0,0,minimumFitDistance(camera.aspect));
  controls.target.set(0,0,0);
  controls.update();
}


function drawImageContained(ctx,img,cx,cy,maxW,maxH){
  if(!img || !img.width || !img.height) return;
  const ratio=img.width/img.height;
  let w=maxW, h=w/ratio;
  if(h>maxH){ h=maxH; w=h*ratio; }
  ctx.drawImage(img,cx-w/2,cy-h/2,w,h);
}

function drawJerseyPrints(ctx){
  // V6.19: logo, stemma, nome e numero NON vengono più disegnati nella UV.
  // Restano separati e agganciati direttamente al modello 3D.
}



function paintAdditionalPattern(x,pattern,color,size){
 const s=Math.max(8,Number(size)||32);let seed=137;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 x.save();x.fillStyle=color;x.strokeStyle=color;
 if(pattern==='camo'){
  for(let i=0;i<105;i++){const cx=random()*1150-60,cy=random()*1150-60,r=25+random()*s*2;x.globalAlpha=.3+random()*.6;x.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5,rr=r*(.55+random()*.7);const px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;k?x.lineTo(px,py):x.moveTo(px,py)}x.closePath();x.fill()}
 }else if(pattern==='digitalCamo'){
  const c=Math.max(16,s);for(let yy=0;yy<1024;yy+=c)for(let xx=0;xx<1024;xx+=c){const v=random();if(v>.56){x.globalAlpha=.28+random()*.7;x.fillRect(xx,yy,c*(1+Math.floor(random()*3)),c)}}
 }else if(pattern==='lightning'){
  x.lineWidth=Math.max(5,s*.28);for(let xx=-100;xx<1150;xx+=s*4){x.beginPath();x.moveTo(xx,0);for(let yy=0;yy<1150;yy+=100){x.lineTo(xx+90,yy+45);x.lineTo(xx+25,yy+80);x.lineTo(xx+105,yy+120)}x.stroke()}
 }else if(pattern==='topography'||pattern==='contourWaves'){
  x.lineWidth=Math.max(2,s*.08);for(let yy=-180;yy<1250;yy+=Math.max(13,s*.7)){x.beginPath();for(let xx=-10;xx<1040;xx+=8){const y=yy+Math.sin(xx/110+yy/180)*65+Math.sin(xx/54)*22;xx===-10?x.moveTo(xx,y):x.lineTo(xx,y)}if(pattern==='contourWaves'){x.lineWidth=s*.45;x.globalAlpha=.5}x.stroke()}
 }else if(pattern==='hexagons'){
  const r=Math.max(22,s*1.2);x.lineWidth=Math.max(2,s*.08);for(let yy=-r;yy<1100;yy+=r*1.732)for(let xx=-r;xx<1100;xx+=r*3){for(let off=0;off<2;off++){const cx=xx+off*r*1.5,cy=yy+off*r*.866;x.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;k?x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):x.moveTo(cx+r,cy)}x.closePath();x.stroke()}}
 }else if(pattern==='brush'){
  for(let i=0;i<100;i++){const y=random()*1150-60,start=random()*900-150;x.globalAlpha=.2+random()*.65;x.beginPath();x.moveTo(start,y);x.lineTo(start+150+random()*600,y-60);x.lineTo(start+80+random()*400,y+s*.5);x.closePath();x.fill()}
 }else if(pattern==='sunburst'){
  for(let k=0;k<24;k++){const a=k*Math.PI/12;x.beginPath();x.moveTo(512,240);x.lineTo(512+Math.cos(a)*1600,240+Math.sin(a)*1600);x.lineTo(512+Math.cos(a+.06+s/2400)*1600,240+Math.sin(a+.06+s/2400)*1600);x.closePath();x.fill()}
 }else if(pattern==='tiger'){
  for(let yy=-60;yy<1150;yy+=Math.max(40,s*2.5)){for(const side of [0,1]){const edge=side?1024:0,dir=side?-1:1;x.beginPath();x.moveTo(edge,yy);x.lineTo(edge+dir*(260+random()*200),yy+50);x.lineTo(edge,yy+s*1.5);x.closePath();x.fill()}}
 }else if(pattern==='confetti'){
  x.lineWidth=Math.max(4,s*.2);for(let i=0;i<220;i++){const xx=random()*1024,yy=random()*1024;x.save();x.translate(xx,yy);x.rotate(random()*Math.PI);if(i%3===0){x.beginPath();x.arc(0,0,s*.5,0,Math.PI);x.stroke()}else if(i%3===1)x.fillRect(0,0,s*.8,s*.2);else{x.beginPath();x.moveTo(0,0);x.lineTo(s*.6,s);x.lineTo(-s*.5,s*.8);x.closePath();x.stroke()}x.restore()}
 }else if(pattern==='microCross'){
  const gap=Math.max(24,s*2);x.lineWidth=Math.max(2,s*.1);for(let yy=0;yy<1024;yy+=gap)for(let xx=0;xx<1024;xx+=gap){const cx=xx+(Math.round(yy/gap)%2)*gap*.5;x.beginPath();x.moveTo(cx-s*.2,yy);x.lineTo(cx+s*.2,yy);x.moveTo(cx,yy-s*.2);x.lineTo(cx,yy+s*.2);x.stroke()}
 }else if(pattern==='pixelFade'){
  const cell=Math.max(12,s);for(let yy=0;yy<1024;yy+=cell)for(let xx=0;xx<1024;xx+=cell)if(random()<yy/1024){x.globalAlpha=.35+.65*yy/1024;x.fillRect(xx,yy,cell,cell)}
 }
 x.restore();
}

function makePatternTexture(){
  const c=document.createElement('canvas'); c.width=c.height=1024;
  const x=c.getContext('2d');
  x.fillStyle=chosenColor; x.fillRect(0,0,1024,1024);
  x.fillStyle=patternColor;
  const s=Number(patternSize);

  if(currentPattern==='vertical'){
    for(let i=0;i<1024;i+=s*2)x.fillRect(i,0,s,1024);
  }else if(currentPattern==='horizontal'){
    for(let i=0;i<1024;i+=s*2)x.fillRect(0,i,1024,s);
  }else if(currentPattern==='diagonal'){
    x.save(); x.translate(512,512); x.rotate(-Math.PI/4);
    for(let i=-1600;i<1600;i+=s*2)x.fillRect(i,-1600,s,3200);
    x.restore();
  }else if(currentPattern==='chevron'){
    x.strokeStyle=patternColor; x.lineWidth=s;
    for(let y=-100;y<1200;y+=s*4){
      x.beginPath(); x.moveTo(0,y); x.lineTo(512,y+s*2); x.lineTo(1024,y); x.stroke();
    }
  }else if(currentPattern==='thinVertical'){
    const w=Math.max(3,s*.18); for(let i=0;i<1024;i+=Math.max(18,s)) x.fillRect(i,0,w,1024);
  }else if(currentPattern==='wideVertical'){
    const w=Math.max(35,s*2.2); for(let i=0;i<1024;i+=w*2) x.fillRect(i,0,w,1024);
  }else if(currentPattern==='cross'){
    const w=Math.max(3,s*.18),gap=Math.max(22,s); for(let i=0;i<1024;i+=gap){x.fillRect(i,0,w,1024);x.fillRect(0,i,1024,w);}
  }else if(currentPattern==='diamonds'){
    x.save();x.translate(512,512);x.rotate(Math.PI/4);const w=Math.max(3,s*.18),gap=Math.max(28,s*1.5);
    for(let i=-1500;i<1500;i+=gap){x.fillRect(i,-1500,w,3000);x.fillRect(-1500,i,3000,w);}x.restore();
  }else if(currentPattern==='waves'){
    x.strokeStyle=patternColor;x.lineWidth=Math.max(4,s*.35);
    for(let y=0;y<1100;y+=Math.max(35,s*2)){x.beginPath();for(let xx=0;xx<=1024;xx+=8){let yy=y+Math.sin(xx/45)*Math.max(8,s*.5);xx?x.lineTo(xx,yy):x.moveTo(xx,yy);}x.stroke();}
  }else if(currentPattern==='zigzag'){
    x.strokeStyle=patternColor;x.lineWidth=Math.max(5,s*.45);
    for(let y=0;y<1100;y+=Math.max(45,s*2.4)){x.beginPath();x.moveTo(0,y);for(let xx=0;xx<=1024;xx+=80)x.lineTo(xx,y+((xx/80)%2?30:-30));x.stroke();}
  }else if(currentPattern==='sash'){
    x.save();x.translate(512,512);x.rotate(-Math.PI/4);x.fillRect(-Math.max(55,s*2),-900,Math.max(110,s*4),1800);x.restore();
  }else if(currentPattern==='centerStripe'){
    x.fillRect(512-Math.max(45,s*1.8),0,Math.max(90,s*3.6),1024);
  }else if(currentPattern==='hoops'){
    const hh=Math.max(45,s*2);for(let y=0;y<1024;y+=hh*2)x.fillRect(0,y,1024,hh);
  }else if(currentPattern==='quarters'){
    x.fillRect(512,0,512,512);x.fillRect(0,512,512,512);
  }else if(currentPattern==='splitDiagonal'){
    x.beginPath(); x.moveTo(0,0); x.lineTo(1024,0); x.lineTo(0,1024); x.closePath(); x.fill();
  }else if(currentPattern==='vchest'){
    x.strokeStyle=patternColor; x.lineWidth=Math.max(18,s*.95); x.lineCap='square';
    x.beginPath(); x.moveTo(250,170); x.lineTo(512,430); x.lineTo(774,170); x.stroke();
  }else if(currentPattern==='chestBand'){
    const bandH=Math.max(110,s*3.2); x.fillRect(0,180,1024,bandH);
  }else if(currentPattern==='leftPanel'){
    const panelW=Math.max(170,s*4.2); x.fillRect(0,0,panelW,1024);
  }else if(currentPattern==='checkers'){
    const cell=Math.max(60,s*1.8);
    for(let yy=0;yy<1024;yy+=cell){
      for(let xx=0;xx<1024;xx+=cell){
        if(((xx+yy)/cell)%2===0) x.fillRect(xx,yy,cell,cell);
      }
    }
  }else if(currentPattern==='gradientVertical'){
    const g=x.createLinearGradient(0,0,0,1024);
    g.addColorStop(0,patternColor); g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g; x.fillRect(0,0,1024,1024); x.fillStyle=patternColor;
  }else if(currentPattern==='gradientDiagonal'){
    const g=x.createLinearGradient(0,0,1024,1024);
    g.addColorStop(0,patternColor); g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g; x.fillRect(0,0,1024,1024); x.fillStyle=patternColor;
  }else if(currentPattern==='topFade'){
    const g=x.createLinearGradient(0,0,0,420);
    g.addColorStop(0,patternColor); g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g; x.fillRect(0,0,1024,460); x.fillStyle=patternColor;
  }else if(currentPattern==='doubleSash'){
    x.save(); x.translate(512,512); x.rotate(-Math.PI/4);
    const band=Math.max(60,s*2.4), gap=Math.max(36,s*1.4);
    x.fillRect(-band-gap,-900,band,1800); x.fillRect(gap,-900,band,1800);
    x.restore();
  }else if(currentPattern==='tripleStripe'){
    const w=Math.max(45,s*1.5), gap=Math.max(18,s*.65), total=w*3+gap*2, start=(1024-total)/2;
    x.fillRect(start,0,w,1024); x.fillRect(start+w+gap,0,w,1024); x.fillRect(start+(w+gap)*2,0,w,1024);
  }else if(currentPattern==='dots'){
    const r=Math.max(10,s*.35), gap=Math.max(36,s*1.2);
    for(let yy=0;yy<1100;yy+=gap){
      for(let xx=0;xx<1100;xx+=gap){
        x.beginPath(); x.arc(xx+((yy/gap)%2?gap*.5:0),yy,r,0,Math.PI*2); x.fill();
      }
    }
  }else if(currentPattern==='herringbone'){
    x.strokeStyle=patternColor; x.lineWidth=Math.max(8,s*.28);
    const gap=Math.max(40,s*1.3), arm=Math.max(20,s*.7);
    for(let yy=-50;yy<1100;yy+=gap){
      for(let xx=-50;xx<1100;xx+=gap){
        x.beginPath(); x.moveTo(xx,yy); x.lineTo(xx+arm,yy+arm); x.lineTo(xx,yy+arm*2); x.stroke();
      }
    }
  }else if(currentPattern==='halves'){
    x.fillRect(512,0,512,1024);
  }

  paintAdditionalPattern(x,currentPattern,patternColor,s);
  drawJerseyPrints(x);

  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;
  t.needsUpdate=true;
  return t;
}

function solidMaterial(color){
  return new THREE.MeshBasicMaterial({
    color:new THREE.Color(color),
    side:THREE.DoubleSide
  });
}

// PANTALONCINI: pattern INDIPENDENTE rispetto alla maglia.
// Usa un linguaggio più tipico da pantaloncino (righe laterali, orli, inserti),
// senza replicare il pattern completo della maglia su tutta la superficie.
function makeShortsPatternTexture(){
  const c=document.createElement('canvas');
  c.width=1024; c.height=1024;
  const x=c.getContext('2d');

  const base=shortsColor;
  const accent=patternColor;
  const s=Math.max(8,Number(patternSize)||32);

  x.clearRect(0,0,1024,1024);
  x.fillStyle=base;
  x.fillRect(0,0,1024,1024);

  const sideW=Math.max(26,Math.round(s*.50));
  const sideGap=Math.max(8,Math.round(s*.16));
  const hemH=Math.max(18,Math.round(s*.32));
  const hemGap=Math.max(6,Math.round(s*.12));
  const panelW=Math.max(82,Math.round(s*1.35));
  const slashW=Math.max(24,Math.round(s*.48));

  const leftEdge=84;
  const rightEdge=1024-84;
  const bottomY=1024-hemH-26;

  function sideStripes(count=1){
    x.fillStyle=accent;
    for(let i=0;i<count;i++){
      const dx=i*(sideW+sideGap);
      x.fillRect(leftEdge+dx,0,sideW,1024);
      x.fillRect(rightEdge-sideW-dx,0,sideW,1024);
    }
  }

  function hemStripes(count=1){
    x.fillStyle=accent;
    for(let i=0;i<count;i++){
      const y=bottomY-i*(hemH+hemGap);
      x.fillRect(0,y,440,hemH);
      x.fillRect(584,y,440,hemH);
    }
  }

  function sidePanels(){
    x.fillStyle=accent;
    x.fillRect(0,0,panelW,1024);
    x.fillRect(1024-panelW,0,panelW,1024);
  }

  function diagonalSlashes(){
    x.save();
    x.fillStyle=accent;
    x.translate(190,620);
    x.rotate(-0.48);
    x.fillRect(-30,-210,slashW,420);
    x.restore();

    x.save();
    x.fillStyle=accent;
    x.translate(834,620);
    x.rotate(0.48);
    x.fillRect(-30,-210,slashW,420);
    x.restore();
  }

  function chevrons(){
    x.strokeStyle=accent;
    x.lineWidth=Math.max(10,s*.22);
    x.lineJoin='round';
    const draw=(cx)=>{
      x.beginPath();
      x.moveTo(cx-76,230);
      x.lineTo(cx,292);
      x.lineTo(cx+76,230);
      x.stroke();
      x.beginPath();
      x.moveTo(cx-60,322);
      x.lineTo(cx,372);
      x.lineTo(cx+60,322);
      x.stroke();
    };
    draw(150);
    draw(874);
  }

  function checkPanels(){
    const cell=Math.max(24,Math.round(s*.48));
    for(let side of [0,1024-panelW]){
      for(let yy=0;yy<1024;yy+=cell){
        for(let xx=0;xx<panelW;xx+=cell){
          if(((xx/cell)+(yy/cell))%2===0){
            x.fillStyle=accent;
            x.fillRect(side+xx,yy,cell,cell);
          }
        }
      }
    }
  }

  function dottedTape(){
    sidePanels();
    x.fillStyle=base;
    const r=Math.max(5,Math.round(s*.10));
    for(let side of [panelW/2,1024-panelW/2]){
      for(let yy=38;yy<1024;yy+=r*4){
        x.beginPath(); x.arc(side,yy,r,0,Math.PI*2); x.fill();
      }
    }
  }

  const independent={plain:'plain',sideSingle:'sideSingle',sideDouble:'vertical',sideTriple:'sideTriple',hemDouble:'horizontal',panels:'leftPanel',slashes:'diagonal',chevrons:'chevron',checkPanels:'checkers',dottedTape:'dots',fadePanels:'topFade'};
  switch(shortsStyle==='auto'?currentPattern:independent[shortsStyle]){
    case 'plain': break;
    case 'sideSingle': sideStripes(1); break;
    case 'sideTriple': sideStripes(3); break;
    case 'solid':
      sideStripes(1); hemStripes(1);
      break;
    case 'vertical':
    case 'thinVertical':
      sideStripes(2);
      break;
    case 'wideVertical':
    case 'leftPanel':
      sidePanels();
      break;
    case 'horizontal':
    case 'hoops':
      hemStripes(2);
      break;
    case 'diagonal':
    case 'sash':
    case 'splitDiagonal':
    case 'doubleSash':
      diagonalSlashes();
      break;
    case 'chevron':
    case 'vchest':
    case 'tripleStripe':
      chevrons(); hemStripes(1);
      break;
    case 'halves':
    case 'quarters':
    case 'bicolor':
      sidePanels(); hemStripes(1);
      break;
    case 'cross':
    case 'diamonds':
    case 'checkers':
      checkPanels();
      break;
    case 'waves':
    case 'zigzag':
    case 'herringbone':
      x.strokeStyle=accent;
      x.lineWidth=Math.max(8,s*.18);
      for(let yy=100;yy<1024;yy+=Math.max(70,s*1.4)){
        x.beginPath();
        x.moveTo(40,yy);
        for(let xx=40;xx<=panelW;xx+=40){ x.lineTo(xx,yy+((xx/40)%2===0?-18:18)); }
        x.stroke();
        x.beginPath();
        x.moveTo(1024-panelW,yy);
        for(let xx=1024-panelW;xx<=984;xx+=40){ x.lineTo(xx,yy+(((xx-(1024-panelW))/40)%2===0?-18:18)); }
        x.stroke();
      }
      break;
    case 'dots':
      dottedTape();
      break;
    case 'gradientVertical':
    case 'gradientDiagonal':
    case 'topFade':
      {
        const g=x.createLinearGradient(0,0,0,1024);
        g.addColorStop(0,accent);
        g.addColorStop(.55,'rgba(0,0,0,0)');
        x.fillStyle=g;
        x.fillRect(0,0,panelW,1024);
        x.fillRect(1024-panelW,0,panelW,1024);
        hemStripes(1);
      }
      break;
    default:
      sideStripes(1); hemStripes(1);
      break;
  }

  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=THREE.ClampToEdgeWrapping;
  t.wrapT=THREE.ClampToEdgeWrapping;
  t.needsUpdate=true;
  return t;
}

// SOLO PANTALONCINI: normalizza le UV di SHORTS_EDITABLE nell'intervallo 0..1.
// In questo modo il pattern indipendente dei pantaloncini viene distribuito su
// TUTTA l'altezza e la larghezza della mesh, non solo su metà superficie.
function normalizeShortsUV(){
  if(!shortsMesh?.geometry?.attributes?.uv) return;

  // Cloniamo la geometria per non modificare nessun'altra parte del kit.
  if(!shortsMesh.userData.nutriaUvNormalized){
    shortsMesh.geometry=shortsMesh.geometry.clone();
    shortsMesh.userData.nutriaUvNormalized=true;
  }

  const uv=shortsMesh.geometry.attributes.uv;
  let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
  for(let i=0;i<uv.count;i++){
    const u=uv.getX(i), v=uv.getY(i);
    if(u<minU)minU=u; if(u>maxU)maxU=u;
    if(v<minV)minV=v; if(v>maxV)maxV=v;
  }
  const du=Math.max(maxU-minU,1e-6);
  const dv=Math.max(maxV-minV,1e-6);
  for(let i=0;i<uv.count;i++){
    uv.setXY(i,(uv.getX(i)-minU)/du,(uv.getY(i)-minV)/dv);
  }
  uv.needsUpdate=true;
}

function applyKitColor(hex=chosenColor){
  chosenColor=hex;
  const picker=document.getElementById('customBaseColor'), hexField=document.getElementById('baseColorHex');
  if(picker)picker.value=hex;
  if(hexField)hexField.value=hex.toUpperCase();

  // Se una parte non è stata personalizzata, segue automaticamente il colore principale.
  if(!collarCustom) collarColor=chosenColor;
  if(!sleeveCustom) sleeveColor=chosenColor;
  if(!shortsCustom) shortsColor=chosenColor;
  if(!socksCustom) socksColor=chosenColor;

  if(jerseyMesh){
    jerseyMesh.material=new THREE.MeshBasicMaterial({
      color:0xffffff,
      map:makePatternTexture(),
      side:THREE.DoubleSide
    });
    jerseyMesh.material.needsUpdate=true;
  }

  if(collarMesh){ collarMesh.material=solidMaterial(collarColor); collarMesh.material.needsUpdate=true; }
  if(sleevesMesh){ sleevesMesh.material=solidMaterial(sleeveColor); sleevesMesh.material.needsUpdate=true; }
  if(shortsMesh){
    shortsMesh.material=new THREE.MeshBasicMaterial({
      color:0xffffff,
      map:makeShortsPatternTexture(),
      side:THREE.DoubleSide
    });
    shortsMesh.material.needsUpdate=true;
  }
  if(socksMesh){ socksMesh.material=solidMaterial(socksColor); socksMesh.material.needsUpdate=true; }

  if(nutriaLogoTexture) rebuildShortsBranding();
  rebuildShortsNumber();
}


function jerseyBounds(){
  if(!jerseyMesh) return null;
  jerseyMesh.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(jerseyMesh);
}

function disposeDecal(obj){
  if(!obj) return;
  if(obj.parent) obj.parent.remove(obj);
  obj.traverse?.(child=>{
    child.geometry?.dispose?.();
    if(Array.isArray(child.material)) child.material.forEach(m=>m?.dispose?.());
    else child.material?.dispose?.();
  });
  obj.geometry?.dispose?.();
  if(Array.isArray(obj.material)) obj.material.forEach(m=>m?.dispose?.());
  else obj.material?.dispose?.();
}


function meshBounds(targetMesh){
  if(!targetMesh) return null;
  targetMesh.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(targetMesh);
}

function findSurfaceOnMesh(targetMesh, side, x, y){
  if(!targetMesh) return null;
  targetMesh.updateMatrixWorld(true);
  const box=meshBounds(targetMesh);
  const size=box.getSize(new THREE.Vector3());
  const front=side==='front';

  const xOffsets=[0,-.03,.03,-.06,.06,-.10,.10,-.14,.14];
  const yOffsets=[0,-.03,.03,-.06,.06,-.10,.10,-.15,.15];

  for(const yo of yOffsets){
    for(const xo of xOffsets){
      const origin=new THREE.Vector3(
        x + xo*size.x,
        y + yo*size.y,
        front ? box.max.z + Math.max(size.z*3,3) : box.min.z - Math.max(size.z*3,3)
      );
      const dir=new THREE.Vector3(0,0,front?-1:1);
      const ray=new THREE.Raycaster(origin,dir,0,Math.max(size.z*8,20));
      const hits=ray.intersectObject(targetMesh,true);
      if(hits.length) return hits[0];
    }
  }
  return null;
}

function findJerseySurface(side, x, y){
  return findSurfaceOnMesh(jerseyMesh,side,x,y);
}

// SOLO PANTALONCINI: cerca la superficie vicino alla coordinata richiesta,
// senza spostarsi verso l'alto. Evita che logo/numero "saltino" a metà gamba.
function findLowerShortsSurface(x,y){
  if(!shortsMesh) return null;
  shortsMesh.updateMatrixWorld(true);
  const box=meshBounds(shortsMesh);
  const size=box.getSize(new THREE.Vector3());
  const xOffsets=[0,-.025,.025,-.05,.05];
  const yOffsets=[0,-.015,.015,-.03,.03];
  for(const yo of yOffsets){
    for(const xo of xOffsets){
      const origin=new THREE.Vector3(
        x+xo*size.x,
        y+yo*size.y,
        box.max.z+Math.max(size.z*3,3)
      );
      const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1),0,Math.max(size.z*8,20));
      const hits=ray.intersectObject(shortsMesh,true);
      if(hits.length) return hits[0];
    }
  }
  return null;
}

function makeLowerShortsPlane(texture,x,y,width,height,name,renderOrder=98){
  if(!shortsMesh || !texture) return null;
  const hit=findLowerShortsSurface(x,y);
  if(!hit) return null;
  const normal=hit.face.normal.clone().transformDirection(shortsMesh.matrixWorld).normalize();
  const geo=new THREE.PlaneGeometry(width,height);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,alphaTest:.01,depthTest:true,depthWrite:false,
    side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.name=name;
  mesh.position.copy(hit.point).add(normal.clone().multiplyScalar(.006));
  const helper=new THREE.Object3D();
  helper.position.copy(mesh.position);
  helper.lookAt(mesh.position.clone().add(normal));
  mesh.quaternion.copy(helper.quaternion);
  mesh.renderOrder=renderOrder;
  scene.add(mesh);
  return mesh;
}

function makeSurfaceAnchoredPlaneOnMesh(targetMesh, texture, side, x, y, width, height, name, renderOrder=90, offset=.015){
  if(!targetMesh || !texture) return null;
  const hit=findSurfaceOnMesh(targetMesh,side,x,y);
  if(!hit){
    console.warn('Superficie non trovata per',name,side,x,y);
    return null;
  }

  const normal=hit.face.normal.clone().transformDirection(targetMesh.matrixWorld).normalize();
  const geo=new THREE.PlaneGeometry(width,height);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    alphaTest:.01,
    depthTest:true,
    depthWrite:false,
    side:THREE.DoubleSide,
    polygonOffset:true,
    polygonOffsetFactor:-6,
    polygonOffsetUnits:-6
  });

  const mesh=new THREE.Mesh(geo,mat);
  mesh.name=name;
  mesh.position.copy(hit.point).add(normal.clone().multiplyScalar(offset));

  const helper=new THREE.Object3D();
  helper.position.copy(mesh.position);
  helper.lookAt(mesh.position.clone().add(normal));
  mesh.quaternion.copy(helper.quaternion);


  mesh.renderOrder=renderOrder;
  scene.add(mesh);
  return mesh;
}

function makeSurfaceAnchoredPlane(texture, side, x, y, width, height, name, renderOrder=90){
  return makeSurfaceAnchoredPlaneOnMesh(jerseyMesh,texture,side,x,y,width,height,name,renderOrder,.015);
}

function makeFrontBBoxPlaneOnMesh(targetMesh, texture, x, y, width, height, name, renderOrder=90, offset=.012){
  if(!targetMesh || !texture) return null;
  const box=meshBounds(targetMesh);
  const geo=new THREE.PlaneGeometry(width,height);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    alphaTest:.01,
    depthTest:true,
    depthWrite:false,
    side:THREE.DoubleSide,
    polygonOffset:true,
    polygonOffsetFactor:-6,
    polygonOffsetUnits:-6
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.name=name;
  mesh.position.set(x,y,box.max.z+offset);
  mesh.renderOrder=renderOrder;
  scene.add(mesh);
  return mesh;
}

function decalOrientationFromHit(hit){
  const normal=hit.face.normal.clone().transformDirection(jerseyMesh.matrixWorld).normalize();
  const helper=new THREE.Object3D();
  helper.position.copy(hit.point);
  helper.lookAt(hit.point.clone().sub(normal));
  return helper.rotation.clone();
}

function makeSurfaceDecal(texture, hit, width, height, renderOrder=90){
  const box=jerseyBounds();
  const size=box.getSize(new THREE.Vector3());
  const geometry=new DecalGeometry(
    jerseyMesh,
    hit.point.clone(),
    decalOrientationFromHit(hit),
    new THREE.Vector3(width,height,Math.max(size.z*.18,.03))
  );
  const material=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    depthTest:true,
    depthWrite:false,
    polygonOffset:true,
    polygonOffsetFactor:-12,
    polygonOffsetUnits:-12,
    side:THREE.DoubleSide,
    alphaTest:.005
  });
  const decal=new THREE.Mesh(geometry,material);
  decal.renderOrder=renderOrder;
  const normal=hit.face.normal.clone().transformDirection(jerseyMesh.matrixWorld).normalize();
  decal.position.add(normal.multiplyScalar(0.001));
  scene.add(decal);
  return decal;
}

function createChestDecal(texture, type){
  if(!jerseyMesh || !texture) return null;

  const box=jerseyBounds();
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());

  const isNutria=type==='nutria';
  const scale=isNutria ? nutriaLogoScale : teamLogoScale;
  const xAdjust=(isNutria ? nutriaLogoX : teamLogoX)/100;
  const yAdjust=(isNutria ? nutriaLogoY : teamLogoY)/100;

  // Petto destro DEL GIOCATORE = sinistra per chi guarda frontalmente.
  // Lo stemma squadra resta sul lato cuore opposto.
  const px=center.x + (isNutria ? -size.x*.155 : size.x*.155) + xAdjust*size.x*.16;
  const py=center.y + size.y*.225 + yAdjust*size.y*.12;

  const hit=findJerseySurface('front',px,py);
  if(!hit){
    console.warn('Superficie petto non trovata:',type);
    return null;
  }

  const img=texture.image;
  const aspect=(img?.naturalWidth||img?.width||1)/(img?.naturalHeight||img?.height||1);

  // Nutria leggermente più largo; sempre proporzionato all'immagine.
  const width=size.x*(isNutria?.22:.14)*scale;
  const height=Math.min(width/Math.max(aspect,.2), size.y*.15*scale);

  const decal=makeSurfaceDecal(texture,hit,width,height,100);
  decal.name=isNutria?'NUTRIA_CHEST_DECAL':'TEAM_CREST_DECAL';
  return decal;
}

function disposeMesh3D(obj){
  if(!obj) return;
  if(obj.parent) obj.parent.remove(obj);
  obj.geometry?.dispose?.();
  if(Array.isArray(obj.material)) obj.material.forEach(m=>m?.dispose?.());
  else obj.material?.dispose?.();
}

function makeAnchoredImagePlane(texture, x, y, z, width, name){
  if(!realKit || !texture?.image) return null;

  const iw=texture.image.naturalWidth||texture.image.width||1;
  const ih=texture.image.naturalHeight||texture.image.height||1;
  const aspect=iw/ih;
  const height=width/Math.max(aspect,.1);

  const geo=new THREE.PlaneGeometry(width,height);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    alphaTest:.01,
    depthTest:true,
    depthWrite:false,
    side:THREE.FrontSide,
    polygonOffset:true,
    polygonOffsetFactor:-4,
    polygonOffsetUnits:-4
  });

  const m=new THREE.Mesh(geo,mat);
  m.name=name;
  m.position.set(x,y,z);
  m.renderOrder=80;
  realKit.add(m);
  return m;
}

function rebuildChestDecals(){
  if(nutriaChestLogo){disposeMesh3D(nutriaChestLogo);nutriaChestLogo=null;}
  if(teamChestLogo3D){disposeMesh3D(teamChestLogo3D);teamChestLogo3D=null;}
  if(!jerseyMesh) return;

  const box=jerseyBounds();
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());

  if(nutriaLogoTexture){
    const sc=Math.max(.35,Math.min(3,nutriaLogoScale||1.35));
    const px=center.x - size.x*.17 + (nutriaLogoX||0)/100*size.x*.15;
    const py=center.y + size.y*.23 + (nutriaLogoY||0)/100*size.y*.12;
    const iw=nutriaLogoTexture.image?.naturalWidth||nutriaLogoTexture.image?.width||1;
    const ih=nutriaLogoTexture.image?.naturalHeight||nutriaLogoTexture.image?.height||1;
    const aspect=iw/ih;
    const w=size.x*.20*sc;
    const hh=Math.min(w/Math.max(aspect,.2),size.y*.13*sc);
    nutriaChestLogo=makeSurfaceAnchoredPlane(
      nutriaLogoTexture,'front',px,py,w,hh,'NUTRIA_LOGO_SURFACE',100
    );
  }

  if(teamLogoTexture){
    const sc=Math.max(.35,Math.min(3,teamLogoScale||1));
    const px=center.x + size.x*.17 + (teamLogoX||0)/100*size.x*.15;
    const py=center.y + size.y*.23 + (teamLogoY||0)/100*size.y*.12;
    const w=size.x*.14*sc;
    teamChestLogo3D=makeSurfaceAnchoredPlane(
      teamLogoTexture,'front',px,py,w,w,'TEAM_CREST_SURFACE',100
    );
  }

  updateView();
}

function makeShortsLogoTextureCropped(sourceTexture){
  const img=sourceTexture?.image;
  if(!img) return sourceTexture;
  try{
    const sw=img.naturalWidth||img.width;
    const sh=img.naturalHeight||img.height;
    const scan=document.createElement('canvas');
    scan.width=sw; scan.height=sh;
    const sctx=scan.getContext('2d',{willReadFrequently:true});
    sctx.drawImage(img,0,0,sw,sh);
    const data=sctx.getImageData(0,0,sw,sh).data;
    let minX=sw,minY=sh,maxX=-1,maxY=-1;
    for(let y=0;y<sh;y++){
      for(let x=0;x<sw;x++){
        if(data[(y*sw+x)*4+3]>12){
          if(x<minX)minX=x; if(x>maxX)maxX=x;
          if(y<minY)minY=y; if(y>maxY)maxY=y;
        }
      }
    }
    if(maxX<minX || maxY<minY) return sourceTexture;
    const pad=Math.max(2,Math.round(Math.max(sw,sh)*.01));
    minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
    maxX=Math.min(sw-1,maxX+pad); maxY=Math.min(sh-1,maxY+pad);
    const cw=maxX-minX+1, ch=maxY-minY+1;
    const c=document.createElement('canvas');
    c.width=cw; c.height=ch;
    c.getContext('2d').drawImage(img,minX,minY,cw,ch,0,0,cw,ch);
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.needsUpdate=true;
    return tex;
  }catch(err){
    console.warn('Crop logo shorts non disponibile:',err);
    return sourceTexture;
  }
}


function makeLocalShortsPlane(texture,xFrac,yFrac,widthFrac,heightFrac,name,renderOrder=120){
  if(!shortsMesh || !texture) return null;
  const geoSrc=shortsMesh.geometry;
  if(!geoSrc.boundingBox) geoSrc.computeBoundingBox();
  const b=geoSrc.boundingBox;
  const size=new THREE.Vector3();
  b.getSize(size);
  const center=new THREE.Vector3();
  b.getCenter(center);

  const geo=new THREE.PlaneGeometry(size.x*widthFrac,size.y*heightFrac);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    alphaTest:.01,
    depthTest:true,
    depthWrite:false,
    side:THREE.DoubleSide,
    polygonOffset:true,
    polygonOffsetFactor:-8,
    polygonOffsetUnits:-8
  });

  const mesh=new THREE.Mesh(geo,mat);
  mesh.name=name;
  mesh.position.set(
    center.x + size.x*xFrac,
    b.min.y + size.y*yFrac,
    b.max.z + Math.max(size.z*.012,.002)
  );
  mesh.renderOrder=renderOrder;
  shortsMesh.add(mesh);
  return mesh;
}

function rebuildShortsBranding(){
  if(nutriaShortsLogo){disposeMesh3D(nutriaShortsLogo);nutriaShortsLogo=null;}
  if(!shortsMesh || !nutriaLogoTexture) return;

  const logoTex=makeShortsLogoTextureCropped(nutriaLogoTexture);
  const iw=logoTex.image?.naturalWidth||logoTex.image?.width||1;
  const ih=logoTex.image?.naturalHeight||logoTex.image?.height||1;
  const aspect=iw/ih;

  // LINEA INFERIORE indicata dall'utente: quasi all'orlo.
  // Coordinate LOCALI del pantaloncino, così non cambiano con fit/scala del modello.
  const widthFrac=.17;
  const heightFrac=Math.min(widthFrac/Math.max(aspect,.2)*1.9,.10);
  nutriaShortsLogo=makeLocalShortsPlane(
    logoTex,
    -.22,   // stessa gamba sinistra per chi guarda
    -.2646,  // logo abbassato di un ulteriore 40%
    widthFrac,
    heightFrac,
    'NUTRIA_SHORTS_SURFACE',
    120
  );
  updateView();
}

function rebuildShortsNumber(){
  if(shortsNumberMesh){disposeMesh3D(shortsNumberMesh);shortsNumberMesh=null;}
  if(!shortsMesh) return;

  const number=(document.getElementById('playerNumber')?.value||'').trim();
  if(!number) return;

  const font=document.getElementById('kitFont')?.value||'Anton';
  const color=document.getElementById('textColor')?.value||'#ffffff';
  const tex=makeTextTexture(number,font,color,1024,1024,820);

  // LINEA SUPERIORE indicata dall'utente: subito sopra al logo.
  shortsNumberMesh=makeLocalShortsPlane(
    tex,
    -.22,   // stessa colonna del logo
    -.1274,  // numero abbassato di un ulteriore 40%
    .13,
    .13,
    'SHORTS_NUMBER_SURFACE',
    121
  );
  updateView();
}

function rebuildShortsCrest(){
  if(teamShortsCrest){disposeMesh3D(teamShortsCrest);teamShortsCrest=null;}
  if(!shortsMesh || !teamLogoTexture) return;

  const crestTex=makeShortsLogoTextureCropped(teamLogoTexture);
  const img=crestTex.image;
  const aspect=(img?.naturalWidth||img?.width||1)/(img?.naturalHeight||img?.height||1);

  // Stemma squadra sulla gamba opposta a numero + Nutria.
  // Posizione bassa, vicino all'orlo, con proporzioni mantenute.
  const widthFrac=.13;
  const heightFrac=Math.min(widthFrac/Math.max(aspect,.35)*1.9,.12);

  teamShortsCrest=makeLocalShortsPlane(
    crestTex,
    .22,
    -.255,
    widthFrac,
    heightFrac,
    'TEAM_SHORTS_CREST_SURFACE',
    120
  );
  updateView();
}

function placeChestBranding(){
  rebuildChestDecals();
  rebuildShortsBranding();
  rebuildShortsNumber();
  rebuildShortsCrest();
}

function loadNutriaChestLogo(){
  const loader=new THREE.TextureLoader();
  loader.load(
    './assets/nutria-logo.png',
    tex=>{
      tex.colorSpace=THREE.SRGBColorSpace;
      tex.needsUpdate=true;
      nutriaLogoTexture=tex;
      rebuildChestDecals();
      rebuildShortsBranding();
    },
    undefined,
    err=>console.error('Impossibile caricare ./assets/nutria-logo.png',err)
  );
}



function textureFromUploadedFile(file){
  return new Promise((resolve,reject)=>{
    if(!file){ reject(new Error('Nessun file selezionato')); return; }
    if(!/^image\/(png|jpeg|webp)$/i.test(file.type)){
      reject(new Error('Formato non supportato. Usa PNG, JPG o WEBP.'));
      return;
    }

    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Impossibile leggere il file.'));
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const tex=new THREE.Texture(img);
        tex.colorSpace=THREE.SRGBColorSpace;
        tex.needsUpdate=true;
        resolve(tex);
      };
      img.onerror=()=>reject(new Error('Immagine non valida o corrotta.'));
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function makeAnchoredSponsorPlane(texture,front){
  if(!realKit || !texture?.image) return null;

  const iw=texture.image.naturalWidth||texture.image.width||1;
  const ih=texture.image.naturalHeight||texture.image.height||1;
  const aspect=iw/ih;

  const scale=front ? frontSponsorScale : backSponsorScale;
  const yOffset=(front ? frontSponsorY : backSponsorY) || 0;

  // Coordinate fisse sul GLB reale.
  // Fronte: zona pancia. Retro: sotto il numero.
  const x=0;
  const y=(front ? 115.0 : 106.0) + yOffset*.055;
  const z=front ? 15.56 : -15.56;
  const width=(front ? 22.0 : 18.0)*scale;
  const height=width/Math.max(aspect,.15);

  const geo=new THREE.PlaneGeometry(width,height);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    alphaTest:.01,
    depthTest:true,
    depthWrite:false,
    side:THREE.DoubleSide,
    polygonOffset:true,
    polygonOffsetFactor:-6,
    polygonOffsetUnits:-6
  });

  const mesh=new THREE.Mesh(geo,mat);
  mesh.name=front?'FRONT_SPONSOR_3D':'BACK_SPONSOR_3D';
  mesh.position.set(x,y,z);
  if(!front) mesh.rotation.y=Math.PI;
  mesh.renderOrder=90;
  realKit.add(mesh);
  return mesh;
}

function rebuildSponsors(){
  if(frontSponsorPlane){disposeMesh3D(frontSponsorPlane);frontSponsorPlane=null;}
  if(backSponsorPlane){disposeMesh3D(backSponsorPlane);backSponsorPlane=null;}

  if(frontSponsorTexture) frontSponsorPlane=makeAnchoredSponsorPlane(frontSponsorTexture,true);
  if(backSponsorTexture) backSponsorPlane=makeAnchoredSponsorPlane(backSponsorTexture,false);

  updateView();
}

async function loadSponsor(file,front){
  if(!file) return;
  const status=document.getElementById(front?'frontSponsorStatus':'backSponsorStatus');
  status.textContent='Caricamento…';

  try{
    const tex=await textureFromUploadedFile(file);
    if(front){
      frontSponsorTexture?.dispose?.();
      frontSponsorTexture=tex;
    }else{
      backSponsorTexture?.dispose?.();
      backSponsorTexture=tex;
    }
    rebuildSponsors();
    status.textContent='✓ '+file.name;
  }catch(err){
    console.error(err);
    status.textContent='Errore: '+err.message;
  }
}


function makeTextTexture(text,font,color,width=1024,height=256,fontPx=150){
  const c=document.createElement('canvas');
  c.width=width; c.height=height;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,width,height);
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=color;
  ctx.font=`900 ${fontPx}px "${font}", "Arial Black", sans-serif`;

  // Riduce automaticamente il testo lungo per non uscire dalla maglia.
  let measured=ctx.measureText(text).width;
  let px=fontPx;
  while(measured>width*.90 && px>40){
    px-=5;
    ctx.font=`900 ${px}px "${font}", "Arial Black", sans-serif`;
    measured=ctx.measureText(text).width;
  }
  ctx.fillText(text,width/2,height/2);
  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=true;
  return tex;
}

function createBackTextDecal(texture, y, width, height, name){
  const box=jerseyBounds();
  const center=box.getCenter(new THREE.Vector3());
  const hit=findJerseySurface('back',center.x,y);
  if(!hit){
    console.warn('Superficie retro non trovata:',name);
    texture.dispose?.();
    return null;
  }
  const decal=makeSurfaceDecal(texture,hit,width,height,110);
  decal.name=name;
  return decal;
}

function makeTextPlane(text,font,color,width,height,fontPx,name){
  if(!realKit || !text) return null;

  const c=document.createElement('canvas');
  c.width=1024;
  c.height=256;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle=color;
  ctx.textAlign='center';
  ctx.textBaseline='middle';

  let px=fontPx;
  ctx.font=`900 ${px}px "${font}", "Arial Black", sans-serif`;
  while(ctx.measureText(text).width>c.width*.88 && px>40){
    px-=5;
    ctx.font=`900 ${px}px "${font}", "Arial Black", sans-serif`;
  }
  ctx.fillText(text,c.width/2,c.height/2);

  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=true;

  const geo=new THREE.PlaneGeometry(width,height);
  const mat=new THREE.MeshBasicMaterial({
    map:tex,
    transparent:true,
    alphaTest:.01,
    depthTest:true,
    depthWrite:false,
    side:THREE.FrontSide,
    polygonOffset:true,
    polygonOffsetFactor:-4,
    polygonOffsetUnits:-4
  });

  const mesh=new THREE.Mesh(geo,mat);
  mesh.name=name;

  // Retro reale = -Z. Ruotiamo il piano verso chi osserva la schiena.
  mesh.rotation.y=Math.PI;
  mesh.renderOrder=85;
  realKit.add(mesh);
  return mesh;
}

function updateBackPrint(){
  if(backNameMesh){disposeMesh3D(backNameMesh);backNameMesh=null;}
  if(backNumberMesh){disposeMesh3D(backNumberMesh);backNumberMesh=null;}
  if(backPrint){disposeDecal(backPrint);backPrint=null;}
  if(!jerseyMesh) return;

  const name=(document.getElementById('playerName')?.value||'').trim().toUpperCase();
  const number=(document.getElementById('playerNumber')?.value||'').trim();
  const font=document.getElementById('kitFont')?.value||'Anton';
  const color=document.getElementById('textColor')?.value||'#ffffff';

  const box=jerseyBounds();
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());

  if(name){
    const tex=makeTextTexture(name,font,color,1800,360,260);
    const nameY=center.y+size.y*.27+(backNameY/100)*size.y*.12;
    backNameMesh=makeSurfaceAnchoredPlane(
      tex,'back',center.x,nameY,
      size.x*.58*backNameScale,size.y*.095*backNameScale,'BACK_NAME_SURFACE',110
    );
  }

  if(number){
    const tex=makeTextTexture(number,font,color,1400,1400,900);
    const numberY=center.y+size.y*.04+(backNumberY/100)*size.y*.18;
    backNumberMesh=makeSurfaceAnchoredPlane(
      tex,'back',center.x,numberY,
      size.x*.55*backNumberScale,size.y*.36*backNumberScale,'BACK_NUMBER_SURFACE',111
    );
  }

  updateView();
}

function updateView(){
  if(!realKit) return;

  const showJersey=currentView!=='Pantaloncini';
  const showLower=currentView!=='Maglia';

  if(jerseyMesh) jerseyMesh.visible=showJersey;
  if(collarMesh) collarMesh.visible=showJersey;
  if(sleevesMesh) sleevesMesh.visible=showJersey;
  if(shortsMesh) shortsMesh.visible=showLower;
  if(socksMesh) socksMesh.visible=showLower;

  // La vecchia mesh logo incorporata nel GLB resta nascosta:
  // usiamo il nuovo piano 3D posizionato correttamente.
  if(nutriaFixedMesh) nutriaFixedMesh.visible=false;
  if(nutriaChestLogo) nutriaChestLogo.visible=showJersey;
  if(teamChestLogo3D) teamChestLogo3D.visible=showJersey;
  if(backNameMesh) backNameMesh.visible=showJersey;
  if(backNumberMesh) backNumberMesh.visible=showJersey;
  if(nutriaShortsLogo) nutriaShortsLogo.visible=showLower;
  if(shortsNumberMesh) shortsNumberMesh.visible=showLower;
  if(nutriaChestLogo) nutriaChestLogo.visible=showJersey;
  if(teamCrest) teamCrest.visible=showJersey;
  if(teamShortsCrest) teamShortsCrest.visible=showLower;
  if(backPrint) backPrint.visible=showJersey;
  if(frontSponsorPlane) frontSponsorPlane.visible=showJersey;
  if(backSponsorPlane) backSponsorPlane.visible=showJersey;
}

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  './models/nutria-football-kit-web-v2.glb',
  gltf=>{
    realKit = gltf.scene;
    scene.add(realKit);

    realKit.traverse(obj=>{
      if(obj.isMesh){
        obj.visible=true;
        originalMeshes.push(obj);

        if(Array.isArray(obj.material)) obj.material=obj.material.map(m=>m.clone());
        else if(obj.material) obj.material=obj.material.clone();

        materialsOf(obj).forEach(mat=>{
          if(mat){ mat.side=THREE.DoubleSide; mat.needsUpdate=true; }
        });

        if(obj.name==='JERSEY_BODY_EDITABLE') jerseyMesh=obj;
        if(obj.name==='JERSEY_COLLAR_EDITABLE') collarMesh=obj;
        if(obj.name==='JERSEY_SLEEVES_EDITABLE') sleevesMesh=obj;
        if(obj.name==='SHORTS_EDITABLE') shortsMesh=obj;
        if(obj.name==='SOCKS_EDITABLE') socksMesh=obj;
        if(obj.name==='NUTRIA_LOGO_FIXED') nutriaFixedMesh=obj;

        console.log('MESH:',obj.name);
      }
    });

    fitKit();

    // SOLO pantaloncini: normalizza le UV prima di applicare il pattern.
    try{ normalizeShortsUV(); }catch(err){ console.warn('UV pantaloncini:',err); }

    if(!jerseyMesh || !collarMesh || !sleevesMesh || !shortsMesh || !socksMesh){
      console.warn('Una o più mesh previste non sono state trovate.');
    }

    // Il modello 3D deve diventare visibile subito:
    // font, loghi e stampe sono accessori e non possono bloccarne il caricamento.
    try{ applyKitColor(chosenColor); }catch(err){ console.warn('Colore kit:',err); }
    try{ updateView(); }catch(err){ console.warn('Vista kit:',err); }

    loading.textContent='KIT 3D PRONTO · 100%';
    requestAnimationFrame(()=>{ loading.style.display='none'; });

    // Caricamenti/accessori non bloccanti
    try{
      loadNutriaChestLogo();
      if(nutriaLogoTexture || teamLogoTexture) rebuildChestDecals();
      if(nutriaLogoTexture) rebuildShortsBranding();
      if(teamLogoTexture) rebuildShortsCrest();
      rebuildShortsNumber();
    }catch(err){ console.warn('Logo petto:',err); }

    try{ updateBackPrint(); }catch(err){ console.warn('Nome/numero:',err); }

    if(document.fonts && document.fonts.load){
      document.fonts.load('900 120px "Anton"')
        .then(()=>{ try{ updateBackPrint(); }catch(err){ console.warn(err); } })
        .catch(err=>console.warn('Font Anton:',err));
    }

    setTimeout(()=>{
      try{ if(nutriaLogoTexture || teamLogoTexture) rebuildChestDecals(); }catch(err){ console.warn(err); }
      try{ if(nutriaLogoTexture) rebuildShortsBranding(); }catch(err){ console.warn(err); }
      try{ if(teamLogoTexture) rebuildShortsCrest(); }catch(err){ console.warn(err); }
      try{ updateBackPrint(); }catch(err){ console.warn(err); }
    },150);
    console.log('✓ NUTRIA KIT 3D CARICATO · V6.33 SHORTS HEM ALIGN');
  },
  xhr=>{
    if(xhr.lengthComputable && xhr.total>0){
      const raw=(xhr.loaded/xhr.total)*100;
      const pct=Math.max(0,Math.min(99,Math.round(raw)));
      loading.textContent = raw>=99
        ? 'ELABORAZIONE MODELLO 3D…'
        : 'CARICAMENTO KIT 3D… '+pct+'%';
    }else{
      const mb=(xhr.loaded/1024/1024).toFixed(1);
      loading.textContent='CARICAMENTO KIT 3D… '+mb+' MB';
    }
  },
  err=>{
    console.error('ERRORE GLB:',err);
    loading.classList.add('error');
    loading.textContent='ERRORE NEL CARICAMENTO DEL KIT 3D. Controlla che models/nutria-football-kit-web-v2.glb sia presente nel repository, poi ricarica la pagina.';
  }
);

document.querySelectorAll('[data-color]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-color]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    applyKitColor(btn.dataset.color);
    if(!collarCustom) document.getElementById('collarColor').value=chosenColor;
    if(!sleeveCustom) document.getElementById('sleeveColor').value=chosenColor;
    if(!shortsCustom) document.getElementById('shortsColor').value=chosenColor;
    if(!socksCustom) document.getElementById('socksColor').value=chosenColor;
  });
});

document.querySelectorAll('[data-view]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    document.getElementById('productTitle').textContent=currentView.toUpperCase()+' · ANTEPRIMA 3D';

    updateView();
  });
});

document.querySelectorAll('[data-pattern]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-pattern]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); currentPattern=b.dataset.pattern; applyKitColor();
}));
function setCustomBase(value){
 if(!/^#[a-fA-F0-9]{6}$/.test(value))return;
 document.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('active',b.dataset.color.toLowerCase()===value.toLowerCase()));
 applyKitColor(value);
 for(const [id,custom] of [['collarColor',collarCustom],['sleeveColor',sleeveCustom],['shortsColor',shortsCustom],['socksColor',socksCustom]])if(!custom)document.getElementById(id).value=value;
}
document.getElementById('customBaseColor').addEventListener('input',e=>setCustomBase(e.target.value));
document.getElementById('baseColorHex').addEventListener('input',e=>{e.target.setCustomValidity(/^#[a-fA-F0-9]{6}$/.test(e.target.value)?'':'Inserisci un codice come #176C45');setCustomBase(e.target.value)});
document.getElementById('baseColorHex').addEventListener('blur',e=>{if(!/^#[a-fA-F0-9]{6}$/.test(e.target.value)){e.target.value=chosenColor.toUpperCase();e.target.setCustomValidity('')}});
document.getElementById('shortsStyle').addEventListener('change',e=>{shortsStyle=e.target.value;applyKitColor()});
document.getElementById('patternColor').addEventListener('input',e=>{patternColor=e.target.value;applyKitColor();});
document.getElementById('patternSize').addEventListener('input',e=>{patternSize=e.target.value;applyKitColor();});
document.getElementById('collarColor').addEventListener('input',e=>{collarCustom=true;collarColor=e.target.value;applyKitColor();});
document.getElementById('sleeveColor').addEventListener('input',e=>{sleeveCustom=true;sleeveColor=e.target.value;applyKitColor();});
document.getElementById('shortsColor').addEventListener('input',e=>{shortsCustom=true;shortsColor=e.target.value;applyKitColor();});
document.getElementById('socksColor').addEventListener('input',e=>{socksCustom=true;socksColor=e.target.value;applyKitColor();});
['playerName','playerNumber','textColor'].forEach(id=>{
  document.getElementById(id).addEventListener('input',updateBackPrint);
  document.getElementById(id).addEventListener('change',updateBackPrint);
});
document.getElementById('kitFont').addEventListener('change',async e=>{
  const selected=e.target.value;
  try{ await document.fonts.load(`900 120px "${selected}"`); }catch(err){ console.warn(err); }
  updateBackPrint();
  rebuildShortsNumber();
});

// Solo pantaloncini: il numero segue automaticamente quello della maglia.
document.getElementById('playerNumber')?.addEventListener('input',rebuildShortsNumber);
document.getElementById('playerNumber')?.addEventListener('change',rebuildShortsNumber);
document.getElementById('textColor')?.addEventListener('input',rebuildShortsNumber);
document.getElementById('textColor')?.addEventListener('change',rebuildShortsNumber);
// Il cambio font aggiorna il numero dopo il caricamento del carattere.

document.getElementById('logoFile').addEventListener('change',async e=>{
  const f=e.target.files?.[0];
  if(!f) return;
  const st=document.getElementById('fileStatus');
  st.textContent='Caricamento stemma…';
  try{
    const tex=await textureFromUploadedFile(f);
    teamLogoTexture?.dispose?.();
    teamLogoTexture=tex;
    rebuildChestDecals();
    rebuildShortsCrest();
    st.textContent='✓ '+f.name;
  }catch(err){
    console.error(err);
    st.textContent='Errore: '+err.message;
  }
});

document.getElementById('headerLogo').addEventListener('error',()=>{
  document.getElementById('headerLogo').style.display='none';
  document.getElementById('headerFallback').style.display='grid';
});

// Crea UN PNG con quattro viste fisse del kit (fronte, retro e due lati).
// Un PNG non è interattivo, ma il cliente e Nutria vedono tutto il giro della divisa.
// Cattura sincrona del framebuffer sRGB; ripristina dimensioni e vista prima del prossimo frame.
function creaBozzaQuattroViste(){
  if(!realKit) throw new Error('Il modello 3D non è ancora caricato.');

  const W=1340, H=1570;
  const board=document.createElement('canvas');
  board.width=W;
  board.height=H;
  const ctx=board.getContext('2d');
  if(!ctx) throw new Error('Impossibile creare il documento PNG.');

  const bg='#0b0d0f', card='#15191b', gold='#d7a928';
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle=gold;
  ctx.fillRect(42,48,7,66);
  ctx.textAlign='left';
  ctx.fillStyle='#f8f8f4';
  ctx.font='bold 37px Arial, sans-serif';
  ctx.fillText('NUTRIA SPORTSWEAR',72,81);
  ctx.font='bold 19px Arial, sans-serif';
  ctx.fillStyle=gold;
  ctx.fillText('BOZZA DEL KIT  ·  4 VISTE',73,113);

  const team=(document.getElementById('team')?.value||'').trim();
  if(team){
    ctx.fillStyle='#c3c9c8';
    ctx.font='20px Arial, sans-serif';
    const shortTeam=team.length>38 ? team.slice(0,35)+'…' : team;
    ctx.textAlign='right';
    ctx.fillText(shortTeam,W-42,85);
    ctx.textAlign='left';
  }

  const panelW=609, panelH=657, x0=42, y0=154, gapX=38, gapY=26;
  const frameW=564, frameH=570;
  const orientations=[
    {label:'FRONTE',      dir:[0,0,1]},
    {label:'RETRO',       dir:[0,0,-1]},
    {label:'LATO DESTRO', dir:[-1,0,0]},
    {label:'LATO SINISTRO',dir:[1,0,0]}
  ];

  const savedView=currentView;
  const prevTarget=renderer.getRenderTarget();
  const previousSize=renderer.getSize(new THREE.Vector2());
  const previousPixelRatio=renderer.getPixelRatio();
  const previousViewport=renderer.getViewport(new THREE.Vector4());
  const previousScissor=renderer.getScissor(new THREE.Vector4());
  const previousScissorTest=renderer.getScissorTest();
  const distance=6.8;

  try{
    // Mostra sempre il kit intero nel PNG, anche se sul sito è selezionata 'Maglia'.
    currentView='Kit';
    updateView();
    realKit.updateMatrixWorld(true);

    orientations.forEach((view,index)=>{
      const col=index%2, row=Math.floor(index/2);
      const px=x0+col*(panelW+gapX);
      const py=y0+row*(panelH+gapY);
      ctx.fillStyle=card;
      ctx.fillRect(px,py,panelW,panelH);
      ctx.strokeStyle='#333c3e';
      ctx.lineWidth=2;
      ctx.strokeRect(px+1,py+1,panelW-2,panelH-2);
      ctx.fillStyle=gold;
      ctx.font='bold 21px Arial, sans-serif';
      ctx.fillText(view.label,px+22,py+34);
      ctx.font='16px Arial, sans-serif';
      ctx.fillStyle='#aab1b2';
      ctx.textAlign='right';
      ctx.fillText((index+1)+'/4',px+panelW-23,py+34);
      ctx.textAlign='left';

      // A fresh camera and an explicit world matrix prevent a preceding view
      // from leaking into this frame, including on mobile WebGL drivers.
      const cam=new THREE.PerspectiveCamera(35,frameW/frameH,.01,100);
      cam.position.fromArray(view.dir).multiplyScalar(distance);
      cam.lookAt(0,0,0);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
      renderer.setRenderTarget(null);
      renderer.setPixelRatio(1);
      renderer.setSize(frameW,frameH,false);
      renderer.setViewport(0,0,frameW,frameH);
      renderer.setScissorTest(false);
      renderer.clear(true,true,true);
      renderer.render(scene,cam);
      // Capture the same sRGB framebuffer displayed by the configurator.
      // No linear render-target bytes or manual pixel-row conversion.
      ctx.drawImage(renderer.domElement,px+(panelW-frameW)/2,py+56,frameW,frameH);
    });
  }finally{
    renderer.setRenderTarget(prevTarget);
    renderer.setPixelRatio(previousPixelRatio);
    renderer.setSize(previousSize.x,previousSize.y,false);
    renderer.setViewport(previousViewport);
    renderer.setScissor(previousScissor);
    renderer.setScissorTest(previousScissorTest);
    currentView=savedView;
    updateView();
    controls.update();
    renderer.render(scene,camera);
  }

  ctx.fillStyle='#d7d9d7';
  ctx.font='18px Arial, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('ANTEPRIMA INDICATIVA  ·  IL PROGETTO GRAFICO DEFINITIVO SARÀ CONCORDATO CON NUTRIA SPORTSWEAR',W/2,H-41);

  return board;
}

async function creaModelloGLB(){
  if(!realKit)throw new Error('Il modello 3D non è ancora caricato.');
  await document.fonts.ready;
  const savedView=currentView;
  const snapshot=new THREE.Group();
  snapshot.name='Nutria Sportswear · Kit personalizzato';
  try{
    currentView='Kit';updateView();scene.updateMatrixWorld(true);
    // Branding meshes are scene siblings, so export the entire visible kit,
    // not just the original GLB subtree. Hidden legacy logos stay excluded.
    for(const child of scene.children){
      if(child.isLight||child.isCamera||!child.visible)continue;
      snapshot.add(child.clone(true));
    }
  }finally{currentView=savedView;updateView();}
  const result=await new GLTFExporter().parseAsync(snapshot,{binary:true,onlyVisible:true,maxTextureSize:2048});
  if(!(result instanceof ArrayBuffer))throw new Error('Esportazione 3D non riuscita.');
  const blob=new Blob([result],{type:'model/gltf-binary'});
  if(blob.size>25000000)throw new Error('Il modello supera 25 MB. Riduci le immagini dei loghi.');
  return blob;
}
function scaricaFile(blob,name){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
document.getElementById('downloadModel').addEventListener('click',async e=>{
  const button=e.currentTarget,previous=button.textContent;button.disabled=true;button.textContent='PREPARAZIONE 3D…';
  try{scaricaFile(await creaModelloGLB(),'bozza-nutria-kit.glb');}
  catch(error){alert('Esportazione 3D: '+error.message);}
  finally{button.disabled=false;button.textContent=previous;}
});

function canvasToPngBlob(canvas){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error('Impossibile generare il PNG completo.')),'image/png');
  });
}

document.getElementById('quoteForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector('[type="submit"]');
  const previous=button.textContent;
  button.disabled=true;
  button.textContent='PREPARAZIONE BOZZA…';

  try{
    if(!realKit){ throw new Error('Kit 3D non ancora caricato.'); }
    await document.fonts.ready;
    const pngCanvas=creaBozzaQuattroViste();
    const png=await canvasToPngBlob(pngCanvas);
    const team=(document.getElementById('team').value||'kit').trim();
    const safeTeam=team.replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'kit';
    const pngFile=new File([png],`bozza-nutria-${safeTeam}-4-viste.png`,{type:'image/png'});

    // Nome, Email e Long text sono i tre campi del form pubblicato nel pannello.
    document.getElementById('fsName').value=document.getElementById('name').value.trim();
    document.getElementById('fsEmail').value=document.getElementById('email').value.trim();
    document.getElementById('fsMessage').value=[
      'BOZZA PRELIMINARE · NUTRIA SPORTSWEAR',
      'Referente: '+document.getElementById('name').value.trim(),
      'Squadra: '+team,
      'Email: '+document.getElementById('email').value.trim(),
      'Quantità: '+document.getElementById('qty').value,
      'Nome maglia: '+(document.getElementById('playerName')?.value||''),
      'Numero maglia: '+(document.getElementById('playerNumber')?.value||''),
      'Colore principale: '+chosenColor,
      'Pattern maglia: '+currentPattern,
      'Pattern pantaloncini: '+shortsStyle,
      'Colore trama: '+patternColor,
      'Spessore trama: '+patternSize,
      'Colore pantaloncini: '+shortsColor,
      'Note: '+document.getElementById('notes').value,
      'PNG quattro viste (fronte/retro/lati): '+pngFile.name
    ].join('\n');

    const data=new FormData();
    data.append('png',pngFile);
    button.textContent='PREPARAZIONE MODELLO 3D…';
    data.append('model',new File([await creaModelloGLB()],`bozza-nutria-${safeTeam}.glb`,{type:'model/gltf-binary'}));
    data.append('details',JSON.stringify({name:document.getElementById('name').value.trim(),team,email:document.getElementById('email').value.trim(),qty:document.getElementById('qty').value,notes:document.getElementById('notes').value,configuration:document.getElementById('fsMessage').value,controls:Object.fromEntries([...document.querySelectorAll('input,select')].filter(el=>el.id&&el.type!=='file').map(el=>[el.id,el.value]))}));
    for(const id of ['logoFile','frontSponsorFile','backSponsorFile']){ const f=document.getElementById(id).files[0]; if(f)data.append(id,f); }
    button.textContent='SALVATAGGIO…';
    const response=await fetch('/api/bozze',{method:'POST',body:data});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Salvataggio non riuscito');
    button.textContent='BOZZA SALVATA ✓';
    alert('Bozza salvata. La trovi nell’area Bozze. Riferimento: '+result.id);
    button.disabled=false;
  }catch(error){
    console.error('Invio bozza:',error);
    alert('Non riesco a preparare gli allegati della bozza: '+error.message);
    button.disabled=false;
    button.textContent=previous;
  }
});

document.getElementById('downloadPreview').addEventListener('click',async()=>{
  try{
    await document.fonts.ready;
    const pngCanvas=creaBozzaQuattroViste();
    const png=await canvasToPngBlob(pngCanvas);
    const url=URL.createObjectURL(png);
    const link=document.createElement('a');
    link.download='bozza-nutria-kit-4-viste.png';
    link.href=url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){
    console.error(error);
    alert('Non è stato possibile generare la bozza a quattro viste.');
  }
});

function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;
  if(!w||!h)return;
  const previousFit=minimumFitDistance(camera.aspect);
  const offset=camera.position.clone().sub(controls.target);
  camera.aspect=w/h;
  offset.multiplyScalar(minimumFitDistance(camera.aspect)/previousFit);
  camera.position.copy(controls.target).add(offset);
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
}
window.addEventListener('resize',resize);
if('ResizeObserver' in window)new ResizeObserver(resize).observe(stage);


const nutriaLogoSizeInput=document.getElementById('nutriaLogoSize');
const teamLogoSizeInput=document.getElementById('teamLogoSize');

if(nutriaLogoSizeInput){
  nutriaLogoSizeInput.addEventListener('input',e=>{
    nutriaLogoScale=Number(e.target.value)/100;
    document.getElementById('nutriaLogoSizeValue').textContent=e.target.value+'%';
    rebuildChestDecals();
  });
}
if(teamLogoSizeInput){
  teamLogoSizeInput.addEventListener('input',e=>{
    teamLogoScale=Number(e.target.value)/100;
    document.getElementById('teamLogoSizeValue').textContent=e.target.value+'%';
    rebuildChestDecals();
  });
}
document.getElementById('nutriaLogoX')?.addEventListener('input',e=>{nutriaLogoX=Number(e.target.value);rebuildChestDecals();});
document.getElementById('nutriaLogoY')?.addEventListener('input',e=>{nutriaLogoY=Number(e.target.value);rebuildChestDecals();});
document.getElementById('teamLogoX')?.addEventListener('input',e=>{teamLogoX=Number(e.target.value);rebuildChestDecals();});
document.getElementById('teamLogoY')?.addEventListener('input',e=>{teamLogoY=Number(e.target.value);rebuildChestDecals();});

document.getElementById('frontSponsorFile')?.addEventListener('change',e=>loadSponsor(e.target.files[0],true));document.getElementById('backSponsorFile')?.addEventListener('change',e=>loadSponsor(e.target.files[0],false));document.getElementById('frontSponsorSize')?.addEventListener('input',e=>{frontSponsorScale=+e.target.value/100;document.getElementById('frontSponsorSizeValue').textContent=e.target.value+'%';rebuildSponsors()});document.getElementById('backSponsorSize')?.addEventListener('input',e=>{backSponsorScale=+e.target.value/100;document.getElementById('backSponsorSizeValue').textContent=e.target.value+'%';rebuildSponsors()});document.getElementById('frontSponsorY')?.addEventListener('input',e=>{frontSponsorY=+e.target.value;rebuildSponsors()});document.getElementById('backSponsorY')?.addEventListener('input',e=>{backSponsorY=+e.target.value;rebuildSponsors()});


// Controlli diretti per evitare ulteriori modifiche al file.
document.getElementById('nutriaShortsSize')?.addEventListener('input',e=>{
  nutriaShortsScale=Number(e.target.value)/100;
  document.getElementById('nutriaShortsSizeValue').textContent=e.target.value+'%';
  rebuildShortsBranding();
});
document.getElementById('nutriaShortsX')?.addEventListener('input',e=>{nutriaShortsX=Number(e.target.value);rebuildShortsBranding();});
document.getElementById('nutriaShortsY')?.addEventListener('input',e=>{nutriaShortsY=Number(e.target.value);rebuildShortsBranding();});

document.getElementById('backNameSize')?.addEventListener('input',e=>{
  backNameScale=Number(e.target.value)/100;
  document.getElementById('backNameSizeValue').textContent=e.target.value+'%';
  updateBackPrint();
});
document.getElementById('backNameY')?.addEventListener('input',e=>{backNameY=Number(e.target.value);updateBackPrint();});
document.getElementById('backNumberSize')?.addEventListener('input',e=>{
  backNumberScale=Number(e.target.value)/100;
  document.getElementById('backNumberSizeValue').textContent=e.target.value+'%';
  updateBackPrint();
});
document.getElementById('backNumberY')?.addEventListener('input',e=>{backNumberY=Number(e.target.value);updateBackPrint();});

function animate(){
  requestAnimationFrame(animate);
  if(!document.hidden&&stageVisible){controls.update();renderer.render(scene,camera);}
}
animate();

window.addEventListener('DOMContentLoaded',()=>{
  const fs=document.getElementById('frontSponsorStatus');
  const bs=document.getElementById('backSponsorStatus');

  function addRemove(statusEl,front){
    if(!statusEl || statusEl.parentElement.querySelector('.remove-sponsor-'+(front?'front':'back'))) return;
    const b=document.createElement('button');
    b.type='button';
    b.className='remove-sponsor-'+(front?'front':'back');
    b.textContent='Rimuovi sponsor';
    b.style.marginTop='8px';
    b.style.width='100%';
    b.addEventListener('click',()=>{
      if(front){
        frontSponsorTexture?.dispose?.(); frontSponsorTexture=null;
      }else{
        backSponsorTexture?.dispose?.(); backSponsorTexture=null;
      }
      rebuildSponsors();
      statusEl.textContent=front?'PNG trasparente consigliato.':'Applicato sotto il numero.';
    });
    statusEl.parentElement.appendChild(b);
  }

  addRemove(fs,true);
  addRemove(bs,false);
});


// V6.40 - navigazione rapida UI (solo presentazione)
document.querySelectorAll('.quick-nav [data-jump]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const id=btn.dataset.jump;
    const section=document.getElementById(id);
    if(!section) return;
    document.querySelectorAll('.control-section').forEach(s=>s.open=(s===section));
    document.querySelectorAll('.quick-nav button').forEach(b=>b.classList.toggle('active',b===btn));
    section.scrollIntoView({behavior:'smooth',block:'start'});
  });
});

document.querySelectorAll('.control-section').forEach(section=>{
  section.addEventListener('toggle',()=>{
    if(!section.open) return;
    const btn=document.querySelector(`.quick-nav [data-jump="${section.id}"]`);
    if(btn){
      document.querySelectorAll('.quick-nav button').forEach(b=>b.classList.toggle('active',b===btn));
    }
  });
});


} catch(error) {const el=document.getElementById('loading');if(el){el.className='loading error';el.textContent='Il browser non riesce ad avviare la grafica 3D. Attiva l’accelerazione hardware oppure apri il sito in un browser con supporto WebGL.';}console.error(error);}
