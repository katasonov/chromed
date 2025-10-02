// TemporaryFileSaveDlg.js
// Provides a modal dialog for choosing where to save a temporary file

class TemporaryFileSaveDlg {
    static show() {
        return new Promise((resolve) => {
            const overlay = document.getElementById('temporaryfile-save-overlay');
            const dialog  = document.getElementById('temporaryfile-save-dialog');

            if (!overlay || !dialog) {
                alert('Save dialog DOM not found!');
                resolve('cancel');
                return;
            }

            // Buttons
            const localBtn  = document.getElementById('save-local-btn');
            const gdriveBtn = document.getElementById('save-gdrive-btn');
            const cancelBtn = document.getElementById('save-cancel-btn');

            if (!localBtn || !gdriveBtn || !cancelBtn) {
                alert('Save dialog buttons not found!');
                resolve('cancel');
                return;
            }

            const buttons = [localBtn, gdriveBtn, cancelBtn];

            // Remember previously focused element to restore later
            const prevActive = document.activeElement;

            // Show dialog
            overlay.style.display = 'flex';

            // Cleanup: hide, remove listeners, restore focus
            const cleanup = () => {
                overlay.style.display = 'none';
                dialog.removeEventListener('keydown', onKeyDown, true);
                if (prevActive && typeof prevActive.focus === 'function') {
                    prevActive.focus();
                }
            };

            // Click handlers
            localBtn.onclick  = () => { cleanup(); resolve('local');  };
            gdriveBtn.onclick = () => { cleanup(); resolve('gdrive'); };
            cancelBtn.onclick = () => { cleanup(); resolve('cancel'); };

            // Focus the first button when dialog opens
            localBtn.focus();

            // Keyboard navigation for Tab / Shift+Tab and Escape
            const onKeyDown = (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();

                    // Where are we now?
                    let idx = buttons.indexOf(document.activeElement);

                    // If focus isn't on one of our buttons (idx === -1), start at ends appropriately
                    if (idx === -1) {
                        idx = e.shiftKey ? 0 : -1; // so the math below lands on last/first correctly
                    }

                    if (e.shiftKey) {
                        idx = (idx - 1 + buttons.length) % buttons.length;
                    } else {
                        idx = (idx + 1) % buttons.length;
                    }

                    buttons[idx].focus();
                } else if (e.key === 'Escape' || e.key === 'Esc') {
                    e.preventDefault();
                    cleanup();
                    resolve('cancel');
                }
            };

            // Use capture so we get the event even if a child stops propagation
            dialog.addEventListener('keydown', onKeyDown, true);
        });
    }
}
