import { useEffect, useState } from 'react'
import { requireSupabase } from '../services/supabase'
export default function TeamAccess() {
  const [profile, setProfile] = useState(null),
    [events, setEvents] = useState([]),
    [eventId, setEventId] = useState(''),
    [memberCode, setMemberCode] = useState(''),
    [staffRole, setStaffRole] = useState('organizer'),
    [staff, setStaff] = useState([]),
    [message, setMessage] = useState('')
  async function load() {
    try {
      const db = requireSupabase()
      const {
        data: { user },
      } = await db.auth.getUser()
      const { data: p } = await db.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: e, error } = await db
        .from('events')
        .select('id,title,event_type')
        .eq('college_id', p.college_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setEvents(e || [])
      if (e?.[0]) setEventId((x) => x || e[0].id)
    } catch (e) {
      setMessage(e.message)
    }
  }
  async function loadStaff(id) {
    if (!id) return
    const db = requireSupabase()
    const { data, error } = await db
      .from('event_staff')
      .select(
        'id,staff_role, profile:profiles!event_staff_user_id_fkey(full_name,email,access_code)'
      )
      .eq('event_id', id)
    setStaff(data || [])
    if (error) setMessage(error.message)
  }
  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    loadStaff(eventId)
  }, [eventId])
  async function assign(e) {
    e.preventDefault()
    try {
      const db = requireSupabase()
      const { data: user, error: lookupError } = await db
        .from('profiles')
        .select('id,full_name,email,college_id')
        .eq('access_code', memberCode.trim().toUpperCase())
        .single()
      if (lookupError || !user)
        throw new Error('No registered student was found with that member code.')
      if (user.college_id !== profile.college_id)
        throw new Error('That member belongs to a different college.')
      const {
        data: { user: me },
      } = await db.auth.getUser()
      const { error } = await db
        .from('event_staff')
        .insert({ event_id: eventId, user_id: user.id, staff_role: staffRole, assigned_by: me.id })
      if (error) throw error
      setMemberCode('')
      setMessage('Team member assigned. They should sign out and sign in again.')
      loadStaff(eventId)
    } catch (err) {
      setMessage(err.message)
    }
  }
  return (
    <section>
      <p className="eyebrow">FEST ACCESS</p>
      <h1>Assign your event team</h1>
      <p className="muted">
        College admin and Core Team can assign registered students as organizers or Core Team for a
        specific fest, using their member code.
      </p>
      {!profile?.college_id ? (
        <p className="warning">
          Your account is not linked to a college yet. Complete the migration setup in the guide
          below.
        </p>
      ) : (
        <>
          <label>
            Choose a main fest or event
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.event_type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </label>
          <form className="assign-form" onSubmit={assign}>
            <label>
              Student member code
              <input
                required
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="USR-AB12CD34"
              />
            </label>
            <label>
              Give access as
              <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                <option value="organizer">Organizer</option>
                <option value="core_team">Core Team</option>
              </select>
            </label>
            <button>Assign access</button>
          </form>
          <h2>Current team</h2>
          {staff.length ? (
            <div className="table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Member code</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td>{s.profile?.full_name}</td>
                      <td>{s.profile?.email}</td>
                      <td>{s.profile?.access_code}</td>
                      <td>
                        <span className="pill">{s.staff_role.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No team members assigned yet.</p>
          )}
        </>
      )}
      {message && <p className="notice">{message}</p>}
    </section>
  )
}
