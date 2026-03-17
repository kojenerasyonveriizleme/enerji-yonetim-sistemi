/**
 * SAATLIK AKTİF VE REAKTİF ENERJİ MODÜLÜ
 * Google Sheets entegrasyonlu saatlik enerji takip sistemi
 */

const EnerjiModulu = {
    // Vardiya tanımları
    SHIFT_TITLES: {
        gece: 'Gece Vardiyası',
        gunduz: 'Gündüz Vardiyası', 
        aksam: 'Akşam Vardiyası'
    },
    
    SHIFT_TIMES: {
        gece: '00:00 - 08:00',
        gunduz: '08:00 - 16:00',
        aksam: '16:00 - 24:00'
    },
    
    // Mevcut veri
    currentData: {
        date: null,
        shift: null,
        hours: [],
        records: {}
    },
    
    // Debouncing için
    saveTimeout: null,
    pendingSaveData: new Map(),
    
    /**
     * Modülü başlat
     */
    init: function() {
        // console.log('🔌 Enerji modülü başlatılıyor...'); // Gizlendi
        this.bindEvents();
        this.setCurrentDateTime();
        this.createCurrentHourInput(); // Otomatik input oluştur
    },
    
    /**
     * Event listener'ları bağla (butonlar kaldırıldı)
     */
    bindEvents: function() {
        // Tarih değişimi
        document.getElementById('hourly-date')?.addEventListener('change', () => {
            this.setCurrentDateTime();
            this.createCurrentHourInput();
        });
        
        // Vardiya değişimi
        document.getElementById('hourly-shift')?.addEventListener('change', () => {
            this.setCurrentDateTime();
            this.createCurrentHourInput();
        });
    },
    
    /**
     * Otomatik güncel saat input'u oluştur
     */
    createCurrentHourInput: function() {
        const currentHour = this.getCurrentHour()[0];
        const tableSection = document.querySelector('.table-section');
        const saatlikPage = document.getElementById('saatlik-page');
        
        if (!tableSection || !saatlikPage) return;
        
        // Form-section'ı kaldır
        const formSection = document.querySelector('.form-section');
        if (formSection) {
            formSection.remove();
        }
        
        // Table-header'ı tamamen kaldır
        const tableHeader = tableSection.querySelector('.table-header');
        if (tableHeader) {
            tableHeader.remove();
        }
        
        // Mevcut tabloyu temizle
        const existingTable = tableSection.querySelector('.table-responsive');
        if (existingTable) {
            existingTable.remove();
        }
        
        // Mevcut input container'ı temizle
        const existingInputContainer = tableSection.querySelector('.input-container');
        if (existingInputContainer) {
            existingInputContainer.remove();
        }
        
        // Mevcut summary-panel'i temizle
        const existingSummaryPanel = tableSection.querySelector('.summary-panel');
        if (existingSummaryPanel) {
            existingSummaryPanel.remove();
        }
        
        // Input container oluştur (table-section'e doğrudan)
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';
        inputContainer.innerHTML = `
            <div class="input-card">
                <div class="input-header">
                    <h3>📊 ${this.SHIFT_TITLES[this.currentData.shift]} - ${currentHour}</h3>
                    <div class="input-meta">
                        <span class="date-badge">${CONFIG.formatDate(new Date(this.currentData.date))}</span>
                        <span class="shift-badge">${this.SHIFT_TIMES[this.currentData.shift]}</span>
                    </div>
                </div>
                <div class="input-grid">
                    <div class="input-group">
                        <label class="input-label">
                            <span class="label-icon">⚡</span>
                            Aktif Enerji
                        </label>
                        <div class="input-wrapper">
                            <input type="number" 
                                   data-hour="${currentHour}" 
                                   data-field="aktif" 
                                   step="0.001" 
                                   placeholder="0.000"
                                   class="modern-input">
                            <span class="input-unit">MWh</span>
                        </div>
                    </div>
                    <div class="input-group">
                        <label class="input-label">
                            <span class="label-icon">🔄</span>
                            Reaktif Enerji
                        </label>
                        <div class="input-wrapper">
                            <input type="number" 
                                   data-hour="${currentHour}" 
                                   data-field="reaktif" 
                                   step="0.001" 
                                   placeholder="0.000"
                                   class="modern-input">
                            <span class="input-unit">kVArh</span>
                        </div>
                    </div>
                    <div class="status-group">
                        <label class="input-label">
                            <span class="label-icon">📋</span>
                            Durum
                        </label>
                        <div class="status-wrapper" data-hour="${currentHour}" data-field="status">
                            <span class="status-badge status-empty">Boş</span>
                        </div>
                    </div>
                </div>
                <div class="input-actions">
                    <button type="button" class="action-btn save-btn" id="save-hour-btn">
                        <span class="btn-icon">💾</span>
                        Kaydet
                    </button>
                </div>
            </div>
        `;
        
        // Input container'ı doğrudan table-section'e ekle
        tableSection.appendChild(inputContainer);
        
        // Summary-panel'i sayfanın en altına taşı
        this.createSummaryPanel();
        
        // Input event listener'ları ekle
        this.bindInputEvents();
        
        // Mevcut veriyi yükle
        this.loadSavedRecords();
        
        // Başlıkları güncelle
        this.updateHeaders();
    },
    
    /**
     * Summary panel'i sayfanın altına oluştur
     */
    createSummaryPanel: function() {
        const saatlikPage = document.getElementById('saatlik-page');
        
        // Mevcut summary-panel'i temizle
        const existingSummaryPanel = saatlikPage.querySelector('.summary-panel');
        if (existingSummaryPanel) {
            existingSummaryPanel.remove();
        }
        
        // Yeni summary-panel oluştur
        const summaryPanel = document.createElement('div');
        summaryPanel.className = 'summary-panel';
        summaryPanel.innerHTML = `
            <div class="summary-header">
                <h3>📈 Enerji Toplamları</h3>
                <div class="summary-meta">
                    <span class="summary-date">${CONFIG.formatDate(new Date(this.currentData.date))}</span>
                </div>
            </div>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-icon">⚡</div>
                    <div class="summary-content">
                        <span class="summary-label">Vardiya Aktif Toplam</span>
                        <span class="summary-value" id="shift-aktif-total">0.000 MWh</span>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">🔄</div>
                    <div class="summary-content">
                        <span class="summary-label">Vardiya Reaktif Toplam</span>
                        <span class="summary-value" id="shift-reaktif-total">0.000 kVArh</span>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">📊</div>
                    <div class="summary-content">
                        <span class="summary-label">Günlük Aktif Toplam</span>
                        <span class="summary-value" id="daily-aktif-total">0.000 MWh</span>
                    </div>
                </div>
            </div>
        `;
        
        // Sayfanın en altına ekle
        saatlikPage.appendChild(summaryPanel);
    },
    
    /**
     * Input validasyonu yap
     */
    validateInput: function(input) {
        const value = parseFloat(input.value) || 0;
        
        // Negatif değer kontrolü
        if (value < 0) {
            input.value = 0;
            // Utils.showToast('⚠️ Negatif değer girilemez', 'warning');
            return false;
        }
        
        // Maximum değer kontrolü (isteğe bağlı)
        if (value > 999999) {
            input.value = 999999;
            // Utils.showToast('⚠️ Çok büyük değer', 'warning');
            return false;
        }
        
        return true;
    },
    
    /**
     * Input event listener'larını bağla
     */
    bindInputEvents: function() {
        const inputs = document.querySelectorAll('.modern-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                // Sadece validasyon yap, otomatik kaydetme kaldırıldı
                this.validateInput(input);
            });
        });
        
        // Enter tuşu ile kaydet
        inputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveCurrentHour();
                }
            });
        });
        
        // Kaydet butonu
        const saveBtn = document.getElementById('save-hour-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentHour();
            });
        }
        
        // console.log('🎧 Input event\'lar kuruldu (manuel kaydet modu)'); // Gizlendi
    },
    
    /**
     * Mevcut saati kaydet (manuel)
     */
    saveCurrentHour: function() {
        const currentHour = this.getCurrentHour()[0];
        const aktifInput = document.querySelector(`[data-hour="${currentHour}"][data-field="aktif"]`);
        const reaktifInput = document.querySelector(`[data-hour="${currentHour}"][data-field="reaktif"]`);
        
        // console.log('🔍 Kaydetme kontrolü:', {
        //     currentHour: currentHour,
        //     aktifInput: aktifInput,
        //     reaktifInput: reaktifInput
        // }); // Gizlendi
        
        if (!aktifInput || !reaktifInput) {
            // Utils.showToast('❌ Input\'lar bulunamadı', 'error');
            return;
        }
        
        const aktifValue = parseFloat(aktifInput.value) || 0;
        const reaktifValue = parseFloat(reaktifInput.value) || 0;
        
        // console.log('📊 Girilen değerler:', {
        //     aktifValue: aktifValue,
        //     reaktifValue: reaktifValue,
        //     aktifInputValue: aktifInput.value,
        //     reaktifInputValue: reaktifInput.value
        // }); // Gizlendi
        
        if (aktifValue === 0 && reaktifValue === 0) {
            // Utils.showToast('⚠️ Lütfen en az bir değer girin', 'warning');
            return;
        }
        
        // SADECE GERÇEK DEĞERLER İÇİN KAYDET
        if (aktifValue > 0 || reaktifValue > 0) {
            // Kaydı oluştur veya güncelle
            if (!this.currentData.records[currentHour]) {
                this.currentData.records[currentHour] = {};
            }
            
            this.currentData.records[currentHour].aktif = aktifValue;
            this.currentData.records[currentHour].reaktif = reaktifValue;
            this.currentData.records[currentHour].timestamp = new Date().toISOString();
            
            // console.log('💾 Kaydedilecek veri:', this.currentData.records[currentHour]); // Gizlendi
            
            // Google Sheets'e SADECE gerçek değerleri gönder - VARDİYA VE SAAT EKLENDİ
            const googleSheetsData = {
                date: this.currentData.date,
                shift: this.currentData.shift,
                hour: currentHour,
                aktif: aktifValue,
                reaktif: reaktifValue,
                operator: 'admin'
            };
            
            console.log('🌐 Google Sheets\'e gönderilecek:', googleSheetsData);
            
            // Google Sheets'e gönder
            this.saveToGoogleSheets(currentHour, this.currentData.records[currentHour]);
            
            // LocalStorage'a SADECE gerçek değerleri kaydet (0 olmayanları)
            const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
            Utils.saveToStorage(storageKey, this.currentData.records);
            
            // Durumu güncelle
            this.updateStatus(currentHour, this.currentData.records[currentHour]);
            
            // Toplamları güncelle
            this.calculateTotals();
            
            // Input durumlarını güncelle (kilitli)
            this.updateInputStates();
            
            // Utils.showToast('✅ Veri başarıyla kaydedildi', 'success');
        } else {
            // Utils.showToast('⚠️ Sıfırdan farklı değer girin', 'warning');
        }
    },
    
    /**
     * Input verisini kaydet (LocalStorage + Google Sheets ile Debouncing)
     */
    saveInputData: function(input) {
        const hour = input.dataset.hour;
        const field = input.dataset.field;
        const value = parseFloat(input.value) || 0;
        
        // Kaydı oluştur veya güncelle
        if (!this.currentData.records[hour]) {
            this.currentData.records[hour] = {};
        }
        
        this.currentData.records[hour][field] = value;
        this.currentData.records[hour].timestamp = new Date().toISOString();
        
        // LocalStorage'a kaydet (anında)
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        Utils.saveToStorage(storageKey, this.currentData.records);
        
        // Durumu güncelle
        this.updateStatus(hour, this.currentData.records[hour]);
        
        // Toplamları güncelle
        this.calculateTotals();
        
        // Google Sheets'e kaydet (debouncing ile)
        this.debouncedSaveToGoogleSheets(hour);
    },
    
    /**
     * Debouncing ile Google Sheets'e kaydet
     */
    debouncedSaveToGoogleSheets: function(hour) {
        // Önceki timeout'u temizle
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Bekleyen veriyi güncelle
        this.pendingSaveData.set(hour, {
            ...this.currentData.records[hour],
            hour: hour
        });
        
        // 1.5 saniye sonra kaydet
        this.saveTimeout = setTimeout(() => {
            this.executePendingSaves();
        }, 1500);
    },
    
    /**
     * Bekleyen tüm kayıtları gerçekleştir
     */
    executePendingSaves: async function() {
        if (this.pendingSaveData.size === 0) return;
        
        // Tüm bekleyen kayıtları al
        const savesToExecute = new Map(this.pendingSaveData);
        this.pendingSaveData.clear();
        
        let successCount = 0;
        let errorCount = 0;
        
        // Her kaydı ayrı ayrı gönder
        for (const [hour, record] of savesToExecute) {
            try {
                await this.saveToGoogleSheets(hour, record);
                successCount++;
            } catch (error) {
                console.log(`❌ ${hour} kaydı hatalı:`, error);
                errorCount++;
            }
        }
        
        // Sonuç bildirimi
        if (successCount > 0 && errorCount === 0) {
            // Utils.showToast(`✅ ${successCount} veri Google Sheets'e kaydedildi!`, 'success');
        } else if (successCount > 0) {
            // Utils.showToast(`⚠️ ${successCount} veri kaydedildi, ${errorCount} hatalı`, 'warning');
        }
    },
    
    /**
     * Veriyi Google Sheets'e kaydet
     */
    saveToGoogleSheets: async function(hour, recordData = null) {
        try {
            // Demo modu kontrolü
            if (CONFIG.DEMO_MODE) {
                console.log('📋 Demo mod aktif - Google Sheets kaydı atlanıyor');
                return;
            }
            
            const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.saatlik;
            if (!url || url === 'BURAYA_YENI_URL_GELECEK') {
                console.log('❌ Saatlik enerji URL\'si yapılandırılmamış');
                return;
            }
            
            const record = recordData || this.currentData.records[hour];
            if (!record) {
                console.log('❌ Kayıt bulunamadı');
                return;
            }
            
            // SADECE 0'dan büyük değerler için kaydet
            const aktifDeger = parseFloat(record.aktif) || 0;
            const reaktifDeger = parseFloat(record.reaktif) || 0;
            
            if (aktifDeger === 0 && reaktifDeger === 0) {
                console.log('⏭️ 0 değerli kayıt Google Sheets\'e gönderilmiyor');
                return;
            }
            
            // ✅ DOĞRU ALAN ADLARI - Apps Script'teki parametrelerle birebir aynı!
            const sheetData = {
                action: 'save',
                module: 'saatlik',
                // timestamp: new Date().toISOString(), // Gerekli değil, data içinde var
                data: {
                    // Apps Script'in beklediği alan adları
                    ID: record.id || Date.now().toString(),
                    Tarih: this.currentData.date,
                    Vardiya: this.currentData.shift,      // ÇOK ÖNEMLİ!
                    Saat: hour,                           // ÇOK ÖNEMLİ!
                    'Aktif Enerji (MWh)': aktifDeger,     // Türkçe karakterli!
                    'Reaktif Enerji (kVArh)': reaktifDeger, // Türkçe karakterli!
                    Operator: (Auth?.getCurrentUser()?.username || Auth?.getCurrentUser()?.name || 'Bilinmeyen Kullanıcı'),
                    timestamp: record.timestamp || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };
            
            console.log('📤 Google Sheets\'e gönderiliyor (DÜZELTİLMİŞ):', sheetData);
            
            // FormData oluştur - Apps Script'in beklediği formatta
            const formData = new FormData();
            
            // Ana parametreler
            formData.append('action', sheetData.action);
            formData.append('module', sheetData.module);
            
            // Data objesini JSON string olarak ekle
            formData.append('data', JSON.stringify(sheetData.data));
            
            // İsteği gönder
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Google Sheets\'e kaydedildi:', result);
                    
                    // Başarılı kayıt sonrası ID'yi güncelle
                    if (result.id) {
                        this.currentData.records[hour].id = result.id;
                        // LocalStorage'ı güncelle
                        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
                        Utils.saveToStorage(storageKey, this.currentData.records);
                    }
                    
                    // Başarılı mesajı göster
                    if (Utils && Utils.showToast) {
                        Utils.showToast('✅ Veri Google Sheets\'e kaydedildi', 'success');
                    }
                } else {
                    console.log('❌ Google Sheets kayıt hatası:', result.error);
                    if (Utils && Utils.showToast) {
                        Utils.showToast('❌ Kayıt hatası: ' + result.error, 'error');
                    }
                }
            } else {
                console.log('❌ Google Sheets API hatası:', response.status);
                if (Utils && Utils.showToast) {
                    Utils.showToast('❌ API hatası: ' + response.status, 'error');
                }
            }
        } catch (error) {
            console.log('💥 Google Sheets kayıt hatası:', error);
            if (Utils && Utils.showToast) {
                Utils.showToast('❌ Bağlantı hatası: ' + error.message, 'error');
            }
        }
    },
    
    /**
     * Mevcut tarih ve saati ayarla
     */
    setCurrentDateTime: function() {
        const now = new Date();
        const dateInput = document.getElementById('hourly-date');
        const shiftSelect = document.getElementById('hourly-shift');
        
        // console.log('🕐 setCurrentDateTime çalışıyor:', {
        //     now: now,
        //     dateInput: dateInput,
        //     shiftSelect: shiftSelect
        // }); // Gizlendi
        
        // Tarihi bugün olarak ayarla
        if (dateInput) {
            const today = now.toISOString().split('T')[0];
            dateInput.value = today;
            this.currentData.date = today;
            // console.log(' Tarih ayarlandı:', today); // Gizlendi
        } else {
            console.log('❌ Tarih input bulunamadı');
        }
        
        // Vardiyayı otomatik ayarla
        if (shiftSelect) {
            const currentShift = this.getCurrentShift();
            shiftSelect.value = currentShift;
            this.currentData.shift = currentShift;
            // console.log('🔄 Vardiya ayarlandı:', currentShift); // Gizlendi
        } else {
            console.log('❌ Vardiya select bulunamadı');
        }
        
        // console.log('📊 Mevcut veri:', this.currentData); // Gizlendi
    },
    
    /**
     * Mevcut vardiyayı al
     */
    getCurrentShift: function() {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour >= 0 && hour < 8) return 'gece';
        if (hour >= 8 && hour < 16) return 'gunduz';
        return 'aksam'; // 16-24
    },
    
    /**
     * Vardiya verilerini yükle
     */
    loadShiftData: function(shift) {
        this.currentData.shift = shift;
        
        // Sadece güncel saati getir
        this.currentData.hours = this.getCurrentHour();
        
        // Başlıkları güncelle
        this.updateHeaders();
        
        // Kayıtları yükle (sadece localStorage'dan)
        this.loadSavedRecords();
        
        // Input durumlarını güncelle
        this.updateInputStates();
        
        // Toplamları hesapla
        this.calculateTotals();
        
        // Utils.showToast(`${this.SHIFT_TITLES[shift]} - güncel saat verisi yüklendi`, 'success');
    },
    
    /**
     * Sadece güncel saati getir
     */
    getCurrentHour: function() {
        const now = new Date();
        const hour = String(now.getHours()).padStart(2, '0') + ':00';
        return [hour]; // Sadece mevcut saati dizi olarak döndür
    },
    
    /**
     * Başlıkları güncelle (table-header kaldırıldı, input-card içinde gösteriliyor)
     */
    updateHeaders: function() {
        const currentHour = this.getCurrentHour()[0];
        
        // console.log('🔍 updateHeaders çalışıyor:', {
        //     currentHour: currentHour,
        //     shift: this.currentData.shift,
        //     shiftTitle: this.SHIFT_TITLES[this.currentData.shift]
        // }); // Gizlendi
        
        // Input kartının başlığını güncelle
        const inputHeader = document.querySelector('.input-header h3');
        if (inputHeader) {
            inputHeader.textContent = `📊 ${this.SHIFT_TITLES[this.currentData.shift]} - ${currentHour}`;
            // console.log('✅ Input header güncellendi'); // Gizlendi
        } else {
            console.log('❌ Input header bulunamadı');
        }
        
        // Tarih ve vardiya badge'lerini güncelle
        const dateBadge = document.querySelector('.date-badge');
        if (dateBadge) {
            dateBadge.textContent = CONFIG.formatDate(new Date(this.currentData.date));
            // console.log('✅ Date badge güncellendi'); // Gizlendi
        }
        
        const shiftBadge = document.querySelector('.shift-badge');
        if (shiftBadge) {
            shiftBadge.textContent = this.SHIFT_TIMES[this.currentData.shift];
            // console.log('✅ Shift badge güncellendi'); // Gizlendi
        }
        
        // Sayfa başlığını güncelleme (orijinal başlık kalsın)
        const pageHeader = document.querySelector('#saatlik-page .page-header h1');
        if (pageHeader) {
            console.log('✅ Sayfa başlığı korundu: "Saatlik Aktif ve Reaktif"');
        } else {
            console.log('❌ Sayfa başlığı bulunamadı');
        }
    },
    
    /**
     * Kayıtlı verileri yükle (localStorage + Google Sheets)
     */
    loadSavedRecords: function() {
        // console.log('📂 loadSavedRecords başlatıldı'); // Gizlendi
        // console.log('📊 Mevcut veri:', this.currentData); // Gizlendi
        
        // Google Sheets'ten veri çek
        this.loadGoogleSheetsRecords();
        
        // LocalStorage'dan yükle
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        // console.log('🔑 Storage key:', storageKey); // Gizlendi
        
        const savedData = Utils.loadFromStorage(storageKey, {});
        // console.log('💾 LocalStorage verisi:', savedData); // Gizlendi
        
        this.currentData.records = savedData;
        
        // Kayıt sayısını güncelle (null check ile)
        const savedCount = Object.keys(savedData).length;
        const recordCountElement = document.getElementById('record-count');
        if (recordCountElement) {
            recordCountElement.textContent = `${savedCount}/1 kayıt`; // Sadece 1 saat olduğu için 1/1
            // console.log('📈 Kayıt sayısı güncellendi:', savedCount); // Gizlendi
        }
        
        // Input durumlarını güncelle
        this.updateInputStates();
        
        // Input değerlerini güncelle
        this.currentData.hours.forEach(hour => {
            const record = savedData[hour];
            if (record) {
                console.log(`🔄 ${hour} saati için veri var:`, record);
                
                const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
                const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
                
                console.log(`🔍 Input'lar aranıyor: ${hour}`);
                console.log('Aktif input:', aktifInput);
                console.log('Reaktif input:', reaktifInput);
                
                if (aktifInput) {
                    aktifInput.value = record.aktif || '';
                    console.log(`✅ Aktif input güncellendi: ${record.aktif}`);
                } else {
                    console.log(`❌ Aktif input bulunamadı: ${hour}`);
                }
                
                if (reaktifInput) {
                    reaktifInput.value = record.reaktif || '';
                    console.log(`✅ Reaktif input güncellendi: ${record.reaktif}`);
                } else {
                    console.log(`❌ Reaktif input bulunamadı: ${hour}`);
                }
                
                // Durumu güncelle
                this.updateStatus(hour, record);
            } else {
                console.log(`📭 ${hour} saati için veri yok`);
            }
        });
        
        // console.log('✅ loadSavedRecords tamamlandı'); // Gizlendi
    },
    
    /**
     * Toplamları hesapla
     */
    calculateTotals: function() {
        let shiftAktifTotal = 0;
        let shiftReaktifTotal = 0;
        let dailyAktifTotal = 0;
        
        // Vardiya toplamları
        this.currentData.hours.forEach(hour => {
            const record = this.currentData.records[hour];
            if (record) {
                shiftAktifTotal += parseFloat(record.aktif) || 0;
                shiftReaktifTotal += parseFloat(record.reaktif) || 0;
            }
        });
        
        // Günlük toplam (tüm vardiyalar)
        ['gece', 'gunduz', 'aksam'].forEach(shift => {
            const storageKey = `hourly_${this.currentData.date}_${shift}`;
            const shiftData = Utils.loadFromStorage(storageKey, {});
            Object.values(shiftData).forEach(record => {
                dailyAktifTotal += parseFloat(record.aktif) || 0;
            });
        });
        
        // UI'ı güncelle (null check ile)
        const shiftAktifElement = document.getElementById('shift-aktif-total');
        if (shiftAktifElement) {
            shiftAktifElement.textContent = `${shiftAktifTotal.toFixed(3)} MWh`;
        }
        
        const shiftReaktifElement = document.getElementById('shift-reaktif-total');
        if (shiftReaktifElement) {
            shiftReaktifElement.textContent = `${shiftReaktifTotal.toFixed(3)} kVArh`;
        }
        
        const dailyAktifElement = document.getElementById('daily-aktif-total');
        if (dailyAktifElement) {
            dailyAktifElement.textContent = `${dailyAktifTotal.toFixed(3)} MWh`;
        }
    },
    
    /**
     * Durum göstergesini güncelle
     */
    updateStatus: function(hour, record) {
        const statusCell = document.querySelector(`[data-hour="${hour}"][data-field="status"]`);
        if (statusCell) {
            if (record && (record.aktif > 0 || record.reaktif > 0)) {
                statusCell.innerHTML = '<span class="status-saved">💾 Kaydedildi</span>';
                statusCell.className = 'status-saved';
            } else {
                statusCell.innerHTML = '<span class="status-empty">Boş</span>';
                statusCell.className = 'status-empty';
            }
        }
    },
    
    /**
     * Input durumunu güncelle (kilitli/açık)
     */
    updateInputStates: function() {
        const currentHour = this.getCurrentHour()[0];
        const record = this.currentData.records[currentHour];
        
        // Input'ları bul
        const aktifInput = document.querySelector(`[data-hour="${currentHour}"][data-field="aktif"]`);
        const reaktifInput = document.querySelector(`[data-hour="${currentHour}"][data-field="reaktif"]`);
        
        // Veri varsa kilitle, yoksa aç
        const hasData = record && (record.aktif > 0 || record.reaktif > 0);
        
        if (aktifInput) {
            aktifInput.disabled = hasData;
            aktifInput.style.opacity = hasData ? '0.6' : '1';
            aktifInput.style.cursor = hasData ? 'not-allowed' : 'text';
            
            // Veri varsa placeholder ile bilgi ver
            if (hasData) {
                aktifInput.placeholder = 'Kayıtlı veri (kilitli)';
            } else {
                aktifInput.placeholder = 'Aktif Enerji (MWh)';
            }
        }
        
        if (reaktifInput) {
            reaktifInput.disabled = hasData;
            reaktifInput.style.opacity = hasData ? '0.6' : '1';
            reaktifInput.style.cursor = hasData ? 'not-allowed' : 'text';
            
            // Veri varsa placeholder ile bilgi ver
            if (hasData) {
                reaktifInput.placeholder = 'Kayıtlı veri (kilitli)';
            } else {
                reaktifInput.placeholder = 'Reaktif Enerji (kVArh)';
            }
        }
        
        // Durum bilgisini logla
        // console.log(`🔒 Input durumu: ${hasData ? 'Kilitli' : 'Açık'} (${currentHour})`); // Gizlendi
        
        // Kullanıcı bilgilendirme
        if (hasData) {
            // Utils.showToast('⚠️ Bu saat için veri kayıtlı - Inputlar kilitlendi', 'warning');
        }
    },
    clearAllData: function() {
        if (confirm('Mevcut saat verisini temizlemek istediğinizden emin misiniz?')) {
            this.clearCurrentHour();
        }
    },
    
    /**
     * Mevcut saat verisini temizle
     */
    clearCurrentHour: function() {
        // Input'ları temizle
        document.querySelectorAll('.modern-input').forEach(input => {
            input.value = '';
        });
        
        // Mevcut saati temizle
        const currentHour = this.getCurrentHour()[0];
        this.updateStatus(currentHour, null);
        
        // LocalStorage'ı temizle
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        const savedData = Utils.loadFromStorage(storageKey, {});
        delete savedData[currentHour];
        Utils.saveToStorage(storageKey, savedData);
        
        // Mevcut veriyi temizle
        delete this.currentData.records[currentHour];
        
        // Toplamları güncelle
        this.calculateTotals();
        
        // Kayıt sayısını güncelle (null check ile)
        const recordCountElement = document.getElementById('record-count');
        if (recordCountElement) {
            recordCountElement.textContent = `0/1 kayıt`;
        }
        
        // Input durumlarını güncelle (açık olacak)
        this.updateInputStates();
        
        // Utils.showToast('Mevcut saat verisi temizlendi', 'info');
    },
    
    /**
     * Google Sheets kayıtlarını yükle (AKTİF)
     */
    loadGoogleSheetsRecords: async function() {
        try {
            // Demo modu kontrolü
            if (CONFIG.DEMO_MODE) {
                console.log('📋 Demo mod aktif - Google Sheets bağlantısı atlanıyor');
                // Utils.showToast('Demo mod: Google Sheets bağlantısı devre dışı', 'info');
                return;
            }
            
            const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.saatlik;
            if (!url || url === 'BURAYA_YENI_URL_GELECEK') {
                console.log('❌ Saatlik enerji URL\'si yapılandırılmamış');
                return;
            }
            
            // Tarih ve vardiya filtresi ile verileri çek
            const formData = new FormData();
            formData.append('action', 'get');
            formData.append('module', 'saatlik');
            formData.append('date', this.currentData.date);
            formData.append('shift', this.currentData.shift);
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data) {
                    this.processGoogleSheetsRecords(result.data);
                    // Utils.showToast(`Google Sheets'ten ${result.data.length} kayıt yüklendi`, 'success');
                } else {
                    console.log('❌ Google Sheets verisi alınamadı:', result.error);
                    // Utils.showToast('Google Sheets verileri alınamadı: ' + result.error, 'error');
                }
            } else {
                console.log('❌ Google Sheets API hatası:', response.status);
                // Utils.showToast('Google Sheets API hatası: ' + response.status, 'error');
            }
        } catch (error) {
            console.log('💥 Google Sheets genel hata:', error);
            // Utils.showToast('Google Sheets bağlantı hatası: ' + error.message, 'error');
        }
    },
    
    /**
     * Google Sheets kayıtlarını işle (AKTİF)
     */
    processGoogleSheetsRecords: function(data) {
        // console.log('📊 Google Sheets verileri işleniyor:', data); // Gizlendi
        
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        let savedData = Utils.loadFromStorage(storageKey, {});
        let hasMatchingRecord = false;
        
        // Aynı saat için en son kaydı tutmak için map kullan
        const latestRecords = new Map();
        
        data.forEach(record => {
            // console.log('🔍 Gelen kayıt:', record); // Gizlendi
            
            // Tarih ve saat kontrolü
            let recordDate = record.Tarih;
            let recordHour = record.Saat;
            
            // SADECE gerçek değeri olan kayıtları işle (0'dan büyük)
            const aktifDeger = parseFloat(record['Aktif Enerji (MWh)']) || parseFloat(record.Aktif) || 0;
            const reaktifDeger = parseFloat(record['Reaktif Enerji (kVArh)']) || parseFloat(record.Reaktif) || 0;
            
            // Eğer her iki değer de 0 ise, bu kaydı atla (boş kayıt)
            if (aktifDeger === 0 && reaktifDeger === 0) {
                console.log('⏭️ 0 değerli kayıt atlanıyor - ID:', record.ID);
                return;
            }
            
            // Saat boşsa veya geçersizse bu kaydı atla (elle girilmemiş)
            if (!recordHour || recordHour.trim() === '') {
                console.log('⏭️ Saati boş kayıt atlanıyor - ID:', record.ID);
                return;
            }
            
            // Tarih boşsa veya geçersizse bu kaydı atla
            if (!recordDate || recordDate.trim() === '') {
                console.log('⏭️ Tarihi boş kayıt atlanıyor - ID:', record.ID);
                return;
            }
            
            // Tarih formatını düzelt (DD/MM/YYYY -> YYYY-MM-DD)
            if (recordDate && recordDate.includes('.')) {
                const parts = recordDate.split('.');
                if (parts.length === 3) {
                    recordDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    console.log('📅 Tarih formatı düzeltildi:', recordDate);
                }
            }
            
            // console.log(`🔄 Eşleşme kontrolü: ${recordDate}=${this.currentData.date}, ${recordHour} saati`); // Gizlendi
            
            // Tarih eşleşmesi kontrolü
            if (recordDate === this.currentData.date) {
                // Saat formatını düzelt (HH:MM)
                if (recordHour && recordHour.includes('T')) {
                    try {
                        const date = new Date(recordHour);
                        recordHour = date.toTimeString().slice(0, 5);
                    } catch (error) {
                        console.log('⏰ Saat formatı düzeltilemedi:', recordHour);
                    }
                }
                
                // Aynı saat için daha önce kayıt varsa, timestamp'e göre en yenisini al
                const existingRecord = latestRecords.get(recordHour);
                const currentTimestamp = record['Kayıt Zamanı'] || record.timestamp;
                
                if (!existingRecord || (currentTimestamp > existingRecord.timestamp)) {
                    // Google Sheets verisini frontend formatına çevir
                    const frontendRecord = {
                        id: record.ID,
                        aktif: aktifDeger,
                        reaktif: reaktifDeger,
                        timestamp: currentTimestamp || new Date().toISOString(),
                        updatedAt: record['Güncelleme Zamanı'],
                        editedBy: record['Güncelleyen'],
                        originalTimestamp: record['Orijinal Kayıt Zamanı'],
                        originalOperator: record['Orijinal Operator'],
                        changes: record['Değiştirilen Değerler'],
                        operator: record.Operator || 'Bilinmeyen'
                    };
                    
                    console.log(`🔄 ${recordHour} saati için işlenmiş veri:`, frontendRecord);
                    latestRecords.set(recordHour, frontendRecord);
                    hasMatchingRecord = true;
                }
            }
        });
        
        // En son kayıtları savedData'ya aktar
        latestRecords.forEach((frontendRecord, recordHour) => {
            savedData[recordHour] = frontendRecord;
            this.currentData.records[recordHour] = frontendRecord;
            
            // Input değerlerini GÜNCELLE
            const aktifInput = document.querySelector(`[data-hour="${recordHour}"][data-field="aktif"]`);
            const reaktifInput = document.querySelector(`[data-hour="${recordHour}"][data-field="reaktif"]`);
            
            if (aktifInput) {
                aktifInput.value = frontendRecord.aktif || '';
                console.log(`✅ Aktif input güncellendi: ${frontendRecord.aktif}`);
            }
            
            if (reaktifInput) {
                reaktifInput.value = frontendRecord.reaktif || '';
                console.log(`✅ Reaktif input güncellendi: ${frontendRecord.reaktif}`);
            }
            
            // Durumu güncelle
            this.updateStatus(recordHour, frontendRecord);
        });
        
        // LocalStorage'a kaydet
        Utils.saveToStorage(storageKey, savedData);
        
        // Kayıt sayısını güncelle
        const savedCount = Object.keys(this.currentData.records).length;
        const recordCountElement = document.getElementById('record-count');
        if (recordCountElement) {
            recordCountElement.textContent = `${savedCount}/1 kayıt`;
        }
        
        // Toplamları güncelle
        this.calculateTotals();
        
        // Input durumlarını güncelle
        this.updateInputStates();
        
        if (hasMatchingRecord) {
            // console.log(`✅ ${latestRecords.size} geçerli kayıt yüklendi`); // Gizlendi
        } else {
            // console.log(`⚠️ Eşleşen kayıt bulunamadı`); // Gizlendi
        }
    }
};

// Başlat
document.addEventListener('DOMContentLoaded', () => {
    EnerjiModulu.init();
});
