import axios, { type InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: '/api',
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
