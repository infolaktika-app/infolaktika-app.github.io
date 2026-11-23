import { Books, CodeBadge, Crystal, Cube, Gamepad, Laptop, Logo, Planet, Rocket, Trophy } from '../components/Art';
import { MobileHeader } from '../components/MobileHeader';
import { RobotBuddy } from '../components/RobotBuddy';
import { ThemeToggle } from '../components/ThemeToggle';
import { IArrowR } from '../components/Icons';
import { CATEGORIES } from '../lib/constants';
import { Link } from '../lib/router';
import { MadeBy } from '../components/MadeBy';

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <MobileHeader className="!bg-transparent !border-transparent !backdrop-blur-none !static relative z-10 sm:hidden" home="/" left={<ThemeToggle />} right={<Link to="/login" className="btn btn-soft btn-sm">Кіру</Link>} />
      <header className="relative z-10 mx-auto hidden max-w-7xl items-center justify-between px-5 py-5 sm:flex sm:px-8">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link to="/login" className="btn btn-ghost btn-sm">Кіру</Link>
          <Link to="/register" className="btn btn-primary btn-sm sm:px-5 sm:py-3">Тіркелу</Link>
        </div>
      </header>

      <section data-sparkle className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="fade-up">
          <span className="chip bg-card text-brand shadow-[0_3px_0_var(--edge)]">💎 Информатиканы ойнап үйренетін платформа</span>
          <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Комикс оқы. Ойын ойна.<br />
            <span className="bg-gradient-to-r from-brand via-violet to-leaf bg-clip-text text-transparent">IT шебері бол.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/60">
            INFOLAKTIKA — суретті комикстер, интерактивті ойындар, электрондық кітаптар мен кристалл жинау жүйесі арқылы
            информатиканы қызықты әрі түсінікті ететін оқу кеңістігі.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-primary px-7 py-4 text-base">Тіркелу <IArrowR /></Link>
            <Link to="/login" className="btn btn-soft px-7 py-4 text-base">Менде аккаунт бар</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold text-ink/55">
            <span>🦸 Оқу комикстері</span><span>🎮 8 түрлі ойын</span><span>📚 PDF кітапхана</span><span>🏆 Рейтинг пен жетістік</span>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[560px]">
          <div className="absolute inset-[8%] rounded-[48px] bg-gradient-to-br from-[#2A6B7F] via-[#17404E] to-[#0B1D24] shadow-[0_40px_80px_-30px_rgba(var(--shade),.7)]" />
          <div className="absolute inset-[8%] overflow-hidden rounded-[48px]">
            <div className="dot-grid absolute inset-0 opacity-25" />
            <Planet className="absolute -right-6 top-6 w-40 opacity-90 spin-slow" />
            <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-leaf/25 blur-3xl" />
          </div>
          <Laptop className="float-slow pointer-events-none absolute bottom-[14%] left-[12%] w-[54%]" />
          <RobotBuddy className="absolute bottom-[14%] right-[5%] aspect-[220/240] w-[40%]" />
          <Books className="float-r pointer-events-none absolute left-0 top-[8%] w-[30%]" />
          <Gamepad className="float pointer-events-none absolute right-[2%] top-[4%] w-[26%]" style={{ animationDelay: '1s' }} />
          <Crystal className="float pointer-events-none absolute left-[44%] top-[4%] w-10 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" />
          <Crystal tone="green" className="float-slow pointer-events-none absolute bottom-[4%] left-[8%] w-8 drop-shadow-[0_0_14px_rgba(140,192,113,.75)]" style={{ animationDelay: '.8s' }} />
          <Crystal tone="green" className="float pointer-events-none absolute right-[32%] top-[22%] w-6 drop-shadow-[0_0_14px_rgba(140,192,113,.75)]" style={{ animationDelay: '1.6s' }} />
          <CodeBadge className="float-slow pointer-events-none absolute left-[2%] top-[48%] w-[18%]" style={{ animationDelay: '2s' }} />
          <Cube className="float pointer-events-none absolute bottom-[2%] right-[36%] w-14" hue="sun" />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3 stagger">
          {[
            { art: <Books className="h-24" />, t: 'Комикстер мен кітаптар', d: 'Мұғалім жүктеген PDF комикстерді тікелей сайтта оқы. Қай бетте тоқтағаның сақталады.' },
            { art: <Gamepad className="h-24" />, t: '8 түрлі білім ойыны', d: 'Quiz Battle, код пазл, қатені тап, алгоритмдік лабиринт және тағы басқалары.' },
            { art: <Trophy className="h-24" />, t: 'Кристалл, деңгей, рейтинг', d: 'Ұпай жина, жетістік ал, күнделікті тапсырма орында, сыныптастарыңмен жарыс.' },
          ].map((f) => (
            <div key={f.t} className="card card-hover p-7">
              <div className="mb-4 flex h-28 items-end">{f.art}</div>
              <h3 className="text-xl font-extrabold">{f.t}</h3>
              <p className="mt-2 text-ink/60">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="card relative mt-8 overflow-hidden p-8 sm:p-10">
          <Rocket className="absolute -bottom-4 right-6 hidden w-28 float sm:block" />
          <h2 className="text-2xl font-extrabold">10 тақырып — бір платформада</h2>
          <div className="mt-5 flex flex-wrap gap-2.5 sm:pr-36">
            {CATEGORIES.map((c) => (
              <span key={c.slug} className="chip tone-text !px-4 !py-2 !text-sm" style={{ background: c.color + '14', color: c.color }}>{c.icon} {c.label}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-haze py-8 text-center text-sm text-ink/45">
        <MadeBy className="mb-4" />
        © {new Date().getFullYear()} INFOLAKTIKA · <Link to="/admin/login" className="hover:text-brand">Әкімші кіруі</Link>
      </footer>
    </div>
  );
}
