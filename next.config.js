/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本地開發：保持 API Routes 正常運作
  // 生產環境（Cloudflare Pages）：後期再改為靜態導出
  
  // 圖片最佳化：停用以簡化配置
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
