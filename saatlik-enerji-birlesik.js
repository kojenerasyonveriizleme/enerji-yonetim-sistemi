/**
 * SAATLIK ENERJI VERILERI ICIN GOOGLE SHEETS APP SCRIPT - BİRLEŞİK VERSİYON
 * Tam entegrasyonlu versiyon
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
    
    // Sheet isimlerini belirle
    const sheetNames = {
      saatlik: 'SaatlikEnerjiVerileri'
    };
    
    const sheetName = sheetNames[module] || 'Veriler';
    
    // ✅ Spreadsheet kontrolü - yoksa oluştur
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.create('Kojenerasyon Enerji Verileri');
    }
    
    let sheet = ss.getSheetByName(sheetName);
    
    // Sheet yoksa oluştur ve header'ları ekle
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Saatlik enerji verileri için header'ları oluştur
      if (module === 'saatlik') {
        // Manuel olarak header'ları ekle
        sheet.getRange("A1").setValue("ID");
        sheet.getRange("B1").setValue("Tarih");
        sheet.getRange("C1").setValue("Vardiya");
        sheet.getRange("D1").setValue("Saat");
        sheet.getRange("E1").setValue("Aktif Enerji (MWh)");
        sheet.getRange("F1").setValue("Reaktif Enerji (kVArh)");
        sheet.getRange("G1").setValue("Aydem Aktif");
        sheet.getRange("H1").setValue("Aydem Reaktif");
        sheet.getRange("I1").setValue("Operator");
        sheet.getRange("J1").setValue("Kayıt Zamanı");
        sheet.getRange("K1").setValue("Güncelleme Zamanı");
        sheet.getRange("L1").setValue("Güncelleyen");
        sheet.getRange("M1").setValue("Orijinal Kayıt Zamanı");
        sheet.getRange("N1").setValue("Orijinal Operator");
        sheet.getRange("O1").setValue("Değiştirilen Değerler");
        
        Logger.log('✅ Saatlik enerji sheet oluşturuldu: ' + sheetName);
      }
    }
    
    let result = {};
    
    // ✅ data alanını JSON string'den objeye çevir
    let data = payload.data || {};
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
        Logger.log('📦 data JSON parse edildi: ' + JSON.stringify(data));
      } catch (error) {
        Logger.log('❌ data JSON parse hatası: ' + error.toString());
      }
    }
    
    // Action'a göre işlem yap
    switch (action) {
      case 'get':
        result = getHourlyRecords(sheet, payload.filters || {});
        break;
        
      case 'save':
        result = saveHourlyRecord(sheet, data);
        break;
        
      case 'update':
        result = updateHourlyRecord(sheet, payload.id, data);
        break;
        
      case 'delete':
        result = deleteHourlyRecord(sheet, payload.id);
        break;
        
      case 'bulk_save':
        result = saveBulkHourlyRecords(sheet, payload);
        break;
        
      default:
        result = {
          success: false,
          error: 'Geçersiz action: ' + action
        };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Saatlik enerji hatası: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Saatlik tek kayıt kaydet
 */
function saveHourlyRecord(sheet, data) {
  try {
    Logger.log('💾 saveHourlyRecord çağrıldı, data: ' + JSON.stringify(data));
    
    // Concurrency kontrolü
    const lockKey = sheet.getName() + '_save_lock';
    const lock = CacheService.getPublicCache().get(lockKey);
    
    if (lock !== null) {
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.',
        lockActive: true
      };
    }
    
    // Kilit oluştur
    CacheService.getPublicCache().put(lockKey, 'locked', 60);
    
    // Headers'ı kontrol et
    const headers = getHourlyHeaders(sheet);
    Logger.log('📋 Mevcut headers: ' + headers.join(', '));
    
    // Yeni ID oluştur
    const newId = Date.now().toString();
    
    // ✅ VERİLERİ KONTROL ET - Boş değerleri önle
    const tarih = data.Tarih || data.date || new Date().toISOString().split('T')[0];
    const vardiya = data.Vardiya || data.shift || '';
    const saat = data.Saat || data.hour || '';
    const aktifDeger = data['Aktif Enerji (MWh)'] || data.aktif || 0;
    const reaktifDeger = data['Reaktif Enerji (kVArh)'] || data.reaktif || 0;
    const operator = data.Operator || data.operator || 'Bilinmeyen';
    
    // ✅ Vardiya ve saat boş mu kontrol et
    if (!vardiya || vardiya.trim() === '') {
      Logger.log('⚠️ Vardiya boş, hata döndürülüyor');
      CacheService.getPublicCache().remove(lockKey);
      return {
        success: false,
        error: 'Vardiya bilgisi boş olamaz'
      };
    }
    
    if (!saat || saat.trim() === '') {
      Logger.log('⚠️ Saat boş, hata döndürülüyor');
      CacheService.getPublicCache().remove(lockKey);
      return {
        success: false,
        error: 'Saat bilgisi boş olamaz'
      };
    }
    
    // Yeni satır oluştur - TÜM ALANLARI DOLDUR
    const newRow = [
      newId,                                     // ID
      tarih,                                     // Tarih
      vardiya,                                   // Vardiya - ARTIK BOŞ DEĞİL!
      saat,                                      // Saat - ARTIK BOŞ DEĞİL!
      aktifDeger,                                // Aktif Enerji (MWh)
      reaktifDeger,                              // Reaktif Enerji (kVArh)
      data.AydemAktif || data.aydemAktif || '',  // Aydem Aktif
      data.AydemReaktif || data.aydemReaktif || '', // Aydem Reaktif
      operator,                                   // Operator
      new Date().toISOString(),                   // Kayıt Zamanı
      '',                                          // Güncelleme Zamanı
      '',                                          // Güncelleyen
      new Date().toISOString(),                    // Orijinal Kayıt Zamanı
      operator,                                     // Orijinal Operator
      ''                                            // Değiştirilen Değerler
    ];
    
    Logger.log('📝 Kaydedilecek satır: ' + JSON.stringify(newRow));
    
    // Satırı ekle
    sheet.appendRow(newRow);
    
    // Kilidi serbest bırak
    CacheService.getPublicCache().remove(lockKey);
    
    Logger.log('✅ Kayıt başarıyla eklendi, ID: ' + newId + ', Vardiya: ' + vardiya + ', Saat: ' + saat);
    
    return {
      success: true,
      message: 'Saatlik enerji verisi başarıyla kaydedildi',
      id: newId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    CacheService.getPublicCache().remove(lockKey);
    Logger.log('❌ saveHourlyRecord hatası: ' + error.toString());
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Saatlik çoklu kayıt kaydet
 */
function saveBulkHourlyRecords(sheet, data) {
  try {
    const records = data.records || [];
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const result = saveHourlyRecord(sheet, record);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`${record.hour}: ${result.error}`);
      }
    }
    
    return {
      success: true,
      message: `${successCount} kayıt başarıyla kaydedildi, ${errorCount} kayıt hatalı`,
      successCount: successCount,
      errorCount: errorCount,
      errors: errors,
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
 * Saatlik kayıtları getir
 */
function getHourlyRecords(sheet, filters = {}) {
  try {
    Logger.log('🔍 getHourlyRecords çağrıldı, filters: ' + JSON.stringify(filters));
    
    const headers = getHourlyHeaders(sheet);
    Logger.log('📋 Headers: ' + headers.join(', '));
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    Logger.log('📊 Toplam satır sayısı: ' + values.length);
    
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
    
    // Filtreleme - Tarih formatını düzelt
    if (filters.date) {
      Logger.log('📅 Tarih filtresi uygulanıyor: ' + filters.date);
      const beforeCount = records.length;
      records = records.filter(record => {
        const recordDate = record['Tarih'];
        Logger.log('🔍 Kayıt tarihi: ' + recordDate + ' vs Filtre: ' + filters.date);
        // Çeşitli tarih formatlarını dene
        return recordDate === filters.date || 
               recordDate === filters.date.replace(/-/g, '.') ||
               recordDate === filters.date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1');
      });
      Logger.log('📈 Tarih filtresi sonrası: ' + beforeCount + ' -> ' + records.length);
    }
    
    if (filters.shift) {
      records = records.filter(record => {
        return record['Vardiya'] === filters.shift;
      });
    }
    
    if (filters.hour) {
      records = records.filter(record => {
        return record['Saat'] === filters.hour;
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
    
    Logger.log('📤 Toplam ' + records.length + ' kayıt döndürülüyor');
    
    return {
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log('getHourlyRecords hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Saatlik kayıt güncelle
 */
function updateHourlyRecord(sheet, recordId, data) {
  try {
    const headers = getHourlyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // ✅ Alan map'i - frontend ↔ apps script uyumlu
    const fieldMap = {
      id: 'ID',
      date: 'Tarih',
      shift: 'Vardiya',
      hour: 'Saat',
      aktif: 'Aktif Enerji (MWh)',
      reaktif: 'Reaktif Enerji (kVArh)',
      aydemAktif: 'Aydem Aktif',
      aydemReaktif: 'Aydem Reaktif',
      operator: 'Operator',
      timestamp: 'Kayıt Zamanı',
      updatedAt: 'Güncelleme Zamanı',
      editedBy: 'Güncelleyen',
      originalTimestamp: 'Orijinal Kayıt Zamanı',
      originalOperator: 'Orijinal Operator',
      changes: 'Değiştirilen Değerler'
    };
    
    // Kaydı bul - SADECE ID'ye göre bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Header satırını atla
      const rowId = String(values[i][headers.indexOf('ID')] || '');
      
      // ✅ SADECE ID'ye göre bul - date/shift/hour不重要
      if (rowId === String(recordId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // ✅ Map'li güncelle - frontend alan adları ile sheet header'ları eşleşir
    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const headerName = fieldMap[key];
        const colIndex = headers.indexOf(headerName);
        
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data[key]);
        } else {
          Logger.log(`Column not found: ${headerName} for key: ${key}`);
        }
      }
    });
    
    // Güncelleme zamanını ekle
    const updateColIndex = headers.indexOf('Güncelleme Zamanı');
    if (updateColIndex !== -1) {
      sheet.getRange(rowIndex, updateColIndex + 1).setValue(Utilities.formatDate(
        new Date(),
        'Europe/Istanbul',
        'dd.MM.yyyy HH:mm:ss'
      ));
    }
    
    return { success: true, message: 'Kayıt güncellendi' };
  } catch (error) {
    Logger.log('updateHourlyRecord hatası: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Saatlik kayıt sil
 */
function deleteHourlyRecord(sheet, recordId) {
  try {
    const headers = getHourlyHeaders(sheet);
    const idColumnIndex = headers.indexOf('ID');
    
    if (idColumnIndex === -1) {
      return { success: false, error: 'ID kolonu bulunamadı' };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idColumnIndex]) === String(recordId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // Satırı sil
    sheet.deleteRow(rowIndex);
    
    return { success: true, message: 'Kayıt silindi' };
  } catch (error) {
    Logger.log('deleteHourlyRecord hatası: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Saatlik sheet headers'ını getir
 */
function getHourlyHeaders(sheet) {
  try {
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return headerRow.map(header => header.toString().trim());
  } catch (error) {
    Logger.log('getHourlyHeaders hatası: ' + error.toString());
    return [];
  }
}

/**
 * Mevcut kaydı bul
 */
function findHourlyRecord(sheet, date, shift, hour) {
  try {
    const headers = getHourlyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    const dateIndex = headers.indexOf('Tarih');
    const shiftIndex = headers.indexOf('Vardiya');
    const hourIndex = headers.indexOf('Saat');
    const idIndex = headers.indexOf('ID');
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[dateIndex] === date && 
          row[shiftIndex] === shift && 
          row[hourIndex] === hour) {
        return {
          id: row[idIndex],
          rowIndex: i + 1
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('findHourlyRecord hatası: ' + error.toString());
    return null;
  }
}

/**
 * Test fonksiyonu
 */
function test() {
  const testEvent = {
    parameter: {
      action: 'get',
      module: 'saatlik',
      filters: JSON.stringify({
        date: '2026-03-14',
        shift: 'aksam'
      })
    }
  };
  
  return doPost(testEvent);
}
