import { create } from 'zustand';
import { TIME_DISPLAY } from '../config/constants';

export type TimeDisplayMode = typeof TIME_DISPLAY[keyof typeof TIME_DISPLAY];
export type PlaybackState = 'stopped'|'playing'|'paused';
export type TrackHeight = 'compact'|'normal'|'expanded';

export interface TimelineState{
  playbackState:PlaybackState; timeDisplay:TimeDisplayMode;
  zoom:number; scrollX:number; scrollY:number;
  snapping:boolean; autoScroll:boolean; loop:boolean;
  // Phase 4 spec #7 additions
  workAreaStart:number; workAreaEnd:number;
  visibleTrackHeight:TrackHeight; snapKeyframes:boolean;
  playbackRate:number;
  setPlaybackState:(s:PlaybackState)=>void;
  play:()=>void; pause:()=>void; stop:()=>void;
  togglePlayback:()=>void;
  setTimeDisplay:(m:TimeDisplayMode)=>void;
  setZoom:(z:number)=>void; setScrollX:(x:number)=>void; setScrollY:(y:number)=>void;
  setSnapping:(s:boolean)=>void; setAutoScroll:(s:boolean)=>void; setLoop:(l:boolean)=>void;
  zoomIn:()=>void; zoomOut:()=>void; zoomToFit:()=>void;
  // Phase 4 spec #7 action additions
  setWorkArea:(start:number,end:number)=>void;
  setVisibleTrackHeight:(h:TrackHeight)=>void;
  setSnapKeyframes:(s:boolean)=>void;
  setPlaybackRate:(r:number)=>void;
}

const DEFAULT_ZOOM=30;

export const useTimelineStore = create<TimelineState>((set)=>({
  playbackState:'stopped', timeDisplay:TIME_DISPLAY.FRAMES as TimeDisplayMode,
  zoom:DEFAULT_ZOOM, scrollX:0, scrollY:0,
  snapping:true, autoScroll:true, loop:false,
  // Phase 4 defaults
  workAreaStart:0, workAreaEnd:300,
  visibleTrackHeight:'normal', snapKeyframes:true, playbackRate:1,
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
  // Phase 4 actions
  setWorkArea:(start,end)=>set({workAreaStart:start,workAreaEnd:end}),
  setVisibleTrackHeight:(h)=>set({visibleTrackHeight:h}),
  setSnapKeyframes:(s)=>set({snapKeyframes:s}),
  setPlaybackRate:(r)=>set({playbackRate:r}),
}));
