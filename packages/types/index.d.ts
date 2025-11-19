// 图片比例
export declare const IMAGE_RATIO: {
  LANDSCAPE: 'landscape'
  PORTRAIT: 'portrait'
  SQUARE: 'square'
  NONE: 'none'
}

export type ImageRatioType = (typeof IMAGE_RATIO)[keyof typeof IMAGE_RATIO]

// 笔记
export interface IPost {
  _id: string
  author: IAuthor
  body: string
  images: string[]
  tags?: string[]
  createdAt: string
  updatedAt: string
  likesCount: number
  coverRatio: ImageRatioType
  isTextOnly?: boolean
}

// 作者
export interface IAuthor {
  _id: string
  username: string
  avatar: string
}
