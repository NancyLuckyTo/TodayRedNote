import axios, { type InternalAxiosRequestConfig } from 'axios'

// 生产环境使用环境变量配置的 API 地址，开发环境使用 Vite 代理
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    // 将 token 附加到 Authorization 请求头上
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
