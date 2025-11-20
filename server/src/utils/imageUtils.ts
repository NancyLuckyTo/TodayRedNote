import { URL } from 'url'
import type { ImageQuality, ImageRatio } from '@today-red-note/types'
import {
  IMAGE_RATIO,
  IMAGE_QUALITY,
  IMAGE_QUALITY_CONFIG,
} from '@today-red-note/types'

// 图片比例阈值配置
export const RATIO_THRESHOLD = {
  // 宽高比大于 1.2 视为横图
  LANDSCAPE_MIN: 1.2,
  // 宽高比小于 0.8 视为竖图
  PORTRAIT_MAX: 0.8,
} as const

/**
 * 计算图片比例类型
 */
export const calculateRatioType = (image: {
  width: number
  height: number
}): ImageRatio => {
  if (image.width === 0 || image.height === 0) return IMAGE_RATIO.NONE
  const ratio = image.width / image.height
  if (ratio > RATIO_THRESHOLD.LANDSCAPE_MIN) return IMAGE_RATIO.LANDSCAPE
  if (ratio < RATIO_THRESHOLD.PORTRAIT_MAX) return IMAGE_RATIO.PORTRAIT
  return IMAGE_RATIO.SQUARE
}

/**
 * OSS 图片处理工具函数
 * @param url 原始图片 URL
 * @param quality 图片质量等级，默认为 HIGH
 * @returns 处理后的图片 URL
 */
export const processImageUrl = (
  url: string,
  quality: ImageQuality = IMAGE_QUALITY.THUMBNAIL
): string => {
  try {
    const urlObj = new URL(url)
    // 如果已经有处理参数，直接返回
    if (urlObj.searchParams.has('x-oss-process')) {
      return url
    }

    // 获取质量配置
    const config = IMAGE_QUALITY_CONFIG[quality]
    // 构建 OSS 处理参数
    // x-oss-process=image/resize,w_800/quality,q_75/format,webp
    const processParams = `image/resize,w_${config.width}/quality,q_${config.quality}/format,${config.format}`
    urlObj.searchParams.append('x-oss-process', processParams)
    return urlObj.toString()
  } catch (e) {
    return url
  }
}

/**
 * 规范化图片数组
 */
export const normalizeImages = (images: any[]) =>
  images
    .filter((img: any) => img && typeof img.url === 'string' && img.url)
    .map((img: any) => ({
      url: String(img.url),
      width:
        typeof img.width === 'number' && Number.isFinite(img.width)
          ? img.width
          : 0,
      height:
        typeof img.height === 'number' && Number.isFinite(img.height)
          ? img.height
          : 0,
    }))
