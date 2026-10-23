import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileText, Search } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { downloadFile } from '../lib/api';
import { Empty, LoadError, PageHeader, Panel, Skeleton } from '../components/ui';
import { fmtDate } from '../lib/format';

export default function Materials() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [text, setText] = useState(q);
  const { child } = useChild();
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => { if (text !== q) setParams(text ? { q: text } : {}, { replace: true }); }, 350);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, loading, error, reload } = useFetch('/materials/search', { params: { q, child } });

  return (
    <>
      <PageHeader title="Find materials" subtitle="Search titles and descriptions across every course you can access." />
      <div className="relative mb-5 max-w-xl">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
        <input className="input !py-2.5 !pl-10" placeholder="Search notes, slides, links..." value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </div>
      {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-48" /> : data.items.length === 0 ? (
        <Panel><Empty icon={FileText} title={q ? `Nothing matches "${q}"` : 'No materials yet'} text="Try a shorter word, or browse a course to see everything its teacher has shared." /></Panel>
      ) : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((m) => (
              <li key={m._id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: m.course?.color }} />
                <div className="min-w-[200px] flex-1">
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-sm text-mute">{m.description || m.file?.originalName || m.url}</p>
                  <p className="text-xs text-mute"><Link className="font-semibold hover:text-brand-700" to={`/app/courses/${m.course?._id}`}>{m.course?.title}</Link>, {m.uploadedBy?.name}, {fmtDate(m.createdAt)}</p>
                </div>
                {m.file ? <button className="btn btn-soft" onClick={() => downloadFile(m.file)}><Download size={16} />Download</button> : <a className="btn btn-soft" href={m.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Open</a>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
