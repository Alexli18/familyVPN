/**
 * Login page JavaScript functionality
 * Handles form validation, submission, and user feedback
 */

class LoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.formMessage = document.getElementById('formMessage');

        this.isSubmitting = false;

        this.init();
    }

    init() {
        if (!this.form) {
            console.error('Login form not found');
            return;
        }

        this.bindEvents();
        this.setupValidation();
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        this.usernameInput.addEventListener('input', () => this.validateUsername());
        this.usernameInput.addEventListener('blur', () => this.validateUsername());

        this.passwordInput.addEventListener('input', () => this.validatePassword());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());

        // Clear messages on input
        this.usernameInput.addEventListener('input', () => this.clearFormMessage());
        this.passwordInput.addEventListener('input', () => this.clearFormMessage());

        // Handle Enter key
        this.form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.isSubmitting) {
                e.preventDefault();
                this.handleSubmit(e);
            }
        });
    }

    setupValidation() {
        // Set up initial validation state
        this.validateUsername();
        this.validatePassword();
    }

    validateUsername() {
        const username = this.usernameInput.value.trim();
        const errorElement = document.getElementById('username-error');

        if (!username) {
            this.showFieldError(errorElement, 'Username is required');
            return false;
        }

        if (username.length < 3) {
            this.showFieldError(errorElement, 'Username must be at least 3 characters');
            return false;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            this.showFieldError(errorElement, 'Username can only contain letters, numbers, hyphens, and underscores');
            return false;
        }

        this.clearFieldError(errorElement);
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;
        const errorElement = document.getElementById('password-error');

        if (!password) {
            this.showFieldError(errorElement, 'Password is required');
            return false;
        }

        if (password.length < 6) {
            this.showFieldError(errorElement, 'Password must be at least 6 characters');
            return false;
        }

        this.clearFieldError(errorElement);
        return true;
    }

    showFieldError(errorElement, message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearFieldError(errorElement) {
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    validateForm() {
        const isUsernameValid = this.validateUsername();
        const isPasswordValid = this.validatePassword();

        return isUsernameValid && isPasswordValid;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) {
            return;
        }

        // Clear any existing messages
        this.clearFormMessage();

        // Validate form
        if (!this.validateForm()) {
            this.showFormMessage('Please fix the errors above', 'error');
            return;
        }

        // Start loading state
        this.setLoadingState(true);

        try {
            const formData = new FormData(this.form);

            const credentials = {
                username: this.usernameInput.value.trim(),
                password: this.passwordInput.value
            };

            const response = await this.submitLogin(credentials);

            if (response.success) {
                this.showFormMessage('Login successful! Redirecting...', 'success');

                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = response.redirectUrl || '/certificates';
                }, 1000);
            } else {
                this.showFormMessage(response.message || 'Login failed. Please try again.', 'error');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showFormMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async submitLogin(credentials) {
        // Get CSRF token from the form
        const csrfTokenElement = document.getElementById('csrfToken');
        const csrfToken = csrfTokenElement?.value || '';

        // Create URL-encoded form data
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        formData.append('csrfToken', csrfToken);

        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            credentials: 'same-origin'
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Too many login attempts. Please try again later.');
            } else if (response.status === 401) {
                return { success: false, message: 'Invalid username or password' };
            } else if (response.status === 403) {
                throw new Error('Security error. Please refresh the page and try again.');
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }

        // Handle redirect response (302)
        if (response.redirected || response.status === 302) {
            return {
                success: true,
                message: 'Login successful!',
                redirectUrl: response.url || '/certificates'
            };
        }

        // Try to parse JSON response
        try {
            const data = await response.json();
            return data;
        } catch (e) {
            // If not JSON, assume success if status is ok
            return {
                success: true,
                message: 'Login successful!',
                redirectUrl: '/certificates'
            };
        }
    }

    setLoadingState(loading) {
        this.isSubmitting = loading;

        if (loading) {
            this.loginBtn.disabled = true;
            this.loginBtn.classList.add('loading');
            this.usernameInput.disabled = true;
            this.passwordInput.disabled = true;
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.classList.remove('loading');
            this.usernameInput.disabled = false;
            this.passwordInput.disabled = false;
        }
    }

    showFormMessage(message, type) {
        this.formMessage.textContent = message;
        this.formMessage.className = `form-message ${type}`;
        this.formMessage.style.display = 'block';

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                this.clearFormMessage();
            }, 3000);
        }
    }

    clearFormMessage() {
        this.formMessage.textContent = '';
        this.formMessage.className = 'form-message';
        this.formMessage.style.display = 'none';
    }
}

// Utility functions for responsive design testing
const ResponsiveUtils = {
    // Test different viewport sizes
    testViewports: [
        { name: 'Mobile Portrait', width: 375, height: 667 },
        { name: 'Mobile Landscape', width: 667, height: 375 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Tablet Landscape', width: 1024, height: 768 },
        { name: 'Desktop', width: 1200, height: 800 }
    ],

    getCurrentViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    },

    logViewportInfo() {
        const viewport = this.getCurrentViewport();
        console.log(`Current viewport: ${viewport.width}x${viewport.height}`);

        // Determine breakpoint
        let breakpoint = 'mobile';
        if (viewport.width >= 1024) breakpoint = 'desktop';
        else if (viewport.width >= 768) breakpoint = 'tablet';

        console.log(`Current breakpoint: ${breakpoint}`);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('Login page JavaScript loaded');

    // Initialize login form
    const loginForm = new LoginForm();

    // Log viewport information for debugging
    ResponsiveUtils.logViewportInfo();

    // Listen for viewport changes
    window.addEventListener('resize', () => {
        ResponsiveUtils.logViewportInfo();
    });

    // Handle browser back button
    window.addEventListener('popstate', function (e) {
        // Clear any loading states if user navigates back
        if (loginForm) {
            loginForm.setLoadingState(false);
        }
    });

    // Focus username field on load
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
});