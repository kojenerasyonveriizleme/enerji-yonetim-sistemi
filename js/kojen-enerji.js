/**
 * Kojen Enerji Verileri Modülü - GÜNCEL SAATLİK KAYIT SİSTEMİ
 * Enerji verileri için saat bazlı kayıt sistemi
 */
const KojenEnerji = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        // Çift başlatmayı engelle
        if (this.isInitialized) {
            return;
        }
        
        // Tabloyu oluştur
        this.generateTable();
        
        // Event listener'lar kur
        this.setupEventListeners();
        
        // Mevcut kayıtları kontrol et ve inputları kilitle
        this.checkExistingRecords();
        
        this.setupScrollSync();
        this.setCurrentDate();
        this.updateVardiyaInfo();
        this.isInitialized = true;
    },

    /**
     * Aktif vardiya bilgisini al
     */
    getAktifVardiya: function() {
        const now = new Date();
        const hour = now.getHours();
        
        // Vardiya sınırları
        const VARDIYA_SINIRLARI = {
            gunduz: { baslangic: 8, bitis: 16 },
            gece: { baslangic: 16, bitis: 24 },
            gece2: { baslangic: 0, bitis: 8 }
        };
        
        // Saate göre vardiya belirle
        if (hour >= VARDIYA_SINIRLARI.gunduz.baslangic && hour < VARDIYA_SINIRLARI.gunduz.bitis) {
            return 'Gündüz Vardiyası';
        } else if (hour >= VARDIYA_SINIRLARI.gece.baslangic && hour < VARDIYA_SINIRLARI.gece.bitis) {
            return 'Gece Vardiyası';
        } else {
            return 'Gece Vardiyası (2)';
        }
    },

    /**
     * Mevcut kayıtları kontrol et ve inputları kilitle
     */
    checkExistingRecords: function() {
        // Aktif motoru al (sadece aktif sayfanın motoru)
        const activeMotorBtn = document.querySelector('#kojen-enerji-page .motor-btn.active');
        const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
        
        const dateInput = document.getElementById('kojen-enerji-date');
        let selectedDate = dateInput ? dateInput.value : '';
        
        // Eğer tarih boşsa bugünün tarihini ayarla
        if (!selectedDate) {
            selectedDate = new Date().toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\./g, '.');
            
            // Input'a da ayarla
            if (dateInput) {
                dateInput.value = selectedDate;
            }
        }
        
        // Tarih kontrolü - geçerli bir tarih mi?
        const dateObj = new Date(selectedDate.split('.').reverse().join('-'));
        if (isNaN(dateObj.getTime())) {
            console.log('❌ Geçersiz tarih formatı:', selectedDate);
            if (window.Utils && Utils.showToast) {
                Utils.showToast('❌ Geçersiz tarih formatı', 'error');
            }
            return;
        }
        
        // Saat kontrolü - geçerli bir saat mi?
        const currentHour = new Date().getHours();
        if (currentHour < 0 || currentHour > 23) {
            console.log('❌ Geçersiz saat:', currentHour);
            if (window.Utils && Utils.showToast) {
                Utils.showToast('❌ Geçersiz saat', 'error');
            }
            return;
        }
        
        // Vardiya kontrolü
        const aktifVardiya = this.getAktifVardiya();
        if (!aktifVardiya) {
            console.log('❌ Vardiya belirlenemedi');
            if (window.Utils && Utils.showToast) {
                Utils.showToast('❌ Vardiya belirlenemedi', 'error');
            }
            return;
        }
        
        console.log('🔍 Kontrol parametreleri:', {
            'selectedMotor': selectedMotor,
            'selectedDate': selectedDate,
            'currentHour': currentHour,
            'aktifVardiya': aktifVardiya
        });
        
        // Kayıt kontrolü API çağrısı - GÜNCEL SAATİ KULLAN
        const checkData = {
            action: 'check',
            module: 'kojen_enerji',
            motorId: selectedMotor,
            Tarih: selectedDate,
            vardiya: aktifVardiya,
            allData: JSON.stringify({ [currentHour]: {} })
        };
        
        console.log('🔍 Gönderilecek kontrol verisi:', checkData);
        console.log('🔍 allData içeriği:', JSON.parse(checkData.allData));
        console.log('🔍 Kontrol edilecek saat:', currentHour);
        
        GoogleSheetsAPI.saveData('kojen_enerji', checkData)
            .then(result => {
                console.log('🔍 Kayıt kontrolü sonucu:', result);
                console.log('🔍 Kayıt kontrolü detayı:', {
                    'success': result.success,
                    'exists': result.exists,
                    'message': result.message,
                    'data': result.data
                });
                
                // ÇİFT KAYIT ENGELİ - çok daha sıkı kontrol
                // Gerçekten kayıt var mı diye kontrol et
                const hasRealData = result.data && 
                                   typeof result.data === 'object' && 
                                   Object.keys(result.data).length > 0 &&
                                   Object.values(result.data).some(value => 
                                       value && 
                                       typeof value === 'object' && 
                                       Object.keys(value).length > 0
                                   );
                
                // GEÇİCİ ÇÖZÜM: data içinde herhangi bir değer varsa kabul et
                const hasAnyData = result.data && 
                                  typeof result.data === 'object' && 
                                  Object.keys(result.data).length > 0;
                
                console.log('🔍 Gerçek veri kontrolü:', {
                    'hasRealData': hasRealData,
                    'hasAnyData': hasAnyData,
                    'result.data': result.data,
                    'result.data type': typeof result.data,
                    'result.data keys': result.data ? Object.keys(result.data) : 'null',
                    'result.data values': result.data ? Object.values(result.data) : 'null'
                });
                
                if (result.success && (result.exists === true || hasRealData || hasAnyData)) {
                    console.log('⚠️ Mevcut kayıt bulundu, inputlar kilitleniyor...');
                    
                    // TÜM inputları kontrol et - herhangi biri kilitli mi?
                    const allInputs = document.querySelectorAll(`input[id^="kojen-enerji-"][id$="-${currentHour}"]`);
                    const anyLocked = Array.from(allInputs).some(input => input.disabled);
                    
                    if (anyLocked) {
                        console.log('⚠️ Inputlar zaten kilitli, çift kayıt engelleniyor');
                        if (window.Utils && Utils.showToast) {
                            Utils.showToast('⚠️ Bu saat için kayıt zaten mevcut ve kilitli', 'warning');
                        }
                        return; // 🚨 KESİNLİKLE ÇIK
                    }
                    
                    console.log(`🔒 ${allInputs.length} adet input kilitlenecek...`);
                    
                    // TÜM inputları kilitle
                    allInputs.forEach((input, index) => {
                        console.log(`🔒 Input ${index + 1} kilitleniyor:`, input.id, input.value);
                        input.disabled = true;
                        input.style.backgroundColor = '#f0f0f0';
                        input.style.cursor = 'not-allowed';
                    });
                    
                    console.log(`🔒 ${allInputs.length} adet input kilitlendi (mevcut kayıt için)`);
                    this.updateStatus(currentHour, 'kaydedildi');
                    
                    if (window.Utils && Utils.showToast) {
                        Utils.showToast('⚠️ Bu saat için Kayıt zaten mevcut', 'warning');
                    }
                } else {
                    console.log('✅ Mevcut kayıt bulunamadı, inputlar açık');
                    console.log('🔍 Kontrol sonucu detayı:', {
                        'result.success': result.success,
                        'result.exists': result.exists,
                        'result.data': result.data,
                        'result.data type': typeof result.data,
                        'result.data keys': result.data ? Object.keys(result.data) : 'null',
                        'hasRealData': hasRealData,
                        'hasAnyData': hasAnyData
                    });
                    this.updateStatus(currentHour, 'bos');
                }
            })
            .catch(error => {
                console.error('❌ Kayıt kontrolü hatası:', error);
            });
    },

    /**
     * Vardiyayı belirle
     */
    getVardiya: function(currentHour) {
        if (currentHour >= 0 && currentHour < 8) {
            return 'GECE';
        } else if (currentHour < 16) {
            return 'GÜNDÜZ';
        } else {
            return 'AKŞAM';
        }
    },

    /**
     * Tabloyu oluştur - GÜNCEL SAATLİK SİSTEM
     */
    generateTable: function() {
        console.log('🔍 Kojen Enerji tablosu oluşturuluyor...');
        
        const tableBody = document.getElementById('kojen-enerji-table-body');
        if (!tableBody) {
            console.error('❌ kojen-enerji-table-body bulunamadı');
            return;
        }

        console.log('✅ kojen-enerji-table-body bulundu');
        tableBody.innerHTML = '';

        // Aktif vardiyayı belirle
        const hour = new Date().getHours();
        let startHour, endHour, vardiyaAdi;
        
        if (hour >= 0 && hour < 8) {
            startHour = 0;
            endHour = 7;
            vardiyaAdi = 'Gece Vardiyası (00:00-08:00)';
        } else if (hour >= 8 && hour < 16) {
            startHour = 8;
            endHour = 15;
            vardiyaAdi = 'Gündüz Vardiyası (08:00-16:00)';
        } else {
            startHour = 16;
            endHour = 23;
            vardiyaAdi = 'Akşam Vardiyası (16:00-24:00)';
        }

        console.log(`🕐 Aktif vardiya: ${vardiyaAdi} (${startHour}:00 - ${endHour}:00)`);
        console.log(`🕐 Mevcut saat: ${hour}:00`);

        // SADECE MEVCUT SAAT İÇİN SATIR OLUŞTUR
        for (let h = startHour; h <= endHour; h++) {
            // Mevcut saat mi kontrol et
            if (h !== hour) {
                console.log(`⏭️ ${h}:00 atlanıyor (mevcut saat değil)`);
                continue; // SADECE MEVCUT SAAT
            }
            
            console.log(`✅ ${h}:00 için satır oluşturuluyor`);
            
            const row = document.createElement('div');
            row.className = 'kojen-enerji-table-row';
            row.setAttribute('data-hour', h);

            // Saat sütunu
            const hourCell = document.createElement('div');
            hourCell.className = 'kojen-enerji-table-cell sticky-col';
            hourCell.innerHTML = `<strong>${h.toString().padStart(2, '0')}:00</strong>`;
            row.appendChild(hourCell);

            // Enerji verileri input'ları
            const fields = [
                { id: 'aydem-voltaji', placeholder: 'V' },
                { id: 'aktif-guc', placeholder: 'kW' },
                { id: 'reaktif-guc', placeholder: 'kVAr' },
                { id: 'cos-fi', placeholder: '0.95' },
                { id: 'ort-akim', placeholder: 'A' },
                { id: 'ort-gerilim', placeholder: 'V' },
                { id: 'notur-akimi', placeholder: 'A' },
                { id: 'tahrik-gerilimi', placeholder: 'V' },
                { id: 'toplam-aktif-enerji', placeholder: 'kWh' },
                { id: 'calisma-saati', placeholder: 'h' },
                { id: 'kalkis-sayisi', placeholder: '0' }
            ];

            fields.forEach(field => {
                const cell = document.createElement('div');
                cell.className = 'kojen-enerji-table-cell';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'kojen-enerji-input';
                input.id = `kojen-enerji-${field.id}-${h}`;
                input.name = `kojen-enerji-${field.id}-${h}`;
                input.placeholder = field.placeholder;
                input.step = field.id === 'cos-fi' ? '0.01' : '0.1';
                input.min = '0';
                input.setAttribute('data-hour', h);
                input.setAttribute('data-field', field.id);
                
                console.log(`📝 Input oluşturuldu: ${input.id}`);
                
                // Input değişim eventi
                input.addEventListener('input', () => {
                    this.updateStatus(h, 'değişti');
                });
                
                // Enter tuşu ile bir sonraki input'a geç
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.moveToNextInput(input);
                    }
                });
                
                cell.appendChild(input);
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
            console.log(`✅ ${h}:00 satırı tabloya eklendi`);
        }

        console.log('✅ Kojen Enerji tablosu oluşturuldu');
        console.log(`📊 Tablo içeriği: ${tableBody.children.length} satır`);
    },

    /**
     * Event listener'ları kur
     */
    setupEventListeners: function() {
        console.log('🔧 Event listener\'lar kuruluyor...');
        
        // Event listener'ları temizle (çift kurulumu engelle)
        this.removeEventListeners();
        
        // SADECE kojen-enerji-page içindeki motor butonlarını hedefle
        const motorButtons = document.querySelectorAll('#kojen-enerji-page .motor-btn');
        console.log(`🔍 Motor butonları bulundu: ${motorButtons.length} adet`);
        
        motorButtons.forEach((btn, index) => {
            console.log(`📝 Motor butonu ${index + 1}: ${btn.dataset.motor}`);
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🔄 Motor butonu tıklandı: ${btn.dataset.motor}`);
                this.switchMotor(btn.dataset.motor);
            });
        });

        // Kaydet butonu
        const saveBtn = document.getElementById('save-kojen-enerji-btn');
        if (saveBtn) {
            // Butonu devre dışı bırak ve yeniden etkinleştir (çift tıklamayı engelle)
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (saveBtn.disabled) {
                    console.log('⚠️ Kaydet butonu zaten çalışıyor, çift tıklama engelleniyor');
                    return;
                }
                
                console.log('💾 Kaydet butonu tıklandı');
                this.saveData();
            });
        }

        // Temizle butonu
        const clearBtn = document.getElementById('clear-kojen-enerji-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearData();
            });
        }

        // Motor devre dışı butonu
        const disableBtn = document.getElementById('motor-devre-disi-enerji-btn');
        if (disableBtn) {
            const self = this; // this bağlamını koru
            disableBtn.addEventListener('click', async (e) => {
                // Ctrl+R engelle
                if (e.ctrlKey && e.key === 'r') {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🚫 Ctrl+R engellendi - sayfa giriş formuna yönlendirilmedi');
                    if (window.Utils && Utils.showToast) {
                        Utils.showToast('🚫 Ctrl+R engellendi', 'warning');
                    }
                    return;
                }
                
                if (disableBtn.disabled) {
                    console.log('⚠️ Motor devre dışı butonu zaten çalışıyor, çift tıklama engelleniyor');
                    return;
                }
                
                disableBtn.disabled = true;
                disableBtn.textContent = 'Kaydediliyor...';
                
                try {
                    await self.saveMotorDevreDisi();
                } catch (error) {
                    console.error('Motor devre dışı kaydetme hatası:', error);
                    if (window.Utils && Utils.showToast) {
                        Utils.showToast('❌ Kaydetme hatası: ' + error.message, 'error');
                    }
                } finally {
                    // Butonu eski haline getir
                    disableBtn.disabled = false;
                    disableBtn.textContent = '🔴 Motor Devre Dışı Kaydet';
                }
            });
        }

        console.log('✅ Event listener\'lar kuruldu');
    },

    /**
     * Event listener'ları temizle
     */
    removeEventListeners: function() {
        console.log('🧹 Eski event listener\'lar temizleniyor...');
        
        // Motor butonlarındaki event listener'ları temizle
        const motorButtons = document.querySelectorAll('#kojen-enerji-page .motor-btn');
        motorButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        
        // Kaydet butonunu temizle
        const saveBtn = document.getElementById('save-kojen-enerji-btn');
        if (saveBtn) {
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        }
        
        // Temizle butonunu temizle
        const clearBtn = document.getElementById('clear-kojen-enerji-btn');
        if (clearBtn) {
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        }
        
        // Motor devre dışı butonunu temizle
        const disableBtn = document.getElementById('motor-devre-disi-enerji-btn');
        if (disableBtn) {
            const newDisableBtn = disableBtn.cloneNode(true);
            disableBtn.parentNode.replaceChild(newDisableBtn, disableBtn);
            
            // Butonu aktif hale getir
            newDisableBtn.disabled = false;
            newDisableBtn.textContent = '🔴 Motor Devre Dışı Kaydet';
            newDisableBtn.style.backgroundColor = '';
            newDisableBtn.style.cursor = 'pointer';
        }
        
        console.log('✅ Event listener\'lar temizlendi');
    },

    /**
     * Scroll senkronizasyonu
     */
    setupScrollSync: function() {
        const tableContainer = document.querySelector('.kojen-enerji-table-container');
        if (!tableContainer) return;

        tableContainer.addEventListener('scroll', () => {
            const scrollLeft = tableContainer.scrollLeft;
            // Diğer tabloları da senkronize et (varsa)
            document.querySelectorAll('.kojen-enerji-table-container').forEach(container => {
                if (container !== tableContainer) {
                    container.scrollLeft = scrollLeft;
                }
            });
        });
    },

    /**
     * Mevcut tarihi ayarla
     */
    setCurrentDate: function() {
        const dateInput = document.getElementById('kojen-enerji-date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            dateInput.max = today; // Gelecek tarih seçilemez
        }
        
        // Motor seçimini kontrol et ve varsayılan olarak ayarla
        this.checkAndSetDefaultMotor();
    },

    /**
     * Motor seçimini kontrol et ve varsayılan olarak ayarla
     */
    checkAndSetDefaultMotor: function() {
        const activeBtn = document.querySelector('#kojen-enerji-page .motor-btn.active');
        if (!activeBtn) {
            console.log('⚠️ Aktif motor butonu bulunamadı, varsayılan olarak motor-1 ayarlanıyor');
            const defaultBtn = document.querySelector('#kojen-enerji-page [data-motor="motor-1"]');
            if (defaultBtn) {
                defaultBtn.classList.add('active');
                console.log('✅ Varsayılan motor-1 aktif edildi');
            }
        } else {
            console.log(`✅ Aktif motor mevcut: ${activeBtn.dataset.motor}`);
        }
    },

    /**
     * Vardiya bilgisini güncelle
     */
    updateVardiyaInfo: function() {
        const vardiyaBadge = document.getElementById('active-enerji-vardiya');
        if (!vardiyaBadge) return;

        const hour = new Date().getHours();
        let vardiyaText, vardiyaClass;

        if (hour >= 0 && hour < 8) {
            vardiyaText = '🌙 Gece Vardiyası (00:00-08:00)';
            vardiyaClass = 'vardiya-gece';
        } else if (hour >= 8 && hour < 16) {
            vardiyaText = '☀️ Gündüz Vardiyası (08:00-16:00)';
            vardiyaClass = 'vardiya-gunduz';
        } else {
            vardiyaText = '🌅 Akşam Vardiyası (16:00-24:00)';
            vardiyaClass = 'vardiya-aksam';
        }

        vardiyaBadge.textContent = vardiyaText;
        vardiyaBadge.className = `vardiya-badge ${vardiyaClass}`;
    },

    /**
     * Motor değiştir
     */
    switchMotor: function(motorId) {
        console.log(`🔄 Motor değiştiriliyor: ${motorId}`);
        
        // SADECE kojen-enerji-page içindeki motor butonlarını hedefle
        const allMotorBtns = document.querySelectorAll('#kojen-enerji-page .motor-btn');
        console.log(`🔍 Tüm motor butonları: ${allMotorBtns.length} adet`);
        
        allMotorBtns.forEach(btn => {
            btn.classList.remove('active');
            console.log(`⏹️ ${btn.dataset.motor} butonu pasif yapıldı`);
        });
        
        const targetBtn = document.querySelector(`#kojen-enerji-page [data-motor="${motorId}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            console.log(`✅ ${motorId} butonu aktif yapıldı`);
        } else {
            console.log(`❌ ${motorId} butonu bulunamadı`);
            return;
        }

        // Mevcut veriyi kaydet 
        console.log('🔄 Motor değiştiriliyor, veri temizleniyor...');
        this.clearData();

        // Tabloyu yeniden oluştur
        console.log('🔄 Tablo yeniden oluşturuluyor...');
        this.generateTable();
        
        // Mevcut kayıtları kontrol et ve inputları kilitle
        this.checkExistingRecords();
        
        console.log(`✅ Motor değiştirildi: ${motorId}`);
    },

    /**
     * Durumu güncelle
     */
    updateStatus: function(hour, status) {
        const statusIndicator = document.getElementById(`status-${hour}`);
        if (!statusIndicator) return;

        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');

        // Saat 18 için status-text'i kaldır
        if (hour === 18) {
            if (statusText) {
                statusText.remove();
            }
            if (statusDot) {
                statusDot.remove();
            }
            return;
        }

        const statusConfig = {
            'bekliyor': { class: 'status-waiting', text: 'Bekliyor' },
            'değişti': { class: 'status-changed', text: 'Değişti' },
            'kaydedildi': { class: 'status-saved', text: 'Kaydedildi' },
            'hata': { class: 'status-error', text: 'Hata' }
        };

        const config = statusConfig[status] || statusConfig['bekliyor'];
        
        statusDot.className = `status-dot ${config.class}`;
        statusText.textContent = config.text;
    },

    /**
     * Bir sonraki input'a geç
     */
    moveToNextInput: function(currentInput) {
        const allInputs = Array.from(document.querySelectorAll('.kojen-enerji-input'));
        const currentIndex = allInputs.indexOf(currentInput);
        
        if (currentIndex < allInputs.length - 1) {
            const nextInput = allInputs[currentIndex + 1];
            nextInput.focus();
            nextInput.select();
        }
    },

    /**
     * Verileri kaydet
     */
    saveData: function() {
        console.log('💾 Kojen Enerji verileri kaydediliyor...');
        
        // Çift kayıt engeli
        const saveBtn = document.getElementById('save-kojen-enerji-btn');
        if (saveBtn && saveBtn.disabled) {
            console.log('⚠️ Kaydetme işlemi zaten devam ediyor, çift tıklama engelleniyor');
            return;
        }
        
        // Butonu devre dışı bırak
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Kaydediliyor...';
        }
        
        const activeMotorBtn = document.querySelector('#kojen-enerji-page .motor-btn.active');
        const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
        
        // Tarihi al
        const dateInput = document.getElementById('kojen-enerji-date');
        const selectedDate = dateInput ? dateInput.value : new Date().toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).replace(/\./g, '.');
        
        // Mevcut saatin verisini al
        const currentHour = new Date().getHours();
        const hourData = this.getHourData(currentHour);
        
        console.log('📊 Saat verisi:', hourData);
        
        if (!hourData || Object.keys(hourData).length === 0) {
            console.log('⚠️ Kaydedilecek veri bulunamadı');
            if (window.Utils && Utils.showToast) {
                Utils.showToast('⚠️ Kaydedilecek veri bulunamadı', 'warning');
            }
            
            // Butonu eski haline getir
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Kaydet';
            }
            
            const disableBtn = document.getElementById('motor-devre-disi-enerji-btn');
            
            if (disableBtn) {
                disableBtn.disabled = false;
                disableBtn.textContent = '🔴 Motor Devre Dışı Kaydet';
                disableBtn.style.backgroundColor = '';
                disableBtn.style.cursor = 'pointer';
            }
            
            return;
        }

        // Google Sheets'e gönder
        this.sendToGoogleSheets(hourData, selectedMotor, selectedDate);
    },

    /**
     * Saat verisini al
     */
    getHourData: function(hour) {
        const fields = [
            'aydem-voltaji', 'aktif-guc', 'reaktif-guc', 'cos-fi',
            'ort-akim', 'ort-gerilim', 'notur-akimi', 'tahrik-gerilimi',
            'toplam-aktif-enerji', 'calisma-saati', 'kalkis-sayisi'
        ];

        const data = {};
        let hasValue = false;

        fields.forEach(field => {
            const input = document.getElementById(`kojen-enerji-${field}-${hour}`);
            if (input) {
                const value = input.value.trim();
                // Boş değilse veya "DD" ise kabul et
                if (value !== '') {
                    if (value === 'DD') {
                        data[field] = 'DD';
                        hasValue = true; // DD de değer kabul edilsin
                    } else {
                        const numValue = parseFloat(value) || 0;
                        data[field] = numValue;
                        if (numValue > 0 || value === '0') hasValue = true; // 0 da değer kabul edilsin
                    }
                } else {
                    data[field] = '';
                }
            } else {
                data[field] = '';
            }
        });

        console.log(`🔍 Saat ${hour} veri kontrolü:`, data, 'hasValue:', hasValue);
        return hasValue ? data : null;
    },

    /**
     * Google Sheets'e gönder
     */
    sendToGoogleSheets: function(data, motor, date) {
        console.log('🌐 Google Sheets\'e gönderiliyor...');
        console.log('📊 Gönderilecek veri:', data);
        
        // Google Sheets API entegrasyonu (sadece Google Sheets)
        if (window.GoogleSheetsAPI) {
            const currentHour = new Date().getHours().toString();
            
            // Vardiya bilgisini al
            const vardiyaElement = document.getElementById('active-enerji-vardiya');
            const vardiyaText = vardiyaElement ? vardiyaElement.textContent : '';
            let vardiya = 'GÜNDÜZ'; // varsayılan
            
            if (vardiyaText.includes('Akşam')) {
                vardiya = 'AKŞAM';
            } else if (vardiyaText.includes('Gece')) {
                vardiya = 'GECE';
            }
            
            // Veriyi allData formatında gönder (Apps Script uyumlu)
            const sheetData = {
                action: 'save',
                module: 'kojen_enerji',
                motorId: motor,
                Tarih: date,
                vardiya: vardiya,
                allData: JSON.stringify({
                    [currentHour]: {
                        'aydem-voltaji': data['aydem-voltaji'] || 0,
                        'aktif-guc': data['aktif-guc'] || 0,
                        'reaktif-guc': data['reaktif-guc'] || 0,
                        'cos-fi': data['cos-fi'] || 0,
                        'ort-akim': data['ort-akim'] || 0,
                        'ort-gerilim': data['ort-gerilim'] || 0,
                        'notur-akimi': data['notur-akimi'] || 0,
                        'tahrik-gerilimi': data['tahrik-gerilimi'] || 0,
                        'toplam-aktif-enerji': data['toplam-aktif-enerji'] || 0,
                        'calisma-saati': data['calisma-saati'] || 0,
                        'kalkis-sayisi': data['kalkis-sayisi'] || 0
                    }
                }),
                Kaydeden: Auth?.getCurrentUser()?.username || 'Bilinmeyen',
                timestamp: new Date().toISOString()
            };

            console.log('📤 API isteği gönderiliyor...');
            console.log('🔍 Tarih kontrolü:', {
                'date': date,
                'sheetData.Tarih': sheetData.Tarih,
                'vardiya': vardiya,
                'sheetData.vardiya': sheetData.vardiya,
                'currentHour': currentHour,
                'allData içeriği': JSON.parse(sheetData.allData)
            });

            GoogleSheetsAPI.saveData('kojen_enerji', sheetData)
                .then(result => {
                    console.log('📥 API yanıtı alındı:', result);
                    console.log('🔍 API yanıt detayı:', {
                        'success': result.success,
                        'message': result.message,
                        'data': result.data,
                        'timestamp': result.timestamp
                    });
                    
                    // Butonu eski haline getir
                    const saveBtn = document.getElementById('save-kojen-enerji-btn');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = '💾 Kaydet';
                    }
                    
                    if (result.success) {
                        console.log('✅ Veri başarıyla Google Sheets\'e kaydedildi');
                        
                        // Kayıt sonrası inputları kilitle
                        console.log('🔒 Kayıt başarılı, inputlar kilitleniyor...');
                        const currentHour = new Date().getHours();
                        const inputs = document.querySelectorAll(`input[id^="kojen-enerji-"][id$="-${currentHour}"]`);
                        
                        inputs.forEach((input, index) => {
                            console.log(`🔒 Input ${index + 1} kilitleniyor:`, input.id, input.value);
                            input.disabled = true;
                            input.style.backgroundColor = '#f0f0f0';
                            input.style.cursor = 'not-allowed';
                        });
                        
                        console.log(`🔒 ${inputs.length} adet input kilitlendi (${currentHour}:00 için)`);
                        this.updateStatus(currentHour, 'kaydedildi');
                        
                        // Butonları eski haline getir
                        const saveBtn = document.getElementById('save-kojen-enerji-btn');
                        const disableBtn = document.getElementById('motor-devre-disi-enerji-btn');
                        
                        if (saveBtn) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = '💾 Kaydet';
                        }
                        
                        if (disableBtn) {
                            disableBtn.disabled = false;
                            disableBtn.textContent = '🔴 Motor Devre Dışı';
                            disableBtn.style.backgroundColor = '';
                            disableBtn.style.cursor = 'pointer';
                        }
                        
                        if (window.Utils && Utils.showToast) {
                            Utils.showToast('✅ Veri başarıyla kaydedildi', 'success');
                        }
                    } else {
                        console.error('❌ Kayıt hatası:', result.error);
                        this.updateStatus(new Date().getHours(), 'hata');
                        
                        if (window.Utils && Utils.showToast) {
                            Utils.showToast('❌ Kayıt hatası: ' + result.error, 'error');
                        }
                    }
                })
                .catch(error => {
                    console.error('❌ API hatası:', error);
                    
                    // Butonu eski haline getir
                    const saveBtn = document.getElementById('save-kojen-enerji-btn');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = '💾 Kaydet';
                    }
                    
                    this.updateStatus(new Date().getHours(), 'hata');
                    
                    if (window.Utils && Utils.showToast) {
                        Utils.showToast('❌ Bağlantı hatası: ' + error.message, 'error');
                    }
                });
        } else {
            console.error('❌ GoogleSheetsAPI bulunamadı');
            
            // Butonu eski haline getir
            const saveBtn = document.getElementById('save-kojen-enerji-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Kaydet';
            }
            
            // Sadece hata mesajı göster
            this.updateStatus(new Date().getHours(), 'hata');
            
            if (window.Utils && Utils.showToast) {
                Utils.showToast('❌ Google Sheets entegrasyonu bulunamadı. Lütfen API bağlantısını kontrol edin.', 'error');
            }
        }
    },

    /**
     * Verileri temizle
     */
    clearData: function() {
        const currentHour = new Date().getHours();
        const inputs = document.querySelectorAll(`[data-hour="${currentHour}"]`);
        
        inputs.forEach(input => {
            if (input.type === 'number') {
                input.value = '';
            }
        });

        this.updateStatus(currentHour, 'bekliyor');
        
        if (window.Utils && Utils.showToast) {
            Utils.showToast('🔄 Veriler temizlendi', 'info');
        }
    },

    /**
     * Motor devre dışı kaydet
     */
    saveMotorDevreDisi: async function() {
        try {
            console.log('🔧 Kojen Enerji AKTİF SAYFA için devre dışı kaydetme işlemi başlatıldı...');
            
            const dateInput = document.getElementById('kojen-enerji-date');
            const selectedDate = dateInput ? dateInput.value : new Date().toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\./g, '.');
            
            // Aktif motoru al (sadece aktif sayfanın motoru)
            const activeMotorBtn = document.querySelector('#kojen-enerji-page .motor-btn.active');
            console.log('🔍 Aktif buton:', activeMotorBtn);
            console.log('🔍 Buton dataset:', activeMotorBtn?.dataset);
            console.log('🔍 Buton motor attribute:', activeMotorBtn?.dataset?.motor);
            
            const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
            console.log('🔍 Tespit edilen motor:', selectedMotor);
            
            // Vardiyayı AKTİF VARDİYA ile belirle
            const currentHour = new Date().getHours();
            let aktifVardiya;
            
            if (currentHour < 8) {
                aktifVardiya = 'GECE';
            } else if (currentHour < 16) {
                aktifVardiya = 'GÜNDÜZ';
            } else {
                aktifVardiya = 'AKŞAM';
            }
            
            console.log('📋 Parametreler:', {selectedDate, selectedMotor, aktifVardiya, currentHour});
            
            // Sadece aktif motor için işlem yap
            if (window.GoogleSheetsAPI) {
                console.log(`🔄 ${selectedMotor} için ${currentHour}:00 saati kontrol ediliyor...`);
                
                // Tarih kontrolü için API çağrısı
                const checkData = {
                    action: 'check',
                    module: 'kojen_enerji',
                    motorId: selectedMotor,  // ✅ EKLENDİ: Hangi motor kontrol edilecek
                    Tarih: selectedDate,
                    vardiya: aktifVardiya,
                    allData: JSON.stringify({[currentHour.toString()]: {}})
                };
                
                const checkResult = await GoogleSheetsAPI.saveData('kojen_enerji', checkData);
                console.log(`🔍 ${selectedMotor} kayıt kontrolü sonucu:`, checkResult);
                
                // Eğer kayıt varsa butonu kilitle ve işlemi durdur
                // Gerçekten kayıt var mı diye kontrol et
                const hasRealData = checkResult.data && 
                                   typeof checkResult.data === 'object' && 
                                   Object.keys(checkResult.data).length > 0 &&
                                   Object.values(checkResult.data).some(value => 
                                       value && 
                                       typeof value === 'object' && 
                                       Object.keys(value).length > 0
                                   );
                
                // GEÇİCİ ÇÖZÜM: data içinde herhangi bir değer varsa kabul et
                const hasAnyData = checkResult.data && 
                                  typeof checkResult.data === 'object' && 
                                  Object.keys(checkResult.data).length > 0;
                
                console.log(`🔍 ${selectedMotor} gerçek veri kontrolü:`, {
                    'hasRealData': hasRealData,
                    'hasAnyData': hasAnyData,
                    'checkResult.data': checkResult.data,
                    'checkResult.data type': typeof checkResult.data,
                    'checkResult.data keys': checkResult.data ? Object.keys(checkResult.data) : 'null',
                    'checkResult.data values': checkResult.data ? Object.values(checkResult.data) : 'null'
                });
                
                if (checkResult.success && (checkResult.exists === true || hasRealData || hasAnyData)) {
                    console.log(`⚠️ ${selectedMotor} için devre dışı kayıt zaten mevcut, buton kilitleniyor...`);
                    
                    const disableBtn = document.getElementById('motor-devre-disi-enerji-btn');
                    if (disableBtn) {
                        disableBtn.disabled = true;
                        disableBtn.textContent = `🔴 ${selectedMotor} Devre Dışı (Zaten Kayıtlı)`;
                        disableBtn.style.backgroundColor = '#6c757d';
                        disableBtn.style.cursor = 'not-allowed';
                    }
                    
                    if (window.Utils && Utils.showToast) {
                        Utils.showToast(`⚠️ ${selectedMotor} için devre dışı kayıt zaten mevcut`, 'warning');
                    }
                    return;
                }
                
                console.log(`✅ ${selectedMotor} için ${currentHour}:00 devre dışı kaydı yapılacak...`);
                console.log(`🔍 ${selectedMotor} kontrol sonucu detayı:`, {
                    'checkResult.success': checkResult.success,
                    'checkResult.exists': checkResult.exists,
                    'checkResult.data': checkResult.data,
                    'hasRealData': hasRealData,
                    'hasAnyData': hasAnyData
                });
                
                // Tüm enerji alanlarına "DD" kodu gönder
                const devreDisiData = {};
                const fields = [
                    'aydem-voltaji', 'aktif-guc', 'reaktif-guc', 'cos-fi',
                    'ort-akim', 'ort-gerilim', 'notur-akimi', 'tahrik-gerilimi',
                    'toplam-aktif-enerji', 'calisma-saati', 'kalkis-sayisi'
                ];
                
                fields.forEach(field => {
                    devreDisiData[field] = 'DD';
                });
                
                console.log(`🔧 ${selectedMotor} devre dışı verisi:`, devreDisiData);
                
                // Veriyi Google Sheets'e gönder
                const saveData = {
                    action: 'save',
                    module: 'kojen_enerji',
                    motorId: selectedMotor,
                    Tarih: selectedDate,
                    vardiya: aktifVardiya,
                    allData: JSON.stringify({[currentHour.toString()]: devreDisiData}),
                    Kaydeden: window.Auth?.getCurrentUser()?.username || 'Bilinmeyen',
                    timestamp: new Date().toISOString()
                };
                
                console.log(`🔍 ${selectedMotor} için gönderilecek devre dışı verisi:`, saveData);
                
                // Kaydetme işlemi
                const saveResult = await GoogleSheetsAPI.saveData('kojen_enerji', saveData);
                console.log(`📥 ${selectedMotor} devre dışı kaydetme sonucu:`, saveResult);
                
                if (!saveResult.success) {
                    if (window.Utils && Utils.showToast) {
                        Utils.showToast(`❌ ${selectedMotor} devre dışı kayıt hatası: ${saveResult.error}`, 'error');
                    }
                    return;
                }
                
                if (window.Utils && Utils.showToast) {
                    Utils.showToast(`✅ ${selectedMotor} devre dışı olarak kaydedildi`, 'success');
                }
                
                // Aktif motorun input'larını "DD" ile doldur ve devre dışı bırak
                const allInputs = document.querySelectorAll('.kojen-enerji-input');
                allInputs.forEach(input => {
                    const parts = input.id.split('-');
                    const hour = parts[parts.length - 1];
                    
                    if (hour === currentHour.toString()) {
                        input.value = 'DD';
                        input.disabled = true;
                        input.classList.add('disabled');
                        input.title = `Saat ${currentHour}:00 için ${selectedMotor} devre dışı`;
                        input.setCustomValidity('');
                    }
                });
                
                // Butonu da devre dışı bırak
                const disableBtn = document.getElementById('motor-devre-disi-enerji-btn');
                if (disableBtn) {
                    disableBtn.disabled = true;
                    disableBtn.textContent = `🔴 ${selectedMotor} Devre Dışı (Kaydedildi)`;
                }
                
                this.updateStatus(currentHour, 'kaydedildi');
                
                console.log(`✅ Kojen Enerji ${selectedMotor} devre dışı kaydetme işlemi tamamlandı`);
                
            } else {
                if (window.Utils && Utils.showToast) {
                    Utils.showToast('❌ GoogleSheetsAPI bulunamadı', 'error');
                }
            }
            
        } catch (error) {
            console.error('❌ Kojen Enerji motor devre dışı kaydetme hatası:', error);
            if (window.Utils && Utils.showToast) {
                Utils.showToast('❌ Devre dışı kaydetme sırasında hata oluştu', 'error');
            }
            throw error;
        }
    }
};

// Global erişim
window.KojenEnerji = KojenEnerji;

// Otomatik başlatma
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('kojen-enerji-page')) {
        KojenEnerji.init();
    }
});
