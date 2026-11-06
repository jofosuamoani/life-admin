import ComingSoon from '../components/ui/ComingSoon';
import PageHeader from '../components/ui/PageHeader';
import { InboxIcon } from '../components/ui/Icons';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function InboxPage() {
  useDocumentTitle('Inbox');
  return (
    <div className="page page-narrow">
      <PageHeader title="Inbox" subtitle="Emails and documents that may need action." />
      <ComingSoon
        icon={InboxIcon}
        title="Your life-admin inbox is on its way"
        description="Inbox will gather the bills, renewals and appointments buried in your email and documents, so nothing slips through the cracks."
        planned={[
          'Spot bills, renewals and appointments in your email',
          'Turn a message into a task in one click',
          'Keep related documents with the task they belong to',
        ]}
      />
    </div>
  );
}
