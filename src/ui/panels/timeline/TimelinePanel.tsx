import React from 'react';
import {Icon} from '../../common/Icon';
import {Button} from '../../common/Button';
import {useTimelineStore} from '../../../state/timelineStore';
import {useCompositionStore} from '../../../state/compositionStore';
import {formatTime} from '../../../utils/time';

/** Generate frame tick marks for the ruler */
const FRAMES = Array.from({length:251},(_,i)=>i);

export const TimelinePanel:React.FC = ()=>{
  const ps=useTimelineStore(s=>s.playbackState);
  const toggle=useTimelineStore(s=>s.togglePlayback);
  const zoom=useTimelineStore(s=>s.zoom);
  const ac=useCompositionStore(s=>s.getActiveComposition());

  return(
    <div className="flex flex-col h-full">
      {/* Playback controls header */}
      <div className="flex items-center gap-1 px-2 flex-shrink-0 h-tl-header bg-panel-header border-b border-border">
        <Button variant="icon" size="sm" icon={<Icon name="goToStart" size={14}/>} title="Go to start" onClick={()=>{}}/>
        <Button variant="icon" size="sm" icon={<Icon name="frameBack" size={14}/>} title="Prev frame" onClick={()=>{}}/>
        <Button variant="icon" size="sm" icon={<Icon name={ps==='playing'?'pause':'play'} size={14}/>} title="Play / Pause" onClick={toggle}/>
        <Button variant="icon" size="sm" icon={<Icon name="frameForward" size={14}/>} title="Next frame" onClick={()=>{}}/>
        <Button variant="icon" size="sm" icon={<Icon name="goToEnd" size={14}/>} title="Go to end" onClick={()=>{}}/>
        {/* Time display */}
        <div className="flex items-center px-2 ml-2 font-mono text-ui-xs h-5 bg-panel-input rounded-sm border border-border text-text-primary">
          {ac ? formatTime(ac.currentTime, ac.fps) : '00:00:00'}
        </div>
        {/* Zoom */}
        <div className="flex-1"/>
        <Button variant="icon" size="sm" icon={<Icon name="minus" size={12}/>} title="Zoom out" onClick={()=>{}}/>
        <span className="text-ui-xs text-text-disabled w-8 text-center">{zoom}</span>
        <Button variant="icon" size="sm" icon={<Icon name="plus" size={12}/>} title="Zoom in" onClick={()=>{}}/>
      </div>

      {/* Ruler + Tracks area */}
      <div className="flex-1 overflow-auto bg-surface-alt relative">
        {/* Ruler */}
        <div className="flex-shrink-0 h-6 bg-surface border-b border-border relative overflow-hidden">
          {FRAMES.map(frame=>(
            <div key={frame} className="absolute top-0" style={{left:frame*zoom,width:1}}>
              {/* Tick mark for every frame */}
              <div className="h-2 bg-border-light" style={{height:frame%5===0?'100%':'6px'}}/>
              {/* Label every 5 frames */}
              {frame%5===0&&(
                <span className="absolute left-1 top-1 text-ui-xs text-text-disabled whitespace-nowrap">
                  {frame}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Tracks area */}
        <div className="flex items-center justify-center text-text-disabled text-ui-xs min-h-[60px]">
          Timeline — No layers (Phase 4)
        </div>
      </div>
    </div>
  );
};
export default TimelinePanel;
