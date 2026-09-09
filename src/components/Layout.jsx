import { Link, useNavigate } from 'react-router-dom'
import { configured, supabase } from '../services/supabase'
import { useEffect, useState } from 'react'
export default function Layout({ children }) {
  const [profile, setProfile] = useState(null)
  const nav = useNavigate()
  useEffect(() => {
    if (!configured) return
    const load = async (user) => {
      if (!user) return setProfile(null)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    supabase.auth.getUser().then(({ data: { user } }) => load(user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => load(session?.user))
    return () => subscription.unsubscribe()
  }, [])
  async function logout() {
    await supabase.auth.signOut()
    nav('/')
  }
  const canCreate = ['college_admin', 'organizer', 'core_team', 'super_admin'].includes(
    profile?.role
  )
  return (
    <>
      <header>
        <Link className="brand" to="/">
          EventSphere
        </Link>
        <nav>
          <Link to="/events">Events</Link>
          {profile && (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/passes">My passes</Link>
            </>
          )}
          {canCreate && <Link to="/create-event">Create event</Link>}
          {['college_admin', 'core_team', 'super_admin'].includes(profile?.role) && (
            <Link to="/team">Team access</Link>
          )}
          {['core_team', 'super_admin'].includes(profile?.role) && (
            <Link to="/approvals">Approvals</Link>
          )}
          {profile ? (
            <button className="text-button" onClick={logout}>
              Sign out
            </button>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="nav-cta" to="/signup">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>
      {!configured && (
        <div className="config">
          Demo interface ready. Add Supabase credentials in <code>.env</code> to connect data and
          authentication.
        </div>
      )}
      <main>{children}</main>
    </>
  )
}
