import { Router } from 'express'
import { URL } from 'url'
import auth, { AuthRequest } from '../middleware/auth'
import Post from '../models/postModel'
import getOssClient from '../services/storageService'

const router = Router()

// 创建帖子（需要登录）
router.post('/', auth, async (req: AuthRequest, res, next) => {
  try {
    // 获取输入
    const { body, coverImage, tags } = req.body ?? {}

    // 验证输入
    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: 'Body are required' })
    }

    // 身份验证
    const author = req.userId
    if (!author) return res.status(401).json({ message: 'Unauthorized' })

    // 构建数据库载荷
    const payload: any = {
      body: String(body).trim(),
      author,
    }

    // 处理可选字段
    if (coverImage) payload.coverImage = String(coverImage)
    if (Array.isArray(tags)) payload.tags = tags.map((t: any) => String(t))

    // 创建帖子
    const post = await Post.create(payload)
    return res.status(201).json({ post })
  } catch (err) {
    next(err)
  }
})

// 获取帖子详情（联表作者信息）
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const post = await Post.findById(id).populate('author', 'username')
    if (!post) return res.status(404).json({ message: 'Not found' })
    return res.json({ post })
  } catch (err) {
    next(err)
  }
})

// 更新帖子
router.put('/:id', auth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const found = await Post.findById(id)
    if (!found) return res.status(404).json({ message: 'Not found' })
    if (!req.userId || found.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { body, coverImage, tags } = req.body ?? {}
    const update: any = {}
    if (typeof body === 'string') update.body = body.trim()
    if (typeof coverImage === 'string') update.coverImage = coverImage
    if (Array.isArray(tags)) update.tags = tags.map((t: any) => String(t))

    const post = await Post.findByIdAndUpdate(id, update, { new: true })
    return res.json({ post })
  } catch (err) {
    next(err)
  }
})

// 删除帖子
router.delete('/:id', auth, async (req: AuthRequest, res, next) => {
  try {
    // 查找与授权
    const { id } = req.params
    const found = await Post.findById(id)
    if (!found) return res.status(404).json({ message: 'Not found' })
    if (!req.userId || found.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    // 在删除前保存图片 URL
    const cover = found.coverImage
    // 从 MongoDB 数据库中删除帖子
    await Post.findByIdAndDelete(id)

    if (cover) {
      try {
        const client = getOssClient()
        let objectName = ''
        try {
          const u = new URL(cover)
          objectName = u.pathname.replace(/^\//, '')
        } catch {
          objectName = cover.replace(/^https?:\/\/.+?\//, '')
        }
        void client.delete(objectName).catch(() => undefined)
      } catch {}
    }

    return res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
