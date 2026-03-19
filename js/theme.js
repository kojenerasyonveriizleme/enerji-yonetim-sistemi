/**
 * Tema Yönetimi Modülü
 * Koyu/Açık tema değiştirme özelliği
 */

const ThemeManager = {
    /**
     * Modülü başlat
     */
    init: function() {
        // DOM hazır olduğunda başlat
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.loadTheme();
            });
        } else {
            this.setupEventListeners();
            this.loadTheme();
        }
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Tüm theme toggle butonlarını bul
        const themeToggles = document.querySelectorAll('.theme-toggle');
        
        themeToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        });
    },

    /**
     * Tema değiştir
     */
    toggleTheme: function() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        
        // localStorage'a güvenli şekilde kaydet
        try {
            localStorage.setItem('theme', newTheme);
        } catch (e) {
            console.warn('localStorage erişim hatası:', e);
        }
        
        // İkonları değiştir
        const themeIcons = document.querySelectorAll('.theme-toggle-icon');
        themeIcons.forEach(icon => {
            icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
        
        // Toast bildirim
        if (window.Utils) {
            Utils.showToast(
                newTheme === 'dark' ? 'Koyu tema aktif' : 'Açık tema aktif',
                'success'
            );
        }
    },

    /**
     * Kaydedilen temayı yükle
     */
    loadTheme: function() {
        let savedTheme = 'light';
        
        // localStorage'dan güvenli şekilde oku
        try {
            savedTheme = localStorage.getItem('theme') || 'light';
        } catch (e) {
            console.warn('localStorage okuma hatası:', e);
            savedTheme = 'light';
        }
        
        // Opera için küçük bir gecikme ile uygula
        setTimeout(() => {
            const html = document.documentElement;
            html.setAttribute('data-theme', savedTheme);
            
            // İkonları ayarla
            const themeIcons = document.querySelectorAll('.theme-toggle-icon');
            themeIcons.forEach(icon => {
                icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
            });
        }, 50);
    },

    /**
     * Sistem temasını al
     */
    getSystemTheme: function() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    /**
     * Sistem temasını uygula
     */
    applySystemTheme: function() {
        const systemTheme = this.getSystemTheme();
        const html = document.documentElement;
        
        html.setAttribute('data-theme', systemTheme);
        
        // İkonları ayarla
        const themeIcons = document.querySelectorAll('.theme-toggle-icon');
        themeIcons.forEach(icon => {
            icon.textContent = systemTheme === 'dark' ? '☀️' : '🌙';
        });
    }
};

// Tema modülünü global olarak erişilebilir yap
window.ThemeManager = ThemeManager;
