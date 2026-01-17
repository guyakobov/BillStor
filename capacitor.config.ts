import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.billstor.app',
    appName: 'BillStor',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
