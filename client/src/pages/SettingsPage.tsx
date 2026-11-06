import { Link } from 'react-router-dom';
import ComingSoon from '../components/ui/ComingSoon';
import PageHeader from '../components/ui/PageHeader';
import { SettingsIcon } from '../components/ui/Icons';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function SettingsPage() {
  useDocumentTitle('Settings');
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Settings"
        subtitle={
          <>
            App preferences and connected services. Looking for your profile? Go to{' '}
            <Link to="/account" className="link">
              Account
            </Link>
            .
          </>
        }
      />
      <ComingSoon
        icon={SettingsIcon}
        title="Settings are coming soon"
        description="This is where you’ll tailor Life Admin to how you work."
        planned={['Reminder and notification preferences', 'Connect email and calendar', 'Appearance and time zone']}
      />
    </div>
  );
}
