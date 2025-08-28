/**
 * Certificate Management Frontend
 * Handles certificate generation, listing, downloading, and revocation
 */

class CertificateManager {
    constructor() {
        this.certificates = [];
        this.isLoading = false;
        this.refreshInterval = null;
        
        // DOM elements
        this.elements = {
            certificateForm: document.getElementById('certificateForm'),
            clientNameInput: document.getElementById('clientName'),
            clientNameError: document.getElementById('clientName-error'),
            generateBtn: document.getElementById('generateBtn'),
            refreshBtn: document.getElementById('refreshBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            loadingState: document.getElementById('loadingState'),
            emptyState: document.getElementById('emptyState'),
            certificateTableContainer: document.getElementById('certificateTableContainer'),
            certificateTableBody: document.getElementById('certificateTableBody'),
            notificationContainer: document.getElementById('notificationContainer'),
            modalOverlay: document.getElementById('modalOverlay'),
            modalTitle: document.getElementById('modalTitle'),
            modalMessage: document.getElementById('modalMessage'),
            modalConfirm: document.getElementById('modalConfirm'),
            modalCancel: document.getElementById('modalCancel'),
            modalClose: document.getElementById('modalClose')
        };
        
        this.init();
    }

    /**
     * Initialize the certificate manager
     */
    init() {
        this.setupEventListeners();
        this.loadCertificates();
        this.startAutoRefresh();
        
        // Set focus to client name input
        if (this.elements.clientNameInput) {
            this.elements.clientNameInput.focus();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Certificate form submission
        if (this.elements.certificateForm) {
            this.elements.certificateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCertificateGeneration();
            });
        }

        // Real-time client name validation
        if (this.elements.clientNameInput) {
            this.elements.clientNameInput.addEventListener('input', () => {
                this.validateClientName();
            });
            
            this.elements.clientNameInput.addEventListener('blur', () => {
                this.validateClientName(true);
            });
        }

        // Refresh button
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => {
                this.loadCertificates();
            });
        }

        // Logout button
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Modal event listeners
        if (this.elements.modalCancel) {
            this.elements.modalCancel.addEventListener('click', () => {
                this.hideModal();
            });
        }

        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => {
                this.hideModal();
            });
        }

        // Close modal on overlay click
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.modalOverlay) {
                    this.hideModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key closes modal
            if (e.key === 'Escape' && this.elements.modalOverlay.style.display !== 'none') {
                this.hideModal();
            }
            
            // Ctrl/Cmd + R refreshes certificates
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.loadCertificates();
            }
        });
    }

    /**
     * Validate client name input
     */
    validateClientName(showErrors = false) {
        const clientName = this.elements.clientNameInput.value.trim();
        const errorElement = this.elements.clientNameError;
        
        // Clear previous errors
        errorElement.textContent = '';
        this.elements.clientNameInput.classList.remove('invalid');

        if (!clientName) {
            if (showErrors) {
                errorElement.textContent = 'Client name is required';
                this.elements.clientNameInput.classList.add('invalid');
            }
            return false;
        }

        // Validate format
        const nameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        if (!nameRegex.test(clientName)) {
            if (showErrors) {
                errorElement.textContent = 'Use only letters, numbers, hyphens, and underscores (3-50 characters)';
                this.elements.clientNameInput.classList.add('invalid');
            }
            return false;
        }

        // Check for duplicate names
        const exists = this.certificates.some(cert => cert.name === clientName);
        if (exists) {
            if (showErrors) {
                errorElement.textContent = 'A certificate with this name already exists';
                this.elements.clientNameInput.classList.add('invalid');
            }
            return false;
        }

        return true;
    }

    /**
     * Handle certificate generation
     */
    async handleCertificateGeneration() {
        if (!this.validateClientName(true)) {
            return;
        }

        const clientName = this.elements.clientNameInput.value.trim();
        
        try {
            this.setGenerateButtonLoading(true);
            
            // Get CSRF token from the form
            const csrfTokenElement = document.getElementById('csrfToken');
            const csrfToken = csrfTokenElement?.value || '';
            
            const response = await fetch('/certificates/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    clientName,
                    csrfToken 
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('success', 'Certificate Generated', 
                    `Certificate for "${clientName}" has been generated successfully.`);
                
                // Clear form
                this.elements.clientNameInput.value = '';
                this.elements.clientNameError.textContent = '';
                this.elements.clientNameInput.classList.remove('invalid');
                
                // Refresh certificate list
                await this.loadCertificates();
                
                // Focus back to input
                this.elements.clientNameInput.focus();
                
            } else {
                this.showNotification('error', 'Generation Failed', 
                    result.error || 'Failed to generate certificate');
            }

        } catch (error) {
            console.error('Certificate generation error:', error);
            this.showNotification('error', 'Network Error', 
                'Failed to connect to server. Please try again.');
        } finally {
            this.setGenerateButtonLoading(false);
        }
    }

    /**
     * Load certificates from server
     */
    async loadCertificates() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoadingState();
            
            const response = await fetch('/certificates/list');
            const result = await response.json();

            if (result.success) {
                this.certificates = result.certificates || [];
                this.renderCertificateList();
            } else {
                throw new Error(result.error || 'Failed to load certificates');
            }

        } catch (error) {
            console.error('Failed to load certificates:', error);
            this.showNotification('error', 'Load Failed', 
                'Failed to load certificate list. Please refresh the page.');
            this.showEmptyState();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.elements.loadingState.style.display = 'block';
        this.elements.emptyState.style.display = 'none';
        this.elements.certificateTableContainer.style.display = 'none';
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.loadingState.style.display = 'none';
        this.elements.emptyState.style.display = 'block';
        this.elements.certificateTableContainer.style.display = 'none';
    }

    /**
     * Render certificate list
     */
    renderCertificateList() {
        this.elements.loadingState.style.display = 'none';
        
        if (this.certificates.length === 0) {
            this.showEmptyState();
            return;
        }

        this.elements.emptyState.style.display = 'none';
        this.elements.certificateTableContainer.style.display = 'block';

        const tbody = this.elements.certificateTableBody;
        tbody.innerHTML = '';

        this.certificates.forEach(cert => {
            const row = this.createCertificateRow(cert);
            tbody.appendChild(row);
        });

        // Add event listeners for revoke buttons
        const revokeButtons = tbody.querySelectorAll('.cert-action-btn.revoke');
        revokeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const certName = e.target.getAttribute('data-cert-name');
                this.confirmRevokeCertificate(certName);
            });
        });
    }

    /**
     * Create certificate table row
     */
    createCertificateRow(cert) {
        const row = document.createElement('tr');
        
        // Format dates
        const createdDate = this.formatDate(cert.createdAt);
        const expiresDate = cert.expiresAt ? this.formatDate(cert.expiresAt) : 'Unknown';
        const isExpired = cert.expiresAt && new Date(cert.expiresAt) < new Date();
        const expiresSoon = cert.expiresAt && 
            new Date(cert.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        row.innerHTML = `
            <td>
                <strong>${this.escapeHtml(cert.name)}</strong>
                ${cert.serialNumber && cert.serialNumber !== 'unknown' ? 
                    `<br><small class="cert-serial">Serial: ${this.escapeHtml(cert.serialNumber)}</small>` : ''}
            </td>
            <td>
                <span class="cert-status ${cert.status}">
                    ${cert.status}
                </span>
            </td>
            <td>
                <div class="cert-date">${createdDate}</div>
                ${cert.createdBy && cert.createdBy !== 'unknown' ? 
                    `<small>by ${this.escapeHtml(cert.createdBy)}</small>` : ''}
            </td>
            <td>
                <div class="cert-date ${isExpired ? 'expired' : expiresSoon ? 'expires-soon' : ''}">
                    ${expiresDate}
                </div>
            </td>
            <td>
                <div class="cert-actions">
                    ${cert.status === 'active' ? `
                        <a href="/certificates/download/${encodeURIComponent(cert.name)}" 
                           class="cert-action-btn download" 
                           title="Download certificate">
                            📥 Download
                        </a>
                        <button type="button" 
                                class="cert-action-btn revoke" 
                                data-cert-name="${this.escapeHtml(cert.name)}"
                                title="Revoke certificate">
                            🚫 Revoke
                        </button>
                    ` : `
                        <span class="cert-action-btn" style="opacity: 0.5; cursor: not-allowed;">
                            Certificate ${cert.status}
                        </span>
                    `}
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Confirm certificate revocation
     */
    confirmRevokeCertificate(certName) {
        this.showModal(
            'Revoke Certificate',
            `Are you sure you want to revoke the certificate "${certName}"? This action cannot be undone and will immediately block VPN access for this client.`,
            () => this.revokeCertificate(certName)
        );
    }

    /**
     * Revoke certificate
     */
    async revokeCertificate(certName) {
        try {
            this.hideModal();
            
            // Get CSRF token from the form
            const csrfTokenElement = document.getElementById('csrfToken');
            const csrfToken = csrfTokenElement?.value || '';
            
            const response = await fetch(`/certificates/revoke/${encodeURIComponent(certName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ csrfToken })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('success', 'Certificate Revoked', 
                    `Certificate "${certName}" has been revoked successfully.`);
                
                // Refresh certificate list
                await this.loadCertificates();
            } else {
                this.showNotification('error', 'Revocation Failed', 
                    result.error || 'Failed to revoke certificate');
            }

        } catch (error) {
            console.error('Certificate revocation error:', error);
            this.showNotification('error', 'Network Error', 
                'Failed to connect to server. Please try again.');
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            // Get CSRF token from the form
            const csrfTokenElement = document.getElementById('csrfToken');
            const csrfToken = csrfTokenElement?.value || '';
            
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ csrfToken })
            });

            // Redirect to login page regardless of response
            window.location.href = '/login';

        } catch (error) {
            console.error('Logout error:', error);
            // Still redirect on error
            window.location.href = '/login';
        }
    }

    /**
     * Set generate button loading state
     */
    setGenerateButtonLoading(loading) {
        const btn = this.elements.generateBtn;
        const btnText = btn.querySelector('.btn-text');
        const btnSpinner = btn.querySelector('.btn-spinner');

        if (loading) {
            btn.disabled = true;
            btn.classList.add('loading');
            btnText.textContent = 'Generating...';
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            btnText.textContent = 'Generate Certificate';
        }
    }

    /**
     * Show notification
     */
    showNotification(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">${this.escapeHtml(title)}</div>
                <button type="button" class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <p class="notification-message">${this.escapeHtml(message)}</p>
        `;

        this.elements.notificationContainer.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Show modal
     */
    showModal(title, message, onConfirm) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalMessage.textContent = message;
        this.elements.modalOverlay.style.display = 'flex';

        // Remove previous event listeners
        const newConfirmBtn = this.elements.modalConfirm.cloneNode(true);
        this.elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirm);
        this.elements.modalConfirm = newConfirmBtn;

        // Add new event listener
        this.elements.modalConfirm.addEventListener('click', onConfirm);
    }

    /**
     * Hide modal
     */
    hideModal() {
        this.elements.modalOverlay.style.display = 'none';
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.loadCertificates();
            }
        }, 30000);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup when page unloads
     */
    destroy() {
        this.stopAutoRefresh();
    }
}

// Initialize certificate manager when DOM is loaded
let certificateManager;

document.addEventListener('DOMContentLoaded', () => {
    certificateManager = new CertificateManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (certificateManager) {
        certificateManager.destroy();
    }
});

// Handle visibility change to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
    if (certificateManager) {
        if (document.hidden) {
            certificateManager.stopAutoRefresh();
        } else {
            certificateManager.startAutoRefresh();
        }
    }
});