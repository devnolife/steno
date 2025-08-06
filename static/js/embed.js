// Secure Document Embedding - Integrated Workflow Handler
document.addEventListener('DOMContentLoaded', function () {
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

    // Make request to integrated endpoint
    const response = await fetch('/embed_document_secure', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success && result.tracking_enabled) {
      // Start progress tracking with the process ID using the new ProgressTracker
      const progressTracker = new ProgressTracker(result.process_id);

      // Store original button text
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.dataset.originalText = originalText;

      await progressTracker.startTracking();
    } else if (result.success) {
      // Fallback to old method without tracking
      updateProgressStep(4, 'Complete!');
      await displayIntegratedResults(result);
      showAlert('Document embedding completed successfully!', 'success');
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

async function displayIntegratedResults(result) {
  const resultsPanel = document.getElementById('resultsPanel');
  resultsPanel.style.display = 'block';

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
  if (result.quality_metrics) {
    displayQualityMetrics(result.quality_metrics);
  }

  // Display processed images
  if (result.processed_images && result.processed_images.length > 0) {
    displayProcessedImages(result.processed_images, result.public_dir);
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

  if (metrics.mse !== undefined && metrics.psnr !== undefined) {
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
  const processedImagesContainer = document.getElementById('processedImages');

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

  const securityResultSection = document.getElementById('securityResultSection');
  if (securityResultSection) {
    securityResultSection.style.display = 'none';
  }
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
