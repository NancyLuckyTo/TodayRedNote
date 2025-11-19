import { IMAGE_RATIO } from '@TRN/types'
import type { IPost, ImageRatioType } from '@TRN/types'

const IMAGE_RATIO_META: Record<
  ImageRatioType,
  { aspectRatio: string; heightRatio: number }
> = {
  landscape: { aspectRatio: '4 / 3', heightRatio: 3 / 4 },
  portrait: { aspectRatio: '3 / 4', heightRatio: 4 / 3 },
  square: { aspectRatio: '1 / 1', heightRatio: 1 },
  none: { aspectRatio: '1 / 1', heightRatio: 0 },
}

const BASE_CARD_OFFSET = 24 // 作者信息与点赞所占高度
const TEXT_LINE_HEIGHT = 18 // 预览正文的行高
const MAX_BODY_LINES = 2 // 预览正文的最大行数

/**
 * 计算瀑布流卡片高度
 * @param post 笔记数据
 * @param columnWidth 列宽
 * @returns 卡片高度
 */
export const calculatePostHeight = (post: IPost, columnWidth: number) => {
  const { body, images } = post
  const hasImages = images && images.length > 0
  const hasBody = body && body.trim().length > 0

  // 封面图及其比例
  const coverRatio = post.coverRatio || IMAGE_RATIO.NONE
  const aspectMeta = IMAGE_RATIO_META[coverRatio]

  const estimatedImageHeight = hasImages
    ? aspectMeta.heightRatio * columnWidth
    : 0

  const estimatedBodyHeight = hasBody
    ? Math.min(Math.ceil(body.length / 40), MAX_BODY_LINES) * TEXT_LINE_HEIGHT
    : 0

  return BASE_CARD_OFFSET + estimatedImageHeight + estimatedBodyHeight
}

/**
 * 根据封面图比例获取 CSS aspect-ratio 值
 * @param coverRatio 封面图比例
 * @returns CSS aspect-ratio 值
 */
export function getAspectRatio(coverRatio: ImageRatioType) {
  return IMAGE_RATIO_META[coverRatio]?.aspectRatio || '1 / 1'
}
