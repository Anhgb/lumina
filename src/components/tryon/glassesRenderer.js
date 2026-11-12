/** Time-based smoothing and bounded face-loss handling for the Three.js overlay. */
export class GlassesTracker {
  constructor({ smoothingMs = 58, lossGraceMs = 75, fadeMs = 130 } = {}) {
    this.current = {
      x: 0,
      y: 0,
      scale: 1,
      angle: 0,
      yaw: 0,
      pitch: 0,
      confidence: 1,
      hingeLeftPx: null,
      hingeRightPx: null,
      opacity: 0,
      visible: false,
    };
    this.smoothingMs = smoothingMs;
    this.lossGraceMs = lossGraceMs;
    this.fadeMs = fadeMs;
    this.lastUpdateAt = null;
    this.lastSeenAt = null;
  }

  update(target, timestamp = performance.now()) {
    if (!target) {
      if (!this.current.visible || this.lastSeenAt === null) return null;
      const missingFor = Math.max(0, timestamp - this.lastSeenAt);
      if (missingFor <= this.lossGraceMs) {
        this.current.opacity = 1;
        return this.current;
      }
      this.current.opacity = Math.max(0, 1 - (missingFor - this.lossGraceMs) / this.fadeMs);
      if (this.current.opacity <= 0) {
        this.current.visible = false;
        return null;
      }
      return this.current;
    }

    const lostFor = this.lastSeenAt === null ? Infinity : timestamp - this.lastSeenAt;
    const jump = Math.hypot(target.x - this.current.x, target.y - this.current.y);
    const isDiscontinuity = !this.current.visible || lostFor > this.lossGraceMs ||
      jump > Math.max(90, target.scale * 1.25) || target.scale / this.current.scale > 2.2 ||
      this.current.scale / target.scale > 2.2;

    if (isDiscontinuity) {
      Object.assign(this.current, target, {
        confidence: target.confidence ?? 1,
        opacity: 1,
        visible: true,
      });
    } else {
      const deltaMs = this.lastUpdateAt === null ? 33 : Math.min(100, Math.max(1, timestamp - this.lastUpdateAt));
      const alpha = 1 - Math.exp(-deltaMs / this.smoothingMs);
      this.current.x += (target.x - this.current.x) * alpha;
      this.current.y += (target.y - this.current.y) * alpha;
      this.current.scale += (target.scale - this.current.scale) * alpha;
      this.current.yaw += (target.yaw - this.current.yaw) * alpha;
      this.current.pitch += (target.pitch - this.current.pitch) * alpha;
      this.current.confidence += ((target.confidence ?? 1) - this.current.confidence) * alpha;

      for (const key of ['hingeLeftPx', 'hingeRightPx']) {
        if (target[key]) {
          const previous = this.current[key] || target[key];
          this.current[key] = {
            x: previous.x + (target[key].x - previous.x) * alpha,
            y: previous.y + (target[key].y - previous.y) * alpha,
          };
        }
      }

      let angleDelta = target.angle - this.current.angle;
      while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
      while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
      this.current.angle += angleDelta * alpha;
      this.current.opacity = 1;
      this.current.visible = true;
    }

    this.lastUpdateAt = timestamp;
    this.lastSeenAt = timestamp;
    return this.current;
  }

  reset() {
    this.current.visible = false;
    this.current.opacity = 0;
    this.lastUpdateAt = null;
    this.lastSeenAt = null;
  }
}
