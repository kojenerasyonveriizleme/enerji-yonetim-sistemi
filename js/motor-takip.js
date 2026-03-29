// Motor Takip JavaScript Fonksiyonları
// Google Sheets + Drive Entegrasyonu

// Google Apps Script URL
const MOTOR_TAKIP_GAS_URL = 'https://script.google.com/macros/s/AKfycbz5DWF5YUhcK2X2nW0UmY914MW4CTMKqXtUlR4zJqAAZ-sGKUPmR4AXzsobjX1jAbuFXw/exec';

document.addEventListener('DOMContentLoaded', function() {
    // Sayfa yüklendiğinde çalışacak fonksiyonlar
    initializeMotorTracking();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    console.log('Motor Takip sayfası yüklendi');
});

// Dosyayı Base64'e çevir
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Tarih ve Saat Güncelleme
function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
    
    if (dateElement) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('tr-TR', options);
    }
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Motor Takip Sistemi
function initializeMotorTracking() {
    const form = document.getElementById('motor-tracking-form');
    const photoInput = document.getElementById('motor-photo');
    const photoUploadArea = document.getElementById('photo-upload-area');
    const photoPreview = document.getElementById('photo-preview');
    const previewImage = document.getElementById('preview-image');
    const removePhotoBtn = document.getElementById('remove-photo');
    const clearFormBtn = document.getElementById('clear-form');
    
    // Form gönderimi
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Fotoğraf yükleme
    if (photoInput && photoUploadArea) {
        photoInput.addEventListener('change', handlePhotoUpload);
        
        // Fotoğraf alanına tıklama
        photoUploadArea.addEventListener('click', handlePhotoUploadClick);
        
        // Drag and drop
        photoUploadArea.addEventListener('dragover', handleDragOver);
        photoUploadArea.addEventListener('drop', handleDrop);
        photoUploadArea.addEventListener('dragleave', handleDragLeave);
    }
    
    // Fotoğraf kaldırma
    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', removePhoto);
    }
    
    // Form temizleme
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearForm);
    }
    
    // Varsayılan değerleri ayarla
    setDefaultValues();
    
    // Kayıtları yükle
    loadRecords();
}

// Fotoğraf Yükleme
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.type.startsWith('image/')) {
            displayPhotoPreview(file);
        } else {
            showNotification('error', 'Hata!', 'Lütfen sadece resim dosyası seçin.');
            e.target.value = '';
        }
    }
}

// Drag and Drop İşlemleri
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#667eea';
    e.currentTarget.style.background = '#f0f4ff';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#cbd5e0';
    e.currentTarget.style.background = '#f8fafc';
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#cbd5e0';
    e.currentTarget.style.background = '#f8fafc';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            const photoInput = document.getElementById('motor-photo');
            if (photoInput) {
                photoInput.files = files;
                displayPhotoPreview(file);
            }
        } else {
            showNotification('error', 'Hata!', 'Lütfen sadece resim dosyası sürükleyin.');
        }
    }
}

// Form gönderimi - Google Sheets
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Form verilerini al
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    // Vardiya değerini manuel olarak ekle
    const shiftSelect = document.getElementById('shift');
    if (shiftSelect) {
        data['shift'] = shiftSelect.value;
    }
    
    // Fotoğraf kontrolü
    const photoInput = document.getElementById('motor-photo');
    if (!photoInput.files || !photoInput.files[0]) {
        showNotification('error', 'Hata!', 'Lütfen motor fotoğrafı yükleyin.');
        return;
    }
    
    // Loading göster
    showLoading();
    
    try {
        // Fotoğrafı base64'e çevir
        const file = photoInput.files[0];
        const base64Photo = await fileToBase64(file);
        
        // URL oluştur ve parametreleri ekle (GET ile gönder)
        const url = new URL(MOTOR_TAKIP_GAS_URL);
        url.searchParams.append('action', 'addRecord');
        url.searchParams.append('date', data['tracking-date']);
        url.searchParams.append('time', data['tracking-time']);
        url.searchParams.append('kontrolYeri', data['kontrol-yerleri'] || data['motor-select']);
        url.searchParams.append('motor', data['kontrol-yerleri'] || data['motor-select']);
        url.searchParams.append('operator', data['operator']);
        url.searchParams.append('shift', data['shift']);
        url.searchParams.append('vardiya', data['shift']);
        url.searchParams.append('photo', base64Photo.substring(0, 50000)); // Base64'ün ilk 50K'sını gönder (limit için)
        url.searchParams.append('kaydeden', data['operator'] || 'Admin');
        
        // Google Apps Script'e GET ile gönder
        const response = await fetch(url);
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Kayıt Başarılı!', 
                `Motor kaydı ve fotoğraf Drive/Sheets'e kaydedildi. (ID: ${result.data.id})`);
            clearForm();
            await loadRecords();
        } else {
            showNotification('error', 'Hata!', result.error || 'Kayıt oluşturulamadı');
        }
    } catch (err) {
        console.error('Kayıt hatası:', err);
        showNotification('error', 'Bağlantı Hatası', err.toString());
    } finally {
        hideLoading();
    }
}

// Kayıt kontrolü - aynı motor, tarih ve saat için kayıt var mı?
function isRecordExists(kontrolYerleri, tarih, saat) {
    const records = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    
    return records.some(record => 
        record.motorSelector === kontrolYerleri && 
        record.date === tarih && 
        record.time === saat
    );
}

// Mobil Kamera Açma
function handlePhotoUploadClick(e) {
    e.preventDefault();
    
    // Dosya adını oluştur
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().slice(0, 5).replace(':', ''); // HHMM
    const fileName = `${dateStr}_${timeStr}_MOTOR_FOTOGRAFI.jpg`;
    
    // Kamera açmayı dene
    openCamera(fileName);
}

// Mobil/Tablet kontrolü
function isMobileOrTablet() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    return isMobile || isTablet;
}

// Kamera açma fonksiyonu
function openCamera(fileName) {
    showNotification('info', 'Kamera Açılıyor', 'Kamera erişimi için izin isteniyor...');
    
    // Camera API ile fotoğraf çek
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Kamera erişimi iste
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Arka kamera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        })
        .then(function(stream) {
            showNotification('success', 'Başarılı', 'Kamera açıldı! Fotoğraf çekmek için butona basın.');
            // Video stream'i al
            showCameraModal(stream, fileName);
        })
        .catch(function(error) {
            console.error('Kamera erişim hatası:', error);
            showNotification('warning', 'Kamera Hatası', 'Kamera erişimi sağlanamadı. HTTPS bağlantısı gerekebilir.');
            // Kamera erişimi olmazsa file input'a dön
            fallbackToFileInput(fileName);
        });
    } else {
        // Camera API desteklemiyorsa file input'a dön
        showNotification('warning', 'Desteklenmiyor', 'Tarayıcınız kamera API\'yi desteklemiyor. Dosya seçimi açılıyor.');
        fallbackToFileInput(fileName);
    }
}

// Kamera modal gösterimi
function showCameraModal(stream, fileName) {
    // Modal oluştur
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
        <div class="camera-modal-content">
            <div class="camera-header">
                <h3>Motor Fotoğrafı Çek</h3>
                <button class="camera-close" id="camera-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="camera-body">
                <video id="camera-video" autoplay playsinline></video>
                <canvas id="camera-canvas" style="display: none;"></canvas>
                <div class="camera-controls">
                    <button class="camera-capture-btn" id="camera-capture">
                        <i class="fas fa-camera"></i>
                        Fotoğraf Çek
                    </button>
                    <button class="camera-switch-btn" id="camera-switch">
                        <i class="fas fa-sync-alt"></i>
                        Kamera Değiştir
                    </button>
                </div>
                <div class="camera-info">
                    <p><strong>Dosya Adı:</strong> ${fileName}</p>
                    <p><strong>Tip:</strong> Motor Fotoğrafı</p>
                </div>
            </div>
        </div>
    `;
    
    // Modal stilleri
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;
    
    document.body.appendChild(modal);
    
    // Video element'ine stream'i bağla
    const video = document.getElementById('camera-video');
    video.srcObject = stream;
    
    // Kamera kontrolleri
    setupCameraControls(modal, stream, fileName);
}

// Kamera kontrollerini ayarla
function setupCameraControls(modal, stream, fileName) {
    const closeBtn = document.getElementById('camera-close');
    const captureBtn = document.getElementById('camera-capture');
    const switchBtn = document.getElementById('camera-switch');
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    
    // Kapat
    closeBtn.addEventListener('click', function() {
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
    });
    
    // Fotoğraf çek
    captureBtn.addEventListener('click', function() {
        capturePhoto(video, canvas, fileName, modal, stream);
    });
    
    // Kamera değiştir (isteğe bağlı)
    if (switchBtn) {
        switchBtn.addEventListener('click', function() {
            switchCamera(stream, video);
        });
    }
}

// Fotoğraf çek
function capturePhoto(video, canvas, fileName, modal, stream) {
    showNotification('info', 'Fotoğraf Çekiliyor', 'Lütfen bekleyin...');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    
    // Canvas'tan blob oluştur
    canvas.toBlob(function(blob) {
        // Dosya oluştur
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        // File input'a ata
        const photoInput = document.getElementById('motor-photo');
        if (photoInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            photoInput.files = dataTransfer.files;
            
            // Önizleme göster
            displayPhotoPreview(file);
        }
        
        // Stream'i durdur ve modalı kapat
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
        
        showNotification('success', 'Başarılı!', `Fotoğraf başarıyla çekildi: ${fileName}`);
    }, 'image/jpeg', 0.9);
}

// Kamera değiştir (basit implementasyon)
function switchCamera(stream, video) {
    // Basit kamera değiştirme - stream'i yeniden başlat
    const currentFacingMode = stream.getVideoTracks()[0].getSettings().facingMode || 'user';
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // Mevcut stream'i durdur
    stream.getTracks().forEach(track => track.stop());
    
    // Yeni stream başlat
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newFacingMode } 
    })
    .then(function(newStream) {
        video.srcObject = newStream;
        // Global stream değişkenini güncelle (modal kapanınca kullanılacak)
        window.currentCameraStream = newStream;
    })
    .catch(function(error) {
        console.error('Kamera değiştirme hatası:', error);
        showNotification('error', 'Hata', 'Kamera değiştirilemedi.');
    });
}

// Yedek file input
function fallbackToFileInput(fileName) {
    const photoInput = document.getElementById('motor-photo');
    if (photoInput) {
        // Dosya adını ayarla (not: file input ile dosya adı değiştirilemez, sadece bilgi amaçlı)
        showNotification('info', 'Bilgi', `Dosya adı: ${fileName}\n\nKamera erişimi bulunamadığından dosya seçimi açılıyor.`);
        photoInput.click();
    }
}

// Seçilen değerleri metin olarak al
function getSelectedValuesText() {
    const selectedValues = getSelectedValues();
    const valueMap = {
        'ht-basinc': 'HT BASINÇ',
        'lt-basinc': 'LT BASINÇ',
        'yag-seviyesi': 'YAĞ SEVİYESİ'
    };
    
    return selectedValues.map(value => valueMap[value] || value).join(', ');
}

// Fotoğraf Önizleme
function displayPhotoPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('preview-image');
        const photoPreview = document.getElementById('photo-preview');
        const photoUploadArea = document.getElementById('photo-upload-area');
        
        if (previewImage && photoPreview) {
            previewImage.src = e.target.result;
            photoPreview.style.display = 'block';
            photoUploadArea.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// Fotoğraf Kaldırma
function removePhoto() {
    const photoInput = document.getElementById('motor-photo');
    const photoPreview = document.getElementById('photo-preview');
    const photoUploadArea = document.getElementById('photo-upload-area');
    const previewImage = document.getElementById('preview-image');
    
    if (photoInput) photoInput.value = '';
    if (previewImage) previewImage.src = '';
    if (photoPreview) photoPreview.style.display = 'none';
    if (photoUploadArea) photoUploadArea.style.display = 'block';
}

// Drag and Drop İşlemleri
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#667eea';
    e.currentTarget.style.background = '#f0f4ff';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#cbd5e0';
    e.currentTarget.style.background = '#f8fafc';
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#cbd5e0';
    e.currentTarget.style.background = '#f8fafc';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            const photoInput = document.getElementById('motor-photo');
            if (photoInput) {
                photoInput.files = files;
                displayPhotoPreview(file);
            }
        } else {
            showNotification('error', 'Hata!', 'Lütfen sadece resim dosyası sürükleyin.');
        }
    }
}

// Kayıt Kaydetme
function saveRecord(data) {
    // LocalStorage'dan mevcut kayıtları al
    let records = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    
    // Yeni kayıt oluştur
    const record = {
        id: Date.now(),
        date: data['tracking-date'],
        time: data['tracking-time'],
        motorSelector: data['kontrol-yerleri'],
        operator: data['operator'],
        shift: data['shift'],
        photo: data['photo'],
        createdAt: new Date().toISOString()
    };
    
    // Kaydı ekle
    records.unshift(record);
    
    // LocalStorage'a kaydet
    localStorage.setItem('motorTrackingRecords', JSON.stringify(records));
    
    // Başarı mesajı göster
    const operatorName = getOperatorName(data['operator']);
    const motorSelectorName = getMotorSelectorName(data['kontrol-yerleri']);
    const shiftName = getShiftName(data['shift']);
    
    const message = `Motor takip kaydı başarıyla oluşturuldu:\n` +
                     `Tarih: ${formatDate(data['tracking-date'])}\n` +
                     `Saat: ${data['tracking-time']}\n` +
                     `Motor: ${motorSelectorName}\n` +
                     `Operatör: ${operatorName}\n` +
                     `Vardiya: ${shiftName}`;
    
    showNotification('success', 'Kayıt Başarılı!', message);
    
    // Formu temizle
    clearForm();
    
    // Kayıtları yeniden yükle
    loadRecords();
    
    hideLoading();
}

// Kayıtları Yükle - Google Sheets
async function loadRecords() {
    const tbody = document.getElementById('records-tbody');
    const counterElement = document.getElementById('total-records-count');
    
    // Loading mesajı göster
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">Kayıtlar yükleniyor...</td></tr>';
    
    try {
        // Google Sheets'ten kayıtları çek (GET ile)
        const url = new URL(MOTOR_TAKIP_GAS_URL);
        url.searchParams.append('action', 'getRecords');
        
        console.log('Fetching URL:', url.toString());
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',  // CORS sorununu cozmek icin
            cache: 'no-cache'
        });
        
        console.log('Response:', response);
        
        const result = await response.json();
        
        console.log('Response data:', result);
        
        if (!result.success) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #e74c3c;">Kayıtlar yüklenemedi: ' + (result.error || 'Bilinmeyen hata') + '</td></tr>';
            return;
        }
        
        const records = result.data || [];
        
        // Kayıt sayısını güncelle
        if (counterElement) {
            counterElement.textContent = records.length;
        }
        
        tbody.innerHTML = '';
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">Henüz kayıt bulunmuyor</td></tr>';
            return;
        }
        
        // Son 10 kaydı göster
        const recentRecords = records.slice(0, 10);
        
        recentRecords.forEach(record => {
            const row = createRecordRowFromSheet(record);
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Kayıtlar yüklenirken hata:', err);
        console.error('Hata detayı:', err.message);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #e74c3c;">Sunucu hatası: ' + err.message + '</td></tr>';
    }
}

// Kayıt Satırı Oluşturma - Sheet'ten
function createRecordRowFromSheet(record) {
    const row = document.createElement('tr');
    
    const operatorName = getOperatorName(record.operator);
    const motorName = getMotorSelectorName(record.kontrolYeri || record.motor);
    const shiftName = getShiftName(record.shift || record.vardiya);
    
    row.innerHTML = `
        <td>${formatDate(record.date)}</td>
        <td>${record.time}</td>
        <td>${motorName}</td>
        <td>${operatorName}</td>
        <td>${shiftName}</td>
        <td>
            ${record.photoUrl 
                ? `<img src="${record.photoUrl}" alt="Motor Fotoğrafı" onclick="viewPhoto('${record.photoUrl}')">` 
                : '<span style="color: #64748b;">Fotoğraf yok</span>'
            }
        </td>
        <td>
            <div class="action-buttons">
                <button class="action-btn view-btn" onclick="viewRecordById('${record.id}')">
                    <i class="fas fa-eye"></i> Gör
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Eski localStorage kayıt satırı (geriye uyumluluk için)
function createRecordRow(record) {
    const row = document.createElement('tr');
    
    const operatorName = getOperatorName(record.operator);
    const motorSelectorName = getMotorSelectorName(record.motorSelector || record.kontrolYeri);
    const shiftName = getShiftName(record.shift || record.vardiya);
    
    row.innerHTML = `
        <td>${formatDate(record.date)}</td>
        <td>${record.time}</td>
        <td>${motorSelectorName}</td>
        <td>${operatorName}</td>
        <td>${shiftName}</td>
        <td>
            ${record.photo || record.photoUrl ? 
                `<img src="${record.photo || record.photoUrl}" alt="Motor Fotoğrafı" onclick="viewPhoto('${record.photo || record.photoUrl}')">` : 
                '<span style="color: #64748b;">Fotoğraf yok</span>'
            }
        </td>
        <td>
            <div class="action-buttons">
                <button class="action-btn view-btn" onclick="viewRecord('${record.id}')">
                    <i class="fas fa-eye"></i> Gör
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Kayıt Silme
function deleteRecord(recordId) {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    let records = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    records = records.filter(record => record.id != recordId);
    localStorage.setItem('motorTrackingRecords', JSON.stringify(records));
    
    showNotification('success', 'Başarılı', 'Kayıt başarıyla silindi.');
    loadRecords();
}

// Kayıt Görüntüleme
function viewRecord(recordId) {
    const records = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    const record = records.find(r => r.id == recordId);
    
    if (!record) return;
    
    const operatorName = getOperatorName(record.operator);
    const motorSelectorName = getMotorSelectorName(record.motorSelector);
    const shiftName = getShiftName(record.shift);
    
    const message = `Motor Takip Kaydı\n\n` +
                     `Tarih: ${formatDate(record.date)}\n` +
                     `Saat: ${record.time}\n` +
                     `Motor: ${motorSelectorName}\n` +
                     `Operatör: ${operatorName}\n` +
                     `Vardiya: ${shiftName}\n` +
                     `Oluşturulma: ${new Date(record.createdAt).toLocaleString('tr-TR')}`;
    
    showNotification('info', 'Kayıt Detayları', message);
}

// Fotoğraf Görüntüleme
function viewPhoto(photoSrc) {
    const modal = document.createElement('div');
    modal.className = 'photo-modal';
    modal.innerHTML = `
        <div class="photo-modal-content">
            <button class="photo-modal-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <img src="${photoSrc}" alt="Motor Fotoğrafı">
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        cursor: pointer;
    `;
    
    const content = modal.querySelector('.photo-modal-content');
    content.style.cssText = `
        position: relative;
        max-width: 90%;
        max-height: 90%;
    `;
    
    const closeBtn = modal.querySelector('.photo-modal-close');
    closeBtn.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        background: white;
        border: none;
        width: 35px;
        height: 35px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const img = modal.querySelector('img');
    img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// Form Temizleme
function clearForm() {
    const form = document.getElementById('motor-tracking-form');
    if (form) {
        form.reset();
        removePhoto();
        setDefaultValues();
    }
}

// Varsayılan Değerleri Ayarlama
function setDefaultValues() {
    const dateInput = document.getElementById('tracking-date');
    const timeInput = document.getElementById('tracking-time');
    const shiftSelect = document.getElementById('shift');
    const motorSelector = document.getElementById('kontrol-yerleri');
    const operatorSelect = document.getElementById('operator');
    const form = document.getElementById('motor-tracking-form');
    
    // Kullanıcı adını göster
    displayUserName();
    
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    if (timeInput) {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        timeInput.value = `${currentHour}:00`;
    }
    
    // Saat 00:00 kontrolü ve kilitleme mantığı
    checkAndLockForm();
    
    // Otomatik vardiya belirleme
    if (shiftSelect) {
        const currentHour = new Date().getHours();
        let autoShift = '';
        
        if (currentHour >= 8 && currentHour < 16) {
            autoShift = 'morning'; // Gündüz 08:00 - 16:00
        } else if (currentHour >= 16 && currentHour < 24) {
            autoShift = 'evening'; // Akşam 16:00 - 24:00
        } else {
            autoShift = 'night'; // Gece 24:00 - 08:00
        }
        
        shiftSelect.value = autoShift;
        shiftSelect.disabled = true; // Kullanıcı değiştiremesin
    }
}

// Saat 00:00 kontrolü ve form kilitleme
function checkAndLockForm() {
    const today = new Date().toISOString().split('T')[0];
    const records = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    
    // Bugün için saat 00:00'da yapılmış kayıtları kontrol et
    const todayMidnightRecords = records.filter(record => 
        record.date === today && record.time === '00:00'
    );
    
    const form = document.getElementById('motor-tracking-form');
    const motorSelector = document.getElementById('kontrol-yerleri');
    const operatorSelect = document.getElementById('operator');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (todayMidnightRecords.length > 0) {
        // Kayıt varsa, hangi seçenekler için kayıt yapıldığını kontrol et
        const recordedOptions = todayMidnightRecords.map(record => record.motorSelector);
        
        // Form elemanlarını kilitle
        if (motorSelector) {
            // Kayıtlı seçenekleri devre dışı bırak
            Array.from(motorSelector.options).forEach(option => {
                if (recordedOptions.includes(option.value)) {
                    option.disabled = true;
                    option.textContent += ' (Kayıtlı)';
                }
            });
            
            // Eğer tüm seçenekler kayıtlıysa formu tamamen kilitle
            if (recordedOptions.length === motorSelector.options.length - 1) {
                motorSelector.disabled = true;
                if (operatorSelect) operatorSelect.disabled = true;
                if (submitBtn) submitBtn.disabled = true;
                
                showNotification('warning', 'Form Kilitli', 'Tüm motor seçenekleri için bugün saat 00:00 kaydı yapılmış.');
            } else {
                showNotification('info', 'Kısmi Kilit', 'Bazı motor seçenekleri için bugün saat 00:00 kaydı yapılmış.');
            }
        }
    } else {
        // Kayıt yoksa, tüm elemanları aktif tut
        if (motorSelector) {
            Array.from(motorSelector.options).forEach(option => {
                option.disabled = false;
                option.textContent = option.textContent.replace(' (Kayıtlı)', '');
            });
        }
        if (operatorSelect) operatorSelect.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Kullanıcı adını göster
function displayUserName() {
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) {
        // LocalStorage'dan kullanıcı bilgilerini al
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userName = currentUser.name || currentUser.username || 'Admin';
        userNameDisplay.textContent = userName;
    }
}

// Yardımcı Fonksiyonlar
function getOperatorName(operatorValue) {
    const operatorMap = {
        'ibrahim-ogun': 'İbrahim Ogün Şahin',
        'yakup-can': 'Yakup Can Cin',
        'oguzhan-yaylali': 'Oğuzhan Yaylalı',
        'altan-hunoglu': 'Altan Hunoğlu'
    };
    return operatorMap[operatorValue] || operatorValue;
}

function getMotorName(motorValue) {
    const motorMap = {
        'gm1': 'GM-1',
        'gm2': 'GM-2',
        'gm3': 'GM-3'
    };
    return motorMap[motorValue] || motorValue;
}

function getMotorSelectorName(motorSelectorValue) {
    const motorSelectorMap = {
        'ht': 'HT',
        'lt': 'LT',
        'yag-seviyesi': 'Yağ Seviyesi'
    };
    return motorSelectorMap[motorSelectorValue] || motorSelectorValue;
}

function getShiftName(shiftValue) {
    const shiftMap = {
        'morning': 'Gündüz',
        'evening': 'Akşam',
        'night': 'Gece'
    };
    return shiftMap[shiftValue] || shiftValue;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Bildirim Sistemi
function showNotification(type, title, message) {
    // Bildirim elementi oluştur
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const iconMap = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle',
        'warning': 'fas fa-exclamation-triangle'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${iconMap[type] || 'fas fa-info-circle'}"></i>
        </div>
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: flex-start;
        gap: 15px;
        min-width: 350px;
        max-width: 450px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    const iconElement = notification.querySelector('.notification-icon');
    iconElement.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1.2rem;
    `;
    
    const contentElement = notification.querySelector('.notification-content');
    contentElement.style.cssText = `
        flex: 1;
    `;
    
    const titleElement = notification.querySelector('h4');
    titleElement.style.cssText = `
        margin: 0 0 5px 0;
        font-size: 1rem;
        font-weight: 600;
        color: #2c3e50;
    `;
    
    const messageElement = notification.querySelector('p');
    messageElement.style.cssText = `
        margin: 0;
        font-size: 0.9rem;
        color: #64748b;
        white-space: pre-line;
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 1rem;
        padding: 0;
        transition: color 0.3s ease;
    `;
    
    closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.color = '#2c3e50';
    });
    
    closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.color = '#64748b';
    });
    
    // Renkleri ayarla
    const colorMap = {
        'success': { bg: '#d4edda', icon: '#28a745' },
        'error': { bg: '#f8d7da', icon: '#dc3545' },
        'info': { bg: '#d1ecf1', icon: '#17a2b8' },
        'warning': { bg: '#fff3cd', icon: '#ffc107' }
    };
    
    const colors = colorMap[type] || colorMap['info'];
    iconElement.style.background = colors.bg;
    iconElement.style.color = colors.icon;
    
    // Ekrana ekle
    document.body.appendChild(notification);
    
    // Otomatik kaldır
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Loading Göster/Gizle
function showLoading() {
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Kaydediliyor...';
    }
}

function hideLoading() {
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Kaydet';
    }
}

// Sidebar Toggle
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
});

// Bildirim Modal
document.addEventListener('DOMContentLoaded', function() {
    const notificationBtn = document.querySelector('.notification-btn');
    const notificationModal = document.getElementById('notification-modal');
    const closeNotifications = document.getElementById('close-notifications');
    
    if (notificationBtn && notificationModal) {
        notificationBtn.addEventListener('click', function() {
            notificationModal.style.display = 'flex';
        });
    }
    
    if (closeNotifications && notificationModal) {
        closeNotifications.addEventListener('click', function() {
            notificationModal.style.display = 'none';
        });
    }
    
    if (notificationModal) {
        notificationModal.addEventListener('click', function(e) {
            if (e.target === notificationModal) {
                notificationModal.style.display = 'none';
            }
        });
    }
});

// CSS Animasyonları
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
