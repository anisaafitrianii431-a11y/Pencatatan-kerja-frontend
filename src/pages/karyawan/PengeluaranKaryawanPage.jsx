import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Upload,
  Camera,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Sparkles,
  RefreshCw,
  Edit3,
  Trash2,
  Lock,
  Wallet,
  User,
  Send,
  RotateCcw,
  Clock,
  Search
} from 'lucide-react';
import { PengeluaranService, PekerjaanService } from '../../services/api';
import { compressImage, formatBytes } from '../../utils/imageCompressor';
import Modal from '../../components/Modal';

export default function PengeluaranKaryawanPage({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'uang-kantor' ? 'uang-kantor' : 'riwayat'
  );
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [kantorOutflowsList, setKantorOutflowsList] = useState([]);
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [kasTersediaList, setKasTersediaList] = useState([]);
  const [kasSayaList, setKasSayaList] = useState([]);
  const [pengembalianSaya, setPengembalianSaya] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter Pertanggungjawaban Uang Kantor
  const [kantorSearch, setKantorSearch] = useState('');
  const [kantorAuditFilter, setKantorAuditFilter] = useState('semua');

  // Modal Input Pengeluaran
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingOriginItem, setEditingOriginItem] = useState(null);
  const [formJobId, setFormJobId] = useState('');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formNominal, setFormNominal] = useState('');
  const [formJenisDana, setFormJenisDana] = useState('pribadi');
  const [formIdKas, setFormIdKas] = useState('');
  const [kasSelectTouched, setKasSelectTouched] = useState(false);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal Detail Nota Uang Keluar Tim & Setor Sisa (khusus bila ditugaskan Admin sebagai PJ)
  const [detailKasPj, setDetailKasPj] = useState(null);
  const [setorModalKas, setSetorModalKas] = useState(null);
  const [setorNominal, setSetorNominal] = useState('');
  const [setorTanggal, setSetorTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [setorKeterangan, setSetorKeterangan] = useState('');
  const [setorFile, setSetorFile] = useState(null);
  const [setorPreview, setSetorPreview] = useState('');
  const [setorError, setSetorError] = useState('');
  const [setorSubmitting, setSetorSubmitting] = useState(false);

  // Refs untuk kamera, tablist, dan fokus validasi form
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment'); // Default kamera belakang untuk nota
  const [loadingCamera, setLoadingCamera] = useState(false);
  const videoRef = useRef(null);
  const cameraInputRef = useRef(null);
  const kasSelectRef = useRef(null);
  const tabRiwayatRef = useRef(null);
  const tabUangKantorRef = useRef(null);

  // Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const kId = Number(currentUser?.id_karyawan || 0);

  useEffect(() => {
    if (searchParams.get('tab') === 'uang-kantor') {
      setActiveTab('uang-kantor');
    }
  }, [searchParams]);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'uang-kantor') {
      setSearchParams({ tab: 'uang-kantor' }, { replace: true });
    } else if (searchParams.has('tab')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleTabKeyDown = (e) => {
    const order = ['riwayat', 'uang-kantor'];
    const refs = { riwayat: tabRiwayatRef, 'uang-kantor': tabUangKantorRef };
    const idx = order.indexOf(activeTab);
    let nextTab = null;

    if (e.key === 'ArrowRight') nextTab = order[(idx + 1) % order.length];
    else if (e.key === 'ArrowLeft') nextTab = order[(idx - 1 + order.length) % order.length];
    else if (e.key === 'Home') nextTab = order[0];
    else if (e.key === 'End') nextTab = order[order.length - 1];

    if (nextTab) {
      e.preventDefault();
      handleSelectTab(nextTab);
      refs[nextTab]?.current?.focus();
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    return `/api/${path.replace(/^\/+/, '')}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let [expenses, kantorExpenses, jobs, kasData] = await Promise.all([
        PengeluaranService.getAll({ id_karyawan: currentUser?.id_karyawan }),
        PengeluaranService.getAll({ id_karyawan: currentUser?.id_karyawan, jenis_dana: 'kantor', include_kas_pj: 1 }),
        PekerjaanService.getAll(currentUser?.id_karyawan),
        PengeluaranService.getKasTersedia(currentUser?.id_karyawan).catch(() => ({
          daftar_kas: [],
          kas_tanggung_jawab_saya: [],
          pengembalian_saya: []
        }))
      ]);

      // Jika belum ada proyek yang ditugaskan khusus, muat seluruh proyek aktif agar pekerja tetap bisa mencatat pengeluaran
      if (!jobs || jobs.length === 0) {
        try {
          const allJobs = await PekerjaanService.getAll();
          if (allJobs && allJobs.length > 0) {
            jobs = allJobs;
          }
        } catch {
          // ignore
        }
      }

      setPengeluaranList(expenses || []);
      setKantorOutflowsList(kantorExpenses || []);
      setPekerjaanList(jobs || []);
      setKasTersediaList(kasData?.daftar_kas || []);
      setKasSayaList(kasData?.kas_tanggung_jawab_saya || []);
      setPengembalianSaya(kasData?.pengembalian_saya || []);

      if (jobs && jobs.length > 0 && !formJobId) {
        setFormJobId(jobs[0].id_pekerjaan);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat catatan pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Bersihkan stream kamera saat unmount atau modal tertutup
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (!isModalOpen && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setIsCameraActive(false);
    }
  }, [isModalOpen, cameraStream]);

  // Helper memproses dan mengompresi file gambar (dari galeri maupun kamera)
  const processImageFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError('Format file harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    setModalError('');
    setCompressing(true);
    try {
      // Kompres otomatis gambar kuitansi menggunakan Canvas API
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      setSelectedFile(compressed);
      setFilePreview(URL.createObjectURL(compressed));

      const savedPercent = Math.round(((file.size - compressed.size) / file.size) * 100);
      setCompressionStats({
        originalSize: formatBytes(file.size),
        compressedSize: formatBytes(compressed.size),
        savedPercent: savedPercent > 0 ? savedPercent : 0
      });
    } catch (err) {
      console.warn('Gagal kompres gambar di browser, menggunakan file asli:', err);
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setCompressionStats(null);
    } finally {
      setCompressing(false);
    }
  };

  // Handler Upload File dari input galeri / kamera native
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  // Handler Buka Kamera Live
  const handleOpenCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback ke native input capture="environment" pada browser tanpa support live stream
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
      return;
    }

    setIsCameraActive(true);
    setLoadingCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Gagal akses live stream webcam, menggunakan native camera fallback:', err);
      setIsCameraActive(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    } finally {
      setLoadingCamera(false);
    }
  };

  // Jepret foto dari video feed kamera
  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `kuitansi_kamera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        processImageFile(file);
      }
      handleCloseCamera();
    }, 'image/jpeg', 0.88);
  };

  // Tutup dan matikan kamera
  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setLoadingCamera(false);
  };

  // Ganti kamera depan / belakang
  const handleToggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setLoadingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Gagal ganti arah kamera:', err);
    } finally {
      setLoadingCamera(false);
    }
  };

  // Daftar kas kantor disetujui yang cocok dengan proyek yang dipilih pada form (tanpa menampilkan nominal saldo)
  const selectableKasList = useMemo(() => {
    return kasTersediaList.filter(k =>
      (k.status_verifikasi || 'disetujui') === 'disetujui' &&
      (k.id_pekerjaan === null || !formJobId || String(k.id_pekerjaan) === String(formJobId))
    );
  }, [kasTersediaList, formJobId]);

  const pjCountsInSelect = useMemo(() => {
    const map = new Map();
    selectableKasList.forEach(k => {
      const key = String(k.id_karyawan);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [selectableKasList]);

  const selectedKasObj = useMemo(() => {
    if (!formIdKas) return null;
    return selectableKasList.find(k => String(k.id_kas) === String(formIdKas)) || null;
  }, [selectableKasList, formIdKas]);

  // Auto-pilih kas kantor jika hanya ada 1 opsi atau 1 kas milik PJ sendiri saat proyek/jenis berubah
  useEffect(() => {
    if (formJenisDana !== 'kantor') return;
    if (formIdKas && selectableKasList.some(k => String(k.id_kas) === String(formIdKas))) {
      return;
    }
    const ownKas = selectableKasList.filter(k => Number(k.id_karyawan) === Number(currentUser?.id_karyawan));
    if (ownKas.length === 1) {
      setFormIdKas(String(ownKas[0].id_kas));
    } else if (selectableKasList.length === 1) {
      setFormIdKas(String(selectableKasList[0].id_kas));
    } else {
      setFormIdKas('');
    }
  }, [formJenisDana, formJobId, selectableKasList, currentUser]);

  // Data pertanggungjawaban uang keluar khusus Uang Kantor
  const approvedPjList = useMemo(
    () => kasSayaList.filter(k => Number(k.id_karyawan) === kId && (k.status_verifikasi || 'disetujui') === 'disetujui'),
    [kasSayaList, kId]
  );

  const filteredKantorOutflows = useMemo(() => {
    const q = kantorSearch.trim().toLowerCase();
    return kantorOutflowsList.filter(p => {
      if (kantorAuditFilter !== 'semua' && p.status_verifikasi !== kantorAuditFilter) return false;
      if (q) {
        const jobTitle = (p.nama_pekerjaan || '').toLowerCase();
        const ket = (p.keterangan || '').toLowerCase();
        const pj = (p.nama_penanggung_jawab || '').toLowerCase();
        const buyer = (p.nama_karyawan || '').toLowerCase();
        if (!jobTitle.includes(q) && !ket.includes(q) && !pj.includes(q) && !buyer.includes(q) && !`kas #${p.id_kas}`.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [kantorOutflowsList, kantorAuditFilter, kantorSearch]);

  const kantorSummary = useMemo(() => {
    let totalAktif = 0;
    let totalDisetujui = 0;
    let totalMenunggu = 0;
    let disetujuiCount = 0;
    let menungguCount = 0;
    let ditolakCount = 0;

    kantorOutflowsList.forEach(p => {
      const nom = Number(p.nominal) || 0;
      if (p.status_verifikasi === 'disetujui') {
        totalAktif += nom;
        totalDisetujui += nom;
        disetujuiCount += 1;
      } else if (p.status_verifikasi === 'menunggu') {
        totalAktif += nom;
        totalMenunggu += nom;
        menungguCount += 1;
      } else if (p.status_verifikasi === 'ditolak') {
        ditolakCount += 1;
      }
    });

    return { totalAktif, totalDisetujui, totalMenunggu, disetujuiCount, menungguCount, ditolakCount };
  }, [kantorOutflowsList]);

  const handleOpenSetorModal = (kas) => {
    const maks = Math.max(0, Number(kas.sisa_resmi || 0) - Number(kas.menunggu_konfirmasi_kembali || 0));
    setSetorModalKas({ ...kas, maksSetor: maks });
    setSetorNominal(maks > 0 ? String(maks) : '');
    setSetorTanggal(new Date().toISOString().slice(0, 10));
    setSetorKeterangan(`Pengembalian sisa dana ${kas.nama_pekerjaan || 'operasional'}`);
    setSetorFile(null);
    setSetorPreview('');
    setSetorError('');
    setSetorSubmitting(false);
  };

  const handleSetorFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSetorError('File bukti pengembalian harus berupa gambar.');
      return;
    }
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      setSetorFile(compressed);
      setSetorPreview(URL.createObjectURL(compressed));
    } catch {
      setSetorFile(file);
      setSetorPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleSubmitSetorSisa = async (e) => {
    e.preventDefault();
    if (!setorModalKas) return;
    setSetorError('');

    const nom = Number(setorNominal);
    if (!nom || nom <= 0) {
      setSetorError('Nominal pengembalian sisa harus lebih dari Rp 0.');
      document.getElementById('emp-setor-nominal')?.focus();
      return;
    }
    if (nom > setorModalKas.maksSetor + 0.01) {
      setSetorError(`Nominal melebihi batas sisa yang dapat disetor (${formatRupiah(setorModalKas.maksSetor)}).`);
      document.getElementById('emp-setor-nominal')?.focus();
      return;
    }

    setSetorSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('id_kas', setorModalKas.id_kas);
      fd.append('tanggal', setorTanggal);
      fd.append('nominal', nom);
      fd.append('keterangan', setorKeterangan);
      if (setorFile) {
        fd.append('bukti_foto', setorFile);
      }
      await PengeluaranService.setorSisaKas(fd);
      setSuccessMsg('Pengajuan pengembalian sisa dana dikirim ke Admin untuk dikonfirmasi!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setSetorModalKas(null);
      loadData();
    } catch (err) {
      setSetorError(err.message || 'Gagal mengirim pengajuan pengembalian sisa dana.');
    } finally {
      setSetorSubmitting(false);
    }
  };

  const resolveProjectName = (p) => (
    p.nama_pekerjaan && p.nama_pekerjaan !== 'Unknown'
      ? p.nama_pekerjaan
      : (pekerjaanList.find(j => Number(j.id_pekerjaan) === Number(p.id_pekerjaan))?.nama_pekerjaan || (p.id_pekerjaan ? `Proyek #${p.id_pekerjaan}` : '-'))
  );

  const renderAuditBadge = (status) => {
    if (status === 'disetujui') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1 w-fit">
          <CheckCircle2 className="w-3 h-3" />
          <span>Disetujui</span>
        </span>
      );
    }
    if (status === 'ditolak') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center space-x-1 w-fit">
          <XCircle className="w-3 h-3" />
          <span>Ditolak</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center space-x-1 w-fit">
        <Clock className="w-3 h-3" />
        <span>Menunggu</span>
      </span>
    );
  };

  const renderNotaButton = (p) => (
    p.foto_kwitansi ? (
      <button
        type="button"
        onClick={() => setPreviewImage(getImageUrl(p.foto_kwitansi))}
        aria-label={`Lihat bukti kuitansi untuk ${p.keterangan || resolveProjectName(p)}`}
        className="inline-flex items-center space-x-1 min-h-[28px] px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5 text-blue-600" />
        <span>Lihat Nota</span>
      </button>
    ) : (
      <span className="text-slate-300 italic text-[11px]">Tanpa Foto</span>
    )
  );

  const resetForm = () => {
    setEditingId(null);
    setEditingOriginItem(null);
    setFormNominal('');
    setFormKeterangan('');
    setFormJenisDana('pribadi');
    setFormIdKas('');
    setKasSelectTouched(false);
    setFormTanggal(new Date().toISOString().slice(0, 10));
    setSelectedFile(null);
    setFilePreview('');
    setCompressionStats(null);
    setModalError('');
    setSubmitting(false);
    handleCloseCamera();
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (pekerjaanList.length > 0) {
      setFormJobId(pekerjaanList[0].id_pekerjaan);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    if (Number(p.id_karyawan) !== Number(currentUser?.id_karyawan)) {
      alert('Anda hanya dapat melihat rincian belanja rekan pada kas Anda.');
      return;
    }
    if (p.status_verifikasi === 'disetujui' || (p.jenis_dana === 'pribadi' && p.status_ganti === 'sudah')) {
      alert('Pengeluaran yang telah diverifikasi (disetujui) atau sudah dikembalikan tidak dapat diubah untuk mencegah risiko kecurangan.');
      return;
    }
    setEditingId(p.id_pengeluaran);
    setEditingOriginItem(p);
    setFormJobId(p.id_pekerjaan);
    setFormTanggal(p.tanggal);
    setFormNominal(p.nominal);
    setFormJenisDana(p.jenis_dana);
    setFormIdKas(p.id_kas ? String(p.id_kas) : '');
    setKasSelectTouched(false);
    setFormKeterangan(p.keterangan || '');
    setSelectedFile(null);
    setFilePreview(p.foto_kwitansi ? getImageUrl(p.foto_kwitansi) : '');
    setCompressionStats(null);
    setModalError('');
    setSubmitting(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (p) => {
    if (Number(p.id_karyawan) !== Number(currentUser?.id_karyawan)) {
      alert('Anda tidak dapat menghapus catatan milik rekan.');
      return;
    }
    if (p.status_verifikasi === 'disetujui' || (p.jenis_dana === 'pribadi' && p.status_ganti === 'sudah')) {
      alert('Pengeluaran yang telah diverifikasi (disetujui) atau sudah dikembalikan tidak dapat dihapus.');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) {
      return;
    }
    try {
      await PengeluaranService.delete(p.id_pengeluaran);
      setSuccessMsg('Catatan pengeluaran berhasil dihapus!');
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghapus catatan pengeluaran');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formJobId) {
      setModalError('Pilih proyek pekerjaan terkait.');
      return;
    }

    if (!formNominal || Number(formNominal) <= 0) {
      setModalError('Nominal pengeluaran harus lebih besar dari 0.');
      return;
    }

    if (formJenisDana === 'kantor') {
      setKasSelectTouched(true);
      if (!formIdKas || !selectedKasObj) {
        setModalError('Pilih penanggung jawab uang kantor terlebih dahulu.');
        kasSelectRef.current?.focus();
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id_pekerjaan', formJobId);
      formData.append('id_karyawan', currentUser?.id_karyawan);
      formData.append('tanggal', formTanggal);
      formData.append('nominal', formNominal);
      formData.append('jenis_dana', formJenisDana);
      if (formJenisDana === 'kantor' && formIdKas) {
        formData.append('id_kas', formIdKas);
      }
      formData.append('keterangan', formKeterangan);
      if (selectedFile) {
        formData.append('foto_kwitansi', selectedFile);
      }

      if (editingId) {
        formData.append('id_pengeluaran', editingId);
        await PengeluaranService.update(editingId, formData);
        setSuccessMsg('Catatan pengeluaran berhasil diperbarui dan diajukan ulang ke admin!');
      } else {
        await PengeluaranService.create(formData);
        setSuccessMsg('Pengeluaran berhasil dicatat dan diajukan ke admin!');
      }

      setIsModalOpen(false);
      resetForm();
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setModalError(err.message || 'Gagal menyimpan pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mb-1">
            <span>Pengeluaran Pribadi & Kantor</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Receipt className="w-7 h-7 text-blue-600" />
            <span>Pencatatan Pengeluaran & Kuitansi</span>
          </h1>
          <p className="text-sm text-slate-500">
            Catat nota belanja material atau operasional proyek. Lampirkan foto kuitansi dengan kompresi otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            aria-label="Segarkan data pengeluaran"
            className="p-2.5 min-h-[40px] min-w-[40px] text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-xl transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center space-x-3 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Navigasi Single-Row */}
      <div
        role="tablist"
        aria-label="Menu Pengeluaran Karyawan"
        onKeyDown={handleTabKeyDown}
        className="flex flex-nowrap overflow-x-auto border-b border-slate-200 gap-x-6 text-sm font-bold"
      >
        <button
          ref={tabRiwayatRef}
          id="tab-riwayat"
          type="button"
          role="tab"
          aria-selected={activeTab === 'riwayat'}
          tabIndex={activeTab === 'riwayat' ? 0 : -1}
          onClick={() => handleSelectTab('riwayat')}
          className={`pb-3 border-b-2 flex items-center space-x-2 whitespace-nowrap shrink-0 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
            activeTab === 'riwayat'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Riwayat Pengeluaran Saya ({pengeluaranList.length})</span>
        </button>

        <button
          ref={tabUangKantorRef}
          id="tab-uang-kantor"
          type="button"
          role="tab"
          aria-selected={activeTab === 'uang-kantor'}
          tabIndex={activeTab === 'uang-kantor' ? 0 : -1}
          onClick={() => handleSelectTab('uang-kantor')}
          className={`pb-3 border-b-2 flex items-center space-x-2 whitespace-nowrap shrink-0 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
            activeTab === 'uang-kantor'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Pertanggungjawaban Uang Kantor ({kantorOutflowsList.length})</span>
        </button>
      </div>

      {/* Tab Panel 1: Riwayat Pengeluaran Saya */}
      <div role="tabpanel" aria-labelledby="tab-riwayat" hidden={activeTab !== 'riwayat'}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 id="riwayat-pengeluaran-heading" className="font-bold text-slate-800 text-sm">Riwayat Pengeluaran &amp; Kuitansi Saya</h2>
              <p className="text-xs text-slate-400">Daftar seluruh nota belanja (Uang Pribadi &amp; Uang Kantor) yang Anda ajukan</p>
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              {pengeluaranList.length} Transaksi
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-sm">Memuat catatan pengeluaran...</p>
            </div>
          ) : pengeluaranList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Belum ada catatan pengeluaran.</p>
              <p className="text-xs text-slate-400 mt-1">Gunakan tombol &quot;+ Catat Pengeluaran Baru&quot; untuk mengajukan nota belanja.</p>
            </div>
          ) : (
            <div
              role="region"
              tabIndex={0}
              aria-labelledby="riwayat-pengeluaran-heading"
              className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <caption className="sr-only">Daftar riwayat pengeluaran pribadi dan uang kantor karyawan</caption>
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th scope="col" className="py-3 px-3">Tanggal</th>
                    <th scope="col" className="py-3 px-3">Proyek</th>
                    <th scope="col" className="py-3 px-3">Keterangan</th>
                    <th scope="col" className="py-3 px-3">Sumber Dana &amp; PJ</th>
                    <th scope="col" className="py-3 px-3 text-right">Nominal</th>
                    <th scope="col" className="py-3 px-3 text-center">Bukti Nota</th>
                    <th scope="col" className="py-3 px-3">Status Audit</th>
                    <th scope="col" className="py-3 px-3">Keterangan Dana</th>
                    <th scope="col" className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pengeluaranList.map((p) => {
                    const isOwner = Number(p.id_karyawan) === kId;
                    const isLocked = !isOwner || p.status_verifikasi === 'disetujui' || (p.jenis_dana === 'pribadi' && p.status_ganti === 'sudah');

                    return (
                      <tr key={p.id_pengeluaran} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          {p.tanggal}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 min-w-[160px] max-w-[240px] leading-snug">
                          {resolveProjectName(p)}
                        </td>
                        <td className="py-3 px-3 min-w-[140px] max-w-[220px] leading-snug">
                          <span className="text-slate-700 font-medium">
                            {p.keterangan}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {p.jenis_dana === 'pribadi' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Dana Pribadi (Reimburs)
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                                Dana Kantor
                              </span>
                              {p.nama_penanggung_jawab && (
                                <div className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                                  <User className="w-3 h-3 text-blue-500" />
                                  <span>PJ: {p.nama_penanggung_jawab}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                          {formatRupiah(p.nominal)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {renderNotaButton(p)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderAuditBadge(p.status_verifikasi)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {p.jenis_dana === 'pribadi' ? (
                            p.status_ganti === 'sudah' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Sudah Dikembalikan
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Pengembalian Dana
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50/70 px-2 py-0.5 rounded-full border border-blue-100">
                              {p.id_kas ? `Kas #${p.id_kas}` : 'LPJ Uang Kantor'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          {isLocked ? (
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-400 text-[11px] font-medium cursor-not-allowed border border-slate-200"
                              title={!isOwner ? 'Catatan ini diinput oleh rekan pada kas Anda' : 'Terkunci: Pengeluaran yang sudah disetujui / dikembalikan tidak dapat diubah atau dihapus.'}
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>{!isOwner ? 'Dari Rekan' : 'Terkunci'}</span>
                            </span>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(p)}
                                aria-label={`Edit pengeluaran ${p.keterangan || p.id_pengeluaran}`}
                                title="Edit Catatan Pengeluaran"
                                className="p-1.5 min-h-[28px] min-w-[28px] rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer shadow-xs"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(p)}
                                aria-label={`Hapus pengeluaran ${p.keterangan || p.id_pengeluaran}`}
                                title="Hapus Catatan Pengeluaran"
                                className="p-1.5 min-h-[28px] min-w-[28px] rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer shadow-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tab Panel 2: Pertanggungjawaban Uang Keluar (Uang Kantor) */}
      <div role="tabpanel" aria-labelledby="tab-uang-kantor" hidden={activeTab !== 'uang-kantor'}>
        <div className="space-y-5">
          {/* Info Singkat */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
            <Wallet className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pertanggungjawaban Uang Keluar Menggunakan Uang Kantor</p>
              <p className="text-blue-700 mt-0.5 leading-relaxed">
                Menampilkan rincian uang keluar yang menggunakan dana Uang Kantor beserta penanggung jawab dan status audit dari Admin.
              </p>
            </div>
          </div>

          {/* 3 Ringkasan Uang Keluar (Uang Kantor) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Uang Keluar (Uang Kantor)</div>
              <div className="text-2xl font-extrabold text-blue-700 mt-1">{formatRupiah(kantorSummary.totalAktif)}</div>
              <div className="text-[11px] text-blue-600 mt-1">
                {kantorSummary.disetujuiCount + kantorSummary.menungguCount} nota aktif menggunakan kas kantor
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Nota Disetujui Admin</div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">{formatRupiah(kantorSummary.totalDisetujui)}</div>
              <div className="text-[11px] text-emerald-700 mt-1">
                {kantorSummary.disetujuiCount} nota pertanggungjawaban diterima
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Menunggu Audit / Ditolak</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">{formatRupiah(kantorSummary.totalMenunggu)}</div>
              <div className="text-[11px] text-amber-700 mt-1">
                {kantorSummary.menungguCount} menunggu cek • {kantorSummary.ditolakCount} ditolak
              </div>
            </div>
          </div>

          {/* Filter & Tabel Pertanggungjawaban Uang Keluar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 id="uang-kantor-heading" className="font-bold text-slate-800 text-sm">
                  Rincian Pertanggungjawaban Uang Keluar (Uang Kantor)
                </h2>
                <p className="text-xs text-slate-400">
                  Khusus catatan pengeluaran yang bersumber dari Uang Kantor
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="filter-kantor-search"
                    type="text"
                    aria-label="Cari pertanggungjawaban uang kantor"
                    value={kantorSearch}
                    onChange={(e) => setKantorSearch(e.target.value)}
                    placeholder="Cari proyek, barang, PJ..."
                    className="pl-8 pr-3 py-1.5 min-h-[36px] text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  id="filter-kantor-status"
                  aria-label="Filter status audit uang kantor"
                  value={kantorAuditFilter}
                  onChange={(e) => setKantorAuditFilter(e.target.value)}
                  className="px-3 py-1.5 min-h-[36px] text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="semua">Semua Status Audit</option>
                  <option value="disetujui">Disetujui Admin</option>
                  <option value="menunggu">Menunggu Audit</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm">Memuat pertanggungjawaban uang kantor...</p>
              </div>
            ) : filteredKantorOutflows.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Belum ada catatan uang keluar yang menggunakan Uang Kantor.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Saat Anda mencatat pengeluaran dan memilih sumber dana <strong>Uang Kantor</strong>, rincian pertanggungjawabannya akan tampil di sini.
                </p>
              </div>
            ) : (
              <div
                role="region"
                tabIndex={0}
                aria-labelledby="uang-kantor-heading"
                className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <caption className="sr-only">Daftar pertanggungjawaban uang keluar menggunakan uang kantor</caption>
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th scope="col" className="py-3 px-3">Tanggal</th>
                      <th scope="col" className="py-3 px-3">Proyek &amp; Pelaku Belanja</th>
                      <th scope="col" className="py-3 px-3">Rincian Uang Keluar</th>
                      <th scope="col" className="py-3 px-3">Penanggung Jawab Dana</th>
                      <th scope="col" className="py-3 px-3 text-right">Nominal Keluar</th>
                      <th scope="col" className="py-3 px-3 text-center">Bukti Nota</th>
                      <th scope="col" className="py-3 px-3">Status Audit Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKantorOutflows.map((p) => {
                      const isOwner = Number(p.id_karyawan) === kId;
                      return (
                        <tr key={`uk-${p.id_pengeluaran}`} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {p.tanggal}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 min-w-[160px] max-w-[240px] leading-snug">
                            {resolveProjectName(p)}
                            <div className="text-[10px] font-medium mt-0.5 text-slate-500">
                              {isOwner ? (
                                <span className="text-emerald-700 font-semibold">Dibeli oleh: Saya</span>
                              ) : (
                                <span className="text-blue-600 font-semibold">Nota Rekan: {p.nama_karyawan}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 min-w-[150px] max-w-[240px] leading-snug text-slate-700 font-medium">
                            {p.keterangan || '-'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center space-x-1 text-slate-700 font-semibold">
                              <User className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              <span>{p.nama_penanggung_jawab || '-'}</span>
                            </div>
                            {p.id_kas && (
                              <span className="text-[10px] text-blue-600 font-medium">
                                Paket Kas #{p.id_kas}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                            {formatRupiah(p.nominal)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {renderNotaButton(p)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderAuditBadge(p.status_verifikasi)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bagian LPJ Khusus Bila Karyawan Ditugaskan Admin sebagai Penanggung Jawab */}
          {approvedPjList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Rekap Pertanggungjawaban Pengeluaran Per Paket (Penanggung Jawab)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ringkasan uang keluar yang memakai nama Anda sebagai Penanggung Jawab &amp; status penyelesaian LPJ.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedPjList.map((kas) => {
                  const maksSetor = Math.max(0, Number(kas.sisa_resmi || 0) - Number(kas.menunggu_konfirmasi_kembali || 0));
                  return (
                    <div key={kas.id_kas} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-blue-700 uppercase">
                            Kas #{kas.id_kas} • {kas.tanggal}
                          </span>
                          <h3 className="font-bold text-slate-800 text-sm">
                            {kas.nama_pekerjaan || 'Dana Operasional Umum Kantor'}
                          </h3>
                          <p className="text-xs text-slate-500">{kas.keterangan || '-'}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          kas.status_lpj === 'selesai'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {kas.status_lpj === 'selesai' ? '✓ LPJ Selesai' : 'Berjalan'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                          <div className="text-[10px] text-emerald-700 font-semibold">Keluar Disetujui</div>
                          <div className="font-bold text-emerald-800 mt-0.5">{formatRupiah(kas.total_terpakai_disetujui)}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-[10px] text-slate-500">Menunggu Audit</div>
                          <div className="font-bold text-slate-800 mt-0.5">{formatRupiah(kas.total_terpakai_menunggu)}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-[10px] text-slate-500">Sisa Disetor</div>
                          <div className="font-bold text-slate-800 mt-0.5">{formatRupiah(kas.total_dikembalikan)}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="text-[10px] text-amber-700 font-semibold">Sisa Belum Kembali</div>
                          <div className="font-extrabold text-amber-800 mt-0.5">{formatRupiah(kas.sisa_resmi)}</div>
                        </div>
                      </div>

                      {Number(kas.menunggu_konfirmasi_kembali) > 0 && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                          Setoran sisa senilai <strong>{formatRupiah(kas.menunggu_konfirmasi_kembali)}</strong> sedang menunggu konfirmasi Admin.
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDetailKasPj(kas)}
                          className="px-3 py-1.5 min-h-[34px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-blue-600" />
                          <span>Rincian Nota Uang Keluar</span>
                        </button>

                        {maksSetor > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenSetorModal(kas)}
                            className="px-3.5 py-1.5 min-h-[34px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kembalikan Sisa Dana</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {pengembalianSaya.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-sm">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    <span>Riwayat Pengembalian Sisa Dana ({pengembalianSaya.length})</span>
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {pengembalianSaya.map((pk) => (
                      <div key={pk.id_pengembalian} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800">{pk.nama_pekerjaan || pk.keterangan_kas || `Kas #${pk.id_kas}`}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span className="font-bold text-amber-700">{formatRupiah(pk.nominal)}</span>
                          <span className="text-[11px] text-slate-400 ml-2">({pk.tanggal})</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          pk.status_konfirmasi === 'diterima'
                            ? 'bg-emerald-100 text-emerald-700'
                            : pk.status_konfirmasi === 'ditolak'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {pk.status_konfirmasi}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah / Edit Pengeluaran */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Catatan Pengeluaran' : 'Form Catat Pengeluaran & Bukti Nota'}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {modalError && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          {pekerjaanList.length === 0 ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Belum ada proyek pekerjaan yang tersedia
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Catatan pengeluaran membutuhkan proyek terkait. Pastikan Administrator telah membuat atau menugaskan proyek pekerjaan kepada Anda.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="peng-proyek" className="block text-xs font-semibold text-slate-700 mb-1">Proyek Pekerjaan *</label>
              <select
                id="peng-proyek"
                name="id_pekerjaan"
                value={formJobId}
                onChange={(e) => setFormJobId(e.target.value)}
                className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              >
                {pekerjaanList.map(j => (
                  <option key={j.id_pekerjaan} value={j.id_pekerjaan}>
                    {j.nama_pekerjaan} {j.lokasi ? `(${j.lokasi})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="peng-tanggal" className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Belanja *</label>
              <input
                id="peng-tanggal"
                name="tanggal"
                type="date"
                value={formTanggal}
                onChange={(e) => setFormTanggal(e.target.value)}
                className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>
            <div>
              <label htmlFor="peng-nominal" className="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp) *</label>
              <input
                id="peng-nominal"
                name="nominal"
                type="number"
                min="1"
                inputMode="numeric"
                value={formNominal}
                onChange={(e) => setFormNominal(e.target.value)}
                placeholder="Contoh: 150000"
                className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                required
              />
            </div>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="block text-xs font-semibold text-slate-700 mb-1">Sumber Pendanaan *</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center space-x-2 min-h-[44px] px-3 py-2 rounded-xl border cursor-pointer transition ${formJenisDana === 'pribadi' ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}>
                <input
                  type="radio"
                  name="jenis_dana"
                  value="pribadi"
                  checked={formJenisDana === 'pribadi'}
                  onChange={() => {
                    setFormJenisDana('pribadi');
                    setKasSelectTouched(false);
                  }}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs">Uang Pribadi</span>
              </label>

              <label className={`flex items-center space-x-2 min-h-[44px] px-3 py-2 rounded-xl border cursor-pointer transition ${formJenisDana === 'kantor' ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}>
                <input
                  type="radio"
                  name="jenis_dana"
                  value="kantor"
                  checked={formJenisDana === 'kantor'}
                  onChange={() => setFormJenisDana('kantor')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs">Uang Kantor</span>
              </label>
            </div>
          </fieldset>

          {/* Opsi Pilihan Penanggung Jawab saat memilih Uang Kantor (hanya menampilkan nama PJ tanpa nominal saldo) */}
          {formJenisDana === 'kantor' && (
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="select-kas-kantor" className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                  <Wallet className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Penanggung Jawab Uang Kantor *</span>
                </label>
              </div>

              {selectableKasList.length === 0 ? (
                <div className="p-3 bg-white border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1.5">
                  <p className="font-bold">Belum ada penanggung jawab uang kantor yang disetujui untuk proyek ini.</p>
                  <p className="text-amber-700 leading-relaxed">
                    Hubungi <strong>Administrator</strong> untuk pencatatan kas &amp; penanggung jawab proyek, atau pilih <strong>Uang Pribadi</strong> terlebih dahulu.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    ref={kasSelectRef}
                    id="select-kas-kantor"
                    name="id_kas"
                    value={formIdKas}
                    onChange={(e) => {
                      setFormIdKas(e.target.value);
                      setKasSelectTouched(true);
                    }}
                    onBlur={() => setKasSelectTouched(true)}
                    required
                    aria-invalid={kasSelectTouched && !formIdKas ? 'true' : 'false'}
                    aria-describedby={kasSelectTouched && !formIdKas ? 'kas-select-error' : 'kas-select-help'}
                    className={`w-full min-h-[44px] text-xs bg-white border rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 font-medium ${
                      kasSelectTouched && !formIdKas
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/40'
                        : 'border-blue-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="" disabled>-- Pilih Nama Penanggung Jawab --</option>
                    {selectableKasList.map(kas => {
                      const samePjCount = pjCountsInSelect.get(String(kas.id_karyawan)) || 0;
                      const samePjJobCount = selectableKasList.filter(
                        item => String(item.id_karyawan) === String(kas.id_karyawan) &&
                                String(item.id_pekerjaan || '') === String(kas.id_pekerjaan || '')
                      ).length;
                      let optionLabel = kas.nama_penanggung_jawab || 'Penanggung Jawab';
                      if (samePjCount > 1) {
                        optionLabel += ` (${kas.nama_pekerjaan || 'Dana Umum'}${samePjJobCount > 1 ? ` - ${kas.tanggal}` : ''})`;
                      }
                      return (
                        <option key={kas.id_kas} value={String(kas.id_kas)}>
                          {optionLabel}
                        </option>
                      );
                    })}
                  </select>

                  {kasSelectTouched && !formIdKas ? (
                    <p id="kas-select-error" className="text-[11px] font-semibold text-rose-600 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Wajib memilih siapa penanggung jawab uang kantor ini.</span>
                    </p>
                  ) : (
                    <p id="kas-select-help" className="text-[11px] text-blue-700">
                      Penanggung jawab dipilih sesuai daftar kas uang kantor yang diaktifkan Admin.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label htmlFor="peng-keterangan" className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Rincian Barang *</label>
            <textarea
              id="peng-keterangan"
              name="keterangan"
              value={formKeterangan}
              onChange={(e) => setFormKeterangan(e.target.value)}
              placeholder="Contoh: Beli kabel ducting 10 meter dan paku klem instalasi lantai 2"
              rows={2}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Upload File dengan Opsi Kamera Langsung & Galeri */}
          <div>
            <div className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Foto Bukti Kuitansi / Struk</span>
              <span className="text-[11px] text-blue-600 font-normal">(Sangat disarankan untuk verifikasi admin)</span>
            </div>

            {/* Pilihan Tombol: Kamera Langsung atau Unggah File */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={handleOpenCamera}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                <Camera className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Foto Kamera Langsung</span>
              </button>

              <label
                htmlFor="file-receipt-upload"
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs text-center"
              >
                <Upload className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>Pilih dari Galeri / File</span>
              </label>
            </div>

            {/* Hidden Input File Biasa & Input Kamera Native (HP) */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-receipt-upload"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              ref={cameraInputRef}
              id="file-receipt-camera"
            />

            {/* Area Preview Foto Kuitansi */}
            <div className="border border-slate-200 rounded-2xl p-3 text-center transition bg-slate-50/70">
              {compressing && (
                <div className="py-2 text-xs text-blue-600 font-semibold flex items-center justify-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengompres ukuran gambar otomatis...</span>
                </div>
              )}

              {/* Compression Badge */}
              {compressionStats && (
                <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] inline-flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    Kompresi Berhasil: {compressionStats.originalSize} → <strong>{compressionStats.compressedSize}</strong> (Hemat {compressionStats.savedPercent}%)
                  </span>
                </div>
              )}

              {filePreview ? (
                <div className="relative inline-block mt-1">
                  <img
                    src={filePreview}
                    alt="Preview Kuitansi"
                    className="max-h-36 rounded-xl shadow-sm border border-slate-200 object-cover mx-auto"
                  />
                  <div className="mt-2 flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Camera className="w-3 h-3 text-emerald-600" />
                      <span>Foto Ulang</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview('');
                        setCompressionStats(null);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Foto</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-slate-400">
                  <p className="text-xs font-medium text-slate-600">Belum ada foto kuitansi dilampirkan</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Gunakan tombol kamera untuk memotret langsung atau pilih file dari perangkat</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={compressing || submitting || pekerjaanList.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            >
              {submitting
                ? 'Menyimpan...'
                : editingId
                ? (compressing ? 'Menyimpan Perubahan...' : 'Simpan Perubahan')
                : (compressing ? 'Mengompresi & Menyimpan...' : 'Simpan & Ajukan Nota')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Preview Kuitansi */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title="Pratinjau Bukti / Kuitansi Pengeluaran"
      >
        <div className="flex flex-col items-center justify-center p-2">
          {previewImage && (
            <img
              src={previewImage}
              alt="Bukti Nota"
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg border border-slate-200"
            />
          )}
          <div className="mt-4 flex justify-end w-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Live Kamera untuk Foto Kuitansi Langsung */}
      {isCameraActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-white flex flex-col">
            {/* Header Modal Kamera */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs tracking-wide text-white">Foto Kuitansi Langsung</span>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewfinder Video Kamera */}
            <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
              {loadingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/60 space-y-2">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-xs text-slate-300">Menghubungkan kamera...</span>
                </div>
              )}

              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover max-h-[60vh]"
              />

              {/* Garis Panduan / Frame Kotak Nota */}
              <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-emerald-400/60 rounded-2xl pointer-events-none flex items-end justify-center pb-2">
                <span className="bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-full font-medium">
                  Posisikan kuitansi/nota di dalam kotak
                </span>
              </div>
            </div>

            {/* Kontrol Kamera */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleToggleCameraFacing}
                title="Ganti Kamera Depan/Belakang"
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Putar</span>
              </button>

              <button
                type="button"
                onClick={handleCaptureFromCamera}
                disabled={loadingCamera}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Jepret Foto Kuitansi</span>
              </button>

              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Setor / Kembalikan Sisa Dana Kantor (khusus PJ) */}
      <Modal
        isOpen={!!setorModalKas}
        onClose={() => setSetorModalKas(null)}
        title="Kembalikan Sisa Dana Kantor (LPJ)"
      >
        {setorModalKas && (
          <form onSubmit={handleSubmitSetorSisa} noValidate className="space-y-4">
            {setorError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{setorError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1">
              <div className="font-bold text-slate-800">{setorModalKas.nama_pekerjaan || 'Dana Operasional Umum Kantor'}</div>
              <div className="text-slate-600">{setorModalKas.keterangan || `Kas #${setorModalKas.id_kas}`}</div>
              <div className="pt-1 text-[11px] text-blue-800">
                Maksimal sisa dapat disetor: <strong className="font-extrabold">{formatRupiah(setorModalKas.maksSetor)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="emp-setor-tanggal" className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Setor *</label>
                <input
                  id="emp-setor-tanggal"
                  type="date"
                  value={setorTanggal}
                  onChange={(e) => setSetorTanggal(e.target.value)}
                  className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>
              <div>
                <label htmlFor="emp-setor-nominal" className="block text-xs font-semibold text-slate-700 mb-1">Nominal Dikembalikan (Rp) *</label>
                <input
                  id="emp-setor-nominal"
                  type="number"
                  min="1"
                  max={setorModalKas.maksSetor}
                  value={setorNominal}
                  onChange={(e) => setSetorNominal(e.target.value)}
                  className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="emp-setor-keterangan" className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Pengembalian</label>
              <input
                id="emp-setor-keterangan"
                type="text"
                value={setorKeterangan}
                onChange={(e) => setSetorKeterangan(e.target.value)}
                placeholder="Misal: Transfer BCA ke kas kantor / serah tunai ke admin"
                className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="emp-setor-bukti" className="block text-xs font-semibold text-slate-700 mb-1">Bukti Transfer / Serah Terima (Opsional)</label>
              <input
                id="emp-setor-bukti"
                type="file"
                accept="image/*"
                onChange={handleSetorFileChange}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {setorPreview && (
                <img src={setorPreview} alt="Preview Bukti Pengembalian" className="mt-2 max-h-32 rounded-xl border border-slate-200 object-contain" />
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSetorModalKas(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={setorSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                {setorSubmitting ? 'Mengirim...' : 'Kirim Pengembalian Sisa'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Rincian Nota Uang Keluar Tim pada Paket Kas PJ */}
      <Modal
        isOpen={!!detailKasPj}
        onClose={() => setDetailKasPj(null)}
        title={detailKasPj ? `Rincian Uang Keluar Kas #${detailKasPj.id_kas}` : 'Rincian Uang Keluar'}
        maxWidth="max-w-2xl"
      >
        {detailKasPj && (() => {
          const items = kantorOutflowsList.filter(pg => Number(pg.id_kas) === Number(detailKasPj.id_kas));
          return (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800">{detailKasPj.nama_pekerjaan || 'Dana Kantor Umum'}</div>
                  <div className="text-slate-500">{detailKasPj.keterangan || '-'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Total Keluar Disetujui</div>
                  <strong className="text-sm text-emerald-700">{formatRupiah(detailKasPj.total_terpakai_disetujui)}</strong>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Belum ada nota pengeluaran yang memakai paket kas ini.
                </div>
              ) : (
                <div
                  role="region"
                  tabIndex={0}
                  aria-label="Tabel Nota Uang Keluar Tim"
                  className="overflow-x-auto border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Rincian nota uang keluar untuk paket kas #{detailKasPj.id_kas}</caption>
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-3 py-2">Pembelanja</th>
                        <th scope="col" className="px-3 py-2">Keterangan</th>
                        <th scope="col" className="px-3 py-2 text-right">Nominal Keluar</th>
                        <th scope="col" className="px-3 py-2 text-center">Nota</th>
                        <th scope="col" className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((pg) => (
                        <tr key={`pj-detail-${pg.id_pengeluaran}`}>
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-800">{pg.nama_karyawan}</div>
                            <div className="text-[10px] text-slate-400">{pg.tanggal}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{pg.keterangan || '-'}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-800 whitespace-nowrap">{formatRupiah(pg.nominal)}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{renderNotaButton(pg)}</td>
                          <td className="px-3 py-2 text-center">{renderAuditBadge(pg.status_verifikasi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDetailKasPj(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

