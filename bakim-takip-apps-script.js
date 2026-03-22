function doPost(e) {
try {
const params = e.parameter;
const action = params.action;
const module = params.module || 'bakim';

const sheetNames = {
periodik: 'PeriyodikBakim',
normal: 'NormalBakim',
ariza: 'ArizaBakim'
};

const sheetName = sheetNames[module];
if (!sheetName) {
    return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Gecersiz modul: ' + module
    })).setMimeType(ContentService.MimeType.JSON);
}
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName(sheetName);

if (!sheet) {
sheet = ss.insertSheet(sheetName);
createMaintenanceHeaders(sheet, module);
}

let result;
switch (action) {
case 'save': result = saveMaintenanceRecord(sheet, params); break;
case 'update': result = updateMaintenanceRecord(sheet, params.id, params); break;
case 'delete': result = deleteMaintenanceRecord(sheet, params.id); break;
case 'get': result = listMaintenanceRecords(sheet, params); break;
case 'get_stats': result = getMaintenanceStats(sheet); break;
default: result = { success: false, error: 'Gecersiz islem: ' + action };
}

return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
} catch (error) {
Logger.log('doPost hatasi: ' + error.toString());
return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
}
}

function doGet(e) { return doPost(e); }

function createMaintenanceHeaders(sheet, module) {
if (module === 'periodik') {
const headers = ['ID', 'Ekipman', 'Planlanan Tarih', 'Baslangic Tarihi', 'Bitis Tarihi', 'Baslangic Saati', 'Bitis Saati', 'Durum', 'Bakim Saati', 'Aciklama', 'Islemler', 'Sorumlu Personel', 'Maliyet', 'Sonraki Bakim Tarihi', 'Kaydeden', 'Kayit Zamani', 'Guncelleme Zamani'];
headers.forEach((h, i) => sheet.getRange(1, i + 1).setValue(h));
sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
} else if (module === 'normal') {
const headers = ['ID', 'Ekipman', 'Talep Tarihi', 'Baslangic Tarihi', 'Bitis Tarihi', 'Baslangic Saati', 'Bitis Saati', 'Durum', 'Bakim Tipi', 'Aciklama', 'Yapilan Islemler', 'Sorumlu Personel', 'Maliyet', 'Parca Listesi', 'Sise Barkod No', 'Su Miktari', 'On Rulman CM3', 'Arka Rulman CM3', 'HT Sicakligi', 'LT Sicakligi', 'Ceket Suyu Sicakligi', 'Antifriz Sicakligi', 'Kaydeden', 'Kayit Zamani', 'Guncelleme Zamani'];
headers.forEach((h, i) => sheet.getRange(1, i + 1).setValue(h));
sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
} else if (module === 'ariza') {
const headers = ['ID', 'Ekipman', 'Ariza Tarihi', 'Baslangic Tarihi', 'Bitis Tarihi', 'Baslangic Saati', 'Bitis Saati', 'Durum', 'Oncelik', 'Ariza Aciklamasi', 'Cozum Aciklamasi', 'Sorumlu Personel', 'Maliyet', 'Ariza Nedeni', 'Onleyici Onlemler', 'Kaydeden', 'Kayit Zamani', 'Guncelleme Zamani'];
headers.forEach((h, i) => sheet.getRange(1, i + 1).setValue(h));
sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}
for (let i = 1; i <= 24; i++) sheet.autoResizeColumn(i);
}

function saveMaintenanceRecord(sheet, data) {
try {
const headers = getMaintenanceHeaders(sheet);
const newRow = [];
headers.forEach(header => {
let value = '';
switch(header) {
case 'ID': value = data.id || Date.now().toString(); break;
case 'Ekipman': value = data.ekipman || ''; break;
case 'Planlanan Tarih': value = data.planlananTarih || ''; break;
case 'Talep Tarihi': value = data.talepTarihi || data.planlananTarih || ''; break;
case 'Ariza Tarihi': value = data.arizaTarihi || data.planlananTarih || ''; break;
case 'Baslangic Tarihi': value = data.baslangicTarihi || ''; break;
case 'Bitis Tarihi': value = data.bitisTarihi || ''; break;
case 'Baslangic Saati': value = data.baslangicSaati || ''; break;
case 'Bitis Saati': value = data.bitisSaati || ''; break;
case 'Durum': value = data.durum || 'planlandi'; break;
case 'Oncelik': case 'Bakim Tipi': case 'Bakim Saati': value = data.oncelik || ''; break;
case 'Aciklama': value = data.aciklama || ''; break;
case 'Ariza Aciklamasi': value = data.arizaAciklamasi || ''; break;
case 'Islemler': case 'Yapilan Islemler': value = data.islemler || data.yapilanIslemler || ''; break;
case 'Cozum Aciklamasi': value = data.cozumAciklamasi || ''; break;
case 'Sorumlu Personel': value = data.sorumluPersonel || data.sorumlu || data.personel || ''; break;
case 'Maliyet': value = data.maliyet || ''; break;
case 'Parca Listesi': value = data.parcaListesi || ''; break;
case 'Ariza Nedeni': value = data.arizaNedeni || ''; break;
case 'Onleyici Onlemler': value = data.onleyiciOnlemler || ''; break;
case 'Sonraki Bakim Tarihi': value = data.sonrakiBakimTarihi || ''; break;
case 'Sise Barkod No': value = data.siseBarkodNo || ''; break;
case 'Su Miktari': value = data.suMiktari || ''; break;
case 'On Rulman CM3': value = data.onRulmanCm3 || ''; break;
case 'Arka Rulman CM3': value = data.arkaRulmanCm3 || ''; break;
case 'HT Sicakligi': value = data.htSicaklik || ''; break;
case 'LT Sicakligi': value = data.ltSicaklik || ''; break;
case 'Ceket Suyu Sicakligi': value = data.ceketSuyuSicaklik || ''; break;
case 'Antifriz Sicakligi': value = data.antifrizSicaklik || ''; break;
case 'Kaydeden': value = data.recordedBy || data.kaydeden || 'admin'; break;
case 'Kayit Zamani': value = data.timestamp || new Date().toLocaleString('tr-TR'); break;
case 'Guncelleme Zamani': value = data.guncellemeTarihi || ''; break;
}
newRow.push(value);
});
sheet.appendRow(newRow);
return { success: true, message: 'Kayit basariyla eklendi', recordId: newRow[0], timestamp: new Date().toISOString() };
} catch (error) {
Logger.log('Kaydetme hatasi: ' + error.toString());
return { success: false, error: error.toString() };
}
}

function updateMaintenanceRecord(sheet, recordId, data) {
try {
const headers = getMaintenanceHeaders(sheet);
const dataRange = sheet.getDataRange();
const values = dataRange.getValues();
let recordIndex = -1;
for (let i = 1; i < values.length; i++) {
if (values[i][0] == recordId) { recordIndex = i; break; }
}
if (recordIndex === -1) return { success: false, error: 'Kayit bulunamadi: ' + recordId };

const updatedRow = [];
headers.forEach(header => {
let value = values[recordIndex][headers.indexOf(header)];
switch(header) {
case 'Bitis Tarihi': if (data.bitisTarihi) value = data.bitisTarihi; break;
case 'Bitis Saati': if (data.bitisSaati) value = data.bitisSaati; break;
case 'Durum': if (data.durum) value = data.durum; break;
case 'Aciklama': case 'Ariza Aciklamasi': if (data.aciklama) value = data.aciklama; break;
case 'Sorumlu Personel': if (data.sorumluPersonel) value = data.sorumluPersonel; break;
case 'Maliyet': if (data.maliyet) value = data.maliyet; break;
case 'Sise Barkod No': if (data.siseBarkodNo) value = data.siseBarkodNo; break;
case 'Su Miktari': if (data.suMiktari) value = data.suMiktari; break;
case 'On Rulman CM3': if (data.onRulmanCm3) value = data.onRulmanCm3; break;
case 'Arka Rulman CM3': if (data.arkaRulmanCm3) value = data.arkaRulmanCm3; break;
case 'HT Sicakligi': if (data.htSicaklik) value = data.htSicaklik; break;
case 'LT Sicakligi': if (data.ltSicaklik) value = data.ltSicaklik; break;
case 'Ceket Suyu Sicakligi': if (data.ceketSuyuSicaklik) value = data.ceketSuyuSicaklik; break;
case 'Antifriz Sicakligi': if (data.antifrizSicaklik) value = data.antifrizSicaklik; break;
case 'Guncelleme Zamani': value = data.guncellemeTarihi || new Date().toLocaleString('tr-TR'); break;
}
updatedRow.push(value);
});
sheet.getRange(recordIndex + 1, 1, 1, headers.length).setValues([updatedRow]);
return { success: true, message: 'Kayit basariyla guncellendi', recordId: recordId, timestamp: new Date().toISOString() };
} catch (error) {
Logger.log('Guncelleme hatasi: ' + error.toString());
return { success: false, error: error.toString() };
}
}

function deleteMaintenanceRecord(sheet, recordId) {
try {
const dataRange = sheet.getDataRange();
const values = dataRange.getValues();
for (let i = 1; i < values.length; i++) {
if (values[i][0] == recordId) {
sheet.deleteRow(i + 1);
return { success: true, message: 'Kayit basariyla silindi', recordId: recordId };
}
}
return { success: false, error: 'Kayit bulunamadi: ' + recordId };
} catch (error) {
Logger.log('Silme hatasi: ' + error.toString());
return { success: false, error: error.toString() };
}
}

function getMaintenanceHeaders(sheet) {
return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function listMaintenanceRecords(sheet, filters) {
try {
const dataRange = sheet.getDataRange();
const values = dataRange.getValues();
const headers = getMaintenanceHeaders(sheet);
if (values.length <= 1) return { success: true, data: [], count: 0 };
const records = [];
for (let i = 1; i < values.length; i++) {
const record = {};
headers.forEach((h, idx) => record[h] = values[i][idx]);
if (filters && filters.status) {
if (filters.status.includes(',')) {
if (filters.status.split(',').includes(record['Durum'])) records.push(record);
} else if (record['Durum'] === filters.status) {
records.push(record);
}
} else {
records.push(record);
}
}
return { success: true, data: records, count: records.length };
} catch (error) {
Logger.log('Listeleme hatasi: ' + error.toString());
return { success: false, error: error.toString() };
}
}

function getMaintenanceStats(sheet) {
try {
const dataRange = sheet.getDataRange();
const values = dataRange.getValues();
const headers = getMaintenanceHeaders(sheet);
const statusIndex = headers.indexOf('Durum');
if (values.length <= 1 || statusIndex === -1) return { success: true, stats: { toplam: 0, devam: 0, planlandi: 0, tamamlandi: 0 } };
const stats = { toplam: values.length - 1, devam: 0, planlandi: 0, tamamlandi: 0, ertelendi: 0, diger: 0 };
for (let i = 1; i < values.length; i++) {
const status = values[i][statusIndex];
if (status === 'devam') stats.devam++;
else if (status === 'planlandi') stats.planlandi++;
else if (status === 'tamamlandi') stats.tamamlandi++;
else if (status === 'ertelendi') stats.ertelendi++;
else stats.diger++;
}
return { success: true, stats: stats };
} catch (error) {
Logger.log('Istatistik hatasi: ' + error.toString());
return { success: false, error: error.toString() };
}
}
