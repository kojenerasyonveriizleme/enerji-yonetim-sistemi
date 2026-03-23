/**
 * KOJENERASYON TAKIP SISTEMI - BAKIM TAKIBI MODULU
 * Periyodik, normal ve arıza bakımlarını yönetir
 */

const BakimTakibi = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.checkAdminAccess();
        this.loadStatistics();
        this.setupEventListeners();
    },

    /**
     * Admin erişimini kontrol et
     */
    checkAdminAccess: function() {
        // LocalStorage'dan admin durumunu kontrol et
        const isAdmin = Utils.loadFromStorage('admin_status', false);
        this.isAdmin = isAdmin;

        if (this.isAdmin) {
            this.showMaintenanceCards();
        } else {
            this.showAdminLock();
        }
    },

    /**
     * Admin giriş kontrolü
     */
    checkAdmin: function() {
        const password = prompt('Admin şifresini girin:');
        
        if (password === 'admin123') {
            this.isAdmin = true;
            Utils.saveToStorage('admin_status', true);
            Utils.showToast('Admin girişi başarılı', 'success');
            this.showMaintenanceCards();
            this.loadStatistics();
        } else if (password !== null) {
            Utils.showToast('Yanlış şifre', 'error');
        }
    },

    /**
     * Bakım kartlarını göster
     */
    showMaintenanceCards: function() {
        const adminCheck = document.getElementById('admin-check');
        const maintenanceCards = document.querySelector('.maintenance-cards');
        
        if (adminCheck) {
            adminCheck.style.display = 'none';
        }
        if (maintenanceCards) {
            maintenanceCards.style.display = 'grid';
        }
    },

    /**
     * Admin kilidini göster
     */
    showAdminLock: function() {
        const adminCheck = document.getElementById('admin-check');
        const maintenanceCards = document.querySelector('.maintenance-cards');
        
        if (adminCheck) {
            adminCheck.style.display = 'flex';
        }
        if (maintenanceCards) {
            maintenanceCards.style.display = 'none';
        }
    },

    /**
     * Periyodik bakım modal'ını aç
     */
    openPeriodik: function() {
        if (!this.isAdmin) {
            Utils.showToast('Admin yetkisi gerekiyor', 'warning');
            return;
        }

        // Modal veya yeni sayfa açılacak
        this.showMaintenanceModal('periodik');
    },

    /**
     * Normal bakım modal'ını aç
     */
    openNormal: function() {
        if (!this.isAdmin) {
            Utils.showToast('Admin yetkisi gerekiyor', 'warning');
            return;
        }

        this.showMaintenanceModal('normal');
    },

    /**
     * Arıza bakım modal'ını aç
     */
    openAriza: function() {
        if (!this.isAdmin) {
            Utils.showToast('Admin yetkisi gerekiyor', 'warning');
            return;
        }

        this.showMaintenanceModal('ariza');
    },

    /**
     * Bakım modal'ını göster
     */
    showMaintenanceModal: function(type) {
        // Modal HTML'i oluştur
        const modal = this.createMaintenanceModal(type);
        document.body.appendChild(modal);
        
        // Modal'ı göster
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Event listener'ları ekle
        this.setupModalEvents(modal, type);
        
        // Dosya yükleme event listener'larını ekle
        setTimeout(() => {
            this.setupFileUploadEvents(type);
        }, 100);
    },

    /**
     * Bakım modal'ı oluştur
     */
    createMaintenanceModal: function(type) {
        const modal = document.createElement('div');
        modal.className = 'maintenance-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="BakimTakibi.closeModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${this.getModalTitle(type)}</h2>
                    <button class="modal-close" onclick="BakimTakibi.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    ${this.getModalContent(type)}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="BakimTakibi.closeModal()">Kapat</button>
                    <button type="button" class="btn-primary" onclick="BakimTakibi.saveMaintenance('${type}')">Kaydet</button>
                </div>
            </div>
        `;
        return modal;
    },

    /**
     * Modal başlığı al
     */
    getModalTitle: function(type) {
        const titles = {
            'periodik': '🔄 Periyodik Bakım',
            'normal': '🔧 Normal Bakım',
            'ariza': '⚠️ Arıza Bakım'
        };
        return titles[type] || 'Bakım';
    },

    /**
     * Modal içeriği al
     */
    getModalContent: function(type) {
        let additionalFields = '';
        
        if (type === 'periodik') {
            additionalFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Başlangıç Tarihi</label>
                        <input type="date" id="baslangicTarihi-${type}" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Bitiş Tarihi</label>
                        <input type="date" id="bitisTarihi-${type}" style="color: black;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Başlangıç Saati</label>
                        <input type="time" id="baslangicSaati-${type}" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Bitiş Saati</label>
                        <input type="time" id="bitisSaati-${type}" style="color: black;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Maliyet (₺)</label>
                        <input type="number" id="maliyet-${type}" placeholder="0.00" step="0.01" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Sonraki Bakım Tarihi</label>
                        <input type="date" id="sonrakiTarih-${type}" style="color: black;">
                    </div>
                </div>
            `;
        } else if (type === 'normal') {
            additionalFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Başlangıç Tarihi</label>
                        <input type="date" id="baslangicTarihi-${type}" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Bitiş Tarihi</label>
                        <input type="date" id="bitisTarihi-${type}" style="color: black;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Başlangıç Saati</label>
                        <input type="time" id="baslangicSaati-${type}" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Bitiş Saati</label>
                        <input type="time" id="bitisSaati-${type}" style="color: black;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Maliyet (₺)</label>
                        <input type="number" id="maliyet-${type}" placeholder="0.00" step="0.01" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Parça Listesi</label>
                        <input type="text" id="parcalar-${type}" placeholder="Kullanılan parçaları girin..." style="color: black;">
                    </div>
                </div>
                <!-- Dinamik Input Alanları -->
                <div id="dynamic-fields-${type}" class="dynamic-fields">
                    <!-- Bakım tipine göre dinamik alanlar buraya eklenecek -->
                </div>
            `;
        } else if (type === 'ariza') {
            additionalFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Başlangıç Tarihi</label>
                        <input type="date" id="baslangicTarihi-${type}" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Bitiş Tarihi</label>
                        <input type="date" id="bitisTarihi-${type}" style="color: black;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Başlangıç Saati</label>
                        <input type="time" id="baslangicSaati-${type}" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Bitiş Saati</label>
                        <input type="time" id="bitisSaati-${type}" style="color: black;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Maliyet (₺)</label>
                        <input type="number" id="maliyet-${type}" placeholder="0.00" step="0.01" style="color: black;">
                    </div>
                    <div class="form-group">
                        <label>Arıza Nedeni</label>
                        <input type="text" id="arizaNedeni-${type}" placeholder="Arıza nedenini belirtin..." style="color: black;">
                    </div>
                </div>
                <div class="form-group">
                    <label>Önleyici Önlemler</label>
                    <textarea id="onlemler-${type}" rows="2" placeholder="Tekrar olmaması için önlemler..." style="color: black;"></textarea>
                </div>
            `;
        }

        return `
            <form id="maintenance-form-${type}" class="maintenance-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>${type === 'periodik' ? 'Planlanan Tarih' : (type === 'normal' ? 'Talep Tarihi' : 'Arıza Tarihi')}</label>
                        <input type="date" id="tarih-${type}" required>
                    </div>
                    <div class="form-group">
                        <label>Ekipman</label>
                        <select id="motor-${type}" required onchange="BakimTakibi.onBakimTipiChange('${type}')">
                            <option value="">Seçiniz</option>
                            <option value="GM1">GM1 - JENBACH 1</option>
                            <option value="GM2">GM2 - JENBACH 2</option>
                            <option value="GM3">GM3 - JENBACH 3</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Durum</label>
                        <select id="durum-${type}" required>
                            <option value="">Seçiniz</option>
                            ${this.getStatusOptions(type)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${type === 'periodik' ? 'Bakım Saati' : (type === 'normal' ? 'Bakım Tipi' : 'Öncelik')}</label>
                        <select id="oncelik-${type}" onchange="BakimTakibi.onBakimTipiChange('${type}')">
                            ${type === 'periodik' ? this.getBakimSaatiOptions() : (type === 'normal' ? this.getBakimTipiOptions() : this.getOncelikOptions())}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>${type === 'ariza' ? 'Arıza Açıklaması' : 'Açıklama'}</label>
                    <textarea id="${type === 'ariza' ? 'arizaAciklamasi-' + type : 'aciklama-' + type}" rows="4" placeholder="${type === 'ariza' ? 'Arıza detaylarını girin...' : 'Bakım açıklamasını girin...'}" style="color: black;"></textarea>
                </div>
                <div class="form-group">
                    <label>${type === 'ariza' ? 'Çözüm Açıklaması' : 'Yapılan İşlemler'}</label>
                    <textarea id="${type === 'ariza' ? 'cozumAciklamasi-' + type : 'islemler-' + type}" rows="3" placeholder="${type === 'ariza' ? 'Uygulanan çözümü girin...' : 'Yapılan işlemleri girin...'}" style="color: black;"></textarea>
                </div>
                <div class="form-group">
                    <label>Sorumlu Personel</label>
                    <input type="text" id="personel-${type}" placeholder="Sorumlu personeli girin..." style="color: black;">
                </div>
                <div class="form-group file-upload-group">
                    <label>📎 Belge / Resim / Dosya Yükle</label>
                    <div class="file-upload-area" id="file-upload-area-${type}">
                        <input type="file" id="dosya-${type}" name="dosya" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.xls,.xlsx,.txt" style="display: none;">
                        <div class="file-upload-trigger" onclick="document.getElementById('dosya-${type}').click()">
                            <span class="upload-icon">📁</span>
                            <span class="upload-text">Dosya seçmek için tıklayın veya sürükleyin</span>
                            <span class="upload-hint">PDF, Word, Excel, Resim (max 10MB)</span>
                        </div>
                        <div class="file-list" id="file-list-${type}"></div>
                    </div>
                </div>
                
                ${additionalFields}
            </form>
        `;
    },

    /**
     * Durum seçeneklerini al
     */
    getStatusOptions: function(type) {
        if (type === 'periodik') {
            return `
                <option value="planlandi">Planlandı</option>
                <option value="devam">Devam Ediyor</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="ertelendi">Ertelendi</option>
            `;
        } else if (type === 'normal') {
            return `
                <option value="talep_edildi">Talep Edildi</option>
                <option value="planlandi">Planlandı</option>
                <option value="devam">Devam Ediyor</option>
                <option value="tamamlandi">Tamamlandı</option>
            `;
        } else if (type === 'ariza') {
            return `
                <option value="kaydedildi">Kaydedildi</option>
                <option value="inceleniyor">İnceleniyor</option>
                <option value="cozuluyor">Çözülüyor</option>
                <option value="cozuldu">Çözüldü</option>
                <option value="devam">Devam Ediyor</option>
            `;
        }
        return '';
    },

    /**
     * Bakım saati seçeneklerini al
     */
    getBakimSaatiOptions: function() {
        return `
            <option value="2000">2000</option>
            <option value="6000">6000</option>
            <option value="10000">10000</option>
            <option value="20000">20000</option>
            <option value="30000">30000</option>
        `;
    },

    /**
     * Bakım tipi seçeneklerini al
     */
    getBakimTipiOptions: function() {
        return `
            <option value="yag_numunesi_alimi">Yağ Numunesi Alımı</option>
            <option value="gresleme">Gresleme</option>
            <option value="yag_ve_filtre_degisimi">Yağ ve Filtre Değişimi</option>
            <option value="temizlik">Temizlik</option>
            <option value="dis_filtre_degisimi">Dış Filtre Değişimi</option>
            <option value="antifriz_olcum">Antifriz Ölçüm</option>
            <option value="ht_suyu_degisimi">HT Suyu Değişimi</option>
            <option value="lt_suyu_degisimi">LT Suyu Değişimi</option>
            <option value="ceket_suyu_degisimi">Çeket Suyu Değişimi</option>
        `;
    },

    /**
     * Öncelik seçeneklerini al
     */
    getOncelikOptions: function() {
        return `
            <option value="dusuk">Düşük</option>
            <option value="orta">Orta</option>
            <option value="yuksek">Yüksek</option>
            <option value="kritik">Kritik</option>
        `;
    },

    /**
     * Bakım tipi değiştiğinde dinamik alanları güncelle
     */
    onBakimTipiChange: function(type) {
        if (type !== 'normal') return;
        
        const bakimTipi = document.getElementById(`oncelik-${type}`).value;
        const dynamicFields = document.getElementById(`dynamic-fields-${type}`);
        
        if (!dynamicFields) return;
        
        let fieldsHtml = '';
        
        switch (bakimTipi) {
            case 'yag_numunesi_alimi':
                fieldsHtml = `
                    <div class="form-row">
                        <div class="form-group">
                            <label>Şişe Barkod No</label>
                            <input type="text" id="sise_barkod_no-${type}" placeholder="Şişe barkod numarasını girin..." style="color: black;">
                        </div>
                        <div class="form-group">
                            <label>Su Miktarı</label>
                            <input type="number" id="su_miktari-${type}" placeholder="Su miktarını girin..." step="0.01" style="color: black;">
                        </div>
                    </div>
                `;
                break;
                
            case 'gresleme':
                fieldsHtml = `
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ön Rulman CM³</label>
                            <input type="number" id="on_rulman_cm3-${type}" placeholder="Ön rulman cm³ değerini girin..." step="0.01" style="color: black;">
                        </div>
                        <div class="form-group">
                            <label>Arka Rulman CM³</label>
                            <input type="number" id="arka_rulman_cm3-${type}" placeholder="Arka rulman cm³ değerini girin..." step="0.01" style="color: black;">
                        </div>
                    </div>
                `;
                break;
                
            case 'antifriz_olcum':
                fieldsHtml = `
                    <div class="form-row">
                        <div class="form-group">
                            <label>HT Sıcaklığı (°C)</label>
                            <input type="number" id="ht_sicaklik-${type}" placeholder="HT sıcaklığını girin..." step="0.1" style="color: black;">
                        </div>
                        <div class="form-group">
                            <label>LT Sıcaklığı (°C)</label>
                            <input type="number" id="lt_sicaklik-${type}" placeholder="LT sıcaklığını girin..." step="0.1" style="color: black;">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Çeket Suyu Sıcaklığı (°C)</label>
                            <input type="number" id="ceket_suyu_sicaklik-${type}" placeholder="Çeket suyu sıcaklığını girin..." step="0.1" style="color: black;">
                        </div>
                        <div class="form-group">
                            <label>Antifriz Sıcaklığı (°C)</label>
                            <input type="number" id="antifriz_sicaklik-${type}" placeholder="Antifriz sıcaklığını girin..." step="0.1" style="color: black;">
                        </div>
                    </div>
                `;
                break;
                
            default:
                fieldsHtml = '';
                break;
        }
        
        dynamicFields.innerHTML = fieldsHtml;
    },

    /**
     * Modal event listener'larını kur
     */
    setupModalEvents: function(modal, type) {
        // Form submit olayını engelle
        const form = modal.querySelector(`#maintenance-form-${type}`);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMaintenance(type);
            });
        }

        // Escape tuşu ile kapatma
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    },

    /**
     * Bakım kaydet
     */
    saveMaintenance: function(type) {
        const form = document.getElementById(`maintenance-form-${type}`);
        if (!form) return;

        // Kaydetme butonunu bul ve loading state'e geçir
        const saveBtn = document.querySelector(`button[onclick="BakimTakibi.saveMaintenance('${type}')"]`);
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="loading-spinner"></span> Kaydediliyor...';
        }

        // Modüle göre veri hazırlama
        let formData = {};
        let module = type; // periodik, normal, ariza

        if (type === 'periodik') {
            formData = {
                ekipman: document.getElementById(`motor-${type}`).value,
                planlananTarih: document.getElementById(`tarih-${type}`).value,
                baslangicTarihi: document.getElementById(`baslangicTarihi-${type}`).value,
                bitisTarihi: document.getElementById(`bitisTarihi-${type}`).value,
                baslangicSaati: document.getElementById(`baslangicSaati-${type}`).value,
                bitisSaati: document.getElementById(`bitisSaati-${type}`).value,
                durum: document.getElementById(`durum-${type}`).value,
                oncelik: document.getElementById(`oncelik-${type}`).value,
                aciklama: document.getElementById(`aciklama-${type}`).value,
                islemler: document.getElementById(`islemler-${type}`).value,
                sorumluPersonel: document.getElementById(`personel-${type}`).value,
                maliyet: document.getElementById(`maliyet-${type}`).value,
                sonrakiBakimTarihi: document.getElementById(`sonrakiTarih-${type}`).value,
                dosyalar: this.uploadedFiles[type] || [],
                recordedBy: 'admin'
            };
        } else if (type === 'normal') {
            formData = {
                ekipman: document.getElementById(`motor-${type}`).value,
                talepTarihi: document.getElementById(`tarih-${type}`).value,
                baslangicTarihi: document.getElementById(`baslangicTarihi-${type}`).value,
                bitisTarihi: document.getElementById(`bitisTarihi-${type}`).value,
                baslangicSaati: document.getElementById(`baslangicSaati-${type}`).value,
                bitisSaati: document.getElementById(`bitisSaati-${type}`).value,
                durum: document.getElementById(`durum-${type}`).value,
                oncelik: document.getElementById(`oncelik-${type}`).value,
                aciklama: document.getElementById(`aciklama-${type}`).value,
                yapanIslemler: document.getElementById(`islemler-${type}`).value,
                sorumluPersonel: document.getElementById(`personel-${type}`).value,
                maliyet: document.getElementById(`maliyet-${type}`).value,
                parcaListesi: document.getElementById(`parcalar-${type}`).value,
                // Dinamik alanlar
                siseBarkodNo: document.getElementById('sise_barkod_no-normal')?.value || '',
                suMiktari: document.getElementById('su_miktari-normal')?.value || '',
                onRulmanCm3: document.getElementById('on_rulman_cm3-normal')?.value || '',
                arkaRulmanCm3: document.getElementById('arka_rulman_cm3-normal')?.value || '',
                htSicaklik: document.getElementById('ht_sicaklik-normal')?.value || '',
                ltSicaklik: document.getElementById('lt_sicaklik-normal')?.value || '',
                ceketSuyuSicaklik: document.getElementById('ceket_suyu_sicaklik-normal')?.value || '',
                antifrizSicaklik: document.getElementById('antifriz_sicaklik-normal')?.value || '',
                dosyalar: this.uploadedFiles[type] || [],
                recordedBy: 'admin'
            };
        } else if (type === 'ariza') {
            formData = {
                ekipman: document.getElementById(`motor-${type}`).value,
                arizaTarihi: document.getElementById(`tarih-${type}`).value,
                baslangicTarihi: document.getElementById(`baslangicTarihi-${type}`).value,
                bitisTarihi: document.getElementById(`bitisTarihi-${type}`).value,
                baslangicSaati: document.getElementById(`baslangicSaati-${type}`).value,
                bitisSaati: document.getElementById(`bitisSaati-${type}`).value,
                durum: document.getElementById(`durum-${type}`).value,
                oncelik: document.getElementById(`oncelik-${type}`).value,
                arizaAciklamasi: document.getElementById(`arizaAciklamasi-${type}`).value,
                cozumAciklamasi: document.getElementById(`cozumAciklamasi-${type}`).value,
                sorumluPersonel: document.getElementById(`personel-${type}`).value,
                maliyet: document.getElementById(`maliyet-${type}`).value,
                arizaNedeni: document.getElementById(`arizaNedeni-${type}`).value,
                onleyiciOnlemler: document.getElementById(`onlemler-${type}`).value,
                dosyalar: this.uploadedFiles[type] || [],
                recordedBy: 'admin'
            };
        }

        // Validasyon
        if (!formData.ekipman || !formData.durum) {
            Utils.showToast('Lütfen zorunlu alanları doldurun', 'warning');
            // Butonu eski haline getir
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Kaydet';
            }
            return;
        }

        // Google Sheets'e kaydet
        if (!CONFIG.DEMO_MODE && window.GoogleSheetsAPI) {
            GoogleSheetsAPI.saveData(module, formData)
                .then(result => {
                    if (result.success) {
                        Utils.showToast(`${type} bakım kaydı başarıyla eklendi`, 'success');
                        this.closeModal();
                        this.loadStatistics();
                    } else {
                        Utils.showToast('Hata: ' + result.error, 'error');
                    }
                    // Butonu eski haline getir
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Kaydet';
                    }
                })
                .catch(error => {
                    console.error('Bakım kaydetme hatası:', error);
                    Utils.showToast('Bakım kaydedilemedi. Lütfen tekrar deneyin.', 'error');
                    // Butonu eski haline getir
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Kaydet';
                    }
                });
        } else {
            // Demo modunda simülasyon
            setTimeout(() => {
                Utils.showToast('Demo modunda simülasyon kaydedildi', 'info');
                this.closeModal();
                this.loadStatistics();
                // Butonu eski haline getir
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = 'Kaydet';
                }
            }, 1000);
        }
    },

    /**
     * Bakım düzenle
     */
    editMaintenance: function(type, id) {
        // Düzenleme fonksiyonu
        Utils.showToast('Düzenleme özelliği yakında eklenecek', 'info');
    },

    /**
     * Bakım sil
     */
    deleteMaintenance: function(type, id) {
        if (!confirm('Bu bakım kaydını silmek istediğinize emin misiniz?')) {
            return;
        }

        // Google Sheets'ten sil
        if (!CONFIG.DEMO_MODE && window.GoogleSheetsAPI) {
            GoogleSheetsAPI.deleteData(type, id)
                .then(result => {
                    if (result.success) {
                        Utils.showToast('Bakım kaydı silindi', 'success');
                        this.closeModal();
                        this.openMaintenanceModal(type);
                        this.loadStatistics();
                    } else {
                        Utils.showToast('Hata: ' + result.error, 'error');
                    }
                })
                .catch(error => {
                    console.error('Bakım silme hatası:', error);
                    Utils.showToast('Bakım silinemedi. Lütfen tekrar deneyin.', 'error');
                });
        } else {
            // Demo modunda simülasyon
            Utils.showToast('Demo modunda simülasyon silindi', 'info');
            this.closeModal();
            this.openMaintenanceModal(type);
            this.loadStatistics();
        }
    },

    /**
     * Modal'ı kapat
     */
    closeModal: function() {
        const modal = document.querySelector('.maintenance-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
    },

    /**
     * İstatistikleri yükle - Her bakım türü için ayrı ayrı
     */
    loadStatistics: function() {
        if (!this.isAdmin) return;

        if (!CONFIG.DEMO_MODE && window.GoogleSheetsAPI) {
            // Her bakım türü için ayrı istatistik çek
            Promise.all([
                this.loadStatsByType('periodik'),
                this.loadStatsByType('normal'),
                this.loadStatsByType('ariza')
            ]).then(() => {
                // Tüm istatistikler yüklendikten sonra devam eden bakımları yükle
                this.loadOngoingMaintenance();
            }).catch(error => {
                console.error('İstatistikler yüklenirken hata:', error);
                this.loadOngoingMaintenance();
            });
        } else {
            // Demo modunda simülasyon
            document.getElementById('periodik-count').textContent = '3';
            document.getElementById('periodik-completed').textContent = '12';
            document.getElementById('normal-count').textContent = '2';
            document.getElementById('normal-pending').textContent = '5';
            document.getElementById('ariza-count').textContent = '1';
            document.getElementById('ariza-resolved').textContent = '8';
            this.loadOngoingMaintenance();
        }
    },

    /**
     * Belirli bir bakım türü için istatistikleri yükle
     */
    loadStatsByType: function(type) {
        return new Promise((resolve, reject) => {
            GoogleSheetsAPI.getData(type, { action: 'get_stats' })
                .then(result => {
                    if (result.success && result.stats) {
                        const stats = result.stats;
                        
                        if (type === 'periodik') {
                            // Periyodik: Planlı bakım + Tamamlanan
                            document.getElementById('periodik-count').textContent = stats.planlandi || 0;
                            document.getElementById('periodik-completed').textContent = stats.tamamlandi || 0;
                        } else if (type === 'normal') {
                            // Normal: Aktif bakım + Bekleyen
                            document.getElementById('normal-count').textContent = stats.devam || 0;
                            document.getElementById('normal-pending').textContent = stats.planlandi || 0;
                        } else if (type === 'ariza') {
                            // Arıza: Aktif arıza + Çözülen
                            document.getElementById('ariza-count').textContent = stats.devam || 0;
                            document.getElementById('ariza-resolved').textContent = stats.tamamlandi || 0;
                        }
                        
                        console.log(`${type} istatistikleri:`, stats);
                    }
                    resolve();
                })
                .catch(error => {
                    console.error(`${type} istatistik hatası:`, error);
                    resolve(); // Hata olsa bile devam et
                });
        });
    },

    /**
     * Devam eden bakımları yükle
     */
    loadOngoingMaintenance: function() {
        if (!this.isAdmin) return;

        // Periyodik bakımları yükle
        this.loadOngoingByType('periodik', 'periodik-ongoing-list');
        
        // Normal bakımları yükle
        this.loadOngoingByType('normal', 'normal-ongoing-list');
        
        // Arıza bakımlarını yükle
        this.loadOngoingByType('ariza', 'ariza-ongoing-list');
    },

    /**
     * Belirli bir türdeki devam eden bakımları yükle
     */
    loadOngoingByType: function(type, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!CONFIG.DEMO_MODE && window.GoogleSheetsAPI) {
            // Devam eden bakımları çek
            GoogleSheetsAPI.getData(type, { status: 'devam' })
                .then(result => {
                    if (result.success && result.data && result.data.length > 0) {
                        this.renderOngoingList(container, result.data, type);
                    } else {
                        container.innerHTML = '<div class="no-data">Devam eden kayıt bulunmamaktadır.</div>';
                    }
                })
                .catch(error => {
                    console.error(`${type} devam eden bakımlar çekme hatası:`, error);
                    container.innerHTML = '<div class="no-data">Veriler yüklenemedi.</div>';
                });
        } else {
            // Demo modunda örnek veriler
            const demoData = [
                {
                    id: 'demo-1',
                    ekipman: type === 'ariza' ? 'GM1' : 'GM2',
                    [type === 'periodik' ? 'planlananTarih' : type === 'normal' ? 'talepTarihi' : 'arizaTarihi']: '2026-03-22',
                    baslangicTarihi: '2026-03-22',
                    bitisTarihi: '',
                    durum: 'devam',
                    aciklama: `Demo ${type} bakım kaydı`
                }
            ];
            this.renderOngoingList(container, demoData, type);
        }
    },

    /**
     * Devam eden bakımları listele - Tıklanabilir öğeler
     */
    renderOngoingList: function(container, data, type) {
        container.innerHTML = '';
        
        data.forEach(item => {
            // Tarih alanını belirle
            const dateField = type === 'periodik' ? 'planlananTarih' : type === 'normal' ? 'talepTarihi' : 'arizaTarihi';
            const date = item[dateField] || item.baslangicTarihi || '-';
            
            // Ekipman ve bakım tipi bilgisi
            const ekipman = item.ekipman || item.Ekipman || 'Belirsiz';
            const durum = item.durum || item.Durum || 'devam';
            const bakimTipi = item.oncelik || item['Bakım Tipi'] || item['Bakım Saati'] || '';
            
            // Periyodik bakım için saat bilgisi ekle (2000, 6000 vs)
            let bakimDetay = '';
            if (type === 'periodik' && bakimTipi) {
                bakimDetay = ` - ${bakimTipi} Saat`;
            } else if (type === 'normal' && bakimTipi) {
                bakimDetay = ` - ${bakimTipi}`;
            }
            
            // Açıklama alanını kontrol et
            let aciklama = item.aciklama || item.Açıklama || item['Arıza Açıklaması'] || '';
            if (!aciklama || aciklama === 'undefined') {
                aciklama = 'Açıklama yok';
            }
            
            // ID kontrolü
            const itemId = item.id || item.ID || '';
            
            // Tüm veriyi JSON olarak sakla
            const itemData = encodeURIComponent(JSON.stringify(item));
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'maintenance-item clickable';
            itemDiv.style.cursor = 'pointer';
            itemDiv.onclick = () => this.openEditModal(type, itemId, item);
            itemDiv.innerHTML = `
                <div class="maintenance-item-header">
                    <span class="maintenance-equipment">${ekipman}${bakimDetay}</span>
                    <span class="maintenance-status ${durum}">${durum}</span>
                </div>
                <div class="maintenance-details">
                    <div>📅 ${date}</div>
                    <div>📝 ${aciklama}</div>
                </div>
                <div class="maintenance-hint" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px; text-align: center;">
                    Düzenlemek için tıklayın
                </div>
            `;
            container.appendChild(itemDiv);
        });
    },

    /**
     * Düzenleme modal'ını aç
     */
    openEditModal: function(type, id, itemData) {
        // Mevcut modal'ı kapat
        this.closeModal();
        
        // Veriyi parse et
        const item = itemData;
        
        // Modal başlığını belirle
        const titles = {
            periodik: 'Periyodik Bakım Düzenle',
            normal: 'Normal Bakım Düzenle',
            ariza: 'Arıza Bakım Düzenle'
        };
        
        // Ekipman bilgisi
        const ekipman = item.ekipman || item.Ekipman || 'Belirsiz';
        const bakimTipi = item.oncelik || item['Bakım Tipi'] || item['Bakım Saati'] || '';
        let detay = '';
        if (type === 'periodik' && bakimTipi) {
            detay = ` - ${bakimTipi} Saat`;
        } else if (type === 'normal' && bakimTipi) {
            detay = ` - ${bakimTipi}`;
        }
        
        // Mevcut açıklama
        const mevcutAciklama = item.aciklama || item.Açıklama || item['Arıza Açıklaması'] || '';
        
        // Modal içeriği oluştur
        const modalContent = `
            <div class="modal-header">
                <h3>${titles[type]}</h3>
                <button class="btn-close" onclick="BakimTakibi.closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="equipment-info" style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <strong>Ekipman:</strong> ${ekipman}${detay}<br>
                    <strong>Kayıt ID:</strong> ${id}
                </div>
                
                <form id="edit-form-${type}" onsubmit="event.preventDefault();">
                    <div class="form-group">
                        <label for="edit-bitis-tarihi">Bitiş Tarihi *</label>
                        <input type="date" id="edit-bitis-tarihi" name="bitisTarihi" 
                               value="${item.bitisTarihi || item['Bitiş Tarihi'] || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-bitis-saati">Bitiş Saati</label>
                        <input type="time" id="edit-bitis-saati" name="bitisSaati" 
                               value="${item.bitisSaati || item['Bitiş Saati'] || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-aciklama">Açıklama / Yapılan İşlemler</label>
                        <textarea id="edit-aciklama" name="aciklama" rows="4" 
                                  placeholder="Yapılan işlemleri ve açıklamaları girin...">${mevcutAciklama}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-sorumlu">Sorumlu Personel</label>
                        <input type="text" id="edit-sorumlu" name="sorumluPersonel" 
                               value="${item.sorumluPersonel || item['Sorumlu Personel'] || item.sorumlu || ''}" 
                               placeholder="Sorumlu personel adı">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-maliyet">Maliyet (TL)</label>
                        <input type="number" id="edit-maliyet" name="maliyet" 
                               value="${item.maliyet || item.Maliyet || ''}" 
                               placeholder="0.00" step="0.01">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="BakimTakibi.closeModal()">İptal</button>
                <button type="button" class="btn-primary" id="btn-save-edit" 
                        onclick="BakimTakibi.saveEdit('${type}', '${id}')">
                    Güncelle
                </button>
            </div>
        `;
        
        // Modal oluştur
        const modal = document.createElement('div');
        modal.className = 'maintenance-modal edit-modal';
        modal.innerHTML = modalContent;
        
        document.body.appendChild(modal);
        
        // Animasyon ile göster
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    },

    /**
     * Düzenlemeyi kaydet
     */
    saveEdit: function(type, id) {
        const form = document.getElementById(`edit-form-${type}`);
        if (!form) return;
        
        // Form verilerini al
        const bitisTarihi = document.getElementById('edit-bitis-tarihi')?.value;
        const bitisSaati = document.getElementById('edit-bitis-saati')?.value;
        const aciklama = document.getElementById('edit-aciklama')?.value;
        const sorumlu = document.getElementById('edit-sorumlu')?.value;
        const maliyet = document.getElementById('edit-maliyet')?.value;
        
        if (!bitisTarihi) {
            Utils.showToast('Lütfen bitiş tarihi girin', 'warning');
            return;
        }
        
        // Butonu loading state'e getir
        const saveBtn = document.getElementById('btn-save-edit');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Güncelleniyor...';
        }
        
        // Güncelleme verileri
        const updateData = {
            id: id,
            bitisTarihi: bitisTarihi,
            bitisSaati: bitisSaati || '',
            durum: 'tamamlandi',
            aciklama: aciklama || '',
            sorumluPersonel: sorumlu || '',
            maliyet: maliyet || '',
            guncellemeTarihi: new Date().toLocaleString('tr-TR') // Güncelleme tarihi ekle
        };
        
        if (!CONFIG.DEMO_MODE && window.GoogleSheetsAPI) {
            // Update action ile gönder
            GoogleSheetsAPI.saveData(type, updateData, 'update')
                .then(result => {
                    if (result.success) {
                        Utils.showToast('Bakım kaydı başarıyla güncellendi', 'success');
                        this.closeModal();
                        // Listeyi ve istatistikleri yenile
                        this.loadOngoingByType(type, `${type}-ongoing-list`);
                        this.loadStatistics();
                    } else {
                        Utils.showToast('Güncelleme hatası: ' + result.error, 'error');
                        if (saveBtn) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Güncelle';
                        }
                    }
                })
                .catch(error => {
                    console.error('Güncelleme hatası:', error);
                    Utils.showToast('Güncelleme başarısız. Lütfen tekrar deneyin.', 'error');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Güncelle';
                    }
                });
        } else {
            // Demo modunda
            setTimeout(() => {
                Utils.showToast('Demo: Bakım kaydı güncellendi', 'success');
                this.closeModal();
                this.loadOngoingByType(type, `${type}-ongoing-list`);
            }, 1000);
        }
    },

    /**
     * Bitiş tarihini güncelle
     */
    updateEndDate: function(type, id, btnElement) {
        const dateInput = document.getElementById(`enddate-${type}-${id}`);
        if (!dateInput || !dateInput.value) {
            Utils.showToast('Lütfen bitiş tarihi seçin', 'warning');
            return;
        }

        // Butonu loading state'e getir
        btnElement.disabled = true;
        btnElement.textContent = 'Güncelleniyor...';

        const updateData = {
            id: id,
            bitisTarihi: dateInput.value,
            durum: 'tamamlandi' // Bitiş tarihi girildiğinde durumu tamamlandı olarak güncelle
        };

        if (!CONFIG.DEMO_MODE && window.GoogleSheetsAPI) {
            // Google Apps Script'te update action ile güncelle
            GoogleSheetsAPI.saveData(type, updateData, 'update')
                .then(result => {
                    if (result.success) {
                        Utils.showToast('Bitiş tarihi başarıyla güncellendi', 'success');
                        // Listeyi yenile
                        this.loadOngoingByType(type, `${type}-ongoing-list`);
                        // İstatistikleri yenile
                        this.loadStatistics();
                    } else {
                        Utils.showToast('Güncelleme hatası: ' + result.error, 'error');
                        btnElement.disabled = false;
                        btnElement.textContent = 'Güncelle';
                    }
                })
                .catch(error => {
                    console.error('Bitiş tarihi güncelleme hatası:', error);
                    Utils.showToast('Güncelleme başarısız. Lütfen tekrar deneyin.', 'error');
                    btnElement.disabled = false;
                    btnElement.textContent = 'Güncelle';
                });
        } else {
            // Demo modunda
            setTimeout(() => {
                Utils.showToast('Demo: Bitiş tarihi güncellendi', 'success');
                dateInput.value = updateData.bitisTarihi;
                btnElement.disabled = false;
                btnElement.textContent = 'Güncelle';
            }, 1000);
        }
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Sayfa değişiminde istatistikleri güncelle
        document.addEventListener('pageChanged', () => {
            if (this.isAdmin) {
                this.loadStatistics();
            }
        });
    },

    /**
     * Admin çıkış yap
     */
    logoutAdmin: function() {
        this.isAdmin = false;
        Utils.saveToStorage('admin_status', false);
        Utils.showToast('Admin çıkışı yapıldı', 'info');
        this.showAdminLock();
    },

    /**
     * Dosya yükleme işlemleri için storage
     */
    uploadedFiles: {},

    /**
     * Dosya seçildiğinde çalışır
     */
    handleFileSelect: function(type, event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Mevcut dosyaları al veya yeni array oluştur
        if (!this.uploadedFiles[type]) {
            this.uploadedFiles[type] = [];
        }

        // Dosyaları işle
        Array.from(files).forEach(file => {
            // Dosya boyutu kontrolü (10MB)
            if (file.size > 10 * 1024 * 1024) {
                Utils.showToast(`Dosya çok büyük: ${file.name} (max 10MB)`, 'warning');
                return;
            }

            // Dosyayı base64 olarak oku
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileData = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: e.target.result.split(',')[1], // Base64 data
                    lastModified: file.lastModified
                };

                this.uploadedFiles[type].push(fileData);
                this.renderFileList(type);
            };
            reader.readAsDataURL(file);
        });

        // Input'u temizle (aynı dosyayı tekrar seçebilmek için)
        event.target.value = '';
    },

    /**
     * Dosya listesini render et
     */
    renderFileList: function(type) {
        const fileList = document.getElementById(`file-list-${type}`);
        if (!fileList) return;

        const files = this.uploadedFiles[type] || [];
        
        if (files.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = files.map((file, index) => {
            const fileIcon = this.getFileIcon(file.name);
            const fileSize = this.formatFileSize(file.size);
            
            return `
                <div class="file-item">
                    <span class="file-icon">${fileIcon}</span>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                    <button type="button" class="file-remove" onclick="BakimTakibi.removeFile('${type}', ${index})" title="Kaldır">❌</button>
                </div>
            `;
        }).join('');
    },

    /**
     * Dosya ikonu belirle
     */
    getFileIcon: function(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            pdf: '📄',
            doc: '📝', docx: '📝',
            xls: '📊', xlsx: '📊',
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️',
            txt: '📃',
            zip: '📦', rar: '📦', '7z': '📦'
        };
        return iconMap[ext] || '📎';
    },

    /**
     * Dosya boyutunu formatla
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Dosya kaldır
     */
    removeFile: function(type, index) {
        if (this.uploadedFiles[type]) {
            this.uploadedFiles[type].splice(index, 1);
            this.renderFileList(type);
        }
    },

    /**
     * Drag & drop olayları için event listener ekle
     */
    setupFileUploadEvents: function(type) {
        const uploadArea = document.getElementById(`file-upload-area-${type}`);
        const fileInput = document.getElementById(`dosya-${type}`);

        if (!uploadArea || !fileInput) return;

        // File input change event
        fileInput.addEventListener('change', (e) => this.handleFileSelect(type, e));

        // Drag & drop events
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                // Mock event object
                const mockEvent = { target: { files: files } };
                this.handleFileSelect(type, mockEvent);
            }
        });
    }
};

// BakimTakibi'yi global olarak erişilebilir yap
window.BakimTakibi = BakimTakibi;
