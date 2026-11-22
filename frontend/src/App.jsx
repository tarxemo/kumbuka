import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { PageLoader } from './components/ui'
import { useAuth } from './lib/auth'
import { Login, Register } from './pages/Auth'
import DiscussionDetail from './pages/DiscussionDetail'
import Discussions from './pages/Discussions'
import Inbox from './pages/Inbox'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'
import Projects from './pages/Projects'
import Review from './pages/Review'
import Settings from './pages/Settings'
import Tasks from './pages/Tasks'
import Today from './pages/Today'

function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="flex h-screen items-center justify-center"><PageLoader /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Today />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="discussions" element={<Discussions />} />
        <Route path="discussions/:id" element={<DiscussionDetail />} />
        <Route path="people" element={<People />} />
        <Route path="people/:id" element={<PersonDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="review" element={<Review />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
