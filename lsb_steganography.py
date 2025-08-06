# File: lsb_steganography.py
# Deskripsi: Fungsi inti untuk menyisipkan dan mengekstrak QR Code menggunakan LSB.

from PIL import Image
from PIL.Image import Resampling
import itertools
import os
import math
import logging
import numpy as np
from typing import Dict, Tuple, Union, Optional
import time

# Setup logging for enhanced functionality
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HEADER_TERMINATOR_BIN = '00000000'
HEADER_TERMINATOR_LEN = len(HEADER_TERMINATOR_BIN)


def _int_to_binary(integer: int, bits: int) -> str:
    """
    Konversi integer ke string biner dengan panjang tetap.
    Memastikan output selalu memiliki jumlah bit yang ditentukan dengan padding '0' di depan.
    Contoh: _int_to_binary(10, 8) -> '00001010'
    """
    return format(integer, f'0{bits}b')


def _binary_to_int(binary_string: str) -> int:
    """Konversi string biner ke integer."""
    return int(binary_string, 2)


def _embed_bit(pixel_value: int, bit: str) -> int:
    """
    Menyisipkan satu bit ('0' atau '1') ke LSB (Least Significant Bit)
    dari sebuah nilai integer (byte piksel).
    Jika bit = '0', LSB di-set ke 0.
    Jika bit = '1', LSB di-set ke 1.
    """
    if bit == '0':
        return pixel_value & 254
    else:
        return pixel_value | 1


def _extract_lsb(pixel_value: int) -> str:
    """
    Mengekstrak LSB dari sebuah nilai integer (byte piksel).
    Mengembalikan '1' jika nilai ganjil (LSB=1), '0' jika genap (LSB=0).
    """
    return '1' if pixel_value % 2 == 1 else '0'


def _resize_qr_for_capacity(qr_img, max_capacity: int):
    """
    Menyesuaikan ukuran QR code agar muat dalam kapasitas citra penampung.

    Args:
        qr_img: Objek Image dari QR code yang perlu disesuaikan.
        max_capacity: Kapasitas maksimum yang tersedia dalam bit.

    Returns:
        Objek Image dari QR code yang telah diresize.
    """
    # Kurangi kapasitas untuk header (16+16+8 bit)
    available_bits_for_qr = max_capacity - (16 + 16 + HEADER_TERMINATOR_LEN)

    if available_bits_for_qr <= 0:
        raise ValueError("Kapasitas cover image terlalu kecil bahkan untuk header saja.")

    # Hitung dimensi maksimum berdasarkan akar kuadrat dari kapasitas
    # Kita perlu bilangan bulat yang ketika dikuadratkan <= available_bits_for_qr
    new_dimension = int(math.sqrt(available_bits_for_qr))

    # Jika QR lebih kecil dari dimensi maksimal, tidak perlu diresize
    if qr_img.width <= new_dimension and qr_img.height <= new_dimension:
        return qr_img

    # Resize QR secara proporsional tapi tidak lebih besar dari dimensi maksimum
    new_size = min(new_dimension, new_dimension)
    # Resize QR code dengan tetap mempertahankan mode
    resized_qr = qr_img.resize((new_size, new_size), Resampling.NEAREST)
    print(f"[*] QR code diresize dari {qr_img.width}x{qr_img.height} ke {new_size}x{new_size} agar muat dalam kapasitas.")
    return resized_qr


def embed_qr_to_image(cover_image_path: str, qr_image_path: str, output_stego_path: str, 
                     resize_qr_if_needed: bool = True, progress_callback=None):
    """
    Menyisipkan citra QR Code ke dalam LSB channel Biru dari citra penampung.

    Args:
        cover_image_path (str): Path ke citra penampung (disarankan PNG).
        qr_image_path (str): Path ke citra QR Code yang akan disembunyikan (harus hitam putih).
        output_stego_path (str): Path untuk menyimpan citra hasil (harus PNG).
        resize_qr_if_needed (bool): Jika True, QR code akan diresize otomatis agar muat dalam kapasitas.
        progress_callback (callable): Optional callback function to report progress (progress_percent, message)

    Raises:
        FileNotFoundError: Jika file input tidak ditemukan.
        ValueError: Jika kapasitas citra penampung tidak cukup atau format output salah.
        Exception: Jika terjadi error lain selama proses.
    """

    print("[*] Memulai proses embed_qr_to_image")  # Log awal fungsi

    # Validasi keberadaan file input
    if not os.path.exists(cover_image_path):
        raise FileNotFoundError(f"File cover tidak ditemukan: {cover_image_path}")
    if not os.path.exists(qr_image_path):
        raise FileNotFoundError(f"File QR Code tidak ditemukan: {qr_image_path}")
    # Memastikan output adalah PNG untuk menjaga integritas LSB
    if not output_stego_path.lower().endswith('.png'):
        raise ValueError("Output file harus berformat PNG untuk menjaga LSB.")

    try:
        # 1. Buka kedua citra
        cover_img = Image.open(cover_image_path).convert('RGB')  # Pastikan format RGB
        qr_img = Image.open(qr_image_path).convert('1')  # Konversi QR ke mode 1-bit (hitam/putih)

        # Cek apakah file cover dan QR sama
        if os.path.abspath(cover_image_path) == os.path.abspath(qr_image_path):
            print("[!] Warning: File cover dan QR sama. Ini dapat menyebabkan masalah kapasitas.")

        cover_width, cover_height = cover_img.size
        qr_width, qr_height = qr_img.size

        # Hitung kapasitas citra penampung
        max_capacity = cover_width * cover_height

        # 2. Buat aliran bit dari QR Code
        # Cek dulu jika perlu resize QR
        original_qr_size = (qr_width, qr_height)

        # Perkiraan kebutuhan bit untuk header dan data QR
        header_bits_len = 16 + 16 + HEADER_TERMINATOR_LEN
        qr_bits_len = qr_width * qr_height
        total_bits_needed = header_bits_len + qr_bits_len

        # Jika kapasitas tidak cukup, resize QR jika opsi diaktifkan
        if total_bits_needed > max_capacity:
            if resize_qr_if_needed:
                qr_img = _resize_qr_for_capacity(qr_img, max_capacity)
                qr_width, qr_height = qr_img.size
                print("[*] QR code diresize untuk menyesuaikan dengan kapasitas.")
            else:
                raise ValueError(f"Kapasitas citra tidak cukup. Dibutuhkan: {total_bits_needed} bits, Tersedia: {max_capacity} bits.")

        # Iterasi piksel QR, '1' untuk hitam (nilai 0 di mode '1'), '0' untuk putih (nilai 255)
        qr_bits = "".join(['1' if qr_img.getpixel((x, y)) == 0 else '0'
                          for y in range(qr_height) for x in range(qr_width)])
        num_qr_bits = len(qr_bits)

        # 3. Buat header: 16 bit untuk lebar QR, 16 bit untuk tinggi QR, + terminator
        header_bits = _int_to_binary(qr_width, 16) + _int_to_binary(qr_height, 16) + HEADER_TERMINATOR_BIN
        num_header_bits = len(header_bits)

        # Total bit yang perlu disisipkan
        total_bits_to_embed = num_header_bits + num_qr_bits

        # 4. Cek kapasitas final citra penampung setelah resize (jika ada)
        if total_bits_to_embed > max_capacity:
            raise ValueError(f"Kapasitas citra tidak cukup bahkan setelah resize. Dibutuhkan: {total_bits_to_embed} bits, Tersedia: {max_capacity} bits.")

        # Informasi proses
        print(f"[*] Ukuran QR Code: {qr_width}x{qr_height}")
        if original_qr_size != (qr_width, qr_height):
            print(f"[*] QR Code diresize dari {original_qr_size[0]}x{original_qr_size[1]} ke {qr_width}x{qr_height}")
        print(f"[*] Jumlah bit QR Code: {num_qr_bits}")
        print(f"[*] Jumlah bit Header: {num_header_bits}")
        print(f"[*] Total bit untuk disisipkan: {total_bits_to_embed}")
        print(f"[*] Kapasitas citra penampung (Blue channel LSB): {max_capacity} bits")

        # 5. Siapkan data untuk disisipkan dan citra output
        data_bits_iterator = iter(header_bits + qr_bits)  # Iterator untuk bit header + QR
        stego_img = cover_img.copy()  # Salin citra asli untuk dimodifikasi
        pixels_processed = 0

        # 6. Proses penyisipan bit ke LSB channel Biru dengan progress tracking
        total_pixels = cover_width * cover_height
        for y in range(cover_height):
            for x in range(cover_width):
                try:
                    # Ambil bit berikutnya dari iterator
                    bit_to_embed = next(data_bits_iterator)
                    # Dapatkan nilai RGB piksel saat ini
                    r, g, b = stego_img.getpixel((x, y))
                    # Modifikasi hanya channel Biru (b) dengan bit yang akan disisipkan
                    new_b = _embed_bit(b, bit_to_embed)
                    # Update piksel di citra stego
                    stego_img.putpixel((x, y), (r, g, new_b))
                    pixels_processed += 1
                    
                    # Report progress every 1000 pixels or at completion
                    if progress_callback and (pixels_processed % 1000 == 0 or pixels_processed == total_bits_to_embed):
                        progress_percent = (pixels_processed / total_bits_to_embed) * 100
                        progress_callback(progress_percent, f"Embedding LSB data: {pixels_processed}/{total_bits_to_embed} pixels")
                        
                except StopIteration:
                    # Jika iterator habis (semua bit sudah disisipkan)
                    print(f"[*] Penyisipan selesai. {pixels_processed} piksel dimodifikasi.")
                    if progress_callback:
                        progress_callback(100, f"LSB embedding completed. {pixels_processed} pixels modified.")
                    # Simpan stego image dalam format PNG
                    stego_img.save(output_stego_path, "PNG")
                    print(f"[*] Stego image disimpan di: {output_stego_path}")
                    return  # Keluar dari fungsi setelah penyimpanan berhasil

        # Baris ini seharusnya tidak tercapai jika kapasitas cukup
        print("[!] Warning: Loop selesai tapi tidak semua bit tersisip? Cek logika kapasitas.")
        if progress_callback:
            progress_callback(100, "Warning: Loop completed but not all bits embedded")

    # Menangani error spesifik dan umum
    except FileNotFoundError as e:
        print(f"[!] Error: {e}")
        raise
    except ValueError as e:
        print(f"[!] Error: {e}")
        raise
    except Exception as e:
        print(f"[!] Error saat proses embedding: {e}")
        raise


def extract_qr_from_image(stego_image_path: str, output_qr_path: str):
    """
    Mengekstrak citra QR Code yang tersembunyi dari LSB channel Biru stego image.

    Args:
        stego_image_path (str): Path ke stego image (harus PNG).
        output_qr_path (str): Path untuk menyimpan citra QR hasil ekstraksi (akan dibuat PNG).

    Raises:
        FileNotFoundError: Jika file stego tidak ditemukan.
        ValueError: Jika header tidak valid, terminator tidak ditemukan, atau data tidak cukup.
        Exception: Jika terjadi error lain selama proses.
    """

    print("[*] Memulai proses extract_qr_from_image")  # Log awal fungsi

    # Validasi file input
    if not os.path.exists(stego_image_path):
        raise FileNotFoundError(f"File stego tidak ditemukan: {stego_image_path}")
    # Menyesuaikan output path jika tidak diakhiri .png
    if not output_qr_path.lower().endswith('.png'):
        print("[!] Warning: Output path disarankan .png, akan disimpan sebagai PNG.")
        output_qr_path = os.path.splitext(output_qr_path)[0] + ".png"

    try:
        # Buka stego image dalam mode RGB
        stego_img = Image.open(stego_image_path).convert('RGB')
        width, height = stego_img.size

        extracted_bits = ""  # String untuk menampung bit yang diekstrak
        pixels_processed = 0  # Counter piksel yang diproses
        header_found = False  # Flag penanda header sudah ditemukan
        qr_width = 0
        qr_height = 0
        # Total panjang header = 16 (lebar) + 16 (tinggi) + panjang terminator
        num_header_bits = 16 + 16 + HEADER_TERMINATOR_LEN

        # 1. Ekstrak Header (Dimensi QR)
        print("[*] Mengekstrak header...")
        # Iterasi piksel stego image
        for y in range(height):
            for x in range(width):
                # Dapatkan nilai RGB
                r, g, b = stego_img.getpixel((x, y))
                # Ekstrak LSB dari channel Biru
                extracted_bits += _extract_lsb(b)
                pixels_processed += 1

                # Cek apakah sudah cukup bit untuk header + terminator
                if len(extracted_bits) >= num_header_bits:
                    # Cek apakah bagian akhir bit cocok dengan terminator
                    if extracted_bits.endswith(HEADER_TERMINATOR_BIN):
                        # Ambil bagian header (sebelum terminator)
                        header_data = extracted_bits[:-HEADER_TERMINATOR_LEN]
                        # Pastikan panjangnya 32 bit (16+16)
                        if len(header_data) == 32:
                            # Konversi bit header ke integer untuk lebar dan tinggi
                            qr_width = _binary_to_int(header_data[:16])
                            qr_height = _binary_to_int(header_data[16:])
                            header_found = True
                            print(f"[*] Header ditemukan! Dimensi QR: {qr_width}x{qr_height}")
                            break  # Keluar dari loop x karena header sudah ketemu
                        else:
                            # Error jika panjang header tidak sesuai
                            raise ValueError("Panjang header tidak sesuai setelah terminator ditemukan.")
                    # Jika bit sudah banyak tapi terminator belum ketemu, mungkin error
                    elif len(extracted_bits) > num_header_bits + 500:  # Toleransi batas pencarian
                        raise ValueError("Terminator header tidak ditemukan dalam batas wajar piksel.")

            if header_found:
                break  # Keluar dari loop y jika header sudah ketemu

        # Jika setelah iterasi seluruh piksel header tidak ditemukan
        if not header_found:
            raise ValueError("Gagal menemukan header QR Code dalam citra.")

        # 2. Hitung jumlah bit QR yang perlu diekstrak berdasarkan dimensi
        num_qr_bits_expected = qr_width * qr_height
        total_bits_expected = num_header_bits + num_qr_bits_expected

        print(f"[*] Jumlah bit QR yang diharapkan: {num_qr_bits_expected}")
        print(f"[*] Total bit yang diharapkan (header + QR): {total_bits_expected}")

        # 3. Lanjutkan ekstraksi untuk data QR
        qr_bits_list = []  # List untuk menampung bit QR
        # Indeks piksel tempat ekstraksi header berhenti
        start_pixel_index = pixels_processed

        # Konversi indeks piksel linear ke koordinat (x, y) untuk melanjutkan
        start_y = start_pixel_index // width
        start_x = start_pixel_index % width

        print(f"[*] Melanjutkan ekstraksi dari piksel ({start_x}, {start_y})")

        # Buat iterator piksel yang dimulai dari piksel setelah header
        # dan berhenti setelah mengekstrak sejumlah bit yang diperlukan (num_qr_bits_expected)
        pixel_iterator = itertools.islice(
            ((x_, y_) for y_ in range(start_y, height) for x_ in range(width) if y_ > start_y or (y_ == start_y and x_ >= start_x)),
            num_qr_bits_expected
        )

        bits_extracted_count = 0  # Counter bit QR yang diekstrak
        # Iterasi menggunakan iterator piksel yang sudah dibuat
        for x, y in pixel_iterator:
            r, g, b = stego_img.getpixel((x, y))
            # Ekstrak LSB dari channel Biru dan tambahkan ke list
            qr_bits_list.append(_extract_lsb(b))
            bits_extracted_count += 1

        print(f"[*] Jumlah bit QR yang berhasil diekstrak: {bits_extracted_count}")

        # Cek apakah jumlah bit yang diekstrak sesuai harapan
        if bits_extracted_count < num_qr_bits_expected:
            raise ValueError(f"Data tidak cukup. Hanya {bits_extracted_count} dari {num_qr_bits_expected} bit QR yang bisa diekstrak.")

        # Gabungkan list bit menjadi satu string
        qr_bits = "".join(qr_bits_list)

        # 4. Rekonstruksi citra QR Code dari aliran bit
        print("[*] Merekonstruksi citra QR Code...")
        # Buat citra baru mode '1' (hitam/putih) dengan dimensi yang didapat dari header
        reconstructed_qr = Image.new('1', (qr_width, qr_height))
        bit_index = 0
        # Iterasi koordinat citra QR yang akan dibuat
        for y in range(qr_height):
            for x in range(qr_width):
                # Jika bit = '1' (representasi hitam), set piksel ke 0 (hitam di mode '1')
                if qr_bits[bit_index] == '1':
                    reconstructed_qr.putpixel((x, y), 0)
                # Jika bit = '0' (representasi putih), set piksel ke 255 (putih di mode '1')
                else:
                    reconstructed_qr.putpixel((x, y), 255)
                bit_index += 1

        # Simpan citra QR hasil rekonstruksi
        reconstructed_qr.save(output_qr_path, "PNG")
        print(f"[*] Citra QR Code hasil ekstraksi disimpan di: {output_qr_path}")

    # Menangani error spesifik dan umum
    except FileNotFoundError as e:
        print(f"[!] Error: {e}")
        raise
    except ValueError as e:
        print(f"[!] Error: {e}")
        raise
    except Exception as e:
        print(f"[!] Error saat proses extracting: {e}")
        raise


# ===================================================================
# ENHANCED LSB STEGANOGRAPHY FUNCTIONS
# ===================================================================

def analyze_image_capacity(image_path: str) -> Dict:
    """
    Analyze image capacity for QR embedding with detailed metrics.
    
    Args:
        image_path (str): Path to the cover image
        
    Returns:
        Dict: Comprehensive capacity analysis
    """
    logger.info(f"Analyzing capacity for image: {image_path}")
    
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")
    
    try:
        # Load and analyze image
        img = Image.open(image_path).convert('RGB')
        width, height = img.size
        
        # Calculate basic metrics
        total_pixels = width * height
        usable_capacity = total_pixels  # Each pixel can hold 1 bit in blue channel
        
        # Header requirements (width + height + terminator)
        header_bits = 16 + 16 + HEADER_TERMINATOR_LEN  # 40 bits total
        available_for_qr = usable_capacity - header_bits
        
        # Calculate maximum QR size that can fit
        max_qr_pixels = available_for_qr
        max_qr_dimension = int(math.sqrt(max_qr_pixels))
        
        # Calculate recommended QR size (conservative approach)
        # Use 70% of maximum capacity for better quality
        recommended_qr_pixels = int(max_qr_pixels * 0.7)
        recommended_qr_dimension = int(math.sqrt(recommended_qr_pixels))
        
        # Calculate efficiency score based on image properties
        img_array = np.array(img)
        
        # Analyze image complexity (affects embedding quality)
        # Calculate standard deviation as complexity measure
        complexity_score = np.std(img_array[:, :, 2])  # Blue channel complexity
        
        # Efficiency score (0-100) based on capacity and complexity
        # Higher capacity and lower complexity = higher efficiency
        capacity_score = min(100, (available_for_qr / 100000) * 50)  # Scale capacity
        complexity_penalty = min(50, complexity_score / 5)  # Penalty for high complexity
        efficiency_score = max(0, capacity_score - complexity_penalty)
        
        # Calculate image quality metrics
        mean_brightness = np.mean(img_array)
        contrast_ratio = np.std(img_array) / np.mean(img_array) if np.mean(img_array) > 0 else 0
        
        analysis_result = {
            "total_pixels": total_pixels,
            "usable_capacity": usable_capacity,
            "header_bits": header_bits,
            "available_for_qr": available_for_qr,
            "max_qr_size": {
                "width": max_qr_dimension,
                "height": max_qr_dimension,
                "total_pixels": max_qr_dimension * max_qr_dimension
            },
            "recommended_qr_size": {
                "width": recommended_qr_dimension,
                "height": recommended_qr_dimension,
                "total_pixels": recommended_qr_dimension * recommended_qr_dimension
            },
            "efficiency_score": round(efficiency_score, 1),
            "image_properties": {
                "dimensions": {"width": width, "height": height},
                "mean_brightness": round(mean_brightness, 2),
                "contrast_ratio": round(contrast_ratio, 3),
                "blue_channel_complexity": round(complexity_score, 2)
            },
            "capacity_utilization": {
                "max_utilization": round((max_qr_pixels / total_pixels) * 100, 1),
                "recommended_utilization": round((recommended_qr_pixels / total_pixels) * 100, 1)
            }
        }
        
        logger.info(f"Capacity analysis complete. Available QR capacity: {available_for_qr} bits")
        return analysis_result
        
    except Exception as e:
        logger.error(f"Error analyzing image capacity: {str(e)}")
        raise


def optimize_qr_for_image(cover_image_path: str, qr_data_length: int) -> Dict:
    """
    Determine optimal QR size for given cover image based on data length.
    
    Args:
        cover_image_path (str): Path to cover image
        qr_data_length (int): Length of data to be encoded in QR
        
    Returns:
        Dict: Optimization recommendations
    """
    logger.info(f"Optimizing QR size for image: {cover_image_path}, data length: {qr_data_length}")
    
    # Get capacity analysis first
    capacity_analysis = analyze_image_capacity(cover_image_path)
    
    # Estimate QR version requirements based on data length
    # QR version capacity approximation (alphanumeric mode, error correction L)
    qr_capacities = {
        1: 25, 2: 47, 3: 77, 4: 114, 5: 154, 6: 195, 7: 224, 8: 279, 9: 335, 10: 395,
        11: 468, 12: 535, 13: 619, 14: 667, 15: 758, 16: 854, 17: 938, 18: 1046, 19: 1153, 20: 1249
    }
    
    # Find minimum QR version needed
    required_version = None
    for version, capacity in qr_capacities.items():
        if capacity >= qr_data_length:
            required_version = version
            break
    
    if required_version is None:
        required_version = 20  # Maximum standard version
    
    # Calculate QR module dimensions for required version
    qr_modules = 21 + (required_version - 1) * 4
    
    # Determine optimal pixel size per module
    max_qr_size = capacity_analysis["max_qr_size"]["width"]
    recommended_qr_size = capacity_analysis["recommended_qr_size"]["width"]
    
    # Calculate module sizes
    max_module_size = max_qr_size // qr_modules
    recommended_module_size = recommended_qr_size // qr_modules
    
    # Ensure minimum module size for readability
    min_module_size = 3  # Minimum 3 pixels per module
    
    optimal_module_size = max(min_module_size, recommended_module_size)
    optimal_qr_size = optimal_module_size * qr_modules
    
    # Calculate quality predictions
    embedding_density = (qr_modules * qr_modules) / capacity_analysis["total_pixels"]
    
    # Quality scoring
    if embedding_density < 0.1:
        quality_level = "Excellent"
        predicted_psnr = 50 + (0.1 - embedding_density) * 100
    elif embedding_density < 0.3:
        quality_level = "Good"
        predicted_psnr = 40 + (0.3 - embedding_density) * 50
    elif embedding_density < 0.5:
        quality_level = "Fair"
        predicted_psnr = 35 + (0.5 - embedding_density) * 25
    else:
        quality_level = "Poor"
        predicted_psnr = max(25, 35 - (embedding_density - 0.5) * 20)
    
    optimization_result = {
        "data_requirements": {
            "data_length": qr_data_length,
            "required_qr_version": required_version,
            "qr_modules": qr_modules,
            "minimum_qr_pixels": qr_modules * qr_modules
        },
        "optimal_configuration": {
            "qr_size": optimal_qr_size,
            "module_size": optimal_module_size,
            "total_qr_pixels": optimal_qr_size * optimal_qr_size
        },
        "alternative_configurations": [
            {
                "name": "Maximum Size",
                "qr_size": max_module_size * qr_modules,
                "module_size": max_module_size,
                "quality_level": "Good" if max_module_size >= 4 else "Fair"
            },
            {
                "name": "Conservative",
                "qr_size": min_module_size * qr_modules,
                "module_size": min_module_size,
                "quality_level": "Fair" if min_module_size >= 3 else "Poor"
            }
        ],
        "quality_prediction": {
            "embedding_density": round(embedding_density, 4),
            "quality_level": quality_level,
            "predicted_psnr": round(predicted_psnr, 1),
            "readability_score": min(100, optimal_module_size * 20)
        },
        "capacity_utilization": {
            "used_capacity": optimal_qr_size * optimal_qr_size,
            "available_capacity": capacity_analysis["available_for_qr"],
            "utilization_percentage": round((optimal_qr_size * optimal_qr_size / capacity_analysis["available_for_qr"]) * 100, 1)
        },
        "recommendations": []
    }
    
    # Add specific recommendations
    if embedding_density > 0.5:
        optimization_result["recommendations"].append("Consider using a larger cover image for better quality")
    if optimal_module_size < 4:
        optimization_result["recommendations"].append("QR code may be difficult to scan, consider reducing data length")
    if capacity_analysis["efficiency_score"] < 50:
        optimization_result["recommendations"].append("Cover image has high complexity, quality may be affected")
    if optimization_result["quality_prediction"]["quality_level"] == "Excellent":
        optimization_result["recommendations"].append("Optimal configuration for high-quality embedding")
    
    logger.info(f"QR optimization complete. Optimal size: {optimal_qr_size}x{optimal_qr_size}")
    return optimization_result


def check_qr_compatibility(cover_image_path: str, qr_image_path: str) -> Dict:
    """
    Check if QR can be embedded in cover image with quality metrics.
    
    Args:
        cover_image_path (str): Path to cover image
        qr_image_path (str): Path to QR code image
        
    Returns:
        Dict: Compatibility analysis with quality predictions
    """
    logger.info(f"Checking compatibility: {cover_image_path} + {qr_image_path}")
    
    if not os.path.exists(cover_image_path):
        raise FileNotFoundError(f"Cover image not found: {cover_image_path}")
    if not os.path.exists(qr_image_path):
        raise FileNotFoundError(f"QR image not found: {qr_image_path}")
    
    try:
        # Load images
        cover_img = Image.open(cover_image_path).convert('RGB')
        qr_img = Image.open(qr_image_path).convert('1')
        
        cover_width, cover_height = cover_img.size
        qr_width, qr_height = qr_img.size
        
        # Get capacity analysis
        capacity_analysis = analyze_image_capacity(cover_image_path)
        
        # Calculate requirements
        qr_pixels = qr_width * qr_height
        header_bits = 16 + 16 + HEADER_TERMINATOR_LEN
        total_bits_needed = header_bits + qr_pixels
        available_capacity = capacity_analysis["available_for_qr"]
        
        # Check basic compatibility
        compatible = total_bits_needed <= capacity_analysis["usable_capacity"]
        resize_required = total_bits_needed > available_capacity
        
        # Calculate quality predictions
        if compatible:
            # Simulate embedding process for quality estimation
            cover_array = np.array(cover_img)
            blue_channel = cover_array[:, :, 2].astype(np.float64)
            
            # Calculate baseline statistics
            original_mean = np.mean(blue_channel)
            original_std = np.std(blue_channel)
            
            # Estimate changes from LSB modification
            # Assume worst case: 50% of LSBs change
            modification_ratio = min(1.0, total_bits_needed / capacity_analysis["total_pixels"])
            expected_changes = modification_ratio * 0.5  # 50% of modified pixels change
            
            # Estimate MSE (Mean Squared Error)
            # LSB changes contribute maximum 1 unit difference
            estimated_mse = expected_changes * (0.5 ** 2)  # Average change of 0.5
            
            # Estimate PSNR
            max_pixel_value = 255.0
            if estimated_mse > 0:
                estimated_psnr = 20 * math.log10(max_pixel_value / math.sqrt(estimated_mse))
            else:
                estimated_psnr = float('inf')
            
            # Adjust estimates based on image properties
            complexity_factor = capacity_analysis["image_properties"]["blue_channel_complexity"] / 50.0
            estimated_psnr = estimated_psnr - (complexity_factor * 2)  # Reduce PSNR for complex images
            
            quality_prediction = {
                "mse_estimate": round(estimated_mse, 4),
                "psnr_estimate": round(min(estimated_psnr, 60.0), 1),  # Cap at reasonable maximum
                "quality_level": "Excellent" if estimated_psnr > 45 else 
                               "Good" if estimated_psnr > 35 else 
                               "Fair" if estimated_psnr > 25 else "Poor"
            }
        else:
            quality_prediction = {
                "mse_estimate": None,
                "psnr_estimate": None,
                "quality_level": "Incompatible"
            }
        
        # Calculate resize recommendation if needed
        resize_recommendation = None
        if resize_required:
            max_qr_pixels = available_capacity
            new_dimension = int(math.sqrt(max_qr_pixels))
            resize_recommendation = {
                "current_size": {"width": qr_width, "height": qr_height},
                "recommended_size": {"width": new_dimension, "height": new_dimension},
                "size_reduction": round((1 - (new_dimension * new_dimension) / qr_pixels) * 100, 1)
            }
        
        # Generate recommendations
        recommendations = []
        
        if not compatible:
            recommendations.append("QR code is too large for this cover image")
            recommendations.append("Consider using a larger cover image or smaller QR code")
        elif resize_required:
            recommendations.append(f"QR code needs to be resized to {resize_recommendation['recommended_size']['width']}x{resize_recommendation['recommended_size']['height']}")
            recommendations.append("Resize will be performed automatically during embedding")
        else:
            if quality_prediction["quality_level"] == "Excellent":
                recommendations.append("QR size is optimal for this image")
                recommendations.append("High quality embedding expected")
            elif quality_prediction["quality_level"] == "Good":
                recommendations.append("Good quality embedding expected")
            elif quality_prediction["quality_level"] == "Fair":
                recommendations.append("Acceptable quality, but consider optimizing QR size")
            else:
                recommendations.append("Quality may be affected, consider using different parameters")
        
        # Add specific technical recommendations
        utilization = (total_bits_needed / capacity_analysis["total_pixels"]) * 100
        if utilization > 50:
            recommendations.append("High capacity utilization may affect image quality")
        
        if capacity_analysis["image_properties"]["blue_channel_complexity"] > 30:
            recommendations.append("Cover image has high complexity in blue channel")
        
        compatibility_result = {
            "compatible": compatible,
            "resize_required": resize_required,
            "capacity_analysis": {
                "qr_bits_needed": qr_pixels,
                "header_bits_needed": header_bits,
                "total_bits_needed": total_bits_needed,
                "available_capacity": available_capacity,
                "capacity_utilization": round((total_bits_needed / capacity_analysis["total_pixels"]) * 100, 1)
            },
            "quality_prediction": quality_prediction,
            "resize_recommendation": resize_recommendation,
            "image_properties": {
                "cover_size": {"width": cover_width, "height": cover_height},
                "qr_size": {"width": qr_width, "height": qr_height},
                "cover_efficiency": capacity_analysis["efficiency_score"]
            },
            "recommendations": recommendations,
            "processing_time": time.time()
        }
        
        logger.info(f"Compatibility check complete. Compatible: {compatible}, Resize needed: {resize_required}")
        return compatibility_result
        
    except Exception as e:
        logger.error(f"Error checking QR compatibility: {str(e)}")
        raise


def enhanced_resize_qr(qr_img: Image.Image, target_size: Tuple[int, int], 
                      algorithm: str = "lanczos") -> Dict:
    """
    Enhanced QR resizing with better algorithms and quality predictions.
    
    Args:
        qr_img (Image.Image): QR code image to resize
        target_size (Tuple[int, int]): Target (width, height)
        algorithm (str): Resize algorithm ('nearest', 'lanczos', 'bicubic')
        
    Returns:
        Dict: Resized image and quality metrics
    """
    logger.info(f"Enhanced QR resize from {qr_img.size} to {target_size} using {algorithm}")
    
    original_size = qr_img.size
    
    # Select resampling algorithm
    algorithm_map = {
        'nearest': Resampling.NEAREST,
        'lanczos': Resampling.LANCZOS,
        'bicubic': Resampling.BICUBIC,
        'bilinear': Resampling.BILINEAR
    }
    
    if algorithm not in algorithm_map:
        algorithm = 'lanczos'  # Default to Lanczos
        logger.warning(f"Unknown algorithm, using Lanczos")
    
    resampling_method = algorithm_map[algorithm]
    
    try:
        # Perform resize
        start_time = time.time()
        resized_qr = qr_img.resize(target_size, resampling_method)
        resize_time = time.time() - start_time
        
        # Calculate quality metrics
        original_pixels = original_size[0] * original_size[1]
        resized_pixels = target_size[0] * target_size[1]
        
        size_change_ratio = resized_pixels / original_pixels
        
        # Predict readability based on size change
        if size_change_ratio > 1:
            readability_score = min(100, 90 + (size_change_ratio - 1) * 10)
            quality_level = "Enhanced"
        elif size_change_ratio > 0.5:
            readability_score = 80 + (size_change_ratio - 0.5) * 20
            quality_level = "Good"
        elif size_change_ratio > 0.25:
            readability_score = 60 + (size_change_ratio - 0.25) * 80
            quality_level = "Fair"
        else:
            readability_score = max(20, 60 * size_change_ratio / 0.25)
            quality_level = "Poor"
        
        # Algorithm-specific quality adjustments
        algorithm_quality_bonus = {
            'lanczos': 5,
            'bicubic': 3,
            'bilinear': 1,
            'nearest': -2
        }
        
        readability_score += algorithm_quality_bonus.get(algorithm, 0)
        readability_score = max(0, min(100, readability_score))
        
        resize_result = {
            "resized_image": resized_qr,
            "original_size": original_size,
            "new_size": target_size,
            "size_change_ratio": round(size_change_ratio, 3),
            "algorithm_used": algorithm,
            "quality_metrics": {
                "readability_score": round(readability_score, 1),
                "quality_level": quality_level,
                "size_reduction_percent": round((1 - size_change_ratio) * 100, 1) if size_change_ratio < 1 else 0,
                "size_increase_percent": round((size_change_ratio - 1) * 100, 1) if size_change_ratio > 1 else 0
            },
            "performance": {
                "resize_time": round(resize_time, 4),
                "pixels_processed": original_pixels
            },
            "recommendations": []
        }
        
        # Add recommendations based on results
        if readability_score < 50:
            resize_result["recommendations"].append("QR code may be difficult to scan after resize")
        if size_change_ratio < 0.3:
            resize_result["recommendations"].append("Significant size reduction may affect QR readability")
        if algorithm == 'nearest' and size_change_ratio != 1:
            resize_result["recommendations"].append("Consider using Lanczos algorithm for better quality")
        
        logger.info(f"QR resize complete. Quality score: {readability_score}")
        return resize_result
        
    except Exception as e:
        logger.error(f"Error in enhanced QR resize: {str(e)}")
        raise


def batch_analyze_images(image_paths: list, output_format: str = "summary") -> Dict:
    """
    Batch processing for multiple image capacity analysis.
    
    Args:
        image_paths (list): List of image paths to analyze
        output_format (str): "summary" or "detailed"
        
    Returns:
        Dict: Batch analysis results
    """
    logger.info(f"Starting batch analysis of {len(image_paths)} images")
    
    batch_results = {
        "total_images": len(image_paths),
        "successful_analyses": 0,
        "failed_analyses": 0,
        "processing_time": 0,
        "results": [],
        "summary_statistics": {}
    }
    
    start_time = time.time()
    capacities = []
    efficiency_scores = []
    
    for i, image_path in enumerate(image_paths):
        try:
            logger.info(f"Processing image {i+1}/{len(image_paths)}: {image_path}")
            
            analysis = analyze_image_capacity(image_path)
            
            if output_format == "detailed":
                batch_results["results"].append({
                    "image_path": image_path,
                    "analysis": analysis,
                    "status": "success"
                })
            else:
                batch_results["results"].append({
                    "image_path": image_path,
                    "available_capacity": analysis["available_for_qr"],
                    "efficiency_score": analysis["efficiency_score"],
                    "recommended_qr_size": analysis["recommended_qr_size"],
                    "status": "success"
                })
            
            capacities.append(analysis["available_for_qr"])
            efficiency_scores.append(analysis["efficiency_score"])
            batch_results["successful_analyses"] += 1
            
        except Exception as e:
            logger.error(f"Failed to analyze {image_path}: {str(e)}")
            batch_results["results"].append({
                "image_path": image_path,
                "error": str(e),
                "status": "failed"
            })
            batch_results["failed_analyses"] += 1
    
    # Calculate summary statistics
    if capacities:
        batch_results["summary_statistics"] = {
            "capacity_stats": {
                "min": min(capacities),
                "max": max(capacities),
                "mean": sum(capacities) / len(capacities),
                "median": sorted(capacities)[len(capacities)//2]
            },
            "efficiency_stats": {
                "min": min(efficiency_scores),
                "max": max(efficiency_scores),
                "mean": sum(efficiency_scores) / len(efficiency_scores)
            }
        }
    
    batch_results["processing_time"] = round(time.time() - start_time, 2)
    
    logger.info(f"Batch analysis complete. Success: {batch_results['successful_analyses']}, "
                f"Failed: {batch_results['failed_analyses']}")
    
    return batch_results

