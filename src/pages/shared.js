/**
 * Shared UI helpers — modals, error toasts, etc.
 */

/**
 * Show error toast
 */
export function showError(message) {
    // Remove existing
    document.querySelectorAll('.error-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

/**
 * Show result modal
 */
export function showResultModal(title, contentHTML) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-hint">Tap to close</div>
      <h2 class="modal-title">${title}</h2>
      ${contentHTML}
    </div>
  `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('.modal-hint')) {
            overlay.remove();
        }
    });

    document.body.appendChild(overlay);
}

/**
 * Show confirm dialog
 */
export function showConfirm({ title, message, confirmText = 'OK', cancelText = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'alert-overlay';
        overlay.innerHTML = `
      <div class="alert-box">
        <div class="alert-title">${title}</div>
        <div class="alert-message">${message}</div>
        <div class="alert-buttons">
          <button class="alert-btn cancel">${cancelText}</button>
          <button class="alert-btn ${danger ? 'danger-confirm' : 'confirm'}">${confirmText}</button>
        </div>
      </div>
    `;

        overlay.querySelector('.cancel').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });

        overlay.querySelector(`.${danger ? 'danger-confirm' : 'confirm'}`).addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });

        document.body.appendChild(overlay);
    });
}

/**
 * Show prompt dialog
 */
export function showPrompt({ title, message, placeholder = '', confirmText = 'Save', cancelText = 'Cancel' }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'alert-overlay';
        overlay.innerHTML = `
      <div class="alert-box">
        <div class="alert-title">${title}</div>
        <div class="alert-message">${message}</div>
        <input type="text" class="alert-input" placeholder="${placeholder}">
        <div class="alert-buttons">
          <button class="alert-btn cancel">${cancelText}</button>
          <button class="alert-btn confirm">${confirmText}</button>
        </div>
      </div>
    `;

        const input = overlay.querySelector('.alert-input');
        input.focus();

        overlay.querySelector('.cancel').addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });

        overlay.querySelector('.confirm').addEventListener('click', () => {
            const value = input.value.trim();
            overlay.remove();
            resolve(value || null);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const value = input.value.trim();
                overlay.remove();
                resolve(value || null);
            }
        });

        document.body.appendChild(overlay);
    });
}
