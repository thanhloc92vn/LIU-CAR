export const MAX_VEHICLE_IMAGES = 3;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const MAX_EDGE_PX = 900;

// Thu nhỏ ảnh về JPEG ~vài chục KB trước khi tải lên Supabase Storage (uploadVehicleImage).
export const fileToCompressedDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" không phải file ảnh`));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(`"${file.name}" lớn hơn 4MB`));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Không đọc được "${file.name}"`));
    };
    img.src = url;
  });
