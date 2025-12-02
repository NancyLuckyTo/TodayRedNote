import { URL } from 'url'
import Post from '../models/postModel.js'
import getOssClient from '../services/storageService.js'
import { encodeCursor, decodeFeedCursor } from '../utils/cursorUtils.js'
import {
  formatPostWithImages,
  applyImagesToTarget,
} from '../utils/postUtils.js'
import { IMAGE_QUALITY } from '@today-red-note/types'
import { extractTopic, extractTags } from '../services/aiService.js'
import topicService from '../services/topicService.js'
import tagService from '../services/tagService.js'
import userProfileService from '../services/userProfileService.js'

const MAX_RELATED_NOTES = 10 // 笔记详情页相关笔记最大数量
const MAX_INTEREST_TAGS = 10 // 个性化推荐时使用的兴趣标签数量上限

class PostService {
  /**
   * 构建分页结果
   */
  private buildPaginationResult(
    posts: any[],
    pagination: {
      nextCursor: string | null
      hasNextPage: boolean
      limit: number
    }
  ) {
    return {
      posts,
      pagination,
    }
  }

  /**
   * 构建兜底流结果
   */
  private async buildFallbackFeedResult(limit: number, cursor?: string) {
    const baseResult = await this.getPosts(limit, cursor)
    const basePagination = baseResult.pagination ?? {
      nextCursor: null,
      hasNextPage: false,
      limit,
    }

    let wrappedNextCursor: string | null = null
    if (basePagination.hasNextPage && basePagination.nextCursor) {
      const payload = {
        phase: 'fallback',
        innerCursor: basePagination.nextCursor,
      }
      wrappedNextCursor = encodeCursor(payload)
    }

    return this.buildPaginationResult(baseResult.posts, {
      ...basePagination,
      nextCursor: wrappedNextCursor,
    })
  }

  /**
   * 创建笔记
   */
  async createPost(userId: string, data: any) {
    const { body, bodyPreview, images, topic: userTopic } = data

    if (!body || !String(body).trim()) {
      throw new Error('Body are required')
    }

    const bodyStr = String(body).trim()
    const payload: any = {
      body: bodyStr,
      author: userId,
    }

    payload.bodyPreview = bodyPreview ? bodyPreview : ''

    applyImagesToTarget(payload, images)

    // 话题处理：优先使用用户手动传入的话题，否则 AI 自动提取
    try {
      if (userTopic && typeof userTopic === 'string' && userTopic.trim()) {
        // 用户手动输入话题
        const topic = await topicService.getOrCreateTopic(userTopic.trim())
        payload.topic = topic._id
      } else {
        // AI 自动提取话题
        const topicName = await extractTopic(bodyStr)
        const topic = await topicService.getOrCreateTopic(topicName)
        payload.topic = topic._id
      }
    } catch (error) {
      console.error('Topic generation failed:', error)
    }

    // AI 提取标签
    try {
      const tagNames = await extractTags(bodyStr)
      const tagIds = await tagService.getOrCreateTags(tagNames)
      payload.tags = tagIds
    } catch (error) {
      console.error('Tag extraction failed:', error)
    }

    const post = await Post.create(payload)

    if (payload.topic) {
      topicService.incrementTopicCount(payload.topic).catch(console.error)
    }

    if (payload.tags && payload.tags.length > 0) {
      tagService.incrementTagCounts(payload.tags).catch(console.error)
    }

    return post
  }

  /**
   * 获取笔记详情
   */
  async getPostById(id: string, currentUserId?: string) {
    const post = await Post.findById(id)
      .populate('author', 'username')
      .populate('topic', 'name')
      .populate('tags', 'name')

    if (!post) return null

    return formatPostWithImages(post, IMAGE_QUALITY.PREVIEW, false)
  }

  /**
   * 用于笔记详情页获取更多相关笔记
   */
  async getRelatedPosts(id: string) {
    const currentPost = await Post.findById(id)
    if (!currentPost) return null

    // 构建复杂推荐查询：优先标签匹配，其次话题匹配
    const matchByTags =
      currentPost.tags && currentPost.tags.length > 0
        ? {
            _id: { $ne: currentPost._id },
            tags: { $in: currentPost.tags },
          }
        : null

    const matchByTopic = currentPost.topic
      ? {
          _id: { $ne: currentPost._id },
          topic: currentPost.topic,
          // 排除已通过标签匹配的
          ...(matchByTags ? { tags: { $nin: currentPost.tags } } : {}),
        }
      : null

    // 分别获取标签匹配和话题匹配的笔记
    const tagMatchedPosts = matchByTags
      ? await Post.find(matchByTags)
          .sort({ createdAt: -1 })
          .limit(MAX_RELATED_NOTES)
          .populate('author', 'username avatar')
          .populate('topic', 'name')
          .populate('tags', 'name')
          .lean()
      : []

    const topicMatchedPosts = matchByTopic
      ? await Post.find(matchByTopic)
          .sort({ createdAt: -1 })
          .limit(MAX_RELATED_NOTES - tagMatchedPosts.length)
          .populate('author', 'username avatar')
          .populate('topic', 'name')
          .populate('tags', 'name')
          .lean()
      : []

    // 合并结果：标签匹配优先
    const posts = [...tagMatchedPosts, ...topicMatchedPosts].slice(
      0,
      MAX_RELATED_NOTES
    )

    return posts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )
  }

  /**
   * 更新笔记
   */
  async updatePost(id: string, userId: string, data: any) {
    const found = await Post.findById(id)
    if (!found) return null
    if (found.author.toString() !== userId) {
      throw new Error('Forbidden')
    }

    const { body, bodyPreview, images, topic: userTopic } = data
    const update: any = {}

    if (typeof body === 'string') {
      const bodyStr = body.trim()
      update.body = bodyStr
      update.bodyPreview = bodyPreview ? bodyPreview : ''
    }

    if (Array.isArray(images)) {
      applyImagesToTarget(update, images, { resetWhenEmpty: true })
    }

    // 更新话题：如果用户提供了话题则更新
    if (typeof userTopic === 'string') {
      if (userTopic.trim()) {
        const topic = await topicService.getOrCreateTopic(userTopic.trim())
        update.topic = topic._id
      } else {
        // 用户清空了话题
        update.topic = null
      }
    }

    return await Post.findByIdAndUpdate(id, update, { new: true })
  }

  /**
   * 删除笔记
   */
  async deletePost(id: string, userId: string) {
    const found = await Post.findById(id)
    if (!found) return null
    if (found.author.toString() !== userId) {
      throw new Error('Forbidden')
    }

    const images = Array.isArray(found.images) ? found.images : []
    if (images.length) {
      const objectKeys = images
        .map(img => {
          try {
            const parsed = new URL(String(img.url))
            return parsed.pathname.replace(/^\/+/, '')
          } catch {
            return null
          }
        })
        .filter((key): key is string => Boolean(key))

      if (objectKeys.length) {
        const client = getOssClient()
        if (objectKeys.length === 1) {
          await client.delete(objectKeys[0])
        } else {
          await client.deleteMulti(objectKeys, { quiet: true })
        }
      }
    }

    await found.deleteOne()
    return true
  }

  /**
   * 用于瀑布流首页获取笔记列表
   */
  async getPosts(limit: number, cursor?: string) {
    let query: any = {}

    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        )
        const cursorTime = new Date(decoded.createdAt)
        const cursorId = decoded._id

        query = {
          $or: [
            { createdAt: { $lt: cursorTime } },
            { createdAt: cursorTime, _id: { $lt: cursorId } },
          ],
        }
      } catch (err) {
        query = {}
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean()

    const hasNextPage = posts.length > limit
    if (hasNextPage) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    let nextCursor = null
    if (hasNextPage && formattedPosts.length > 0) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      const cursorPayload = {
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      }
      nextCursor = encodeCursor(cursorPayload)
    }

    return this.buildPaginationResult(formattedPosts, {
      nextCursor,
      hasNextPage,
      limit,
    })
  }

  /**
   * 获取用户自己的笔记列表
   */
  async getUserPosts(userId: string, limit: number, cursor?: string) {
    let query: any = { author: userId }

    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        )
        const cursorTime = new Date(decoded.updatedAt)
        const cursorId = decoded._id

        query = {
          author: userId,
          $or: [
            { updatedAt: { $lt: cursorTime } },
            { updatedAt: cursorTime, _id: { $lt: cursorId } },
          ],
        }
      } catch (err) {
        query = { author: userId }
      }
    }

    const posts = await Post.find(query)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean()

    const hasNextPage = posts.length > limit
    if (hasNextPage) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    let nextCursor: string | null = null
    if (hasNextPage && formattedPosts.length > 0) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      const cursorPayload = {
        updatedAt: lastPost.updatedAt,
        _id: lastPost._id,
      }
      nextCursor = encodeCursor(cursorPayload)
    }

    return this.buildPaginationResult(formattedPosts, {
      nextCursor,
      hasNextPage,
      limit,
    })
  }

  /**
   * 混合型个性化推荐信息流：先推荐用户画像匹配的笔记，如果余量不足则推荐时间流笔记
   */
  async getPersonalizedFeed(userId: string, limit: number, cursor?: string) {
    let phase: 'profile' | 'fallback' = 'profile'
    let profileCursorCreatedAt: Date | undefined // 用于在画像阶段进行数据库分页查询
    let profileCursorId: string | undefined
    let fallbackInnerCursor: string | undefined

    // 如果存在 cursor，则说明不是第一页，需要解析 cursor 中的状态
    if (cursor) {
      const decoded = decodeFeedCursor(cursor) // 解码 base64 字符串为 JSON 对象
      if (
        decoded &&
        decoded.phase === 'profile' &&
        decoded.createdAt &&
        decoded._id
      ) {
        // 画像阶段
        phase = 'profile'
        profileCursorCreatedAt = new Date(decoded.createdAt)
        profileCursorId = String(decoded._id)
      } else if (decoded && decoded.phase === 'fallback') {
        // 兜底阶段
        phase = 'fallback'
        if (typeof decoded.innerCursor === 'string') {
          fallbackInnerCursor = decoded.innerCursor
        }
      } else {
        // 解析失败，退化到兜底阶段
        phase = 'fallback'
        fallbackInnerCursor = cursor
      }
    }

    // 兜底阶段：完全复用时间流逻辑
    if (phase === 'fallback') {
      return this.buildFallbackFeedResult(limit, fallbackInnerCursor)
    }

    // 画像阶段：根据用户兴趣标签召回
    const profile = await userProfileService.getOrCreateUserProfile(userId)

    // 提取用户感兴趣的标签，并按权重降序排列
    const sortedInterests = Array.isArray(profile.interests)
      ? [...profile.interests].sort((a: any, b: any) => b.weight - a.weight)
      : []

    // 取出前 MAX_INTEREST_TAGS 个标签 ID，避免查询条件过长
    const interestTagIds = sortedInterests
      .slice(0, MAX_INTEREST_TAGS)
      .map((item: any) => item.tagId)

    // 无兴趣标签，直接退化到兜底流
    if (!interestTagIds.length) {
      return this.buildFallbackFeedResult(limit)
    }

    // 执行数据库查询
    const query: any = {
      // 构造查询条件：笔记的 tags 字段必须包含用户的兴趣标签之一 ($in 查询)
      tags: { $in: interestTagIds },
    }

    if (profileCursorCreatedAt && profileCursorId) {
      query.$or = [
        { createdAt: { $lt: profileCursorCreatedAt } },
        { createdAt: profileCursorCreatedAt, _id: { $lt: profileCursorId } },
      ]
    }

    // 查询数据库
    const rawProfilePosts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 }) // 按发布时间倒序
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean() // 转为普通 JS 对象，提高性能

    // 是否还有下一页
    const hasMoreProfile = rawProfilePosts.length > limit
    if (hasMoreProfile) {
      rawProfilePosts.pop()
    }

    // 数据清洗与格式化
    const profilePosts = rawProfilePosts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    // 如果画像召回为空，直接进入兜底阶段
    if (!profilePosts.length) {
      return this.buildFallbackFeedResult(limit)
    }

    // 画像阶段还有下一页，则本次只返回画像数据
    if (hasMoreProfile) {
      const lastPost = profilePosts[profilePosts.length - 1]
      const payload = {
        phase: 'profile',
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      }
      const nextCursor = encodeCursor(payload)

      return this.buildPaginationResult(profilePosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    // 画像阶段最后一页：不足一整页，用兜底流补齐；
    // 如果刚好一整页（fallbackNeeded = 0），则下一页直接切换到兜底阶段
    const fallbackNeeded = Math.max(limit - profilePosts.length, 0)

    if (fallbackNeeded <= 0) {
      const payload = {
        phase: 'fallback', // 下一次请求直接从 fallback 开始
      }
      const nextCursor = encodeCursor(payload)

      return this.buildPaginationResult(profilePosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    const fallbackResult = await this.getPosts(fallbackNeeded, undefined)
    const fallbackPagination = fallbackResult.pagination ?? {
      nextCursor: null,
      hasNextPage: false,
      limit: fallbackNeeded,
    }

    // 去重逻辑：防止兜底流里出现了画像流里刚展示过的笔记
    const existingIds = new Set(
      profilePosts.map((post: any) => String(post._id))
    )
    const dedupFallbackPosts = fallbackResult.posts.filter(
      (post: any) => !existingIds.has(String(post._id))
    )
    const combinedPosts = [...profilePosts, ...dedupFallbackPosts]

    let combinedNextCursor: string | null = null
    if (fallbackPagination.hasNextPage && fallbackPagination.nextCursor) {
      const payload = {
        phase: 'fallback',
        innerCursor: fallbackPagination.nextCursor,
      }
      combinedNextCursor = encodeCursor(payload)
    }

    return this.buildPaginationResult(combinedPosts, {
      nextCursor: combinedNextCursor,
      hasNextPage: Boolean(fallbackPagination.hasNextPage),
      limit,
    })
  }
}

export default new PostService()
