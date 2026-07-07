import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { MaterialMaps } from '../types/material';

/**
 * Reusable material-ball thumbnail renderer (the Poly Haven convention).
 *
 * One tiny SHARED offscreen WebGL renderer + scene is created lazily and
 * reused for every thumbnail, so rendering N previews costs one GL context.
 * `renderMaterialThumbnail(maps)` loads the given PBR maps onto a lit sphere,
 * renders one frame and returns a PNG data URL — ready for <img src>.
 *
 * The AI layer can call this with generated map URLs to fill the materials
 * tray with previews; today the tray uses it to preview the active material.
 */

const THUMB_SIZE = 128; // rendered at 128², displayed smaller (crisp on 2x DPI)
const SPHERE_TILING = 2; // echoes how the showroom repeats tileable textures

interface ThumbRig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  material: THREE.MeshStandardMaterial;
}

let rig: ThumbRig | null = null;

function getRig(): ThumbRig {
  if (rig) return rig;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(THUMB_SIZE, THUMB_SIZE);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = null; // transparent — the CSS slot provides the disc

  // Small neutral IBL so PBR maps read correctly in the preview.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
  camera.position.set(0, 0.25, 3.1);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(2.5, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#b7c4d6', 1.1);
  rim.position.set(-2, 1.5, -3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight('#ffffff', 0.25));

  const material = new THREE.MeshStandardMaterial({ color: '#8a8a8a', roughness: 0.55 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), material);
  scene.add(sphere);

  rig = { renderer, scene, camera, material };
  return rig;
}

function loadThumbTexture(src: string, isColor: boolean): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(src).then((tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(SPHERE_TILING, SPHERE_TILING);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
  });
}

/** Render the given PBR map set on a lit sphere; resolves to a PNG data URL. */
export async function renderMaterialThumbnail(maps: MaterialMaps): Promise<string> {
  const { renderer, scene, camera, material } = getRig();

  const [albedo, normal, roughness] = await Promise.all([
    maps.albedo ? loadThumbTexture(maps.albedo, true) : null,
    maps.normal ? loadThumbTexture(maps.normal, false) : null,
    maps.roughness ? loadThumbTexture(maps.roughness, false) : null,
  ]);

  material.map = albedo;
  material.normalMap = normal;
  material.roughnessMap = roughness;
  material.color.set(albedo ? '#ffffff' : '#8a8a8a');
  material.roughness = roughness ? 1.0 : 0.55;
  material.needsUpdate = true;

  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');

  // Free the textures; the rig itself stays for the next call.
  material.map = null;
  material.normalMap = null;
  material.roughnessMap = null;
  albedo?.dispose();
  normal?.dispose();
  roughness?.dispose();

  return dataURL;
}
