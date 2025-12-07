class ToolManagementSystem {
    constructor() {
        this.apiUrl = window.location.origin + '/api';
        this.currentUser = null;
        this.currentTab = 'tools';
        this.storageLocations = [];
        this.users = [];
        this.tools = [];
        this.init();
    }

    async init() {
        this.checkAuth();
    }

    showMessage(text, type = 'success') {
        const messageDiv = document.getElementById('message');
        if (!messageDiv) return;

        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';

        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, type === 'error' ? 10000 : 5000);
    }

    showLoading(text = 'Загрузка...') {
        this.showMessage(text, 'loading');
    }

    async request(endpoint, method = 'GET', data = null, rawResponse = false) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.currentUser?.token ? `Bearer ${this.currentUser.token}` : ''
            },
            credentials: 'include'
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.apiUrl}/${endpoint}`, options);

            if (response.status === 401) {
                this.logout();
                throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Ошибка ${response.status}: ${response.statusText}`;

                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData.title || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            if (rawResponse) return response;

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return await response.text();
        } catch (error) {
            console.error('Request error:', error);
            this.showMessage(`Ошибка: ${error.message}`, 'error');
            throw error;
        }
    }

    async login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            this.showMessage('Введите логин и пароль', 'error');
            return;
        }

        this.showLoading('Вход в систему...');

        try {
            const response = await this.request('auth/login', 'POST', {
                username,
                password
            });

            this.currentUser = {
                id: response.userId,
                username: response.username,
                role: response.role,
                fullName: response.fullName,
                token: response.token
            };

            localStorage.setItem('user', JSON.stringify(this.currentUser));
            this.showAuthUI();
            this.showMessage(`Добро пожаловать, ${response.fullName}!`);
            await this.loadInitialData();
            this.loadTabContent(this.currentTab);
        } catch (error) {
            console.error('Login error:', error);
        }
    }

    async loadInitialData() {
        try {
            // Загружаем места хранения и пользователей для форм
            if (['Admin', 'Storekeeper'].includes(this.currentUser.role)) {
                this.storageLocations = await this.request('storagelocations');
                this.users = await this.request('users');
            }
        } catch (error) {
            console.warn('Failed to load initial data:', error);
        }
    }

    logout() {
        localStorage.removeItem('user');
        this.currentUser = null;
        this.showAuthUI();
        this.showMessage('Вы вышли из системы');
    }

    checkAuth() {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showAuthUI();
                this.loadInitialData().then(() => {
                    this.loadTabContent(this.currentTab);
                });
            } catch (error) {
                localStorage.removeItem('user');
                console.error('Error parsing saved user:', error);
            }
        }
    }

    showAuthUI() {
        const authSection = document.getElementById('authSection');
        const dashboard = document.getElementById('dashboard');

        if (this.currentUser) {
            authSection.style.display = 'none';
            dashboard.style.display = 'block';

            document.getElementById('userWelcome').textContent =
                `Добро пожаловать, ${this.currentUser.fullName}!`;
            document.getElementById('userRole').textContent =
                `Роль: ${this.getRoleName(this.currentUser.role)}`;

            this.loadTabs();
        } else {
            authSection.style.display = 'block';
            dashboard.style.display = 'none';
        }
    }

    getRoleName(role) {
        const roles = {
            'Admin': 'Администратор',
            'Storekeeper': 'Кладовщик',
            'Worker': 'Рабочий'
        };
        return roles[role] || role;
    }

    loadTabs() {
        const navTabs = document.getElementById('navTabs');
        navTabs.innerHTML = '';

        const tabs = [
            { id: 'tools', name: '🔧 Инструменты', icon: '🔧', roles: ['Admin', 'Storekeeper', 'Worker'] },
            { id: 'storage', name: '🏪 Места хранения', icon: '🏪', roles: ['Admin', 'Storekeeper'] },
            { id: 'operations', name: '🔄 Операции', icon: '🔄', roles: ['Admin', 'Storekeeper'] },
            { id: 'users', name: '👥 Пользователи', icon: '👥', roles: ['Admin'] },
            { id: 'transactions', name: '📋 Транзакции', icon: '📋', roles: ['Admin', 'Storekeeper'] },
            { id: 'myTools', name: '🛠 Мои инструменты', icon: '🛠', roles: ['Worker'] },
            { id: 'stats', name: '📊 Статистика', icon: '📊', roles: ['Admin', 'Storekeeper'] }
        ];

        tabs.forEach(tab => {
            if (tab.roles.includes(this.currentUser?.role)) {
                const button = document.createElement('button');
                button.className = `tab-btn ${this.currentTab === tab.id ? 'active' : ''}`;
                button.innerHTML = `${tab.icon} ${tab.name}`;
                button.onclick = () => this.switchTab(tab.id);
                navTabs.appendChild(button);
            }
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;

        // Обновляем активные кнопки
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        event.target.classList.add('active');

        this.loadTabContent(tabId);
    }

    async loadTabContent(tabId) {
        const tabContent = document.getElementById('tabContent');
        tabContent.innerHTML = '<div class="loading">Загрузка...</div>';

        try {
            switch (tabId) {
                case 'tools':
                    await this.loadTools();
                    break;
                case 'storage':
                    await this.loadStorage();
                    break;
                case 'operations':
                    await this.loadOperations();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
                case 'transactions':
                    await this.loadTransactions();
                    break;
                case 'myTools':
                    await this.loadMyTools();
                    break;
                case 'stats':
                    await this.loadStats();
                    break;
                default:
                    await this.loadTools();
            }
        } catch (error) {
            tabContent.innerHTML = `<div class="error">Ошибка загрузки: ${error.message}</div>`;
        }
    }

    // ========== ИНСТРУМЕНТЫ ==========
    async loadTools() {
        try {
            this.tools = await this.request('tools');

            const html = `
                <div class="action-buttons">
                    <button onclick="app.showCreateToolModal()">➕ Добавить инструмент</button>
                    <button onclick="app.showReceiveToolModal()" class="secondary">📥 Приёмка инструмента</button>
                    <div style="flex: 1;"></div>
                    <input type="text" id="searchTool" placeholder="Поиск по артикулу или названию..." 
                           onkeyup="app.searchTools(event)" style="max-width: 300px;">
                </div>
                
                <div class="cards-grid">
                    <div class="card">
                        <h3>Всего инструментов</h3>
                        <div class="stats">${this.tools.length}</div>
                    </div>
                    <div class="card">
                        <h3>На складе</h3>
                        <div class="stats">${this.tools.filter(t => t.storageLocationType === 'Склад').length}</div>
                    </div>
                    <div class="card">
                        <h3>В цехах</h3>
                        <div class="stats">${this.tools.filter(t => t.storageLocationType === 'Цех').length}</div>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Артикул</th>
                                <th>Наименование</th>
                                <th>Описание</th>
                                <th>Место хранения</th>
                                <th>Тип места</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="toolsTableBody">
                            ${this.tools.map(tool => `
                                <tr>
                                    <td>${tool.id}</td>
                                    <td><strong>${tool.article}</strong></td>
                                    <td>${tool.name}</td>
                                    <td>${tool.description || '-'}</td>
                                    <td>${tool.storageLocationName}</td>
                                    <td><span class="badge badge-info">${tool.storageLocationType}</span></td>
                                    <td>
                                        <div class="tool-actions">
                                            <button onclick="app.editTool(${tool.id})" title="Редактировать">✏️</button>
                                            ${this.currentUser.role !== 'Worker' ?
                    `<button onclick="app.showIssueToolModal(${tool.id})" title="Выдать">📤</button>
                                                 <button onclick="app.showWriteOffModal(${tool.id})" class="danger" title="Списать">🗑</button>`
                    : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('tabContent').innerHTML = html;
        } catch (error) {
            document.getElementById('tabContent').innerHTML =
                `<div class="error">Ошибка загрузки инструментов: ${error.message}</div>`;
        }
    }

    searchTools(event) {
        if (event.key === 'Enter') {
            const searchTerm = event.target.value.toLowerCase();
            const rows = document.querySelectorAll('#toolsTableBody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }
    }

    showCreateToolModal() {
        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>➕ Добавить новый инструмент</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    <div class="form-group">
                        <label>Артикул *:</label>
                        <input type="text" id="newToolArticle" placeholder="Например: HAM-001" required>
                    </div>
                    <div class="form-group">
                        <label>Наименование *:</label>
                        <input type="text" id="newToolName" placeholder="Например: Молоток слесарный" required>
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea id="newToolDescription" placeholder="Описание инструмента, характеристики..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Место хранения *:</label>
                        <select id="newToolLocation" required>
                            <option value="">Выберите место хранения</option>
                            ${this.storageLocations.map(loc =>
            `<option value="${loc.id}">${loc.name} (${loc.type})</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button onclick="app.createTool()">Создать</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;
    }

    async createTool() {
        const article = document.getElementById('newToolArticle').value.trim();
        const name = document.getElementById('newToolName').value.trim();
        const description = document.getElementById('newToolDescription').value.trim();
        const locationId = document.getElementById('newToolLocation').value;

        if (!article || !name || !locationId) {
            this.showModalMessage('Заполните все обязательные поля', 'error');
            return;
        }

        try {
            await this.request('tools', 'POST', {
                article,
                name,
                description,
                storageLocationId: parseInt(locationId)
            });

            this.showMessage('Инструмент успешно создан');
            this.closeModal();
            await this.loadTools();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    async editTool(toolId) {
        try {
            const tool = await this.request(`tools/${toolId}`);

            const modalHtml = `
                <div class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>✏️ Редактировать инструмент</h3>
                            <button class="close-modal" onclick="app.closeModal()">×</button>
                        </div>
                        <div id="modalMessage" class="message"></div>
                        <div class="form-group">
                            <label>Артикул:</label>
                            <input type="text" id="editToolArticle" value="${tool.article}" required>
                        </div>
                        <div class="form-group">
                            <label>Наименование:</label>
                            <input type="text" id="editToolName" value="${tool.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Описание:</label>
                            <textarea id="editToolDescription">${tool.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Место хранения:</label>
                            <select id="editToolLocation">
                                ${this.storageLocations.map(loc =>
                `<option value="${loc.id}" ${loc.id === tool.storageLocationId ? 'selected' : ''}>
                                        ${loc.name} (${loc.type})
                                    </option>`
            ).join('')}
                            </select>
                        </div>
                        <div class="form-actions">
                            <button onclick="app.updateTool(${toolId})">Сохранить</button>
                            <button onclick="app.closeModal()" class="secondary">Отмена</button>
                            <button onclick="app.deleteTool(${toolId})" class="danger" style="margin-left: auto;">Удалить</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalContainer').innerHTML = modalHtml;
        } catch (error) {
            this.showMessage(`Ошибка загрузки инструмента: ${error.message}`, 'error');
        }
    }

    async updateTool(toolId) {
        const article = document.getElementById('editToolArticle').value.trim();
        const name = document.getElementById('editToolName').value.trim();
        const description = document.getElementById('editToolDescription').value.trim();
        const locationId = document.getElementById('editToolLocation').value;

        if (!article || !name) {
            this.showModalMessage('Заполните обязательные поля', 'error');
            return;
        }

        try {
            await this.request(`tools/${toolId}`, 'PUT', {
                article,
                name,
                description,
                storageLocationId: parseInt(locationId)
            });

            this.showMessage('Инструмент обновлен');
            this.closeModal();
            await this.loadTools();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    async deleteTool(toolId) {
        if (!confirm('Вы уверены, что хотите удалить этот инструмент?')) return;

        try {
            await this.request(`tools/${toolId}`, 'DELETE');
            this.showMessage('Инструмент удален');
            this.closeModal();
            await this.loadTools();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    // ========== МЕСТА ХРАНЕНИЯ ==========
    async loadStorage() {
        try {
            const locations = await this.request('storagelocations');

            const html = `
                <div class="action-buttons">
                    <button onclick="app.showCreateStorageModal()">🏪 Добавить место хранения</button>
                </div>
                
                <div class="cards-grid">
                    ${locations.map(loc => `
                        <div class="card">
                            <h3>${loc.name}</h3>
                            <p><strong>Тип:</strong> ${loc.type}</p>
                            <p><strong>Адрес:</strong> ${loc.address || 'Не указан'}</p>
                            <p><strong>Инструментов:</strong> <span class="stats">${loc.toolsCount || 0}</span></p>
                            <div style="margin-top: 15px;">
                                <button onclick="app.editStorage(${loc.id})">✏️ Редактировать</button>
                                <button onclick="app.deleteStorage(${loc.id})" class="danger" 
                                        ${loc.toolsCount > 0 ? 'disabled title="Нельзя удалить, есть инструменты"' : ''}>
                                    🗑 Удалить
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <h3 style="margin-top: 30px;">Типы мест хранения</h3>
                <div class="card">
                    <ul>
                        <li><strong>Склад</strong> - основное хранилище инструментов</li>
                        <li><strong>Цех</strong> - временное хранение в производственных помещениях</li>
                        <li><strong>Шкаф</strong> - инструментальные шкафы для быстрого доступа</li>
                        <li><strong>Ящик</strong> - переносные хранилища</li>
                        <li><strong>Стеллаж</strong> - стеллажное хранение</li>
                    </ul>
                </div>
            `;

            document.getElementById('tabContent').innerHTML = html;
        } catch (error) {
            document.getElementById('tabContent').innerHTML =
                `<div class="error">Ошибка загрузки мест хранения: ${error.message}</div>`;
        }
    }

    showCreateStorageModal() {
        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🏪 Добавить место хранения</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    <div class="form-group">
                        <label>Тип *:</label>
                        <select id="newStorageType" required>
                            <option value="">Выберите тип</option>
                            <option value="Склад">Склад</option>
                            <option value="Цех">Цех</option>
                            <option value="Шкаф">Шкаф</option>
                            <option value="Ящик">Ящик</option>
                            <option value="Стеллаж">Стеллаж</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Название *:</label>
                        <input type="text" id="newStorageName" placeholder="Например: Основной склад" required>
                    </div>
                    <div class="form-group">
                        <label>Адрес:</label>
                        <input type="text" id="newStorageAddress" placeholder="Например: Корпус А, этаж 1">
                    </div>
                    <div class="form-actions">
                        <button onclick="app.createStorage()">Создать</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;
    }

    async createStorage() {
        const type = document.getElementById('newStorageType').value;
        const name = document.getElementById('newStorageName').value.trim();
        const address = document.getElementById('newStorageAddress').value.trim();

        if (!type || !name) {
            this.showModalMessage('Заполните обязательные поля', 'error');
            return;
        }

        try {
            await this.request('storagelocations', 'POST', {
                type,
                name,
                address
            });

            this.showMessage('Место хранения создано');
            this.closeModal();
            await this.loadStorage();
            await this.loadInitialData(); // Обновляем кэш
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    async editStorage(locationId) {
        try {
            const location = await this.request(`storagelocations/${locationId}`);

            const modalHtml = `
                <div class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>✏️ Редактировать место хранения</h3>
                            <button class="close-modal" onclick="app.closeModal()">×</button>
                        </div>
                        <div id="modalMessage" class="message"></div>
                        <div class="form-group">
                            <label>Тип:</label>
                            <select id="editStorageType">
                                <option value="Склад" ${location.type === 'Склад' ? 'selected' : ''}>Склад</option>
                                <option value="Цех" ${location.type === 'Цех' ? 'selected' : ''}>Цех</option>
                                <option value="Шкаф" ${location.type === 'Шкаф' ? 'selected' : ''}>Шкаф</option>
                                <option value="Ящик" ${location.type === 'Ящик' ? 'selected' : ''}>Ящик</option>
                                <option value="Стеллаж" ${location.type === 'Стеллаж' ? 'selected' : ''}>Стеллаж</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Название:</label>
                            <input type="text" id="editStorageName" value="${location.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Адрес:</label>
                            <input type="text" id="editStorageAddress" value="${location.address || ''}">
                        </div>
                        <div class="form-actions">
                            <button onclick="app.updateStorage(${locationId})">Сохранить</button>
                            <button onclick="app.closeModal()" class="secondary">Отмена</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalContainer').innerHTML = modalHtml;
        } catch (error) {
            this.showMessage(`Ошибка загрузки: ${error.message}`, 'error');
        }
    }

    async updateStorage(locationId) {
        const type = document.getElementById('editStorageType').value;
        const name = document.getElementById('editStorageName').value.trim();
        const address = document.getElementById('editStorageAddress').value.trim();

        if (!type || !name) {
            this.showModalMessage('Заполните обязательные поля', 'error');
            return;
        }

        try {
            await this.request(`storagelocations/${locationId}`, 'PUT', {
                type,
                name,
                address
            });

            this.showMessage('Место хранения обновлено');
            this.closeModal();
            await this.loadStorage();
            await this.loadInitialData();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    async deleteStorage(locationId) {
        if (!confirm('Вы уверены, что хотите удалить это место хранения?')) return;

        try {
            await this.request(`storagelocations/${locationId}`, 'DELETE');
            this.showMessage('Место хранения удалено');
            await this.loadStorage();
            await this.loadInitialData();
        } catch (error) {
            this.showMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    // ========== ОПЕРАЦИИ ==========
    async loadOperations() {
        try {
            const [activeIssues, stats] = await Promise.all([
                this.request('operations/active'),
                this.request('operations/stats')
            ]);

            const html = `
                <div class="action-buttons">
                    <button onclick="app.showReceiveToolModal()">📥 Приёмка инструмента</button>
                    <button onclick="app.showIssueToolModal()">📤 Выдача инструмента</button>
                    <button onclick="app.showReturnToolModal()">📥 Возврат инструмента</button>
                </div>
                
                <div class="cards-grid">
                    <div class="card">
                        <h3>Активные выдачи</h3>
                        <div class="stats">${stats.activeIssues}</div>
                        <p>Инструментов на руках</p>
                    </div>
                    <div class="card">
                        <h3>Просрочено</h3>
                        <div class="stats" style="color: #e53e3e;">${stats.overdueIssues}</div>
                        <p>Требуют возврата</p>
                    </div>
                    <div class="card">
                        <h3>Выдач сегодня</h3>
                        <div class="stats">${stats.issuesToday}</div>
                        <p>За текущий день</p>
                    </div>
                    <div class="card">
                        <h3>Всего операций</h3>
                        <div class="stats">${stats.totalTransactions}</div>
                        <p>В системе</p>
                    </div>
                </div>
                
                <h3 style="margin: 30px 0 20px 0;">Активные выдачи (на руках)</h3>
                ${activeIssues.length === 0 ?
                    '<div class="card"><p style="text-align: center; padding: 20px; color: #718096;">Нет активных выдач</p></div>' :
                    `<div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Инструмент</th>
                                    <th>Рабочий</th>
                                    <th>Кто выдал</th>
                                    <th>Дата выдачи</th>
                                    <th>Ожидаемый возврат</th>
                                    <th>Дней на руках</th>
                                    <th>Статус</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${activeIssues.map(issue => {
                        const issueDate = new Date(issue.transactionDate);
                        const expectedReturn = issue.expectedReturnDate ? new Date(issue.expectedReturnDate) : null;
                        const daysIssued = Math.floor((new Date() - issueDate) / (1000 * 60 * 60 * 24));
                        const isOverdue = expectedReturn && new Date() > expectedReturn;

                        return `
                                        <tr>
                                            <td><strong>${issue.tool.article}</strong> - ${issue.tool.name}</td>
                                            <td>${issue.worker.fullName}</td>
                                            <td>${issue.issuedBy.fullName}</td>
                                            <td>${issueDate.toLocaleDateString('ru-RU')}</td>
                                            <td>${expectedReturn ? expectedReturn.toLocaleDateString('ru-RU') : 'Не указано'}</td>
                                            <td>${daysIssued}</td>
                                            <td>
                                                ${isOverdue ?
                                '<span class="badge badge-warning">ПРОСРОЧЕНО</span>' :
                                '<span class="badge badge-success">АКТИВНО</span>'}
                                            </td>
                                            <td>
                                                <button onclick="app.showReturnSpecificModal(${issue.transactionId}, ${issue.tool.id}, ${issue.worker.id})">
                                                    Принять возврат
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                    }).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
            `;

            document.getElementById('tabContent').innerHTML = html;
        } catch (error) {
            document.getElementById('tabContent').innerHTML =
                `<div class="error">Ошибка загрузки операций: ${error.message}</div>`;
        }
    }

    showReceiveToolModal() {
        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📥 Приёмка нового инструмента</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    <div class="form-group">
                        <label>Артикул *:</label>
                        <input type="text" id="receiveArticle" placeholder="Например: HAM-001" required>
                    </div>
                    <div class="form-group">
                        <label>Наименование *:</label>
                        <input type="text" id="receiveName" placeholder="Например: Молоток слесарный" required>
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea id="receiveDescription" placeholder="Описание инструмента..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Место хранения *:</label>
                        <select id="receiveLocation" required>
                            <option value="">Выберите место хранения</option>
                            ${this.storageLocations.map(loc =>
            `<option value="${loc.id}">${loc.name} (${loc.type})</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Количество *:</label>
                        <input type="number" id="receiveQuantity" value="1" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>Примечание:</label>
                        <textarea id="receiveNotes" placeholder="Источник поступления, особенности..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button onclick="app.receiveTool()">Принять на склад</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;
    }

    async receiveTool() {
        const article = document.getElementById('receiveArticle').value.trim();
        const name = document.getElementById('receiveName').value.trim();
        const description = document.getElementById('receiveDescription').value.trim();
        const locationId = document.getElementById('receiveLocation').value;
        const quantity = parseInt(document.getElementById('receiveQuantity').value);
        const notes = document.getElementById('receiveNotes').value.trim();

        if (!article || !name || !locationId || !quantity) {
            this.showModalMessage('Заполните обязательные поля', 'error');
            return;
        }

        try {
            // Сначала создаем инструмент
            const toolResponse = await this.request('tools', 'POST', {
                article,
                name,
                description,
                storageLocationId: parseInt(locationId)
            });

            // Затем создаем транзакцию приёмки
            await this.request('operations/receive', 'POST', {
                article,
                name,
                description,
                storageLocationId: parseInt(locationId),
                receivedById: this.currentUser.id,
                quantity,
                notes: `Приёмка: ${notes}`
            });

            this.showMessage('Инструмент успешно принят на склад');
            this.closeModal();
            await this.loadTools();
            await this.loadOperations();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    showIssueToolModal(toolId = null) {
        const workers = this.users.filter(u => u.role === 'Worker');

        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📤 Выдача инструмента</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    
                    ${toolId ? `<input type="hidden" id="issueToolId" value="${toolId}">` : `
                    <div class="form-group">
                        <label>Инструмент *:</label>
                        <select id="issueToolId" required>
                            <option value="">Выберите инструмент</option>
                            ${this.tools.map(tool =>
            `<option value="${tool.id}">${tool.article} - ${tool.name} (${tool.storageLocationName})</option>`
        ).join('')}
                        </select>
                    </div>`}
                    
                    <div class="form-group">
                        <label>Рабочий *:</label>
                        <select id="issueWorkerId" required>
                            <option value="">Выберите рабочего</option>
                            ${workers.map(worker =>
            `<option value="${worker.id}">${worker.fullName} (${worker.username})</option>`
        ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Ожидаемая дата возврата:</label>
                        <input type="date" id="issueReturnDate">
                    </div>
                    
                    <div class="form-group">
                        <label>Количество:</label>
                        <input type="number" id="issueQuantity" value="1" min="1">
                    </div>
                    
                    <div class="form-group">
                        <label>Примечание:</label>
                        <textarea id="issueNotes" placeholder="Цель использования, особенности..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="app.issueTool()">Выдать</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;

        // Установить дату возврата по умолчанию (через 7 дней)
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        const dateInput = document.getElementById('issueReturnDate');
        if (dateInput) {
            dateInput.value = defaultDate.toISOString().split('T')[0];
            dateInput.min = new Date().toISOString().split('T')[0];
        }
    }

    async issueTool() {
        const toolId = document.getElementById('issueToolId').value;
        const workerId = document.getElementById('issueWorkerId').value;
        const returnDate = document.getElementById('issueReturnDate').value;
        const quantity = parseInt(document.getElementById('issueQuantity').value) || 1;
        const notes = document.getElementById('issueNotes').value.trim();

        if (!toolId || !workerId) {
            this.showModalMessage('Выберите инструмент и рабочего', 'error');
            return;
        }

        try {
            await this.request('operations/issue', 'POST', {
                toolId: parseInt(toolId),
                workerId: parseInt(workerId),
                issuedById: this.currentUser.id,
                expectedReturnDate: returnDate || null,
                quantity,
                notes
            });

            this.showMessage('Инструмент успешно выдан');
            this.closeModal();
            await this.loadOperations();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    showReturnToolModal() {
        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📥 Возврат инструмента</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    
                    <div class="form-group">
                        <label>Рабочий *:</label>
                        <select id="returnWorkerId" required onchange="app.loadWorkerActiveTools()">
                            <option value="">Выберите рабочего</option>
                            ${this.users.filter(u => u.role === 'Worker').map(worker =>
            `<option value="${worker.id}">${worker.fullName}</option>`
        ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Инструмент на руках *:</label>
                        <select id="returnToolId" required>
                            <option value="">Сначала выберите рабочего</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Состояние при возврате *:</label>
                        <select id="returnCondition" required>
                            <option value="good">Хорошее</option>
                            <option value="worn">Изношенное</option>
                            <option value="broken">Сломанное</option>
                            <option value="lost">Утеряно</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Примечание:</label>
                        <textarea id="returnNotes" placeholder="Описание состояния, замечания..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="app.returnTool()">Принять возврат</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;
    }

    async loadWorkerActiveTools() {
        const workerId = document.getElementById('returnWorkerId').value;
        if (!workerId) return;

        try {
            const activeTools = await this.request(`operations/user/${workerId}/active`);
            const select = document.getElementById('returnToolId');
            select.innerHTML = '<option value="">Выберите инструмент</option>';

            activeTools.forEach(tool => {
                const option = document.createElement('option');
                option.value = tool.toolId;
                option.textContent = `${tool.article} - ${tool.toolName} (выдан ${new Date(tool.issueDate).toLocaleDateString()})`;
                if (tool.isOverdue) {
                    option.textContent += ' - ПРОСРОЧЕНО';
                    option.style.color = '#e53e3e';
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading worker tools:', error);
        }
    }

    async returnTool() {
        const workerId = document.getElementById('returnWorkerId').value;
        const toolId = document.getElementById('returnToolId').value;
        const condition = document.getElementById('returnCondition').value;
        const notes = document.getElementById('returnNotes').value.trim();

        if (!workerId || !toolId || !condition) {
            this.showModalMessage('Заполните обязательные поля', 'error');
            return;
        }

        try {
            await this.request('operations/return', 'POST', {
                toolId: parseInt(toolId),
                workerId: parseInt(workerId),
                returnedById: this.currentUser.id,
                condition,
                notes
            });

            this.showMessage('Инструмент успешно возвращен');
            this.closeModal();
            await this.loadOperations();
            if (this.currentTab === 'myTools') {
                await this.loadMyTools();
            }
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    showReturnSpecificModal(transactionId, toolId, workerId) {
        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📥 Возврат инструмента</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    
                    <input type="hidden" id="specificTransactionId" value="${transactionId}">
                    <input type="hidden" id="specificToolId" value="${toolId}">
                    <input type="hidden" id="specificWorkerId" value="${workerId}">
                    
                    <div class="form-group">
                        <label>Состояние при возврате *:</label>
                        <select id="specificCondition" required>
                            <option value="good">Хорошее</option>
                            <option value="worn">Изношенное</option>
                            <option value="broken">Сломанное</option>
                            <option value="lost">Утеряно</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Примечание:</label>
                        <textarea id="specificNotes" placeholder="Описание состояния, замечания..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="app.returnSpecificTool()">Принять возврат</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;
    }

    async returnSpecificTool() {
        const transactionId = document.getElementById('specificTransactionId').value;
        const toolId = document.getElementById('specificToolId').value;
        const workerId = document.getElementById('specificWorkerId').value;
        const condition = document.getElementById('specificCondition').value;
        const notes = document.getElementById('specificNotes').value.trim();

        try {
            await this.request('operations/return', 'POST', {
                toolId: parseInt(toolId),
                workerId: parseInt(workerId),
                returnedById: this.currentUser.id,
                condition,
                notes
            });

            this.showMessage('Инструмент успешно возвращен');
            this.closeModal();
            await this.loadOperations();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    showWriteOffModal(toolId) {
        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🗑 Списание инструмента</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    
                    <input type="hidden" id="writeOffToolId" value="${toolId}">
                    
                    <div class="form-group">
                        <label>Причина списания *:</label>
                        <select id="writeOffReason" required>
                            <option value="">Выберите причину</option>
                            <option value="broken">Поломка</option>
                            <option value="worn">Износ</option>
                            <option value="lost">Утеря</option>
                            <option value="other">Другое</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Количество:</label>
                        <input type="number" id="writeOffQuantity" value="1" min="1">
                    </div>
                    
                    <div class="form-group">
                        <label>Примечание:</label>
                        <textarea id="writeOffNotes" placeholder="Подробное описание причины списания..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="writeOffCompletely" checked>
                            Списать полностью (удалить из системы)
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="app.writeOffTool()" class="danger">Списать</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;
    }

    async writeOffTool() {
        const toolId = document.getElementById('writeOffToolId').value;
        const reason = document.getElementById('writeOffReason').value;
        const quantity = parseInt(document.getElementById('writeOffQuantity').value) || 1;
        const notes = document.getElementById('writeOffNotes').value.trim();
        const completely = document.getElementById('writeOffCompletely').checked;

        if (!reason) {
            this.showModalMessage('Укажите причину списания', 'error');
            return;
        }

        try {
            await this.request(`tools/${toolId}/writeoff`, 'POST', {
                userId: this.currentUser.id,
                quantity,
                reason,
                notes,
                writeOffCompletely: completely
            });

            this.showMessage('Инструмент списан');
            this.closeModal();
            await this.loadTools();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    // ========== ПОЛЬЗОВАТЕЛИ ==========
    async loadUsers() {
        if (this.currentUser.role !== 'Admin') {
            document.getElementById('tabContent').innerHTML =
                '<div class="error">Доступ запрещен. Только администратор может управлять пользователями.</div>';
            return;
        }

        try {
            this.users = await this.request('users');

            const html = `
                <div class="action-buttons">
                    <button onclick="app.showCreateUserModal()">👤 Добавить пользователя</button>
                </div>
                
                <div class="cards-grid">
                    <div class="card">
                        <h3>Всего пользователей</h3>
                        <div class="stats">${this.users.length}</div>
                    </div>
                    <div class="card">
                        <h3>Администраторов</h3>
                        <div class="stats">${this.users.filter(u => u.role === 'Admin').length}</div>
                    </div>
                    <div class="card">
                        <h3>Кладовщиков</h3>
                        <div class="stats">${this.users.filter(u => u.role === 'Storekeeper').length}</div>
                    </div>
                    <div class="card">
                        <h3>Рабочих</h3>
                        <div class="stats">${this.users.filter(u => u.role === 'Worker').length}</div>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Логин</th>
                                <th>ФИО</th>
                                <th>Роль</th>
                                <th>Дата регистрации</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.users.map(user => `
                                <tr>
                                    <td>${user.id}</td>
                                    <td><strong>${user.username}</strong></td>
                                    <td>${user.fullName}</td>
                                    <td>
                                        <span class="badge ${user.role === 'Admin' ? 'badge-warning' :
                    user.role === 'Storekeeper' ? 'badge-info' :
                        'badge-primary'}">
                                            ${this.getRoleName(user.role)}
                                        </span>
                                    </td>
                                    <td>${new Date(user.createdDate).toLocaleDateString('ru-RU')}</td>
                                    <td>
                                        <div class="tool-actions">
                                            <button onclick="app.editUser(${user.id})">✏️</button>
                                            ${user.id !== this.currentUser.id ?
                    `<button onclick="app.deleteUser(${user.id})" class="danger">🗑</button>`
                    : '<button disabled title="Нельзя удалить себя">🗑</button>'}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('tabContent').innerHTML = html;
        } catch (error) {
            document.getElementById('tabContent').innerHTML =
                `<div class="error">Ошибка загрузки пользователей: ${error.message}</div>`;
        }
    }

    showCreateUserModal() {
        const modalHtml = `
            <div class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>👤 Добавить пользователя</h3>
                        <button class="close-modal" onclick="app.closeModal()">×</button>
                    </div>
                    <div id="modalMessage" class="message"></div>
                    <div class="form-group">
                        <label>Логин *:</label>
                        <input type="text" id="newUserUsername" placeholder="Например: ivanov" required>
                    </div>
                    <div class="form-group">
                        <label>Пароль *:</label>
                        <input type="password" id="newUserPassword" placeholder="Не менее 6 символов" required>
                    </div>
                    <div class="form-group">
                        <label>ФИО *:</label>
                        <input type="text" id="newUserFullName" placeholder="Например: Иванов Иван Иванович" required>
                    </div>
                    <div class="form-group">
                        <label>Роль *:</label>
                        <select id="newUserRole" required>
                            <option value="">Выберите роль</option>
                            <option value="Admin">Администратор</option>
                            <option value="Storekeeper">Кладовщик</option>
                            <option value="Worker">Рабочий</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="newUserEmail" placeholder="user@example.com">
                    </div>
                    <div class="form-actions">
                        <button onclick="app.createUser()">Создать</button>
                        <button onclick="app.closeModal()" class="secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;
    }

    async createUser() {
        const username = document.getElementById('newUserUsername').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const fullName = document.getElementById('newUserFullName').value.trim();
        const role = document.getElementById('newUserRole').value;
        const email = document.getElementById('newUserEmail').value.trim();

        if (!username || !password || !fullName || !role) {
            this.showModalMessage('Заполните обязательные поля', 'error');
            return;
        }

        if (password.length < 6) {
            this.showModalMessage('Пароль должен быть не менее 6 символов', 'error');
            return;
        }

        try {
            await this.request('users/register', 'POST', {
                username,
                password,
                fullName,
                role,
                email: email || null
            });

            this.showMessage('Пользователь успешно создан');
            this.closeModal();
            await this.loadUsers();
            await this.loadInitialData();
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    async editUser(userId) {
        try {
            const user = await this.request(`users/${userId}`);

            const modalHtml = `
                <div class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>✏️ Редактировать пользователя</h3>
                            <button class="close-modal" onclick="app.closeModal()">×</button>
                        </div>
                        <div id="modalMessage" class="message"></div>
                        <div class="form-group">
                            <label>ФИО:</label>
                            <input type="text" id="editUserFullName" value="${user.fullName}" required>
                        </div>
                        <div class="form-group">
                            <label>Роль:</label>
                            <select id="editUserRole">
                                <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Администратор</option>
                                <option value="Storekeeper" ${user.role === 'Storekeeper' ? 'selected' : ''}>Кладовщик</option>
                                <option value="Worker" ${user.role === 'Worker' ? 'selected' : ''}>Рабочий</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Новый пароль (оставьте пустым, чтобы не менять):</label>
                            <input type="password" id="editUserPassword" placeholder="Новый пароль">
                        </div>
                        <div class="form-actions">
                            <button onclick="app.updateUser(${user.id})">Сохранить</button>
                            <button onclick="app.closeModal()" class="secondary">Отмена</button>
                            ${user.id !== this.currentUser.id ?
                    `<button onclick="app.deleteUser(${user.id})" class="danger" style="margin-left: auto;">Удалить</button>`
                    : ''}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalContainer').innerHTML = modalHtml;
        } catch (error) {
            this.showMessage(`Ошибка загрузки пользователя: ${error.message}`, 'error');
        }
    }

    async updateUser(userId) {
        const fullName = document.getElementById('editUserFullName').value.trim();
        const role = document.getElementById('editUserRole').value;
        const password = document.getElementById('editUserPassword').value;

        if (!fullName || !role) {
            this.showModalMessage('Заполните обязательные поля', 'error');
            return;
        }

        const updateData = {
            fullName,
            role
        };

        if (password) {
            updateData.password = password;
        }

        try {
            await this.request(`users/${userId}`, 'PUT', updateData);
            this.showMessage('Пользователь обновлен');
            this.closeModal();
            await this.loadUsers();
            await this.loadInitialData();

            // Если обновили себя, обновляем текущего пользователя
            if (userId === this.currentUser.id) {
                this.currentUser.fullName = fullName;
                this.currentUser.role = role;
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.showAuthUI();
            }
        } catch (error) {
            this.showModalMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

        if (userId === this.currentUser.id) {
            this.showMessage('Нельзя удалить самого себя', 'error');
            return;
        }

        try {
            await this.request(`users/${userId}`, 'DELETE');
            this.showMessage('Пользователь удален');
            await this.loadUsers();
            await this.loadInitialData();
            this.closeModal();
        } catch (error) {
            this.showMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    // ========== ТРАНЗАКЦИИ ==========
    async loadTransactions() {
        try {
            const transactions = await this.request('operations/transactions/recent?limit=50');

            const html = `
                <div class="action-buttons">
                    <button onclick="app.exportTransactions()">📥 Экспорт в CSV</button>
                    <div style="flex: 1;"></div>
                    <input type="date" id="filterDate" onchange="app.filterTransactions()">
                    <select id="filterType" onchange="app.filterTransactions()">
                        <option value="">Все типы</option>
                        <option value="Приёмка">Приёмка</option>
                        <option value="Выдача">Выдача</option>
                        <option value="Возврат">Возврат</option>
                        <option value="Списание">Списание</option>
                    </select>
                </div>
                
                <div class="cards-grid">
                    <div class="card">
                        <h3>Всего транзакций</h3>
                        <div class="stats">${transactions.length}</div>
                    </div>
                    <div class="card">
                        <h3>Последняя операция</h3>
                        <div style="font-size: 18px; margin: 10px 0;">
                            ${transactions.length > 0 ?
                    `${transactions[0].transactionType} - ${new Date(transactions[0].transactionDate).toLocaleString('ru-RU')}`
                    : 'Нет операций'}
                        </div>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Дата</th>
                                <th>Тип</th>
                                <th>Инструмент</th>
                                <th>Количество</th>
                                <th>Кто выполнил</th>
                                <th>Кому выдан</th>
                                <th>Примечание</th>
                            </tr>
                        </thead>
                        <tbody id="transactionsTableBody">
                            ${transactions.map(t => `
                                <tr>
                                    <td>${t.id}</td>
                                    <td>${new Date(t.transactionDate).toLocaleString('ru-RU')}</td>
                                    <td>
                                        <span class="badge ${t.transactionType === 'Приёмка' ? 'badge-success' :
                            t.transactionType === 'Выдача' ? 'badge-warning' :
                                t.transactionType === 'Возврат' ? 'badge-info' :
                                    'badge-danger'}">
                                            ${t.transactionType}
                                        </span>
                                    </td>
                                    <td>${t.tool?.name || 'Не указан'}</td>
                                    <td>${t.quantity}</td>
                                    <td>${t.user?.fullName || 'Не указан'}</td>
                                    <td>${t.assignedToUser?.fullName || '-'}</td>
                                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${t.notes || '-'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${transactions.length >= 50 ?
                    '<div style="text-align: center; margin-top: 20px; color: #718096;">Показаны последние 50 транзакций</div>'
                    : ''}
            `;

            document.getElementById('tabContent').innerHTML = html;
        } catch (error) {
            document.getElementById('tabContent').innerHTML =
                `<div class="error">Ошибка загрузки транзакций: ${error.message}</div>`;
        }
    }

    filterTransactions() {
        const dateFilter = document.getElementById('filterDate')?.value;
        const typeFilter = document.getElementById('filterType')?.value;

        // Реализация фильтрации будет при загрузке данных с сервера
        this.showMessage('Фильтрация будет доступна при загрузке данных с сервера', 'loading');
    }

    async exportTransactions() {
        try {
            const response = await this.request('operations/transactions/recent?limit=1000', 'GET', null, true);
            const transactions = await response.json();

            // Создаем CSV
            let csv = 'ID;Дата;Тип;Инструмент;Артикул;Количество;Исполнитель;Кому выдан;Примечание\n';

            transactions.forEach(t => {
                csv += `${t.id};"${new Date(t.transactionDate).toLocaleString('ru-RU')}";"${t.transactionType}";`
                    + `"${t.tool?.name || ''}";"${t.tool?.article || ''}";${t.quantity};`
                    + `"${t.user?.fullName || ''}";"${t.assignedToUser?.fullName || ''}";`
                    + `"${(t.notes || '').replace(/"/g, '""')}"\n`;
            });

            // Скачиваем файл
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `транзакции_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showMessage('Данные экспортированы в CSV');
        } catch (error) {
            this.showMessage(`Ошибка экспорта: ${error.message}`, 'error');
        }
    }

    // ========== МОИ ИНСТРУМЕНТЫ ==========
    async loadMyTools() {
        try {
            const [activeTools, transactions] = await Promise.all([
                this.request(`operations/user/${this.currentUser.id}/active`),
                this.request(`operations/transactions/recent?limit=20`)
            ]);

            const userTransactions = transactions.filter(t =>
                t.user?.id === this.currentUser.id ||
                t.assignedToUser?.id === this.currentUser.id
            );

            const html = `
                <div class="cards-grid">
                    <div class="card">
                        <h3>Инструментов на руках</h3>
                        <div class="stats">${activeTools.length}</div>
                    </div>
                    <div class="card">
                        <h3>Просрочено</h3>
                        <div class="stats" style="color: ${activeTools.filter(t => t.isOverdue).length > 0 ? '#e53e3e' : '#38a169'}">
                            ${activeTools.filter(t => t.isOverdue).length}
                        </div>
                    </div>
                </div>
                
                <h3 style="margin: 30px 0 20px 0;">Мои инструменты на руках</h3>
                ${activeTools.length === 0 ?
                    '<div class="card"><p style="text-align: center; padding: 20px; color: #718096;">У вас нет выданных инструментов</p></div>' :
                    `<div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Артикул</th>
                                    <th>Наименование</th>
                                    <th>Дата получения</th>
                                    <th>Ожидаемый возврат</th>
                                    <th>Дней на руках</th>
                                    <th>Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${activeTools.map(tool => {
                        const issueDate = new Date(tool.issueDate);
                        const daysIssued = Math.floor((new Date() - issueDate) / (1000 * 60 * 60 * 24));

                        return `
                                        <tr>
                                            <td><strong>${tool.article}</strong></td>
                                            <td>${tool.toolName}</td>
                                            <td>${issueDate.toLocaleDateString('ru-RU')}</td>
                                            <td>${tool.expectedReturnDate ? new Date(tool.expectedReturnDate).toLocaleDateString('ru-RU') : 'Не указано'}</td>
                                            <td>${daysIssued}</td>
                                            <td>
                                                ${tool.isOverdue ?
                                '<span class="badge badge-warning">ПРОСРОЧЕНО</span>' :
                                '<span class="badge badge-success">В использовании</span>'}
                                            </td>
                                        </tr>
                                    `;
                    }).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
                
                <h3 style="margin: 40px 0 20px 0;">История моих операций</h3>
                ${userTransactions.length === 0 ?
                    '<div class="card"><p style="text-align: center; padding: 20px; color: #718096;">Нет операций</p></div>' :
                    `<div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Операция</th>
                                    <th>Инструмент</th>
                                    <th>Количество</th>
                                    <th>Примечание</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userTransactions.map(t => `
                                    <tr>
                                        <td>${new Date(t.transactionDate).toLocaleString('ru-RU')}</td>
                                        <td>
                                            <span class="badge ${t.transactionType === 'Приёмка' ? 'badge-success' :
                            t.transactionType === 'Выдача' ? 'badge-warning' :
                                t.transactionType === 'Возврат' ? 'badge-info' :
                                    'badge-danger'}">
                                                ${t.transactionType}
                                            </span>
                                        </td>
                                        <td>${t.tool?.name || 'Не указан'}</td>
                                        <td>${t.quantity}</td>
                                        <td>${t.notes || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
            `;

            document.getElementById('tabContent').innerHTML = html;
        } catch (error) {
            document.getElementById('tabContent').innerHTML =
                `<div class="error">Ошибка загрузки данных: ${error.message}</div>`;
        }
    }

    // ========== СТАТИСТИКА ==========
    async loadStats() {
        try {
            const stats = await this.request('operations/stats');
            const transactions = await this.request('operations/transactions/recent?limit=100');

            // Анализ по типам операций
            const operationTypes = {};
            transactions.forEach(t => {
                operationTypes[t.transactionType] = (operationTypes[t.transactionType] || 0) + 1;
            });

            // Анализ по дням (последние 7 дней)
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const dayTransactions = transactions.filter(t =>
                    t.transactionDate.startsWith(dateStr)
                );

                last7Days.push({
                    date: date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }),
                    count: dayTransactions.length
                });
            }

            const html = `
                <div class="cards-grid">
                    <div class="card">
                        <h3>Всего операций</h3>
                        <div class="stats">${stats.totalTransactions}</div>
                    </div>
                    <div class="card">
                        <h3>Активных выдач</h3>
                        <div class="stats">${stats.activeIssues}</div>
                    </div>
                    <div class="card">
                        <h3>Просрочено</h3>
                        <div class="stats" style="color: #e53e3e;">${stats.overdueIssues}</div>
                    </div>
                    <div class="card">
                        <h3>Выдач сегодня</h3>
                        <div class="stats">${stats.issuesToday}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; margin-top: 30px;">
                    
                    <div class="card">
                        <h3>Распределение по типам операций</h3>
                        <div style="margin-top: 20px;">
                            ${Object.entries(operationTypes).map(([type, count]) => `
                                <div style="margin-bottom: 10px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <span>${type}</span>
                                        <span><strong>${count}</strong> (${Math.round(count / transactions.length * 100)}%)</span>
                                    </div>
                                    <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                        <div style="height: 100%; width: ${count / transactions.length * 100}%; 
                                             background: ${type === 'Приёмка' ? '#38a169' :
                    type === 'Выдача' ? '#d69e2e' :
                        type === 'Возврат' ? '#4299e1' : '#e53e3e'};">
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3>Активность за последние 7 дней</h3>
                        <div style="margin-top: 20px; height: 200px; display: flex; align-items: flex-end; gap: 10px;">
                            ${last7Days.map(day => `
                                <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                    <div style="width: 30px; background: #4299e1; height: ${Math.max(20, day.count * 20)}px; 
                                         border-radius: 4px 4px 0 0;">
                                    </div>
                                    <div style="margin-top: 10px; font-size: 12px; text-align: center;">
                                        <div>${day.date}</div>
                                        <div><strong>${day.count}</strong></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                </div>
                
                <div class="card" style="margin-top: 30px;">
                    <h3>Общая информация о системе</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 15px;">
                        <div>
                            <strong>Версия системы:</strong> 1.0.0
                        </div>
                        <div>
                            <strong>База данных:</strong> PostgreSQL
                        </div>
                        <div>
                            <strong>Всего пользователей:</strong> ${this.users.length}
                        </div>
                        <div>
                            <strong>Всего инструментов:</strong> ${this.tools.length}
                        </div>
                        <div>
                            <strong>Ваша роль:</strong> ${this.getRoleName(this.currentUser.role)}
                        </div>
                        <div>
                            <strong>Дата входа:</strong> ${new Date().toLocaleString('ru-RU')}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('tabContent').innerHTML = html;
        } catch (error) {
            document.getElementById('tabContent').innerHTML =
                `<div class="error">Ошибка загрузки статистики: ${error.message}</div>`;
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    showModalMessage(text, type = 'success') {
        const modalMessage = document.getElementById('modalMessage');
        if (modalMessage) {
            modalMessage.textContent = text;
            modalMessage.className = `message ${type}`;
            modalMessage.style.display = 'block';
        }
    }

    closeModal() {
        document.getElementById('modalContainer').innerHTML = '';
    }
}

// Создаем глобальный экземпляр приложения
const app = new ToolManagementSystem();

// Глобальные функции для вызова из HTML
window.login = () => app.login();
window.logout = () => app.logout();
window.app = app;