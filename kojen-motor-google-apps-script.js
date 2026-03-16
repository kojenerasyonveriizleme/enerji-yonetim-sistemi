/**
 * KOJEN MOTOR ICIN GOOGLE SHEETS APP SCRIPT
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
    
    // Veri objesini oluştur (action, module, timestamp hariç)
    const payload = {};
    Object.keys(e.parameter).forEach(key => {
      if (!['action', 'module', 'timestamp'].includes(key)) {
        payload[key] = e.parameter[key];
      }
    });
    
    // Motor ID'sini al
    const motorId = payload.motorId || 'motor-1';
    
    // Sheet isimlerini belirle - her motor için ayrı
    const sheetNames = {
      'motor-1': 'GM 1 Motor Verileri',
      'motor-2': 'GM 2 Motor Verileri', 
      'motor-3': 'GM 3 Motor Verileri'
    };
    
    // ✅ ÇÖZÜM: Motor filtresini kontrol et - doğru sheet'i seç
    let selectedMotorId = motorId; // Varsayılan
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
      ss = SpreadsheetApp.create('Kojenerasyon Kojen Motor Verileri');
    }
    
    let sheet = ss.getSheetByName(sheetName);
    
    // Sheet yoksa oluştur
    if (!sheet) {
      sheet = createMotorSheet(ss, sheetName, motorId);
    }
    
    // HER DURUMDA header kontrolü yap
    if (module === 'kojen_motor') {
      ensureHeaders(sheet, motorId);
    }
    
    // Kayıt kontrolü yap
    const existingRecord = findExistingRecord(sheet, payload);
    if (existingRecord) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Bu tarih, vardiya ve saat için kayıt zaten var',
        existingRow: existingRecord.row,
        motorId: motorId
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = [
      'ID', 'Tarih', 'Vardiya', 'Saat', 'JEN-YATAK-DE', 'JEN-YATAK-NDE', 
      'SOGUTMA-SICAKLIK', 'SOGUTMA-BASINC', 'YAG-SICAKLIK', 'YAG-BASINC',
      'SARJ-SICAKLIK', 'SARJ-BASINC', 'GAZ-REGULATOR', 'MAKINE-SICAKLIK',
      'KARTER-BASINC', 'ON-KAMARA-BASINC', 'SARGI-1', 'SARGI-2', 'SARGI-3',
      'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
      'Orijinal Personel', 'Değiştirilen Değerler'
    ];
    
    // Spreadsheet kontrolü - yoksa oluştur
    const lastRow = sheet.getLastRow();
    
    if (lastRow === 0) {
      Logger.log('Sheet boş, header ekleniyor...');
      
      // Headerları ekle
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
      
      Logger.log('Headerlar eklendi, toplam ' + headers.length + ' kolon');
    } else {
      // Sheet doluysa ilk hücreyi kontrol et
      const firstCell = sheet.getRange(1,1).getValue();
      if (firstCell !== 'ID') {
        throw new Error('Sheet dolu ama header bozuk! Manuel kontrol gerekli.');
      } else {
        Logger.log('Headerlar zaten mevcut ve doğru');
      }
    }
    
    let result;
    
    switch (action) {
      case 'save':
        result = saveKojenMotorRecord(sheet, payload);
        break;
        
      case 'save_bulk':
        result = saveBulkKojenMotorRecords(sheet, payload);
        break;
        
      case 'get':
        result = getKojenMotorRecords(sheet, payload.filters || {});
        break;
        
      case 'check':
        result = checkKojenMotorRecord(sheet, payload);
        break;
        
      case 'update':
        if (!payload.id) {
          result = { success: false, error: 'Update için ID gerekli' };
        } else {
          result = updateKojenMotorRecord(sheet, payload.id, payload);
        }
        break;
        
      case 'delete':
        result = deleteKojenMotorRecord(sheet, payload.id);
        break;
        
      case 'test':
        result = { success: true, message: 'Kojen motor bağlantısı başarılı', timestamp: new Date().toISOString() };
        break;
        
      default:
        result = { success: false, error: 'Bilinmeyen işlem: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Kojen motor hatası: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Yeni motor sayfası oluştur
 */
function createMotorSheet(ss, sheetName, motorId) {
  const sheet = ss.insertSheet(sheetName);
  
  // Başlıkları oluştur
  const headers = [
    'ID', 'Tarih', 'Vardiya', 'Saat', 'JEN-YATAK-DE', 'JEN-YATAK-NDE', 
    'SOGUTMA-SICAKLIK', 'SOGUTMA-BASINC', 'YAG-SICAKLIK', 'YAG-BASINC',
    'SARJ-SICAKLIK', 'SARJ-BASINC', 'GAZ-REGULATOR', 'MAKINE-SICAKLIK',
    'KARTER-BASINC', 'ON-KAMARA-BASINC', 'SARGI-1', 'SARGI-2', 'SARGI-3',
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
  
  Logger.log('Yeni motor sayfası oluşturuldu: ' + sheetName);
  return sheet;
}

/**
 * Header kontrolü yap
 */
function ensureHeaders(sheet, motorId) {
  const headers = [
    'ID', 'Tarih', 'Vardiya', 'Saat', 'JEN-YATAK-DE', 'JEN-YATAK-NDE', 
    'SOGUTMA-SICAKLIK', 'SOGUTMA-BASINC', 'YAG-SICAKLIK', 'YAG-BASINC',
    'SARJ-SICAKLIK', 'SARJ-BASINC', 'GAZ-REGULATOR', 'MAKINE-SICAKLIK',
    'KARTER-BASINC', 'ON-KAMARA-BASINC', 'SARGI-1', 'SARGI-2', 'SARGI-3',
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
function findExistingRecord(sheet, data) {
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
 * Kojen motor tek kayıt kaydet
 */
function saveKojenMotorRecord(sheet, data) {
  // ÇÖZÜM: Lock key'i fonksiyon başında tanımla
  const lockKey = sheet.getName() + '_save_lock';
  
  try {
    // Çoklu API çağrısını engelle
    const globalLockKey = 'kojen_motor_global_save_lock';
    const globalLock = CacheService.getPublicCache().get(globalLockKey);
    
    if (globalLock !== null) {
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.'
      };
    }
    
    // Kilit oluştur - LockService kullan
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000); // 30 saniye bekle
    } catch (e) {
      return {
        success: false,
        error: 'Kilit alınamadı, lütfen tekrar deneyin'
      };
    }
    
    const headers = getKojenMotorHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // ✅ ÇÖZÜM: Saat bazlı verileri işle
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
    const newRows = []; // Performans için tüm yeni satırları burada topla
    
    // Saatleri al ve verileri işle
    Object.keys(allData).forEach(hour => {
      const hourData = allData[hour];
      
      // Boş saat verisi kontrolü
      if (!hourData || Object.keys(hourData).length === 0) {
        Logger.log('⚠️ Saat ' + hour + ' boş veya verisiz, atlanıyor');
        return; // Boş saatleri atla
      }
      
      Logger.log('✅ Saat ' + hour + ' için veri işleniyor: ' + JSON.stringify(hourData));
      
      // Veriyi hazırla
      const recordData = {
        tarih: tarih,
        vardiya: vardiya,
        saat: parseInt(hour),
        ...hourData
      };
      
      // Çakışma kontrolü - values üzerinden yap (performanslı)
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
        // Yeni satır olarak hazırla - performans için toplu ekleme
        const newRow = [];
        headers.forEach(header => {
          let value = '';
          
          // Header ve data eşleşmesi
          switch(header) {
            case 'ID':
              value = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
              break;
            case 'Tarih':
              value = recordData.tarih || '';
              break;
            case 'Vardiya':
              value = recordData.vardiya || '';
              break;
            case 'Saat':
              value = recordData.saat || '';
              break;
            case 'JEN-YATAK-DE':
              value = recordData['jen-yatak-de'] || '';
              break;
            case 'JEN-YATAK-NDE':
              value = recordData['jen-yatak-nde'] || '';
              break;
            case 'SOGUTMA-SICAKLIK':
              value = recordData['sogutma-sicaklik'] || '';
              break;
            case 'SOGUTMA-BASINC':
              value = recordData['sogutma-basinc'] || '';
              break;
            case 'YAG-SICAKLIK':
              value = recordData['yag-sicaklik'] || '';
              break;
            case 'YAG-BASINC':
              value = recordData['yag-basinc'] || '';
              break;
            case 'SARJ-SICAKLIK':
              value = recordData['sarj-sicaklik'] || '';
              break;
            case 'SARJ-BASINC':
              value = recordData['sarj-basinc'] || '';
              break;
            case 'GAZ-REGULATOR':
              value = recordData['gaz-regulator'] || '';
              break;
            case 'MAKINE-SICAKLIK':
              value = recordData['makine-sicaklik'] || '';
              break;
            case 'KARTER-BASINC':
              value = recordData['karter-basinc'] || '';
              break;
            case 'ON-KAMARA-BASINC':
              value = recordData['on-kamara-basinc'] || '';
              break;
            case 'SARGI-1':
              value = recordData['sargi-1'] || '';
              break;
            case 'SARGI-2':
              value = recordData['sargi-2'] || '';
              break;
            case 'SARGI-3':
              value = recordData['sargi-3'] || '';
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
              value = 'System';
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
    
    // ✅ PERFORMANS: Tüm yeni satırları tek seferde ekle
    if (newRows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
      Logger.log('✅ ' + newRows.length + ' yeni satır toplu eklendi (performanslı)');
    }
    
    // Kilidi serbest bırak
    lock.releaseLock();
    
    return {
      success: true,
      message: `Kojen motor verileri başarıyla kaydedildi (${results.length} saat)`,
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
    
    Logger.log('saveKojenMotorRecord hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen motor çoklu kayıt kaydet
 */
function saveBulkKojenMotorRecords(sheet, data) {
  try {
    const records = data.records || [];
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    // ✅ ÇÖZÜM: Global lock'i sadece bulk işlem başında al
    const globalLockKey = 'kojen_motor_global_save_lock';
    const globalLock = CacheService.getPublicCache().get(globalLockKey);
    
    if (globalLock !== null) {
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.',
        lockActive: true
      };
    }
    
    // Global kilidi oluştur (tüm bulk işlem için)
    CacheService.getPublicCache().put(globalLockKey, 'locked', 60);
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // ✅ ÇÖZÜM: Her kayıt için ayrı lock kullan
      const recordLockKey = `kojen_motor_record_${record.id}_${Date.now()}`;
      const recordLock = CacheService.getPublicCache().get(recordLockKey);
      
      if (recordLock !== null) {
        errorCount++;
        errors.push(`${record.tarih}: Kayıt kilitli`);
        continue;
      }
      
      // Kayıt kilidi oluştur
      CacheService.getPublicCache().put(recordLockKey, 'locked', 30);
      
      const result = saveKojenMotorRecord(sheet, record);
      
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
    CacheService.getPublicCache().remove('kojen_motor_global_save_lock');
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen motor kayıtları getir
 */
function getKojenMotorRecords(sheet, filters = {}) {
  try {
    // ✅ ÇÖZÜM: Boş sheet kontrolü
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
    
    // ✅ ÇÖZÜM: Sheet adını kontrol et - hangi motorun verisi geldiğini anla
    const sheetName = sheet.getName();
    Logger.log(`Sheet adı: ${sheetName}`);
    
    const headers = getKojenMotorHeaders(sheet);
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
              'yyyy-MM-dd'
            );
          }
        }

        record[header] = cellValue || '';
      });
      
      records.push(record);
    }
    
    Logger.log(`Toplam ${records.length} kayıt bulundu (sheet: ${sheetName})`);
    
    // ✅ ÇÖZÜM: Motor filtresi - sadece ilgili motorun verisini döndür
    if (filters.motor) {
      Logger.log(`Motor filtresi: ${filters.motor}`);
      
      // Sheet adına göre motoru belirle
      let sheetMotor = null;
      if (sheetName.includes('GM 1') || sheetName.includes('motor-1')) {
        sheetMotor = 'motor-1';
      } else if (sheetName.includes('GM 2') || sheetName.includes('motor-2')) {
        sheetMotor = 'motor-2';
      } else if (sheetName.includes('GM 3') || sheetName.includes('motor-3')) {
        sheetMotor = 'motor-3';
      }
      
      Logger.log(`Sheet motor: ${sheetMotor}, İstenen motor: ${filters.motor}`);
      
      // Eğer motor uyuşmuyorsa boş liste döndür
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
        const filterDate = filters.tarih.toString();
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
    
    // Tarih aralığı filtreleme
    if (filters.start_date && filters.end_date) {
      records = records.filter(record => {
        const recordDate = new Date(record['Tarih']);
        const startDate = new Date(filters.start_date);
        const endDate = new Date(filters.end_date);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    // Son kayıtları getir
    if (filters.recent && filters.limit) {
      records = records.slice(-filters.limit).reverse();
    }
    
    Logger.log(`Filtrelenmiş kayıt sayısı: ${records.length} (motor: ${filters.motor})`);
    
    return {
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log('getKojenMotorRecords hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Kojen motor kayıt kontrolü
 */
function checkKojenMotorRecord(sheet, data) {
  try {
    const tarih = data.tarih;
    const vardiya = data.vardiya;
    const saat = data.saat;
    const motor = data.motor;
    
    // ✅ ÇÖZÜM: Boş sheet kontrolü
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('Sheet boş, kayıt yok');
      return {
        success: true,
        exists: false,
        message: 'Sheet boş - kayıt yok'
      };
    }
    
    // Tarih formatını normalize et
    const normalizedTargetDate = tarih.toString()
      .replace(/\./g, '-')
      .replace(/\//g, '-')
      .trim();
    
    // Vardiya tipini tam metin formatına çevir
    const vardiyaTipMap = {
      'gece': 'Gece Vardiyası',
      'gunduz': 'Gündüz Vardiyası',
      'aksam': 'Akşam Vardiyası'
    };
    const normalizedVardiyaTipi = vardiyaTipMap[vardiya] || vardiya;
    
    // Saati normalize et
    const normalizedSaat = saat.toString().replace(':00', '').trim();
    
    // Sheet'den verileri al
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    
    // ✅ ÇÖZÜM: Header kontrolü
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
        const normalizedMidDate = Utilities.formatDate(midDate, 'Europe/Istanbul', 'yyyy-MM-dd');
        
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
      message: 'Kayıt bulunamadı'
    };
  } catch (error) {
    Logger.log('checkKojenMotorRecord hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen motor kayıt güncelle
 */
function updateKojenMotorRecord(sheet, recordId, data) {
  try {
    const headers = getKojenMotorHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][headers.indexOf('ID')] === recordId) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // Alan map'i - frontend ↔ apps script uyumlu
    const fieldMap = {
      'jen-yatak-de': 'JEN-YATAK-DE',
      'jen-yatak-nde': 'JEN-YATAK-NDE',
      'sogutma-sicaklik': 'SOGUTMA-SICAKLIK',
      'sogutma-basinc': 'SOGUTMA-BASINC',
      'yag-sicaklik': 'YAG-SICAKLIK',
      'yag-basinc': 'YAG-BASINC',
      'sarj-sicaklik': 'SARJ-SICAKLIK',
      'sarj-basinc': 'SARJ-BASINC',
      'gaz-regulator': 'GAZ-REGULATOR',
      'makine-sicaklik': 'MAKINE-SICAKLIK',
      'karter-basinc': 'KARTER-BASINC',
      'on-kamara-basinc': 'ON-KAMARA-BASINC',
      'sargi-1': 'SARGI-1',
      'sargi-2': 'SARGI-2',
      'sargi-3': 'SARGI-3'
    };
    
    // Değişiklikleri takip et
    const updatedFields = [];
    const originalTimestamp = new Date().toISOString();
    
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
    sheet.getRange(rowIndex, headers.indexOf('Güncelleyen') + 1).setValue('System'); // Utils.getSession() yerine basit değer
    sheet.getRange(rowIndex, headers.indexOf('Değiştirilen Değerler') + 1).setValue(updatedFields.join(', '));
    
    return {
      success: true,
      message: 'Kojen motor kaydı başarıyla güncellendi',
      recordId: recordId,
      updatedFields: updatedFields,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('updateKojenMotorRecord hatası: ' + error.toString());
    
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Kojen motor kayıt sil
 */
function deleteKojenMotorRecord(sheet, recordId) {
  try {
    const headers = getKojenMotorHeaders(sheet);
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
        rowIndex = i + 1; // 1-based index
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
      message: 'Kojen motor kaydı başarıyla silindi',
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
 * Kojen motor sheet headers'ını getir
 */
function getKojenMotorHeaders(sheet) {
  try {
    const lastCol = sheet.getLastColumn();
    
    // Boş sheet kontrolü
    if (lastCol === 0) {
      console.log('Sheet boş, manuel başlıklar dönülüyor');
      return [
        'ID', 'Tarih', 'Vardiya', 'Saat', 'JEN-YATAK-DE', 'JEN-YATAK-NDE', 
        'SOGUTMA-SICAKLIK', 'SOGUTMA-BASINC', 'YAG-SICAKLIK', 'YAG-BASINC',
        'SARJ-SICAKLIK', 'SARJ-BASINC', 'GAZ-REGULATOR', 'MAKINE-SICAKLIK',
        'KARTER-BASINC', 'ON-KAMARA-BASINC', 'SARGI-1', 'SARGI-2', 'SARGI-3',
        'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
        'Orijinal Personel', 'Değiştirilen Değerler'
      ];
    }
    
    const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const headers = headerRow.map(header => header.toString().trim());
    
    // Başlıkların geçerli olup olmadığını kontrol et
    if (!headers || headers.length === 0 || headers[0] !== 'ID') {
      console.log('Başlıklar geçersiz, manuel başlıklar dönülüyor');
      return [
        'ID', 'Tarih', 'Vardiya', 'Saat', 'JEN-YATAK-DE', 'JEN-YATAK-NDE', 
        'SOGUTMA-SICAKLIK', 'SOGUTMA-BASINC', 'YAG-SICAKLIK', 'YAG-BASINC',
        'SARJ-SICAKLIK', 'SARJ-BASINC', 'GAZ-REGULATOR', 'MAKINE-SICAKLIK',
        'KARTER-BASINC', 'ON-KAMARA-BASINC', 'SARGI-1', 'SARGI-2', 'SARGI-3',
        'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
        'Orijinal Personel', 'Değiştirilen Değerler'
      ];
    }
    
    console.log('Geçerli başlıklar bulundu:', headers);
    return headers;
    
  } catch (error) {
    console.log('getKojenMotorHeaders hatası:', error);
    // Hata durumunda da manuel başlıklar dön
    return [
      'ID', 'Tarih', 'Vardiya', 'Saat', 'JEN-YATAK-DE', 'JEN-YATAK-NDE', 
      'SOGUTMA-SICAKLIK', 'SOGUTMA-BASINC', 'YAG-SICAKLIK', 'YAG-BASINC',
      'SARJ-SICAKLIK', 'SARJ-BASINC', 'GAZ-REGULATOR', 'MAKINE-SICAKLIK',
      'KARTER-BASINC', 'ON-KAMARA-BASINC', 'SARGI-1', 'SARGI-2', 'SARGI-3',
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
    message: 'Kojen motor Google Sheets App Script çalışıyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    module: 'kojen_motor'
  })).setMimeType(ContentService.MimeType.JSON);
}
