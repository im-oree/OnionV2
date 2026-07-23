import { create } from 'zustand';
import { TIME_DISPLAY } from '../config/constants';

export type TimeDisplayMode = typeof TIME_DISPLAY[keyof typeof TIME_DISPLAY];
export type PlaybackState = 'stopped'|'playing'|'paused';
export type TrackHeight = 'compact'|'normal'|'expanded';

export interface TimelineState{
  playbackState:PlaybackState; timeDisplay:TimeDisplayMode;
  zoom:number; scrollX:number; scrollY:number;
  snapping:boolean; autoScroll:boolean; loop:boolean;
  workAreaStart:number; workAreaEnd:number;
  visibleTrackHeight:TrackHeight; snapKeyframes:boolean;
  playbackRate:number;
  autoKey:boolean;
  setPlaybackState:(s:PlaybackState)=>void;
  play:()=>void; pause:()=>void; stop:()=>void;
  togglePlayback:()=>void;
  setTimeDisplay:(m:TimeDisplayMode)=>void;
  setZoom:(z:number)=>void; setScrollX:(x:number)=>void; setScrollY:(y:number)=>void;
  setSnapping:(s:boolean)=>void; setAutoScroll:(s:boolean)=>void; setLoop:(l:boolean)=>void;
  zoomIn:()=>void; zoomOut:()=>void; zoomToFit:()=>void;
  setWorkArea:(start:number,end:number)=>void;
  setVisibleTrackHeight:(h:TrackHeight)=>void;
  setSnapKeyframes:(s:boolean)=>void;
  setPlaybackRate:(r:number)=>void;
  setAutoKey:(v:boolean)=>void;
  toggleAutoKey:()=>void;
  toggleSnapping:()=>void;
}

const DEFAULT_ZOOM = 10;
// Hard limits — 2000 px per frame is deep zoom; 0.005 handles hour-long comps
export const ZOOM_MIN = 0.005;
export const ZOOM_MAX = 2000;

export const useTimelineStore = create<TimelineState>((set)=>({
  playbackState:'stopped', timeDisplay:TIME_DISPLAY.FRAMES as TimeDisplayMode,
  zoom:DEFAULT_ZOOM, scrollX:0, scrollY:0,
  snapping:true, autoScroll:true, loop:true,
  workAreaStart:0, workAreaEnd:60,
  visibleTrackHeight:'normal', snapKeyframes:true, playbackRate:1,
  autoKey:false,
  setPlaybackState:(s)=>set({playbackState:s}),
  play:()=>set({playbackState:'playing'}),
  pause:()=>set({playbackState:'paused'}),
  stop:()=>set({playbackState:'stopped'}),
  togglePlayback:()=>set(s=>({playbackState:s.playbackState==='playing'?'paused':'playing'})),
  setTimeDisplay:(m)=>set({timeDisplay:m}),
  setZoom:(z)=>set({zoom:Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,z))}),
  setScrollX:(x)=>set({scrollX:Math.max(0,x)}),
  setScrollY:(y)=>set({scrollY:y}),
  setSnapping:(snapping)=>set({snapping}),
  setAutoScroll:(s)=>set({autoScroll:s}),
  setLoop:(l)=>set({loop:l}),
  zoomIn:()=>set(s=>({zoom:Math.min(ZOOM_MAX,s.zoom*1.25)})),
  zoomOut:()=>set(s=>({zoom:Math.max(ZOOM_MIN,s.zoom/1.25)})),
  zoomToFit:()=>{
    // Actual fit is computed by TimelinePanel using the panel width;
    // just dispatch the event so it re-runs.
    document.dispatchEvent(new CustomEvent('timeline:zoomToFit'));
  },
  setWorkArea:(start,end)=>set({workAreaStart:start,workAreaEnd:end}),
  setVisibleTrackHeight:(h)=>set({visibleTrackHeight:h}),
  setSnapKeyframes:(s)=>set({snapKeyframes:s}),
  setPlaybackRate:(r)=>set({playbackRate:r}),
  setAutoKey:(v)=>set({autoKey:v}),
  toggleAutoKey:()=>set(s=>({autoKey:!s.autoKey})),
  toggleSnapping:()=>set(s=>({snapping:!s.snapping})),
}));