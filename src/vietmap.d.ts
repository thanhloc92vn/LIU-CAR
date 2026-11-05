// Gói @vietmap/vietmap-gl-js không khai báo "main", chỉ có bản dựng sẵn trong dist
declare module '@vietmap/vietmap-gl-js/dist/vietmap-gl.js' {
  const vietmapgl: typeof import('@vietmap/vietmap-gl-js');
  export default vietmapgl;
}
