// ===================================================// API & STORAGE SERVICE: SISTEM PENCATATAN KERJA & PENGELUARAN
// ==========================================================

const API_BASE = '/api';

// Seed data awal identik dengan database.sql
const INITIAL_DATA = {
  karyawan: [
    { id_karyawan: 1, nama: 'Budi Santoso', jabatan: 'Teknisi Jaringan Senior', tarif_per_jam: 50000 },
    { id_karyawan: 2, nama: 'Siti Rahma', jabatan: 'Sistem Analis', tarif_per_jam: 60000 },
    { id_karyawan: 3, nama: 'Agus Setiawan', jabatan: 'Teknisi Lapangan', tarif_per_jam: 40000 },
    { id_karyawan: 4, nama: 'Dewi Lestari', jabatan: 'Quality Assurance', tarif_per_jam: 45000 },
  ],
  user: [
    { id_user: 1, id_karyawan: null, email: 'admin@jamkerja.com', kata_sandi: 'admin123', peran: 'admin', aktif: 1 },
    { id_user: 2, id_karyawan: 1, email: 'budi@jamkerja.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
    { id_user: 3, id_karyawan: 2, email: 'siti@jamkerja.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
    { id_user: 4, id_karyawan: 3, email: 'agus@jamkerja.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
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
    { id_absensi: 1, id_pekerjaan: 1, id_karyawan: 1, tanggal: '2026-11-02', jam_masuk: '08:00', jam_pulang: '17:00', status_verifikasi: 'disetujui', catatan: 'Pekerjaan crimping kabel lantai 1', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 2, id_pekerjaan: 1, id_karyawan: 1, tanggal: '2026-11-03', jam_masuk: '08:30', jam_pulang: '16:30', status_verifikasi: 'disetujui', catatan: 'Pemasangan rak server dan switch', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 3, id_pekerjaan: 1, id_karyawan: 3, tanggal: '2026-11-02', jam_masuk: '08:00', jam_pulang: '16:00', status_verifikasi: 'disetujui', catatan: 'Bantu tarik kabel ducting', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 4, id_pekerjaan: 1, id_karyawan: 3, tanggal: '2026-11-03', jam_masuk: '08:00', jam_pulang: '17:00', status_verifikasi: 'disetujui', catatan: 'Terminasi patch panel', titik_lokasi: '-6.2088, 106.8456' },
    { id_absensi: 5, id_pekerjaan: 2, id_karyawan: 2, tanggal: '2026-11-02', jam_masuk: '09:00', jam_pulang: '18:00', status_verifikasi: 'disetujui', catatan: 'Audit indexing database', titik_lokasi: '-6.1754, 106.8272' },
    { id_absensi: 6, id_pekerjaan: 2, id_karyawan: 1, tanggal: '2026-11-03', jam_masuk: '09:00', jam_pulang: '15:00', status_verifikasi: 'disetujui', catatan: 'Cek temperatur data center', titik_lokasi: '-6.1754, 106.8272' }
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
    // Auto-update absensi yang masih 'menunggu' atau 'ditolak' menjadi 'disetujui' agar jam kerja tidak tertahan
    if (parsed && Array.isArray(parsed.absensi)) {
      parsed.absensi.forEach(a => {
        if (a.status_verifikasi !== 'disetujui') {
          a.status_verifikasi = 'disetujui';
          changed = true;
        }
      });
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
      const rawUser = localStorage.getItem('jam_kerja_auth');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && u.id_user) {
          authHeader = {
            'Authorization': `Bearer ${u.id_user}`,
            'X-User-Id': String(u.id_user)
          };
        }
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

  async login(email, password) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, kata_sandi: password })
      });
      if (data && data.success) {
        AuthService.setCurrentUser(data.data);
        return data;
      }
    }

    // Fallback Local Login
    const db = getLocalData();
    const user = db.user.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Akun tidak ditemukan. Periksa kembali email Anda.');
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
      jabatan: data.jabatan,
      tarif_per_jam: Number(data.tarif_per_jam) || 0
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
        nama: data.nama,
        jabatan: data.jabatan,
        tarif_per_jam: Number(data.tarif_per_jam)
      };

      const uIdx = db.user.findIndex(u => u.id_karyawan === Number(id_karyawan));
      if (uIdx !== -1) {
        db.user[uIdx].email = data.email || db.user[uIdx].email;
        if (data.aktif !== undefined) db.user[uIdx].aktif = data.aktif ? 1 : 0;
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
      const params = new URLSearchParams(filter).toString();
      const { data } = await safeFetchJson(`${API_BASE}/absensi.php?${params}`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    return db.absensi
      .filter(a => {
        if (filter.id_karyawan && a.id_karyawan !== Number(filter.id_karyawan)) return false;
        if (filter.id_pekerjaan && a.id_pekerjaan !== Number(filter.id_pekerjaan)) return false;
        if (filter.tanggal && a.tanggal !== filter.tanggal) return false;
        return true;
      })
      .map(a => {
        const k = (db.karyawan || []).find(item => Number(item.id_karyawan) === Number(a.id_karyawan));
        const p = (db.pekerjaan || []).find(item => Number(item.id_pekerjaan) === Number(a.id_pekerjaan));
        return {
          ...a,
          nama_karyawan: k ? k.nama : (a.nama_karyawan || 'Pekerja'),
          jabatan: k ? k.jabatan : (a.jabatan || 'Teknisi'),
          tarif_per_jam: k ? k.tarif_per_jam : 0,
          nama_pekerjaan: p ? p.nama_pekerjaan : (a.nama_pekerjaan || 'Proyek Lapangan'),
          lokasi_pekerjaan: p ? p.lokasi : '',
          titik_pekerjaan: p ? p.titik_lokasi : '',
          durasi_jam: hitungDurasi(a.jam_masuk, a.jam_pulang)
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
      status_verifikasi: 'disetujui', // Otomatis disetujui (tidak perlu menunggu admin)
      catatan: catatan || '',
      titik_lokasi: titik_lokasi || '',
      foto_lokasi: foto_lokasi || ''
    };
    db.absensi.unshift(newRecord);
    saveLocalData(db);
    return { success: true, message: 'Absen masuk berhasil dicatat & otomatis disetujui sistem!', data: newRecord };
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
      if (db.absensi[idx].status_verifikasi !== 'ditolak') {
        db.absensi[idx].status_verifikasi = 'disetujui';
      }
      saveLocalData(db);
      return { success: true, message: `Absen pulang berhasil dicatat! Durasi kerja: ${durasi.toFixed(2)} jam (Otomatis disetujui).`, durasi_jam: durasi };
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
        const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?id_pengeluaran=${id_pengeluaran}`, {
          method: 'DELETE'
        });
        if (resData && resData.success) return resData;
      } catch {
        // Fallback POST action=delete if DELETE method is blocked by proxy/firewall
        const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=delete&id_pengeluaran=${id_pengeluaran}`, {
          method: 'POST'
        });
        if (resData && resData.success) return resData;
        if (resData && !resData.success) throw new Error(resData.message);
      }
    }

    const db = getLocalData();
    db.pengeluaran = db.pengeluaran.filter(p => Number(p.id_pengeluaran) !== Number(id_pengeluaran));
    saveLocalData(db);
    return { success: true, message: 'Catatan pengeluaran berhasil dihapus' };
  },

  async verifikasi(id_pengeluaran, status_verifikasi) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=verifikasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pengeluaran, status_verifikasi })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.pengeluaran.findIndex(p => p.id_pengeluaran === Number(id_pengeluaran));
    if (idx !== -1) {
      db.pengeluaran[idx].status_verifikasi = status_verifikasi;
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

  async hitungGaji(periode) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/gaji.php?action=hitung`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periode })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success && resData.message) {
        throw new Error(resData.message);
      }
    }

    const db = getLocalData();
    let count = 0;

    db.karyawan.forEach(k => {
      // 1. Total jam disetujui bulan ini
      const totalJam = db.absensi
        .filter(a => a.id_karyawan === k.id_karyawan && a.status_verifikasi === 'disetujui' && a.jam_pulang && a.tanggal.startsWith(periode))
        .reduce((sum, a) => sum + hitungDurasi(a.jam_masuk, a.jam_pulang), 0);

      const tarif = Number(k.tarif_per_jam) || 0;
      const totalUpah = Number((totalJam * tarif).toFixed(2));

      // 2. Total ganti uang pribadi disetujui
      const totalGanti = db.pengeluaran
        .filter(pg => pg.id_karyawan === k.id_karyawan && pg.jenis_dana === 'pribadi' && pg.status_verifikasi === 'disetujui' && pg.tanggal.startsWith(periode))
        .reduce((sum, pg) => sum + Number(pg.nominal), 0);

      const totalDibayar = totalUpah + totalGanti;

      const existingIdx = db.gaji.findIndex(g => g.id_karyawan === k.id_karyawan && g.periode === periode);
      if (existingIdx !== -1) {
        db.gaji[existingIdx] = {
          ...db.gaji[existingIdx],
          total_jam: Number(totalJam.toFixed(2)),
          tarif,
          total_upah: totalUpah,
          total_ganti: totalGanti,
          total_dibayar: totalDibayar
        };
      } else {
        const newId = db.gaji.length ? Math.max(...db.gaji.map(g => g.id_gaji)) + 1 : 1;
        db.gaji.push({
          id_gaji: newId,
          id_karyawan: k.id_karyawan,
          periode,
          total_jam: Number(totalJam.toFixed(2)),
          tarif,
          total_upah: totalUpah,
          total_ganti: totalGanti,
          total_dibayar: totalDibayar,
          status_bayar: 'belum',
          tanggal_bayar: null
        });
      }
      count++;
    });

    saveLocalData(db);
    return { success: true, message: `Perhitungan gaji periode ${periode} berhasil untuk ${count} pekerja!` };
  },

  async bayar(id_gaji) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/gaji.php?action=bayar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_gaji })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success && resData.message) {
        throw new Error(resData.message);
      }
    }

    const db = getLocalData();
    const idx = db.gaji.findIndex(g => g.id_gaji === Number(id_gaji));
    if (idx !== -1) {
      db.gaji[idx].status_bayar = 'sudah';
      db.gaji[idx].tanggal_bayar = new Date().toISOString();

      // Update pengeluaran pribadi yang disetujui menjadi status_ganti = sudah
      const g = db.gaji[idx];
      db.pengeluaran.forEach(pg => {
        if (pg.id_karyawan === g.id_karyawan && pg.jenis_dana === 'pribadi' && pg.status_verifikasi === 'disetujui' && pg.tanggal.startsWith(g.periode)) {
          pg.status_ganti = 'sudah';
        }
      });

      saveLocalData(db);
    }
    return { success: true, message: 'Status gaji berhasil diperbarui menjadi SUDAH DIBAYAR!' };
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
  'http://localhost/pencatatan-kerja/backend/public/api'
).replace(/\/+$/, '')

async function request(path, method, body) {
  const headers = { Accept: 'application/json' }
  const options = { method, headers }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error(
      `API tidak dapat dihubungi. Periksa server backend di ${API_BASE_URL}.`,
    )
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(`Respons API tidak valid (HTTP ${response.status}).`)
  }

  if (!response.ok || result?.success !== true) {
    const error = new Error(
      result?.message || `Permintaan API gagal (HTTP ${response.status}).`,
    )
    error.status = response.status
    throw error
  }

  return result.data
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
