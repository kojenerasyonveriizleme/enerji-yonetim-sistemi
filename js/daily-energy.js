/**
 * ============================================
 * GÜNLÜK ENERJİ MODÜLÜ
 * Günlük enerji verilerini yönetir
 * ============================================
 */

const DailyEnergy = {
    // Mevcut veri
    currentData: {
        date: null,
        values: {}
    },
    
    // API URL
    apiUrl: null,
    
    /**
     * Modülü başlat
     */
    init: function() {
        console.log('📊 Günlük Enerji modülü başlatılıyor...');
        
        // API URL'ini al
        this.apiUrl = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.gunluk_enerji;
        
        // Tarih ayarla
        this.setCurrentDate();
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // Mevcut veriyi yükle
        this.loadCurrentData();
        
        console.log('✅ Günlük Enerji modülü hazır');
    },
    
    /**
     * Mevcut tarihi ayarla
     */
    setCurrentDate: function() {
        const now = new Date();
        
        // Yerel tarihi kullan (saat dilimi sorunu olmasın diye)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        this.currentData.date = dateStr;
        
        // Badge'i güncelle
        const dateBadge = document.getElementById('daily-date-badge');
        if (dateBadge) {
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            dateBadge.textContent = now.toLocaleDateString('tr-TR', options);
        }
        
        console.log('📅 Tarih ayarlandı:', dateStr);
        console.log('📅 Saat dilimi:', now.toString());
        console.log('📅 UTC zamanı:', now.toISOString());
        console.log('📅 Yerel zaman:', now.toLocaleString('tr-TR'));
    },
    
    /**
     * Event listener'ları kur
     */
    setupEventListeners: function() {
        // Kaydet butonu
        const saveBtn = document.getElementById('save-daily-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveData();
            });
            console.log('✅ Kaydet butonu bağlandı');
        }
        
        // Input değişimi
        const inputs = document.querySelectorAll('#daily-energy-form input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateStatus('değişiyor');
            });
        });
        
        console.log('✅ Event listener\'lar kuruldu');
    },
    
    /**
     * Input'ları kilitle
     */
    lockInputs: function() {
        const inputs = document.querySelectorAll('#daily-energy-form input');
        const saveBtn = document.getElementById('save-daily-btn');
        
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('locked');
        });
        
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '📊 Güncel Kayıt';
            saveBtn.classList.add('disabled');
        }
        
        console.log('🔒 Tüm input\'lar kilitlendi');
    },
    
    /**
     * Input kilitlerini aç
     */
    unlockInputs: function() {
        const inputs = document.querySelectorAll('#daily-energy-form input');
        const saveBtn = document.getElementById('save-daily-btn');
        
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('locked');
        });
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span class="btn-icon">💾</span>Kaydet';
            saveBtn.classList.remove('disabled');
        }
        
        console.log('🔓 Input kilitleri açıldı');
    },
    
    /**
     * Mevcut veriyi yükle
     */
    loadCurrentData: function() {
        if (!this.apiUrl || this.apiUrl === 'BURAYA_YENI_URL_GELECEK') {
            console.log('⚠️ API URL yapılandırılmamış');
            this.updateStatus('çevrimdışı');
            return;
        }
        
        // Google Sheets'ten veri çek
        this.fetchCurrentData();
    },
    
    /**
     * Google Sheets'ten veri çek
     */
    fetchCurrentData: function() {
        console.log('📡 Google Sheets verisi çekiliyor...');
        console.log('🔍 Aranılan tarih:', this.currentData.date);
        
        const formData = new FormData();
        formData.append('action', 'get');
        formData.append('module', 'daily-energy');
        formData.append('date', this.currentData.date);
        
        console.log('📤 API isteği:', {action: 'get', module: 'daily-energy', date: this.currentData.date});
        
        fetch(this.apiUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('📥 API yanıtı:', data);
            
            if (data.success) {
                console.log('✅ Veri yüklendi:', data.data);
                this.populateForm(data.data);
                this.updateStatus('güncel');
            } else {
                console.log('⚠️ Veri yüklenemedi:', data.message);
                // Kayıt yoksa input'ları aç
                this.unlockInputs();
                this.updateStatus('yeni');
            }
        })
        .catch(error => {
            console.log('❌ Veri çekme hatası:', error);
            // Hata durumunda input'ları aç
            this.unlockInputs();
            this.updateStatus('çevrimdışı');
        });
    },
    
    /**
     * Formu doldur
     */
    populateForm: function(data) {
        console.log('📝 Form doldurma başlatıldı...');
        console.log('📊 Gelen veri:', data);
        
        const fieldMappings = {
            'Yağ Seviyesi (L)': 'yag-seviyesi',
            'Kuplaj (MW)': 'kuplaj',
            'GM-1 (MW)': 'gm-1',
            'GM-2 (MW)': 'gm-2',
            'GM-3 (MW)': 'gm-3',
            'İç İhtiyaç (MW)': 'ic-ihtiyac',
            '1. Redresör (MW)': 'redresor-1',
            '2. Redresör (MW)': 'redresor-2',
            'Kojen İç İhtiyaç (kW)': 'kojen-ic-ihtiyac',
            'Servis Trafosu (MW)': 'servis-trafosi'
        };
        
        let hasData = false;
        let filledFields = [];
        
        for (const [sheetField, inputId] of Object.entries(fieldMappings)) {
            const input = document.getElementById(inputId);
            const value = data[sheetField];
            
            console.log(`🔍 Alan kontrol: ${sheetField} -> ${inputId} = ${value}`);
            
            if (input && value && value !== '0') {
                input.value = value;
                this.currentData.values[inputId] = value;
                hasData = true;
                filledFields.push(sheetField);
                console.log(`✅ Dolduruldu: ${sheetField} = ${value}`);
            }
        }
        
        console.log('📋 Doldurulan alanlar:', filledFields);
        console.log('🔎 Veri durumu:', hasData ? 'var' : 'yok');
        
        // Eğer veri varsa input'ları kilitle
        if (hasData) {
            this.lockInputs();
            this.updateStatus('güncel');
            console.log('🔒 Input\'lar kilitlendi - Mevcut kayıt var');
        } else {
            this.unlockInputs();
            this.updateStatus('yeni');
            console.log('🔓 Input\'lar açık - Yeni kayıt');
        }
        
        console.log('📝 Form doldurma tamamlandı');
    },
    
    /**
     * Verileri kaydet
     */
    saveData: function() {
        console.log('💾 Günlük enerji kaydediliyor...');
        
        // Form verilerini al
        const formData = this.getFormData();
        
        // Validasyon
        if (!this.validateData(formData)) {
            return;
        }
        
        // Durumu güncelle
        this.updateStatus('kaydediliyor');
        
        // API'ye gönder
        this.sendToAPI(formData);
    },
    
    /**
     * Form verilerini al
     */
    getFormData: function() {
        const inputs = document.querySelectorAll('#daily-energy-form input');
        const data = {
            action: 'save',
            module: 'daily-energy',
            date: this.currentData.date,
            kaydeden: Auth?.getCurrentUser()?.username || 'Bilinmeyen'
        };
        
        inputs.forEach(input => {
            const fieldKey = this.getFieldKey(input.id);
            if (fieldKey) {
                data[fieldKey] = input.value || '0';
            }
        });
        
        console.log('📋 Form verileri:', data);
        return data;
    },
    
    /**
     * Input ID'den API key'e çevir
     */
    getFieldKey: function(inputId) {
        const mappings = {
            'yag-seviyesi': 'yagSeviyesi',
            'kuplaj': 'kuplaj',
            'gm-1': 'gm1',
            'gm-2': 'gm2',
            'gm-3': 'gm3',
            'ic-ihtiyac': 'icIhtiyac',
            'redresor-1': 'redresor1',
            'redresor-2': 'redresor2',
            'kojen-ic-ihtiyac': 'kojenIcIhtiyac',
            'servis-trafosi': 'servisTrafo'
        };
        
        return mappings[inputId] || null;
    },
    
    /**
     * Verileri doğrula
     */
    validateData: function(data) {
        // En az bir alan dolu olmalı
        let hasValue = false;
        const fields = ['yagSeviyesi', 'kuplaj', 'gm1', 'gm2', 'gm3', 'icIhtiyac', 'redresor1', 'redresor2', 'kojenIcIhtiyac', 'servisTrafo'];
        
        for (const field of fields) {
            const value = parseFloat(data[field]) || 0;
            if (value > 0) {
                hasValue = true;
                break;
            }
        }
        
        if (!hasValue) {
            if (Utils && Utils.showToast) {
                Utils.showToast('⚠️ En az bir alana değer girmelisiniz', 'warning');
            }
            return false;
        }
        
        return true;
    },
    
    /**
     * API'ye gönder
     */
    sendToAPI: function(formData) {
        if (!this.apiUrl) {
            console.log('❌ API URL bulunamadı');
            this.updateStatus('hata');
            return;
        }
        
        const postData = new FormData();
        Object.keys(formData).forEach(key => {
            postData.append(key, formData[key]);
        });
        
        console.log('📤 API isteği gönderiliyor...');
        
        fetch(this.apiUrl, {
            method: 'POST',
            body: postData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Kayıt başarılı:', data);
                
                // Başarılı kayıttan sonra input'ları kilitle
                this.lockInputs();
                this.updateStatus('kaydedildi');
                
                if (Utils && Utils.showToast) {
                    Utils.showToast('✅ Veri başarıyla kaydedildi', 'success');
                }
            } else {
                console.log('❌ Kayıt hatası:', data.message);
                this.updateStatus('hata');
                
                if (Utils && Utils.showToast) {
                    Utils.showToast('❌ Kayıt hatası: ' + data.message, 'error');
                }
            }
        })
        .catch(error => {
            console.log('💥 API hatası:', error);
            this.updateStatus('hata');
            
            if (Utils && Utils.showToast) {
                Utils.showToast('❌ Bağlantı hatası: ' + error.message, 'error');
            }
        });
    },
    
    /**
     * Durum badge'ini güncelle
     */
    updateStatus: function(status) {
        const statusBadge = document.getElementById('daily-status');
        if (!statusBadge) return;
        
        const statusConfig = {
            'bekliyor': { text: 'Bekliyor', class: 'status-waiting' },
            'güncel': { text: 'Güncel', class: 'status-current' },
            'yeni': { text: 'Yeni Kayıt', class: 'status-new' },
            'değişiyor': { text: 'Değişiyor', class: 'status-changing' },
            'kaydediliyor': { text: 'Kaydediliyor...', class: 'status-saving' },
            'kaydedildi': { text: 'Kaydedildi', class: 'status-saved' },
            'çevrimdışı': { text: 'Çevrimdışı', class: 'status-offline' },
            'hata': { text: 'Hata', class: 'status-error' }
        };
        
        const config = statusConfig[status] || statusConfig['bekliyor'];
        
        statusBadge.textContent = config.text;
        statusBadge.className = 'status-badge ' + config.class;
        
        console.log('📊 Durum güncellendi:', status);
    }
};

// Global erişim
window.DailyEnergy = DailyEnergy;
