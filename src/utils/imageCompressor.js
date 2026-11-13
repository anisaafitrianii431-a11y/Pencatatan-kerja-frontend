/**
 * Utilitas Kompresi Gambar Otomatis Berbasis Canvas HTML5
 * Mengurangi ukuran gambar (foto kamera HP / kuitansi) hingga 80-95%
 * sebelum diunggah ke server tanpa mengurangi keterbacaan teks bukti transaksi.
 */

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.78,
  } = options;

  return new Promise((resolve) => {
    // Jika bukan file gambar, kembalikan file asli
    if (!file || !file.type.startsWith('image/')) {
      resolve({
        file,
        originalSize: file ? file.size : 0,
        compressedSize: file ? file.size : 0,
        ratio: 0,
        previewUrl: file ? URL.createObjectURL(file) : '',
        width: 0,
        height: 0,
        wasCompressed: false
      });
      return;
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({
        file,
        originalSize,
        compressedSize: originalSize,
        ratio: 0,
        previewUrl: URL.createObjectURL(file),
        width: 0,
        height: 0,
        wasCompressed: false
      });
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          ratio: 0,
          previewUrl: URL.createObjectURL(file),
          width: 0,
          height: 0,
          wasCompressed: false
        });
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung penskalaan proporsional jika melebihi batas resolusi maksimal
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            file,
            originalSize,
            compressedSize: originalSize,
            ratio: 0,
            previewUrl: URL.createObjectURL(file),
            width: img.width,
            height: img.height,
            wasCompressed: false
          });
          return;
        }

        // Latar belakang putih (mencegah background hitam jika PNG transparan diubah ke JPG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Gambar ulang dengan ukuran baru
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke format JPEG dengan rasio kompresi optimal
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                file,
                originalSize,
                compressedSize: originalSize,
                ratio: 0,
                previewUrl: URL.createObjectURL(file),
                width,
                height,
                wasCompressed: false
              });
              return;
            }

            // Jika hasil kompresi ternyata lebih besar (misal file SVG/kartun sangat kecil), gunakan yang terkecil
            if (blob.size >= originalSize && originalSize < 300 * 1024) {
              resolve({
                file,
                originalSize,
                compressedSize: originalSize,
                ratio: 0,
                previewUrl: URL.createObjectURL(file),
                width: img.width,
                height: img.height,
                wasCompressed: false
              });
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            const savedBytes = originalSize - blob.size;
            const ratioPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : 0;

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize: blob.size,
              ratio: parseFloat(ratioPercent),
              previewUrl: URL.createObjectURL(blob),
              width,
              height,
              wasCompressed: true
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Konversi File / Blob menjadi Data URL (Base64)
 */
export function fileToDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(fileOrBlob);
  });
}


