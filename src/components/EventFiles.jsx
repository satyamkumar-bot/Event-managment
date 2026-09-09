import { useEffect, useState } from 'react'
import { requireSupabase } from '../services/supabase'

const MAX_FILE_SIZE = 10 * 1024 * 1024
export default function EventFiles({ event }) {
  const [files, setFiles] = useState([]),
    [file, setFile] = useState(null),
    [type, setType] = useState('document'),
    [message, setMessage] = useState(''),
    [manager, setManager] = useState(false),
    [uploading, setUploading] = useState(false)
  const load = async () => {
    try {
      const db = requireSupabase()
      const { data } = await db
        .from('event_files')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
      setFiles(data || [])
      const {
        data: { user },
      } = await db.auth.getUser()
      if (!user) return
      const { data: profile } = await db
        .from('profiles')
        .select('role,college_id')
        .eq('id', user.id)
        .single()
      setManager(
        event.organizer_id === user.id ||
          ['college_admin', 'core_team', 'super_admin'].includes(profile?.role)
      )
    } catch (e) {
      setMessage(e.message)
    }
  }
  useEffect(() => {
    load()
  }, [event.id])
  async function upload(e) {
    e.preventDefault()
    if (!file) return
    if (file.size > MAX_FILE_SIZE) return setMessage('Choose a file smaller than 10 MB.')
    setUploading(true)
    setMessage('')
    try {
      const db = requireSupabase()
      const {
        data: { user },
      } = await db.auth.getUser()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${event.id}/${Date.now()}-${safeName}`
      const { error: storageError } = await db.storage
        .from('event-files')
        .upload(path, file, { upsert: false })
      if (storageError) throw storageError
      const { data: urlData } = db.storage.from('event-files').getPublicUrl(path)
      const { error: metaError } = await db
        .from('event_files')
        .insert({
          event_id: event.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: type,
          is_public: true,
        })
      if (metaError) {
        await db.storage.from('event-files').remove([path])
        throw metaError
      }
      setFile(null)
      e.target.reset()
      setMessage('File uploaded successfully.')
      load()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setUploading(false)
    }
  }
  return (
    <section className="event-files">
      <div className="section-title">
        <div>
          <p className="eyebrow">EVENT RESOURCES</p>
          <h2>Posters & documents</h2>
        </div>
      </div>
      {files.length ? (
        <div className="file-list">
          {files.map((item) => (
            <a
              key={item.id}
              className="file-item"
              href={item.file_url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="pill">{item.file_type}</span>
              <strong>{item.file_name}</strong>
              <span>Open ↗</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="muted">No public posters or documents have been added yet.</p>
      )}
      {manager && (
        <form className="upload-form" onSubmit={upload}>
          <h3>Upload a poster or document</h3>
          <label>
            File type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="poster">Poster</option>
              <option value="rulebook">Rulebook</option>
              <option value="schedule">Schedule</option>
              <option value="document">Document</option>
              <option value="venue_map">Venue map</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            File (maximum 10 MB)
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xlsx"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button disabled={uploading}>{uploading ? 'Uploading...' : 'Upload file'}</button>
        </form>
      )}
      {message && <p className={message.includes('success') ? 'notice' : 'error'}>{message}</p>}
    </section>
  )
}
