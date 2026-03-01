/**
 * Login Page — Glassmorphism login form with demo account hints
 */

import { login, seedDefaultUsers } from '../services/auth-service.js';

export function renderLoginPage(onLoginSuccess) {
    const page = document.createElement('div');
    page.className = 'login-page';

    page.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo"><img src="/logo.png" alt="OilCalcApp" class="login-logo-img"></div>
                    <h1 class="login-title">OilCalcApp</h1>
                    <p class="login-subtitle">Petroleum Loss Control & Monitoring</p>
                </div>

                <form class="login-form" id="loginForm">
                    <div class="login-field">
                        <label class="login-label">Email</label>
                        <input type="email" class="login-input" id="loginEmail" placeholder="user@rompetrol.com" autocomplete="email" required>
                    </div>
                    <div class="login-field">
                        <label class="login-label">Password</label>
                        <input type="password" class="login-input" id="loginPassword" placeholder="Enter password" autocomplete="current-password" required>
                    </div>
                    <div class="login-error" id="loginError" style="display:none"></div>
                    <button type="submit" class="login-btn" id="loginBtn">
                        <span id="loginBtnText">Sign In</span>
                    </button>
                </form>

                <div class="login-hints">
                    <div class="login-hints-title">Demo Accounts</div>
                    <div class="login-hints-grid">
                        <div class="login-hint" data-email="admin@rompetrol.com" data-pass="admin">
                            <span class="hint-role">👑 Admin</span>
                            <span class="hint-creds">admin / admin</span>
                        </div>
                        <div class="login-hint" data-email="ceo@rompetrol.com" data-pass="ceo">
                            <span class="hint-role">📊 CEO</span>
                            <span class="hint-creds">ceo / ceo</span>
                        </div>
                        <div class="login-hint" data-email="manager@rompetrol.com" data-pass="manager">
                            <span class="hint-role">📋 Manager</span>
                            <span class="hint-creds">manager / manager</span>
                        </div>
                        <div class="login-hint" data-email="qclp@rompetrol.com" data-pass="qclp">
                            <span class="hint-role">🔬 QCLP</span>
                            <span class="hint-creds">qclp / qclp</span>
                        </div>
                        <div class="login-hint" data-email="verifier@rompetrol.com" data-pass="verifier">
                            <span class="hint-role">✅ Verifier</span>
                            <span class="hint-creds">verifier / verifier</span>
                        </div>
                        <div class="login-hint" data-email="operator@rompetrol.com" data-pass="operator">
                            <span class="hint-role">⚙️ Operator</span>
                            <span class="hint-creds">operator / operator</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="login-footer">
                OilCalcApp v2.0 — KMG International
            </div>
        </div>
    `;

    // Seed default users on first load
    seedDefaultUsers();

    setTimeout(() => {
        const form = page.querySelector('#loginForm');
        const emailInput = page.querySelector('#loginEmail');
        const passInput = page.querySelector('#loginPassword');
        const errorEl = page.querySelector('#loginError');
        const btnText = page.querySelector('#loginBtnText');
        const btn = page.querySelector('#loginBtn');

        // Hint click → fill credentials
        page.querySelectorAll('.login-hint').forEach(hint => {
            hint.addEventListener('click', () => {
                emailInput.value = hint.dataset.email;
                passInput.value = hint.dataset.pass;
                // Focus on submit button
                btn.focus();
            });
        });

        // Form submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';
            btn.disabled = true;
            btnText.textContent = 'Signing in...';

            const result = await login(emailInput.value, passInput.value);

            if (result.success) {
                btnText.textContent = '✓ Success';
                setTimeout(() => onLoginSuccess(result.user), 300);
            } else {
                errorEl.textContent = result.error;
                errorEl.style.display = 'block';
                btn.disabled = false;
                btnText.textContent = 'Sign In';
                // Shake animation
                form.classList.add('login-shake');
                setTimeout(() => form.classList.remove('login-shake'), 500);
            }
        });
    }, 50);

    return page;
}
