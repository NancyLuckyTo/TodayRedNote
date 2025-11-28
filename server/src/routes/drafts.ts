import { Router } from 'express'
import auth from '../middleware/auth.js'
import draftController from '../controllers/draftController.js'

const router = Router()

// 获取当前用户的草稿
router.get('/', auth, draftController.get)

// 创建新草稿
router.post('/', auth, draftController.create)

// 更新草稿
router.put('/:id', auth, draftController.update)

// 删除草稿
router.delete('/:id', auth, draftController.delete)

export default router
