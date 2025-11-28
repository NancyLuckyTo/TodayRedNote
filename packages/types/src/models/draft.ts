/**
 * 草稿数据结构
 * 支持本地存储和云端同步
 */
export interface IDraft {
  /** 草稿唯一标识（本地生成的 UUID 或云端 _id） */
  id: string
  /** 云端草稿 ID（如果已同步到云端） */
  cloudId?: string
  /** 正文内容（HTML 格式） */
  body: string
  /** 标签字符串 */
  tags?: string
  /** 已上传到云端的图片 URL 列表 */
  uploadedImages?: string[]
  /** 本地待上传图片的 base64 数据（用于断网恢复） */
  localImages?: Array<{
    base64: string
    name: string
    type: string
    width: number
    height: number
  }>
  /** 创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
  /** 最后云端同步时间 */
  lastSyncedAt?: number
  /** 是否有未同步的本地修改 */
  isDirty?: boolean
}

/**
 * 云端草稿响应结构
 */
export interface ICloudDraft {
  _id: string
  body: string
  tags?: string
  images?: string[]
  createdAt: string
  updatedAt: string
}
