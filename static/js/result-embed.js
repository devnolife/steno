// Result Embed Page JavaScript
document.addEventListener('DOMContentLoaded', function () {
  // Initialize result page
  initializeResultPage();

  // Setup tab navigation
  setupTabNavigation();

  // Setup accordion
  setupAccordion();

  // Load result data from sessionStorage
  loadResultData();

  // Setup view toggles
  setupViewToggles();

  // Setup image navigation
  setupImageNavigation();
});

function initializeResultPage() {
  console.log('Result page initialized');

  // Check if we have result data
  const resultData = sessionStorage.getItem('embedResults');
  if (!resultData) {
    showNoDataMessage();
    return;
  }

  try {
    const results = JSON.parse(resultData);
    console.log('Loaded results:', results);
  } catch (error) {
    console.error('Error parsing result data:', error);
    showDataError();
  }
}

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.results-tab-btn');
  const tabPanes = document.querySelectorAll('.results-tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetTab = this.getAttribute('data-tab');

      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding pane
      this.classList.add('active');
      const targetPane = document.getElementById(`tab-${targetTab}`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
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
