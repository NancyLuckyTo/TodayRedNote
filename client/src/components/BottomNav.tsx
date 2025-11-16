import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

const BottomNav = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/createPost', label: '发布' },
    { path: '/profile', label: '我' },
  ]

  const isLoggedIn = useAuthStore(s => s.isAuthenticated)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white">
      <div className="flex justify-around items-center h-16 px-4">
        {navItems.map(item => {
          const targetPath =
            item.path === '/profile'
              ? isLoggedIn
                ? '/profile'
                : '/login'
              : item.path
          const isActive =
            item.path === '/profile'
              ? location.pathname === '/profile' ||
                location.pathname === '/login'
              : location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={targetPath}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-gray-700 font-bold'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <span className="text-lg">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
