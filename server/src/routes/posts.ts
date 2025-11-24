import { Router } from 'express'
import auth from '../middleware/auth.js'
import postController from '../controllers/postController.js'

const router = Router()

// 发布笔记
router.post('/', auth, postController.create)

// 获取笔记详情，联表作者信息
router.get('/:id', postController.getOne)

// 获取相关推荐笔记
router.get('/:id/related', postController.getRelated)

// 更新笔记
router.put('/:id', auth, postController.update)

// 删除笔记
router.delete('/:id', auth, postController.delete)

// 获取笔记列表
router.get('/', postController.list)

export default router
