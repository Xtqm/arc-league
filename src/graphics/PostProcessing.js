import * as THREE from '../../vendor/three.module.js';

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const PREFILTER_FRAG = `
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 c = max(texel.rgb, vec3(0.0));
  // Use max channel so saturated cyan/magenta/amber neons bloom evenly
  float br = max(c.r, max(c.g, c.b));
  float soft = br - uThreshold + uKnee;
  soft = clamp(soft, 0.0, 2.0 * uKnee);
  soft = (soft * soft) / (4.0 * max(uKnee, 1e-4) + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * max(contrib, 0.0), 1.0);
}
`;

const DOWNSAMPLE_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
varying vec2 vUv;

void main() {
  vec2 d = uTexelSize;
  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.25;
  c += texture2D(tDiffuse, vUv + vec2(-d.x, -d.y)).rgb * 0.1875;
  c += texture2D(tDiffuse, vUv + vec2( d.x, -d.y)).rgb * 0.1875;
  c += texture2D(tDiffuse, vUv + vec2(-d.x,  d.y)).rgb * 0.1875;
  c += texture2D(tDiffuse, vUv + vec2( d.x,  d.y)).rgb * 0.1875;
  gl_FragColor = vec4(c, 1.0);
}
`;

const UPSAMPLE_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uRadius;
varying vec2 vUv;

void main() {
  vec2 d = uTexelSize * uRadius;
  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.25;
  c += (texture2D(tDiffuse, vUv + vec2(-d.x,  0.0)).rgb +
        texture2D(tDiffuse, vUv + vec2( d.x,  0.0)).rgb +
        texture2D(tDiffuse, vUv + vec2( 0.0, -d.y)).rgb +
        texture2D(tDiffuse, vUv + vec2( 0.0,  d.y)).rgb) * 0.125;
  c += (texture2D(tDiffuse, vUv + vec2(-d.x, -d.y)).rgb +
        texture2D(tDiffuse, vUv + vec2( d.x, -d.y)).rgb +
        texture2D(tDiffuse, vUv + vec2(-d.x,  d.y)).rgb +
        texture2D(tDiffuse, vUv + vec2( d.x,  d.y)).rgb) * 0.0625;
  gl_FragColor = vec4(c, 1.0);
}
`;

const COMPOSITE_FRAG = `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomStrength;
varying vec2 vUv;

void main() {
  vec4 sceneSample = texture2D(tScene, vUv);
  vec3 bloomSample = texture2D(tBloom, vUv).rgb;
  gl_FragColor = vec4(sceneSample.rgb + bloomSample * uBloomStrength, sceneSample.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Self-contained Three.js r160 HDR selective bloom & ACES tone-mapping composer.
 * Uses HalfFloat render targets and a 5-mip dual-filter blur pyramid with zero
 * external jsm dependencies. Falls back cleanly to direct rendering when disabled
 * or when WebGL render targets cannot initialize.
 */
export class CinematicComposer {
  /**
   * @param {THREE.WebGLRenderer|null} renderer
   * @param {object} [options]
   * @param {boolean} [options.enabled=true]
   * @param {number} [options.threshold=0.92]
   * @param {number} [options.knee=0.35]
   * @param {number} [options.strength=0.52]
   * @param {number} [options.radius=1.15]
   */
  constructor(renderer, options = {}) {
    this.renderer = renderer || null;
    this.enabled = options.enabled !== false;
    this.threshold = typeof options.threshold === 'number' ? options.threshold : 0.92;
    this.knee = typeof options.knee === 'number' ? options.knee : 0.35;
    this.strength = typeof options.strength === 'number' ? options.strength : 0.52;
    this.radius = typeof options.radius === 'number' ? options.radius : 1.15;

    this.width = 1;
    this.height = 1;
    this.pixelRatio = 1;
    this.mipCount = 5;
    this.isSupported = false;
    this.isDisposed = false;

    this.sceneTarget = null;
    this.mipTargets = [];
    this._quadScene = null;
    this._quadCamera = null;
    this._quadMesh = null;
    this._quadGeo = null;
    this._prefilterMat = null;
    this._downsampleMat = null;
    this._upsampleMat = null;
    this._compositeMat = null;

    this._init();
  }

  _init() {
    if (!this.renderer || typeof this.renderer.getContext !== 'function') return;

    let gl = null;
    try {
      gl = this.renderer.getContext();
    } catch (_) {
      gl = null;
    }
    if (!gl) return;

    try {
      const size = new THREE.Vector2();
      if (typeof this.renderer.getSize === 'function') {
        this.renderer.getSize(size);
      }
      this.pixelRatio = typeof this.renderer.getPixelRatio === 'function' ? this.renderer.getPixelRatio() : 1;
      const w = Math.max(1, Math.floor((size.x || 800) * this.pixelRatio));
      const h = Math.max(1, Math.floor((size.y || 600) * this.pixelRatio));
      this.width = w;
      this.height = h;

      const rtOpts = {
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true,
        stencilBuffer: false
      };
      this.sceneTarget = new THREE.WebGLRenderTarget(w, h, rtOpts);

      this.mipTargets = [];
      let mw = w;
      let mh = h;
      for (let i = 0; i < this.mipCount; i++) {
        mw = Math.max(1, Math.floor(mw / 2));
        mh = Math.max(1, Math.floor(mh / 2));
        this.mipTargets.push(
          new THREE.WebGLRenderTarget(mw, mh, {
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            stencilBuffer: false
          })
        );
      }

      this._quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this._quadScene = new THREE.Scene();
      this._quadGeo = new THREE.PlaneGeometry(2, 2);

      this._prefilterMat = new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: PREFILTER_FRAG,
        uniforms: {
          tDiffuse: { value: null },
          uThreshold: { value: this.threshold },
          uKnee: { value: this.knee }
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });

      this._downsampleMat = new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: DOWNSAMPLE_FRAG,
        uniforms: {
          tDiffuse: { value: null },
          uTexelSize: { value: new THREE.Vector2(1 / w, 1 / h) }
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });

      this._upsampleMat = new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: UPSAMPLE_FRAG,
        uniforms: {
          tDiffuse: { value: null },
          uTexelSize: { value: new THREE.Vector2(1 / w, 1 / h) },
          uRadius: { value: this.radius }
        },
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });

      this._compositeMat = new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: COMPOSITE_FRAG,
        uniforms: {
          tScene: { value: this.sceneTarget.texture },
          tBloom: { value: this.mipTargets[0].texture },
          uBloomStrength: { value: this.strength }
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: true
      });

      this._quadMesh = new THREE.Mesh(this._quadGeo, this._compositeMat);
      this._quadMesh.frustumCulled = false;
      this._quadScene.add(this._quadMesh);

      this.isSupported = true;
    } catch (err) {
      console.warn('[PostProcessing] HDR bloom initialization failed, falling back to direct render:', err);
      this.isSupported = false;
      this.dispose();
    }
  }

  /**
   * Enables or disables HDR selective bloom dynamically.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
  }

  /**
   * Resizes HDR scene and bloom mip targets to match viewport dimensions.
   * @param {number} width Logical CSS width
   * @param {number} height Logical CSS height
   * @param {number} [pixelRatio=1]
   */
  setSize(width, height, pixelRatio = 1) {
    if (this.isDisposed || !this.isSupported) return;
    const pr = Math.max(0.5, pixelRatio || 1);
    const w = Math.max(1, Math.floor((width || 1) * pr));
    const h = Math.max(1, Math.floor((height || 1) * pr));
    if (w === this.width && h === this.height && pr === this.pixelRatio) return;

    this.width = w;
    this.height = h;
    this.pixelRatio = pr;

    if (this.sceneTarget) {
      this.sceneTarget.setSize(w, h);
    }
    let mw = w;
    let mh = h;
    for (let i = 0; i < this.mipTargets.length; i++) {
      mw = Math.max(1, Math.floor(mw / 2));
      mh = Math.max(1, Math.floor(mh / 2));
      this.mipTargets[i].setSize(mw, mh);
    }
  }

  /**
   * Renders scene through HDR bloom pipeline, or falls back directly to renderer.render.
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  render(scene, camera) {
    if (!this.renderer || !scene || !camera) return;

    if (!this.enabled || !this.isSupported || this.isDisposed || !this.sceneTarget) {
      this.renderer.render(scene, camera);
      return;
    }

    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAutoClear = r.autoClear;

    try {
      // 1. Render scene into HalfFloat HDR buffer
      r.setRenderTarget(this.sceneTarget);
      r.autoClear = true;
      r.clear();
      r.render(scene, camera);

      // 2. Luminance threshold prefilter -> mipTargets[0]
      this._prefilterMat.uniforms.tDiffuse.value = this.sceneTarget.texture;
      this._prefilterMat.uniforms.uThreshold.value = this.threshold;
      this._prefilterMat.uniforms.uKnee.value = this.knee;
      this._quadMesh.material = this._prefilterMat;
      r.setRenderTarget(this.mipTargets[0]);
      r.render(this._quadScene, this._quadCamera);

      // 3. Downsample pyramid mip[i-1] -> mip[i]
      this._quadMesh.material = this._downsampleMat;
      for (let i = 1; i < this.mipTargets.length; i++) {
        const src = this.mipTargets[i - 1];
        const dst = this.mipTargets[i];
        this._downsampleMat.uniforms.tDiffuse.value = src.texture;
        this._downsampleMat.uniforms.uTexelSize.value.set(1 / src.width, 1 / src.height);
        r.setRenderTarget(dst);
        r.render(this._quadScene, this._quadCamera);
      }

      // 4. Upsample additive accumulation mip[i] -> mip[i-1]
      r.autoClear = false;
      this._quadMesh.material = this._upsampleMat;
      this._upsampleMat.uniforms.uRadius.value = this.radius;
      for (let i = this.mipTargets.length - 1; i >= 1; i--) {
        const src = this.mipTargets[i];
        const dst = this.mipTargets[i - 1];
        this._upsampleMat.uniforms.tDiffuse.value = src.texture;
        this._upsampleMat.uniforms.uTexelSize.value.set(1 / src.width, 1 / src.height);
        r.setRenderTarget(dst);
        r.render(this._quadScene, this._quadCamera);
      }

      // 5. Final ACES tone-mapped composite -> screen
      r.autoClear = true;
      this._compositeMat.uniforms.tScene.value = this.sceneTarget.texture;
      this._compositeMat.uniforms.tBloom.value = this.mipTargets[0].texture;
      this._compositeMat.uniforms.uBloomStrength.value = this.strength;
      this._quadMesh.material = this._compositeMat;
      r.setRenderTarget(null);
      r.render(this._quadScene, this._quadCamera);
    } finally {
      r.setRenderTarget(prevTarget);
      r.autoClear = prevAutoClear;
    }
  }

  /**
   * Releases all GPU render targets, shader materials, and fullscreen quad geometry.
   */
  dispose() {
    this.isDisposed = true;
    this.isSupported = false;

    if (this.sceneTarget) {
      this.sceneTarget.dispose();
      this.sceneTarget = null;
    }
    for (const rt of this.mipTargets) {
      rt.dispose();
    }
    this.mipTargets = [];

    if (this._quadGeo) {
      this._quadGeo.dispose();
      this._quadGeo = null;
    }
    if (this._prefilterMat) { this._prefilterMat.dispose(); this._prefilterMat = null; }
    if (this._downsampleMat) { this._downsampleMat.dispose(); this._downsampleMat = null; }
    if (this._upsampleMat) { this._upsampleMat.dispose(); this._upsampleMat = null; }
    if (this._compositeMat) { this._compositeMat.dispose(); this._compositeMat = null; }

    this._quadMesh = null;
    this._quadScene = null;
    this._quadCamera = null;
  }
}
