import { Spinner } from './ui/Spinner';

export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" className="text-primary" />
    </div>
  );
}
