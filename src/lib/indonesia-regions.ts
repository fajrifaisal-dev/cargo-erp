export interface IndonesiaCity {
  city: string;
  province: string;
}

const PROVINCE_CITIES: Record<string, string[]> = {
  'Aceh': [
    'Aceh Barat', 'Aceh Barat Daya', 'Aceh Besar', 'Aceh Jaya', 'Aceh Selatan',
    'Aceh Singkil', 'Aceh Tamiang', 'Aceh Tengah', 'Aceh Tenggara', 'Aceh Timur',
    'Aceh Utara', 'Banda Aceh', 'Bener Meriah', 'Bireuen', 'Gayo Lues',
    'Langsa', 'Lhokseumawe', 'Nagan Raya', 'Pidie', 'Pidie Jaya', 'Sabang',
    'Simeulue', 'Subulussalam',
  ],
  'Sumatera Utara': [
    'Asahan', 'Batu Bara', 'Binjai', 'Dairi', 'Deli Serdang', 'Gunungsitoli',
    'Humbang Hasundutan', 'Karo', 'Labuhanbatu', 'Langkat', 'Mandailing Natal',
    'Medan', 'Nias', 'Padangsidimpuan', 'Pematangsiantar', 'Samosir',
    'Serdang Bedagai', 'Sibolga', 'Simalungun', 'Tanjungbalai', 'Tapanuli Selatan',
    'Tapanuli Tengah', 'Tapanuli Utara', 'Tebing Tinggi', 'Toba',
  ],
  'Sumatera Barat': [
    'Agam', 'Bukittinggi', 'Dharmasraya', 'Padang', 'Padang Panjang',
    'Padang Pariaman', 'Pariaman', 'Pasaman', 'Pasaman Barat', 'Payakumbuh',
    'Pesisir Selatan', 'Sawahlunto', 'Sijunjung', 'Solok', 'Tanah Datar',
  ],
  'Riau': [
    'Bengkalis', 'Dumai', 'Indragiri Hilir', 'Indragiri Hulu', 'Kampar',
    'Kuantan Singingi', 'Pekanbaru', 'Pelalawan', 'Rokan Hilir', 'Rokan Hulu', 'Siak',
  ],
  'Kepulauan Riau': [
    'Batam', 'Bintan', 'Karimun', 'Kepulauan Anambas', 'Lingga', 'Natuna', 'Tanjungpinang',
  ],
  'Jambi': [
    'Batanghari', 'Bungo', 'Jambi', 'Kerinci', 'Merangin', 'Muaro Jambi',
    'Sarolangun', 'Sungai Penuh', 'Tanjung Jabung Barat', 'Tanjung Jabung Timur', 'Tebo',
  ],
  'Sumatera Selatan': [
    'Banyuasin', 'Empat Lawang', 'Lahat', 'Lubuklinggau', 'Muara Enim',
    'Musi Banyuasin', 'Musi Rawas', 'Ogan Ilir', 'Ogan Komering Ilir',
    'Ogan Komering Ulu', 'Pagar Alam', 'Palembang', 'Prabumulih',
  ],
  'Kepulauan Bangka Belitung': [
    'Bangka', 'Bangka Barat', 'Bangka Selatan', 'Bangka Tengah', 'Belitung',
    'Belitung Timur', 'Pangkalpinang',
  ],
  'Bengkulu': [
    'Bengkulu', 'Bengkulu Selatan', 'Bengkulu Tengah', 'Bengkulu Utara',
    'Kaur', 'Kepahiang', 'Lebong', 'Mukomuko', 'Rejang Lebong', 'Seluma',
  ],
  'Lampung': [
    'Bandar Lampung', 'Lampung Barat', 'Lampung Selatan', 'Lampung Tengah',
    'Lampung Timur', 'Lampung Utara', 'Mesuji', 'Metro', 'Pesawaran',
    'Pringsewu', 'Tanggamus', 'Tulang Bawang', 'Way Kanan',
  ],
  'DKI Jakarta': [
    'Jakarta Barat', 'Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Timur',
    'Jakarta Utara', 'Kepulauan Seribu',
  ],
  'Banten': [
    'Cilegon', 'Lebak', 'Pandeglang', 'Serang', 'Tangerang', 'Tangerang Selatan',
  ],
  'Jawa Barat': [
    'Bandung', 'Bandung Barat', 'Kota Banjar', 'Bekasi', 'Bogor', 'Ciamis', 'Cianjur',
    'Cimahi', 'Cirebon', 'Depok', 'Garut', 'Indramayu', 'Karawang', 'Kuningan',
    'Majalengka', 'Pangandaran', 'Purwakarta', 'Subang', 'Sukabumi', 'Sumedang', 'Tasikmalaya',
  ],
  'Jawa Tengah': [
    'Banjarnegara', 'Banyumas', 'Batang', 'Blora', 'Boyolali', 'Brebes',
    'Cilacap', 'Demak', 'Grobogan', 'Jepara', 'Karanganyar', 'Kebumen',
    'Kendal', 'Klaten', 'Kudus', 'Magelang', 'Pati', 'Pekalongan', 'Pemalang',
    'Purbalingga', 'Purworejo', 'Rembang', 'Salatiga', 'Semarang', 'Sragen',
    'Sukoharjo', 'Surakarta (Solo)', 'Tegal', 'Temanggung', 'Wonogiri', 'Wonosobo',
  ],
  'DI Yogyakarta': [
    'Bantul', 'Gunungkidul', 'Kulon Progo', 'Sleman', 'Yogyakarta',
  ],
  'Jawa Timur': [
    'Bangkalan', 'Banyuwangi', 'Batu', 'Blitar', 'Bojonegoro', 'Bondowoso',
    'Gresik', 'Jember', 'Jombang', 'Kediri', 'Lamongan', 'Lumajang', 'Madiun',
    'Magetan', 'Malang', 'Mojokerto', 'Nganjuk', 'Ngawi', 'Pacitan', 'Pamekasan',
    'Pasuruan', 'Ponorogo', 'Probolinggo', 'Sampang', 'Sidoarjo', 'Situbondo',
    'Sumenep', 'Surabaya', 'Trenggalek', 'Tuban', 'Tulungagung',
  ],
  'Bali': [
    'Badung', 'Bangli', 'Buleleng', 'Denpasar', 'Gianyar', 'Jembrana',
    'Karangasem', 'Klungkung', 'Tabanan',
  ],
  'Nusa Tenggara Barat': [
    'Bima', 'Dompu', 'Lombok Barat', 'Lombok Tengah', 'Lombok Timur',
    'Lombok Utara', 'Mataram', 'Sumbawa', 'Sumbawa Barat',
  ],
  'Nusa Tenggara Timur': [
    'Alor', 'Belu', 'Ende', 'Flores Timur', 'Kupang', 'Lembata', 'Manggarai',
    'Manggarai Barat', 'Manggarai Timur', 'Nagekeo', 'Ngada', 'Rote Ndao',
    'Sikka', 'Sumba Barat', 'Sumba Timur', 'Timor Tengah Selatan', 'Timor Tengah Utara',
  ],
  'Kalimantan Barat': [
    'Bengkayang', 'Kapuas Hulu', 'Kayong Utara', 'Ketapang', 'Kubu Raya',
    'Landak', 'Melawi', 'Mempawah', 'Pontianak', 'Sambas', 'Sanggau', 'Sekadau',
    'Singkawang', 'Sintang',
  ],
  'Kalimantan Tengah': [
    'Barito Selatan', 'Barito Timur', 'Barito Utara', 'Gunung Mas', 'Kapuas',
    'Katingan', 'Kotawaringin Barat', 'Kotawaringin Timur', 'Lamandau',
    'Murung Raya', 'Palangka Raya', 'Pulang Pisau', 'Seruyan', 'Sukamara',
  ],
  'Kalimantan Selatan': [
    'Balangan', 'Kab. Banjar', 'Banjarbaru', 'Banjarmasin', 'Barito Kuala',
    'Hulu Sungai Selatan', 'Hulu Sungai Tengah', 'Hulu Sungai Utara',
    'Kotabaru', 'Tabalong', 'Tanah Bumbu', 'Tanah Laut', 'Tapin',
  ],
  'Kalimantan Timur': [
    'Balikpapan', 'Berau', 'Bontang', 'Kutai Barat', 'Kutai Kartanegara',
    'Kutai Timur', 'Mahakam Ulu', 'Paser', 'Penajam Paser Utara', 'Samarinda',
  ],
  'Kalimantan Utara': [
    'Bulungan', 'Malinau', 'Nunukan', 'Tana Tidung', 'Tarakan',
  ],
  'Sulawesi Utara': [
    'Bitung', 'Bolaang Mongondow', 'Kepulauan Sangihe', 'Kepulauan Talaud',
    'Kotamobagu', 'Manado', 'Minahasa', 'Minahasa Selatan', 'Minahasa Tenggara',
    'Minahasa Utara', 'Tomohon',
  ],
  'Gorontalo': [
    'Boalemo', 'Bone Bolango', 'Gorontalo', 'Gorontalo Utara', 'Pohuwato',
  ],
  'Sulawesi Tengah': [
    'Banggai', 'Banggai Kepulauan', 'Banggai Laut', 'Buol', 'Donggala',
    'Morowali', 'Morowali Utara', 'Palu', 'Parigi Moutong', 'Poso', 'Sigi',
    'Tojo Una-Una', 'Tolitoli',
  ],
  'Sulawesi Barat': [
    'Majene', 'Mamasa', 'Mamuju', 'Mamuju Tengah', 'Pasangkayu', 'Polewali Mandar',
  ],
  'Sulawesi Selatan': [
    'Bantaeng', 'Barru', 'Bone', 'Bulukumba', 'Enrekang', 'Gowa', 'Jeneponto',
    'Kepulauan Selayar', 'Luwu', 'Luwu Timur', 'Luwu Utara', 'Makassar',
    'Maros', 'Palopo', 'Pangkajene dan Kepulauan', 'Parepare', 'Pinrang',
    'Sidenreng Rappang', 'Sinjai', 'Soppeng', 'Takalar', 'Tana Toraja',
    'Toraja Utara', 'Wajo',
  ],
  'Sulawesi Tenggara': [
    'Bau-Bau', 'Bombana', 'Buton', 'Buton Utara', 'Kendari', 'Kolaka',
    'Kolaka Utara', 'Konawe', 'Konawe Selatan', 'Konawe Utara', 'Muna', 'Wakatobi',
  ],
  'Maluku': [
    'Ambon', 'Buru', 'Buru Selatan', 'Kepulauan Aru', 'Kepulauan Tanimbar',
    'Maluku Barat Daya', 'Maluku Tengah', 'Maluku Tenggara', 'Seram Bagian Barat',
    'Seram Bagian Timur', 'Tual',
  ],
  'Maluku Utara': [
    'Halmahera Barat', 'Halmahera Selatan', 'Halmahera Tengah',
    'Halmahera Timur', 'Halmahera Utara', 'Kepulauan Sula', 'Pulau Morotai',
    'Pulau Taliabu', 'Ternate', 'Tidore Kepulauan',
  ],
  'Papua': [
    'Biak Numfor', 'Jayapura', 'Keerom', 'Kepulauan Yapen', 'Mamberamo Raya',
    'Sarmi', 'Supiori', 'Waropen',
  ],
  'Papua Barat': [
    'Fakfak', 'Kaimana', 'Manokwari', 'Manokwari Selatan', 'Pegunungan Arfak',
    'Teluk Bintuni', 'Teluk Wondama',
  ],
  'Papua Barat Daya': [
    'Maybrat', 'Raja Ampat', 'Sorong', 'Sorong Selatan', 'Tambrauw',
  ],
  'Papua Tengah': [
    'Deiyai', 'Dogiyai', 'Intan Jaya', 'Mimika (Timika)', 'Nabire', 'Paniai', 'Puncak', 'Puncak Jaya',
  ],
  'Papua Pegunungan': [
    'Jayawijaya (Wamena)', 'Lanny Jaya', 'Mamberamo Tengah', 'Nduga',
    'Pegunungan Bintang', 'Tolikara', 'Yahukimo', 'Yalimo',
  ],
  'Papua Selatan': [
    'Asmat', 'Boven Digoel', 'Mappi', 'Merauke',
  ],
};

export const INDONESIA_CITIES: IndonesiaCity[] = Object.entries(PROVINCE_CITIES)
  .flatMap(([province, cities]) => cities.map((city) => ({ city, province })))
  .sort((a, b) => a.city.localeCompare(b.city, 'id'));

export function findProvinceByCity(cityName: string): string | null {
  const target = cityName.trim().toLowerCase();
  const match = INDONESIA_CITIES.find((c) => c.city.toLowerCase() === target);
  return match ? match.province : null;
}
