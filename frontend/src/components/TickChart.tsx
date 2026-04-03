'use client';

import { useRef, useEffect } from 'react';
import { TickData } from '../lib/types';

interface TickChartProps {
  ticks: TickData[];
}

export default function TickChart({ ticks }: TickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const padding = { top: 30, right: 20, bottom: 30, left: 60 };

      // Clear
      ctx.clearRect(0, 0, w, h);

      if (ticks.length < 2) {
        // Draw placeholder
        ctx.fillStyle = '#555577';
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for tick data...', w / 2, h / 2);
        return;
      }

      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // Find min/max
      const prices = ticks.map(t => t.quote);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min || 0.001;
      const yPad = range * 0.1;

      const scaleX = (i: number) => padding.left + (i / (ticks.length - 1)) * chartW;
      const scaleY = (v: number) =>
        padding.top + chartH - ((v - (min - yPad)) / (range + yPad * 2)) * chartH;

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        // Y-axis labels
        const val = max + yPad - ((range + yPad * 2) / 4) * i;
        ctx.fillStyle = '#555577';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(4), padding.left - 8, y + 3);
      }

      // Gradient fill under line
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      gradient.addColorStop(0, 'rgba(0, 255, 65, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 255, 65, 0.0)');

      ctx.beginPath();
      ctx.moveTo(scaleX(0), h - padding.bottom);
      for (let i = 0; i < ticks.length; i++) {
        ctx.lineTo(scaleX(i), scaleY(ticks[i].quote));
      }
      ctx.lineTo(scaleX(ticks.length - 1), h - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main line with glow
      ctx.shadowColor = 'rgba(0, 255, 65, 0.5)';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00FF41';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < ticks.length; i++) {
        const x = scaleX(i);
        const y = scaleY(ticks[i].quote);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Data points (last 10 ticks get dots)
      const dotStart = Math.max(0, ticks.length - 10);
      for (let i = dotStart; i < ticks.length; i++) {
        const x = scaleX(i);
        const y = scaleY(ticks[i].quote);
        const isEven = ticks[i].isEven;
        const isLast = i === ticks.length - 1;

        ctx.beginPath();
        ctx.arc(x, y, isLast ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isEven ? '#00FF41' : '#ff0080';

        if (isLast) {
          ctx.shadowColor = isEven ? 'rgba(0, 255, 65, 0.6)' : 'rgba(255, 0, 128, 0.6)';
          ctx.shadowBlur = 12;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Digit label for last tick
        if (isLast) {
          ctx.fillStyle = isEven ? '#00FF41' : '#ff0080';
          ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(ticks[i].lastDigit.toString(), x, y - 12);
        }
      }
    };

    draw();

    // Redraw on any tick change
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ticks]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const event = new Event('resize');
        window.dispatchEvent(event);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="chart-container glass-card" id="tick-chart">
      <div className="chart-label">Real-time Tick Stream • {ticks.length} ticks</div>
      <canvas ref={canvasRef} className="chart-canvas" />
    </div>
  );
}
