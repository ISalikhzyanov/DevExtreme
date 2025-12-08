import { createApp } from 'vue';
import themes from '@ISalikhzyanov/devextreme/ui/themes';
import App from './App.vue';

themes.initialized(() => createApp(App).mount('#app'));
