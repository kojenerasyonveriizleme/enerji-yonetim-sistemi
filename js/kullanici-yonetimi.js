document.addEventListener('DOMContentLoaded', function() {
    // localStorage'daki gerçek kullanıcı verileri
    const realUsers = [
        {
            id: 1771831539045,
            firstName: 'İBRAHİM OGÜN',
            lastName: 'ŞAHİN',
            email: 'ogun_sahin',
            role: 'operator',
            status: 'active',
            createdAt: '01.01.2024'
        },
        {
            id: 1771831665826,
            firstName: 'OGUZHAN',
            lastName: 'YAYLALI',
            email: 'oguzhan_yaylalı',
            role: 'operator',
            status: 'active',
            createdAt: '01.01.2024'
        },
        {
            id: 1771831695619,
            firstName: 'ALTAN',
            lastName: 'HUNOĞLU',
            email: 'altan_hunoğlu',
            role: 'operator',
            status: 'active',
            createdAt: '01.01.2024'
        },
        {
            id: 1771831749332,
            firstName: 'MURAT',
            lastName: 'COŞKUN',
            email: 'murat_coskun',
            role: 'admin',
            status: 'active',
            createdAt: '01.01.2024'
        },
        {
            id: 1773382635961,
            firstName: 'KADİR',
            lastName: 'KORKMAZ',
            email: 'kadir_korkmaz',
            role: 'admin',
            status: 'active',
            createdAt: '01.01.2024'
        },
        {
            id: 1774245338572,
            firstName: 'ADMİN',
            lastName: '',
            email: 'admin_admin',
            role: 'admin',
            status: 'active',
            createdAt: '01.01.2024'
        },
        {
            id: 9999999999,
            firstName: 'YAKUP',
            lastName: 'CAN CİN',
            email: 'yakup@sistem.com',
            role: 'operator',
            status: 'active',
            createdAt: '25.03.2026'
        }
    ];

    let users = realUsers;

    let currentEditUserId = null;
    let currentPage = 1;
    const itemsPerPage = 10;

    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const deleteModal = document.getElementById('deleteModal');
    const userForm = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    const sidebarLogout = document.getElementById('sidebarLogout');
    const headerLogout = document.getElementById('headerLogout');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    const closeButtons = document.querySelectorAll('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    addUserBtn.addEventListener('click', openAddUserModal);
    sidebarLogout.addEventListener('click', handleLogout);
    headerLogout.addEventListener('click', handleLogout);
    searchInput.addEventListener('input', filterUsers);
    roleFilter.addEventListener('change', filterUsers);
    statusFilter.addEventListener('change', filterUsers);
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));

    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    cancelBtn.addEventListener('click', () => closeModal(userModal));
    cancelDeleteBtn.addEventListener('click', () => closeModal(deleteModal));
    confirmDeleteBtn.addEventListener('click', confirmDelete);

    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    userForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveUser();
    });

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit')) {
            const userId = parseInt(e.target.getAttribute('data-user-id'));
            openEditUserModal(userId);
        } else if (e.target.classList.contains('delete')) {
            const userId = parseInt(e.target.getAttribute('data-user-id'));
            openDeleteModal(userId);
        }
    });

    function openAddUserModal() {
        currentEditUserId = null;
        modalTitle.textContent = 'Yeni Kullanıcı Ekle';
        userForm.reset();
        document.getElementById('password').required = true;
        openModal(userModal);
    }

    function openEditUserModal(userId) {
        currentEditUserId = userId;
        const user = users.find(u => u.id === userId);
        
        if (user) {
            modalTitle.textContent = 'Kullanıcı Düzenle';
            document.getElementById('firstName').value = user.firstName;
            document.getElementById('lastName').value = user.lastName;
            document.getElementById('email').value = user.email;
            document.getElementById('role').value = user.role;
            document.getElementById('status').value = user.status;
            document.getElementById('password').required = false;
            document.getElementById('password').value = '';
            openModal(userModal);
        }
    }

    function openDeleteModal(userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            document.getElementById('deleteUserInfo').innerHTML = 
                `<strong>${user.firstName} ${user.lastName}</strong><br>E-posta: ${user.email}`;
            document.getElementById('confirmDeleteBtn').setAttribute('data-user-id', userId);
            openModal(deleteModal);
        }
    }

    function confirmDelete() {
        const userId = parseInt(document.getElementById('confirmDeleteBtn').getAttribute('data-user-id'));
        
        if (userId === 1) {
            showNotification('Admin kullanıcısı silinemez!', 'error');
            return;
        }

        users = users.filter(u => u.id !== userId);
        renderUsers();
        closeModal(deleteModal);
        showNotification('Kullanıcı başarıyla silindi.', 'success');
    }

    function saveUser() {
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            role: document.getElementById('role').value,
            status: document.getElementById('status').value
        };

        if (!validateUserForm(formData)) {
            return;
        }

        if (currentEditUserId) {
            const userIndex = users.findIndex(u => u.id === currentEditUserId);
            if (userIndex !== -1) {
                users[userIndex] = {
                    ...users[userIndex],
                    ...formData
                };
                showNotification('Kullanıcı başarıyla güncellendi.', 'success');
            }
        } else {
            const newUser = {
                id: Math.max(...users.map(u => u.id)) + 1,
                ...formData,
                createdAt: new Date().toLocaleDateString('tr-TR')
            };
            users.push(newUser);
            showNotification('Kullanıcı başarıyla eklendi.', 'success');
        }

        renderUsers();
        closeModal(userModal);
        userForm.reset();
    }

    function validateUserForm(data) {
        if (!data.firstName.trim()) {
            showNotification('Ad boş bırakılamaz.', 'error');
            return false;
        }

        if (!data.lastName.trim()) {
            showNotification('Soyad boş bırakılamaz.', 'error');
            return false;
        }

        if (!validateEmail(data.email)) {
            showNotification('Geçerli bir e-posta adresi girin.', 'error');
            return false;
        }

        const existingUser = users.find(u => 
            u.email === data.email && u.id !== currentEditUserId
        );

        if (existingUser) {
            showNotification('Bu e-posta adresi zaten kullanılıyor.', 'error');
            return false;
        }

        if (!currentEditUserId && data.password.length < 6) {
            showNotification('Şifre en az 6 karakter olmalıdır.', 'error');
            return false;
        }

        return true;
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function filterUsers() {
        currentPage = 1;
        renderUsers();
    }

    function getFilteredUsers() {
        let filtered = [...users];

        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(user => 
                user.firstName.toLowerCase().includes(searchTerm) ||
                user.lastName.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm)
            );
        }

        const roleValue = roleFilter.value;
        if (roleValue) {
            filtered = filtered.filter(user => user.role === roleValue);
        }

        const statusValue = statusFilter.value;
        if (statusValue) {
            filtered = filtered.filter(user => user.status === statusValue);
        }

        return filtered;
    }

    function renderUsers() {
        const filteredUsers = getFilteredUsers();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        paginatedUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td><span class="role-badge ${user.role}">${user.role === 'admin' ? 'Admin' : 'Operator'}</span></td>
                <td><span class="status-badge ${user.status}">${user.status === 'active' ? 'Aktif' : 'Pasif'}</span></td>
                <td>${user.createdAt}</td>
                <td>
                    <button class="action-btn edit" data-user-id="${user.id}">Düzenle</button>
                    <button class="action-btn delete" data-user-id="${user.id}">Sil</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        updatePagination(filteredUsers.length);
    }

    function updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const pageInfo = document.querySelector('.page-info');
        
        pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages || 1}`;
        
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    function changePage(direction) {
        const filteredUsers = getFilteredUsers();
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        
        const newPage = currentPage + direction;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderUsers();
        }
    }

    function handleLogout() {
        if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
            localStorage.removeItem('rememberedEmail');
            window.location.href = 'giris.html';
        }
    }

    function goToHomePage() {
        window.location.href = 'anasayfa.html';
    }

    function openModal(modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;

        if (type === 'error') {
            notification.style.background = '#e53e3e';
        } else if (type === 'success') {
            notification.style.background = '#38a169';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    renderUsers();
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
