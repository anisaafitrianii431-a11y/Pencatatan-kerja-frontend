import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  User, 
  Briefcase, 
  ShieldCheck, 
  CheckCircle2, 
  UserPlus, 
  LogIn 
} from 'lucide-react';
import { AuthService } from '../../services/api';

export default function LoginPage({ onLoginSuccess, isBackendLive }) {
  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Form Fields - Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields - Register
  const [regNama, setRegNama] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regJabatan, setRegJabatan] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await AuthService.login(email.trim(), password);
      onLoginSuccess(res.data);
    } catch (err) {
      setError(err.message || 'Email atau kata sandi salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Kata sandi pribadi minimal 6 karakter demi keamanan akun.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.register({
        nama: regNama.trim(),
        email: regEmail.trim(),
        jabatan: regJabatan.trim() || 'Pekerja Lapangan',
        kata_sandi: regPassword
      });

      // Otomatis login dengan akun baru
      onLoginSuccess(res.data);
    } catch (err) {
      setError(err.message || 'Gagal mendaftarkan akun. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/25 mb-4 ring-4 ring-blue-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Sistem Pencatatan Kerja</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manajemen Jam Kerja, Kontribusi Pekerja, Pengeluaran & Payroll
          </p>
        </div>

        {/* Clean Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-7 sm:p-8 border border-slate-100">
          
          {/* Header Card */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {mode === 'login' ? 'Masuk ke Sistem' : 'Pendaftaran Akun Karyawan'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login' 
                ? 'Masukkan email dan kata sandi Anda untuk melanjutkan'
                : 'Buat akun mandiri dengan kata sandi pribadi Anda sendiri'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. FORM LOGIN                                            */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@jamkerja.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm font-medium transition placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm font-medium transition placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded-lg transition"
                    title={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Memvalidasi Akun...' : 'Masuk Sekarang'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Tautan Pindah ke Pendaftaran Mandiri */}
              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Belum memiliki akun kerja?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Daftar Karyawan Baru</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* 2. FORM PENDAFTARAN MANDIRI KARYAWAN                     */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                    placeholder="Contoh: Joko santoso"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs font-medium transition placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@email.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs font-medium transition placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Posisi / Jabatan
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={regJabatan}
                    onChange={(e) => setRegJabatan(e.target.value)}
                    placeholder="Contoh: Teknisi Listrik / Jaringan"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs font-medium transition placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kata Sandi *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 6 digit"
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs font-medium transition placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ulangi Sandi *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs font-medium transition placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Jaminan Privasi & Enkripsi */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Privasi Terjamin:</strong> Kata sandi Anda dienkripsi aman (Bcrypt). Administrator maupun pihak lain tidak dapat melihat kata sandi pribadi Anda.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Sekarang'}</span>
              </button>

              {/* Tautan Kembali ke Login */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          &copy; 2026 Sistem Pencatatan Kerja &bull; Hak Cipta Dilindungi
        </p>

      </div>
    </div>
  );
}
