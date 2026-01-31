import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.mamalink.billstor',
    appName: 'BillStor',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
