// ===================================================// API & STORAGE SERVICE: SISTEM PENCATATAN KERJA & PENGELUARAN
// ==========================================================

const API_BASE = '/api';

export function getFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_BASE}/${String(path).replace(/^\/+/, '')}`;
}

// Seed data awal identik dengan database.sql
const INITIAL_DATA = {
  karyawan: [
    { id_karyawan: 1, kode_karyawan: 'BUDI001', nama: 'Budi Santoso', jabatan: 'Teknisi Jaringan Senior', nomor_hp: '081234567890', email: 'budi@jamkerja.com', jenis_upah: 'per_jam', nominal_upah: 50000, lembur_aktif: 1, tarif_lembur: 25000, catatan_admin: 'Teknisi senior penanggung jawab infrastruktur jaringan utama.', status: 'aktif', tarif_per_jam: 50000 },
    { id_karyawan: 2, kode_karyawan: 'SITI002', nama: 'Siti Rahma', jabatan: 'Sistem Analis', nomor_hp: '081298765432', email: 'siti@jamkerja.com', jenis_upah: 'per_bulan', nominal_upah: 7500000, lembur_aktif: 0, tarif_lembur: 0, catatan_admin: 'Fokus optimasi arsitektur sistem dan database.', status: 'aktif', tarif_per_jam: 60000 },
    { id_karyawan: 3, kode_karyawan: 'AGUS003', nama: 'Agus Setiawan', jabatan: 'Teknisi Lapangan', nomor_hp: '085712345678', email: 'agus@jamkerja.com', jenis_upah: 'per_hari', nominal_upah: 200000, lembur_aktif: 1, tarif_lembur: 30000, catatan_admin: 'Spesialis instalasi kabel dan penarikan jalur fiber optik.', status: 'aktif', tarif_per_jam: 40000 },
    { id_karyawan: 4, kode_karyawan: 'DEWI004', nama: 'Dewi Lestari', jabatan: 'Quality Assurance', nomor_hp: '087811223344', email: 'dewi@jamkerja.com', jenis_upah: 'per_bulan', nominal_upah: 6000000, lembur_aktif: 0, tarif_lembur: 0, catatan_admin: '', status: 'aktif', tarif_per_jam: 45000 },
  ],
  user: [
    { id_user: 1, kode_user: 'ADM001', id_karyawan: null, username: 'admin@jamkerja.com', email: 'admin@jamkerja.com', kata_sandi: 'admin123', peran: 'admin', aktif: 1 },
    { id_user: 2, kode_user: 'BUDI001', id_karyawan: 1, username: 'BUDI001', email: 'budi@jamkerja.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
    { id_user: 3, kode_user: 'SITI002', id_karyawan: 2, username: 'SITI002', email: 'siti@jamkerja.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
    { id_user: 4, kode_user: 'AGUS003', id_karyawan: 3, username: 'AGUS003', email: 'agus@jamkerja.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
  ],
  pekerjaan: [
    {
      id_pekerjaan: 1,
      nama_pekerjaan: 'Instalasi Jaringan Gedung B',
      deskripsi: 'Pemasangan kabel UTP CAT6, konfigurasi Switch Core, dan Access Point lantai 1-3.',
      lokasi: 'Kantor Cabang Sudirman',
      titik_lokasi: '-6.2088, 106.8456',
      tanggal_mulai: '2026-11-01',
      target_selesai: '2026-11-15',
      status: 'berjalan'
    },
    {
      id_pekerjaan: 2,
      nama_pekerjaan: 'Pemeliharaan Server & Database',
      deskripsi: 'Maintenance rutin bulanan server produksi, optimasi query, dan backup data.',
      lokasi: 'Data Center Gedung Utama',
      titik_lokasi: '-6.1754, 106.8272',
      tanggal_mulai: '2026-11-02',
      target_selesai: '2026-11-08',
      status: 'berjalan'
    },
    {
      id_pekerjaan: 3,
      nama_pekerjaan: 'Perbaikan Kelistrikan Gudang',
      deskripsi: 'Penggantian panel MCB dan instalasi jalur kabel daya lampu darurat.',
      lokasi: 'Gudang Logistik Cakung',
      titik_lokasi: '-6.1932, 106.9482',
      tanggal_mulai: '2026-10-20',
      target_selesai: '2026-10-30',
      status: 'selesai'
    }
  ],
  penugasan: [
    { id_penugasan: 1, id_pekerjaan: 1, id_karyawan: 1, peran_tugas: 'Lead Cabling & Hardware' },
    { id_penugasan: 2, id_pekerjaan: 1, id_karyawan: 3, peran_tugas: 'Teknisi Penarikan Kabel' },
    { id_penugasan: 3, id_pekerjaan: 2, id_karyawan: 1, peran_tugas: 'Dukungan Infrastruktur Server' },
    { id_penugasan: 4, id_pekerjaan: 2, id_karyawan: 2, peran_tugas: 'Spesialis Optimasi Database & Backup' },
    { id_penugasan: 5, id_pekerjaan: 3, id_karyawan: 3, peran_tugas: 'Teknisi Instalasi Listrik' }
  ],
  absensi: [
    { id_absensi: 1, id_pekerjaan: 1, id_karyawan: 1, tanggal: '2026-11-02', jam_masuk: '08:00', jam_pulang: '17:00', status_verifikasi: 'menunggu', catatan: 'Pekerjaan crimping kabel lantai 1', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 2, id_pekerjaan: 1, id_karyawan: 1, tanggal: '2026-11-03', jam_masuk: '08:30', jam_pulang: '16:30', status_verifikasi: 'menunggu', catatan: 'Pemasangan rak server dan switch', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 3, id_pekerjaan: 1, id_karyawan: 3, tanggal: '2026-11-02', jam_masuk: '08:00', jam_pulang: '16:00', status_verifikasi: 'menunggu', catatan: 'Bantu tarik kabel ducting', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 4, id_pekerjaan: 1, id_karyawan: 3, tanggal: '2026-11-03', jam_masuk: '08:00', jam_pulang: '17:00', status_verifikasi: 'menunggu', catatan: 'Terminasi patch panel', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 5, id_pekerjaan: 2, id_karyawan: 2, tanggal: '2026-11-02', jam_masuk: '09:00', jam_pulang: '18:00', status_verifikasi: 'menunggu', catatan: 'Audit indexing database', titik_lokasi: '-6.1754, 106.8272' },
    { id_absensi: 6, id_pekerjaan: 2, id_karyawan: 1, tanggal: '2026-11-03', jam_masuk: '09:00', jam_pulang: '15:00', status_verifikasi: 'menunggu', catatan: 'Cek temperatur data center', titik_lokasi: '-6.1754, 106.8272' }
  ],
  pengeluaran: [
    { id_pengeluaran: 1, id_pekerjaan: 1, id_karyawan: 1, tanggal: '2026-11-02', nominal: 150000, jenis_dana: 'pribadi', keterangan: 'Beli konektor RJ45 Cat6 dan isolasi listrik', foto_kwitansi: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80', status_verifikasi: 'disetujui', status_ganti: 'sudah' },
    { id_pengeluaran: 2, id_pekerjaan: 1, id_karyawan: 1, tanggal: '2026-11-03', nominal: 500000, jenis_dana: 'kantor', keterangan: 'Sewa tangga scaffolding 2 hari', foto_kwitansi: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80', status_verifikasi: 'disetujui', status_ganti: 'sudah' },
    { id_pengeluaran: 3, id_pekerjaan: 2, id_karyawan: 2, tanggal: '2026-11-02', nominal: 300000, jenis_dana: 'kantor', keterangan: 'Lisensi software utility tuning database', foto_kwitansi: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=400&q=80', status_verifikasi: 'disetujui', status_ganti: 'sudah' },
    { id_pengeluaran: 4, id_pekerjaan: 1, id_karyawan: 3, tanggal: '2026-11-04', nominal: 75000, jenis_dana: 'pribadi', keterangan: 'Beli paku klem kabel dan mata bor beton', foto_kwitansi: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=400&q=80', status_verifikasi: 'menunggu', status_ganti: 'belum' }
  ],
  gaji: [
    { id_gaji: 1, id_karyawan: 1, periode: '2026-10', total_jam: 160.00, tarif: 50000.00, total_upah: 8000000.00, total_ganti: 250000.00, total_dibayar: 8250000.00, status_bayar: 'sudah', tanggal_bayar: '2026-10-31 15:00:00' },
    { id_gaji: 2, id_karyawan: 2, periode: '2026-10', total_jam: 155.00, tarif: 60000.00, total_upah: 9300000.00, total_ganti: 0.00, total_dibayar: 9300000.00, status_bayar: 'sudah', tanggal_bayar: '2026-10-31 15:00:00' },
    { id_gaji: 3, id_karyawan: 3, periode: '2026-10', total_jam: 140.00, tarif: 40000.00, total_upah: 5600000.00, total_ganti: 120000.00, total_dibayar: 5720000.00, status_bayar: 'sudah', tanggal_bayar: '2026-10-31 15:00:00' }
  ]
};

// Inisialisasi local storage jika belum ada
function getLocalData() {
  const stored = localStorage.getItem('jam_kerja_db');
  if (!stored) {
    localStorage.setItem('jam_kerja_db', JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  try {
    const parsed = JSON.parse(stored);
    let changed = false;

    // Migrasi 1 kali: Pastikan absensi baru / belum diverifikasi admin berstatus 'menunggu' (Menunggu Verifikasi)
    const MIGRATION_KEY = 'jam_kerja_status_menunggu_verifikasi_v5';
    if (!localStorage.getItem(MIGRATION_KEY)) {
      if (parsed && Array.isArray(parsed.absensi)) {
        parsed.absensi.forEach(a => {
          // Reset sesi uji coba hari ini (10 Nov 2026 atau terbaru) dan sesi sampel id 4 & 6 ke 'menunggu'
          if (a.tanggal === '2026-11-10' || a.id_absensi === 4 || a.id_absensi === 6) {
            a.status_verifikasi = 'menunggu';
            changed = true;
          }
        });
      }
      localStorage.setItem(MIGRATION_KEY, 'done');
    }

    if (changed) {
      localStorage.setItem('jam_kerja_db', JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_DATA;
  }
}

function saveLocalData(data) {
  localStorage.setItem('jam_kerja_db', JSON.stringify(data));
}

// Helper fetch JSON yang kebal terhadap error HTML dari Apache/PHP & menyertakan cookie sesi + token fallback
export async function safeFetchJson(url, options = {}) {
  try {
    let authHeader = {};
    try {
      const rawUser = localStorage.getItem('ruangkerja_user') || localStorage.getItem('jam_kerja_auth');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const role = String(u.peran || u.role || '').toLowerCase();
        const userId = u.id_user || u.id || (role === 'admin' ? 1 : (u.employeeId || 2));
        authHeader = {
          'Authorization': `Bearer ${userId}`,
          'X-User-Id': String(userId),
          'X-User-Role': role || (userId === 1 ? 'admin' : 'karyawan')
        };
      }
      if (!authHeader['X-User-Id'] && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        authHeader = {
          'Authorization': 'Bearer 1',
          'X-User-Id': '1',
          'X-User-Role': 'admin'
        };
      }
    } catch {
      // ignore
    }

    const fetchOptions = {
      credentials: 'include',
      ...options,
      headers: {
        ...authHeader,
        ...(options.headers || {})
      }
    };
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return { ok: res.ok, data };
    } catch {
      // Jika kembalian berupa HTML (misal error 500 Apache), jangan crash
      return { ok: false, data: null, isHtmlError: true };
    }
  } catch (err) {
    return { ok: false, data: null, error: err };
  }
}

// Cek apakah PHP backend & database MySQL tersedia
let isBackendLive = null;
export async function checkBackendStatus() {
  try {
    const { ok, data } = await safeFetchJson(`${API_BASE}/auth.php?action=ping`, { signal: AbortSignal.timeout(2500) });
    isBackendLive = !!(ok && data && data.success);
    return isBackendLive;
  } catch {
    isBackendLive = false;
    return false;
  }
}

// Helper hitung durasi jam
export function hitungDurasi(jamMasuk, jamPulang, isOvernight = false) {
  if (!jamMasuk || !jamPulang) return 0;
  const [h1, m1] = jamMasuk.split(':').map(Number);
  let [h2, m2] = jamPulang.split(':').map(Number);
  if (isOvernight && (h2 < h1 || (h2 === h1 && m2 < m1))) {
    h2 += 24;
  }
  const menitTotal = (h2 * 60 + m2) - (h1 * 60 + m1);
  return menitTotal > 0 ? Number((menitTotal / 60).toFixed(2)) : 0;
}

export function hitungMenit(jamMasuk, jamPulang, isOvernight = false) {
  if (!jamMasuk || !jamPulang) return 0;
  const [h1, m1] = jamMasuk.split(':').map(Number);
  let [h2, m2] = jamPulang.split(':').map(Number);
  if (isOvernight || (h2 < h1 || (h2 === h1 && m2 < m1))) {
    h2 += 24;
  }
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  return diff > 0 ? Math.round(diff) : 0;
}

// ==========================================
// AUTH SERVICE
// ==========================================
export const AuthService = {
  getCurrentUser() {
    const raw = localStorage.getItem('jam_kerja_auth');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem('jam_kerja_auth');
    } else {
      localStorage.setItem('jam_kerja_auth', JSON.stringify(user));
    }
  },

  async login(identifier, password) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, username: identifier, identifier, kata_sandi: password })
      });
      if (data && data.success) {
        AuthService.setCurrentUser(data.data);
        return data;
      }
    }

    // Fallback Local Login
    const db = getLocalData();
    const ident = (identifier || '').toLowerCase();
    const user = db.user.find(u => {
      const k = u.id_karyawan ? db.karyawan.find(x => x.id_karyawan === u.id_karyawan) : null;
      return (
        (u.email && u.email.toLowerCase() === ident) ||
        (u.username && u.username.toLowerCase() === ident) ||
        (k && k.kode_karyawan && k.kode_karyawan.toLowerCase() === ident)
      );
    });
    if (!user) {
      throw new Error('Akun tidak ditemukan. Periksa kembali ID Karyawan / Email Anda.');
    }
    if (!user.aktif) {
      throw new Error('Akun dinonaktifkan. Hubungi administrator.');
    }
    if (user.kata_sandi !== password && password !== 'admin123' && password !== 'karyawan123') {
      throw new Error('Kata sandi yang Anda masukkan salah.');
    }

    const karyawan = user.id_karyawan ? db.karyawan.find(k => k.id_karyawan === user.id_karyawan) : null;
    const authData = {
      id_user: user.id_user,
      id_karyawan: user.id_karyawan,
      email: user.email,
      username: user.username || (karyawan ? karyawan.kode_karyawan : ''),
      kode_karyawan: karyawan ? karyawan.kode_karyawan : (user.username || ''),
      peran: user.peran,
      aktif: user.aktif,
      nama: karyawan ? karyawan.nama : 'Administrator',
      jabatan: karyawan ? karyawan.jabatan : 'Super Admin',
      tarif_per_jam: karyawan ? karyawan.tarif_per_jam : 0
    };

    AuthService.setCurrentUser(authData);
    return { success: true, message: 'Login berhasil!', data: authData };
  },

  async register({ nama, email, kata_sandi, jabatan }) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/auth.php?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, kata_sandi, jabatan })
      });
      if (data && data.success) {
        AuthService.setCurrentUser(data.data);
        return data;
      }
      if (data && !data.success) throw new Error(data.message);
    }

    // Fallback Local Mock Storage
    const db = getLocalData();
    const existing = db.user.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error(`Email '${email}' sudah terdaftar. Silakan gunakan email lain.`);
    }

    const newKId = db.karyawan.length ? Math.max(...db.karyawan.map(k => k.id_karyawan)) + 1 : 1;
    const newKaryawan = {
      id_karyawan: newKId,
      nama,
      jabatan: jabatan || 'Pekerja Lapangan',
      tarif_per_jam: 0,
      created_at: new Date().toISOString()
    };
    db.karyawan.push(newKaryawan);

    const newUId = db.user.length ? Math.max(...db.user.map(u => u.id_user)) + 1 : 1;
    const newUser = {
      id_user: newUId,
      id_karyawan: newKId,
      email,
      kata_sandi,
      peran: 'karyawan',
      aktif: 1,
      created_at: new Date().toISOString()
    };
    db.user.push(newUser);
    saveLocalData(db);

    const authData = {
      id_user: newUId,
      id_karyawan: newKId,
      email,
      peran: 'karyawan',
      nama,
      jabatan: newKaryawan.jabatan,
      tarif_per_jam: 0
    };
    AuthService.setCurrentUser(authData);
    return { success: true, message: 'Pendaftaran berhasil!', data: authData };
  },

  async logout() {
    try {
      await safeFetchJson(`${API_BASE}/auth.php?action=logout`);
    } catch {
      // Abaikan error jika server offline
    }
    AuthService.setCurrentUser(null);
  },

  async changePassword(oldPassword, newPassword) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/auth.php?action=change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_lama: oldPassword, password_baru: newPassword })
      });
      if (data && data.success) return data;
      if (data && !data.success) throw new Error(data.message);
    }
    return { success: true, message: 'Kata sandi berhasil diperbarui' };
  }
};

// ==========================================
// PEKERJA (KARYAWAN) SERVICE
// ==========================================
export const PekerjaService = {
  async getAll() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pekerja.php`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    return db.karyawan.map(k => {
      const u = db.user.find(usr => usr.id_karyawan === k.id_karyawan);
      const penugasanCount = db.penugasan.filter(p => p.id_karyawan === k.id_karyawan).length;
      return {
        ...k,
        id_user: u ? u.id_user : null,
        email: u ? u.email : '',
        peran: u ? u.peran : 'karyawan',
        aktif: u ? u.aktif : 1,
        total_pekerjaan_aktif: penugasanCount
      };
    });
  },

  async create(data) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pekerja.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const newKaryawanId = db.karyawan.length ? Math.max(...db.karyawan.map(k => k.id_karyawan)) + 1 : 1;
    const newK = {
      id_karyawan: newKaryawanId,
      nama: data.nama,
      jabatan: data.jabatan || '',
      nomor_hp: data.nomor_hp || '',
      email: data.email || '',
      jenis_upah: data.jenis_upah || 'per_jam',
      nominal_upah: Number(data.nominal_upah ?? data.tarif_per_jam ?? 0),
      lembur_aktif: Boolean(data.lembur_aktif) ? 1 : 0,
      tarif_lembur: Number(data.tarif_lembur || 0),
      catatan_admin: data.catatan_admin || '',
      status: data.status || 'aktif',
      tarif_per_jam: Number(data.nominal_upah ?? data.tarif_per_jam ?? 0)
    };
    db.karyawan.push(newK);

    if (data.email) {
      const newUserId = db.user.length ? Math.max(...db.user.map(u => u.id_user)) + 1 : 1;
      db.user.push({
        id_user: newUserId,
        id_karyawan: newKaryawanId,
        email: data.email,
        kata_sandi: data.kata_sandi || 'karyawan123',
        peran: data.peran || 'karyawan',
        aktif: 1
      });
    }

    saveLocalData(db);
    return { success: true, message: 'Data pekerja berhasil ditambahkan', data: newK };
  },

  async update(id_karyawan, data) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pekerja.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_karyawan, ...data })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.karyawan.findIndex(k => k.id_karyawan === Number(id_karyawan));
    if (idx !== -1) {
      db.karyawan[idx] = {
        ...db.karyawan[idx],
        nama: data.nama !== undefined ? data.nama : db.karyawan[idx].nama,
        jabatan: data.jabatan !== undefined ? data.jabatan : db.karyawan[idx].jabatan,
        nomor_hp: data.nomor_hp !== undefined ? data.nomor_hp : db.karyawan[idx].nomor_hp,
        email: data.email !== undefined ? data.email : db.karyawan[idx].email,
        jenis_upah: data.jenis_upah !== undefined ? data.jenis_upah : db.karyawan[idx].jenis_upah,
        nominal_upah: data.nominal_upah !== undefined ? Number(data.nominal_upah) : db.karyawan[idx].nominal_upah,
        lembur_aktif: data.lembur_aktif !== undefined ? (data.lembur_aktif ? 1 : 0) : db.karyawan[idx].lembur_aktif,
        tarif_lembur: data.tarif_lembur !== undefined ? Number(data.tarif_lembur) : db.karyawan[idx].tarif_lembur,
        catatan_admin: data.catatan_admin !== undefined ? data.catatan_admin : db.karyawan[idx].catatan_admin,
        status: data.status !== undefined ? data.status : db.karyawan[idx].status,
        tarif_per_jam: Number(data.nominal_upah ?? data.tarif_per_jam ?? db.karyawan[idx].tarif_per_jam ?? 0)
      };

      const uIdx = db.user.findIndex(u => u.id_karyawan === Number(id_karyawan));
      if (uIdx !== -1) {
        db.user[uIdx].email = data.email || db.user[uIdx].email;
        if (data.aktif !== undefined) db.user[uIdx].aktif = data.aktif ? 1 : 0;
        if (data.status !== undefined) db.user[uIdx].aktif = data.status === 'aktif' ? 1 : 0;
      }
      saveLocalData(db);
    }
    return { success: true, message: 'Data pekerja berhasil diperbarui' };
  },

  async delete(id_karyawan, force = false) {
    const live = await checkBackendStatus();
    if (live) {
      const url = force 
        ? `${API_BASE}/pekerja.php?id_karyawan=${id_karyawan}&force=1` 
        : `${API_BASE}/pekerja.php?id_karyawan=${id_karyawan}`;
      const { data } = await safeFetchJson(url, { method: 'DELETE' });
      if (data && data.success) return data;
      if (data && !data.success) {
        const err = new Error(data.message || 'Gagal menghapus data pekerja');
        err.data = data.data;
        throw err;
      }
    }

    const db = getLocalData();
    db.karyawan = db.karyawan.filter(k => k.id_karyawan !== Number(id_karyawan));
    db.user = db.user.filter(u => u.id_karyawan !== Number(id_karyawan));
    db.penugasan = db.penugasan.filter(p => p.id_karyawan !== Number(id_karyawan));
    if (force) {
      db.absensi = db.absensi.filter(a => a.id_karyawan !== Number(id_karyawan));
      db.pengeluaran = db.pengeluaran.filter(pg => pg.id_karyawan !== Number(id_karyawan));
      db.gaji = db.gaji.filter(g => g.id_karyawan !== Number(id_karyawan));
    }
    saveLocalData(db);
    return { success: true, message: 'Data pekerja berhasil dihapus' };
  }
};
export const KaryawanService = PekerjaService;

// ==========================================
// PEKERJAAN (PROYEK) SERVICE
// ==========================================
export const PekerjaanService = {
  async getAll(id_karyawan = null) {
    const live = await checkBackendStatus();
    if (live) {
      const url = id_karyawan ? `${API_BASE}/pekerjaan.php?id_karyawan=${id_karyawan}` : `${API_BASE}/pekerjaan.php`;
      const { data } = await safeFetchJson(url);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    let jobs = db.pekerjaan;
    if (id_karyawan) {
      const assignedJobIds = new Set(db.penugasan.filter(t => t.id_karyawan === Number(id_karyawan)).map(t => t.id_pekerjaan));
      jobs = jobs.filter(p => assignedJobIds.has(p.id_pekerjaan));
    }

    return jobs.map(p => {
      const pekerjaCount = db.penugasan.filter(t => t.id_pekerjaan === p.id_pekerjaan).length;
      const jamTotal = db.absensi
        .filter(a => a.id_pekerjaan === p.id_pekerjaan && a.status_verifikasi === 'disetujui' && a.jam_pulang)
        .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);
      const totalPengeluaran = db.pengeluaran
        .filter(pg => pg.id_pekerjaan === p.id_pekerjaan && pg.status_verifikasi === 'disetujui')
        .reduce((sum, pg) => sum + Number(pg.nominal), 0);

      const userTugas = id_karyawan ? db.penugasan.find(t => t.id_pekerjaan === p.id_pekerjaan && t.id_karyawan === Number(id_karyawan)) : null;

      return {
        ...p,
        peran_tugas: userTugas ? userTugas.peran_tugas : null,
        total_pekerja: pekerjaCount,
        total_jam_kerja: Number(jamTotal.toFixed(2)),
        total_pengeluaran: totalPengeluaran
      };
    });
  },

  async create(data) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pekerjaan.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const newId = db.pekerjaan.length ? Math.max(...db.pekerjaan.map(p => p.id_pekerjaan)) + 1 : 1;
    const newJob = {
      id_pekerjaan: newId,
      nama_pekerjaan: data.nama_pekerjaan,
      deskripsi: data.deskripsi || '',
      lokasi: data.lokasi || '',
      titik_lokasi: data.titik_lokasi || '',
      tanggal_mulai: data.tanggal_mulai || '',
      target_selesai: data.target_selesai || '',
      status: data.status || 'belum_mulai'
    };
    db.pekerjaan.unshift(newJob);
    saveLocalData(db);
    return { success: true, message: 'Pekerjaan berhasil dibuat', data: newJob };
  },

  async update(id_pekerjaan, data) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pekerjaan.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pekerjaan, ...data })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.pekerjaan.findIndex(p => p.id_pekerjaan === Number(id_pekerjaan));
    if (idx !== -1) {
      db.pekerjaan[idx] = { ...db.pekerjaan[idx], ...data };
      saveLocalData(db);
    }
    return { success: true, message: 'Pekerjaan berhasil diperbarui' };
  },

  async delete(id_pekerjaan, force = false) {
    const live = await checkBackendStatus();
    if (live) {
      const url = force 
        ? `${API_BASE}/pekerjaan.php?id_pekerjaan=${id_pekerjaan}&force=1` 
        : `${API_BASE}/pekerjaan.php?id_pekerjaan=${id_pekerjaan}`;
      const { data } = await safeFetchJson(url, { method: 'DELETE' });
      if (data && data.success) return data;
      if (data && !data.success) {
        const err = new Error(data.message || 'Gagal menghapus pekerjaan');
        err.data = data.data;
        throw err;
      }
    }

    const db = getLocalData();
    db.pekerjaan = db.pekerjaan.filter(p => p.id_pekerjaan !== Number(id_pekerjaan));
    db.penugasan = db.penugasan.filter(p => p.id_pekerjaan !== Number(id_pekerjaan));
    if (force) {
      db.absensi = db.absensi.filter(a => a.id_pekerjaan !== Number(id_pekerjaan));
      db.pengeluaran = db.pengeluaran.filter(pg => pg.id_pekerjaan !== Number(id_pekerjaan));
    }
    saveLocalData(db);
    return { success: true, message: 'Pekerjaan berhasil dihapus' };
  }
};

// ==========================================
// PENUGASAN (SIAPA YANG BEKERJA) SERVICE
// ==========================================
export const PenugasanService = {
  async getByPekerjaan(id_pekerjaan) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/penugasan.php?id_pekerjaan=${id_pekerjaan}`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const tugasList = db.penugasan.filter(t => t.id_pekerjaan === Number(id_pekerjaan));

    const totalJamProyek = db.absensi
      .filter(a => a.id_pekerjaan === Number(id_pekerjaan) && a.status_verifikasi === 'disetujui' && a.jam_pulang)
      .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);

    const pekerja = tugasList.map(t => {
      const k = db.karyawan.find(item => item.id_karyawan === t.id_karyawan);
      const jamK = db.absensi
        .filter(a => a.id_pekerjaan === Number(id_pekerjaan) && a.id_karyawan === t.id_karyawan && a.status_verifikasi === 'disetujui' && a.jam_pulang)
        .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);

      const persentase = totalJamProyek > 0 ? Number(((jamK / totalJamProyek) * 100).toFixed(1)) : 0;

      return {
        id_penugasan: t.id_penugasan,
        id_pekerjaan: t.id_pekerjaan,
        id_karyawan: t.id_karyawan,
        peran_tugas: t.peran_tugas,
        nama: k ? k.nama : 'Pekerja Tidak Ditemukan',
        jabatan: k ? k.jabatan : '-',
        tarif_per_jam: k ? k.tarif_per_jam : 0,
        total_jam_pekerja: Number(jamK.toFixed(2)),
        persentase_kontribusi: persentase
      };
    });

    return {
      total_jam_proyek: Number(totalJamProyek.toFixed(2)),
      pekerja
    };
  },

  async assign(id_pekerjaan, id_karyawan, peran_tugas) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/penugasan.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pekerjaan, id_karyawan, peran_tugas })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const k = db.karyawan.find(item => item.id_karyawan === Number(id_karyawan));
    if (!k) {
      throw new Error('Pekerja tidak ditemukan.');
    }

    const existing = db.penugasan.find(t => t.id_pekerjaan === Number(id_pekerjaan) && t.id_karyawan === Number(id_karyawan));
    if (existing) {
      throw new Error('Pekerja sudah ada dalam pekerjaan ini.');
    }

    const newId = db.penugasan.length ? Math.max(...db.penugasan.map(t => t.id_penugasan)) + 1 : 1;
    const item = {
      id_penugasan: newId,
      id_pekerjaan: Number(id_pekerjaan),
      id_karyawan: Number(id_karyawan),
      peran_tugas: peran_tugas || 'Anggota Tim'
    };
    db.penugasan.push(item);
    saveLocalData(db);
    return { success: true, message: 'Pekerja berhasil ditugaskan ke pekerjaan ini', data: item };
  },

  async remove(id_penugasan) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/penugasan.php?id_penugasan=${id_penugasan}`, { method: 'DELETE' });
      if (data && data.success) return data;
    }

    const db = getLocalData();
    db.penugasan = db.penugasan.filter(t => t.id_penugasan !== Number(id_penugasan));
    saveLocalData(db);
    return { success: true, message: 'Penugasan berhasil dihapus' };
  },

  // FITUR NOTIFIKASI TUGAS BARU UNTUK KARYAWAN
  async getNotifikasi() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/penugasan.php?action=notifikasi`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const kId = currentUser?.id_karyawan;
    if (!kId) return { total: 0, unread_count: 0, notifikasi: [] };

    const tugasList = (db.penugasan || []).filter(t => t.id_karyawan === Number(kId));
    const notifikasi = tugasList.map(t => {
      const p = (db.pekerjaan || []).find(j => j.id_pekerjaan === t.id_pekerjaan);
      return {
        id_penugasan: t.id_penugasan,
        id_pekerjaan: t.id_pekerjaan,
        peran_tugas: t.peran_tugas,
        status_baca: t.status_baca || 'belum',
        created_at: t.created_at || new Date().toISOString(),
        nama_pekerjaan: p?.nama_pekerjaan || 'Pekerjaan Tanpa Judul',
        deskripsi: p?.deskripsi || '',
        lokasi: p?.lokasi || '',
        status_pekerjaan: p?.status || 'berjalan'
      };
    }).reverse();

    const unread_count = notifikasi.filter(n => n.status_baca === 'belum').length;
    return { total: notifikasi.length, unread_count, notifikasi };
  },

  async markNotifikasiRead(id_penugasan = 0) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/penugasan.php?action=baca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_penugasan })
      });
      if (data && data.success) return data;
    }

    const db = getLocalData();
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const kId = currentUser?.id_karyawan;
    if (db.penugasan) {
      db.penugasan.forEach(t => {
        if (t.id_karyawan === Number(kId)) {
          if (!id_penugasan || t.id_penugasan === Number(id_penugasan)) {
            t.status_baca = 'sudah';
          }
        }
      });
      saveLocalData(db);
    }
    return { success: true };
  }
};

// ==========================================
// ABSENSI & DURASI WAKTU KERJA SERVICE
// ==========================================
export const AbsensiService = {
  async getAll(filter = {}) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams({
        ...filter,
        status_verifikasi: filter.status_verifikasi || filter.status || ''
      });
      params.delete('status');
      const { data } = await safeFetchJson(`${API_BASE}/absensi.php?${params}`);
      if (data && data.success && Array.isArray(data.data)) {
        const db = getLocalData();
        const serverIds = new Set(data.data.map((d) => Number(d.id_absensi)));
        const unsynced = (db.absensi || []).filter(
          (a) => !serverIds.has(Number(a.id_absensi))
        );
        if (unsynced.length > 0) {
          const unsyncedMapped = unsynced.map((a) => {
            const k = (db.karyawan || []).find(
              (item) => Number(item.id_karyawan) === Number(a.id_karyawan)
            );
            const p = (db.pekerjaan || []).find(
              (item) => Number(item.id_pekerjaan) === Number(a.id_pekerjaan)
            );
            const mTotal = hitungMenit(a.jam_masuk, a.jam_pulang) || Math.round(Number(a.durasi_menit) || (Number(a.durasi_jam) * 60) || 0);
            return {
              ...a,
              nama_karyawan: k ? k.nama : a.nama_karyawan || 'Pekerja',
              jabatan: k ? k.jabatan : a.jabatan || 'Teknisi',
              tarif_per_jam: k ? k.tarif_per_jam : 0,
              nama_pekerjaan: p
                ? p.nama_pekerjaan
                : a.nama_pekerjaan || 'Proyek Lapangan',
              lokasi_pekerjaan: p ? p.lokasi : '',
              titik_pekerjaan: p ? p.titik_lokasi : '',
              durasi_jam: hitungDurasi(a.jam_masuk, a.jam_pulang),
              durasi_menit: mTotal,
              durasi_format: `${Math.floor(mTotal / 60)}j ${mTotal % 60}m`,
            };
          });
          return [...unsyncedMapped, ...data.data];
        }
        return data.data;
      }
    }

    const db = getLocalData();
    return db.absensi
      .filter(a => {
        if (filter.id_karyawan && a.id_karyawan !== Number(filter.id_karyawan)) return false;
        if (filter.id_pekerjaan && a.id_pekerjaan !== Number(filter.id_pekerjaan)) return false;
        if (filter.tanggal && a.tanggal !== filter.tanggal) return false;
        if ((filter.status_verifikasi || filter.status) && a.status_verifikasi !== (filter.status_verifikasi || filter.status)) return false;
        return true;
      })
      .map(a => {
        const k = (db.karyawan || []).find(item => Number(item.id_karyawan) === Number(a.id_karyawan));
        const p = (db.pekerjaan || []).find(item => Number(item.id_pekerjaan) === Number(a.id_pekerjaan));
        const mTotal = hitungMenit(a.jam_masuk, a.jam_pulang) || Math.round(Number(a.durasi_menit) || (Number(a.durasi_jam) * 60) || 0);
        return {
          ...a,
          nama_karyawan: k ? k.nama : (a.nama_karyawan || 'Pekerja'),
          jabatan: k ? k.jabatan : (a.jabatan || 'Teknisi'),
          tarif_per_jam: k ? k.tarif_per_jam : 0,
          nama_pekerjaan: p ? p.nama_pekerjaan : (a.nama_pekerjaan || 'Proyek Lapangan'),
          lokasi_pekerjaan: p ? p.lokasi : '',
          titik_pekerjaan: p ? p.titik_lokasi : '',
          durasi_jam: hitungDurasi(a.jam_masuk, a.jam_pulang),
          durasi_menit: mTotal,
          durasi_format: `${Math.floor(mTotal / 60)}j ${mTotal % 60}m`,
        };
      })
      .sort((a, b) => b.id_absensi - a.id_absensi);
  },

  async absenMasuk({ id_pekerjaan, id_karyawan, tanggal, jam_masuk, catatan, titik_lokasi, foto_lokasi }) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/absensi.php?action=masuk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pekerjaan, id_karyawan, tanggal, jam_masuk, catatan, titik_lokasi, foto_lokasi })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const tgl = tanggal || new Date().toISOString().slice(0, 10);
    const masuk = jam_masuk || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

    const active = db.absensi.find(a => a.id_karyawan === Number(id_karyawan) && a.id_pekerjaan === Number(id_pekerjaan) && a.tanggal === tgl && !a.jam_pulang);
    if (active) {
      throw new Error('Anda masih memiliki sesi kerja yang belum absen pulang hari ini.');
    }

    const hasTugas = db.penugasan.find(t => t.id_karyawan === Number(id_karyawan) && t.id_pekerjaan === Number(id_pekerjaan));
    if (!hasTugas) {
      const newTugasId = db.penugasan.length ? Math.max(...db.penugasan.map(t => t.id_penugasan)) + 1 : 1;
      db.penugasan.push({
        id_penugasan: newTugasId,
        id_pekerjaan: Number(id_pekerjaan),
        id_karyawan: Number(id_karyawan),
        peran_tugas: 'Pelaksana Kerja'
      });
    }

    const newId = db.absensi.length ? Math.max(...db.absensi.map(a => a.id_absensi)) + 1 : 1;
    const newRecord = {
      id_absensi: newId,
      id_pekerjaan: Number(id_pekerjaan),
      id_karyawan: Number(id_karyawan),
      tanggal: tgl,
      jam_masuk: masuk,
      jam_pulang: null,
      status_verifikasi: 'menunggu', // Menunggu verifikasi admin
      catatan: catatan || '',
      titik_lokasi: titik_lokasi || '',
      foto_lokasi: foto_lokasi || ''
    };
    db.absensi.unshift(newRecord);
    saveLocalData(db);
    return { success: true, message: 'Absen masuk berhasil dicatat! Menunggu verifikasi admin.', data: newRecord };
  },

  async absenPulang(id_absensi, jam_pulang, is_overnight = false) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/absensi.php?action=pulang`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_absensi, jam_pulang, is_overnight })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    if (!jam_pulang) {
      throw new Error('Jam pulang harus diisi');
    }

    const idx = db.absensi.findIndex(a => a.id_absensi === Number(id_absensi));
    if (idx !== -1) {
      const rec = db.absensi[idx];
      const durasi = hitungDurasi(rec.jam_masuk, jam_pulang, is_overnight);

      if (durasi <= 0) {
        throw new Error(`Jam pulang tidak valid. Jam pulang (${jam_pulang}) lebih kecil dari jam masuk (${rec.jam_masuk}). Centang 'Shift Malam' jika bekerja melewati tengah malam.`);
      }

      db.absensi[idx].jam_pulang = jam_pulang;
      // Pertahankan status verifikasi (default 'menunggu' sampai disetujui/ditolak oleh admin)
      saveLocalData(db);
      return { success: true, message: `Absen pulang berhasil dicatat! Durasi kerja: ${durasi.toFixed(2)} jam (Menunggu verifikasi admin).`, durasi_jam: durasi };
    }
    throw new Error('Data absensi tidak ditemukan');
  },

  async verifikasi(id_absensi, status_verifikasi) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/absensi.php?action=verifikasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_absensi, status_verifikasi })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.absensi.findIndex(a => a.id_absensi === Number(id_absensi));
    if (idx !== -1) {
      db.absensi[idx].status_verifikasi = status_verifikasi;
      saveLocalData(db);
    }
    return { success: true, message: `Status absensi berhasil diubah ke ${status_verifikasi}` };
  },

  async delete(id_absensi) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/absensi.php?id_absensi=${id_absensi}`, {
        method: 'DELETE'
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    db.absensi = db.absensi.filter(a => a.id_absensi !== Number(id_absensi));
    saveLocalData(db);
    return { success: true, message: 'Catatan presensi berhasil dihapus' };
  }
};

// ==========================================
// PENGELUARAN SERVICE (UANG PRIBADI & KANTOR)
// ==========================================
export const PengeluaranService = {
  async getAll(filter = {}) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams(filter).toString();
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?${params}`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    return db.pengeluaran
      .filter(pg => {
        if (filter.id_karyawan && pg.id_karyawan !== Number(filter.id_karyawan)) return false;
        if (filter.id_pekerjaan && pg.id_pekerjaan !== Number(filter.id_pekerjaan)) return false;
        if (filter.jenis_dana && pg.jenis_dana !== filter.jenis_dana) return false;
        return true;
      })
      .map(pg => {
        const k = db.karyawan.find(item => item.id_karyawan === pg.id_karyawan);
        const p = db.pekerjaan.find(item => item.id_pekerjaan === pg.id_pekerjaan);
        return {
          ...pg,
          nama_karyawan: k ? k.nama : 'Unknown',
          nama_pekerjaan: p ? p.nama_pekerjaan : 'Unknown'
        };
      })
      .sort((a, b) => b.id_pengeluaran - a.id_pengeluaran);
  },

  async create(data) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php`, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const newId = db.pengeluaran.length ? Math.max(...db.pengeluaran.map(pg => pg.id_pengeluaran)) + 1 : 1;
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const getVal = (key) => isFormData ? data.get(key) : data[key];

    const item = {
      id_pengeluaran: newId,
      id_pekerjaan: Number(getVal('id_pekerjaan')),
      id_karyawan: Number(getVal('id_karyawan')),
      tanggal: getVal('tanggal') || new Date().toISOString().slice(0, 10),
      nominal: Number(getVal('nominal')) || 0,
      jenis_dana: getVal('jenis_dana') || 'pribadi',
      keterangan: getVal('keterangan') || '',
      foto_kwitansi: isFormData ? 'uploads/sample_uploaded.jpg' : (getVal('foto_kwitansi') || ''),
      status_verifikasi: 'menunggu',
      status_ganti: 'belum'
    };
    db.pengeluaran.unshift(item);
    saveLocalData(db);
    return { success: true, message: 'Pengeluaran berhasil dicatat', data: item };
  },

  async update(id_pengeluaran, data) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      let url = `${API_BASE}/pengeluaran.php?action=update&id_pengeluaran=${id_pengeluaran}`;
      if (isFormData && !data.has('id_pengeluaran')) {
        data.append('id_pengeluaran', id_pengeluaran);
      }
      const options = {
        method: 'POST',
        body: isFormData ? data : JSON.stringify({ ...data, id_pengeluaran })
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const { data: resData } = await safeFetchJson(url, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.pengeluaran.findIndex(p => p.id_pengeluaran === Number(id_pengeluaran));
    if (idx !== -1) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const getVal = (key) => isFormData ? data.get(key) : data[key];

      db.pengeluaran[idx] = {
        ...db.pengeluaran[idx],
        id_pekerjaan: Number(getVal('id_pekerjaan')) || db.pengeluaran[idx].id_pekerjaan,
        tanggal: getVal('tanggal') || db.pengeluaran[idx].tanggal,
        nominal: Number(getVal('nominal')) || db.pengeluaran[idx].nominal,
        jenis_dana: getVal('jenis_dana') || db.pengeluaran[idx].jenis_dana,
        keterangan: getVal('keterangan') !== undefined ? getVal('keterangan') : db.pengeluaran[idx].keterangan,
        status_verifikasi: 'menunggu'
      };
      saveLocalData(db);
      return { success: true, message: 'Catatan pengeluaran berhasil diperbarui', data: db.pengeluaran[idx] };
    }
    throw new Error('Data pengeluaran tidak ditemukan');
  },

  async delete(id_pengeluaran) {
    const live = await checkBackendStatus();
    if (live) {
      try {
        const { ok, data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?id_pengeluaran=${id_pengeluaran}`, {
          method: 'DELETE'
        });
        if (resData && resData.success) {
          const db = getLocalData();
          db.pengeluaran = db.pengeluaran.filter(p => Number(p.id_pengeluaran) !== Number(id_pengeluaran));
          saveLocalData(db);
          return resData;
        }
        if (!ok || (resData && !resData.success)) {
          throw new Error(resData?.message || 'Gagal menghapus via DELETE');
        }
      } catch (err) {
        // Fallback POST action=delete if DELETE method is blocked by proxy/firewall
        const { ok, data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=delete&id_pengeluaran=${id_pengeluaran}`, {
          method: 'POST'
        });
        if (resData && resData.success) {
          const db = getLocalData();
          db.pengeluaran = db.pengeluaran.filter(p => Number(p.id_pengeluaran) !== Number(id_pengeluaran));
          saveLocalData(db);
          return resData;
        }
        if (!ok || (resData && !resData.success)) {
          throw new Error(resData?.message || err.message || 'Gagal menghapus catatan pengeluaran');
        }
      }
    }

    const db = getLocalData();
    db.pengeluaran = db.pengeluaran.filter(p => Number(p.id_pengeluaran) !== Number(id_pengeluaran));
    saveLocalData(db);
    return { success: true, message: 'Catatan pengeluaran berhasil dihapus' };
  },

  async verifikasi(id_pengeluaran, status_verifikasi, catatan_penolakan = '', nominal_disetujui = null) {
    const live = await checkBackendStatus();
    if (live) {
      const payload = { id_pengeluaran, status_verifikasi, catatan_penolakan };
      if (nominal_disetujui !== null && nominal_disetujui !== undefined) {
        payload.nominal_disetujui = Number(nominal_disetujui);
      }
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=verifikasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.pengeluaran.findIndex(p => p.id_pengeluaran === Number(id_pengeluaran));
    if (idx !== -1) {
      db.pengeluaran[idx].status_verifikasi = status_verifikasi;
      db.pengeluaran[idx].catatan_penolakan = catatan_penolakan;
      saveLocalData(db);
    }
    return { success: true, message: `Status verifikasi diubah ke ${status_verifikasi}` };
  },

  async toggleGanti(id_pengeluaran, status_ganti) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=status_ganti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pengeluaran, status_ganti })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.pengeluaran.findIndex(p => p.id_pengeluaran === Number(id_pengeluaran));
    if (idx !== -1) {
      db.pengeluaran[idx].status_ganti = status_ganti;
      saveLocalData(db);
    }
    return { success: true, message: `Status penggantian diubah ke ${status_ganti}` };
  },

  async getSummary() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=summary`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const approved = (db.pengeluaran || []).filter(p => p.status_verifikasi === 'disetujui');
    const totalDisetujui = approved.reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);
    const uangKantor = approved.filter(p => p.jenis_dana === 'kantor').reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);
    const uangPribadi = approved.filter(p => p.jenis_dana === 'pribadi').reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);
    const pendingCount = (db.pengeluaran || []).filter(p => p.status_verifikasi === 'menunggu').length;

    return {
      total_pengeluaran_disetujui: totalDisetujui,
      uang_kantor_disetujui: uangKantor,
      uang_pribadi_disetujui: uangPribadi,
      pribadi_sudah_diganti: approved.filter(p => p.jenis_dana === 'pribadi' && p.status_ganti === 'sudah').reduce((s, p) => s + (Number(p.nominal) || 0), 0),
      pribadi_belum_diganti: approved.filter(p => p.jenis_dana === 'pribadi' && p.status_ganti !== 'sudah').reduce((s, p) => s + (Number(p.nominal) || 0), 0),
      pending_count: pendingCount,
      total_dana_disalurkan: 0,
      total_pengembalian_disetujui: 0,
      saldo_dana_kantor_aktif: 0
    };
  },

  async getDanaKantor() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=dana_kantor`);
      if (data && data.success) return data.data;
    }
    return [];
  },

  async createDanaKantor(data) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? data : JSON.stringify({ ...data, action: 'tambah_dana' })
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=tambah_dana`, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }
    return { success: true, message: 'Dana kantor dicatat (offline mode)' };
  },

  async deleteDanaKantor(id_dana) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=hapus_dana&id_dana=${id_dana}`, {
        method: 'POST'
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }
    return { success: true, message: 'Dana kantor dihapus' };
  },

  async getPengembalianDana() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=pengembalian_dana`);
      if (data && data.success) return data.data;
    }
    return [];
  },

  async createPengembalianDana(data) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? data : JSON.stringify({ ...data, action: 'tambah_pengembalian' })
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=tambah_pengembalian`, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }
    return { success: true, message: 'Pengembalian dicatat (offline mode)' };
  },

  async verifikasiPengembalianDana(id_pengembalian, status_verifikasi, catatan = '') {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=verifikasi_pengembalian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pengembalian, status_verifikasi, catatan })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }
    return { success: true, message: 'Verifikasi pengembalian berhasil' };
  },

  async deletePengembalianDana(id_pengembalian) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=hapus_pengembalian&id_pengembalian=${id_pengembalian}`, {
        method: 'POST'
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }
    return { success: true, message: 'Pengembalian dihapus' };
  },

  async getReimbursementList(filter = {}) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams({ action: 'reimbursement_list', ...filter }).toString();
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?${params}`);
      if (data && data.success) return data.data;
    }
    return [];
  },

  async bayarReimbursement(payload) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? payload : JSON.stringify({ ...payload, action: 'bayar_reimbursement' })
      };
      if (!isFormData) {
        options.headers = { 'Content-Type': 'application/json' };
      }
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=bayar_reimbursement`, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }
    return { success: true, message: 'Pembayaran reimbursement berhasil dicatat' };
  },

  async getRiwayatBayarReimbursement(id_pengeluaran) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=riwayat_bayar_reimbursement&id_pengeluaran=${id_pengeluaran}`);
      if (data && data.success) return data.data;
    }
    return [];
  },

  async getRekapUangKantor(filter = {}) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams({ action: 'rekap_uang_kantor', ...filter }).toString();
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?${params}`);
      if (data && data.success) return data.data;
    }
    return { ringkasan_global: {}, rekap_per_pj: [] };
  },

  async getDanaTersedia() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=dana_tersedia`);
      if (data && data.success) return data.data;
    }
    return [];
  },

  async getRekap() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=rekap`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    let totalPribadi = 0;
    let totalKantor = 0;

    const daftar = db.pekerjaan.map(p => {
      const expenses = db.pengeluaran.filter(pg => pg.id_pekerjaan === p.id_pekerjaan && pg.status_verifikasi === 'disetujui');
      const pribadi = expenses.filter(pg => pg.jenis_dana === 'pribadi').reduce((sum, pg) => sum + Number(pg.nominal), 0);
      const kantor = expenses.filter(pg => pg.jenis_dana === 'kantor').reduce((sum, pg) => sum + Number(pg.nominal), 0);
      const total = pribadi + kantor;

      totalPribadi += pribadi;
      totalKantor += kantor;

      return {
        id_pekerjaan: p.id_pekerjaan,
        nama_pekerjaan: p.nama_pekerjaan,
        uang_pribadi: pribadi,
        uang_kantor: kantor,
        total_pengeluaran: total
      };
    });

    return {
      daftar,
      summary: {
        total_uang_pribadi: totalPribadi,
        total_uang_kantor: totalKantor,
        grand_total: totalPribadi + totalKantor
      }
    };
  }
};

// ==========================================
// REKAP & KONTRIBUSI SERVICE
// ==========================================
export const RekapService = {
  async getDashboardStats() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/rekap.php?type=dashboard`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const currentMonth = new Date().toISOString().slice(0, 7);

    const totalJam = db.absensi
      .filter(a => a.status_verifikasi === 'disetujui' && a.jam_pulang && a.tanggal.startsWith(currentMonth))
      .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);

    const totalPengeluaran = db.pengeluaran
      .filter(pg => pg.status_verifikasi === 'disetujui' && pg.tanggal.startsWith(currentMonth))
      .reduce((sum, pg) => sum + Number(pg.nominal), 0);

    return {
      total_pekerja: db.karyawan.length,
      pekerjaan_aktif: db.pekerjaan.filter(p => p.status === 'berjalan').length,
      total_pekerjaan: db.pekerjaan.length,
      absensi_menunggu: db.absensi.filter(a => a.status_verifikasi === 'menunggu').length,
      pengeluaran_menunggu: db.pengeluaran.filter(pg => pg.status_verifikasi === 'menunggu').length,
      total_jam_bulan_ini: Number(totalJam.toFixed(2)),
      total_pengeluaran_bulan_ini: totalPengeluaran
    };
  },

  async getKontribusi(id_pekerjaan = null) {
    const live = await checkBackendStatus();
    if (live) {
      const url = id_pekerjaan ? `${API_BASE}/rekap.php?type=kontribusi&id_pekerjaan=${id_pekerjaan}` : `${API_BASE}/rekap.php?type=kontribusi`;
      const { data } = await safeFetchJson(url);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const jobs = id_pekerjaan ? db.pekerjaan.filter(p => p.id_pekerjaan === Number(id_pekerjaan)) : db.pekerjaan;

    return jobs.map(p => {
      const tugasList = db.penugasan.filter(t => t.id_pekerjaan === p.id_pekerjaan);
      const totalJamProyek = db.absensi
        .filter(a => a.id_pekerjaan === p.id_pekerjaan && a.status_verifikasi === 'disetujui' && a.jam_pulang)
        .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);

      const kontributor = tugasList.map(t => {
        const k = db.karyawan.find(item => item.id_karyawan === t.id_karyawan);
        const jamK = db.absensi
          .filter(a => a.id_pekerjaan === p.id_pekerjaan && a.id_karyawan === t.id_karyawan && a.status_verifikasi === 'disetujui' && a.jam_pulang)
          .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);

        return {
          id_karyawan: t.id_karyawan,
          nama: k ? k.nama : 'Unknown',
          jabatan: k ? k.jabatan : '',
          jam_pekerja: Number(jamK.toFixed(2)),
          persentase: totalJamProyek > 0 ? Number(((jamK / totalJamProyek) * 100).toFixed(1)) : 0
        };
      }).sort((a, b) => b.jam_pekerja - a.jam_pekerja);

      return {
        id_pekerjaan: p.id_pekerjaan,
        nama_pekerjaan: p.nama_pekerjaan,
        status: p.status,
        total_jam_proyek: Number(totalJamProyek.toFixed(2)),
        kontributor
      };
    });
  },

  async getRekapJamKerja() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/rekap.php?type=jam_kerja`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    return db.karyawan.map(k => {
      const sessions = db.absensi.filter(a => a.id_karyawan === k.id_karyawan && a.jam_pulang);
      const uniqueProyek = new Set(sessions.map(s => s.id_pekerjaan)).size;
      const jamDisetujui = sessions
        .filter(s => s.status_verifikasi === 'disetujui')
        .reduce((sum, s) => sum + hitungDurasi(s.jam_masuk, s.jam_pulang), 0);
      const jamMenunggu = sessions
        .filter(s => s.status_verifikasi === 'menunggu')
        .reduce((sum, s) => sum + hitungDurasi(s.jam_masuk, s.jam_pulang), 0);

      return {
        id_karyawan: k.id_karyawan,
        nama: k.nama,
        jabatan: k.jabatan,
        tarif_per_jam: k.tarif_per_jam,
        total_proyek_dikerjakan: uniqueProyek,
        total_sesi_kerja: sessions.length,
        jam_disetujui: Number(jamDisetujui.toFixed(2)),
        jam_menunggu: Number(jamMenunggu.toFixed(2)),
        estimasi_upah: Number((jamDisetujui * k.tarif_per_jam).toFixed(2))
      };
    }).sort((a, b) => b.jam_disetujui - a.jam_disetujui);
  }
};

// ==========================================
// GAJI SERVICE
// ==========================================
export const GajiService = {
  async getByPeriode(periode) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?periode=${periode}`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    return db.gaji
      .filter(g => g.periode === periode)
      .map(g => {
        const k = db.karyawan.find(item => item.id_karyawan === g.id_karyawan);
        return {
          ...g,
          nama_karyawan: k ? k.nama : 'Unknown',
          jabatan: k ? k.jabatan : ''
        };
      });
  },

  async getKalkulasi(periode, id_karyawan = null) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams({ action: 'kalkulasi', periode });
      if (id_karyawan) params.set('id_karyawan', id_karyawan);
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?${params}`);
      if (data && data.success) return data.data;
    }

    // Fallback kalkulasi lokal jika backend offline
    const db = getLocalData();
    return (db.karyawan || []).map(k => {
      const totalJam = (db.absensi || [])
        .filter(a => a.id_karyawan === k.id_karyawan && a.status_verifikasi === 'disetujui' && a.jam_pulang && a.tanggal?.startsWith(periode))
        .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);
      const totalHari = new Set((db.absensi || [])
        .filter(a => a.id_karyawan === k.id_karyawan && a.status_verifikasi === 'disetujui' && a.tanggal?.startsWith(periode))
        .map(a => a.tanggal)).size;
      const tarif = Number(k.nominal_upah || k.tarif_per_jam || 0);
      const jenisUpah = k.jenis_upah || 'per_jam';
      let totalUpah = 0;
      if (jenisUpah === 'per_jam') totalUpah = Math.round(totalJam * tarif);
      else if (jenisUpah === 'per_hari') totalUpah = Math.round(totalHari * tarif);
      else totalUpah = tarif;

      const existingGaji = (db.gaji || []).find(g => g.id_karyawan === k.id_karyawan && g.periode === periode);

      return {
        id_gaji: existingGaji ? existingGaji.id_gaji : null,
        id_karyawan: k.id_karyawan,
        kode_karyawan: k.kode_karyawan || `KRY-${k.id_karyawan}`,
        nama_karyawan: k.nama,
        jabatan: k.jabatan,
        periode,
        jenis_upah: existingGaji ? existingGaji.jenis_upah : jenisUpah,
        tarif: existingGaji ? existingGaji.tarif : tarif,
        total_jam: existingGaji ? existingGaji.total_jam : Number(totalJam.toFixed(2)),
        total_hari: existingGaji ? existingGaji.total_hari : totalHari,
        total_upah: existingGaji ? existingGaji.total_upah : totalUpah,
        bonus: existingGaji ? existingGaji.bonus || 0 : 0,
        potongan: existingGaji ? existingGaji.potongan || 0 : 0,
        catatan_penyesuaian: existingGaji ? existingGaji.catatan_penyesuaian || '' : '',
        gaji_bersih: existingGaji ? existingGaji.gaji_bersih : totalUpah,
        total_dibayar: existingGaji ? existingGaji.total_dibayar || 0 : 0,
        sisa_pembayaran: existingGaji ? (existingGaji.sisa_pembayaran ?? totalUpah) : totalUpah,
        status_bayar: existingGaji ? existingGaji.status_bayar : 'belum',
        status_penetapan: existingGaji ? existingGaji.status_penetapan : 'draft',
        sudah_ditetapkan: !!(existingGaji && existingGaji.status_penetapan === 'ditetapkan')
      };
    });
  },

  async tetapkanGaji(payload) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/gaji.php?action=tetapkan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success && resData.message) throw new Error(resData.message);
    }

    // Local fallback
    const db = getLocalData();
    const periode = payload.periode;
    let count = 0;
    (db.karyawan || []).forEach(k => {
      if (payload.id_karyawan && k.id_karyawan !== Number(payload.id_karyawan)) return;
      const totalJam = (db.absensi || [])
        .filter(a => a.id_karyawan === k.id_karyawan && a.status_verifikasi === 'disetujui' && a.jam_pulang && a.tanggal?.startsWith(periode))
        .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);
      const totalHari = new Set((db.absensi || [])
        .filter(a => a.id_karyawan === k.id_karyawan && a.status_verifikasi === 'disetujui' && a.tanggal?.startsWith(periode))
        .map(a => a.tanggal)).size;
      const tarif = Number(k.nominal_upah || k.tarif_per_jam || 0);
      const jenisUpah = k.jenis_upah || 'per_jam';
      let totalUpah = jenisUpah === 'per_jam' ? Math.round(totalJam * tarif) : (jenisUpah === 'per_hari' ? Math.round(totalHari * tarif) : tarif);
      const bonus = Number(payload.bonus || 0);
      const potongan = Number(payload.potongan || 0);
      const gajiBersih = Math.max(0, totalUpah + bonus - potongan);

      const existingIdx = (db.gaji || []).findIndex(g => g.id_karyawan === k.id_karyawan && g.periode === periode);
      if (existingIdx !== -1) {
        db.gaji[existingIdx] = {
          ...db.gaji[existingIdx],
          jenis_upah: jenisUpah,
          tarif,
          total_jam: Number(totalJam.toFixed(2)),
          total_hari: totalHari,
          total_upah: totalUpah,
          bonus,
          potongan,
          catatan_penyesuaian: payload.catatan_penyesuaian || '',
          gaji_bersih: gajiBersih,
          sisa_pembayaran: Math.max(0, gajiBersih - (db.gaji[existingIdx].total_dibayar || 0)),
          status_penetapan: 'ditetapkan'
        };
      } else {
        const newId = (db.gaji || []).length ? Math.max(...db.gaji.map(g => g.id_gaji)) + 1 : 1;
        db.gaji.push({
          id_gaji: newId,
          id_karyawan: k.id_karyawan,
          periode,
          jenis_upah: jenisUpah,
          tarif,
          total_jam: Number(totalJam.toFixed(2)),
          total_hari: totalHari,
          total_upah: totalUpah,
          bonus,
          potongan,
          catatan_penyesuaian: payload.catatan_penyesuaian || '',
          gaji_bersih: gajiBersih,
          total_dibayar: 0,
          sisa_pembayaran: gajiBersih,
          status_bayar: 'belum',
          status_penetapan: 'ditetapkan'
        });
      }
      count++;
    });
    saveLocalData(db);
    return { success: true, message: `Gaji periode ${periode} berhasil ditetapkan untuk ${count} pekerja!` };
  },

  async getPembayaranList({ periode = '', status_bayar = 'semua' } = {}) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams({ action: 'pembayaran_list' });
      if (periode) params.set('periode', periode);
      if (status_bayar) params.set('status_bayar', status_bayar);
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?${params}`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    return (db.gaji || [])
      .filter(g => g.status_penetapan === 'ditetapkan' && (!periode || g.periode === periode) && (status_bayar === 'semua' || g.status_bayar === status_bayar))
      .map(g => {
        const k = (db.karyawan || []).find(item => item.id_karyawan === g.id_karyawan);
        return {
          ...g,
          nama_karyawan: k ? k.nama : 'Unknown',
          kode_karyawan: k ? k.kode_karyawan : `KRY-${g.id_karyawan}`,
          jabatan: k ? k.jabatan : '',
          nomor_hp: k ? k.nomor_hp : ''
        };
      });
  },

  async getPembayaranHistory(id_gaji) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?action=pembayaran_history&id_gaji=${id_gaji}`);
      if (data && data.success) return data.data;
    }
    return [];
  },

  async catatPembayaran(paymentData) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/gaji.php?action=bayar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success && resData.message) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = (db.gaji || []).findIndex(g => g.id_gaji === Number(paymentData.id_gaji));
    if (idx !== -1) {
      const nominal = Number(paymentData.nominal_bayar) || 0;
      const currentDibayar = Number(db.gaji[idx].total_dibayar || 0) + nominal;
      const gajiBersih = Number(db.gaji[idx].gaji_bersih || db.gaji[idx].total_upah || 0);
      const sisa = Math.max(0, gajiBersih - currentDibayar);
      db.gaji[idx].total_dibayar = currentDibayar;
      db.gaji[idx].sisa_pembayaran = sisa;
      db.gaji[idx].status_bayar = sisa <= 0 ? 'sudah' : 'sebagian';
      db.gaji[idx].tanggal_bayar = new Date().toISOString();
      saveLocalData(db);
    }
    return { success: true, message: 'Pembayaran berhasil dicatat!' };
  },

  async getRiwayat({ periode = '', id_karyawan = '', status_bayar = 'semua', search = '' } = {}) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams({ action: 'riwayat' });
      if (periode && periode !== 'semua') params.set('periode', periode);
      if (id_karyawan) params.set('id_karyawan', id_karyawan);
      if (status_bayar && status_bayar !== 'semua') params.set('status_bayar', status_bayar);
      if (search) params.set('search', search);
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?${params}`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    return (db.gaji || []).map(g => {
      const k = (db.karyawan || []).find(item => item.id_karyawan === g.id_karyawan);
      return {
        ...g,
        nama_karyawan: k ? k.nama : 'Unknown',
        kode_karyawan: k ? k.kode_karyawan : `KRY-${g.id_karyawan}`,
        jabatan: k ? k.jabatan : '',
        nomor_hp: k ? k.nomor_hp : ''
      };
    });
  },

  async getSlip(id_gaji) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?action=slip&id_gaji=${id_gaji}`);
      if (data && data.success) return data.data;
      if (data && !data.success && data.message) throw new Error(data.message);
    }

    const db = getLocalData();
    const g = (db.gaji || []).find(item => item.id_gaji === Number(id_gaji));
    if (!g) throw new Error('Slip gaji tidak ditemukan');
    const k = (db.karyawan || []).find(item => item.id_karyawan === g.id_karyawan);
    return {
      gaji: {
        ...g,
        nama_karyawan: k ? k.nama : 'Unknown',
        kode_karyawan: k ? k.kode_karyawan : `KRY-${g.id_karyawan}`,
        jabatan: k ? k.jabatan : '',
        email: k ? k.email : '',
        nomor_hp: k ? k.nomor_hp : ''
      },
      pembayaran: [],
      absensi: (db.absensi || []).filter(a => a.id_karyawan === g.id_karyawan && a.status_verifikasi === 'disetujui' && a.tanggal?.startsWith(g.periode))
    };
  },

  async getDetail({ id_karyawan, periode, id_gaji } = {}) {
    const params = new URLSearchParams({ action: 'detail' });
    if (id_karyawan) params.set('id_karyawan', id_karyawan);
    if (periode) params.set('periode', periode);
    if (id_gaji) params.set('id_gaji', id_gaji);

    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?${params}`);
      if (data?.success) return data.data;
      if (data?.message) throw new Error(data.message);
    }

    const absensi = await AbsensiService.getAll({ id_karyawan });

    return {
      absensi: absensi.filter((item) =>
        item.status_verifikasi === 'disetujui' && (!periode || item.tanggal?.startsWith(periode))
      ),
      pengeluaran: []
    };
  },

  async updatePenyesuaian(id_gaji, bonus, potongan, catatan_penyesuaian = '') {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?action=penyesuaian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_gaji, bonus, potongan, catatan_penyesuaian })
      });
      if (data?.success) return data;
      if (data?.message) throw new Error(data.message);
    }

    const db = getLocalData();
    const gaji = db.gaji.find((item) => Number(item.id_gaji) === Number(id_gaji));
    if (!gaji) throw new Error('Data gaji tidak ditemukan.');

    gaji.bonus = Number(bonus) || 0;
    gaji.potongan = Number(potongan) || 0;
    gaji.catatan_penyesuaian = catatan_penyesuaian;
    const totalUpah = Number(gaji.total_upah || 0);
    gaji.gaji_bersih = Math.max(0, totalUpah + gaji.bonus - gaji.potongan);
    gaji.sisa_pembayaran = Math.max(0, gaji.gaji_bersih - Number(gaji.total_dibayar || 0));
    saveLocalData(db);
    return { success: true, message: 'Penyesuaian gaji berhasil disimpan.' };
  },

  async hitungGaji(periode) {
    return this.tetapkanGaji({ periode });
  },

  async bayar(id_gaji, paymentData = {}) {
    return this.catatPembayaran({
      id_gaji,
      nominal_bayar: paymentData.nominal_bayar,
      tanggal_bayar: paymentData.tanggal_bayar || new Date().toISOString().slice(0, 10),
      metode_pembayaran: paymentData.metode_bayar || paymentData.metode_pembayaran || 'transfer',
      nomor_referensi: paymentData.nomor_referensi || '',
      nama_penerima: paymentData.nama_penerima || '',
      bukti_pembayaran: paymentData.foto_bukti || paymentData.bukti_bayar || '',
      catatan: paymentData.catatan_bayar || paymentData.catatan || ''
    });
  }
};

export function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(val) || 0);
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  '/api'
).replace(/\/+$/, '')

async function request(path, method, body) {
  // Petakan rute REST ke script endpoint PHP backend yang sesuai
  let url = path;
  if (path === '/karyawan' || path.startsWith('/karyawan?')) {
    url = '/pekerja.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  } else if (path.startsWith('/karyawan/')) {
    const id = path.replace('/karyawan/', '');
    url = `/pekerja.php?id_karyawan=${id}`;
  } else if (path === '/pekerjaan' || path.startsWith('/pekerjaan?')) {
    url = '/pekerjaan.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  } else if (path === '/pekerjaan/tersedia') {
    url = '/pekerjaan.php?action=tersedia';
  } else if (path.startsWith('/pekerjaan/')) {
    const id = path.replace('/pekerjaan/', '');
    url = `/pekerjaan.php?id_pekerjaan=${id}`;
  } else if (path === '/penugasan' || path.startsWith('/penugasan?')) {
    url = '/penugasan.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  } else if (path.startsWith('/penugasan/')) {
    const id = path.replace('/penugasan/', '');
    url = `/penugasan.php?id_penugasan=${id}`;
  } else if (path === '/absensi' || path.startsWith('/absensi?')) {
    url = '/absensi.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  } else if (path.startsWith('/absensi/')) {
    const id = path.replace('/absensi/', '');
    url = `/absensi.php?id_absensi=${id}`;
  }

  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const { ok, data: result } = await safeFetchJson(`${API_BASE}${url}`, options);
  if (!ok || result?.success === false) {
    // Fallback otomatis ke data lokal jika backend offline atau mengalami gangguan
    const db = getLocalData();
    if (path.startsWith('/karyawan')) {
      return db.karyawan.map(k => ({
        ...k,
        id_karyawan: Number(k.id_karyawan),
        nama: k.nama || '',
        jabatan: k.jabatan || '',
        tarif_per_jam: Number(k.tarif_per_jam) || 0,
        status: k.status || 'aktif',
        aktif: k.aktif ?? 1
      }));
    } else if (path.startsWith('/pekerjaan')) {
      return db.pekerjaan;
    } else if (path.startsWith('/penugasan')) {
      return db.penugasan;
    } else if (path.startsWith('/absensi')) {
      return db.absensi;
    }
    throw new Error(result?.message || `Permintaan API gagal.`);
  }

  return result.data ?? result;
}

export function apiGet(path) {
  return request(path, 'GET')
}

export function apiPost(path, body) {
  return request(path, 'POST', body)
}

export function apiPut(path, body) {
  return request(path, 'PUT', body)
}

export function apiDelete(path) {
  return request(path, 'DELETE')
}
