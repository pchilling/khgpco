export default defineConfig({
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      // 添加可能出问题的本地模块
      './src/components/common/BilingualInput.js'
    ]
  }
}); 