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

/**
 * Kojen Enerji kayıt kontrolü handler
 */
function handleKojenEnerjiCheck(payload, parameters) {
  try {
    const motorId = payload.motorId || 'motor-1';
    const sheetNames = {
      'motor-1': 'GM 1 Enerji Verileri',
      'motor-2': 'GM 2 Enerji Verileri', 
      'motor-3': 'GM 3 Enerji Verileri'
    };
    
    const sheetName = sheetNames[motorId];
    if (!sheetName) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: `Geçersiz motor ID: ${motorId}`,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Spreadsheet kontrolü
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Spreadsheet bulunamadı',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: `Sheet bulunamadı: ${sheetName}`,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Kayıt kontrolü yap
    const checkResult = checkKojenEnerjiRecord(sheet, payload);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      exists: checkResult.exists,
      message: checkResult.exists ? 'Kayıt mevcut' : 'Kayıt bulunamadı',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Kojen Enerji check hatası: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

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
    
    // Check action'ı - kayıt kontrolü için
    if (action === 'check' && module === 'kojen_enerji') {
      // Doğrudan burada işle - handleKojenEnerjiCheck çağırma
      try {
        const motorId = payload.motorId || 'motor-1';
        const sheetNames = {
          'motor-1': 'GM 1 Enerji Verileri',
          'motor-2': 'GM 2 Enerji Verileri', 
          'motor-3': 'GM 3 Enerji Verileri'
        };
        
        const sheetName = sheetNames[motorId];
        if (!sheetName) {
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: `Geçersiz motor ID: ${motorId}`,
            timestamp: new Date().toISOString()
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        // Spreadsheet kontrolü
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        if (!ss) {
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: 'Spreadsheet bulunamadı',
            timestamp: new Date().toISOString()
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: `Sheet bulunamadı: ${sheetName}`,
            timestamp: new Date().toISOString()
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        // Doğrudan kayıt kontrolü yap
        const checkResult = checkKojenEnerjiRecord(sheet, payload);
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          exists: checkResult.exists,
          message: checkResult.exists ? 'Kayıt mevcut' : 'Kayıt bulunamadı',
          timestamp: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);
        
      } catch (error) {
        Logger.log('Doğrudan check hatası: ' + error.toString());
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: error.toString(),
          timestamp: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Motor ID'sini al
    const motorId = payload.motorId || 'motor-1';
    
    // Sheet isimlerini belirle - her motor için ayrı
    const sheetNames = {
      'motor-1': 'GM 1 Enerji Verileri',
      'motor-2': 'GM 2 Enerji Verileri', 
      'motor-3': 'GM 3 Enerji Verileri'
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
      ss = SpreadsheetApp.create('Kojenerasyon Kojen Enerji Verileri');
    }
    
    let sheet = ss.getSheetByName(sheetName);
    
    // Sheet yoksa oluştur
    if (!sheet) {
      sheet = createEnerjiSheet(ss, sheetName, motorId);
    }
    
    // HER DURUMDA header kontrolü yap
    if (module === 'kojen_enerji') {
      ensureEnerjiHeaders(sheet, motorId);
    }
    
    // Kayıt kontrolü yap
    const existingRecord = findExistingEnerjiRecord(sheet, payload);
    if (existingRecord) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Bu tarih, vardiya ve saat için kayıt zaten var',
        existingRow: existingRecord.row,
        motorId: motorId
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = [
      'ID', 'Tarih', 'Vardiya', 'Saat', 'L1-L2 AYDEM VOLTAJI', '(P) AKTİF GÜÇ', '(Q) REAKTİF GÜÇ', 
      'Cos φ', 'ORT.AKIM', 'ORT.GERİLİM', 'NÖTR AKIMI (LN)', 'TAHRİK GERİLİMİ (UE)',
      'TOPLAM AKTİF ENERJİ', 'ÇALIŞMA SAATİ', 'KALKIŞ SAYISI', 'Kaydeden',
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
        result = saveKojenEnerjiRecord(sheet, payload);
        break;
        
      case 'save_bulk':
        result = saveBulkKojenEnerjiRecords(sheet, payload);
        break;
        
      case 'get':
        result = getKojenEnerjiRecords(sheet, payload.filters || {});
        break;
        
      case 'check':
        result = checkKojenEnerjiRecord(sheet, payload);
        break;
        
      case 'update':
        if (!payload.id) {
          result = { success: false, error: 'Update için ID gerekli' };
        } else {
          result = updateKojenEnerjiRecord(sheet, payload.id, payload);
        }
        break;
        
      case 'delete':
        result = deleteKojenEnerjiRecord(sheet, payload.id);
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
 * Mevcut enerji kaydını ara
 */
function findExistingEnerjiRecord(sheet, data) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null; // Sadece header var
  }
  
  // ÇÖZÜM: Saati allData'dan al
  let saat = '';
  try {
    const allData = JSON.parse(data.allData || '{}');
    const hours = Object.keys(allData);
    if (hours.length > 0) {
      saat = hours[0]; // İlk saati al
    }
  } catch (e) {
    Logger.log('Saat parse hatası: ' + e.toString());
    return null;
  }
  
  // Verileri al (header hariç)
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = range.getValues();
  
  // Tarih (2. sütun), Vardiya (3. sütun), Saat (4. sütun)
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row[1] === data.Tarih && row[2] === data.vardiya && row[3] === parseInt(saat)) {
      return {
        row: i + 2, // Google Sheets 1-based index
        data: row
      };
    }
  }
  
  return null;
}

function saveMultipleHours(sheet, payload, ss) {
  try {
    // allData'yı parse et (eğer string gelmişse)
    let allData = payload.allData;
    if (typeof allData === 'string') {
      try {
        allData = JSON.parse(allData);
        Logger.log('🔄 allData JSON parse edildi');
      } catch (e) {
        Logger.log('❌ allData parse hatası: ' + e.toString());
        return { success: false, error: 'allData parse edilemedi: ' + e.toString() };
      }
    }
    
    const tarih = payload.tarih;
    const vardiya = payload.vardiya;
    
    if (!allData || typeof allData !== 'object') {
      Logger.log('❌ Geçersiz allData formatı: ' + JSON.stringify(allData));
      return { success: false, error: 'Geçersiz allData formatı' };
    }
    
    Logger.log(`📊 İşlenecek saat sayısı: ${Object.keys(allData).length}`);
    Logger.log(`📅 Tarih: ${tarih}, Vardiya: ${vardiya}`);
    Logger.log(`📝 allData: ${JSON.stringify(allData)}`);
    
    const headers = getKojenEnerjiHeaders(sheet);
    const savedHours = [];
    const errors = [];
    const newRows = [];
    
    // Her saat için ayrı satır oluştur
    for (const [hourStr, hourData] of Object.entries(allData)) {
      try {
        const hour = parseInt(hourStr);
        if (isNaN(hour)) {
          Logger.log(`⚠️ Geçersiz saat: ${hourStr}, atlanıyor`);
          continue;
        }
        
        // Boş veri kontrolü - HERHANGİ BİR veri var mı?
        const hasData = hourData && Object.values(hourData).some(v => 
          v !== undefined && v !== null && v.toString().trim() !== ''
        );
        
        if (!hasData) {
          Logger.log(`⚠️ Saat ${hour} boş, atlanıyor`);
          continue;
        }
        
        Logger.log(`🔄 Saat ${hour} verisi: ${JSON.stringify(hourData)}`);
        
        // Kayıt var mı kontrol et
        const existing = findExistingEnerjiRecord(sheet, {
          tarih: tarih,
          vardiya: vardiya,
          saat: hour
        });
        
        if (existing) {
          Logger.log(`⚠️ Saat ${hour} için kayıt zaten var, atlanıyor`);
          errors.push(`Saat ${hour}: Zaten kayıtlı`);
          continue;
        }
        
        // Yeni kayıt oluştur
        const recordData = {
          tarih: tarih,
          vardiya: vardiya,
          saat: hour,
          ...hourData
        };
        
        Logger.log(`📝 Kayıt verisi: ${JSON.stringify(recordData)}`);
        Logger.log(`🔍 recordData keys: ${Object.keys(recordData)}`);
        Logger.log(`🔍 hourData: ${JSON.stringify(hourData)}`);
        
        Logger.log(`📋 Headers: ${JSON.stringify(headers)}`);
        
        const newRow = mapDataToHeaders(recordData, headers);
        
        Logger.log(`🆕 newRow: ${JSON.stringify(newRow)}`);
        Logger.log(`🆕 newRow length: ${newRow.length}, headers length: ${headers.length}`);
        
        newRows.push(newRow);
        
        savedHours.push(hour);
        Logger.log(`✅ Saat ${hour} kaydedildi`);
        
      } catch (hourError) {
        Logger.log(`❌ Saat ${hourStr} hatası: ${hourError.toString()}`);
        errors.push(`Saat ${hourStr}: ${hourError.toString()}`);
      }
    }
    
    // Tüm satırları toplu ekle
    if (newRows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      
      Logger.log(`📤 setValues başlıyor: startRow=${startRow}, newRows.length=${newRows.length}, newRows[0].length=${newRows[0].length}`);
      Logger.log(`📤 newRows[0]: ${JSON.stringify(newRows[0])}`);
      Logger.log(`📊 Sheet adı: ${sheet.getName()}, Spreadsheet: ${ss.getName()}`);
      
      const range = sheet.getRange(startRow, 1, newRows.length, newRows[0].length);
      range.setValues(newRows);
      
      // ✅ DOĞRULAMA: Veriler gerçekten yazıldı mı?
      const writtenData = range.getValues();
      Logger.log(`✅ Doğrulama - Yazılan veri: ${JSON.stringify(writtenData)}`);
      
      // Son satırı tekrar oku
      const lastRowCheck = sheet.getLastRow();
      const lastRowData = sheet.getRange(lastRowCheck, 1, 1, sheet.getLastColumn()).getValues()[0];
      Logger.log(`🆕 Son satır (${lastRowCheck}) verisi: ${JSON.stringify(lastRowData)}`);
      
      Logger.log(`🎉 ${newRows.length} satır başarıyla eklendi!`);
    } else {
      Logger.log(`⚠️ newRows boş, hiçbir satır eklenmedi!`);
    }
    
    const result = {
      success: true,
      message: `${savedHours.length} saat başarıyla kaydedildi`,
      savedHours: savedHours,
      savedCount: savedHours.length,
      errors: errors,
      errorCount: errors.length,
      timestamp: new Date().toISOString()
    };
    
    Logger.log(`📤 saveMultipleHours sonuç: ${JSON.stringify(result)}`);
    return result;
    
  } catch (error) {
    Logger.log('❌ saveMultipleHours hatası: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.toString() };
  }
}

/**
 * Tam Otomatik Mapping (En İyi Çözüm)
 * Verileri sheet başlıklarına göre eşle
 */
function mapDataToHeaders(data, headers) {
  const row = new Array(headers.length).fill('');
  
  // Field mapping tablosu - frontend key'i -> sheet header'ı
  const fieldMapping = {
    'aydem-voltaji': ['L1-L2 AYDEM VOLTAJI'],
    'aktif-guc': ['(P) AKTİF GÜÇ'],
    'reaktif-guc': ['(Q) REAKTİF GÜÇ'],
    'cos-phi': ['Cos φ'],
    'ort-akim': ['ORT.AKIM'],
    'ort-gerilim': ['ORT.GERİLİM'],
    'notr-akim': ['NÖTR AKIMI (LN)'],
    'tahrik-gerilim': ['TAHRİK GERİLİMİ (UE)'],
    'toplam-aktif-enerji': ['TOPLAM AKTİF ENERJİ'],
    'calisma-saati': ['ÇALIŞMA SAATİ'],
    'kalkis-sayisi': ['KALKIŞ SAYISI']
  };
  
  // ID, Tarih, Vardiya, Saat özel işlem
  headers.forEach((header, index) => {
    if (header === 'ID') {
      row[index] = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    } else if (header === 'Tarih') {
      row[index] = data.tarih || '';
    } else if (header === 'Vardiya') {
      row[index] = data.vardiya || '';
    } else if (header === 'Saat') {
      row[index] = data.saat || '';
    } else if (header === 'Kayıt Zamanı') {
      row[index] = new Date().toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else if (header === 'Güncelleyen') {
      row[index] = 'System';
    } else if (header === 'Güncelleme Zamanı') {
      row[index] = '';
    } else if (header === 'Orijinal Kayıt Zamanı') {
      row[index] = '';
    } else if (header === 'Orijinal Personel') {
      row[index] = '';
    } else if (header === 'Değiştirilen Değerler') {
      row[index] = '';
    } else {
  // Diğer alanlar için mapping'den dene
      Logger.log(`🔎 Header: "${header}", index: ${index}`);
      for (const [key, possibleHeaders] of Object.entries(fieldMapping)) {
        Logger.log(`  🔍 Key: "${key}", possibleHeaders: ${JSON.stringify(possibleHeaders)}, data[key]: "${data[key]}"`);
        if (possibleHeaders.includes(header) && data[key]) {
          row[index] = data[key];
          Logger.log(`  ✅ EŞLEŞME: "${key}" -> "${header}" = "${data[key]}"`);
          break;
        }
      }
    }
  });
  
  return row;
}

/**
 * Yeni enerji sayfası oluştur
 */
function createEnerjiSheet(ss, sheetName, motorId) {
  const sheet = ss.insertSheet(sheetName);
  
  // Başlıkları oluştur - Google Sheets'teki gerçek header isimleri
  const headers = [
    'ID', 'Tarih', 'Vardiya', 'Saat', 'L1-L2 AYDEM VOLTAJI', '(P) AKTİF GÜÇ', '(Q) REAKTİF GÜÇ', 
    'Cos φ', 'ORT.AKIM', 'ORT.GERİLİM', 'NÖTR AKIMI (LN)', 'TAHRİK GERİLİMİ (UE)',
    'TOPLAM AKTİF ENERJİ', 'ÇALIŞMA SAATİ', 'KALKIŞ SAYISI', 'Kaydeden',
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
 * Enerji header kontrolü yap
 */
function ensureEnerjiHeaders(sheet, motorId) {
  const headers = [
    'ID', 'Tarih', 'Vardiya', 'Saat', 'L1-L2 AYDEM VOLTAJI', '(P) AKTİF GÜÇ', '(Q) REAKTİF GÜÇ', 
    'Cos φ', 'ORT.AKIM', 'ORT.GERİLİM', 'NÖTR AKIMI (LN)', 'TAHRİK GERİLİMİ (UE)',
    'TOPLAM AKTİF ENERJİ', 'ÇALIŞMA SAATİ', 'KALKIŞ SAYISI', 'Kaydeden',
    'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
    'Orijinal Personel', 'Değiştirilen Değerler'
  ];
  
  const lastRow = sheet.getLastRow();
  
  Logger.log('🔍 ensureEnerjiHeaders - Mevcut satır sayısı: ' + lastRow);
  
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
    
    Logger.log('✅ Yeni header\'lar eklendi: ' + JSON.stringify(headers));
  } else {
    Logger.log('Sheet dolu, header kontrolü yapılıyor...');
    
    // Mevcut header'ları kontrol et
    const firstCell = sheet.getRange(1,1).getValue();
    Logger.log('🔍 İlk hücre değeri: "' + firstCell + '"');
    
    if (firstCell !== 'ID') {
      Logger.log('❌ Header bozuk! Mevcut header: ' + firstCell + ', beklenen: ID');
      // Eski header'ları temizle
      sheet.deleteRow(1);
      Logger.log('✅ Eski header satırı silindi');
      
      // Yeni header'ları ekle
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#f0f0f0");
      sheet.setFrozenRows(1);
      
      // Kolon genişliklerini ayarla
      for (let i = 1; i <= headers.length; i++) {
        sheet.autoResizeColumn(i);
      }
      
      Logger.log('✅ Header\'lar güncellendi: ' + JSON.stringify(headers));
    } else {
      Logger.log('✅ Header\'lar zaten doğru: ' + firstCell);
    }
  }
}

/**
 * Mevcut enerji kaydını ara
 */
function findExistingEnerjiRecord(sheet, data) {
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
 * Kojen enerji tek kayıt kaydet
 */
function saveKojenEnerjiRecord(sheet, data) {
  // ÇÖZÜM: Lock key'i fonksiyon başında tanımla
  const lockKey = sheet.getName() + '_save_lock';
  
  try {
    // Çoklu API çağrısını engelle
    const globalLockKey = 'kojen_enerji_global_save_lock';
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000); // 30 saniye bekle
    } catch (e) {
      return {
        success: false,
        error: 'Kilit alınamadı, lütfen tekrar deneyin'
      };
    }
    
    const headers = getKojenEnerjiHeaders(sheet);
    
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
    
    const tarih = data.Tarih || data.tarih || '';
    const vardiya = data.vardiya || '';
    
    Logger.log('🔍 İşlenecek saat verileri: ' + JSON.stringify(allData));
    Logger.log('📅 Tarih: ' + tarih + ', Vardiya: ' + vardiya);
    
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
      
      // Veriyi hazırla - doğru alan isimleri ile
      const recordData = {
        tarih: tarih,
        vardiya: vardiya,
        saat: hour,
        'aydem-voltaji': hourData['aydem-voltaji'] || 0,
        'aktif-guc': hourData['aktif-guc'] || 0,
        'reaktif-guc': hourData['reaktif-guc'] || 0,
        'cos-fi': hourData['cos-fi'] || 0,
        'ort-akim': hourData['ort-akim'] || 0,
        'ort-gerilim': hourData['ort-gerilim'] || 0,
        'notur-akimi': hourData['notur-akimi'] || 0,
        'tahrik-gerilimi': hourData['tahrik-gerilimi'] || 0,
        'toplam-aktif-enerji': hourData['toplam-aktif-enerji'] || 0,
        'calisma-saati': hourData['calisma-saati'] || 0,
        'kalkis-sayisi': hourData['kalkis-sayisi'] || 0
      };
      
      // Çakışma kontrolü - values üzerinden yap (performanslı)
      let rowIndex = -1;
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
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
              // TÜRKÇE format: dd.MM.yyyy
              let tarihValue = recordData.tarih || '';
              if (tarihValue) {
                // Eğer ISO formatında geldiyse (yyyy-mm-dd) Türkçe format'a çevir
                if (tarihValue.includes('-')) {
                  try {
                    const parsedDate = new Date(tarihValue);
                    if (!isNaN(parsedDate.getTime())) {
                      tarihValue = Utilities.formatDate(parsedDate, 'Europe/Istanbul', 'dd.MM.yyyy');
                    }
                  } catch (e) {
                    Logger.log('Tarih formatlama hatası: ' + e.toString());
                  }
                }
              }
              value = tarihValue;
              break;
            case 'Vardiya':
              value = recordData.vardiya || '';
              break;
            case 'Saat':
              // Saat formatını 23:00:00 olarak döndür
              const hour = recordData.saat || currentHour;
              value = hour.toString() + ':00:00';
              break;
            case 'L1-L2 AYDEM VOLTAJI':
              value = recordData['aydem-voltaji'] || 0;
              break;
            case '(P) AKTİF GÜÇ':
              value = recordData['aktif-guc'] || 0;
              break;
            case '(Q) REAKTİF GÜÇ':
              value = recordData['reaktif-guc'] || 0;
              break;
            case 'Cos φ':
              value = recordData['cos-fi'] || 0;
              break;
            case 'ORT.AKIM':
              value = recordData['ort-akim'] || 0;
              break;
            case 'ORT.GERİLİM':
              value = recordData['ort-gerilim'] || 0;
              break;
            case 'NÖTR AKIMI (LN)':
              value = recordData['notur-akimi'] || 0;
              break;
            case 'TAHRİK GERİLİMİ (UE)':
              value = recordData['tahrik-gerilimi'] || 0;
              break;
            case 'TOPLAM AKTİF ENERJİ':
              value = recordData['toplam-aktif-enerji'] || 0;
              break;
            case 'ÇALIŞMA SAATİ':
              value = recordData['calisma-saati'] || 0;
              break;
            case 'KALKIŞ SAYISI':
              value = recordData['kalkis-sayisi'] || 0;
              break;
            case 'Kaydeden':
              value = data.Kaydeden || 'Bilinmeyen';
              break;
            case 'Kayıt Zamanı':
              value = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm:ss');
              break;
            case 'Güncelleme Zamanı':
              value = '';
              break;
            case 'Güncelleyen':
              value = '';
              break;
            case 'Orijinal Kayıt Zamanı':
              value = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm:ss');
              break;
            case 'Orijinal Personel':
              value = data.Kaydeden || 'Bilinmeyen';
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
    
    Logger.log('saveKojenEnerjiRecord hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kojen enerji çoklu kayıt kaydet
 */
function saveBulkKojenEnerjiRecords(sheet, data) {
  try {
    const records = data.records || [];
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    // ✅ ÇÖZÜM: Global lock'i sadece bulk işlem başında al
    const globalLockKey = 'kojen_enerji_global_save_lock';
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
      const recordLockKey = `kojen_enerji_record_${record.id}_${Date.now()}`;
      const recordLock = CacheService.getPublicCache().get(recordLockKey);
      
      if (recordLock !== null) {
        errorCount++;
        errors.push(`${record.tarih}: Kayıt kilitli`);
        continue;
      }
      
      // Kayıt kilidi oluştur
      CacheService.getPublicCache().put(recordLockKey, 'locked', 30);
      
      const result = saveKojenEnerjiRecord(sheet, record);
      
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
function getKojenEnerjiRecords(sheet, filters = {}) {
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
    
    const headers = getKojenEnerjiHeaders(sheet);
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
          // Tarih ve saat formatlama - TÜRKÇE format
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
              'dd.MM.yyyy'
            );
          } else if (header === 'Saat') {
            // Saat formatını sadece saat olarak döndür (örn: 6 veya 8)
            const hour = cellValue.getHours();
            cellValue = hour.toString();
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
    
    // Filtreleme - TÜRKÇE tarih formatı
    if (filters.tarih) {
      records = records.filter(record => {
        const recordDate = record['Tarih'] ? record['Tarih'].toString() : '';
        // Filter tarihini de dd.MM.yyyy formatına çevir
        let filterDate = filters.tarih.toString();
        if (filters.tarih instanceof Date) {
          filterDate = Utilities.formatDate(filters.tarih, 'Europe/Istanbul', 'dd.MM.yyyy');
        } else {
          // String formatını normalize et - TÜRKÇE format
          filterDate = filters.tarih.toString()
            .replace(/\//g, '.')
            .replace(/-/g, '.')
            .trim();
          
          try {
            const parsedDate = new Date(filterDate);
            if (!isNaN(parsedDate.getTime())) {
              filterDate = Utilities.formatDate(parsedDate, 'Europe/Istanbul', 'dd.MM.yyyy');
            }
          } catch (e) {
            // Formatlama hatası olursa orijinal string kullan
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
    Logger.log('getKojenEnerjiRecords hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Saat normalize et - farklı formatları tek standarda çevir
 */
function normalizeHour(hourValue) {
  if (!hourValue) return null;

  // String ise temizle
  let str = hourValue.toString().trim();

  // Eğer "00:00:00" veya "0:00:00" formatında ise
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseInt(parts[0], 10);
    return isNaN(h) ? null : h;
  }

  // Eğer sadece sayı ise
  const h = parseInt(str, 10);
  return isNaN(h) ? null : h;
}

/**
 * Kojen enerji kayıt kontrolü
 */
function checkKojenEnerjiRecord(sheet, data) {
  try {
    const tarih = data.Tarih;
    const vardiya = data.vardiya;
    const motor = data.motor;
    
    // ✅ ÇÖZÜM: Saati allData'dan al
    let saat = '';
    try {
      const allData = JSON.parse(data.allData || '{}');
      const hours = Object.keys(allData);
      Logger.log('🔍 allData içeriği: ' + JSON.stringify(allData));
      Logger.log('🔍 Bulunan saatler: ' + JSON.stringify(hours));
      
      if (hours.length > 0) {
        saat = hours[0]; // İlk saati al
        Logger.log('🔍 Kontrol edilecek saat: ' + saat);
      }
    } catch (e) {
      Logger.log('Saat parse hatası: ' + e.toString());
    }
    
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
    
    // Tarih formatını normalize et - TÜRKÇE format: dd.MM.yyyy
    let normalizedTargetDate = tarih.toString();
    if (tarih instanceof Date) {
      normalizedTargetDate = Utilities.formatDate(tarih, 'Europe/Istanbul', 'dd.MM.yyyy');
    } else {
      // String formatını normalize et - TÜRKÇE format
      normalizedTargetDate = tarih.toString()
        .replace(/\//g, '.')
        .replace(/-/g, '.')
        .trim();
      
      // Eğer format farklıysa tekrar formatla
      try {
        const parsedDate = new Date(normalizedTargetDate);
        if (!isNaN(parsedDate.getTime())) {
          normalizedTargetDate = Utilities.formatDate(parsedDate, 'Europe/Istanbul', 'dd.MM.yyyy');
        }
      } catch (e) {
        Logger.log('Tarih formatlama hatası, orijinal kullanılıyor: ' + e.toString());
      }
    }
    
    // ✅ ÇÖZÜM: Saati normalize et
    let normalizedSaat = normalizeHour(saat);
    Logger.log(`🔍 Normalize edilmiş saat: "${saat}" → ${normalizedSaat}`);
    
    // Vardiya tipini tam metin formatına çevir (TÜRKÇE)
    const vardiyaTipMap = {
      'GECE': 'Gece Vardiyası',
      'GÜNDÜZ': 'Gündüz Vardiyası',
      'AKŞAM': 'Akşam Vardiyası',
      'gece': 'Gece Vardiyası',
      'gunduz': 'Gündüz Vardiyası',
      'aksam': 'Akşam Vardiyası'
    };
    const normalizedVardiyaTipi = vardiyaTipMap[vardiya] || vardiya;
    
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
    
    Logger.log('🔍 Binary search başlangıç:', {
      'totalRows': values.length,
      'low': low,
      'high': high,
      'targetDate': normalizedTargetDate,
      'targetVardiya': normalizedVardiyaTipi,
      'targetSaat': normalizedSaat
    });
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midDate = values[mid][headers.indexOf('Tarih')];
      const midVardiya = values[mid][headers.indexOf('Vardiya')];
      const midSaat = values[mid][headers.indexOf('Saat')];
      
      Logger.log(`🔍 Binary search step ${mid}:`, {
        'midDate': midDate,
        'midVardiya': midVardiya,
        'midSaat': midSaat
      });
      
      // Tarih karşılaştırması - normalize edilmiş tarihlerle
      let normalizedMidDate = '';
      if (midDate instanceof Date) {
        normalizedMidDate = Utilities.formatDate(midDate, 'Europe/Istanbul', 'dd.MM.yyyy');
      } else {
        normalizedMidDate = midDate.toString();
      }
      
      // Saat normalizasyonu
      let normalizedMidSaat = '';
      if (midSaat) {
        const normalizedHour = normalizeHour(midSaat);
        normalizedMidSaat = normalizedHour !== null ? normalizedHour.toString() : '';
      }
      
      Logger.log(`🔍 Karşılaştırma:`, {
        'normalizedMidDate': normalizedMidDate,
        'normalizedTargetDate': normalizedTargetDate,
        'midVardiya': midVardiya,
        'normalizedVardiyaTipi': normalizedVardiyaTipi,
        'midSaat': midSaat,
        'normalizedMidSaat': normalizedMidSaat,
        'parseInt(normalizedSaat)': parseInt(normalizedMidSaat)
      });
      
      if (normalizedMidDate === normalizedTargetDate && 
          midVardiya === normalizedVardiyaTipi && 
          normalizedMidSaat === normalizedSaat) {
        Logger.log('✅ Kayıt bulundu!');
        return {
          success: true,
          exists: true,
          record: {
            row: mid + 1,
            data: values[mid]
          }
        };
      }
      
      if (normalizedMidDate < normalizedTargetDate) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    Logger.log('❌ Kayıt bulunamadı - binary search tamamlandı');
    
    return {
      success: true,
      exists: false,
      message: 'Kayıt bulunamadı'
    };
    
  } catch (error) {
    Logger.log('checkKojenEnerjiRecord hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Kojen enerji kayıt güncelle
 */
function updateKojenEnerjiRecord(sheet, recordId, data) {
  try {
    const headers = getKojenEnerjiHeaders(sheet);
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
      'aydem-voltaji': 'L1-L2 AYDEM VOLTAJI',
      'aktif-guc': '(P) AKTİF GÜÇ',
      'reaktif-guc': '(Q) REAKTİF GÜÇ',
      'cos-phi': 'Cos φ',
      'ort-akim': 'ORT.AKIM',
      'ort-gerilim': 'ORT.GERİLİM',
      'notr-akim': 'NÖTR AKIMI (LN)',
      'tahrik-gerilim': 'TAHRİK GERİLİMİ (UE)',
      'toplam-aktif-enerji': 'TOPLAM AKTİF ENERJİ',
      'calisma-saati': 'ÇALIŞMA SAATİ',
      'kalkis-sayisi': 'KALKIŞ SAYISI'
    };
    
    // Değişiklikleri takip et
    const updatedFields = [];
    const originalTimestamp = new Date().toISOString();
    
    // Map'li güncelleme
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
      message: 'Kojen enerji kaydı başarıyla güncellendi',
      recordId: recordId,
      updatedFields: updatedFields,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('updateKojenEnerjiRecord hatası: ' + error.toString());
    
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
function deleteKojenEnerjiRecord(sheet, recordId) {
  try {
    const headers = getKojenEnerjiHeaders(sheet);
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
function getKojenEnerjiHeaders(sheet) {
  try {
    const lastCol = sheet.getLastColumn();
    
    // Boş sheet kontrolü
    if (lastCol === 0) {
      console.log('Sheet boş, manuel başlıklar dönülüyor');
      return [
        'ID', 'Tarih', 'Vardiya', 'Saat', 'L1-L2 AYDEM VOLTAJI', '(P) AKTİF GÜÇ', '(Q) REAKTİF GÜÇ', 
        'Cos φ', 'ORT.AKIM', 'ORT.GERİLİM', 'NÖTR AKIMI (LN)', 'TAHRİK GERİLİMİ (UE)',
        'TOPLAM AKTİF ENERJİ', 'ÇALIŞMA SAATİ', 'KALKIŞ SAYISI', 'Kaydeden',
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
        'ID', 'Tarih', 'Vardiya', 'Saat', 'L1-L2 AYDEM VOLTAJI', '(P) AKTİF GÜÇ', '(Q) REAKTİF GÜÇ', 
        'Cos φ', 'ORT.AKIM', 'ORT.GERİLİM', 'NÖTR AKIMI (LN)', 'TAHRİK GERİLİMİ (UE)',
        'TOPLAM AKTİF ENERJİ', 'ÇALIŞMA SAATİ', 'KALKIŞ SAYISI', 'Kaydeden',
        'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı',
        'Orijinal Personel', 'Değiştirilen Değerler'
      ];
    }
    
    console.log('Geçerli başlıklar bulundu:', headers);
    return headers;
    
  } catch (error) {
    console.log('getKojenEnerjiHeaders hatası:', error);
    // Hata durumunda da manuel başlıklar dön
    return [
      'ID', 'Tarih', 'Vardiya', 'Saat', 'L1-L2 AYDEM VOLTAJI', '(P) AKTİF GÜÇ', '(Q) REAKTİF GÜÇ', 
      'Cos φ', 'ORT.AKIM', 'ORT.GERİLİM', 'NÖTR AKIMI (LN)', 'TAHRİK GERİLİMİ (UE)',
      'TOPLAM AKTİF ENERJİ', 'ÇALIŞMA SAATİ', 'KALKIŞ SAYISI', 'Kaydeden',
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
