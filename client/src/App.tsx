import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import HomePage from './pages/HomePage' // 首页保持同步加载，优化 LCP
import PrivateRoute from './components/PrivateRoute'
import { useAuthStore } from './stores/auth'
import { usePreventZoom } from './hooks/usePreventZoom'
import { ToastProvider } from '@/components/ui/toast'
import { PageLoading } from '@/components/ui/PageLoading'

// 非首屏页面和组件使用懒加载，减少首次加载的 JS 体积
const PostEditorPage = lazy(() => import('./pages/PostEditorPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const BottomNav = lazy(() => import('./components/BottomNav'))

/**
 * 根布局：所有页面共享的外层容器
 */
function RootLayout() {
  return (
    <div className="flex min-h-screen justify-center bg-gray-100">
      {/* 限制最大宽度，模拟手机屏幕比例 */}
      <div className="relative w-full max-w-md min-h-screen bg-gray-100">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
        <ToastProvider position="top-center" />
      </div>
    </div>
  )
}

/**
 * 带底部导航栏的布局
 * 用于：首页、个人页等需要底部导航的页面
 */
function NavLayout() {
  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  )
}

function App() {
  usePreventZoom()
  const initialize = useAuthStore(s => s.initialize)
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <Routes>
        {/* 根布局：所有页面共享的外层容器 */}
        <Route element={<RootLayout />}>
          {/* 带底部导航栏的页面 */}
          <Route element={<NavLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* 不带底部导航栏的页面 */}
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route
            path="/createPost"
            element={
              <PrivateRoute>
                <PostEditorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/editPost/:id"
            element={
              <PrivateRoute>
                <PostEditorPage />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
