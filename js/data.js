// =====================================================================
// Attendx · lapisan data
//   - SupabaseDB : guna pangkalan data Supabase sebenar
//   - DemoDB     : data rekaan dalam browser (bila config.js kosong)
// Kedua-duanya ada fungsi yang sama supaya app tak perlu tahu bezanya.
// =====================================================================

const SEBAB = ['Sakit', 'Ponteng', 'Pengangkutan', 'Lain-lain'];

const Tarikh = {
  HARI: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
  BULAN: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
  BLN: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  ymd(d) {
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  hariIni() { return Tarikh.ymd(new Date()); },
  tambah(s, n) { const d = Tarikh.parse(s); d.setDate(d.getDate() + n); return Tarikh.ymd(d); },
  cuti(s) { return (window.ATTENDX_CONFIG.HARI_CUTI || [5, 6]).includes(Tarikh.parse(s).getDay()); },
  sekolahTerkini(s) { let x = s; while (Tarikh.cuti(x)) x = Tarikh.tambah(x, -1); return x; },
  penuh(s) { const d = Tarikh.parse(s); return Tarikh.HARI[d.getDay()] + ', ' + d.getDate() + ' ' + Tarikh.BULAN[d.getMonth()] + ' ' + d.getFullYear(); },
  pendek(s) { const d = Tarikh.parse(s); return Tarikh.HARI[d.getDay()] + ', ' + d.getDate() + ' ' + Tarikh.BLN[d.getMonth()]; },
  ringkas(s) { const d = Tarikh.parse(s); return d.getDate() + ' ' + Tarikh.BLN[d.getMonth()] + ' ' + d.getFullYear(); },
  bulanLabel(ym) { const [y, m] = ym.split('-').map(Number); return Tarikh.BULAN[m - 1] + ' ' + y; },
  julatBulan(ym) {
    const [y, m] = ym.split('-').map(Number);
    const dari = Tarikh.ymd(new Date(y, m - 1, 1));
    let hingga = Tarikh.ymd(new Date(y, m, 0));
    const kini = Tarikh.hariIni();
    if (hingga > kini) hingga = kini;
    return { dari, hingga };
  }
};

function terjemahRalat(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'Email atau kata laluan salah.';
  if (/Email not confirmed/i.test(m)) return 'Email belum disahkan. Semak tetapan akaun di Supabase.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Tiada sambungan internet. Cuba lagi.';
  if (/JWT|session/i.test(m)) return 'Sesi tamat. Sila log masuk semula.';
  return m;
}

// ---------------------------------------------------------------------
// SUPABASE
// ---------------------------------------------------------------------
function SupabaseDB(cfg) {
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  const semak = ({ data, error }) => { if (error) throw new Error(terjemahRalat(error)); return data; };

  return {
    mod: 'supabase',
    async pengguna() { const { data } = await sb.auth.getSession(); return data.session ? data.session.user : null; },
    async login(email, katalaluan) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: katalaluan });
      if (error) throw new Error(terjemahRalat(error));
      return data.user;
    },
    async logout() { await sb.auth.signOut(); },
    async kelas() {
      return semak(await sb.from('v_kelas').select('id,tingkatan,nama,bil_murid').order('tingkatan').order('nama'));
    },
    async murid(kelasId) {
      return semak(await sb.from('murid').select('id,nama,jantina').eq('kelas_id', kelasId).eq('aktif', true).order('nama'));
    },
    async kehadiran(kelasId, tarikh) {
      return semak(await sb.from('kehadiran').select('murid_id,status,sebab,catatan,dikemaskini').eq('kelas_id', kelasId).eq('tarikh', tarikh));
    },
    async simpan(kelasId, tarikh, baris) {
      const kini = new Date().toISOString();
      const data = baris.map((b) => ({
        murid_id: b.murid_id, kelas_id: kelasId, tarikh,
        status: b.status, sebab: b.status === 'T' ? b.sebab : null,
        catatan: b.status === 'T' && b.sebab === 'Lain-lain' ? (b.catatan || null) : null,
        dikemaskini: kini
      }));
      semak(await sb.from('kehadiran').upsert(data, { onConflict: 'murid_id,tarikh' }));
    },
    async ringkasan(tarikh) { return semak(await sb.rpc('ringkasan_harian', { p_tarikh: tarikh })); },
    async sejarahHarian(kelasId, dari, hingga) { return semak(await sb.rpc('sejarah_harian', { p_kelas: kelasId, p_dari: dari, p_hingga: hingga })); },
    async sejarahMurid(kelasId, dari, hingga) { return semak(await sb.rpc('sejarah_murid', { p_kelas: kelasId, p_dari: dari, p_hingga: hingga })); },
    async amaran(tarikh) { return semak(await sb.rpc('amaran_berturut', { p_tarikh: tarikh, p_hari: 3 })); },
    async analisis(dari, hingga) { return semak(await sb.rpc('analisis_bulanan', { p_dari: dari, p_hingga: hingga })); }
  };
}

// ---------------------------------------------------------------------
// DEMO (data rekaan, sama bentuk dengan data dummy SQL)
// ---------------------------------------------------------------------
function DemoDB() {
  let seed = 2026;
  const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ambil = (a) => a[Math.floor(rnd() * a.length)];
  const L_DEPAN = ['Muhammad', 'Muhammad', 'Ahmad', 'Mohd', 'Mohd', 'Nik', 'Wan', 'Che'];
  const L_NAMA = ['Aiman', 'Haziq', 'Danial', 'Irfan', 'Hakimi', 'Syafiq', 'Amirul', 'Adam', 'Firdaus', 'Hafiz', 'Izzat', 'Luqman', 'Faris', 'Aqil', 'Zulhilmi', 'Afiq', 'Harith', 'Naim', 'Rayyan', 'Arif', 'Syahmi', 'Hazwan', 'Nabil', 'Ikmal', 'Zikri', 'Akmal', 'Haikal', 'Imran', 'Fahmi', 'Iqbal'];
  const P_DEPAN = ['Nur', 'Nur', 'Siti', 'Nurul', 'Nik', 'Wan', 'Che', ''];
  const P_NAMA = ['Aisyah', 'Alya', 'Batrisyia', 'Damia', 'Farah', 'Hanis', 'Insyirah', 'Izzah', 'Khadijah', 'Maisarah', 'Nabila', 'Qistina', 'Sofea', 'Syuhada', 'Zulaikha', 'Aina', 'Najwa', 'Hidayah', 'Ain', 'Athirah', 'Balqis', 'Humaira', 'Syazwani', 'Afiqah', 'Liyana', 'Amani', 'Irdina', 'Safiyya', 'Hannah', 'Adlina'];
  const BAPA = ['Ismail', 'Abdullah', 'Hassan', 'Ibrahim', 'Yusof', 'Zakaria', 'Mohamad', 'Omar', 'Musa', 'Rahman', 'Aziz', 'Daud', 'Ghazali', 'Hamzah', 'Kamarudin', 'Mahmud', 'Nordin', 'Razak', 'Salleh', 'Sulaiman', 'Yaakob', 'Zainal', 'Ab Rahim', 'Mat Nor', 'Mustapha', 'Harun', 'Idris', 'Jusoh', 'Awang', 'Deraman'];
  const C_SUR = ['Lim', 'Tan', 'Ng', 'Wong', 'Lee', 'Ong', 'Chua', 'Teoh'];
  const C_NAMA = ['Wei Jie', 'Jia Hui', 'Zi Xuan', 'Kai Xin', 'Jun Hao', 'Yi Ling', 'Zhi Wei', 'Xin Yi', 'Hao Ran', 'Mei Ling'];

  const kelas = [];
  const murid = [];
  let kid = 0, mid = 0;
  for (let t = 1; t <= 5; t++) {
    for (const h of 'ABCDEFGHIJ') {
      const k = { id: ++kid, tingkatan: t, nama: t + h, bil_murid: 0 };
      kelas.push(k);
      const n = 30 + Math.floor(rnd() * 11);
      for (let i = 0; i < n; i++) {
        let nama, jan;
        if (rnd() < 0.06) { jan = rnd() < 0.5 ? 'L' : 'P'; nama = ambil(C_SUR) + ' ' + ambil(C_NAMA); }
        else if (rnd() < 0.5) {
          jan = 'L'; const d = ambil(L_DEPAN); let b = ambil(BAPA);
          if (['Nik', 'Wan', 'Che'].includes(d)) b = d + ' ' + b;
          nama = d + ' ' + ambil(L_NAMA) + ' bin ' + b;
        } else {
          jan = 'P'; const d = ambil(P_DEPAN); let b = ambil(BAPA);
          if (['Nik', 'Wan', 'Che'].includes(d)) b = d + ' ' + b;
          nama = (d + ' ' + ambil(P_NAMA)).trim() + ' binti ' + b;
        }
        murid.push({ id: ++mid, kelas_id: k.id, nama, jantina: jan });
      }
      k.bil_murid = n;
    }
  }
  const muridKelas = new Map();
  for (const m of murid) { if (!muridKelas.has(m.kelas_id)) muridKelas.set(m.kelas_id, []); muridKelas.get(m.kelas_id).push(m); }
  for (const arr of muridKelas.values()) arr.sort((a, b) => a.nama.localeCompare(b.nama));

  // rekod: tarikh -> Map(murid_id -> rekod)
  const rekod = new Map();
  const kini = Tarikh.hariIni();
  const hariSekolah = [];
  for (let i = 42; i >= 1; i--) { const d = Tarikh.tambah(kini, -i); if (!Tarikh.cuti(d)) hariSekolah.push(d); }
  for (const d of hariSekolah) {
    const peta = new Map();
    for (const m of murid) {
      const berisiko = (m.id * 7919) % 100 < 8;
      const pt = berisiko ? 0.15 : 0.035;
      const r = rnd(), r2 = rnd();
      const status = r < pt ? 'T' : 'H';
      let sebab = null, catatan = null;
      if (status === 'T') {
        sebab = berisiko ? (r2 < 0.5 ? 'Ponteng' : r2 < 0.8 ? 'Sakit' : r2 < 0.9 ? 'Pengangkutan' : 'Lain-lain')
                         : (r2 < 0.55 ? 'Sakit' : r2 < 0.75 ? 'Pengangkutan' : r2 < 0.85 ? 'Ponteng' : 'Lain-lain');
        if (sebab === 'Lain-lain') catatan = ambil(['Urusan keluarga', 'Kenduri', 'Kematian saudara', 'Temujanji hospital']);
      }
      peta.set(m.id, { murid_id: m.id, kelas_id: m.kelas_id, status, sebab, catatan, dikemaskini: d + 'T07:' + (30 + Math.floor(rnd() * 29)) + ':00' });
    }
    rekod.set(d, peta);
  }
  // 7 murid tidak hadir 3 hari terakhir
  const tiga = hariSekolah.slice(-3);
  for (let i = 0; i < 7; i++) {
    const m = ambil(murid);
    for (const d of tiga) { const r = rekod.get(d).get(m.id); r.status = 'T'; r.sebab = m.id % 2 ? 'Sakit' : 'Ponteng'; r.catatan = null; }
  }

  const tunggu = (v) => new Promise((ok) => setTimeout(() => ok(v), 120));
  const kira = (arr) => {
    const o = { h: 0, t: 0, l: 0, c: 0 };
    for (const r of arr) o[r.status.toLowerCase()]++;
    return o;
  };
  let pengguna = null;
  try { pengguna = JSON.parse(localStorage.getItem('attendx_demo_user')); } catch (e) { /* abaikan */ }

  return {
    mod: 'demo',
    async pengguna() { return pengguna; },
    async login(email, katalaluan) {
      if (!email || !katalaluan) throw new Error('Isi email dan kata laluan.');
      pengguna = { email };
      try { localStorage.setItem('attendx_demo_user', JSON.stringify(pengguna)); } catch (e) { /* abaikan */ }
      return tunggu(pengguna);
    },
    async logout() { pengguna = null; try { localStorage.removeItem('attendx_demo_user'); } catch (e) { /* abaikan */ } },
    async kelas() { return tunggu(kelas.map((k) => ({ ...k }))); },
    async murid(kelasId) { return tunggu((muridKelas.get(kelasId) || []).map((m) => ({ id: m.id, nama: m.nama, jantina: m.jantina }))); },
    async kehadiran(kelasId, tarikh) {
      const peta = rekod.get(tarikh);
      if (!peta) return tunggu([]);
      return tunggu((muridKelas.get(kelasId) || []).map((m) => peta.get(m.id)).filter(Boolean).map((r) => ({ ...r })));
    },
    async simpan(kelasId, tarikh, baris) {
      if (!rekod.has(tarikh)) rekod.set(tarikh, new Map());
      const peta = rekod.get(tarikh);
      const masa = new Date().toISOString();
      for (const b of baris) {
        peta.set(b.murid_id, {
          murid_id: b.murid_id, kelas_id: kelasId, status: b.status,
          sebab: b.status === 'T' ? b.sebab : null,
          catatan: b.status === 'T' && b.sebab === 'Lain-lain' ? (b.catatan || null) : null,
          dikemaskini: masa
        });
      }
      return tunggu(true);
    },
    async ringkasan(tarikh) {
      const peta = rekod.get(tarikh) || new Map();
      return tunggu(kelas.map((k) => {
        const arr = (muridKelas.get(k.id) || []).map((m) => peta.get(m.id)).filter(Boolean);
        return { kelas_id: k.id, kelas: k.nama, tingkatan: k.tingkatan, bil_murid: k.bil_murid, ...kira(arr), direkod: arr.length };
      }));
    },
    async sejarahHarian(kelasId, dari, hingga) {
      const keluar = [];
      for (const [d, peta] of rekod) {
        if (d < dari || d > hingga) continue;
        const arr = (muridKelas.get(kelasId) || []).map((m) => peta.get(m.id)).filter(Boolean);
        if (arr.length) keluar.push({ tarikh: d, ...kira(arr) });
      }
      return tunggu(keluar.sort((a, b) => (a.tarikh < b.tarikh ? 1 : -1)));
    },
    async sejarahMurid(kelasId, dari, hingga) {
      return tunggu((muridKelas.get(kelasId) || []).map((m) => {
        const o = { murid_id: m.id, nama: m.nama, h: 0, t: 0, l: 0, c: 0, sakit: 0, ponteng: 0, pengangkutan: 0, lain: 0 };
        for (const [d, peta] of rekod) {
          if (d < dari || d > hingga) continue;
          const r = peta.get(m.id); if (!r) continue;
          o[r.status.toLowerCase()]++;
          if (r.sebab === 'Sakit') o.sakit++; else if (r.sebab === 'Ponteng') o.ponteng++;
          else if (r.sebab === 'Pengangkutan') o.pengangkutan++; else if (r.sebab === 'Lain-lain') o.lain++;
        }
        return o;
      }));
    },
    async amaran(tarikh) {
      const tarikhSusun = [...rekod.keys()].filter((d) => d <= tarikh && d > Tarikh.tambah(tarikh, -30)).sort().reverse();
      const keluar = [];
      for (const k of kelas) {
        for (const m of muridKelas.get(k.id) || []) {
          const akhir = [];
          for (const d of tarikhSusun) { const r = rekod.get(d).get(m.id); if (r) akhir.push({ d, s: r.status }); if (akhir.length === 3) break; }
          if (akhir.length === 3 && akhir.every((x) => x.s === 'T')) keluar.push({ murid_id: m.id, nama: m.nama, kelas: k.nama, terakhir: akhir[0].d });
        }
      }
      return tunggu(keluar);
    },
    async analisis(dari, hingga) {
      const ting = {}, hari = [], sebab = {}, kls = {};
      for (const k of kelas) kls[k.id] = { nama: k.nama, tingkatan: k.tingkatan, h: 0, t: 0 };
      for (const [d, peta] of [...rekod.entries()].sort()) {
        if (d < dari || d > hingga) continue;
        const hr = { tarikh: d, h: 0, t: 0 };
        for (const r of peta.values()) {
          const st = r.status === 'H' ? 'h' : 't';
          const k = kls[r.kelas_id];
          k[st]++; hr[st]++;
          ting[k.tingkatan] = ting[k.tingkatan] || { tingkatan: k.tingkatan, h: 0, t: 0 };
          ting[k.tingkatan][st]++;
          if (r.status === 'T' && r.sebab) sebab[r.sebab] = (sebab[r.sebab] || 0) + 1;
        }
        hari.push(hr);
      }
      return tunggu({
        tingkatan: Object.values(ting).sort((a, b) => a.tingkatan - b.tingkatan),
        harian: hari,
        sebab: Object.entries(sebab).map(([k, n]) => ({ sebab: k, n })),
        kelas: Object.values(kls)
      });
    }
  };
}

function bukaDB() {
  const cfg = window.ATTENDX_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_KEY) {
    if (window.supabase) return SupabaseDB(cfg);
    // Config sudah diisi tetapi pustaka Supabase gagal dimuat (biasanya tiada internet)
    const gagal = () => { throw new Error('Tidak dapat menyambung ke Supabase. Semak sambungan internet dan muat semula.'); };
    return { mod: 'supabase', pengguna: async () => null, login: async () => gagal(), logout: async () => {} };
  }
  return DemoDB();
}
