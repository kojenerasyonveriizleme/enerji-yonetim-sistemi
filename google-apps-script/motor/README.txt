KOJEN MOTOR VERİLERİ - Google Sheets Kurulum Talimatları
=====================================================

1. GOOGLE SHEETS HAZIRLAMA
--------------------------
a. Yeni bir Google Sheets oluşturun veya mevcut bir sheet açın
b. Sheet adını "KojenMotorVerileri" olarak değiştirin
c. İlk satır (A1) başlıklarını şu şekilde ayarlayın:

   A1: Tarih
   B1: Vardiya
   C1: Saat
   D1: Motor
   E1: JEN. YATAK SIC. (DE)
   F1: JEN. YATAK SIC. (NDE)
   G1: SOĞUTMA SUYU SIC.
   H1: SOĞUTMA SUYU BAS.
   I1: YAĞ SIC.
   J1: YAĞ BAS.
   K1: ŞARJ SIC.
   L1: ŞARJ BAS.
   M1: GAZ REG. (λ)
   N1: MAKİNE DAİRESİ SIC.
   O1: KARTER BAS.
   P1: ÖN KAMARA FARK BAS.
   Q1: SARGI SIC. -1-
   R1: SARGI SIC. -2-
   S1: SARGI SIC. -3-
   T1: Durum
   U1: Kaydeden
   V1: Kayıt Tarihi

2. GOOGLE APPS SCRIPT KURULUMU
------------------------------
a. Google Sheets menüsünden: Extensions > Apps Script'e tıklayın
b. Varsayılan "Code.gs" dosyasının içeriğini silin
c. "Code.gs" dosyasına motor/Code.gs dosyasındaki kodu yapıştırın
d. Proje adını "Kojen Motor Verileri" olarak değiştirin (sol üstte Untitled Project yazan yere tıklayıp)

3. WEB UYGULAMASI OLARAK YAYINLAMA
----------------------------------
a. Deploy > New Deployment'a tıklayın
b. Select type: Web App seçin
c. Description: "Kojen Motor Verileri API v1"
d. Execute as: Me (your email) seçin
e. Who has access: Anyone seçin (veya Anyone with Google account)
f. Deploy'a tıklayın
g. Yetkilendirme ekranında izin verin
h. Web App URL'i kopyalayın (https://script.google.com/macros/s/... şeklinde)

4. FRONTEND UYGULAMASINA BAĞLAMA
--------------------------------
a. js klasöründe kojen-motor-sheets.js adında yeni bir dosya oluşturun
b. Aşağıdaki şablonu kullanın ve YOUR_WEB_APP_URL_HERE yerine kopyaladığınız URL'i yapıştırın:

--- kojen-motor-sheets.js içeriği ---
const KojenMotorSheetsConfig = {
    WEB_APP_URL: 'YOUR_WEB_APP_URL_HERE',
    API_KEY: ''
};

// Motor verilerini Google Sheets'e kaydet
async function saveMotorToSheets(data) {
    try {
        const url = KojenMotorSheetsConfig.WEB_APP_URL;
        const params = new URLSearchParams({
            action: 'addRecord',
            ...data
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Sheets kayıt hatası:', error);
        return { success: false, error: error.message };
    }
}

// Kayıt kontrolü
async function checkExistingMotorRecord(motor, tarih, saat) {
    try {
        const url = KojenMotorSheetsConfig.WEB_APP_URL + 
            `?action=checkExistingRecord&motor=${encodeURIComponent(motor)}&tarih=${encodeURIComponent(tarih)}&saat=${encodeURIComponent(saat)}`;
        
        const response = await fetch(url);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Kontrol hatası:', error);
        return { success: false, error: error.message };
    }
}

// Kayıtları getir
async function getMotorRecords(motor, tarih) {
    try {
        const url = KojenMotorSheetsConfig.WEB_APP_URL + 
            `?action=getRecordsByMotorAndDate&motor=${encodeURIComponent(motor)}&tarih=${encodeURIComponent(tarih)}`;
        
        const response = await fetch(url);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Veri getirme hatası:', error);
        return { success: false, error: error.message };
    }
}

export { saveMotorToSheets, checkExistingMotorRecord, getMotorRecords, KojenMotorSheetsConfig };
---

5. TEST
-------
Kojen Motor Veri sayfasından yeni bir kayıt yapıp Google Sheets'te görünüp görünmediğini kontrol edin.

ÖNEMLİ NOTLAR:
- Web App URL'i gizli tutun ve paylaşmayın
- İlk kullanımda Google Yetkilendirme ekranı çıkabilir, izin verin
- "Anyone" erişimi yerine "Anyone with Google account" daha güvenlidir
- Veriler otomatik olarak dd.MM.yyyy formatında kaydedilir
- Saat formatı HH:MM şeklindedir (örn: 13:00)
- Motor çalışmıyor kayıtları kırmızı arka planla işaretlenir
