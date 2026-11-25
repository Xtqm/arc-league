import * as THREE from '../../vendor/three.module.js';

/**
 * Builds the procedural studio light-box scene used for PMREM baking,
 * pairing cool cyan/cobalt panels with contrasting warm amber counter-rim strips.
 *
 * @param {object} [options]
 * @param {number} [options.cyanColor=0x00d8ff]
 * @param {number} [options.amberColor=0xff7b1a]
 * @param {number} [options.cobaltColor=0x2f74d0]
 * @returns {{ envScene: THREE.Scene, geometries: THREE.BufferGeometry[], materials: THREE.Material[], panels: THREE.Mesh[] }}
 */
export function buildProceduralEnvironmentScene(options = {}) {
  const cyanColor = options.cyanColor ?? 0x00d8ff;
  const amberColor = options.amberColor ?? 0xff7b1a;
  const cobaltColor = options.cobaltColor ?? 0x2f74d0;

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x040b12);

  const geometries = [];
  const materials = [];
  const panels = [];

  const addPanel = (role, geo, colorHex, pos, rot = [0, 0, 0]) => {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = role;
    mesh.userData.panelRole = role;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    envScene.add(mesh);
    geometries.push(geo);
    materials.push(mat);
    panels.push(mesh);
    return mesh;
  };

  // Overhead cool slate softbox
  addPanel('overhead_softbox', new THREE.PlaneGeometry(18, 18), 0x4b87a8, [0, 9, 0], [Math.PI / 2, 0, 0]);
  // Contrasting cool cyan vs. warm amber opposing horizon rim strips for bevel specular catchlights
  addPanel('rim_cyan', new THREE.PlaneGeometry(16, 4.2), cyanColor, [10, 2.8, 0], [0, -Math.PI / 2, 0]);
  addPanel('rim_amber', new THREE.PlaneGeometry(16, 4.2), amberColor, [-10, 2.8, 0], [0, Math.PI / 2, 0]);
  // Secondary cobalt & warm counter-accent upper horizon strips
  addPanel('rim_cobalt_upper', new THREE.PlaneGeometry(14, 2.2), cobaltColor, [9.5, 5.8, -1.5], [0.18, -Math.PI / 2, 0]);
  addPanel('rim_amber_upper', new THREE.PlaneGeometry(14, 1.8), 0xb84c12, [-9.5, 5.8, 1.5], [-0.18, Math.PI / 2, 0]);
  // Subtle front/rear studio fill bounce
  addPanel('fill_front_cobalt', new THREE.PlaneGeometry(14, 3.0), 0x22547e, [0, 2.5, 10], [0, Math.PI, 0]);
  addPanel('fill_rear_slate', new THREE.PlaneGeometry(14, 3.0), 0x16293d, [0, 2.5, -10], [0, 0, 0]);
  // Deep chasm / arena floor up-bounce
  addPanel('chasm_floor_bounce', new THREE.PlaneGeometry(20, 20), 0x072434, [0, -7, 0], [-Math.PI / 2, 0, 0]);

  return { envScene, geometries, materials, panels };
}

/**
 * Generates a lightweight procedural PMREM environment reflection cubemap at startup
 * so metallic faceted obsidian/slate construct armor plates and beveled foundry slabs
 * catch sharp contrasting cyan and amber rim highlights without external HDRI texture assets.
 *
 * @param {THREE.WebGLRenderer|null} renderer
 * @param {object} [options]
 * @param {number} [options.blur=0.04]
 * @returns {{ texture: THREE.Texture, renderTarget: THREE.WebGLRenderTarget, dispose: () => void } | null}
 */
export function createProceduralEnvironment(renderer, options = {}) {
  if (!renderer || typeof renderer.getContext !== 'function') {
    return null;
  }

  let gl = null;
  try {
    gl = renderer.getContext();
  } catch (_) {
    gl = null;
  }
  if (!gl) return null;

  const { envScene, geometries, materials } = buildProceduralEnvironmentScene(options);

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const renderTarget = pmrem.fromScene(envScene, options.blur ?? 0.04);
    pmrem.dispose();

    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();

    return {
      texture: renderTarget.texture,
      renderTarget,
      dispose() {
        renderTarget.dispose();
      }
    };
  } catch (err) {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    console.warn('[Environment] Procedural PMREM baking unavailable:', err);
    return null;
  }
}
