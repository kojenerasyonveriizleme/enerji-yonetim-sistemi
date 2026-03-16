/**
 * Kojen Enerji Verileri Modülü - GÜNCEL SAATLİK KAYIT SİSTEMİ
 * Vardiya bazlı kayıt sistemi
 * Tekrar Kayıt Engellemesi
 */
const KojenEnerji = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        console.log('🔧 Kojen Enerji modülü başlatılıyor...');
        this.generateTable();
        this.setupEventListeners();
        this.setupScrollSync();
        console.log('✅ Kojen Enerji modülü hazır');
    },

    /**
     * Tabloyu oluştur - GÜNCEL SAATLİK SİSTEM
     */
    generateTable: function() {
        const tableBody = document.getElementById('kojen-enerji-table-body');
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
            row.className = 'kojen-enerji-table-row';
            
            // Vardiya metadata ekle
            row.dataset.hour = hour;
            row.dataset.vardiya = vardiyaAdi;
            
            // Saat sütunu
            const hourCell = document.createElement('div');
            hourCell.className = 'kojen-enerji-table-cell hour-cell current-hour';
            hourCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
            row.appendChild(hourCell);

            // 11 parametre input'u - GÜNCEL BAŞLIKLAR
            const parameters = [
                'aydem-voltaji', 'aktif-guc', 'reaktif-guc', 'cos-phi', 
                'ort-akim', 'ort-gerilim', 'notr-akim', 'tahrik-gerilim', 
                'toplam-aktif-enerji', 'calisma-saati', 'kalkis-sayisi'
            ];

            parameters.forEach(param => {
                const cell = document.createElement('div');
                cell.className = 'kojen-enerji-table-cell';
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'kojen-enerji-input';
                input.id = `kojen-enerji-${hour}-${param}`;
                input.placeholder = '0.0';
                input.step = '0.1';
                input.min = '0';
                
                // Parametreye göre max değer belirle
                const maxValues = {
                    'aydem-voltaji': 999999,
                    'aktif-guc': 999999,
                    'reaktif-guc': 999999,
                    'cos-phi': 1,
                    'ort-akim': 999999,
                    'ort-gerilim': 999999,
                    'notr-akim': 999999,
                    'tahrik-gerilim': 999999,
                    'toplam-aktif-enerji': 999999,
                    'calisma-saati': 999999,
                    'kalkis-sayisi': 999999
                };
                
                input.max = maxValues[param] || 999;
                
                // Input tipine göre class ekle
                if (param.includes('voltaj') || param.includes('gerilim')) {
                    input.classList.add('voltage');
                } else if (param.includes('guc')) {
                    input.classList.add('power');
                } else if (param === 'cos-phi') {
                    input.classList.add('cosphi');
                } else if (param.includes('akim')) {
                    input.classList.add('current');
                } else if (param.includes('enerji')) {
                    input.classList.add('energy');
                } else if (param.includes('saat')) {
                    input.classList.add('hours');
                } else if (param.includes('kalkis')) {
                    input.classList.add('count');
                }
                
                // Input event listener'ları
                input.addEventListener('input', (e) => {
                    // Param nesnesi oluştur
                    const paramObj = {
                        id: param,
                        max: input.max
                    };
                    this.validateInput(e.target, paramObj);
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
        const vardiyaBadge = document.getElementById('active-enerji-vardiya');
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
        const saveBtn = document.getElementById('save-kojen-enerji-btn');
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
        const clearBtn = document.getElementById('clear-kojen-enerji-btn');
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
                
                const saveBtn = document.getElementById('save-kojen-enerji-btn');
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
        
        // Tarih değişiminde kontrol et
        const dateInput = document.getElementById('kojen-enerji-date');
        if (dateInput) {
            dateInput.addEventListener('change', async () => {
                // ✅ HER TARİH İÇİN: Tüm saatlerin kayıt durumunu kontrol et
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
            // ✅ HER TARİH İÇİN: Başlangıç kontrolü
            console.log(`🚀 Başlangıç kontrolü: Enerji için saat kontrolü başlatılıyor...`);
            
            // ✅ HIZLI: Loading gösterme, direkt çalıştır
            await this.checkAllHoursRecords();
            console.log('✅ Saat kontrolü tamamlandı');
        } catch (error) {
            console.error('Saat kontrolü başlatma hatası:', error);
        }
    },

    /**
     * Tüm saatleri kontrol et (sayfa yüklendiğinde çağrılır) - HIZLI VERSİYON
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
        const dateInput = document.getElementById('kojen-enerji-date');
        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        
        // Aktif motoru al
        const activeMotorBtn = document.querySelector('.motor-btn.active');
        const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
        
        // ✅ HER MOTOR İÇİN: Detaylı loglama
        console.log(`🔍 Enerji (${selectedMotor}) için saatlik kontrol başlatılıyor...`);
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
            console.log(`🔄 Enerji (${selectedMotor}) için yeni veri çekiliyor...`);
            
            const records = await this.getRecordsBatch(selectedDate, aktifVardiya);
            console.log(`✅ Enerji (${selectedMotor}) için ${records.length} kayıt getirildi`);
            
            // Vardiya aralığını belirle
            let startHour, endHour;
            
            if (currentHour < 8) {
                startHour = 0;
                endHour = 7;
            } else if (currentHour < 16) {
                startHour = 8;
                endHour = 15;
            } else {
                startHour = 16;
                endHour = 23;
            }
            
            // ✅ ÇÖZÜM: Tüm saatleri açık başlat (güvenli varsayım)
            for (let hour = startHour; hour <= endHour; hour++) {
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
                        console.log(`⚠️ Enerji (${selectedMotor}) - Saat ${hour}:00 için kayıt var - inputlar kapatıldı`);
                    }
                });
                
                if (kayitliSaatler.size > 0) {
                    const uniqueSaatler = Array.from(kayitliSaatler).sort((a, b) => a - b);
                    console.log(`📋 Enerji (${selectedMotor}) için kilitli saatler: ${uniqueSaatler.join(', ')}`);
                }
            } else {
                console.log(`✅ Enerji (${selectedMotor}) için kayıt bulunamadı - tüm inputlar açık`);
            }
            
            // ✅ ÇÖZÜM: Tarih kontrolünü kaldır - her zaman saat kontrolü yap
            const today = new Date().toISOString().split('T')[0];
            console.log(`🕐 Güncel saat kontrolü: ${currentHour}:00`);
            console.log(`📅 Seçilen tarih: ${selectedDate}, Bugün: ${today}`);
            
            // ✅ ÇÖZÜM: Tüm saatleri açık başlat (güvenli varsayım)
            for (let hour = startHour; hour <= endHour; hour++) {
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
                        console.log(`⚠️ Enerji (${selectedMotor}) - Saat ${hour}:00 için kayıt var - inputlar kapatıldı`);
                    }
                });
                
                if (kayitliSaatler.size > 0) {
                    const uniqueSaatler = Array.from(kayitliSaatler).sort((a, b) => a - b);
                    console.log(`📋 Enerji (${selectedMotor}) için kilitli saatler: ${uniqueSaatler.join(', ')}`);
                }
            } else {
                console.log(`✅ Enerji (${selectedMotor}) için kayıt bulunamadı - tüm inputlar açık`);
            }
            
            // ✅ YENİ: Güncel saat kontrolü - her zaman yap
            console.log(`🕐 Güncel saat kontrolü: ${currentHour}:00`);
            
            // Geçmiş saatleri kapat (vardiya aralığında)
            for (let hour = startHour; hour <= endHour; hour++) {
                if (hour < currentHour) {
                    // Geçmiş saat ve kayıt yoksa kapat
                    const hasRecord = records && records.some(record => 
                        record['Saat'] === hour
                    );
                    
                    if (!hasRecord) {
                        this.disableHourInputs(hour.toString(), true);
                        console.log(`⏰ Geçmiş saat ${hour}:00 kapatıldı (kayıtsız)`);
                    }
                }
            }
            
            // Gelecek saatleri açık bırak
            for (let hour = currentHour + 1; hour <= endHour; hour++) {
                this.disableHourInputs(hour.toString(), false);
                console.log(`🔮 Gelecek saat ${hour}:00 açık`);
            }
            
            // Mevcut saat için kontrol
            if (currentHour >= startHour && currentHour <= endHour) {
                const hasCurrentRecord = records && records.some(record => 
                    record['Saat'] === currentHour
                );
                
                if (hasCurrentRecord) {
                    this.disableHourInputs(currentHour.toString(), true);
                    console.log(`⏰ Mevcut saat ${currentHour}:00 kapatıldı (kayıtlı)`);
                } else {
                    this.disableHourInputs(currentHour.toString(), false);
                    console.log(`🔓 Mevcut saat ${currentHour}:00 açık (kayıtsız)`);
                }
            }
        }
    },

    /**
     * Toplu kayıt getirme - HIZLI VERSİYON
     */
    getRecordsBatch: async function(date, vardiya) {
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
            const activeMotorBtn = document.querySelector('.motor-btn.active');
            const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
            
            const dataPromise = GoogleSheetsAPI.getRecords('kojen_enerji', {
                tarih: date,
                vardiya: vardiya,
                motor: selectedMotor // ✅ Motor filtresi eklendi
            });
            
            const result = await Promise.race([dataPromise, timeoutPromise]);
            timeoutResolved = true;
            
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Toplu kayıt getirme hatası:', error);
            if (error.message === 'Veri çekme timeout') {
                console.log('⚠️ Enerji veri çekme timeout, boş liste döndürülüyor...');
                return [];
            }
            return [];
        }
    },

    /**
     * Verileri kaydet - ÇOKLU SAAT DESTEĞİ
     */
    saveData: async function() {
      try {
        console.log('🚀 Enerji kaydetme işlemi başlatıldı...');
        
        const dateInput = document.getElementById('kojen-enerji-date');
        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        
        const activeMotorBtn = document.querySelector('.motor-btn.active');
        const selectedMotor = activeMotorBtn ? activeMotorBtn.dataset.motor : 'motor-1';
        
        // Vardiyayı belirle
        const currentHour = new Date().getHours();
        let aktifVardiya;
        if (currentHour < 8) aktifVardiya = 'gece';
        else if (currentHour < 16) aktifVardiya = 'gunduz';
        else aktifVardiya = 'aksam';
        
        // Tüm verileri saat bazlı al
        const allData = this.getAllDataByHour();
        console.log('� Kaydedilecek saatler:', Object.keys(allData));
        
        // Boş kontrolü
        const hasData = Object.values(allData).some(hourData => 
          Object.values(hourData).some(value => value && value.trim() !== '')
        );
        
        if (!hasData) {
          Utils.showToast('⚠️ Lütfen en az bir veri girin', 'warning');
          return;
        }
        
        if (window.GoogleSheetsAPI) {
          // ✅ DOĞRU FORMAT: allData direkt obje olarak gönder
          const saveData = {
            allData: allData,  // JSON.stringify YAPMA!
            tarih: selectedDate,
            vardiya: aktifVardiya,
            motorId: selectedMotor
          };
          
          console.log('� Gönderilen veri:', saveData);
          
          const saveResult = await GoogleSheetsAPI.saveData('kojen_enerji', saveData);
          console.log('📥 Kayıt sonucu:', saveResult);
          
          if (!saveResult.success) {
            Utils.showToast(`❌ Enerji kayıt hatası: ${saveResult.error}`, 'error');
            return;
          }
          
          // Başarılı mesajı - savedCount kullan
          const savedCount = saveResult.savedHours?.length || saveResult.savedCount || 0;
          Utils.showToast(`✅ ${savedCount} saat başarıyla kaydedildi`, 'success');
          
          // Formu temizle
          this.clearAllData();
          
          // Cache'i temizle ve saatleri yeniden kontrol et
          setTimeout(() => this.checkAllHoursRecords(), 1000);
        }
        
      } catch (error) {
        console.error('❌ Kojen Enerji işlem hatası:', error);
        Utils.showToast('❌ Enerji kayıt sırasında hata oluştu', 'error');
      }
    },

    /**
     * Verileri saat bazlı grupla
     */
    getAllDataByHour: function() {
        const data = {};
        const inputs = document.querySelectorAll('.kojen-enerji-input');
        
        inputs.forEach(input => {
            if (input.value && input.value.trim() !== '') {
                const parts = input.id.split('-');
                const hour = parts[2];
                const param = parts.slice(3).join('-');
                
                if (!data[hour]) {
                    data[hour] = {};
                }
                data[hour][param] = input.value;
            }
        });
        
        return data;
    },

    /**
     * Belirtilen saatin input'larını aç/kapat
     */
    disableHourInputs: function(hour, disable) {
        const inputs = document.querySelectorAll(`.kojen-enerji-input[id^="kojen-enerji-${hour}-"]`);
        const currentHour = new Date().getHours();
        const today = new Date().toISOString().split('T')[0];
        const selectedDate = document.getElementById('kojen-enerji-date')?.value || today;
        
        inputs.forEach(input => {
            input.disabled = disable;
            if (disable) {
                input.classList.add('disabled');
                
                // ✅ YENİ: Dinamik tooltip mesajları
                const hourNum = parseInt(hour);
                let tooltipMessage = '';
                
                if (selectedDate === today) {
                    if (hourNum < currentHour) {
                        tooltipMessage = `Saat ${hour}:00 geçmiş - kayıt girilemez`;
                    } else if (hourNum === currentHour) {
                        tooltipMessage = `Saat ${hour}:00 için zaten kayıt mevcut`;
                    } else {
                        tooltipMessage = `Saat ${hour}:00 için zaten kayıt mevcut`;
                    }
                } else {
                    tooltipMessage = `Saat ${hour}:00 için zaten kayıt mevcut`;
                }
                
                input.title = tooltipMessage;
            } else {
                input.classList.remove('disabled');
                
                // ✅ YENİ: Açık input'lar için tooltip
                const hourNum = parseInt(hour);
                let tooltipMessage = '';
                
                if (selectedDate === today) {
                    if (hourNum === currentHour) {
                        tooltipMessage = `Şu an saat ${hour}:00 - veri girebilirsiniz`;
                    } else if (hourNum > currentHour) {
                        tooltipMessage = `Gelecek saat ${hour}:00 - veri girebilirsiniz`;
                    } else {
                        tooltipMessage = `Saat ${hour}:00 - veri girebilirsiniz`;
                    }
                } else {
                    tooltipMessage = `Saat ${hour}:00 - veri girebilirsiniz`;
                }
                
                input.title = tooltipMessage;
            }
        });
    },

    /**
     * Scroll senkronizasyonu ayarla
     */
    setupScrollSync: function() {
        const tableBody = document.querySelector('.kojen-enerji-table-body');
        const tableHeader = document.querySelector('.kojen-enerji-table-header');

        if (tableBody && tableHeader) {
            tableBody.addEventListener('scroll', () => {
                tableHeader.scrollLeft = tableBody.scrollLeft;
            });
        }
    },

    /**
     * Input validasyonu
     */
    validateInput: function(input, param) {
        const value = parseFloat(input.value);
        
        // Param kontrolü - null/undefined ise işlem yapma
        if (!param || !param.id) {
            console.warn('⚠️ Parametre undefined:', param);
            return false;
        }
        
        // Sınırları kontrol et
        if (isNaN(value) || value < 0) {
            input.value = '';
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        // Cos φ özel kontrolü (0-1 arası)
        if (param.id === 'cosfi' && value > 1) {
            input.value = '1.00';
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        // Maksimum değer kontrolü
        if (value > parseFloat(input.max)) {
            input.value = input.max;
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        return true;
    },

    /**
     * LocalStorage'a kaydet
     */
    saveToLocalStorage: function() {
        const data = {};
        const inputs = document.querySelectorAll('.kojen-enerji-input');
        
        inputs.forEach(input => {
            data[input.id] = input.value;
        });
        
        localStorage.setItem('kojen-enerji-data', JSON.stringify(data));
    },

    /**
     * LocalStorage'dan yükle
     */
    loadFromLocalStorage: function() {
        const savedData = localStorage.getItem('kojen-enerji-data');
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                
                Object.keys(data).forEach(id => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = data[id];
                    }
                });
            } catch (error) {
                console.error('LocalStorage yükleme hatası:', error);
            }
        }
    },

    /**
     * Tüm verileri temizle
     */
    clearAllData: function() {
        const inputs = document.querySelectorAll('.kojen-enerji-input');
        inputs.forEach(input => {
            input.value = '';
        });
        
        // LocalStorage'daki verileri de temizle
        localStorage.removeItem('kojen-enerji-data');
        
        this.saveToLocalStorage();
        Utils.showToast('Enerji verileri temizlendi', 'success');
    }
};

// KojenEnerji'yi global olarak erişilebilir yap
window.KojenEnerji = KojenEnerji;
