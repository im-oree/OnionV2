import { create } from 'zustand';
import { TIME_DISPLAY } from '../config/constants';

export type TimeDisplayMode = typeof TIME_DISPLAY[keyof typeof TIME_DISPLAY];
export type PlaybackState = 'stopped'|'playing'|'paused';

export interface TimelineState{
  playbackState:PlaybackState; timeDisplay:TimeDisplayMode;
  zoom:number; scrollX:number; scrollY:number;
  snapping:boolean; autoScroll:boolean; loop:boolean;
  setPlaybackState:(s:PlaybackState)=>void;
  play:()=>void; pause:()=>void; stop:()=>void;
  togglePlayback:()=>void;
  setTimeDisplay:(m:TimeDisplayMode)=>void;
  setZoom:(z:number)=>void; setScrollX:(x:number)=>void; setScrollY:(y:number)=>void;
  setSnapping:(s:boolean)=>void; setAutoScroll:(s:boolean)=>void; setLoop:(l:boolean)=>void;
  zoomIn:()=>void; zoomOut:()=>void; zoomToFit:()=>void;
}

const DEFAULT_ZOOM=30;

export const useTimelineStore = create<TimelineState>((set)=>({
  playbackState:'stopped', timeDisplay:TIME_DISPLAY.FRAMES as TimeDisplayMode,
  zoom:DEFAULT_ZOOM, scrollX:0, scrollY:0,
  snapping:true, autoScroll:true, loop:false,
  setPlaybackState:(s)=>set({playbackState:s}),
  play:()=>set({playbackState:'playing'}),
  pause:()=>set({playbackState:'paused'}),
  stop:()=>set({playbackState:'stopped'}),
  togglePlayback:()=>set(s=>({playbackState:s.playbackState==='playing'?'paused':'playing'})),
  setTimeDisplay:(m)=>set({timeDisplay:m}),
  setZoom:(z)=>set({zoom:Math.max(1,Math.min(1000,z))}),
  setScrollX:(x)=>set({scrollX:x}),
  setScrollY:(y)=>set({scrollY:y}),
  setSnapping:(snapping)=>set({snapping}),
  setAutoScroll:(s)=>set({autoScroll:s}),
  setLoop:(l)=>set({loop:l}),
  zoomIn:()=>set(s=>({zoom:Math.min(1000,s.zoom*1.25)})),
  zoomOut:()=>set(s=>({zoom:Math.max(1,s.zoom/1.25)})),
  zoomToFit:()=>set({zoom:DEFAULT_ZOOM}),
}));
