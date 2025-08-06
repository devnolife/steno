// Secure Document Embedding - Integrated Workflow Handler
let progressInterval = null;

document.addEventListener('DOMContentLoaded', function () {
  // Initialize network monitoring
  initNetworkMonitoring();

  // Initialize the integrated embed form
  initializeEmbedForm();

  // Initialize security options
  initSecurityOptions();

  // Initialize QR input mode handling
  initQRInputMode();

  // Initialize real-time QR preview
  initQRPreview();

  // Initialize results tabs and accordion
  initializeResultsTabs();
  initializeAccordion();

  // Initialize grid navigation
  initializeGridNavigation();
});

function initializeEmbedForm() {
  const form = document.getElementById('embedForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    await handleIntegratedEmbedding(this);
  });

  // Initialize document file handling
  initDocumentFileHandling();
}

function initDocumentFileHandling() {
  const documentFileInput = document.getElementById('documentFile');
  if (!documentFileInput) return;

  documentFileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      showDocumentPreview(file);
      // Simulate document analysis for image detection
      analyzeDocumentForImages(file);
    } else {
      hideDocumentPreview();
    }
  });
}

function showDocumentPreview(file) {
  const preview = document.getElementById('documentPreview');
  const filename = document.getElementById('previewFilename');
  const size = document.getElementById('previewSize');

  if (!preview || !filename || !size) return;

  // Format file size
  const fileSize = formatFileSize(file.size);

  // Update preview information
  filename.textContent = file.name;
  size.textContent = fileSize;

  // Show preview
  preview.style.display = 'block';
}

function hideDocumentPreview() {
  const preview = document.getElementById('documentPreview');
  if (preview) {
    preview.style.display = 'none';
  }
  hideAllStatusIndicators();
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function analyzeDocumentForImages(file) {
  showStatusIndicator('checking');

  try {
    const formData = new FormData();
    formData.append('documentFile', file);

    const response = await fetch('/analyze_document', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (result.success && result.image_count > 0) {
      showStatusIndicator('has-images', result.image_count);
    } else if (result.success) {
      showStatusIndicator('no-images');
    } else {
      showStatusIndicator('error', 0, result.message || 'Analysis failed');
    }
  } catch (error) {
    console.error('Error analyzing document:', error);
    showStatusIndicator('error', 0, error.message);
  }
}

function showStatusIndicator(type, imageCount = 0, errorMessage = '') {
  hideAllStatusIndicators();

  const statusMap = {
    'checking': 'statusChecking',
    'has-images': 'statusHasImages',
    'no-images': 'statusNoImages',
    'error': 'statusError'
  };

  const elementId = statusMap[type];
  const element = document.getElementById(elementId);

  if (!element) return;

  if (type === 'has-images' && imageCount > 0) {
    const countElement = document.getElementById('imageCount');
    if (countElement) {
      countElement.textContent = imageCount;
    }
  }

  if (type === 'error' && errorMessage) {
    const errorDesc = document.getElementById('errorDescription');
    if (errorDesc) {
      errorDesc.textContent = errorMessage;
    }
  }

  element.style.display = 'flex';
}

function hideAllStatusIndicators() {
  const indicators = ['statusChecking', 'statusHasImages', 'statusNoImages', 'statusError'];
  indicators.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'none';
    }
  });
}

// Global functions for button actions
function showImageRequirements() {
  // Scroll to requirements section
  const requirements = document.querySelector('.document-requirements');
  if (requirements) {
    requirements.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Add a highlight effect
    requirements.style.transform = 'scale(1.02)';
    requirements.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';

    setTimeout(() => {
      requirements.style.transform = '';
      requirements.style.boxShadow = '';
    }, 2000);
  }
}

function retryDocumentAnalysis() {
  const fileInput = document.getElementById('documentFile');
  const file = fileInput?.files[0];

  if (file) {
    analyzeDocumentForImages(file);
  }
}

function initQRInputMode() {
  const radioButtons = document.querySelectorAll('input[name="qrInputMode"]');
  const qrTextSection = document.getElementById('qrTextSection');
  const qrFileSection = document.getElementById('qrFileSection');
  const qrPreviewSection = document.getElementById('qrPreviewSection');
  const securityValidation = document.getElementById('securityValidation');
  const embedButtonText = document.getElementById('embedButtonText');

  if (!radioButtons.length || !qrTextSection || !qrFileSection || !embedButtonText) {
    console.warn('QR input mode elements not found in DOM');
    return;
  }

  radioButtons.forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.value === 'text') {
        qrTextSection.style.display = 'block';
        qrFileSection.style.display = 'none';
        if (qrPreviewSection) qrPreviewSection.style.display = 'block';
        if (securityValidation) securityValidation.style.display = 'none';
        embedButtonText.textContent = 'Generate & Embed Secure QR';

        // Clear file input
        const qrFileInput = document.getElementById('qrFile');
        if (qrFileInput) qrFileInput.value = '';
      } else {
        qrTextSection.style.display = 'none';
        qrFileSection.style.display = 'block';
        if (qrPreviewSection) qrPreviewSection.style.display = 'none';
        if (securityValidation) securityValidation.style.display = 'block';
        embedButtonText.textContent = 'Validate & Embed QR';

        // Clear text input
        const qrDataInput = document.getElementById('qrData');
        if (qrDataInput) qrDataInput.value = '';
        clearQRPreview();
      }
    });
  });
}

function initQRPreview() {
  const qrDataInput = document.getElementById('qrData');
  const charCount = document.getElementById('charCount');
  const capacityAnalysis = document.getElementById('capacityAnalysis');

  if (!qrDataInput || !charCount || !capacityAnalysis) return;

  let previewTimeout;

  qrDataInput.addEventListener('input', function () {
    const text = this.value;
    charCount.textContent = text.length;

    // Update capacity analysis
    updateCapacityAnalysis(text);

    // Debounced QR preview generation
    clearTimeout(previewTimeout);
    if (text.trim()) {
      previewTimeout = setTimeout(() => {
        generateQRPreview(text);
      }, 500);
    } else {
      clearQRPreview();
    }
  });
}

function updateCapacityAnalysis(text) {
  const capacityAnalysis = document.getElementById('capacityAnalysis');

  if (!text) {
    capacityAnalysis.textContent = '';
    return;
  }

  let analysis = '';
  if (text.length < 50) {
    analysis = '• Low density QR code';
  } else if (text.length < 200) {
    analysis = '• Medium density QR code';
  } else if (text.length < 500) {
    analysis = '• High density QR code';
  } else {
    analysis = '• Very high density - may affect readability';
  }

  capacityAnalysis.textContent = analysis;
}

async function generateQRPreview(text) {
  const qrPreview = document.getElementById('qrPreview');

  try {
    // Show loading state
    qrPreview.innerHTML = '<div class="qr-loading"><i class="fas fa-spinner fa-spin"></i><span>Generating preview...</span></div>';

    // Add timeout and better error handling for QR preview
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    const response = await fetch('/generate_qr_preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: text }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Display QR image
      qrPreview.innerHTML = `<img src="${result.qr_url}" alt="QR Preview">`;

      // Update QR info
      document.getElementById('qrVersion').textContent = result.analysis?.version || '-';
      document.getElementById('qrSize').textContent = result.analysis?.size || '-';
      document.getElementById('qrErrorCorrection').textContent = result.analysis?.error_correction || '-';
    } else {
      qrPreview.innerHTML = '<div class="qr-error"><i class="fas fa-exclamation-triangle"></i><span>Preview failed</span></div>';
    }
  } catch (error) {
    console.error('QR preview error:', error);

    let errorMessage = 'Preview unavailable';
    if (error.name === 'AbortError') {
      errorMessage = 'Preview timeout';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Network error';
    }

    qrPreview.innerHTML = `<div class="qr-error"><i class="fas fa-exclamation-triangle"></i><span>${errorMessage}</span></div>`;
  }
}

function clearQRPreview() {
  const qrPreview = document.getElementById('qrPreview');
  qrPreview.innerHTML = '<i class="fas fa-qrcode"></i><span>QR preview will appear here</span>';

  // Reset QR info
  document.getElementById('qrVersion').textContent = '-';
  document.getElementById('qrSize').textContent = '-';
  document.getElementById('qrErrorCorrection').textContent = '-';
}

function initSecurityOptions() {
  const securityToggle = document.getElementById('enableSecurity');
  const securityConfig = document.getElementById('securityConfig');
  const securityTitle = document.getElementById('securityTitle');
  const securitySubtitle = document.getElementById('securitySubtitle');
  const securityIcon = document.getElementById('securityIcon');

  if (!securityToggle || !securityConfig || !securityTitle || !securitySubtitle || !securityIcon) return;

  securityToggle.addEventListener('change', function () {
    if (this.checked) {
      securityConfig.style.display = 'block';
      securityTitle.textContent = 'Security Level: High';
      securitySubtitle.textContent = 'QR will be cryptographically bound to document';
      securityIcon.innerHTML = '<i class="fas fa-shield-alt"></i>';
    } else {
      securityConfig.style.display = 'none';
      securityTitle.textContent = 'Security Level: None';
      securitySubtitle.textContent = 'Standard QR code without binding';
      securityIcon.innerHTML = '<i class="fas fa-qrcode"></i>';
    }
  });

  // Expiry time change handler
  const expirySelect = document.getElementById('expiryHours');
  expirySelect.addEventListener('change', function () {
    updateSecurityStatus(this.value);
  });
}

function updateSecurityStatus(expiryHours) {
  const securitySubtitle = document.getElementById('securitySubtitle');
  const hours = parseInt(expiryHours);

  let timeText;
  if (hours === 1) {
    timeText = '1 hour';
  } else if (hours < 24) {
    timeText = `${hours} hours`;
  } else if (hours === 24) {
    timeText = '1 day';
  } else if (hours < 168) {
    timeText = `${Math.round(hours / 24)} days`;
  } else {
    timeText = '1 week';
  }

  securitySubtitle.textContent = `QR binding expires in ${timeText}`;
}

// Separate function to make embed request with proper error handling
async function makeEmbedRequest(formData) {
  let response;
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
    const fetchPromise = fetch('/embed_document_secure', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    updateProgressStep(3, 'Processing document...');
    response = await fetchPromise;

    clearTimeout(timeoutId);

    // Check if response is ok
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;

      // Try to get more detailed error from response
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (jsonError) {
        // If can't parse JSON, use status text
        console.warn('Could not parse error response as JSON:', jsonError);
      }

      throw new Error(errorMessage);
    }

  } catch (fetchError) {
    if (fetchError.name === 'AbortError') {
      throw new Error('Request timeout - Please try again with a smaller file or check your internet connection');
    } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
      throw new Error('Network error - Please check your internet connection and try again');
    } else {
      throw fetchError; // Re-throw other errors
    }
  }

  let result;
  try {
    result = await response.json();
  } catch (jsonError) {
    console.error('Failed to parse response as JSON:', jsonError);
    throw new Error('Invalid response from server - please try again');
  }

  return result;
}

async function handleIntegratedEmbedding(form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  // Update button state
  submitBtn.innerHTML = '<span class="loading"></span> Processing...';
  submitBtn.disabled = true;

  // Show progress container
  showProgressContainer();
  hideResults();

  // Clear any previous alerts
  clearAlert();

  try {
    // Validate form
    const validation = validateEmbedForm(form);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Prepare form data
    const formData = new FormData(form);
    const processId = self.crypto?.randomUUID ? self.crypto.randomUUID() : Date.now().toString();
    formData.append('processId', processId);

    // Set progress to step 1
    updateProgressStep(1, 'Preparing request...');

    // Get input mode and prepare data accordingly
    const qrInputMode = document.querySelector('input[name="qrInputMode"]:checked').value;

    if (qrInputMode === 'text') {
      const qrData = document.getElementById('qrData').value.trim();
      if (!qrData) {
        throw new Error('Please enter QR code data');
      }
    } else {
      const qrFile = document.getElementById('qrFile').files[0];
      if (!qrFile) {
        throw new Error('Please select a QR code file');
      }
    }

    // Update progress to step 2
    updateProgressStep(2, 'Generating QR code...');

    // Start polling for progress
    startProgressPolling(processId);

    // Make request to integrated endpoint with retry mechanism
    const maxRetries = 2;
    let result = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Update progress message to show retry attempt
        if (attempt > 1) {
          updateProgressStep(2, `Mencoba ulang... (${attempt - 1}/${maxRetries})`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        result = await makeEmbedRequest(formData);
        break; // Success, exit retry loop

      } catch (requestError) {
        console.log(`Attempt ${attempt} failed:`, requestError.message);

        // If this is the last attempt, throw the error
        if (attempt === maxRetries + 1) {
          throw requestError;
        }

        // For network errors, wait longer before retry
        if (requestError.message.includes('Network error') ||
          requestError.message.includes('timeout')) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    if (result.success) {
      // Update progress to completion
      updateProgressStep(4, 'Complete!');

      // Display results
      await displayIntegratedResults(result);

      // Don't show generic success message here - it's handled in displayIntegratedResults
    } else {
      // Handle specific error types
      if (result.security_error) {
        await handleSecurityError(result);
      } else if (result.error_type === 'NO_IMAGES_FOUND') {
        showNoImagesFoundError(result);
      } else {
        showAlert(result.message || 'Embedding process failed', 'error');
      }

      hideProgressContainer();
    }

  } catch (error) {
    console.error('Embedding error:', error);

    // Provide more specific error messages based on error type
    let userMessage = error.message || 'An error occurred during processing';

    // Check if it's a network-related error
    if (error.message && (
      error.message.includes('Network error') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('timeout')
    )) {
      userMessage = 'Koneksi jaringan bermasalah. Silakan:';
      showDetailedNetworkError();
    } else if (error.message && error.message.includes('Server error')) {
      userMessage = 'Server sedang mengalami masalah. Silakan coba lagi dalam beberapa saat.';
    } else if (error.message && error.message.includes('Invalid response')) {
      userMessage = 'Respons server tidak valid. Silakan refresh halaman dan coba lagi.';
    }

    showAlert(userMessage, 'error');
    hideProgressContainer();
  } finally {
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    stopProgressPolling();
  }
}

function validateEmbedForm(form) {
  const documentFile = document.getElementById('documentFile').files[0];
  if (!documentFile) {
    return { valid: false, message: 'Please select a document file' };
  }

  const qrInputMode = document.querySelector('input[name="qrInputMode"]:checked').value;

  if (qrInputMode === 'text') {
    const qrData = document.getElementById('qrData').value.trim();
    if (!qrData) {
      return { valid: false, message: 'Please enter QR code data' };
    }
  } else {
    const qrFile = document.getElementById('qrFile').files[0];
    if (!qrFile) {
      return { valid: false, message: 'Please select a QR code file' };
    }
  }

  return { valid: true };
}

function showProgressContainer() {
  const progressContainer = document.getElementById('progressContainer');
  progressContainer.style.display = 'block';

  // Reset all steps
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => {
    step.classList.remove('active', 'completed');
  });
}

function hideProgressContainer() {
  const progressContainer = document.getElementById('progressContainer');
  progressContainer.style.display = 'none';
}

function updateProgressStep(stepNumber, message) {
  const progressText = document.getElementById('progressText');
  const steps = document.querySelectorAll('.step');

  progressText.textContent = message;

  // Update step indicators
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    if (stepNum < stepNumber) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else if (stepNum === stepNumber) {
      step.classList.add('active');
      step.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
    }
  });

  // Update progress bar
  const progressFill = document.querySelector('.progress-fill');
  const percentage = (stepNumber / 4) * 100;
  progressFill.style.width = `${percentage}%`;
}

function startProgressPolling(processId) {
  const progressFill = document.querySelector('.progress-fill');
  progressFill.style.width = '0%';

  progressInterval = setInterval(async () => {
    try {
      const res = await fetch(`/progress/${processId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.total > 0) {
        updateEmbedProgress(data.current, data.total);
        if (data.status === 'completed' || data.current >= data.total) {
          stopProgressPolling();
        }
      }
    } catch (err) {
      console.error('Progress polling error:', err);
    }
  }, 1000);
}

function stopProgressPolling() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function updateEmbedProgress(current, total) {
  const progressFill = document.querySelector('.progress-fill');
  const percentage = Math.round((current / total) * 100);
  progressFill.style.width = `${percentage}%`;
  const progressText = document.getElementById('progressText');
  progressText.textContent = `Menyematkan watermark (${current}/${total})`;
}

async function displayIntegratedResults(result) {
  // Hide progress container
  hideProgressContainer();

  // Show results with new tab system
  updateResultsDisplay(result);

  // Display quality metrics
  if (result.quality_metrics) {
    displayQualityMetrics(result.quality_metrics);
  }

  // Display processed images with improved loading handling
  if (result.processed_images && result.processed_images.length > 0) {
    displayProcessedImages(result.processed_images, result.public_dir);

    // Show informative message about image loading instead of warning
    showAlert(`Proses embedding berhasil! ${result.processed_images.length} gambar sedang dimuat...`, 'success');

    // Clear success message after images are expected to load
    setTimeout(() => {
      clearAlert();
      // Show final success message without network implications
      showAlert('Semua proses telah selesai dengan sukses!', 'success');
      setTimeout(() => clearAlert(), 3000);
    }, 6000); // Wait longer to ensure images are loaded
  } else {
    // No images to process - show completion message
    showAlert('Proses embedding berhasil diselesaikan!', 'success');
    setTimeout(() => clearAlert(), 3000);
  }
}

function displayDocumentDownload(documentInfo) {
  const downloadSection = document.getElementById('embedDownload');
  downloadSection.innerHTML = `
        <div class="download-item">
            <div class="download-icon">
                <i class="fas fa-download"></i>
            </div>
            <div class="download-info">
                <div class="download-name">${documentInfo.filename}</div>
                <div class="download-type">${documentInfo.type.toUpperCase()} Document</div>
            </div>
            <a href="${documentInfo.download_url}" class="btn btn-download" download>
                <i class="fas fa-download"></i> Download
            </a>
        </div>
    `;
}

function displayQRInformation(qrInfo) {
  const qrResultInfo = document.getElementById('qrResultInfo');
  const qrGenerated = qrInfo.generated ? 'Generated from text' : 'Uploaded file';
  const qrData = qrInfo.data || 'N/A';

  qrResultInfo.innerHTML = `
        <div class="info-grid">
            <div class="info-item">
                <label>Source:</label>
                <span>${qrGenerated}</span>
            </div>
            <div class="info-item">
                <label>Data:</label>
                <span class="qr-data">${qrData.length > 100 ? qrData.substring(0, 100) + '...' : qrData}</span>
            </div>
            ${qrInfo.url ? `
            <div class="info-item full-width">
                <label>Preview:</label>
                <img src="${qrInfo.url}" alt="Generated QR Code" class="qr-result-image">
            </div>
            ` : ''}
        </div>
    `;
}

function displaySecurityInformation(securityInfo) {
  const securityResultSection = document.getElementById('securityResultSection');
  const securityResultInfo = document.getElementById('securityResultInfo');

  securityResultSection.style.display = 'block';

  let securityContent = `
        <div class="security-status-display">
            <div class="security-level security-level-${securityInfo.security_level}">
                <i class="fas fa-shield-alt"></i>
                <span>Security Level: ${securityInfo.security_level.charAt(0).toUpperCase() + securityInfo.security_level.slice(1)}</span>
            </div>
    `;

  if (securityInfo.binding_id) {
    securityContent += `
            <div class="security-details">
                <div class="security-item">
                    <label>Binding ID:</label>
                    <span class="binding-id">${securityInfo.binding_id}</span>
                </div>
                <div class="security-item">
                    <label>Expires:</label>
                    <span>${new Date(securityInfo.expiry_time * 1000).toLocaleString()}</span>
                </div>
            </div>
        `;
  }

  securityContent += '</div>';
  securityResultInfo.innerHTML = securityContent;
}

function displayQualityMetrics(metrics) {
  const embedMetrics = document.getElementById('embedMetrics');

  if (!embedMetrics) {
    console.warn('Embed metrics element not found');
    return;
  }

  if (metrics && metrics.mse !== undefined && metrics.mse !== null &&
    metrics.psnr !== undefined && metrics.psnr !== null) {
    embedMetrics.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-label">MSE (Mean Squared Error)</div>
                    <div class="metric-value">${metrics.mse.toFixed(6)}</div>
                    <div class="metric-description">Lower is better (less distortion)</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">PSNR (Peak Signal-to-Noise Ratio)</div>
                    <div class="metric-value">${metrics.psnr.toFixed(2)} dB</div>
                    <div class="metric-description">Higher is better (${getQualityRating(metrics.psnr)})</div>
                </div>
            </div>
        `;
  } else {
    embedMetrics.innerHTML = '<p>Quality metrics not available</p>';
  }
}

function displayProcessedImages(processedImages, publicDir) {
  const gridContainer = document.getElementById('processedImagesGrid');
  const gridLoading = document.getElementById('gridLoading');
  const gridEmpty = document.getElementById('gridEmpty');

  if (!gridContainer) {
    console.warn('Grid container not found');
    return;
  }

  if (!processedImages || processedImages.length === 0) {
    gridEmpty.style.display = 'block';
    gridLoading.style.display = 'none';
    return;
  }

  // Hide empty state and show loading
  gridEmpty.style.display = 'none';
  gridLoading.style.display = 'flex';

  // Debug logging
  console.log('Processing images for grid:', processedImages);

  // Clear existing grid items except loading/empty states
  const existingItems = gridContainer.querySelectorAll('.result-grid-item');
  existingItems.forEach(item => item.remove());

  // Generate grid items
  processedImages.forEach((imageInfo, index) => {
    console.log(`Creating grid item ${index}:`, imageInfo);

    // Construct proper image URLs
    let originalUrl, watermarkedUrl;

    if (imageInfo.original) {
      originalUrl = `/static/generated/${imageInfo.original}`;
    }

    if (imageInfo.watermarked) {
      watermarkedUrl = `/static/generated/${imageInfo.watermarked}`;
    }

    // Create grid item
    const gridItem = document.createElement('div');
    gridItem.className = 'result-grid-item';
    gridItem.innerHTML = `
      <div class="grid-status-badge success">Success</div>
      
      <div class="grid-item-header">
        <div class="grid-item-icon">
          <i class="fas fa-image"></i>
        </div>
        <div class="grid-item-title">
          <h4>Gambar ${index + 1}</h4>
          <p class="grid-item-subtitle">LSB Steganografi</p>
        </div>
      </div>

      <div class="grid-item-preview">
        ${watermarkedUrl ? `
          <img src="${watermarkedUrl}" 
               alt="Gambar dengan QR Watermark ${index + 1}"
               onload="this.parentElement.classList.add('loaded')"
               onerror="this.parentElement.classList.add('error')">
        ` : `
          <div class="placeholder-content">
            <i class="fas fa-image"></i>
            <p>Gambar tidak tersedia</p>
          </div>
        `}
      </div>

      <div class="grid-item-metrics">
        <div class="grid-metric">
          <div class="grid-metric-value">✓</div>
          <div class="grid-metric-label">Status</div>
        </div>
        <div class="grid-metric">
          <div class="grid-metric-value">LSB</div>
          <div class="grid-metric-label">Metode</div>
        </div>
        <div class="grid-metric">
          <div class="grid-metric-value">${index + 1}</div>
          <div class="grid-metric-label">Index</div>
        </div>
      </div>

      <div class="grid-item-actions">
        <a href="${originalUrl || '#'}" target="_blank" class="grid-action-btn secondary" title="Lihat gambar asli">
          <i class="fas fa-eye"></i>
          Original
        </a>
        <a href="${watermarkedUrl || '#'}" target="_blank" class="grid-action-btn primary" title="Lihat gambar watermark">
          <i class="fas fa-shield-alt"></i>
          Watermark
        </a>
      </div>
    `;

    gridContainer.appendChild(gridItem);
  });

  // Hide loading state
  setTimeout(() => {
    gridLoading.style.display = 'none';
    initializeGridNavigation();
    validateImageDisplay(processedImages);
  }, 1000);

  // Update results count
  const resultsCount = document.querySelector('.results-count');
  if (resultsCount) {
    resultsCount.textContent = `${processedImages.length} gambar`;
  }
}

// Initialize grid navigation functionality
function initializeGridNavigation() {
  const gridContainer = document.getElementById('processedImagesGrid');
  const leftBtn = document.getElementById('gridNavLeft');
  const rightBtn = document.getElementById('gridNavRight');
  const normalViewBtn = document.getElementById('gridViewNormal');
  const compactViewBtn = document.getElementById('gridViewCompact');

  if (!gridContainer || !leftBtn || !rightBtn) return;

  // Grid navigation
  function updateNavButtons() {
    const scrollLeft = gridContainer.scrollLeft;
    const scrollWidth = gridContainer.scrollWidth;
    const clientWidth = gridContainer.clientWidth;

    leftBtn.disabled = scrollLeft <= 0;
    rightBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 10;
  }

  function scrollGrid(direction) {
    const scrollAmount = 300; // Scroll by 300px
    const currentScroll = gridContainer.scrollLeft;
    const targetScroll = direction === 'left'
      ? currentScroll - scrollAmount
      : currentScroll + scrollAmount;

    gridContainer.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }

  // Event listeners for navigation
  leftBtn.addEventListener('click', () => scrollGrid('left'));
  rightBtn.addEventListener('click', () => scrollGrid('right'));
  gridContainer.addEventListener('scroll', updateNavButtons);

  // View toggle functionality
  if (normalViewBtn && compactViewBtn) {
    normalViewBtn.addEventListener('click', () => {
      gridContainer.classList.remove('compact');
      normalViewBtn.classList.add('active');
      compactViewBtn.classList.remove('active');
      setTimeout(updateNavButtons, 100);
    });

    compactViewBtn.addEventListener('click', () => {
      gridContainer.classList.add('compact');
      compactViewBtn.classList.add('active');
      normalViewBtn.classList.remove('active');
      setTimeout(updateNavButtons, 100);
    });
  }

  // Initial nav button state
  setTimeout(updateNavButtons, 100);
}

function validateImageDisplay(processedImages) {
  console.log('Validating grid image display...');

  const gridItems = document.querySelectorAll('.result-grid-item');
  let successCount = 0;
  let totalImages = processedImages.length; // Grid shows watermarked images primarily

  gridItems.forEach((item, index) => {
    const img = item.querySelector('.grid-item-preview img');
    if (img) {
      if (img.complete && img.naturalWidth > 0) {
        successCount++;
        item.classList.add('image-loaded');
        console.log(`Grid image ${index} loaded successfully`);
      } else {
        item.classList.add('image-error');
        console.warn(`Grid image ${index} failed to load:`, img.src);
      }
    }
  });

  console.log(`Grid validation: ${successCount}/${totalImages} images loaded`);

  // Enhanced final validation after additional delay
  setTimeout(() => {
    validateImageDisplayFinal(processedImages);
  }, 2000);
}

function validateImageDisplayFinal(processedImages) {
  console.log('Final validation of grid image display...');

  const gridItems = document.querySelectorAll('.result-grid-item');
  let successCount = 0;
  let totalImages = processedImages.length;

  gridItems.forEach((item, index) => {
    const img = item.querySelector('.grid-item-preview img');
    if (img && img.complete && img.naturalWidth > 0) {
      successCount++;
      item.classList.add('image-loaded');
    } else {
      item.classList.add('image-error');
    }
  });

  console.log(`Final grid validation: ${successCount}/${totalImages} images loaded`);

  if (successCount < totalImages) {
    const failedCount = totalImages - successCount;
    if (failedCount > totalImages / 2) {
      showAlert(`${failedCount} dari ${totalImages} gambar masih dimuat. Proses embedding berhasil. Tunggu sebentar atau refresh halaman.`, 'info');
    }
  } else {
    console.log('All grid images loaded successfully!');
  }
}

function getQualityRating(psnr) {
  if (psnr >= 40) return 'Excellent';
  if (psnr >= 30) return 'Good';
  if (psnr >= 20) return 'Fair';
  return 'Poor';
}

async function handleSecurityError(result) {
  const errorDetails = result.security_error;

  let errorMessage = 'Security validation failed:\n';
  errorMessage += errorDetails.error_message || 'Unknown security error';

  if (result.recommendations && result.recommendations.length > 0) {
    errorMessage += '\n\nRecommendations:\n';
    result.recommendations.forEach(rec => {
      errorMessage += `• ${rec}\n`;
    });
  }

  showAlert(errorMessage, 'error');
}

function hideResults() {
  const embedResult = document.getElementById('embedResult');
  embedResult.style.display = 'none';

  const securityResultSection = document.getElementById('securityResultSection');
  securityResultSection.style.display = 'none';
}

function showNoImagesFoundError(result) {
  const alertElement = document.getElementById('embedAlert');
  alertElement.className = 'alert alert-warning';

  // Create detailed error message with recommendations
  let errorHTML = `
    <div class="error-header">
      <i class="fas fa-exclamation-triangle"></i>
      <strong>Dokumen Tidak Mengandung Gambar</strong>
    </div>
    <div class="error-content">
      <p>${result.message}</p>
  `;

  // Add recommendations if available
  if (result.recommendations && result.recommendations.length > 0) {
    errorHTML += `
      <div class="error-recommendations">
        <h5><i class="fas fa-lightbulb"></i> Rekomendasi:</h5>
        <ul>
    `;

    result.recommendations.forEach(recommendation => {
      errorHTML += `<li><i class="fas fa-arrow-right"></i> ${recommendation}</li>`;
    });

    errorHTML += `
        </ul>
      </div>
    `;
  }

  errorHTML += `</div>`;

  alertElement.innerHTML = errorHTML;
  alertElement.style.display = 'block';
}

function showAlert(message, type = 'info') {
  const alertElement = document.getElementById('embedAlert');
  alertElement.className = `alert alert-${type}`;
  alertElement.textContent = message;
  alertElement.style.display = 'block';
}

function clearAlert() {
  const alertElement = document.getElementById('embedAlert');
  alertElement.style.display = 'none';
}

// Network error handling with detailed troubleshooting
function showDetailedNetworkError() {
  const alertElement = document.getElementById('embedAlert');
  alertElement.className = 'alert alert-error';

  const networkTips = [
    'Periksa koneksi internet Anda',
    'Coba refresh halaman dan ulangi proses',
    'Pastikan file dokumen tidak terlalu besar (max 50MB)',
    'Gunakan browser yang mendukung (Chrome, Firefox, Edge)',
    'Nonaktifkan ad-blocker atau firewall yang mungkin memblokir',
    'Coba lagi dalam beberapa menit'
  ];

  let errorHTML = `
    <div class="error-header">
      <i class="fas fa-wifi"></i>
      <strong>Error Koneksi Jaringan</strong>
    </div>
    <div class="error-content">
      <p>Proses embedding gagal karena masalah koneksi. Silakan coba langkah-langkah berikut:</p>
      <div class="error-recommendations">
        <ul>
  `;

  networkTips.forEach(tip => {
    errorHTML += `<li><i class="fas fa-arrow-right"></i> ${tip}</li>`;
  });

  errorHTML += `
        </ul>
      </div>
    </div>
  `;

  alertElement.innerHTML = errorHTML;
  alertElement.style.display = 'block';

  // Auto-hide after 10 seconds
  setTimeout(() => {
    alertElement.style.display = 'none';
  }, 10000);
}

// Check network connectivity
function checkNetworkConnection() {
  return navigator.onLine;
}

// Monitor network status
function initNetworkMonitoring() {
  window.addEventListener('online', function () {
    console.log('Network connection restored');
    showAlert('Koneksi internet pulih. Anda dapat melanjutkan proses.', 'success');
  });

  window.addEventListener('offline', function () {
    console.log('Network connection lost');
    showAlert('Koneksi internet terputus. Periksa koneksi Anda.', 'warning');
  });
}

// Initialize Results Tabs
function initializeResultsTabs() {
  const tabButtons = document.querySelectorAll('.results-tab-btn');
  const tabPanes = document.querySelectorAll('.results-tab-pane');

  if (!tabButtons.length || !tabPanes.length) return;

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const targetPane = document.getElementById(`tab-${targetTab}`);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      // Update grid navigation if images tab is activated
      if (targetTab === 'images') {
        setTimeout(() => {
          updateGridNavigation();
        }, 100);
      }
    });
  });
}

// Initialize Accordion
function initializeAccordion() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const content = document.getElementById(targetId);
      const isActive = header.classList.contains('active');

      // Close all accordion items
      accordionHeaders.forEach(h => {
        h.classList.remove('active');
        const c = document.getElementById(h.getAttribute('data-target'));
        if (c) c.classList.remove('active');
      });

      // If item wasn't active, open it
      if (!isActive) {
        header.classList.add('active');
        if (content) content.classList.add('active');
      }
    });
  });
}

// Update Grid Navigation (helper function)
function updateGridNavigation() {
  const gridContainer = document.getElementById('processedImagesGrid');
  const leftBtn = document.getElementById('gridNavLeft');
  const rightBtn = document.getElementById('gridNavRight');

  if (!gridContainer || !leftBtn || !rightBtn) return;

  const scrollLeft = gridContainer.scrollLeft;
  const scrollWidth = gridContainer.scrollWidth;
  const clientWidth = gridContainer.clientWidth;

  leftBtn.disabled = scrollLeft <= 0;
  rightBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 10;
}

// Update results display functions
function updateResultsDisplay(result) {
  const resultsPanel = document.getElementById('resultsPanel');
  if (resultsPanel) {
    resultsPanel.style.display = 'block';
  }

  // Update overview tab with download links
  updateOverviewTab(result);

  // Update image stats
  updateImageStats(result);

  // Show default overview tab
  const overviewTab = document.querySelector('[data-tab="overview"]');
  if (overviewTab) {
    overviewTab.click();
  }
}

function updateOverviewTab(result) {
  // Update download links
  const downloadContainer = document.getElementById('embedDownload');
  if (downloadContainer && result.download_url) {
    downloadContainer.innerHTML = `
      <div class="download-item">
        <a href="${result.download_url}" target="_blank" class="download-link">
          <i class="fas fa-download"></i>
          <span>Unduh Dokumen Watermark</span>
          <small>PDF dengan watermark QR tersembunyi</small>
        </a>
      </div>
    `;
  }

  // Update QR info
  const qrInfoContainer = document.getElementById('qrResultInfo');
  if (qrInfoContainer && result.qr_info) {
    qrInfoContainer.innerHTML = `
      <div class="qr-info-grid">
        <div class="qr-info-item">
          <span class="qr-info-label">Data:</span>
          <span class="qr-info-value">${result.qr_info.data || 'N/A'}</span>
        </div>
        <div class="qr-info-item">
          <span class="qr-info-label">Level Koreksi:</span>
          <span class="qr-info-value">${result.qr_info.error_correction || 'M'}</span>
        </div>
      </div>
    `;
  }

  // Update security info if available
  const securityCard = document.getElementById('securityCard');
  const securityInfoContainer = document.getElementById('securityResultInfo');
  if (result.security_enabled && securityCard && securityInfoContainer) {
    securityCard.style.display = 'flex';
    securityInfoContainer.innerHTML = `
      <div class="security-summary">
        <div class="security-level-badge">
          <i class="fas fa-shield-check"></i>
          <span>Level ${result.security_level || 'Standard'}</span>
        </div>
      </div>
    `;
  }
}

function updateImageStats(result) {
  const totalCount = document.getElementById('totalImagesCount');
  const processedCount = document.getElementById('processedImagesCount');
  const statsContainer = document.getElementById('embedImageStats');

  // Determine total images from result.total_images if available
  const total = typeof result.total_images === 'number'
    ? result.total_images
    : (result.processed_images ? result.processed_images.length : 0);

  if (totalCount) totalCount.textContent = total;
  const processed = result.processed_images ? result.processed_images.length : 0;
  if (processedCount) processedCount.textContent = processed;

  if (statsContainer && (total > 0 || processed > 0)) {
    statsContainer.style.display = 'flex';
  }
}
