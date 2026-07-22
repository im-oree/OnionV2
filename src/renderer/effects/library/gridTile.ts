import type { EffectModule } from './types';import { def, param } from './types';
const FRAG=`precision highp float;uniform sampler2D uTexture;uniform float uColumns;uniform float uRows;uniform float uLineWidth;uniform vec3 uLineColor;uniform vec3 uFillColor;uniform float uBlend;varying vec2 vUv;void main(){vec4 c=texture2D(uTexture,vUv);vec2 pos=fract(vUv*vec2(uColumns,uRows));vec2 line=step(1.0-uLineWidth*0.1,pos);float isLine=max(line.x,line.y);vec3 col=mix(uFillColor,uLineColor,isLine);vec3 result=mix(c.rgb,col,uBlend);gl_FragColor=vec4(result,c.a);}`;
export const gridTileEffect:EffectModule={definition:def('gridTile','Grid Tile','generate','Grid pattern generator with custom colors.',1,[
param({id:'columns',name:'Columns',value:8,defaultValue:8,min:1,max:50,step:1,uniform:'uColumns'}),
param({id:'rows',name:'Rows',value:8,defaultValue:8,min:1,max:50,step:1,uniform:'uRows'}),
param({id:'lineWidth',name:'Line Width',value:0.5,defaultValue:0.5,min:0.1,max:5,step:0.1,uniform:'uLineWidth'}),
param({id:'lineColor',name:'Line Color',type:'color',value:'#444444',defaultValue:'#444444',uniform:'uLineColor'}),
param({id:'fillColor',name:'Fill Color',type:'color',value:'#ffffff',defaultValue:'#ffffff',uniform:'uFillColor'}),
param({id:'blend',name:'Blend',value:1,defaultValue:1,min:0,max:1,step:0.01,uniform:'uBlend'}),
]),fragmentShader:FRAG,};
