import { useEffect, useRef, useState } from 'react';
import { coverService } from '../services/api';
import type { BundleLineInput, Quote, QuoteMemberInput } from '../types';

/** Live price from the server, debounced. Keeps the previous quote on screen while the next one loads. */
export function useQuote(items: BundleLineInput[], members: QuoteMemberInput[], holderDateOfBirth?: string, coverMainMember = true) {
  const [quote, setQuote] = useState<Quote>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const seq = useRef(0);
  const key = JSON.stringify([items, members, holderDateOfBirth, coverMainMember]);

  useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      coverService.quote(items, members, holderDateOfBirth, coverMainMember)
        .then((q) => { if (mine === seq.current) { setQuote(q); setError(undefined); } })
        .catch((e: Error) => { if (mine === seq.current) setError(e.message); })
        .finally(() => { if (mine === seq.current) setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading, error };
}
