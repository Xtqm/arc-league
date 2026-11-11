import * as THREE from '../../vendor/three.module.js';

const _tangent = new THREE.Vector3();
const _side = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _viewDir = new THREE.Vector3();
const _colorTmp = new THREE.Color();

/**
 * Pooled, GPU-disposable continuous additive triangle-strip ribbon trail
 * for flying Kinetic Arc Discs and construct hover-dash streaks.
 */
export class RibbonTrail {
  /**
   * @param {object} [options]
   * @param {number|string|THREE.Color} [options.primaryColor=0x00f3ff]
   * @param {number|string|THREE.Color} [options.secondaryColor=0x0066ff]
   * @param {number} [options.opacity=0.85]
   * @param {number} [options.width=0.42]
   * @param {number} [options.maxPoints=26]
   * @param {number} [options.minDistance=0.18]
   * @param {number} [options.hdrBoost=1.8]
   */
  constructor(options = {}) {
    this.maxPoints = Math.max(4, options.maxPoints || 26);
    this.minDistance = typeof options.minDistance === 'number' ? options.minDistance : 0.18;
    this.baseWidth = typeof options.width === 'number' ? options.width : 0.42;
    this.baseOpacity = typeof options.opacity === 'number' ? options.opacity : 0.85;
    this.hdrBoost = typeof options.hdrBoost === 'number' ? options.hdrBoost : 1.8;

    this.primaryColor = new THREE.Color(options.primaryColor ?? 0x00f3ff);
    this.secondaryColor = new THREE.Color(options.secondaryColor ?? 0x0066ff);

    this.points = [];
    this.sides = [];
    this.isDisposed = false;
    this.fadeTimer = 0;
    this.fadeDuration = 0;

    const vertCount = this.maxPoints * 2;
    this._positions = new Float32Array(vertCount * 3);
    this._colors = new Float32Array(vertCount * 3);

    const indices = [];
    for (let i = 0; i < this.maxPoints - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this._colors, 3));
    this.geometry.setIndex(indices);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.userData.part = 'ribbon_trail';
  }

  /**
   * Updates ribbon primary and secondary colors dynamically (e.g., on parry deflection).
   * @param {number|string|THREE.Color} primary
   * @param {number|string|THREE.Color} [secondary]
   */
  setColors(primary, secondary) {
    this.primaryColor.set(primary);
    this.secondaryColor.set(secondary ?? primary);
  }

  /**
   * Appends or advances the ribbon head at worldPos along flight velocity.
   * @param {THREE.Vector3} worldPos
   * @param {THREE.Vector3} [velocity]
   * @param {THREE.Vector3|null} [cameraPos]
   */
  pushPoint(worldPos, velocity = null, cameraPos = null) {
    if (this.isDisposed || !worldPos) return;

    if (velocity && velocity.lengthSq() > 1e-6) {
      _tangent.copy(velocity).normalize();
    } else if (this.points.length > 0) {
      _tangent.copy(worldPos).sub(this.points[0]);
      if (_tangent.lengthSq() > 1e-6) _tangent.normalize();
      else _tangent.set(0, 0, 1);
    } else {
      _tangent.set(0, 0, 1);
    }

    if (cameraPos) {
      _viewDir.copy(cameraPos).sub(worldPos);
      if (_viewDir.lengthSq() > 1e-6) {
        _viewDir.normalize();
        _side.crossVectors(_tangent, _viewDir);
      } else {
        _side.crossVectors(_tangent, _up);
      }
    } else {
      _side.crossVectors(_tangent, _up);
    }

    if (_side.lengthSq() < 1e-5) {
      _side.set(1, 0, 0);
    } else {
      _side.normalize();
    }

    if (this.points.length === 0) {
      this.points.unshift(worldPos.clone());
      this.sides.unshift(_side.clone());
    } else {
      const dist = this.points[0].distanceTo(worldPos);
      if (dist >= this.minDistance) {
        this.points.unshift(worldPos.clone());
        this.sides.unshift(_side.clone());
        if (this.points.length > this.maxPoints) {
          this.points.pop();
          this.sides.pop();
        }
      } else {
        // Keep leading edge anchored smoothly to current frame projectile center
        this.points[0].copy(worldPos);
        this.sides[0].copy(_side);
      }
    }

    this._rebuildGeometry();
  }

  _rebuildGeometry() {
    const count = this.points.length;
    if (count < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    const posArr = this._positions;
    const colArr = this._colors;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const fade = Math.pow(1 - t, 1.45);
      const halfW = this.baseWidth * 0.5 * (1 - t * 0.92);

      const p = this.points[i];
      const s = this.sides[i];

      const vIdx = i * 6;
      posArr[vIdx]     = p.x + s.x * halfW;
      posArr[vIdx + 1] = p.y + s.y * halfW;
      posArr[vIdx + 2] = p.z + s.z * halfW;

      posArr[vIdx + 3] = p.x - s.x * halfW;
      posArr[vIdx + 4] = p.y - s.y * halfW;
      posArr[vIdx + 5] = p.z - s.z * halfW;

      _colorTmp.copy(this.primaryColor).lerp(this.secondaryColor, t);
      const mult = fade * this.hdrBoost;
      const r = _colorTmp.r * mult;
      const g = _colorTmp.g * mult;
      const b = _colorTmp.b * mult;

      colArr[vIdx]     = r;
      colArr[vIdx + 1] = g;
      colArr[vIdx + 2] = b;
      colArr[vIdx + 3] = r;
      colArr[vIdx + 4] = g;
      colArr[vIdx + 5] = b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, (count - 1) * 6);
  }

  /**
   * Begins timed fade-out after projectile removal.
   * @param {number} [duration=0.26]
   */
  beginFade(duration = 0.26) {
    this.fadeDuration = Math.max(0.05, duration);
    this.fadeTimer = this.fadeDuration;
  }

  /**
   * Advances fade-out timer; returns true while still visible, false when ready to dispose.
   * @param {number} dt
   * @returns {boolean}
   */
  updateFade(dt) {
    if (this.isDisposed) return false;
    this.fadeTimer -= dt;
    const ratio = Math.max(0, this.fadeTimer / Math.max(0.001, this.fadeDuration));
    this.material.opacity = this.baseOpacity * ratio;
    return this.fadeTimer > 0;
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    if (this.geometry && typeof this.geometry.dispose === 'function') {
      this.geometry.dispose();
    }
    if (this.material && typeof this.material.dispose === 'function') {
      this.material.dispose();
    }
    this.points.length = 0;
    this.sides.length = 0;
  }
}
