function u(r,t,a="smpte"){const o=Math.floor(r*t);if(a==="frames")return`${o}f`;if(a==="seconds")return`${r.toFixed(1)}s`;const e=Math.floor(o/(3600*t)),c=Math.floor(o%(3600*t)/(60*t)),f=Math.floor(o%(60*t)/t),i=o%t;return`${n(e)}:${n(c)}:${n(f)}:${n(i)}`}function n(r){return r.toString().padStart(2,"0")}export{u as f};
//# sourceMappingURL=time-D2BRIH__.js.map
