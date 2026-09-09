import { useEffect, useState } from 'react'
import { configured, supabase } from '../services/supabase'
export default function Approvals() {
  const [events, setEvents] = useState([]),
    [msg, setMsg] = useState('')
  const load = () =>
    configured &&
    supabase
      .from('events')
      .select('*, organizer:profiles!events_organizer_id_fkey(full_name,email)')
      .in('status', ['pending', 'approved', 'changes_requested'])
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setEvents(data || [])
        setMsg(error?.message || '')
      })
  useEffect(load, [])
  async function status(id, status) {
    const { error } = await supabase.from('events').update({ status }).eq('id', id)
    setMsg(error?.message || `Event ${status}.`)
    load()
  }
  if (!configured)
    return (
      <section className="empty">
        <h1>Approval center</h1>
        <p>Connect Supabase to review event submissions.</p>
      </section>
    )
  return (
    <section>
      <p className="eyebrow">CORE TEAM</p>
      <h1>Event approval center</h1>
      <p className="muted">Only published events are visible to participants.</p>
      {events.length ? (
        events.map((e) => (
          <article className="approval" key={e.id}>
            <div>
              <span className="pill">{e.status}</span>
              <h2>{e.title}</h2>
              <p>{e.description}</p>
              <small>
                Organizer: {e.organizer?.full_name || 'Unknown'} · {e.organizer?.email}
              </small>
            </div>
            <div className="actions">
              <button onClick={() => status(e.id, 'approved')}>Approve</button>
              <button onClick={() => status(e.id, 'published')}>Publish</button>
              <button className="danger" onClick={() => status(e.id, 'rejected')}>
                Reject
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className="empty">
          <p>No submissions awaiting review.</p>
        </div>
      )}
      {msg && <p className="notice">{msg}</p>}
    </section>
  )
}
