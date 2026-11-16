import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import type { SessionInfo } from '@life-admin/shared';
import { authApi } from '../../api/auth';
import { ApiError, errorMessage } from '../../api/http';
import { formatLastActive } from '../../lib/dates';
import { useToast } from '../../lib/toast';
import { useOnReturn } from '../../lib/useOnReturn';
import Alert from '../ui/Alert';
import { LaptopIcon, PhoneIcon } from '../ui/Icons';
import { TaskListSkeleton } from '../ui/Skeleton';
import Spinner from '../ui/Spinner';

export interface DevicesCardHandle {
  /** Re-fetches the list (e.g. after a password change signed other devices out). */
  reload: () => void;
}

const isPhone = (device: string) => /iPhone|Android/.test(device);

function formatSignedIn(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Where the user is signed in, with per-device and "all other devices" logout. */
const DevicesCard = forwardRef<DevicesCardHandle>(function DevicesCard(_props, ref) {
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null); // session id, or 'others'

  const load = useCallback(async () => {
    try {
      setSessions(await authApi.sessions());
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, 'Couldn’t load your devices.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useImperativeHandle(ref, () => ({ reload: () => void load() }), [load]);
  // Logins elsewhere while this page was in the background.
  useOnReturn(() => void load());

  async function revoke(session: SessionInfo) {
    setPending(session.id);
    try {
      await authApi.revokeSession(session.id);
      toast(`Logged out ${session.device}`);
    } catch (err) {
      // Already gone (it expired or was logged out elsewhere): the reload below shows that.
      if (!(err instanceof ApiError && err.status === 404)) {
        toast(errorMessage(err, 'Couldn’t log out that device. Please try again.'), { tone: 'error' });
      }
    } finally {
      setPending(null);
      void load();
    }
  }

  async function revokeOthers() {
    setPending('others');
    try {
      const { ended } = await authApi.revokeOtherSessions();
      toast(ended === 1 ? 'Logged out 1 other device' : `Logged out ${ended} other devices`);
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t log out your other devices. Please try again.'), { tone: 'error' });
    } finally {
      setPending(null);
      void load();
    }
  }

  const others = sessions?.filter((s) => !s.current) ?? [];
  // This device first, then the rest by most recent activity (the server's order).
  const ordered = sessions ? [...sessions].sort((a, b) => Number(b.current) - Number(a.current)) : [];

  return (
    <section className="card" aria-labelledby="devices-heading">
      <div className="card-header">
        <div>
          <h2 id="devices-heading">Devices</h2>
          <p className="card-subtitle">Where you’re logged in to Life Admin.</p>
        </div>
      </div>

      {loadError && !sessions && (
        <Alert
          tone="error"
          action={
            <button type="button" className="button secondary small" onClick={() => void load()}>
              Try again
            </button>
          }
        >
          {loadError}
        </Alert>
      )}

      {!sessions && !loadError && <TaskListSkeleton rows={2} />}

      {sessions && (
        <ul className="device-list">
          {ordered.map((s) => {
            const Icon = isPhone(s.device) ? PhoneIcon : LaptopIcon;
            return (
              <li key={s.id} className="device-row">
                <span className="device-icon" aria-hidden="true">
                  <Icon width={18} height={18} />
                </span>
                <div className="device-body">
                  <div className="device-name">
                    {s.device}
                    {s.current && <span className="pill">This device</span>}
                  </div>
                  <div className="device-meta">
                    {s.current ? 'Active now' : formatLastActive(s.lastActiveAt)} · Logged in{' '}
                    {formatSignedIn(s.createdAt)}
                  </div>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => void revoke(s)}
                    disabled={pending !== null}
                    aria-label={`Log out ${s.device} (${formatLastActive(s.lastActiveAt)})`}
                  >
                    {pending === s.id && <Spinner />}
                    Log out
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {others.length > 1 && (
        <div className="device-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => void revokeOthers()}
            disabled={pending !== null}
          >
            {pending === 'others' && <Spinner />}
            Log out all other devices
          </button>
        </div>
      )}
    </section>
  );
});

export default DevicesCard;
