// Progress Utilities for Document Embedding
// This file contains utilities for tracking and displaying progress

class ProgressTracker {
  constructor(processId) {
    this.processId = processId;
    this.isTracking = false;
    this.checkInterval = 1000; // Check every second
    this.maxWaitTime = 10 * 60 * 1000; // 10 minutes max
    this.startTime = null;
    this.lastProgress = 0;
  }

  async startTracking() {
    if (this.isTracking) {
      console.warn('Progress tracking already started');
      return;
    }

    this.isTracking = true;
    this.startTime = Date.now();
    this.lastProgress = 0;

    // Show progress container
    this.showProgressContainer();

    try {
      await this.checkProgress();
    } catch (error) {
      console.error('Progress tracking failed:', error);
      this.handleError(error);
    }
  }

  async checkProgress() {
    if (!this.isTracking) return;

    try {
      // Check timeout
      if (Date.now() - this.startTime > this.maxWaitTime) {
        throw new Error('Process timeout - please try again with smaller documents');
      }

      const response = await fetch(`/get_embed_progress/${this.processId}`);
      const progressData = await response.json();

      if (progressData.status === 'error') {
        throw new Error(progressData.message || 'Process failed');
      }

      if (progressData.status === 'cancelled') {
        throw new Error('Process was cancelled');
      }

      // Update progress display
      const progress = Math.round(progressData.progress || 0);
      if (progress > this.lastProgress || progressData.message) {
        this.lastProgress = progress;
        this.updateProgress(progress, progressData.message || 'Processing...');
      }

      if (progressData.completed && progressData.status === 'completed') {
        // Process completed successfully
        this.handleCompletion(progressData.result);
        return;
      }

      // Continue checking if not completed
      if (this.isTracking) {
        setTimeout(() => this.checkProgress(), this.checkInterval);
      }

    } catch (error) {
      this.handleError(error);
    }
  }

  updateProgress(progress, message) {
    const progressText = document.getElementById('progressText');
    const progressFill = document.querySelector('.progress-fill');

    if (progressText) {
      progressText.textContent = `${progress}% - ${message}`;
    }

    if (progressFill) {
      progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    // Update step indicators based on progress
    this.updateStepIndicators(progress);

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('progressUpdate', {
      detail: { progress, message, processId: this.processId }
    }));
  }

  updateStepIndicators(progress) {
    let stepNumber = 1;
    if (progress >= 25) stepNumber = 2;
    if (progress >= 50) stepNumber = 3;
    if (progress >= 95) stepNumber = 4;

    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index < stepNumber - 1) {
        step.classList.add('completed');
      } else if (index === stepNumber - 1) {
        step.classList.add('active');
      }
    });
  }

  showProgressContainer() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
      progressContainer.style.display = 'block';
    }

    // Hide results panel
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) {
      resultsPanel.style.display = 'none';
    }
  }

  hideProgressContainer() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }

  async handleCompletion(resultData) {
    this.isTracking = false;
    this.updateProgress(100, 'Process completed successfully!');

    // Display results
    if (resultData && typeof displayIntegratedResults === 'function') {
      await displayIntegratedResults(resultData);
    }

    // Show success message
    if (typeof showAlert === 'function') {
      showAlert('Document embedding completed successfully!', 'success');
    }

    // Reset form button
    this.resetFormButton();
  }

  handleError(error) {
    this.isTracking = false;

    console.error('Progress tracking error:', error);

    if (typeof showAlert === 'function') {
      showAlert(error.message || 'Failed to track progress', 'error');
    }

    this.hideProgressContainer();
    this.resetFormButton();
  }

  resetFormButton() {
    const submitBtn = document.querySelector('#embedForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = submitBtn.dataset.originalText || 'Embed Document';
      submitBtn.disabled = false;
    }
  }

  stop() {
    this.isTracking = false;
  }
}

// Utility function for simple progress simulation
function simulateProgress(duration = 5000, onUpdate = null, onComplete = null) {
  const startTime = Date.now();
  const interval = 100; // Update every 100ms

  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, (elapsed / duration) * 100);

    if (onUpdate) {
      onUpdate(progress, `Processing... ${Math.round(progress)}%`);
    }

    if (progress >= 100) {
      if (onComplete) {
        onComplete();
      }
    } else {
      setTimeout(updateProgress, interval);
    }
  };

  updateProgress();
}

// Export for use in other files
window.ProgressTracker = ProgressTracker;
window.simulateProgress = simulateProgress;
