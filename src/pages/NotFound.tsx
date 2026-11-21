import { Crystal, Robot } from '../components/Art';
import { Link } from '../lib/router';
import { MadeBy } from '../components/MadeBy';

export default function NotFound({ inApp = false }: { inApp?: boolean }) {
  return (
    <div className={`grid place-items-center px-6 text-center ${inApp ? 'min-h-[70vh]' : 'min-h-screen'}`}>
      <div className="fade-up">
        <div className="relative mx-auto w-fit"><Robot className="h-44 w-44 float" /><Crystal className="float-slow absolute -right-4 top-4 w-8 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" /></div>
        <p className="mt-6 text-6xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-2xl font-extrabold">Бұл бет адасып кетті</h1>
        <p className="mt-2 text-ink/55">Робот бұл жерде ешқандай кристалл таппады.</p>
        <Link to={inApp ? '/app' : '/'} className="btn btn-primary mt-6">Басты бетке қайту</Link>
        {!inApp && <MadeBy className="mt-10" />}
      </div>
    </div>
  );
}
