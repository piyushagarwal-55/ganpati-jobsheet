import { useState, useEffect } from 'react';
import { createClient } from '../../supabase/client';

export function usePartyBalance(partyId: number | null) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partyId) return;

    const supabase = createClient();

    const fetchBalance = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('parties')
        .select('balance')
        .eq('id', partyId)
        .single();
      
      if (data) setBalance(data.balance);
      setLoading(false);
    };

    fetchBalance();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`party:${partyId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'parties',
        filter: `id=eq.${partyId}`
      }, (payload: any) => {
        setBalance(payload.new.balance);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [partyId]);

  return { balance, loading };
}