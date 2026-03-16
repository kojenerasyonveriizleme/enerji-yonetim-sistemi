/**
 * Kojen Motor Verileri Modülü - GÜNCEL SAATLİK KAYIT SİSTEMİ
 * Her motor için ayrı kayıt Sayfası
 * Tekrar Kayıt Engellemesi
 */
const KojenMotor = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        console.log('🔧 Kojen Motor modülü başlatılıyor...');
        this.generateTable();
        this.setupEventListeners();
        this.setupScrollSync();
        console.log('✅ Kojen Motor modülü hazır');
    },

    /**
     * Tabloyu oluştur - GÜNCEL SAATLİK SİSTEM
     */
    generateTable: function() {
        const tableBody = document.getElementById('kojen-table-body');
        if (!tableBody) return;

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

        // SADECE MEVCUT SAAT İÇİN SATIR OLUŞTUR
        for (let hour = startHour; hour <= endHour; hour++) {
            // Mevcut saat mi kontrol et
            const currentHour = new Date().getHours();
            const isCurrentHour = hour === currentHour;
            
            // SADECE MEVCUT SAAT İÇİN DEVAM ET
            if (!isCurrentHour) continue;
            
            const row = document.createElement('div');
            row.className = 'kojen-table-row';
            
            // Vardiya metadata ekle
            row.dataset.hour = hour;
            row.dataset.vardiya = vardiyaAdi;
            
            // Saat sütunu
            const hourCell = document.createElement('div');
            hourCell.className = 'kojen-table-cell hour-cell current-hour';
            hourCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
            row.appendChild(hourCell);

            // 15 parametre input'u - GÜNCEL BAŞLIKLAR
            const parameters = [
                'jen-yatak-de', 'jen-yatak-nde', 'sogutma-sicaklik', 'sogutma-basinc',
                'yag-sicaklik', 'yag-basinc', 'sarj-sicaklik', 'sarj-basinc',
                'gaz-regulator', 'makine-sicaklik', 'karter-basinc', 'on-kamara-basinc',
                'sargi-1', 'sargi-2', 'sargi-3'
            ];

            parameters.forEach(param => {
                const cell = document.createElement('div');
                cell.className = 'kojen-table-cell';
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'kojen-input';
                input.id = `kojen-${hour}-${param}`;
                input.placeholder = '0.0';
                input.step = '0.1';
                input.min = '0';
                
                // Gaz regülatörü için özel max değer
                if (param === 'gaz-regulator') {
                    input.max = '9999';
                } else {
                    input.max = '999';
                }
                
                // Karter basıncı ve ön kamera fark basıncı için negatif değer desteği
                if (param === 'karter-basinc' || param === 'on-kamara-basinc') {
                    input.min = '-999';
                } else {
                    input.min = '0';
                }
                
                // Input event listener'ları
                input.addEventListener('input', (e) => {
                    this.validateInput(e.target);
                    this.saveToLocalStorage();
                });

                input.addEventListener('focus', (e) => {
                    e.target.select();
                });

                cell.appendChild(input);
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        }

        // Vardiya bilgisini göster
        const vardiyaBadge = document.getElementById('active-vardiya');
        if (vardiyaBadge) {
            vardiyaBadge.innerHTML = `🕐 Aktif: ${vardiyaAdi}`;
        }

        // LocalStorage'dan verileri yükle
        this.loadFromLocalStorage();
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Motor butonları
        const motorBtns = document.querySelectorAll('.motor-btn');
        motorBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Aktif sınıfını kaldır
                motorBtns.forEach(b => b.classList.remove('active'));
                // Tıklanan butonu aktif yap
                btn.classList.add('active');
                // Tabloyu yeniden oluştur
                this.generateTable();
                
                // ✅ HER MOTOR İÇİN: Tüm saatlerin kayıt durumunu kontrol et
                console.log(`🔄 Motor değişti: ${btn.dataset.motor} için saat kontrolü yapılıyor...`);
                await this.checkAllHoursRecords();
            });
        });

        // Kaydet butonu
        const saveBtn = document.getElementById('save-kojen-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault(); // Sayfa yönlendirmesini engelle
                
                // Çift tıklama önle
                if (saveBtn.disabled) {
                    return;
                }
                
                saveBtn.disabled = true;
                saveBtn.textContent = 'Kaydediliyor...';
                
                // ✅ HIZLI: Timeout koruması ekle
                let timeoutResolved = false;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        if (!timeoutResolved) {
                            reject(new Error('Kaydetme işlemi timeout'));
                        }
                    }, 8000); // 8 saniye (sadece kaydetme)
                });
                
                try {
                    const savePromise = this.saveData();
                    await Promise.race([savePromise, timeoutPromise]);
                    timeoutResolved = true;
                } catch (error) {
                    timeoutResolved = true;
                    if (error.message === 'Kaydetme işlemi timeout') {
                        Utils.showToast('⚠️ Kaydetme işlemi çok sürdü, lütfen tekrar deneyin', 'warning');
                    } else {
                        throw error; // Diğer hataları normal şekilde fırlat
                    }
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Kaydet';
                }
            });
        }

        // Temizle butonu
        const clearBtn = document.getElementById('clear-kojen-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Tüm verileri temizlemek istediğinize emin misiniz?')) {
                    this.clearAllData();
                }
            });
        }

        // Kaydet kısayolu (Ctrl+S)
        document.addEventListener('keydown', async (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                
                const saveBtn = document.getElementById('save-kojen-btn');
                if (!saveBtn || saveBtn.disabled) {
                    return;
                }
                
                saveBtn.disabled = true;
                saveBtn.textContent = 'Kaydediliyor...';
                
                // ✅ HIZLI: Timeout koruması ekle
                let timeoutResolved = false;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        if (!timeoutResolved) {
                            reject(new Error('Kaydetme işlemi timeout'));
                        }
                    }, 8000); // 8 saniye (sadece kaydetme)
                });
                
                try {
                    const savePromise = this.saveData();
                    await Promise.race([savePromise, timeoutPromise]);
                    timeoutResolved = true;
                } catch (error) {
                    timeoutResolved = true;
                    if (error.message === 'Kaydetme işlemi timeout') {
                        Utils.showToast('⚠️ Kaydetme işlemi çok sürdü, lütfen tekrar deneyin', 'warning');
                    } else {
                        throw error; // Diğer hataları normal şekilde fırlat
                    }
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Kaydet';
                }
            }
        });

        // Debounce için timer
        let inputChangeTimer = null;
        let lastCheckedHour = null; // Son kontrol edilen saati takip et
        
        // Input değişimlerini dinle - KONTROLSÜZ
        const inputs = document.querySelectorAll('.kojen-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                // ✅ ÇÖZÜM: KARTER ve ÖN KAMARA BASINCI için negatif değeri otomatik çevir
                const param = input.id.split('-').slice(2).join('-');
                if (param === 'karter-basinc' || param === 'on-kamara-basinc') {
                    const value = parseFloat(input.value);
                    if (!isNaN(value) && value < 0) {
                        // Negatif değer girilmişse, pozitife çevir
                        input.value = Math.abs(value);
                        console.log(`⚠️ Negatif değer pozitife çevrildi (${param}): ${value} → ${Math.abs(value)}`);
                    }
                }
            });
        });
        
        // Tarih değişiminde kontrol et
        const dateInput = document.getElementById('kojen-motor-date');
        if (dateInput) {
            dateInput.addEventListener('change', async () => {
                // ✅ HER MOTOR İÇİN: Tüm saatlerin kayıt durumunu kontrol et
                console.log(`🔄 Tarih değişti: ${dateInput.value} için saat kontrolü yapılıyor...`);
                await this.checkAllHoursRecords();
            });
        }
        
        // Sayfa yüklendiğinde saat kontrolünü yap - ASYNC
        this.initHourCheck();
    },

    /**
     * Saat kontrolünü başlat - HIZLI VERSİYON
     */
    initHourCheck: async function() {
        try {
            // ✅ HER MOTOR İÇİN: Başlangıç kontrolü
            const activeMotorBtn = document.querySelector('.motor-btn.active');
            const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
            console.log(`🚀 Başlangıç kontrolü: ${selectedMotor} için saat kontrolü başlatılıyor...`);
            
            // ✅ HIZLI: Loading gösterme, direkt çalıştır
            await this.checkAllHoursRecords();
            console.log('✅ Saat kontrolü tamamlandı');
        } catch (error) {
            console.error('Saat kontrolü başlatma hatası:', error);
        }
    },

    /**
     * Loading göstergesi göster/gizle
     */
    showHourCheckLoading: function(show) {
        const loadingElement = document.getElementById('hour-check-loading');
        if (show) {
            if (!loadingElement) {
                const loading = document.createElement('div');
                loading.id = 'hour-check-loading';
                loading.innerHTML = '⏳ Kayıt kontrolü yapılıyor...';
                loading.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #007bff;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    z-index: 9999;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                `;
                document.body.appendChild(loading);
            }
        } else {
            if (loadingElement) {
                loadingElement.remove();
            }
        }
    },

    /**
     * Scroll senkronizasyonu ayarla
     */
    setupScrollSync: function() {
        const tableBody = document.getElementById('kojen-table-body');
        const tableHeader = document.querySelector('.kojen-table-header');
        
        if (!tableBody || !tableHeader) return;
        
        tableBody.addEventListener('scroll', () => {
            tableHeader.scrollLeft = tableBody.scrollLeft;
        });
    },

    /**
     * Input validasyonu
     */
    validateInput: function(input) {
        const value = parseFloat(input.value);
        
        // Parametreyi al
        const param = input.id.split('-').slice(2).join('-');
        
        // Negatif değer kontrolü (sadece karter-basinc ve on-kamara-basinc için)
        if (param === 'karter-basinc' || param === 'on-kamara-basinc') {
            if (isNaN(value) || value < -999 || value > 999) {
                // ✅ ÇÖZÜM: Negatif değeri otomatik al
                if (!isNaN(value) && value < 0) {
                    // Negatif değer girilmişse, pozitife çevir
                    input.value = Math.abs(value);
                    console.log(`⚠️ Negatif değer pozitife çevrildi: ${value} → ${Math.abs(value)}`);
                } else {
                    input.value = '';
                    input.classList.add('error');
                    setTimeout(() => input.classList.remove('error'), 2000);
                }
                return false;
            }
        } else {
            // Diğer parametreler için pozitif değer kontrolü
            if (isNaN(value) || value < 0) {
                input.value = '';
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 2000);
                return false;
            }
        }

        // Maksimum değerler (parametreye göre)
        const maxValues = {
            'karter-basinc': 999, // ✅ ÇÖZÜM: Karter basıncı için maksimum değer artırıldı
            'on-kamara-basinc': 999, // ✅ ÇÖZÜM: Ön kamera basıncı için maksimum değer artırıldı
            'yag-basinc': 10,
            'sarj-basinc': 10,
            'sogutma-basinc': 10,
            'gaz-regulator': 9999,
            'default': 999
        };

        const maxValue = maxValues[param] || maxValues.default;

        if (value > maxValue) {
            input.value = maxValue;
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        input.classList.remove('error');
        return true;
    },

    /**
     * Verileri saat bazlı grupla
     */
    getAllDataByHour: function() {
        const data = {};
        const inputs = document.querySelectorAll('.kojen-input');
        
        inputs.forEach(input => {
            if (input.value && input.value.trim() !== '') {
                const parts = input.id.split('-');
                const hour = parts[1];
                const param = parts.slice(2).join('-');
                
                if (!data[hour]) {
                    data[hour] = {};
                }
                data[hour][param] = input.value;
            }
        });
        
        return data;
    },

    /**
     * Verileri kaydet - GÜNCEL KAYIT ENGELLEME
     */
    saveData: async function() {
        try {
            console.log('🚀 Kaydetme işlemi başlatıldı...');
            
            const dateInput = document.getElementById('kojen-motor-date');
            const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
            
            // Aktif motoru al
            const activeMotorBtn = document.querySelector('.motor-btn.active');
            const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
            
            // Vardiyayı AKTİF TABLO VARDİYASI ile belirle
            const currentHour = new Date().getHours();
            let aktifVardiya;
            
            if (currentHour < 8) {
                aktifVardiya = 'gece';
            } else if (currentHour < 16) {
                aktifVardiya = 'gunduz';
            } else {
                aktifVardiya = 'aksam';
            }
            
            console.log('📋 Parametreler hazır:', {selectedDate, selectedMotor, aktifVardiya});
            
            // Tüm verileri saat bazlı al
            const allData = this.getAllDataByHour();
            console.log('🔍 Toplanan veriler:', allData);
            console.log('🔍 Veri sayısı:', Object.keys(allData).length);
            
            // Boş kontrolü
            const hasData = Object.values(allData).some(hourData => 
                Object.values(hourData).some(value => value && value.trim() !== '')
            );
            console.log('🔍 Veri var mı:', hasData);
            
            if (!hasData) {
                Utils.showToast('⚠️ Lütfen en az bir veri girin', 'warning');
                return;
            }
            
            console.log('🔄 Google Sheets kontrolü başlatılıyor...');
            
            // Google Sheets'e kaydet
            if (window.GoogleSheetsAPI) {
                console.log('✅ GoogleSheetsAPI mevcut');
                
                // ✅ HIZLI: Kayıt kontrolünü atla, direkt kaydet
                console.log('📤 Direkt kaydetme başlatılıyor...');
                
                // Veriyi Google Sheets'e gönder
                const saveData = {
                    allData: JSON.stringify(allData),
                    tarih: selectedDate,
                    vardiya: aktifVardiya,
                    motorId: selectedMotor
                };
                console.log('🔍 Gönderilecek veri:', saveData);
                
                // ✅ HIZLI: Kaydetme işlemine timeout ekle
                let saveTimeoutResolved = false;
                const saveTimeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        if (!saveTimeoutResolved) {
                            reject(new Error('Kaydetme işlemi timeout'));
                        }
                    }, 8000); // 8 saniye
                });
                
                let saveResult;
                try {
                    const savePromise = GoogleSheetsAPI.saveData('kojen_motor', saveData);
                    saveResult = await Promise.race([savePromise, saveTimeoutPromise]);
                    saveTimeoutResolved = true;
                    console.log('📥 Kaydetme sonucu:', saveResult);
                } catch (error) {
                    saveTimeoutResolved = true;
                    if (error.message === 'Kaydetme işlemi timeout') {
                        console.log('⚠️ Kaydetme işlemi timeout, hata döndürülüyor...');
                        saveResult = { success: false, error: 'Kaydetme işlemi çok sürdü' };
                    } else {
                        throw error;
                    }
                }
                
                if (!saveResult.success) {
                    Utils.showToast(`❌ Kayıt hatası: ${saveResult.error}`, 'error');
                    return;
                }
                
                Utils.showToast('✅ Veriler Google Sheets\'e kaydedildi', 'success');
                this.clearAllData();
                
                // ✅ Cache'i temizle - yeni veriyi yansıtmak için
                const cacheKey = `kojen_records_${selectedMotor}_${selectedDate}_${aktifVardiya}`;
                localStorage.removeItem(cacheKey);
                
                // ✅ ÇÖZÜM: Sadece ilgili motorun cache'ini temizle
                console.log(`🗑️ ${selectedMotor} için cache temizlendi, saat kontrolü yeniden yapılacak...`);
                
                // Kayıtlı saatin input'larını hemen kapat
                setTimeout(() => {
                    this.checkAllHoursRecords();
                }, 1000); // 1 saniye bekle
            } else {
                Utils.showToast('❌ GoogleSheetsAPI bulunamadı', 'error');
            }
            
            console.log('✅ Kaydetme işlemi tamamlandı');
            
        } catch (error) {
            console.error('❌ Kojen Motor işlem hatası:', error);
            Utils.showToast('❌ Kayıt sırasında hata oluştu', 'error');
        }
    },

    /**
     * LocalStorage'a kaydet
     */
    saveToLocalStorage: function() {
        const data = this.getAllDataByHour();
        const activeMotorBtn = document.querySelector('.motor-btn.active');
        const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
        const date = new Date().toISOString().split('T')[0];
        
        const key = `kojen_motor_${selectedMotor}_${date}`;
        localStorage.setItem(key, JSON.stringify(data));
    },

    /**
     * LocalStorage'dan yükle
     */
    loadFromLocalStorage: function() {
        const activeMotorBtn = document.querySelector('.motor-btn.active');
        const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
        const date = new Date().toISOString().split('T')[0];
        
        const key = `kojen_motor_${selectedMotor}_${date}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                Object.entries(data).forEach(([hour, hourData]) => {
                    Object.entries(hourData).forEach(([param, value]) => {
                        const input = document.getElementById(`kojen-${hour}-${param}`);
                        if (input) {
                            input.value = value;
                        }
                    });
                });
            } catch (error) {
                console.error('LocalStorage yükleme hatası:', error);
            }
        }
    },

    /**
     * Tüm inputları kontrol et (sayfa yüklendiğinde çağrılır) - HIZLI VERSİYON
     */
    checkAllHoursRecords: async function() {
        try {
            // ✅ HIZLI: 10 saniye timeout ekle
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Saat kontrolü timeout')), 10000)
            );
            
            const checkPromise = this.doCheckAllHoursRecords();
            
            // Race condition - hangisi önce biter
            await Promise.race([checkPromise, timeoutPromise]);
            
        } catch (error) {
            console.error('Tüm saatler kontrolü hatası:', error);
            // Hata durumunda input'ları aç (güvenli varsayım)
            for (let hour = 8; hour <= 20; hour++) {
                this.disableHourInputs(hour.toString(), false);
            }
            console.log('⚠️ Timeout durumunda tüm inputlar açıldı (güvenli varsayım)');
        }
    },

    /**
     * Asıl kontrol fonksiyonu
     */
    doCheckAllHoursRecords: async function() {
        const dateInput = document.getElementById('kojen-motor-date');
        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        
        // Aktif motoru al
        const activeMotorBtn = document.querySelector('.motor-btn.active');
        const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
        
        // ✅ HER MOTOR İÇİN: Detaylı loglama
        console.log(`🔍 ${selectedMotor} için saatlik kontrol başlatılıyor...`);
        console.log(`📅 Tarih: ${selectedDate}`);
        
        // Vardiyayı AKTİF TABLO VARDİYASI ile belirle
        const currentHour = new Date().getHours();
        let aktifVardiya;
        
        if (currentHour < 8) {
            aktifVardiya = 'gece';
        } else if (currentHour < 16) {
            aktifVardiya = 'gunduz';
        } else {
            aktifVardiya = 'aksam';
        }
        
        console.log(`🕐 Vardiya: ${aktifVardiya}`);
        
        if (window.GoogleSheetsAPI) {
            // ✅ HIZLI: Cache'i atla, her zaman yeni veri çek
            console.log(`🔄 ${selectedMotor} için yeni veri çekiliyor...`);
            
            const records = await this.getRecordsBatch(selectedMotor, selectedDate, aktifVardiya);
            console.log(`✅ ${selectedMotor} için ${records.length} kayıt getirildi`);
            
            // ✅ ÇÖZÜM: Tüm saatleri açık başlat (güvenli varsayım)
            for (let hour = 8; hour <= 20; hour++) {
                this.disableHourInputs(hour.toString(), false);
            }
            
            // ✅ ÇÖZÜM: Sadece gerçekten kaydı olan saatleri kapat
            if (records && records.length > 0) {
                const kayitliSaatler = new Set(); // Set ile duplicate önle
                records.forEach(record => {
                    const hour = record['Saat'];
                    if (hour && !isNaN(hour) && !kayitliSaatler.has(hour)) {
                        this.disableHourInputs(hour.toString(), true);
                        kayitliSaatler.add(hour);
                        console.log(`⚠️ ${selectedMotor} - Saat ${hour}:00 için kayıt var - inputlar kapatıldı`);
                    }
                });
                
                if (kayitliSaatler.size > 0) {
                    const uniqueSaatler = Array.from(kayitliSaatler).sort((a, b) => a - b);
                    console.log(`📋 ${selectedMotor} için kilitli saatler: ${uniqueSaatler.join(', ')}`);
                }
            } else {
                console.log(`✅ ${selectedMotor} için kayıt bulunamadı - tüm inputlar açık`);
            }
        }
    },

    /**
     * Toplu kayıt getirme - HIZLI VERSİYON
     */
    getRecordsBatch: async function(motor, date, vardiya) {
        try {
            // ✅ HIZLI: Veri çekme için timeout koruması
            let timeoutResolved = false;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    if (!timeoutResolved) {
                        reject(new Error('Veri çekme timeout'));
                    }
                }, 8000); // 8 saniye
            });
            
            // ✅ ÇÖZÜM: Motor filtresini ekle - her motor kendi verisini çeksin
            const dataPromise = GoogleSheetsAPI.getRecords('kojen_motor', {
                tarih: date,
                vardiya: vardiya,
                motor: motor // ✅ Motor filtresi eklendi
            });
            
            const result = await Promise.race([dataPromise, timeoutPromise]);
            timeoutResolved = true;
            
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Toplu kayıt getirme hatası:', error);
            if (error.message === 'Veri çekme timeout') {
                console.log('⚠️ Veri çekme timeout, boş liste döndürülüyor...');
                return [];
            }
            return [];
        }
    },

    /**
     * Belirtilen saatin input'larını aç/kapat
     */
    disableHourInputs: function(hour, disable) {
        const inputs = document.querySelectorAll(`.kojen-input[id^="kojen-${hour}-"]`);
        inputs.forEach(input => {
            input.disabled = disable;
            if (disable) {
                input.classList.add('disabled');
                input.title = `Saat ${hour}:00 için zaten kayıt mevcut`;
            } else {
                input.classList.remove('disabled');
                input.title = '';
            }
        });
    },

    /**
     * Tüm verileri temizle
     */
    clearAllData: function() {
        const inputs = document.querySelectorAll('.kojen-input');
        inputs.forEach(input => {
            input.value = '';
        });
        
        this.saveToLocalStorage();
        Utils.showToast('Tüm veriler temizlendi', 'success');
    }
};

// KojenMotor'u global olarak erişilebilir yap
window.KojenMotor = KojenMotor;
