// StatusMessage.js - Handles status message display
class StatusMessage {
    constructor(message, type = 'info') {
        this.message = message;
        this.type = type;
        this.statusMsg = document.getElementById('status-message');
        if (!this.statusMsg) {
            this.statusMsg = document.createElement('div');
            this.statusMsg.id = 'status-message';
            this.statusMsg.className = 'status-message';
            document.body.appendChild(this.statusMsg);
        }
    }

    show() {
        this.statusMsg.setAttribute('data-status-type', this.type);
        this.statusMsg.textContent = this.message;
        this.statusMsg.style.opacity = '1';
        this.statusMsg.style.transform = 'translateX(0)';
        clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(() => {
            this.statusMsg.style.opacity = '0';
            this.statusMsg.style.transform = 'translateX(100%)';
        }, 3000);
    }
}
