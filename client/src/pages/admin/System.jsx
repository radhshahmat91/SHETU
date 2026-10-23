import { useFetch } from '../../hooks/useFetch';
import { Empty, LoadError, PageHeader, PageSkeleton, Panel, Stamp } from '../../components/ui';
import { timeAgo } from '../../lib/format';

const TONE = { sent: 'ok', logged: 'info', failed: 'bad' };

export default function System() {
  const { data, loading, error, reload } = useFetch('/admin/system');
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const h = data.health;
  const tiles = [['Database', h.database === 'connected' ? <Stamp tone="ok" animate={false}>Connected</Stamp> : <Stamp tone="bad" animate={false}>{h.database}</Stamp>], ['Uptime', `${h.uptimeMin} min`], ['Server memory', `${h.memoryMb} MB`], ['Email provider', h.emailProvider], ['Accounts', h.users], ['Courses', h.courses]];

  return (
    <>
      <PageHeader title="System" subtitle="A quick health check, the email log, and what people have been doing in the portal.">
        <button className="btn btn-soft" onClick={reload}>Refresh</button>
      </PageHeader>
      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-6">
        {tiles.map(([k, v]) => <div key={k} className="bg-surface px-4 py-3.5"><p className="text-sm text-mute">{k}</p><div className="mt-1 font-display text-lg font-semibold">{v}</div></div>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Email log" pad={false}>
          {data.emails.length === 0 ? <Empty title="No emails yet" text="Notices, leave decisions and results send emails. They are listed here." /> : (
            <ul className="max-h-[460px] divide-y divide-line overflow-y-auto">
              {data.emails.map((m) => (
                <li key={m._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.subject}</p><p className="truncate text-sm text-mute">{m.to}, {timeAgo(m.createdAt)}{m.error ? `, ${m.error}` : ''}</p></div>
                  <Stamp tone={TONE[m.status]} animate={false}>{m.status}</Stamp>
                </li>
              ))}
            </ul>
          )}
          {!h.emailProvider.startsWith('SendGrid') && <p className="border-t border-line bg-marigold-500/10 px-5 py-3 text-sm">No SendGrid key is set, so emails are logged here instead of being sent. Add SENDGRID_API_KEY to server/.env to deliver them.</p>}
        </Panel>
        <Panel title="Activity" pad={false}>
          {data.activity.length === 0 ? <Empty title="No activity yet" /> : (
            <ul className="max-h-[460px] divide-y divide-line overflow-y-auto">
              {data.activity.map((a) => <li key={a._id} className="px-5 py-3"><p><span className="font-semibold">{a.user?.name || 'System'}</span> {a.action.toLowerCase()}</p><p className="text-sm text-mute">{a.detail}, {timeAgo(a.createdAt)}</p></li>)}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
