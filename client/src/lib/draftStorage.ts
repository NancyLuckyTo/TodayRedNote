import type { IDraft, ICloudDraft } from '@today-red-note/types'
import api from './api'

const DRAFT_STORAGE_KEY = 'post_draft'

/**
 * 草稿存储服务
 * 提供本地存储和云端同步功能
 */
export const draftStorage = {
  /**
   * 生成唯一 ID
   */
  generateId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  },

  /**
   * 保存草稿到本地存储
   */
  saveLocal(draft: IDraft): void {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch (error) {
      console.error('保存草稿到本地失败:', error)
    }
  },

  /**
   * 从本地存储读取草稿
   */
  getLocal(): IDraft | null {
    try {
      const data = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!data) return null
      return JSON.parse(data) as IDraft
    } catch (error) {
      console.error('读取本地草稿失败:', error)
      return null
    }
  },

  /**
   * 清除本地草稿
   */
  clearLocal(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (error) {
      console.error('清除本地草稿失败:', error)
    }
  },

  /**
   * 保存草稿到云端
   */
  async saveCloud(draft: IDraft): Promise<ICloudDraft | null> {
    try {
      const payload = {
        body: draft.body,
        tags: draft.tags,
        images: draft.uploadedImages || [],
      }

      if (draft.cloudId) {
        // 更新现有草稿
        const { data } = await api.put<{ draft: ICloudDraft }>(
          `/drafts/${draft.cloudId}`,
          payload
        )
        return data.draft
      } else {
        // 创建新草稿
        const { data } = await api.post<{ draft: ICloudDraft }>(
          '/drafts',
          payload
        )
        return data.draft
      }
    } catch (error) {
      console.error('保存草稿到云端失败:', error)
      return null
    }
  },

  /**
   * 从云端获取草稿
   */
  async getCloud(): Promise<ICloudDraft | null> {
    try {
      const { data } = await api.get<{ draft: ICloudDraft | null }>('/drafts')
      return data.draft
    } catch (error) {
      console.error('获取云端草稿失败:', error)
      return null
    }
  },

  /**
   * 删除云端草稿
   */
  async deleteCloud(cloudId: string): Promise<boolean> {
    try {
      await api.delete(`/drafts/${cloudId}`)
      return true
    } catch (error) {
      console.error('删除云端草稿失败:', error)
      return false
    }
  },

  /**
   * 检查网络连接状态
   */
  isOnline(): boolean {
    return navigator.onLine
  },

  /**
   * 将图片文件转换为 base64（用于断网时本地保存）
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  },

  /**
   * 将 base64 转换回 File 对象
   */
  base64ToFile(base64: string, name: string, type: string): File {
    const arr = base64.split(',')
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], name, { type })
  },
}
