/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

interface RulerBarProps {
  type: 'horizontal' | 'vertical';
  zoom: number;
  pan: number; // pan.x for horizontal, pan.y for vertical
  canvasSize: number; // project width or height
  onAddGuide: (pos: number) => void;
}

export default function RulerBar({
  type,
  zoom,
  pan,
  canvasSize,
  onAddGuide,
}: RulerBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set resolution based on devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    const width = type === 'horizontal' ? canvas.parentElement!.clientWidth : 20;
    const height = type === 'horizontal' ? 20 : canvas.parentElement!.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Styling
    ctx.fillStyle = '#1e1e1f';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#3e3e3e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (type === 'horizontal') {
      ctx.moveTo(0, height - 1);
      ctx.lineTo(width, height - 1);
    } else {
      ctx.moveTo(width - 1, 0);
      ctx.lineTo(width - 1, height);
    }
    ctx.stroke();

    ctx.fillStyle = '#8a8a8a';
    ctx.strokeStyle = '#555555';
    ctx.font = '8px monospace';
    ctx.textAlign = type === 'horizontal' ? 'left' : 'right';
    ctx.textBaseline = 'middle';

    // Draw ticks
    // c = (s - pan) / zoom => canvas coord
    // s = c * zoom + pan => screen coord
    
    // Choose tick interval depending on zoom
    let interval = 100;
    if (zoom > 4) interval = 10;
    else if (zoom > 2) interval = 50;
    else if (zoom < 0.2) interval = 500;
    else if (zoom < 0.5) interval = 200;

    // Start coordinate in canvas pixels (round down to interval)
    const minC = Math.floor((-pan) / zoom / interval) * interval;
    const maxC = Math.ceil((width - pan) / zoom / interval) * interval;

    for (let c = minC; c <= maxC; c += interval) {
      const s = c * zoom + pan;
      if (s < 0 || s > (type === 'horizontal' ? width : height)) continue;

      ctx.beginPath();
      if (type === 'horizontal') {
        // Draw major tick
        ctx.moveTo(s, height - 8);
        ctx.lineTo(s, height);
        ctx.stroke();

        // Label
        if (c % (interval * 2) === 0) {
          ctx.fillText(c.toString(), s + 3, height / 2 - 2);
        }

        // Draw mid ticks
        ctx.strokeStyle = '#333333';
        const subInterval = interval / 5;
        for (let j = 1; j < 5; j++) {
          const subS = (c + j * subInterval) * zoom + pan;
          ctx.beginPath();
          ctx.moveTo(subS, height - 4);
          ctx.lineTo(subS, height);
          ctx.stroke();
        }
        ctx.strokeStyle = '#555555';
      } else {
        // Draw vertical major tick
        ctx.moveTo(width - 8, s);
        ctx.lineTo(width, s);
        ctx.stroke();

        // Label
        if (c % (interval * 2) === 0) {
          ctx.save();
          ctx.translate(width / 2 - 2, s - 4);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(c.toString(), 0, 0);
          ctx.restore();
        }

        // Draw vertical mid ticks
        ctx.strokeStyle = '#333333';
        const subInterval = interval / 5;
        for (let j = 1; j < 5; j++) {
          const subS = (c + j * subInterval) * zoom + pan;
          ctx.beginPath();
          ctx.moveTo(width - 4, subS);
          ctx.lineTo(width, subS);
          ctx.stroke();
        }
        ctx.strokeStyle = '#555555';
      }
    }
  }, [type, zoom, pan, canvasSize]);

  // Drag handler to create a new guide line
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragPos(type === 'horizontal' ? e.clientX : e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (type === 'horizontal') {
        setDragPos(e.clientY - rect.top);
      } else {
        setDragPos(e.clientX - rect.left);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Calculate canvas coordinates of final release
        const screenOffset = type === 'horizontal' ? e.clientY - rect.top : e.clientX - rect.left;
        const canvasCoord = (screenOffset - pan) / zoom;
        onAddGuide(Math.round(canvasCoord));
      }
      setDragPos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, type, zoom, pan, onAddGuide]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        width: type === 'horizontal' ? '100%' : '20px',
        height: type === 'horizontal' ? '20px' : '100%',
        cursor: type === 'horizontal' ? 'row-resize' : 'col-resize',
      }}
      className="bg-[#1e1e1f] select-none relative"
      title={`Drag from ruler to pull a guide line`}
    >
      <canvas ref={canvasRef} className="block" />
      
      {/* Live feedback drag line indicator */}
      {isDragging && dragPos !== null && (
        <div
          style={{
            position: 'fixed',
            left: type === 'vertical' ? `${dragPos}px` : 0,
            top: type === 'horizontal' ? `${dragPos}px` : 0,
            width: type === 'vertical' ? '1px' : '100vw',
            height: type === 'horizontal' ? '1px' : '100vh',
            borderStyle: 'dashed',
            borderColor: '#00c8ff',
            borderWidth: type === 'vertical' ? '0 0 0 1px' : '1px 0 0 0',
          }}
          className="z-50 pointer-events-none opacity-80"
        />
      )}
    </div>
  );
}
