import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronLeft, ChevronRight, Armchair, Car as CarIcon } from 'lucide-react';
import { SHOWCASE_CARS } from '../data/showcaseCars';

const N = SHOWCASE_CARS.length;
const SPACING = 3.6; // khoảng cách ngang giữa các xe (m)
const XRAY_OPACITY = 0.1;
// Xe đứng chéo 3/4: đầu xe (-Z) quay về camera rồi lệch sang phải
const BASE_YAW = Math.PI - 0.65;

const mod = (a: number, n: number) => ((a % n) + n) % n;

interface MatState {
  mat: THREE.Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

interface LoadedCar {
  root: THREE.Group;
  bodyMats: MatState[];
  seats: THREE.Object3D[];
  shadow: THREE.Mesh;
}

// Bóng mềm dưới gầm xe, vẽ bằng canvas để khỏi tốn shadow map
const makeShadowTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, 'rgba(15,23,42,0.55)');
  grd.addColorStop(1, 'rgba(15,23,42,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

const CarShowcase3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0); // không giới hạn, xe = index mod N (vòng lặp)
  const [xray, setXray] = useState(false);
  const [loading, setLoading] = useState(true);
  const indexRef = useRef(0);
  const xrayRef = useRef(false);
  const loadRef = useRef<(i: number) => void>(() => {});

  const car = SHOWCASE_CARS[mod(index, N)];

  const go = (step: number) => {
    setIndex((i) => i + step);
    setXray(false);
  };
  const goRef = useRef(go);

  useEffect(() => {
    indexRef.current = index;
    loadRef.current(mod(index, N));
  }, [index]);

  useEffect(() => {
    xrayRef.current = xray;
  }, [xray]);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdbe3ee, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(4, 8, 6);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const camPos = new THREE.Vector3(0, 2.2, 8);
    const camTarget = new THREE.Vector3(0, 0.75, 0);
    let fitDist = 8;

    const shadowTex = makeShadowTexture();
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const cars = new Map<number, LoadedCar>();
    const pending = new Set<number>();

    // Tải xe đang xem trước; xong mới tải hai xe hai bên để xe chính hiện nhanh nhất
    const loadNeighbors = (i: number) => {
      for (const d of [1, -1]) loadRef.current(mod(i + d, N));
    };
    loadRef.current = (i: number) => {
      if (cars.has(i)) {
        if (i === mod(indexRef.current, N)) loadNeighbors(i);
        return;
      }
      if (pending.has(i)) return;
      pending.add(i);
      loader.load(
        SHOWCASE_CARS[i].file,
        (gltf) => {
          pending.delete(i);
          const root = new THREE.Group();
          root.add(gltf.scene);
          const bodyMats: MatState[] = [];
          const seats: THREE.Object3D[] = [];
          gltf.scene.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            if (o.name.startsWith('SEAT')) {
              const m = (mesh.material as THREE.MeshStandardMaterial).clone();
              m.emissive = new THREE.Color(0x2563eb);
              m.emissiveIntensity = 0.6;
              mesh.material = m;
              mesh.visible = false;
              mesh.renderOrder = 2;
              seats.push(o);
              return;
            }
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const cloned = mats.map((m) => {
              const c = m.clone();
              bodyMats.push({ mat: c, opacity: c.opacity, transparent: c.transparent, depthWrite: c.depthWrite });
              return c;
            });
            mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
          });
          const shadow = new THREE.Mesh(
            new THREE.PlaneGeometry(3.2, 6),
            new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
          );
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = 0.005;
          root.add(shadow);
          root.visible = false;
          scene.add(root);
          cars.set(i, { root, bodyMats, seats, shadow });
          if (i === mod(indexRef.current, N)) {
            setLoading(false);
            loadNeighbors(i);
          }
        },
        undefined,
        () => pending.delete(i)
      );
    };
    loadRef.current(mod(indexRef.current, N));

    // --- Kéo để xoay, vuốt nhanh để đổi xe ---
    let pos = indexRef.current; // vị trí carousel đang trượt tới index
    let userYaw = 0;
    let yawVel = 0;
    let drag: { x: number; t: number; yaw0: number; last: number; lastT: number } | null = null;
    let lastInteract = 0;
    const el = renderer.domElement;

    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, t: performance.now(), yaw0: userYaw, last: e.clientX, lastT: performance.now() };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const now = performance.now();
      yawVel = ((e.clientX - drag.last) * 0.012) / Math.max(now - drag.lastT, 1) * 16;
      drag.last = e.clientX;
      drag.lastT = now;
      userYaw = drag.yaw0 + (e.clientX - drag.x) * 0.012;
      lastInteract = now;
    };
    const onUp = () => {
      if (!drag) return;
      const dx = drag.last - drag.x;
      const dt = performance.now() - drag.t;
      if (Math.abs(dx) > 70 && dt < 300) {
        userYaw = drag.yaw0;
        yawVel = 0;
        goRef.current(dx < 0 ? 1 : -1);
      }
      drag = null;
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // đủ rộng để xe dài ~5 m nằm gọn ở giữa trên cả điện thoại dọc
      fitDist = Math.max(8, 12 / camera.aspect);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(mount);

    let prevIndex = indexRef.current;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!visible) return;

      if (indexRef.current !== prevIndex) {
        prevIndex = indexRef.current;
        userYaw = 0;
        yawVel = 0;
      }
      pos += (indexRef.current - pos) * Math.min(1, dt * 5);
      if (!drag) {
        userYaw += yawVel;
        yawVel *= 0.92;
        // tự xoay chậm khi khách không chạm vào
        if (now - lastInteract > 2500 && !xrayRef.current) userYaw += dt * 0.25;
      }

      const xr = xrayRef.current;
      cars.forEach((c, i) => {
        let d = mod(i - pos + N / 2, N) - N / 2;
        if (N === 1) d = 0;
        const a = Math.min(Math.abs(d), 1);
        c.root.visible = Math.abs(d) < 1.6;
        if (!c.root.visible) return;
        const scale = 1 - 0.5 * a;
        c.root.scale.setScalar(scale);
        c.root.position.set(d * SPACING, 0, -Math.abs(d) * 2.5);
        c.root.rotation.y = BASE_YAW + userYaw * (1 - a);
        const fade = 1 - 0.85 * Math.min(Math.abs(d) / 1.2, 1);
        const showSeats = xr && a < 0.05;
        for (const s of c.bodyMats) {
          const target = (showSeats ? XRAY_OPACITY : s.opacity) * fade;
          const see = target < 0.999;
          s.mat.opacity = target;
          if (s.mat.transparent !== (see || s.transparent)) {
            s.mat.transparent = see || s.transparent;
            s.mat.needsUpdate = true;
          }
          s.mat.depthWrite = showSeats ? false : s.depthWrite;
        }
        c.seats.forEach((s) => (s.visible = showSeats));
        (c.shadow.material as THREE.MeshBasicMaterial).opacity = fade;
      });

      // camera: chế độ xem chỗ ngồi thì nâng cao nhìn từ trên xuống
      const want = xr
        ? new THREE.Vector3(0, fitDist * 1.05, fitDist * 0.6)
        : new THREE.Vector3(0, fitDist * 0.26, fitDist);
      camPos.lerp(want, Math.min(1, dt * 3));
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
      });
      shadowTex.dispose();
      pmrem.dispose();
      draco.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      loadRef.current = () => {};
    };
  }, []);

  return (
    <div className="relative w-full h-[440px] sm:h-[560px] select-none">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div className="pointer-events-none absolute inset-x-0 top-4 sm:top-6 text-center">
        <div className="text-xs sm:text-sm font-medium text-slate-500">{car.brand}</div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900">{car.name}</h2>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white text-xs font-medium px-3 py-1">
          <Armchair className="w-3.5 h-3.5" /> {car.seats} chỗ ngồi
        </div>
      </div>

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Đang tải mô hình 3D...
        </div>
      )}

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Xe trước"
        className="absolute left-[max(0.5rem,calc(50%-500px))] top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Xe tiếp theo"
        className="absolute right-[max(0.5rem,calc(50%-500px))] top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute inset-x-0 bottom-3 sm:bottom-5 flex flex-col items-center gap-2.5 px-4">
        <button
          type="button"
          onClick={() => setXray((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition"
        >
          {xray ? <CarIcon className="w-4 h-4" /> : <Armchair className="w-4 h-4" />}
          {xray ? 'Xem ngoại thất' : `Xem ${car.seats} chỗ ngồi bên trong`}
        </button>
        <div className="flex items-center gap-1.5">
          {SHOWCASE_CARS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={`${c.brand} ${c.name}`}
              onClick={() => {
                const cur = mod(index, N);
                let step = i - cur;
                if (step > N / 2) step -= N;
                if (step < -N / 2) step += N;
                go(step);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === mod(index, N) ? 'w-6 bg-slate-900' : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarShowcase3D;
