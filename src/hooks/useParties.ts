import { useState, useEffect } from 'react';

interface Party {
  id: number;
  name: string;
  balance: number;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  total_orders: number;
  total_amount_paid: number;
  last_transaction_date?: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: number;
  party_id: number;
  type: 'payment' | 'order' | 'adjustment';
  amount: number;
  description?: string;
  balance_after: number;
  created_by: string;
  created_at: string;
  parties?: { name: string };
}

export const useParties = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParties = async () => {
    try {
      const response = await fetch('/api/parties');
      if (!response.ok) throw new Error('Failed to fetch parties');
      const data = await response.json();
      setParties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parties');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/parties/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    }
  };

  const addParty = async (party: { name: string; balance?: number; phone?: string; email?: string; address?: string }) => {
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(party),
      });
      
      if (!response.ok) throw new Error('Failed to add party');
      
      await fetchParties();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add party');
      return false;
    }
  };

  const updateParty = async (id: number, updates: Partial<Party>) => {
    try {
      const response = await fetch(`/api/parties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update party');
      
      await fetchParties();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update party');
      return false;
    }
  };

  const deleteParty = async (id: number) => {
    try {
      const response = await fetch(`/api/parties/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete party');
      
      await fetchParties();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete party');
      return false;
    }
  };

  const addTransaction = async (partyId: number, transaction: {
    type: 'payment' | 'order' | 'adjustment';
    amount: number;
    description?: string;
  }) => {
    try {
      const response = await fetch(`/api/parties/${partyId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) throw new Error('Failed to add transaction');
      
      await Promise.all([fetchParties(), fetchTransactions()]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchParties(), fetchTransactions()]);
      setLoading(false);
    };
    loadData();
  }, []);

  return {
    parties,
    transactions,
    loading,
    error,
    fetchParties,
    fetchTransactions,
    addParty,
    updateParty,
    deleteParty,
    addTransaction,
    setError
  };
};