import { Link } from 'react-router-dom'
export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">ONE CAMPUS. EVERY MOMENT.</p>
        <h1>Events that bring your campus to life.</h1>
        <p>Discover, register, coordinate, and celebrate - all in one place.</p>
        <div>
          <Link className="button" to="/events">
            Explore events
          </Link>
          <Link className="button ghost" to="/signup">
            Create an account
          </Link>
        </div>
      </section>
      <section className="feature-grid">
        <article>
          <b>01</b>
          <h2>Discover</h2>
          <p>Browse approved events across technical, cultural, sport, and academic categories.</p>
        </article>
        <article>
          <b>02</b>
          <h2>Register</h2>
          <p>Complete each event's custom registration form before its deadline.</p>
        </article>
        <article>
          <b>03</b>
          <h2>Attend</h2>
          <p>Keep your approved digital QR pass ready for event entry.</p>
        </article>
      </section>
    </>
  )
}
