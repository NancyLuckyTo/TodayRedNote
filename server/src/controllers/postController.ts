import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import postService from '../services/postService.js'
import userProfileService from '../services/userProfileService.js'
import jwt from 'jsonwebtoken'

class PostController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const author = req.userId
      if (!author) return res.status(401).json({ message: 'Unauthorized' })

      const post = await postService.createPost(author, req.body)
      return res.status(201).json({ post })
    } catch (err: any) {
      if (
        err.message === 'Body are required' ||
        err.message === 'Max 18 images'
      ) {
        return res.status(400).json({ message: err.message })
      }
      next(err)
    }
  }

  async getOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      let currentUserId: string | undefined

      const token = req.headers.authorization?.split(' ')[1]
      if (token) {
        try {
          const decoded: any = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secret'
          )
          if (decoded && decoded.userId) {
            currentUserId = decoded.userId
          }
        } catch (e) {
          // 如 token 无效则忽略
        }
      }

      const post = await postService.getPostById(id, currentUserId)
      if (!post) return res.status(404).json({ message: 'Not found' })

      // 记录浏览行为
      if (currentUserId) {
        // 异步记录，不阻塞响应
        userProfileService
          .trackUserBehavior(currentUserId, id, 'view')
          .catch((err: any) => {
            console.error('Failed to track view behavior:', err)
          })
      }

      return res.json({ post })
    } catch (err) {
      next(err)
    }
  }

  async getRelated(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const posts = await postService.getRelatedPosts(id)
      if (!posts) return res.status(404).json({ message: 'Not found' })

      return res.json({ posts })
    } catch (err) {
      next(err)
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.userId
      if (!userId) return res.status(403).json({ message: 'Forbidden' })

      const post = await postService.updatePost(id, userId, req.body)
      if (!post) return res.status(404).json({ message: 'Not found' })

      return res.json({ post })
    } catch (err: any) {
      if (err.message === 'Forbidden') {
        return res.status(403).json({ message: 'Forbidden' })
      }
      if (err.message === 'Max 18 images') {
        return res.status(400).json({ message: 'Max 18 images' })
      }
      next(err)
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.userId
      if (!userId) return res.status(403).json({ message: 'Forbidden' })

      const success = await postService.deletePost(id, userId)
      if (!success) return res.status(404).json({ message: 'Not found' })

      return res.status(204).end()
    } catch (err: any) {
      if (err.message === 'Forbidden') {
        return res.status(403).json({ message: 'Forbidden' })
      }
      next(err)
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(
        parseInt(String(req.query.limit as string)) || 10,
        50
      )
      const cursor = req.query.cursor as string | undefined

      const result = await postService.getPosts(limit, cursor)
      return res.json(result)
    } catch (err) {
      next(err)
    }
  }
}

export default new PostController()
