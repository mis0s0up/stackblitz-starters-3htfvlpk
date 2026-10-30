import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'bingre-longd-dongji',
  brand: {
    primaryColor: '#1D4ED8', // 코발트 블루
  },
  permissions: [],
  webBundleDir: 'out', // Next.js 정적 익스포트 경로
});
