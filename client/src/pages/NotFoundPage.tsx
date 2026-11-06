import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import { CompassIcon } from '../components/ui/Icons';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="page page-narrow">
      <section className="card">
        <EmptyState
          icon={CompassIcon}
          title="Page not found"
          description="The page you’re looking for doesn’t exist or may have moved."
          action={
            <Link to="/" className="button primary">
              Back to dashboard
            </Link>
          }
        />
      </section>
    </div>
  );
}
