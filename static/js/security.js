/**
 * Security Features JavaScript
 * Handles document binding, secure QR generation, and validation
 */

// Security feature state management
const SecurityManager = {
  // Current binding tokens
  currentBindingToken: null,
  documentFingerprints: new Map(),

  // Initialize security features
  init() {
    this.setupEventListeners();
    this.loadStoredData();
    this.setupFormValidation();
  },

  // Setup event listeners
  setupEventListeners() {
    // File input change handlers
    document.getElementById('preregDocument')?.addEventListener('change', this.handleDocumentPreview);
    document.getElementById('validateQr')?.addEventListener('change', this.handleQrPreview);
    document.getElementById('infoQr')?.addEventListener('change', this.handleQrPreview);

    // Real-time QR data validation
    document.getElementById('sqrData')?.addEventListener('input', this.validateQrData);
    document.getElementById('preregQrData')?.addEventListener('input', this.validateQrData);

    // Binding token validation
    document.getElementById('bindingToken')?.addEventListener('input', this.validateBindingToken);

    // Security status updates
    setInterval(this.updateSecurityStatus.bind(this), 30000); // Update every 30 seconds
  },

  // Handle document file preview
  handleDocumentPreview(event) {
    const file = event.target.files[0];
    if (file) {
      const previewHtml = `
                <div class="file-preview">
                    <i class="fas fa-file-${file.name.endsWith('.pdf') ? 'pdf' : 'word'}"></i>
                    <div class="file-info">
                        <strong>${file.name}</strong>
                        <span>${(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                </div>
            `;

      // Find the parent form group and add preview
      const formGroup = event.target.closest('.form-group');
      let previewDiv = formGroup.querySelector('.file-preview-container');

      if (!previewDiv) {
        previewDiv = document.createElement('div');
        previewDiv.className = 'file-preview-container';
        formGroup.appendChild(previewDiv);
      }

      previewDiv.innerHTML = previewHtml;
    }
  },

  // Handle QR code image preview
  handleQrPreview(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const previewHtml = `
                    <div class="qr-preview">
                        <img src="${e.target.result}" alt="QR Preview" style="max-width: 150px; border: 1px solid #ddd; border-radius: 4px;">
                        <div class="qr-info">
                            <strong>${file.name}</strong>
                            <span>${(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                `;

        const formGroup = event.target.closest('.form-group');
        let previewDiv = formGroup.querySelector('.qr-preview-container');

        if (!previewDiv) {
          previewDiv = document.createElement('div');
          previewDiv.className = 'qr-preview-container';
          formGroup.appendChild(previewDiv);
        }

        previewDiv.innerHTML = previewHtml;
      };
      reader.readAsDataURL(file);
    }
  },

  // Validate QR data input
  validateQrData(event) {
    const input = event.target;
    const data = input.value.trim();
    const maxLength = 500;

    // Update character count
    const counter = input.closest('.form-group')?.querySelector('.char-count');
    if (counter) {
      counter.textContent = data.length;
    }

    // Validate data length
    if (data.length > maxLength) {
      this.showInputError(input, `Data too long (${data.length}/${maxLength} characters)`);
    } else if (data.length === 0) {
      this.showInputError(input, 'QR data is required');
    } else {
      this.clearInputError(input);
    }

    // Real-time capacity analysis
    if (data.length > 0) {
      this.analyzeQrCapacity(data, input);
    }
  },

  // Validate binding token format
  validateBindingToken(event) {
    const input = event.target;
    const token = input.value.trim();

    if (token.length === 0) {
      this.clearInputError(input);
      return;
    }

    try {
      // Basic token format validation
      if (!token.includes('.') || token.length < 100) {
        this.showInputError(input, 'Invalid token format');
        return;
      }

      // Try to decode basic structure
      const parts = token.split('.');
      if (parts.length < 2) {
        this.showInputError(input, 'Malformed binding token');
        return;
      }

      this.clearInputError(input);
      this.currentBindingToken = token;

    } catch (error) {
      this.showInputError(input, 'Invalid token format');
    }
  },

  // Analyze QR capacity requirements
  async analyzeQrCapacity(data, inputElement) {
    try {
      const formData = new FormData();
      formData.append('qrData', data);

      const response = await fetch('/analyze_qr', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        this.showCapacityInfo(inputElement, result.analysis);
      }
    } catch (error) {
      console.warn('Capacity analysis failed:', error);
    }
  },

  // Show capacity information
  showCapacityInfo(inputElement, analysis) {
    const formGroup = inputElement.closest('.form-group');
    let infoDiv = formGroup.querySelector('.capacity-info');

    if (!infoDiv) {
      infoDiv = document.createElement('div');
      infoDiv.className = 'capacity-info';
      formGroup.appendChild(infoDiv);
    }

    const version = analysis.optimal_version || 'Auto';
    const complexity = analysis.data_complexity || 'medium';

    infoDiv.innerHTML = `
            <div class="capacity-display">
                <span class="capacity-label">QR Version: ${version}</span>
                <span class="capacity-label">Complexity: ${complexity}</span>
            </div>
        `;
  },

  // Show input error
  showInputError(input, message) {
    input.classList.add('error');

    let errorDiv = input.parentNode.querySelector('.input-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'input-error';
      input.parentNode.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
  },

  // Clear input error
  clearInputError(input) {
    input.classList.remove('error');
    const errorDiv = input.parentNode.querySelector('.input-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  },

  // Setup form validation
  setupFormValidation() {
    // Add validation styles
    const styles = `
            <style>
                .form-input.error {
                    border-color: #ef4444;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }
                
                .input-error {
                    color: #ef4444;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                }
                
                .capacity-info {
                    background: #f0f9ff;
                    border: 1px solid #0ea5e9;
                    border-radius: 4px;
                    padding: 0.5rem;
                    margin-top: 0.5rem;
                    font-size: 0.875rem;
                }
                
                .capacity-display {
                    display: flex;
                    gap: 1rem;
                }
                
                .capacity-label {
                    color: #0369a1;
                    font-weight: 500;
                }
                
                .file-preview, .qr-preview {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    padding: 0.75rem;
                    margin-top: 0.5rem;
                }
                
                .file-preview i {
                    font-size: 1.5rem;
                    color: #6b7280;
                }
                
                .file-info, .qr-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .file-info strong, .qr-info strong {
                    color: #111827;
                    font-size: 0.875rem;
                }
                
                .file-info span, .qr-info span {
                    color: #6b7280;
                    font-size: 0.75rem;
                }
            </style>
        `;

    document.head.insertAdjacentHTML('beforeend', styles);
  },

  // Load stored data from localStorage
  loadStoredData() {
    try {
      const storedTokens = localStorage.getItem('securityTokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        this.documentFingerprints = new Map(tokens);
      }
    } catch (error) {
      console.warn('Failed to load stored security data:', error);
    }
  },

  // Save binding token
  saveBindingToken(fingerprintId, tokenData) {
    this.documentFingerprints.set(fingerprintId, {
      ...tokenData,
      savedAt: Date.now()
    });

    try {
      localStorage.setItem('securityTokens', JSON.stringify(Array.from(this.documentFingerprints)));
    } catch (error) {
      console.warn('Failed to save binding token:', error);
    }
  },

  // Update security status
  updateSecurityStatus() {
    const statusDiv = document.getElementById('securityStatusContent');
    if (!statusDiv) return;

    const now = Date.now();
    const activeTokens = Array.from(this.documentFingerprints.values())
      .filter(token => token.expiresAt && token.expiresAt > now);

    let statusHtml = '';

    if (activeTokens.length > 0) {
      statusHtml = `
                <div class="status-item">
                    <span class="status-secure">Active</span>
                    <span>${activeTokens.length} active binding token(s)</span>
                </div>
            `;

      activeTokens.forEach(token => {
        const expiresIn = Math.floor((token.expiresAt - now) / (1000 * 60 * 60));
        statusHtml += `
                    <div class="token-status">
                        <span>📄 ${token.documentName || 'Document'}</span>
                        <span>Expires in ${expiresIn}h</span>
                    </div>
                `;
      });
    } else {
      statusHtml = `
                <div class="status-item">
                    <span class="status-legacy">No Active Tokens</span>
                    <span>No document bindings currently active</span>
                </div>
            `;
    }

    statusDiv.innerHTML = statusHtml;
  },

  // Enhanced result display
  showEnhancedResult(elementId, data, type = 'success') {
    const element = document.getElementById(elementId);
    if (!element) return;

    let content = '';

    switch (type) {
      case 'preregister':
        content = this.formatPreregisterResult(data);
        break;
      case 'secure-qr':
        content = this.formatSecureQrResult(data);
        break;
      case 'validation':
        content = this.formatValidationResult(data);
        break;
      case 'security-info':
        content = this.formatSecurityInfoResult(data);
        break;
      default:
        content = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    element.innerHTML = content;
    element.className = `result-panel show result-${data.success ? 'success' : 'error'}`;
  },

  // Format pre-registration result
  formatPreregisterResult(data) {
    if (!data.success) {
      return `<h4>❌ Pre-Registration Failed</h4><p>${data.message}</p>`;
    }

    // Save token for later use (prefer UUID over legacy registration_id)
    const documentId = data.document_uuid || data.registration_id;
    this.saveBindingToken(documentId, {
      token: data.binding_token,
      documentName: data.document_info.filename,
      documentUuid: data.document_uuid,
      expiresAt: data.expires_at * 1000,
      createdAt: Date.now()
    });

    return `
            <h4>✅ Document Pre-Registered Successfully</h4>
            <div class="security-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Document ID:</strong>
                        <div class="uuid-display">
                            <code class="uuid-code">${data.document_uuid || data.registration_id}</code>
                            <button onclick="navigator.clipboard.writeText('${data.document_uuid || data.registration_id}')" 
                                    class="btn-copy" title="Copy Document ID">
                                📋
                            </button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <strong>Document:</strong>
                        <span>${data.document_info.filename}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Size:</strong>
                        <span>${(data.document_info.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div class="detail-item">
                        <strong>Expires:</strong>
                        <span>${new Date(data.expires_at * 1000).toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="token-section">
                    <strong>Binding Token:</strong>
                    <textarea readonly class="token-display">${data.binding_token}</textarea>
                    <button onclick="navigator.clipboard.writeText('${data.binding_token}')" class="btn-secondary">
                        📋 Copy Token
                    </button>
                </div>
                
                <div class="next-steps">
                    <h5>🎯 Next Steps:</h5>
                    <ol>
                        <li>Copy the binding token above</li>
                        <li>Switch to "Secure QR Generation" tab</li>
                        <li>Select "Use Pre-Generated Token" mode</li>
                        <li>Paste the token and generate your QR code</li>
                    </ol>
                </div>
                
                ${data.document_uuid ? '<div class="uuid-info"><small>✨ Using new UUID-based security system</small></div>' : ''}
            </div>
        `;
  },

  // Format secure QR result
  formatSecureQrResult(data) {
    if (!data.success) {
      return `<h4>❌ QR Generation Failed</h4><p>${data.message}</p>`;
    }

    let content = `
            <h4>✅ Secure QR Code Generated</h4>
            <div class="security-details">
                <div class="qr-display">
                    <img src="${data.qr_url}" alt="Generated QR Code" class="generated-qr">
                    <div class="qr-actions">
                        <a href="${data.qr_url}" download class="btn-secondary">📥 Download</a>
                        <button onclick="navigator.clipboard.writeText('${data.qr_url}')" class="btn-secondary">🔗 Copy URL</button>
                    </div>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Binding Mode:</strong>
                        <span class="status-${data.binding_mode === 'none' ? 'legacy' : 'secure'}">${data.binding_mode}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Security Level:</strong>
                        <span class="status-${data.security_info.is_secure ? 'secure' : 'legacy'}">
                            ${data.security_info.is_secure ? 'Secure' : 'Legacy'}
                        </span>
                    </div>
        `;

    if (data.document_binding) {
      const documentId = data.document_binding.document_id || data.document_binding.fingerprint_id;
      content += `
                    <div class="detail-item">
                        <strong>Document ID:</strong>
                        <div class="uuid-display">
                            <code class="uuid-code">${documentId}</code>
                            <button onclick="navigator.clipboard.writeText('${documentId}')" 
                                    class="btn-copy" title="Copy Document ID">
                                📋
                            </button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <strong>Expires:</strong>
                        <span>${new Date(data.document_binding.expires_at * 1000).toLocaleString()}</span>
                    </div>
            `;
      
      // Show UUID indicator if using new system
      if (data.document_binding.document_id) {
        content += `
                    <div class="detail-item">
                        <strong>Security Version:</strong>
                        <span class="status-secure">UUID-based (v2.0)</span>
                    </div>
                `;
      }
    }

    content += `
                </div>
            </div>
        `;

    return content;
  },

  // Format validation result
  formatValidationResult(data) {
    // Implementation for validation results
    return `<div>Validation result formatting not yet implemented</div>`;
  },

  // Format security info result
  formatSecurityInfoResult(data) {
    // Implementation for security info results
    return `<div>Security info formatting not yet implemented</div>`;
  }
};

// Enhanced UI utilities
const SecurityUI = {
  // Animate success/error states
  animateResult(elementId, type) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.transform = 'scale(0.95)';
    element.style.opacity = '0.7';

    setTimeout(() => {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
      element.style.transition = 'all 0.3s ease';
    }, 100);
  },

  // Show processing overlay
  showProcessing(message = 'Processing...') {
    const overlay = document.createElement('div');
    overlay.id = 'processingOverlay';
    overlay.innerHTML = `
            <div class="processing-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

    document.body.appendChild(overlay);
  },

  // Hide processing overlay
  hideProcessing() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
      overlay.remove();
    }
  },

  // Toast notifications
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

    // Set background color based on type
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 100);

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  SecurityManager.init();
  console.log('Security features initialized');
});

// Export for use in HTML
window.SecurityManager = SecurityManager;
window.SecurityUI = SecurityUI; 
