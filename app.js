// =====================================================================
// Attendx · logik app (skrin, butang, simpan)
// =====================================================================
(function () {
  const cfg = window.ATTENDX_CONFIG || {};
  const db = bukaDB();
  const $app = document.getElementById('app');
  const $lapis = document.getElementById('lapisan');

  // ---------- Alat kecil ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IKON = {
    semak: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    sejarah: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/>',
    rumah: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    profil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    kiri: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    bawah: '<path d="M6 9l6 6 6-6"/>',
    kanan: '<path d="M9 6l6 6-6 6"/>',
    amaran: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    cetak: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    betul: '<path d="M5 12l5 5L20 7"/>',
    tutup: '<path d="M6 6l12 12M18 6L6 18"/>',
    sekolah: '<path d="M3 10l9-5 9 5-9 5-9-5z"/><path d="M7 12v5c3 2 7 2 10 0v-5"/>',
    keluar: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
    turun: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    kalendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/>',
    telefon: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'
  };
  const ikon = (n, s) => '<svg width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IKON[n] + '</svg>';
  const LABEL = { H: 'Hadir', T: 'Tidak hadir', L: 'Lewat', C: 'Cuti' };
  const peratus = (h, t, l, c) => { const j = h + t + l + c; return j ? Math.round(((h + l) / j) * 1000) / 10 : 0; };
  const kelasLencana = (p) => (p >= 95 ? 'ok' : p >= 90 ? 'amaran' : 'bahaya');
  const masa = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
    const s = h < 12 ? 'pg' : 'ptg'; h = h % 12 || 12;
    return h + ':' + m + ' ' + s;
  };
  const simpanLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } };
  const bacaLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  function toast(msg, ralat) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast' + (ralat ? ' ralat-t' : '');
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ---------- Keadaan app ----------
  const kelasDisimpan = Number(bacaLocal('attendx_kelas')) || null;
  const S = {
    user: null,
    kelas: [],
    view: 'utama',
    kelasId: kelasDisimpan,
    utama: { muat: true, ringkasan: [], amaran: [], penuh: false },
    rekod: { tarikh: Tarikh.sekolahTerkini(Tarikh.hariIni()), murid: [], status: {}, asal: '{}', sudah: false, dikemaskini: null, muat: false, menyimpan: false, token: 0 },
    sejarah: { bulan: Tarikh.hariIni().slice(0, 7), tab: 'tarikh', harian: [], muridData: [], muat: false, token: 0 },
    ralatMuat: null
  };
  const kelasIni = () => S.kelas.find((k) => k.id === S.kelasId) || null;
  const kelasNamaKeId = (nama) => (S.kelas.find((k) => k.nama === nama) || {}).id;
  const berubah = () => S.view === 'rekod' && JSON.stringify(S.rekod.status) !== S.rekod.asal;
  const sahTinggal = () => !berubah() || confirm('Ada perubahan kehadiran yang belum disimpan. Teruskan tanpa simpan?');

  // ---------- Paparan ----------
  function render() {
    const y = window.scrollY;
    if (!S.user) { $app.innerHTML = paparLogin(); return; }
    let isi = '';
    if (S.ralatMuat) isi = paparRalatMuat();
    else if (S.view === 'utama') isi = paparUtama();
    else if (S.view === 'rekod') isi = paparRekod();
    else if (S.view === 'sejarah') isi = paparSejarah();
    else if (S.view === 'laporan') isi = paparLaporan();
    else if (S.view === 'profil') isi = paparProfil();
    const pita = db.mod === 'demo' ? '<div class="demo-pita">Mod demo · data rekaan, tidak disimpan ke pangkalan data</div>' : '';
    $app.innerHTML = pita + isi + paparNav();
    window.scrollTo(0, y);
  }

  function paparNav() {
    const v = S.view === 'laporan' ? 'sejarah' : S.view;
    const b = (id, n, label) => '<button type="button" data-a="nav" data-v="' + id + '" class="' + (v === id ? 'on' : '') + '"' + (v === id ? ' aria-current="page"' : '') + '>' + ikon(n) + label + '</button>';
    return '<nav class="nav tiada-cetak" aria-label="Menu utama">' + b('utama', 'rumah', 'Utama') + b('rekod', 'semak', 'Rekod') + b('sejarah', 'sejarah', 'Sejarah') + b('profil', 'profil', 'Profil') + '</nav>';
  }

  function paparLogin(ralat) {
    return '<main class="login">' +
      '<div><div class="logo-besar">' + ikon('semak', 38) + '</div><h1>Attendx</h1>' +
      '<div class="sub">Sistem kehadiran murid</div><div class="sub" style="font-size:13px">' + esc(cfg.NAMA_SEKOLAH) + '</div></div>' +
      '<form id="borang-login" novalidate>' +
      (db.mod === 'demo' ? '<div class="nota">Mod demo: masukkan apa-apa email dan kata laluan untuk mencuba.</div>' : '') +
      '<div id="ralat-login"></div>' +
      '<div class="medan"><label for="emel">Email</label><input class="input" id="emel" type="email" autocomplete="username" placeholder="nama@sekolah.edu.my" required></div>' +
      '<div class="medan"><label for="kata">Kata laluan</label><input class="input" id="kata" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn btn-utama btn-penuh" type="submit" id="btn-login" style="height:52px;margin-top:8px">Log masuk</button>' +
      '</form>' +
      '<div class="kecil" style="text-align:center">Lupa kata laluan? Hubungi pentadbir sistem.</div>' +
      '</main>';
  }

  function paparRalatMuat() {
    return '<div class="skrin"><div class="kad tumpuk"><div class="amaran-tajuk">' + ikon('amaran', 18) + 'Data tidak dapat dimuatkan</div>' +
      '<div class="kecil">' + esc(S.ralatMuat) + '</div>' +
      '<div class="kecil">Pastikan fail SQL 01 dan 02 sudah dijalankan di Supabase, dan sambungan internet ada.</div>' +
      '<button class="btn btn-utama" data-a="cubaLagi">Cuba lagi</button></div></div>';
  }

  // ----- Utama -----
  function paparUtama() {
    const kini = Tarikh.hariIni();
    const ref = Tarikh.sekolahTerkini(kini);
    const jam = new Date().getHours();
    const salam = jam < 12 ? 'Selamat pagi' : jam < 14 ? 'Selamat tengah hari' : jam < 19 ? 'Selamat petang' : 'Selamat malam';
    const awal = (S.user.email || 'AD').slice(0, 2).toUpperCase();
    const U = S.utama;
    let kadKehadiran;
    if (U.muat) kadKehadiran = '<div class="kad"><div class="muat"><div class="pusing"></div></div></div>';
    else {
      const siap = U.ringkasan.filter((r) => r.direkod > 0);
      const jum = U.ringkasan.reduce((a, r) => ({ h: a.h + r.h, t: a.t + r.t, l: a.l + r.l, c: a.c + r.c }), { h: 0, t: 0, l: 0, c: 0 });
      const p = peratus(jum.h, jum.t, jum.l, jum.c);
      const bil = U.ringkasan.length || 50;
      kadKehadiran = '<div class="kad"><div class="baris"><div class="kecil">' + (ref === kini ? 'Kehadiran hari ini' : 'Kehadiran ' + Tarikh.pendek(ref)) + '</div>' +
        '<div style="font-size:13px;font-weight:600;color:var(--utama)">' + siap.length + ' / ' + bil + ' kelas siap</div></div>' +
        '<div class="bar"><div style="width:' + Math.round((siap.length / bil) * 100) + '%"></div></div>' +
        '<div class="grid-3" style="margin-top:14px">' +
        '<div><div class="angka">' + (siap.length ? p + '%' : '–') + '</div><div class="angka-label">Hadir</div></div>' +
        '<div><div class="angka">' + jum.t + '</div><div class="angka-label">Tidak hadir</div></div>' +
        '<div><div class="angka">' + (bil - siap.length) + '</div><div class="angka-label">Kelas belum</div></div>' +
        '</div></div>';
    }
    let kadAmaran = '';
    if (!U.muat) {
      const senarai = U.penuh ? U.amaran : U.amaran.slice(0, 3);
      kadAmaran = '<div class="kad" style="padding:14px 16px"><div class="amaran-tajuk">' + ikon('amaran', 18) + 'Tidak hadir 3 hari berturut-turut</div>' +
        (U.amaran.length === 0 ? '<div class="kecil" style="padding-top:10px">Tiada murid dalam senarai ini.</div>' :
          '<div class="senarai-ringkas">' + senarai.map((a) => '<div><span>' + esc(a.nama) + '</span><span style="color:var(--kelabu);flex-shrink:0">' + esc(a.kelas) + '</span></div>').join('') + '</div>' +
          (U.amaran.length > 3 ? '<button class="pautan" data-a="amaranPenuh">' + (U.penuh ? 'Tunjuk kurang' : 'Lihat ' + (U.amaran.length - 3) + ' murid lagi') + '</button>' : '')) +
        '</div>';
    }
    const k = kelasIni();
    return '<main class="skrin tumpuk">' +
      '<div class="baris"><div class="jenama"><div class="logo">' + ikon('semak') + '</div><div><div class="jenama-nama">Attendx</div><div class="kecil" style="font-size:12px">' + esc(cfg.NAMA_SEKOLAH) + '</div></div></div>' +
      '<button class="avatar" data-a="nav" data-v="profil" aria-label="Profil">' + esc(awal) + '</button></div>' +
      '<div><div class="salam">' + salam + ', Cikgu</div><div class="tarikh-besar">' + Tarikh.penuh(kini) + '</div></div>' +
      (Tarikh.cuti(kini) ? '<div class="cuti-banner">' + ikon('kalendar', 18) + 'Hari ini cuti hujung minggu. Ringkasan di bawah untuk ' + Tarikh.pendek(ref) + '.</div>' : '') +
      kadKehadiran +
      '<button class="butang-besar gelap" data-a="nav" data-v="rekod"><div class="ikon">' + ikon('semak', 28) + '</div><div class="isi"><div class="t1">Rekod kehadiran</div><div class="t2">' + (k ? 'Kelas ' + esc(k.nama) + ' · pilih kelas dan tarikh' : 'Pilih kelas dan tarikh') + '</div></div>' + ikon('kanan') + '</button>' +
      '<button class="butang-besar" data-a="nav" data-v="sejarah"><div class="ikon">' + ikon('sejarah', 28) + '</div><div class="isi"><div class="t1">Sejarah kehadiran</div><div class="t2">Rekod lepas dan laporan bulanan</div></div><span style="color:var(--kelabu)">' + ikon('kanan') + '</span></button>' +
      kadAmaran +
      '</main>';
  }

  async function muatUtama() {
    S.utama.muat = true; render();
    const ref = Tarikh.sekolahTerkini(Tarikh.hariIni());
    try {
      const [ringkasan, amaran] = await Promise.all([db.ringkasan(ref), db.amaran(ref)]);
      S.utama.ringkasan = ringkasan; S.utama.amaran = amaran;
    } catch (e) { toast(e.message, true); }
    S.utama.muat = false;
    if (S.view === 'utama') render();
  }

  // ----- Rekod -----
  function paparPilihKelas(konteks) {
    const k = kelasIni();
    return '<div class="medan"><span class="label" id="lbl-kelas-' + konteks + '">Kelas</span>' +
      '<button type="button" class="pilih" data-a="bukaKelas" data-konteks="' + konteks + '" aria-labelledby="lbl-kelas-' + konteks + '">' +
      (k ? esc(k.nama) : '<span style="color:var(--kelabu-2);font-weight:500">Pilih kelas</span>') +
      '<span style="color:var(--kelabu)">' + ikon('bawah', 18) + '</span></button></div>';
  }

  function paparRekod() {
    const R = S.rekod;
    const kepala = '<header class="kepala"><h1 class="tajuk-skrin">Rekod kehadiran</h1>' +
      '<div class="grid-2">' + paparPilihKelas('rekod') +
      '<div class="medan"><label for="tarikh-rekod">Tarikh</label><input class="input" type="date" id="tarikh-rekod" data-change="tarikh" value="' + R.tarikh + '" max="' + Tarikh.hariIni() + '"></div></div>';
    if (!S.kelasId) {
      return kepala + '</header><main class="skrin"><div class="kosong">' + ikon('sekolah', 28) + '<div>Pilih kelas untuk papar senarai murid</div>' +
        '<button class="btn btn-utama btn-kecil" data-a="bukaKelas" data-konteks="rekod">Pilih kelas</button></div></main>';
    }
    if (R.muat) return kepala + '</header><main class="skrin"><div class="muat"><div class="pusing"></div></div></main>';

    const n = { H: 0, T: 0, L: 0, C: 0 }; let belum = 0;
    for (const m of R.murid) { const s = R.status[m.id].status; if (s) n[s]++; else belum++; }
    const ringkas = '<div class="grid-4">' + ['H', 'T', 'L', 'C'].map((s) => '<div class="ringkas s-' + s + '"><div class="l">' + LABEL[s] + '</div><div class="n">' + n[s] + '</div></div>').join('') + '</div>';

    const info = R.sudah && !berubah()
      ? '<span class="lencana ok">Sudah direkod · ' + masa(R.dikemaskini) + '</span>'
      : (belum ? '<span class="kecil">' + R.murid.length + ' murid · ' + belum + ' belum ditanda</span>' : '<span class="kecil">' + R.murid.length + ' murid · belum disimpan</span>');

    const senarai = R.murid.map((m, i) => {
      const st = R.status[m.id];
      const butang = ['H', 'T', 'L', 'C'].map((s) => '<button type="button" data-a="status" data-id="' + m.id + '" data-s="' + s + '" class="' + (st.status === s ? 'on-' + s : '') + '" aria-label="' + LABEL[s] + '" aria-pressed="' + (st.status === s) + '">' + s + '</button>').join('');
      let sebab = '';
      if (st.status === 'T') {
        sebab = '<div class="sebab"><span class="label">Sebab tidak hadir</span><div class="sebab-btn">' +
          SEBAB.map((sb) => '<button type="button" data-a="sebab" data-id="' + m.id + '" data-v="' + sb + '" class="' + (st.sebab === sb ? 'on' : '') + '" aria-pressed="' + (st.sebab === sb) + '">' + sb + '</button>').join('') + '</div>' +
          (st.sebab === 'Lain-lain' ? '<input class="input" style="height:42px;font-weight:400" data-input="catatan" data-id="' + m.id + '" placeholder="Tulis catatan (pilihan)" aria-label="Catatan untuk ' + esc(m.nama) + '" value="' + esc(st.catatan || '') + '">' : '') +
          '</div>';
      }
      return '<div class="murid' + (st.status ? '' : ' belum') + '" id="m-' + m.id + '"><div class="baris"><div style="min-width:0"><div class="nama">' + esc(m.nama) + '</div><div class="no">No. ' + (i + 1) + '</div></div>' +
        '<div class="status-btn" role="group" aria-label="Status ' + esc(m.nama) + '">' + butang + '</div></div>' + sebab + '</div>';
    }).join('');

    return kepala + ringkas + '</header>' +
      '<main class="skrin ada-simpan tumpuk" style="gap:8px;padding-top:12px">' +
      '<div class="baris" style="padding-bottom:4px">' + info + '<button type="button" class="btn btn-garis btn-kecil" data-a="semuaHadir">' + ikon('betul', 16) + 'Tanda semua hadir</button></div>' +
      senarai + '</main>' +
      '<div class="bar-simpan"><button type="button" class="btn btn-utama btn-penuh" style="height:52px" data-a="simpan"' + (R.menyimpan ? ' disabled' : '') + '>' +
      (R.menyimpan ? 'Menyimpan…' : (R.sudah ? 'Simpan perubahan' : 'Simpan kehadiran')) + '</button></div>';
  }

  async function muatRekod() {
    const R = S.rekod;
    if (!S.kelasId) { render(); return; }
    const token = ++R.token;
    R.muat = true; render();
    try {
      const [murid, rekod] = await Promise.all([db.murid(S.kelasId), db.kehadiran(S.kelasId, R.tarikh)]);
      if (token !== R.token) return;
      const peta = {}; let akhir = null;
      for (const r of rekod) { peta[r.murid_id] = r; if (!akhir || r.dikemaskini > akhir) akhir = r.dikemaskini; }
      R.murid = murid;
      R.status = {};
      for (const m of murid) {
        const r = peta[m.id];
        R.status[m.id] = r ? { status: r.status, sebab: r.sebab || null, catatan: r.catatan || '' } : { status: null, sebab: null, catatan: '' };
      }
      R.asal = JSON.stringify(R.status);
      R.sudah = rekod.length > 0;
      R.dikemaskini = akhir;
    } catch (e) { toast(e.message, true); R.murid = []; }
    R.muat = false;
    if (S.view === 'rekod') render();
  }

  async function simpanRekod() {
    const R = S.rekod;
    const belum = R.murid.filter((m) => !R.status[m.id].status);
    if (belum.length) {
      toast(belum.length + ' murid belum ditanda. Tekan "Tanda semua hadir" atau tanda satu per satu.', true);
      const el = document.getElementById('m-' + belum[0].id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const tiadaSebab = R.murid.filter((m) => R.status[m.id].status === 'T' && !R.status[m.id].sebab);
    if (tiadaSebab.length) {
      toast('Pilih sebab untuk ' + tiadaSebab.length + ' murid yang tidak hadir.', true);
      const el = document.getElementById('m-' + tiadaSebab[0].id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    R.menyimpan = true; render();
    try {
      await db.simpan(S.kelasId, R.tarikh, R.murid.map((m) => ({ murid_id: m.id, ...R.status[m.id] })));
      toast('Kehadiran ' + kelasIni().nama + ' (' + Tarikh.ringkas(R.tarikh) + ') disimpan');
      R.menyimpan = false;
      await muatRekod();
    } catch (e) {
      R.menyimpan = false; render();
      toast('Gagal simpan: ' + e.message, true);
    }
  }

  // ----- Sejarah -----
  function pilihanBulan() {
    const keluar = []; const d = new Date(); d.setDate(1);
    for (let i = 0; i < 12; i++) { keluar.push(Tarikh.ymd(d).slice(0, 7)); d.setMonth(d.getMonth() - 1); }
    return keluar;
  }

  function paparSejarah() {
    const J = S.sejarah;
    const kepala = '<header class="kepala"><div class="baris"><h1 class="tajuk-skrin">Sejarah kehadiran</h1>' +
      '<button type="button" class="btn btn-kecil" data-a="laporan"' + (S.kelasId ? '' : ' disabled') + '>' + ikon('cetak', 18) + 'Laporan</button></div>' +
      '<div class="grid-2">' + paparPilihKelas('sejarah') +
      '<div class="medan"><label for="bulan">Bulan</label><select class="input" id="bulan" data-change="bulan">' +
      pilihanBulan().map((b) => '<option value="' + b + '"' + (b === J.bulan ? ' selected' : '') + '>' + Tarikh.bulanLabel(b) + '</option>').join('') +
      '</select></div></div>' +
      '<div class="tab" role="tablist"><button role="tab" type="button" data-a="tab" data-v="tarikh" class="' + (J.tab === 'tarikh' ? 'on' : '') + '" aria-selected="' + (J.tab === 'tarikh') + '">Ikut tarikh</button>' +
      '<button role="tab" type="button" data-a="tab" data-v="murid" class="' + (J.tab === 'murid' ? 'on' : '') + '" aria-selected="' + (J.tab === 'murid') + '">Ikut murid</button></div></header>';
    if (!S.kelasId) return kepala + '<main class="skrin"><div class="kosong">' + ikon('sekolah', 28) + '<div>Pilih kelas untuk lihat sejarah kehadiran</div><button class="btn btn-utama btn-kecil" data-a="bukaKelas" data-konteks="sejarah">Pilih kelas</button></div></main>';
    if (J.muat) return kepala + '<main class="skrin"><div class="muat"><div class="pusing"></div></div></main>';

    const jum = J.harian.reduce((a, r) => ({ h: a.h + r.h, t: a.t + r.t, l: a.l + r.l, c: a.c + r.c }), { h: 0, t: 0, l: 0, c: 0 });
    const p = peratus(jum.h, jum.t, jum.l, jum.c);
    const k = kelasIni();
    const ringkas = '<div class="kad-gelap"><div><div class="lembut">Purata ' + Tarikh.BULAN[Number(J.bulan.slice(5)) - 1] + ' · ' + esc(k ? k.nama : '') + '</div><div class="besar">' + (J.harian.length ? p + '%' : '–') + '</div></div>' +
      '<div class="kanan">' + J.harian.length + ' hari sekolah<br>' + jum.t + ' kes tidak hadir</div></div>';
    if (!J.harian.length) return kepala + '<main class="skrin tumpuk" style="gap:12px;padding-top:14px">' + ringkas + '<div class="kosong">Tiada rekod kehadiran untuk bulan ini.</div></main>';

    let isi;
    if (J.tab === 'tarikh') {
      isi = '<div class="senarai">' + J.harian.map((r) => {
        const j = r.h + r.t + r.l + r.c; const pp = peratus(r.h, r.t, r.l, r.c);
        return '<button type="button" class="item" data-a="butiran" data-tarikh="' + r.tarikh + '"><div class="kiri"><div class="t1">' + Tarikh.pendek(r.tarikh) + '</div>' +
          '<div class="t2">' + (r.h + r.l) + ' / ' + j + ' hadir · ' + r.t + ' tidak hadir' + (r.l ? ' · ' + r.l + ' lewat' : '') + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:6px"><span class="lencana ' + kelasLencana(pp) + '">' + pp + '%</span><span style="color:#9AA3B2">' + ikon('kanan', 18) + '</span></div></button>';
      }).join('') + '</div>';
    } else {
      const susun = J.muridData.slice().sort((a, b) => b.t - a.t || a.nama.localeCompare(b.nama));
      isi = '<div class="senarai">' + susun.map((m) => {
        const pp = peratus(m.h, m.t, m.l, m.c);
        const bah = [];
        if (m.t) bah.push(m.t + ' hari tidak hadir');
        const sb = [['Sakit', m.sakit], ['Ponteng', m.ponteng], ['Pengangkutan', m.pengangkutan], ['Lain-lain', m.lain]].filter((x) => x[1]).map((x) => x[0] + ' ' + x[1]);
        if (sb.length) bah.push(sb.join(', '));
        if (m.l) bah.push('lewat ' + m.l + ' kali');
        if (m.c) bah.push('cuti ' + m.c);
        return '<div class="item"><div class="kiri"><div class="t1">' + esc(m.nama) + '</div><div class="t2">' + (bah.length ? bah.join(' · ') : 'Tiada rekod tidak hadir') + '</div></div>' +
          '<span class="lencana ' + kelasLencana(pp) + '">' + pp + '%</span></div>';
      }).join('') + '</div>';
    }
    return kepala + '<main class="skrin tumpuk" style="gap:12px;padding-top:14px">' + ringkas + isi + '</main>';
  }

  async function muatSejarah() {
    const J = S.sejarah;
    if (!S.kelasId) { render(); return; }
    const token = ++J.token;
    J.muat = true; render();
    const { dari, hingga } = Tarikh.julatBulan(J.bulan);
    try {
      const [harian, muridData] = await Promise.all([db.sejarahHarian(S.kelasId, dari, hingga), db.sejarahMurid(S.kelasId, dari, hingga)]);
      if (token !== J.token) return;
      J.harian = harian; J.muridData = muridData;
    } catch (e) { toast(e.message, true); J.harian = []; J.muridData = []; }
    J.muat = false;
    if (S.view === 'sejarah' || S.view === 'laporan') render();
  }

  // ----- Laporan bulanan -----
  function dataLaporan() {
    return S.sejarah.muridData.map((m, i) => ({ bil: i + 1, ...m, p: peratus(m.h, m.t, m.l, m.c) }));
  }
  function paparLaporan() {
    const J = S.sejarah; const k = kelasIni();
    if (J.muat) return '<main class="laporan"><div class="muat"><div class="pusing"></div></div></main>';
    const baris = dataLaporan();
    const jum = baris.reduce((a, r) => ({ h: a.h + r.h, t: a.t + r.t, l: a.l + r.l, c: a.c + r.c, sakit: a.sakit + r.sakit, ponteng: a.ponteng + r.ponteng, pengangkutan: a.pengangkutan + r.pengangkutan, lain: a.lain + r.lain }), { h: 0, t: 0, l: 0, c: 0, sakit: 0, ponteng: 0, pengangkutan: 0, lain: 0 });
    return '<main class="laporan">' +
      '<div class="tiada-cetak" style="margin-bottom:16px"><button type="button" class="btn btn-kecil" data-a="nav" data-v="sejarah">' + ikon('kiri', 18) + 'Kembali</button>' +
      '<div class="tindakan"><button type="button" class="btn btn-utama btn-kecil" data-a="cetak">' + ikon('cetak', 18) + 'Cetak / simpan PDF</button>' +
      '<button type="button" class="btn btn-kecil" data-a="csv">' + ikon('turun', 18) + 'Muat turun Excel (CSV)</button></div></div>' +
      '<div style="text-align:center"><div style="font-size:12px;letter-spacing:.5px;color:var(--kelabu)">' + esc(String(cfg.NAMA_SEKOLAH).toUpperCase()) + '</div>' +
      '<h2 style="margin-top:4px">Laporan Kehadiran Bulanan</h2>' +
      '<div class="kecil" style="margin-top:4px">Kelas ' + esc(k ? k.nama : '') + ' · ' + Tarikh.bulanLabel(J.bulan) + ' · ' + J.harian.length + ' hari persekolahan · purata ' + peratus(jum.h, jum.t, jum.l, jum.c) + '%</div></div>' +
      '<div class="jadual-luar"><table><thead><tr><th rowspan="2">Bil</th><th rowspan="2" style="text-align:left">Nama murid</th><th rowspan="2">H</th><th rowspan="2">L</th><th rowspan="2">C</th><th rowspan="2">T</th><th rowspan="2">%</th><th colspan="4">Sebab tidak hadir</th></tr>' +
      '<tr><th>Sakit</th><th>Ponteng</th><th>Pengang.</th><th>Lain</th></tr></thead><tbody>' +
      baris.map((r) => '<tr><td>' + r.bil + '</td><td class="nm">' + esc(r.nama) + '</td><td>' + r.h + '</td><td>' + r.l + '</td><td>' + r.c + '</td><td>' + r.t + '</td><td>' + r.p + '</td><td>' + (r.sakit || '') + '</td><td>' + (r.ponteng || '') + '</td><td>' + (r.pengangkutan || '') + '</td><td>' + (r.lain || '') + '</td></tr>').join('') +
      '<tr style="font-weight:600;background:#F8FAFC"><td></td><td class="nm">Jumlah</td><td>' + jum.h + '</td><td>' + jum.l + '</td><td>' + jum.c + '</td><td>' + jum.t + '</td><td>' + peratus(jum.h, jum.t, jum.l, jum.c) + '</td><td>' + jum.sakit + '</td><td>' + jum.ponteng + '</td><td>' + jum.pengangkutan + '</td><td>' + jum.lain + '</td></tr>' +
      '</tbody></table></div>' +
      '<div class="kecil" style="margin-top:10px">H = Hadir, L = Lewat, C = Cuti, T = Tidak hadir. Peratus kehadiran = (Hadir + Lewat) ÷ jumlah hari direkod.</div>' +
      '<div style="display:flex;justify-content:space-between;gap:24px;margin-top:40px;font-size:13px"><div style="flex:1">Disediakan oleh:<br><br><br>…………………………………<br>Guru kelas</div><div style="flex:1">Disahkan oleh:<br><br><br>…………………………………<br>Penolong Kanan HEM</div></div>' +
      '</main>';
  }
  function muatTurunCSV() {
    const k = kelasIni(); const J = S.sejarah;
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const atas = ['Bil', 'Nama murid', 'Hadir', 'Lewat', 'Cuti', 'Tidak hadir', 'Peratus', 'Sakit', 'Ponteng', 'Pengangkutan', 'Lain-lain'];
    const rows = dataLaporan().map((r) => [r.bil, r.nama, r.h, r.l, r.c, r.t, r.p, r.sakit, r.ponteng, r.pengangkutan, r.lain]);
    const csv = '﻿' + [atas, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'Kehadiran_' + (k ? k.nama : '') + '_' + Tarikh.bulanLabel(J.bulan).replace(' ', '_') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ----- Profil -----
  function paparProfil() {
    const awal = (S.user.email || 'AD').slice(0, 2).toUpperCase();
    return '<header class="kepala"><h1 class="tajuk-skrin">Profil</h1></header><main class="skrin tumpuk">' +
      '<div class="kad baris" style="justify-content:flex-start;gap:14px"><div class="avatar" style="width:52px;height:52px;border-radius:26px;font-size:18px">' + esc(awal) + '</div>' +
      '<div style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis">' + esc(S.user.email || '') + '</div><div class="kecil">' + esc(cfg.NAMA_SEKOLAH) + '</div></div></div>' +
      '<div class="kad tumpuk" style="gap:6px"><div style="font-weight:600">Pangkalan data</div><div class="kecil">' + (db.mod === 'demo' ? 'Mod demo. Isi js/config.js untuk sambung ke Supabase.' : 'Disambung ke Supabase. ' + S.kelas.length + ' kelas.') + '</div></div>' +
      '<div class="kad tumpuk" style="gap:8px"><div style="font-weight:600;display:flex;gap:8px;align-items:center">' + ikon('telefon', 18) + 'Pasang di telefon</div>' +
      '<div class="kecil" style="line-height:1.6"><b>Android (Chrome):</b> tekan menu ⋮ › <i>Tambah ke skrin utama</i>.<br><b>iPhone (Safari):</b> tekan butang Kongsi › <i>Add to Home Screen</i>.</div></div>' +
      '<button type="button" class="btn btn-penuh" style="color:var(--t-tx);border-color:#F3B4B4" data-a="logout">' + ikon('keluar', 18) + 'Log keluar</button>' +
      '<div class="kecil" style="text-align:center">Attendx versi 1.0</div></main>';
  }

  // ---------- Helaian (sheet) ----------
  function tutupHelaian() { $lapis.innerHTML = ''; }
  function bukaHelaian(htmlAtas, htmlBadan) {
    const ada = $lapis.querySelector('.helaian');
    if (ada) { ada.querySelector('.atas').innerHTML = htmlAtas + '<button type="button" class="tutup" data-a="tutup" aria-label="Tutup">' + ikon('tutup', 18) + '</button>'; ada.querySelector('.badan').innerHTML = htmlBadan; return; }
    $lapis.innerHTML = '<div class="lapik" data-a="tutupLuar"><div class="helaian" role="dialog" aria-modal="true">' +
      '<div class="pemegang"></div><div class="atas">' + htmlAtas + '<button type="button" class="tutup" data-a="tutup" aria-label="Tutup">' + ikon('tutup', 18) + '</button></div>' +
      '<div class="badan">' + htmlBadan + '</div></div></div>';
  }

  async function bukaKelas(konteks) {
    let status = null;
    const subjek = konteks === 'rekod' ? Tarikh.pendek(S.rekod.tarikh) : 'Pilih kelas untuk lihat sejarah';
    const lukis = () => {
      const siap = status ? status.filter((r) => r.direkod > 0).length : null;
      const atas = '<div><div style="font-size:18px;font-weight:700">Pilih kelas</div><div class="kecil">' + subjek + (siap != null ? ' · ' + siap + ' / ' + status.length + ' siap' : '') + '</div></div>';
      let badan = '';
      for (let t = 1; t <= 5; t++) {
        badan += '<div class="kumpulan">TINGKATAN ' + t + '</div>';
        for (const k of S.kelas.filter((x) => x.tingkatan === t)) {
          const on = k.id === S.kelasId;
          let lenc = '';
          if (status) {
            const r = status.find((x) => x.kelas_id === k.id);
            lenc = on ? '<span class="lencana pilih-on">Dipilih</span>' : (r && r.direkod > 0 ? '<span class="lencana ok">Siap</span>' : '<span class="lencana belum">Belum</span>');
          } else if (on) lenc = '<span class="lencana pilih-on">Dipilih</span>';
          badan += '<button type="button" class="pilihan-kelas' + (on ? ' on' : '') + '" data-a="pilihKelas" data-id="' + k.id + '" data-konteks="' + konteks + '"' + (on ? ' id="kelas-dipilih"' : '') + '>' +
            '<div style="display:flex;align-items:center;gap:12px"><div class="lencana-kelas">' + esc(k.nama) + '</div><div><div style="font-size:15px;font-weight:600">Kelas ' + esc(k.nama) + '</div><div class="kecil" style="font-size:12px">' + k.bil_murid + ' murid</div></div></div>' + lenc + '</button>';
        }
      }
      bukaHelaian(atas, badan);
      const d = document.getElementById('kelas-dipilih'); if (d) d.scrollIntoView({ block: 'center' });
    };
    lukis();
    if (konteks === 'rekod') {
      try { status = await db.ringkasan(S.rekod.tarikh); if ($lapis.innerHTML) lukis(); } catch (e) { /* senarai tetap boleh dipilih */ }
    }
  }

  async function bukaButiran(tarikh) {
    const k = kelasIni();
    const atas = '<div><div style="font-size:18px;font-weight:700">' + Tarikh.penuh(tarikh) + '</div><div class="kecil">Kelas ' + esc(k.nama) + '</div></div>';
    bukaHelaian(atas, '<div class="muat"><div class="pusing"></div></div>');
    try {
      const [murid, rekod] = await Promise.all([db.murid(S.kelasId), db.kehadiran(S.kelasId, tarikh)]);
      const nama = {}; for (const m of murid) nama[m.id] = m.nama;
      const n = { H: 0, T: 0, L: 0, C: 0 }; for (const r of rekod) n[r.status]++;
      const urutan = { T: 0, L: 1, C: 2 };
      const tidak = rekod.filter((r) => r.status !== 'H').sort((a, b) => urutan[a.status] - urutan[b.status] || (nama[a.murid_id] || '').localeCompare(nama[b.murid_id] || ''));
      let badan = '<div class="grid-4" style="margin:14px 0">' + ['H', 'T', 'L', 'C'].map((s) => '<div class="ringkas s-' + s + '"><div class="l">' + LABEL[s] + '</div><div class="n">' + n[s] + '</div></div>').join('') + '</div>';
      badan += tidak.length ? '<div class="senarai">' + tidak.map((r) => {
        const cls = r.status === 'T' ? 'bahaya' : r.status === 'L' ? 'amaran' : 'belum';
        const ket = r.status === 'T' ? esc(r.sebab || '') + (r.catatan ? ' · ' + esc(r.catatan) : '') : LABEL[r.status];
        return '<div class="item"><div class="kiri"><div class="t1">' + esc(nama[r.murid_id] || '') + '</div><div class="t2">' + ket + '</div></div><span class="lencana ' + cls + '">' + LABEL[r.status] + '</span></div>';
      }).join('') + '</div>' : '<div class="kosong">Semua murid hadir.</div>';
      badan += '<button type="button" class="btn btn-garis btn-penuh" style="margin-top:16px" data-a="ubahRekod" data-tarikh="' + tarikh + '">Ubah rekod ini</button>';
      bukaHelaian(atas, badan);
    } catch (e) { tutupHelaian(); toast(e.message, true); }
  }

  // ---------- Navigasi ----------
  function pergi(v) {
    if (v !== S.view && !sahTinggal()) return;
    if (S.view === 'rekod' && v !== 'rekod' && berubah()) S.rekod.status = JSON.parse(S.rekod.asal);
    S.view = v;
    window.scrollTo(0, 0);
    if (v === 'utama') muatUtama();
    else if (v === 'rekod') muatRekod();
    else if (v === 'sejarah') muatSejarah();
    else render();
  }

  async function mula() {
    S.ralatMuat = null;
    try {
      S.kelas = await db.kelas();
      if (S.kelasId && !S.kelas.some((k) => k.id === S.kelasId)) S.kelasId = null;
    } catch (e) { S.ralatMuat = e.message; render(); return; }
    S.view = 'utama';
    muatUtama();
  }

  // ---------- Pengendali acara ----------
  const AKSI = {
    nav: (el) => pergi(el.dataset.v),
    cubaLagi: () => mula(),
    amaranPenuh: () => { S.utama.penuh = !S.utama.penuh; render(); },
    bukaKelas: (el) => bukaKelas(el.dataset.konteks),
    tutup: () => tutupHelaian(),
    tutupLuar: (el, e) => { if (e.target === el) tutupHelaian(); },
    pilihKelas: (el) => {
      const id = Number(el.dataset.id);
      if (id !== S.kelasId && !sahTinggal()) return;
      S.kelasId = id; simpanLocal('attendx_kelas', String(id));
      tutupHelaian();
      if (el.dataset.konteks === 'rekod') muatRekod(); else muatSejarah();
    },
    status: (el) => {
      const st = S.rekod.status[el.dataset.id]; const s = el.dataset.s;
      st.status = s;
      if (s !== 'T') { st.sebab = null; st.catatan = ''; }
      render();
    },
    sebab: (el) => {
      const st = S.rekod.status[el.dataset.id];
      st.sebab = el.dataset.v; if (st.sebab !== 'Lain-lain') st.catatan = '';
      render();
    },
    semuaHadir: () => {
      for (const m of S.rekod.murid) S.rekod.status[m.id] = { status: 'H', sebab: null, catatan: '' };
      render(); toast('Semua murid ditanda hadir');
    },
    simpan: () => simpanRekod(),
    tab: (el) => { S.sejarah.tab = el.dataset.v; render(); },
    butiran: (el) => bukaButiran(el.dataset.tarikh),
    ubahRekod: (el) => { tutupHelaian(); S.rekod.tarikh = el.dataset.tarikh; S.view = 'rekod'; window.scrollTo(0, 0); muatRekod(); },
    laporan: () => { if (!S.kelasId) return; S.view = 'laporan'; window.scrollTo(0, 0); render(); },
    cetak: () => window.print(),
    csv: () => muatTurunCSV(),
    logout: async () => { await db.logout(); S.user = null; tutupHelaian(); render(); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const f = AKSI[el.dataset.a];
    if (f) f(el, e);
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.change === 'tarikh') {
      const v = el.value; const R = S.rekod;
      if (!v) { el.value = R.tarikh; return; }
      if (v > Tarikh.hariIni()) { toast('Tarikh akan datang tidak boleh dipilih.', true); el.value = R.tarikh; return; }
      if (Tarikh.cuti(v)) { toast('Jumaat dan Sabtu ialah hari cuti. Pilih hari persekolahan.', true); el.value = R.tarikh; return; }
      if (!sahTinggal()) { el.value = R.tarikh; return; }
      R.tarikh = v; muatRekod();
    } else if (el.dataset.change === 'bulan') {
      S.sejarah.bulan = el.value; muatSejarah();
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.input === 'catatan') S.rekod.status[el.dataset.id].catatan = el.value;
  });

  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'borang-login') return;
    e.preventDefault();
    const emel = document.getElementById('emel').value.trim();
    const kata = document.getElementById('kata').value;
    const btn = document.getElementById('btn-login');
    const $r = document.getElementById('ralat-login');
    if (!emel || !kata) { $r.innerHTML = '<div class="ralat">Isi email dan kata laluan.</div>'; return; }
    btn.disabled = true; btn.textContent = 'Sedang log masuk…'; $r.innerHTML = '';
    try {
      S.user = await db.login(emel, kata);
      mula();
    } catch (err) {
      $r.innerHTML = '<div class="ralat">' + esc(err.message) + '</div>';
      btn.disabled = false; btn.textContent = 'Log masuk';
    }
  });

  window.addEventListener('beforeunload', (e) => { if (berubah()) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Mula ----------
  (async () => {
    S.user = await db.pengguna();
    if (S.user) mula(); else render();
  })();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
