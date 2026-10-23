import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div>
        <Link to="/" className="inline-block text-ink"><Logo light={false} /></Link>
        <h1 className="mt-8 font-display text-6xl font-bold">404</h1>
        <p className="mt-2 text-mute">This page is not on the timetable. It may have moved, or the link is mistyped.</p>
        <Link to="/app" className="btn btn-primary mt-6">Go to my dashboard</Link>
      </div>
    </div>
  );
}
