/**
 * Result Embed JavaScript - Enhanced Steganography Results Display
 * Handles the display and interaction of LSB steganography results
 */

class SteganographyResultManager {
  constructor() {
    this.processedImages = [];
    this.currentImageIndex = 0;
    this.qrCodeData = null;
    this.qualityMetrics = {};
    this.processInfo = {};

    this.init();
  }

  init() {
    console.log('Initializing Steganography Result Manager');
    this.setupEventListeners();
    this.loadResults();
  }

  setupEventListeners() {
    // View toggle buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('.toggle-btn')) {
        this.handleViewToggle(e.target);
      }

      // Gallery item clicks
      if (e.target.closest('.gallery-item')) {
        const index = Array.from(document.querySelectorAll('.gallery-item')).indexOf(e.target.closest('.gallery-item'));
        if (this.processedImages[index]) {
          this.openImageModal(this.processedImages[index], index);
        }
      }

      // Download buttons
      if (e.target.closest('.download-btn')) {
        this.handleDownload(e.target.closest('.download-btn'));
      }

      // Modal overlay close
      if (e.target.matches('.modal-overlay')) {
        this.closeImageModal();
      }

      // Modal close button
      if (e.target.matches('.modal-close')) {
        this.closeImageModal();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeImageModal();
      }
    });
  }

  handleViewToggle(button) {
    const view = button.getAttribute('data-view');

    // Update button states
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');

    // Show target view
    document.querySelectorAll('.view-content').forEach(content => {
      content.classList.remove('active');
    });

    const targetView = document.getElementById(view + 'View');
    if (targetView) {
      targetView.classList.add('active');

      if (view === 'comparison' && this.processedImages.length > 0) {
        this.showComparison(this.processedImages[0]);
      }
    }
  }

  loadResults() {
    console.log('Loading steganography results...');

    // Try to get results from URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      this.fetchProcessingResults(sessionId);
    } else {
      // Try to get from sessionStorage
      const savedResults = sessionStorage.getItem('steganographyResults') ||
        sessionStorage.getItem('embedResults');
      if (savedResults) {
        try {
          const results = JSON.parse(savedResults);
          this.displayResults(results);
        } catch (e) {
          console.error('Error parsing saved results:', e);
          this.showNoResults();
        }
      } else {
        // Load demo data for testing
        this.loadDemoData();
      }
    }
  }

  loadDemoData() {
    console.log('Loading demo data for testing...');
    const demoData = {
      total_images: 3,
      processed_images: [
        {
          filename: 'image_001.png',
          original_path: '/static/uploads/original_001.png',
          processed_path: '/static/generated/processed_001.png',
          psnr: 42.5,
          mse: 0.0023,
          ssim: 0.9876,
          resolution: '1920x1080',
          file_size: 2048576,
          bits_per_pixel: 1.2,
          capacity_used: '15%',
          embed_status: 'success'
        },
        {
          filename: 'image_002.png',
          original_path: '/static/uploads/original_002.png',
          processed_path: '/static/generated/processed_002.png',
          psnr: 38.9,
          mse: 0.0034,
          ssim: 0.9821,
          resolution: '1280x720',
          file_size: 1536000,
          bits_per_pixel: 1.5,
          capacity_used: '20%',
          embed_status: 'success'
        },
        {
          filename: 'image_003.png',
          original_path: '/static/uploads/original_003.png',
          processed_path: '/static/generated/processed_003.png',
          psnr: 45.2,
          mse: 0.0018,
          ssim: 0.9912,
          resolution: '800x600',
          file_size: 1024000,
          bits_per_pixel: 0.8,
          capacity_used: '10%',
          embed_status: 'success'
        }
      ],
      qr_data: {
        data: 'https://example.com/document/12345',
        size: '25x25',
        error_correction: 'M',
        image_path: '/static/generated/qr_code.png'
      },
      quality_metrics: {
        average_psnr: '42.2',
        average_mse: '0.0025',
        average_ssim: '0.9870'
      },
      process_info: {
        duration: '2.5 detik',
        capacity_used: '15% rata-rata'
      },
      download_links: {
        document: '/download/document/processed.docx',
        images: '/download/images/all_images.zip',
        report: '/download/report/analysis.pdf'
      }
    };

    this.displayResults(demoData);
  }

  async fetchProcessingResults(sessionId) {
    try {
      this.showLoading();

      const response = await fetch(`/api/get-processing-results/${sessionId}`);
      const data = await response.json();

      this.hideLoading();

      if (data.success) {
        this.displayResults(data.results);
        // Cache results for future reference
        sessionStorage.setItem('steganographyResults', JSON.stringify(data.results));
      } else {
        this.showError('Gagal memuat hasil processing: ' + data.error);
        // Fallback to demo data
        this.loadDemoData();
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error fetching results:', error);
      this.showError('Terjadi kesalahan saat memuat hasil.');
      // Fallback to demo data
      this.loadDemoData();
    }
  }

  displayResults(results) {
    console.log('Displaying steganography results:', results);

    // Store results
    this.processedImages = results.processed_images || [];
    this.qrCodeData = results.qr_data || null;
    this.qualityMetrics = results.quality_metrics || {};
    this.processInfo = results.process_info || {};

    // Update UI components
    this.updateStatistics(results);
    this.displayProcessedImages();
    this.displayQRInfo();
    this.displayQualityMetrics();
    this.displayProcessInfo();
    this.setupDownloadLinks(results.download_links || {});
  }

  updateStatistics(results) {
    const stats = {
      totalImages: results.total_images || this.processedImages.length,
      processedImages: this.processedImages.length,
      qrEmbedded: results.qr_embedded || (this.qrCodeData ? 1 : 0),
      averageQuality: this.calculateAverageQuality()
    };

    console.log('Updating statistics:', stats);

    // Animate statistics
    this.animateNumber('totalImages', stats.totalImages);
    this.animateNumber('processedImages', stats.processedImages);
    this.animateNumber('qrEmbedded', stats.qrEmbedded);
    this.animateNumber('averageQuality', Math.round(stats.averageQuality), '%');
  }

  calculateAverageQuality() {
    if (!this.processedImages.length) return 0;

    const psnrValues = this.processedImages
      .map(img => parseFloat(img.psnr))
      .filter(val => !isNaN(val) && val > 0);

    if (!psnrValues.length) return 85; // Default quality

    const avgPSNR = psnrValues.reduce((sum, val) => sum + val, 0) / psnrValues.length;

    // Convert PSNR to quality percentage (rough estimation)
    if (avgPSNR >= 40) return 90 + Math.min(10, ((avgPSNR - 40) / 10) * 10);
    if (avgPSNR >= 30) return 70 + ((avgPSNR - 30) / 10) * 20;
    if (avgPSNR >= 20) return 50 + ((avgPSNR - 20) / 10) * 20;
    return Math.max(0, (avgPSNR / 20) * 50);
  }

  animateNumber(elementId, targetValue, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with id '${elementId}' not found`);
      return;
    }

    const startValue = 0;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);

      element.textContent = currentValue + suffix;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  displayProcessedImages() {
    const gallery = document.getElementById('imageGallery');
    if (!gallery) {
      console.warn('Image gallery element not found');
      return;
    }

    const emptyState = gallery.querySelector('.gallery-empty');

    if (!this.processedImages.length) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Clear existing items
    gallery.querySelectorAll('.gallery-item').forEach(item => item.remove());

    // Add new items
    this.processedImages.forEach((image, index) => {
      const galleryItem = this.createGalleryItem(image, index);
      gallery.appendChild(galleryItem);
    });

    console.log(`Displayed ${this.processedImages.length} processed images`);
  }

  createGalleryItem(imageData, index) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.animationDelay = `${index * 0.1}s`;

    // Format metrics for display
    const psnr = imageData.psnr ? parseFloat(imageData.psnr).toFixed(2) : 'N/A';
    const mse = imageData.mse ? parseFloat(imageData.mse).toFixed(4) : 'N/A';
    const ssim = imageData.ssim ? parseFloat(imageData.ssim).toFixed(4) : 'N/A';

    // Use placeholder image if path is not available
    const imageSrc = imageData.processed_path || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTZiNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIFByZXZpZXc8L3RleHQ+PC9zdmc+';

    item.innerHTML = `
            <div class="gallery-image">
                <img src="${imageSrc}" alt="Processed Image ${index + 1}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTZiNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';">
                <div class="image-overlay">
                    <div class="overlay-info">
                        <h4>${this.getDisplayName(imageData.filename, index)}</h4>
                        <p>PSNR: ${psnr} dB</p>
                    </div>
                </div>
            </div>
            <div class="gallery-info">
                <h4 class="image-title">${this.getDisplayName(imageData.filename, index)}</h4>
                <div class="image-stats">
                    <div class="stat-mini">
                        <span class="stat-mini-value">${psnr}</span>
                        <span class="stat-mini-label">PSNR</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">${mse}</span>
                        <span class="stat-mini-label">MSE</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">${ssim}</span>
                        <span class="stat-mini-label">SSIM</span>
                    </div>
                </div>
            </div>
        `;

    return item;
  }

  getDisplayName(filename, index) {
    return filename || `Image ${index + 1}`;
  }

  displayQRInfo() {
    if (!this.qrCodeData) {
      console.log('No QR code data available');
      return;
    }

    // Update QR preview
    const qrPreview = document.querySelector('.qr-preview');
    if (qrPreview && this.qrCodeData.image_path) {
      qrPreview.innerHTML = `<img src="${this.qrCodeData.image_path}" alt="QR Code" onerror="this.parentElement.innerHTML='<div class=\\'qr-placeholder\\'><i class=\\'fas fa-qrcode\\'></i><span>QR Code</span></div>';">`;
    }

    // Update QR information
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '-';
    };

    updateElement('qrData', this.qrCodeData.data);
    updateElement('qrSize', this.qrCodeData.size);
    updateElement('qrErrorLevel', this.qrCodeData.error_correction);

    console.log('QR info updated:', this.qrCodeData);
  }

  displayQualityMetrics() {
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '-';
    };

    updateElement('psnrValue', this.qualityMetrics.average_psnr);
    updateElement('mseValue', this.qualityMetrics.average_mse);
    updateElement('ssimValue', this.qualityMetrics.average_ssim);

    console.log('Quality metrics updated:', this.qualityMetrics);
  }

  displayProcessInfo() {
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '-';
    };

    updateElement('processTime', this.processInfo.duration);
    updateElement('capacityUsed', this.processInfo.capacity_used);

    console.log('Process info updated:', this.processInfo);
  }

  setupDownloadLinks(downloadLinks) {
    const buttons = {
      'downloadDocument': downloadLinks.document,
      'downloadImages': downloadLinks.images,
      'downloadReport': downloadLinks.report
    };

    Object.entries(buttons).forEach(([buttonId, url]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        if (url) {
          button.onclick = () => this.downloadFile(url, buttonId.replace('download', '').toLowerCase());
          button.style.opacity = '1';
          button.style.pointerEvents = 'auto';
        } else {
          button.style.opacity = '0.6';
          button.style.pointerEvents = 'none';
          button.onclick = () => this.showAlert(`Download ${buttonId.replace('download', '').toLowerCase()} tidak tersedia`, 'info');
        }
      }
    });
  }

  downloadFile(url, type) {
    this.showDownloadProgress(type);

    // Create temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Hide progress after a delay
    setTimeout(() => this.hideDownloadProgress(type), 2000);

    // Show success message
    this.showAlert('Download dimulai...', 'success');
  }

  openImageModal(imageData, index) {
    const modal = document.getElementById('imageModal');
    if (!modal) {
      console.warn('Image modal not found');
      return;
    }

    // Set modal content
    this.setModalContent(imageData, index);

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    console.log(`Opened modal for image ${index + 1}`);
  }

  setModalContent(imageData, index) {
    const updates = {
      'modalTitle': this.getDisplayName(imageData.filename, index),
      'modalFileName': imageData.filename || '-',
      'modalResolution': imageData.resolution || '-',
      'modalFileSize': this.formatFileSize(imageData.file_size),
      'modalPSNR': `${imageData.psnr || 'N/A'}${imageData.psnr ? ' dB' : ''}`,
      'modalMSE': imageData.mse || 'N/A',
      'modalSSIM': imageData.ssim || 'N/A',
      'modalBitsPerPixel': imageData.bits_per_pixel || '-',
      'modalCapacityUsed': imageData.capacity_used || '-',
      'modalEmbedStatus': this.getEmbedStatusText(imageData.embed_status)
    };

    Object.entries(updates).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    // Set images with placeholder fallback
    const originalImg = document.getElementById('modalOriginalImage');
    const processedImg = document.getElementById('modalProcessedImage');

    if (originalImg) {
      originalImg.src = imageData.original_path || this.getPlaceholderImage('Original');
      originalImg.onerror = () => originalImg.src = this.getPlaceholderImage('Original');
    }

    if (processedImg) {
      processedImg.src = imageData.processed_path || this.getPlaceholderImage('Processed');
      processedImg.onerror = () => processedImg.src = this.getPlaceholderImage('Processed');
    }
  }

  getPlaceholderImage(label) {
    /**
     * Result Embed JavaScript - Enhanced Steganography Results Display
     * Handles the display and interaction of LSB steganography results
     */

    class SteganographyResultManager {
      constructor() {
        this.processedImages = [];
        this.currentImageIndex = 0;
        this.qrCodeData = null;
        this.qualityMetrics = {};
        this.processInfo = {};

        this.init();
      }

      init() {
        console.log('Initializing Steganography Result Manager');
        this.setupEventListeners();
        this.loadResults();
      }

      setupEventListeners() {
        // View toggle buttons
        document.addEventListener('click', (e) => {
          if (e.target.matches('.toggle-btn')) {
            this.handleViewToggle(e.target);
          }

          // Gallery item clicks
          if (e.target.closest('.gallery-item')) {
            const index = Array.from(document.querySelectorAll('.gallery-item')).indexOf(e.target.closest('.gallery-item'));
            if (this.processedImages[index]) {
              this.openImageModal(this.processedImages[index], index);
            }
          }

          // Download buttons
          if (e.target.closest('.download-btn')) {
            this.handleDownload(e.target.closest('.download-btn'));
          }

          // Modal overlay close
          if (e.target.matches('.modal-overlay')) {
            this.closeImageModal();
          }

          // Modal close button
          if (e.target.matches('.modal-close')) {
            this.closeImageModal();
          }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.closeImageModal();
          }
        });
      }

      handleViewToggle(button) {
        const view = button.getAttribute('data-view');

        // Update button states
        document.querySelectorAll('.toggle-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        button.classList.add('active');

        // Show target view
        document.querySelectorAll('.view-content').forEach(content => {
          content.classList.remove('active');
        });

        const targetView = document.getElementById(view + 'View');
        if (targetView) {
          targetView.classList.add('active');

          if (view === 'comparison' && this.processedImages.length > 0) {
            this.showComparison(this.processedImages[0]);
          }
        }
      }

      loadResults() {
        console.log('Loading steganography results...');

        // Try to get results from URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (sessionId) {
          this.fetchProcessingResults(sessionId);
        } else {
          // Try to get from sessionStorage
          const savedResults = sessionStorage.getItem('steganographyResults') ||
            sessionStorage.getItem('embedResults');
          if (savedResults) {
            try {
              const results = JSON.parse(savedResults);
              this.displayResults(results);
            } catch (e) {
              console.error('Error parsing saved results:', e);
              this.showNoResults();
            }
          } else {
            // Load demo data for testing
            this.loadDemoData();
          }
        }
      }

      loadDemoData() {
        console.log('Loading demo data for testing...');
        const demoData = {
          total_images: 3,
          processed_images: [
            {
              filename: 'image_001.png',
              original_path: '/static/uploads/original_001.png',
              processed_path: '/static/generated/processed_001.png',
              psnr: 42.5,
              mse: 0.0023,
              ssim: 0.9876,
              resolution: '1920x1080',
              file_size: 2048576,
              bits_per_pixel: 1.2,
              capacity_used: '15%',
              embed_status: 'success'
            },
            {
              filename: 'image_002.png',
              original_path: '/static/uploads/original_002.png',
              processed_path: '/static/generated/processed_002.png',
              psnr: 38.9,
              mse: 0.0034,
              ssim: 0.9821,
              resolution: '1280x720',
              file_size: 1536000,
              bits_per_pixel: 1.5,
              capacity_used: '20%',
              embed_status: 'success'
            },
            {
              filename: 'image_003.png',
              original_path: '/static/uploads/original_003.png',
              processed_path: '/static/generated/processed_003.png',
              psnr: 45.2,
              mse: 0.0018,
              ssim: 0.9912,
              resolution: '800x600',
              file_size: 1024000,
              bits_per_pixel: 0.8,
              capacity_used: '10%',
              embed_status: 'success'
            }
          ],
          qr_data: {
            data: 'https://example.com/document/12345',
            size: '25x25',
            error_correction: 'M',
            image_path: '/static/generated/qr_code.png'
          },
          quality_metrics: {
            average_psnr: '42.2',
            average_mse: '0.0025',
            average_ssim: '0.9870'
          },
          process_info: {
            duration: '2.5 detik',
            capacity_used: '15% rata-rata'
          },
          download_links: {
            document: '/download/document/processed.docx',
            images: '/download/images/all_images.zip',
            report: '/download/report/analysis.pdf'
          }
        };

        this.displayResults(demoData);
      }

      async fetchProcessingResults(sessionId) {
        try {
          this.showLoading();

          const response = await fetch(`/api/get-processing-results/${sessionId}`);
          const data = await response.json();

          this.hideLoading();

          if (data.success) {
            this.displayResults(data.results);
            // Cache results for future reference
            sessionStorage.setItem('steganographyResults', JSON.stringify(data.results));
          } else {
            this.showError('Gagal memuat hasil processing: ' + data.error);
            // Fallback to demo data
            this.loadDemoData();
          }
        } catch (error) {
          this.hideLoading();
          console.error('Error fetching results:', error);
          this.showError('Terjadi kesalahan saat memuat hasil.');
          // Fallback to demo data
          this.loadDemoData();
        }
      }

      displayResults(results) {
        console.log('Displaying steganography results:', results);

        // Store results
        this.processedImages = results.processed_images || [];
        this.qrCodeData = results.qr_data || null;
        this.qualityMetrics = results.quality_metrics || {};
        this.processInfo = results.process_info || {};

        // Update UI components
        this.updateStatistics(results);
        this.displayProcessedImages();
        this.displayQRInfo();
        this.displayQualityMetrics();
        this.displayProcessInfo();
        this.setupDownloadLinks(results.download_links || {});
      }

      updateStatistics(results) {
        const stats = {
          totalImages: results.total_images || this.processedImages.length,
          processedImages: this.processedImages.length,
          qrEmbedded: results.qr_embedded || (this.qrCodeData ? 1 : 0),
          averageQuality: this.calculateAverageQuality()
        };

        console.log('Updating statistics:', stats);

        // Animate statistics
        this.animateNumber('totalImages', stats.totalImages);
        this.animateNumber('processedImages', stats.processedImages);
        this.animateNumber('qrEmbedded', stats.qrEmbedded);
        this.animateNumber('averageQuality', Math.round(stats.averageQuality), '%');
      }

      calculateAverageQuality() {
        if (!this.processedImages.length) return 0;

        const psnrValues = this.processedImages
          .map(img => parseFloat(img.psnr))
          .filter(val => !isNaN(val) && val > 0);

        if (!psnrValues.length) return 85; // Default quality

        const avgPSNR = psnrValues.reduce((sum, val) => sum + val, 0) / psnrValues.length;

        // Convert PSNR to quality percentage (rough estimation)
        if (avgPSNR >= 40) return 90 + Math.min(10, ((avgPSNR - 40) / 10) * 10);
        if (avgPSNR >= 30) return 70 + ((avgPSNR - 30) / 10) * 20;
        if (avgPSNR >= 20) return 50 + ((avgPSNR - 20) / 10) * 20;
        return Math.max(0, (avgPSNR / 20) * 50);
      }

      animateNumber(elementId, targetValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) {
          console.warn(`Element with id '${elementId}' not found`);
          return;
        }

        const startValue = 0;
        const duration = 2000;
        const startTime = performance.now();

        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing function (ease out)
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);

          element.textContent = currentValue + suffix;

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      }

      displayProcessedImages() {
        const gallery = document.getElementById('imageGallery');
        if (!gallery) {
          console.warn('Image gallery element not found');
          return;
        }

        const emptyState = gallery.querySelector('.gallery-empty');

        if (!this.processedImages.length) {
          if (emptyState) emptyState.style.display = 'block';
          return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Clear existing items
        gallery.querySelectorAll('.gallery-item').forEach(item => item.remove());

        // Add new items
        this.processedImages.forEach((image, index) => {
          const galleryItem = this.createGalleryItem(image, index);
          gallery.appendChild(galleryItem);
        });

        console.log(`Displayed ${this.processedImages.length} processed images`);
      }

      createGalleryItem(imageData, index) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.style.animationDelay = `${index * 0.1}s`;

        // Format metrics for display
        const psnr = imageData.psnr ? parseFloat(imageData.psnr).toFixed(2) : 'N/A';
        const mse = imageData.mse ? parseFloat(imageData.mse).toFixed(4) : 'N/A';
        const ssim = imageData.ssim ? parseFloat(imageData.ssim).toFixed(4) : 'N/A';

        // Use placeholder image if path is not available
        const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTZiNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIFByZXZpZXc8L3RleHQ+PC9zdmc+';
        const imageSrc = imageData.processed_path || placeholder;

        item.innerHTML = `
            <div class="gallery-image">
                <img src="${imageSrc}" alt="Processed Image ${index + 1}" loading="lazy" onerror="this.src='${placeholder}';">
                <div class="image-overlay">
                    <div class="overlay-info">
                        <h4>${this.getDisplayName(imageData.filename, index)}</h4>
                        <p>PSNR: ${psnr} dB</p>
                    </div>
                </div>
            </div>
            <div class="gallery-info">
                <h4 class="image-title">${this.getDisplayName(imageData.filename, index)}</h4>
                <div class="image-stats">
                    <div class="stat-mini">
                        <span class="stat-mini-value">${psnr}</span>
                        <span class="stat-mini-label">PSNR</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">${mse}</span>
                        <span class="stat-mini-label">MSE</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">${ssim}</span>
                        <span class="stat-mini-label">SSIM</span>
                    </div>
                </div>
            </div>
        `;

        return item;
      }

      getDisplayName(filename, index) {
        return filename || `Image ${index + 1}`;
      }

      displayQRInfo() {
        if (!this.qrCodeData) {
          console.log('No QR code data available');
          return;
        }

        // Update QR preview
        const qrPreview = document.querySelector('.qr-preview');
        if (qrPreview && this.qrCodeData.image_path) {
          qrPreview.innerHTML = `<img src="${this.qrCodeData.image_path}" alt="QR Code" onerror="this.parentElement.innerHTML='<div class=\\'qr-placeholder\\'><i class=\\'fas fa-qrcode\\'></i><span>QR Code</span></div>';">`;
        }

        // Update QR information
        const updateElement = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value || '-';
        };

        updateElement('qrData', this.qrCodeData.data);
        updateElement('qrSize', this.qrCodeData.size);
        updateElement('qrErrorLevel', this.qrCodeData.error_correction);

        console.log('QR info updated:', this.qrCodeData);
      }

      displayQualityMetrics() {
        const updateElement = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value || '-';
        };

        updateElement('psnrValue', this.qualityMetrics.average_psnr);
        updateElement('mseValue', this.qualityMetrics.average_mse);
        updateElement('ssimValue', this.qualityMetrics.average_ssim);

        console.log('Quality metrics updated:', this.qualityMetrics);
      }

      displayProcessInfo() {
        const updateElement = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value || '-';
        };

        updateElement('processTime', this.processInfo.duration);
        updateElement('capacityUsed', this.processInfo.capacity_used);

        console.log('Process info updated:', this.processInfo);
      }

      setupDownloadLinks(downloadLinks) {
        const buttons = {
          'downloadDocument': downloadLinks.document,
          'downloadImages': downloadLinks.images,
          'downloadReport': downloadLinks.report
        };

        Object.entries(buttons).forEach(([buttonId, url]) => {
          const button = document.getElementById(buttonId);
          if (button) {
            if (url) {
              button.onclick = () => this.downloadFile(url, buttonId.replace('download', '').toLowerCase());
              button.style.opacity = '1';
              button.style.pointerEvents = 'auto';
            } else {
              button.style.opacity = '0.6';
              button.style.pointerEvents = 'none';
              button.onclick = () => this.showAlert(`Download ${buttonId.replace('download', '').toLowerCase()} tidak tersedia`, 'info');
            }
          }
        });
      }

      downloadFile(url, type) {
        this.showDownloadProgress(type);

        // Create temporary download link
        const link = document.createElement('a');
        link.href = url;
        link.download = '';
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Hide progress after a delay
        setTimeout(() => this.hideDownloadProgress(type), 2000);

        // Show success message
        this.showAlert('Download dimulai...', 'success');
      }

      openImageModal(imageData, index) {
        const modal = document.getElementById('imageModal');
        if (!modal) {
          console.warn('Image modal not found');
          return;
        }

        // Set modal content
        this.setModalContent(imageData, index);

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        console.log(`Opened modal for image ${index + 1}`);
      }

      setModalContent(imageData, index) {
        const updates = {
          'modalTitle': this.getDisplayName(imageData.filename, index),
          'modalFileName': imageData.filename || '-',
          'modalResolution': imageData.resolution || '-',
          'modalFileSize': this.formatFileSize(imageData.file_size),
          'modalPSNR': `${imageData.psnr || 'N/A'}${imageData.psnr ? ' dB' : ''}`,
          'modalMSE': imageData.mse || 'N/A',
          'modalSSIM': imageData.ssim || 'N/A',
          'modalBitsPerPixel': imageData.bits_per_pixel || '-',
          'modalCapacityUsed': imageData.capacity_used || '-',
          'modalEmbedStatus': this.getEmbedStatusText(imageData.embed_status)
        };

        Object.entries(updates).forEach(([id, value]) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        });

        // Set images with placeholder fallback
        const originalImg = document.getElementById('modalOriginalImage');
        const processedImg = document.getElementById('modalProcessedImage');

        const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNlbGVjdGVkIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

        if (originalImg) {
          originalImg.src = imageData.original_path || placeholder;
          originalImg.onerror = () => originalImg.src = placeholder;
        }

        if (processedImg) {
          processedImg.src = imageData.processed_path || placeholder;
          processedImg.onerror = () => processedImg.src = placeholder;
        }
      }

      formatFileSize(sizeInBytes) {
        if (!sizeInBytes) return '-';

        const units = ['B', 'KB', 'MB', 'GB'];
        let size = parseInt(sizeInBytes);
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
      }

      getEmbedStatusText(status) {
        const statusMap = {
          'success': 'Berhasil',
          'completed': 'Selesai',
          'failed': 'Gagal',
          'error': 'Error'
        };

        return statusMap[status] || status || '-';
      }

      closeImageModal() {
        const modal = document.getElementById('imageModal');
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = 'auto';
        }
      }

      showComparison(imageData) {
        const container = document.getElementById('comparisonContainer');
        if (!container) return;

        const emptyState = container.querySelector('.comparison-empty');
        if (emptyState) emptyState.style.display = 'none';

        const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNlbGVjdGVkIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        const originalSrc = imageData.original_path || placeholder;
        const processedSrc = imageData.processed_path || placeholder;

        container.innerHTML = `
            <div class="comparison-view">
                <div class="comparison-images">
                    <div class="comparison-item">
                        <h4>Gambar Asli</h4>
                        <div class="image-wrapper">
                            <img src="${originalSrc}" alt="Original" onerror="this.src='${placeholder}'">
                        </div>
                    </div>
                    <div class="comparison-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    <div class="comparison-item">
                        <h4>Hasil Steganografi</h4>
                        <div class="image-wrapper">
                            <img src="${processedSrc}" alt="Processed" onerror="this.src='${placeholder}'">
                        </div>
                    </div>
                </div>
                <div class="comparison-details">
                    <h4>Analisis Perbandingan</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">PSNR:</span>
                            <span class="value">${imageData.psnr || 'N/A'} dB</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">MSE:</span>
                            <span class="value">${imageData.mse || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">SSIM:</span>
                            <span class="value">${imageData.ssim || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        console.log('Comparison view updated for:', imageData.filename);
      }

      exportResults() {
        if (!this.processedImages.length) {
          this.showAlert('Tidak ada hasil untuk diekspor', 'warning');
          return;
        }

        const exportData = {
          timestamp: new Date().toISOString(),
          total_images: this.processedImages.length,
          qr_data: this.qrCodeData,
          images: this.processedImages,
          quality_metrics: this.qualityMetrics,
          process_info: this.processInfo,
          summary: {
            average_psnr: this.calculateAveragePSNR(),
            average_mse: this.calculateAverageMSE(),
            average_ssim: this.calculateAverageSSIM(),
            average_quality: this.calculateAverageQuality()
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `steganography_results_${new Date().getTime()}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        this.showAlert('Hasil berhasil diekspor', 'success');
        console.log('Results exported successfully');
      }

      calculateAveragePSNR() {
        return this.calculateAverageMetric('psnr');
      }

      calculateAverageMSE() {
        return this.calculateAverageMetric('mse');
      }

      calculateAverageSSIM() {
        return this.calculateAverageMetric('ssim');
      }

      calculateAverageMetric(metricName) {
        if (!this.processedImages.length) return 0;

        const values = this.processedImages
          .map(img => parseFloat(img[metricName]))
          .filter(val => !isNaN(val));

        if (!values.length) return 0;

        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        return parseFloat(average.toFixed(4));
      }

      // UI Utility Methods
      showLoading() {
        document.body.style.cursor = 'wait';
        console.log('Loading state activated');
      }

      hideLoading() {
        document.body.style.cursor = 'default';
        console.log('Loading state deactivated');
      }

      showError(message) {
        this.showAlert(message, 'error');
      }

      showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-floating alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            <span>${message}</span>
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Style the alert
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border-left: 4px solid ${this.getAlertColor(type)};
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
          if (alert.parentElement) {
            alert.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => alert.remove(), 300);
          }
        }, 5000);

        console.log(`Alert shown: ${type} - ${message}`);
      }

      getAlertIcon(type) {
        const icons = {
          'success': 'check-circle',
          'error': 'exclamation-circle',
          'warning': 'exclamation-triangle',
          'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
      }

      getAlertColor(type) {
        const colors = {
          'success': '#10b981',
          'error': '#ef4444',
          'warning': '#f59e0b',
          'info': '#3b82f6'
        };
        return colors[type] || '#3b82f6';
      }

      showNoResults() {
        this.showAlert('Tidak ada hasil processing yang ditemukan', 'warning');
        console.log('No results available');
      }

      showDownloadProgress(type) {
        const btn = document.getElementById(`download${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        btn.innerHTML = `
            <div class="btn-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div class="btn-content">
                <span class="btn-title">Mengunduh...</span>
                <span class="btn-subtitle">Mohon tunggu</span>
            </div>
        `;
        btn.disabled = true;
        btn.dataset.originalHtml = originalHTML;
      }

      hideDownloadProgress(type) {
        const btn = document.getElementById(`download${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (btn && btn.dataset.originalHtml) {
          btn.innerHTML = btn.dataset.originalHtml;
          btn.disabled = false;
          delete btn.dataset.originalHtml;
        }
      }

      handleDownload(button) {
        const buttonId = button.id;
        console.log('Download requested for:', buttonId);

        if (buttonId === 'downloadDocument') {
          this.showAlert('Download dokumen sedang diproses...', 'info');
        } else if (buttonId === 'downloadImages') {
          this.showAlert('Download gambar sedang diproses...', 'info');
        } else if (buttonId === 'downloadReport') {
          this.showAlert('Download laporan sedang diproses...', 'info');
        }
      }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM loaded, initializing Steganography Result Manager...');
      window.steganographyResultManager = new SteganographyResultManager();
    });

    // Global functions for template access
    window.closeImageModal = () => {
      if (window.steganographyResultManager) {
        window.steganographyResultManager.closeImageModal();
      }
    };

    window.exportResults = () => {
      if (window.steganographyResultManager) {
        window.steganographyResultManager.exportResults();
      }
    };

    // Add CSS for animations if not already added
    if (!document.querySelector('#result-animations')) {
      const style = document.createElement('style');
      style.id = 'result-animations';
      style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .alert-floating {
        animation: slideInRight 0.3s ease-out;
    }
    
    .alert-close {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.3s ease;
        margin-left: 0.5rem;
    }
    
    .alert-close:hover {
        background: rgba(0,0,0,0.05);
        color: #374151;
    }
    `;
      document.head.appendChild(style);
    }
  }

  formatFileSize(sizeInBytes) {
    if (!sizeInBytes) return '-';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = parseInt(sizeInBytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getEmbedStatusText(status) {
    const statusMap = {
      'success': 'Berhasil',
      'completed': 'Selesai',
      'failed': 'Gagal',
      'error': 'Error'
    };

    return statusMap[status] || status || '-';
  }

  closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  showComparison(imageData) {
    const container = document.getElementById('comparisonContainer');
    if (!container) return;

    const emptyState = container.querySelector('.comparison-empty');
    if (emptyState) emptyState.style.display = 'none';

    const originalSrc = imageData.original_path || this.getPlaceholderImage('Original');
    const processedSrc = imageData.processed_path || this.getPlaceholderImage('Processed');

    container.innerHTML = `
            <div class="comparison-view">
                <div class="comparison-images">
                    <div class="comparison-item">
                        <h4>Gambar Asli</h4>
                        <div class="image-wrapper">
                            <img src="${originalSrc}" alt="Original" onerror="this.src='${this.getPlaceholderImage('Original')}'">
                        </div>
                    </div>
                    <div class="comparison-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    <div class="comparison-item">
                        <h4>Hasil Steganografi</h4>
                        <div class="image-wrapper">
                            <img src="${processedSrc}" alt="Processed" onerror="this.src='${this.getPlaceholderImage('Processed')}'">
                        </div>
                    </div>
                </div>
                <div class="comparison-details">
                    <h4>Analisis Perbandingan</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">PSNR:</span>
                            <span class="value">${imageData.psnr || 'N/A'} dB</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">MSE:</span>
                            <span class="value">${imageData.mse || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">SSIM:</span>
                            <span class="value">${imageData.ssim || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    console.log('Comparison view updated for:', imageData.filename);
  }

  exportResults() {
    if (!this.processedImages.length) {
      this.showAlert('Tidak ada hasil untuk diekspor', 'warning');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      total_images: this.processedImages.length,
      qr_data: this.qrCodeData,
      images: this.processedImages,
      quality_metrics: this.qualityMetrics,
      process_info: this.processInfo,
      summary: {
        average_psnr: this.calculateAveragePSNR(),
        average_mse: this.calculateAverageMSE(),
        average_ssim: this.calculateAverageSSIM(),
        average_quality: this.calculateAverageQuality()
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `steganography_results_${new Date().getTime()}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    this.showAlert('Hasil berhasil diekspor', 'success');
    console.log('Results exported successfully');
  }

  calculateAveragePSNR() {
    return this.calculateAverageMetric('psnr');
  }

  calculateAverageMSE() {
    return this.calculateAverageMetric('mse');
  }

  calculateAverageSSIM() {
    return this.calculateAverageMetric('ssim');
  }

  calculateAverageMetric(metricName) {
    if (!this.processedImages.length) return 0;

    const values = this.processedImages
      .map(img => parseFloat(img[metricName]))
      .filter(val => !isNaN(val));

    if (!values.length) return 0;

    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    return parseFloat(average.toFixed(4));
  }

  // UI Utility Methods
  showLoading() {
    document.body.style.cursor = 'wait';
    console.log('Loading state activated');
  }

  hideLoading() {
    document.body.style.cursor = 'default';
    console.log('Loading state deactivated');
  }

  showError(message) {
    this.showAlert(message, 'error');
  }

  showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-floating alert-${type}`;
    alert.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            <span>${message}</span>
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

    // Style the alert
    alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border-left: 4px solid ${this.getAlertColor(type)};
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            animation: slideInRight 0.3s ease-out;
        `;

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => alert.remove(), 300);
      }
    }, 5000);

    console.log(`Alert shown: ${type} - ${message}`);
  }

  getAlertIcon(type) {
    const icons = {
      'success': 'check-circle',
      'error': 'exclamation-circle',
      'warning': 'exclamation-triangle',
      'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  getAlertColor(type) {
    const colors = {
      'success': '#10b981',
      'error': '#ef4444',
      'warning': '#f59e0b',
      'info': '#3b82f6'
    };
    return colors[type] || '#3b82f6';
  }

  showNoResults() {
    this.showAlert('Tidak ada hasil processing yang ditemukan', 'warning');
    console.log('No results available');
  }

  showDownloadProgress(type) {
    const btn = document.getElementById(`download${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
            <div class="btn-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div class="btn-content">
                <span class="btn-title">Mengunduh...</span>
                <span class="btn-subtitle">Mohon tunggu</span>
            </div>
        `;
    btn.disabled = true;
    btn.dataset.originalHtml = originalHTML;
  }

  hideDownloadProgress(type) {
    const btn = document.getElementById(`download${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (btn && btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      btn.disabled = false;
      delete btn.dataset.originalHtml;
    }
  }

  handleDownload(button) {
    const buttonId = button.id;
    console.log('Download requested for:', buttonId);

    if (buttonId === 'downloadDocument') {
      this.showAlert('Download dokumen sedang diproses...', 'info');
    } else if (buttonId === 'downloadImages') {
      this.showAlert('Download gambar sedang diproses...', 'info');
    } else if (buttonId === 'downloadReport') {
      this.showAlert('Download laporan sedang diproses...', 'info');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing Steganography Result Manager...');
  window.steganographyResultManager = new SteganographyResultManager();
});

// Global functions for template access
window.closeImageModal = () => {
  if (window.steganographyResultManager) {
    window.steganographyResultManager.closeImageModal();
  }
};

window.exportResults = () => {
  if (window.steganographyResultManager) {
    window.steganographyResultManager.exportResults();
  }
};

// Add CSS for animations if not already added
if (!document.querySelector('#result-animations')) {
  const style = document.createElement('style');
  style.id = 'result-animations';
  style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .alert-floating {
        animation: slideInRight 0.3s ease-out;
    }
    
    .alert-close {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.3s ease;
        margin-left: 0.5rem;
    }
    
    .alert-close:hover {
        background: rgba(0,0,0,0.05);
        color: #374151;
    }
    `;
  document.head.appendChild(style);
}

function setupAccordion() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', function () {
      const target = this.getAttribute('data-target');
      const content = document.getElementById(target);
      const isExpanded = this.getAttribute('aria-expanded') === 'true';

      // Close all accordion items
      accordionHeaders.forEach(h => {
        h.setAttribute('aria-expanded', 'false');
        const targetId = h.getAttribute('data-target');
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
          targetContent.classList.remove('show');
        }
      });

      // Open clicked item if it wasn't already open
      if (!isExpanded && content) {
        this.setAttribute('aria-expanded', 'true');
        content.classList.add('show');
      }
    });
  });
}

function setupViewToggles() {
  const normalViewBtn = document.getElementById('gridViewNormal');
  const compactViewBtn = document.getElementById('gridViewCompact');
  const resultsGrid = document.getElementById('processedImagesGrid');

  if (normalViewBtn && compactViewBtn && resultsGrid) {
    normalViewBtn.addEventListener('click', function () {
      normalViewBtn.classList.add('active');
      compactViewBtn.classList.remove('active');
      resultsGrid.classList.remove('compact');
    });

    compactViewBtn.addEventListener('click', function () {
      compactViewBtn.classList.add('active');
      normalViewBtn.classList.remove('active');
      resultsGrid.classList.add('compact');
    });
  }
}

function setupImageNavigation() {
  const leftBtn = document.getElementById('gridNavLeft');
  const rightBtn = document.getElementById('gridNavRight');
  const grid = document.getElementById('processedImagesGrid');

  if (leftBtn && rightBtn && grid) {
    leftBtn.addEventListener('click', function () {
      grid.scrollBy({ left: -300, behavior: 'smooth' });
    });

    rightBtn.addEventListener('click', function () {
      grid.scrollBy({ left: 300, behavior: 'smooth' });
    });

    // Update button states based on scroll position
    grid.addEventListener('scroll', function () {
      updateNavigationButtons();
    });
  }
}

function loadResultData() {
  const resultData = sessionStorage.getItem('embedResults');
  if (!resultData) {
    showNoDataMessage();
    return;
  }

  try {
    const results = JSON.parse(resultData);

    // Populate result data
    populateProcessSummary(results);
    populateQRDisplay(results.qr);
    populateDownloadSection(results.document);
    populateSecurityInfo(results.security);
    populateMetrics(results.quality_metrics);
    populateImageResults(results.processed_images, results.public_dir);
    populateProcessLog(results.process_log);

  } catch (error) {
    console.error('Error loading result data:', error);
    showDataError();
  }
}

function populateProcessSummary(results) {
  const processSummary = document.getElementById('processSummary');
  if (!processSummary) return;

  const processedCount = results.processed_images ? results.processed_images.length : 0;
  const processingTime = results.processing_time || 'N/A';

  processSummary.innerHTML = `
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-file-alt"></i>
                Status Dokumen
            </div>
            <div class="summary-value text-success">Berhasil Diproses</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-images"></i>
                Gambar Diproses
            </div>
            <div class="summary-value">${processedCount} gambar</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">
                <i class="fas fa-clock"></i>
                Waktu Proses
            </div>
            <div class="summary-value">${processingTime}</div>
        </div>
    `;
}

function populateQRDisplay(qrInfo) {
  if (!qrInfo) return;

  // Update QR preview
  const qrPreview = document.getElementById('resultQrPreview');
  if (qrPreview && qrInfo.url) {
    qrPreview.innerHTML = `<img src="${qrInfo.url}" alt="Generated QR Code" style="max-width: 100%; max-height: 100%; border-radius: 4px;">`;
  }

  // Update QR info
  const qrInfoCompact = document.getElementById('qrInfoCompact');
  if (qrInfoCompact) {
    const qrData = qrInfo.data || 'N/A';
    const displayData = qrData.length > 50 ? qrData.substring(0, 50) + '...' : qrData;

    qrInfoCompact.innerHTML = `
            <div class="qr-info-item">
                <strong>Data:</strong> ${displayData}
            </div>
            <div class="qr-info-item">
                <strong>Source:</strong> ${qrInfo.generated ? 'Generated from text' : 'Uploaded file'}
            </div>
        `;
  }

  // Update detailed QR info in results tab
  const qrResultInfo = document.getElementById('qrResultInfo');
  if (qrResultInfo) {
    qrResultInfo.innerHTML = `
            <div class="qr-detail-grid">
                <div class="qr-detail-item">
                    <span class="label">Source:</span>
                    <span class="value">${qrInfo.generated ? 'Generated from text' : 'Uploaded file'}</span>
                </div>
                <div class="qr-detail-item">
                    <span class="label">Data:</span>
                    <span class="value">${qrInfo.data || 'N/A'}</span>
                </div>
                ${qrInfo.analysis ? `
                <div class="qr-detail-item">
                    <span class="label">Version:</span>
                    <span class="value">${qrInfo.analysis.version || 'N/A'}</span>
                </div>
                <div class="qr-detail-item">
                    <span class="label">Size:</span>
                    <span class="value">${qrInfo.analysis.size || 'N/A'}</span>
                </div>
                <div class="qr-detail-item">
                    <span class="label">Error Correction:</span>
                    <span class="value">${qrInfo.analysis.error_correction || 'N/A'}</span>
                </div>
                ` : ''}
            </div>
        `;
  }
}

function populateDownloadSection(documentInfo) {
  if (!documentInfo) return;

  const downloadSection = document.getElementById('embedDownload');
  if (downloadSection) {
    downloadSection.innerHTML = `
            <div class="download-item">
                <div class="download-header">
                    <div class="download-icon">
                        <i class="fas fa-download"></i>
                    </div>
                    <div class="download-info">
                        <div class="download-name">${documentInfo.filename || 'Processed Document'}</div>
                        <div class="download-type">${(documentInfo.type || 'document').toUpperCase()} • Watermarked</div>
                    </div>
                </div>
                <div class="download-actions">
                    <a href="${documentInfo.download_url}" class="btn btn-primary" download>
                        <i class="fas fa-download me-2"></i>
                        Download Document
                    </a>
                </div>
            </div>
        `;
  }
}

function populateSecurityInfo(securityInfo) {
  if (!securityInfo || securityInfo.security_level === 'none') return;

  // Show security cards
  const securityCard = document.getElementById('securityCard');
  const securityStatusCard = document.getElementById('securityStatusCard');

  if (securityCard) {
    securityCard.style.display = 'block';
    const securityResultInfo = document.getElementById('securityResultInfo');
    if (securityResultInfo) {
      securityResultInfo.innerHTML = `
                <div class="security-detail-grid">
                    <div class="security-detail-item">
                        <span class="label">Level:</span>
                        <span class="value">${securityInfo.security_level}</span>
                    </div>
                    <div class="security-detail-item">
                        <span class="label">Binding ID:</span>
                        <span class="value">${securityInfo.binding_id || 'N/A'}</span>
                    </div>
                    <div class="security-detail-item">
                        <span class="label">Expires:</span>
                        <span class="value">${securityInfo.expiry_time || 'N/A'}</span>
                    </div>
                </div>
            `;
    }
  }

  if (securityStatusCard) {
    securityStatusCard.style.display = 'block';
    const securityStatusCompact = document.getElementById('securityStatusCompact');
    if (securityStatusCompact) {
      securityStatusCompact.innerHTML = `
                <div class="security-status-item">
                    <div class="status-icon">
                        <i class="fas fa-shield-check text-success"></i>
                    </div>
                    <div class="status-content">
                        <div class="status-title">Document Secured</div>
                        <div class="status-desc">Level ${securityInfo.security_level}</div>
                    </div>
                </div>
                <div class="security-binding-info">
                    <small class="text-muted">
                        Binding ID: ${(securityInfo.binding_id || 'N/A').substring(0, 16)}...
                    </small>
                </div>
            `;
    }
  }
}

function populateMetrics(metricsData) {
  if (!metricsData) return;

  const metricsContainer = document.getElementById('embedMetrics');
  if (metricsContainer) {
    let metricsHTML = '<div class="metrics-grid">';

    // Process metrics data
    if (typeof metricsData === 'object') {
      Object.keys(metricsData).forEach(key => {
        const value = metricsData[key];
        metricsHTML += `
                    <div class="metric-card">
                        <div class="metric-label">${formatMetricLabel(key)}</div>
                        <div class="metric-value">${formatMetricValue(value)}</div>
                    </div>
                `;
      });
    }

    metricsHTML += '</div>';
    metricsContainer.innerHTML = metricsHTML;
  }
}

function populateImageResults(processedImages, publicDir) {
  if (!processedImages || processedImages.length === 0) return;

  // Update image counts
  const totalImagesCount = document.getElementById('totalImagesCount');
  const processedImagesCount = document.getElementById('processedImagesCount');

  if (totalImagesCount) totalImagesCount.textContent = processedImages.length;
  if (processedImagesCount) processedImagesCount.textContent = processedImages.length;

  // Populate images grid
  const imagesGrid = document.getElementById('processedImagesGrid');
  if (imagesGrid) {
    // Clear loading/empty states
    const gridLoading = document.getElementById('gridLoading');
    const gridEmpty = document.getElementById('gridEmpty');
    if (gridLoading) gridLoading.style.display = 'none';
    if (gridEmpty) gridEmpty.style.display = 'none';

    let imagesHTML = '';
    processedImages.forEach((image, index) => {
      imagesHTML += createImageComparisonCard(image, index, publicDir);
    });

    imagesGrid.innerHTML = imagesHTML;

    // Update navigation buttons
    updateNavigationButtons();
  }
}

function populateProcessLog(processLog) {
  if (!processLog) return;

  const logContainer = document.getElementById('embedLog');
  if (logContainer) {
    let logHTML = '<div class="process-log-entries">';

    if (Array.isArray(processLog)) {
      processLog.forEach(entry => {
        logHTML += `
                    <div class="log-entry">
                        <div class="log-time">${entry.timestamp || 'N/A'}</div>
                        <div class="log-message">${entry.message || 'N/A'}</div>
                    </div>
                `;
      });
    } else {
      logHTML += `<div class="log-entry"><div class="log-message">${processLog}</div></div>`;
    }

    logHTML += '</div>';
    logContainer.innerHTML = logHTML;
  }
}

function createImageComparisonCard(image, index, publicDir) {
  const originalPath = `${publicDir}/${image.original_path}`;
  const watermarkedPath = `${publicDir}/${image.watermarked_path}`;

  return `
        <div class="image-comparison-card" data-index="${index}">
            <div class="image-comparison-header">
                <h6 class="image-title">Image ${index + 1}</h6>
                <div class="image-metrics">
                    ${image.psnr ? `<span class="metric">PSNR: ${image.psnr.toFixed(2)} dB</span>` : ''}
                    ${image.mse ? `<span class="metric">MSE: ${image.mse.toFixed(4)}</span>` : ''}
                </div>
            </div>
            <div class="image-comparison-grid">
                <div class="image-container original">
                    <div class="image-label">Original</div>
                    <div class="image-wrapper">
                        <img src="${originalPath}" alt="Original Image ${index + 1}" loading="lazy">
                    </div>
                </div>
                <div class="comparison-arrow">
                    <i class="fas fa-arrow-right"></i>
                </div>
                <div class="image-container watermarked">
                    <div class="image-label">Watermarked</div>
                    <div class="image-wrapper">
                        <img src="${watermarkedPath}" alt="Watermarked Image ${index + 1}" loading="lazy">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper functions
function formatMetricLabel(key) {
  const labelMap = {
    'avg_psnr': 'Average PSNR',
    'avg_mse': 'Average MSE',
    'processing_time': 'Processing Time',
    'total_images': 'Total Images'
  };
  return labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatMetricValue(value) {
  if (typeof value === 'number') {
    if (value < 1) {
      return value.toFixed(4);
    } else if (value < 100) {
      return value.toFixed(2);
    }
    return Math.round(value);
  }
  return value;
}

function updateNavigationButtons() {
  const grid = document.getElementById('processedImagesGrid');
  const leftBtn = document.getElementById('gridNavLeft');
  const rightBtn = document.getElementById('gridNavRight');

  if (!grid || !leftBtn || !rightBtn) return;

  const isAtStart = grid.scrollLeft <= 0;
  const isAtEnd = grid.scrollLeft >= (grid.scrollWidth - grid.clientWidth);

  leftBtn.disabled = isAtStart;
  rightBtn.disabled = isAtEnd;
}

function showNoDataMessage() {
  document.body.innerHTML = `
        <div class="container-fluid px-4 py-5">
            <div class="row justify-content-center">
                <div class="col-md-6 text-center">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <h4>No Result Data Found</h4>
                        <p>Unable to find processing results. Please return to the embed page and process your document again.</p>
                        <a href="/embed" class="btn btn-primary">
                            <i class="fas fa-arrow-left me-2"></i>
                            Back to Embed
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showDataError() {
  document.body.innerHTML = `
        <div class="container-fluid px-4 py-5">
            <div class="row justify-content-center">
                <div class="col-md-6 text-center">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                        <h4>Data Error</h4>
                        <p>There was an error loading the processing results. Please try processing your document again.</p>
                        <a href="/embed" class="btn btn-primary">
                            <i class="fas fa-arrow-left me-2"></i>
                            Back to Embed
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}
