"""
Simple async wrapper for embed functions to provide progress tracking
"""
import threading
import time
from main import embed_watermark_to_docx, embed_watermark_to_pdf

class SimpleEmbedProgress:
    def __init__(self, process_id, update_callback):
        self.process_id = process_id
        self.update_callback = update_callback
        self.is_cancelled = False
        
    def cancel(self):
        self.is_cancelled = True
        
    def update_progress(self, progress, message):
        if self.update_callback and not self.is_cancelled:
            self.update_callback(self.process_id, progress, message)
            
    def simulate_progress(self, start_progress, end_progress, duration, step_message):
        """Simulate gradual progress over a duration"""
        if self.is_cancelled:
            return
            
        steps = 20  # Number of steps to simulate
        step_size = (end_progress - start_progress) / steps
        step_duration = duration / steps
        
        for i in range(steps + 1):
            if self.is_cancelled:
                return
                
            progress = start_progress + (step_size * i)
            message = f"{step_message} ({progress:.0f}%)"
            self.update_progress(progress, message)
            
            if i < steps:  # Don't sleep on the last iteration
                time.sleep(step_duration)

def embed_with_progress(doc_path, qr_path, output_path, is_docx=True, 
                       qr_data=None, security_config=None, progress_tracker=None):
    """
    Wrapper function that adds progress tracking to embed functions
    """
    try:
        if progress_tracker:
            progress_tracker.update_progress(30, "Extracting images from document...")
            
        # Simulate image extraction progress
        if progress_tracker:
            progress_tracker.simulate_progress(30, 40, 1, "Extracting images")
            
        if progress_tracker:
            progress_tracker.update_progress(40, "Starting LSB watermarking process...")
            
        # Create a progress callback for the embed function
        def lsb_progress_callback(progress, message):
            if progress_tracker:
                # Map the internal progress to our range (40-85)
                mapped_progress = 40 + (progress * 0.45)  # 45% of total progress
                progress_tracker.update_progress(mapped_progress, f"LSB Embedding: {message}")
        
        # Call the appropriate embed function with progress callback
        if is_docx:
            result = embed_watermark_to_docx(
                doc_path, qr_path, output_path, 
                qr_data=qr_data, 
                security_config=security_config,
                progress_callback=lsb_progress_callback
            )
        else:
            result = embed_watermark_to_pdf(
                doc_path, qr_path, output_path,
                qr_data=qr_data, 
                security_config=security_config,
                progress_callback=lsb_progress_callback
            )
            
        if progress_tracker:
            progress_tracker.update_progress(90, "Finalizing document...")
            
        # Simulate finalization
        if progress_tracker:
            progress_tracker.simulate_progress(90, 95, 0.5, "Finalizing")
            
        return result
        
    except Exception as e:
        if progress_tracker:
            progress_tracker.update_progress(0, f"Error: {str(e)}")
        raise e
