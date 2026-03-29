/**
 * MOTOR TAKIP - Google Apps Script Kodu
 * Base64 Fotoğraf Upload - Drive + Sheets Entegrasyonu
 * 
 * Özellikler:
 * - Base64 fotoğraf alma ve Drive'a kaydetme
 * - Motor kayıtları CRUD işlemleri
 * - Sheet'te IMAGE formülü ile fotoğraf gösterme
 */

// === AYARLAR ===
const SPREADSHEET_ID = '171Rjei5ElQ7zGr0szvS1ccWRvC2HpCdI1qs6VeW8CWE'; // Motor Takip Spreadsheet ID
const SHEET_NAME = 'MotorTakipKayitlari';
const FOLDER_NAME = 'Motor Takip Fotograflar';

// === CORS ve HTTP İşleyiciler ===
function doPost(e) {
  // e parametresi undefined ise (editörden çalıştırma)
  if (!e || !e.postData) {
    return json({ success: false, error: 'HTTP POST isteği gerekli. Lütfen Web App olarak deploy edin.' });
  }
  
  // CORS preflight kontrolü
  if (e.parameter && e.parameter.cors === 'true') {
    return json({ success: true, message: 'CORS OK' });
  }
  
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const action = data.action || 'addRecord';

    if (action === 'addRecord') {
      return addRecord(data);
    }

    if (action === 'getRecords') {
      return getRecords();
    }

    if (action === 'getLastRecords') {
      return getLastRecords(data.count || 48);
    }

    return json({ success: false, error: 'Geçersiz işlem' });
  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  // e parametresi undefined ise (editörden çalıştırma)
  if (!e || !e.parameter) {
    return json({ success: false, error: 'HTTP isteği gerekli. Lütfen Web App olarak deploy edin.' });
  }
  
  // CORS preflight kontrolü
  if (e.parameter.cors === 'true') {
    return json({ success: true, message: 'CORS OK' });
  }
  
  try {
    const action = e.parameter.action;

    if (action === 'getRecords') {
      return getRecords();
    }

    if (action === 'getLastRecords') {
      return getLastRecords(parseInt(e.parameter.count) || 48);
    }

    return json({ success: false, error: 'Geçersiz işlem' });
  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

// CORS Preflight handler
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
}

// === KAYIT EKLE (Fotoğraf + Sheet) ===
function addRecord(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Sayfa yoksa oluştur
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      const headers = [
        'ID', 'Tarih', 'Saat', 'Kontrol Yeri', 'Operatör', 'Vardiya',
        'Devir', 'Voltaj', 'Amper', 'Gövde Sıcaklığı', 'Rulman Sıcaklığı',
        'Çalışma Durumu', 'Notlar', 'Fotoğraf URL', 'Fotoğraf ID', 'Kaydeden', 'Oluşturulma Zamanı'
      ];
      
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, 17)
        .setFontWeight('bold')
        .setBackground('#4a5568')
        .setFontColor('#ffffff')
        .setHorizontalAlignment('center');
      
      // Sütun genişlikleri
      sheet.setColumnWidth(1, 50);   // ID
      sheet.setColumnWidth(2, 90);   // Tarih
      sheet.setColumnWidth(3, 70);   // Saat
      sheet.setColumnWidth(4, 120);  // Kontrol Yeri
      sheet.setColumnWidth(5, 120);  // Operatör
      sheet.setColumnWidth(6, 90);   // Vardiya
      sheet.setColumnWidth(7, 60);   // Devir
      sheet.setColumnWidth(8, 60);   // Voltaj
      sheet.setColumnWidth(9, 60);   // Amper
      sheet.setColumnWidth(10, 80);  // Gövde
      sheet.setColumnWidth(11, 80);  // Rulman
      sheet.setColumnWidth(12, 100); // Durum
      sheet.setColumnWidth(13, 150); // Notlar
      sheet.setColumnWidth(14, 200); // Foto URL
      sheet.setColumnWidth(15, 120); // Foto ID
      sheet.setColumnWidth(16, 120); // Kaydeden
      sheet.setColumnWidth(17, 140); // Zaman
    }

    // Klasör bul veya oluştur
    let folder;
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(FOLDER_NAME);
    }

    // Fotoğrafı Drive'a kaydet (base64 varsa)
    let photoUrl = '';
    let fileId = '';

    if (data.photo && data.photo.startsWith('data:image')) {
      const match = data.photo.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const base64Data = data.photo.split(',')[1];

      const bytes = Utilities.base64Decode(base64Data);
      const blob = Utilities.newBlob(bytes, mimeType, `motor_${Date.now()}.jpg`);

      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      fileId = file.getId();
      photoUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // ID oluştur
    const lastRow = sheet.getLastRow();
    const newId = lastRow > 1 ? lastRow : 1;

    // Satır verilerini hazırla
    const createdAt = formatDateTimeTR(new Date());
    const rowData = [
      newId,
      data.date || formatDateTR(new Date()),
      data.time || formatTimeTR(new Date()),
      data.kontrolYeri || data.motor || '',
      data.operator || '',
      data.shift || data.vardiya || '',
      data.devir || '',
      data.voltaj || '',
      data.amper || '',
      data.govdeSicaklik || '',
      data.rulmanSicaklik || '',
      data.calismaDurumu || '',
      data.notlar || '',
      photoUrl,
      fileId,
      data.kaydeden || 'Admin',
      createdAt
    ];

    sheet.appendRow(rowData);

    // Fotoğraf hücresine IMAGE formülü ekle
    const newRow = sheet.getLastRow();
    if (photoUrl) {
      sheet.getRange(newRow, 14).setFormula(`=IMAGE("${photoUrl}", 1)`);
    }

    // Hücre kenarlıkları
    sheet.getRange(newRow, 1, 1, 17).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);

    Logger.log(`Kayıt eklendi: ID=${newId}, Foto=${fileId ? 'Var' : 'Yok'}`);

    return json({
      success: true,
      message: 'Kayıt başarıyla eklendi',
      data: {
        id: newId,
        photoUrl: photoUrl,
        fileId: fileId,
        createdAt: createdAt,
        row: newRow
      }
    });

  } catch (err) {
    Logger.log('Hata: ' + err.toString());
    return json({ success: false, error: err.toString() });
  }
}

// === TÜM KAYITLARI GETİR ===
function getRecords() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet || sheet.getLastRow() < 2) {
      return json({ success: true, data: [] });
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 17).getDisplayValues();
    const records = values.reverse().map(row => ({
      id: row[0],
      date: row[1],
      time: row[2],
      kontrolYeri: row[3],
      operator: row[4],
      shift: row[5],
      vardiya: row[5],
      devir: row[6],
      voltaj: row[7],
      amper: row[8],
      govdeSicaklik: row[9],
      rulmanSicaklik: row[10],
      calismaDurumu: row[11],
      notlar: row[12],
      photoUrl: row[13],
      photo: row[13],
      fileId: row[14],
      kaydeden: row[15],
      createdAt: row[16]
    }));

    return json({ success: true, data: records });

  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

// === SON N KAYDI GETİR ===
function getLastRecords(count) {
  try {
    const result = getRecords();
    if (!result.success) return result;
    
    const data = JSON.parse(result.getContent());
    return json({
      success: true,
      data: data.data.slice(0, count),
      total: data.data.length
    });
  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

// === YARDIMCI FONKSİYONLAR ===
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

function formatDateTR(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTimeTR(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDateTimeTR(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}
