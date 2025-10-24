import React, { useState, useRef, useCallback } from 'react';
import { type Keyframe } from '../types';

interface TimelineProps {
  keyframes: Keyframe[];
  currentTime: number;
  totalDuration: number;
  onKeyframeSelect: (keyframe: Keyframe) => void;
  onKeyframeDelete: (keyframeId: string) => void;
  onKeyframeUpdate: (keyframeId: string, updates: Partial<Keyframe>) => void;
  onSeekTo: (time: number) => void;
  onAddKeyframe: (time: number) => void;
}

interface DragState {
  isDragging: boolean;
  keyframeId: string | null;
  startX: number;
  startTime: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  keyframes,
  currentTime,
  totalDuration,
  onKeyframeSelect,
  onKeyframeDelete,
  onKeyframeUpdate,
  onSeekTo,
  onAddKeyframe,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    keyframeId: null,
    startX: 0,
    startTime: 0,
  });
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const getTimeFromPosition = useCallback((x: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = x - rect.left;
    const normalizedTime = Math.max(0, Math.min(1, relativeX / rect.width));
    return normalizedTime * totalDuration;
  }, [totalDuration]);

  const getPositionFromTime = useCallback((time: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const normalizedTime = totalDuration > 0 ? time / totalDuration : 0;
    return normalizedTime * rect.width;
  }, [totalDuration]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (dragState.isDragging) return;
    const time = getTimeFromPosition(e.clientX);
    onSeekTo(time);
  }, [dragState.isDragging, getTimeFromPosition, onSeekTo]);

  const handleTimelineDoubleClick = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromPosition(e.clientX);
    onAddKeyframe(time);
  }, [getTimeFromPosition, onAddKeyframe]);

  const handleKeyframeMouseDown = useCallback((e: React.MouseEvent, keyframe: Keyframe) => {
    e.stopPropagation();
    const keyframeStartTime = getKeyframeStartTime(keyframe);
    setDragState({
      isDragging: true,
      keyframeId: keyframe.id,
      startX: e.clientX,
      startTime: keyframeStartTime,
    });
    setSelectedKeyframe(keyframe.id);
    onKeyframeSelect(keyframe);
  }, [onKeyframeSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.keyframeId) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaTime = getTimeFromPosition(dragState.startX + deltaX) - getTimeFromPosition(dragState.startX);
    const newTime = Math.max(0, Math.min(totalDuration, dragState.startTime + deltaTime));

    // Update keyframe timestamp
    const normalizedTime = totalDuration > 0 ? newTime / totalDuration : 0;
    onKeyframeUpdate(dragState.keyframeId, { timestamp: normalizedTime });
  }, [dragState, getTimeFromPosition, totalDuration, onKeyframeUpdate]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      keyframeId: null,
      startX: 0,
      startTime: 0,
    });
  }, []);

  React.useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const getKeyframeStartTime = (keyframe: Keyframe): number => {
    const sortedKeyframes = [...keyframes].sort((a, b) => a.timestamp - b.timestamp);
    const index = sortedKeyframes.findIndex(kf => kf.id === keyframe.id);
    if (index === -1) return 0;

    let time = 0;
    for (let i = 0; i < index; i++) {
      time += sortedKeyframes[i].duration;
    }
    return time;
  };

  const formatTime = (time: number): string => {
    const seconds = Math.floor(time / 1000);
    const ms = Math.floor((time % 1000) / 10);
    return `${seconds}.${ms.toString().padStart(2, '0')}s`;
  };

  const handleKeyframeDoubleClick = (e: React.MouseEvent, keyframe: Keyframe) => {
    e.stopPropagation();
    const newName = prompt('Enter keyframe name:', keyframe.name);
    if (newName && newName.trim()) {
      onKeyframeUpdate(keyframe.id, { name: newName.trim() });
    }
  };

  const handleKeyframeRightClick = (e: React.MouseEvent, keyframe: Keyframe) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete keyframe "${keyframe.name}"?`)) {
      onKeyframeDelete(keyframe.id);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-base md:text-lg font-semibold text-white">Timeline</h3>
        <div className="text-xs md:text-sm text-gray-400">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative h-20 md:h-16 bg-gray-700 rounded cursor-pointer border border-gray-600 touch-manipulation"
        onClick={handleTimelineClick}
        onDoubleClick={handleTimelineDoubleClick}
      >
        {/* Timeline track */}
        <div className="absolute inset-0 rounded">
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-teal-400 z-20"
            style={{
              left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
            }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-teal-400 rounded-full"></div>
          </div>

          {/* Keyframes */}
          {keyframes.map((keyframe) => {
            const startTime = getKeyframeStartTime(keyframe);
            const position = totalDuration > 0 ? (startTime / totalDuration) * 100 : 0;
            const width = totalDuration > 0 ? (keyframe.duration / totalDuration) * 100 : 0;
            const isSelected = selectedKeyframe === keyframe.id;

            return (
              <div
                key={keyframe.id}
                className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing z-10 transition-all
                  ${isSelected
                    ? 'bg-teal-500 border-2 border-teal-300'
                    : 'bg-teal-600 border-2 border-teal-500 hover:bg-teal-500'
                  }`}
                style={{
                  left: `${position}%`,
                  width: `${Math.max(2, width)}%`,
                }}
                onMouseDown={(e) => handleKeyframeMouseDown(e, keyframe)}
                onDoubleClick={(e) => handleKeyframeDoubleClick(e, keyframe)}
                onContextMenu={(e) => handleKeyframeRightClick(e, keyframe)}
                title={`${keyframe.name} - ${formatTime(keyframe.duration)}`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium overflow-hidden">
                  <span className="truncate px-1">{keyframe.name}</span>
                </div>

                {/* Keyframe marker */}
                <div className="absolute -left-1 top-0 bottom-0 w-2 bg-teal-300 rounded-l"></div>
              </div>
            );
          })}
        </div>

        {/* Time markers */}
        <div className="absolute bottom-0 left-0 right-0 h-4 text-xs text-gray-400">
          {Array.from({ length: 5 }, (_, i) => {
            const time = (i / 4) * totalDuration;
            return (
              <div
                key={i}
                className="absolute bottom-0 text-xs"
                style={{ left: `${(i / 4) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {formatTime(time)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        <span className="hidden md:inline">Double-click timeline to add keyframe • Right-click keyframe to delete • Double-click keyframe to rename</span>
        <span className="md:hidden">Tap timeline to add • Long press to delete/rename</span>
      </div>
    </div>
  );
};