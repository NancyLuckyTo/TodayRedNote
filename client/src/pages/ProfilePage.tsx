import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'

const ProfilePage = () => {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">我</h1>
        <div className="mb-4 text-sm text-gray-600">
          <div>用户名：{user?.username ?? '-'}</div>
          <div>ID：{user?._id ?? '-'}</div>
        </div>
        <Button variant="destructive" onClick={onLogout}>
          退出登录
        </Button>
      </div>
    </div>
  )
}

export default ProfilePage
