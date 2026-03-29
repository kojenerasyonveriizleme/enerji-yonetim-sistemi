// Bakım Takibi JavaScript
// Bu dosya ana sayfa ile aynı yapıda olacak

document.addEventListener('DOMContentLoaded', function() {
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

    // Form butonları
    const formButtons = document.querySelectorAll('.form-btn');
    const forms = document.querySelectorAll('.maintenance-form');

    // Form geçiş fonksiyonu
    function switchForm(formType) {
        // Tüm formları gizle
        forms.forEach(form => {
            form.style.display = 'none';
        });

        // Tüm butonlardan active class'ını kaldır
        formButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Seçili formu göster
        const selectedForm = document.getElementById(formType + '-form');
        if (selectedForm) {
            selectedForm.style.display = 'block';
        }

        // Seçili butona active class'ı ekle
        const selectedButton = document.querySelector(`[data-form="${formType}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
    }

    // Form butonlarına tıklama olayları
    formButtons.forEach(button => {
        button.addEventListener('click', function() {
            const formType = this.getAttribute('data-form');
            switchForm(formType);
        });
    });

    // Form submit olayları
    const periodicForm = document.querySelector('#periodic-form form');
    const normalForm = document.querySelector('#normal-form form');
    const faultForm = document.querySelector('#fault-form form');

    if (periodicForm) {
        periodicForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMaintenanceData('periodic', this);
        });
    }

    if (normalForm) {
        normalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMaintenanceData('normal', this);
        });
    }

    if (faultForm) {
        faultForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMaintenanceData('fault', this);
        });
    }

    // Bakım verilerini kaydetme fonksiyonu
    function saveMaintenanceData(type, form) {
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Veri tipine göre özel işlemler
        let message = '';
        switch(type) {
            case 'periodic':
                let periodicCompanyText = data['periodic-technician-company'] === 'internal' ? 'İç Destek' : 'Dış Destek';
                if (data['periodic-technician-company'] === 'external' && data['periodic-external-company']) {
                    periodicCompanyText += ` (${getExternalCompanyName(data['periodic-external-company'])})`;
                }
                message = `Periyodik bakım kaydı başarıyla oluşturuldu:\n` +
                         `Tarih: ${data['periodic-date']}\n` +
                         `Motor: ${data['periodic-equipment']}\n` +
                         `Bakım Tipi: ${data['periodic-type']} saat\n` +
                         `Teknisyen: ${getTechnicianName(data['periodic-technician'])} (${periodicCompanyText})`;
                break;
            case 'normal':
                const priorityText = getNormalPriorityText(data['normal-priority']);
                let normalCompanyText = data['normal-technician-company'] === 'internal' ? 'İç Destek' : 'Dış Destek';
                if (data['normal-technician-company'] === 'external' && data['normal-external-company']) {
                    normalCompanyText += ` (${getExternalCompanyName(data['normal-external-company'])})`;
                }
                message = `Normal bakım kaydı başarıyla oluşturuldu:\n` +
                         `Tarih: ${data['normal-date']}\n` +
                         `Motor: ${data['normal-equipment']}\n` +
                         `Bakım Tipi: ${priorityText}\n` +
                         `Teknisyen: ${getTechnicianName(data['normal-technician'])} (${normalCompanyText})`;
                break;
            case 'fault':
                let faultCompanyText = data['fault-technician-company'] === 'internal' ? 'İç Destek' : 'Dış Destek';
                if (data['fault-technician-company'] === 'external' && data['fault-external-company']) {
                    faultCompanyText += ` (${getExternalCompanyName(data['fault-external-company'])})`;
                }
                message = `Arıza bakım kaydı başarıyla oluşturuldu:\n` +
                         `Tarih: ${data['fault-date']}\n` +
                         `Motor: ${data['fault-equipment']}\n` +
                         `Arıza Nedeni: ${getFaultReasonText(data['fault-reason'])}\n` +
                         `Zaman: ${data['fault-time']}\n` +
                         `Açıklama: ${data['fault-description']}\n` +
                         `Teknisyen: ${getTechnicianName(data['fault-technician'])} (${faultCompanyText})`;
                break;
        }

        // Başarı mesajı göster
        showNotification('success', 'Bakım Kaydı Başarılı!', message);
        
        // Formu temizle
        form.reset();
        
        // LocalStorage'a kaydet (gelecekte veritabanı bağlantısı için)
        const maintenanceRecords = JSON.parse(localStorage.getItem('maintenanceRecords') || '[]');
        maintenanceRecords.push({
            type: type,
            data: data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('maintenanceRecords', JSON.stringify(maintenanceRecords));
        
        console.log('Bakım verisi kaydedildi:', data);
    }

    // Bildirim gösterme fonksiyonu
    function showNotification(type, title, message) {
        // Bildirim elementi oluştur
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Sayfaya ekle
        document.body.appendChild(notification);

        // Kapatma butonu
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', function() {
            notification.remove();
        });

        // Otomatik kapatma
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    console.log('Bakım Takibi sayfası yüklendi');

    // Dosya yükleme fonksiyonları
    initializeFileUploads();
    
    // Alternatör Gresleme dinleyicileri
    initializeAlternatorGrease();
    
    // Dış destek firma seçimi dinleyicileri
    initializeExternalCompanySelection();
});

function initializeAlternatorGrease() {
    const prioritySelect = document.getElementById('normal-priority');
    const alternatorFields = document.getElementById('alternator-grease-fields');
    const oilSampleFields = document.getElementById('oil-sample-fields');
    const oilFilterFields = document.getElementById('oil-filter-fields');
    const htLtJacketFields = document.getElementById('ht-lt-jacket-fields');
    const frontInput = document.getElementById('alternator-front');
    const rearInput = document.getElementById('alternator-rear');
    const totalInput = document.getElementById('alternator-total');
    const motorHoursInput = document.getElementById('motor-hours');
    const barcodeInput = document.getElementById('barcode-number');
    const filterMotorHoursInput = document.getElementById('filter-motor-hours');
    const filterOilHoursInput = document.getElementById('filter-oil-hours');
    const htTempInput = document.getElementById('ht-temperature');
    const ltTempInput = document.getElementById('lt-temperature');
    const jacketTempInput = document.getElementById('jacket-temperature');
    const faultTechnicianInput = document.getElementById('fault-technician');
    const faultCompanyInput = document.getElementById('fault-technician-company');
    const faultReasonInput = document.getElementById('fault-reason');
    const faultTimeInput = document.getElementById('fault-time');

    if (!prioritySelect) return;

    // Bakım tipi değişimini dinle
    prioritySelect.addEventListener('change', function() {
        // Tüm dinamik alanları gizle
        alternatorFields.style.display = 'none';
        oilSampleFields.style.display = 'none';
        oilFilterFields.style.display = 'none';
        htLtJacketFields.style.display = 'none';
        
        // Alanları temizle
        if (frontInput) frontInput.value = '';
        if (rearInput) rearInput.value = '';
        if (totalInput) totalInput.value = '';
        if (motorHoursInput) motorHoursInput.value = '';
        if (barcodeInput) barcodeInput.value = '';
        if (filterMotorHoursInput) filterMotorHoursInput.value = '';
        if (filterOilHoursInput) filterOilHoursInput.value = '';
        if (htTempInput) htTempInput.value = '';
        if (ltTempInput) ltTempInput.value = '';
        if (jacketTempInput) jacketTempInput.value = '';
        
        // Seçili bakım tipine göre alanı göster
        if (this.value === 'alternator-grease') {
            alternatorFields.style.display = 'block';
        } else if (this.value === 'oil-sample') {
            oilSampleFields.style.display = 'block';
        } else if (this.value === 'oil-filter') {
            oilFilterFields.style.display = 'block';
        } else if (this.value === 'ht-lt-jacket') {
            htLtJacketFields.style.display = 'block';
        }
        // Diğer için ekstra alan gösterilmiyor
    });

    // Alternatör hesaplama dinleyicileri
    if (frontInput && rearInput && totalInput) {
        frontInput.addEventListener('input', calculateTotal);
        rearInput.addEventListener('input', calculateTotal);
    }
}

function calculateTotal() {
    const frontInput = document.getElementById('alternator-front');
    const rearInput = document.getElementById('alternator-rear');
    const totalInput = document.getElementById('alternator-total');

    const frontValue = parseFloat(frontInput.value) || 0;
    const rearValue = parseFloat(rearInput.value) || 0;
    
    const total = frontValue + rearValue;
    totalInput.value = total.toFixed(1);
}

function initializeFileUploads() {
    const fileConfigs = [
        { areaId: 'periodic-file-area', inputId: 'periodic-files', listId: 'periodic-file-list' },
        { areaId: 'normal-file-area', inputId: 'normal-files', listId: 'normal-file-list' }
    ];

    fileConfigs.forEach(config => {
        const area = document.getElementById(config.areaId);
        const input = document.getElementById(config.inputId);
        const list = document.getElementById(config.listId);

        if (!area || !input || !list) return;

        // Tıklama ile dosya seçimi
        area.addEventListener('click', () => input.click());

        // Dosya seçimi değişimi
        input.addEventListener('change', (e) => handleFileSelect(e, list));

        // Drag and drop olayları
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            handleFileSelect(e, list);
        });
    });
}

function handleFileSelect(event, listElement) {
    const files = event.dataTransfer ? event.dataTransfer.files : event.target.files;
    
    Array.from(files).forEach(file => {
        const fileItem = createFileItem(file);
        listElement.appendChild(fileItem);
    });
}

function createFileItem(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    
    const fileIcon = document.createElement('span');
    fileIcon.className = 'file-icon';
    fileIcon.textContent = getFileIcon(file.name);
    
    const fileName = document.createElement('span');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    
    const fileSize = document.createElement('span');
    fileSize.className = 'file-size';
    fileSize.textContent = formatFileSize(file.size);
    
    const fileRemove = document.createElement('button');
    fileRemove.className = 'file-remove';
    fileRemove.innerHTML = '&times;';
    fileRemove.addEventListener('click', () => fileItem.remove());
    
    fileInfo.appendChild(fileIcon);
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);
    
    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileRemove);
    
    return fileItem;
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': '📄',
        'doc': '📝',
        'docx': '📝',
        'xls': '📊',
        'xlsx': '📊',
        'txt': '📄',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️'
    };
    return iconMap[extension] || '📁';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getNormalPriorityText(priorityValue) {
    const priorityMap = {
        'alternator-grease': 'Alternatör Gresleme',
        'oil-sample': 'Yağ Numune Alma',
        'oil-filter': 'Yağ Filtre Değişimi',
        'heat-exchanger': 'Eşanjör Ölçümü',
        'ht-lt-jacket': 'HT LT Ceket Suyu Sıcaklık Ölçümü',
        'other': 'Diğer'
    };
    return priorityMap[priorityValue] || priorityValue;
}

function getTechnicianName(technicianValue) {
    const technicianMap = {
        'ibrahim-ogun': 'İbrahim Ogün Şahin',
        'yakup-can': 'Yakup Can Cin',
        'oguzhan-yaylali': 'Oğuzhan Yaylalı',
        'altan-hunoglu': 'Altan Hunoğlu'
    };
    return technicianMap[technicianValue] || technicianValue;
}

function getFaultReasonText(reasonValue) {
    const reasonMap = {
        'electrical': 'Elektriksel',
        'mechanical': 'Mekanik',
        'electronic': 'Elektronik',
        'hydraulic': 'Hidrolik',
        'pneumatic': 'Pnömatik',
        'software': 'Yazılım',
        'maintenance': 'Bakım kaynaklı',
        'other': 'Diğer'
    };
    return reasonMap[reasonValue] || reasonValue;
}

function getExternalCompanyName(companyValue) {
    const companyMap = {
        'topkapi': 'Topkapı',
        'other': 'Diğer'
    };
    return companyMap[companyValue] || companyValue;
}

function initializeExternalCompanySelection() {
    // Periyodik Bakım
    const periodicCompanySelect = document.getElementById('periodic-technician-company');
    const periodicExternalSelect = document.getElementById('periodic-external-company');
    
    // Normal Bakım
    const normalCompanySelect = document.getElementById('normal-technician-company');
    const normalExternalSelect = document.getElementById('normal-external-company');
    
    // Arıza Bakımı
    const faultCompanySelect = document.getElementById('fault-technician-company');
    const faultExternalSelect = document.getElementById('fault-external-company');
    
    // Periyodik Bakım dinleyici
    if (periodicCompanySelect && periodicExternalSelect) {
        periodicCompanySelect.addEventListener('change', function() {
            if (this.value === 'external') {
                periodicExternalSelect.style.display = 'block';
                periodicExternalSelect.required = true;
            } else {
                periodicExternalSelect.style.display = 'none';
                periodicExternalSelect.required = false;
                periodicExternalSelect.value = '';
            }
        });
    }
    
    // Normal Bakım dinleyici
    if (normalCompanySelect && normalExternalSelect) {
        normalCompanySelect.addEventListener('change', function() {
            if (this.value === 'external') {
                normalExternalSelect.style.display = 'block';
                normalExternalSelect.required = true;
            } else {
                normalExternalSelect.style.display = 'none';
                normalExternalSelect.required = false;
                normalExternalSelect.value = '';
            }
        });
    }
    
    // Arıza Bakımı dinleyici
    if (faultCompanySelect && faultExternalSelect) {
        faultCompanySelect.addEventListener('change', function() {
            if (this.value === 'external') {
                faultExternalSelect.style.display = 'block';
                faultExternalSelect.required = true;
            } else {
                faultExternalSelect.style.display = 'none';
                faultExternalSelect.required = false;
                faultExternalSelect.value = '';
            }
        });
    }
}
