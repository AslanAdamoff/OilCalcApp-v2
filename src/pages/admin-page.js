/**
 * Admin Page — User Management (admin role only)
 * List, create, and delete users from Firestore
 */

import { getAllUsers, createUser, deleteUser, updateUserRole, ROLES, getCurrentUser } from '../services/auth-service.js';

export function renderAdminPage() {
    const page = document.createElement('div');
    page.className = 'page admin-page';

    page.innerHTML = `
        <h1 class="page-title">User Management</h1>

        <!-- Add User Form -->
        <div class="card admin-form-card">
            <h3 class="admin-section-title">Add New User</h3>
            <form id="addUserForm" class="admin-form">
                <div class="admin-form-row">
                    <div class="admin-field">
                        <label class="filter-label">Name</label>
                        <input type="text" class="field-input" id="newUserName" placeholder="Full Name" required>
                    </div>
                    <div class="admin-field">
                        <label class="filter-label">Email</label>
                        <input type="email" class="field-input" id="newUserEmail" placeholder="user@rompetrol.com" required>
                    </div>
                </div>
                <div class="admin-form-row">
                    <div class="admin-field">
                        <label class="filter-label">Password</label>
                        <input type="text" class="field-input" id="newUserPassword" placeholder="Password" required>
                    </div>
                    <div class="admin-field">
                        <label class="filter-label">Role</label>
                        <select class="field-input field-select" id="newUserRole">
                            ${Object.entries(ROLES).map(([key, r]) => `<option value="${key}">${r.label}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button type="submit" class="admin-add-btn" id="addUserBtn">+ Add User</button>
                <div class="admin-msg" id="addUserMsg" style="display:none"></div>
            </form>
        </div>

        <!-- Users List -->
        <div class="widget">
            <div class="widget-header">
                <h3 class="widget-title">👥 Registered Users</h3>
                <span class="alert-badge" id="userCount">0</span>
            </div>
            <div class="widget-body" id="usersList">
                <div class="chart-empty" style="padding:var(--spacing-lg)">Loading users...</div>
            </div>
        </div>
    `;

    setTimeout(() => {
        loadUsers(page);
        setupAddForm(page);
    }, 50);

    return page;
}

async function loadUsers(page) {
    const container = page.querySelector('#usersList');
    const countBadge = page.querySelector('#userCount');
    const currentUser = getCurrentUser();

    const users = await getAllUsers();

    if (countBadge) {
        countBadge.textContent = String(users.length);
        countBadge.style.display = 'inline-flex';
    }

    if (users.length === 0) {
        container.innerHTML = `
            <div class="chart-empty" style="padding:var(--spacing-lg)">
                <div style="font-size:2rem;margin-bottom:8px">👥</div>
                <div>No users found</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="admin-users-table">
            <div class="admin-users-header">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Actions</span>
            </div>
            ${users.map(u => {
        const role = ROLES[u.role] || { label: u.role };
        const isCurrentUser = u.email === currentUser?.email;
        return `
                    <div class="admin-users-row ${isCurrentUser ? 'admin-current-user' : ''}">
                        <span class="admin-user-name">${u.name || u.email}</span>
                        <span class="admin-user-email">${u.email}</span>
                        <span class="admin-user-role">
                            <select class="field-input field-select admin-role-select" data-email="${u.email}" ${isCurrentUser ? 'disabled' : ''}>
                                ${Object.entries(ROLES).map(([key, r]) => `<option value="${key}" ${key === u.role ? 'selected' : ''}>${r.label}</option>`).join('')}
                            </select>
                        </span>
                        <span class="admin-user-actions">
                            ${isCurrentUser
                ? '<span class="admin-you-badge">You</span>'
                : `<button class="admin-delete-btn" data-email="${u.email}" title="Delete user">🗑️</button>`
            }
                        </span>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    // Role change handlers
    container.querySelectorAll('.admin-role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const email = e.target.dataset.email;
            const newRole = e.target.value;
            const result = await updateUserRole(email, newRole);
            if (!result.success) {
                alert('Failed to update role: ' + result.error);
                loadUsers(page); // Refresh
            }
        });
    });

    // Delete handlers
    container.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = btn.dataset.email;
            if (!confirm(`Delete user ${email}?`)) return;
            const result = await deleteUser(email);
            if (result.success) {
                loadUsers(page);
            } else {
                alert('Failed: ' + result.error);
            }
        });
    });
}

function setupAddForm(page) {
    const form = page.querySelector('#addUserForm');
    const msg = page.querySelector('#addUserMsg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = page.querySelector('#newUserName').value.trim();
        const email = page.querySelector('#newUserEmail').value.trim();
        const password = page.querySelector('#newUserPassword').value;
        const role = page.querySelector('#newUserRole').value;

        if (!name || !email || !password) return;

        const btn = page.querySelector('#addUserBtn');
        btn.disabled = true;
        btn.textContent = 'Adding...';

        const result = await createUser(email, password, role, name);

        if (result.success) {
            msg.textContent = `✅ User ${email} created`;
            msg.className = 'admin-msg admin-msg-ok';
            msg.style.display = 'block';
            form.reset();
            loadUsers(page);
        } else {
            msg.textContent = `❌ ${result.error}`;
            msg.className = 'admin-msg admin-msg-err';
            msg.style.display = 'block';
        }

        btn.disabled = false;
        btn.textContent = '+ Add User';
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
    });
}
