import { useState } from 'react';
import { AuthService } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);

  const handleQuickLogin = async (targetUser) => {
    setError('');
    setLoading(true);
    try {
      const user = await AuthService.login(targetUser, '');
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Silakan masukkan username atau nama.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await AuthService.login(username, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-x-hidden font-sans select-none"
      style={{
        background: 'linear-gradient(180deg, #fde2b4 0%, #fba692 28%, #f05374 65%, #c81d58 100%)',
      }}
    >
      {/* ---------- Main Card Container ---------- */}
      <div
        className="w-full max-w-[1020px] rounded-[28px] overflow-hidden shadow-2xl relative transition-all"
        style={{
          boxShadow: '0 25px 60px -15px rgba(131, 24, 67, 0.4), 0 10px 30px rgba(0, 0, 0, 0.15)',
          background: '#ffffff',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          
          {/* ======================================================== */}
          {/* SISI KIRI (Berry Magenta dengan Kurva Melengkung Unik)   */}
          {/* ======================================================== */}
          <div
            className="lg:col-span-6 p-8 sm:p-10 md:p-12 text-white relative flex flex-col justify-between overflow-hidden"
            style={{
              backgroundColor: '#b81d52',
            }}
          >
            {/* Watermark Motif Daun Tropis / Siluet Bunga (Persis Nuansa Gambar) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              preserveAspectRatio="none"
            >
              {/* Siluet Daun Palm & Monstera */}
              <path
                d="M 50 80 Q 150 20 220 90 Q 280 160 200 240 Q 120 200 50 80 Z"
                fill="#ffffff"
              />
              <path
                d="M 280 20 Q 380 50 390 160 Q 320 220 250 140 Z"
                fill="#ffffff"
              />
              <path
                d="M 40 320 Q 120 250 220 300 Q 180 420 80 430 Z"
                fill="#ffffff"
              />
              <path
                d="M 260 320 Q 400 280 420 400 Q 310 490 220 410 Z"
                fill="#ffffff"
              />
              <path
                d="M -20 180 C 80 140, 160 220, 100 320 C 20 300, -20 240, -20 180 Z"
                fill="#ffffff"
              />
              <path
                d="M 340 120 C 440 140, 480 240, 390 310 C 330 260, 320 180, 340 120 Z"
                fill="#ffffff"
              />
            </svg>

            {/* Bagian Tengah-Bawah: Judul Dasbor & Login */}
            <div className="relative z-10 my-auto py-8 sm:py-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm mb-3.5 tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Ruang Kerja Digital</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.15]"
                style={{ color: '#ffffff' }}
              >
                Catat Kinerja,<br />Pantau Gaji Lebih Mudah.
              </h1>
              <p
                className="text-xs sm:text-sm mt-3.5 max-w-sm leading-relaxed font-normal"
                style={{ color: 'rgba(255, 255, 255, 0.88)' }}
              >
                Satu portal terpadu untuk presensi proyek, verifikasi jam kerja, dan transparansi slip upah bulanan yang akurat.
              </p>

              {/* Quick Profile Selection Drawer (jika tombol diklik) */}
              {showQuickModal && (
                <div
                  className="mt-5 p-3 rounded-2xl border border-white/20 max-w-md transition-all animate-fadeIn"
                  style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(10px)' }}
                >
                  <div className="text-[11px] font-semibold text-white/90 mb-2">
                    Masuk instan sekali klik:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('admin')}
                      disabled={loading}
                      className="p-2 rounded-xl text-left text-xs bg-white/10 hover:bg-white/25 text-white transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>👑</span>
                      <span className="truncate font-medium">Administrator</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('budi')}
                      disabled={loading}
                      className="p-2 rounded-xl text-left text-xs bg-white/10 hover:bg-white/25 text-white transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>👷</span>
                      <span className="truncate font-medium">Budi Santoso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('siti')}
                      disabled={loading}
                      className="p-2 rounded-xl text-left text-xs bg-white/10 hover:bg-white/25 text-white transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>👩‍💼</span>
                      <span className="truncate font-medium">Siti Rahma</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('agus')}
                      disabled={loading}
                      className="p-2 rounded-xl text-left text-xs bg-white/10 hover:bg-white/25 text-white transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>🔧</span>
                      <span className="truncate font-medium">Agus Setiawan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer kiri */}
            <div className="relative z-10 text-[11px] text-white/60">
              © 2026 Pencatatan Kerja. Terintegrasi & Terenkripsi.
            </div>

            {/* Kurva Melengkung Cantik ke Arah Sisi Kanan (Khusus layar Desktop) */}
            <div
              className="hidden lg:block absolute -top-4 -bottom-4 -right-16 w-32 pointer-events-none z-20"
              style={{
                overflow: 'visible',
              }}
            >
              <svg
                viewBox="0 0 100 500"
                preserveAspectRatio="none"
                className="w-full h-full text-[#b81d52]"
                style={{ fill: '#b81d52' }}
              >
                <path d="M 0,0 Q 110,250 0,500 L 0,0 Z" />
              </svg>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SISI KANAN (Formulir Putih Bersih / Clean Off-White)     */}
          {/* ======================================================== */}
          <div
            className="lg:col-span-6 p-8 sm:p-12 md:p-14 flex flex-col justify-center relative z-10"
            style={{
              backgroundColor: '#f6f7fa',
            }}
          >
            {/* Logo Projek (Gaya WebKreeda: Badge Bulat & Teks Bersih) */}
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-md"
                  style={{ backgroundColor: '#0284c7' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-sky-700 tracking-tight leading-none">
                    Pencatatan<span className="text-slate-800">Kerja</span>
                  </div>
                  <div className="text-[9px] font-semibold tracking-widest text-slate-500 uppercase">
                    Sistem Presensi & Penggajian
                  </div>
                </div>
              </div>
            </div>

            {/* Judul Form: WELCOME BACK! */}
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                WELCOME BACK!
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                Please login to view your dashboard
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-600 text-center font-medium">
                {error}
              </div>
            )}

            {/* Form Input Sesuai Gambar */}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full">
              {/* Input User Name (Garis Tepi Magenta/Berry) */}
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="User Name"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition shadow-sm"
                  style={{
                    border: '1.5px solid #c2416c',
                  }}
                />
              </div>

              {/* Input Password (Garis Tepi Magenta/Berry) */}
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-lg bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition shadow-sm"
                  style={{
                    border: '1.5px solid #c2416c',
                  }}
                />
              </div>

              {/* Row: Checkbox 'Keep me logged in' & 'Forgot password? Reset now' */}
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-600 pt-0.5">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#b81d52] focus:ring-[#b81d52] cursor-pointer"
                  />
                  <span>Keep me logged in</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickModal(true)}
                  className="text-slate-600 hover:text-[#b81d52] transition font-medium cursor-pointer"
                >
                  Forgot password? <span className="underline">Reset now</span>
                </button>
              </div>

              {/* Tombol LOGIN (Warna Merah Magenta Pekat Sesuai Gambar) */}
              <div className="pt-3 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-12 py-2.5 rounded-md text-sm font-bold text-white tracking-widest uppercase transition-all duration-200 transform hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md"
                  style={{
                    backgroundColor: '#b81d52',
                  }}
                >
                  {loading ? 'PROCESSING...' : 'LOGIN'}
                </button>
              </div>

              {/* Quick Login Baris Cepat (Akses Ringkas) */}
              <div className="pt-4 border-t border-slate-200/80">
                <div className="text-center text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                  Atau Masuk Cepat Sebagai:
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    disabled={loading}
                    className="px-2.5 py-1 rounded text-[11px] bg-slate-100 hover:bg-[#b81d52] hover:text-white text-slate-700 transition font-medium cursor-pointer"
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('budi')}
                    disabled={loading}
                    className="px-2.5 py-1 rounded text-[11px] bg-slate-100 hover:bg-[#b81d52] hover:text-white text-slate-700 transition font-medium cursor-pointer"
                  >
                    👷 Budi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('siti')}
                    disabled={loading}
                    className="px-2.5 py-1 rounded text-[11px] bg-slate-100 hover:bg-[#b81d52] hover:text-white text-slate-700 transition font-medium cursor-pointer"
                  >
                    👩‍💼 Siti
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('agus')}
                    disabled={loading}
                    className="px-2.5 py-1 rounded text-[11px] bg-slate-100 hover:bg-[#b81d52] hover:text-white text-slate-700 transition font-medium cursor-pointer"
                  >
                    🔧 Agus
                  </button>
                </div>
              </div>

              {/* Disclaimer Teks Kecil Sesuai Referensi Gambar */}
              <p className="text-[10px] text-slate-400 text-center leading-relaxed pt-2">
                By signing in you accept all our terms and conditions, privacy policy and cookie policy. Data absensi dan penggajian tersimpan secara aman.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
