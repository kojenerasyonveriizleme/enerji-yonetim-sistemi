/**
 * ============================================
 * KAYIT LİSTELEME MODÜLÜ
 * Günlük enerji kayıtlarını listeler
 * ============================================
 */

const Records = {
    // Özellikler
    allRecords: [],
    filteredRecords: [],
    currentPage: 1,
    recordsPerPage: 10,
    totalPages: 0,
    totalRecords: 0,
    
    /**
     * Modülü başlat
     */
    init: function() {
        console.log('📋 Kayıt modülü başlatılıyor...');
        this.bindEvents();
        console.log('✅ Kayıt modülü hazır');
    },
    
    /**
     * Event listener'ları bağla
     */
    bindEvents: function() {
        // Kayıt yükle butonu
        document.getElementById('load-records-btn')?.addEventListener('click', () => {
            this.loadRecords();
        });
        
        // Satır sayısı seçimi
        document.getElementById('rows-per-page')?.addEventListener('change', (e) => {
            this.recordsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderRecords();
        });
        
        // Arama input'u
        document.getElementById('search-records')?.addEventListener('input', (e) => {
            this.filterRecords(e.target.value);
        });
        
        // Sıralama
        document.getElementById('sort-records')?.addEventListener('change', (e) => {
            this.sortRecords(e.target.value);
        });
        
        console.log('✅ Event listener\'lar bağlandı');
    },
    
    /**
     * Kayıtları Google Sheets'ten yükle
     */
    loadRecords: async function() {
        const loadBtn = document.getElementById('load-records-btn');
        const tbody = document.getElementById('records-tbody');
        const totalInfo = document.getElementById('total-records');
        
        try {
            // Butonu devre dışı bırak
            loadBtn.disabled = true;
            loadBtn.innerHTML = '<span>⏳</span><span>Yükleniyor...</span>';
            
            // Yükleme mesajı göster
            tbody.innerHTML = '<tr><td colspan="17" class="loading">Kayıtlar yükleniyor...</td></tr>';
            
            // Sadece Google Sheets'ten veri al
            await this.tryGoogleSheets(tbody, totalInfo, loadBtn);
            
        } catch (error) {
            console.error('❌ Kayıtlar yüklenemedi:', error);
            tbody.innerHTML = `<tr><td colspan="17" class="error-message">Hata: ${error.message}</td></tr>`;
            if (Utils && Utils.showToast) {
                Utils.showToast('Kayıtlar yüklenemedi: ' + error.message, 'error');
            }
        } finally {
            // Butonu eski haline getir
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<span>🔄</span><span>Kayıtları Yükle</span>';
        }
    },
    
    /**
     * Google Sheets'ten veri çekmeyi dene
     */
    tryGoogleSheets: async function(tbody, totalInfo, loadBtn) {
        try {
            console.log('🌐 Google Sheets deneniyor...');
            
            // API'den tüm kayıtları al
            if (!window.DailyEnergyAPI) {
                throw new Error('DailyEnergyAPI modülü bulunamadı');
            }
            
            const response = await DailyEnergyAPI.listDailyEnergy(1000, 0); // İlk 1000 kayıt
            console.log('📋 API\'den gelen ham veri:', response);
            console.log('📋 Veri tipi:', typeof response);
            console.log('📋 Response keys:', Object.keys(response || {}));
            
            // Gelen veriyi doğru formata çevir
            let apiRecords = [];
            
            // DailyEnergyAPI zaten doğru formatı resolve ediyor
            if (Array.isArray(response)) {
                apiRecords = response;
                console.log('📋 Format: response (array - zaten işlenmiş)');
            } else {
                console.log('❌ Beklenmeyen format:', response);
                throw new Error('API veri formatı anlaşılamadı');
            }
            
            console.log('📋 İşlenmiş kayıtlar:', apiRecords);
            console.log('📋 Kayıt sayısı:', apiRecords.length);
            
            // İlk kaydı detaylı incele
            if (apiRecords.length > 0) {
                console.log('📋 İlk kayıt:', apiRecords[0]);
                console.log('📋 İlk kayıt keys:', Object.keys(apiRecords[0] || {}));
                console.log('📋 İlk kayıt tarihi:', apiRecords[0]['Tarih']);
                console.log('📋 İlk kayıt yağ seviyesi:', apiRecords[0]['Yağ Seviyesi (L)']);
                console.log('📋 İlk kayıt kuplaj:', apiRecords[0]['Kuplaj (MW)']);
                
                // İkinci kaydı da kontrol et
                if (apiRecords.length > 1) {
                    console.log('📋 İkinci kayıt:', apiRecords[1]);
                    console.log('📋 İkinci kayıt tarihi:', apiRecords[1]['Tarih']);
                    console.log('📋 İkinci kayıt yağ seviyesi:', apiRecords[1]['Yağ Seviyesi (L)']);
                }
            }
            
            if (apiRecords.length === 0) {
                tbody.innerHTML = '<tr><td colspan="17" class="no-data">Henüz kayıt bulunmuyor</td></tr>';
                if (totalInfo) totalInfo.textContent = 'Toplam: 0 kayıt';
                return;
            }
            
            // Tabloyu doldur
            this.populateTable(apiRecords, tbody);
            
            // Toplam bilgiyi güncelle
            if (totalInfo) {
                totalInfo.textContent = `Toplam: ${apiRecords.length} kayıt`;
            }
            
            console.log('✅ Kayıtlar başarıyla yüklendi');
            
        } catch (error) {
            console.error('❌ Google Sheets hatası:', error);
            throw error;
        }
    },
    
    /**
     * Tabloyu doldur
     */
    populateTable: function(records, tbody) {
        this.allRecords = records;
        this.filteredRecords = [...records];
        this.totalRecords = records.length;
        this.totalPages = Math.ceil(this.totalRecords / this.recordsPerPage);
        this.currentPage = 1;
        
        this.renderRecords();
    },
    
    /**
     * Kayıtları render et
     */
    renderRecords: function() {
        const tbody = document.getElementById('records-tbody');
        const start = (this.currentPage - 1) * this.recordsPerPage;
        const end = start + this.recordsPerPage;
        const pageRecords = this.filteredRecords.slice(start, end);
        
        if (pageRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="17" class="no-data">Gösterilecek kayıt yok</td></tr>';
            return;
        }
        
        let html = '';
        pageRecords.forEach((record, index) => {
            html += this.createRecordRow(record, start + index + 1);
        });
        
        tbody.innerHTML = html;
        this.updatePagination();
    },
    
    /**
     * Kayıt satırı oluştur
     */
    createRecordRow: function(record, index) {
        const date = record['Tarih'] || record.date || '-';
        const formattedDate = this.formatDate(date);
        
        return `
            <tr>
                <td>${index}</td>
                <td>${formattedDate}</td>
                <td>${record['Yağ Seviyesi (L)'] || '0'}</td>
                <td>${record['Kuplaj (MW)'] || '0'}</td>
                <td>${record['GM-1 (MW)'] || '0'}</td>
                <td>${record['GM-2 (MW)'] || '0'}</td>
                <td>${record['GM-3 (MW)'] || '0'}</td>
                <td>${record['İç İhtiyaç (MW)'] || '0'}</td>
                <td>${record['1. Redresör (MW)'] || '0'}</td>
                <td>${record['2. Redresör (MW)'] || '0'}</td>
                <td>${record['Kojen İç İhtiyaç (kW)'] || '0'}</td>
                <td>${record['Servis Trafosu (MW)'] || '0'}</td>
                <td>${record['Kayıt Zamanı'] || '-'}</td>
                <td>${record['Kaydeden'] || '-'}</td>
                <td>${record['Düzenleyen'] || '-'}</td>
                <td>${record['Düzenleme Zamanı'] || '-'}</td>
            </tr>
        `;
    },
    
    /**
     * Tarihi formatla
     */
    formatDate: function(date) {
        if (!date) return '-';
        
        if (date instanceof Date) {
            return date.toLocaleDateString('tr-TR');
        }
        
        if (typeof date === 'string') {
            if (date.includes('T')) {
                const d = new Date(date);
                return d.toLocaleDateString('tr-TR');
            }
            return date;
        }
        
        return '-';
    },
    
    /**
     * Kayıtları filtrele
     */
    filterRecords: function(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredRecords = [...this.allRecords];
        } else {
            this.filteredRecords = this.allRecords.filter(record => {
                return Object.values(record).some(value => 
                    value && value.toString().toLowerCase().includes(term)
                );
            });
        }
        
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredRecords.length / this.recordsPerPage);
        this.renderRecords();
    },
    
    /**
     * Kayıtları sırala
     */
    sortRecords: function(sortBy) {
        switch (sortBy) {
            case 'date-desc':
                this.filteredRecords.sort((a, b) => new Date(b['Tarih']) - new Date(a['Tarih']));
                break;
            case 'date-asc':
                this.filteredRecords.sort((a, b) => new Date(a['Tarih']) - new Date(b['Tarih']));
                break;
            case 'yag-seviyesi-desc':
                this.filteredRecords.sort((a, b) => parseFloat(b['Yağ Seviyesi (L)']) - parseFloat(a['Yağ Seviyesi (L)']));
                break;
            case 'yag-seviyesi-asc':
                this.filteredRecords.sort((a, b) => parseFloat(a['Yağ Seviyesi (L)']) - parseFloat(b['Yağ Seviyesi (L)']));
                break;
        }
        
        this.renderRecords();
    },
    
    /**
     * Sayfalamayı güncelle
     */
    updatePagination: function() {
        const pagination = document.getElementById('pagination');
        const pageInfo = document.getElementById('page-info');
        
        if (!pagination) return;
        
        let html = '';
        
        // Önceki butonu
        html += `<button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="Records.goToPage(${this.currentPage - 1})">Önceki</button>`;
        
        // Sayfa numaraları
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="Records.goToPage(${i})">${i}</button>`;
        }
        
        // Sonraki butonu
        html += `<button class="page-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="Records.goToPage(${this.currentPage + 1})">Sonraki</button>`;
        
        pagination.innerHTML = html;
        
        // Sayfa bilgisi
        if (pageInfo) {
            const start = (this.currentPage - 1) * this.recordsPerPage + 1;
            const end = Math.min(start + this.recordsPerPage - 1, this.filteredRecords.length);
            pageInfo.textContent = `${start}-${end} / ${this.filteredRecords.length}`;
        }
    },
    
    /**
     * Belirli bir sayfaya git
     */
    goToPage: function(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderRecords();
    }
};

// Global erişim
window.Records = Records;
