/**
 * ============================================
 * GÜNLÜK ENERJI APP SCRIPT - Modernize Edilmiş
 * Google Sheets Entegrasyonu
 * ============================================
 * 
 * Özellikler:
 * - Günlük enerji verisi kaydetme/güncelleme
 * - Tarih bazlı kayıt kontrolü (upsert)
 * - Değişiklik takibi (audit log)
 * - RESTful API endpoint'leri
 */

// ============================================
// KONFIGÜRASYON
// ============================================
const CONFIG = {
  SHEET_NAME: "Günlük Enerji",
  HEADER_ROW: [
    "Tarih", "Yağ Seviyesi (L)", "Kuplaj (MW)", "GM-1 (MW)", "GM-2 (MW)", "GM-3 (MW)",
    "İç İhtiyaç (MW)", "1. Redresör (MW)", "2. Redresör (MW)", "Kojen İç İhtiyaç (kW)",
    "Servis Trafosu (MW)", "Kayıt Zamanı", "Kaydeden", "Düzenleyen", "Düzenleme Zamanı", "Düzenlenmiş Değer"
  ],
  FIELD_MAPPINGS: [
    { key: 'yagSeviyesi', index: 1, name: 'Yağ Seviyesi' },
    { key: 'kuplaj', index: 2, name: 'Kuplaj' },
    { key: 'gm1', index: 3, name: 'GM-1' },
    { key: 'gm2', index: 4, name: 'GM-2' },
    { key: 'gm3', index: 5, name: 'GM-3' },
    { key: 'icIhtiyac', index: 6, name: 'İç İhtiyaç' },
    { key: 'redresor1', index: 7, name: '1. Redresör' },
    { key: 'redresor2', index: 8, name: '2. Redresör' },
    { key: 'kojenIcIhtiyac', index: 9, name: 'Kojen İç İhtiyaç' },
    { key: 'servisTrafo', index: 10, name: 'Servis Trafosu' }
  ],
  DEBUG_MODE: true
};

// ============================================
// YARDIMCI FONKSIYONLAR
// ============================================

/**
 * Debug logging
 */
function debugLog(label, data) {
  if (!CONFIG.DEBUG_MODE) return;
  const timestamp = new Date().toISOString();
  const message = typeof data === 'object' ? JSON.stringify(data) : data;
  Logger.log('[' + timestamp + '] ' + label + ': ' + message);
}

/**
 * HTTP Yanıtı oluşturucu
 */
function createResponse(success, message, data, statusCode) {
  statusCode = statusCode || 200;
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString(),
    statusCode: statusCode
  };
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sheet'i al veya oluştur
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    debugLog('Yeni sheet oluşturuluyor', CONFIG.SHEET_NAME);
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    
    const headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADER_ROW.length);
    headerRange.setValues([CONFIG.HEADER_ROW]);
    headerRange.setFontWeight('bold')
               .setBackground('#4285f4')
               .setFontColor('white');
    
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(12, 180);
    sheet.setColumnWidth(15, 180);
    sheet.setColumnWidth(16, 300);
  }
  
  return sheet;
}

/**
 * Tarih formatını normalize et
 */
function normalizeDate(dateInput) {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
  
  const str = dateInput.toString();
  if (str.indexOf('T') !== -1) {
    return str.split('T')[0];
  }
  return str;
}

/**
 * Tarihe göre kayıt bul
 */
function findRecordByDate(sheet, targetDate) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  
  const headers = data[0];
  const dateIndex = headers.indexOf('Tarih');
  if (dateIndex === -1) return null;
  
  const normalizedTarget = normalizeDate(targetDate);
  
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][dateIndex];
    if (!rowDate) continue;
    
    const normalizedRow = normalizeDate(rowDate);
    if (normalizedRow === normalizedTarget) {
      return {
        rowIndex: i + 1,
        data: data[i],
        rawDate: rowDate
      };
    }
  }
  return null;
}

/**
 * Değişen alanları tespit et
 */
function detectChanges(currentData, newParams) {
  const changes = [];
  
  for (let i = 0; i < CONFIG.FIELD_MAPPINGS.length; i++) {
    const field = CONFIG.FIELD_MAPPINGS[i];
    const newValue = newParams[field.key] || '0';
    const oldValue = currentData[field.index] || '0';
    
    if (newValue.toString() !== oldValue.toString()) {
      changes.push(field.name + ': ' + oldValue + ' → ' + newValue);
    }
  }
  return changes;
}

/**
 * Tarih ve saati Türkçe formatına çevirir (DD.MM.YYYY HH:mm:ss)
 */
function formatDateTimeTurkish(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes + ':' + seconds;
}

/**
 * Tarihi Türkçe formatına çevirir (DD.MM.YYYY)
 */
function formatDateTurkish(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return day + '.' + month + '.' + year;
}

// ============================================
// ANA API ENDPOINT'LERI
// ============================================

function doGet(e) {
  return HtmlService.createHtmlOutput('<h2>Günlük Enerji API</h2><p>POST istekleri kabul eder.</p>');
}

function doPost(e) {
  try {
    const action = e.parameter.action || 'save';
    const module = e.parameter.module || 'daily-energy';
    
    debugLog('Gelen istek', { action: action, module: module });
    
    if (module !== 'daily-energy') {
      return createResponse(false, 'Desteklenmeyen modül: ' + module, null, 400);
    }
    
    const params = e.parameter;
    
    switch (action) {
      case 'save':
      case 'upsert':
        return saveDailyEnergyData(params);
      case 'get':
        return getDailyEnergyData(params);
      case 'list':
        return listDailyEnergyData(params);
      case 'update':
        return updateDailyEnergyData(params);
      case 'delete':
        return deleteDailyEnergyData(params);
      default:
        return createResponse(false, 'Desteklenmeyen işlem: ' + action, null, 400);
    }
  } catch (error) {
    debugLog('Hata', error.toString());
    return createResponse(false, 'Sunucu hatası: ' + error.message, null, 500);
  }
}

// ============================================
// CRUD İŞLEMLERİ
// ============================================

/**
 * Kaydet veya güncelle (Upsert)
 */
function saveDailyEnergyData(params) {
  try {
    debugLog('Kaydetme başlatıldı', params);
    
    if (!params.date) {
      return createResponse(false, 'Tarih parametresi zorunlu', null, 400);
    }
    
    const sheet = getOrCreateSheet();
    const existing = findRecordByDate(sheet, params.date);
    
    const sheetDate = new Date(params.date);
    const now = new Date();
    
    // Türkçe formatlı zaman damgası
    const timestamp = formatDateTimeTurkish(now);
    const kaydeden = params.kaydeden || 'Bilinmeyen';
    
    // Temel veri satırı
    const rowData = [
      sheetDate,
      params.yagSeviyesi || '0',
      params.kuplaj || '0',
      params.gm1 || '0',
      params.gm2 || '0',
      params.gm3 || '0',
      params.icIhtiyac || '0',
      params.redresor1 || '0',
      params.redresor2 || '0',
      params.kojenIcIhtiyac || '0',
      params.servisTrafo || '0',
      timestamp,
      kaydeden
    ];
    
    if (existing) {
      // Güncelle
      const changes = detectChanges(existing.data, params);
      
      rowData.push(kaydeden, timestamp, changes.join(', ') || 'Değişiklik yok');
      sheet.getRange(existing.rowIndex, 1, 1, rowData.length).setValues([rowData]);
      
      debugLog('Güncelleme tamamlandı', { row: existing.rowIndex, changes: changes.length });
      
      return createResponse(true, 'Kayıt güncellendi', {
        action: 'updated',
        row: existing.rowIndex,
        date: params.date,
        changes: changes
      });
    }
    
    // Yeni kayıt
    const lastRow = sheet.getLastRow();
    const newRowData = rowData.concat(['', '', '']);
    
    sheet.getRange(lastRow + 1, 1, 1, newRowData.length).setValues([newRowData]);
    
    debugLog('Yeni kayıt eklendi', { row: lastRow + 1 });
    
    return createResponse(true, 'Veri kaydedildi', {
      action: 'created',
      row: lastRow + 1,
      date: params.date
    });
    
  } catch (error) {
    debugLog('Kaydetme hatası', error.toString());
    return createResponse(false, 'Kaydetme hatası: ' + error.message, null, 500);
  }
}

/**
 * Belirli tarihteki veriyi getir
 */
function getDailyEnergyData(params) {
  try {
    if (!params.date) {
      return createResponse(false, 'Tarih parametresi gerekli', null, 400);
    }
    
    const sheet = getOrCreateSheet();
    const existing = findRecordByDate(sheet, params.date);
    
    if (!existing) {
      return createResponse(false, 'Kayıt bulunamadı: ' + params.date, null, 404);
    }
    
    const headers = CONFIG.HEADER_ROW;
    const rowData = existing.data;
    const result = {};
    
    for (let i = 0; i < headers.length; i++) {
      result[headers[i]] = rowData[i];
    }
    
    return createResponse(true, 'Kayıt bulundu', result);
    
  } catch (error) {
    debugLog('Getirme hatası', error.toString());
    return createResponse(false, 'Veri getirme hatası: ' + error.message, null, 500);
  }
}

/**
 * Tüm kayıtları listele
 */
function listDailyEnergyData(params) {
  try {
    const limit = parseInt(params.limit) || 100;
    const offset = parseInt(params.offset) || 0;
    
    debugLog('Listeleme başlatıldı', {limit, offset});
    
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    if (data.length < 2) {
      return createResponse(true, 'Henüz kayıt yok', { data: [], count: 0, total: 0 });
    }
    
    const results = [];
    
    // Tüm verileri işle (tarihe göre sıralamak için)
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      results.push(row);
    }
    
    debugLog('İşlenmiş kayıtlar (sıralama öncesi)', results.length);
    
    // Tarihe göre ters sırala (en yeni üstte)
    results.sort((a, b) => {
      const dateA = a['Tarih'];
      const dateB = b['Tarih'];
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      // Date objesi ise
      if (dateA instanceof Date && dateB instanceof Date) {
        return dateB.getTime() - dateA.getTime();
      }
      
      // String ise
      const dateAObj = new Date(dateA);
      const dateBObj = new Date(dateB);
      
      if (isNaN(dateAObj.getTime()) && isNaN(dateBObj.getTime())) return 0;
      if (isNaN(dateAObj.getTime())) return 1;
      if (isNaN(dateBObj.getTime())) return -1;
      
      return dateBObj.getTime() - dateAObj.getTime();
    });
    
    debugLog('Sıralanmış kayıtlar (ilk 3)', results.slice(0, 3));
    
    // Sayfalama için dilimle
    const paginatedResults = results.slice(offset, offset + limit);
    
    debugLog('Dilimlenmiş sonuçlar', paginatedResults.length);
    
    return createResponse(true, paginatedResults.length + ' kayıt listelendi', {
      data: paginatedResults,
      count: paginatedResults.length,
      total: results.length,
      offset: offset,
      limit: limit
    });
    
  } catch (error) {
    debugLog('Listeleme hatası', error.toString());
    return createResponse(false, 'Listeleme hatası: ' + error.message, null, 500);
  }
}

/**
 * Kayıt güncelle (manuel)
 */
function updateDailyEnergyData(params) {
  try {
    if (!params.date || !params.editor) {
      return createResponse(false, 'Tarih ve editor parametreleri zorunlu', null, 400);
    }
    
    const sheet = getOrCreateSheet();
    const existing = findRecordByDate(sheet, params.date);
    
    if (!existing) {
      return createResponse(false, 'Güncellenecek kayıt bulunamadı', null, 404);
    }
    
    const oldValues = JSON.parse(params.oldValues || '{}');
    const newValues = JSON.parse(params.newValues || '{}');
    const changes = [];
    
    for (let key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changes.push(key + ': ' + oldValues[key] + ' → ' + newValues[key]);
      }
    }
    
    const row = existing.data;
    row[13] = params.editor;
    row[14] = formatDateTimeTurkish(new Date()); // Türkçe format
    row[15] = changes.join(', ');
    
    sheet.getRange(existing.rowIndex, 1, 1, row.length).setValues([row]);
    
    return createResponse(true, 'Kayıt güncellendi', {
      row: existing.rowIndex,
      changes: changes
    });
    
  } catch (error) {
    debugLog('Güncelleme hatası', error.toString());
    return createResponse(false, 'Güncelleme hatası: ' + error.message, null, 500);
  }
}

/**
 * Kayıt sil
 */
function deleteDailyEnergyData(params) {
  try {
    if (!params.date) {
      return createResponse(false, 'Tarih parametresi zorunlu', null, 400);
    }
    
    const sheet = getOrCreateSheet();
    const existing = findRecordByDate(sheet, params.date);
    
    if (!existing) {
      return createResponse(false, 'Silinecek kayıt bulunamadı', null, 404);
    }
    
    sheet.deleteRow(existing.rowIndex);
    
    return createResponse(true, 'Kayıt silindi', { date: params.date, row: existing.rowIndex });
    
  } catch (error) {
    debugLog('Silme hatası', error.toString());
    return createResponse(false, 'Silme hatası: ' + error.message, null, 500);
  }
}

// ============================================
// TEST FONKSIYONLARI
// ============================================

function testDailyEnergyAPI() {
  const testData = {
    action: 'save',
    module: 'daily-energy',
    date: '2026-03-15',
    yagSeviyesi: '85.5',
    kuplaj: '2.5',
    gm1: '3.2',
    gm2: '3.1',
    gm3: '3.0',
    icIhtiyac: '0.8',
    redresor1: '1.2',
    redresor2: '1.1',
    kojenIcIhtiyac: '150',
    servisTrafo: '0.5',
    kaydeden: 'Test'
  };
  return saveDailyEnergyData(testData);
}

function resetDailyEnergySheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (sheet) {
      ss.deleteSheet(sheet);
    }
    
    getOrCreateSheet();
    return createResponse(true, 'Sheet sıfırlandı');
    
  } catch (error) {
    return createResponse(false, 'Sıfırlama hatası: ' + error.message);
  }
}
