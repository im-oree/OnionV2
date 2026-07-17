function l(n,t){const o=Math.floor(n*t),a=Math.floor(o/(3600*t)),c=Math.floor(o%(3600*t)/(60*t)),e=Math.floor(o%(60*t)/t),h=o%t;return`${r(a)}:${r(c)}:${r(e)}:${r(h)}`}function r(n){return n.toString().padStart(2,"0")}export{l as f};
//# sourceMappingURL=time-8Ixx2F81.js.map
