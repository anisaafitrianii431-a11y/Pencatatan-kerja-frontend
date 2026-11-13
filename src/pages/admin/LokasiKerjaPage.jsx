import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  UploadCloud,
  Trash2,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  RefreshCw,
} from 'lucide-react';
import { getPekerjaan, updatePekerjaan } from '../../services/pekerjaanApi';
import {
  formatCoordPair,
  getGoogleMapsUrl,
  parseCoordinates,
} from '../../utils/geoLocation';

function parseEmployeeIds(raw) {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter((v) => Number.isFinite(v) && v > 0);
  }
  return String(raw || '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
}

/**
 * LokasiKerjaPage — Form Admin untuk mengatur titik koordinat GPS proyek
 * untuk verifikasi lokasi absensi lapangan pekerja.
 */
export default function LokasiKerjaPage() {
  const [listPekerjaan, setListPekerjaan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    foto_lokasi: null,
    fotoPreview: null,
  });
  const [pesan, setPesan] = useState(null);
  const fileInputRef = useRef();

  const applyJobToForm = (pj) => {
    const parsed = parseCoordinates(pj?.titik_lokasi);
    setForm({
      latitude: parsed ? String(parsed.lat) : '',
      longitude: parsed ? String(parsed.lng) : '',
      foto_lokasi: null,
      fotoPreview: null,
    });
  };

  const loadJobs = async (preserveSelectedId = null) => {
    setLoading(true);
    try {
      const rows = await getPekerjaan();
      setListPekerjaan(rows);
      const nextSelected =
        rows.find((r) => r.id_pekerjaan === (preserveSelectedId ?? selectedId)) ||
        rows[0] ||
        null;
      setSelectedId(nextSelected?.id_pekerjaan ?? null);
      if (nextSelected) {
        applyJobToForm(nextSelected);
      }
    } catch (err) {
      setPesan({
        type: 'error',
        text: err.message || 'Gagal memuat daftar pekerjaan dari server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPekerjaan = listPekerjaan.find((p) => p.id_pekerjaan === selectedId);

  function handlePilihPekerjaan(id) {
    const pj = listPekerjaan.find((p) => p.id_pekerjaan === id);
    setSelectedId(id);
    applyJobToForm(pj);
    setPesan(null);
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleAmbilGpsPerangkat() {
    if (!navigator.geolocation) {
      setPesan({ type: 'error', text: 'Browser ini tidak mendukung deteksi GPS.' });
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setDetectingGps(false);
      },
      () => {
        setPesan({
          type: 'error',
          text: 'Gagal membaca lokasi GPS perangkat. Pastikan izin lokasi diaktifkan.',
        });
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function handleFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({
        ...prev,
        foto_lokasi: file,
        fotoPreview: ev.target.result,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleHapusFoto() {
    setForm((prev) => ({ ...prev, foto_lokasi: null, fotoPreview: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSimpan(e) {
    e.preventDefault();
    if (!selectedPekerjaan) return;

    const coordPair = `${String(form.latitude || '').trim()}, ${String(form.longitude || '').trim()}`;
    const parsed = parseCoordinates(coordPair);
    if (!parsed) {
      setPesan({
        type: 'error',
        text: 'Latitude dan Longitude wajib valid (contoh Latitude: -0.906661, Longitude: 100.361413).',
      });
      return;
    }

    const titik_lokasi = formatCoordPair(parsed.lat, parsed.lng);
    setSaving(true);
    setPesan(null);
    try {
      await updatePekerjaan(selectedPekerjaan.id_pekerjaan, {
        nama_pekerjaan: selectedPekerjaan.nama_pekerjaan,
        deskripsi: selectedPekerjaan.deskripsi || '',
        lokasi: selectedPekerjaan.lokasi || '',
        titik_lokasi,
        tanggal_mulai: selectedPekerjaan.tanggal_mulai || null,
        target_selesai: selectedPekerjaan.target_selesai || null,
        status: selectedPekerjaan.status || 'berjalan',
        metode_penentuan: selectedPekerjaan.metode_penentuan || 'terbuka',
        id_karyawan_list: parseEmployeeIds(selectedPekerjaan.id_karyawan_list),
      });

      setListPekerjaan((prev) =>
        prev.map((pj) =>
          pj.id_pekerjaan === selectedPekerjaan.id_pekerjaan
            ? { ...pj, titik_lokasi }
            : pj,
        ),
      );
      setPesan({
        type: 'success',
        text: `Titik lokasi GPS (${titik_lokasi}) berhasil disimpan ke database proyek!`,
      });
    } catch (err) {
      setPesan({
        type: 'error',
        text: err.message || 'Gagal menyimpan titik lokasi ke server.',
      });
    } finally {
      setSaving(false);
    }
  }

  const mapsUrl = getGoogleMapsUrl(`${form.latitude}, ${form.longitude}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
            <span>Manajemen Presensi &amp; GPS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <MapPin className="w-7 h-7 text-blue-600" />
            <span>Lokasi Kerja &amp; Titik Presensi</span>
          </h1>
          <p className="text-sm text-slate-500">
            Tentukan titik koordinat GPS setiap proyek sebagai acuan persetujuan absensi pekerja lapangan (toleransi 150 meter).
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadJobs(selectedId)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Grid Konten */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Kiri: Daftar Pekerjaan */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Daftar Pekerjaan</span>
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {listPekerjaan.length} Proyek
            </span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {loading ? (
              <p className="py-8 text-center text-xs text-slate-400">Memuat daftar proyek...</p>
            ) : listPekerjaan.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada data pekerjaan.</p>
            ) : (
              listPekerjaan.map((pj) => {
                const isSelected = selectedId === pj.id_pekerjaan;
                const parsed = parseCoordinates(pj.titik_lokasi);
                return (
                  <button
                    key={pj.id_pekerjaan}
                    type="button"
                    onClick={() => handlePilihPekerjaan(pj.id_pekerjaan)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col space-y-1.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                        {pj.nama_pekerjaan}
                      </span>
                      {parsed ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                          GPS Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 shrink-0">
                          Belum Ada
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {pj.lokasi || 'Alamat proyek belum diisi'}
                    </p>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-mono">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {parsed ? pj.titik_lokasi : 'Koordinat belum disetel'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Kanan: Form Detail Lokasi */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>Detail Titik Lokasi</span>
              </h2>
              {selectedPekerjaan && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Proyek aktif: <strong className="text-slate-700">{selectedPekerjaan.nama_pekerjaan}</strong>
                </p>
              )}
            </div>

            {selectedPekerjaan && (
              <button
                type="button"
                onClick={handleAmbilGpsPerangkat}
                disabled={detectingGps}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{detectingGps ? 'Mendeteksi...' : 'Gunakan GPS Saat Ini'}</span>
              </button>
            )}
          </div>

          {!selectedPekerjaan ? (
            <div className="p-10 text-center text-slate-400">
              <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Pilih pekerjaan terlebih dahulu di panel sebelah kiri.</p>
            </div>
          ) : (
            <form onSubmit={handleSimpan} className="space-y-4">
              {/* Notifikasi */}
              {pesan && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
                    pesan.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {pesan.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pesan.text}</span>
                </div>
              )}

              {/* Koordinat GPS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="latitude" className="block text-xs font-semibold text-slate-700 mb-1">
                    Latitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="latitude"
                    name="latitude"
                    type="text"
                    placeholder="Contoh: -0.906661"
                    value={form.latitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 font-mono text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="block text-xs font-semibold text-slate-700 mb-1">
                    Longitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="longitude"
                    name="longitude"
                    type="text"
                    placeholder="Contoh: 100.361413"
                    value={form.longitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 font-mono text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Tombol Buka Maps */}
              {mapsUrl && (
                <div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lihat Lokasi di Google Maps</span>
                  </a>
                </div>
              )}

              {/* Pratinjau Foto Referensi Lokasi */}
              <div>
                <label
                  htmlFor="input-foto-lokasi"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Pratinjau Foto Referensi Area (Opsional)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition min-h-[120px]"
                >
                  {form.fotoPreview ? (
                    <div className="w-full relative">
                      <img
                        src={form.fotoPreview}
                        alt="Preview lokasi"
                        className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">Klik untuk pilih foto pratinjau lokasi</p>
                      <p className="text-[11px] text-slate-400">Hanya koordinat GPS yang disimpan ke database proyek.</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFoto}
                  id="input-foto-lokasi"
                />
                {form.fotoPreview && (
                  <button
                    type="button"
                    onClick={handleHapusFoto}
                    className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto Pratinjau</span>
                  </button>
                )}
              </div>

              {/* Info Tambahan */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    <strong>Jadwal Proyek:</strong> {selectedPekerjaan.tanggal_mulai || '—'} s/d{' '}
                    {selectedPekerjaan.target_selesai || '—'}
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Deskripsi:</strong> {selectedPekerjaan.deskripsi || 'Tidak ada deskripsi tambahan.'}
                  </span>
                </div>
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Titik Lokasi Kerja'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
