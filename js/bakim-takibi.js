// Bakım Takibi JavaScript - ÇALIŞAN VERSİYON
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-WgkzWAixX_vleDlp5RwbRQm0Nm0mdLj-I4JAyj-zmRvCQrPcytn9eRV6jVIFy77-vg/exec";

document.addEventListener('DOMContentLoaded', function() {
    // Çıkış butonları
    const sidebarLogout = document.getElementById('sidebarLogout');
    const headerLogout = document.getElementById('headerLogout');

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

    function switchForm(formType) {
        forms.forEach(form => { form.style.display = 'none'; });
        formButtons.forEach(btn => { btn.classList.remove('active'); });
        const selectedForm = document.getElementById(formType + '-form');
        if (selectedForm) selectedForm.style.display = 'block';
        const selectedButton = document.querySelector(`[data-form="${formType}"]`);
        if (selectedButton) selectedButton.classList.add('active');
    }

    formButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchForm(this.getAttribute('data-form'));
        });
    });

    // Alternatör Gresleme hesaplama
    const frontInput = document.getElementById('alternator-front');
    const rearInput = document.getElementById('alternator-rear');
    const totalInput = document.getElementById('alternator-total');
    if (frontInput && rearInput && totalInput) {
        function calculateTotal() {
            const frontValue = parseFloat(frontInput.value) || 0;
            const rearValue = parseFloat(rearInput.value) || 0;
            totalInput.value = (frontValue + rearValue).toFixed(1);
        }
        frontInput.addEventListener('input', calculateTotal);
        rearInput.addEventListener('input', calculateTotal);
    }

    // Dış destek/Iç destek seçimi - varsayılan teknisyen gizli, seçime göre göster
    function initCompanySelect(companyId, technicianId, externalId) {
        const companySelect = document.getElementById(companyId);
        const technicianSelect = document.getElementById(technicianId);
        const externalSelect = document.getElementById(externalId);
        if (companySelect && technicianSelect && externalSelect) {
            // Varsayılan: teknisyen gizli
            technicianSelect.style.display = 'none';
            technicianSelect.required = false;
            externalSelect.style.display = 'none';
            externalSelect.required = false;
            
            companySelect.addEventListener('change', function() {
                if (this.value === 'internal') {
                    technicianSelect.style.display = 'block';
                    technicianSelect.required = true;
                    externalSelect.style.display = 'none';
                    externalSelect.required = false;
                    externalSelect.value = '';
                } else if (this.value === 'external') {
                    technicianSelect.style.display = 'none';
                    technicianSelect.required = false;
                    technicianSelect.value = '';
                    externalSelect.style.display = 'block';
                    externalSelect.required = true;
                } else {
                    // Seçim yoksa - varsayılan gizli
                    technicianSelect.style.display = 'none';
                    technicianSelect.required = false;
                    technicianSelect.value = '';
                    externalSelect.style.display = 'none';
                    externalSelect.required = false;
                    externalSelect.value = '';
                }
            });
        }
    }
    initCompanySelect('periodic-technician-company', 'periodic-technician', 'periodic-external-company');
    initCompanySelect('normal-technician-company', 'normal-technician', 'normal-external-company');
    initCompanySelect('fault-technician-company', 'fault-technician', 'fault-external-company');

    // Dosya yükleme alanları
    function initFileUpload(areaId, inputId, listId) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        if (!area || !input || !list) return;

        area.addEventListener('click', () => input.click());
        
        input.addEventListener('change', () => {
            list.innerHTML = '';
            Array.from(input.files).forEach(file => {
                const div = document.createElement('div');
                div.className = 'file-item';
                div.innerHTML = `<span>📄 ${file.name} (${(file.size/1024).toFixed(1)} KB)</span>
                                <button class="file-remove" data-name="${file.name}">&times;</button>`;
                list.appendChild(div);
            });
            
            document.querySelectorAll(`#${listId} .file-remove`).forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const name = btn.dataset.name;
                    const dt = new DataTransfer();
                    Array.from(input.files).filter(f => f.name !== name).forEach(f => dt.items.add(f));
                    input.files = dt.files;
                    btn.closest('.file-item').remove();
                });
            });
        });
        
        area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
        area.addEventListener('dragleave', () => { area.classList.remove('dragover'); });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            input.files = e.dataTransfer.files;
            input.dispatchEvent(new Event('change'));
        });
    }
    
    initFileUpload('periodic-file-area', 'periodic-files', 'periodic-file-list');
    initFileUpload('normal-file-area', 'normal-files', 'normal-file-list');
    initFileUpload('fault-file-area', 'fault-files', 'fault-file-list');

    // Bakım tipine göre dinamik alanlar
    const prioritySelect = document.getElementById('normal-priority');
    if (prioritySelect) {
        prioritySelect.addEventListener('change', function() {
            document.getElementById('alternator-grease-fields').style.display = 'none';
            document.getElementById('oil-sample-fields').style.display = 'none';
            document.getElementById('oil-filter-fields').style.display = 'none';
            document.getElementById('ht-lt-jacket-fields').style.display = 'none';
            if (this.value === 'alternator-grease') document.getElementById('alternator-grease-fields').style.display = 'block';
            else if (this.value === 'oil-sample') document.getElementById('oil-sample-fields').style.display = 'block';
            else if (this.value === 'oil-filter') document.getElementById('oil-filter-fields').style.display = 'block';
            else if (this.value === 'ht-lt-jacket') document.getElementById('ht-lt-jacket-fields').style.display = 'block';
        });
    }

    // Yardımcı fonksiyonlar
    function getTechnicianName(val) {
        const map = { 'ibrahim-ogun': 'İbrahim Ogün Şahin', 'yakup-can': 'Yakup Can Cin', 
                      'oguzhan-yaylali': 'Oğuzhan Yaylalı', 'altan-hunoglu': 'Altan Hunoğlu' };
        return map[val] || val;
    }
    function getNormalPriorityText(val) {
        const map = { 'alternator-grease': 'Alternatör Gresleme', 'oil-sample': 'Yağ Numune Alma',
                      'oil-filter': 'Yağ Filtre Değişimi', 'heat-exchanger': 'Eşanjör Ölçümü',
                      'ht-lt-jacket': 'HT LT Ceket Suyu Sıcaklık Ölçümü', 'other': 'Diğer' };
        return map[val] || val;
    }
    function getFaultReasonText(val) {
        const map = { 'electrical': 'Elektriksel', 'mechanical': 'Mekanik', 'electronic': 'Elektronik',
                      'hydraulic': 'Hidrolik', 'pneumatic': 'Pnömatik', 'software': 'Yazılım',
                      'maintenance': 'Bakım kaynaklı', 'other': 'Diğer' };
        return map[val] || val;
    }
    function getExternalCompanyName(val) {
        const map = { 'topkapi': 'Topkapı', 'other': 'Diğer' };
        return map[val] || val;
    }
    
    function showNotification(type, title, message) {
        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
        notif.innerHTML = `<div><strong>${title}</strong><br>${message}</div><button>&times;</button>`;
        document.body.appendChild(notif);
        notif.querySelector('button').onclick = () => notif.remove();
        setTimeout(() => notif.remove(), 5000);
    }

    // ANA KAYIT FONKSİYONU
    async function saveMaintenanceData(type, form) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((v, k) => { data[k] = v; });
        
        let fileInputId = type === 'periodic' ? 'periodic-files' : (type === 'normal' ? 'normal-files' : 'fault-files');
        const fileInput = document.getElementById(fileInputId);
        const files = fileInput ? Array.from(fileInput.files) : [];
        
        showNotification('info', 'İşlem Başladı', `${files.length} dosya işleniyor...`);
        
        // Dosyaları base64'e çevir
        const filesData = [];
        for (let file of files) {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
            });
            filesData.push({ name: file.name, mimeType: file.type, base64: base64 });
        }
        
        // Verileri hazırla
        let tarih = '', motor = '', tip = '', teknisyen = '', firma = '', notlar = '';
        
        if (type === 'periodic') {
            tarih = data['periodic-date'];
            motor = data['periodic-equipment'];
            tip = data['periodic-type'] + ' saat';
            teknisyen = getTechnicianName(data['periodic-technician']);
            let ct = data['periodic-technician-company'] === 'internal' ? 'İç Destek' : 'Dış Destek';
            if (data['periodic-technician-company'] === 'external' && data['periodic-external-company']) {
                ct += ` (${getExternalCompanyName(data['periodic-external-company'])})`;
            }
            firma = ct;
            notlar = data['periodic-description'] || '';
        } else if (type === 'normal') {
            tarih = data['normal-date'];
            motor = data['normal-equipment'];
            tip = getNormalPriorityText(data['normal-priority']);
            teknisyen = getTechnicianName(data['normal-technician']);
            let ct = data['normal-technician-company'] === 'internal' ? 'İç Destek' : 'Dış Destek';
            if (data['normal-technician-company'] === 'external' && data['normal-external-company']) {
                ct += ` (${getExternalCompanyName(data['normal-external-company'])})`;
            }
            firma = ct;
            notlar = data['normal-description'] || '';
        } else if (type === 'fault') {
            tarih = data['fault-date'];
            motor = data['fault-equipment'];
            tip = getFaultReasonText(data['fault-reason']);
            teknisyen = getTechnicianName(data['fault-technician']);
            let ct = data['fault-technician-company'] === 'internal' ? 'İç Destek' : 'Dış Destek';
            if (data['fault-technician-company'] === 'external' && data['fault-external-company']) {
                ct += ` (${getExternalCompanyName(data['fault-external-company'])})`;
            }
            firma = ct;
            notlar = data['fault-notes'] || '';
        }
        
        // Sunucuya gönder
        const params = new URLSearchParams();
        params.append('action', 'saveRecord');
        params.append('bakimTuru', type);
        params.append('tarih', tarih);
        params.append('motor', motor);
        params.append('tip', tip);
        params.append('teknisyen', teknisyen);
        params.append('firma', firma);
        params.append('notlar', notlar);
        params.append('kaydeden', document.getElementById('user-name-display')?.innerText || 'Admin');
        params.append('filesData', JSON.stringify(filesData));
        
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: params });
            const result = await response.json();
            
            if (result.success) {
                let linkMsg = result.fileCount > 0 ? `\n${result.fileCount} dosya yüklendi!` : '\nDosya yüklenmedi.';
                showNotification('success', '✅ Kayıt Başarılı!', `${type.toUpperCase()} kaydı oluşturuldu.${linkMsg}`);
                form.reset();
                if (fileInput) fileInput.value = '';
                const listDiv = document.getElementById(fileInputId.replace('files', 'file-list'));
                if (listDiv) listDiv.innerHTML = '';
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showNotification('error', '❌ Kayıt Hatası', error.message);
        }
    }

    // Form submit olayları
    document.querySelector('#periodic-form form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMaintenanceData('periodic', e.target);
    });
    document.querySelector('#normal-form form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMaintenanceData('normal', e.target);
    });
    document.querySelector('#fault-form form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMaintenanceData('fault', e.target);
    });
});