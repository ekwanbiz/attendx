// =====================================================================
// TETAPAN ATTENDX — hanya fail ini yang perlu cikgu ubah.
//
// Ambil dua maklumat ini dari Supabase (butang "Connect" di atas dashboard,
// atau Project Settings > API Keys):
//   1. Project URL       -> contoh: https://abcdefghijkl.supabase.co
//   2. Publishable key   -> bermula dengan sb_publishable_...
//      (projek lama: guna "anon public" key, bermula dengan eyJ...)
//
// Kunci ini memang selamat diletak dalam app. JANGAN letak "secret key".
// Jika dibiarkan kosong, app berjalan dalam MOD DEMO (data rekaan).
// =====================================================================

window.ATTENDX_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_KEY: '',

  NAMA_SEKOLAH: 'SMK Rantau Panjang',

  // Hari cuti hujung minggu (0 = Ahad, 5 = Jumaat, 6 = Sabtu). Kelantan: Jumaat & Sabtu.
  HARI_CUTI: [5, 6]
};
