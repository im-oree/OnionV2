var oc=Object.defineProperty;var cc=(i,e,t)=>e in i?oc(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var z=(i,e,t)=>cc(i,typeof e!="symbol"?e+"":e,t);import{a as Eo,u as Vt,b as ot,c as It,r as lc,e as uc,d as Fe,f as bo,s as hc,T as yt,g as Fr,j as re}from"./index-BHFrctSa.js";import{u as pa}from"./effectsStore-zK3j76yX.js";import{f as ma}from"./time-D2BRIH__.js";/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ks="168",dc=0,ga=1,fc=2,To=1,pc=2,sn=3,yn=0,At=1,Dt=2,Mn=0,li=1,_a=2,va=3,xa=4,mc=5,Nn=100,gc=101,_c=102,vc=103,xc=104,Mc=200,Sc=201,yc=202,Ec=203,ds=204,fs=205,bc=206,Tc=207,Ac=208,wc=209,Rc=210,Cc=211,Lc=212,Pc=213,Dc=214,Ic=0,Uc=1,Nc=2,xr=3,Fc=4,Oc=5,Bc=6,zc=7,Ao=0,kc=1,Hc=2,Sn=0,Gc=1,Vc=2,Wc=3,Xc=4,qc=5,Yc=6,Kc=7,wo=300,di=301,fi=302,ps=303,ms=304,wr=306,gs=1e3,zn=1001,_s=1002,Ot=1003,jc=1004,Hi=1005,bt=1006,Or=1007,kn=1008,ln=1009,Ro=1010,Co=1011,Pi=1012,js=1013,Gn=1014,an=1015,_i=1016,$s=1017,Zs=1018,pi=1020,Lo=35902,Po=1021,Do=1022,Bt=1023,Io=1024,Uo=1025,ui=1026,mi=1027,No=1028,Js=1029,Fo=1030,Qs=1031,ea=1033,dr=33776,fr=33777,pr=33778,mr=33779,vs=35840,xs=35841,Ms=35842,Ss=35843,ys=36196,Es=37492,bs=37496,Ts=37808,As=37809,ws=37810,Rs=37811,Cs=37812,Ls=37813,Ps=37814,Ds=37815,Is=37816,Us=37817,Ns=37818,Fs=37819,Os=37820,Bs=37821,gr=36492,zs=36494,ks=36495,Oo=36283,Hs=36284,Gs=36285,Vs=36286,$c=3200,Zc=3201,Jc=0,Qc=1,xn="",Yt="srgb",Tn="srgb-linear",ta="display-p3",Rr="display-p3-linear",Mr="linear",Qe="srgb",Sr="rec709",yr="p3",Wn=7680,Ma=519,el=512,tl=513,nl=514,Bo=515,il=516,rl=517,sl=518,al=519,Sa=35044,ya="300 es",on=2e3,Er=2001;class vi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const n=this._listeners[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const gt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ea=1234567;const Ri=Math.PI/180,Di=180/Math.PI;function xi(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(gt[i&255]+gt[i>>8&255]+gt[i>>16&255]+gt[i>>24&255]+"-"+gt[e&255]+gt[e>>8&255]+"-"+gt[e>>16&15|64]+gt[e>>24&255]+"-"+gt[t&63|128]+gt[t>>8&255]+"-"+gt[t>>16&255]+gt[t>>24&255]+gt[n&255]+gt[n>>8&255]+gt[n>>16&255]+gt[n>>24&255]).toLowerCase()}function Et(i,e,t){return Math.max(e,Math.min(t,i))}function na(i,e){return(i%e+e)%e}function ol(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)}function cl(i,e,t){return i!==e?(t-i)/(e-i):0}function Ci(i,e,t){return(1-t)*i+t*e}function ll(i,e,t,n){return Ci(i,e,1-Math.exp(-t*n))}function ul(i,e=1){return e-Math.abs(na(i,e*2)-e)}function hl(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function dl(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function fl(i,e){return i+Math.floor(Math.random()*(e-i+1))}function pl(i,e){return i+Math.random()*(e-i)}function ml(i){return i*(.5-Math.random())}function gl(i){i!==void 0&&(Ea=i);let e=Ea+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function _l(i){return i*Ri}function vl(i){return i*Di}function xl(i){return(i&i-1)===0&&i!==0}function Ml(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Sl(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function yl(i,e,t,n,r){const s=Math.cos,a=Math.sin,o=s(t/2),c=a(t/2),l=s((e+n)/2),u=a((e+n)/2),h=s((e-n)/2),p=a((e-n)/2),f=s((n-e)/2),_=a((n-e)/2);switch(r){case"XYX":i.set(o*u,c*h,c*p,o*l);break;case"YZY":i.set(c*p,o*u,c*h,o*l);break;case"ZXZ":i.set(c*h,c*p,o*u,o*l);break;case"XZX":i.set(o*u,c*_,c*f,o*l);break;case"YXY":i.set(c*f,o*u,c*_,o*l);break;case"ZYZ":i.set(c*_,c*f,o*u,o*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function oi(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Mt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const El={DEG2RAD:Ri,RAD2DEG:Di,generateUUID:xi,clamp:Et,euclideanModulo:na,mapLinear:ol,inverseLerp:cl,lerp:Ci,damp:ll,pingpong:ul,smoothstep:hl,smootherstep:dl,randInt:fl,randFloat:pl,randFloatSpread:ml,seededRandom:gl,degToRad:_l,radToDeg:vl,isPowerOfTwo:xl,ceilPowerOfTwo:Ml,floorPowerOfTwo:Sl,setQuaternionFromProperEuler:yl,normalize:Mt,denormalize:oi};class We{constructor(e=0,t=0){We.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Et(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*r+e.x,this.y=s*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ke{constructor(e,t,n,r,s,a,o,c,l){ke.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l)}set(e,t,n,r,s,a,o,c,l){const u=this.elements;return u[0]=e,u[1]=r,u[2]=o,u[3]=t,u[4]=s,u[5]=c,u[6]=n,u[7]=a,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],u=n[4],h=n[7],p=n[2],f=n[5],_=n[8],v=r[0],m=r[3],d=r[6],b=r[1],g=r[4],y=r[7],C=r[2],T=r[5],w=r[8];return s[0]=a*v+o*b+c*C,s[3]=a*m+o*g+c*T,s[6]=a*d+o*y+c*w,s[1]=l*v+u*b+h*C,s[4]=l*m+u*g+h*T,s[7]=l*d+u*y+h*w,s[2]=p*v+f*b+_*C,s[5]=p*m+f*g+_*T,s[8]=p*d+f*y+_*w,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8];return t*a*u-t*o*l-n*s*u+n*o*c+r*s*l-r*a*c}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],h=u*a-o*l,p=o*c-u*s,f=l*s-a*c,_=t*h+n*p+r*f;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/_;return e[0]=h*v,e[1]=(r*l-u*n)*v,e[2]=(o*n-r*a)*v,e[3]=p*v,e[4]=(u*t-r*c)*v,e[5]=(r*s-o*t)*v,e[6]=f*v,e[7]=(n*c-l*t)*v,e[8]=(a*t-n*s)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,a,o){const c=Math.cos(s),l=Math.sin(s);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-r*l,r*c,-r*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Br.makeScale(e,t)),this}rotate(e){return this.premultiply(Br.makeRotation(-e)),this}translate(e,t){return this.premultiply(Br.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Br=new ke;function zo(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Ii(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function bl(){const i=Ii("canvas");return i.style.display="block",i}const ba={};function Li(i){i in ba||(ba[i]=!0,console.warn(i))}function Tl(i,e,t){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}const Ta=new ke().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Aa=new ke().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Si={[Tn]:{transfer:Mr,primaries:Sr,luminanceCoefficients:[.2126,.7152,.0722],toReference:i=>i,fromReference:i=>i},[Yt]:{transfer:Qe,primaries:Sr,luminanceCoefficients:[.2126,.7152,.0722],toReference:i=>i.convertSRGBToLinear(),fromReference:i=>i.convertLinearToSRGB()},[Rr]:{transfer:Mr,primaries:yr,luminanceCoefficients:[.2289,.6917,.0793],toReference:i=>i.applyMatrix3(Aa),fromReference:i=>i.applyMatrix3(Ta)},[ta]:{transfer:Qe,primaries:yr,luminanceCoefficients:[.2289,.6917,.0793],toReference:i=>i.convertSRGBToLinear().applyMatrix3(Aa),fromReference:i=>i.applyMatrix3(Ta).convertLinearToSRGB()}},Al=new Set([Tn,Rr]),Je={enabled:!0,_workingColorSpace:Tn,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(i){if(!Al.has(i))throw new Error(`Unsupported working color space, "${i}".`);this._workingColorSpace=i},convert:function(i,e,t){if(this.enabled===!1||e===t||!e||!t)return i;const n=Si[e].toReference,r=Si[t].fromReference;return r(n(i))},fromWorkingColorSpace:function(i,e){return this.convert(i,this._workingColorSpace,e)},toWorkingColorSpace:function(i,e){return this.convert(i,e,this._workingColorSpace)},getPrimaries:function(i){return Si[i].primaries},getTransfer:function(i){return i===xn?Mr:Si[i].transfer},getLuminanceCoefficients:function(i,e=this._workingColorSpace){return i.fromArray(Si[e].luminanceCoefficients)}};function hi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function zr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Xn;class wl{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Xn===void 0&&(Xn=Ii("canvas")),Xn.width=e.width,Xn.height=e.height;const n=Xn.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Xn}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Ii("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=hi(s[a]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(hi(t[n]/255)*255):t[n]=hi(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Rl=0;class ko{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Rl++}),this.uuid=xi(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(kr(r[a].image)):s.push(kr(r[a]))}else s=kr(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function kr(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?wl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Cl=0;class mt extends vi{constructor(e=mt.DEFAULT_IMAGE,t=mt.DEFAULT_MAPPING,n=zn,r=zn,s=bt,a=kn,o=Bt,c=ln,l=mt.DEFAULT_ANISOTROPY,u=xn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Cl++}),this.uuid=xi(),this.name="",this.source=new ko(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new We(0,0),this.repeat=new We(1,1),this.center=new We(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ke,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==wo)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case gs:e.x=e.x-Math.floor(e.x);break;case zn:e.x=e.x<0?0:1;break;case _s:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case gs:e.y=e.y-Math.floor(e.y);break;case zn:e.y=e.y<0?0:1;break;case _s:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}mt.DEFAULT_IMAGE=null;mt.DEFAULT_MAPPING=wo;mt.DEFAULT_ANISOTROPY=1;class ht{constructor(e=0,t=0,n=0,r=1){ht.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const c=e.elements,l=c[0],u=c[4],h=c[8],p=c[1],f=c[5],_=c[9],v=c[2],m=c[6],d=c[10];if(Math.abs(u-p)<.01&&Math.abs(h-v)<.01&&Math.abs(_-m)<.01){if(Math.abs(u+p)<.1&&Math.abs(h+v)<.1&&Math.abs(_+m)<.1&&Math.abs(l+f+d-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const g=(l+1)/2,y=(f+1)/2,C=(d+1)/2,T=(u+p)/4,w=(h+v)/4,I=(_+m)/4;return g>y&&g>C?g<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(g),r=T/n,s=w/n):y>C?y<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(y),n=T/r,s=I/r):C<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(C),n=w/s,r=I/s),this.set(n,r,s,t),this}let b=Math.sqrt((m-_)*(m-_)+(h-v)*(h-v)+(p-u)*(p-u));return Math.abs(b)<.001&&(b=1),this.x=(m-_)/b,this.y=(h-v)/b,this.z=(p-u)/b,this.w=Math.acos((l+f+d-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Ll extends vi{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new ht(0,0,e,t),this.scissorTest=!1,this.viewport=new ht(0,0,e,t);const r={width:e,height:t,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:bt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const s=new mt(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);s.flipY=!1,s.generateMipmaps=n.generateMipmaps,s.internalFormat=n.internalFormat,this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,r=e.textures.length;n<r;n++)this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new ko(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class En extends Ll{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Ho extends mt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Pl extends mt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ni{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,a,o){let c=n[r+0],l=n[r+1],u=n[r+2],h=n[r+3];const p=s[a+0],f=s[a+1],_=s[a+2],v=s[a+3];if(o===0){e[t+0]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h;return}if(o===1){e[t+0]=p,e[t+1]=f,e[t+2]=_,e[t+3]=v;return}if(h!==v||c!==p||l!==f||u!==_){let m=1-o;const d=c*p+l*f+u*_+h*v,b=d>=0?1:-1,g=1-d*d;if(g>Number.EPSILON){const C=Math.sqrt(g),T=Math.atan2(C,d*b);m=Math.sin(m*T)/C,o=Math.sin(o*T)/C}const y=o*b;if(c=c*m+p*y,l=l*m+f*y,u=u*m+_*y,h=h*m+v*y,m===1-o){const C=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=C,l*=C,u*=C,h*=C}}e[t]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,r,s,a){const o=n[r],c=n[r+1],l=n[r+2],u=n[r+3],h=s[a],p=s[a+1],f=s[a+2],_=s[a+3];return e[t]=o*_+u*h+c*f-l*p,e[t+1]=c*_+u*p+l*h-o*f,e[t+2]=l*_+u*f+o*p-c*h,e[t+3]=u*_-o*h-c*p-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),u=o(r/2),h=o(s/2),p=c(n/2),f=c(r/2),_=c(s/2);switch(a){case"XYZ":this._x=p*u*h+l*f*_,this._y=l*f*h-p*u*_,this._z=l*u*_+p*f*h,this._w=l*u*h-p*f*_;break;case"YXZ":this._x=p*u*h+l*f*_,this._y=l*f*h-p*u*_,this._z=l*u*_-p*f*h,this._w=l*u*h+p*f*_;break;case"ZXY":this._x=p*u*h-l*f*_,this._y=l*f*h+p*u*_,this._z=l*u*_+p*f*h,this._w=l*u*h-p*f*_;break;case"ZYX":this._x=p*u*h-l*f*_,this._y=l*f*h+p*u*_,this._z=l*u*_-p*f*h,this._w=l*u*h+p*f*_;break;case"YZX":this._x=p*u*h+l*f*_,this._y=l*f*h+p*u*_,this._z=l*u*_-p*f*h,this._w=l*u*h-p*f*_;break;case"XZY":this._x=p*u*h-l*f*_,this._y=l*f*h-p*u*_,this._z=l*u*_+p*f*h,this._w=l*u*h+p*f*_;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],a=t[1],o=t[5],c=t[9],l=t[2],u=t[6],h=t[10],p=n+o+h;if(p>0){const f=.5/Math.sqrt(p+1);this._w=.25/f,this._x=(u-c)*f,this._y=(s-l)*f,this._z=(a-r)*f}else if(n>o&&n>h){const f=2*Math.sqrt(1+n-o-h);this._w=(u-c)/f,this._x=.25*f,this._y=(r+a)/f,this._z=(s+l)/f}else if(o>h){const f=2*Math.sqrt(1+o-n-h);this._w=(s-l)/f,this._x=(r+a)/f,this._y=.25*f,this._z=(c+u)/f}else{const f=2*Math.sqrt(1+h-n-o);this._w=(a-r)/f,this._x=(s+l)/f,this._y=(c+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Et(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,a=e._w,o=t._x,c=t._y,l=t._z,u=t._w;return this._x=n*u+a*o+r*l-s*c,this._y=r*u+a*c+s*o-n*l,this._z=s*u+a*l+n*c-r*o,this._w=a*u-n*o-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+n*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=r,this._z=s,this;const c=1-o*o;if(c<=Number.EPSILON){const f=1-t;return this._w=f*a+t*this._w,this._x=f*n+t*this._x,this._y=f*r+t*this._y,this._z=f*s+t*this._z,this.normalize(),this}const l=Math.sqrt(c),u=Math.atan2(l,o),h=Math.sin((1-t)*u)/l,p=Math.sin(t*u)/l;return this._w=a*h+this._w*p,this._x=n*h+this._x*p,this._y=r*h+this._y*p,this._z=s*h+this._z*p,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class O{constructor(e=0,t=0,n=0){O.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(wa.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(wa.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*r-o*n),u=2*(o*t-s*r),h=2*(s*n-a*t);return this.x=t+c*l+a*h-o*u,this.y=n+c*u+o*l-s*h,this.z=r+c*h+s*u-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,a=t.x,o=t.y,c=t.z;return this.x=r*c-s*o,this.y=s*a-n*c,this.z=n*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Hr.copy(this).projectOnVector(e),this.sub(Hr)}reflect(e){return this.sub(Hr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Et(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Hr=new O,wa=new Ni;class Fi{constructor(e=new O(1/0,1/0,1/0),t=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(kt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(kt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=kt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,kt):kt.fromBufferAttribute(s,a),kt.applyMatrix4(e.matrixWorld),this.expandByPoint(kt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Gi.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Gi.copy(n.boundingBox)),Gi.applyMatrix4(e.matrixWorld),this.union(Gi)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,kt),kt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(yi),Vi.subVectors(this.max,yi),qn.subVectors(e.a,yi),Yn.subVectors(e.b,yi),Kn.subVectors(e.c,yi),fn.subVectors(Yn,qn),pn.subVectors(Kn,Yn),wn.subVectors(qn,Kn);let t=[0,-fn.z,fn.y,0,-pn.z,pn.y,0,-wn.z,wn.y,fn.z,0,-fn.x,pn.z,0,-pn.x,wn.z,0,-wn.x,-fn.y,fn.x,0,-pn.y,pn.x,0,-wn.y,wn.x,0];return!Gr(t,qn,Yn,Kn,Vi)||(t=[1,0,0,0,1,0,0,0,1],!Gr(t,qn,Yn,Kn,Vi))?!1:(Wi.crossVectors(fn,pn),t=[Wi.x,Wi.y,Wi.z],Gr(t,qn,Yn,Kn,Vi))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,kt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(kt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Qt[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Qt[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Qt[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Qt[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Qt[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Qt[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Qt[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Qt[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Qt),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const Qt=[new O,new O,new O,new O,new O,new O,new O,new O],kt=new O,Gi=new Fi,qn=new O,Yn=new O,Kn=new O,fn=new O,pn=new O,wn=new O,yi=new O,Vi=new O,Wi=new O,Rn=new O;function Gr(i,e,t,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){Rn.fromArray(i,s);const o=r.x*Math.abs(Rn.x)+r.y*Math.abs(Rn.y)+r.z*Math.abs(Rn.z),c=e.dot(Rn),l=t.dot(Rn),u=n.dot(Rn);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>o)return!1}return!0}const Dl=new Fi,Ei=new O,Vr=new O;class Cr{constructor(e=new O,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Dl.setFromPoints(e).getCenter(n);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ei.subVectors(e,this.center);const t=Ei.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(Ei,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Vr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ei.copy(e.center).add(Vr)),this.expandByPoint(Ei.copy(e.center).sub(Vr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const en=new O,Wr=new O,Xi=new O,mn=new O,Xr=new O,qi=new O,qr=new O;class ia{constructor(e=new O,t=new O(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,en)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=en.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(en.copy(this.origin).addScaledVector(this.direction,t),en.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Wr.copy(e).add(t).multiplyScalar(.5),Xi.copy(t).sub(e).normalize(),mn.copy(this.origin).sub(Wr);const s=e.distanceTo(t)*.5,a=-this.direction.dot(Xi),o=mn.dot(this.direction),c=-mn.dot(Xi),l=mn.lengthSq(),u=Math.abs(1-a*a);let h,p,f,_;if(u>0)if(h=a*c-o,p=a*o-c,_=s*u,h>=0)if(p>=-_)if(p<=_){const v=1/u;h*=v,p*=v,f=h*(h+a*p+2*o)+p*(a*h+p+2*c)+l}else p=s,h=Math.max(0,-(a*p+o)),f=-h*h+p*(p+2*c)+l;else p=-s,h=Math.max(0,-(a*p+o)),f=-h*h+p*(p+2*c)+l;else p<=-_?(h=Math.max(0,-(-a*s+o)),p=h>0?-s:Math.min(Math.max(-s,-c),s),f=-h*h+p*(p+2*c)+l):p<=_?(h=0,p=Math.min(Math.max(-s,-c),s),f=p*(p+2*c)+l):(h=Math.max(0,-(a*s+o)),p=h>0?s:Math.min(Math.max(-s,-c),s),f=-h*h+p*(p+2*c)+l);else p=a>0?-s:s,h=Math.max(0,-(a*p+o)),f=-h*h+p*(p+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(Wr).addScaledVector(Xi,p),f}intersectSphere(e,t){en.subVectors(e.center,this.origin);const n=en.dot(this.direction),r=en.dot(en)-n*n,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,a,o,c;const l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,p=this.origin;return l>=0?(n=(e.min.x-p.x)*l,r=(e.max.x-p.x)*l):(n=(e.max.x-p.x)*l,r=(e.min.x-p.x)*l),u>=0?(s=(e.min.y-p.y)*u,a=(e.max.y-p.y)*u):(s=(e.max.y-p.y)*u,a=(e.min.y-p.y)*u),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),h>=0?(o=(e.min.z-p.z)*h,c=(e.max.z-p.z)*h):(o=(e.max.z-p.z)*h,c=(e.min.z-p.z)*h),n>c||o>r)||((o>n||n!==n)&&(n=o),(c<r||r!==r)&&(r=c),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,en)!==null}intersectTriangle(e,t,n,r,s){Xr.subVectors(t,e),qi.subVectors(n,e),qr.crossVectors(Xr,qi);let a=this.direction.dot(qr),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;mn.subVectors(this.origin,e);const c=o*this.direction.dot(qi.crossVectors(mn,qi));if(c<0)return null;const l=o*this.direction.dot(Xr.cross(mn));if(l<0||c+l>a)return null;const u=-o*mn.dot(qr);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class it{constructor(e,t,n,r,s,a,o,c,l,u,h,p,f,_,v,m){it.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l,u,h,p,f,_,v,m)}set(e,t,n,r,s,a,o,c,l,u,h,p,f,_,v,m){const d=this.elements;return d[0]=e,d[4]=t,d[8]=n,d[12]=r,d[1]=s,d[5]=a,d[9]=o,d[13]=c,d[2]=l,d[6]=u,d[10]=h,d[14]=p,d[3]=f,d[7]=_,d[11]=v,d[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new it().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,r=1/jn.setFromMatrixColumn(e,0).length(),s=1/jn.setFromMatrixColumn(e,1).length(),a=1/jn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){const p=a*u,f=a*h,_=o*u,v=o*h;t[0]=c*u,t[4]=-c*h,t[8]=l,t[1]=f+_*l,t[5]=p-v*l,t[9]=-o*c,t[2]=v-p*l,t[6]=_+f*l,t[10]=a*c}else if(e.order==="YXZ"){const p=c*u,f=c*h,_=l*u,v=l*h;t[0]=p+v*o,t[4]=_*o-f,t[8]=a*l,t[1]=a*h,t[5]=a*u,t[9]=-o,t[2]=f*o-_,t[6]=v+p*o,t[10]=a*c}else if(e.order==="ZXY"){const p=c*u,f=c*h,_=l*u,v=l*h;t[0]=p-v*o,t[4]=-a*h,t[8]=_+f*o,t[1]=f+_*o,t[5]=a*u,t[9]=v-p*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){const p=a*u,f=a*h,_=o*u,v=o*h;t[0]=c*u,t[4]=_*l-f,t[8]=p*l+v,t[1]=c*h,t[5]=v*l+p,t[9]=f*l-_,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){const p=a*c,f=a*l,_=o*c,v=o*l;t[0]=c*u,t[4]=v-p*h,t[8]=_*h+f,t[1]=h,t[5]=a*u,t[9]=-o*u,t[2]=-l*u,t[6]=f*h+_,t[10]=p-v*h}else if(e.order==="XZY"){const p=a*c,f=a*l,_=o*c,v=o*l;t[0]=c*u,t[4]=-h,t[8]=l*u,t[1]=p*h+v,t[5]=a*u,t[9]=f*h-_,t[2]=_*h-f,t[6]=o*u,t[10]=v*h+p}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Il,e,Ul)}lookAt(e,t,n){const r=this.elements;return Lt.subVectors(e,t),Lt.lengthSq()===0&&(Lt.z=1),Lt.normalize(),gn.crossVectors(n,Lt),gn.lengthSq()===0&&(Math.abs(n.z)===1?Lt.x+=1e-4:Lt.z+=1e-4,Lt.normalize(),gn.crossVectors(n,Lt)),gn.normalize(),Yi.crossVectors(Lt,gn),r[0]=gn.x,r[4]=Yi.x,r[8]=Lt.x,r[1]=gn.y,r[5]=Yi.y,r[9]=Lt.y,r[2]=gn.z,r[6]=Yi.z,r[10]=Lt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],u=n[1],h=n[5],p=n[9],f=n[13],_=n[2],v=n[6],m=n[10],d=n[14],b=n[3],g=n[7],y=n[11],C=n[15],T=r[0],w=r[4],I=r[8],E=r[12],S=r[1],L=r[5],q=r[9],G=r[13],Y=r[2],ee=r[6],X=r[10],ne=r[14],W=r[3],me=r[7],ve=r[11],be=r[15];return s[0]=a*T+o*S+c*Y+l*W,s[4]=a*w+o*L+c*ee+l*me,s[8]=a*I+o*q+c*X+l*ve,s[12]=a*E+o*G+c*ne+l*be,s[1]=u*T+h*S+p*Y+f*W,s[5]=u*w+h*L+p*ee+f*me,s[9]=u*I+h*q+p*X+f*ve,s[13]=u*E+h*G+p*ne+f*be,s[2]=_*T+v*S+m*Y+d*W,s[6]=_*w+v*L+m*ee+d*me,s[10]=_*I+v*q+m*X+d*ve,s[14]=_*E+v*G+m*ne+d*be,s[3]=b*T+g*S+y*Y+C*W,s[7]=b*w+g*L+y*ee+C*me,s[11]=b*I+g*q+y*X+C*ve,s[15]=b*E+g*G+y*ne+C*be,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],a=e[1],o=e[5],c=e[9],l=e[13],u=e[2],h=e[6],p=e[10],f=e[14],_=e[3],v=e[7],m=e[11],d=e[15];return _*(+s*c*h-r*l*h-s*o*p+n*l*p+r*o*f-n*c*f)+v*(+t*c*f-t*l*p+s*a*p-r*a*f+r*l*u-s*c*u)+m*(+t*l*h-t*o*f-s*a*h+n*a*f+s*o*u-n*l*u)+d*(-r*o*u-t*c*h+t*o*p+r*a*h-n*a*p+n*c*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],h=e[9],p=e[10],f=e[11],_=e[12],v=e[13],m=e[14],d=e[15],b=h*m*l-v*p*l+v*c*f-o*m*f-h*c*d+o*p*d,g=_*p*l-u*m*l-_*c*f+a*m*f+u*c*d-a*p*d,y=u*v*l-_*h*l+_*o*f-a*v*f-u*o*d+a*h*d,C=_*h*c-u*v*c-_*o*p+a*v*p+u*o*m-a*h*m,T=t*b+n*g+r*y+s*C;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const w=1/T;return e[0]=b*w,e[1]=(v*p*s-h*m*s-v*r*f+n*m*f+h*r*d-n*p*d)*w,e[2]=(o*m*s-v*c*s+v*r*l-n*m*l-o*r*d+n*c*d)*w,e[3]=(h*c*s-o*p*s-h*r*l+n*p*l+o*r*f-n*c*f)*w,e[4]=g*w,e[5]=(u*m*s-_*p*s+_*r*f-t*m*f-u*r*d+t*p*d)*w,e[6]=(_*c*s-a*m*s-_*r*l+t*m*l+a*r*d-t*c*d)*w,e[7]=(a*p*s-u*c*s+u*r*l-t*p*l-a*r*f+t*c*f)*w,e[8]=y*w,e[9]=(_*h*s-u*v*s-_*n*f+t*v*f+u*n*d-t*h*d)*w,e[10]=(a*v*s-_*o*s+_*n*l-t*v*l-a*n*d+t*o*d)*w,e[11]=(u*o*s-a*h*s-u*n*l+t*h*l+a*n*f-t*o*f)*w,e[12]=C*w,e[13]=(u*v*r-_*h*r+_*n*p-t*v*p-u*n*m+t*h*m)*w,e[14]=(_*o*r-a*v*r-_*n*c+t*v*c+a*n*m-t*o*m)*w,e[15]=(a*h*r-u*o*r+u*n*c-t*h*c-a*n*p+t*o*p)*w,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,a=e.x,o=e.y,c=e.z,l=s*a,u=s*o;return this.set(l*a+n,l*o-r*c,l*c+r*o,0,l*o+r*c,u*o+n,u*c-r*a,0,l*c-r*o,u*c+r*a,s*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,a){return this.set(1,n,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,a=t._y,o=t._z,c=t._w,l=s+s,u=a+a,h=o+o,p=s*l,f=s*u,_=s*h,v=a*u,m=a*h,d=o*h,b=c*l,g=c*u,y=c*h,C=n.x,T=n.y,w=n.z;return r[0]=(1-(v+d))*C,r[1]=(f+y)*C,r[2]=(_-g)*C,r[3]=0,r[4]=(f-y)*T,r[5]=(1-(p+d))*T,r[6]=(m+b)*T,r[7]=0,r[8]=(_+g)*w,r[9]=(m-b)*w,r[10]=(1-(p+v))*w,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;let s=jn.set(r[0],r[1],r[2]).length();const a=jn.set(r[4],r[5],r[6]).length(),o=jn.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Ht.copy(this);const l=1/s,u=1/a,h=1/o;return Ht.elements[0]*=l,Ht.elements[1]*=l,Ht.elements[2]*=l,Ht.elements[4]*=u,Ht.elements[5]*=u,Ht.elements[6]*=u,Ht.elements[8]*=h,Ht.elements[9]*=h,Ht.elements[10]*=h,t.setFromRotationMatrix(Ht),n.x=s,n.y=a,n.z=o,this}makePerspective(e,t,n,r,s,a,o=on){const c=this.elements,l=2*s/(t-e),u=2*s/(n-r),h=(t+e)/(t-e),p=(n+r)/(n-r);let f,_;if(o===on)f=-(a+s)/(a-s),_=-2*a*s/(a-s);else if(o===Er)f=-a/(a-s),_=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=l,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=u,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,s,a,o=on){const c=this.elements,l=1/(t-e),u=1/(n-r),h=1/(a-s),p=(t+e)*l,f=(n+r)*u;let _,v;if(o===on)_=(a+s)*h,v=-2*h;else if(o===Er)_=s*h,v=-1*h;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-p,c[1]=0,c[5]=2*u,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=v,c[14]=-_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const jn=new O,Ht=new it,Il=new O(0,0,0),Ul=new O(1,1,1),gn=new O,Yi=new O,Lt=new O,Ra=new it,Ca=new Ni;class un{constructor(e=0,t=0,n=0,r=un.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],c=r[1],l=r[5],u=r[9],h=r[2],p=r[6],f=r[10];switch(t){case"XYZ":this._y=Math.asin(Et(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(p,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Et(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(Et(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Et(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(p,f),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Et(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Et(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(p,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Ra.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ra,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ca.setFromEuler(this),this.setFromQuaternion(Ca,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}un.DEFAULT_ORDER="XYZ";class ra{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Nl=0;const La=new O,$n=new Ni,tn=new it,Ki=new O,bi=new O,Fl=new O,Ol=new Ni,Pa=new O(1,0,0),Da=new O(0,1,0),Ia=new O(0,0,1),Ua={type:"added"},Bl={type:"removed"},Zn={type:"childadded",child:null},Yr={type:"childremoved",child:null};class wt extends vi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Nl++}),this.uuid=xi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=wt.DEFAULT_UP.clone();const e=new O,t=new un,n=new Ni,r=new O(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new it},normalMatrix:{value:new ke}}),this.matrix=new it,this.matrixWorld=new it,this.matrixAutoUpdate=wt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ra,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return $n.setFromAxisAngle(e,t),this.quaternion.multiply($n),this}rotateOnWorldAxis(e,t){return $n.setFromAxisAngle(e,t),this.quaternion.premultiply($n),this}rotateX(e){return this.rotateOnAxis(Pa,e)}rotateY(e){return this.rotateOnAxis(Da,e)}rotateZ(e){return this.rotateOnAxis(Ia,e)}translateOnAxis(e,t){return La.copy(e).applyQuaternion(this.quaternion),this.position.add(La.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Pa,e)}translateY(e){return this.translateOnAxis(Da,e)}translateZ(e){return this.translateOnAxis(Ia,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(tn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Ki.copy(e):Ki.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),bi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?tn.lookAt(bi,Ki,this.up):tn.lookAt(Ki,bi,this.up),this.quaternion.setFromRotationMatrix(tn),r&&(tn.extractRotation(r.matrixWorld),$n.setFromRotationMatrix(tn),this.quaternion.premultiply($n.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ua),Zn.child=e,this.dispatchEvent(Zn),Zn.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Bl),Yr.child=e,this.dispatchEvent(Yr),Yr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),tn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),tn.multiply(e.parent.matrixWorld)),e.applyMatrix4(tn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ua),Zn.child=e,this.dispatchEvent(Zn),Zn.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(bi,e,Fl),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(bi,Ol,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){const h=c[l];s(e.shapes,h)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(e.materials,this.material[c]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];r.animations.push(s(e.animations,c))}}if(t){const o=a(e.geometries),c=a(e.materials),l=a(e.textures),u=a(e.images),h=a(e.shapes),p=a(e.skeletons),f=a(e.animations),_=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),p.length>0&&(n.skeletons=p),f.length>0&&(n.animations=f),_.length>0&&(n.nodes=_)}return n.object=r,n;function a(o){const c=[];for(const l in o){const u=o[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}wt.DEFAULT_UP=new O(0,1,0);wt.DEFAULT_MATRIX_AUTO_UPDATE=!0;wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Gt=new O,nn=new O,Kr=new O,rn=new O,Jn=new O,Qn=new O,Na=new O,jr=new O,$r=new O,Zr=new O;class jt{constructor(e=new O,t=new O,n=new O){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Gt.subVectors(e,t),r.cross(Gt);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){Gt.subVectors(r,t),nn.subVectors(n,t),Kr.subVectors(e,t);const a=Gt.dot(Gt),o=Gt.dot(nn),c=Gt.dot(Kr),l=nn.dot(nn),u=nn.dot(Kr),h=a*l-o*o;if(h===0)return s.set(0,0,0),null;const p=1/h,f=(l*c-o*u)*p,_=(a*u-o*c)*p;return s.set(1-f-_,_,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,rn)===null?!1:rn.x>=0&&rn.y>=0&&rn.x+rn.y<=1}static getInterpolation(e,t,n,r,s,a,o,c){return this.getBarycoord(e,t,n,r,rn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,rn.x),c.addScaledVector(a,rn.y),c.addScaledVector(o,rn.z),c)}static isFrontFacing(e,t,n,r){return Gt.subVectors(n,t),nn.subVectors(e,t),Gt.cross(nn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Gt.subVectors(this.c,this.b),nn.subVectors(this.a,this.b),Gt.cross(nn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return jt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return jt.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return jt.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return jt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return jt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let a,o;Jn.subVectors(r,n),Qn.subVectors(s,n),jr.subVectors(e,n);const c=Jn.dot(jr),l=Qn.dot(jr);if(c<=0&&l<=0)return t.copy(n);$r.subVectors(e,r);const u=Jn.dot($r),h=Qn.dot($r);if(u>=0&&h<=u)return t.copy(r);const p=c*h-u*l;if(p<=0&&c>=0&&u<=0)return a=c/(c-u),t.copy(n).addScaledVector(Jn,a);Zr.subVectors(e,s);const f=Jn.dot(Zr),_=Qn.dot(Zr);if(_>=0&&f<=_)return t.copy(s);const v=f*l-c*_;if(v<=0&&l>=0&&_<=0)return o=l/(l-_),t.copy(n).addScaledVector(Qn,o);const m=u*_-f*h;if(m<=0&&h-u>=0&&f-_>=0)return Na.subVectors(s,r),o=(h-u)/(h-u+(f-_)),t.copy(r).addScaledVector(Na,o);const d=1/(m+v+p);return a=v*d,o=p*d,t.copy(n).addScaledVector(Jn,a).addScaledVector(Qn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Go={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},_n={h:0,s:0,l:0},ji={h:0,s:0,l:0};function Jr(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Ve{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Yt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Je.toWorkingColorSpace(this,t),this}setRGB(e,t,n,r=Je.workingColorSpace){return this.r=e,this.g=t,this.b=n,Je.toWorkingColorSpace(this,r),this}setHSL(e,t,n,r=Je.workingColorSpace){if(e=na(e,1),t=Et(t,0,1),n=Et(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=Jr(a,s,e+1/3),this.g=Jr(a,s,e),this.b=Jr(a,s,e-1/3)}return Je.toWorkingColorSpace(this,r),this}setStyle(e,t=Yt){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Yt){const n=Go[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=hi(e.r),this.g=hi(e.g),this.b=hi(e.b),this}copyLinearToSRGB(e){return this.r=zr(e.r),this.g=zr(e.g),this.b=zr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Yt){return Je.fromWorkingColorSpace(_t.copy(this),e),Math.round(Et(_t.r*255,0,255))*65536+Math.round(Et(_t.g*255,0,255))*256+Math.round(Et(_t.b*255,0,255))}getHexString(e=Yt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Je.workingColorSpace){Je.fromWorkingColorSpace(_t.copy(this),t);const n=_t.r,r=_t.g,s=_t.b,a=Math.max(n,r,s),o=Math.min(n,r,s);let c,l;const u=(o+a)/2;if(o===a)c=0,l=0;else{const h=a-o;switch(l=u<=.5?h/(a+o):h/(2-a-o),a){case n:c=(r-s)/h+(r<s?6:0);break;case r:c=(s-n)/h+2;break;case s:c=(n-r)/h+4;break}c/=6}return e.h=c,e.s=l,e.l=u,e}getRGB(e,t=Je.workingColorSpace){return Je.fromWorkingColorSpace(_t.copy(this),t),e.r=_t.r,e.g=_t.g,e.b=_t.b,e}getStyle(e=Yt){Je.fromWorkingColorSpace(_t.copy(this),e);const t=_t.r,n=_t.g,r=_t.b;return e!==Yt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(_n),this.setHSL(_n.h+e,_n.s+t,_n.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(_n),e.getHSL(ji);const n=Ci(_n.h,ji.h,t),r=Ci(_n.s,ji.s,t),s=Ci(_n.l,ji.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const _t=new Ve;Ve.NAMES=Go;let zl=0;class bn extends vi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:zl++}),this.uuid=xi(),this.name="",this.type="Material",this.blending=li,this.side=yn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ds,this.blendDst=fs,this.blendEquation=Nn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ve(0,0,0),this.blendAlpha=0,this.depthFunc=xr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ma,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Wn,this.stencilZFail=Wn,this.stencilZPass=Wn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==li&&(n.blending=this.blending),this.side!==yn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==ds&&(n.blendSrc=this.blendSrc),this.blendDst!==fs&&(n.blendDst=this.blendDst),this.blendEquation!==Nn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==xr&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ma&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Wn&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Wn&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Wn&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const a=[];for(const o in s){const c=s[o];delete c.metadata,a.push(c)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class Xt extends bn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ve(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new un,this.combine=Ao,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const at=new O,$i=new We;class $t{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Sa,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=an,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return Li("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)$i.fromBufferAttribute(this,t),$i.applyMatrix3(e),this.setXY(t,$i.x,$i.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.applyMatrix3(e),this.setXYZ(t,at.x,at.y,at.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.applyMatrix4(e),this.setXYZ(t,at.x,at.y,at.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.applyNormalMatrix(e),this.setXYZ(t,at.x,at.y,at.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.transformDirection(e),this.setXYZ(t,at.x,at.y,at.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=oi(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Mt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=oi(t,this.array)),t}setX(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=oi(t,this.array)),t}setY(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=oi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=oi(t,this.array)),t}setW(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array),r=Mt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array),r=Mt(r,this.array),s=Mt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Sa&&(e.usage=this.usage),e}}class Vo extends $t{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Wo extends $t{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Tt extends $t{constructor(e,t,n){super(new Float32Array(e),t,n)}}let kl=0;const Ft=new it,Qr=new wt,ei=new O,Pt=new Fi,Ti=new Fi,ut=new O;class Ut extends vi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:kl++}),this.uuid=xi(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(zo(e)?Wo:Vo)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new ke().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Ft.makeRotationFromQuaternion(e),this.applyMatrix4(Ft),this}rotateX(e){return Ft.makeRotationX(e),this.applyMatrix4(Ft),this}rotateY(e){return Ft.makeRotationY(e),this.applyMatrix4(Ft),this}rotateZ(e){return Ft.makeRotationZ(e),this.applyMatrix4(Ft),this}translate(e,t,n){return Ft.makeTranslation(e,t,n),this.applyMatrix4(Ft),this}scale(e,t,n){return Ft.makeScale(e,t,n),this.applyMatrix4(Ft),this}lookAt(e){return Qr.lookAt(e),Qr.updateMatrix(),this.applyMatrix4(Qr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ei).negate(),this.translate(ei.x,ei.y,ei.z),this}setFromPoints(e){const t=[];for(let n=0,r=e.length;n<r;n++){const s=e[n];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new Tt(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Fi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];Pt.setFromBufferAttribute(s),this.morphTargetsRelative?(ut.addVectors(this.boundingBox.min,Pt.min),this.boundingBox.expandByPoint(ut),ut.addVectors(this.boundingBox.max,Pt.max),this.boundingBox.expandByPoint(ut)):(this.boundingBox.expandByPoint(Pt.min),this.boundingBox.expandByPoint(Pt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Cr);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(e){const n=this.boundingSphere.center;if(Pt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];Ti.setFromBufferAttribute(o),this.morphTargetsRelative?(ut.addVectors(Pt.min,Ti.min),Pt.expandByPoint(ut),ut.addVectors(Pt.max,Ti.max),Pt.expandByPoint(ut)):(Pt.expandByPoint(Ti.min),Pt.expandByPoint(Ti.max))}Pt.getCenter(n);let r=0;for(let s=0,a=e.count;s<a;s++)ut.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(ut));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],c=this.morphTargetsRelative;for(let l=0,u=o.count;l<u;l++)ut.fromBufferAttribute(o,l),c&&(ei.fromBufferAttribute(e,l),ut.add(ei)),r=Math.max(r,n.distanceToSquared(ut))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new $t(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],c=[];for(let I=0;I<n.count;I++)o[I]=new O,c[I]=new O;const l=new O,u=new O,h=new O,p=new We,f=new We,_=new We,v=new O,m=new O;function d(I,E,S){l.fromBufferAttribute(n,I),u.fromBufferAttribute(n,E),h.fromBufferAttribute(n,S),p.fromBufferAttribute(s,I),f.fromBufferAttribute(s,E),_.fromBufferAttribute(s,S),u.sub(l),h.sub(l),f.sub(p),_.sub(p);const L=1/(f.x*_.y-_.x*f.y);isFinite(L)&&(v.copy(u).multiplyScalar(_.y).addScaledVector(h,-f.y).multiplyScalar(L),m.copy(h).multiplyScalar(f.x).addScaledVector(u,-_.x).multiplyScalar(L),o[I].add(v),o[E].add(v),o[S].add(v),c[I].add(m),c[E].add(m),c[S].add(m))}let b=this.groups;b.length===0&&(b=[{start:0,count:e.count}]);for(let I=0,E=b.length;I<E;++I){const S=b[I],L=S.start,q=S.count;for(let G=L,Y=L+q;G<Y;G+=3)d(e.getX(G+0),e.getX(G+1),e.getX(G+2))}const g=new O,y=new O,C=new O,T=new O;function w(I){C.fromBufferAttribute(r,I),T.copy(C);const E=o[I];g.copy(E),g.sub(C.multiplyScalar(C.dot(E))).normalize(),y.crossVectors(T,E);const L=y.dot(c[I])<0?-1:1;a.setXYZW(I,g.x,g.y,g.z,L)}for(let I=0,E=b.length;I<E;++I){const S=b[I],L=S.start,q=S.count;for(let G=L,Y=L+q;G<Y;G+=3)w(e.getX(G+0)),w(e.getX(G+1)),w(e.getX(G+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new $t(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let p=0,f=n.count;p<f;p++)n.setXYZ(p,0,0,0);const r=new O,s=new O,a=new O,o=new O,c=new O,l=new O,u=new O,h=new O;if(e)for(let p=0,f=e.count;p<f;p+=3){const _=e.getX(p+0),v=e.getX(p+1),m=e.getX(p+2);r.fromBufferAttribute(t,_),s.fromBufferAttribute(t,v),a.fromBufferAttribute(t,m),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),o.fromBufferAttribute(n,_),c.fromBufferAttribute(n,v),l.fromBufferAttribute(n,m),o.add(u),c.add(u),l.add(u),n.setXYZ(_,o.x,o.y,o.z),n.setXYZ(v,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let p=0,f=t.count;p<f;p+=3)r.fromBufferAttribute(t,p+0),s.fromBufferAttribute(t,p+1),a.fromBufferAttribute(t,p+2),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),n.setXYZ(p+0,u.x,u.y,u.z),n.setXYZ(p+1,u.x,u.y,u.z),n.setXYZ(p+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)ut.fromBufferAttribute(e,t),ut.normalize(),e.setXYZ(t,ut.x,ut.y,ut.z)}toNonIndexed(){function e(o,c){const l=o.array,u=o.itemSize,h=o.normalized,p=new l.constructor(c.length*u);let f=0,_=0;for(let v=0,m=c.length;v<m;v++){o.isInterleavedBufferAttribute?f=c[v]*o.data.stride+o.offset:f=c[v]*u;for(let d=0;d<u;d++)p[_++]=l[f++]}return new $t(p,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ut,n=this.index.array,r=this.attributes;for(const o in r){const c=r[o],l=e(c,n);t.setAttribute(o,l)}const s=this.morphAttributes;for(const o in s){const c=[],l=s[o];for(let u=0,h=l.length;u<h;u++){const p=l[u],f=e(p,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const r={};let s=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],u=[];for(let h=0,p=l.length;h<p;h++){const f=l[h];u.push(f.toJSON(e.data))}u.length>0&&(r[c]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone(t));const r=e.attributes;for(const l in r){const u=r[l];this.setAttribute(l,u.clone(t))}const s=e.morphAttributes;for(const l in s){const u=[],h=s[l];for(let p=0,f=h.length;p<f;p++)u.push(h[p].clone(t));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let l=0,u=a.length;l<u;l++){const h=a[l];this.addGroup(h.start,h.count,h.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Fa=new it,Cn=new ia,Zi=new Cr,Oa=new O,ti=new O,ni=new O,ii=new O,es=new O,Ji=new O,Qi=new We,er=new We,tr=new We,Ba=new O,za=new O,ka=new O,nr=new O,ir=new O;class dt extends wt{constructor(e=new Ut,t=new Xt){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){Ji.set(0,0,0);for(let c=0,l=s.length;c<l;c++){const u=o[c],h=s[c];u!==0&&(es.fromBufferAttribute(h,e),a?Ji.addScaledVector(es,u):Ji.addScaledVector(es.sub(t),u))}t.add(Ji)}return t}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Zi.copy(n.boundingSphere),Zi.applyMatrix4(s),Cn.copy(e.ray).recast(e.near),!(Zi.containsPoint(Cn.origin)===!1&&(Cn.intersectSphere(Zi,Oa)===null||Cn.origin.distanceToSquared(Oa)>(e.far-e.near)**2))&&(Fa.copy(s).invert(),Cn.copy(e.ray).applyMatrix4(Fa),!(n.boundingBox!==null&&Cn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Cn)))}_computeIntersections(e,t,n){let r;const s=this.geometry,a=this.material,o=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,p=s.groups,f=s.drawRange;if(o!==null)if(Array.isArray(a))for(let _=0,v=p.length;_<v;_++){const m=p[_],d=a[m.materialIndex],b=Math.max(m.start,f.start),g=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let y=b,C=g;y<C;y+=3){const T=o.getX(y),w=o.getX(y+1),I=o.getX(y+2);r=rr(this,d,e,n,l,u,h,T,w,I),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const _=Math.max(0,f.start),v=Math.min(o.count,f.start+f.count);for(let m=_,d=v;m<d;m+=3){const b=o.getX(m),g=o.getX(m+1),y=o.getX(m+2);r=rr(this,a,e,n,l,u,h,b,g,y),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(a))for(let _=0,v=p.length;_<v;_++){const m=p[_],d=a[m.materialIndex],b=Math.max(m.start,f.start),g=Math.min(c.count,Math.min(m.start+m.count,f.start+f.count));for(let y=b,C=g;y<C;y+=3){const T=y,w=y+1,I=y+2;r=rr(this,d,e,n,l,u,h,T,w,I),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const _=Math.max(0,f.start),v=Math.min(c.count,f.start+f.count);for(let m=_,d=v;m<d;m+=3){const b=m,g=m+1,y=m+2;r=rr(this,a,e,n,l,u,h,b,g,y),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function Hl(i,e,t,n,r,s,a,o){let c;if(e.side===At?c=n.intersectTriangle(a,s,r,!0,o):c=n.intersectTriangle(r,s,a,e.side===yn,o),c===null)return null;ir.copy(o),ir.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(ir);return l<t.near||l>t.far?null:{distance:l,point:ir.clone(),object:i}}function rr(i,e,t,n,r,s,a,o,c,l){i.getVertexPosition(o,ti),i.getVertexPosition(c,ni),i.getVertexPosition(l,ii);const u=Hl(i,e,t,n,ti,ni,ii,nr);if(u){r&&(Qi.fromBufferAttribute(r,o),er.fromBufferAttribute(r,c),tr.fromBufferAttribute(r,l),u.uv=jt.getInterpolation(nr,ti,ni,ii,Qi,er,tr,new We)),s&&(Qi.fromBufferAttribute(s,o),er.fromBufferAttribute(s,c),tr.fromBufferAttribute(s,l),u.uv1=jt.getInterpolation(nr,ti,ni,ii,Qi,er,tr,new We)),a&&(Ba.fromBufferAttribute(a,o),za.fromBufferAttribute(a,c),ka.fromBufferAttribute(a,l),u.normal=jt.getInterpolation(nr,ti,ni,ii,Ba,za,ka,new O),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const h={a:o,b:c,c:l,normal:new O,materialIndex:0};jt.getNormal(ti,ni,ii,h.normal),u.face=h}return u}class Oi extends Ut{constructor(e=1,t=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const c=[],l=[],u=[],h=[];let p=0,f=0;_("z","y","x",-1,-1,n,t,e,a,s,0),_("z","y","x",1,-1,n,t,-e,a,s,1),_("x","z","y",1,1,e,n,t,r,a,2),_("x","z","y",1,-1,e,n,-t,r,a,3),_("x","y","z",1,-1,e,t,n,r,s,4),_("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(c),this.setAttribute("position",new Tt(l,3)),this.setAttribute("normal",new Tt(u,3)),this.setAttribute("uv",new Tt(h,2));function _(v,m,d,b,g,y,C,T,w,I,E){const S=y/w,L=C/I,q=y/2,G=C/2,Y=T/2,ee=w+1,X=I+1;let ne=0,W=0;const me=new O;for(let ve=0;ve<X;ve++){const be=ve*L-G;for(let Ge=0;Ge<ee;Ge++){const Ye=Ge*S-q;me[v]=Ye*b,me[m]=be*g,me[d]=Y,l.push(me.x,me.y,me.z),me[v]=0,me[m]=0,me[d]=T>0?1:-1,u.push(me.x,me.y,me.z),h.push(Ge/w),h.push(1-ve/I),ne+=1}}for(let ve=0;ve<I;ve++)for(let be=0;be<w;be++){const Ge=p+be+ee*ve,Ye=p+be+ee*(ve+1),K=p+(be+1)+ee*(ve+1),te=p+(be+1)+ee*ve;c.push(Ge,Ye,te),c.push(Ye,K,te),W+=6}o.addGroup(f,W,E),f+=W,p+=ne}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Oi(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function gi(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function St(i){const e={};for(let t=0;t<i.length;t++){const n=gi(i[t]);for(const r in n)e[r]=n[r]}return e}function Gl(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Xo(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Je.workingColorSpace}const Vl={clone:gi,merge:St};var Wl=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Xl=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class hn extends bn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Wl,this.fragmentShader=Xl,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=gi(e.uniforms),this.uniformsGroups=Gl(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class qo extends wt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new it,this.projectionMatrix=new it,this.projectionMatrixInverse=new it,this.coordinateSystem=on}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const vn=new O,Ha=new We,Ga=new We;class Wt extends qo{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Di*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Ri*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Di*2*Math.atan(Math.tan(Ri*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){vn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(vn.x,vn.y).multiplyScalar(-e/vn.z),vn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(vn.x,vn.y).multiplyScalar(-e/vn.z)}getViewSize(e,t){return this.getViewBounds(e,Ha,Ga),t.subVectors(Ga,Ha)}setViewOffset(e,t,n,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Ri*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/c,t-=a.offsetY*n/l,r*=a.width/c,n*=a.height/l}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ri=-90,si=1;class ql extends wt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Wt(ri,si,e,t);r.layers=this.layers,this.add(r);const s=new Wt(ri,si,e,t);s.layers=this.layers,this.add(s);const a=new Wt(ri,si,e,t);a.layers=this.layers,this.add(a);const o=new Wt(ri,si,e,t);o.layers=this.layers,this.add(o);const c=new Wt(ri,si,e,t);c.layers=this.layers,this.add(c);const l=new Wt(ri,si,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,a,o,c]=t;for(const l of t)this.remove(l);if(e===on)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Er)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,c,l,u]=this.children,h=e.getRenderTarget(),p=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),_=e.xr.enabled;e.xr.enabled=!1;const v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,s),e.setRenderTarget(n,1,r),e.render(t,a),e.setRenderTarget(n,2,r),e.render(t,o),e.setRenderTarget(n,3,r),e.render(t,c),e.setRenderTarget(n,4,r),e.render(t,l),n.texture.generateMipmaps=v,e.setRenderTarget(n,5,r),e.render(t,u),e.setRenderTarget(h,p,f),e.xr.enabled=_,n.texture.needsPMREMUpdate=!0}}class Yo extends mt{constructor(e,t,n,r,s,a,o,c,l,u){e=e!==void 0?e:[],t=t!==void 0?t:di,super(e,t,n,r,s,a,o,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Yl extends En{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Yo(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:bt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Oi(5,5,5),s=new hn({name:"CubemapFromEquirect",uniforms:gi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:At,blending:Mn});s.uniforms.tEquirect.value=t;const a=new dt(r,s),o=t.minFilter;return t.minFilter===kn&&(t.minFilter=bt),new ql(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,r){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(s)}}const ts=new O,Kl=new O,jl=new ke;class In{constructor(e=new O(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=ts.subVectors(n,t).cross(Kl.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(ts),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||jl.getNormalMatrix(e),r=this.coplanarPoint(ts).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ln=new Cr,sr=new O;class Ko{constructor(e=new In,t=new In,n=new In,r=new In,s=new In,a=new In){this.planes=[e,t,n,r,s,a]}set(e,t,n,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=on){const n=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],c=r[3],l=r[4],u=r[5],h=r[6],p=r[7],f=r[8],_=r[9],v=r[10],m=r[11],d=r[12],b=r[13],g=r[14],y=r[15];if(n[0].setComponents(c-s,p-l,m-f,y-d).normalize(),n[1].setComponents(c+s,p+l,m+f,y+d).normalize(),n[2].setComponents(c+a,p+u,m+_,y+b).normalize(),n[3].setComponents(c-a,p-u,m-_,y-b).normalize(),n[4].setComponents(c-o,p-h,m-v,y-g).normalize(),t===on)n[5].setComponents(c+o,p+h,m+v,y+g).normalize();else if(t===Er)n[5].setComponents(o,h,v,g).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ln.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ln.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ln)}intersectsSprite(e){return Ln.center.set(0,0,0),Ln.radius=.7071067811865476,Ln.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ln)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(sr.x=r.normal.x>0?e.max.x:e.min.x,sr.y=r.normal.y>0?e.max.y:e.min.y,sr.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(sr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function jo(){let i=null,e=!1,t=null,n=null;function r(s,a){t(s,a),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function $l(i){const e=new WeakMap;function t(o,c){const l=o.array,u=o.usage,h=l.byteLength,p=i.createBuffer();i.bindBuffer(c,p),i.bufferData(c,l,u),o.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:p,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:h}}function n(o,c,l){const u=c.array,h=c._updateRange,p=c.updateRanges;if(i.bindBuffer(l,o),h.count===-1&&p.length===0&&i.bufferSubData(l,0,u),p.length!==0){for(let f=0,_=p.length;f<_;f++){const v=p[f];i.bufferSubData(l,v.start*u.BYTES_PER_ELEMENT,u,v.start,v.count)}c.clearUpdateRanges()}h.count!==-1&&(i.bufferSubData(l,h.offset*u.BYTES_PER_ELEMENT,u,h.offset,h.count),h.count=-1),c.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:r,remove:s,update:a}}class vt extends Ut{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(n),c=Math.floor(r),l=o+1,u=c+1,h=e/o,p=t/c,f=[],_=[],v=[],m=[];for(let d=0;d<u;d++){const b=d*p-a;for(let g=0;g<l;g++){const y=g*h-s;_.push(y,-b,0),v.push(0,0,1),m.push(g/o),m.push(1-d/c)}}for(let d=0;d<c;d++)for(let b=0;b<o;b++){const g=b+l*d,y=b+l*(d+1),C=b+1+l*(d+1),T=b+1+l*d;f.push(g,y,T),f.push(y,C,T)}this.setIndex(f),this.setAttribute("position",new Tt(_,3)),this.setAttribute("normal",new Tt(v,3)),this.setAttribute("uv",new Tt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vt(e.width,e.height,e.widthSegments,e.heightSegments)}}var Zl=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Jl=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Ql=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,eu=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,tu=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,nu=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,iu=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ru=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,su=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,au=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ou=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,cu=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,lu=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,uu=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,hu=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,du=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,fu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,pu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,mu=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,gu=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,_u=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,vu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,xu=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Mu=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Su=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,yu=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Eu=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,bu=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Tu=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Au=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,wu="gl_FragColor = linearToOutputTexel( gl_FragColor );",Ru=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Cu=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Lu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Pu=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Du=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Iu=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Uu=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Nu=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Fu=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ou=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Bu=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,zu=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ku=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Hu=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Gu=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Vu=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Wu=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Xu=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,qu=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Yu=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ku=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ju=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,$u=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Zu=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Ju=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Qu=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,eh=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,th=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,nh=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,ih=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,rh=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,sh=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,ah=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,oh=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ch=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,lh=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,uh=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,hh=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dh=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,fh=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ph=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,mh=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,gh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,_h=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,vh=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,xh=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Mh=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Sh=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,yh=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Eh=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,bh=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Th=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Ah=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,wh=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Rh=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Ch=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Lh=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ph=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Dh=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Ih=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Uh=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Nh=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Fh=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Oh=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Bh=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,zh=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,kh=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Hh=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Gh=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Vh=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Wh=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Xh=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,qh=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Yh=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Kh=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,jh=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const $h=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Zh=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Jh=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Qh=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ed=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,td=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nd=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,id=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,rd=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,sd=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,ad=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,od=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cd=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,ld=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ud=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,hd=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dd=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fd=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pd=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,md=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gd=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,_d=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,vd=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xd=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Md=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Sd=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yd=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ed=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bd=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Td=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ad=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,wd=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Rd=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Cd=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ze={alphahash_fragment:Zl,alphahash_pars_fragment:Jl,alphamap_fragment:Ql,alphamap_pars_fragment:eu,alphatest_fragment:tu,alphatest_pars_fragment:nu,aomap_fragment:iu,aomap_pars_fragment:ru,batching_pars_vertex:su,batching_vertex:au,begin_vertex:ou,beginnormal_vertex:cu,bsdfs:lu,iridescence_fragment:uu,bumpmap_pars_fragment:hu,clipping_planes_fragment:du,clipping_planes_pars_fragment:fu,clipping_planes_pars_vertex:pu,clipping_planes_vertex:mu,color_fragment:gu,color_pars_fragment:_u,color_pars_vertex:vu,color_vertex:xu,common:Mu,cube_uv_reflection_fragment:Su,defaultnormal_vertex:yu,displacementmap_pars_vertex:Eu,displacementmap_vertex:bu,emissivemap_fragment:Tu,emissivemap_pars_fragment:Au,colorspace_fragment:wu,colorspace_pars_fragment:Ru,envmap_fragment:Cu,envmap_common_pars_fragment:Lu,envmap_pars_fragment:Pu,envmap_pars_vertex:Du,envmap_physical_pars_fragment:Vu,envmap_vertex:Iu,fog_vertex:Uu,fog_pars_vertex:Nu,fog_fragment:Fu,fog_pars_fragment:Ou,gradientmap_pars_fragment:Bu,lightmap_pars_fragment:zu,lights_lambert_fragment:ku,lights_lambert_pars_fragment:Hu,lights_pars_begin:Gu,lights_toon_fragment:Wu,lights_toon_pars_fragment:Xu,lights_phong_fragment:qu,lights_phong_pars_fragment:Yu,lights_physical_fragment:Ku,lights_physical_pars_fragment:ju,lights_fragment_begin:$u,lights_fragment_maps:Zu,lights_fragment_end:Ju,logdepthbuf_fragment:Qu,logdepthbuf_pars_fragment:eh,logdepthbuf_pars_vertex:th,logdepthbuf_vertex:nh,map_fragment:ih,map_pars_fragment:rh,map_particle_fragment:sh,map_particle_pars_fragment:ah,metalnessmap_fragment:oh,metalnessmap_pars_fragment:ch,morphinstance_vertex:lh,morphcolor_vertex:uh,morphnormal_vertex:hh,morphtarget_pars_vertex:dh,morphtarget_vertex:fh,normal_fragment_begin:ph,normal_fragment_maps:mh,normal_pars_fragment:gh,normal_pars_vertex:_h,normal_vertex:vh,normalmap_pars_fragment:xh,clearcoat_normal_fragment_begin:Mh,clearcoat_normal_fragment_maps:Sh,clearcoat_pars_fragment:yh,iridescence_pars_fragment:Eh,opaque_fragment:bh,packing:Th,premultiplied_alpha_fragment:Ah,project_vertex:wh,dithering_fragment:Rh,dithering_pars_fragment:Ch,roughnessmap_fragment:Lh,roughnessmap_pars_fragment:Ph,shadowmap_pars_fragment:Dh,shadowmap_pars_vertex:Ih,shadowmap_vertex:Uh,shadowmask_pars_fragment:Nh,skinbase_vertex:Fh,skinning_pars_vertex:Oh,skinning_vertex:Bh,skinnormal_vertex:zh,specularmap_fragment:kh,specularmap_pars_fragment:Hh,tonemapping_fragment:Gh,tonemapping_pars_fragment:Vh,transmission_fragment:Wh,transmission_pars_fragment:Xh,uv_pars_fragment:qh,uv_pars_vertex:Yh,uv_vertex:Kh,worldpos_vertex:jh,background_vert:$h,background_frag:Zh,backgroundCube_vert:Jh,backgroundCube_frag:Qh,cube_vert:ed,cube_frag:td,depth_vert:nd,depth_frag:id,distanceRGBA_vert:rd,distanceRGBA_frag:sd,equirect_vert:ad,equirect_frag:od,linedashed_vert:cd,linedashed_frag:ld,meshbasic_vert:ud,meshbasic_frag:hd,meshlambert_vert:dd,meshlambert_frag:fd,meshmatcap_vert:pd,meshmatcap_frag:md,meshnormal_vert:gd,meshnormal_frag:_d,meshphong_vert:vd,meshphong_frag:xd,meshphysical_vert:Md,meshphysical_frag:Sd,meshtoon_vert:yd,meshtoon_frag:Ed,points_vert:bd,points_frag:Td,shadow_vert:Ad,shadow_frag:wd,sprite_vert:Rd,sprite_frag:Cd},he={common:{diffuse:{value:new Ve(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ke},alphaMap:{value:null},alphaMapTransform:{value:new ke},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ke}},envmap:{envMap:{value:null},envMapRotation:{value:new ke},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ke}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ke}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ke},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ke},normalScale:{value:new We(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ke},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ke}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ke}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ke}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ve(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ve(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ke},alphaTest:{value:0},uvTransform:{value:new ke}},sprite:{diffuse:{value:new Ve(16777215)},opacity:{value:1},center:{value:new We(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ke},alphaMap:{value:null},alphaMapTransform:{value:new ke},alphaTest:{value:0}}},Kt={basic:{uniforms:St([he.common,he.specularmap,he.envmap,he.aomap,he.lightmap,he.fog]),vertexShader:ze.meshbasic_vert,fragmentShader:ze.meshbasic_frag},lambert:{uniforms:St([he.common,he.specularmap,he.envmap,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.fog,he.lights,{emissive:{value:new Ve(0)}}]),vertexShader:ze.meshlambert_vert,fragmentShader:ze.meshlambert_frag},phong:{uniforms:St([he.common,he.specularmap,he.envmap,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.fog,he.lights,{emissive:{value:new Ve(0)},specular:{value:new Ve(1118481)},shininess:{value:30}}]),vertexShader:ze.meshphong_vert,fragmentShader:ze.meshphong_frag},standard:{uniforms:St([he.common,he.envmap,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.roughnessmap,he.metalnessmap,he.fog,he.lights,{emissive:{value:new Ve(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ze.meshphysical_vert,fragmentShader:ze.meshphysical_frag},toon:{uniforms:St([he.common,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.gradientmap,he.fog,he.lights,{emissive:{value:new Ve(0)}}]),vertexShader:ze.meshtoon_vert,fragmentShader:ze.meshtoon_frag},matcap:{uniforms:St([he.common,he.bumpmap,he.normalmap,he.displacementmap,he.fog,{matcap:{value:null}}]),vertexShader:ze.meshmatcap_vert,fragmentShader:ze.meshmatcap_frag},points:{uniforms:St([he.points,he.fog]),vertexShader:ze.points_vert,fragmentShader:ze.points_frag},dashed:{uniforms:St([he.common,he.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ze.linedashed_vert,fragmentShader:ze.linedashed_frag},depth:{uniforms:St([he.common,he.displacementmap]),vertexShader:ze.depth_vert,fragmentShader:ze.depth_frag},normal:{uniforms:St([he.common,he.bumpmap,he.normalmap,he.displacementmap,{opacity:{value:1}}]),vertexShader:ze.meshnormal_vert,fragmentShader:ze.meshnormal_frag},sprite:{uniforms:St([he.sprite,he.fog]),vertexShader:ze.sprite_vert,fragmentShader:ze.sprite_frag},background:{uniforms:{uvTransform:{value:new ke},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ze.background_vert,fragmentShader:ze.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ke}},vertexShader:ze.backgroundCube_vert,fragmentShader:ze.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ze.cube_vert,fragmentShader:ze.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ze.equirect_vert,fragmentShader:ze.equirect_frag},distanceRGBA:{uniforms:St([he.common,he.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ze.distanceRGBA_vert,fragmentShader:ze.distanceRGBA_frag},shadow:{uniforms:St([he.lights,he.fog,{color:{value:new Ve(0)},opacity:{value:1}}]),vertexShader:ze.shadow_vert,fragmentShader:ze.shadow_frag}};Kt.physical={uniforms:St([Kt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ke},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ke},clearcoatNormalScale:{value:new We(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ke},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ke},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ke},sheen:{value:0},sheenColor:{value:new Ve(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ke},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ke},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ke},transmissionSamplerSize:{value:new We},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ke},attenuationDistance:{value:0},attenuationColor:{value:new Ve(0)},specularColor:{value:new Ve(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ke},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ke},anisotropyVector:{value:new We},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ke}}]),vertexShader:ze.meshphysical_vert,fragmentShader:ze.meshphysical_frag};const ar={r:0,b:0,g:0},Pn=new un,Ld=new it;function Pd(i,e,t,n,r,s,a){const o=new Ve(0);let c=s===!0?0:1,l,u,h=null,p=0,f=null;function _(b){let g=b.isScene===!0?b.background:null;return g&&g.isTexture&&(g=(b.backgroundBlurriness>0?t:e).get(g)),g}function v(b){let g=!1;const y=_(b);y===null?d(o,c):y&&y.isColor&&(d(y,1),g=!0);const C=i.xr.getEnvironmentBlendMode();C==="additive"?n.buffers.color.setClear(0,0,0,1,a):C==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||g)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(b,g){const y=_(g);y&&(y.isCubeTexture||y.mapping===wr)?(u===void 0&&(u=new dt(new Oi(1,1,1),new hn({name:"BackgroundCubeMaterial",uniforms:gi(Kt.backgroundCube.uniforms),vertexShader:Kt.backgroundCube.vertexShader,fragmentShader:Kt.backgroundCube.fragmentShader,side:At,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(C,T,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Pn.copy(g.backgroundRotation),Pn.x*=-1,Pn.y*=-1,Pn.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Pn.y*=-1,Pn.z*=-1),u.material.uniforms.envMap.value=y,u.material.uniforms.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=g.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=g.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Ld.makeRotationFromEuler(Pn)),u.material.toneMapped=Je.getTransfer(y.colorSpace)!==Qe,(h!==y||p!==y.version||f!==i.toneMapping)&&(u.material.needsUpdate=!0,h=y,p=y.version,f=i.toneMapping),u.layers.enableAll(),b.unshift(u,u.geometry,u.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new dt(new vt(2,2),new hn({name:"BackgroundMaterial",uniforms:gi(Kt.background.uniforms),vertexShader:Kt.background.vertexShader,fragmentShader:Kt.background.fragmentShader,side:yn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=g.backgroundIntensity,l.material.toneMapped=Je.getTransfer(y.colorSpace)!==Qe,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||p!==y.version||f!==i.toneMapping)&&(l.material.needsUpdate=!0,h=y,p=y.version,f=i.toneMapping),l.layers.enableAll(),b.unshift(l,l.geometry,l.material,0,0,null))}function d(b,g){b.getRGB(ar,Xo(i)),n.buffers.color.setClear(ar.r,ar.g,ar.b,g,a)}return{getClearColor:function(){return o},setClearColor:function(b,g=1){o.set(b),c=g,d(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(b){c=b,d(o,c)},render:v,addToRenderList:m}}function Dd(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=p(null);let s=r,a=!1;function o(S,L,q,G,Y){let ee=!1;const X=h(G,q,L);s!==X&&(s=X,l(s.object)),ee=f(S,G,q,Y),ee&&_(S,G,q,Y),Y!==null&&e.update(Y,i.ELEMENT_ARRAY_BUFFER),(ee||a)&&(a=!1,y(S,L,q,G),Y!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(Y).buffer))}function c(){return i.createVertexArray()}function l(S){return i.bindVertexArray(S)}function u(S){return i.deleteVertexArray(S)}function h(S,L,q){const G=q.wireframe===!0;let Y=n[S.id];Y===void 0&&(Y={},n[S.id]=Y);let ee=Y[L.id];ee===void 0&&(ee={},Y[L.id]=ee);let X=ee[G];return X===void 0&&(X=p(c()),ee[G]=X),X}function p(S){const L=[],q=[],G=[];for(let Y=0;Y<t;Y++)L[Y]=0,q[Y]=0,G[Y]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:q,attributeDivisors:G,object:S,attributes:{},index:null}}function f(S,L,q,G){const Y=s.attributes,ee=L.attributes;let X=0;const ne=q.getAttributes();for(const W in ne)if(ne[W].location>=0){const ve=Y[W];let be=ee[W];if(be===void 0&&(W==="instanceMatrix"&&S.instanceMatrix&&(be=S.instanceMatrix),W==="instanceColor"&&S.instanceColor&&(be=S.instanceColor)),ve===void 0||ve.attribute!==be||be&&ve.data!==be.data)return!0;X++}return s.attributesNum!==X||s.index!==G}function _(S,L,q,G){const Y={},ee=L.attributes;let X=0;const ne=q.getAttributes();for(const W in ne)if(ne[W].location>=0){let ve=ee[W];ve===void 0&&(W==="instanceMatrix"&&S.instanceMatrix&&(ve=S.instanceMatrix),W==="instanceColor"&&S.instanceColor&&(ve=S.instanceColor));const be={};be.attribute=ve,ve&&ve.data&&(be.data=ve.data),Y[W]=be,X++}s.attributes=Y,s.attributesNum=X,s.index=G}function v(){const S=s.newAttributes;for(let L=0,q=S.length;L<q;L++)S[L]=0}function m(S){d(S,0)}function d(S,L){const q=s.newAttributes,G=s.enabledAttributes,Y=s.attributeDivisors;q[S]=1,G[S]===0&&(i.enableVertexAttribArray(S),G[S]=1),Y[S]!==L&&(i.vertexAttribDivisor(S,L),Y[S]=L)}function b(){const S=s.newAttributes,L=s.enabledAttributes;for(let q=0,G=L.length;q<G;q++)L[q]!==S[q]&&(i.disableVertexAttribArray(q),L[q]=0)}function g(S,L,q,G,Y,ee,X){X===!0?i.vertexAttribIPointer(S,L,q,Y,ee):i.vertexAttribPointer(S,L,q,G,Y,ee)}function y(S,L,q,G){v();const Y=G.attributes,ee=q.getAttributes(),X=L.defaultAttributeValues;for(const ne in ee){const W=ee[ne];if(W.location>=0){let me=Y[ne];if(me===void 0&&(ne==="instanceMatrix"&&S.instanceMatrix&&(me=S.instanceMatrix),ne==="instanceColor"&&S.instanceColor&&(me=S.instanceColor)),me!==void 0){const ve=me.normalized,be=me.itemSize,Ge=e.get(me);if(Ge===void 0)continue;const Ye=Ge.buffer,K=Ge.type,te=Ge.bytesPerElement,U=K===i.INT||K===i.UNSIGNED_INT||me.gpuType===js;if(me.isInterleavedBufferAttribute){const H=me.data,Q=H.stride,ie=me.offset;if(H.isInstancedInterleavedBuffer){for(let de=0;de<W.locationSize;de++)d(W.location+de,H.meshPerAttribute);S.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=H.meshPerAttribute*H.count)}else for(let de=0;de<W.locationSize;de++)m(W.location+de);i.bindBuffer(i.ARRAY_BUFFER,Ye);for(let de=0;de<W.locationSize;de++)g(W.location+de,be/W.locationSize,K,ve,Q*te,(ie+be/W.locationSize*de)*te,U)}else{if(me.isInstancedBufferAttribute){for(let H=0;H<W.locationSize;H++)d(W.location+H,me.meshPerAttribute);S.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=me.meshPerAttribute*me.count)}else for(let H=0;H<W.locationSize;H++)m(W.location+H);i.bindBuffer(i.ARRAY_BUFFER,Ye);for(let H=0;H<W.locationSize;H++)g(W.location+H,be/W.locationSize,K,ve,be*te,be/W.locationSize*H*te,U)}}else if(X!==void 0){const ve=X[ne];if(ve!==void 0)switch(ve.length){case 2:i.vertexAttrib2fv(W.location,ve);break;case 3:i.vertexAttrib3fv(W.location,ve);break;case 4:i.vertexAttrib4fv(W.location,ve);break;default:i.vertexAttrib1fv(W.location,ve)}}}}b()}function C(){I();for(const S in n){const L=n[S];for(const q in L){const G=L[q];for(const Y in G)u(G[Y].object),delete G[Y];delete L[q]}delete n[S]}}function T(S){if(n[S.id]===void 0)return;const L=n[S.id];for(const q in L){const G=L[q];for(const Y in G)u(G[Y].object),delete G[Y];delete L[q]}delete n[S.id]}function w(S){for(const L in n){const q=n[L];if(q[S.id]===void 0)continue;const G=q[S.id];for(const Y in G)u(G[Y].object),delete G[Y];delete q[S.id]}}function I(){E(),a=!0,s!==r&&(s=r,l(s.object))}function E(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:I,resetDefaultState:E,dispose:C,releaseStatesOfGeometry:T,releaseStatesOfProgram:w,initAttributes:v,enableAttribute:m,disableUnusedAttributes:b}}function Id(i,e,t){let n;function r(l){n=l}function s(l,u){i.drawArrays(n,l,u),t.update(u,n,1)}function a(l,u,h){h!==0&&(i.drawArraysInstanced(n,l,u,h),t.update(u,n,h))}function o(l,u,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,u,0,h);let f=0;for(let _=0;_<h;_++)f+=u[_];t.update(f,n,1)}function c(l,u,h,p){if(h===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let _=0;_<l.length;_++)a(l[_],u[_],p[_]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,u,0,p,0,h);let _=0;for(let v=0;v<h;v++)_+=u[v];for(let v=0;v<p.length;v++)t.update(_,n,p[v])}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function Ud(i,e,t,n){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const T=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(T){return!(T!==Bt&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(T){const w=T===_i&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(T!==ln&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&T!==an&&!w)}function c(T){if(T==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const u=c(l);u!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);const h=t.logarithmicDepthBuffer===!0,p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),f=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),v=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),d=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),b=i.getParameter(i.MAX_VARYING_VECTORS),g=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),y=f>0,C=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:h,maxTextures:p,maxVertexTextures:f,maxTextureSize:_,maxCubemapSize:v,maxAttributes:m,maxVertexUniforms:d,maxVaryings:b,maxFragmentUniforms:g,vertexTextures:y,maxSamples:C}}function Nd(i){const e=this;let t=null,n=0,r=!1,s=!1;const a=new In,o=new ke,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,p){const f=h.length!==0||p||n!==0||r;return r=p,n=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,p){t=u(h,p,0)},this.setState=function(h,p,f){const _=h.clippingPlanes,v=h.clipIntersection,m=h.clipShadows,d=i.get(h);if(!r||_===null||_.length===0||s&&!m)s?u(null):l();else{const b=s?0:n,g=b*4;let y=d.clippingState||null;c.value=y,y=u(_,p,g,f);for(let C=0;C!==g;++C)y[C]=t[C];d.clippingState=y,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=b}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(h,p,f,_){const v=h!==null?h.length:0;let m=null;if(v!==0){if(m=c.value,_!==!0||m===null){const d=f+v*4,b=p.matrixWorldInverse;o.getNormalMatrix(b),(m===null||m.length<d)&&(m=new Float32Array(d));for(let g=0,y=f;g!==v;++g,y+=4)a.copy(h[g]).applyMatrix4(b,o),a.normal.toArray(m,y),m[y+3]=a.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,m}}function Fd(i){let e=new WeakMap;function t(a,o){return o===ps?a.mapping=di:o===ms&&(a.mapping=fi),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===ps||o===ms)if(e.has(a)){const c=e.get(a).texture;return t(c,a.mapping)}else{const c=a.image;if(c&&c.height>0){const l=new Yl(c.height);return l.fromEquirectangularTexture(i,a),e.set(a,l),a.addEventListener("dispose",r),t(l.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const c=e.get(o);c!==void 0&&(e.delete(o),c.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}class Lr extends qo{constructor(e=-1,t=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,a=n+e,o=r+t,c=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=u*this.view.offsetY,c=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const ci=4,Va=[.125,.215,.35,.446,.526,.582],Fn=20,ns=new Lr,Wa=new Ve;let is=null,rs=0,ss=0,as=!1;const Un=(1+Math.sqrt(5))/2,ai=1/Un,Xa=[new O(-Un,ai,0),new O(Un,ai,0),new O(-ai,0,Un),new O(ai,0,Un),new O(0,Un,-ai),new O(0,Un,ai),new O(-1,1,-1),new O(1,1,-1),new O(-1,1,1),new O(1,1,1)];class qa{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100){is=this._renderer.getRenderTarget(),rs=this._renderer.getActiveCubeFace(),ss=this._renderer.getActiveMipmapLevel(),as=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ja(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ka(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(is,rs,ss),this._renderer.xr.enabled=as,e.scissorTest=!1,or(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===di||e.mapping===fi?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),is=this._renderer.getRenderTarget(),rs=this._renderer.getActiveCubeFace(),ss=this._renderer.getActiveMipmapLevel(),as=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:bt,minFilter:bt,generateMipmaps:!1,type:_i,format:Bt,colorSpace:Tn,depthBuffer:!1},r=Ya(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ya(e,t,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Od(s)),this._blurMaterial=Bd(s,e,t)}return r}_compileMaterial(e){const t=new dt(this._lodPlanes[0],e);this._renderer.compile(t,ns)}_sceneToCubeUV(e,t,n,r){const o=new Wt(90,1,t,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,p=u.toneMapping;u.getClearColor(Wa),u.toneMapping=Sn,u.autoClear=!1;const f=new Xt({name:"PMREM.Background",side:At,depthWrite:!1,depthTest:!1}),_=new dt(new Oi,f);let v=!1;const m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,v=!0):(f.color.copy(Wa),v=!0);for(let d=0;d<6;d++){const b=d%3;b===0?(o.up.set(0,c[d],0),o.lookAt(l[d],0,0)):b===1?(o.up.set(0,0,c[d]),o.lookAt(0,l[d],0)):(o.up.set(0,c[d],0),o.lookAt(0,0,l[d]));const g=this._cubeSize;or(r,b*g,d>2?g:0,g,g),u.setRenderTarget(r),v&&u.render(_,o),u.render(e,o)}_.geometry.dispose(),_.material.dispose(),u.toneMapping=p,u.autoClear=h,e.background=m}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===di||e.mapping===fi;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=ja()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ka());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new dt(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const c=this._cubeSize;or(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,ns)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=Xa[(r-s-1)%Xa.length];this._blur(e,s-1,s,a,o)}t.autoClear=n}_blur(e,t,n,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",s),this._halfBlur(a,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,a,o){const c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new dt(this._lodPlanes[r],l),p=l.uniforms,f=this._sizeLods[n]-1,_=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*Fn-1),v=s/_,m=isFinite(s)?1+Math.floor(u*v):Fn;m>Fn&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Fn}`);const d=[];let b=0;for(let w=0;w<Fn;++w){const I=w/v,E=Math.exp(-I*I/2);d.push(E),w===0?b+=E:w<m&&(b+=2*E)}for(let w=0;w<d.length;w++)d[w]=d[w]/b;p.envMap.value=e.texture,p.samples.value=m,p.weights.value=d,p.latitudinal.value=a==="latitudinal",o&&(p.poleAxis.value=o);const{_lodMax:g}=this;p.dTheta.value=_,p.mipInt.value=g-n;const y=this._sizeLods[r],C=3*y*(r>g-ci?r-g+ci:0),T=4*(this._cubeSize-y);or(t,C,T,3*y,2*y),c.setRenderTarget(t),c.render(h,ns)}}function Od(i){const e=[],t=[],n=[];let r=i;const s=i-ci+1+Va.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let c=1/o;a>i-ci?c=Va[a-i+ci-1]:a===0&&(c=0),n.push(c);const l=1/(o-2),u=-l,h=1+l,p=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,_=6,v=3,m=2,d=1,b=new Float32Array(v*_*f),g=new Float32Array(m*_*f),y=new Float32Array(d*_*f);for(let T=0;T<f;T++){const w=T%3*2/3-1,I=T>2?0:-1,E=[w,I,0,w+2/3,I,0,w+2/3,I+1,0,w,I,0,w+2/3,I+1,0,w,I+1,0];b.set(E,v*_*T),g.set(p,m*_*T);const S=[T,T,T,T,T,T];y.set(S,d*_*T)}const C=new Ut;C.setAttribute("position",new $t(b,v)),C.setAttribute("uv",new $t(g,m)),C.setAttribute("faceIndex",new $t(y,d)),e.push(C),r>ci&&r--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Ya(i,e,t){const n=new En(i,e,t);return n.texture.mapping=wr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function or(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function Bd(i,e,t){const n=new Float32Array(Fn),r=new O(0,1,0);return new hn({name:"SphericalGaussianBlur",defines:{n:Fn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:sa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Mn,depthTest:!1,depthWrite:!1})}function Ka(){return new hn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:sa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Mn,depthTest:!1,depthWrite:!1})}function ja(){return new hn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:sa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Mn,depthTest:!1,depthWrite:!1})}function sa(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function zd(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const c=o.mapping,l=c===ps||c===ms,u=c===di||c===fi;if(l||u){let h=e.get(o);const p=h!==void 0?h.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==p)return t===null&&(t=new qa(i)),h=l?t.fromEquirectangular(o,h):t.fromCubemap(o,h),h.texture.pmremVersion=o.pmremVersion,e.set(o,h),h.texture;if(h!==void 0)return h.texture;{const f=o.image;return l&&f&&f.height>0||u&&f&&r(f)?(t===null&&(t=new qa(i)),h=l?t.fromEquirectangular(o):t.fromCubemap(o),h.texture.pmremVersion=o.pmremVersion,e.set(o,h),o.addEventListener("dispose",s),h.texture):null}}}return o}function r(o){let c=0;const l=6;for(let u=0;u<l;u++)o[u]!==void 0&&c++;return c===l}function s(o){const c=o.target;c.removeEventListener("dispose",s);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function kd(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&Li("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function Hd(i,e,t,n){const r={},s=new WeakMap;function a(h){const p=h.target;p.index!==null&&e.remove(p.index);for(const _ in p.attributes)e.remove(p.attributes[_]);for(const _ in p.morphAttributes){const v=p.morphAttributes[_];for(let m=0,d=v.length;m<d;m++)e.remove(v[m])}p.removeEventListener("dispose",a),delete r[p.id];const f=s.get(p);f&&(e.remove(f),s.delete(p)),n.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,t.memory.geometries--}function o(h,p){return r[p.id]===!0||(p.addEventListener("dispose",a),r[p.id]=!0,t.memory.geometries++),p}function c(h){const p=h.attributes;for(const _ in p)e.update(p[_],i.ARRAY_BUFFER);const f=h.morphAttributes;for(const _ in f){const v=f[_];for(let m=0,d=v.length;m<d;m++)e.update(v[m],i.ARRAY_BUFFER)}}function l(h){const p=[],f=h.index,_=h.attributes.position;let v=0;if(f!==null){const b=f.array;v=f.version;for(let g=0,y=b.length;g<y;g+=3){const C=b[g+0],T=b[g+1],w=b[g+2];p.push(C,T,T,w,w,C)}}else if(_!==void 0){const b=_.array;v=_.version;for(let g=0,y=b.length/3-1;g<y;g+=3){const C=g+0,T=g+1,w=g+2;p.push(C,T,T,w,w,C)}}else return;const m=new(zo(p)?Wo:Vo)(p,1);m.version=v;const d=s.get(h);d&&e.remove(d),s.set(h,m)}function u(h){const p=s.get(h);if(p){const f=h.index;f!==null&&p.version<f.version&&l(h)}else l(h);return s.get(h)}return{get:o,update:c,getWireframeAttribute:u}}function Gd(i,e,t){let n;function r(p){n=p}let s,a;function o(p){s=p.type,a=p.bytesPerElement}function c(p,f){i.drawElements(n,f,s,p*a),t.update(f,n,1)}function l(p,f,_){_!==0&&(i.drawElementsInstanced(n,f,s,p*a,_),t.update(f,n,_))}function u(p,f,_){if(_===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,p,0,_);let m=0;for(let d=0;d<_;d++)m+=f[d];t.update(m,n,1)}function h(p,f,_,v){if(_===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let d=0;d<p.length;d++)l(p[d]/a,f[d],v[d]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,s,p,0,v,0,_);let d=0;for(let b=0;b<_;b++)d+=f[b];for(let b=0;b<v.length;b++)t.update(d,n,v[b])}}this.setMode=r,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function Vd(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(s/3);break;case i.LINES:t.lines+=o*(s/2);break;case i.LINE_STRIP:t.lines+=o*(s-1);break;case i.LINE_LOOP:t.lines+=o*s;break;case i.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function Wd(i,e,t){const n=new WeakMap,r=new ht;function s(a,o,c){const l=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,h=u!==void 0?u.length:0;let p=n.get(o);if(p===void 0||p.count!==h){let E=function(){w.dispose(),n.delete(o),o.removeEventListener("dispose",E)};p!==void 0&&p.texture.dispose();const f=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],d=o.morphAttributes.normal||[],b=o.morphAttributes.color||[];let g=0;f===!0&&(g=1),_===!0&&(g=2),v===!0&&(g=3);let y=o.attributes.position.count*g,C=1;y>e.maxTextureSize&&(C=Math.ceil(y/e.maxTextureSize),y=e.maxTextureSize);const T=new Float32Array(y*C*4*h),w=new Ho(T,y,C,h);w.type=an,w.needsUpdate=!0;const I=g*4;for(let S=0;S<h;S++){const L=m[S],q=d[S],G=b[S],Y=y*C*4*S;for(let ee=0;ee<L.count;ee++){const X=ee*I;f===!0&&(r.fromBufferAttribute(L,ee),T[Y+X+0]=r.x,T[Y+X+1]=r.y,T[Y+X+2]=r.z,T[Y+X+3]=0),_===!0&&(r.fromBufferAttribute(q,ee),T[Y+X+4]=r.x,T[Y+X+5]=r.y,T[Y+X+6]=r.z,T[Y+X+7]=0),v===!0&&(r.fromBufferAttribute(G,ee),T[Y+X+8]=r.x,T[Y+X+9]=r.y,T[Y+X+10]=r.z,T[Y+X+11]=G.itemSize===4?r.w:1)}}p={count:h,texture:w,size:new We(y,C)},n.set(o,p),o.addEventListener("dispose",E)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let f=0;for(let v=0;v<l.length;v++)f+=l[v];const _=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(i,"morphTargetBaseInfluence",_),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",p.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",p.size)}return{update:s}}function Xd(i,e,t,n){let r=new WeakMap;function s(c){const l=n.render.frame,u=c.geometry,h=e.get(c,u);if(r.get(h)!==l&&(e.update(h),r.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),r.get(c)!==l&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){const p=c.skeleton;r.get(p)!==l&&(p.update(),r.set(p,l))}return h}function a(){r=new WeakMap}function o(c){const l=c.target;l.removeEventListener("dispose",o),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:s,dispose:a}}class $o extends mt{constructor(e,t,n,r,s,a,o,c,l,u=ui){if(u!==ui&&u!==mi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&u===ui&&(n=Gn),n===void 0&&u===mi&&(n=pi),super(null,r,s,a,o,c,u,n,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:Ot,this.minFilter=c!==void 0?c:Ot,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const Zo=new mt,$a=new $o(1,1),Jo=new Ho,Qo=new Pl,ec=new Yo,Za=[],Ja=[],Qa=new Float32Array(16),eo=new Float32Array(9),to=new Float32Array(4);function Mi(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=Za[r];if(s===void 0&&(s=new Float32Array(r),Za[r]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(s,o)}return s}function ct(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function lt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Pr(i,e){let t=Ja[e];t===void 0&&(t=new Int32Array(e),Ja[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function qd(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Yd(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ct(t,e))return;i.uniform2fv(this.addr,e),lt(t,e)}}function Kd(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(ct(t,e))return;i.uniform3fv(this.addr,e),lt(t,e)}}function jd(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ct(t,e))return;i.uniform4fv(this.addr,e),lt(t,e)}}function $d(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(ct(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),lt(t,e)}else{if(ct(t,n))return;to.set(n),i.uniformMatrix2fv(this.addr,!1,to),lt(t,n)}}function Zd(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(ct(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),lt(t,e)}else{if(ct(t,n))return;eo.set(n),i.uniformMatrix3fv(this.addr,!1,eo),lt(t,n)}}function Jd(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(ct(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),lt(t,e)}else{if(ct(t,n))return;Qa.set(n),i.uniformMatrix4fv(this.addr,!1,Qa),lt(t,n)}}function Qd(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function ef(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ct(t,e))return;i.uniform2iv(this.addr,e),lt(t,e)}}function tf(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ct(t,e))return;i.uniform3iv(this.addr,e),lt(t,e)}}function nf(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ct(t,e))return;i.uniform4iv(this.addr,e),lt(t,e)}}function rf(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function sf(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ct(t,e))return;i.uniform2uiv(this.addr,e),lt(t,e)}}function af(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ct(t,e))return;i.uniform3uiv(this.addr,e),lt(t,e)}}function of(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ct(t,e))return;i.uniform4uiv(this.addr,e),lt(t,e)}}function cf(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?($a.compareFunction=Bo,s=$a):s=Zo,t.setTexture2D(e||s,r)}function lf(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||Qo,r)}function uf(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||ec,r)}function hf(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||Jo,r)}function df(i){switch(i){case 5126:return qd;case 35664:return Yd;case 35665:return Kd;case 35666:return jd;case 35674:return $d;case 35675:return Zd;case 35676:return Jd;case 5124:case 35670:return Qd;case 35667:case 35671:return ef;case 35668:case 35672:return tf;case 35669:case 35673:return nf;case 5125:return rf;case 36294:return sf;case 36295:return af;case 36296:return of;case 35678:case 36198:case 36298:case 36306:case 35682:return cf;case 35679:case 36299:case 36307:return lf;case 35680:case 36300:case 36308:case 36293:return uf;case 36289:case 36303:case 36311:case 36292:return hf}}function ff(i,e){i.uniform1fv(this.addr,e)}function pf(i,e){const t=Mi(e,this.size,2);i.uniform2fv(this.addr,t)}function mf(i,e){const t=Mi(e,this.size,3);i.uniform3fv(this.addr,t)}function gf(i,e){const t=Mi(e,this.size,4);i.uniform4fv(this.addr,t)}function _f(i,e){const t=Mi(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function vf(i,e){const t=Mi(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function xf(i,e){const t=Mi(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Mf(i,e){i.uniform1iv(this.addr,e)}function Sf(i,e){i.uniform2iv(this.addr,e)}function yf(i,e){i.uniform3iv(this.addr,e)}function Ef(i,e){i.uniform4iv(this.addr,e)}function bf(i,e){i.uniform1uiv(this.addr,e)}function Tf(i,e){i.uniform2uiv(this.addr,e)}function Af(i,e){i.uniform3uiv(this.addr,e)}function wf(i,e){i.uniform4uiv(this.addr,e)}function Rf(i,e,t){const n=this.cache,r=e.length,s=Pr(t,r);ct(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||Zo,s[a])}function Cf(i,e,t){const n=this.cache,r=e.length,s=Pr(t,r);ct(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||Qo,s[a])}function Lf(i,e,t){const n=this.cache,r=e.length,s=Pr(t,r);ct(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||ec,s[a])}function Pf(i,e,t){const n=this.cache,r=e.length,s=Pr(t,r);ct(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||Jo,s[a])}function Df(i){switch(i){case 5126:return ff;case 35664:return pf;case 35665:return mf;case 35666:return gf;case 35674:return _f;case 35675:return vf;case 35676:return xf;case 5124:case 35670:return Mf;case 35667:case 35671:return Sf;case 35668:case 35672:return yf;case 35669:case 35673:return Ef;case 5125:return bf;case 36294:return Tf;case 36295:return Af;case 36296:return wf;case 35678:case 36198:case 36298:case 36306:case 35682:return Rf;case 35679:case 36299:case 36307:return Cf;case 35680:case 36300:case 36308:case 36293:return Lf;case 36289:case 36303:case 36311:case 36292:return Pf}}class If{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=df(t.type)}}class Uf{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Df(t.type)}}class Nf{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],n)}}}const os=/(\w+)(\])?(\[|\.)?/g;function no(i,e){i.seq.push(e),i.map[e.id]=e}function Ff(i,e,t){const n=i.name,r=n.length;for(os.lastIndex=0;;){const s=os.exec(n),a=os.lastIndex;let o=s[1];const c=s[2]==="]",l=s[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===r){no(t,l===void 0?new If(o,i,e):new Uf(o,i,e));break}else{let h=t.map[o];h===void 0&&(h=new Nf(o),no(t,h)),t=h}}}class _r{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);Ff(s,a,this)}}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&n.push(a)}return n}}function io(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const Of=37297;let Bf=0;function zf(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}function kf(i){const e=Je.getPrimaries(Je.workingColorSpace),t=Je.getPrimaries(i);let n;switch(e===t?n="":e===yr&&t===Sr?n="LinearDisplayP3ToLinearSRGB":e===Sr&&t===yr&&(n="LinearSRGBToLinearDisplayP3"),i){case Tn:case Rr:return[n,"LinearTransferOETF"];case Yt:case ta:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",i),[n,"LinearTransferOETF"]}}function ro(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=i.getShaderInfoLog(e).trim();if(n&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+zf(i.getShaderSource(e),a)}else return r}function Hf(i,e){const t=kf(e);return`vec4 ${i}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function Gf(i,e){let t;switch(e){case Gc:t="Linear";break;case Vc:t="Reinhard";break;case Wc:t="Cineon";break;case Xc:t="ACESFilmic";break;case Yc:t="AgX";break;case Kc:t="Neutral";break;case qc:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const cr=new O;function Vf(){Je.getLuminanceCoefficients(cr);const i=cr.x.toFixed(4),e=cr.y.toFixed(4),t=cr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Wf(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(wi).join(`
`)}function Xf(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function qf(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),a=s.name;let o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function wi(i){return i!==""}function so(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ao(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Yf=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ws(i){return i.replace(Yf,jf)}const Kf=new Map;function jf(i,e){let t=ze[e];if(t===void 0){const n=Kf.get(e);if(n!==void 0)t=ze[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Ws(t)}const $f=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function oo(i){return i.replace($f,Zf)}function Zf(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function co(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Jf(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===To?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===pc?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===sn&&(e="SHADOWMAP_TYPE_VSM"),e}function Qf(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case di:case fi:e="ENVMAP_TYPE_CUBE";break;case wr:e="ENVMAP_TYPE_CUBE_UV";break}return e}function ep(i){let e="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case fi:e="ENVMAP_MODE_REFRACTION";break}return e}function tp(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Ao:e="ENVMAP_BLENDING_MULTIPLY";break;case kc:e="ENVMAP_BLENDING_MIX";break;case Hc:e="ENVMAP_BLENDING_ADD";break}return e}function np(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function ip(i,e,t,n){const r=i.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const c=Jf(t),l=Qf(t),u=ep(t),h=tp(t),p=np(t),f=Wf(t),_=Xf(s),v=r.createProgram();let m,d,b=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(wi).join(`
`),m.length>0&&(m+=`
`),d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(wi).join(`
`),d.length>0&&(d+=`
`)):(m=[co(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(wi).join(`
`),d=[co(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Sn?"#define TONE_MAPPING":"",t.toneMapping!==Sn?ze.tonemapping_pars_fragment:"",t.toneMapping!==Sn?Gf("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ze.colorspace_pars_fragment,Hf("linearToOutputTexel",t.outputColorSpace),Vf(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(wi).join(`
`)),a=Ws(a),a=so(a,t),a=ao(a,t),o=Ws(o),o=so(o,t),o=ao(o,t),a=oo(a),o=oo(o),t.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,d=["#define varying in",t.glslVersion===ya?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ya?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+d);const g=b+m+a,y=b+d+o,C=io(r,r.VERTEX_SHADER,g),T=io(r,r.FRAGMENT_SHADER,y);r.attachShader(v,C),r.attachShader(v,T),t.index0AttributeName!==void 0?r.bindAttribLocation(v,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(v,0,"position"),r.linkProgram(v);function w(L){if(i.debug.checkShaderErrors){const q=r.getProgramInfoLog(v).trim(),G=r.getShaderInfoLog(C).trim(),Y=r.getShaderInfoLog(T).trim();let ee=!0,X=!0;if(r.getProgramParameter(v,r.LINK_STATUS)===!1)if(ee=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,v,C,T);else{const ne=ro(r,C,"vertex"),W=ro(r,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(v,r.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+q+`
`+ne+`
`+W)}else q!==""?console.warn("THREE.WebGLProgram: Program Info Log:",q):(G===""||Y==="")&&(X=!1);X&&(L.diagnostics={runnable:ee,programLog:q,vertexShader:{log:G,prefix:m},fragmentShader:{log:Y,prefix:d}})}r.deleteShader(C),r.deleteShader(T),I=new _r(r,v),E=qf(r,v)}let I;this.getUniforms=function(){return I===void 0&&w(this),I};let E;this.getAttributes=function(){return E===void 0&&w(this),E};let S=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=r.getProgramParameter(v,Of)),S},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(v),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Bf++,this.cacheKey=e,this.usedTimes=1,this.program=v,this.vertexShader=C,this.fragmentShader=T,this}let rp=0;class sp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new ap(e),t.set(e,n)),n}}class ap{constructor(e){this.id=rp++,this.code=e,this.usedTimes=0}}function op(i,e,t,n,r,s,a){const o=new ra,c=new sp,l=new Set,u=[],h=r.logarithmicDepthBuffer,p=r.vertexTextures;let f=r.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(E){return l.add(E),E===0?"uv":`uv${E}`}function m(E,S,L,q,G){const Y=q.fog,ee=G.geometry,X=E.isMeshStandardMaterial?q.environment:null,ne=(E.isMeshStandardMaterial?t:e).get(E.envMap||X),W=ne&&ne.mapping===wr?ne.image.height:null,me=_[E.type];E.precision!==null&&(f=r.getMaxPrecision(E.precision),f!==E.precision&&console.warn("THREE.WebGLProgram.getParameters:",E.precision,"not supported, using",f,"instead."));const ve=ee.morphAttributes.position||ee.morphAttributes.normal||ee.morphAttributes.color,be=ve!==void 0?ve.length:0;let Ge=0;ee.morphAttributes.position!==void 0&&(Ge=1),ee.morphAttributes.normal!==void 0&&(Ge=2),ee.morphAttributes.color!==void 0&&(Ge=3);let Ye,K,te,U;if(me){const Ke=Kt[me];Ye=Ke.vertexShader,K=Ke.fragmentShader}else Ye=E.vertexShader,K=E.fragmentShader,c.update(E),te=c.getVertexShaderID(E),U=c.getFragmentShaderID(E);const H=i.getRenderTarget(),Q=G.isInstancedMesh===!0,ie=G.isBatchedMesh===!0,de=!!E.map,Ce=!!E.matcap,R=!!ne,ce=!!E.aoMap,Le=!!E.lightMap,fe=!!E.bumpMap,ge=!!E.normalMap,Oe=!!E.displacementMap,pe=!!E.emissiveMap,Te=!!E.metalnessMap,A=!!E.roughnessMap,x=E.anisotropy>0,F=E.clearcoat>0,V=E.dispersion>0,j=E.iridescence>0,Z=E.sheen>0,Re=E.transmission>0,ue=x&&!!E.anisotropyMap,xe=F&&!!E.clearcoatMap,Be=F&&!!E.clearcoatNormalMap,se=F&&!!E.clearcoatRoughnessMap,Me=j&&!!E.iridescenceMap,Xe=j&&!!E.iridescenceThicknessMap,Ue=Z&&!!E.sheenColorMap,Se=Z&&!!E.sheenRoughnessMap,Ne=!!E.specularMap,He=!!E.specularColorMap,et=!!E.specularIntensityMap,P=Re&&!!E.transmissionMap,ae=Re&&!!E.thicknessMap,$=!!E.gradientMap,J=!!E.alphaMap,le=E.alphaTest>0,Pe=!!E.alphaHash,qe=!!E.extensions;let rt=Sn;E.toneMapped&&(H===null||H.isXRRenderTarget===!0)&&(rt=i.toneMapping);const ft={shaderID:me,shaderType:E.type,shaderName:E.name,vertexShader:Ye,fragmentShader:K,defines:E.defines,customVertexShaderID:te,customFragmentShaderID:U,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:f,batching:ie,batchingColor:ie&&G._colorsTexture!==null,instancing:Q,instancingColor:Q&&G.instanceColor!==null,instancingMorph:Q&&G.morphTexture!==null,supportsVertexTextures:p,outputColorSpace:H===null?i.outputColorSpace:H.isXRRenderTarget===!0?H.texture.colorSpace:Tn,alphaToCoverage:!!E.alphaToCoverage,map:de,matcap:Ce,envMap:R,envMapMode:R&&ne.mapping,envMapCubeUVHeight:W,aoMap:ce,lightMap:Le,bumpMap:fe,normalMap:ge,displacementMap:p&&Oe,emissiveMap:pe,normalMapObjectSpace:ge&&E.normalMapType===Qc,normalMapTangentSpace:ge&&E.normalMapType===Jc,metalnessMap:Te,roughnessMap:A,anisotropy:x,anisotropyMap:ue,clearcoat:F,clearcoatMap:xe,clearcoatNormalMap:Be,clearcoatRoughnessMap:se,dispersion:V,iridescence:j,iridescenceMap:Me,iridescenceThicknessMap:Xe,sheen:Z,sheenColorMap:Ue,sheenRoughnessMap:Se,specularMap:Ne,specularColorMap:He,specularIntensityMap:et,transmission:Re,transmissionMap:P,thicknessMap:ae,gradientMap:$,opaque:E.transparent===!1&&E.blending===li&&E.alphaToCoverage===!1,alphaMap:J,alphaTest:le,alphaHash:Pe,combine:E.combine,mapUv:de&&v(E.map.channel),aoMapUv:ce&&v(E.aoMap.channel),lightMapUv:Le&&v(E.lightMap.channel),bumpMapUv:fe&&v(E.bumpMap.channel),normalMapUv:ge&&v(E.normalMap.channel),displacementMapUv:Oe&&v(E.displacementMap.channel),emissiveMapUv:pe&&v(E.emissiveMap.channel),metalnessMapUv:Te&&v(E.metalnessMap.channel),roughnessMapUv:A&&v(E.roughnessMap.channel),anisotropyMapUv:ue&&v(E.anisotropyMap.channel),clearcoatMapUv:xe&&v(E.clearcoatMap.channel),clearcoatNormalMapUv:Be&&v(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:se&&v(E.clearcoatRoughnessMap.channel),iridescenceMapUv:Me&&v(E.iridescenceMap.channel),iridescenceThicknessMapUv:Xe&&v(E.iridescenceThicknessMap.channel),sheenColorMapUv:Ue&&v(E.sheenColorMap.channel),sheenRoughnessMapUv:Se&&v(E.sheenRoughnessMap.channel),specularMapUv:Ne&&v(E.specularMap.channel),specularColorMapUv:He&&v(E.specularColorMap.channel),specularIntensityMapUv:et&&v(E.specularIntensityMap.channel),transmissionMapUv:P&&v(E.transmissionMap.channel),thicknessMapUv:ae&&v(E.thicknessMap.channel),alphaMapUv:J&&v(E.alphaMap.channel),vertexTangents:!!ee.attributes.tangent&&(ge||x),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!ee.attributes.color&&ee.attributes.color.itemSize===4,pointsUvs:G.isPoints===!0&&!!ee.attributes.uv&&(de||J),fog:!!Y,useFog:E.fog===!0,fogExp2:!!Y&&Y.isFogExp2,flatShading:E.flatShading===!0,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:h,skinning:G.isSkinnedMesh===!0,morphTargets:ee.morphAttributes.position!==void 0,morphNormals:ee.morphAttributes.normal!==void 0,morphColors:ee.morphAttributes.color!==void 0,morphTargetsCount:be,morphTextureStride:Ge,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:E.dithering,shadowMapEnabled:i.shadowMap.enabled&&L.length>0,shadowMapType:i.shadowMap.type,toneMapping:rt,decodeVideoTexture:de&&E.map.isVideoTexture===!0&&Je.getTransfer(E.map.colorSpace)===Qe,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===Dt,flipSided:E.side===At,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:qe&&E.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(qe&&E.extensions.multiDraw===!0||ie)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return ft.vertexUv1s=l.has(1),ft.vertexUv2s=l.has(2),ft.vertexUv3s=l.has(3),l.clear(),ft}function d(E){const S=[];if(E.shaderID?S.push(E.shaderID):(S.push(E.customVertexShaderID),S.push(E.customFragmentShaderID)),E.defines!==void 0)for(const L in E.defines)S.push(L),S.push(E.defines[L]);return E.isRawShaderMaterial===!1&&(b(S,E),g(S,E),S.push(i.outputColorSpace)),S.push(E.customProgramCacheKey),S.join()}function b(E,S){E.push(S.precision),E.push(S.outputColorSpace),E.push(S.envMapMode),E.push(S.envMapCubeUVHeight),E.push(S.mapUv),E.push(S.alphaMapUv),E.push(S.lightMapUv),E.push(S.aoMapUv),E.push(S.bumpMapUv),E.push(S.normalMapUv),E.push(S.displacementMapUv),E.push(S.emissiveMapUv),E.push(S.metalnessMapUv),E.push(S.roughnessMapUv),E.push(S.anisotropyMapUv),E.push(S.clearcoatMapUv),E.push(S.clearcoatNormalMapUv),E.push(S.clearcoatRoughnessMapUv),E.push(S.iridescenceMapUv),E.push(S.iridescenceThicknessMapUv),E.push(S.sheenColorMapUv),E.push(S.sheenRoughnessMapUv),E.push(S.specularMapUv),E.push(S.specularColorMapUv),E.push(S.specularIntensityMapUv),E.push(S.transmissionMapUv),E.push(S.thicknessMapUv),E.push(S.combine),E.push(S.fogExp2),E.push(S.sizeAttenuation),E.push(S.morphTargetsCount),E.push(S.morphAttributeCount),E.push(S.numDirLights),E.push(S.numPointLights),E.push(S.numSpotLights),E.push(S.numSpotLightMaps),E.push(S.numHemiLights),E.push(S.numRectAreaLights),E.push(S.numDirLightShadows),E.push(S.numPointLightShadows),E.push(S.numSpotLightShadows),E.push(S.numSpotLightShadowsWithMaps),E.push(S.numLightProbes),E.push(S.shadowMapType),E.push(S.toneMapping),E.push(S.numClippingPlanes),E.push(S.numClipIntersection),E.push(S.depthPacking)}function g(E,S){o.disableAll(),S.supportsVertexTextures&&o.enable(0),S.instancing&&o.enable(1),S.instancingColor&&o.enable(2),S.instancingMorph&&o.enable(3),S.matcap&&o.enable(4),S.envMap&&o.enable(5),S.normalMapObjectSpace&&o.enable(6),S.normalMapTangentSpace&&o.enable(7),S.clearcoat&&o.enable(8),S.iridescence&&o.enable(9),S.alphaTest&&o.enable(10),S.vertexColors&&o.enable(11),S.vertexAlphas&&o.enable(12),S.vertexUv1s&&o.enable(13),S.vertexUv2s&&o.enable(14),S.vertexUv3s&&o.enable(15),S.vertexTangents&&o.enable(16),S.anisotropy&&o.enable(17),S.alphaHash&&o.enable(18),S.batching&&o.enable(19),S.dispersion&&o.enable(20),S.batchingColor&&o.enable(21),E.push(o.mask),o.disableAll(),S.fog&&o.enable(0),S.useFog&&o.enable(1),S.flatShading&&o.enable(2),S.logarithmicDepthBuffer&&o.enable(3),S.skinning&&o.enable(4),S.morphTargets&&o.enable(5),S.morphNormals&&o.enable(6),S.morphColors&&o.enable(7),S.premultipliedAlpha&&o.enable(8),S.shadowMapEnabled&&o.enable(9),S.doubleSided&&o.enable(10),S.flipSided&&o.enable(11),S.useDepthPacking&&o.enable(12),S.dithering&&o.enable(13),S.transmission&&o.enable(14),S.sheen&&o.enable(15),S.opaque&&o.enable(16),S.pointsUvs&&o.enable(17),S.decodeVideoTexture&&o.enable(18),S.alphaToCoverage&&o.enable(19),E.push(o.mask)}function y(E){const S=_[E.type];let L;if(S){const q=Kt[S];L=Vl.clone(q.uniforms)}else L=E.uniforms;return L}function C(E,S){let L;for(let q=0,G=u.length;q<G;q++){const Y=u[q];if(Y.cacheKey===S){L=Y,++L.usedTimes;break}}return L===void 0&&(L=new ip(i,S,E,s),u.push(L)),L}function T(E){if(--E.usedTimes===0){const S=u.indexOf(E);u[S]=u[u.length-1],u.pop(),E.destroy()}}function w(E){c.remove(E)}function I(){c.dispose()}return{getParameters:m,getProgramCacheKey:d,getUniforms:y,acquireProgram:C,releaseProgram:T,releaseShaderCache:w,programs:u,dispose:I}}function cp(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function r(a,o,c){i.get(a)[o]=c}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:s}}function lp(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function lo(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function uo(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function a(h,p,f,_,v,m){let d=i[e];return d===void 0?(d={id:h.id,object:h,geometry:p,material:f,groupOrder:_,renderOrder:h.renderOrder,z:v,group:m},i[e]=d):(d.id=h.id,d.object=h,d.geometry=p,d.material=f,d.groupOrder=_,d.renderOrder=h.renderOrder,d.z=v,d.group=m),e++,d}function o(h,p,f,_,v,m){const d=a(h,p,f,_,v,m);f.transmission>0?n.push(d):f.transparent===!0?r.push(d):t.push(d)}function c(h,p,f,_,v,m){const d=a(h,p,f,_,v,m);f.transmission>0?n.unshift(d):f.transparent===!0?r.unshift(d):t.unshift(d)}function l(h,p){t.length>1&&t.sort(h||lp),n.length>1&&n.sort(p||lo),r.length>1&&r.sort(p||lo)}function u(){for(let h=e,p=i.length;h<p;h++){const f=i[h];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:o,unshift:c,finish:u,sort:l}}function up(){let i=new WeakMap;function e(n,r){const s=i.get(n);let a;return s===void 0?(a=new uo,i.set(n,[a])):r>=s.length?(a=new uo,s.push(a)):a=s[r],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function hp(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new O,color:new Ve};break;case"SpotLight":t={position:new O,direction:new O,color:new Ve,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new O,color:new Ve,distance:0,decay:0};break;case"HemisphereLight":t={direction:new O,skyColor:new Ve,groundColor:new Ve};break;case"RectAreaLight":t={color:new Ve,position:new O,halfWidth:new O,halfHeight:new O};break}return i[e.id]=t,t}}}function dp(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new We};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new We};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new We,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let fp=0;function pp(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function mp(i){const e=new hp,t=dp(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new O);const r=new O,s=new it,a=new it;function o(l){let u=0,h=0,p=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let f=0,_=0,v=0,m=0,d=0,b=0,g=0,y=0,C=0,T=0,w=0;l.sort(pp);for(let E=0,S=l.length;E<S;E++){const L=l[E],q=L.color,G=L.intensity,Y=L.distance,ee=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)u+=q.r*G,h+=q.g*G,p+=q.b*G;else if(L.isLightProbe){for(let X=0;X<9;X++)n.probe[X].addScaledVector(L.sh.coefficients[X],G);w++}else if(L.isDirectionalLight){const X=e.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const ne=L.shadow,W=t.get(L);W.shadowIntensity=ne.intensity,W.shadowBias=ne.bias,W.shadowNormalBias=ne.normalBias,W.shadowRadius=ne.radius,W.shadowMapSize=ne.mapSize,n.directionalShadow[f]=W,n.directionalShadowMap[f]=ee,n.directionalShadowMatrix[f]=L.shadow.matrix,b++}n.directional[f]=X,f++}else if(L.isSpotLight){const X=e.get(L);X.position.setFromMatrixPosition(L.matrixWorld),X.color.copy(q).multiplyScalar(G),X.distance=Y,X.coneCos=Math.cos(L.angle),X.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),X.decay=L.decay,n.spot[v]=X;const ne=L.shadow;if(L.map&&(n.spotLightMap[C]=L.map,C++,ne.updateMatrices(L),L.castShadow&&T++),n.spotLightMatrix[v]=ne.matrix,L.castShadow){const W=t.get(L);W.shadowIntensity=ne.intensity,W.shadowBias=ne.bias,W.shadowNormalBias=ne.normalBias,W.shadowRadius=ne.radius,W.shadowMapSize=ne.mapSize,n.spotShadow[v]=W,n.spotShadowMap[v]=ee,y++}v++}else if(L.isRectAreaLight){const X=e.get(L);X.color.copy(q).multiplyScalar(G),X.halfWidth.set(L.width*.5,0,0),X.halfHeight.set(0,L.height*.5,0),n.rectArea[m]=X,m++}else if(L.isPointLight){const X=e.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity),X.distance=L.distance,X.decay=L.decay,L.castShadow){const ne=L.shadow,W=t.get(L);W.shadowIntensity=ne.intensity,W.shadowBias=ne.bias,W.shadowNormalBias=ne.normalBias,W.shadowRadius=ne.radius,W.shadowMapSize=ne.mapSize,W.shadowCameraNear=ne.camera.near,W.shadowCameraFar=ne.camera.far,n.pointShadow[_]=W,n.pointShadowMap[_]=ee,n.pointShadowMatrix[_]=L.shadow.matrix,g++}n.point[_]=X,_++}else if(L.isHemisphereLight){const X=e.get(L);X.skyColor.copy(L.color).multiplyScalar(G),X.groundColor.copy(L.groundColor).multiplyScalar(G),n.hemi[d]=X,d++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=he.LTC_FLOAT_1,n.rectAreaLTC2=he.LTC_FLOAT_2):(n.rectAreaLTC1=he.LTC_HALF_1,n.rectAreaLTC2=he.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=p;const I=n.hash;(I.directionalLength!==f||I.pointLength!==_||I.spotLength!==v||I.rectAreaLength!==m||I.hemiLength!==d||I.numDirectionalShadows!==b||I.numPointShadows!==g||I.numSpotShadows!==y||I.numSpotMaps!==C||I.numLightProbes!==w)&&(n.directional.length=f,n.spot.length=v,n.rectArea.length=m,n.point.length=_,n.hemi.length=d,n.directionalShadow.length=b,n.directionalShadowMap.length=b,n.pointShadow.length=g,n.pointShadowMap.length=g,n.spotShadow.length=y,n.spotShadowMap.length=y,n.directionalShadowMatrix.length=b,n.pointShadowMatrix.length=g,n.spotLightMatrix.length=y+C-T,n.spotLightMap.length=C,n.numSpotLightShadowsWithMaps=T,n.numLightProbes=w,I.directionalLength=f,I.pointLength=_,I.spotLength=v,I.rectAreaLength=m,I.hemiLength=d,I.numDirectionalShadows=b,I.numPointShadows=g,I.numSpotShadows=y,I.numSpotMaps=C,I.numLightProbes=w,n.version=fp++)}function c(l,u){let h=0,p=0,f=0,_=0,v=0;const m=u.matrixWorldInverse;for(let d=0,b=l.length;d<b;d++){const g=l[d];if(g.isDirectionalLight){const y=n.directional[h];y.direction.setFromMatrixPosition(g.matrixWorld),r.setFromMatrixPosition(g.target.matrixWorld),y.direction.sub(r),y.direction.transformDirection(m),h++}else if(g.isSpotLight){const y=n.spot[f];y.position.setFromMatrixPosition(g.matrixWorld),y.position.applyMatrix4(m),y.direction.setFromMatrixPosition(g.matrixWorld),r.setFromMatrixPosition(g.target.matrixWorld),y.direction.sub(r),y.direction.transformDirection(m),f++}else if(g.isRectAreaLight){const y=n.rectArea[_];y.position.setFromMatrixPosition(g.matrixWorld),y.position.applyMatrix4(m),a.identity(),s.copy(g.matrixWorld),s.premultiply(m),a.extractRotation(s),y.halfWidth.set(g.width*.5,0,0),y.halfHeight.set(0,g.height*.5,0),y.halfWidth.applyMatrix4(a),y.halfHeight.applyMatrix4(a),_++}else if(g.isPointLight){const y=n.point[p];y.position.setFromMatrixPosition(g.matrixWorld),y.position.applyMatrix4(m),p++}else if(g.isHemisphereLight){const y=n.hemi[v];y.direction.setFromMatrixPosition(g.matrixWorld),y.direction.transformDirection(m),v++}}}return{setup:o,setupView:c,state:n}}function ho(i){const e=new mp(i),t=[],n=[];function r(u){l.camera=u,t.length=0,n.length=0}function s(u){t.push(u)}function a(u){n.push(u)}function o(){e.setup(t)}function c(u){e.setupView(t,u)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:o,setupLightsView:c,pushLight:s,pushShadow:a}}function gp(i){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new ho(i),e.set(r,[o])):s>=a.length?(o=new ho(i),a.push(o)):o=a[s],o}function n(){e=new WeakMap}return{get:t,dispose:n}}class _p extends bn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=$c,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class vp extends bn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const xp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Mp=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Sp(i,e,t){let n=new Ko;const r=new We,s=new We,a=new ht,o=new _p({depthPacking:Zc}),c=new vp,l={},u=t.maxTextureSize,h={[yn]:At,[At]:yn,[Dt]:Dt},p=new hn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new We},radius:{value:4}},vertexShader:xp,fragmentShader:Mp}),f=p.clone();f.defines.HORIZONTAL_PASS=1;const _=new Ut;_.setAttribute("position",new $t(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new dt(_,p),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=To;let d=this.type;this.render=function(T,w,I){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;const E=i.getRenderTarget(),S=i.getActiveCubeFace(),L=i.getActiveMipmapLevel(),q=i.state;q.setBlending(Mn),q.buffers.color.setClear(1,1,1,1),q.buffers.depth.setTest(!0),q.setScissorTest(!1);const G=d!==sn&&this.type===sn,Y=d===sn&&this.type!==sn;for(let ee=0,X=T.length;ee<X;ee++){const ne=T[ee],W=ne.shadow;if(W===void 0){console.warn("THREE.WebGLShadowMap:",ne,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;r.copy(W.mapSize);const me=W.getFrameExtents();if(r.multiply(me),s.copy(W.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/me.x),r.x=s.x*me.x,W.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/me.y),r.y=s.y*me.y,W.mapSize.y=s.y)),W.map===null||G===!0||Y===!0){const be=this.type!==sn?{minFilter:Ot,magFilter:Ot}:{};W.map!==null&&W.map.dispose(),W.map=new En(r.x,r.y,be),W.map.texture.name=ne.name+".shadowMap",W.camera.updateProjectionMatrix()}i.setRenderTarget(W.map),i.clear();const ve=W.getViewportCount();for(let be=0;be<ve;be++){const Ge=W.getViewport(be);a.set(s.x*Ge.x,s.y*Ge.y,s.x*Ge.z,s.y*Ge.w),q.viewport(a),W.updateMatrices(ne,be),n=W.getFrustum(),y(w,I,W.camera,ne,this.type)}W.isPointLightShadow!==!0&&this.type===sn&&b(W,I),W.needsUpdate=!1}d=this.type,m.needsUpdate=!1,i.setRenderTarget(E,S,L)};function b(T,w){const I=e.update(v);p.defines.VSM_SAMPLES!==T.blurSamples&&(p.defines.VSM_SAMPLES=T.blurSamples,f.defines.VSM_SAMPLES=T.blurSamples,p.needsUpdate=!0,f.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new En(r.x,r.y)),p.uniforms.shadow_pass.value=T.map.texture,p.uniforms.resolution.value=T.mapSize,p.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(w,null,I,p,v,null),f.uniforms.shadow_pass.value=T.mapPass.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(w,null,I,f,v,null)}function g(T,w,I,E){let S=null;const L=I.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(L!==void 0)S=L;else if(S=I.isPointLight===!0?c:o,i.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0){const q=S.uuid,G=w.uuid;let Y=l[q];Y===void 0&&(Y={},l[q]=Y);let ee=Y[G];ee===void 0&&(ee=S.clone(),Y[G]=ee,w.addEventListener("dispose",C)),S=ee}if(S.visible=w.visible,S.wireframe=w.wireframe,E===sn?S.side=w.shadowSide!==null?w.shadowSide:w.side:S.side=w.shadowSide!==null?w.shadowSide:h[w.side],S.alphaMap=w.alphaMap,S.alphaTest=w.alphaTest,S.map=w.map,S.clipShadows=w.clipShadows,S.clippingPlanes=w.clippingPlanes,S.clipIntersection=w.clipIntersection,S.displacementMap=w.displacementMap,S.displacementScale=w.displacementScale,S.displacementBias=w.displacementBias,S.wireframeLinewidth=w.wireframeLinewidth,S.linewidth=w.linewidth,I.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const q=i.properties.get(S);q.light=I}return S}function y(T,w,I,E,S){if(T.visible===!1)return;if(T.layers.test(w.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&S===sn)&&(!T.frustumCulled||n.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,T.matrixWorld);const G=e.update(T),Y=T.material;if(Array.isArray(Y)){const ee=G.groups;for(let X=0,ne=ee.length;X<ne;X++){const W=ee[X],me=Y[W.materialIndex];if(me&&me.visible){const ve=g(T,me,E,S);T.onBeforeShadow(i,T,w,I,G,ve,W),i.renderBufferDirect(I,null,G,ve,T,W),T.onAfterShadow(i,T,w,I,G,ve,W)}}}else if(Y.visible){const ee=g(T,Y,E,S);T.onBeforeShadow(i,T,w,I,G,ee,null),i.renderBufferDirect(I,null,G,ee,T,null),T.onAfterShadow(i,T,w,I,G,ee,null)}}const q=T.children;for(let G=0,Y=q.length;G<Y;G++)y(q[G],w,I,E,S)}function C(T){T.target.removeEventListener("dispose",C);for(const I in l){const E=l[I],S=T.target.uuid;S in E&&(E[S].dispose(),delete E[S])}}}function yp(i){function e(){let P=!1;const ae=new ht;let $=null;const J=new ht(0,0,0,0);return{setMask:function(le){$!==le&&!P&&(i.colorMask(le,le,le,le),$=le)},setLocked:function(le){P=le},setClear:function(le,Pe,qe,rt,ft){ft===!0&&(le*=rt,Pe*=rt,qe*=rt),ae.set(le,Pe,qe,rt),J.equals(ae)===!1&&(i.clearColor(le,Pe,qe,rt),J.copy(ae))},reset:function(){P=!1,$=null,J.set(-1,0,0,0)}}}function t(){let P=!1,ae=null,$=null,J=null;return{setTest:function(le){le?U(i.DEPTH_TEST):H(i.DEPTH_TEST)},setMask:function(le){ae!==le&&!P&&(i.depthMask(le),ae=le)},setFunc:function(le){if($!==le){switch(le){case Ic:i.depthFunc(i.NEVER);break;case Uc:i.depthFunc(i.ALWAYS);break;case Nc:i.depthFunc(i.LESS);break;case xr:i.depthFunc(i.LEQUAL);break;case Fc:i.depthFunc(i.EQUAL);break;case Oc:i.depthFunc(i.GEQUAL);break;case Bc:i.depthFunc(i.GREATER);break;case zc:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}$=le}},setLocked:function(le){P=le},setClear:function(le){J!==le&&(i.clearDepth(le),J=le)},reset:function(){P=!1,ae=null,$=null,J=null}}}function n(){let P=!1,ae=null,$=null,J=null,le=null,Pe=null,qe=null,rt=null,ft=null;return{setTest:function(Ke){P||(Ke?U(i.STENCIL_TEST):H(i.STENCIL_TEST))},setMask:function(Ke){ae!==Ke&&!P&&(i.stencilMask(Ke),ae=Ke)},setFunc:function(Ke,Jt,qt){($!==Ke||J!==Jt||le!==qt)&&(i.stencilFunc(Ke,Jt,qt),$=Ke,J=Jt,le=qt)},setOp:function(Ke,Jt,qt){(Pe!==Ke||qe!==Jt||rt!==qt)&&(i.stencilOp(Ke,Jt,qt),Pe=Ke,qe=Jt,rt=qt)},setLocked:function(Ke){P=Ke},setClear:function(Ke){ft!==Ke&&(i.clearStencil(Ke),ft=Ke)},reset:function(){P=!1,ae=null,$=null,J=null,le=null,Pe=null,qe=null,rt=null,ft=null}}}const r=new e,s=new t,a=new n,o=new WeakMap,c=new WeakMap;let l={},u={},h=new WeakMap,p=[],f=null,_=!1,v=null,m=null,d=null,b=null,g=null,y=null,C=null,T=new Ve(0,0,0),w=0,I=!1,E=null,S=null,L=null,q=null,G=null;const Y=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let ee=!1,X=0;const ne=i.getParameter(i.VERSION);ne.indexOf("WebGL")!==-1?(X=parseFloat(/^WebGL (\d)/.exec(ne)[1]),ee=X>=1):ne.indexOf("OpenGL ES")!==-1&&(X=parseFloat(/^OpenGL ES (\d)/.exec(ne)[1]),ee=X>=2);let W=null,me={};const ve=i.getParameter(i.SCISSOR_BOX),be=i.getParameter(i.VIEWPORT),Ge=new ht().fromArray(ve),Ye=new ht().fromArray(be);function K(P,ae,$,J){const le=new Uint8Array(4),Pe=i.createTexture();i.bindTexture(P,Pe),i.texParameteri(P,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(P,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let qe=0;qe<$;qe++)P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY?i.texImage3D(ae,0,i.RGBA,1,1,J,0,i.RGBA,i.UNSIGNED_BYTE,le):i.texImage2D(ae+qe,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,le);return Pe}const te={};te[i.TEXTURE_2D]=K(i.TEXTURE_2D,i.TEXTURE_2D,1),te[i.TEXTURE_CUBE_MAP]=K(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),te[i.TEXTURE_2D_ARRAY]=K(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),te[i.TEXTURE_3D]=K(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),s.setClear(1),a.setClear(0),U(i.DEPTH_TEST),s.setFunc(xr),fe(!1),ge(ga),U(i.CULL_FACE),ce(Mn);function U(P){l[P]!==!0&&(i.enable(P),l[P]=!0)}function H(P){l[P]!==!1&&(i.disable(P),l[P]=!1)}function Q(P,ae){return u[P]!==ae?(i.bindFramebuffer(P,ae),u[P]=ae,P===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=ae),P===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=ae),!0):!1}function ie(P,ae){let $=p,J=!1;if(P){$=h.get(ae),$===void 0&&($=[],h.set(ae,$));const le=P.textures;if($.length!==le.length||$[0]!==i.COLOR_ATTACHMENT0){for(let Pe=0,qe=le.length;Pe<qe;Pe++)$[Pe]=i.COLOR_ATTACHMENT0+Pe;$.length=le.length,J=!0}}else $[0]!==i.BACK&&($[0]=i.BACK,J=!0);J&&i.drawBuffers($)}function de(P){return f!==P?(i.useProgram(P),f=P,!0):!1}const Ce={[Nn]:i.FUNC_ADD,[gc]:i.FUNC_SUBTRACT,[_c]:i.FUNC_REVERSE_SUBTRACT};Ce[vc]=i.MIN,Ce[xc]=i.MAX;const R={[Mc]:i.ZERO,[Sc]:i.ONE,[yc]:i.SRC_COLOR,[ds]:i.SRC_ALPHA,[Rc]:i.SRC_ALPHA_SATURATE,[Ac]:i.DST_COLOR,[bc]:i.DST_ALPHA,[Ec]:i.ONE_MINUS_SRC_COLOR,[fs]:i.ONE_MINUS_SRC_ALPHA,[wc]:i.ONE_MINUS_DST_COLOR,[Tc]:i.ONE_MINUS_DST_ALPHA,[Cc]:i.CONSTANT_COLOR,[Lc]:i.ONE_MINUS_CONSTANT_COLOR,[Pc]:i.CONSTANT_ALPHA,[Dc]:i.ONE_MINUS_CONSTANT_ALPHA};function ce(P,ae,$,J,le,Pe,qe,rt,ft,Ke){if(P===Mn){_===!0&&(H(i.BLEND),_=!1);return}if(_===!1&&(U(i.BLEND),_=!0),P!==mc){if(P!==v||Ke!==I){if((m!==Nn||g!==Nn)&&(i.blendEquation(i.FUNC_ADD),m=Nn,g=Nn),Ke)switch(P){case li:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case _a:i.blendFunc(i.ONE,i.ONE);break;case va:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case xa:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",P);break}else switch(P){case li:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case _a:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case va:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case xa:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",P);break}d=null,b=null,y=null,C=null,T.set(0,0,0),w=0,v=P,I=Ke}return}le=le||ae,Pe=Pe||$,qe=qe||J,(ae!==m||le!==g)&&(i.blendEquationSeparate(Ce[ae],Ce[le]),m=ae,g=le),($!==d||J!==b||Pe!==y||qe!==C)&&(i.blendFuncSeparate(R[$],R[J],R[Pe],R[qe]),d=$,b=J,y=Pe,C=qe),(rt.equals(T)===!1||ft!==w)&&(i.blendColor(rt.r,rt.g,rt.b,ft),T.copy(rt),w=ft),v=P,I=!1}function Le(P,ae){P.side===Dt?H(i.CULL_FACE):U(i.CULL_FACE);let $=P.side===At;ae&&($=!$),fe($),P.blending===li&&P.transparent===!1?ce(Mn):ce(P.blending,P.blendEquation,P.blendSrc,P.blendDst,P.blendEquationAlpha,P.blendSrcAlpha,P.blendDstAlpha,P.blendColor,P.blendAlpha,P.premultipliedAlpha),s.setFunc(P.depthFunc),s.setTest(P.depthTest),s.setMask(P.depthWrite),r.setMask(P.colorWrite);const J=P.stencilWrite;a.setTest(J),J&&(a.setMask(P.stencilWriteMask),a.setFunc(P.stencilFunc,P.stencilRef,P.stencilFuncMask),a.setOp(P.stencilFail,P.stencilZFail,P.stencilZPass)),pe(P.polygonOffset,P.polygonOffsetFactor,P.polygonOffsetUnits),P.alphaToCoverage===!0?U(i.SAMPLE_ALPHA_TO_COVERAGE):H(i.SAMPLE_ALPHA_TO_COVERAGE)}function fe(P){E!==P&&(P?i.frontFace(i.CW):i.frontFace(i.CCW),E=P)}function ge(P){P!==dc?(U(i.CULL_FACE),P!==S&&(P===ga?i.cullFace(i.BACK):P===fc?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):H(i.CULL_FACE),S=P}function Oe(P){P!==L&&(ee&&i.lineWidth(P),L=P)}function pe(P,ae,$){P?(U(i.POLYGON_OFFSET_FILL),(q!==ae||G!==$)&&(i.polygonOffset(ae,$),q=ae,G=$)):H(i.POLYGON_OFFSET_FILL)}function Te(P){P?U(i.SCISSOR_TEST):H(i.SCISSOR_TEST)}function A(P){P===void 0&&(P=i.TEXTURE0+Y-1),W!==P&&(i.activeTexture(P),W=P)}function x(P,ae,$){$===void 0&&(W===null?$=i.TEXTURE0+Y-1:$=W);let J=me[$];J===void 0&&(J={type:void 0,texture:void 0},me[$]=J),(J.type!==P||J.texture!==ae)&&(W!==$&&(i.activeTexture($),W=$),i.bindTexture(P,ae||te[P]),J.type=P,J.texture=ae)}function F(){const P=me[W];P!==void 0&&P.type!==void 0&&(i.bindTexture(P.type,null),P.type=void 0,P.texture=void 0)}function V(){try{i.compressedTexImage2D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function j(){try{i.compressedTexImage3D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Z(){try{i.texSubImage2D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Re(){try{i.texSubImage3D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function ue(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function xe(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Be(){try{i.texStorage2D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function se(){try{i.texStorage3D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Me(){try{i.texImage2D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Xe(){try{i.texImage3D.apply(i,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Ue(P){Ge.equals(P)===!1&&(i.scissor(P.x,P.y,P.z,P.w),Ge.copy(P))}function Se(P){Ye.equals(P)===!1&&(i.viewport(P.x,P.y,P.z,P.w),Ye.copy(P))}function Ne(P,ae){let $=c.get(ae);$===void 0&&($=new WeakMap,c.set(ae,$));let J=$.get(P);J===void 0&&(J=i.getUniformBlockIndex(ae,P.name),$.set(P,J))}function He(P,ae){const J=c.get(ae).get(P);o.get(ae)!==J&&(i.uniformBlockBinding(ae,J,P.__bindingPointIndex),o.set(ae,J))}function et(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),l={},W=null,me={},u={},h=new WeakMap,p=[],f=null,_=!1,v=null,m=null,d=null,b=null,g=null,y=null,C=null,T=new Ve(0,0,0),w=0,I=!1,E=null,S=null,L=null,q=null,G=null,Ge.set(0,0,i.canvas.width,i.canvas.height),Ye.set(0,0,i.canvas.width,i.canvas.height),r.reset(),s.reset(),a.reset()}return{buffers:{color:r,depth:s,stencil:a},enable:U,disable:H,bindFramebuffer:Q,drawBuffers:ie,useProgram:de,setBlending:ce,setMaterial:Le,setFlipSided:fe,setCullFace:ge,setLineWidth:Oe,setPolygonOffset:pe,setScissorTest:Te,activeTexture:A,bindTexture:x,unbindTexture:F,compressedTexImage2D:V,compressedTexImage3D:j,texImage2D:Me,texImage3D:Xe,updateUBOMapping:Ne,uniformBlockBinding:He,texStorage2D:Be,texStorage3D:se,texSubImage2D:Z,texSubImage3D:Re,compressedTexSubImage2D:ue,compressedTexSubImage3D:xe,scissor:Ue,viewport:Se,reset:et}}function fo(i,e,t,n){const r=Ep(n);switch(t){case Po:return i*e;case Io:return i*e;case Uo:return i*e*2;case No:return i*e/r.components*r.byteLength;case Js:return i*e/r.components*r.byteLength;case Fo:return i*e*2/r.components*r.byteLength;case Qs:return i*e*2/r.components*r.byteLength;case Do:return i*e*3/r.components*r.byteLength;case Bt:return i*e*4/r.components*r.byteLength;case ea:return i*e*4/r.components*r.byteLength;case dr:case fr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case pr:case mr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case xs:case Ss:return Math.max(i,16)*Math.max(e,8)/4;case vs:case Ms:return Math.max(i,8)*Math.max(e,8)/2;case ys:case Es:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case bs:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ts:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case As:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case ws:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Rs:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Cs:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Ls:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Ps:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Ds:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Is:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Us:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Ns:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Fs:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Os:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Bs:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case gr:case zs:case ks:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Oo:case Hs:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Gs:case Vs:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ep(i){switch(i){case ln:case Ro:return{byteLength:1,components:1};case Pi:case Co:case _i:return{byteLength:2,components:1};case $s:case Zs:return{byteLength:2,components:4};case Gn:case js:case an:return{byteLength:4,components:1};case Lo:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}function bp(i,e,t,n,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new We,u=new WeakMap;let h;const p=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(A,x){return f?new OffscreenCanvas(A,x):Ii("canvas")}function v(A,x,F){let V=1;const j=Te(A);if((j.width>F||j.height>F)&&(V=F/Math.max(j.width,j.height)),V<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const Z=Math.floor(V*j.width),Re=Math.floor(V*j.height);h===void 0&&(h=_(Z,Re));const ue=x?_(Z,Re):h;return ue.width=Z,ue.height=Re,ue.getContext("2d").drawImage(A,0,0,Z,Re),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+j.width+"x"+j.height+") to ("+Z+"x"+Re+")."),ue}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+j.width+"x"+j.height+")."),A;return A}function m(A){return A.generateMipmaps&&A.minFilter!==Ot&&A.minFilter!==bt}function d(A){i.generateMipmap(A)}function b(A,x,F,V,j=!1){if(A!==null){if(i[A]!==void 0)return i[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let Z=x;if(x===i.RED&&(F===i.FLOAT&&(Z=i.R32F),F===i.HALF_FLOAT&&(Z=i.R16F),F===i.UNSIGNED_BYTE&&(Z=i.R8)),x===i.RED_INTEGER&&(F===i.UNSIGNED_BYTE&&(Z=i.R8UI),F===i.UNSIGNED_SHORT&&(Z=i.R16UI),F===i.UNSIGNED_INT&&(Z=i.R32UI),F===i.BYTE&&(Z=i.R8I),F===i.SHORT&&(Z=i.R16I),F===i.INT&&(Z=i.R32I)),x===i.RG&&(F===i.FLOAT&&(Z=i.RG32F),F===i.HALF_FLOAT&&(Z=i.RG16F),F===i.UNSIGNED_BYTE&&(Z=i.RG8)),x===i.RG_INTEGER&&(F===i.UNSIGNED_BYTE&&(Z=i.RG8UI),F===i.UNSIGNED_SHORT&&(Z=i.RG16UI),F===i.UNSIGNED_INT&&(Z=i.RG32UI),F===i.BYTE&&(Z=i.RG8I),F===i.SHORT&&(Z=i.RG16I),F===i.INT&&(Z=i.RG32I)),x===i.RGB&&F===i.UNSIGNED_INT_5_9_9_9_REV&&(Z=i.RGB9_E5),x===i.RGBA){const Re=j?Mr:Je.getTransfer(V);F===i.FLOAT&&(Z=i.RGBA32F),F===i.HALF_FLOAT&&(Z=i.RGBA16F),F===i.UNSIGNED_BYTE&&(Z=Re===Qe?i.SRGB8_ALPHA8:i.RGBA8),F===i.UNSIGNED_SHORT_4_4_4_4&&(Z=i.RGBA4),F===i.UNSIGNED_SHORT_5_5_5_1&&(Z=i.RGB5_A1)}return(Z===i.R16F||Z===i.R32F||Z===i.RG16F||Z===i.RG32F||Z===i.RGBA16F||Z===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function g(A,x){let F;return A?x===null||x===Gn||x===pi?F=i.DEPTH24_STENCIL8:x===an?F=i.DEPTH32F_STENCIL8:x===Pi&&(F=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===Gn||x===pi?F=i.DEPTH_COMPONENT24:x===an?F=i.DEPTH_COMPONENT32F:x===Pi&&(F=i.DEPTH_COMPONENT16),F}function y(A,x){return m(A)===!0||A.isFramebufferTexture&&A.minFilter!==Ot&&A.minFilter!==bt?Math.log2(Math.max(x.width,x.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?x.mipmaps.length:1}function C(A){const x=A.target;x.removeEventListener("dispose",C),w(x),x.isVideoTexture&&u.delete(x)}function T(A){const x=A.target;x.removeEventListener("dispose",T),E(x)}function w(A){const x=n.get(A);if(x.__webglInit===void 0)return;const F=A.source,V=p.get(F);if(V){const j=V[x.__cacheKey];j.usedTimes--,j.usedTimes===0&&I(A),Object.keys(V).length===0&&p.delete(F)}n.remove(A)}function I(A){const x=n.get(A);i.deleteTexture(x.__webglTexture);const F=A.source,V=p.get(F);delete V[x.__cacheKey],a.memory.textures--}function E(A){const x=n.get(A);if(A.depthTexture&&A.depthTexture.dispose(),A.isWebGLCubeRenderTarget)for(let V=0;V<6;V++){if(Array.isArray(x.__webglFramebuffer[V]))for(let j=0;j<x.__webglFramebuffer[V].length;j++)i.deleteFramebuffer(x.__webglFramebuffer[V][j]);else i.deleteFramebuffer(x.__webglFramebuffer[V]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[V])}else{if(Array.isArray(x.__webglFramebuffer))for(let V=0;V<x.__webglFramebuffer.length;V++)i.deleteFramebuffer(x.__webglFramebuffer[V]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let V=0;V<x.__webglColorRenderbuffer.length;V++)x.__webglColorRenderbuffer[V]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[V]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const F=A.textures;for(let V=0,j=F.length;V<j;V++){const Z=n.get(F[V]);Z.__webglTexture&&(i.deleteTexture(Z.__webglTexture),a.memory.textures--),n.remove(F[V])}n.remove(A)}let S=0;function L(){S=0}function q(){const A=S;return A>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+r.maxTextures),S+=1,A}function G(A){const x=[];return x.push(A.wrapS),x.push(A.wrapT),x.push(A.wrapR||0),x.push(A.magFilter),x.push(A.minFilter),x.push(A.anisotropy),x.push(A.internalFormat),x.push(A.format),x.push(A.type),x.push(A.generateMipmaps),x.push(A.premultiplyAlpha),x.push(A.flipY),x.push(A.unpackAlignment),x.push(A.colorSpace),x.join()}function Y(A,x){const F=n.get(A);if(A.isVideoTexture&&Oe(A),A.isRenderTargetTexture===!1&&A.version>0&&F.__version!==A.version){const V=A.image;if(V===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(V.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Ye(F,A,x);return}}t.bindTexture(i.TEXTURE_2D,F.__webglTexture,i.TEXTURE0+x)}function ee(A,x){const F=n.get(A);if(A.version>0&&F.__version!==A.version){Ye(F,A,x);return}t.bindTexture(i.TEXTURE_2D_ARRAY,F.__webglTexture,i.TEXTURE0+x)}function X(A,x){const F=n.get(A);if(A.version>0&&F.__version!==A.version){Ye(F,A,x);return}t.bindTexture(i.TEXTURE_3D,F.__webglTexture,i.TEXTURE0+x)}function ne(A,x){const F=n.get(A);if(A.version>0&&F.__version!==A.version){K(F,A,x);return}t.bindTexture(i.TEXTURE_CUBE_MAP,F.__webglTexture,i.TEXTURE0+x)}const W={[gs]:i.REPEAT,[zn]:i.CLAMP_TO_EDGE,[_s]:i.MIRRORED_REPEAT},me={[Ot]:i.NEAREST,[jc]:i.NEAREST_MIPMAP_NEAREST,[Hi]:i.NEAREST_MIPMAP_LINEAR,[bt]:i.LINEAR,[Or]:i.LINEAR_MIPMAP_NEAREST,[kn]:i.LINEAR_MIPMAP_LINEAR},ve={[el]:i.NEVER,[al]:i.ALWAYS,[tl]:i.LESS,[Bo]:i.LEQUAL,[nl]:i.EQUAL,[sl]:i.GEQUAL,[il]:i.GREATER,[rl]:i.NOTEQUAL};function be(A,x){if(x.type===an&&e.has("OES_texture_float_linear")===!1&&(x.magFilter===bt||x.magFilter===Or||x.magFilter===Hi||x.magFilter===kn||x.minFilter===bt||x.minFilter===Or||x.minFilter===Hi||x.minFilter===kn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,W[x.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,W[x.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,W[x.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,me[x.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,me[x.minFilter]),x.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,ve[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===Ot||x.minFilter!==Hi&&x.minFilter!==kn||x.type===an&&e.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){const F=e.get("EXT_texture_filter_anisotropic");i.texParameterf(A,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,r.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function Ge(A,x){let F=!1;A.__webglInit===void 0&&(A.__webglInit=!0,x.addEventListener("dispose",C));const V=x.source;let j=p.get(V);j===void 0&&(j={},p.set(V,j));const Z=G(x);if(Z!==A.__cacheKey){j[Z]===void 0&&(j[Z]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,F=!0),j[Z].usedTimes++;const Re=j[A.__cacheKey];Re!==void 0&&(j[A.__cacheKey].usedTimes--,Re.usedTimes===0&&I(x)),A.__cacheKey=Z,A.__webglTexture=j[Z].texture}return F}function Ye(A,x,F){let V=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(V=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&(V=i.TEXTURE_3D);const j=Ge(A,x),Z=x.source;t.bindTexture(V,A.__webglTexture,i.TEXTURE0+F);const Re=n.get(Z);if(Z.version!==Re.__version||j===!0){t.activeTexture(i.TEXTURE0+F);const ue=Je.getPrimaries(Je.workingColorSpace),xe=x.colorSpace===xn?null:Je.getPrimaries(x.colorSpace),Be=x.colorSpace===xn||ue===xe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Be);let se=v(x.image,!1,r.maxTextureSize);se=pe(x,se);const Me=s.convert(x.format,x.colorSpace),Xe=s.convert(x.type);let Ue=b(x.internalFormat,Me,Xe,x.colorSpace,x.isVideoTexture);be(V,x);let Se;const Ne=x.mipmaps,He=x.isVideoTexture!==!0,et=Re.__version===void 0||j===!0,P=Z.dataReady,ae=y(x,se);if(x.isDepthTexture)Ue=g(x.format===mi,x.type),et&&(He?t.texStorage2D(i.TEXTURE_2D,1,Ue,se.width,se.height):t.texImage2D(i.TEXTURE_2D,0,Ue,se.width,se.height,0,Me,Xe,null));else if(x.isDataTexture)if(Ne.length>0){He&&et&&t.texStorage2D(i.TEXTURE_2D,ae,Ue,Ne[0].width,Ne[0].height);for(let $=0,J=Ne.length;$<J;$++)Se=Ne[$],He?P&&t.texSubImage2D(i.TEXTURE_2D,$,0,0,Se.width,Se.height,Me,Xe,Se.data):t.texImage2D(i.TEXTURE_2D,$,Ue,Se.width,Se.height,0,Me,Xe,Se.data);x.generateMipmaps=!1}else He?(et&&t.texStorage2D(i.TEXTURE_2D,ae,Ue,se.width,se.height),P&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,se.width,se.height,Me,Xe,se.data)):t.texImage2D(i.TEXTURE_2D,0,Ue,se.width,se.height,0,Me,Xe,se.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){He&&et&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ae,Ue,Ne[0].width,Ne[0].height,se.depth);for(let $=0,J=Ne.length;$<J;$++)if(Se=Ne[$],x.format!==Bt)if(Me!==null)if(He){if(P)if(x.layerUpdates.size>0){const le=fo(Se.width,Se.height,x.format,x.type);for(const Pe of x.layerUpdates){const qe=Se.data.subarray(Pe*le/Se.data.BYTES_PER_ELEMENT,(Pe+1)*le/Se.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,Pe,Se.width,Se.height,1,Me,qe,0,0)}x.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,0,Se.width,Se.height,se.depth,Me,Se.data,0,0)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,$,Ue,Se.width,Se.height,se.depth,0,Se.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else He?P&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,0,Se.width,Se.height,se.depth,Me,Xe,Se.data):t.texImage3D(i.TEXTURE_2D_ARRAY,$,Ue,Se.width,Se.height,se.depth,0,Me,Xe,Se.data)}else{He&&et&&t.texStorage2D(i.TEXTURE_2D,ae,Ue,Ne[0].width,Ne[0].height);for(let $=0,J=Ne.length;$<J;$++)Se=Ne[$],x.format!==Bt?Me!==null?He?P&&t.compressedTexSubImage2D(i.TEXTURE_2D,$,0,0,Se.width,Se.height,Me,Se.data):t.compressedTexImage2D(i.TEXTURE_2D,$,Ue,Se.width,Se.height,0,Se.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):He?P&&t.texSubImage2D(i.TEXTURE_2D,$,0,0,Se.width,Se.height,Me,Xe,Se.data):t.texImage2D(i.TEXTURE_2D,$,Ue,Se.width,Se.height,0,Me,Xe,Se.data)}else if(x.isDataArrayTexture)if(He){if(et&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ae,Ue,se.width,se.height,se.depth),P)if(x.layerUpdates.size>0){const $=fo(se.width,se.height,x.format,x.type);for(const J of x.layerUpdates){const le=se.data.subarray(J*$/se.data.BYTES_PER_ELEMENT,(J+1)*$/se.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,J,se.width,se.height,1,Me,Xe,le)}x.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,se.width,se.height,se.depth,Me,Xe,se.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Ue,se.width,se.height,se.depth,0,Me,Xe,se.data);else if(x.isData3DTexture)He?(et&&t.texStorage3D(i.TEXTURE_3D,ae,Ue,se.width,se.height,se.depth),P&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,se.width,se.height,se.depth,Me,Xe,se.data)):t.texImage3D(i.TEXTURE_3D,0,Ue,se.width,se.height,se.depth,0,Me,Xe,se.data);else if(x.isFramebufferTexture){if(et)if(He)t.texStorage2D(i.TEXTURE_2D,ae,Ue,se.width,se.height);else{let $=se.width,J=se.height;for(let le=0;le<ae;le++)t.texImage2D(i.TEXTURE_2D,le,Ue,$,J,0,Me,Xe,null),$>>=1,J>>=1}}else if(Ne.length>0){if(He&&et){const $=Te(Ne[0]);t.texStorage2D(i.TEXTURE_2D,ae,Ue,$.width,$.height)}for(let $=0,J=Ne.length;$<J;$++)Se=Ne[$],He?P&&t.texSubImage2D(i.TEXTURE_2D,$,0,0,Me,Xe,Se):t.texImage2D(i.TEXTURE_2D,$,Ue,Me,Xe,Se);x.generateMipmaps=!1}else if(He){if(et){const $=Te(se);t.texStorage2D(i.TEXTURE_2D,ae,Ue,$.width,$.height)}P&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Me,Xe,se)}else t.texImage2D(i.TEXTURE_2D,0,Ue,Me,Xe,se);m(x)&&d(V),Re.__version=Z.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function K(A,x,F){if(x.image.length!==6)return;const V=Ge(A,x),j=x.source;t.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+F);const Z=n.get(j);if(j.version!==Z.__version||V===!0){t.activeTexture(i.TEXTURE0+F);const Re=Je.getPrimaries(Je.workingColorSpace),ue=x.colorSpace===xn?null:Je.getPrimaries(x.colorSpace),xe=x.colorSpace===xn||Re===ue?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,xe);const Be=x.isCompressedTexture||x.image[0].isCompressedTexture,se=x.image[0]&&x.image[0].isDataTexture,Me=[];for(let J=0;J<6;J++)!Be&&!se?Me[J]=v(x.image[J],!0,r.maxCubemapSize):Me[J]=se?x.image[J].image:x.image[J],Me[J]=pe(x,Me[J]);const Xe=Me[0],Ue=s.convert(x.format,x.colorSpace),Se=s.convert(x.type),Ne=b(x.internalFormat,Ue,Se,x.colorSpace),He=x.isVideoTexture!==!0,et=Z.__version===void 0||V===!0,P=j.dataReady;let ae=y(x,Xe);be(i.TEXTURE_CUBE_MAP,x);let $;if(Be){He&&et&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ae,Ne,Xe.width,Xe.height);for(let J=0;J<6;J++){$=Me[J].mipmaps;for(let le=0;le<$.length;le++){const Pe=$[le];x.format!==Bt?Ue!==null?He?P&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le,0,0,Pe.width,Pe.height,Ue,Pe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le,Ne,Pe.width,Pe.height,0,Pe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):He?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le,0,0,Pe.width,Pe.height,Ue,Se,Pe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le,Ne,Pe.width,Pe.height,0,Ue,Se,Pe.data)}}}else{if($=x.mipmaps,He&&et){$.length>0&&ae++;const J=Te(Me[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ae,Ne,J.width,J.height)}for(let J=0;J<6;J++)if(se){He?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,Me[J].width,Me[J].height,Ue,Se,Me[J].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,Ne,Me[J].width,Me[J].height,0,Ue,Se,Me[J].data);for(let le=0;le<$.length;le++){const qe=$[le].image[J].image;He?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le+1,0,0,qe.width,qe.height,Ue,Se,qe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le+1,Ne,qe.width,qe.height,0,Ue,Se,qe.data)}}else{He?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,Ue,Se,Me[J]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,Ne,Ue,Se,Me[J]);for(let le=0;le<$.length;le++){const Pe=$[le];He?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le+1,0,0,Ue,Se,Pe.image[J]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,le+1,Ne,Ue,Se,Pe.image[J])}}}m(x)&&d(i.TEXTURE_CUBE_MAP),Z.__version=j.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function te(A,x,F,V,j,Z){const Re=s.convert(F.format,F.colorSpace),ue=s.convert(F.type),xe=b(F.internalFormat,Re,ue,F.colorSpace);if(!n.get(x).__hasExternalTextures){const se=Math.max(1,x.width>>Z),Me=Math.max(1,x.height>>Z);j===i.TEXTURE_3D||j===i.TEXTURE_2D_ARRAY?t.texImage3D(j,Z,xe,se,Me,x.depth,0,Re,ue,null):t.texImage2D(j,Z,xe,se,Me,0,Re,ue,null)}t.bindFramebuffer(i.FRAMEBUFFER,A),ge(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,V,j,n.get(F).__webglTexture,0,fe(x)):(j===i.TEXTURE_2D||j>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&j<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,V,j,n.get(F).__webglTexture,Z),t.bindFramebuffer(i.FRAMEBUFFER,null)}function U(A,x,F){if(i.bindRenderbuffer(i.RENDERBUFFER,A),x.depthBuffer){const V=x.depthTexture,j=V&&V.isDepthTexture?V.type:null,Z=g(x.stencilBuffer,j),Re=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ue=fe(x);ge(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ue,Z,x.width,x.height):F?i.renderbufferStorageMultisample(i.RENDERBUFFER,ue,Z,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,Z,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Re,i.RENDERBUFFER,A)}else{const V=x.textures;for(let j=0;j<V.length;j++){const Z=V[j],Re=s.convert(Z.format,Z.colorSpace),ue=s.convert(Z.type),xe=b(Z.internalFormat,Re,ue,Z.colorSpace),Be=fe(x);F&&ge(x)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Be,xe,x.width,x.height):ge(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Be,xe,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,xe,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function H(A,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,A),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(x.depthTexture).__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),Y(x.depthTexture,0);const V=n.get(x.depthTexture).__webglTexture,j=fe(x);if(x.depthTexture.format===ui)ge(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,V,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,V,0);else if(x.depthTexture.format===mi)ge(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,V,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,V,0);else throw new Error("Unknown depthTexture format")}function Q(A){const x=n.get(A),F=A.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==A.depthTexture){const V=A.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),V){const j=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,V.removeEventListener("dispose",j)};V.addEventListener("dispose",j),x.__depthDisposeCallback=j}x.__boundDepthTexture=V}if(A.depthTexture&&!x.__autoAllocateDepthBuffer){if(F)throw new Error("target.depthTexture not supported in Cube render targets");H(x.__webglFramebuffer,A)}else if(F){x.__webglDepthbuffer=[];for(let V=0;V<6;V++)if(t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[V]),x.__webglDepthbuffer[V]===void 0)x.__webglDepthbuffer[V]=i.createRenderbuffer(),U(x.__webglDepthbuffer[V],A,!1);else{const j=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Z=x.__webglDepthbuffer[V];i.bindRenderbuffer(i.RENDERBUFFER,Z),i.framebufferRenderbuffer(i.FRAMEBUFFER,j,i.RENDERBUFFER,Z)}}else if(t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),U(x.__webglDepthbuffer,A,!1);else{const V=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,j=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,j),i.framebufferRenderbuffer(i.FRAMEBUFFER,V,i.RENDERBUFFER,j)}t.bindFramebuffer(i.FRAMEBUFFER,null)}function ie(A,x,F){const V=n.get(A);x!==void 0&&te(V.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),F!==void 0&&Q(A)}function de(A){const x=A.texture,F=n.get(A),V=n.get(x);A.addEventListener("dispose",T);const j=A.textures,Z=A.isWebGLCubeRenderTarget===!0,Re=j.length>1;if(Re||(V.__webglTexture===void 0&&(V.__webglTexture=i.createTexture()),V.__version=x.version,a.memory.textures++),Z){F.__webglFramebuffer=[];for(let ue=0;ue<6;ue++)if(x.mipmaps&&x.mipmaps.length>0){F.__webglFramebuffer[ue]=[];for(let xe=0;xe<x.mipmaps.length;xe++)F.__webglFramebuffer[ue][xe]=i.createFramebuffer()}else F.__webglFramebuffer[ue]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){F.__webglFramebuffer=[];for(let ue=0;ue<x.mipmaps.length;ue++)F.__webglFramebuffer[ue]=i.createFramebuffer()}else F.__webglFramebuffer=i.createFramebuffer();if(Re)for(let ue=0,xe=j.length;ue<xe;ue++){const Be=n.get(j[ue]);Be.__webglTexture===void 0&&(Be.__webglTexture=i.createTexture(),a.memory.textures++)}if(A.samples>0&&ge(A)===!1){F.__webglMultisampledFramebuffer=i.createFramebuffer(),F.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let ue=0;ue<j.length;ue++){const xe=j[ue];F.__webglColorRenderbuffer[ue]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,F.__webglColorRenderbuffer[ue]);const Be=s.convert(xe.format,xe.colorSpace),se=s.convert(xe.type),Me=b(xe.internalFormat,Be,se,xe.colorSpace,A.isXRRenderTarget===!0),Xe=fe(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,Xe,Me,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.RENDERBUFFER,F.__webglColorRenderbuffer[ue])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(F.__webglDepthRenderbuffer=i.createRenderbuffer(),U(F.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Z){t.bindTexture(i.TEXTURE_CUBE_MAP,V.__webglTexture),be(i.TEXTURE_CUBE_MAP,x);for(let ue=0;ue<6;ue++)if(x.mipmaps&&x.mipmaps.length>0)for(let xe=0;xe<x.mipmaps.length;xe++)te(F.__webglFramebuffer[ue][xe],A,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ue,xe);else te(F.__webglFramebuffer[ue],A,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ue,0);m(x)&&d(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Re){for(let ue=0,xe=j.length;ue<xe;ue++){const Be=j[ue],se=n.get(Be);t.bindTexture(i.TEXTURE_2D,se.__webglTexture),be(i.TEXTURE_2D,Be),te(F.__webglFramebuffer,A,Be,i.COLOR_ATTACHMENT0+ue,i.TEXTURE_2D,0),m(Be)&&d(i.TEXTURE_2D)}t.unbindTexture()}else{let ue=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(ue=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ue,V.__webglTexture),be(ue,x),x.mipmaps&&x.mipmaps.length>0)for(let xe=0;xe<x.mipmaps.length;xe++)te(F.__webglFramebuffer[xe],A,x,i.COLOR_ATTACHMENT0,ue,xe);else te(F.__webglFramebuffer,A,x,i.COLOR_ATTACHMENT0,ue,0);m(x)&&d(ue),t.unbindTexture()}A.depthBuffer&&Q(A)}function Ce(A){const x=A.textures;for(let F=0,V=x.length;F<V;F++){const j=x[F];if(m(j)){const Z=A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:i.TEXTURE_2D,Re=n.get(j).__webglTexture;t.bindTexture(Z,Re),d(Z),t.unbindTexture()}}}const R=[],ce=[];function Le(A){if(A.samples>0){if(ge(A)===!1){const x=A.textures,F=A.width,V=A.height;let j=i.COLOR_BUFFER_BIT;const Z=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Re=n.get(A),ue=x.length>1;if(ue)for(let xe=0;xe<x.length;xe++)t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let xe=0;xe<x.length;xe++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(j|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(j|=i.STENCIL_BUFFER_BIT)),ue){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Re.__webglColorRenderbuffer[xe]);const Be=n.get(x[xe]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Be,0)}i.blitFramebuffer(0,0,F,V,0,0,F,V,j,i.NEAREST),c===!0&&(R.length=0,ce.length=0,R.push(i.COLOR_ATTACHMENT0+xe),A.depthBuffer&&A.resolveDepthBuffer===!1&&(R.push(Z),ce.push(Z),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,ce)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,R))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ue)for(let xe=0;xe<x.length;xe++){t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.RENDERBUFFER,Re.__webglColorRenderbuffer[xe]);const Be=n.get(x[xe]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.TEXTURE_2D,Be,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&c){const x=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function fe(A){return Math.min(r.maxSamples,A.samples)}function ge(A){const x=n.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function Oe(A){const x=a.render.frame;u.get(A)!==x&&(u.set(A,x),A.update())}function pe(A,x){const F=A.colorSpace,V=A.format,j=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||F!==Tn&&F!==xn&&(Je.getTransfer(F)===Qe?(V!==Bt||j!==ln)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",F)),x}function Te(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(l.width=A.naturalWidth||A.width,l.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(l.width=A.displayWidth,l.height=A.displayHeight):(l.width=A.width,l.height=A.height),l}this.allocateTextureUnit=q,this.resetTextureUnits=L,this.setTexture2D=Y,this.setTexture2DArray=ee,this.setTexture3D=X,this.setTextureCube=ne,this.rebindTextures=ie,this.setupRenderTarget=de,this.updateRenderTargetMipmap=Ce,this.updateMultisampleRenderTarget=Le,this.setupDepthRenderbuffer=Q,this.setupFrameBufferTexture=te,this.useMultisampledRTT=ge}function Tp(i,e){function t(n,r=xn){let s;const a=Je.getTransfer(r);if(n===ln)return i.UNSIGNED_BYTE;if(n===$s)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Zs)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Lo)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Ro)return i.BYTE;if(n===Co)return i.SHORT;if(n===Pi)return i.UNSIGNED_SHORT;if(n===js)return i.INT;if(n===Gn)return i.UNSIGNED_INT;if(n===an)return i.FLOAT;if(n===_i)return i.HALF_FLOAT;if(n===Po)return i.ALPHA;if(n===Do)return i.RGB;if(n===Bt)return i.RGBA;if(n===Io)return i.LUMINANCE;if(n===Uo)return i.LUMINANCE_ALPHA;if(n===ui)return i.DEPTH_COMPONENT;if(n===mi)return i.DEPTH_STENCIL;if(n===No)return i.RED;if(n===Js)return i.RED_INTEGER;if(n===Fo)return i.RG;if(n===Qs)return i.RG_INTEGER;if(n===ea)return i.RGBA_INTEGER;if(n===dr||n===fr||n===pr||n===mr)if(a===Qe)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===dr)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===fr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===pr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===mr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===dr)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===fr)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===pr)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===mr)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===vs||n===xs||n===Ms||n===Ss)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===vs)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===xs)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ms)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ss)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===ys||n===Es||n===bs)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===ys||n===Es)return a===Qe?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===bs)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Ts||n===As||n===ws||n===Rs||n===Cs||n===Ls||n===Ps||n===Ds||n===Is||n===Us||n===Ns||n===Fs||n===Os||n===Bs)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===Ts)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===As)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ws)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Rs)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Cs)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ls)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ps)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ds)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Is)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Us)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ns)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Fs)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Os)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Bs)return a===Qe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===gr||n===zs||n===ks)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===gr)return a===Qe?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===zs)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ks)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Oo||n===Hs||n===Gs||n===Vs)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===gr)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Hs)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Gs)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Vs)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===pi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}class Ap extends Wt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class cn extends wt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const wp={type:"move"};class cs{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new cn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new cn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new cn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,a=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(const v of e.hand.values()){const m=t.getJointPose(v,n),d=this._getHandJoint(l,v);m!==null&&(d.matrix.fromArray(m.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,d.jointRadius=m.radius),d.visible=m!==null}const u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],p=u.position.distanceTo(h.position),f=.02,_=.005;l.inputState.pinching&&p>f+_?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&p<=f-_&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(wp)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new cn;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const Rp=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Cp=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Lp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){const r=new mt,s=e.properties.get(r);s.__webglTexture=t.texture,(t.depthNear!=n.depthNear||t.depthFar!=n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new hn({vertexShader:Rp,fragmentShader:Cp,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new dt(new vt(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Pp extends vi{constructor(e,t){super();const n=this;let r=null,s=1,a=null,o="local-floor",c=1,l=null,u=null,h=null,p=null,f=null,_=null;const v=new Lp,m=t.getContextAttributes();let d=null,b=null;const g=[],y=[],C=new We;let T=null;const w=new Wt;w.layers.enable(1),w.viewport=new ht;const I=new Wt;I.layers.enable(2),I.viewport=new ht;const E=[w,I],S=new Ap;S.layers.enable(1),S.layers.enable(2);let L=null,q=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let te=g[K];return te===void 0&&(te=new cs,g[K]=te),te.getTargetRaySpace()},this.getControllerGrip=function(K){let te=g[K];return te===void 0&&(te=new cs,g[K]=te),te.getGripSpace()},this.getHand=function(K){let te=g[K];return te===void 0&&(te=new cs,g[K]=te),te.getHandSpace()};function G(K){const te=y.indexOf(K.inputSource);if(te===-1)return;const U=g[te];U!==void 0&&(U.update(K.inputSource,K.frame,l||a),U.dispatchEvent({type:K.type,data:K.inputSource}))}function Y(){r.removeEventListener("select",G),r.removeEventListener("selectstart",G),r.removeEventListener("selectend",G),r.removeEventListener("squeeze",G),r.removeEventListener("squeezestart",G),r.removeEventListener("squeezeend",G),r.removeEventListener("end",Y),r.removeEventListener("inputsourceschange",ee);for(let K=0;K<g.length;K++){const te=y[K];te!==null&&(y[K]=null,g[K].disconnect(te))}L=null,q=null,v.reset(),e.setRenderTarget(d),f=null,p=null,h=null,r=null,b=null,Ye.stop(),n.isPresenting=!1,e.setPixelRatio(T),e.setSize(C.width,C.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){s=K,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(K){l=K},this.getBaseLayer=function(){return p!==null?p:f},this.getBinding=function(){return h},this.getFrame=function(){return _},this.getSession=function(){return r},this.setSession=async function(K){if(r=K,r!==null){if(d=e.getRenderTarget(),r.addEventListener("select",G),r.addEventListener("selectstart",G),r.addEventListener("selectend",G),r.addEventListener("squeeze",G),r.addEventListener("squeezestart",G),r.addEventListener("squeezeend",G),r.addEventListener("end",Y),r.addEventListener("inputsourceschange",ee),m.xrCompatible!==!0&&await t.makeXRCompatible(),T=e.getPixelRatio(),e.getSize(C),r.renderState.layers===void 0){const te={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,t,te),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),b=new En(f.framebufferWidth,f.framebufferHeight,{format:Bt,type:ln,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let te=null,U=null,H=null;m.depth&&(H=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,te=m.stencil?mi:ui,U=m.stencil?pi:Gn);const Q={colorFormat:t.RGBA8,depthFormat:H,scaleFactor:s};h=new XRWebGLBinding(r,t),p=h.createProjectionLayer(Q),r.updateRenderState({layers:[p]}),e.setPixelRatio(1),e.setSize(p.textureWidth,p.textureHeight,!1),b=new En(p.textureWidth,p.textureHeight,{format:Bt,type:ln,depthTexture:new $o(p.textureWidth,p.textureHeight,U,void 0,void 0,void 0,void 0,void 0,void 0,te),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(o),Ye.setContext(r),Ye.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return v.getDepthTexture()};function ee(K){for(let te=0;te<K.removed.length;te++){const U=K.removed[te],H=y.indexOf(U);H>=0&&(y[H]=null,g[H].disconnect(U))}for(let te=0;te<K.added.length;te++){const U=K.added[te];let H=y.indexOf(U);if(H===-1){for(let ie=0;ie<g.length;ie++)if(ie>=y.length){y.push(U),H=ie;break}else if(y[ie]===null){y[ie]=U,H=ie;break}if(H===-1)break}const Q=g[H];Q&&Q.connect(U)}}const X=new O,ne=new O;function W(K,te,U){X.setFromMatrixPosition(te.matrixWorld),ne.setFromMatrixPosition(U.matrixWorld);const H=X.distanceTo(ne),Q=te.projectionMatrix.elements,ie=U.projectionMatrix.elements,de=Q[14]/(Q[10]-1),Ce=Q[14]/(Q[10]+1),R=(Q[9]+1)/Q[5],ce=(Q[9]-1)/Q[5],Le=(Q[8]-1)/Q[0],fe=(ie[8]+1)/ie[0],ge=de*Le,Oe=de*fe,pe=H/(-Le+fe),Te=pe*-Le;if(te.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(Te),K.translateZ(pe),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),Q[10]===-1)K.projectionMatrix.copy(te.projectionMatrix),K.projectionMatrixInverse.copy(te.projectionMatrixInverse);else{const A=de+pe,x=Ce+pe,F=ge-Te,V=Oe+(H-Te),j=R*Ce/x*A,Z=ce*Ce/x*A;K.projectionMatrix.makePerspective(F,V,j,Z,A,x),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function me(K,te){te===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(te.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(r===null)return;let te=K.near,U=K.far;v.texture!==null&&(v.depthNear>0&&(te=v.depthNear),v.depthFar>0&&(U=v.depthFar)),S.near=I.near=w.near=te,S.far=I.far=w.far=U,(L!==S.near||q!==S.far)&&(r.updateRenderState({depthNear:S.near,depthFar:S.far}),L=S.near,q=S.far);const H=K.parent,Q=S.cameras;me(S,H);for(let ie=0;ie<Q.length;ie++)me(Q[ie],H);Q.length===2?W(S,w,I):S.projectionMatrix.copy(w.projectionMatrix),ve(K,S,H)};function ve(K,te,U){U===null?K.matrix.copy(te.matrixWorld):(K.matrix.copy(U.matrixWorld),K.matrix.invert(),K.matrix.multiply(te.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(te.projectionMatrix),K.projectionMatrixInverse.copy(te.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Di*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(p===null&&f===null))return c},this.setFoveation=function(K){c=K,p!==null&&(p.fixedFoveation=K),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=K)},this.hasDepthSensing=function(){return v.texture!==null},this.getDepthSensingMesh=function(){return v.getMesh(S)};let be=null;function Ge(K,te){if(u=te.getViewerPose(l||a),_=te,u!==null){const U=u.views;f!==null&&(e.setRenderTargetFramebuffer(b,f.framebuffer),e.setRenderTarget(b));let H=!1;U.length!==S.cameras.length&&(S.cameras.length=0,H=!0);for(let ie=0;ie<U.length;ie++){const de=U[ie];let Ce=null;if(f!==null)Ce=f.getViewport(de);else{const ce=h.getViewSubImage(p,de);Ce=ce.viewport,ie===0&&(e.setRenderTargetTextures(b,ce.colorTexture,p.ignoreDepthValues?void 0:ce.depthStencilTexture),e.setRenderTarget(b))}let R=E[ie];R===void 0&&(R=new Wt,R.layers.enable(ie),R.viewport=new ht,E[ie]=R),R.matrix.fromArray(de.transform.matrix),R.matrix.decompose(R.position,R.quaternion,R.scale),R.projectionMatrix.fromArray(de.projectionMatrix),R.projectionMatrixInverse.copy(R.projectionMatrix).invert(),R.viewport.set(Ce.x,Ce.y,Ce.width,Ce.height),ie===0&&(S.matrix.copy(R.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),H===!0&&S.cameras.push(R)}const Q=r.enabledFeatures;if(Q&&Q.includes("depth-sensing")){const ie=h.getDepthInformation(U[0]);ie&&ie.isValid&&ie.texture&&v.init(e,ie,r.renderState)}}for(let U=0;U<g.length;U++){const H=y[U],Q=g[U];H!==null&&Q!==void 0&&Q.update(H,te,l||a)}be&&be(K,te),te.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:te}),_=null}const Ye=new jo;Ye.setAnimationLoop(Ge),this.setAnimationLoop=function(K){be=K},this.dispose=function(){}}}const Dn=new un,Dp=new it;function Ip(i,e){function t(m,d){m.matrixAutoUpdate===!0&&m.updateMatrix(),d.value.copy(m.matrix)}function n(m,d){d.color.getRGB(m.fogColor.value,Xo(i)),d.isFog?(m.fogNear.value=d.near,m.fogFar.value=d.far):d.isFogExp2&&(m.fogDensity.value=d.density)}function r(m,d,b,g,y){d.isMeshBasicMaterial||d.isMeshLambertMaterial?s(m,d):d.isMeshToonMaterial?(s(m,d),h(m,d)):d.isMeshPhongMaterial?(s(m,d),u(m,d)):d.isMeshStandardMaterial?(s(m,d),p(m,d),d.isMeshPhysicalMaterial&&f(m,d,y)):d.isMeshMatcapMaterial?(s(m,d),_(m,d)):d.isMeshDepthMaterial?s(m,d):d.isMeshDistanceMaterial?(s(m,d),v(m,d)):d.isMeshNormalMaterial?s(m,d):d.isLineBasicMaterial?(a(m,d),d.isLineDashedMaterial&&o(m,d)):d.isPointsMaterial?c(m,d,b,g):d.isSpriteMaterial?l(m,d):d.isShadowMaterial?(m.color.value.copy(d.color),m.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function s(m,d){m.opacity.value=d.opacity,d.color&&m.diffuse.value.copy(d.color),d.emissive&&m.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.bumpMap&&(m.bumpMap.value=d.bumpMap,t(d.bumpMap,m.bumpMapTransform),m.bumpScale.value=d.bumpScale,d.side===At&&(m.bumpScale.value*=-1)),d.normalMap&&(m.normalMap.value=d.normalMap,t(d.normalMap,m.normalMapTransform),m.normalScale.value.copy(d.normalScale),d.side===At&&m.normalScale.value.negate()),d.displacementMap&&(m.displacementMap.value=d.displacementMap,t(d.displacementMap,m.displacementMapTransform),m.displacementScale.value=d.displacementScale,m.displacementBias.value=d.displacementBias),d.emissiveMap&&(m.emissiveMap.value=d.emissiveMap,t(d.emissiveMap,m.emissiveMapTransform)),d.specularMap&&(m.specularMap.value=d.specularMap,t(d.specularMap,m.specularMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest);const b=e.get(d),g=b.envMap,y=b.envMapRotation;g&&(m.envMap.value=g,Dn.copy(y),Dn.x*=-1,Dn.y*=-1,Dn.z*=-1,g.isCubeTexture&&g.isRenderTargetTexture===!1&&(Dn.y*=-1,Dn.z*=-1),m.envMapRotation.value.setFromMatrix4(Dp.makeRotationFromEuler(Dn)),m.flipEnvMap.value=g.isCubeTexture&&g.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=d.reflectivity,m.ior.value=d.ior,m.refractionRatio.value=d.refractionRatio),d.lightMap&&(m.lightMap.value=d.lightMap,m.lightMapIntensity.value=d.lightMapIntensity,t(d.lightMap,m.lightMapTransform)),d.aoMap&&(m.aoMap.value=d.aoMap,m.aoMapIntensity.value=d.aoMapIntensity,t(d.aoMap,m.aoMapTransform))}function a(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform))}function o(m,d){m.dashSize.value=d.dashSize,m.totalSize.value=d.dashSize+d.gapSize,m.scale.value=d.scale}function c(m,d,b,g){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.size.value=d.size*b,m.scale.value=g*.5,d.map&&(m.map.value=d.map,t(d.map,m.uvTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function l(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.rotation.value=d.rotation,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function u(m,d){m.specular.value.copy(d.specular),m.shininess.value=Math.max(d.shininess,1e-4)}function h(m,d){d.gradientMap&&(m.gradientMap.value=d.gradientMap)}function p(m,d){m.metalness.value=d.metalness,d.metalnessMap&&(m.metalnessMap.value=d.metalnessMap,t(d.metalnessMap,m.metalnessMapTransform)),m.roughness.value=d.roughness,d.roughnessMap&&(m.roughnessMap.value=d.roughnessMap,t(d.roughnessMap,m.roughnessMapTransform)),d.envMap&&(m.envMapIntensity.value=d.envMapIntensity)}function f(m,d,b){m.ior.value=d.ior,d.sheen>0&&(m.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),m.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(m.sheenColorMap.value=d.sheenColorMap,t(d.sheenColorMap,m.sheenColorMapTransform)),d.sheenRoughnessMap&&(m.sheenRoughnessMap.value=d.sheenRoughnessMap,t(d.sheenRoughnessMap,m.sheenRoughnessMapTransform))),d.clearcoat>0&&(m.clearcoat.value=d.clearcoat,m.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(m.clearcoatMap.value=d.clearcoatMap,t(d.clearcoatMap,m.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,t(d.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(m.clearcoatNormalMap.value=d.clearcoatNormalMap,t(d.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===At&&m.clearcoatNormalScale.value.negate())),d.dispersion>0&&(m.dispersion.value=d.dispersion),d.iridescence>0&&(m.iridescence.value=d.iridescence,m.iridescenceIOR.value=d.iridescenceIOR,m.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(m.iridescenceMap.value=d.iridescenceMap,t(d.iridescenceMap,m.iridescenceMapTransform)),d.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=d.iridescenceThicknessMap,t(d.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),d.transmission>0&&(m.transmission.value=d.transmission,m.transmissionSamplerMap.value=b.texture,m.transmissionSamplerSize.value.set(b.width,b.height),d.transmissionMap&&(m.transmissionMap.value=d.transmissionMap,t(d.transmissionMap,m.transmissionMapTransform)),m.thickness.value=d.thickness,d.thicknessMap&&(m.thicknessMap.value=d.thicknessMap,t(d.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=d.attenuationDistance,m.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(m.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(m.anisotropyMap.value=d.anisotropyMap,t(d.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=d.specularIntensity,m.specularColor.value.copy(d.specularColor),d.specularColorMap&&(m.specularColorMap.value=d.specularColorMap,t(d.specularColorMap,m.specularColorMapTransform)),d.specularIntensityMap&&(m.specularIntensityMap.value=d.specularIntensityMap,t(d.specularIntensityMap,m.specularIntensityMapTransform))}function _(m,d){d.matcap&&(m.matcap.value=d.matcap)}function v(m,d){const b=e.get(d).light;m.referencePosition.value.setFromMatrixPosition(b.matrixWorld),m.nearDistance.value=b.shadow.camera.near,m.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function Up(i,e,t,n){let r={},s={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(b,g){const y=g.program;n.uniformBlockBinding(b,y)}function l(b,g){let y=r[b.id];y===void 0&&(_(b),y=u(b),r[b.id]=y,b.addEventListener("dispose",m));const C=g.program;n.updateUBOMapping(b,C);const T=e.render.frame;s[b.id]!==T&&(p(b),s[b.id]=T)}function u(b){const g=h();b.__bindingPointIndex=g;const y=i.createBuffer(),C=b.__size,T=b.usage;return i.bindBuffer(i.UNIFORM_BUFFER,y),i.bufferData(i.UNIFORM_BUFFER,C,T),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,g,y),y}function h(){for(let b=0;b<o;b++)if(a.indexOf(b)===-1)return a.push(b),b;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(b){const g=r[b.id],y=b.uniforms,C=b.__cache;i.bindBuffer(i.UNIFORM_BUFFER,g);for(let T=0,w=y.length;T<w;T++){const I=Array.isArray(y[T])?y[T]:[y[T]];for(let E=0,S=I.length;E<S;E++){const L=I[E];if(f(L,T,E,C)===!0){const q=L.__offset,G=Array.isArray(L.value)?L.value:[L.value];let Y=0;for(let ee=0;ee<G.length;ee++){const X=G[ee],ne=v(X);typeof X=="number"||typeof X=="boolean"?(L.__data[0]=X,i.bufferSubData(i.UNIFORM_BUFFER,q+Y,L.__data)):X.isMatrix3?(L.__data[0]=X.elements[0],L.__data[1]=X.elements[1],L.__data[2]=X.elements[2],L.__data[3]=0,L.__data[4]=X.elements[3],L.__data[5]=X.elements[4],L.__data[6]=X.elements[5],L.__data[7]=0,L.__data[8]=X.elements[6],L.__data[9]=X.elements[7],L.__data[10]=X.elements[8],L.__data[11]=0):(X.toArray(L.__data,Y),Y+=ne.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,q,L.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(b,g,y,C){const T=b.value,w=g+"_"+y;if(C[w]===void 0)return typeof T=="number"||typeof T=="boolean"?C[w]=T:C[w]=T.clone(),!0;{const I=C[w];if(typeof T=="number"||typeof T=="boolean"){if(I!==T)return C[w]=T,!0}else if(I.equals(T)===!1)return I.copy(T),!0}return!1}function _(b){const g=b.uniforms;let y=0;const C=16;for(let w=0,I=g.length;w<I;w++){const E=Array.isArray(g[w])?g[w]:[g[w]];for(let S=0,L=E.length;S<L;S++){const q=E[S],G=Array.isArray(q.value)?q.value:[q.value];for(let Y=0,ee=G.length;Y<ee;Y++){const X=G[Y],ne=v(X),W=y%C,me=W%ne.boundary,ve=W+me;y+=me,ve!==0&&C-ve<ne.storage&&(y+=C-ve),q.__data=new Float32Array(ne.storage/Float32Array.BYTES_PER_ELEMENT),q.__offset=y,y+=ne.storage}}}const T=y%C;return T>0&&(y+=C-T),b.__size=y,b.__cache={},this}function v(b){const g={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(g.boundary=4,g.storage=4):b.isVector2?(g.boundary=8,g.storage=8):b.isVector3||b.isColor?(g.boundary=16,g.storage=12):b.isVector4?(g.boundary=16,g.storage=16):b.isMatrix3?(g.boundary=48,g.storage=48):b.isMatrix4?(g.boundary=64,g.storage=64):b.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",b),g}function m(b){const g=b.target;g.removeEventListener("dispose",m);const y=a.indexOf(g.__bindingPointIndex);a.splice(y,1),i.deleteBuffer(r[g.id]),delete r[g.id],delete s[g.id]}function d(){for(const b in r)i.deleteBuffer(r[b]);a=[],r={},s={}}return{bind:c,update:l,dispose:d}}class Np{constructor(e={}){const{canvas:t=bl(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=a;const f=new Uint32Array(4),_=new Int32Array(4);let v=null,m=null;const d=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Yt,this.toneMapping=Sn,this.toneMappingExposure=1;const g=this;let y=!1,C=0,T=0,w=null,I=-1,E=null;const S=new ht,L=new ht;let q=null;const G=new Ve(0);let Y=0,ee=t.width,X=t.height,ne=1,W=null,me=null;const ve=new ht(0,0,ee,X),be=new ht(0,0,ee,X);let Ge=!1;const Ye=new Ko;let K=!1,te=!1;const U=new it,H=new O,Q=new ht,ie={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let de=!1;function Ce(){return w===null?ne:1}let R=n;function ce(M,D){return t.getContext(M,D)}try{const M={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ks}`),t.addEventListener("webglcontextlost",$,!1),t.addEventListener("webglcontextrestored",J,!1),t.addEventListener("webglcontextcreationerror",le,!1),R===null){const D="webgl2";if(R=ce(D,M),R===null)throw ce(D)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let Le,fe,ge,Oe,pe,Te,A,x,F,V,j,Z,Re,ue,xe,Be,se,Me,Xe,Ue,Se,Ne,He,et;function P(){Le=new kd(R),Le.init(),Ne=new Tp(R,Le),fe=new Ud(R,Le,e,Ne),ge=new yp(R),Oe=new Vd(R),pe=new cp,Te=new bp(R,Le,ge,pe,fe,Ne,Oe),A=new Fd(g),x=new zd(g),F=new $l(R),He=new Dd(R,F),V=new Hd(R,F,Oe,He),j=new Xd(R,V,F,Oe),Xe=new Wd(R,fe,Te),Be=new Nd(pe),Z=new op(g,A,x,Le,fe,He,Be),Re=new Ip(g,pe),ue=new up,xe=new gp(Le),Me=new Pd(g,A,x,ge,j,p,c),se=new Sp(g,j,fe),et=new Up(R,Oe,fe,ge),Ue=new Id(R,Le,Oe),Se=new Gd(R,Le,Oe),Oe.programs=Z.programs,g.capabilities=fe,g.extensions=Le,g.properties=pe,g.renderLists=ue,g.shadowMap=se,g.state=ge,g.info=Oe}P();const ae=new Pp(g,R);this.xr=ae,this.getContext=function(){return R},this.getContextAttributes=function(){return R.getContextAttributes()},this.forceContextLoss=function(){const M=Le.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=Le.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return ne},this.setPixelRatio=function(M){M!==void 0&&(ne=M,this.setSize(ee,X,!1))},this.getSize=function(M){return M.set(ee,X)},this.setSize=function(M,D,B=!0){if(ae.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}ee=M,X=D,t.width=Math.floor(M*ne),t.height=Math.floor(D*ne),B===!0&&(t.style.width=M+"px",t.style.height=D+"px"),this.setViewport(0,0,M,D)},this.getDrawingBufferSize=function(M){return M.set(ee*ne,X*ne).floor()},this.setDrawingBufferSize=function(M,D,B){ee=M,X=D,ne=B,t.width=Math.floor(M*B),t.height=Math.floor(D*B),this.setViewport(0,0,M,D)},this.getCurrentViewport=function(M){return M.copy(S)},this.getViewport=function(M){return M.copy(ve)},this.setViewport=function(M,D,B,k){M.isVector4?ve.set(M.x,M.y,M.z,M.w):ve.set(M,D,B,k),ge.viewport(S.copy(ve).multiplyScalar(ne).round())},this.getScissor=function(M){return M.copy(be)},this.setScissor=function(M,D,B,k){M.isVector4?be.set(M.x,M.y,M.z,M.w):be.set(M,D,B,k),ge.scissor(L.copy(be).multiplyScalar(ne).round())},this.getScissorTest=function(){return Ge},this.setScissorTest=function(M){ge.setScissorTest(Ge=M)},this.setOpaqueSort=function(M){W=M},this.setTransparentSort=function(M){me=M},this.getClearColor=function(M){return M.copy(Me.getClearColor())},this.setClearColor=function(){Me.setClearColor.apply(Me,arguments)},this.getClearAlpha=function(){return Me.getClearAlpha()},this.setClearAlpha=function(){Me.setClearAlpha.apply(Me,arguments)},this.clear=function(M=!0,D=!0,B=!0){let k=0;if(M){let N=!1;if(w!==null){const oe=w.texture.format;N=oe===ea||oe===Qs||oe===Js}if(N){const oe=w.texture.type,_e=oe===ln||oe===Gn||oe===Pi||oe===pi||oe===$s||oe===Zs,ye=Me.getClearColor(),Ee=Me.getClearAlpha(),De=ye.r,Ie=ye.g,Ae=ye.b;_e?(f[0]=De,f[1]=Ie,f[2]=Ae,f[3]=Ee,R.clearBufferuiv(R.COLOR,0,f)):(_[0]=De,_[1]=Ie,_[2]=Ae,_[3]=Ee,R.clearBufferiv(R.COLOR,0,_))}else k|=R.COLOR_BUFFER_BIT}D&&(k|=R.DEPTH_BUFFER_BIT),B&&(k|=R.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),R.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",$,!1),t.removeEventListener("webglcontextrestored",J,!1),t.removeEventListener("webglcontextcreationerror",le,!1),ue.dispose(),xe.dispose(),pe.dispose(),A.dispose(),x.dispose(),j.dispose(),He.dispose(),et.dispose(),Z.dispose(),ae.dispose(),ae.removeEventListener("sessionstart",qt),ae.removeEventListener("sessionend",oa),An.stop()};function $(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),y=!0}function J(){console.log("THREE.WebGLRenderer: Context Restored."),y=!1;const M=Oe.autoReset,D=se.enabled,B=se.autoUpdate,k=se.needsUpdate,N=se.type;P(),Oe.autoReset=M,se.enabled=D,se.autoUpdate=B,se.needsUpdate=k,se.type=N}function le(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function Pe(M){const D=M.target;D.removeEventListener("dispose",Pe),qe(D)}function qe(M){rt(M),pe.remove(M)}function rt(M){const D=pe.get(M).programs;D!==void 0&&(D.forEach(function(B){Z.releaseProgram(B)}),M.isShaderMaterial&&Z.releaseShaderCache(M))}this.renderBufferDirect=function(M,D,B,k,N,oe){D===null&&(D=ie);const _e=N.isMesh&&N.matrixWorld.determinant()<0,ye=ic(M,D,B,k,N);ge.setMaterial(k,_e);let Ee=B.index,De=1;if(k.wireframe===!0){if(Ee=V.getWireframeAttribute(B),Ee===void 0)return;De=2}const Ie=B.drawRange,Ae=B.attributes.position;let je=Ie.start*De,tt=(Ie.start+Ie.count)*De;oe!==null&&(je=Math.max(je,oe.start*De),tt=Math.min(tt,(oe.start+oe.count)*De)),Ee!==null?(je=Math.max(je,0),tt=Math.min(tt,Ee.count)):Ae!=null&&(je=Math.max(je,0),tt=Math.min(tt,Ae.count));const nt=tt-je;if(nt<0||nt===1/0)return;He.setup(N,k,ye,B,Ee);let Rt,$e=Ue;if(Ee!==null&&(Rt=F.get(Ee),$e=Se,$e.setIndex(Rt)),N.isMesh)k.wireframe===!0?(ge.setLineWidth(k.wireframeLinewidth*Ce()),$e.setMode(R.LINES)):$e.setMode(R.TRIANGLES);else if(N.isLine){let we=k.linewidth;we===void 0&&(we=1),ge.setLineWidth(we*Ce()),N.isLineSegments?$e.setMode(R.LINES):N.isLineLoop?$e.setMode(R.LINE_LOOP):$e.setMode(R.LINE_STRIP)}else N.isPoints?$e.setMode(R.POINTS):N.isSprite&&$e.setMode(R.TRIANGLES);if(N.isBatchedMesh)if(N._multiDrawInstances!==null)$e.renderMultiDrawInstances(N._multiDrawStarts,N._multiDrawCounts,N._multiDrawCount,N._multiDrawInstances);else if(Le.get("WEBGL_multi_draw"))$e.renderMultiDraw(N._multiDrawStarts,N._multiDrawCounts,N._multiDrawCount);else{const we=N._multiDrawStarts,pt=N._multiDrawCounts,Ze=N._multiDrawCount,zt=Ee?F.get(Ee).bytesPerElement:1,Vn=pe.get(k).currentProgram.getUniforms();for(let Ct=0;Ct<Ze;Ct++)Vn.setValue(R,"_gl_DrawID",Ct),$e.render(we[Ct]/zt,pt[Ct])}else if(N.isInstancedMesh)$e.renderInstances(je,nt,N.count);else if(B.isInstancedBufferGeometry){const we=B._maxInstanceCount!==void 0?B._maxInstanceCount:1/0,pt=Math.min(B.instanceCount,we);$e.renderInstances(je,nt,pt)}else $e.render(je,nt)};function ft(M,D,B){M.transparent===!0&&M.side===Dt&&M.forceSinglePass===!1?(M.side=At,M.needsUpdate=!0,ki(M,D,B),M.side=yn,M.needsUpdate=!0,ki(M,D,B),M.side=Dt):ki(M,D,B)}this.compile=function(M,D,B=null){B===null&&(B=M),m=xe.get(B),m.init(D),b.push(m),B.traverseVisible(function(N){N.isLight&&N.layers.test(D.layers)&&(m.pushLight(N),N.castShadow&&m.pushShadow(N))}),M!==B&&M.traverseVisible(function(N){N.isLight&&N.layers.test(D.layers)&&(m.pushLight(N),N.castShadow&&m.pushShadow(N))}),m.setupLights();const k=new Set;return M.traverse(function(N){const oe=N.material;if(oe)if(Array.isArray(oe))for(let _e=0;_e<oe.length;_e++){const ye=oe[_e];ft(ye,B,N),k.add(ye)}else ft(oe,B,N),k.add(oe)}),b.pop(),m=null,k},this.compileAsync=function(M,D,B=null){const k=this.compile(M,D,B);return new Promise(N=>{function oe(){if(k.forEach(function(_e){pe.get(_e).currentProgram.isReady()&&k.delete(_e)}),k.size===0){N(M);return}setTimeout(oe,10)}Le.get("KHR_parallel_shader_compile")!==null?oe():setTimeout(oe,10)})};let Ke=null;function Jt(M){Ke&&Ke(M)}function qt(){An.stop()}function oa(){An.start()}const An=new jo;An.setAnimationLoop(Jt),typeof self<"u"&&An.setContext(self),this.setAnimationLoop=function(M){Ke=M,ae.setAnimationLoop(M),M===null?An.stop():An.start()},ae.addEventListener("sessionstart",qt),ae.addEventListener("sessionend",oa),this.render=function(M,D){if(D!==void 0&&D.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(y===!0)return;if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),ae.enabled===!0&&ae.isPresenting===!0&&(ae.cameraAutoUpdate===!0&&ae.updateCamera(D),D=ae.getCamera()),M.isScene===!0&&M.onBeforeRender(g,M,D,w),m=xe.get(M,b.length),m.init(D),b.push(m),U.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),Ye.setFromProjectionMatrix(U),te=this.localClippingEnabled,K=Be.init(this.clippingPlanes,te),v=ue.get(M,d.length),v.init(),d.push(v),ae.enabled===!0&&ae.isPresenting===!0){const oe=g.xr.getDepthSensingMesh();oe!==null&&Dr(oe,D,-1/0,g.sortObjects)}Dr(M,D,0,g.sortObjects),v.finish(),g.sortObjects===!0&&v.sort(W,me),de=ae.enabled===!1||ae.isPresenting===!1||ae.hasDepthSensing()===!1,de&&Me.addToRenderList(v,M),this.info.render.frame++,K===!0&&Be.beginShadows();const B=m.state.shadowsArray;se.render(B,M,D),K===!0&&Be.endShadows(),this.info.autoReset===!0&&this.info.reset();const k=v.opaque,N=v.transmissive;if(m.setupLights(),D.isArrayCamera){const oe=D.cameras;if(N.length>0)for(let _e=0,ye=oe.length;_e<ye;_e++){const Ee=oe[_e];la(k,N,M,Ee)}de&&Me.render(M);for(let _e=0,ye=oe.length;_e<ye;_e++){const Ee=oe[_e];ca(v,M,Ee,Ee.viewport)}}else N.length>0&&la(k,N,M,D),de&&Me.render(M),ca(v,M,D);w!==null&&(Te.updateMultisampleRenderTarget(w),Te.updateRenderTargetMipmap(w)),M.isScene===!0&&M.onAfterRender(g,M,D),He.resetDefaultState(),I=-1,E=null,b.pop(),b.length>0?(m=b[b.length-1],K===!0&&Be.setGlobalState(g.clippingPlanes,m.state.camera)):m=null,d.pop(),d.length>0?v=d[d.length-1]:v=null};function Dr(M,D,B,k){if(M.visible===!1)return;if(M.layers.test(D.layers)){if(M.isGroup)B=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(D);else if(M.isLight)m.pushLight(M),M.castShadow&&m.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||Ye.intersectsSprite(M)){k&&Q.setFromMatrixPosition(M.matrixWorld).applyMatrix4(U);const _e=j.update(M),ye=M.material;ye.visible&&v.push(M,_e,ye,B,Q.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||Ye.intersectsObject(M))){const _e=j.update(M),ye=M.material;if(k&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Q.copy(M.boundingSphere.center)):(_e.boundingSphere===null&&_e.computeBoundingSphere(),Q.copy(_e.boundingSphere.center)),Q.applyMatrix4(M.matrixWorld).applyMatrix4(U)),Array.isArray(ye)){const Ee=_e.groups;for(let De=0,Ie=Ee.length;De<Ie;De++){const Ae=Ee[De],je=ye[Ae.materialIndex];je&&je.visible&&v.push(M,_e,je,B,Q.z,Ae)}}else ye.visible&&v.push(M,_e,ye,B,Q.z,null)}}const oe=M.children;for(let _e=0,ye=oe.length;_e<ye;_e++)Dr(oe[_e],D,B,k)}function ca(M,D,B,k){const N=M.opaque,oe=M.transmissive,_e=M.transparent;m.setupLightsView(B),K===!0&&Be.setGlobalState(g.clippingPlanes,B),k&&ge.viewport(S.copy(k)),N.length>0&&zi(N,D,B),oe.length>0&&zi(oe,D,B),_e.length>0&&zi(_e,D,B),ge.buffers.depth.setTest(!0),ge.buffers.depth.setMask(!0),ge.buffers.color.setMask(!0),ge.setPolygonOffset(!1)}function la(M,D,B,k){if((B.isScene===!0?B.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[k.id]===void 0&&(m.state.transmissionRenderTarget[k.id]=new En(1,1,{generateMipmaps:!0,type:Le.has("EXT_color_buffer_half_float")||Le.has("EXT_color_buffer_float")?_i:ln,minFilter:kn,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Je.workingColorSpace}));const oe=m.state.transmissionRenderTarget[k.id],_e=k.viewport||S;oe.setSize(_e.z,_e.w);const ye=g.getRenderTarget();g.setRenderTarget(oe),g.getClearColor(G),Y=g.getClearAlpha(),Y<1&&g.setClearColor(16777215,.5),g.clear(),de&&Me.render(B);const Ee=g.toneMapping;g.toneMapping=Sn;const De=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),m.setupLightsView(k),K===!0&&Be.setGlobalState(g.clippingPlanes,k),zi(M,B,k),Te.updateMultisampleRenderTarget(oe),Te.updateRenderTargetMipmap(oe),Le.has("WEBGL_multisampled_render_to_texture")===!1){let Ie=!1;for(let Ae=0,je=D.length;Ae<je;Ae++){const tt=D[Ae],nt=tt.object,Rt=tt.geometry,$e=tt.material,we=tt.group;if($e.side===Dt&&nt.layers.test(k.layers)){const pt=$e.side;$e.side=At,$e.needsUpdate=!0,ua(nt,B,k,Rt,$e,we),$e.side=pt,$e.needsUpdate=!0,Ie=!0}}Ie===!0&&(Te.updateMultisampleRenderTarget(oe),Te.updateRenderTargetMipmap(oe))}g.setRenderTarget(ye),g.setClearColor(G,Y),De!==void 0&&(k.viewport=De),g.toneMapping=Ee}function zi(M,D,B){const k=D.isScene===!0?D.overrideMaterial:null;for(let N=0,oe=M.length;N<oe;N++){const _e=M[N],ye=_e.object,Ee=_e.geometry,De=k===null?_e.material:k,Ie=_e.group;ye.layers.test(B.layers)&&ua(ye,D,B,Ee,De,Ie)}}function ua(M,D,B,k,N,oe){M.onBeforeRender(g,D,B,k,N,oe),M.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),N.onBeforeRender(g,D,B,k,M,oe),N.transparent===!0&&N.side===Dt&&N.forceSinglePass===!1?(N.side=At,N.needsUpdate=!0,g.renderBufferDirect(B,D,k,N,M,oe),N.side=yn,N.needsUpdate=!0,g.renderBufferDirect(B,D,k,N,M,oe),N.side=Dt):g.renderBufferDirect(B,D,k,N,M,oe),M.onAfterRender(g,D,B,k,N,oe)}function ki(M,D,B){D.isScene!==!0&&(D=ie);const k=pe.get(M),N=m.state.lights,oe=m.state.shadowsArray,_e=N.state.version,ye=Z.getParameters(M,N.state,oe,D,B),Ee=Z.getProgramCacheKey(ye);let De=k.programs;k.environment=M.isMeshStandardMaterial?D.environment:null,k.fog=D.fog,k.envMap=(M.isMeshStandardMaterial?x:A).get(M.envMap||k.environment),k.envMapRotation=k.environment!==null&&M.envMap===null?D.environmentRotation:M.envMapRotation,De===void 0&&(M.addEventListener("dispose",Pe),De=new Map,k.programs=De);let Ie=De.get(Ee);if(Ie!==void 0){if(k.currentProgram===Ie&&k.lightsStateVersion===_e)return da(M,ye),Ie}else ye.uniforms=Z.getUniforms(M),M.onBeforeCompile(ye,g),Ie=Z.acquireProgram(ye,Ee),De.set(Ee,Ie),k.uniforms=ye.uniforms;const Ae=k.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Ae.clippingPlanes=Be.uniform),da(M,ye),k.needsLights=sc(M),k.lightsStateVersion=_e,k.needsLights&&(Ae.ambientLightColor.value=N.state.ambient,Ae.lightProbe.value=N.state.probe,Ae.directionalLights.value=N.state.directional,Ae.directionalLightShadows.value=N.state.directionalShadow,Ae.spotLights.value=N.state.spot,Ae.spotLightShadows.value=N.state.spotShadow,Ae.rectAreaLights.value=N.state.rectArea,Ae.ltc_1.value=N.state.rectAreaLTC1,Ae.ltc_2.value=N.state.rectAreaLTC2,Ae.pointLights.value=N.state.point,Ae.pointLightShadows.value=N.state.pointShadow,Ae.hemisphereLights.value=N.state.hemi,Ae.directionalShadowMap.value=N.state.directionalShadowMap,Ae.directionalShadowMatrix.value=N.state.directionalShadowMatrix,Ae.spotShadowMap.value=N.state.spotShadowMap,Ae.spotLightMatrix.value=N.state.spotLightMatrix,Ae.spotLightMap.value=N.state.spotLightMap,Ae.pointShadowMap.value=N.state.pointShadowMap,Ae.pointShadowMatrix.value=N.state.pointShadowMatrix),k.currentProgram=Ie,k.uniformsList=null,Ie}function ha(M){if(M.uniformsList===null){const D=M.currentProgram.getUniforms();M.uniformsList=_r.seqWithValue(D.seq,M.uniforms)}return M.uniformsList}function da(M,D){const B=pe.get(M);B.outputColorSpace=D.outputColorSpace,B.batching=D.batching,B.batchingColor=D.batchingColor,B.instancing=D.instancing,B.instancingColor=D.instancingColor,B.instancingMorph=D.instancingMorph,B.skinning=D.skinning,B.morphTargets=D.morphTargets,B.morphNormals=D.morphNormals,B.morphColors=D.morphColors,B.morphTargetsCount=D.morphTargetsCount,B.numClippingPlanes=D.numClippingPlanes,B.numIntersection=D.numClipIntersection,B.vertexAlphas=D.vertexAlphas,B.vertexTangents=D.vertexTangents,B.toneMapping=D.toneMapping}function ic(M,D,B,k,N){D.isScene!==!0&&(D=ie),Te.resetTextureUnits();const oe=D.fog,_e=k.isMeshStandardMaterial?D.environment:null,ye=w===null?g.outputColorSpace:w.isXRRenderTarget===!0?w.texture.colorSpace:Tn,Ee=(k.isMeshStandardMaterial?x:A).get(k.envMap||_e),De=k.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,Ie=!!B.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Ae=!!B.morphAttributes.position,je=!!B.morphAttributes.normal,tt=!!B.morphAttributes.color;let nt=Sn;k.toneMapped&&(w===null||w.isXRRenderTarget===!0)&&(nt=g.toneMapping);const Rt=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,$e=Rt!==void 0?Rt.length:0,we=pe.get(k),pt=m.state.lights;if(K===!0&&(te===!0||M!==E)){const Nt=M===E&&k.id===I;Be.setState(k,M,Nt)}let Ze=!1;k.version===we.__version?(we.needsLights&&we.lightsStateVersion!==pt.state.version||we.outputColorSpace!==ye||N.isBatchedMesh&&we.batching===!1||!N.isBatchedMesh&&we.batching===!0||N.isBatchedMesh&&we.batchingColor===!0&&N.colorTexture===null||N.isBatchedMesh&&we.batchingColor===!1&&N.colorTexture!==null||N.isInstancedMesh&&we.instancing===!1||!N.isInstancedMesh&&we.instancing===!0||N.isSkinnedMesh&&we.skinning===!1||!N.isSkinnedMesh&&we.skinning===!0||N.isInstancedMesh&&we.instancingColor===!0&&N.instanceColor===null||N.isInstancedMesh&&we.instancingColor===!1&&N.instanceColor!==null||N.isInstancedMesh&&we.instancingMorph===!0&&N.morphTexture===null||N.isInstancedMesh&&we.instancingMorph===!1&&N.morphTexture!==null||we.envMap!==Ee||k.fog===!0&&we.fog!==oe||we.numClippingPlanes!==void 0&&(we.numClippingPlanes!==Be.numPlanes||we.numIntersection!==Be.numIntersection)||we.vertexAlphas!==De||we.vertexTangents!==Ie||we.morphTargets!==Ae||we.morphNormals!==je||we.morphColors!==tt||we.toneMapping!==nt||we.morphTargetsCount!==$e)&&(Ze=!0):(Ze=!0,we.__version=k.version);let zt=we.currentProgram;Ze===!0&&(zt=ki(k,D,N));let Vn=!1,Ct=!1,Ir=!1;const st=zt.getUniforms(),dn=we.uniforms;if(ge.useProgram(zt.program)&&(Vn=!0,Ct=!0,Ir=!0),k.id!==I&&(I=k.id,Ct=!0),Vn||E!==M){st.setValue(R,"projectionMatrix",M.projectionMatrix),st.setValue(R,"viewMatrix",M.matrixWorldInverse);const Nt=st.map.cameraPosition;Nt!==void 0&&Nt.setValue(R,H.setFromMatrixPosition(M.matrixWorld)),fe.logarithmicDepthBuffer&&st.setValue(R,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&st.setValue(R,"isOrthographic",M.isOrthographicCamera===!0),E!==M&&(E=M,Ct=!0,Ir=!0)}if(N.isSkinnedMesh){st.setOptional(R,N,"bindMatrix"),st.setOptional(R,N,"bindMatrixInverse");const Nt=N.skeleton;Nt&&(Nt.boneTexture===null&&Nt.computeBoneTexture(),st.setValue(R,"boneTexture",Nt.boneTexture,Te))}N.isBatchedMesh&&(st.setOptional(R,N,"batchingTexture"),st.setValue(R,"batchingTexture",N._matricesTexture,Te),st.setOptional(R,N,"batchingIdTexture"),st.setValue(R,"batchingIdTexture",N._indirectTexture,Te),st.setOptional(R,N,"batchingColorTexture"),N._colorsTexture!==null&&st.setValue(R,"batchingColorTexture",N._colorsTexture,Te));const Ur=B.morphAttributes;if((Ur.position!==void 0||Ur.normal!==void 0||Ur.color!==void 0)&&Xe.update(N,B,zt),(Ct||we.receiveShadow!==N.receiveShadow)&&(we.receiveShadow=N.receiveShadow,st.setValue(R,"receiveShadow",N.receiveShadow)),k.isMeshGouraudMaterial&&k.envMap!==null&&(dn.envMap.value=Ee,dn.flipEnvMap.value=Ee.isCubeTexture&&Ee.isRenderTargetTexture===!1?-1:1),k.isMeshStandardMaterial&&k.envMap===null&&D.environment!==null&&(dn.envMapIntensity.value=D.environmentIntensity),Ct&&(st.setValue(R,"toneMappingExposure",g.toneMappingExposure),we.needsLights&&rc(dn,Ir),oe&&k.fog===!0&&Re.refreshFogUniforms(dn,oe),Re.refreshMaterialUniforms(dn,k,ne,X,m.state.transmissionRenderTarget[M.id]),_r.upload(R,ha(we),dn,Te)),k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(_r.upload(R,ha(we),dn,Te),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&st.setValue(R,"center",N.center),st.setValue(R,"modelViewMatrix",N.modelViewMatrix),st.setValue(R,"normalMatrix",N.normalMatrix),st.setValue(R,"modelMatrix",N.matrixWorld),k.isShaderMaterial||k.isRawShaderMaterial){const Nt=k.uniformsGroups;for(let Nr=0,ac=Nt.length;Nr<ac;Nr++){const fa=Nt[Nr];et.update(fa,zt),et.bind(fa,zt)}}return zt}function rc(M,D){M.ambientLightColor.needsUpdate=D,M.lightProbe.needsUpdate=D,M.directionalLights.needsUpdate=D,M.directionalLightShadows.needsUpdate=D,M.pointLights.needsUpdate=D,M.pointLightShadows.needsUpdate=D,M.spotLights.needsUpdate=D,M.spotLightShadows.needsUpdate=D,M.rectAreaLights.needsUpdate=D,M.hemisphereLights.needsUpdate=D}function sc(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return T},this.getRenderTarget=function(){return w},this.setRenderTargetTextures=function(M,D,B){pe.get(M.texture).__webglTexture=D,pe.get(M.depthTexture).__webglTexture=B;const k=pe.get(M);k.__hasExternalTextures=!0,k.__autoAllocateDepthBuffer=B===void 0,k.__autoAllocateDepthBuffer||Le.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),k.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(M,D){const B=pe.get(M);B.__webglFramebuffer=D,B.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(M,D=0,B=0){w=M,C=D,T=B;let k=!0,N=null,oe=!1,_e=!1;if(M){const Ee=pe.get(M);if(Ee.__useDefaultFramebuffer!==void 0)ge.bindFramebuffer(R.FRAMEBUFFER,null),k=!1;else if(Ee.__webglFramebuffer===void 0)Te.setupRenderTarget(M);else if(Ee.__hasExternalTextures)Te.rebindTextures(M,pe.get(M.texture).__webglTexture,pe.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){const Ae=M.depthTexture;if(Ee.__boundDepthTexture!==Ae){if(Ae!==null&&pe.has(Ae)&&(M.width!==Ae.image.width||M.height!==Ae.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Te.setupDepthRenderbuffer(M)}}const De=M.texture;(De.isData3DTexture||De.isDataArrayTexture||De.isCompressedArrayTexture)&&(_e=!0);const Ie=pe.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Ie[D])?N=Ie[D][B]:N=Ie[D],oe=!0):M.samples>0&&Te.useMultisampledRTT(M)===!1?N=pe.get(M).__webglMultisampledFramebuffer:Array.isArray(Ie)?N=Ie[B]:N=Ie,S.copy(M.viewport),L.copy(M.scissor),q=M.scissorTest}else S.copy(ve).multiplyScalar(ne).floor(),L.copy(be).multiplyScalar(ne).floor(),q=Ge;if(ge.bindFramebuffer(R.FRAMEBUFFER,N)&&k&&ge.drawBuffers(M,N),ge.viewport(S),ge.scissor(L),ge.setScissorTest(q),oe){const Ee=pe.get(M.texture);R.framebufferTexture2D(R.FRAMEBUFFER,R.COLOR_ATTACHMENT0,R.TEXTURE_CUBE_MAP_POSITIVE_X+D,Ee.__webglTexture,B)}else if(_e){const Ee=pe.get(M.texture),De=D||0;R.framebufferTextureLayer(R.FRAMEBUFFER,R.COLOR_ATTACHMENT0,Ee.__webglTexture,B||0,De)}I=-1},this.readRenderTargetPixels=function(M,D,B,k,N,oe,_e){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ye=pe.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&_e!==void 0&&(ye=ye[_e]),ye){ge.bindFramebuffer(R.FRAMEBUFFER,ye);try{const Ee=M.texture,De=Ee.format,Ie=Ee.type;if(!fe.textureFormatReadable(De)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!fe.textureTypeReadable(Ie)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=M.width-k&&B>=0&&B<=M.height-N&&R.readPixels(D,B,k,N,Ne.convert(De),Ne.convert(Ie),oe)}finally{const Ee=w!==null?pe.get(w).__webglFramebuffer:null;ge.bindFramebuffer(R.FRAMEBUFFER,Ee)}}},this.readRenderTargetPixelsAsync=async function(M,D,B,k,N,oe,_e){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ye=pe.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&_e!==void 0&&(ye=ye[_e]),ye){ge.bindFramebuffer(R.FRAMEBUFFER,ye);try{const Ee=M.texture,De=Ee.format,Ie=Ee.type;if(!fe.textureFormatReadable(De))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!fe.textureTypeReadable(Ie))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(D>=0&&D<=M.width-k&&B>=0&&B<=M.height-N){const Ae=R.createBuffer();R.bindBuffer(R.PIXEL_PACK_BUFFER,Ae),R.bufferData(R.PIXEL_PACK_BUFFER,oe.byteLength,R.STREAM_READ),R.readPixels(D,B,k,N,Ne.convert(De),Ne.convert(Ie),0),R.flush();const je=R.fenceSync(R.SYNC_GPU_COMMANDS_COMPLETE,0);await Tl(R,je,4);try{R.bindBuffer(R.PIXEL_PACK_BUFFER,Ae),R.getBufferSubData(R.PIXEL_PACK_BUFFER,0,oe)}finally{R.deleteBuffer(Ae),R.deleteSync(je)}return oe}}finally{const Ee=w!==null?pe.get(w).__webglFramebuffer:null;ge.bindFramebuffer(R.FRAMEBUFFER,Ee)}}},this.copyFramebufferToTexture=function(M,D=null,B=0){M.isTexture!==!0&&(Li("WebGLRenderer: copyFramebufferToTexture function signature has changed."),D=arguments[0]||null,M=arguments[1]);const k=Math.pow(2,-B),N=Math.floor(M.image.width*k),oe=Math.floor(M.image.height*k),_e=D!==null?D.x:0,ye=D!==null?D.y:0;Te.setTexture2D(M,0),R.copyTexSubImage2D(R.TEXTURE_2D,B,0,0,_e,ye,N,oe),ge.unbindTexture()},this.copyTextureToTexture=function(M,D,B=null,k=null,N=0){M.isTexture!==!0&&(Li("WebGLRenderer: copyTextureToTexture function signature has changed."),k=arguments[0]||null,M=arguments[1],D=arguments[2],N=arguments[3]||0,B=null);let oe,_e,ye,Ee,De,Ie;B!==null?(oe=B.max.x-B.min.x,_e=B.max.y-B.min.y,ye=B.min.x,Ee=B.min.y):(oe=M.image.width,_e=M.image.height,ye=0,Ee=0),k!==null?(De=k.x,Ie=k.y):(De=0,Ie=0);const Ae=Ne.convert(D.format),je=Ne.convert(D.type);Te.setTexture2D(D,0),R.pixelStorei(R.UNPACK_FLIP_Y_WEBGL,D.flipY),R.pixelStorei(R.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),R.pixelStorei(R.UNPACK_ALIGNMENT,D.unpackAlignment);const tt=R.getParameter(R.UNPACK_ROW_LENGTH),nt=R.getParameter(R.UNPACK_IMAGE_HEIGHT),Rt=R.getParameter(R.UNPACK_SKIP_PIXELS),$e=R.getParameter(R.UNPACK_SKIP_ROWS),we=R.getParameter(R.UNPACK_SKIP_IMAGES),pt=M.isCompressedTexture?M.mipmaps[N]:M.image;R.pixelStorei(R.UNPACK_ROW_LENGTH,pt.width),R.pixelStorei(R.UNPACK_IMAGE_HEIGHT,pt.height),R.pixelStorei(R.UNPACK_SKIP_PIXELS,ye),R.pixelStorei(R.UNPACK_SKIP_ROWS,Ee),M.isDataTexture?R.texSubImage2D(R.TEXTURE_2D,N,De,Ie,oe,_e,Ae,je,pt.data):M.isCompressedTexture?R.compressedTexSubImage2D(R.TEXTURE_2D,N,De,Ie,pt.width,pt.height,Ae,pt.data):R.texSubImage2D(R.TEXTURE_2D,N,De,Ie,oe,_e,Ae,je,pt),R.pixelStorei(R.UNPACK_ROW_LENGTH,tt),R.pixelStorei(R.UNPACK_IMAGE_HEIGHT,nt),R.pixelStorei(R.UNPACK_SKIP_PIXELS,Rt),R.pixelStorei(R.UNPACK_SKIP_ROWS,$e),R.pixelStorei(R.UNPACK_SKIP_IMAGES,we),N===0&&D.generateMipmaps&&R.generateMipmap(R.TEXTURE_2D),ge.unbindTexture()},this.copyTextureToTexture3D=function(M,D,B=null,k=null,N=0){M.isTexture!==!0&&(Li("WebGLRenderer: copyTextureToTexture3D function signature has changed."),B=arguments[0]||null,k=arguments[1]||null,M=arguments[2],D=arguments[3],N=arguments[4]||0);let oe,_e,ye,Ee,De,Ie,Ae,je,tt;const nt=M.isCompressedTexture?M.mipmaps[N]:M.image;B!==null?(oe=B.max.x-B.min.x,_e=B.max.y-B.min.y,ye=B.max.z-B.min.z,Ee=B.min.x,De=B.min.y,Ie=B.min.z):(oe=nt.width,_e=nt.height,ye=nt.depth,Ee=0,De=0,Ie=0),k!==null?(Ae=k.x,je=k.y,tt=k.z):(Ae=0,je=0,tt=0);const Rt=Ne.convert(D.format),$e=Ne.convert(D.type);let we;if(D.isData3DTexture)Te.setTexture3D(D,0),we=R.TEXTURE_3D;else if(D.isDataArrayTexture||D.isCompressedArrayTexture)Te.setTexture2DArray(D,0),we=R.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}R.pixelStorei(R.UNPACK_FLIP_Y_WEBGL,D.flipY),R.pixelStorei(R.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),R.pixelStorei(R.UNPACK_ALIGNMENT,D.unpackAlignment);const pt=R.getParameter(R.UNPACK_ROW_LENGTH),Ze=R.getParameter(R.UNPACK_IMAGE_HEIGHT),zt=R.getParameter(R.UNPACK_SKIP_PIXELS),Vn=R.getParameter(R.UNPACK_SKIP_ROWS),Ct=R.getParameter(R.UNPACK_SKIP_IMAGES);R.pixelStorei(R.UNPACK_ROW_LENGTH,nt.width),R.pixelStorei(R.UNPACK_IMAGE_HEIGHT,nt.height),R.pixelStorei(R.UNPACK_SKIP_PIXELS,Ee),R.pixelStorei(R.UNPACK_SKIP_ROWS,De),R.pixelStorei(R.UNPACK_SKIP_IMAGES,Ie),M.isDataTexture||M.isData3DTexture?R.texSubImage3D(we,N,Ae,je,tt,oe,_e,ye,Rt,$e,nt.data):D.isCompressedArrayTexture?R.compressedTexSubImage3D(we,N,Ae,je,tt,oe,_e,ye,Rt,nt.data):R.texSubImage3D(we,N,Ae,je,tt,oe,_e,ye,Rt,$e,nt),R.pixelStorei(R.UNPACK_ROW_LENGTH,pt),R.pixelStorei(R.UNPACK_IMAGE_HEIGHT,Ze),R.pixelStorei(R.UNPACK_SKIP_PIXELS,zt),R.pixelStorei(R.UNPACK_SKIP_ROWS,Vn),R.pixelStorei(R.UNPACK_SKIP_IMAGES,Ct),N===0&&D.generateMipmaps&&R.generateMipmap(we),ge.unbindTexture()},this.initRenderTarget=function(M){pe.get(M).__webglFramebuffer===void 0&&Te.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?Te.setTextureCube(M,0):M.isData3DTexture?Te.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?Te.setTexture2DArray(M,0):Te.setTexture2D(M,0),ge.unbindTexture()},this.resetState=function(){C=0,T=0,w=null,ge.reset(),He.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return on}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===ta?"display-p3":"srgb",t.unpackColorSpace=Je.workingColorSpace===Rr?"display-p3":"srgb"}}class tc extends wt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new un,this.environmentIntensity=1,this.environmentRotation=new un,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Ui extends bn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ve(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const br=new O,Tr=new O,po=new it,Ai=new ia,lr=new Cr,ls=new O,mo=new O;class Fp extends wt{constructor(e=new Ut,t=new Ui){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let r=1,s=t.count;r<s;r++)br.fromBufferAttribute(t,r-1),Tr.fromBufferAttribute(t,r),n[r]=n[r-1],n[r]+=br.distanceTo(Tr);e.setAttribute("lineDistance",new Tt(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),lr.copy(n.boundingSphere),lr.applyMatrix4(r),lr.radius+=s,e.ray.intersectsSphere(lr)===!1)return;po.copy(r).invert(),Ai.copy(e.ray).applyMatrix4(po);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,u=n.index,p=n.attributes.position;if(u!==null){const f=Math.max(0,a.start),_=Math.min(u.count,a.start+a.count);for(let v=f,m=_-1;v<m;v+=l){const d=u.getX(v),b=u.getX(v+1),g=ur(this,e,Ai,c,d,b);g&&t.push(g)}if(this.isLineLoop){const v=u.getX(_-1),m=u.getX(f),d=ur(this,e,Ai,c,v,m);d&&t.push(d)}}else{const f=Math.max(0,a.start),_=Math.min(p.count,a.start+a.count);for(let v=f,m=_-1;v<m;v+=l){const d=ur(this,e,Ai,c,v,v+1);d&&t.push(d)}if(this.isLineLoop){const v=ur(this,e,Ai,c,_-1,f);v&&t.push(v)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function ur(i,e,t,n,r,s){const a=i.geometry.attributes.position;if(br.fromBufferAttribute(a,r),Tr.fromBufferAttribute(a,s),t.distanceSqToSegment(br,Tr,ls,mo)>n)return;ls.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(ls);if(!(c<e.near||c>e.far))return{distance:c,point:mo.clone().applyMatrix4(i.matrixWorld),index:r,face:null,faceIndex:null,object:i}}const go=new O,_o=new O;class Ar extends Fp{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let r=0,s=t.count;r<s;r+=2)go.fromBufferAttribute(t,r),_o.fromBufferAttribute(t,r+1),n[r]=r===0?0:n[r-1],n[r+1]=n[r]+go.distanceTo(_o);e.setAttribute("lineDistance",new Tt(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Op extends mt{constructor(e,t,n,r,s,a,o,c,l){super(e,t,n,r,s,a,o,c,l),this.isVideoTexture=!0,this.minFilter=a!==void 0?a:bt,this.magFilter=s!==void 0?s:bt,this.generateMipmaps=!1;const u=this;function h(){u.needsUpdate=!0,e.requestVideoFrameCallback(h)}"requestVideoFrameCallback"in e&&e.requestVideoFrameCallback(h)}clone(){return new this.constructor(this.image).copy(this)}update(){const e=this.image;"requestVideoFrameCallback"in e===!1&&e.readyState>=e.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}}class Bp extends mt{constructor(e,t,n,r,s,a,o,c,l){super(e,t,n,r,s,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}const vo={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(this.files[i]=e)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};class zp{constructor(e,t,n){const r=this;let s=!1,a=0,o=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(u){o++,s===!1&&r.onStart!==void 0&&r.onStart(u,a,o),s=!0},this.itemEnd=function(u){a++,r.onProgress!==void 0&&r.onProgress(u,a,o),a===o&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,h){return l.push(u,h),this},this.removeHandler=function(u){const h=l.indexOf(u);return h!==-1&&l.splice(h,2),this},this.getHandler=function(u){for(let h=0,p=l.length;h<p;h+=2){const f=l[h],_=l[h+1];if(f.global&&(f.lastIndex=0),f.test(u))return _}return null}}}const kp=new zp;class aa{constructor(e){this.manager=e!==void 0?e:kp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(r,s){n.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}}aa.DEFAULT_MATERIAL_NAME="__DEFAULT";class Hp extends aa{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=vo.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;const o=Ii("img");function c(){u(),vo.add(e,this),t&&t(this),s.manager.itemEnd(e)}function l(h){u(),r&&r(h),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),s.manager.itemStart(e),o.src=e,o}}class Gp extends aa{constructor(e){super(e)}load(e,t,n,r){const s=new mt,a=new Hp(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o,s.needsUpdate=!0,t!==void 0&&t(s)},n,r),s}}const xo=new it;class Vp{constructor(e,t,n=0,r=1/0){this.ray=new ia(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new ra,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return xo.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(xo),this}intersectObject(e,t=!0,n=[]){return Xs(e,this,n,t),n.sort(Mo),n}intersectObjects(e,t=!0,n=[]){for(let r=0,s=e.length;r<s;r++)Xs(e[r],this,n,t);return n.sort(Mo),n}}function Mo(i,e){return i.distance-e.distance}function Xs(i,e,t,n){let r=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(r=!1),r===!0&&n===!0){const s=i.children;for(let a=0,o=s.length;a<o;a++)Xs(s[a],e,t,!0)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ks}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ks);class Wp{constructor(){z(this,"group");z(this,"minorLines",null);z(this,"majorLines",null);z(this,"axes",null);z(this,"_visible",!0);this.group=new cn,this.group.name="grid-overlay"}update(e,t,n){this.clear();const r=Math.round(e/2),s=Math.round(t/2),a=10*n,o=a<5?5:a<10?10:a<25?25:a<50?50:a<100?100:500,c=o*10,l=300;this.minorLines=this.buildGridLines(-r,r,-s,s,o,new Ve(4473924),.35,l),this.minorLines&&(this.minorLines.renderOrder=-1,this.group.add(this.minorLines)),this.majorLines=this.buildGridLines(-r,r,-s,s,c,new Ve(6710886),.7,l),this.majorLines&&(this.majorLines.renderOrder=0,this.group.add(this.majorLines)),this.axes=this.buildAxes(r,s),this.axes&&(this.axes.renderOrder=1,this.group.add(this.axes)),this.group.visible=this._visible}buildGridLines(e,t,n,r,s,a,o,c){const l=[];let u=0;for(let f=e;f<=t&&u<c;f+=s)l.push(f,n,0,f,r,0),u++;for(let f=n;f<=r&&u<c;f+=s)l.push(e,f,0,t,f,0),u++;if(l.length===0)return null;const h=new Ut;h.setAttribute("position",new Tt(l,3));const p=new Ui({color:a,transparent:!0,opacity:o,depthTest:!1});return new Ar(h,p)}buildAxes(e,t){const n=[0,0,0,e,0,0,0,0,0,0,t,0],r=[1,0,0,1,0,0,0,1,0,0,1,0],s=new Ut;s.setAttribute("position",new Tt(n,3)),s.setAttribute("color",new Tt(r,3));const a=new Ui({vertexColors:!0,depthTest:!1});return new Ar(s,a)}show(){this._visible=!0,this.group.visible=!0}hide(){this._visible=!1,this.group.visible=!1}get visible(){return this._visible}clear(){[this.minorLines,this.majorLines,this.axes].forEach(e=>{e&&(this.group.remove(e),e.geometry.dispose(),e.material.dispose())}),this.minorLines=null,this.majorLines=null,this.axes=null}dispose(){this.clear()}}const Zt={MIN_ZOOM:.01,MAX_ZOOM:32,ZOOM_FACTOR:1.1,SNAP_THRESHOLD_PX:8,IDLE_PAUSE_MS:500,MAX_DPR:2,SAFE_ZONES:{ACTION_SAFE:.9,TITLE_SAFE:.8}};class Xp{constructor(){z(this,"group");z(this,"actionSafe",null);z(this,"titleSafe",null);z(this,"_visible",!1);this.group=new cn,this.group.name="safe-zones-overlay",this.group.visible=!1}update(e,t){this.clear(),this.group.visible=this._visible;const{ACTION_SAFE:n,TITLE_SAFE:r}=Zt.SAFE_ZONES,s=e*n,a=t*n,o=e*r,c=t*r;this.actionSafe=this.buildRect(-s/2,s/2,-a/2,a/2,new Ve("#ffffff"),1),this.titleSafe=this.buildRect(-o/2,o/2,-c/2,c/2,new Ve("#cccccc"),.7),this.actionSafe&&this.group.add(this.actionSafe),this.titleSafe&&this.group.add(this.titleSafe)}show(){this._visible=!0,this.group.visible=!0}hide(){this._visible=!1,this.group.visible=!1}get visible(){return this._visible}buildRect(e,t,n,r,s,a){const o=[e,n,0,t,n,0,t,n,0,t,r,0,t,r,0,e,r,0,e,r,0,e,n,0],c=new Ut;c.setAttribute("position",new Tt(o,3));const l=new Ui({color:s,transparent:!0,opacity:a,depthTest:!1});return new Ar(c,l)}clear(){[this.actionSafe,this.titleSafe].forEach(e=>{e&&(this.group.remove(e),e.geometry.dispose(),e.material.dispose())}),this.actionSafe=null,this.titleSafe=null}dispose(){this.clear()}}class qp{constructor(){z(this,"group");z(this,"border",null);z(this,"darkOutside",null);z(this,"bgQuad",null);z(this,"_visible",!0);this.group=new cn,this.group.name="comp-bounds-overlay"}update(e,t,n){this.clear();const r=e/2,s=t/2,a=Math.max(e,t)*10,o=this.buildOutsideQuad(a,r,s),c=new Xt({color:0,transparent:!0,opacity:.7,depthTest:!1,side:Dt});this.darkOutside=new dt(o,c),this.group.add(this.darkOutside);const l=new Xt({color:n,depthTest:!1,side:Dt}),u=new vt(e,t);this.bgQuad=new dt(u,l),this.group.add(this.bgQuad);const h=[-r,-s,0,r,-s,0,r,-s,0,r,s,0,r,s,0,-r,s,0,-r,s,0,-r,-s,0],p=new Ut;p.setAttribute("position",new Tt(h,3));const f=new Ui({color:4682419,depthTest:!1,transparent:!0,opacity:.5});this.border=new Ar(p,f),this.group.add(this.border),this.group.visible=this._visible}show(){this._visible=!0,this.group.visible=!0}hide(){this._visible=!1,this.group.visible=!1}get visible(){return this._visible}buildOutsideQuad(e,t,n){const r=e,s=[-r,n,0,r,n,0,r,r,0,-r,n,0,r,r,0,-r,r,0,-r,-r,0,r,-r,0,r,-n,0,-r,-r,0,r,-n,0,-r,-n,0,-r,-n,0,-t,-n,0,-t,n,0,-r,-n,0,-t,n,0,-r,n,0,t,-n,0,r,-n,0,r,n,0,t,-n,0,r,n,0,t,n,0],a=new Ut;return a.setAttribute("position",new Tt(s,3)),a}clear(){[this.border,this.darkOutside,this.bgQuad].forEach(e=>{e&&(this.group.remove(e),e.geometry.dispose(),e instanceof dt&&e.material.dispose())}),this.border=null,this.darkOutside=null,this.bgQuad=null}dispose(){this.clear()}}class Yp{constructor(){z(this,"scene");z(this,"layerGroup");z(this,"grid");z(this,"safeZones");z(this,"compBounds");z(this,"compWidth",1920);z(this,"compHeight",1080);this.scene=new tc,this.scene.background=null,this.compBounds=new qp,this.compBounds.group.renderOrder=-20,this.scene.add(this.compBounds.group),this.grid=new Wp,this.grid.group.renderOrder=-5,this.scene.add(this.grid.group),this.layerGroup=new cn,this.layerGroup.name="layers",this.layerGroup.renderOrder=0,this.scene.add(this.layerGroup),this.safeZones=new Xp,this.safeZones.group.renderOrder=5,this.scene.add(this.safeZones.group),this.scene.background=new Ve("#1a1a1a")}applyComposition(e,t,n){this.compWidth=e,this.compHeight=t,this.grid.update(e,t,1),this.compBounds.update(e,t,n),this.safeZones.update(e,t)}updateGrid(e){this.grid.update(this.compWidth,this.compHeight,e)}addLayer(e){this.layerGroup.add(e)}removeLayer(e){const t=this.layerGroup.getObjectByName(e);t instanceof dt&&(this.layerGroup.remove(t),t.geometry.dispose(),t.material instanceof bn&&t.material.dispose())}clearLayers(){for(let e=this.layerGroup.children.length-1;e>=0;e--){const t=this.layerGroup.children[e];this.layerGroup.remove(t),t instanceof dt&&(t.geometry.dispose(),t.material instanceof bn&&t.material.dispose())}}dispose(){this.grid.dispose(),this.safeZones.dispose(),this.compBounds.dispose(),this.clearLayers()}}class Kp{constructor(){z(this,"camera");z(this,"viewportWidth",1);z(this,"viewportHeight",1);z(this,"_zoom",1);z(this,"_panX",0);z(this,"_panY",0);z(this,"compWidth",1920);z(this,"compHeight",1080);z(this,"onChanged",null);this.camera=new Lr(-1,1,1,-1,-1e3,1e3),this.camera.position.set(0,0,500),this.camera.lookAt(0,0,0)}setCompositionSize(e,t){this.compWidth=e,this.compHeight=t,this.updateProjection()}setViewportSize(e,t){this.viewportWidth=e,this.viewportHeight=t,this.updateProjection()}updateProjection(){const e=this.viewportWidth/this.viewportHeight,t=this.compWidth/this.compHeight;let n,r;e>t?(r=this.compHeight/2*this._zoom,n=r*e):(n=this.compWidth/2*this._zoom,r=n/e),this.camera.left=-n+this._panX,this.camera.right=n+this._panX,this.camera.top=r+this._panY,this.camera.bottom=-r+this._panY,this.camera.updateProjectionMatrix(),this.onChanged?.()}get zoom(){return this._zoom}setZoom(e){this._zoom=Math.max(Zt.MIN_ZOOM,Math.min(Zt.MAX_ZOOM,e)),this.updateProjection()}zoomIn(e=1.25){this.setZoom(this._zoom/e)}zoomOut(e=1.25){this.setZoom(this._zoom*e)}fitToComposition(){this._zoom=1,this._panX=0,this._panY=0,this.updateProjection()}zoomTo100Percent(){const e=this.viewportWidth/this.compWidth,t=this.viewportHeight/this.compHeight;this.setZoom(Math.min(e,t))}pan(e,t){this._panX+=e,this._panY+=t,this.updateProjection()}setPan(e,t){this._panX=e,this._panY=t,this.updateProjection()}get panX(){return this._panX}get panY(){return this._panY}getViewportTransform(){return{panX:this._panX,panY:this._panY,zoom:this._zoom}}screenToWorld(e,t){const n=e/this.viewportWidth*2-1,r=-(t/this.viewportHeight)*2+1,s=this.camera.right-this.camera.left,a=this.camera.top-this.camera.bottom,o=(this.camera.left+this.camera.right)/2,c=(this.camera.top+this.camera.bottom)/2;return new We(n*(s/2)+o,r*(a/2)+c)}worldToScreen(e,t){const n=this.camera.right-this.camera.left,r=this.camera.top-this.camera.bottom,s=(this.camera.left+this.camera.right)/2,a=(this.camera.top+this.camera.bottom)/2,o=(e-s)/(n/2),c=(t-a)/(r/2),l=(o+1)/2*this.viewportWidth,u=-(c-1)/2*this.viewportHeight;return new We(l,u)}dispose(){this.camera.projectionMatrix.identity()}}class jp{constructor(e,t,n){z(this,"renderer");z(this,"scene");z(this,"camera");z(this,"animFrameId",null);z(this,"lastTime",0);z(this,"frameCount",0);z(this,"fpsAccumulator",0);z(this,"fpsFrames",0);z(this,"_currentFps",0);z(this,"running",!1);z(this,"_onFrame");z(this,"idleTimeout",null);z(this,"needsRender",!1);z(this,"_idlePaused",!1);z(this,"beforeRender",null);z(this,"tick",e=>{if(!this.running)return;if(!this.needsRender&&(this.idleTimeout||(this.idleTimeout=setTimeout(()=>{this._idlePaused=!0,this.idleTimeout=null},Zt.IDLE_PAUSE_MS)),this._idlePaused)){this.animFrameId=null;return}this.needsRender=!1;const t=e-this.lastTime;this.lastTime=e,this.frameCount++,this.fpsAccumulator+=t,this.fpsFrames++,this.fpsAccumulator>=1e3&&(this._currentFps=Math.round(this.fpsFrames*1e3/this.fpsAccumulator),this.fpsAccumulator=0,this.fpsFrames=0),this.beforeRender?.(),this.renderer.render(this.scene,this.camera),this._onFrame?.({deltaMs:t,fps:this._currentFps,frameCount:this.frameCount}),this.animFrameId=requestAnimationFrame(this.tick)});this.renderer=e,this.scene=t,this.camera=n}set onFrame(e){this._onFrame=e}requestRender(){this.needsRender=!0,this.idleTimeout&&(clearTimeout(this.idleTimeout),this.idleTimeout=null),this._idlePaused&&this.running&&(this._idlePaused=!1,this.lastTime=performance.now(),this.tick(this.lastTime))}start(){this.running||(this.running=!0,this._idlePaused=!1,this.lastTime=performance.now(),this.tick(this.lastTime))}stop(){this.running=!1,this._idlePaused=!1,this.animFrameId!==null&&(cancelAnimationFrame(this.animFrameId),this.animFrameId=null),this.idleTimeout&&(clearTimeout(this.idleTimeout),this.idleTimeout=null)}render(){this.renderer.render(this.scene,this.camera)}get isRunning(){return this.running}get currentFps(){return this._currentFps}get idlePaused(){return this._idlePaused}dispose(){this.stop()}}class $p{constructor(e,t,n){z(this,"renderer");z(this,"cameraManager");z(this,"renderLoop");z(this,"observer",null);z(this,"onResize");z(this,"rafId",0);this.renderer=e,this.cameraManager=t,this.renderLoop=n}observe(e){this.disconnect(),this.observer=new ResizeObserver(n=>{for(const r of n){const{width:s,height:a}=r.contentRect;this.rafId&&cancelAnimationFrame(this.rafId),this.rafId=requestAnimationFrame(()=>{this.handleResize(Math.floor(s),Math.floor(a)),this.renderLoop.requestRender()})}}),this.observer.observe(e);const t=e.getBoundingClientRect();this.handleResize(Math.floor(t.width),Math.floor(t.height)),this.renderLoop.requestRender()}setCallback(e){this.onResize=e}handleResize(e,t){if(e===0||t===0)return;const n=Math.min(window.devicePixelRatio||1,Zt.MAX_DPR),r=Math.floor(e*n),s=Math.floor(t*n);this.renderer.setSize(r,s),this.renderer.setPixelRatio(n),this.cameraManager.setViewportSize(e,t),this.onResize?.(e,t)}disconnect(){this.observer&&(this.observer.disconnect(),this.observer=null),this.rafId&&(cancelAnimationFrame(this.rafId),this.rafId=0)}dispose(){this.disconnect()}}class nc{constructor(){z(this,"_enabled",!0)}get enabled(){return this._enabled}set enabled(e){this._enabled=e}toggle(){this._enabled=!this._enabled}snapPoint(e,t,n,r){const s={x:e,y:t,snapped:!1,lines:[]};if(!this._enabled)return s;const a=r??Zt.SNAP_THRESHOLD_PX,o=[{type:"vertical",pos:n.compLeft,axis:"x"},{type:"vertical",pos:n.compRight,axis:"x"},{type:"vertical",pos:n.compCenterX,axis:"x"},{type:"horizontal",pos:n.compTop,axis:"y"},{type:"horizontal",pos:n.compBottom,axis:"y"},{type:"horizontal",pos:n.compCenterY,axis:"y"},...n.guidesH.map(u=>({type:"horizontal",pos:u,axis:"y"})),...n.guidesV.map(u=>({type:"vertical",pos:u,axis:"x"})),...(n.layers??[]).flatMap(u=>[{type:"vertical",pos:u.left,axis:"x"},{type:"vertical",pos:u.right,axis:"x"},{type:"vertical",pos:u.centerX,axis:"x"},{type:"horizontal",pos:u.top,axis:"y"},{type:"horizontal",pos:u.bottom,axis:"y"},{type:"horizontal",pos:u.centerY,axis:"y"}])];let c=e,l=t;for(const u of o)u.axis==="x"?Math.abs(e-u.pos)<a&&(c=u.pos,s.snapped=!0,s.lines.some(p=>p.type==="vertical"&&Math.abs(p.position-u.pos)<1)||s.lines.push({type:"vertical",position:u.pos})):Math.abs(t-u.pos)<a&&(l=u.pos,s.snapped=!0,s.lines.some(p=>p.type==="horizontal"&&Math.abs(p.position-u.pos)<1)||s.lines.push({type:"horizontal",position:u.pos}));return s.x=c,s.y=l,s}}class Bi{constructor(e,t,n){z(this,"group");z(this,"mesh");z(this,"id");z(this,"geometry");z(this,"material");this.id=e,this.geometry=t,this.material=n,this.group=new cn,this.group.name=e,this.mesh=new dt(t,n),this.mesh.name=`${e}_mesh`,this.mesh.renderOrder=1,this.group.add(this.mesh)}updateTransform(e){this.group.position.set(e.position.x,e.position.y,0),this.group.rotation.z=El.degToRad(e.rotation),this.mesh.scale.set(e.scale.x/100,e.scale.y/100,1),this.updateAnchorOffset(e.anchorPoint)}updateAnchorOffset(e){this.mesh.position.set(-e.x,-e.y,0)}updateOpacity(e){const t=this.material;t.transparent!==void 0&&(t.transparent=e<1,t.opacity=e)}setVisible(e){this.group.visible=e}dispose(){this.group.remove(this.mesh),this.geometry.dispose(),this.material.dispose()}}class So extends Bi{constructor(t,n){const r=new vt(n.width,n.height),s=new Xt({color:n.color,depthTest:!1,transparent:!1,opacity:1,side:Dt});super(t,r,s);z(this,"_width");z(this,"_height");this._width=n.width,this._height=n.height}setColor(t){this.material.color.set(t)}setSize(t,n){this._width=t,this._height=n,this.geometry.dispose();const r=new vt(t,n);this.mesh.geometry=r,this.geometry=r}geometryWidth(){return this._width}geometryHeight(){return this._height}}class Zp extends Bi{constructor(t,n,r="#ffffff"){const s="width"in n?n.width:"radiusX"in n?n.radiusX*2:n.radius*2,a="height"in n?n.height:"radiusY"in n?n.radiusY*2:n.radius*2,o=new vt(s,a),c=new Xt({color:r,depthTest:!1,transparent:!1,opacity:1,side:Dt});super(t,o,c);z(this,"_width");z(this,"_height");this._width=s,this._height=a}setFillColor(t){this.material.color.set(t)}setSize(t,n){this._width=t,this._height=n,this.geometry.dispose();const r=new vt(t,n);this.mesh.geometry=r,this.geometry=r}geometryWidth(){return this._width}geometryHeight(){return this._height}}const On=class On extends Bi{constructor(t,n){const r=Math.min(On.MAX_SIZE,1024),s=Math.min(On.MAX_SIZE,256),a=document.createElement("canvas");a.width=r,a.height=s;const o=a.getContext("2d"),c=new Bp(a);c.needsUpdate=!0;const l=new vt(r,s),u=new Xt({map:c,depthTest:!1,transparent:!0});super(t,l,u);z(this,"canvas");z(this,"ctx");z(this,"textData");z(this,"cacheKey","");z(this,"_textWidth",200);z(this,"_textHeight",100);z(this,"canvasTexture");this.canvas=a,this.ctx=o,this.textData=n,this.canvasTexture=c,this.renderText()}setText(t){const n=this.buildCacheKey(t);n!==this.cacheKey&&(this.textData=t,this.cacheKey=n,this.renderText())}renderText(){const t=this.textData,n=this.ctx,r=`${t.fontWeight} ${t.fontSize}px "${t.fontFamily}"`;n.font=r;const s=t.text.split(`
`);let a=0;for(const m of s){const d=n.measureText(m);d.width>a&&(a=d.width)}const o=t.fontSize*(t.lineHeight||1.2),c=s.length*o,l=20,u=Math.min(On.MAX_SIZE,Math.ceil(a+l*2)),h=Math.min(On.MAX_SIZE,Math.ceil(c+l*2));this.canvas.width=u,this.canvas.height=h,n.clearRect(0,0,u,h),n.font=r,n.fillStyle=t.color,n.textBaseline="top",n.textAlign=t.alignment==="center"?"center":t.alignment==="right"?"right":"left";const p=t.alignment==="center"?u/2:t.alignment==="right"?u-l:l;for(let m=0;m<s.length;m++)n.fillText(s[m],p,l+m*o);const f=this.geometry,_=new vt(u,h);this.mesh.geometry=_,this.geometry=_,f.dispose();const v=this.material;v.map=this.canvasTexture,this.canvasTexture.needsUpdate=!0,this._textWidth=u,this._textHeight=h}buildCacheKey(t){return`${t.text}|${t.fontFamily}|${t.fontSize}|${t.fontWeight}|${t.color}|${t.alignment}|${t.letterSpacing}|${t.lineHeight}`}geometryWidth(){return this._textWidth}geometryHeight(){return this._textHeight}};z(On,"MAX_SIZE",4096);let qs=On;class Jp{constructor(){z(this,"cache",new Map)}async loadImage(e,t){const n=this.cache.get(e);if(n)return n.refCount++,n.texture;const s=await new Gp().loadAsync(t);return s.needsUpdate=!0,this.cache.set(e,{texture:s,refCount:1}),s}loadVideo(e,t){const n=this.cache.get(e);if(n&&n.videoElement)return n.refCount++,{texture:n.texture,video:n.videoElement};const r=document.createElement("video");r.src=t,r.crossOrigin="anonymous",r.loop=!0,r.muted=!0,r.playsInline=!0,r.load();const s=new Op(r);return s.needsUpdate=!0,this.cache.set(e,{texture:s,refCount:1,videoElement:r}),{texture:s,video:r}}has(e){return this.cache.has(e)}get(e){return this.cache.get(e)?.texture}incRef(e){const t=this.cache.get(e);t&&t.refCount++}decRef(e){const t=this.cache.get(e);t&&(t.refCount--,t.refCount<=0&&this.disposeEntry(e))}clear(){for(const e of this.cache.keys())this.disposeEntry(e)}disposeEntry(e){const t=this.cache.get(e);t&&(t.texture.dispose(),t.videoElement&&(t.videoElement.pause(),t.videoElement.src="",t.videoElement.load()),this.cache.delete(e))}}const vr=new Jp;class Qp extends Bi{constructor(t,n,r,s){const a=new vt(r,s),o=new Xt({color:3355443,depthTest:!1,transparent:!1});super(t,a,o);z(this,"naturalW");z(this,"naturalH");z(this,"assetId");z(this,"_loaded",!1);this.assetId=n,this.naturalW=r,this.naturalH=s,this.loadTexture()}async loadTexture(){const t=Eo.getAsset(this.assetId);if(t)try{const n=await vr.loadImage(this.assetId,t.url);this.material.map=n,this.material.color.set(16777215),this.material.needsUpdate=!0,this._loaded=!0}catch{console.warn(`[ImageLayer] Failed to load asset ${this.assetId}`)}}reload(t){const n=this.assetId;this.assetId=t,vr.decRef(n),this.loadTexture()}geometryWidth(){return this.naturalW}geometryHeight(){return this.naturalH}get loaded(){return this._loaded}dispose(){vr.decRef(this.assetId),super.dispose()}}class em extends Bi{constructor(t,n,r,s){const a=new vt(r,s),o=new Xt({color:3355443,depthTest:!1,transparent:!1});super(t,a,o);z(this,"video",null);z(this,"naturalW");z(this,"naturalH");z(this,"assetId");z(this,"_playing",!1);this.assetId=n,this.naturalW=r,this.naturalH=s,this.loadVideo()}loadVideo(){const t=Eo.getAsset(this.assetId);if(!t)return;const{texture:n,video:r}=vr.loadVideo(this.assetId,t.url);this.material.map=n,this.material.color.set(16777215),this.material.needsUpdate=!0,this.video=r}play(){this.video&&(this.video.play(),this._playing=!0)}pause(){this.video&&(this.video.pause(),this._playing=!1)}seekTo(t){this.video&&(this.video.currentTime=t)}get playing(){return this._playing}geometryWidth(){return this.naturalW}geometryHeight(){return this.naturalH}}class tm{constructor(e){z(this,"sceneManager");this.sceneManager=e}create(e){let t;switch(e.type){case"solid":{const n=e.data;t=new So(e.id,n);break}case"shape":{const n=e.data;t=new Zp(e.id,n);break}case"text":{const n=e.data;t=new qs(e.id,n);break}case"image":{const n=e.data;t=new Qp(e.id,n.assetId,n.naturalWidth,n.naturalHeight);break}case"video":{const n=e.data;t=new em(e.id,n.assetId,n.naturalWidth,n.naturalHeight);break}default:t=new So(e.id,{color:"#000000",width:100,height:100}),t.setVisible(!1);break}return t.updateTransform(e.transform),t.updateOpacity(e.opacity/100),t.setVisible(e.visible),t.group.position.z=-(e.zIndex*.001)||0,this.sceneManager.layerGroup.add(t.group),t}remove(e){this.sceneManager.layerGroup.remove(e.group),e.dispose()}clearAll(){this.sceneManager.clearLayers()}}class nm{constructor(e){z(this,"factory");z(this,"renderers",new Map);z(this,"prevLayers",[]);this.factory=new tm(e)}sync(e){const t=new Map;for(const r of this.prevLayers)t.set(r.id,r);const n=new Map;for(const r of e)n.set(r.id,r);for(const[r]of t)if(!n.has(r)){const s=this.renderers.get(r);s&&(this.factory.remove(s),this.renderers.delete(r))}for(const r of e){const s=t.get(r.id);if(s)this.updateRenderer(r.id,s,r);else{const a=this.factory.create(r);this.renderers.set(r.id,a)}}this.updateZOrder(e),this.prevLayers=[...e]}clear(){for(const e of this.renderers.values())e.dispose();this.renderers.clear(),this.prevLayers=[],this.factory.clearAll()}getRenderer(e){return this.renderers.get(e)}getAllRenderers(){return this.renderers}updateRenderer(e,t,n){const r=this.renderers.get(e);if(!(!r||(this.transformChanged(t.transform,n.transform)&&r.updateTransform(n.transform),t.opacity!==n.opacity&&r.updateOpacity(n.opacity/100),t.visible!==n.visible&&r.setVisible(n.visible),!(t.data!==n.data)))){if(n.type==="solid"){const a=r,o=n.data;a.setColor&&o.color!==void 0&&a.setColor(o.color),a.setSize&&(o.width!==void 0||o.height!==void 0)&&a.setSize(o.width,o.height)}if(n.type==="shape"){const a=r,o=n.data;if(a.setFillColor&&o.fillColor!==void 0&&a.setFillColor(o.fillColor),a.setSize){const c="width"in o?o.width:"radiusX"in o?o.radiusX*2:o.radius*2,l="height"in o?o.height:"radiusY"in o?o.radiusY*2:o.radius*2;a.setSize(c,l)}}if(n.type==="text"){const a=r;a.setText&&n.data&&a.setText(n.data)}}}transformChanged(e,t){return e.position.x!==t.position.x||e.position.y!==t.position.y||e.scale.x!==t.scale.x||e.scale.y!==t.scale.y||e.rotation!==t.rotation||e.anchorPoint.x!==t.anchorPoint.x||e.anchorPoint.y!==t.anchorPoint.y}updateZOrder(e){e.forEach((t,n)=>{const r=this.renderers.get(t.id);r&&(r.group.position.z=-(n*.001)||0)})}}class im{constructor(e,t){z(this,"raycaster",new Vp);z(this,"sceneManager");z(this,"cameraManager");this.sceneManager=e,this.cameraManager=t}hitTest(e,t,n){const r=e/this.cameraManager.viewportWidth*2-1,s=-(t/this.cameraManager.viewportHeight)*2+1;this.raycaster.setFromCamera(new We(r,s),this.cameraManager.camera),this.sceneManager.scene.updateMatrixWorld(!0);const a=[];for(let h=n.length-1;h>=0;h--){const p=n[h],f=this.sceneManager.layerGroup.getObjectByName(p);if(f){const _=f.getObjectByName(`${p}_mesh`);_ instanceof dt&&_.visible&&_.parent?.visible!==!1&&a.push(_)}}if(a.length===0)return null;const o=this.raycaster.intersectObjects(a,!1);if(o.length===0)return null;const c=o[0],l=c.object.name;return{layerId:l.endsWith("_mesh")?l.slice(0,-5):l,point:c.point.clone(),distance:c.distance}}dispose(){}}const xt="http://www.w3.org/2000/svg";class rm{constructor(e,t){z(this,"container");z(this,"cameraManager");z(this,"svg",null);z(this,"_visible",!1);z(this,"_gizmoMode",null);z(this,"_hideHandles",!1);this.container=e,this.cameraManager=t}set gizmoMode(e){this._gizmoMode=e}get gizmoMode(){return this._gizmoMode}set hideHandles(e){this._hideHandles=e}get hideHandles(){return this._hideHandles}mount(){if(this.svg)return;const e=document.createElementNS(xt,"svg");e.style.position="absolute",e.style.inset="0",e.style.pointerEvents="none",e.style.zIndex="25",e.style.width="100%",e.style.height="100%",this.container.appendChild(e),this.svg=e}unmount(){this.svg&&this.svg.parentElement&&this.svg.parentElement.removeChild(this.svg),this.svg=null}update(e){if(!this.svg||(this.svg.innerHTML="",e.length===0||!this._visible))return;const t="var(--color-accent)",n="#ffffff",r=8,s=6;let a=[],o=0,c=0,l=0;for(const g of e){const y=this._getWorldCorners(g);if(y.length<4)continue;const C=y.map(I=>`${I.x},${I.y}`).join(" "),T=document.createElementNS(xt,"polygon");T.setAttribute("points",C),T.setAttribute("fill","none"),T.setAttribute("stroke",e.length>1?"rgba(71,114,179,0.5)":t),T.setAttribute("stroke-width","1.5"),this.svg.appendChild(T),a=a.concat(y);const w=new O;g.group.getWorldPosition(w),o+=w.x,c+=w.y,l++,this._hideHandles||this._drawBoundingBoxHandles(y,g.mesh,r,s,n,t),this._drawAnchor(w.x,w.y)}if(a.length===0)return;let u=1/0,h=-1/0,p=1/0,f=-1/0;for(const g of a)u=Math.min(u,g.x),h=Math.max(h,g.x),p=Math.min(p,g.y),f=Math.max(f,g.y);if(!isFinite(u))return;const _=o/l,v=c/l,m=this.cameraManager.worldToScreen(_,v),d=m.x,b=m.y;switch(this._gizmoMode){case"move":this._drawMoveGizmo(d,b,t,n);break;case"rotate":this._drawRotateGizmo(d,b,t,n);break;case"scale":this._drawScaleGizmo(d,b,t,n);break}}_drawBoundingBoxHandles(e,t,n,r,s,a){const o=[{pos:"tl",cx:e[0].x,cy:e[0].y},{pos:"tr",cx:e[1].x,cy:e[1].y},{pos:"br",cx:e[2].x,cy:e[2].y},{pos:"bl",cx:e[3].x,cy:e[3].y}],c=[{pos:"top",cx:(e[0].x+e[1].x)/2,cy:(e[0].y+e[1].y)/2},{pos:"right",cx:(e[1].x+e[2].x)/2,cy:(e[1].y+e[2].y)/2},{pos:"bottom",cx:(e[2].x+e[3].x)/2,cy:(e[2].y+e[3].y)/2},{pos:"left",cx:(e[3].x+e[0].x)/2,cy:(e[3].y+e[0].y)/2}];for(const w of o){const I=this._rect(w.cx-n/2,w.cy-n/2,n,n,a,1,s);I.setAttribute("data-handle",w.pos),I.style.pointerEvents="all",I.style.cursor=this._cursorForHandle(w.pos,0),I.style.boxShadow="0 1px 3px rgba(0,0,0,0.4)",this.svg.appendChild(I)}for(const w of c){const I=this._rect(w.cx-r/2,w.cy-r/2,r,r,a,1,s);I.setAttribute("data-handle",w.pos),I.style.pointerEvents="all",I.style.cursor=this._cursorForHandle(w.pos,0),I.style.boxShadow="0 1px 3px rgba(0,0,0,0.4)",this.svg.appendChild(I)}const l=(e[0].x+e[1].x)/2,u=(e[0].y+e[1].y)/2,h=e[1].x-e[0].x,p=e[1].y-e[0].y,f=Math.hypot(h,p)||1,_=-p/f,v=h/f,m=24,d=l+_*m,b=u+v*m,g=document.createElementNS(xt,"line");g.setAttribute("x1",String(l)),g.setAttribute("y1",String(u)),g.setAttribute("x2",String(d)),g.setAttribute("y2",String(b)),g.setAttribute("stroke",a),g.setAttribute("stroke-width","1"),g.setAttribute("stroke-dasharray","3 2"),g.style.pointerEvents="none",this.svg.appendChild(g);const y=document.createElementNS(xt,"circle");y.setAttribute("cx",String(d)),y.setAttribute("cy",String(b)),y.setAttribute("r","6"),y.setAttribute("fill",s),y.setAttribute("stroke",a),y.setAttribute("stroke-width","1.5"),y.setAttribute("data-handle","rotate"),y.style.pointerEvents="all",y.style.cursor="grab",y.style.boxShadow="0 1px 3px rgba(0,0,0,0.4)",this.svg.appendChild(y);const C=document.createElementNS(xt,"path");C.setAttribute("d",`M ${d-2} ${b-1} A 3 3 0 1 1 ${d+2} ${b+1}`),C.setAttribute("fill","none"),C.setAttribute("stroke",a),C.setAttribute("stroke-width","1"),C.style.pointerEvents="none",this.svg.appendChild(C);const T=document.createElementNS(xt,"polygon");T.setAttribute("points",`${d+3},${b+1} ${d+1},${b+0} ${d+1},${b+2}`),T.setAttribute("fill",a),T.style.pointerEvents="none",this.svg.appendChild(T)}_cursorForHandle(e,t){return{tl:"nwse-resize",tr:"nesw-resize",br:"nwse-resize",bl:"nesw-resize",top:"ns-resize",bottom:"ns-resize",left:"ew-resize",right:"ew-resize"}[e]||"default"}_getWorldCorners(e){e.mesh.updateMatrixWorld(!0);const t=e.mesh.geometry;t.computeBoundingBox();const n=t.boundingBox;if(!n)return[];const r=[new O(n.min.x,n.min.y,0),new O(n.max.x,n.min.y,0),new O(n.max.x,n.max.y,0),new O(n.min.x,n.max.y,0)],s=e.mesh.matrixWorld;return r.map(a=>{const o=a.clone().applyMatrix4(s);return this.cameraManager.worldToScreen(o.x,o.y)})}_drawMoveGizmo(e,t,n,r){this._arrow(e,t,e+40,t,8,"#ff3355",r,"move-x"),this._arrow(e,t,e,t-40,8,"#55dd33",r,"move-y"),this._compassRose(e,t,8,n,r);const o=7,c=this._rect(e+o,t-o*1.5,o,o,"#ffdd44",1,"#ffdd44");c.setAttribute("data-gizmo","move-xy"),c.style.pointerEvents="all",c.style.cursor="move",this.svg.appendChild(c)}_drawRotateGizmo(e,t,n,r){const o=document.createElementNS(xt,"circle");o.setAttribute("cx",String(e)),o.setAttribute("cy",String(t)),o.setAttribute("r",String(50)),o.setAttribute("fill","none"),o.setAttribute("stroke","#3388ff"),o.setAttribute("stroke-width","2"),o.setAttribute("data-gizmo","rotate-z"),o.style.pointerEvents="all",o.style.cursor="grab",this.svg.appendChild(o);const c=document.createElementNS(xt,"circle");c.setAttribute("cx",String(e)),c.setAttribute("cy",String(t)),c.setAttribute("r",String(65)),c.setAttribute("fill","none"),c.setAttribute("stroke","rgba(255,255,255,0.3)"),c.setAttribute("stroke-width","1"),c.setAttribute("stroke-dasharray","4 3"),c.setAttribute("data-gizmo","rotate-free"),c.style.pointerEvents="all",c.style.cursor="grab",this.svg.appendChild(c),this._dot(e,t,4,r,n),this._compassRose(e,t,6,n,r)}_drawScaleGizmo(e,t,n,r){this._arrowSquare(e,t,e+40,t,9,"#ff3355",r,"scale-x"),this._arrowSquare(e,t,e,t-40,9,"#55dd33",r,"scale-y");const o=11,c=this._rect(e-o/2,t-o/2,o,o,"#ffffff",1.5,"rgba(255,255,255,0.15)");c.setAttribute("data-gizmo","scale-uniform"),c.style.pointerEvents="all",c.style.cursor="nwse-resize",this.svg.appendChild(c),this._compassRose(e,t,6,n,r)}_drawAnchor(e,t){const n=this.cameraManager.worldToScreen(e,t),r=6,s="var(--color-accent)";this.svg.appendChild(this._line(n.x-r,n.y,n.x+r,n.y,s,1)),this.svg.appendChild(this._line(n.x,n.y-r,n.x,n.y+r,s,1)),this._dot(n.x,n.y,2,s,"none")}_rect(e,t,n,r,s,a,o){const c=document.createElementNS(xt,"rect");return c.setAttribute("x",String(e)),c.setAttribute("y",String(t)),c.setAttribute("width",String(n)),c.setAttribute("height",String(r)),c.setAttribute("stroke",s),c.setAttribute("stroke-width",String(a)),c.setAttribute("fill",o),c}_line(e,t,n,r,s,a){const o=document.createElementNS(xt,"line");return o.setAttribute("x1",String(e)),o.setAttribute("y1",String(t)),o.setAttribute("x2",String(n)),o.setAttribute("y2",String(r)),o.setAttribute("stroke",s),o.setAttribute("stroke-width",String(a)),o}_dot(e,t,n,r,s){const a=document.createElementNS(xt,"circle");a.setAttribute("cx",String(e)),a.setAttribute("cy",String(t)),a.setAttribute("r",String(n)),a.setAttribute("fill",r),s!=="none"&&(a.setAttribute("stroke",s),a.setAttribute("stroke-width","0.5")),this.svg.appendChild(a)}_arrow(e,t,n,r,s,a,o,c){const l=this._line(e,t,n,r,a,2);l.style.pointerEvents="all",l.style.cursor="pointer",l.setAttribute("data-gizmo",c),this.svg.appendChild(l);const u=Math.atan2(r-t,n-e),h=document.createElementNS(xt,"polygon"),p=n,f=r,_=[p+s*Math.cos(u),f+s*Math.sin(u),p+s*.5*Math.cos(u+Math.PI*.7),f+s*.5*Math.sin(u+Math.PI*.7),p+s*.5*Math.cos(u-Math.PI*.7),f+s*.5*Math.sin(u-Math.PI*.7)];h.setAttribute("points",_.join(" ")),h.setAttribute("fill",a),h.setAttribute("stroke",o),h.setAttribute("stroke-width","0.5"),h.setAttribute("data-gizmo",c),h.style.pointerEvents="all",h.style.cursor="pointer",this.svg.appendChild(h)}_arrowSquare(e,t,n,r,s,a,o,c){const l=this._line(e,t,n,r,a,2);l.style.pointerEvents="all",l.style.cursor="pointer",l.setAttribute("data-gizmo",c),this.svg.appendChild(l);const u=Math.atan2(r-t,n-e),h=document.createElementNS(xt,"rect"),p=n+s*Math.cos(u)*.7,f=r+s*Math.sin(u)*.7;h.setAttribute("x",String(p-s/2)),h.setAttribute("y",String(f-s/2)),h.setAttribute("width",String(s)),h.setAttribute("height",String(s)),h.setAttribute("fill",a),h.setAttribute("stroke",o),h.setAttribute("stroke-width","0.5"),h.setAttribute("data-gizmo",c),h.style.pointerEvents="all",h.style.cursor="pointer",this.svg.appendChild(h)}_compassRose(e,t,n,r,s){const a=document.createElementNS(xt,"circle");a.setAttribute("cx",String(e)),a.setAttribute("cy",String(t)),a.setAttribute("r",String(n*.5)),a.setAttribute("fill",r),a.setAttribute("stroke",s),a.setAttribute("stroke-width","0.5"),a.setAttribute("data-gizmo","pivot"),a.style.pointerEvents="all",a.style.cursor="move",this.svg.appendChild(a);for(let o=0;o<8;o++){const c=Math.PI*2*o/8-Math.PI/2,l=e+n*Math.cos(c),u=t+n*Math.sin(c),h=n*.6,p=c+Math.PI*.25,f=c-Math.PI*.25,_=document.createElementNS(xt,"polygon");_.setAttribute("points",[l,u,e+h*Math.cos(p),t+h*Math.sin(p),e+h*Math.cos(f),t+h*Math.sin(f)].join(" ")),_.setAttribute("fill",r),_.setAttribute("stroke",s),_.setAttribute("stroke-width","0.3"),this.svg.appendChild(_)}}show(){this._visible=!0}hide(){this._visible=!1,this.update([])}get visible(){return this._visible}dispose(){this.unmount()}}const Bn=class Bn{constructor(e,t){z(this,"cameraManager");z(this,"snapping");z(this,"_mode",null);z(this,"_active",!1);z(this,"_axisLock",null);z(this,"_axisExclude",null);z(this,"_accumulatedDelta",{x:0,y:0});z(this,"_numericBuffer","");z(this,"_numericActive",!1);z(this,"_precisionMode",!1);z(this,"_snapMode",!1);z(this,"_aspectLock",!1);z(this,"_startTransforms",new Map);z(this,"startMouseScreen",{x:0,y:0});z(this,"_handlePivotWorld",null);z(this,"_compId",null);z(this,"_canvas",null);z(this,"_exitingByChoice",!1);z(this,"_onStateChange",null);z(this,"_boundPointerLockChange",null);z(this,"_cachedSnapTargets",null);z(this,"_pendingFirstDelta",!1);z(this,"lastSnapLines",[]);this.cameraManager=e,this.snapping=t??new nc,lc(()=>Bn.activeAnywhere),document.addEventListener("mousemove",n=>{document._lastMouseEvent=n},{passive:!0})}start(e,t){this._active&&this.cancel();const n=Vt.getState().getSelectedIds();if(n.length===0)return;const r=ot.getState(),s=r.activeCompositionId;if(!s)return;const a=r.compositions.find(p=>p.id===s);if(!a)return;const o=new Map;let c=0,l=0,u=0;for(const p of n){const f=a.layers.find(_=>_.id===p);f&&(o.set(p,{pos:{...f.transform.position},scale:{...f.transform.scale},rotation:f.transform.rotation}),c+=f.transform.position.x,l+=f.transform.position.y,u++)}if(u===0)return;this._mode=e,this._active=!0,Bn.activeAnywhere=!0,this._axisLock=null,this._axisExclude=null,this._accumulatedDelta={x:0,y:0},this._numericBuffer="",this._numericActive=!1,this._precisionMode=!1,this._snapMode=!1,this._aspectLock=!1,this._startTransforms=o;const h=document._lastMouseEvent;this.startMouseScreen=h?{x:h.clientX,y:h.clientY}:{x:0,y:0},this._compId=s,this._exitingByChoice=!1,this._cachedSnapTargets=null,this._handlePivotWorld=null,this.lastSnapLines=[],this._pendingFirstDelta=!!t,this._cachedSnapTargets=this._buildSnapTargets(a,n),t&&(this._canvas=t,this._boundPointerLockChange=this._onPointerLockChange.bind(this),document.addEventListener("pointerlockchange",this._boundPointerLockChange),t.requestPointerLock().catch(()=>{this._canvas=null})),this._emitState()}updateDelta(e,t){if(!(!this._active||!this._mode||!this._compId)){if(Vt.getState().getSelectedIds().length===0){this.cancel();return}if(this._pendingFirstDelta){this._pendingFirstDelta=!1,this._accumulatedDelta={x:0,y:0},this._emitState();return}this.clearNumeric(),this._accumulatedDelta.x+=e,this._accumulatedDelta.y-=t,this._applyTransform(),this._emitState()}}updateDirectDrag(e,t){if(!(!this._active||!this._mode||!this._compId)){if(Vt.getState().getSelectedIds().length===0){this.cancel();return}this.clearNumeric(),this._accumulatedDelta.x+=e,this._accumulatedDelta.y-=t,this._applyTransform(),this._emitState()}}confirm(){this._active&&(this._releasePointerLock(),this._active=!1,Bn.activeAnywhere=!1,this.lastSnapLines=[],this._cachedSnapTargets=null,this._handlePivotWorld=null,this._emitState())}cancel(){if(this._active){if(Bn.activeAnywhere=!1,this._compId)for(const[e,t]of this._startTransforms)ot.getState().updateLayer(this._compId,e,{transform:{position:{...t.pos},scale:{...t.scale},rotation:t.rotation,anchorPoint:{x:0,y:0}}});this._releasePointerLock(),this._active=!1,this.lastSnapLines=[],this._cachedSnapTargets=null,this._handlePivotWorld=null,this._emitState()}}setAxisLock(e){this._axisLock=this._axisLock===e?null:e,this._axisExclude=null,this._applyTransform(),this._emitState()}setAxisExclude(e){this._axisExclude=this._axisExclude===e?null:e,this._axisLock=null,this._applyTransform(),this._emitState()}setPrecisionMode(e){this._precisionMode=e}setSnapMode(e){this._snapMode=e}setAspectLock(e){this._aspectLock=e}setStartMouseScreen(e,t){this.startMouseScreen={x:e,y:t}}setHandlePivotWorld(e){this._handlePivotWorld=e}pushNumericChar(e){if(!this._active||!/^[0-9.\-]$/.test(e))return;this._numericBuffer+=e,this._numericActive=this._numericBuffer.length>0;const t=parseFloat(this._numericBuffer);!isNaN(t)&&this._numericBuffer.length>1&&(this._applyTransform(),this._syncStartTransformsFromStore(),this._accumulatedDelta={x:0,y:0}),this._emitState()}clearNumeric(){this._numericActive&&(this._numericBuffer="",this._numericActive=!1)}backspaceNumeric(){this._active&&(this._numericBuffer=this._numericBuffer.slice(0,-1),this._numericActive=this._numericBuffer.length>0,this._applyTransform(),this._emitState())}get active(){return this._active}get mode(){return this._mode}get axisLock(){return this._axisLock}get axisExclude(){return this._axisExclude}getTransformInfo(){let e=0,t=1,n=1;const r=this._accumulatedDelta.x,s=this._accumulatedDelta.y;if(this._active&&this._mode&&this._compId)if(this._numericActive){const a=parseFloat(this._numericBuffer)||0;this._mode==="grab"||(this._mode==="scale"?(t=this._axisLock==="y"||this._axisExclude==="x"?1:a/100,n=this._axisLock==="x"||this._axisExclude==="y"?1:a/100):e=a)}else if(this._mode==="grab")this._axisLock==="x"||this._axisExclude,this._axisLock==="y"||this._axisExclude;else if(this._mode==="scale"){const a=Math.hypot(r,s),o=Math.hypot(this.startMouseScreen.x||1,this.startMouseScreen.y||1),c=o>1?a/o:1+a*.005,l=this._precisionMode?.1:1,u=1+(c-1)*l;t=Math.max(.01,u),n=Math.max(.01,u),(this._axisLock==="y"||this._axisExclude==="x")&&(n=1),(this._axisLock==="x"||this._axisExclude==="y")&&(t=1),this._snapMode&&(t=Math.round(t*10)/10,n=Math.round(n*10)/10)}else{const a=this._precisionMode?.05:.5;e=r*a,this._snapMode&&(e=Math.round(e/5)*5)}return{mode:this._mode,active:this._active,axisLock:this._axisLock,axisExclude:this._axisExclude,deltaX:this._accumulatedDelta.x,deltaY:this._accumulatedDelta.y,rotation:e,scaleX:t,scaleY:n,numericBuffer:this._numericBuffer,precisionMode:this._precisionMode,snapMode:this._snapMode}}setOnStateChange(e){this._onStateChange=e}_applyTransform(){if(!this._mode||!this._compId)return;const{_compId:e,_mode:t,_accumulatedDelta:n,_axisLock:r,_axisExclude:s,_numericBuffer:a,_numericActive:o,_precisionMode:c,_snapMode:l,_aspectLock:u,_startTransforms:h,_cachedSnapTargets:p}=this,f=this.cameraManager.zoom,_=ot.getState(),v=n.x*f,m=n.y*f,d=It.getState().settings.snappingEnabled;let b=(l||d)&&t==="grab"&&p;if(o){const g=parseFloat(a)||0;for(const[y,C]of h)if(t==="grab"){const T=r==="y"||s==="x"?C.pos.x:C.pos.x+g,w=r==="x"||s==="y"?C.pos.y:r==="y"?C.pos.y+g:C.pos.y;_.updateLayer(e,y,{transform:{position:{x:T,y:w},scale:C.scale,rotation:C.rotation,anchorPoint:{x:0,y:0}}})}else if(t==="rotate"){const T=g,w=l?Math.round(T/5)*5:T;_.updateLayer(e,y,{transform:{position:C.pos,scale:C.scale,rotation:C.rotation+w,anchorPoint:{x:0,y:0}}})}else if(t==="scale"){const T=g/100,w=r==="y"||s==="x"?C.scale.x:C.scale.x*T,I=r==="x"||s==="y"?C.scale.y:C.scale.y*T;_.updateLayer(e,y,{transform:{position:C.pos,scale:{x:Math.max(.01,w),y:Math.max(.01,I)},rotation:C.rotation,anchorPoint:{x:0,y:0}}})}return}switch(t){case"grab":{let g=v,y=m;if((r==="x"||s==="x")&&(y=0),(r==="y"||s==="y")&&(g=0),c&&(g*=.1,y*=.1),b){const C=h.keys().next().value;if(C){const T=h.get(C);if(T){const w=T.pos.x+g,I=T.pos.y+y,E=this.snapping.snapPoint(w,I,p,6);if(E.snapped){const S=E.x-w,L=E.y-I;g+=S,y+=L,this.lastSnapLines=E.lines}else this.lastSnapLines=[]}}}else this.lastSnapLines=[];for(const[C,T]of h)_.updateLayer(e,C,{transform:{position:{x:T.pos.x+g,y:T.pos.y+y},scale:T.scale,rotation:T.rotation,anchorPoint:{x:0,y:0}}});break}case"rotate":{let g;if(this._handlePivotWorld){const C=this.cameraManager.screenToWorld(this.startMouseScreen.x,this.startMouseScreen.y),T=this.startMouseScreen.x+n.x,w=this.startMouseScreen.y+n.y,I=this.cameraManager.screenToWorld(T,w),E=this._handlePivotWorld,S=Math.atan2(C.y-E.y,C.x-E.x);g=(Math.atan2(I.y-E.y,I.x-E.x)-S)*(180/Math.PI)}else g=n.x*(c?.05:.5);const y=l?Math.round(g/5)*5:g;for(const[C,T]of h)_.updateLayer(e,C,{transform:{position:T.pos,scale:T.scale,rotation:T.rotation+y,anchorPoint:{x:0,y:0}}});break}case"scale":{let g=1,y=1;if(this._handlePivotWorld){const w=this._handlePivotWorld,I=this.cameraManager.screenToWorld(this.startMouseScreen.x,this.startMouseScreen.y),E=this.startMouseScreen.x+n.x,S=this.startMouseScreen.y+n.y,L=this.cameraManager.screenToWorld(E,S),q=Math.abs(I.x-w.x),G=Math.abs(I.y-w.y),Y=Math.abs(L.x-w.x),ee=Math.abs(L.y-w.y);g=q>.001?Y/q:1,y=G>.001?ee/G:1,g=Math.max(.01,g),y=Math.max(.01,y)}else{const w=Math.hypot(this.startMouseScreen.x||1,this.startMouseScreen.y||1),I=Math.hypot(n.x,n.y);let E;w>5?E=Math.max(.01,I/w):E=1+Math.hypot(n.x,n.y)*.005,g=E,y=E}c&&(g=1+(g-1)*.1,y=1+(y-1)*.1);let C=g,T=y;if((r==="y"||s==="x")&&(T=1),(r==="x"||s==="y")&&(C=1),u){const w=Math.max(C,T);C=w,T=w}l&&(C=Math.round(C*10)/10,T=Math.round(T*10)/10),C=Math.max(.01,C),T=Math.max(.01,T);for(const[w,I]of h)_.updateLayer(e,w,{transform:{position:I.pos,scale:{x:I.scale.x*C,y:I.scale.y*T},rotation:I.rotation,anchorPoint:{x:0,y:0}}});break}}}_releasePointerLock(){this._boundPointerLockChange&&(document.removeEventListener("pointerlockchange",this._boundPointerLockChange),this._boundPointerLockChange=null),this._exitingByChoice=!0,document.pointerLockElement===this._canvas&&document.exitPointerLock(),this._canvas=null}_onPointerLockChange(){!document.pointerLockElement&&this._active&&!this._exitingByChoice&&this.cancel(),this._exitingByChoice=!1}_syncStartTransformsFromStore(){if(!this._compId)return;const e=ot.getState().compositions.find(t=>t.id===this._compId);if(e)for(const[t,n]of this._startTransforms){const r=e.layers.find(s=>s.id===t);r&&(n.pos={...r.transform.position},n.scale={...r.transform.scale},n.rotation=r.transform.rotation)}}_buildSnapTargets(e,t){const n=e.width/2,r=e.height/2;return{compLeft:-n,compRight:n,compTop:r,compBottom:-r,compCenterX:0,compCenterY:0,guidesH:[],guidesV:[],layers:e.layers.filter(s=>s.visible&&!t.includes(s.id)).map(s=>{const a=s.transform,o=50,c=50;return{id:s.id,left:a.position.x-o*(a.scale.x/100),right:a.position.x+o*(a.scale.x/100),top:a.position.y+c*(a.scale.y/100),bottom:a.position.y-c*(a.scale.y/100),centerX:a.position.x,centerY:a.position.y}})}}_emitState(){this._onStateChange?.(this.getTransformInfo())}};z(Bn,"activeAnywhere",!1);let Ys=Bn;class sm{constructor(){z(this,"pool",new Map);z(this,"activeCount",0)}acquire(e,t){const n=this._key({w:Math.ceil(e),h:Math.ceil(t)}),r=this.pool.get(n);if(r&&r.length>0)return this.activeCount++,r.pop();const s=new En(Math.ceil(e),Math.ceil(t),{minFilter:bt,magFilter:bt,format:Bt,type:_i,depthBuffer:!1,stencilBuffer:!1});return this.activeCount++,s}release(e){const t=this._key({w:e.width,h:e.height}),n=this.pool.get(t)||[];n.push(e),this.pool.set(t,n),this.activeCount--,n.length>4&&n.splice(0,n.length-4).forEach(s=>s.dispose())}dispose(){for(const e of this.pool.values())e.forEach(t=>t.dispose());this.pool.clear(),this.activeCount=0}get active(){return this.activeCount}_key(e){return`${e.w}x${e.h}`}}const Hn=new sm;let hr=null;function yo(){if(!hr){const i=new vt(2,2),e=new Xt({depthWrite:!1,depthTest:!1});hr=new dt(i,e),hr.frustumCulled=!1}return hr}class am{constructor(e){z(this,"renderer");z(this,"materialCache",new Map);z(this,"sourceTexture",null);z(this,"layerWidth",0);z(this,"layerHeight",0);z(this,"_lastResult",null);this.renderer=e}setSource(e,t,n){this.sourceTexture=e,this.layerWidth=Math.max(1,Math.ceil(t)),this.layerHeight=Math.max(1,Math.ceil(n))}render(e){if(!this.sourceTexture)return null;const t=e.filter(h=>h.enabled);if(t.length===0)return this.sourceTexture;this.releaseResult();const{renderer:n,layerWidth:r,layerHeight:s}=this,a=Hn.acquire(r,s),o=Hn.acquire(r,s),c=yo();this._blit(n,this.sourceTexture,a);let l=a,u=o;for(let h=0;h<t.length;h++){const p=t[h],f=uc.get(p.type);if(!f)continue;const _=this._getMaterial(f,p);_&&(this._syncUniforms(_,p),_.uniforms.uTexture.value=l.texture,_.uniforms.uResolution?.value?.set?.(r,s),n.setRenderTarget(u),n.clear(),c.material!==_&&(c.material=_),n.render(c,this._identityCamera()),[l,u]=[u,l])}return Hn.release(u),this._lastResult=l,l.texture}releaseResult(){this._lastResult&&(Hn.release(this._lastResult),this._lastResult=null)}_syncUniforms(e,t){for(const n of t.parameters){const r=e.uniforms[n.uniform];if(!r)continue;const s=n.value;Array.isArray(s)&&r.value?.set?r.value.set(s[0],s[1]):typeof s=="string"&&n.type==="color"&&r.value?.set?r.value.set(s):r.value=s}}_blit(e,t,n){const r=yo(),s=r.material;s.map=t,e.setRenderTarget(n),e.clear(),e.render(r,this._identityCamera())}_getMaterial(e,t){const n=`${e.type}_${t.id}`;if(this.materialCache.has(n))return this.materialCache.get(n);const r={uTexture:{value:null},uResolution:{value:new We(this.layerWidth,this.layerHeight)}};for(const c of t.parameters)c.type==="color"?r[c.uniform]={value:new Ve(c.value)}:c.type==="vector2"&&Array.isArray(c.value)?r[c.uniform]={value:new We(c.value[0],c.value[1])}:r[c.uniform]={value:c.value};const s=`void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,a=this._getFallbackShader(e.type),o=new hn({vertexShader:s,fragmentShader:a,uniforms:r,transparent:!0,depthWrite:!1,depthTest:!1});return this.materialCache.set(n,o),o}_getFallbackShader(e){switch(e){case"gaussianBlur":case"boxBlur":return this._blurShader();case"glow":return this._glowShader();case"colorCorrection":return this._colorCorrectShader();case"dropShadow":return this._dropShadowShader();case"tint":return this._tintShader();case"invert":return this._invertShader();case"threshold":return this._thresholdShader();case"hueSaturation":return this._hueSatShader();case"levels":return this._levelsShader();case"fill":return this._fillShader();case"gradient":return this._gradientShader();case"wave":return this._waveShader();default:return`uniform sampler2D uTexture; varying vec2 vUv;
          void main() { gl_FragColor = texture2D(uTexture, vUv); }`}}_blurShader(){return`uniform sampler2D uTexture; uniform float uRadius; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        vec2 off = vec2(1.0 / uResolution.x, 1.0 / uResolution.y) * uRadius;
        vec4 col = vec4(0.0);
        float total = 0.0;
        for (int x = -3; x <= 3; x++) {
          for (int y = -3; y <= 3; y++) {
            float w = exp(-float(x*x + y*y) / (2.0 * max(uRadius, 1.0)));
            col += texture2D(uTexture, vUv + vec2(float(x)*off.x, float(y)*off.y)) * w;
            total += w;
          }
        }
        gl_FragColor = col / total;
      }`}_glowShader(){return`uniform sampler2D uTexture; uniform float uThreshold; uniform float uIntensity; uniform vec3 uColor; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
        float glow = max(0.0, lum - uThreshold) * uIntensity;
        vec2 off = vec2(1.0 / uResolution.x, 1.0 / uResolution.y) * 8.0;
        vec4 blur = vec4(0.0);
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++)
          blur += texture2D(uTexture, vUv + vec2(float(x)*off.x, float(y)*off.y));
        blur /= 25.0;
        gl_FragColor = src + vec4(uColor * glow, 0.0) * blur.a;
      }`}_colorCorrectShader(){return`uniform sampler2D uTexture; uniform float uBrightness; uniform float uContrast; uniform float uSaturation; uniform float uHue; uniform float uGamma;
      varying vec2 vUv;
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      void main() {
        vec4 col = texture2D(uTexture, vUv);
        col.rgb = pow(col.rgb, vec3(1.0 / max(uGamma, 0.01)));
        col.rgb = (col.rgb - 0.5) * (1.0 + uContrast / 100.0) + 0.5;
        col.rgb += uBrightness / 100.0;
        vec3 hsv = rgb2hsv(col.rgb);
        hsv.x += uHue / 360.0;
        hsv.y *= (1.0 + uSaturation / 100.0);
        col.rgb = hsv2rgb(hsv);
        gl_FragColor = col;
      }`}_dropShadowShader(){return`uniform sampler2D uTexture; uniform vec3 uColor; uniform float uOpacity; uniform float uDistance; uniform float uSoftness; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        vec2 dir = normalize(vec2(1.0, -1.0)) * uDistance * vec2(1.0 / uResolution.x, 1.0 / uResolution.y);
        vec2 blurOff = vec2(1.0 / uResolution.x, 1.0 / uResolution.y) * uSoftness;
        vec4 shadow = vec4(0.0);
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++)
          shadow += texture2D(uTexture, vUv - dir + vec2(float(x)*blurOff.x, float(y)*blurOff.y));
        shadow /= 25.0;
        float shadowAlpha = shadow.a * uOpacity;
        gl_FragColor = vec4(mix(src.rgb, uColor, shadowAlpha), max(src.a, shadowAlpha));
      }`}_tintShader(){return`uniform sampler2D uTexture; uniform vec3 uColorA; uniform vec3 uColorB;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
        vec3 tinted = mix(uColorA, uColorB, lum);
        gl_FragColor = vec4(tinted, src.a);
      }`}_invertShader(){return`uniform sampler2D uTexture; varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        gl_FragColor = vec4(1.0 - src.rgb, src.a);
      }`}_thresholdShader(){return`uniform sampler2D uTexture; uniform float uLevel; uniform float uSmoothness;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
        float thresh = smoothstep(uLevel - uSmoothness, uLevel + uSmoothness, lum);
        gl_FragColor = vec4(vec3(thresh), src.a * thresh);
      }`}_hueSatShader(){return`uniform sampler2D uTexture; uniform float uHueShift; uniform float uSatFactor;
      varying vec2 vUv;
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        vec3 hsv = rgb2hsv(src.rgb);
        hsv.x += uHueShift / 360.0;
        hsv.y *= uSatFactor;
        gl_FragColor = vec4(hsv2rgb(hsv), src.a);
      }`}_levelsShader(){return`uniform sampler2D uTexture; uniform float uInputBlack; uniform float uInputWhite; uniform float uGamma; uniform float uOutputBlack; uniform float uOutputWhite;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        vec3 c = src.rgb;
        c = (c - uInputBlack) / max(uInputWhite - uInputBlack, 0.001);
        c = pow(max(c, 0.0), vec3(1.0 / max(uGamma, 0.01)));
        c = c * (uOutputWhite - uOutputBlack) + uOutputBlack;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), src.a);
      }`}_fillShader(){return`uniform sampler2D uTexture; uniform vec3 uFillColor; uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        gl_FragColor = vec4(mix(src.rgb, uFillColor, uOpacity), src.a);
      }`}_gradientShader(){return`uniform sampler2D uTexture; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uAngle; uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float a = radians(uAngle);
        vec2 dir = vec2(cos(a), sin(a));
        float t = dot(vUv - 0.5, dir) + 0.5;
        vec3 grad = mix(uColorA, uColorB, clamp(t, 0.0, 1.0));
        gl_FragColor = vec4(mix(src.rgb, grad, uOpacity), src.a);
      }`}_waveShader(){return`uniform sampler2D uTexture; uniform float uAmplitude; uniform float uFrequency; uniform float uSpeed; uniform vec2 uDirection; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        float wave = sin(uv.x * uFrequency * 10.0 + uSpeed) * uAmplitude / uResolution.x;
        uv.x += wave * uDirection.x;
        uv.y += wave * uDirection.y;
        gl_FragColor = texture2D(uTexture, clamp(uv, 0.0, 1.0));
      }`}_identityCamera(){const e=new Lr(-1,1,1,-1,0,1);return e.position.z=0,e}dispose(){for(const e of this.materialCache.values())e.dispose();this.materialCache.clear(),this.releaseResult()}}class om{constructor(e){z(this,"renderer");z(this,"effectChains",new Map);z(this,"effectQuads",new Map);z(this,"privateScene");z(this,"_enabledEffects",new Set);this.renderer=e,this.privateScene=new tc}prepareFrame(e){const t=pa.getState();this._enabledEffects.clear();for(const r of e)(t.effectsByLayer[r]??[]).filter(o=>o.enabled).length>0?(this._enabledEffects.add(r),this.effectChains.has(r)||this.effectChains.set(r,new am(this.renderer))):(this._removeEffectQuad(r),this.effectChains.get(r)?.dispose(),this.effectChains.delete(r));const n=new Set(e);for(const[r]of this.effectChains)n.has(r)||(this.effectChains.get(r)?.dispose(),this.effectChains.delete(r),this._removeEffectQuad(r))}renderLayer(e,t,n,r,s){if(!this._enabledEffects.has(e))return;const a=this.effectChains.get(e);if(!a)return;const c=(pa.getState().effectsByLayer[e]??[]).filter(m=>m.enabled);if(c.length===0)return;const l=Math.max(1,n),u=Math.max(1,r),h=Hn.acquire(l,u);for(;this.privateScene.children.length>0;)this.privateScene.remove(this.privateScene.children[0]);const p=t.clone();p.geometry=t.geometry,p.material=t.material,p.position.copy(t.position),p.scale.copy(t.scale),p.rotation.copy(t.rotation),this.privateScene.add(p);const f=this._identityCamera();this.renderer.setRenderTarget(h),this.renderer.clear(),this.renderer.render(this.privateScene,f),a.setSource(h.texture,l,u);const _=a.render(c);if(!_){Hn.release(h);return}Hn.release(h);let v=this.effectQuads.get(e);if(v){const m=new vt(n||l,r||u);v.geometry.dispose(),v.geometry=m,v.material.map=_,v.material.needsUpdate=!0}else{const m=new vt(n||l,r||u),d=new Xt({map:_,transparent:!0,depthWrite:!1,depthTest:!1});v=new dt(m,d),v.name=`${e}_effect`,v.frustumCulled=!1,v.renderOrder=1,this.effectQuads.set(e,v),s.add(v)}v.position.set(0,0,0),v.scale.copy(t.scale),v.rotation.set(0,0,0)}removeLayerEffects(e){this._removeEffectQuad(e),this.effectChains.get(e)?.dispose(),this.effectChains.delete(e),this._enabledEffects.delete(e)}dispose(){for(const[e]of this.effectChains)this._removeEffectQuad(e);for(const e of this.effectChains.values())e.dispose();this.effectChains.clear(),this._enabledEffects.clear()}hasEffects(e){return this._enabledEffects.has(e)}_removeEffectQuad(e){const t=this.effectQuads.get(e);t&&(t.parent?.remove(t),t.geometry.dispose(),t.material instanceof bn&&t.material.dispose(),this.effectQuads.delete(e))}_identityCamera(){return new Lr(-1,1,1,-1,0,1)}}class cm{constructor(e){z(this,"renderer");z(this,"sceneManager");z(this,"cameraManager");z(this,"renderLoop");z(this,"resizeHandler");z(this,"snapping");z(this,"layerSync");z(this,"hitTester");z(this,"selectionOverlay");z(this,"modalTransform");z(this,"effectsRenderer");z(this,"_state",{fps:0,zoom:1,frameCount:0});z(this,"_onStateChange");z(this,"_composition",null);this.renderer=new Np({antialias:!0,alpha:!1}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)),this.renderer.setClearColor(1710618,1),this.renderer.domElement.style.display="block",this.renderer.domElement.style.width="100%",this.renderer.domElement.style.height="100%",e.appendChild(this.renderer.domElement),this.sceneManager=new Yp,this.cameraManager=new Kp,this.snapping=new nc,this.layerSync=new nm(this.sceneManager),this.hitTester=new im(this.sceneManager,this.cameraManager),this.selectionOverlay=new rm(e,this.cameraManager),this.modalTransform=new Ys(this.cameraManager),this.effectsRenderer=new om(this.renderer),this.selectionOverlay.mount(),this.renderLoop=new jp(this.renderer,this.sceneManager.scene,this.cameraManager.camera),this.resizeHandler=new $p(this.renderer,this.cameraManager,this.renderLoop),this.cameraManager.onChanged=()=>this.renderLoop.requestRender(),this.renderLoop.beforeRender=()=>this._processEffects(),this.renderLoop.onFrame=t=>{const n=this.cameraManager.getViewportTransform();this._state={fps:t.fps,zoom:n.zoom,frameCount:t.frameCount},this._onStateChange?.(this._state)},this.resizeHandler.observe(e),this.renderLoop.start()}applyComposition(e){this._composition=e,this.sceneManager.applyComposition(e.width,e.height,e.backgroundColor),this.cameraManager.setCompositionSize(e.width,e.height),this.renderLoop.requestRender()}get composition(){return this._composition}setGridVisible(e){e?this.sceneManager.grid.show():this.sceneManager.grid.hide(),this.renderLoop.requestRender()}setSafeZonesVisible(e){e?this.sceneManager.safeZones.show():this.sceneManager.safeZones.hide(),this.renderLoop.requestRender()}setSnappingEnabled(e){this.snapping.enabled=e}getState(){return{...this._state}}set onStateChange(e){this._onStateChange=e}_processEffects(){const e=[];for(const t of this.sceneManager.layerGroup.children){const n=this.layerSync.getRenderer(t.name);if(n){e.push(n.id);const r=this.effectsRenderer.hasEffects(n.id);this._toggleOriginalMesh(n,!r)}}this.effectsRenderer.prepareFrame(e);for(const t of this.sceneManager.layerGroup.children){const n=this.layerSync.getRenderer(t.name);if(n&&this.effectsRenderer.hasEffects(n.id)){const r=n.geometryWidth(),s=n.geometryHeight();this.effectsRenderer.renderLayer(n.id,n.mesh,r,s,n.group)}}}_toggleOriginalMesh(e,t){e.mesh.visible!==t&&(e.mesh.visible=t)}get canvas(){return this.renderer.domElement}dispose(){this.renderLoop.dispose(),this.resizeHandler.dispose(),this.sceneManager.dispose(),this.cameraManager.dispose(),this.layerSync.clear(),this.effectsRenderer.dispose(),this.selectionOverlay.dispose(),this.renderer.dispose(),this.renderer.domElement.parentElement&&this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)}}function lm(i){const e=Fe.useRef(null),[t,n]=Fe.useState(!1),[r,s]=Fe.useState({fps:0,zoom:1,frameCount:0}),[a,o]=Fe.useState(null),c=Fe.useRef(null),l=ot(g=>{const y=g.activeCompositionId;return y?g.compositions.find(C=>C.id===y)??null:null}),u=ot(g=>g.activeCompositionId?g.compositions.find(C=>C.id===g.activeCompositionId)?.layers??[]:[]),h=Vt(g=>g.selected.filter(y=>y.type==="layer").map(y=>y.id)),p=bo(g=>g.activeTool),f=It(g=>g.settings.showGrid),_=It(g=>g.settings.showSafeZones),v=It(g=>g.settings.snappingEnabled);Fe.useEffect(()=>{if(!i)return;const g=new cm(i);return g.onStateChange=y=>s(y),e.current=g,n(!0),hc(()=>g.renderLoop.requestRender()),()=>{g.dispose(),e.current=null,n(!1)}},[i]);const m=Fe.useRef("");Fe.useEffect(()=>{const g=e.current;if(!g||!l)return;const y=`${l.id}_${l.width}_${l.height}_${l.fps}_${l.backgroundColor}`;m.current!==y&&(m.current=y,g.applyComposition(l))},[l]),Fe.useEffect(()=>{const g=e.current;!g||!l||(g.layerSync.sync(u),g.renderLoop.requestRender())},[l?.id,u]),Fe.useEffect(()=>{const g=e.current;if(!g)return;const y=g.modalTransform;let C=null;const T=y.active;T&&y.mode==="grab"?C="move":T&&y.mode==="rotate"?C="rotate":T&&y.mode==="scale"?C="scale":p===yt.MOVE?C="move":p===yt.ROTATE?C="rotate":p===yt.SCALE&&(C="scale"),g.selectionOverlay.gizmoMode=C,g.selectionOverlay.hideHandles=T},[p,t,a]),Fe.useEffect(()=>{const g=e.current;if(g)if(h.length===0)g.selectionOverlay.hide();else{g.selectionOverlay.show();const y=[];for(const C of h){const T=g.layerSync.getRenderer(C);T&&y.push(T)}g.selectionOverlay.update(y)}},[h,u,r.zoom,p,a]),Fe.useEffect(()=>{const g=e.current;if(!g)return;const y=()=>{const w=g.modalTransform,I=w.active?w.mode?.toUpperCase()??null:null;c.current=I,o(I)};document.addEventListener("transform:grab",y),document.addEventListener("transform:rotate",y),document.addEventListener("transform:scale",y);const C=()=>y(),T=w=>{(w.key==="Escape"||w.key==="Enter")&&y()};return document.addEventListener("mouseup",C),document.addEventListener("keyup",T),()=>{document.removeEventListener("transform:grab",y),document.removeEventListener("transform:rotate",y),document.removeEventListener("transform:scale",y),document.removeEventListener("mouseup",C),document.removeEventListener("keyup",T)}},[t]),Fe.useEffect(()=>{e.current&&e.current.setGridVisible(f)},[f]),Fe.useEffect(()=>{e.current&&e.current.setSafeZonesVisible(_)},[_]),Fe.useEffect(()=>{e.current&&e.current.setSnappingEnabled(v)},[v]),Fe.useEffect(()=>{!e.current||!l||e.current.sceneManager.updateGrid(r.zoom)},[l,r.zoom]),Fe.useEffect(()=>{const g=e.current;if(!g)return;const y=()=>g.cameraManager.fitToComposition(),C=()=>g.cameraManager.fitToComposition(),T=()=>g.cameraManager.zoomTo100Percent(),w=()=>g.modalTransform.start("grab",g.canvas),I=()=>g.modalTransform.start("rotate",g.canvas),E=()=>g.modalTransform.start("scale",g.canvas);return document.addEventListener("viewport:frameAll",y),document.addEventListener("viewport:frameSelected",C),document.addEventListener("viewport:zoom100",T),document.addEventListener("transform:grab",w),document.addEventListener("transform:rotate",I),document.addEventListener("transform:scale",E),()=>{document.removeEventListener("viewport:frameAll",y),document.removeEventListener("viewport:frameSelected",C),document.removeEventListener("viewport:zoom100",T),document.removeEventListener("transform:grab",w),document.removeEventListener("transform:rotate",I),document.removeEventListener("transform:scale",E)}},[t]);const d=Fe.useCallback(()=>{e.current?.cameraManager.fitToComposition()},[]),b=Fe.useCallback(g=>{e.current?.cameraManager.setZoom(g)},[]);return{ready:t,state:r,viewportState:{fps:r.fps,zoom:r.zoom,frameCount:r.frameCount,selectedLayerIds:h,transformMode:a},renderer:e.current,zoomToFit:d,setZoom:b}}function us(){return`layer_${Date.now()}_${Math.random().toString(36).slice(2,7)}`}function um({canvas:i,cameraManager:e,hitTester:t,modalTransform:n,requestRender:r}){const s=Fe.useRef(!1),a=Fe.useRef(!1),o=Fe.useRef(!1),c=Fe.useRef(!1),l=Fe.useRef({x:0,y:0}),u=Fe.useRef({x:0,y:0}),h=Fe.useRef(e),p=Fe.useRef(t),f=Fe.useRef(n),_=Fe.useRef(i),v=Fe.useRef(null),m=Fe.useRef(!1);Fe.useEffect(()=>{if(!i)return;_.current=i;const d=i;let b=null,g=null,y=null,C=null,T=null,w=null;function I(){E(),y=U=>{const H=f.current;if(!(!H?.active||!h.current))if(document.pointerLockElement===_.current)(U.movementX!==0||U.movementY!==0)&&(m.current=!0,H.updateDelta(U.movementX,U.movementY));else{const Q=U.clientX-l.current.x,ie=U.clientY-l.current.y;l.current={x:U.clientX,y:U.clientY},(Q!==0||ie!==0)&&(m.current=!0,H.updateDelta(Q,ie))}},C=U=>{const H=f.current;H?.active&&(U.button===2?H.cancel():U.button===0&&H.confirm(),m.current=!1,E())},T=U=>{const H=f.current;if(H?.active){if(U.key==="Escape"){H.cancel(),E();return}if(U.key==="Enter"){H.confirm(),E();return}if(U.key==="x"&&!U.shiftKey){H.setAxisLock("x"),q();return}if(U.key==="y"&&!U.shiftKey){H.setAxisLock("y"),q();return}if(U.key==="X"&&U.shiftKey){H.setAxisExclude("x"),q();return}if(U.key==="Y"&&U.shiftKey){H.setAxisExclude("y"),q();return}if(U.key==="Shift"){H.setPrecisionMode(!0);return}if(U.key==="Control"){H.setSnapMode(!0);return}if(U.key==="Alt"){H.setAspectLock(!0);return}if(/^[0-9.\-]$/.test(U.key)){H.pushNumericChar(U.key);return}if(U.key==="Backspace"){H.backspaceNumeric();return}}},w=U=>{const H=f.current;if(H?.active){if(U.key==="Shift"){H.setPrecisionMode(!1);return}if(U.key==="Control"){H.setSnapMode(!1);return}if(U.key==="Alt"){H.setAspectLock(!1);return}}},document.addEventListener("mousemove",y),document.addEventListener("mouseup",C),document.addEventListener("keydown",T),document.addEventListener("keyup",w),S()}function E(){y&&document.removeEventListener("mousemove",y),C&&document.removeEventListener("mouseup",C),T&&document.removeEventListener("keydown",T),w&&document.removeEventListener("keyup",w),y=null,C=null,T=null,w=null,L()}function S(){L();const U=d.parentElement;if(!U)return;const H=document.createElementNS("http://www.w3.org/2000/svg","svg");H.style.position="absolute",H.style.inset="0",H.style.pointerEvents="none",H.style.zIndex="24",H.style.width="100%",H.style.height="100%",U.appendChild(H),v.current=H}function L(){v.current&&v.current.parentElement&&v.current.parentElement.removeChild(v.current),v.current=null}function q(){const U=v.current,H=f.current;if(!U||!H?.active||!H.axisLock&&!H.axisExclude){U&&(U.innerHTML="");return}U.innerHTML="";const Q="http://www.w3.org/2000/svg",ie=U.clientWidth||300,de=U.clientHeight||200,Ce=ie/2,R=de/2;if(H.axisLock==="x"){const ce=document.createElementNS(Q,"line");ce.setAttribute("x1","0"),ce.setAttribute("y1",String(R)),ce.setAttribute("x2",String(ie)),ce.setAttribute("y2",String(R)),ce.setAttribute("stroke","#ff4444"),ce.setAttribute("stroke-width","1"),ce.setAttribute("stroke-dasharray","4 2"),U.appendChild(ce)}if(H.axisLock==="y"){const ce=document.createElementNS(Q,"line");ce.setAttribute("x1",String(Ce)),ce.setAttribute("y1","0"),ce.setAttribute("x2",String(Ce)),ce.setAttribute("y2",String(de)),ce.setAttribute("stroke","#44ff44"),ce.setAttribute("stroke-width","1"),ce.setAttribute("stroke-dasharray","4 2"),U.appendChild(ce)}if(H.axisExclude==="x"){const ce=document.createElementNS(Q,"line");ce.setAttribute("x1","0"),ce.setAttribute("y1",String(R)),ce.setAttribute("x2",String(ie)),ce.setAttribute("y2",String(R)),ce.setAttribute("stroke","rgba(255,68,68,0.4)"),ce.setAttribute("stroke-width","1"),ce.setAttribute("stroke-dasharray","2 3"),U.appendChild(ce)}if(H.axisExclude==="y"){const ce=document.createElementNS(Q,"line");ce.setAttribute("x1",String(Ce)),ce.setAttribute("y1","0"),ce.setAttribute("x2",String(Ce)),ce.setAttribute("y2",String(de)),ce.setAttribute("stroke","rgba(68,255,68,0.4)"),ce.setAttribute("stroke-width","1"),ce.setAttribute("stroke-dasharray","2 3"),U.appendChild(ce)}}const G=U=>{const H=d.parentElement;if(!H)return null;const Q=document.createElementNS("http://www.w3.org/2000/svg","svg");return Q.style.position="absolute",Q.style.inset="0",Q.style.pointerEvents="none",Q.style.zIndex=U==="draw"?"22":"20",Q.style.width="100%",Q.style.height="100%",H.appendChild(Q),Q},Y=()=>bo.getState().activeTool;function ee(U,H,Q,ie,de){const Ce=h.current,R=p.current;if(!Ce||!R)return!1;const ce=ot.getState(),Le=ce.activeCompositionId;if(!Le)return!1;const fe=ce.compositions.find(pe=>pe.id===Le);if(!fe)return!1;const ge=fe.layers.filter(pe=>pe.visible&&!pe.locked).map(pe=>pe.id),Oe=R.hitTest(U,H,ge);if(!Oe)return!1;if(Vt.getState().select({type:"layer",id:Oe.layerId,compositionId:Le}),f.current){const pe=de===yt.ROTATE?"rotate":de===yt.SCALE?"scale":"grab";f.current.start(pe),f.current.startMouseScreen={x:Q,y:ie},m.current=!1,l.current={x:Q,y:ie},I()}return s.current=!1,!0}const X=d.parentElement,ne=U=>{const H=U.target,Q=H?.getAttribute?.("data-handle"),ie=H?.getAttribute?.("data-gizmo");if(!Q&&!ie||!f.current)return;U.preventDefault(),U.stopPropagation();let de;if(Q==="rotate"?de="rotate":Q||ie==="corner"||ie==="edge"||ie==="scale-uniform"||ie==="scale-x"||ie==="scale-y"?de="scale":ie?.startsWith("rotate")?de="rotate":ie?.startsWith("scale")?de="scale":de="grab",f.current.start(de),f.current.startMouseScreen={x:U.clientX,y:U.clientY},Q&&de!=="grab"&&h.current){const Ce=ot.getState(),R=Ce.activeCompositionId;if(R){const ce=Ce.compositions.find(fe=>fe.id===R),Le=Vt.getState().getSelectedIds();if(ce&&Le.length>0){const fe=ce.layers.find(ge=>ge.id===Le[0]);if(fe){const ge=fe.transform.position,Oe=fe.transform.scale;let pe=50,Te=50;"width"in(fe.data||{})&&"height"in(fe.data||{})&&(pe=fe.data.width/2*(Oe.x/100),Te=fe.data.height/2*(Oe.y/100));const A=(fe.transform.rotation||0)*(Math.PI/180),x=Math.cos(A),F=Math.sin(A);let V=0,j=0;Q==="tl"?(V=pe,j=-Te):Q==="tr"?(V=-pe,j=-Te):Q==="br"?(V=-pe,j=Te):Q==="bl"?(V=pe,j=Te):Q==="top"?(V=0,j=-Te):Q==="bottom"?(V=0,j=Te):Q==="left"?(V=pe,j=0):Q==="right"&&(V=-pe,j=0);const Z=V*x-j*F,Re=V*F+j*x;f.current.setHandlePivotWorld({x:ge.x+Z,y:ge.y+Re})}}}}ie==="move-x"||ie==="scale-x"?f.current.setAxisLock("x"):ie==="move-y"||ie==="scale-y"?f.current.setAxisLock("y"):(ie==="scale-uniform"||Q==="corner"||Q==="tl"||Q==="tr"||Q==="br"||Q==="bl")&&f.current.setAspectLock(!0),(Q==="top"||Q==="bottom")&&f.current.setAxisLock("y"),(Q==="left"||Q==="right")&&f.current.setAxisLock("x"),m.current=!1,l.current={x:U.clientX,y:U.clientY},I()};X&&X.addEventListener("mousedown",ne);const W=U=>{if(U.button===1||U.button===0&&(U.ctrlKey||U.metaKey)){s.current=!0,l.current={x:U.clientX,y:U.clientY},U.preventDefault();return}if(U.button!==0)return;const H=Y(),Q=d.getBoundingClientRect(),ie=U.clientX-Q.left,de=U.clientY-Q.top;if(h.current=e,p.current=t,f.current=n,!((H===yt.MOVE||H===yt.ROTATE||H===yt.SCALE)&&ee(ie,de,U.clientX,U.clientY,H))){if(H===yt.PEN){if(h.current){const Ce=h.current.screenToWorld(ie,de),R=ot.getState(),ce=R.activeCompositionId;if(ce){const Le=R.compositions.find(fe=>fe.id===ce);if(Le){const fe=Le.layers.filter(pe=>pe.type==="shape").length+1,Oe={...Fr("shape",`Path ${fe}`),id:us(),zIndex:Le.layers.length+1,transform:{position:{x:Ce.x,y:Ce.y},scale:{x:100,y:100},rotation:0,anchorPoint:{x:0,y:0}},data:{type:"rectangle",width:50,height:50,borderRadius:0}};ot.getState().addLayer(ce,Oe),Vt.getState().select({type:"layer",id:Oe.id,compositionId:ce})}}}return}if(H===yt.TEXT){if(h.current){const Ce=h.current.screenToWorld(ie,de),R=ot.getState(),ce=R.activeCompositionId;if(ce){const Le=R.compositions.find(fe=>fe.id===ce);if(Le){const fe=Le.layers.filter(pe=>pe.type==="text").length+1,Oe={...Fr("text",`Text ${fe}`),id:us(),zIndex:Le.layers.length+1,transform:{position:{x:Ce.x,y:Ce.y},scale:{x:100,y:100},rotation:0,anchorPoint:{x:0,y:0}},data:{text:"Text",fontFamily:"Inter",fontSize:48,fontWeight:400,color:"#ffffff",lineHeight:1.2,letterSpacing:0,alignment:"center"}};ot.getState().addLayer(ce,Oe),Vt.getState().select({type:"layer",id:Oe.id,compositionId:ce})}}}return}if(f.current?.active){s.current=!1,l.current={x:ie,y:de};return}if(H===yt.HAND){s.current=!0,l.current={x:ie,y:de},U.preventDefault();return}if(H===yt.ZOOM){if(h.current){const Ce=U.altKey?.6666666666666666:1.5;h.current.setZoom(h.current.zoom*Ce)}return}if(H===yt.SHAPE_RECT||H===yt.SHAPE_ELLIPSE){u.current={x:ie,y:de},c.current=!0,b=G("draw");return}ee(ie,de,U.clientX,U.clientY,H)||(o.current=!0,u.current={x:ie,y:de},g=G("box"),!U.shiftKey&&!U.ctrlKey&&!U.metaKey&&Vt.getState().deselectAll())}},me=U=>{if(!f.current?.active){if(c.current&&h.current){const H=d.getBoundingClientRect(),Q=U.clientX-H.left,ie=U.clientY-H.top,de=Math.min(u.current.x,Q),Ce=Math.min(u.current.y,ie),R=Math.abs(Q-u.current.x),ce=Math.abs(ie-u.current.y);if(b){b.innerHTML="";const fe=document.createElementNS("http://www.w3.org/2000/svg","rect");fe.setAttribute("x",String(de)),fe.setAttribute("y",String(Ce)),fe.setAttribute("width",String(R)),fe.setAttribute("height",String(ce)),fe.setAttribute("fill","rgba(71, 114, 179, 0.2)"),fe.setAttribute("stroke","var(--color-accent)"),fe.setAttribute("stroke-width","1"),b.appendChild(fe)}return}if((s.current||a.current)&&h.current){const H=U.clientX-l.current.x,Q=U.clientY-l.current.y,ie=h.current.zoom;h.current.pan(-H*ie,Q*ie),l.current={x:U.clientX,y:U.clientY},r?.();return}if(o.current&&g&&h.current){const H=d.getBoundingClientRect(),Q=U.clientX-H.left,ie=U.clientY-H.top,de=Math.min(u.current.x,Q),Ce=Math.min(u.current.y,ie),R=Math.abs(Q-u.current.x),ce=Math.abs(ie-u.current.y);g.innerHTML="";const fe=document.createElementNS("http://www.w3.org/2000/svg","rect");fe.setAttribute("x",String(de)),fe.setAttribute("y",String(Ce)),fe.setAttribute("width",String(R)),fe.setAttribute("height",String(ce)),fe.setAttribute("fill","rgba(71, 114, 179, 0.15)"),fe.setAttribute("stroke","var(--color-accent)"),fe.setAttribute("stroke-width","1"),fe.setAttribute("stroke-dasharray","4 2"),g.appendChild(fe);const ge=ot.getState(),Oe=ge.activeCompositionId;if(Oe){const pe=ge.compositions.find(Te=>Te.id===Oe);if(pe){const Te=h.current.screenToWorld(de,Ce),A=h.current.screenToWorld(de+R,Ce+ce),x=pe.layers.filter(F=>{const V=F.transform;return V.position.x-50<A.x&&V.position.x+50>Te.x&&V.position.y-50<A.y&&V.position.y+50>Te.y});Vt.getState().replaceSelection(x.map(F=>F.id),Oe)}}}}},ve=U=>{if(U.button===1&&(s.current=!1),U.button===0){if(a.current=!1,s.current=!1,c.current){c.current=!1,b&&b.parentElement&&b.parentElement.removeChild(b),b=null;const H=Y(),Q=d.getBoundingClientRect(),ie=U.clientX-Q.left,de=U.clientY-Q.top,Ce=Math.abs(ie-u.current.x),R=Math.abs(de-u.current.y);if(Ce<5||R<5)return;if(h.current){const ce=U,Le=ce.shiftKey,fe=ce.altKey;let ge=Ce,Oe=R;if(Le){const V=Math.max(ge,Oe);ge=V,Oe=V}const pe=h.current.screenToWorld(fe?u.current.x:(u.current.x+ie)/2,fe?u.current.y:(u.current.y+de)/2),Te=ge*h.current.zoom,A=Oe*h.current.zoom,x=ot.getState(),F=x.activeCompositionId;if(F){const V=x.compositions.find(j=>j.id===F);if(V){const j=H===yt.SHAPE_RECT,Z=V.layers.filter(xe=>xe.type==="shape").length+1,ue={...Fr("shape",`${j?"Rectangle":"Ellipse"} ${Z}`),id:us(),zIndex:V.layers.length+1,transform:{position:{x:pe.x,y:pe.y},scale:{x:100,y:100},rotation:0,anchorPoint:{x:0,y:0}},data:j?{type:"rectangle",width:Math.round(Te),height:Math.round(A),borderRadius:0}:{type:"ellipse",radiusX:Math.round(Te/2),radiusY:Math.round(A/2)}};ot.getState().addLayer(F,ue),Vt.getState().select({type:"layer",id:ue.id,compositionId:F})}}}return}o.current&&(o.current=!1,g&&g.parentElement&&g.parentElement.removeChild(g),g=null)}},be=U=>{if(!h.current)return;U.preventDefault();const H=d.getBoundingClientRect(),Q=U.clientX-H.left,ie=U.clientY-H.top,de=h.current.screenToWorld(Q,ie),Ce=U.deltaY<0?1/Zt.ZOOM_FACTOR:Zt.ZOOM_FACTOR;h.current.setZoom(h.current.zoom*Ce);const R=h.current.screenToWorld(Q,ie);h.current.pan(de.x-R.x,de.y-R.y),r?.()},Ge=U=>U.preventDefault(),Ye=U=>{U.code==="Space"&&!U.repeat&&(a.current=!0,s.current=!0,U.preventDefault()),U.key==="Escape"&&f.current?.active&&(f.current.cancel(),E()),U.key==="Enter"&&f.current?.active&&(f.current.confirm(),E())},K=U=>{U.code==="Space"&&(a.current=!1,s.current=!1)},te=()=>{const U=f.current,H=_.current;U?.active&&H&&I()};return document.addEventListener("transform:grab",te),document.addEventListener("transform:rotate",te),document.addEventListener("transform:scale",te),d.addEventListener("mousedown",W),d.addEventListener("mousemove",me),d.addEventListener("mouseup",ve),d.addEventListener("wheel",be,{passive:!1}),d.addEventListener("contextmenu",Ge),document.addEventListener("keydown",Ye),document.addEventListener("keyup",K),()=>{X&&X.removeEventListener("mousedown",ne),document.removeEventListener("transform:grab",te),document.removeEventListener("transform:rotate",te),document.removeEventListener("transform:scale",te),d.removeEventListener("mousedown",W),d.removeEventListener("mousemove",me),d.removeEventListener("mouseup",ve),d.removeEventListener("wheel",be),d.removeEventListener("contextmenu",Ge),document.removeEventListener("keydown",Ye),document.removeEventListener("keyup",K),E(),b&&b.parentElement&&b.parentElement.removeChild(b),g&&g.parentElement&&g.parentElement.removeChild(g),L()}},[i,e,t,n])}function hm(i){const[e,t]=Fe.useState({width:0,height:0}),n=Fe.useRef(0);return Fe.useEffect(()=>{if(!i.current)return;const r=i.current,s=new ResizeObserver(()=>{n.current&&cancelAnimationFrame(n.current),n.current=requestAnimationFrame(()=>{const o=r.getBoundingClientRect();t({width:Math.floor(o.width),height:Math.floor(o.height)})})});s.observe(r);const a=r.getBoundingClientRect();return t({width:a.width,height:a.height}),()=>{s.disconnect(),n.current&&cancelAnimationFrame(n.current)}},[i]),e}const dm=({fps:i,zoom:e,showStats:t,viewportSize:n,selectedLayerIds:r,transformMode:s,onZoomChange:a,onFitToViewport:o})=>{const c=ot(v=>{const m=v.activeCompositionId;return m?v.compositions.find(d=>d.id===m)??null:null});if(!c)return null;const l=Math.round(1/(e||1)*100),u=Math.floor(c.currentTime*c.fps),h=Math.floor(c.duration*c.fps),p=r?.length??0,f=()=>a?.(e/Zt.ZOOM_FACTOR),_=()=>a?.(e*Zt.ZOOM_FACTOR);return re.jsxs("div",{className:"absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 pointer-events-none z-20",children:[re.jsxs("div",{className:"absolute top-0 left-0 -mt-8 flex items-center gap-1 pointer-events-auto",children:[re.jsx("button",{onClick:()=>It.getState().toggleGrid(),className:`w-5 h-5 flex items-center justify-center rounded-sm border-0 cursor-pointer text-[9px] ${It.getState().settings.showGrid?"bg-accent text-white":"bg-panel-header text-text-secondary hover:bg-bg-hover"}`,title:"Toggle Grid",children:re.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 10 10",fill:"none",stroke:"currentColor",strokeWidth:"0.8",children:[re.jsx("rect",{x:"0.5",y:"0.5",width:"9",height:"9"}),re.jsx("line",{x1:"3.5",y1:"0.5",x2:"3.5",y2:"9.5"}),re.jsx("line",{x1:"6.5",y1:"0.5",x2:"6.5",y2:"9.5"}),re.jsx("line",{x1:"0.5",y1:"3.5",x2:"9.5",y2:"3.5"}),re.jsx("line",{x1:"0.5",y1:"6.5",x2:"9.5",y2:"6.5"})]})}),re.jsx("button",{onClick:()=>It.getState().toggleSnapping(),className:`w-5 h-5 flex items-center justify-center rounded-sm border-0 cursor-pointer text-[9px] ${It.getState().settings.snappingEnabled?"bg-accent text-white":"bg-panel-header text-text-secondary hover:bg-bg-hover"}`,title:"Toggle Snapping",children:re.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 10 10",fill:"none",stroke:"currentColor",strokeWidth:"0.8",children:[re.jsx("circle",{cx:"5",cy:"5",r:"4"}),re.jsx("circle",{cx:"5",cy:"5",r:"1.5",fill:"currentColor"})]})})]}),re.jsxs("div",{className:"flex items-center gap-3 text-ui-xs text-text-disabled font-mono",children:[re.jsx("span",{className:"text-text-primary font-medium",children:c.name}),re.jsx("span",{className:"text-text-disabled",children:"|"}),re.jsxs("span",{children:[c.width,"×",c.height]}),re.jsx("span",{className:"text-text-disabled",children:"|"}),re.jsxs("span",{children:[c.fps," fps"]}),re.jsx("span",{className:"text-text-disabled",children:"|"}),re.jsxs("span",{children:[ma(c.currentTime,c.fps)," / ",ma(c.duration,c.fps)]}),re.jsx("span",{className:"text-text-disabled",children:"|"}),re.jsxs("span",{children:["Frame ",u,"/",h]})]}),re.jsxs("div",{className:"flex items-center gap-2",children:[s&&re.jsx("div",{className:"flex items-center gap-1 px-1.5 py-0.5 bg-accent text-white rounded-sm text-ui-xs font-mono font-semibold",children:re.jsx("span",{children:s})}),p>0&&re.jsxs("span",{className:"text-ui-xs text-text-secondary font-mono",children:[p," layer",p!==1?"s":""]})]}),re.jsxs("div",{className:"flex items-center gap-1 text-ui-xs text-text-disabled font-mono",children:[re.jsxs("div",{className:"flex items-center gap-0.5 pointer-events-auto",children:[re.jsx("button",{onClick:_,className:"w-4 h-4 flex items-center justify-center rounded-sm bg-panel-header hover:bg-bg-hover text-text-primary text-xs leading-none",title:"Zoom Out",children:"−"}),re.jsxs("button",{onClick:o,className:"px-1 h-4 flex items-center justify-center rounded-sm bg-panel-header hover:bg-bg-hover text-text-primary text-xs leading-none",title:"Fit to Viewport (Home)",children:[l,"%"]}),re.jsx("button",{onClick:f,className:"w-4 h-4 flex items-center justify-center rounded-sm bg-panel-header hover:bg-bg-hover text-text-primary text-xs leading-none",title:"Zoom In",children:"+"})]}),re.jsx("span",{className:"text-text-disabled mx-1",children:"|"}),t&&re.jsxs(re.Fragment,{children:[re.jsxs("span",{children:[i," FPS"]}),re.jsx("span",{className:"text-text-disabled mx-1",children:"|"})]}),re.jsxs("span",{children:[n.width,"×",n.height]})]})]})},fm=({modalTransform:i,cameraManager:e})=>{const[t,n]=Fe.useState({mode:null,active:!1,axisLock:null,axisExclude:null,deltaX:0,deltaY:0,rotation:0,scaleX:1,scaleY:1,numericBuffer:"",precisionMode:!1,snapMode:!1});if(Fe.useEffect(()=>{if(!i)return;const d=b=>n(b);return i.setOnStateChange(d),()=>{}},[i]),!t.active||!t.mode)return null;const{mode:r,axisLock:s,axisExclude:a,rotation:o,scaleX:c,scaleY:l,numericBuffer:u,precisionMode:h,snapMode:p}=t,f=s?` (${s.toUpperCase()})`:a?` (not ${a.toUpperCase()})`:"";let _="",v="";switch(r){case"grab":{const d=e?.zoom??1,b=-(t.deltaX*d),g=t.deltaY*d;_="G",v=`ΔX ${b.toFixed(1)}  ΔY ${g.toFixed(1)}`;break}case"rotate":_="R",v=`${o.toFixed(1)}°`;break;case"scale":_="S",v=`${(c*100).toFixed(1)}% × ${(l*100).toFixed(1)}%`;break}const m=[h?"PRECISION":"",p?"SNAP":""].filter(Boolean).join(" ");return re.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none",children:re.jsxs("div",{className:"flex items-center gap-2 px-2 py-1 bg-[var(--color-bg-overlay,#1a1a1a)] border border-[var(--color-border,#333)] rounded-sm",children:[re.jsxs("span",{className:"font-mono text-[11px] text-[var(--color-accent)] font-bold",children:[_,f]}),re.jsx("span",{className:"font-mono text-[11px] text-[var(--color-text-primary,#e6e6e6)]",children:v}),u&&re.jsxs("span",{className:"font-mono text-[11px] text-[#ffdd44]",children:["[",u,"]"]}),m&&re.jsx("span",{className:"font-mono text-[9px] text-[var(--color-text-secondary,#888)] ml-1",children:m})]})})},pm=({zoom:i,viewportSize:e,cameraManager:t})=>{const n=ot(d=>{const b=d.activeCompositionId;return b?d.compositions.find(g=>g.id===b)??null:null});if(!n)return null;const r=18,s=t?.panX??0,a=t?.panY??0,o=e.width/2+s/i,c=e.height/2-a/i,l=10*i,u=l<5?5:l<10?10:l<25?25:l<50?50:l<100?100:500,h=u*10,p=[];for(let d=0;d<=n.width;d+=u){const b=d%h===0||d===0||d===n.width,g=o+(d-n.width/2)*(1/i);g<-50||g>e.width+50||p.push({x:g,label:b?String(d):"",isMajor:b})}const f=[];for(let d=0;d<=n.height;d+=u){const b=d%h===0||d===0||d===n.height,g=c+(d-n.height/2)*(1/i);g<-50||g>e.height+50||f.push({y:g,label:b?String(d):"",isMajor:b})}const _=500;if(p.length>_||f.length>_)return null;const v="var(--color-text-disabled)",m="var(--color-bg-panel-header)";return re.jsxs(re.Fragment,{children:[re.jsxs("svg",{className:"absolute top-0 left-0 pointer-events-none",width:e.width,height:r,style:{zIndex:30},children:[re.jsx("rect",{width:e.width,height:r,fill:m}),p.map((d,b)=>re.jsxs("g",{children:[re.jsx("line",{x1:d.x,y1:d.isMajor?0:r-5,x2:d.x,y2:r,stroke:v,strokeWidth:d.isMajor?1:.5}),d.label&&re.jsx("text",{x:d.x+2,y:r-3,fill:v,fontSize:8,fontFamily:"var(--font-family-mono)",children:d.label})]},`h-${b}`))]}),re.jsxs("svg",{className:"absolute top-0 left-0 pointer-events-none",width:r,height:e.height,style:{zIndex:30},children:[re.jsx("rect",{width:r,height:e.height,fill:m}),f.map((d,b)=>re.jsxs("g",{children:[re.jsx("line",{x1:d.isMajor?0:r-5,y1:d.y,x2:r,y2:d.y,stroke:v,strokeWidth:d.isMajor?1:.5}),d.label&&re.jsx("text",{x:2,y:d.y+9,fill:v,fontSize:8,fontFamily:"var(--font-family-mono)",children:d.label})]},`v-${b}`))]}),re.jsx("div",{className:"absolute top-0 left-0",style:{width:r,height:r,background:m,zIndex:31}})]})},mm=({viewportSize:i})=>{const e=It(f=>f.settings),t=It(f=>f.moveGuide),n=ot(f=>{const _=f.activeCompositionId;return _?f.compositions.find(v=>v.id===_)??null:null}),[r,s]=Fe.useState(null),a=Fe.useRef({startY:0,startX:0,startPos:0});if(!n)return null;const o=1,c=(i.width-n.width*o)/2,l=(i.height-n.height*o)/2,u=e.guides,h=e.guidesLocked,p=Fe.useCallback((f,_,v,m)=>{h||(f.stopPropagation(),s(_),a.current={startX:f.clientX,startY:f.clientY,startPos:m})},[h]);return Fe.useEffect(()=>{if(!r)return;const f=u.find(m=>m.id===r);if(!f)return;const _=m=>{const d=f.type==="horizontal"?m.clientY-a.current.startY:m.clientX-a.current.startX,b=a.current.startPos+d;t(r,b)},v=()=>{s(null)};return window.addEventListener("mousemove",_),window.addEventListener("mouseup",v),()=>{window.removeEventListener("mousemove",_),window.removeEventListener("mouseup",v)}},[r,u,t]),u.length===0?null:re.jsx("svg",{className:"absolute inset-0",width:i.width,height:i.height,style:{zIndex:25,pointerEvents:h?"none":"auto"},children:u.map(f=>{if(f.type==="horizontal"){const v=l+f.position*o;return re.jsxs("g",{children:[re.jsx("line",{x1:0,y1:v,x2:i.width,y2:v,stroke:"var(--color-accent)",strokeWidth:1,strokeDasharray:"4 2"}),!h&&re.jsx("line",{x1:0,y1:v-4,x2:i.width,y2:v-4,stroke:"transparent",strokeWidth:8,style:{cursor:"ns-resize"},onMouseDown:m=>p(m,f.id,"horizontal",f.position)})]},f.id)}const _=c+f.position*o;return re.jsxs("g",{children:[re.jsx("line",{x1:_,y1:0,x2:_,y2:i.height,stroke:"var(--color-accent)",strokeWidth:1,strokeDasharray:"4 2"}),!h&&re.jsx("line",{x1:_-4,y1:0,x2:_-4,y2:i.height,stroke:"transparent",strokeWidth:8,style:{cursor:"ew-resize"},onMouseDown:v=>p(v,f.id,"vertical",f.position)})]},f.id)})})},gm=()=>re.jsx("div",{className:"absolute top-2 right-2 z-30 pointer-events-none opacity-70",children:re.jsxs("svg",{width:60,height:60,viewBox:"0 0 60 60",children:[re.jsx("circle",{cx:30,cy:30,r:60/2-2,fill:"rgba(0,0,0,0.4)",stroke:"rgba(255,255,255,0.1)",strokeWidth:"0.5"}),re.jsx("line",{x1:30,y1:30,x2:48,y2:30,stroke:"#ff3355",strokeWidth:"1.5"}),re.jsx("text",{x:51,y:31,fill:"#ff3355",fontSize:"7",fontWeight:"bold",fontFamily:"monospace",textAnchor:"start",dominantBaseline:"middle",children:"X"}),re.jsx("line",{x1:30,y1:30,x2:30,y2:12,stroke:"#55dd33",strokeWidth:"1.5"}),re.jsx("text",{x:30,y:9,fill:"#55dd33",fontSize:"7",fontWeight:"bold",fontFamily:"monospace",textAnchor:"middle",dominantBaseline:"auto",children:"Y"}),re.jsx("circle",{cx:30,cy:30,r:3,fill:"#3388ff",stroke:"rgba(255,255,255,0.3)",strokeWidth:"0.5"}),re.jsx("text",{x:36,y:33,fill:"#3388ff",fontSize:"7",fontWeight:"bold",fontFamily:"monospace",textAnchor:"start",dominantBaseline:"middle",children:"Z"})]})}),hs={title:"Viewport",placeholder:"— Phase 2 —",noComp:"No composition selected. Create one from File > New Composition."},Sm=()=>{const i=Fe.useRef(null),e=hm(i),{state:t,viewportState:n,renderer:r}=lm(i.current),s=ot(l=>{const u=l.activeCompositionId;return u?l.compositions.find(h=>h.id===u)??null:null}),a=It(l=>l.settings.showRulers),o=It(l=>l.settings.showGuides),c=It(l=>l.settings.showStats);return um({canvas:r?.canvas??null,cameraManager:r?.cameraManager??null,hitTester:r?.hitTester??null,modalTransform:r?.modalTransform??null,requestRender:r?()=>r.renderLoop.requestRender():void 0}),re.jsxs("div",{className:"w-full h-full relative overflow-hidden bg-[var(--viewport-bg)]",children:[re.jsx("div",{ref:i,className:"absolute inset-0",style:{zIndex:1}}),!s&&re.jsx("div",{className:"absolute inset-0 flex items-center justify-center z-10 pointer-events-none",children:re.jsxs("div",{className:"flex flex-col items-center gap-2 text-text-disabled",children:[re.jsx("span",{className:"text-ui-lg font-medium",children:hs.title}),re.jsx("span",{className:"text-ui-sm",children:hs.placeholder}),re.jsx("span",{className:"text-ui-xs",children:hs.noComp})]})}),s&&re.jsxs("div",{className:"absolute inset-0 z-20 pointer-events-none",children:[a&&e.width>0&&re.jsx(pm,{zoom:t.zoom,viewportSize:e,cameraManager:r?.cameraManager??null}),o&&re.jsx(mm,{viewportSize:e})]}),s&&re.jsx(gm,{}),s&&re.jsx(fm,{modalTransform:r?.modalTransform??null,cameraManager:r?.cameraManager??null}),s&&re.jsx(dm,{fps:t.fps,zoom:t.zoom,showStats:c,viewportSize:e,selectedLayerIds:n.selectedLayerIds,transformMode:n.transformMode,onZoomChange:l=>{const u=r;u&&(u.cameraManager.setZoom(l),u.renderLoop.requestRender())},onFitToViewport:()=>{const l=r;l&&l.cameraManager.fitToComposition()}}),!s&&re.jsx("span",{className:"absolute bottom-2 right-2 text-ui-xs text-text-disabled/40 pointer-events-none z-10",children:"1920×1080 | 30fps"})]})};export{Sm as ViewportPanel,Sm as default};
//# sourceMappingURL=ViewportPanel-CHHE5CY7.js.map
