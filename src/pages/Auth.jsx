import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requireSupabase } from '../services/supabase'
export default function Auth({ signup = false }) {
  const [form, setForm] = useState({
      name: '',
      email: '',
      password: '',
      roll: '',
      college: '',
      accountType: 'student',
    }),
    [msg, setMsg] = useState(''),
    [busy, setBusy] = useState(false),
    nav = useNavigate()
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      const db = requireSupabase()
      if (signup) {
        const { error } = await db.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.name,
              roll_number: form.roll,
              college_name: form.college,
              account_type: form.accountType,
            },
          },
        })
        if (error) throw error
        setMsg('Account created. Check your email to confirm it, then sign in.')
      } else {
        const { error } = await db.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        nav('/dashboard')
      }
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="auth-card">
      <p className="eyebrow">EVENTSPHERE</p>
      <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
      <form onSubmit={submit}>
        {signup && (
          <>
            <label>
              I am registering as
              <select name="accountType" value={form.accountType} onChange={change}>
                <option value="student">Student / participant</option>
                <option value="college">College / organization</option>
              </select>
            </label>
            <label>
              {form.accountType === 'college' ? 'Admin contact name' : 'Full name'}
              <input name="name" required value={form.name} onChange={change} />
            </label>
            {form.accountType === 'student' && (
              <label>
                Roll number
                <input name="roll" value={form.roll} onChange={change} />
              </label>
            )}
            <label>
              {form.accountType === 'college'
                ? 'College / organization name'
                : 'College / institution'}
              <input name="college" required value={form.college} onChange={change} />
            </label>
          </>
        )}
        <label>
          Email
          <input name="email" type="email" required value={form.email} onChange={change} />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength="6"
            required
            value={form.password}
            onChange={change}
          />
        </label>
        <button disabled={busy}>
          {busy ? 'Please wait...' : signup ? 'Create account' : 'Sign in'}
        </button>
      </form>
      {signup && (
        <p className="muted">
          College/organization registration creates a College Admin account. Students use their
          college name to join that college.
        </p>
      )}
      {msg && <p className="notice">{msg}</p>}
      <p>
        {signup ? 'Already have an account?' : 'New here?'}{' '}
        <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create one'}</Link>
      </p>
    </section>
  )
}
