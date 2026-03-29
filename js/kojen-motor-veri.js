document.addEventListener('DOMContentLoaded', function() {
    // Elementleri seç
    const tarihSecimi = document.getElementById('tarihSecimi');
    const vardiyaSecimi = document.getElementById('vardiyaSecimi');
    const currentHourElement = document.getElementById('currentHour');
    
    // Motor seçim butonları
    const motorButtons = document.querySelectorAll('.motor-btn');
    
    // Butonlar
    const kaydetBtn = document.getElementById('kaydetBtn');
    const temizleBtn = document.getElementById('temizleBtn');
    const motorCalismiyorKaydetBtn = document.getElementById('motorCalismiyorKaydetBtn');
    
    // Çıkış butonları
    const sidebarLogout = document.getElementById('sidebarLogout');
    const headerLogout = document.getElementById('headerLogout');

    // Seçili motor
    let selectedMotor = 'GM-1';
    let isLocked = false; // Form kilit durumu

    // Mevcut saati güncelleme fonksiyonu
    function updateCurrentHour() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        currentHourElement.textContent = `${hours}:00`;
    }

    // Kayıt kontrolü fonksiyonu
    function checkExistingRecord(motor, tarih, saat) {
        // Burada gerçek API kontrolü yapılacak
        // Şimdilik örnek veri ile simüle edelim
        const existingRecords = JSON.parse(localStorage.getItem('motorRecords') || '[]');
        return existingRecords.find(record => 
            record.motor === motor && 
            record.tarih === tarih && 
            record.saat === saat
        );
    }

    // Tarih formatını düzeltme fonksiyonu (HTML input için)
    function formatTarihForInput(tarihStr) {
        // DD.MM.YYYY formatını YYYY-MM-DD formatına çevir
        if (tarihStr && tarihStr.includes('.')) {
            const parts = tarihStr.split('.');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        return tarihStr;
    }

    // Tarih formatını düzeltme fonksiyonu (gösterim için)
    function formatTarihForDisplay(tarihStr) {
        // YYYY-MM-DD formatını DD.MM.YYYY formatına çevir
        if (tarihStr && tarihStr.includes('-')) {
            const parts = tarihStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
        }
        return tarihStr;
    }

    // Otomatik tarih formatlama (nokta ekleme)
    function autoFormatTarih(input) {
        let value = input.value.replace(/\D/g, ''); // Sadece rakamları al
        let formattedValue = '';
        
        if (value.length >= 2) {
            formattedValue = value.substring(0, 2);
            if (value.length >= 4) {
                formattedValue += '.' + value.substring(2, 4);
                if (value.length >= 8) {
                    formattedValue += '.' + value.substring(4, 8);
                } else {
                    formattedValue += '.' + value.substring(4);
                }
            } else {
                formattedValue += '.' + value.substring(2);
            }
        } else {
            formattedValue = value;
        }
        
        input.value = formattedValue;
    }

    // Tarih validasyonu
    function validateTarih(tarihStr) {
        const regex = /^\d{2}\.\d{2}\.\d{4}$/;
        if (!regex.test(tarihStr)) return false;
        
        const parts = tarihStr.split('.');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (day < 1 || day > 31) return false;
        if (month < 1 || month > 12) return false;
        if (year < 1900 || year > 2100) return false;
        
        return true;
    }

    // Form kilitleme fonksiyonu
    function lockForm(showMessageFlag = true) {
        isLocked = true;
        
        // Input'ları kilitle
        const allInputs = document.querySelectorAll('.data-input');
        allInputs.forEach(input => {
            input.disabled = true;
            if (input.getAttribute('data-calismiyor') === 'true') {
                input.style.background = '#ffebee';
                input.style.color = '#c62828';
            } else {
                input.style.background = '#f8f9fa';
            }
            input.style.cursor = 'not-allowed';
        });
        
        // Butonları kilitle
        kaydetBtn.disabled = true;
        temizleBtn.disabled = true;
        motorCalismiyorKaydetBtn.disabled = true;
        
        kaydetBtn.style.opacity = '0.5';
        kaydetBtn.style.cursor = 'not-allowed';
        temizleBtn.style.opacity = '0.5';
        temizleBtn.style.cursor = 'not-allowed';
        motorCalismiyorKaydetBtn.style.opacity = '0.5';
        motorCalismiyorKaydetBtn.style.cursor = 'not-allowed';
        
        // Sadece istendiğinde mesaj göster
        if (showMessageFlag) {
            showMessage('Bu tarih ve saat için kayıt zaten mevcut! Form kilitlendi.', 'error');
        }
    }

    // Form kilidini açma fonksiyonu
    function unlockForm() {
        isLocked = false;
        
        // Input'ların kilidini aç
        const allInputs = document.querySelectorAll('.data-input');
        allInputs.forEach(input => {
            input.disabled = false;
            input.removeAttribute('data-calismiyor');
            input.style.background = 'white';
            input.style.color = '';
            input.style.cursor = 'text';
        });
        
        // Butonların kilidini aç
        kaydetBtn.disabled = false;
        temizleBtn.disabled = false;
        motorCalismiyorKaydetBtn.disabled = false;
        
        kaydetBtn.style.opacity = '1';
        kaydetBtn.style.cursor = 'pointer';
        temizleBtn.style.opacity = '1';
        temizleBtn.style.cursor = 'pointer';
        motorCalismiyorKaydetBtn.style.opacity = '1';
        motorCalismiyorKaydetBtn.style.cursor = 'pointer';
        
        // Motor seçim butonlarının kilidini aç
        motorButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.cursor = 'pointer';
        });
    }

    // Kayıt kontrolü ve form durumunu güncelleme
    function checkAndUpdateFormStatus() {
        if (!selectedMotor || !tarihSecimi.value || !currentHourElement.textContent) {
            return;
        }
        
        const existingRecord = checkExistingRecord(selectedMotor, tarihSecimi.value, currentHourElement.textContent);
        
        if (existingRecord) {
            lockForm(false); // Mesaj göstermeden kilitle
            
            // Mevcut kaydı input'lara yükle
            if (existingRecord.durum === 'MOTOR ÇALIŞMIYOR') {
                // Motor çalışmıyor ise input'lara işaret koy
                const allInputs = document.querySelectorAll('.data-input');
                allInputs.forEach(input => {
                    input.value = '0'; // Sayısal değer ata
                    input.style.background = '#ffebee';
                    input.style.color = '#c62828';
                    input.setAttribute('data-calismiyor', 'true'); // Özel işaret
                });
            } else {
                // Normal veri varsa input'lara yükle
                Object.keys(existingRecord.veriler).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) {
                        input.value = existingRecord.veriler[key];
                        input.removeAttribute('data-calismiyor');
                        input.style.background = 'white';
                        input.style.color = '';
                    }
                });
            }
        } else {
            unlockForm();
        }
    }

    // Mesaj gösterme fonksiyonu
    function showMessage(message, type) {
        // Mevcut mesajları temizle
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Yeni mesaj oluştur
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Stiller
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        `;
        
        // Tip'e göre renk belirle
        switch(type) {
            case 'success':
                messageDiv.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
                break;
            case 'error':
                messageDiv.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
                break;
            case 'warning':
                messageDiv.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
                break;
            case 'info':
                messageDiv.style.background = 'linear-gradient(135deg, #17a2b8, #138496)';
                break;
            default:
                messageDiv.style.background = 'linear-gradient(135deg, #6c757d, #5a6268)';
        }
        
        document.body.appendChild(messageDiv);
        
        // 3 saniye sonra mesajı kaldır
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // Tüm input'ları getir
    function getAllInputValues() {
        const inputs = {
            jenYatakSicaklikDE: document.getElementById('jenYatakSicaklikDE').value,
            jenYatakSicaklikNDE: document.getElementById('jenYatakSicaklikNDE').value,
            sogutmaSuyuSicaklik: document.getElementById('sogutmaSuyuSicaklik').value,
            sogutmaSuyuBasinc: document.getElementById('sogutmaSuyuBasinc').value,
            yagSicaklik: document.getElementById('yagSicaklik').value,
            yagBasinc: document.getElementById('yagBasinc').value,
            sarjSicaklik: document.getElementById('sarjSicaklik').value,
            sarjBasinc: document.getElementById('sarjBasinc').value,
            gazRegulatoru: document.getElementById('gazRegulatoru').value,
            makineDairesiSicaklik: document.getElementById('makineDairesiSicaklik').value,
            karterBasinc: document.getElementById('karterBasinc').value,
            onKamaraFarkBasinc: document.getElementById('onKamaraFarkBasinc').value,
            sargiSicaklik1: document.getElementById('sargiSicaklik1').value,
            sargiSicaklik2: document.getElementById('sargiSicaklik2').value,
            sargiSicaklik3: document.getElementById('sargiSicaklik3').value
        };
        
        return {
            motor: selectedMotor,
            tarih: tarihSecimi.value,
            vardiya: vardiyaSecimi.value,
            saat: currentHourElement.textContent,
            veriler: inputs
        };
    }

    // Motor butonu event listener'ları
    motorButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Önceki motorun kayıt durumunu kontrol et
            const previousRecord = checkExistingRecord(selectedMotor, tarihSecimi.value, currentHourElement.textContent);
            
            // Active class'ını kaldır
            motorButtons.forEach(btn => btn.classList.remove('active'));
            // Tıklanana active class'ını ekle
            this.classList.add('active');
            // Seçili motoru güncelle
            selectedMotor = this.dataset.motor;
            
            showMessage(`${selectedMotor} motoru seçildi!`, 'info');
            
            // Kayıt kontrolü yap (form durumunu güncelle)
            checkAndUpdateFormStatus();
            
            // Yeni motor için kayıt varsa mesaj göster
            const newRecord = checkExistingRecord(selectedMotor, tarihSecimi.value, currentHourElement.textContent);
            if (newRecord && !previousRecord) {
                showMessage(`${selectedMotor} motoru için bu tarih ve saatte kayıt mevcut!`, 'info');
            }
        });
    });

    // KAYDET butonu
    kaydetBtn.addEventListener('click', function() {
        if (isLocked) {
            showMessage('Bu kayıt zaten mevcut!', 'error');
            return;
        }
        
        const data = getAllInputValues();
        
        if (!data.motor || !data.tarih || !data.vardiya) {
            showMessage('Lütfen motor, tarih ve vardiya seçin!', 'error');
            return;
        }
        
        // Tüm input'ların dolu olup olmadığını kontrol et
        const allInputs = document.querySelectorAll('.data-input');
        const emptyInputs = Array.from(allInputs).filter(input => !input.value);
        
        if (emptyInputs.length > 0) {
            showMessage('Lütfen tüm veri alanlarını doldurun!', 'error');
            return;
        }
        
        // Negatif değer kontrolü - Karter Basıncı ve Ön Kamara Fark Basıncı
        const karterBasinc = parseFloat(document.getElementById('karterBasinc').value);
        const onKamaraFarkBasinc = parseFloat(document.getElementById('onKamaraFarkBasinc').value);
        
        if (karterBasinc >= 0) {
            const onay = confirm(`Karter basıncı pozitif değer girildi (${karterBasinc}).\n\nNegatif olması bekleniyor. Yine de pozitif değeri kaydetmek istiyor musunuz?`);
            if (!onay) {
                // Otomatik olarak negatif değere çevir
                document.getElementById('karterBasinc').value = -Math.abs(karterBasinc);
                showMessage('Karter basıncı otomatik olarak negatife çevrildi: ' + (-Math.abs(karterBasinc)), 'info');
                document.getElementById('karterBasinc').focus();
                return;
            }
        }
        
        if (onKamaraFarkBasinc >= 0) {
            const onay = confirm(`Ön kamara fark basıncı pozitif değer girildi (${onKamaraFarkBasinc}).\n\nNegatif olması bekleniyor. Yine de pozitif değeri kaydetmek istiyor musunuz?`);
            if (!onay) {
                // Otomatik olarak negatif değere çevir
                document.getElementById('onKamaraFarkBasinc').value = -Math.abs(onKamaraFarkBasinc);
                showMessage('Ön kamara fark basıncı otomatik olarak negatife çevrildi: ' + (-Math.abs(onKamaraFarkBasinc)), 'info');
                document.getElementById('onKamaraFarkBasinc').focus();
                return;
            }
        }
        
        // Kaydı localStorage'a kaydet (gerçek uygulamada API'ye gönderilecek)
        const existingRecords = JSON.parse(localStorage.getItem('motorRecords') || '[]');
        existingRecords.push(data);
        localStorage.setItem('motorRecords', JSON.stringify(existingRecords));
        
        console.log('Kaydedilen veriler:', data);
        
        // Pozitif değer kaydetme kontrolü
        const pozitifMesajlar = [];
        if (karterBasinc >= 0) {
            pozitifMesajlar.push(`Karter basıncı: ${karterBasinc} (pozitif)`);
        }
        if (onKamaraFarkBasinc >= 0) {
            pozitifMesajlar.push(`Ön kamara fark basıncı: ${onKamaraFarkBasinc} (pozitif)`);
        }
        
        if (pozitifMesajlar.length > 0) {
            showMessage(`${data.motor} motoru için veriler kaydedildi!\n⚠️ Pozitif değerler: ${pozitifMesajlar.join(', ')}`, 'warning');
        } else {
            showMessage(`${data.motor} motoru için veriler başarıyla kaydedildi!`, 'success');
        }
        
        // Formu kilitle
        lockForm();
    });

    // TEMİZLE butonu
    temizleBtn.addEventListener('click', function() {
        if (isLocked) {
            showMessage('Form kilitli! Kayıt silinemez.', 'error');
            return;
        }
        
        // Tüm input'ları temizle
        const allInputs = document.querySelectorAll('.data-input');
        allInputs.forEach(input => input.value = '');
        
        showMessage('Tüm veriler temizlendi!', 'info');
    });

    // MOTOR ÇALIŞMIYOR KAYDET butonu
    motorCalismiyorKaydetBtn.addEventListener('click', function() {
        if (isLocked) {
            showMessage('Bu kayıt zaten mevcut!', 'error');
            return;
        }
        
        const data = getAllInputValues();
        
        if (!data.motor || !data.tarih || !data.vardiya) {
            showMessage('Lütfen motor, tarih ve vardiya seçin!', 'error');
            return;
        }
        
        // Motor çalışmıyor durumunu işaretle
        const motorCalismiyorData = {
            ...data,
            durum: 'MOTOR ÇALIŞMIYOR',
            kayitZamani: new Date().toLocaleString('tr-TR')
        };
        
        // Kaydı localStorage'a kaydet (gerçek uygulamada API'ye gönderilecek)
        const existingRecords = JSON.parse(localStorage.getItem('motorRecords') || '[]');
        existingRecords.push(motorCalismiyorData);
        localStorage.setItem('motorRecords', JSON.stringify(existingRecords));
        
        console.log('Motor çalışmıyor kaydı:', motorCalismiyorData);
        showMessage(`${data.motor} motoru için "ÇALIŞMIYOR" durumu kaydedildi!`, 'warning');
        
        // Input'lara işaretle ve formu kilitle
        const allInputs = document.querySelectorAll('.data-input');
        allInputs.forEach(input => {
            input.value = '0'; // Sayısal değer
            input.style.background = '#ffebee';
            input.style.color = '#c62828';
            input.setAttribute('data-calismiyor', 'true'); // Özel işaret
        });
        
        lockForm();
    });

    // Otomatik ayarları yap
    function otomatikAyarlar() {
        // Bugünün tarihini ayarla (TR formatı)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        tarihSecimi.value = `${day}.${month}.${year}`;

        // Saate göre vardiya ayarla
        const currentHour = today.getHours();
        if (currentHour >= 8 && currentHour < 16) {
            vardiyaSecimi.value = '08-16';
        } else if (currentHour >= 16 && currentHour < 24) {
            vardiyaSecimi.value = '16-24';
        } else {
            vardiyaSecimi.value = '24-08';
        }
        
        // Mevcut saati güncelle
        updateCurrentHour();
        
        // Kayıt kontrolü yap
        checkAndUpdateFormStatus();
    }

    // Tarih ve vardiya değişiminde kontrol et
    tarihSecimi.addEventListener('input', function() {
        autoFormatTarih(this);
        checkAndUpdateFormStatus();
    });
    
    tarihSecimi.addEventListener('change', function() {
        if (!validateTarih(this.value)) {
            showMessage('Lütfen geçerli bir tarih formatı girin (GG.AA.YYYY)', 'error');
            this.value = '';
            return;
        }
        checkAndUpdateFormStatus();
    });
    
    vardiyaSecimi.addEventListener('change', checkAndUpdateFormStatus);

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

    // Sayfa yüklendiğinde otomatik ayarları yap
    otomatikAyarlar();

    // Her saniyede bir saati güncelle
    setInterval(() => {
        updateCurrentHour();
        checkAndUpdateFormStatus(); // Saat değişince kontrol et
    }, 1000);

    // Her 30 saniyede bir vardiya ayarını kontrol et
    setInterval(() => {
        const currentHour = new Date().getHours();
        let yeniVardiya;
        
        if (currentHour >= 8 && currentHour < 16) {
            yeniVardiya = '08-16';
        } else if (currentHour >= 16 && currentHour < 24) {
            yeniVardiya = '16-24';
        } else {
            yeniVardiya = '24-08';
        }

        // Eğer vardiya değiştiyse güncelle (kullanıcı manuel değişmediyse)
        if (vardiyaSecimi.value !== yeniVardiya && !vardiyaSecimi.matches(':focus')) {
            vardiyaSecimi.value = yeniVardiya;
        }
    }, 30000);
});
