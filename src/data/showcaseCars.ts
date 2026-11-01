// Xe trưng bày 3D trên trang khách. File .glb nằm trong public/models (đã nén bằng Blender).
// Quy ước: Blender xuất xe với đầu xe hướng về -Z (glTF), bánh xe chạm y = 0, đơn vị mét.
export interface ShowcaseCar {
  id: string;
  name: string;
  brand: string;
  file: string;
  seats: number;
  // title: tên mẫu gốc trên Sketchfab khi khác tên hiển thị
  credit?: { author: string; url: string; license: string; title?: string };
}

export const SHOWCASE_CARS: ShowcaseCar[] = [
  {
    id: 'limo-green',
    name: 'Limo Green',
    brand: 'VinFast',
    file: '/models/limo-green.glb',
    seats: 7,
    credit: {
      author: 'i.am.duc.em2003',
      url: 'https://sketchfab.com/3d-models/vinfast-vf9-model-no-interior-1d704c3f91374f80ac8ea63c2b94948c',
      license: 'CC BY 4.0',
      title: 'Vinfast VF9 model (no interior)',
    },
  },
  {
    id: 'fadil',
    name: 'VF 5',
    brand: 'VinFast',
    file: '/models/fadil.glb',
    seats: 5,
    credit: {
      author: 'Dave Love',
      title: '2019 VinFast Fadil',
      url: 'https://sketchfab.com/3d-models/2019-vinfast-fadil-b2ff01a2863a4f6fbfc61a2da8b70f41',
      license: 'CC BY 4.0',
    },
  },
  {
    id: 'fortuner',
    name: 'Fortuner',
    brand: 'Toyota',
    file: '/models/fortuner.glb',
    seats: 7,
    credit: {
      author: 'Asadawut.Kaewma',
      url: 'https://sketchfab.com/3d-models/toyota-fortuner-2021-a70b997f11b7482e9affbf318a508f85',
      license: 'CC BY 4.0',
    },
  },
  {
    id: 'sorento',
    name: 'Sorento',
    brand: 'Kia',
    file: '/models/sorento.glb',
    seats: 7,
    credit: {
      author: 'mvntyyy',
      url: 'https://sketchfab.com/3d-models/2020-kia-sorento-ex-v6-cc8ead2872aa4dbc8b7d82e38e108b46',
      license: 'CC BY 4.0',
    },
  },
  {
    id: 'optima',
    name: 'Optima',
    brand: 'Kia',
    file: '/models/optima.glb',
    seats: 5,
    credit: {
      author: 'mvntyyy',
      url: 'https://sketchfab.com/3d-models/2020-kia-optima-ex-0d96743a0d6b4b999adabd4686917483',
      license: 'CC BY 4.0',
    },
  },
  {
    id: 'outlander',
    name: 'Outlander',
    brand: 'Mitsubishi',
    file: '/models/outlander.glb',
    seats: 7,
    credit: {
      author: 'twr422',
      url: 'https://sketchfab.com/3d-models/2026-mitsubishi-outlander-es-6347047d7187409aa85df73559f5298e',
      license: 'CC BY 4.0',
    },
  },
  {
    id: 'carnival',
    name: 'Carnival',
    brand: 'Kia',
    file: '/models/carnival.glb',
    seats: 7,
    credit: {
      author: 'geyges',
      url: 'https://sketchfab.com/3d-models/kia-carnival-ab0623b403b3471b844c518de9c3ee3b',
      license: 'Sketchfab Standard',
    },
  },
  {
    id: 'vf3',
    name: 'VF 3',
    brand: 'VinFast',
    file: '/models/vf3.glb',
    seats: 4,
    credit: {
      author: 'Hoàng Huy',
      url: 'https://sketchfab.com/3d-models/vinfast-vf3-plus-2026-aa87e1cd1fdd42ae92e5a397e3d5b125',
      license: 'CC BY 4.0',
    },
  },
];
