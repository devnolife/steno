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
    preview.classList.add('d-none');
  }
  hideAllStatusIndicators();
}

// Function to clear document upload
function clearDocumentUpload() {
  const documentFileInput = document.getElementById('documentFile');
  if (documentFileInput) {
    documentFileInput.value = '';
  }
  hideDocumentPreview();
}

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes === null || isNaN(bytes) || bytes < 0) {
    return '0 Bytes';
  }
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

  radioButtons.forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.value === 'text') {
        qrTextSection.style.display = 'block';
        qrFileSection.style.display = 'none';
        qrPreviewSection.style.display = 'block';
        securityValidation.style.display = 'none';
        embedButtonText.textContent = 'Generate & Embed Secure QR';

        // Clear file input
        document.getElementById('qrFile').value = '';
      } else {
        qrTextSection.style.display = 'none';
        qrFileSection.style.display = 'block';
        qrPreviewSection.style.display = 'none';
        securityValidation.style.display = 'block';
        embedButtonText.textContent = 'Validate & Embed QR';

        // Clear text input
        document.getElementById('qrData').value = '';
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

    // Make request to generate QR preview
    const response = await fetch('/generate_qr_preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: text })
    });

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
    qrPreview.innerHTML = '<div class="qr-error"><i class="fas fa-exclamation-triangle"></i><span>Preview unavailable</span></div>';
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

      // Store result data in sessionStorage for results page
      sessionStorage.setItem('embedResults', JSON.stringify(result));

      // Show brief success message and redirect
      showAlert('Document embedding completed successfully! Redirecting to results...', 'success');

      // Redirect to results page after a short delay
      setTimeout(() => {
        window.location.href = '/embed/results';
      }, 2000);

    } else {
      // Handle specific error types
      if (result.security_error) {
        await handleSecurityError(result);
      } else {
        throw new Error(result.message || 'Embedding process failed');
      }
    }

  } catch (error) {
    console.error('Embedding error:', error);
    showAlert(error.message || 'An error occurred during processing', 'error');
    hideProgressContainer();

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
  if (!progressContainer) {
    console.warn('Progress container not found in DOM');
    return;
  }
  progressContainer.style.display = 'block';

  // Reset all steps
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => {
    step.classList.remove('active', 'completed');
  });
}

function hideProgressContainer() {
  const progressContainer = document.getElementById('progressContainer');
  if (!progressContainer) {
    console.warn('Progress container not found in DOM');
    return;
  }
  progressContainer.style.display = 'none';
}

function updateProgressStep(stepNumber, message) {
  const progressText = document.getElementById('progressText');
  const progressPercentage = document.getElementById('progressPercentage');
  const steps = document.querySelectorAll('.modern-step');

  if (progressText) {
    progressText.textContent = message;
  }

  // Update overall progress percentage
  const percentage = Math.round((stepNumber / 4) * 100);
  if (progressPercentage) {
    progressPercentage.textContent = `${percentage}%`;
  }

  // Update modern step indicators
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    const stepStatus = step.querySelector('.step-status i');

    if (stepNum < stepNumber) {
      step.classList.add('completed');
      step.classList.remove('active', 'pending');
      if (stepStatus) {
        stepStatus.className = 'fas fa-check-circle status-completed';
      }
    } else if (stepNum === stepNumber) {
      step.classList.add('active');
      step.classList.remove('completed', 'pending');
      if (stepStatus) {
        stepStatus.className = 'fas fa-spinner fa-pulse status-active';
      }

      // Add special handling for steganography step
      if (stepNumber === 3) {
        showSteganographyVisualization();
      }
    } else {
      step.classList.remove('active', 'completed');
      step.classList.add('pending');
      if (stepStatus) {
        stepStatus.className = 'fas fa-clock status-pending';
      }
    }
  });

  // Update progress bar with glow effect
  const progressFill = document.querySelector('.progress-fill');
  const progressGlow = document.querySelector('.progress-glow');
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
    if (progressGlow) {
      progressGlow.style.width = `${percentage}%`;
    }
  }

  // Update overall status indicator
  updateOverallStatus(stepNumber, message);

  // Update time estimates
  updateTimeEstimates(stepNumber);
}

function updateOverallStatus(stepNumber, message) {
  const statusIndicator = document.getElementById('overallStatus');
  if (!statusIndicator) return;

  const statusDot = statusIndicator.querySelector('.status-dot');
  const statusText = statusIndicator.querySelector('.status-text');

  let statusClass = 'status-processing';
  let statusMessage = message;

  if (stepNumber === 4) {
    statusClass = 'status-completed';
    statusMessage = 'Selesai';
  } else if (stepNumber > 0) {
    statusClass = 'status-processing';
  }

  if (statusDot) {
    statusDot.className = `status-dot ${statusClass}`;
  }
  if (statusText) {
    statusText.textContent = statusMessage;
  }
}

function showSteganographyVisualization() {
  const stegoViz = document.getElementById('stegoProcessViz');
  if (!stegoViz) return;

  stegoViz.style.display = 'block';
  stegoViz.classList.add('active');

  // Animate process arrow
  const processArrow = stegoViz.querySelector('.process-arrow');
  if (processArrow) {
    processArrow.classList.add('processing');
  }

  // Show QR embedding visualization
  const qrViz = document.getElementById('qrEmbeddingViz');
  if (qrViz) {
    qrViz.style.display = 'block';
    qrViz.classList.add('active');
  }
}

function updateSteganographyProgress(currentImage, totalImages, imageData) {
  // Update image counters
  const currentImageEl = document.getElementById('currentImage');
  const totalImagesEl = document.getElementById('totalImages');

  if (currentImageEl) currentImageEl.textContent = currentImage;
  if (totalImagesEl) totalImagesEl.textContent = totalImages;

  // Update image previews if data is available
  if (imageData) {
    updateImagePreviews(imageData);
  }

  // Update process step text
  const processStepText = document.getElementById('processStepText');
  if (processStepText) {
    processStepText.textContent = `Memproses gambar ${currentImage}/${totalImages}`;
  }
}

function updateImagePreviews(imageData) {
  // Update original image preview
  const originalPreview = document.getElementById('originalPreview');
  if (originalPreview && imageData.original_url) {
    originalPreview.innerHTML = `<img src="${imageData.original_url}" alt="Original Image">`;

    // Update original image info
    const originalSize = document.getElementById('originalSize');
    const originalFormat = document.getElementById('originalFormat');
    if (originalSize && imageData.original_size) {
      originalSize.textContent = formatFileSize(imageData.original_size);
    }
    if (originalFormat && imageData.format) {
      originalFormat.textContent = imageData.format.toUpperCase();
    }
  }

  // Update watermarked image preview
  const watermarkedPreview = document.getElementById('watermarkedPreview');
  if (watermarkedPreview && imageData.watermarked_url) {
    watermarkedPreview.innerHTML = `<img src="${imageData.watermarked_url}" alt="Watermarked Image">`;

    // Update quality metrics
    const psnrValue = document.getElementById('psnrValue');
    const mseValue = document.getElementById('mseValue');
    if (psnrValue && imageData.psnr) {
      psnrValue.textContent = `${imageData.psnr.toFixed(2)} dB`;
    }
    if (mseValue && imageData.mse) {
      mseValue.textContent = imageData.mse.toFixed(6);
    }
  }

  // Add success animation
  if (imageData.completed) {
    const watermarkedContainer = watermarkedPreview.closest('.image-preview');
    if (watermarkedContainer) {
      watermarkedContainer.classList.add('processing-complete');
    }
  }
}

function updateQrEmbeddingInfo(qrData) {
  const embeddingQrData = document.getElementById('embeddingQrData');
  const embeddingQrPreview = document.getElementById('embeddingQrPreview');

  if (embeddingQrData && qrData.data) {
    const displayData = qrData.data.length > 30
      ? qrData.data.substring(0, 30) + '...'
      : qrData.data;
    embeddingQrData.textContent = displayData;
  }

  if (embeddingQrPreview && qrData.qr_url) {
    embeddingQrPreview.innerHTML = `<img src="${qrData.qr_url}" alt="QR Code">`;
  }
}

function updateTimeEstimates(stepNumber) {
  const timeEstimate = document.getElementById('timeEstimate');
  const processSpeed = document.getElementById('processSpeed');

  if (!timeEstimate || !processSpeed) return;

  // Simple time estimation based on step
  let estimatedSeconds = 0;
  switch (stepNumber) {
    case 1: estimatedSeconds = 45; break;
    case 2: estimatedSeconds = 30; break;
    case 3: estimatedSeconds = 60; break;
    case 4: estimatedSeconds = 0; break;
  }

  if (estimatedSeconds > 0) {
    timeEstimate.textContent = `${estimatedSeconds}s`;
    processSpeed.textContent = 'Normal';
  } else {
    timeEstimate.textContent = '-';
    processSpeed.textContent = '-';
  }
}

function startProgressPolling(processId) {
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = '0%';
  }

  progressInterval = setInterval(async () => {
    try {
      const res = await fetch(`/progress/${processId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.total > 0) {
        updateEmbedProgress(data.current, data.total);

        // Update steganography visualization if in step 3
        if (data.step === 3 || data.current > 0) {
          updateSteganographyProgress(data.current, data.total, data.current_image);
        }

        // Update QR embedding info if available
        if (data.qr_info) {
          updateQrEmbeddingInfo(data.qr_info);
        }

        if (data.status === 'completed' || data.current >= data.total) {
          completeSteganographyProcess();
          stopProgressPolling();
        }
      }
    } catch (err) {
      console.error('Progress polling error:', err);
    }
  }, 1000);
}

function completeSteganographyProcess() {
  // Add completion animations
  const stegoViz = document.getElementById('stegoProcessViz');
  if (stegoViz) {
    stegoViz.classList.add('completed');
  }

  const processArrow = document.querySelector('.process-arrow');
  if (processArrow) {
    processArrow.classList.remove('processing');
    processArrow.classList.add('completed');
  }

  // Show success message
  const processStepText = document.getElementById('processStepText');
  if (processStepText) {
    processStepText.innerHTML = '<i class="fas fa-check-circle"></i> Selesai!';
  }
}

function stopProgressPolling() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function updateEmbedProgress(current, total) {
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    const percentage = Math.round((current / total) * 100);
    progressFill.style.width = `${percentage}%`;
  }

  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = `Menyematkan watermark (${current}/${total})`;
  }
}

async function displayIntegratedResults(result) {
  const resultsPanel = document.getElementById('resultsPanel');
  if (resultsPanel) {
    resultsPanel.style.display = 'block';
  }

  // Hide progress container
  hideProgressContainer();

  // Display document download
  displayDocumentDownload(result.document);

  // Display QR information
  displayQRInformation(result.qr);

  // Display security information if available
  if (result.security && result.security.security_level !== 'none') {
    displaySecurityInformation(result.security);
  }

  // Display quality metrics
  if (result.quality_metrics && typeof result.quality_metrics === 'object') {
    displayQualityMetrics(result.quality_metrics);
  }

  // Display processed images
  if (result.processed_images && result.processed_images.length > 0) {
    displayProcessedImages(result.processed_images, result.public_dir);
  }
}

function displayDocumentDownload(documentInfo) {
  const downloadSection = document.getElementById('embedDownload');
  if (!downloadSection) {
    console.warn('Download section not found in DOM');
    return;
  }
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
  if (!qrResultInfo) {
    console.warn('QR result info element not found in DOM');
    return;
  }

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
  const securityCard = document.getElementById('securityCard');
  const securityResultInfo = document.getElementById('securityResultInfo');

  // Add null checks to prevent errors
  if (!securityCard || !securityResultInfo) {
    console.warn('Security result elements not found in DOM');
    return;
  }

  securityCard.style.display = 'block';

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
    console.warn('Embed metrics element not found in DOM');
    return;
  }

  // Add debugging information
  console.log('Quality metrics received:', metrics);

  if (metrics.mse !== undefined && metrics.psnr !== undefined &&
    metrics.mse !== null && metrics.psnr !== null &&
    typeof metrics.mse === 'number' && typeof metrics.psnr === 'number') {
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
    // Log details about why metrics are not available
    console.warn('Quality metrics not available. MSE:', metrics?.mse, 'PSNR:', metrics?.psnr);
    embedMetrics.innerHTML = '<p>Quality metrics not available</p>';
  }
}

function displayProcessedImages(processedImages, publicDir) {
  const processedImagesContainer = document.getElementById('processedImagesGrid');
  if (!processedImagesContainer) {
    console.warn('Processed images container not found in DOM');
    return;
  }

  if (!processedImages || processedImages.length === 0) {
    processedImagesContainer.innerHTML = '<p>No images were processed</p>';
    return;
  }

  let imagesHtml = '<div class="image-comparison-grid">';

  processedImages.forEach((imageInfo, index) => {
    imagesHtml += `
            <div class="image-comparison-item">
                <div class="image-pair">
                    <div class="image-container">
                        <img src="/static/${imageInfo.original}" alt="Original Image ${index + 1}">
                        <div class="image-label">Original</div>
                    </div>
                    <div class="image-container">
                        <img src="/static/${imageInfo.watermarked}" alt="Watermarked Image ${index + 1}">
                        <div class="image-label">Watermarked</div>
                    </div>
                </div>
            </div>
        `;
  });

  imagesHtml += '</div>';
  processedImagesContainer.innerHTML = imagesHtml;
}

function getQualityRating(psnr) {
  if (typeof psnr !== 'number' || psnr === null || isNaN(psnr)) {
    return 'Unknown';
  }
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
  const resultsPanel = document.getElementById('resultsPanel');
  if (resultsPanel) {
    resultsPanel.style.display = 'none';
  }

  const securityCard = document.getElementById('securityCard');
  if (securityCard) {
    securityCard.style.display = 'none';
  }
}

function showAlert(message, type = 'info') {
  const alertElement = document.getElementById('embedAlert');
  if (!alertElement) {
    console.warn('Alert element not found in DOM');
    return;
  }
  alertElement.className = `alert alert-${type}`;
  alertElement.textContent = message;
  alertElement.style.display = 'block';
}

function clearAlert() {
  const alertElement = document.getElementById('embedAlert');
  if (!alertElement) {
    console.warn('Alert element not found in DOM');
    return;
  }
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
