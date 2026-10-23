import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const Ctx = createContext({ kids: [], child: undefined, activeChild: null, setChild: () => {} });
export const useChild = () => useContext(Ctx);

// Guardians can have several children; every child-aware page reads the active one from here.
export function ChildProvider({ children }) {
  const { user } = useAuth();
  const kids = user?.role === 'guardian' ? user.children || [] : [];
  const [id, setId] = useState(() => localStorage.getItem('setu.child'));
  const activeChild = kids.find((k) => k._id === id) || kids[0] || null;
  const setChild = useCallback((v) => { setId(v); localStorage.setItem('setu.child', v); }, []);
  const value = useMemo(() => ({ kids, child: activeChild?._id, activeChild, setChild }), [kids, activeChild, setChild]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
