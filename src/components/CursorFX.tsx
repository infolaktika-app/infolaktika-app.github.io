import { useEffect } from 'react';

/**
 * Site-wide cursor effects (mouse / trackpad only, off with reduced motion):
 *  - a soft follower ring that grows over clickable things,
 *  - a spotlight that follows the cursor on cards,
 *  - "magnetic" primary buttons,
 *  - crystal sparkles when moving over [data-sparkle] areas and a burst on click.
 */
export function CursorFX() {
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ring = document.createElement('div');
    ring.className = 'cfx-ring is-hidden';
    const dot = document.createElement('div');
    dot.className = 'cfx-dot is-hidden';
    document.body.append(ring, dot);

    let x = -100, y = -100, rx = -100, ry = -100;
    let lastSpark = { x: 0, y: 0 };
    let magnet: HTMLElement | null = null;
    let raf = 0;

    const loop = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const spark = (px: number, py: number, dx: number, dy: number) => {
      // Positioned wrapper + animated child: the keyframe flies the child out by (--dx, --dy).
      const wrap = document.createElement('span');
      wrap.style.cssText = `position:fixed;left:${px}px;top:${py}px;pointer-events:none;z-index:199`;
      const s = document.createElement('span');
      s.className = `cfx-spark${Math.random() < 0.4 ? ' green' : ''}`;
      s.style.position = 'absolute';
      s.style.setProperty('--dx', `${dx}px`);
      s.style.setProperty('--dy', `${dy}px`);
      wrap.append(s);
      document.body.append(wrap);
      setTimeout(() => wrap.remove(), 800);
    };

    const releaseMagnet = () => {
      if (magnet) {
        magnet.style.removeProperty('--tx');
        magnet.style.removeProperty('--ty');
        magnet = null;
      }
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      ring.classList.remove('is-hidden');
      dot.classList.remove('is-hidden');
      const t = e.target as Element | null;
      if (!t || !t.closest) return;

      ring.classList.toggle('is-link', !!t.closest('a, button, [role="button"], select, label, .press-card, .robot-buddy'));

      const card = t.closest<HTMLElement>('.card, .press-card');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${x - r.left}px`);
        card.style.setProperty('--my', `${y - r.top}px`);
      }

      const btn = t.closest<HTMLElement>('.btn-primary, .btn-sun');
      if (btn !== magnet) releaseMagnet();
      if (btn && !(btn as HTMLButtonElement).disabled) {
        const r = btn.getBoundingClientRect();
        const mx = ((x - (r.left + r.width / 2)) / r.width) * 10;
        const my = ((y - (r.top + r.height / 2)) / r.height) * 6;
        btn.style.setProperty('--tx', `${mx.toFixed(1)}px`);
        btn.style.setProperty('--ty', `${my.toFixed(1)}px`);
        magnet = btn;
      }

      if (t.closest('[data-sparkle]') && Math.hypot(x - lastSpark.x, y - lastSpark.y) > 26) {
        lastSpark = { x, y };
        spark(x, y, (Math.random() - 0.5) * 40, 18 + Math.random() * 26);
      }
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      ring.classList.add('is-down');
      for (let i = 0; i < 9; i++) {
        const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.3;
        const d = 34 + Math.random() * 22;
        spark(e.clientX, e.clientY, Math.cos(a) * d, Math.sin(a) * d);
      }
    };
    const up = () => ring.classList.remove('is-down');
    const leave = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        ring.classList.add('is-hidden');
        dot.classList.add('is-hidden');
        releaseMagnet();
      }
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('mouseout', leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('mouseout', leave);
      releaseMagnet();
      ring.remove();
      dot.remove();
    };
  }, []);
  return null;
}
