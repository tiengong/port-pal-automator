import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation resources
import zhCN from '../locales/zh-CN/translation.json';
import enUS from '../locales/en-US/translation.json';

const resources = {
  'zh-CN': {
    translation: zhCN
  },
  'en-US': {
    translation: enUS
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-CN', // default language
    fallbackLng: 'en-US',
    
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    
    // Disable debug in production
    debug: false,
    
    // Load synchronously
    react: {
      useSuspense: false
    }
  });

export default i18n;