// Motor Takip JavaScript Fonksiyonları

document.addEventListener('DOMContentLoaded', function() {
    // Sayfa yüklendiğinde çalışacak fonksiyonlar
    initializeMotorTracking();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    console.log('Motor Takip sayfası yüklendi');
});

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
    // Motor butonları
    initializeMotorButtons();
    
    // Varsayılan değerleri ayarla
    setDefaultValues();
    
    // Kayıtları yükle
    loadRecords();
}

// Kayıt kontrolü - aynı tarih ve saat için kayıt var mı?
function isRecordExists(tarih, saat) {
    const records = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    
    return records.some(record => 
        record.date === tarih && 
        record.time === saat
    );
}

// Google Apps Script URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyMFTAVlLRY_ODiaogPDP09J_80i-u437fMqETUPGsbaQ29lt0iPxuNlVVmyzH8ABvJbw/exec';

// Kayıtları Yükle - Google Apps Script'ten ve LocalStorage'dan çek
async function loadRecords() {
    const tbody = document.getElementById('records-tbody');
    const counterElement = document.getElementById('total-records-count');
    
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #64748b;"><i class="fas fa-spinner fa-spin"></i> Kayıtlar yükleniyor...</td></tr>';
    
    // LocalStorage'dan kayıtları al
    const localRecords = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    
    try {
        // Google Apps Script'ten kayıtları çek
        const response = await fetch(GAS_URL, {
            method: 'GET'
        });
        
        const result = await response.json();
        
        tbody.innerHTML = '';
        
        // Her iki kaynaktan gelen kayıtları birleştir
        let allRecords = [];
        
        // GAS kayıtlarını ekle
        if (result.success && result.records) {
            const gasRecords = result.records.map(r => ({
                ...r,
                source: 'gas',
                timestamp: r.timestamp || new Date(r['Tarih'] + ' ' + r['Saat']).getTime()
            }));
            allRecords = [...gasRecords];
        }
        
        // Local kayıtları ekle (syncError olanlar veya GAS'te olmayanlar)
        localRecords.forEach(localRec => {
            // Duplicate kontrolü - GAS'te var mı?
            const existsInGas = allRecords.some(gasRec => 
                gasRec['Kayıt No'] === localRec.kayitNo || 
                gasRec['Kayit No'] === localRec.kayitNo
            );
            
            if (!existsInGas || localRec.syncError) {
                allRecords.push({
                    'Kayıt No': localRec.kayitNo,
                    'Kayit No': localRec.kayitNo,
                    'Tarih': localRec.date,
                    'Saat': localRec.time,
                    'Motor': localRec.motor,
                    'Kontrol Yeri': localRec.kontrolYeri,
                    'Operatör': getOperatorName(localRec.operator),
                    'Vardiya': getShiftName(localRec.vardiya),
                    'Drive Link': localRec.driveLink,
                    source: 'local',
                    timestamp: new Date(localRec.timestamp).getTime(),
                    fotoData: localRec.fotoData,
                    syncError: localRec.syncError
                });
            }
        });
        
        // Tarih/saat'e göre sırala (en yeni önce)
        allRecords.sort((a, b) => {
            const timeA = new Date(a['Tarih'] + ' ' + a['Saat']).getTime() || a.timestamp || 0;
            const timeB = new Date(b['Tarih'] + ' ' + b['Saat']).getTime() || b.timestamp || 0;
            return timeB - timeA;
        });
        
        // Kayıt sayısını güncelle
        if (counterElement) {
            counterElement.textContent = allRecords.length;
        }
        
        if (allRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">Henüz kayıt bulunmuyor</td></tr>';
            return;
        }
        
        // Son 10 kaydı göster
        const recentRecords = allRecords.slice(0, 10);
        
        recentRecords.forEach(record => {
            const row = createRecordRowUnified(record);
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Kayıtları yükleme hatası:', error);
        
        // GAS hata verirse sadece local kayıtları göster
        tbody.innerHTML = '';
        
        if (localRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">Sunucuya ulaşılamıyor ve yerel kayıt yok.</td></tr>';
            return;
        }
        
        // Local kayıtları formatla
        const formattedLocalRecords = localRecords.map(r => ({
            'Kayıt No': r.kayitNo,
            'Kayit No': r.kayitNo,
            'Tarih': r.date,
            'Saat': r.time,
            'Motor': r.motor,
            'Kontrol Yeri': r.kontrolYeri,
            'Operatör': getOperatorName(r.operator),
            'Vardiya': getShiftName(r.vardiya),
            'Drive Link': r.driveLink,
            source: 'local',
            timestamp: new Date(r.timestamp).getTime(),
            fotoData: r.fotoData,
            syncError: r.syncError
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        if (counterElement) {
            counterElement.textContent = formattedLocalRecords.length;
        }
        
        formattedLocalRecords.slice(0, 10).forEach(record => {
            const row = createRecordRowUnified(record);
            tbody.appendChild(row);
        });
    }
}

// Sheets'ten ve LocalStorage'dan gelen kayıt için birleşik satır oluşturma
function createRecordRowUnified(record) {
    const row = document.createElement('tr');
    
    const rawMotor = record['Motor'] || record['Motor'] || '-';
    const motorName = formatMotorName(rawMotor);
    const operatorName = record['Operatör'] || record['Operatör'] || '-';
    const vardiya = record['Vardiya'] || record['Vardiya'] || '-';
    const tarih = record['Tarih'] || record['Tarih'] || '-';
    const saat = record['Saat'] || record['Saat'] || '-';
    const kontrolYeri = record['Kontrol Yeri'] || record['KontrolYeri'] || '-';
    const fileUrl = record['Drive Link'] || record['Drive Link'] || '';
    const kayitNo = record['Kayit No'] || record['Kayıt No'] || '-';
    const source = record.source || 'gas';
    const fotoData = record.fotoData;
    const syncError = record.syncError;
    
    const kontrolAdi = kontrolYeri === 'ht' ? 'HT' : kontrolYeri === 'lt' ? 'LT' : kontrolYeri === 'yag' ? 'Yağ' : kontrolYeri;
    
    // Kaynak göstergesi
    const sourceBadge = source === 'local' 
        ? `<span style="background: ${syncError ? '#dc3545' : '#ffc107'}; color: ${syncError ? 'white' : '#333'}; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px;">${syncError ? 'SENKRONIZE' : 'YEREL'}</span>`
        : '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px;">BULUT</span>';
    
    // Fotoğraf görüntüleme linki
    let photoLink;
    if (fileUrl) {
        photoLink = `<a href="${fileUrl}" target="_blank" style="color: #667eea; text-decoration: none;">
            <i class="fas fa-image"></i> Görüntüle
        </a>`;
    } else if (fotoData && source === 'local') {
        // Local fotoğraf için data URL
        photoLink = `<a href="${fotoData}" target="_blank" style="color: #ffc107; text-decoration: none;">
            <i class="fas fa-image"></i> Yerel Görüntü
        </a>`;
    } else {
        photoLink = '<span style="color: #64748b;">Fotoğraf yok</span>';
    }
    
    row.innerHTML = `
        <td>${formatDate(tarih)}</td>
        <td>${saat}</td>
        <td>${motorName} ${sourceBadge}</td>
        <td>${kontrolAdi}</td>
        <td>${operatorName}</td>
        <td>${vardiya}</td>
        <td>${photoLink}</td>
        <td>
            <div class="action-buttons">
                <button class="action-btn view-btn" onclick="viewRecordFromSheet('${kayitNo}')">
                    <i class="fas fa-eye"></i> Gör
                </button>
            </div>
        </td>
    `;
    
    return row;
}


// Local kayıt sil
function deleteLocalRecord(kayitNo) {
    // Onay iste
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
        return;
    }
    
    // LocalStorage'dan kayıtları al
    const localRecords = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    
    // Kaydı bul ve sil
    const index = localRecords.findIndex(r => r.kayitNo === kayitNo);
    
    if (index !== -1) {
        // Kaydı sil
        localRecords.splice(index, 1);
        
        // LocalStorage'ı güncelle
        localStorage.setItem('motorTrackingRecords', JSON.stringify(localRecords));
        
        showNotification('success', 'Silindi', 'Kayıt başarıyla silindi.');
        
        // Kayıtları yeniden yükle
        loadRecords();
    } else {
        showNotification('error', 'Hata', 'Kayıt bulunamadı.');
    }
}

// Kayıt detaylarını görüntüle
function viewRecordFromSheet(kayitNo) {
    // LocalStorage'dan kayıtları kontrol et
    const localRecords = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    
    // Farklı formatlarda ara
    let localRecord = localRecords.find(r => r.kayitNo === kayitNo);
    
    // Bulunamazsa, kayitNo içeren kayıtları ara (LOCAL- önekli kayıtlar için)
    if (!localRecord && kayitNo.includes('LOCAL-')) {
        const timestamp = kayitNo.replace('LOCAL-', '');
        localRecord = localRecords.find(r => 
            r.kayitNo && r.kayitNo.includes(timestamp)
        );
    }
    
    // Hala bulunamazsa, tarih/saat/motor kombinasyonu ile eşleştirme dene
    if (!localRecord) {
        // Tablodaki satır verilerini almak için DOM'dan bilgi çek
        const rows = document.querySelectorAll('#records-tbody tr');
        for (const row of rows) {
            const viewBtn = row.querySelector('.view-btn');
            if (viewBtn && viewBtn.getAttribute('onclick').includes(kayitNo)) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const tarih = cells[0].textContent.trim();
                    const saat = cells[1].textContent.trim();
                    const motorText = cells[2].textContent.trim();
                    
                    // Tarihi parse et (format: DD.MM.YYYY)
                    const dateParts = tarih.split('.');
                    if (dateParts.length === 3) {
                        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        const motor = motorText.includes('GM-1') ? 'gm1' : 
                                     motorText.includes('GM-2') ? 'gm2' : 'gm3';
                        
                        // Eşleşen kaydı bul
                        localRecord = localRecords.find(r => 
                            r.date === formattedDate && 
                            r.time === saat && 
                            r.motor === motor
                        );
                    }
                    break;
                }
            }
        }
    }
    
    if (localRecord) {
        // Local kayıt bulundu - modal ile göster
        showRecordModal(localRecord);
    } else {
        // GAS kaydı için bilgi mesajı
        showNotification('info', 'Kayıt', `Kayıt No: ${kayitNo} - Detaylar için Google Sheets'i kontrol edin.`);
    }
}

// Kayıt detay modalı göster
function showRecordModal(record) {
    const modal = document.createElement('div');
    modal.className = 'record-modal';
    modal.id = 'record-modal';
    
    const motorName = record.motor === 'gm1' ? 'GM-1' : record.motor === 'gm2' ? 'GM-2' : 'GM-3';
    const kontrolAdi = record.kontrolYeri === 'ht' ? 'HT' : record.kontrolYeri === 'lt' ? 'LT' : 'Yağ Seviyesi';
    const operatorName = getOperatorName(record.operator);
    const vardiyaName = getShiftName(record.vardiya);
    
    modal.innerHTML = `
        <div class="record-modal-content" style="
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        ">
            <button class="record-modal-close" id="record-modal-close" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #64748b;
            ">
                <i class="fas fa-times"></i>
            </button>
            
            <h3 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 1.5rem;">
                <i class="fas fa-clipboard-list"></i> Kayıt Detayları
            </h3>
            
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">Kayıt No:</span>
                    <span style="font-weight: 600; color: #2c3e50;">${record.kayitNo}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">Tarih:</span>
                    <span style="font-weight: 600; color: #2c3e50;">${formatDate(record.date)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">Saat:</span>
                    <span style="font-weight: 600; color: #2c3e50;">${record.time}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">Motor:</span>
                    <span style="font-weight: 600; color: #2c3e50;">${motorName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">Kontrol:</span>
                    <span style="font-weight: 600; color: #2c3e50;">${kontrolAdi}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">Operatör:</span>
                    <span style="font-weight: 600; color: #2c3e50;">${operatorName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b;">Vardiya:</span>
                    <span style="font-weight: 600; color: #2c3e50;">${vardiyaName}</span>
                </div>
            </div>
            
            ${record.fotoData ? `
                <div style="margin-top: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 1rem;">Fotoğraf:</h4>
                    <img src="${record.fotoData}" style="
                        width: 100%;
                        max-height: 300px;
                        object-fit: contain;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    " />
                    <a href="${record.fotoData}" target="_blank" style="
                        display: block;
                        margin-top: 10px;
                        text-align: center;
                        color: #667eea;
                        text-decoration: none;
                        padding: 10px;
                        background: #f1f5f9;
                        border-radius: 6px;
                    ">
                        <i class="fas fa-external-link-alt"></i> Tam Boy Görüntüle
                    </a>
                </div>
            ` : ''}
            
            ${record.syncError ? `
                <div style="
                    margin-top: 20px;
                    padding: 15px;
                    background: #fff3cd;
                    border-radius: 8px;
                    border-left: 4px solid #ffc107;
                ">
                    <i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i>
                    <span style="color: #856404; margin-left: 8px;">Bu kayıt henüz sunucuya senkronize edilmemiş.</span>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;
    
    document.body.appendChild(modal);
    
    // Event listener'ları ekle
    document.getElementById('record-modal-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Varsayılan Değerleri Ayarlama
function setDefaultValues() {
    const dateInput = document.getElementById('tracking-date');
    const timeInput = document.getElementById('tracking-time');
    const shiftSelect = document.getElementById('shift');
    const operatorSelect = document.getElementById('operator');
    
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
    
    const operatorSelect = document.getElementById('operator');
    
    if (todayMidnightRecords.length > 0) {
        // Kayıt varsa formu kilitle
        if (operatorSelect) operatorSelect.disabled = true;
        
        showNotification('warning', 'Form Kilitli', 'Bugün saat 00:00 için kayıt yapılmış.');
    } else {
        // Kayıt yoksa, tüm elemanları aktif tut
        if (operatorSelect) operatorSelect.disabled = false;
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

function getShiftName(shiftValue) {
    const shiftMap = {
        'morning': 'Gündüz',
        'evening': 'Akşam',
        'night': 'Gece'
    };
    return shiftMap[shiftValue] || shiftValue;
}

function formatMotorName(motorValue) {
    const motorMap = {
        'gm1': 'GM-1',
        'gm2': 'GM-2',
        'gm3': 'GM-3'
    };
    return motorMap[motorValue] || motorValue;
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

// ==================== 3 KONTROL KUTUSU FONKSİYONLARI ====================

// Global değişkenler
let selectedMotor = null;
let currentStream = null;

// Fotoğraf verilerini sakla
const fotografVerileri = {
    ht: null,
    lt: null,
    yag: null
};

// Motor Butonlarını Başlat - Güncellenmiş versiyon
function initializeMotorButtons() {
    const motorButtons = document.querySelectorAll('.motor-btn');
    
    motorButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const motor = this.dataset.motor;
            
            // Tüm butonlardan selected class'ını kaldır
            motorButtons.forEach(b => b.classList.remove('selected'));
            
            // Tıklanan butona selected class'ı ekle
            this.classList.add('selected');
            
            // Seçili motoru kaydet
            selectedMotor = motor;
            
            // 3 kutuyu göster
            gosterKontrolKutulari();
            
            // Bildirim göster
            const motorName = motor === 'gm1' ? 'GM-1' : motor === 'gm2' ? 'GM-2' : 'GM-3';
            showNotification('info', 'Motor Seçildi', `${motorName} motoru seçildi. HT, LT ve Yağ Seviyesi kayıtları için fotoğraf ekleyin.`);
        });
    });
}

// 3 Kontrol Kutularını Göster
function gosterKontrolKutulari() {
    const kontrolKutulari = document.getElementById('kontrol-kutulari');
    const kaydetAlani = document.getElementById('kaydet-alani');
    
    if (kontrolKutulari) {
        kontrolKutulari.style.display = 'grid';
        kontrolKutulari.style.animation = 'fadeIn 0.5s ease';
    }
    
    if (kaydetAlani) {
        kaydetAlani.style.display = 'block';
        kaydetAlani.style.animation = 'fadeIn 0.5s ease';
    }
}

// Kamera Aç
function openCamera(kontrolTipi) {
    showNotification('info', 'Kamera', `${kontrolTipi.toUpperCase()} için kamera açılıyor...`);
    
    // Kamera API ile fotoğraf çek
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        })
        .then(function(stream) {
            showCameraModal(stream, kontrolTipi);
        })
        .catch(function(error) {
            console.error('Kamera erişim hatası:', error);
            showNotification('error', 'Kamera Hatası', 'Kamera erişimi sağlanamadı.');
        });
    } else {
        showNotification('error', 'Desteklenmiyor', 'Tarayıcınız kamera API\'yi desteklemiyor.');
    }
}

// Kamera Modal Göster
function showCameraModal(stream, kontrolTipi) {
    // Stream'i global değişkende sakla
    window.currentCameraStream = stream;
    window.currentKontrolTipi = kontrolTipi;
    
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.id = 'camera-modal';
    modal.innerHTML = `
        <div class="camera-modal-content">
            <div class="camera-header">
                <h3>${kontrolTipi.toUpperCase()} - Fotoğraf Çek</h3>
                <button class="camera-close" id="camera-close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="camera-body">
                <video id="camera-video" autoplay playsinline style="width: 100%; max-height: 400px; border-radius: 8px;"></video>
                <canvas id="camera-canvas" style="display: none;"></canvas>
                <div class="camera-controls">
                    <button class="camera-capture-btn" id="camera-capture-btn">
                        <i class="fas fa-camera"></i> Fotoğraf Çek
                    </button>
                </div>
            </div>
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
    `;
    
    document.body.appendChild(modal);
    
    const video = document.getElementById('camera-video');
    video.srcObject = stream;
    
    // Event listener'ları ekle
    document.getElementById('camera-close-btn').addEventListener('click', kapatKamera);
    document.getElementById('camera-capture-btn').addEventListener('click', capturePhotoForKontrol);
}

// Kamera Modal Kapat
function kapatKamera() {
    if (window.currentCameraStream) {
        window.currentCameraStream.getTracks().forEach(track => track.stop());
        window.currentCameraStream = null;
    }
    const modal = document.getElementById('camera-modal');
    if (modal) modal.remove();
}

// Fotoğraf Çek ve Kaydet - Güncellenmiş
function capturePhotoForKontrol() {
    const kontrolTipi = window.currentKontrolTipi;
    const stream = window.currentCameraStream;
    
    if (!kontrolTipi || !stream) {
        showNotification('error', 'Hata', 'Kamera bağlantısı bulunamadı.');
        return;
    }
    
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    
    if (!video || !canvas) {
        showNotification('error', 'Hata', 'Kamera elemanları bulunamadı.');
        return;
    }
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    
    // Base64 olarak kaydet
    const fotoData = canvas.toDataURL('image/jpeg', 0.9);
    fotografVerileri[kontrolTipi] = fotoData;
    
    // Stream'i durdur
    stream.getTracks().forEach(track => track.stop());
    window.currentCameraStream = null;
    
    // Modal'ı kapat
    const modal = document.getElementById('camera-modal');
    if (modal) modal.remove();
    
    // Önizleme göster
    gosterFotoOnizleme(kontrolTipi, fotoData);
    
    showNotification('success', 'Başarılı', `${kontrolTipi.toUpperCase()} fotoğrafı çekildi.`);
}

// Fotoğraf Önizlemesi Göster
function gosterFotoOnizleme(kontrolTipi, fotoData) {
    const yerTutucu = document.querySelector(`#kamera-${kontrolTipi} .kamera-yer-tutucu`);
    const onizleme = document.getElementById(`foto-onizleme-${kontrolTipi}`);
    const img = onizleme.querySelector('img');
    
    if (yerTutucu) yerTutucu.style.display = 'none';
    if (onizleme) {
        onizleme.style.display = 'block';
        img.src = fotoData;
    }
}

// Fotoğraf Sil
function silFoto(kontrolTipi) {
    fotografVerileri[kontrolTipi] = null;
    
    const yerTutucu = document.querySelector(`#kamera-${kontrolTipi} .kamera-yer-tutucu`);
    const onizleme = document.getElementById(`foto-onizleme-${kontrolTipi}`);
    const img = onizleme.querySelector('img');
    
    if (yerTutucu) yerTutucu.style.display = 'flex';
    if (onizleme) {
        onizleme.style.display = 'none';
        img.src = '';
    }
    
    showNotification('info', 'Silindi', `${kontrolTipi.toUpperCase()} fotoğrafı silindi.`);
}

// Kontrol Sil (Tüm kutuyu temizle)
function silKontrol(kontrolTipi) {
    silFoto(kontrolTipi);
    showNotification('info', 'Temizlendi', `${kontrolTipi.toUpperCase()} verileri temizlendi.`);
}

// Tümünü Kaydet
async function kaydetTumunu() {
    if (!selectedMotor) {
        showNotification('error', 'Hata', 'Lütfen önce bir motor seçin.');
        return;
    }
    
    const operatorSelect = document.getElementById('operator');
    if (!operatorSelect || !operatorSelect.value) {
        showNotification('error', 'Hata', 'Lütfen operatör seçin.');
        return;
    }
    
    // En az bir fotoğraf eklenmiş mi kontrol et
    const fotoSayisi = Object.values(fotografVerileri).filter(f => f !== null).length;
    if (fotoSayisi === 0) {
        showNotification('error', 'Hata', 'En az bir kontrol için fotoğraf eklemelisiniz.');
        return;
    }
    
    showNotification('info', 'Kaydediliyor', 'Veriler kaydediliyor, lütfen bekleyin...');
    
    // LocalStorage kayıtları için dizi
    const localRecords = JSON.parse(localStorage.getItem('motorTrackingRecords') || '[]');
    const tarih = document.getElementById('tracking-date').value;
    const saat = document.getElementById('tracking-time').value;
    const vardiya = document.getElementById('shift').value;
    const operator = operatorSelect.value;
    
    // Aynı motor/tarih/saat kontrolü - local kayıtlarda var mı?
    const existingRecord = localRecords.find(r => 
        r.motor === selectedMotor && 
        r.date === tarih && 
        r.time === saat
    );
    
    if (existingRecord) {
        const motorDisplayName = formatMotorName(selectedMotor);
        showNotification('error', 'Kayıt Mevcut', 
            `${motorDisplayName} motoru için ${formatDate(tarih)} ${saat} saatinde zaten bir kayıt yapılmış. Aynı gün ve saatte ikinci kayıt yapılamaz.`);
        return;
    }
    
    showNotification('info', 'Kaydediliyor', 'Veriler kaydediliyor, lütfen bekleyin...');
    
    try {
        // Her kontrol tipi için ayrı kayıt yap
        const kayitlar = [];
        
        for (const [kontrolTipi, fotoData] of Object.entries(fotografVerileri)) {
            if (fotoData) {
                const payload = {
                    tarih: tarih,
                    saat: saat,
                    motor: selectedMotor,
                    kontrolYeri: kontrolTipi,
                    operator: operator,
                    vardiya: vardiya,
                    image: fotoData
                };
                
                // GAS'e gönder
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                if (result.success) {
                    kayitlar.push(kontrolTipi);
                    
                    // LocalStorage'a kaydet
                    const localRecord = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        date: tarih,
                        time: saat,
                        motor: selectedMotor,
                        kontrolYeri: kontrolTipi,
                        operator: operator,
                        vardiya: vardiya,
                        fotoData: fotoData,
                        kayitNo: result.kayitNo || result.recordId || '-',
                        driveLink: result.driveLink || result.fileUrl || '',
                        timestamp: new Date().toISOString()
                    };
                    localRecords.unshift(localRecord);
                }
            }
        }
        
        // LocalStorage'ı güncelle
        localStorage.setItem('motorTrackingRecords', JSON.stringify(localRecords));
        
        if (kayitlar.length > 0) {
            showNotification('success', 'Başarılı', `${kayitlar.length} kontrol kaydı yerel depoya ve sunucuya kaydedildi.`);
            
            // Formu temizle
            temizleTumKontroller();
            
            // Kayıtları yeniden yükle
            loadRecords();
        } else {
            showNotification('error', 'Hata', 'Kayıt yapılırken bir sorun oluştu.');
        }
        
    } catch (error) {
        console.error('Kayıt hatası:', error);
        
        // GAS hata verirse sadece localStorage'a kaydet
        let localKayitSayisi = 0;
        for (const [kontrolTipi, fotoData] of Object.entries(fotografVerileri)) {
            if (fotoData) {
                // Her kontrol için benzersiz kayitNo oluştur
                const uniqueKayitNo = 'LOCAL-' + Date.now() + '-' + kontrolTipi + '-' + Math.random().toString(36).substr(2, 5);
                const localRecord = {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    date: tarih,
                    time: saat,
                    motor: selectedMotor,
                    kontrolYeri: kontrolTipi,
                    operator: operator,
                    vardiya: vardiya,
                    fotoData: fotoData,
                    kayitNo: uniqueKayitNo,
                    driveLink: '',
                    timestamp: new Date().toISOString(),
                    syncError: true
                };
                localRecords.unshift(localRecord);
                localKayitSayisi++;
            }
        }
        localStorage.setItem('motorTrackingRecords', JSON.stringify(localRecords));
        
        if (localKayitSayisi > 0) {
            showNotification('warning', 'Yerel Kayıt', `${localKayitSayisi} kayıt sadece yerel depoya kaydedildi. Sunucuya bağlanılamadı.`);
            temizleTumKontroller();
            loadRecords();
        } else {
            showNotification('error', 'Hata', 'Sunucuya bağlanırken hata oluştu.');
        }
    }
}

// Tüm Kontrolleri Temizle
function temizleTumKontroller() {
    // Fotoğraf verilerini temizle
    fotografVerileri.ht = null;
    fotografVerileri.lt = null;
    fotografVerileri.yag = null;
    
    // UI'ı temizle
    ['ht', 'lt', 'yag'].forEach(kontrolTipi => {
        silFoto(kontrolTipi);
    });
    
    // Kutuları gizle
    const kontrolKutulari = document.getElementById('kontrol-kutulari');
    const kaydetAlani = document.getElementById('kaydet-alani');
    
    if (kontrolKutulari) kontrolKutulari.style.display = 'none';
    if (kaydetAlani) kaydetAlani.style.display = 'none';
    
    // Motor butonlarını sıfırla
    const motorButtons = document.querySelectorAll('.motor-btn');
    motorButtons.forEach(btn => btn.classList.remove('selected'));
    selectedMotor = null;
}
