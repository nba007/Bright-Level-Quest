import { useEffect, useRef, type MutableRefObject } from 'react';

type Point = { x: number; z: number };
type Hazard = { x: number; z: number; range: number; speed: number; phase: number };
type Level = {
  stars: Point[];
  rocks: Point[];
  hazards: Hazard[];
  tint: string;
};
type LiveState = { player: Point; stars: Point[]; elapsed: number; jump: number };

function project(ctx: CanvasRenderingContext2D, x: number, z: number, y = 0) {
  const { width, height } = ctx.canvas;
  const unit = Math.min(width / 12.3, height / 8.1);
  return {
    x: width * 0.5 + (x - z) * unit * 0.53,
    y: height * 0.49 + (x + z) * unit * 0.28 - y * unit,
    unit,
  };
}

function polygon(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  level: Level,
  live: LiveState,
  clock: number,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#c5e9df');
  sky.addColorStop(0.7, '#e6efcf');
  sky.addColorStop(1, '#f4e9c6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 5; i += 1) {
    const cloudX = width * (0.13 + i * 0.19) + Math.sin(clock * 0.12 + i) * 7;
    const cloudY = height * (0.19 + (i % 2) * 0.06);
    ctx.fillStyle = '#f6fbefba';
    ctx.beginPath();
    ctx.ellipse(cloudX, cloudY, width * 0.045, height * 0.024, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX - 14, cloudY + 3, width * 0.027, height * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const corners: Point[] = [
    { x: -5, z: -4 },
    { x: 5, z: -4 },
    { x: 5, z: 4 },
    { x: -5, z: 4 },
  ];
  const top = corners.map((corner) => project(ctx, corner.x, corner.z));
  const bottom = corners.map((corner) => project(ctx, corner.x, corner.z, -0.34));
  polygon(ctx, [top[2], top[3], bottom[3], bottom[2]], '#c39761');
  polygon(ctx, [top[1], top[2], bottom[2], bottom[1]], '#ad8051');
  polygon(ctx, top, level.tint, '#779c68');

  for (let index = 0; index < 25; index += 1) {
    const x = ((index * 37) % 90) / 10 - 4.5;
    const z = ((index * 23) % 70) / 10 - 3.5;
    const spot = project(ctx, x, z, 0.02);
    ctx.fillStyle = index % 2 ? '#d2e29a66' : '#4e9c7160';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, spot.unit * 0.07, spot.unit * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const objects: { depth: number; draw: () => void }[] = [];
  live.stars.forEach((star, index) => {
    objects.push({
      depth: star.x + star.z,
      draw: () => {
        const point = project(ctx, star.x, star.z, 0.5 + Math.sin(clock * 3 + index) * 0.07);
        const radius = point.unit * 0.2;
        ctx.fillStyle = '#ac8a45';
        ctx.beginPath();
        ctx.ellipse(point.x, point.y + radius, radius * 1.15, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(clock * 0.7 + index);
        ctx.beginPath();
        for (let corner = 0; corner < 10; corner += 1) {
          const angle = -Math.PI / 2 + (corner * Math.PI) / 5;
          const distance = corner % 2 ? radius * 0.5 : radius;
          ctx.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffdb61';
        ctx.fill();
        ctx.strokeStyle = '#dfa340';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      },
    });
  });

  level.rocks.forEach((rock, index) => {
    objects.push({
      depth: rock.x + rock.z + 0.02,
      draw: () => {
        const point = project(ctx, rock.x, rock.z, 0.05);
        const unit = point.unit;
        ctx.fillStyle = '#47785848';
        ctx.beginPath();
        ctx.ellipse(point.x, point.y + unit * 0.13, unit * 0.32, unit * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        polygon(
          ctx,
          [
            { x: point.x - unit * 0.29, y: point.y },
            { x: point.x - unit * 0.19, y: point.y - unit * 0.34 },
            { x: point.x + unit * 0.04, y: point.y - unit * 0.46 },
            { x: point.x + unit * 0.31, y: point.y - unit * 0.13 },
            { x: point.x + unit * 0.23, y: point.y + unit * 0.04 },
          ],
          ['#91a89a', '#a4af96', '#8b9d92'][index % 3],
          '#748e81',
        );
      },
    });
  });

  level.hazards.forEach((hazard, index) => {
    objects.push({
      depth: hazard.x + hazard.z,
      draw: () => {
        const x = hazard.x + Math.sin(live.elapsed * hazard.speed + hazard.phase) * hazard.range;
        const point = project(ctx, x, hazard.z, 0.03);
        const unit = point.unit;
        ctx.fillStyle = '#58786155';
        ctx.beginPath();
        ctx.ellipse(point.x, point.y + unit * 0.1, unit * 0.3, unit * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = index % 2 ? '#de8967' : '#e79960';
        ctx.beginPath();
        ctx.ellipse(point.x, point.y - unit * 0.05, unit * 0.28, unit * 0.23, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#385755';
        ctx.beginPath();
        ctx.arc(point.x - unit * 0.08, point.y - unit * 0.13, unit * 0.025, 0, Math.PI * 2);
        ctx.arc(point.x + unit * 0.09, point.y - unit * 0.13, unit * 0.025, 0, Math.PI * 2);
        ctx.fill();
      },
    });
  });

  objects.push({
    depth: 0.7,
    draw: () => {
      const point = project(ctx, 3.7, -3, 0.05);
      const unlocked = live.stars.length === 0;
      ctx.fillStyle = unlocked ? '#a9ddc4' : '#84b4a5';
      ctx.beginPath();
      ctx.ellipse(point.x, point.y - point.unit * 0.18, point.unit * 0.34, point.unit * 0.43, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d796b';
      ctx.beginPath();
      ctx.ellipse(point.x, point.y - point.unit * 0.18, point.unit * 0.21, point.unit * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = unlocked ? '#d5f5cf' : '#9bc7aa';
      ctx.beginPath();
      ctx.ellipse(point.x, point.y - point.unit * 0.18, point.unit * 0.11, point.unit * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  });

  objects.push({
    depth: live.player.x + live.player.z + 0.03,
    draw: () => {
      const point = project(ctx, live.player.x, live.player.z, 0.12 + live.jump * 0.75);
      const unit = point.unit;
      ctx.fillStyle = '#4d796455';
      ctx.beginPath();
      ctx.ellipse(point.x, point.y + unit * 0.16, unit * 0.27, unit * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#db9850';
      ctx.beginPath();
      ctx.ellipse(point.x, point.y + unit * 0.03, unit * 0.255, unit * 0.29, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1bf67';
      ctx.beginPath();
      ctx.ellipse(point.x, point.y - unit * 0.025, unit * 0.235, unit * 0.265, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#40534c';
      ctx.beginPath();
      ctx.arc(point.x - unit * 0.075, point.y - unit * 0.035, unit * 0.025, 0, Math.PI * 2);
      ctx.arc(point.x + unit * 0.075, point.y - unit * 0.035, unit * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#75a56d';
      ctx.beginPath();
      ctx.ellipse(point.x + unit * 0.035, point.y - unit * 0.3, unit * 0.09, unit * 0.19, 0.52, 0, Math.PI * 2);
      ctx.fill();
    },
  });

  objects.sort((first, second) => first.depth - second.depth).forEach((object) => object.draw());
}

export default function FallbackIsland({
  level,
  gameState,
}: {
  level: Level;
  gameState: MutableRefObject<LiveState>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let animation = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const frame = (now: number) => {
      draw(context, level, gameState.current, now / 1000);
      animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
    };
  }, [gameState, level]);

  return <canvas ref={canvasRef} aria-label="Island game scene" />;
}
