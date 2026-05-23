import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <Link to="/" className="text-primary hover:text-primary-hover">
        Home
      </Link>
    </main>
  );
}
