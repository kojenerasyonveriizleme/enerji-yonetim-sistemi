// Kojen Enerji Veri JavaScript
// Bu dosya ana sayfa ile aynı yapıda olacak

document.addEventListener('DOMContentLoaded', function() {
    // Motor seçim butonları
    const motorButtons = document.querySelectorAll('.motor-btn');
    let selectedMotor = 'GM-1'; // Varsayılan motor
    
    // Tarih ve Vardiya Elementleri
    const tarihSecimi = document.getElementById('tarihSecimi');
    const vardiyaSecimi = document.getElementById('vardiyaSecimi');
    
    // Butonlar
    const kaydetBtn = document.getElementById('kaydetBtn');
    const temizleBtn = document.getElementById('temizleBtn');
    const motorCalismiyorKaydetBtn = document.getElementById('motorCalismiyorKaydetBtn');
    
    // Çıkış butonları
    const sidebarLogout = document.getElementById('sidebarLogout');
    const headerLogout = document.getElementById('headerLogout');

    // Çıkış butonları
    if (sidebarLogout) {
        sidebarLogout.addEventListener('click', function() {
            if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                window.location.href = 'giris.html';
            }
        });
    }

    if (headerLogout) {
        headerLogout.addEventListener('click', function() {
            if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                window.location.href = 'giris.html';
            }
        });
    }

    // Motor butonu event listener'ları
    motorButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Active class'ını kaldır
            motorButtons.forEach(btn => btn.classList.remove('active'));
            // Tıklanana active class'ını ekle
            this.classList.add('active');
            // Seçili motoru güncelle
            selectedMotor = this.dataset.motor;
            
            console.log(`${selectedMotor} motoru seçildi!`);
        });
    });

    // Tarih formatlama fonksiyonu
    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    // Otomatik tarih ayarı
    if (tarihSecimi) {
        const today = new Date();
        tarihSecimi.value = formatDate(today);
        
        // Sadece rakam girişi ve format kontrolü
        tarihSecimi.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '.' + value.slice(2);
            }
            if (value.length >= 5) {
                value = value.slice(0, 5) + '.' + value.slice(5);
            }
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            e.target.value = value;
        });
    }

    // Vardiya otomatik seçimi
    if (vardiyaSecimi) {
        const currentHour = new Date().getHours();
        let vardiya = '';
        
        if (currentHour >= 8 && currentHour < 16) {
            vardiya = '08-16';
        } else if (currentHour >= 16 && currentHour < 24) {
            vardiya = '16-24';
        } else {
            vardiya = '24-08';
        }
        
        vardiyaSecimi.value = vardiya;
    }

    // Kayıt kontrolü fonksiyonu
    function checkExistingRecord(motor, tarih, saat) {
        // Burada gerçek API kontrolü yapılacak
        // Şimdilik örnek veri ile simüle edelim
        const existingRecords = JSON.parse(localStorage.getItem('enerjiRecords') || '[]');
        return existingRecords.find(record => 
            record.motor === motor && 
            record.tarih === tarih && 
            record.saat === saat
        );
    }

    // Form durumunu kontrol et
    function checkAndUpdateFormStatus() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const currentTime = `${hours}:00`;
        
        const existingRecord = checkExistingRecord(selectedMotor, tarihSecimi.value, currentTime);
        
        if (existingRecord) {
            lockButtons();
            // Input'ları mevcut verilerle doldur
            const inputs = document.querySelectorAll('.kojen-input');
            if (existingRecord.veriler && existingRecord.veriler.length === inputs.length) {
                inputs.forEach((input, index) => {
                    input.value = existingRecord.veriler[index];
                    input.disabled = true;
                    input.style.background = '#f8d7da';
                    input.style.color = '#721c24';
                });
            }
        } else {
            unlockButtons();
            // Input'ları temizle ve aktif et
            const inputs = document.querySelectorAll('.kojen-input');
            inputs.forEach(input => {
                input.value = '';
                input.disabled = false;
                input.style.background = 'white';
                input.style.color = '#2c3e50';
            });
        }
    }

    // Butonları kilitleme fonksiyonu
    function lockButtons() {
        if (kaydetBtn) {
            kaydetBtn.disabled = true;
            kaydetBtn.style.opacity = '0.5';
            kaydetBtn.style.cursor = 'not-allowed';
        }
        if (temizleBtn) {
            temizleBtn.disabled = true;
            temizleBtn.style.opacity = '0.5';
            temizleBtn.style.cursor = 'not-allowed';
        }
        if (motorCalismiyorKaydetBtn) {
            motorCalismiyorKaydetBtn.disabled = true;
            motorCalismiyorKaydetBtn.style.opacity = '0.5';
            motorCalismiyorKaydetBtn.style.cursor = 'not-allowed';
        }
    }

    // Butonların kilidini açma fonksiyonu
    function unlockButtons() {
        if (kaydetBtn) {
            kaydetBtn.disabled = false;
            kaydetBtn.style.opacity = '1';
            kaydetBtn.style.cursor = 'pointer';
        }
        if (temizleBtn) {
            temizleBtn.disabled = false;
            temizleBtn.style.opacity = '1';
            temizleBtn.style.cursor = 'pointer';
        }
        if (motorCalismiyorKaydetBtn) {
            motorCalismiyorKaydetBtn.disabled = false;
            motorCalismiyorKaydetBtn.style.opacity = '1';
            motorCalismiyorKaydetBtn.style.cursor = 'pointer';
        }
    }

    // Kaydet butonu
    if (kaydetBtn) {
        kaydetBtn.addEventListener('click', function() {
            if (confirm(`${selectedMotor} motor enerji verileri kaydedilsin mi?`)) {
                // Input alanlarını kontrol et
                const inputs = document.querySelectorAll('.kojen-input');
                let veriler = [];
                
                inputs.forEach(input => {
                    veriler.push(input.value || '0.00');
                });
                
                // Mevcut saati al
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const currentTime = `${hours}:00`;
                
                // Kaydı localStorage'a kaydet
                const records = JSON.parse(localStorage.getItem('enerjiRecords') || '[]');
                records.push({
                    motor: selectedMotor,
                    tarih: tarihSecimi.value,
                    saat: currentTime,
                    vardiya: vardiyaSecimi.value,
                    veriler: veriler,
                    kayitTarihi: new Date().toISOString()
                });
                localStorage.setItem('enerjiRecords', JSON.stringify(records));
                
                console.log('Kaydedilen veriler:', veriler);
                console.log('Motor:', selectedMotor);
                console.log('Tarih:', tarihSecimi.value);
                console.log('Saat:', currentTime);
                console.log('Vardiya:', vardiyaSecimi.value);
                
                // Kaydet sonrası form durumunu güncelle
                checkAndUpdateFormStatus();
                
                alert('Enerji verileri başarıyla kaydedildi!');
            }
        });
    }

    // Temizle butonu
    if (temizleBtn) {
        temizleBtn.addEventListener('click', function() {
            if (confirm('Tüm enerji verileri temizlensin mi?')) {
                const inputs = document.querySelectorAll('.kojen-input');
                inputs.forEach(input => {
                    input.value = '';
                    input.disabled = false;
                    input.style.background = 'white';
                    input.style.color = '#2c3e50';
                });
                
                // Temizle sonrası butonları kilitle
                lockButtons();
                
                console.log('Tüm enerji verileri temizlendi');
            }
        });
    }

    // Motor Çalışmıyor Kaydet butonu
    if (motorCalismiyorKaydetBtn) {
        motorCalismiyorKaydetBtn.addEventListener('click', function() {
            if (confirm(`${selectedMotor} motor çalışmıyor olarak kaydedilsin mi?`)) {
                const inputs = document.querySelectorAll('.kojen-input');
                const veriler = [];
                
                inputs.forEach(input => {
                    input.value = 'MOTOR ÇALIŞMIYOR';
                    input.disabled = true;
                    input.style.background = '#f8d7da';
                    input.style.color = '#721c24';
                    veriler.push('MOTOR ÇALIŞMIYOR');
                });
                
                // Mevcut saati al
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const currentTime = `${hours}:00`;
                
                // Kaydı localStorage'a kaydet
                const records = JSON.parse(localStorage.getItem('enerjiRecords') || '[]');
                records.push({
                    motor: selectedMotor,
                    tarih: tarihSecimi.value,
                    saat: currentTime,
                    vardiya: vardiyaSecimi.value,
                    veriler: veriler,
                    kayitTarihi: new Date().toISOString(),
                    durum: 'Motor Çalışmıyor'
                });
                localStorage.setItem('enerjiRecords', JSON.stringify(records));
                
                // Kaydet sonrası form durumunu güncelle
                checkAndUpdateFormStatus();
                
                console.log(`${selectedMotor} motor çalışmıyor olarak kaydedildi`);
                console.log(`Saat: ${currentTime}`);
                alert(`${selectedMotor} motor çalışmıyor olarak kaydedildi!`);
            }
        });
    }

    // Input değişimini kontrol et (sadece aktif input'lar için)
    const inputs = document.querySelectorAll('.kojen-input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Sadece sayısal değerleri kabul et
            let value = this.value;
            
            // Eğer "MOTOR ÇALIŞMIYOR" değilse, sayısal kontrol yap
            if (!value.includes('MOTOR')) {
                // Sadece rakamları ve noktayı kabul et
                value = value.replace(/[^0-9.]/g, '');
                
                // Birden fazla noktayı engelle
                const parts = value.split('.');
                if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                }
                
                // Ondalık kısmı 2 basamakla sınırla
                if (parts.length === 2 && parts[1].length > 2) {
                    value = parts[0] + '.' + parts[1].substring(0, 2);
                }
                
                this.value = value;
            }
            
            // Sadece aktif input'lar değiştiğinde butonları aktif et
            if (!this.disabled) {
                unlockButtons();
            }
        });
        
        // Yapıştırma olayını da kontrol et
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const numericData = pastedData.replace(/[^0-9.]/g, '');
            document.execCommand('insertText', false, numericData);
        });
    });

    // Motor değişiminde form durumunu kontrol et
    motorButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Active class'ını kaldır
            motorButtons.forEach(btn => btn.classList.remove('active'));
            // Tıklanana active class'ını ekle
            this.classList.add('active');
            // Seçili motoru güncelle
            selectedMotor = this.dataset.motor;
            
            console.log(`${selectedMotor} motoru seçildi!`);
            
            // Form durumunu güncelle
            checkAndUpdateFormStatus();
        });
    });

    // Tarih ve vardiya değişiminde form durumunu kontrol et
    if (tarihSecimi) {
        tarihSecimi.addEventListener('change', checkAndUpdateFormStatus);
    }
    
    if (vardiyaSecimi) {
        vardiyaSecimi.addEventListener('change', checkAndUpdateFormStatus);
    }

    // Sayfa yüklendiğinde form durumunu kontrol et
    checkAndUpdateFormStatus();

    // Mevcut saati gösteren fonksiyon
    function updateCurrentHour() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        
        // Mevcut saat formatı: 17:00 (sadece saat, dakika her zaman 00)
        const currentTime = `${hours}:00`;
        
        // Tablodaki saat sütununu güncelle
        const stickyCol = document.querySelector('.kojen-enerji-table-body .kojen-enerji-table-row .kojen-enerji-table-cell.sticky-col');
        if (stickyCol) {
            stickyCol.textContent = currentTime;
        }
        
        // Form durumunu güncelle (yeni saat ile)
        checkAndUpdateFormStatus();
        
        return currentTime;
    }

    // Sayfa yüklendiğinde
    console.log('Kojen Enerji Veri sayfası yüklendi');
    console.log(`Seçili motor: ${selectedMotor}`);
    
    // Mevcut saati göster
    const currentHour = updateCurrentHour();
    console.log(`Mevcut saat: ${currentHour}`);
    
    // Her saat başında saati güncelle
    setInterval(updateCurrentHour, 3600000); // 1 saat = 3600000 ms
});
