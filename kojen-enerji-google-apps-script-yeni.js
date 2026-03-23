/**
 * KOJEN ENERJI ICIN GOOGLE SHEETS APP SCRIPT
 * Her motor için ayrı sayfa + kayıt kontrolü
 * 
 * Kurulum:
 * 1. Bu kodu Apps Script'e yapıştır
 * 2. Deploy -> New Deployment
 * 3. Web App olarak yayınla
 * 4. URL'yi config.js'e ekle
 */

function doPost(e) {
  try {
    // FormData'dan verileri al
    const action = e.parameter.action;
    const module = e.parameter.module;
    const timestamp = e.parameter.timestamp;
    
    // Debug log
    Logger.log('🔍 doPost çağrıldı - action: ' + action + ', module: ' + module);
    
    // Modül kontrolü - kojen_enerji, kojen-enerji ve bakim kabul et
    if (module !== 'kojen_enerji' && module !== 'kojen-enerji' && module !== 'bakim') {
      Logger.log('❌ Geçersiz modul: ' + module);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Gecersiz modul: ' + module,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Veri objesini oluştur (action, module, timestamp hariç)
    const payload = {};
    Object.keys(e.parameter).forEach(key => {
      if (!['action', 'module', 'timestamp'].includes(key)) {
        payload[key] = e.parameter[key];
      }
    });
    
    // Motor ID'sini al
    const motorId = payload.motorId || payload.motor || 'motor-1';
    
    // Sheet isimlerini belirle - her motor için ayrı
    const sheetNames = {
      'motor-1': 'GM 1 Enerji Verileri',
      'motor-2': 'GM 2 Enerji Verileri', 
      'motor-3': 'GM 3 Enerji Verileri'
    };
    
    // Motor filtresini kontrol et - doğru sheet'i seç
    let selectedMotorId = motorId;
    if (payload.motor) {
      selectedMotorId = payload.motor;
      Logger.log(`Motor filtresi: ${selectedMotorId}`);
    }
    
    const sheetName = sheetNames[selectedMotorId];
    Logger.log(`Seçilen sheet: ${sheetName} (motor: ${selectedMotorId})`);
    
    if (!sheetName) {
      Logger.log(`Geçersiz motor ID: ${selectedMotorId}`);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: `Geçersiz motor ID: ${selectedMotorId}`,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Spreadsheet kontrolü - yoksa oluştur
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.create('Kojenerasyon Kojen Enerji Verileri');
    }
    
    let sheet = ss.getSheetByName(sheetName);
    
    // Sheet yoksa oluştur
    if (!sheet) {
      sheet = createEnergySheet(ss, sheetName, motorId);
    }
    
    // HER DURUMDA header kontrolü yap
    if (module === 'kojen_enerji' || module === 'kojen-enerji') {
      ensureEnergyHeaders(sheet, motorId);
    }
    
    let result;
    
    switch (action) {
      case 'save':
        result = saveKojenEnergyRecord(sheet, payload);
        break;
        
      case 'save_motor_devre_disi':
        result = saveMotorDevreDisiRecord(sheet, payload);
        break;
        
      case 'save_bulk':
        result = saveBulkKojenEnergyRecords(sheet, payload);
        break;
        
      case 'get':
        result = getKojenEnergyRecords(sheet, payload.filters || {});
        break;
        
      case 'check':
        result = checkKojenEnergyRecord(sheet, payload);
        break;
        
      case 'update':
        if (!payload.id) {
          result = { success: false, error: 'Update için ID gerekli' };
        } else {
          result = updateKojenEnergyRecord(sheet, payload.id, payload);
        }
        break;
        
      case 'delete':
        result = deleteKojenEnergyRecord(sheet, payload.id);
        break;
        
      case 'test':
        result = { success: true, message: 'Kojen enerji bağlantısı başarılı', timestamp: new Date().toISOString() };
        break;
        
      default:
        result = { success: false, error: 'Bilinmeyen işlem: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Kojen enerji hatası: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Yeni enerji sayfası oluştur
 */
function createEnergySheet(ss, sheetName, motorId) {
  const sheet = ss.insertSheet(sheetName);
  
  // Başlıkları oluştur
  const headers = [
    'ID', 'Tarih', 'Vardiya', 'Saat', 'Aydem Voltaji', 'Aktif Güç', 'Reaktif Güç', 
    'Cos φ', 'Ortalama Akım', 'Ortalama Gerilim', 'Nötr Akımı', 'Tahrik Gerilimi',
    'Toplam Aktif Enerji', 'Çalışma Saati', 'Kalkış Sayısı', 'Motor Durumu',
    'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
    'Orijinal Personel', 'Değiştirilen Değerler'
  ];
  
  // Header'ları ekle
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#f0f0f0");
  
  // İlk satırı dondur
  sheet.setFrozenRows(1);
  
  // Kolon genişliklerini ayarla
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  Logger.log('Yeni enerji sayfası oluşturuldu: ' + sheetName);
  return sheet;
}

/**
 * Header kontrolü yap
 */
function ensureEnergyHeaders(sheet, motorId) {
  const headers = [
    'ID', 'Tarih', 'Vardiya', 'Saat', 'Aydem Voltaji', 'Aktif Güç', 'Reaktif Güç', 
    'Cos φ', 'Ortalama Akım', 'Ortalama Gerilim', 'Nötr Akımı', 'Tahrik Gerilimi',
    'Toplam Aktif Enerji', 'Çalışma Saati', 'Kalkış Sayısı', 'Motor Durumu',
    'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
    'Orijinal Personel', 'Değiştirilen Değerler'
  ];
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow === 0) {
    Logger.log('Sheet boş, header ekleniyor...');
    
    // Header'ları ekle
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#f0f0f0");
    
    // İlk satırı dondur
    sheet.setFrozenRows(1);
    
    // Kolon genişliklerini ayarla
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
}

/**
 * Mevcut kaydı ara
 */
function findExistingEnergyRecord(sheet, data) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null; // Sadece header var
  }
  
  // Verileri al (header hariç)
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = range.getValues();
  
  // Tarih (2. sütun), Vardiya (3. sütun), Saat (4. sütun)
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row[1] === data.tarih && row[2] === data.vardiya && row[3] === data.saat) {
      return {
        row: i + 2, // Google Sheets 1-based index
        data: row
      };
    }
  }
  
  return null;
}

/**
 * Motor devre dışı kaydet
 */
function saveMotorDevreDisiRecord(sheet, data) {
  try {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (e) {
      return {
        success: false,
        error: 'Kilit alınamadı, lütfen tekrar deneyin'
      };
    }
    
    const headers = getKojenEnergyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Tarih ve saat kontrolü
    const tarih = data.tarih || Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd/MM/yyyy');
    const saat = data.saat || new Date().getHours().toString().padStart(2, '0') + ':00:00';
    const vardiya = data.vardiya || 'GÜNDÜZ';
    
    // allData varsa işle, yoksa boş veri oluştur
    let allData = {};
    if (data.allData) {
      try {
        allData = JSON.parse(data.allData);
      } catch (e) {
        Logger.log('allData parse hatası: ' + e.toString());
        allData = {};
      }
    }
    
    // Mevcut kaydı kontrol et
    let existingRecord = null;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const existingDate = row[headers.indexOf('Tarih')];
      const existingVardiya = row[headers.indexOf('Vardiya')];
      let existingSaat = row[headers.indexOf('Saat')];
      
      // Saat formatını normalize et (17 veya 17:00:00)
      if (existingSaat && existingSaat.toString().includes(':')) {
        existingSaat = parseInt(existingSaat.toString().split(':')[0]);
      } else {
        existingSaat = parseInt(existingSaat);
      }
      
      // Gelen saati de normalize et
      let normalizedInputSaat = saat;
      if (saat && saat.toString().includes(':')) {
        normalizedInputSaat = parseInt(saat.toString().split(':')[0]);
      } else {
        normalizedInputSaat = parseInt(saat);
      }
      
      if (existingDate === tarih && existingVardiya === vardiya && existingSaat === normalizedInputSaat) {
        existingRecord = {
          row: i + 1,
          data: row
        };
        break;
      }
    }
    
    if (existingRecord) {
      // Mevcut kayıt varsa, motor durumunu güncelle
      const rowIndex = existingRecord.row;
      sheet.getRange(rowIndex, headers.indexOf('Motor Durumu') + 1).setValue('DEVRE DIŞI');
      sheet.getRange(rowIndex, headers.indexOf('Güncelleme Zamanı') + 1).setValue(
        new Date().toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
      sheet.getRange(rowIndex, headers.indexOf('Güncelleyen') + 1).setValue(
        data.guncelleyen || data.operator || data.personel || 'System'
      );
      sheet.getRange(rowIndex, headers.indexOf('Değiştirilen Değerler') + 1).setValue(
        'Motor Durumu: DEVRE DIŞI'
      );
      
      lock.releaseLock();
      
      return {
        success: true,
        message: 'Mevcut kayıt güncellendi - motor devre dışı',
        action: 'updated',
        timestamp: new Date().toISOString()
      };
    } else {
      // Yeni kayıt oluştur - allData'dan gelen verileri kullan
      const newRow = [];
      headers.forEach(header => {
        let value = '';
        
        // Header ve data eşleşmesi
        switch(header) {
          case 'ID':
            value = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            break;
          case 'Tarih':
            value = tarih;
            break;
          case 'Vardiya':
            value = vardiya;
            break;
          case 'Saat':
            value = saat;
            break;
          case 'Motor Durumu':
            value = 'DEVRE DIŞI';
            break;
          case 'Kayıt Zamanı':
            value = new Date().toLocaleString('tr-TR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            break;
          case 'Güncelleyen':
            value = data.guncelleyen || data.operator || data.personel || 'System';
            break;
          default:
            // allData'dan gelen verileri kullan
            const hourKey = saat.replace(':00:00', '');
            if (allData[hourKey]) {
              switch(header) {
                case 'AYDEM-VOLTAJI':
                  value = allData[hourKey]['aydem-voltaji'] || '';
                  break;
                case 'AKTİF-GÜÇ':
                  value = allData[hourKey]['aktif-guc'] || '';
                  break;
                case 'REAKTİF-GÜÇ':
                  value = allData[hourKey]['reaktif-guc'] || '';
                  break;
                case 'COS-Fİ':
                  value = allData[hourKey]['cos-fi'] || '';
                  break;
                case 'ORT-AKIM':
                  value = allData[hourKey]['ort-akim'] || '';
                  break;
                case 'ORT-GERİLİM':
                  value = allData[hourKey]['ort-gerilim'] || '';
                  break;
                case 'NÖTR-AKIMI':
                  value = allData[hourKey]['notur-akimi'] || '';
                  break;
                case 'TAHRİK-GERİLİMİ':
                  value = allData[hourKey]['tahrik-gerilimi'] || '';
                  break;
                case 'TOPALAM-AKTİF-ENERJİ':
                  value = allData[hourKey]['toplam-aktif-enerji'] || '';
                  break;
                case 'ÇALIŞMA-SAATİ':
                  value = allData[hourKey]['calisma-saati'] || '';
                  break;
                case 'KALKIŞ-SAYISI':
                  value = allData[hourKey]['kalkis-sayisi'] || '';
                  break;
              }
            }
            break;
        }
        
        newRow.push(value);
      });
      
      // Yeni satırı ekle
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, 1, newRow.length).setValues([newRow]);
      
      lock.releaseLock();
      
      return {
        success: true,
        message: 'Motor devre dışı kaydı oluşturuldu',
        action: 'created',
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (error) {
    if (typeof lock !== 'undefined' && lock) {
      try {
        lock.releaseLock();
      } catch (e) {
        Logger.log('Lock release hatası: ' + e.toString());
      }
    }
    
    Logger.log('saveMotorDevreDisiRecord hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen enerji tek kayıt kaydet
 */
function saveKojenEnergyRecord(sheet, data) {
  const lockKey = sheet.getName() + '_save_lock';
  
  try {
    // Çoklu API çağrısını engelle
    const globalLockKey = 'kojen_enerji_global_save_lock';
    const globalLock = CacheService.getPublicCache().get(globalLockKey);
    
    if (globalLock !== null) {
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.'
      };
    }
    
    // Kilit oluştur
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000); // 30 saniye bekle
    } catch (e) {
      return {
        success: false,
        error: 'Kilit alınamadı, lütfen tekrar deneyin'
      };
    }
    
    const headers = getKojenEnergyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Saat bazlı verileri işle
    let allData = {};
    try {
      allData = data.allData ? JSON.parse(data.allData) : {};
    } catch (e) {
      return {
        success: false,
        error: 'Saat verileri parse edilemedi: ' + e.toString()
      };
    }
    const tarih = data.tarih;
    const vardiya = data.vardiya;
    
    Logger.log('🔍 İşlenecek saat verileri: ' + JSON.stringify(allData));
    
    // Her saat için ayrı kayıt oluştur
    const results = [];
    const newRows = [];
    
    // Saatleri al ve verileri işle
    Object.keys(allData).forEach(hour => {
      const hourData = allData[hour];
      
      // Boş saat verisi kontrolü
      if (!hourData || Object.keys(hourData).length === 0) {
        Logger.log('⚠️ Saat ' + hour + ' boş veya verisiz, atlanıyor');
        return;
      }
      
      Logger.log('✅ Saat ' + hour + ' için veri işleniyor: ' + JSON.stringify(hourData));
      
      // Veriyi hazırla
      const recordData = {
        tarih: tarih,
        vardiya: vardiya,
        saat: hour,
        ...hourData
      };
      
      // Çakışma kontrolü
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const existingDate = row[headers.indexOf('Tarih')];
        const existingVardiya = row[headers.indexOf('Vardiya')];
        const existingSaat = row[headers.indexOf('Saat')];
        
        // Tarih, vardiya VE saat kontrolü
        if (existingDate === tarih && existingVardiya === vardiya && existingSaat === parseInt(hour)) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) {
        // Yeni satır olarak hazırla
        const newRow = [];
        headers.forEach(header => {
          let value = '';
          
          // Header ve data eşleşmesi
          switch(header) {
            case 'ID':
              value = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
              break;
            case 'Tarih':
              value = recordData.tarih || Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd/MM/yyyy');
              break;
            case 'Vardiya':
              value = recordData.vardiya || '';
              break;
            case 'Saat':
              value = recordData.saat || '';
              break;
            case 'Aydem Voltaji':
              value = recordData['aydem-voltaji'] || '';
              break;
            case 'Aktif Güç':
              value = recordData['aktif-guc'] || '';
              break;
            case 'Reaktif Güç':
              value = recordData['reaktif-guc'] || '';
              break;
            case 'Cos φ':
              value = recordData['cos-fi'] || '';
              break;
            case 'Ortalama Akım':
              value = recordData['ort-akim'] || '';
              break;
            case 'Ortalama Gerilim':
              value = recordData['ort-gerilim'] || '';
              break;
            case 'Nötr Akımı':
              value = recordData['notur-akimi'] || '';
              break;
            case 'Tahrik Gerilimi':
              value = recordData['tahrik-gerilimi'] || '';
              break;
            case 'Toplam Aktif Enerji':
              value = recordData['toplam-aktif-enerji'] || '';
              break;
            case 'Çalışma Saati':
              value = recordData['calisma-saati'] || '';
              break;
            case 'Kalkış Sayısı':
              value = recordData['kalkis-sayisi'] || '';
              break;
            case 'Motor Durumu':
              value = recordData['motor-durumu'] || '';
              break;
            case 'Kayıt Zamanı':
              value = new Date().toLocaleString('tr-TR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              break;
            case 'Güncelleme Zamanı':
              value = '';
              break;
            case 'Güncelleyen':
              // Frontend'den gelen kullanıcı bilgisi veya session bilgisi
              value = recordData.guncelleyen || recordData.operator || recordData.personel || 'System';
              break;
            case 'Orijinal Kayıt Zamanı':
              value = '';
              break;
            case 'Orijinal Personel':
              value = '';
              break;
            case 'Değiştirilen Değerler':
              value = '';
              break;
          }
          
          newRow.push(value);
        });
        
        newRows.push(newRow);
        results.push({ hour, success: true, action: 'created', data: hourData });
      } else {
        // Güncelleme
        results.push({ hour, success: true, action: 'exists', rowIndex, data: hourData });
      }
    });
    
    // Tüm yeni satırları tek seferde ekle
    if (newRows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
      Logger.log('✅ ' + newRows.length + ' yeni satır toplu eklendi');
    }
    
    // Kilidi serbest bırak
    lock.releaseLock();
    
    return {
      success: true,
      message: `Kojen enerji verileri başarıyla kaydedildi (${results.length} saat)`,
      results: results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    // Kilidi serbest bırak
    if (typeof lock !== 'undefined' && lock) {
      try {
        lock.releaseLock();
      } catch (e) {
        Logger.log('Lock release hatası: ' + e.toString());
      }
    }
    
    Logger.log('saveKojenEnergyRecord hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen enerji çoklu kayıt kaydet
 */
function saveBulkKojenEnergyRecords(sheet, data) {
  try {
    const records = data.records || [];
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    // Global lock'i sadece bulk işlem başında al
    const globalLockKey = 'kojen_enerji_global_save_lock';
    const globalLock = CacheService.getPublicCache().get(globalLockKey);
    
    if (globalLock !== null) {
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.',
        lockActive: true
      };
    }
    
    // Global kilidi oluştur
    CacheService.getPublicCache().put(globalLockKey, 'locked', 60);
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      const recordLockKey = `kojen_enerji_record_${record.id}_${Date.now()}`;
      const recordLock = CacheService.getPublicCache().get(recordLockKey);
      
      if (recordLock !== null) {
        errorCount++;
        errors.push(`${record.tarih}: Kayıt kilitli`);
        continue;
      }
      
      // Kayıt kilidi oluştur
      CacheService.getPublicCache().put(recordLockKey, 'locked', 30);
      
      const result = saveKojenEnergyRecord(sheet, record);
      
      // Kayıt kilidini serbest bırak
      CacheService.getPublicCache().remove(recordLockKey);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`${record.tarih}: ${result.error}`);
      }
    }
    
    // Global kilidi serbest bırak
    CacheService.getPublicCache().remove(globalLockKey);
    
    return {
      success: true,
      message: `${successCount} kayıt başarıyla kaydedildi, ${errorCount} kayıt hatalı`,
      successCount: successCount,
      errorCount: errorCount,
      errors: errors,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Global kilidi serbest bırak
    CacheService.getPublicCache().remove('kojen_enerji_global_save_lock');
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen enerji kayıtları getir
 */
function getKojenEnergyRecords(sheet, filters = {}) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('Sheet boş, kayıt yok');
      return {
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString()
      };
    }
    
    const sheetName = sheet.getName();
    Logger.log(`Sheet adı: ${sheetName}`);
    
    const headers = getKojenEnergyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let records = [];
    
    // Verileri işle (header satırını atla)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const record = {};
      
      // Her header için doğru index'i kullan
      headers.forEach((header, headerIndex) => {
        let cellValue = row[headerIndex];

        if (cellValue instanceof Date) {
          // Tarih ve saat formatlama
          if (header === 'Kayıt Zamanı') {
            cellValue = Utilities.formatDate(
              cellValue,
              'Europe/Istanbul',
              'dd.MM.yyyy HH:mm:ss'
            );
          } else if (header === 'Tarih') {
            cellValue = Utilities.formatDate(
              cellValue,
              'Europe/Istanbul',
              'dd/MM/yyyy'
            );
          } else if (header === 'Saat') {
            // Saat formatını sadece saat olarak döndür
            const hour = cellValue.getHours();
            cellValue = hour.toString();
          }
        }

        record[header] = cellValue || '';
      });
      
      records.push(record);
    }
    
    Logger.log(`Toplam ${records.length} kayıt bulundu (sheet: ${sheetName})`);
    
    // Motor filtresi
    if (filters.motor) {
      Logger.log(`Motor filtresi: ${filters.motor}`);
      
      let sheetMotor = null;
      if (sheetName.includes('GM 1') || sheetName.includes('motor-1')) {
        sheetMotor = 'motor-1';
      } else if (sheetName.includes('GM 2') || sheetName.includes('motor-2')) {
        sheetMotor = 'motor-2';
      } else if (sheetName.includes('GM 3') || sheetName.includes('motor-3')) {
        sheetMotor = 'motor-3';
      }
      
      Logger.log(`Sheet motor: ${sheetMotor}, İstenen motor: ${filters.motor}`);
      
      if (sheetMotor !== filters.motor) {
        Logger.log(`Motor uyuşmuyor, boş liste döndürülüyor: ${sheetMotor} != ${filters.motor}`);
        return {
          success: true,
          data: [],
          count: 0,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // Filtreleme
    if (filters.tarih) {
      records = records.filter(record => {
        const recordDate = record['Tarih'] ? record['Tarih'].toString() : '';
        let filterDate = filters.tarih.toString();
        if (filters.tarih instanceof Date) {
          filterDate = Utilities.formatDate(filters.tarih, 'Europe/Istanbul', 'dd/MM/yyyy');
        } else {
          filterDate = filters.tarih.toString()
            .replace(/\./g, '/')
            .replace(/-/g, '/')
            .trim();
          
          try {
            const parsedDate = new Date(filterDate);
            if (!isNaN(parsedDate.getTime())) {
              filterDate = Utilities.formatDate(parsedDate, 'Europe/Istanbul', 'dd/MM/yyyy');
            }
          } catch (e) {
            Logger.log('Filter tarih formatlama hatası: ' + e.toString());
          }
        }
        
        return recordDate === filterDate;
      });
    }
    
    if (filters.vardiya) {
      records = records.filter(record => {
        return record['Vardiya'] === filters.vardiya;
      });
    }
    
    if (filters.saat) {
      records = records.filter(record => {
        return record['Saat'] === filters.saat;
      });
    }
    
    Logger.log(`Filtrelenmiş kayıt sayısı: ${records.length} (motor: ${filters.motor})`);
    
    return {
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log('getKojenEnergyRecords hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Kojen enerji kayıt kontrolü
 */
function checkKojenEnergyRecord(sheet, data) {
  try {
    const tarih = data.tarih;
    const vardiya = data.vardiya;
    const saat = data.saat;
    const motor = data.motor;
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('Sheet boş, kayıt yok');
      return {
        success: true,
        exists: false,
        results: [], // Boş results array
        message: 'Sheet boş - kayıt yok'
      };
    }
    
    // Tarih formatını normalize et
    let normalizedTargetDate = tarih.toString();
    
    if (tarih instanceof Date) {
      normalizedTargetDate = Utilities.formatDate(tarih, 'Europe/Istanbul', 'dd/MM/yyyy');
    } else {
      normalizedTargetDate = tarih.toString()
        .replace(/\./g, '/')
        .replace(/-/g, '/')
        .trim();
      
      try {
        const parsedDate = new Date(normalizedTargetDate);
        if (!isNaN(parsedDate.getTime())) {
          normalizedTargetDate = Utilities.formatDate(parsedDate, 'Europe/Istanbul', 'dd/MM/yyyy');
        }
      } catch (e) {
        Logger.log('Tarih formatlama hatası, orijinal kullanılıyor: ' + e.toString());
      }
    }
    
    // Vardiya tipini tam metin formatına çevir
    const vardiyaTipMap = {
      'gece': 'Gece Vardiyası',
      'gunduz': 'Gündüz Vardiyası',
      'aksam': 'Akşam Vardiyası'
    };
    const normalizedVardiyaTipi = vardiyaTipMap[vardiya] || vardiya;
    
    // Saati normalize et - HH:00:00 formatını destekle
    let normalizedSaat = saat;
    if (saat && saat.toString().includes(':')) {
      // HH:00:00 formatından saati çıkar
      normalizedSaat = parseInt(saat.toString().split(':')[0]);
    } else {
      normalizedSaat = parseInt(saat);
    }
    
    // Sheet'den verileri al
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    
    if (!headers || headers.length === 0 || headers[0] !== 'ID') {
      Logger.log('Header bulunamadı, kayıt kontrolü yapılamıyor');
      return {
        success: true,
        exists: false,
        message: 'Header bulunamadı'
      };
    }
    
    // Binary search için verileri hazırla
    let low = 1;
    let high = values.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midDate = values[mid][headers.indexOf('Tarih')];
      
      if (midDate) {
        const normalizedMidDate = Utilities.formatDate(midDate, 'Europe/Istanbul', 'dd/MM/yyyy');
        
        if (normalizedMidDate < normalizedTargetDate) {
          low = mid + 1;
        } else if (normalizedMidDate > normalizedTargetDate) {
          high = mid - 1;
        } else {
          // Tarih eşleşti, şimdi vardiya ve saat kontrolü
          const existingVardiya = values[mid][headers.indexOf('Vardiya')];
          const existingSaat = values[mid][headers.indexOf('Saat')];
          
          if (existingVardiya === normalizedVardiyaTipi && existingSaat === parseInt(normalizedSaat)) {
            return {
              success: true,
              exists: true,
              results: [values[mid]], // results array olarak döndür
              record: {
                row: mid + 1,
                data: values[mid]
              }
            };
          }
        }
      } else {
        high = mid - 1;
      }
    }
    
    return {
      success: true,
      exists: false,
      results: [], // Boş results array
      message: 'Kayıt bulunamadı'
    };
  } catch (error) {
    Logger.log('checkKojenEnergyRecord hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen enerji kayıt güncelle
 */
function updateKojenEnergyRecord(sheet, recordId, data) {
  try {
    const headers = getKojenEnergyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][headers.indexOf('ID')] === recordId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // Alan map'i
    const fieldMap = {
      'aydem-voltaji': 'Aydem Voltaji',
      'aktif-guc': 'Aktif Güç',
      'reaktif-guc': 'Reaktif Güç',
      'cos-fi': 'Cos φ',
      'ort-akim': 'Ortalama Akım',
      'ort-gerilim': 'Ortalama Gerilim',
      'notur-akimi': 'Nötr Akımı',
      'tahrik-gerilimi': 'Tahrik Gerilimi',
      'toplam-aktif-enerji': 'Toplam Aktif Enerji',
      'calisma-saati': 'Çalışma Saati',
      'kalkis-sayisi': 'Kalkış Sayısı',
      'motor-durumu': 'Motor Durumu'
    };
    
    // Değişiklikleri takip et
    const updatedFields = [];
    
    // Map'li güncelle
    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const headerName = fieldMap[key];
        const colIndex = headers.indexOf(headerName);
        
        if (colIndex !== -1) {
          const currentValue = sheet.getRange(rowIndex, colIndex + 1).getValue();
          
          if (currentValue !== data[key]) {
            sheet.getRange(rowIndex, colIndex + 1).setValue(data[key]);
            updatedFields.push(`${headerName}: ${currentValue} → ${data[key]}`);
          }
        }
      }
    });
    
    // Güncelleme zamanını ayarla
    sheet.getRange(rowIndex, headers.indexOf('Güncelleme Zamanı') + 1).setValue(new Date().toLocaleString('tr-TR'));
    sheet.getRange(rowIndex, headers.indexOf('Güncelleyen') + 1).setValue('System');
    sheet.getRange(rowIndex, headers.indexOf('Değiştirilen Değerler') + 1).setValue(updatedFields.join(', '));
    
    return {
      success: true,
      message: 'Kojen enerji kaydı başarıyla güncellendi',
      recordId: recordId,
      updatedFields: updatedFields,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('updateKojenEnergyRecord hatası: ' + error.toString());
    
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Kojen enerji kayıt sil
 */
function deleteKojenEnergyRecord(sheet, recordId) {
  try {
    const headers = getKojenEnergyHeaders(sheet);
    const idColumnIndex = headers.indexOf('ID');
    
    if (idColumnIndex === -1) {
      return { success: false, error: 'ID kolonu bulunamadı' };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][idColumnIndex] === recordId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // Sil
    sheet.deleteRow(rowIndex);
    
    return {
      success: true,
      message: 'Kojen enerji kaydı başarıyla silindi',
      recordId: recordId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen enerji sheet headers'ını getir
 */
function getKojenEnergyHeaders(sheet) {
  try {
    const lastCol = sheet.getLastColumn();
    
    if (lastCol === 0) {
      console.log('Sheet boş, manuel başlıklar dönülüyor');
      return [
        'ID', 'Tarih', 'Vardiya', 'Saat', 'Aydem Voltaji', 'Aktif Güç', 'Reaktif Güç', 
        'Cos φ', 'Ortalama Akım', 'Ortalama Gerilim', 'Nötr Akımı', 'Tahrik Gerilimi',
        'Toplam Aktif Enerji', 'Çalışma Saati', 'Kalkış Sayısı', 'Motor Durumu',
        'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
        'Orijinal Personel', 'Değiştirilen Değerler'
      ];
    }
    
    const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const headers = headerRow.map(header => header.toString().trim());
    
    if (!headers || headers.length === 0 || headers[0] !== 'ID') {
      console.log('Başlıklar geçersiz, manuel başlıklar dönülüyor');
      return [
        'ID', 'Tarih', 'Vardiya', 'Saat', 'Aydem Voltaji', 'Aktif Güç', 'Reaktif Güç', 
        'Cos φ', 'Ortalama Akım', 'Ortalama Gerilim', 'Nötr Akımı', 'Tahrik Gerilimi',
        'Toplam Aktif Enerji', 'Çalışma Saati', 'Kalkış Sayısı', 'Motor Durumu',
        'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
        'Orijinal Personel', 'Değiştirilen Değerler'
      ];
    }
    
    console.log('Geçerli başlıklar bulundu:', headers);
    return headers;
    
  } catch (error) {
    console.log('getKojenEnergyHeaders hatası:', error);
    return [
      'ID', 'Tarih', 'Vardiya', 'Saat', 'Aydem Voltaji', 'Aktif Güç', 'Reaktif Güç', 
      'Cos φ', 'Ortalama Akım', 'Ortalama Gerilim', 'Nötr Akımı', 'Tahrik Gerilimi',
      'Toplam Aktif Enerji', 'Çalışma Saati', 'Kalkış Sayısı', 'Motor Durumu',
      'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
      'Orijinal Personel', 'Değiştirilen Değerler'
    ];
  }
}

/**
 * doGet - Test için
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Kojen enerji Google Sheets App Script çalışıyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    module: 'kojen_enerji'
  })).setMimeType(ContentService.MimeType.JSON);
}
