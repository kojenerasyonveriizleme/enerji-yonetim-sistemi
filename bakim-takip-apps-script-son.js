      success: false,
      error: 'Kayıt bulunamadı: ' + recordId
    };
    
  } catch (error) {
    Logger.log('Bakım silme hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Bakım kayıtlarını listele
 */
function listMaintenanceRecords(sheet, filters) {
  try {
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = getMaintenanceHeaders(sheet);
    
    if (values.length <= 1) {
      return {
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString()
      };
    }
    
    const records = [];
    for (let i = 1; i < values.length; i++) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[i][index];
      });
      
      // Filtreleri uygula
      let includeRecord = true;
      if (filters) {
        if (filters.status && record['Durum'] !== filters.status) {
          includeRecord = false;
        }
        if (filters.ekipman && record['Ekipman'] !== filters.ekipman) {
          includeRecord = false;
        }
      }
      
      if (includeRecord) {
        records.push(record);
      }
    }
    
    return {
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Bakım listeleme hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Bakım istatistiklerini al
 */
function getMaintenanceStats(sheet) {
  try {
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = getMaintenanceHeaders(sheet);
    const statusIndex = headers.indexOf('Durum');
    
    if (values.length <= 1 || statusIndex === -1) {
      return {
        success: true,
        stats: {
          toplam: 0,
          devam: 0,
          planlandi: 0,
          tamamlandi: 0
        },
        timestamp: new Date().toISOString()
      };
    }
    
    const stats = {
      toplam: values.length - 1, // Header hariç
      devam: 0,
      planlandi: 0,
      tamamlandi: 0,
      ertelendi: 0,
      diger: 0
    };
    
    for (let i = 1; i < values.length; i++) {
      const status = values[i][statusIndex];
      if (status === 'devam') {
        stats.devam++;
      } else if (status === 'planlandi') {
        stats.planlandi++;
      } else if (status === 'tamamlandi') {
        stats.tamamlandi++;
      } else if (status === 'ertelendi') {
        stats.ertelendi++;
      } else {
        stats.diger++;
      }
    }
    
    return {
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('İstatistik hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}
