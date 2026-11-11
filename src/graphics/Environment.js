import * as THREE from '../../vendor/three.module.js';

/**
 * Generates a lightweight procedural PMREM environment reflection cubemap at startup
 * so metallic faceted obsidian/slate construct armor plates catch sharp cool rim
 * highlights without external HDRI texture assets.
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

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x040b12);

  const createdGeos = [];
  const createdMats = [];

  const addPanel = (geo, colorHex, pos, rot = [0, 0, 0]) => {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    envScene.add(mesh);
    createdGeos.push(geo);
    createdMats.push(mat);
    return mesh;
  };

  try {
    // Overhead cool slate softbox
    addPanel(new THREE.PlaneGeometry(18, 18), 0x4b87a8, [0, 9, 0], [Math.PI / 2, 0, 0]);
    // Symmetrical cyan & cobalt horizon rim strips for bevel specular catchlights
    addPanel(new THREE.PlaneGeometry(16, 4.2), 0x00d8ff, [10, 2.8, 0], [0, -Math.PI / 2, 0]);
    addPanel(new THREE.PlaneGeometry(16, 4.2), 0x2f74d0, [-10, 2.8, 0], [0, Math.PI / 2, 0]);
    // Subtle front/rear studio fill bounce
    addPanel(new THREE.PlaneGeometry(14, 3.0), 0x204864, [0, 2.5, 10], [0, Math.PI, 0]);
    addPanel(new THREE.PlaneGeometry(14, 3.0), 0x16293d, [0, 2.5, -10], [0, 0, 0]);
    // Deep arena floor bounce
    addPanel(new THREE.PlaneGeometry(20, 20), 0x061924, [0, -7, 0], [-Math.PI / 2, 0, 0]);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const renderTarget = pmrem.fromScene(envScene, options.blur ?? 0.04);
    pmrem.dispose();

    for (const g of createdGeos) g.dispose();
    for (const m of createdMats) m.dispose();

    return {
      texture: renderTarget.texture,
      renderTarget,
      dispose() {
        renderTarget.dispose();
      }
    };
  } catch (err) {
    for (const g of createdGeos) g.dispose();
    for (const m of createdMats) m.dispose();
    console.warn('[Environment] Procedural PMREM baking unavailable:', err);
    return null;
  }
}
