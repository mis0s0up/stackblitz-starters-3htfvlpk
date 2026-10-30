/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 번들 결과물을 out 디렉토리로 정적 출력
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
