/**
 * printHelpers.js
 * Utilitas dan konstanta format cetak dokumen resmi (PDF & Print A4)
 * PAM-TECHNO (CV. Putra Anugrah Mandiri)
 */

export const COMPANY_INFO = {
  name: 'PAM-TECHNO (CV. PUTRA ANUGRAH MANDIRI)',
  brand: 'CV. PUTRA ANUGRAH MANDIRI',
  tagline: 'General Contractor, Electrical & IT Infrastructure Services',
  address: 'Jl. Wonosari Km. 8, Bantul, Daerah Istimewa Yogyakarta',
  contact: 'Telp: (0274) 435-889 | Email: admin@putraanugrah.co.id',
  city: 'Yogyakarta',
};

/**
 * Konversi angka rupiah ke kalimat terbilang Bahasa Indonesia
 * Contoh: 855000 -> "Delapan Ratus Lima Puluh Lima Ribu Rupiah"
 */
export function angkaTerbilang(nilai) {
  const angka = Math.floor(Math.abs(Number(nilai) || 0));
  if (angka === 0) return 'Nol Rupiah';

  const satuan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function hitung(n) {
    if (n < 12) return ' ' + satuan[n];
    if (n < 20) return hitung(n - 10) + ' Belas';
    if (n < 100) return hitung(Math.floor(n / 10)) + ' Puluh' + hitung(n % 10);
    if (n < 200) return ' Seratus' + hitung(n - 100);
    if (n < 1000) return hitung(Math.floor(n / 100)) + ' Ratus' + hitung(n % 100);
    if (n < 2000) return ' Seribu' + hitung(n - 1000);
    if (n < 1000000) return hitung(Math.floor(n / 1000)) + ' Ribu' + hitung(n % 1000);
    if (n < 1000000000) return hitung(Math.floor(n / 1000000)) + ' Juta' + hitung(n % 1000000);
    if (n < 1000000000000) return hitung(Math.floor(n / 1000000000)) + ' Miliar' + hitung(n % 1000000000);
    return '';
  }

  const hasil = (hitung(angka).trim() + ' Rupiah').replace(/\s+/g, ' ');
  return hasil;
}

/**
 * Format string tanggal YYYY-MM menjadi "Bulan Tahun" dalam Bahasa Indonesia
 * Contoh: "2026-11" -> "November 2026"
 */
export function formatPeriodeIndo(periodeStr) {
  if (!periodeStr) return '-';
  const parts = String(periodeStr).split('-');
  if (parts.length < 2) return periodeStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const bulanNama = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${bulanNama[month - 1] || parts[1]} ${year}`;
}

/**
 * Format tanggal lengkap hari ini dalam Bahasa Indonesia
 * Contoh: "8 November 2026"
 */
export function formatTanggalCetak(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Generate nomor referensi dokumen resmi
 */
export function generateNoDokumen(prefix, periode, id) {
  const cleanPeriode = (periode || '2026-11').replace('-', '');
  const cleanId = String(id || '01').padStart(3, '0');
  return `PAM/${prefix}/${cleanPeriode}/${cleanId}`;
}

/**
 * Periode bulan berjalan (YYYY-MM) sesuai zona waktu Asia/Jakarta
 */
export function getJakartaCurrentPeriode() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit'
    }).format(new Date()).slice(0, 7);
  } catch {
    return new Date().toISOString().slice(0, 7);
  }
}

/**
 * Format tanggal YYYY-MM-DD menjadi Bahasa Indonesia tanpa pergeseran zona waktu
 */
export function formatTanggalIndo(dateStr, withWeekday = false) {
  if (!dateStr) return '-';
  const raw = String(dateStr).trim();
  const baseDate = raw.length >= 10 ? raw.slice(0, 10) : raw;
  try {
    const parsed = new Date(`${baseDate}T00:00:00+07:00`);
    if (Number.isNaN(parsed.getTime())) return raw;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      ...(withWeekday ? { weekday: 'short' } : {}),
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  } catch {
    return raw;
  }
}
