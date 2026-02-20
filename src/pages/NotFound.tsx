import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-serif text-7xl sm:text-9xl font-bold text-primary/20 mb-4">
          404
        </h1>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 gradient-warm text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
