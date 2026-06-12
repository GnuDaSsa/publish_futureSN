// intro-launch.js — 인트로 캔버스 파티클 런치 시퀀스 (v1에서 분리, 로직 무수정)
// window.IntroFX.startIntroCanvasLaunch(duration) 노출
(function () {
  const introCanvas = document.querySelector('#introCanvas');

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function easeInOutCubic(t) {
      return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function clamp(value, min = 0, max = 1) {
      return Math.max(min, Math.min(max, value));
    }

    function resizeIntroCanvas(ctx) {
      const ratio = 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      introCanvas.width = Math.floor(width * ratio);
      introCanvas.height = Math.floor(height * ratio);
      introCanvas.style.width = `${width}px`;
      introCanvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { width, height };
    }

    function sampleMapTargets(total = 320) {
      const path = document.querySelector('.outer-border');
      const svg = document.querySelector('.map-shell svg');
      if (!path || !svg) return [];
      const matrix = svg.getScreenCTM();
      if (!matrix) return [];
      const length = path.getTotalLength();
      const targets = [];
      for (let i = 0; i < total; i += 1) {
        const point = path.getPointAtLength((length * i) / total);
        const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix);
        targets.push({
          x: screenPoint.x,
          y: screenPoint.y
        });
      }
      return targets;
    }

    function createLaunchParticles(width, height) {
      const targets = sampleMapTargets(96);
      const centerX = width / 2;
      const centerY = height / 2;
      return targets.map((target, index) => {
        const side = index % 4;
        const margin = 120;
        const startX = side === 0 ? -margin : side === 1 ? width + margin : Math.random() * width;
        const startY = side === 2 ? -margin : side === 3 ? height + margin : Math.random() * height;
        const depth = Math.random();
        return {
          x: startX,
          y: startY,
          sx: startX,
          sy: startY,
          tx: target.x,
          ty: target.y,
          cx: centerX + (Math.random() - .5) * width * .46,
          cy: centerY + (Math.random() - .5) * height * .42,
          delay: Math.random() * .18,
          depth,
          seq: index,
          size: 1 + depth * 3.6,
          lane: (index % 11) / 10,
          hue: index % 3,
          phase: Math.random() * Math.PI * 2
        };
      });
    }

    function launchColor(hue) {
      return hue === 0 ? '53,210,255' : hue === 1 ? '245,50,75' : '255,255,255';
    }

    function strokeBoundary(ctx, boundary, visible, offsetX = 0, offsetY = 0) {
      const count = Math.max(0, Math.min(boundary.length, Math.floor(boundary.length * visible)));
      if (count < 2) return;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        const point = boundary[i];
        if (i === 0) ctx.moveTo(point.x + offsetX, point.y + offsetY);
        else ctx.lineTo(point.x + offsetX, point.y + offsetY);
      }
      ctx.stroke();
    }

    function fillBoundary(ctx, boundary, width, height, alpha) {
      if (boundary.length < 3 || alpha <= 0) return;
      const gradient = ctx.createLinearGradient(width * .24, height * .22, width * .78, height * .76);
      gradient.addColorStop(0, `rgba(53,210,255,${alpha * .54})`);
      gradient.addColorStop(.44, `rgba(255,255,255,${alpha * .18})`);
      gradient.addColorStop(.68, `rgba(142,63,252,${alpha * .4})`);
      gradient.addColorStop(1, `rgba(245,50,75,${alpha * .5})`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      boundary.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
    }

    function drawLaunchRibbons(ctx, width, height, progress) {
      const reveal = clamp((progress - .08) / .52);
      const vanish = 1 - clamp((progress - .74) / .18);
      const alpha = reveal * vanish;
      if (alpha <= 0) return;

      for (let i = 0; i < 8; i += 1) {
        const lane = i / 7;
        const color = i % 3 === 0 ? '53,210,255' : i % 3 === 1 ? '245,50,75' : '255,255,255';
        const phase = progress * (1.4 + lane * .8) + lane * Math.PI * 2;
        const y = height * (.28 + lane * .48) + Math.sin(phase * 2.2) * height * .055;
        const sweep = easeOutCubic(reveal) * width * 1.45;
        const x = -width * .22 + sweep - lane * width * .24;
        ctx.strokeStyle = `rgba(${color},${(.04 + lane * .1) * alpha})`;
        ctx.lineWidth = 1.1 + lane * 3.6;
        ctx.beginPath();
        ctx.moveTo(x - width * .24, y + Math.sin(phase) * 42);
        ctx.bezierCurveTo(
          x + width * .08,
          y - height * (.2 + lane * .06),
          x + width * .34,
          y + height * (.18 - lane * .04),
          x + width * .76,
          y + Math.cos(phase) * 54
        );
        ctx.stroke();
      }
    }

    function drawLaunchSheets(ctx, width, height, progress) {
      const reveal = clamp((progress - .12) / .56);
      const vanish = 1 - clamp((progress - .76) / .18);
      const alpha = reveal * vanish;
      if (alpha <= 0) return;

      const sweep = easeOutCubic(reveal) * width * 1.55;
      const palette = ['53,210,255', '255,255,255', '245,50,75', '142,63,252'];
      for (let i = 0; i < 4; i += 1) {
        const y = height * (.24 + i * .16);
        const x = -width * .45 + sweep - i * width * .1;
        const color = palette[i];
        const gradient = ctx.createLinearGradient(x, y, x + width * .64, y + height * .18);
        gradient.addColorStop(0, `rgba(${color},0)`);
        gradient.addColorStop(.5, `rgba(${color},${(.08 + i * .018) * alpha})`);
        gradient.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width * .5, y - height * .11);
        ctx.lineTo(x + width * .76, y + height * .035);
        ctx.lineTo(x + width * .18, y + height * .18);
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawLaunchLens(ctx, width, height, progress) {
      const pulse = Math.sin(progress * Math.PI);
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(width, height);
      const glow = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, radius * .56);
      glow.addColorStop(0, `rgba(255,255,255,${.12 * pulse})`);
      glow.addColorStop(.22, `rgba(53,210,255,${.2 * pulse})`);
      glow.addColorStop(.55, `rgba(245,50,75,${.12 * pulse})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const ringAlpha = clamp((progress - .18) / .26) * (1 - clamp((progress - .82) / .16));
      if (ringAlpha <= 0) return;
      for (let i = 0; i < 4; i += 1) {
        const size = radius * (.08 + i * .075 + progress * .24);
        ctx.strokeStyle = `rgba(${i % 2 ? '245,50,75' : '53,210,255'},${(.12 - i * .018) * ringAlpha})`;
        ctx.lineWidth = 1 + i * .7;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, size * 1.55, size, progress * .8 + i * .7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawLaunchFrame(ctx, width, height, particles, progress) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(5, 11, 17, ${.24 + .34 * (1 - progress)})`;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';
      drawLaunchLens(ctx, width, height, progress);
      drawLaunchSheets(ctx, width, height, progress);
      drawLaunchRibbons(ctx, width, height, progress);

      const boundary = [];
      for (const p of particles) {
        const local = clamp((progress - p.delay) / .68);
        const e = easeInOutCubic(local);
        const mid = clamp(progress / .42);
        const depthPush = 1 + p.depth * 2.5;
        const parallaxX = (p.lane - .5) * width * .08 * (1 - e);
        const parallaxY = Math.sin(p.phase + progress * 4) * height * .028 * (1 - e);
        const orbitX = p.cx + parallaxX + Math.cos(p.phase + progress * (8 + p.depth * 6)) * (120 * depthPush * (1 - e));
        const orbitY = p.cy + parallaxY + Math.sin(p.phase + progress * (6 + p.depth * 4)) * (78 * depthPush * (1 - e));
        const ix = p.sx + (orbitX - p.sx) * easeOutCubic(mid);
        const iy = p.sy + (orbitY - p.sy) * easeOutCubic(mid);
        p.x = ix + (p.tx - ix) * e;
        p.y = iy + (p.ty - iy) * e;

        const color = launchColor(p.hue);
        const alpha = clamp(local * 1.8) * (1 - clamp((progress - .94) / .06));
        const trail = 1 - e;
        if (trail > .1 && progress > .16 && p.seq % 8 === 0) {
          ctx.strokeStyle = `rgba(${color},${(.12 + p.depth * .24) * trail})`;
          ctx.lineWidth = 1.4 + p.depth * 2.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(
            p.x - (p.tx - p.sx) * .045 * depthPush,
            p.y - (p.ty - p.sy) * .045 * depthPush
          );
          ctx.stroke();
        }

        if (progress > .34 && progress < .84 && p.seq % 12 === 0) {
          const glint = Math.sin(clamp((progress - .34) / .5) * Math.PI);
          ctx.fillStyle = `rgba(${color},${(.22 + alpha * .44) * glint})`;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.phase + progress * 1.8);
          ctx.fillRect(-8 - p.depth * 8, -1, 16 + p.depth * 16, 2 + p.depth * 2);
          ctx.restore();
        }

        if (progress > .26 && progress < .72 && p.seq % 6 === 0 && indexLine(p, progress)) {
          ctx.strokeStyle = `rgba(${color},${.05 + alpha * .13})`;
          ctx.lineWidth = .7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.tx, p.ty);
          ctx.stroke();
        }
        boundary.push({ x: p.tx, y: p.ty });
      }

      if (progress > .52) {
        fillBoundary(ctx, boundary, width, height, clamp((progress - .52) / .28) * .58);
      }

      if (progress > .38) {
        const draw = clamp((progress - .38) / .42);
        const colorOffset = 1 - clamp((progress - .78) / .16);
        ctx.lineWidth = 2.8;
        if (colorOffset > 0) {
          ctx.strokeStyle = `rgba(53,210,255,${(.16 + .38 * draw) * colorOffset})`;
          strokeBoundary(ctx, boundary, draw, -5 * colorOffset, -2 * colorOffset);
          ctx.strokeStyle = `rgba(245,50,75,${(.14 + .34 * draw) * colorOffset})`;
          strokeBoundary(ctx, boundary, draw, 5 * colorOffset, 2 * colorOffset);
        }
        ctx.strokeStyle = `rgba(255,255,255,${.22 + .58 * clamp((progress - .48) / .22)})`;
        ctx.lineWidth = 2.1;
        strokeBoundary(ctx, boundary, draw);
      }

      if (progress > .9) {
        const flash = clamp((progress - .9) / .1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,255,255,${Math.sin(flash * Math.PI) * .055})`;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.globalCompositeOperation = 'source-over';
    }

    function indexLine(p, progress) {
      return ((Math.floor(p.phase * 1000) + Math.floor(progress * 60)) % 7) === 0;
    }

    function startIntroCanvasLaunch(duration = 3000) {
      if (!introCanvas) return;
      const ctx = introCanvas.getContext('2d');
      if (!ctx) return;
      let size = resizeIntroCanvas(ctx);
      let particles = createLaunchParticles(size.width, size.height);
      const started = performance.now();

      function frame(now) {
        const progress = clamp((now - started) / duration);
        if (introCanvas.width !== Math.floor(window.innerWidth)) {
          size = resizeIntroCanvas(ctx);
          particles = createLaunchParticles(size.width, size.height);
        }
        drawLaunchFrame(ctx, size.width, size.height, particles, progress);
        if (progress < 1) requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    }


  window.IntroFX = { startIntroCanvasLaunch, easeOutCubic, easeInOutCubic, clamp };
})();
