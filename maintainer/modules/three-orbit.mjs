import { WebGLRenderer, Scene, PerspectiveCamera, Group, TorusGeometry, CylinderGeometry, Mesh, MeshStandardMaterial,
  HemisphereLight, DirectionalLight, ACESFilmicToneMapping, SRGBColorSpace } from 'three';

/** Original procedural form. No external model, animation template or hidden wall clock. */
export async function create({ width, height }) {
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(width, height, false);
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene(); const camera = new PerspectiveCamera(34, width / height, 0.1, 100);
  camera.position.set(0, 1.1, 7); camera.lookAt(0, 0, 0);
  const subject = new Group(); scene.add(subject);
  const material = new MeshStandardMaterial({ color: '#d8f8a6', metalness: 0.72, roughness: 0.24 });
  const ring = new TorusGeometry(1.15, 0.16, 32, 128);
  for (let i = 0; i < 3; i++) {
    const mesh = new Mesh(ring, material); mesh.rotation.x = i * Math.PI / 3; mesh.rotation.y = i * Math.PI / 3;
    subject.add(mesh);
  }
  const coreGeometry = new CylinderGeometry(0.32, 0.32, 1.75, 48);
  const coreMaterial = new MeshStandardMaterial({ color: '#dce7ee', metalness: 0.55, roughness: 0.3 });
  subject.add(new Mesh(coreGeometry, coreMaterial));
  scene.add(new HemisphereLight('#d7eaff', '#17291a', 3));
  const key = new DirectionalLight('#ffffff', 5); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new DirectionalLight('#84b7ff', 4); rim.position.set(4, -1, -2); scene.add(rim);
  try { await renderer.compileAsync(scene, camera); }
  catch (error) { ring.dispose(); coreGeometry.dispose(); material.dispose(); coreMaterial.dispose(); renderer.dispose(); throw error; }
  return {
    canvas,
    renderFrame({ width, height, params }) {
      if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) renderer.setSize(Math.round(width), Math.round(height), false);
      camera.aspect = width / height; camera.position.z = params.cameraDistance ?? 7; camera.updateProjectionMatrix();
      subject.rotation.set((params.tilt ?? 12) * Math.PI / 180, (params.turn ?? 0) * Math.PI / 180, 0);
      renderer.render(scene, camera);
    },
    destroy() {
      ring.dispose(); coreGeometry.dispose(); material.dispose(); coreMaterial.dispose(); renderer.dispose(); renderer.forceContextLoss();
      canvas.width = canvas.height = 0;
    },
  };
}
