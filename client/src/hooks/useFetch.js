import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';

// const { data, loading, error, reload, setData } = useFetch('/notices', { params: { q } })
export function useFetch(url, { params, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: !!enabled, error: null });
  const ticket = useRef(0);
  const key = JSON.stringify([url, params]);

  const load = useCallback(async () => {
    if (!enabled || !url) return;
    const mine = ++ticket.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.get(url, { params });
      if (mine === ticket.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (mine === ticket.current) setState({ data: null, loading: false, error: errorMessage(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => { load(); }, [load]);
  const setData = useCallback((d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })), []);
  return { ...state, reload: load, setData };
}
