Analisis Proses Embed LSB (Least Significant Bit) Steganography
Gambaran Umum Sistem
Sistem ini adalah aplikasi web untuk menyematkan QR code ke dalam gambar menggunakan teknik LSB (Least Significant Bit) Steganography. Watermark QR code "tersembunyi" di dalam gambar dan tidak terlihat oleh mata manusia.

1. Konsep LSB Steganography
Apa itu LSB?
LSB adalah bit paling kanan dalam representasi biner suatu nilai piksel. Misalnya:

Nilai piksel: 155 (desimal) = 10011011 (biner)
LSB = 1 (bit paling kanan)
Mengapa LSB?
Perubahan LSB hanya mengubah nilai piksel sebesar ±1
Mata manusia tidak dapat mendeteksi perubahan sekecil ini
Contoh: 155 → 154 atau 156 (tidak terlihat bedanya)
2. Alur Proses Embed dari Awal hingga Akhir
A. Tahap Persiapan (Frontend)
// 1. User mengupload dokumen dan mengonfigurasi QR
document.getElementById('embedForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await handleIntegratedEmbedding(this);
});

// 2. Analisis dokumen untuk mendeteksi gambar
async function analyzeDocumentForImages(file) {
    // Kirim dokumen ke server untuk dianalisis
    const formData = new FormData();
    formData.append('documentFile', file);
    const response = await fetch('/analyze_document', {**function showSteganographyVisualization() {
    // Tampilkan animasi proses LSB
    stegoViz.style.display = 'block';
    
    // Update preview gambar original vs watermarked
    updateImagePreviews(imageData);
    
    // Tampilkan metrik kualitas
    if (psnrValue && imageData.psnr) {
        psnrValue.textContent = `${imageData.psnr.toFixed(2)} dB`;
    }
}**
        method: 'POST',
        body: formData
    });
}
B. Tahap Server Processing
Ekstraksi Gambar dari Dokumen

Server menerima dokumen (PDF/DOCX)
Mengekstrak semua gambar yang ada
Menyimpan gambar sementara untuk diproses
Pembuatan/Validasi QR Code

Jika mode "text": Generate QR dari teks input
Jika mode "file": Validasi file QR yang diupload
C. Proses LSB Embedding (Inti)
def embed_qr_to_image(cover_image_path, qr_image_path, output_stego_path):
    # 1. PERSIAPAN
    cover_img = Image.open(cover_image_path).convert('RGB')  # Gambar asli
    qr_img = Image.open(qr_image_path).convert('1')         # QR hitam-putih
    
    # 2. ANALISIS KAPASITAS
    cover_width, cover_height = cover_img.size
    max_capacity = cover_width * cover_height  # Total piksel = total bit yang bisa disimpan
    
    # 3. KONVERSI QR KE BIT STREAM
    # QR diubah menjadi deretan bit: hitam=1, putih=0
    qr_bits = "".join(['1' if qr_img.getpixel((x,y)) == 0 else '0' 
                      for y in range(qr_height) for x in range(qr_width)])
    
    # 4. BUAT HEADER
    # Header berisi informasi dimensi QR (16 bit lebar + 16 bit tinggi + 8 bit terminator)
    header_bits = _int_to_binary(qr_width, 16) + _int_to_binary(qr_height, 16) + '00000000'
    
    # 5. PROSES EMBEDDING
    data_bits = header_bits + qr_bits  # Gabungkan header + data QR
    stego_img = cover_img.copy()
    
    # Iterasi setiap piksel
    for y in range(cover_height):
        for x in range(cover_width):
            if masih_ada_bit:
                r, g, b = stego_img.getpixel((x, y))
                # Modifikasi HANYA channel BIRU
                new_b = _embed_bit(b, bit_to_embed)  
                stego_img.putpixel((x, y), (r, g, new_b))

D. Detail Proses Embedding Bit
def _embed_bit(pixel_value: int, bit: str) -> int:
    """Menyisipkan 1 bit ke LSB"""
    if bit == '0':
        return pixel_value & 254  # Set LSB = 0 (AND dengan 11111110)
    else:
        return pixel_value | 1    # Set LSB = 1 (OR dengan 00000001)
Contoh konkret:

Pixel blue channel asli: 155 (10011011)
Ingin embed bit '0':
155 & 254 = 10011011 & 11111110 = 10011010 = 154
Ingin embed bit '1':
154 | 1 = 10011010 | 00000001 = 10011011 = 155
E. Struktur Data yang Disematkan
[HEADER: 40 bit] + [QR DATA: N bit]

HEADER:
- 16 bit: Lebar QR (max 65535 piksel)
- 16 bit: Tinggi QR (max 65535 piksel)  
- 8 bit: Terminator (00000000)

QR DATA:
- 1 bit per piksel QR
- Disimpan row by row (baris demi baris)
  
F. Optimasi dan Quality Control
def analyze_image_capacity(image_path):
    # Analisis kapasitas dan kompleksitas gambar
    img_array = np.array(img)
    complexity_score = np.std(img_array[:, :, 2])  # Kompleksitas blue channel
    
    # Rekomendasi ukuran QR optimal (70% kapasitas untuk kualitas lebih baik)
    recommended_qr_pixels = int(max_qr_pixels * 0.7)

Auto-resize QR jika terlalu besar:
if total_bits_needed > max_capacity:
    if resize_qr_if_needed:
        qr_img = _resize_qr_for_capacity(qr_img, max_capacity)

G. Metrik Kualitas
Setelah embedding, sistem menghitung:

MSE (Mean Squared Error)

Mengukur perbedaan rata-rata kuadrat antara gambar asli dan stego
Semakin kecil semakin baik
PSNR (Peak Signal-to-Noise Ratio)

Rasio sinyal terhadap noise dalam dB
PSNR > 40 dB = Excellent
PSNR > 30 dB = Good
H. Proses Ekstraksi
def extract_qr_from_image(stego_image_path, output_qr_path):
    # 1. EKSTRAK HEADER
    extracted_bits = ""
    for y in range(height):
        for x in range(width):
            r, g, b = stego_img.getpixel((x, y))
            extracted_bits += _extract_lsb(b)  # Ambil LSB dari blue channel
            # Cek apakah sudah dapat header lengkap
            if len(extracted_bits) >= 40 and extracted_bits.endswith('00000000'):
                # Parse dimensi QR dari header
                qr_width = _binary_to_int(extracted_bits[0:16])
                qr_height = _binary_to_int(extracted_bits[16:32])
                break
    
    # 2. EKSTRAK DATA QR
    # Lanjutkan ekstraksi sebanyak qr_width × qr_height bit
    
    # 3. REKONSTRUKSI QR
    reconstructed_qr = Image.new('1', (qr_width, qr_height))
    for y in range(qr_height):
        for x in range(qr_width):
            if bit == '1':
                reconstructed_qr.putpixel((x, y), 0)  # Hitam
            else:
                reconstructed_qr.putpixel((x, y), 255)  # Putih

3. Visualisasi Real-time di Frontend
Sistem menampilkan progress secara real-time:
function showSteganographyVisualization() {
    // Tampilkan animasi proses LSB
    stegoViz.style.display = 'block';
    
    // Update preview gambar original vs watermarked
    updateImagePreviews(imageData);
    
    // Tampilkan metrik kualitas
    if (psnrValue && imageData.psnr) {
        psnrValue.textContent = `${imageData.psnr.toFixed(2)} dB`;
    }
}****

4. Keamanan Tambahan (Opsional)
Sistem juga mendukung "Document Binding":

QR code diikat ke dokumen spesifik
Menggunakan hash dokumen sebagai kunci
QR tidak bisa digunakan di dokumen lain
5. Hasil Akhir
Dokumen dengan watermark tersembunyi

Gambar terlihat sama dengan aslinya
QR code tersembunyi di LSB blue channel
Hanya bisa diekstrak dengan tool khusus
Laporan kualitas

PSNR dan MSE untuk setiap gambar
Perbandingan visual before/after
Rekomendasi optimasi
Kesimpulan
Proses LSB embedding ini memanfaatkan keterbatasan mata manusia dalam mendeteksi perubahan kecil pada nilai piksel. Dengan hanya mengubah 1 bit terakhir dari channel biru, kita bisa menyembunyikan data (QR code) tanpa mengubah tampilan visual gambar secara signifikan. Sistem ini ideal untuk:

Proteksi hak cipta
Autentikasi dokumen
Tracking distribusi konten
Watermarking tidak terlihat
