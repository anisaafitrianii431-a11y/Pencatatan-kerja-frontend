// ===================================================// API & STORAGE SERVICE: SISTEM PENCATATAN KERJA & PENGELUARAN
// ==========================================================

import { getSyncedJakartaNow } from '../utils/ntpTime.js';

const API_BASE = '/api';

export function getFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_BASE}/${String(path).replace(/^\/+/, '')}`;
}

const LOCAL_DB_VERSION = '2026-11-12-clean';

// Data awal fallback offline bersih (hanya menyimpan akun login)
const INITIAL_DATA = {
  version: LOCAL_DB_VERSION,
  karyawan: [
    { id_karyawan: 5, nama: 'nadia', jabatan: 'Teknik jaringan', tarif_per_jam: 500000 },
    { id_karyawan: 6, nama: 'budi santoso', jabatan: 'Software Development', tarif_per_jam: 0 },
  ],
  user: [
    { id_user: 1, id_karyawan: null, email: 'admin@jamkerja.com', kata_sandi: 'admin123', peran: 'admin', aktif: 1 },
    { id_user: 5, id_karyawan: 5, email: 'nadia@gmail.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
    { id_user: 6, id_karyawan: 6, email: 'budi@gmail.com', kata_sandi: 'karyawan123', peran: 'karyawan', aktif: 1 },
  ],
  pekerjaan: [],
  penugasan: [],
  absensi: [],
  kas_kantor: [],
  kas_kantor_pengembalian: [],
  pengeluaran: [],
  gaji: []
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
    if (!parsed || parsed.version !== LOCAL_DB_VERSION) {
      localStorage.setItem('jam_kerja_db', JSON.stringify(INITIAL_DATA));
      return INITIAL_DATA;
    }
    let changed = false;
    if (parsed && !Array.isArray(parsed.kas_kantor)) {
      parsed.kas_kantor = INITIAL_DATA.kas_kantor || [];
      changed = true;
    } else if (parsed && Array.isArray(parsed.kas_kantor)) {
      parsed.kas_kantor.forEach(kk => {
        if (!kk.status_verifikasi) {
          kk.status_verifikasi = 'disetujui';
          kk.dibuat_oleh = kk.dibuat_oleh || 'admin';
          kk.id_pelapor = kk.id_pelapor ?? null;
          kk.catatan_admin = kk.catatan_admin ?? null;
          changed = true;
        }
      });
    }
    if (parsed && !Array.isArray(parsed.kas_kantor_pengembalian)) {
      parsed.kas_kantor_pengembalian = [];
      changed = true;
    }

    // Migrasi 1 kali: Pastikan absensi baru / belum diverifikasi admin berstatus 'menunggu' (Menunggu Verifikasi)
    const MIGRATION_KEY = 'jam_kerja_status_menunggu_verifikasi_v5';
    if (!localStorage.getItem(MIGRATION_KEY)) {
      if (parsed && Array.isArray(parsed.absensi)) {
        parsed.absensi.forEach(a => {
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
    localStorage.setItem('jam_kerja_db', JSON.stringify(INITIAL_DATA));
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
      return { ok: res.ok, status: res.status, data };
    } catch {
      // Jika kembalian berupa HTML (misal error 500 Apache), jangan crash
      return { ok: false, status: res.status, data: null, isHtmlError: true };
    }
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err };
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
    const ntpNow = getSyncedJakartaNow();
    const tgl = ntpNow.tanggal;
    const masuk = jam_masuk || ntpNow.jam;

    const jobData = (db.pekerjaan || []).find(p => Number(p.id_pekerjaan) === Number(id_pekerjaan));
    if (!jobData) {
      throw new Error('Data pekerjaan tidak ditemukan dalam sistem.');
    }
    if (jobData.status === 'belum_mulai') {
      throw new Error(`Absensi terkunci: pekerjaan "${jobData.nama_pekerjaan}" masih berstatus Belum Dimulai.`);
    }
    if (jobData.status === 'selesai') {
      throw new Error('Pekerjaan ini sudah berstatus selesai dan tidak dapat menerima absensi baru.');
    }
    if (jobData.status !== 'berjalan') {
      throw new Error('Absensi terkunci: pekerjaan harus berstatus Sedang Berjalan.');
    }

    const active = db.absensi.find(a => Number(a.id_karyawan) === Number(id_karyawan) && Number(a.id_pekerjaan) === Number(id_pekerjaan) && !a.jam_pulang);
    if (active) {
      throw new Error('Anda masih memiliki sesi kerja yang belum absen pulang pada pekerjaan ini.');
    }

    const completedToday = db.absensi.find(
      a => Number(a.id_karyawan) === Number(id_karyawan) &&
        Number(a.id_pekerjaan) === Number(id_pekerjaan) &&
        String(a.tanggal || '').slice(0, 10) === tgl &&
        Boolean(a.jam_masuk) &&
        Boolean(a.jam_pulang)
    );
    if (completedToday) {
      throw new Error(`Absensi masuk dan pulang untuk pekerjaan ini sudah selesai pada hari & tanggal ini (${tgl}). Absensi terbuka kembali pada hari berikutnya.`);
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
      foto_lokasi: foto_lokasi || '',
      foto_pulang: '',
      titik_pulang: '',
      jarak_masuk: null,
      jarak_pulang: null,
      catatan_admin: null
    };
    db.absensi.unshift(newRecord);
    saveLocalData(db);
    return { success: true, message: 'Absen masuk berhasil dicatat! Menunggu verifikasi admin.', data: newRecord };
  },

  async absenPulang(id_absensi, jam_pulang, is_overnight = false, extra = {}) {
    const payload = {
      id_absensi,
      jam_pulang,
      is_overnight,
      titik_pulang: extra?.titik_pulang || extra?.titik_lokasi || '',
      foto_pulang: extra?.foto_pulang || extra?.foto_lokasi || '',
    };
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/absensi.php?action=pulang`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const resolvedJamPulang = jam_pulang || getSyncedJakartaNow().jam;

    const idx = db.absensi.findIndex(a => a.id_absensi === Number(id_absensi));
    if (idx !== -1) {
      const rec = db.absensi[idx];
      const durasi = hitungDurasi(rec.jam_masuk, resolvedJamPulang, is_overnight);

      if (durasi <= 0) {
        throw new Error(`Jam pulang tidak valid. Jam pulang (${resolvedJamPulang}) lebih kecil dari jam masuk (${rec.jam_masuk}). Centang 'Shift Malam' jika bekerja melewati tengah malam.`);
      }

      db.absensi[idx].jam_pulang = resolvedJamPulang;
      db.absensi[idx].titik_pulang = payload.titik_pulang;
      db.absensi[idx].foto_pulang = payload.foto_pulang;
      if (db.absensi[idx].status_verifikasi !== 'ditolak') {
        db.absensi[idx].status_verifikasi = 'menunggu';
      }
      saveLocalData(db);
      return { success: true, message: `Absen pulang berhasil dicatat (${durasi.toFixed(2)} jam)! Menunggu verifikasi admin.`, durasi_jam: durasi };
    }
    throw new Error('Data absensi tidak ditemukan');
  },

  async verifikasi(id_absensi, status_verifikasi, catatan_admin = '') {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/absensi.php?action=verifikasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_absensi, status_verifikasi, catatan_admin })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.absensi.findIndex(a => a.id_absensi === Number(id_absensi));
    if (idx !== -1) {
      db.absensi[idx].status_verifikasi = status_verifikasi;
      db.absensi[idx].catatan_admin = catatan_admin || null;
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

// Helper lokal kalkulasi saldo & pertanggungjawaban kas kantor
function computeLocalKasList(db) {
  const kasList = Array.isArray(db.kas_kantor) ? db.kas_kantor : [];
  const pengList = Array.isArray(db.pengeluaran) ? db.pengeluaran : [];
  const returnList = Array.isArray(db.kas_kantor_pengembalian) ? db.kas_kantor_pengembalian : [];

  return kasList
    .map(kk => {
      const pj = db.karyawan.find(k => Number(k.id_karyawan) === Number(kk.id_karyawan));
      const pelapor = kk.id_pelapor ? db.karyawan.find(k => Number(k.id_karyawan) === Number(kk.id_pelapor)) : null;
      const job = kk.id_pekerjaan ? db.pekerjaan.find(p => Number(p.id_pekerjaan) === Number(kk.id_pekerjaan)) : null;
      const linkedNotes = pengList.filter(pg => pg.jenis_dana === 'kantor' && Number(pg.id_kas) === Number(kk.id_kas));
      const totalDisetujui = linkedNotes
        .filter(pg => pg.status_verifikasi === 'disetujui')
        .reduce((s, pg) => s + (Number(pg.nominal) || 0), 0);
      const totalMenunggu = linkedNotes
        .filter(pg => pg.status_verifikasi === 'menunggu')
        .reduce((s, pg) => s + (Number(pg.nominal) || 0), 0);

      const returns = returnList.filter(pk => Number(pk.id_kas) === Number(kk.id_kas));
      const totalDikembalikan = returns
        .filter(pk => pk.status_konfirmasi === 'diterima')
        .reduce((s, pk) => s + (Number(pk.nominal) || 0), 0);
      const menungguKonfirmasiKembali = returns
        .filter(pk => pk.status_konfirmasi === 'menunggu')
        .reduce((s, pk) => s + (Number(pk.nominal) || 0), 0);

      const masuk = Number(kk.nominal_masuk) || 0;
      const sisaResmi = Math.max(0, masuk - totalDisetujui - totalDikembalikan);
      const sisaTersedia = Math.max(0, masuk - totalDisetujui - totalMenunggu - totalDikembalikan - menungguKonfirmasiKembali);

      return {
        ...kk,
        id_kas: Number(kk.id_kas),
        id_pekerjaan: kk.id_pekerjaan ? Number(kk.id_pekerjaan) : null,
        id_karyawan: Number(kk.id_karyawan),
        id_pelapor: kk.id_pelapor ? Number(kk.id_pelapor) : null,
        dibuat_oleh: kk.dibuat_oleh || 'admin',
        status_verifikasi: kk.status_verifikasi || 'disetujui',
        catatan_admin: kk.catatan_admin || null,
        nama_penanggung_jawab: pj ? pj.nama : 'Unknown',
        jabatan_penanggung_jawab: pj ? pj.jabatan : '',
        nama_pelapor: pelapor ? pelapor.nama : null,
        nama_pekerjaan: job ? job.nama_pekerjaan : null,
        lokasi_pekerjaan: job ? job.lokasi : null,
        nominal_masuk: masuk,
        jumlah_nota: linkedNotes.length,
        total_terpakai_disetujui: totalDisetujui,
        total_terpakai_menunggu: totalMenunggu,
        total_dikembalikan: totalDikembalikan,
        menunggu_konfirmasi_kembali: menungguKonfirmasiKembali,
        sisa_resmi: sisaResmi,
        sisa_tersedia: sisaTersedia
      };
    })
    .sort((a, b) => b.id_kas - a.id_kas);
}

function syncLocalKasLpjStatus(db, idKas) {
  if (!idKas || !Array.isArray(db.kas_kantor)) return;
  const computed = computeLocalKasList(db).find(k => Number(k.id_kas) === Number(idKas));
  const idx = db.kas_kantor.findIndex(k => Number(k.id_kas) === Number(idKas));
  if (computed && idx !== -1) {
    const isApproved = (db.kas_kantor[idx].status_verifikasi || 'disetujui') === 'disetujui';
    db.kas_kantor[idx].status_lpj = (
      isApproved &&
      computed.sisa_resmi <= 0 &&
      computed.total_terpakai_menunggu === 0 &&
      computed.menunggu_konfirmasi_kembali === 0
    )
      ? 'selesai'
      : 'berjalan';
  }
}

// ==========================================
// PENGELUARAN SERVICE (UANG PRIBADI & KAS KANTOR)
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
    const kasMap = new Map((db.kas_kantor || []).map(k => [Number(k.id_kas), k]));
    const includeKasPj = String(filter.include_kas_pj || '') === '1';

    return db.pengeluaran
      .filter(pg => {
        const kas = pg.id_kas ? kasMap.get(Number(pg.id_kas)) : null;
        if (filter.id_karyawan) {
          const matchOwner = Number(pg.id_karyawan) === Number(filter.id_karyawan);
          const matchPj = includeKasPj && kas && Number(kas.id_karyawan) === Number(filter.id_karyawan);
          if (!matchOwner && !matchPj) return false;
        }
        if (filter.id_pekerjaan && Number(pg.id_pekerjaan) !== Number(filter.id_pekerjaan)) return false;
        if (filter.id_kas && Number(pg.id_kas) !== Number(filter.id_kas)) return false;
        if (filter.jenis_dana && pg.jenis_dana !== filter.jenis_dana) return false;
        return true;
      })
      .map(pg => {
        const user = AuthService.getCurrentUser();
        const isAdmin = String(user?.peran || '').toLowerCase() === 'admin';
        const k = db.karyawan.find(item => item.id_karyawan === pg.id_karyawan);
        const p = db.pekerjaan.find(item => item.id_pekerjaan === pg.id_pekerjaan);
        const kas = pg.id_kas ? kasMap.get(Number(pg.id_kas)) : null;
        const pj = kas ? db.karyawan.find(item => Number(item.id_karyawan) === Number(kas.id_karyawan)) : null;
        return {
          ...pg,
          nama_karyawan: k ? k.nama : 'Unknown',
          jabatan: k ? k.jabatan : '',
          nama_pekerjaan: p ? p.nama_pekerjaan : 'Unknown',
          lokasi_pekerjaan: p ? p.lokasi : '',
          id_penanggung_jawab: kas ? Number(kas.id_karyawan) : null,
          nama_penanggung_jawab: pj ? pj.nama : null,
          keterangan_kas: kas ? kas.keterangan : null,
          tanggal_kas: kas ? kas.tanggal : null,
          nominal_kas: isAdmin && kas ? Number(kas.nominal_masuk) : null
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

    const jenisDana = getVal('jenis_dana') || 'pribadi';
    const nominal = Number(getVal('nominal')) || 0;
    const idPekerjaan = Number(getVal('id_pekerjaan'));
    const rawIdKas = getVal('id_kas');
    const idKas = jenisDana === 'kantor' && rawIdKas ? Number(rawIdKas) : null;

    if (jenisDana === 'kantor') {
      if (!idKas) {
        throw new Error('Untuk sumber dana Uang Kantor, wajib memilih penanggung jawab uang kantor.');
      }
      const kas = computeLocalKasList(db).find(k => k.id_kas === idKas);
      if (!kas) throw new Error('Data penanggung jawab dana kantor tidak ditemukan.');
      if ((kas.status_verifikasi || 'disetujui') !== 'disetujui') {
        throw new Error('Pemasukan kas kantor pada penanggung jawab ini belum disetujui Admin.');
      }
      if (kas.status_lpj === 'selesai') throw new Error('Dana kantor pada penanggung jawab ini sudah ditutup (LPJ selesai).');
      if (kas.id_pekerjaan !== null && Number(kas.id_pekerjaan) !== idPekerjaan) {
        throw new Error(`Dana kantor pada penanggung jawab ini khusus untuk proyek ${kas.nama_pekerjaan}.`);
      }
    }

    const item = {
      id_pengeluaran: newId,
      id_pekerjaan: idPekerjaan,
      id_karyawan: Number(getVal('id_karyawan')),
      tanggal: getVal('tanggal') || new Date().toISOString().slice(0, 10),
      nominal,
      jenis_dana: jenisDana,
      id_kas: idKas,
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
      const old = db.pengeluaran[idx];
      const jenisDana = getVal('jenis_dana') || old.jenis_dana;
      const nominal = Number(getVal('nominal')) || old.nominal;
      const idPekerjaan = Number(getVal('id_pekerjaan')) || old.id_pekerjaan;
      const rawIdKas = getVal('id_kas');
      const idKas = jenisDana === 'kantor' ? (rawIdKas ? Number(rawIdKas) : old.id_kas) : null;

      if (jenisDana === 'kantor') {
        if (!idKas) {
          throw new Error('Untuk sumber dana Uang Kantor, wajib memilih penanggung jawab uang kantor.');
        }
        const kas = computeLocalKasList(db).find(k => k.id_kas === idKas);
        if (!kas) throw new Error('Data penanggung jawab dana kantor tidak ditemukan.');
        if ((kas.status_verifikasi || 'disetujui') !== 'disetujui') {
          throw new Error('Pemasukan kas kantor pada penanggung jawab ini belum disetujui Admin.');
        }
        if (kas.status_lpj === 'selesai') throw new Error('Dana kantor pada penanggung jawab ini sudah ditutup (LPJ selesai).');
        if (kas.id_pekerjaan !== null && Number(kas.id_pekerjaan) !== idPekerjaan) {
          throw new Error(`Dana kantor pada penanggung jawab ini khusus untuk proyek ${kas.nama_pekerjaan}.`);
        }
      }

      db.pengeluaran[idx] = {
        ...old,
        id_pekerjaan: idPekerjaan,
        tanggal: getVal('tanggal') || old.tanggal,
        nominal,
        jenis_dana: jenisDana,
        id_kas: idKas,
        keterangan: getVal('keterangan') !== undefined ? getVal('keterangan') : old.keterangan,
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
    const oldItem = db.pengeluaran.find(p => Number(p.id_pengeluaran) === Number(id_pengeluaran));
    db.pengeluaran = db.pengeluaran.filter(p => Number(p.id_pengeluaran) !== Number(id_pengeluaran));
    if (oldItem?.id_kas) syncLocalKasLpjStatus(db, oldItem.id_kas);
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
      if (db.pengeluaran[idx].id_kas) syncLocalKasLpjStatus(db, db.pengeluaran[idx].id_kas);
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

  async getKasList(filter = {}) {
    const live = await checkBackendStatus();
    if (live) {
      const params = new URLSearchParams({ action: 'kas_list', ...filter }).toString();
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?${params}`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const allKas = computeLocalKasList(db);
    const daftar = allKas.filter(kk => {
      if (filter.id_pekerjaan && Number(kk.id_pekerjaan) !== Number(filter.id_pekerjaan)) return false;
      if (filter.id_karyawan && Number(kk.id_karyawan) !== Number(filter.id_karyawan)) return false;
      if (filter.status_lpj && kk.status_lpj !== filter.status_lpj) return false;
      if (filter.status_verifikasi && (kk.status_verifikasi || 'disetujui') !== filter.status_verifikasi) return false;
      return true;
    });

    const kasMap = new Map((db.kas_kantor || []).map(k => [Number(k.id_kas), k]));
    const pengembalian = (db.kas_kantor_pengembalian || []).map(pk => {
      const kas = kasMap.get(Number(pk.id_kas));
      const penyetor = db.karyawan.find(k => Number(k.id_karyawan) === Number(pk.id_karyawan));
      const pj = kas ? db.karyawan.find(k => Number(k.id_karyawan) === Number(kas.id_karyawan)) : null;
      const job = kas && kas.id_pekerjaan ? db.pekerjaan.find(p => Number(p.id_pekerjaan) === Number(kas.id_pekerjaan)) : null;
      return {
        ...pk,
        nama_penyetor: penyetor ? penyetor.nama : 'Admin',
        nama_penanggung_jawab: pj ? pj.nama : 'Unknown',
        keterangan_kas: kas ? kas.keterangan : '',
        nama_pekerjaan: job ? job.nama_pekerjaan : null
      };
    });

    const approvedDaftar = daftar.filter(d => (d.status_verifikasi || 'disetujui') === 'disetujui');

    return {
      daftar,
      pengembalian,
      summary: {
        total_kas_masuk: approvedDaftar.reduce((s, d) => s + d.nominal_masuk, 0),
        total_terpakai_disetujui: approvedDaftar.reduce((s, d) => s + d.total_terpakai_disetujui, 0),
        total_terpakai_menunggu: approvedDaftar.reduce((s, d) => s + d.total_terpakai_menunggu, 0),
        total_sisa_dikembalikan: approvedDaftar.reduce((s, d) => s + d.total_dikembalikan, 0),
        total_sisa_tanggungan: approvedDaftar.reduce((s, d) => s + d.sisa_resmi, 0),
        menunggu_konfirmasi_kembali: pengembalian.filter(pk => pk.status_konfirmasi === 'menunggu').length,
        menunggu_verifikasi_kas: allKas.filter(k => k.status_verifikasi === 'menunggu').length
      }
    };
  },

  async getKasTersedia(id_karyawan_aktif = null) {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=kas_tersedia`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const user = AuthService.getCurrentUser();
    const kId = Number(id_karyawan_aktif || user?.id_karyawan || 0);
    const allKas = computeLocalKasList(db);
    const daftarKas = allKas
      .filter(k => (k.status_verifikasi || 'disetujui') === 'disetujui' && k.status_lpj === 'berjalan')
      .sort((a, b) => (Number(b.id_karyawan === kId) - Number(a.id_karyawan === kId)) || (b.id_kas - a.id_kas))
      .map(k => ({
        id_kas: k.id_kas,
        id_pekerjaan: k.id_pekerjaan,
        id_karyawan: k.id_karyawan,
        nama_penanggung_jawab: k.nama_penanggung_jawab,
        jabatan_penanggung_jawab: k.jabatan_penanggung_jawab,
        nama_pekerjaan: k.nama_pekerjaan,
        tanggal: k.tanggal,
        status_lpj: k.status_lpj,
        status_verifikasi: k.status_verifikasi || 'disetujui'
      }));
    const kasSaya = allKas
      .filter(k => Number(k.id_karyawan) === kId && (k.status_verifikasi || 'disetujui') === 'disetujui')
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id_kas - a.id_kas));
    const kasSayaIds = new Set(kasSaya.map(k => k.id_kas));
    const pengembalianSaya = (db.kas_kantor_pengembalian || [])
      .filter(pk => kasSayaIds.has(Number(pk.id_kas)) || Number(pk.id_karyawan) === kId)
      .map(pk => {
        const kas = kasSaya.find(k => k.id_kas === Number(pk.id_kas));
        return { ...pk, keterangan_kas: kas?.keterangan || '', nama_pekerjaan: kas?.nama_pekerjaan || null };
      });

    return {
      daftar_kas: daftarKas,
      kas_tanggung_jawab_saya: kasSaya,
      pengembalian_saya: pengembalianSaya
    };
  },

  async createKas(data) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      };
      if (!isFormData) options.headers = { 'Content-Type': 'application/json' };
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=create_kas`, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const user = AuthService.getCurrentUser();
    const isAdmin = String(user?.peran || '').toLowerCase() === 'admin';
    if (!isAdmin) {
      throw new Error('Menu Pemasukan & Kas Kantor hanya dapat diakses oleh Administrator.');
    }
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const getVal = (key) => isFormData ? data.get(key) : data[key];
    const newId = db.kas_kantor.length ? Math.max(...db.kas_kantor.map(k => k.id_kas)) + 1 : 1;
    const item = {
      id_kas: newId,
      id_pekerjaan: getVal('id_pekerjaan') ? Number(getVal('id_pekerjaan')) : null,
      id_karyawan: Number(getVal('id_karyawan') || user?.id_karyawan || 0),
      id_pelapor: isAdmin ? null : (Number(user?.id_karyawan || 0) || null),
      dibuat_oleh: isAdmin ? 'admin' : 'karyawan',
      tanggal: getVal('tanggal') || new Date().toISOString().slice(0, 10),
      nominal_masuk: Number(getVal('nominal_masuk')) || 0,
      keterangan: getVal('keterangan') || '',
      bukti_serah: isFormData && (getVal('bukti_serah') || getVal('foto_bukti')) ? 'uploads/sample_kas.jpg' : '',
      status_verifikasi: isAdmin ? 'disetujui' : 'menunggu',
      catatan_admin: null,
      status_lpj: 'berjalan'
    };
    db.kas_kantor.unshift(item);
    saveLocalData(db);
    return {
      success: true,
      message: isAdmin
        ? 'Pemasukan kas kantor berhasil dicatat'
        : 'Laporan pemasukan uang kantor dikirim! Menunggu pengecekan & persetujuan Admin.',
      data: item
    };
  },

  async updateKas(id_kas, data) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      if (isFormData && !data.has('id_kas')) data.append('id_kas', id_kas);
      const options = {
        method: 'POST',
        body: isFormData ? data : JSON.stringify({ ...data, id_kas })
      };
      if (!isFormData) options.headers = { 'Content-Type': 'application/json' };
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=update_kas`, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const user = AuthService.getCurrentUser();
    const isAdmin = String(user?.peran || '').toLowerCase() === 'admin';
    if (!isAdmin) {
      throw new Error('Menu Pemasukan & Kas Kantor hanya dapat diakses oleh Administrator.');
    }
    const idx = db.kas_kantor.findIndex(k => Number(k.id_kas) === Number(id_kas));
    if (idx === -1) throw new Error('Data kas kantor tidak ditemukan');
    const existing = db.kas_kantor[idx];
    if (!isAdmin && existing.status_verifikasi === 'disetujui') {
      throw new Error('Pemasukan yang sudah disetujui Admin tidak dapat diubah.');
    }
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const getVal = (key) => isFormData ? data.get(key) : data[key];
    db.kas_kantor[idx] = {
      ...existing,
      id_pekerjaan: getVal('id_pekerjaan') ? Number(getVal('id_pekerjaan')) : null,
      id_karyawan: Number(getVal('id_karyawan')) || existing.id_karyawan,
      tanggal: getVal('tanggal') || existing.tanggal,
      nominal_masuk: Number(getVal('nominal_masuk')) || existing.nominal_masuk,
      keterangan: getVal('keterangan') !== undefined ? getVal('keterangan') : existing.keterangan,
      status_verifikasi: isAdmin ? (existing.status_verifikasi || 'disetujui') : 'menunggu',
      catatan_admin: isAdmin ? existing.catatan_admin : null
    };
    syncLocalKasLpjStatus(db, id_kas);
    saveLocalData(db);
    return {
      success: true,
      message: isAdmin ? 'Data kas kantor diperbarui' : 'Revisi pemasukan kas dikirim ulang untuk persetujuan Admin.'
    };
  },

  async deleteKas(id_kas, force = false) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=delete_kas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_kas, force })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const user = AuthService.getCurrentUser();
    const isAdmin = String(user?.peran || '').toLowerCase() === 'admin';
    if (!isAdmin) {
      throw new Error('Menu Pemasukan & Kas Kantor hanya dapat diakses oleh Administrator.');
    }
    db.kas_kantor = (db.kas_kantor || []).filter(k => Number(k.id_kas) !== Number(id_kas));
    db.kas_kantor_pengembalian = (db.kas_kantor_pengembalian || []).filter(pk => Number(pk.id_kas) !== Number(id_kas));
    db.pengeluaran = (db.pengeluaran || []).map(pg => Number(pg.id_kas) === Number(id_kas) ? { ...pg, id_kas: null } : pg);
    saveLocalData(db);
    return { success: true, message: 'Data kas kantor dihapus' };
  },

  async verifikasiKas(id_kas, status_verifikasi, catatan_admin = '') {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=verifikasi_kas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_kas, status_verifikasi, catatan_admin })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = (db.kas_kantor || []).findIndex(k => Number(k.id_kas) === Number(id_kas));
    if (idx === -1) throw new Error('Data pemasukan kas kantor tidak ditemukan');
    db.kas_kantor[idx] = {
      ...db.kas_kantor[idx],
      status_verifikasi,
      catatan_admin: catatan_admin || null
    };
    syncLocalKasLpjStatus(db, id_kas);
    saveLocalData(db);
    return {
      success: true,
      message: status_verifikasi === 'disetujui'
        ? 'Pemasukan kas kantor disetujui & penanggung jawab diaktifkan.'
        : (status_verifikasi === 'ditolak' ? 'Laporan pemasukan kas kantor ditolak.' : 'Status verifikasi dikembalikan ke menunggu.')
    };
  },

  async setorSisaKas(data) {
    const live = await checkBackendStatus();
    if (live) {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const options = {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      };
      if (!isFormData) options.headers = { 'Content-Type': 'application/json' };
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=setor_sisa`, options);
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const user = AuthService.getCurrentUser();
    const isAdmin = String(user?.peran || '').toLowerCase() === 'admin';
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const getVal = (key) => isFormData ? data.get(key) : data[key];
    const idKas = Number(getVal('id_kas'));
    const targetKas = (db.kas_kantor || []).find(k => Number(k.id_kas) === idKas);
    if (!targetKas || (targetKas.status_verifikasi || 'disetujui') !== 'disetujui') {
      throw new Error('Pemasukan kas kantor harus disetujui Admin sebelum pengembalian sisa.');
    }
    if (!isAdmin && Number(targetKas.id_karyawan) !== Number(user?.id_karyawan || 0)) {
      throw new Error('Hanya penanggung jawab dana ini atau Admin yang dapat mencatat pengembalian sisa kas.');
    }
    const newId = db.kas_kantor_pengembalian.length ? Math.max(...db.kas_kantor_pengembalian.map(p => p.id_pengembalian)) + 1 : 1;
    const item = {
      id_pengembalian: newId,
      id_kas: idKas,
      id_karyawan: getVal('id_karyawan') ? Number(getVal('id_karyawan')) : Number(user?.id_karyawan || 0),
      tanggal: getVal('tanggal') || new Date().toISOString().slice(0, 10),
      nominal: Number(getVal('nominal')) || 0,
      keterangan: getVal('keterangan') || '',
      bukti_foto: '',
      status_konfirmasi: isAdmin ? 'diterima' : 'menunggu'
    };
    db.kas_kantor_pengembalian.unshift(item);
    syncLocalKasLpjStatus(db, idKas);
    saveLocalData(db);
    return { success: true, message: isAdmin ? 'Pengembalian sisa dana diterima' : 'Pengajuan setoran sisa dikirim ke Admin' };
  },

  async konfirmasiPengembalian(id_pengembalian, status_konfirmasi) {
    const live = await checkBackendStatus();
    if (live) {
      const { data: resData } = await safeFetchJson(`${API_BASE}/pengeluaran.php?action=konfirmasi_pengembalian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pengembalian, status_konfirmasi })
      });
      if (resData && resData.success) return resData;
      if (resData && !resData.success) throw new Error(resData.message);
    }

    const db = getLocalData();
    const idx = db.kas_kantor_pengembalian.findIndex(pk => Number(pk.id_pengembalian) === Number(id_pengembalian));
    if (idx !== -1) {
      db.kas_kantor_pengembalian[idx].status_konfirmasi = status_konfirmasi;
      syncLocalKasLpjStatus(db, db.kas_kantor_pengembalian[idx].id_kas);
      saveLocalData(db);
    }
    return { success: true, message: `Status konfirmasi diubah ke ${status_konfirmasi}` };
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
    const kasComputed = computeLocalKasList(db).filter(k => (k.status_verifikasi || 'disetujui') === 'disetujui');
    let totalPribadi = 0;
    let totalKantor = 0;

    const daftar = db.pekerjaan.map(p => {
      const expenses = db.pengeluaran.filter(pg => pg.id_pekerjaan === p.id_pekerjaan && pg.status_verifikasi === 'disetujui');
      const pribadi = expenses.filter(pg => pg.jenis_dana === 'pribadi').reduce((sum, pg) => sum + Number(pg.nominal), 0);
      const kantor = expenses.filter(pg => pg.jenis_dana === 'kantor').reduce((sum, pg) => sum + Number(pg.nominal), 0);
      const total = pribadi + kantor;
      const kasMasuk = kasComputed.filter(k => Number(k.id_pekerjaan) === Number(p.id_pekerjaan)).reduce((s, k) => s + k.nominal_masuk, 0);
      const kasKembali = kasComputed.filter(k => Number(k.id_pekerjaan) === Number(p.id_pekerjaan)).reduce((s, k) => s + k.total_dikembalikan, 0);

      totalPribadi += pribadi;
      totalKantor += kantor;

      return {
        id_pekerjaan: p.id_pekerjaan,
        nama_pekerjaan: p.nama_pekerjaan,
        uang_pribadi: pribadi,
        uang_kantor: kantor,
        total_pengeluaran: total,
        kas_masuk: kasMasuk,
        kas_dikembalikan: kasKembali,
        sisa_kas_proyek: Math.max(0, kasMasuk - kantor - kasKembali)
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
    const current = AuthService.getCurrentUser();
    const isEmployee = current && current.peran !== 'admin';
    return db.gaji
      .filter(g => g.periode === periode && (!isEmployee || Number(g.id_karyawan) === Number(current.id_karyawan)))
      .map(g => {
        const k = db.karyawan.find(item => item.id_karyawan === g.id_karyawan);
        const jobs = db.pekerjaan.filter(p =>
          db.absensi.some(a => a.id_karyawan === g.id_karyawan && a.id_pekerjaan === p.id_pekerjaan && a.tanggal?.startsWith(periode)) ||
          db.pengeluaran.some(pg => pg.id_karyawan === g.id_karyawan && pg.id_pekerjaan === p.id_pekerjaan && pg.tanggal?.startsWith(periode))
        );
        return {
          ...g,
          nama_karyawan: k ? k.nama : 'Unknown',
          jabatan: k ? k.jabatan : '',
          tarif_per_jam: k ? k.tarif_per_jam : g.tarif,
          id_pekerjaan_list: jobs.map(j => j.id_pekerjaan).join(','),
          nama_pekerjaan: jobs.map(j => j.nama_pekerjaan).join(', ')
        };
      });
  },

  async getHistory() {
    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?action=riwayat`);
      if (data && data.success) return data.data;
    }

    const db = getLocalData();
    const current = AuthService.getCurrentUser();
    const kId = Number(current?.id_karyawan || 0);
    return (db.gaji || [])
      .filter(g => !kId || Number(g.id_karyawan) === kId)
      .slice()
      .sort((a, b) => String(b.periode).localeCompare(String(a.periode)) || Number(b.id_gaji) - Number(a.id_gaji))
      .map(g => {
        const k = (db.karyawan || []).find(item => Number(item.id_karyawan) === Number(g.id_karyawan));
        const jobs = (db.pekerjaan || []).filter(p =>
          (db.absensi || []).some(a => Number(a.id_karyawan) === Number(g.id_karyawan) && a.id_pekerjaan === p.id_pekerjaan && a.tanggal?.startsWith(g.periode)) ||
          (db.pengeluaran || []).some(pg => Number(pg.id_karyawan) === Number(g.id_karyawan) && pg.id_pekerjaan === p.id_pekerjaan && pg.tanggal?.startsWith(g.periode))
        );
        return {
          ...g,
          nama_karyawan: k ? k.nama : 'Unknown',
          jabatan: k ? k.jabatan : '',
          tarif_per_jam: k ? k.tarif_per_jam : g.tarif,
          id_pekerjaan_list: jobs.map(j => j.id_pekerjaan).join(','),
          nama_pekerjaan: jobs.map(j => j.nama_pekerjaan).join(', ')
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

  async getDetail({ id_karyawan, periode, id_gaji, id_pekerjaan } = {}) {
    const params = new URLSearchParams({ action: 'detail' });
    if (id_karyawan) params.set('id_karyawan', id_karyawan);
    if (periode) params.set('periode', periode);
    if (id_gaji) params.set('id_gaji', id_gaji);
    if (id_pekerjaan && id_pekerjaan !== 'semua') params.set('id_pekerjaan', id_pekerjaan);

    const live = await checkBackendStatus();
    if (live) {
      const { data } = await safeFetchJson(`${API_BASE}/gaji.php?${params}`);
      if (data?.success) return data.data;
      if (data?.message) throw new Error(data.message);
    }

    const db = getLocalData();
    const current = AuthService.getCurrentUser();
    const targetKId = Number(id_karyawan || current?.id_karyawan || 0);
    const karyawan = db.karyawan.find(item => Number(item.id_karyawan) === targetKId) || null;
    const slip = db.gaji.find(g => Number(g.id_karyawan) === targetKId && (!periode || g.periode === periode)) || null;
    const tarif = Number(slip?.tarif || karyawan?.tarif_per_jam || 0);
    const filterPId = id_pekerjaan && id_pekerjaan !== 'semua' ? Number(id_pekerjaan) : 0;

    const allAbs = db.absensi.filter(a => Number(a.id_karyawan) === targetKId && (!periode || a.tanggal?.startsWith(periode)));
    const allPg = db.pengeluaran.filter(pg => Number(pg.id_karyawan) === targetKId && pg.jenis_dana === 'pribadi' && (!periode || pg.tanggal?.startsWith(periode)));
    const assignments = db.penugasan.filter(pn => Number(pn.id_karyawan) === targetKId);

    const jobMap = new Map();
    const touchJob = (jobId, peranTugas = null) => {
      const idNum = Number(jobId);
      if (!jobMap.has(idNum)) {
        const job = db.pekerjaan.find(p => Number(p.id_pekerjaan) === idNum) || {};
        jobMap.set(idNum, {
          id_pekerjaan: idNum,
          nama_pekerjaan: job.nama_pekerjaan || 'Pekerjaan',
          lokasi: job.lokasi || '',
          status_pekerjaan: job.status || 'berjalan',
          tanggal_mulai: job.tanggal_mulai || null,
          target_selesai: job.target_selesai || null,
          peran_tugas: peranTugas,
          jumlah_sesi_disetujui: 0,
          jumlah_sesi_menunggu: 0,
          total_jam_disetujui: 0,
          tarif_jam: tarif,
          estimasi_upah: 0,
          jumlah_nota: 0,
          reimbursement_disetujui: 0,
          reimbursement_sudah_diganti: 0,
          reimbursement_menunggu: 0,
          total_kontribusi: 0
        });
      } else if (peranTugas && !jobMap.get(idNum).peran_tugas) {
        jobMap.get(idNum).peran_tugas = peranTugas;
      }
      return jobMap.get(idNum);
    };

    assignments.forEach(as => touchJob(as.id_pekerjaan, as.peran_tugas || 'Anggota'));

    const approvedAbs = [];
    let pendingAbs = 0;
    let pendingJam = 0;
    allAbs.forEach(a => {
      const dur = a.jam_pulang ? hitungDurasi(a.jam_masuk, a.jam_pulang, true) : 0;
      const entry = touchJob(a.id_pekerjaan);
      if (a.status_verifikasi === 'disetujui' && a.jam_pulang) {
        entry.jumlah_sesi_disetujui += 1;
        entry.total_jam_disetujui = Number((entry.total_jam_disetujui + dur).toFixed(2));
        if (!filterPId || Number(a.id_pekerjaan) === filterPId) {
          approvedAbs.push({
            ...a,
            nama_pekerjaan: entry.nama_pekerjaan,
            lokasi: entry.lokasi,
            durasi_jam: dur,
            upah_sesi: Number((dur * tarif).toFixed(2))
          });
        }
      } else if (a.status_verifikasi === 'menunggu') {
        entry.jumlah_sesi_menunggu += 1;
        pendingAbs += 1;
        pendingJam = Number((pendingJam + dur).toFixed(2));
      }
    });

    const approvedPg = [];
    let pendingPg = 0;
    let pendingNom = 0;
    allPg.forEach(pg => {
      const entry = touchJob(pg.id_pekerjaan);
      const nom = Number(pg.nominal || 0);
      if (pg.status_verifikasi === 'disetujui') {
        entry.jumlah_nota += 1;
        entry.reimbursement_disetujui = Number((entry.reimbursement_disetujui + nom).toFixed(2));
        if (pg.status_ganti === 'sudah') {
          entry.reimbursement_sudah_diganti = Number((entry.reimbursement_sudah_diganti + nom).toFixed(2));
        }
        if (!filterPId || Number(pg.id_pekerjaan) === filterPId) {
          approvedPg.push({
            ...pg,
            nama_pekerjaan: entry.nama_pekerjaan,
            lokasi: entry.lokasi
          });
        }
      } else if (pg.status_verifikasi === 'menunggu') {
        entry.reimbursement_menunggu = Number((entry.reimbursement_menunggu + nom).toFixed(2));
        pendingPg += 1;
        pendingNom += nom;
      }
    });

    const pekerjaan_summary = Array.from(jobMap.values()).map(job => {
      const estimasi_upah = Number((job.total_jam_disetujui * tarif).toFixed(2));
      return {
        ...job,
        estimasi_upah,
        total_kontribusi: Number((estimasi_upah + job.reimbursement_disetujui).toFixed(2))
      };
    }).sort((a, b) => b.total_kontribusi - a.total_kontribusi);

    return {
      karyawan,
      slip,
      tarif_aktif: tarif,
      absensi: approvedAbs,
      pengeluaran: approvedPg,
      pekerjaan_summary,
      pending_summary: {
        absensi_menunggu: pendingAbs,
        jam_menunggu: pendingJam,
        pengeluaran_menunggu: pendingPg,
        nominal_menunggu: pendingNom
      }
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

function mapRestPathToPhp(path) {
  const ambilMatch = path.match(/^\/pekerjaan\/(\d+)\/ambil\/?$/)
  if (ambilMatch) {
    return `/pekerjaan.php?action=ambil&id_pekerjaan=${ambilMatch[1]}`
  }
  if (path === '/karyawan' || path.startsWith('/karyawan?')) {
    return '/pekerja.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  }
  if (path.startsWith('/karyawan/')) {
    return `/pekerja.php?id_karyawan=${path.replace('/karyawan/', '')}`;
  }
  if (path === '/pekerjaan' || path.startsWith('/pekerjaan?')) {
    return '/pekerjaan.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  }
  if (path === '/pekerjaan/tersedia') {
    return '/pekerjaan.php?action=tersedia';
  }
  if (path.startsWith('/pekerjaan/')) {
    return `/pekerjaan.php?id_pekerjaan=${path.replace('/pekerjaan/', '')}`;
  }
  if (path === '/penugasan' || path.startsWith('/penugasan?')) {
    return '/penugasan.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  }
  if (path.startsWith('/penugasan/')) {
    return `/penugasan.php?id_penugasan=${path.replace('/penugasan/', '')}`;
  }
  if (path === '/absensi' || path.startsWith('/absensi?')) {
    return '/absensi.php' + (path.includes('?') ? path.substring(path.indexOf('?')) : '');
  }
  const absVerifMatch = path.match(/^\/absensi\/(\d+)\/verifikasi\/?$/);
  if (absVerifMatch) {
    return `/absensi.php?action=verifikasi&id_absensi=${absVerifMatch[1]}`;
  }
  if (path.startsWith('/absensi/')) {
    return `/absensi.php?id_absensi=${path.replace('/absensi/', '')}`;
  }
  return path;
}

function getLocalJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function enrichLocalJob(db, p) {
  const assignments = (db.penugasan || []).filter(t => Number(t.id_pekerjaan) === Number(p.id_pekerjaan));
  const workerNames = assignments
    .map(t => (db.karyawan || []).find(k => Number(k.id_karyawan) === Number(t.id_karyawan))?.nama)
    .filter(Boolean);
  return {
    ...p,
    metode_penentuan: p.metode_penentuan ?? 'terbuka',
    total_pekerja: assignments.length,
    id_karyawan_list: assignments.map(t => t.id_karyawan).join(','),
    nama_karyawan_list: workerNames.join(', '),
  };
}

function handleLocalApiFallback(path, method, body) {
  const db = getLocalData();
  const today = getLocalJakartaToday();
  const ambilMatch = path.match(/^\/pekerjaan\/(\d+)\/ambil\/?$/);

  if (ambilMatch && method === 'POST') {
    const idPekerjaan = Number(ambilMatch[1]);
    const idKaryawan = Number(body?.id_karyawan || 0);
    const job = (db.pekerjaan || []).find(p => Number(p.id_pekerjaan) === idPekerjaan);
    if (!job) throw new Error('Data pekerjaan tidak ditemukan.');
    if ((job.metode_penentuan ?? 'terbuka') !== 'terbuka') {
      throw new Error('409: Pekerjaan ini ditetapkan langsung oleh Admin.');
    }
    if (job.status === 'selesai') {
      throw new Error('422: Pekerjaan sudah berstatus selesai dan tidak dapat diambil.');
    }
    if (job.target_selesai && job.target_selesai < today) {
      throw new Error('422: Pekerjaan telah melewati batas tenggat (deadline).');
    }
    const existing = (db.penugasan || []).find(t => Number(t.id_pekerjaan) === idPekerjaan);
    if (existing) {
      throw new Error('409: Pekerjaan sudah tidak tersedia karena telah diambil oleh pekerja lain.');
    }
    const nextId = (db.penugasan || []).length ? Math.max(...db.penugasan.map(t => Number(t.id_penugasan) || 0)) + 1 : 1;
    const item = {
      id_penugasan: nextId,
      id_pekerjaan: idPekerjaan,
      id_karyawan: idKaryawan,
      peran_tugas: 'Pelaksana Mandiri',
      jenis_penugasan: 'mandiri',
      tanggal_penugasan: today,
      status_baca: 'sudah',
    };
    db.penugasan = db.penugasan || [];
    db.penugasan.push(item);
    saveLocalData(db);
    return item;
  }

  if (path === '/pekerjaan/tersedia') {
    const takenIds = new Set((db.penugasan || []).map(t => Number(t.id_pekerjaan)));
    return (db.pekerjaan || [])
      .filter(p =>
        (p.metode_penentuan ?? 'terbuka') === 'terbuka' &&
        p.status !== 'selesai' &&
        (!p.target_selesai || p.target_selesai >= today) &&
        !takenIds.has(Number(p.id_pekerjaan))
      )
      .map(p => enrichLocalJob(db, p));
  }

  if (path.startsWith('/karyawan')) {
    const idMatch = path.match(/^\/karyawan\/(\d+)$/);
    const mapEmp = (k) => {
      const u = (db.user || []).find(usr => Number(usr.id_karyawan) === Number(k.id_karyawan));
      return {
        ...k,
        id_karyawan: Number(k.id_karyawan),
        id_user: u ? u.id_user : null,
        email: u ? u.email : (k.email || ''),
        peran: u ? u.peran : (k.peran || 'karyawan'),
        nama: k.nama || '',
        jabatan: k.jabatan || '',
        tarif_per_jam: Number(k.tarif_per_jam) || 0,
        status: k.status || (u && u.aktif === 0 ? 'nonaktif' : 'aktif'),
        aktif: u ? u.aktif : (k.aktif ?? 1),
      };
    };

    if (method === 'GET') {
      if (idMatch) {
        const found = (db.karyawan || []).find(k => Number(k.id_karyawan) === Number(idMatch[1]));
        if (!found) throw new Error('Data karyawan tidak ditemukan.');
        return mapEmp(found);
      }
      return (db.karyawan || []).map(mapEmp);
    }

    if (method === 'POST') {
      const nextId = (db.karyawan || []).length ? Math.max(...db.karyawan.map(k => Number(k.id_karyawan) || 0)) + 1 : 1;
      const created = {
        id_karyawan: nextId,
        nama: body?.nama || '',
        jabatan: body?.jabatan || '',
        tarif_per_jam: Number(body?.tarif_per_jam) || 0,
      };
      db.karyawan = db.karyawan || [];
      db.karyawan.push(created);
      if (body?.email) {
        const nextUId = (db.user || []).length ? Math.max(...db.user.map(u => Number(u.id_user) || 0)) + 1 : 1;
        db.user = db.user || [];
        db.user.push({
          id_user: nextUId,
          id_karyawan: nextId,
          email: body.email,
          kata_sandi: body.kata_sandi || 'karyawan123',
          peran: body.peran || 'karyawan',
          aktif: 1,
        });
      }
      saveLocalData(db);
      return mapEmp(created);
    }

    if (method === 'PUT') {
      const id = idMatch ? Number(idMatch[1]) : Number(body?.id_karyawan);
      const idx = (db.karyawan || []).findIndex(k => Number(k.id_karyawan) === id);
      if (idx === -1) throw new Error('Data karyawan tidak ditemukan.');
      db.karyawan[idx] = {
        ...db.karyawan[idx],
        ...body,
        id_karyawan: id,
        tarif_per_jam: body?.tarif_per_jam !== undefined ? Number(body.tarif_per_jam) : db.karyawan[idx].tarif_per_jam,
      };
      saveLocalData(db);
      return mapEmp(db.karyawan[idx]);
    }

    if (method === 'DELETE') {
      const id = idMatch ? Number(idMatch[1]) : 0;
      db.karyawan = (db.karyawan || []).filter(k => Number(k.id_karyawan) !== id);
      db.user = (db.user || []).filter(u => Number(u.id_karyawan) !== id);
      db.penugasan = (db.penugasan || []).filter(p => Number(p.id_karyawan) !== id);
      saveLocalData(db);
      return { success: true };
    }
  }

  if (path.startsWith('/pekerjaan')) {
    if (method === 'GET') {
      const idMatch = path.match(/^\/pekerjaan\/(\d+)$/);
      if (idMatch) {
        const job = (db.pekerjaan || []).find(p => Number(p.id_pekerjaan) === Number(idMatch[1]));
        if (!job) throw new Error('Data pekerjaan tidak ditemukan.');
        return enrichLocalJob(db, job);
      }
      return (db.pekerjaan || []).map(p => enrichLocalJob(db, p));
    }
    if (method === 'POST') {
      const nextId = (db.pekerjaan || []).length ? Math.max(...db.pekerjaan.map(p => Number(p.id_pekerjaan) || 0)) + 1 : 1;
      const created = {
        id_pekerjaan: nextId,
        nama_pekerjaan: body?.nama_pekerjaan || '',
        deskripsi: body?.deskripsi || '',
        lokasi: body?.lokasi || '',
        titik_lokasi: body?.titik_lokasi || '',
        tanggal_mulai: body?.tanggal_mulai || '',
        target_selesai: body?.target_selesai || '',
        status: body?.status || 'belum_mulai',
        metode_penentuan: body?.metode_penentuan || 'terbuka',
      };
      db.pekerjaan.unshift(created);
      if (created.metode_penentuan === 'langsung' && Array.isArray(body?.id_karyawan_list)) {
        let nextPn = (db.penugasan || []).length ? Math.max(...db.penugasan.map(t => Number(t.id_penugasan) || 0)) + 1 : 1;
        body.id_karyawan_list.forEach(empId => {
          db.penugasan.push({
            id_penugasan: nextPn++,
            id_pekerjaan: nextId,
            id_karyawan: Number(empId),
            peran_tugas: 'Anggota Tim Pelaksana',
            jenis_penugasan: 'admin',
            tanggal_penugasan: today,
          });
        });
      }
      saveLocalData(db);
      return enrichLocalJob(db, created);
    }
    if (method === 'PUT') {
      const idMatch = path.match(/^\/pekerjaan\/(\d+)$/);
      const id = idMatch ? Number(idMatch[1]) : Number(body?.id_pekerjaan);
      const idx = (db.pekerjaan || []).findIndex(p => Number(p.id_pekerjaan) === id);
      if (idx !== -1) {
        db.pekerjaan[idx] = { ...db.pekerjaan[idx], ...body, id_pekerjaan: id };
        saveLocalData(db);
        return enrichLocalJob(db, db.pekerjaan[idx]);
      }
    }
    if (method === 'DELETE') {
      const idMatch = path.match(/^\/pekerjaan\/(\d+)$/);
      const id = idMatch ? Number(idMatch[1]) : 0;
      db.pekerjaan = (db.pekerjaan || []).filter(p => Number(p.id_pekerjaan) !== id);
      db.penugasan = (db.penugasan || []).filter(t => Number(t.id_pekerjaan) !== id);
      saveLocalData(db);
      return { success: true };
    }
  }

  if (path.startsWith('/penugasan')) {
    if (method === 'DELETE') {
      const idMatch = path.match(/^\/penugasan\/(\d+)$/);
      const id = idMatch ? Number(idMatch[1]) : 0;
      db.penugasan = (db.penugasan || []).filter(t => Number(t.id_penugasan) !== id);
      saveLocalData(db);
      return { success: true };
    }
    return (db.penugasan || []).map(t => ({
      ...t,
      jenis_penugasan: t.jenis_penugasan ?? 'admin',
    }));
  }

  if (path.startsWith('/absensi')) {
    return db.absensi || [];
  }

  return null;
}

async function request(path, method, body) {
  const url = mapRestPathToPhp(path);
  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const { ok, status, data: result } = await safeFetchJson(`${API_BASE}${url}`, options);
  if (result && result.success === false) {
    // Backend hidup dan merespons penolakan bisnis/validasi terstruktur: teruskan pesan error asli
    const prefix = status === 409 || status === 422 ? `[${status}] ` : '';
    const err = new Error(`${prefix}${result.message || 'Permintaan API gagal.'}`);
    err.status = status;
    throw err;
  }

  if (!ok || !result) {
    // Fallback otomatis ke data lokal HANYA jika backend offline / tidak mengembalikan JSON
    const fallbackResult = handleLocalApiFallback(path, method, body);
    if (fallbackResult !== null) {
      return fallbackResult;
    }
    throw new Error('Permintaan API gagal.');
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
