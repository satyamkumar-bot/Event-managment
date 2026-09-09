import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import CreateEvent from './pages/CreateEvent'
import Dashboard from './pages/Dashboard'
import Approvals from './pages/Approvals'
import Passes from './pages/Passes'
import TeamAccess from './pages/TeamAccess'
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Auth signup />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route
          path="/create-event"
          element={
            <ProtectedRoute roles={['college_admin', 'organizer', 'core_team', 'super_admin']}>
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute roles={['college_admin', 'core_team', 'super_admin']}>
              <TeamAccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute roles={['core_team', 'super_admin']}>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passes"
          element={
            <ProtectedRoute>
              <Passes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  )
}
