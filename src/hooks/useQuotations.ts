import { useState, useEffect } from 'react';
import { createClient } from '../../supabase/client';
import { QuotationRequest, QuotationNote } from '@/types/database';

export const useQuotations = () => {
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [notes, setNotes] = useState<QuotationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      
      const { data: quotationsData, error: quotationsError } = await supabase
        .from('quotation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (quotationsError) throw quotationsError;

      const { data: notesData, error: notesError } = await supabase
        .from('quotation_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      setQuotations(quotationsData || []);
      setNotes(notesData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const updateQuotationStatus = async (quotationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('quotation_requests')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', quotationId);

      if (error) throw error;

      // Update local state
      setQuotations(prev => 
        prev.map(q => 
          q.id === quotationId 
            ? { ...q, status: newStatus, updated_at: new Date().toISOString() }
            : q
        )
      );
    } catch (err) {
      console.error('Error updating quotation status:', err);
      throw err;
    }
  };

  const updateQuotationPrice = async (quotationId: string, finalPrice: number) => {
    try {
      const { error } = await supabase
        .from('quotation_requests')
        .update({ 
          final_price: finalPrice,
          updated_at: new Date().toISOString() 
        })
        .eq('id', quotationId);

      if (error) throw error;

      // Update local state
      setQuotations(prev => 
        prev.map(q => 
          q.id === quotationId 
            ? { ...q, final_price: finalPrice, updated_at: new Date().toISOString() }
            : q
        )
      );
    } catch (err) {
      console.error('Error updating quotation price:', err);
      throw err;
    }
  };

  const addNote = async (quotationId: string, note: string, createdBy: string = 'Admin') => {
    try {
      const { data, error } = await supabase
        .from('quotation_notes')
        .insert({
          quotation_id: quotationId,
          note,
          created_by: createdBy
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      if (data) {
        setNotes(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding note:', err);
      throw err;
    }
  };

  const generateInvoice = async (quotationId: string) => {
    try {
      // Generate invoice number
      const { data: invoiceNumber, error: fnError } = await supabase
        .rpc('generate_invoice_number');

      if (fnError) throw fnError;

      const invoiceDate = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('quotation_requests')
        .update({ 
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          updated_at: new Date().toISOString() 
        })
        .eq('id', quotationId);

      if (error) throw error;

      // Update local state
      setQuotations(prev => 
        prev.map(q => 
          q.id === quotationId 
            ? { 
                ...q, 
                invoice_number: invoiceNumber,
                invoice_date: invoiceDate,
                updated_at: new Date().toISOString() 
              }
            : q
        )
      );

      return invoiceNumber;
    } catch (err) {
      console.error('Error generating invoice:', err);
      throw err;
    }
  };

  const deleteQuotation = async (quotationId: string) => {
    try {
      const { error } = await supabase
        .from('quotation_requests')
        .delete()
        .eq('id', quotationId);

      if (error) throw error;

      // Update local state
      setQuotations(prev => prev.filter(q => q.id !== quotationId));
      setNotes(prev => prev.filter(n => n.quotation_id !== quotationId));
    } catch (err) {
      console.error('Error deleting quotation:', err);
      throw err;
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    fetchQuotations();

    // Subscribe to realtime changes
    const quotationsSubscription = supabase
      .channel('quotation_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotation_requests'
        },
        (payload) => {
          console.log('Quotation change received!', payload);
          fetchQuotations(); // Refetch data on any change
        }
      )
      .subscribe();

    const notesSubscription = supabase
      .channel('quotation_notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotation_notes'
        },
        (payload) => {
          console.log('Note change received!', payload);
          fetchQuotations(); // Refetch data on any change
        }
      )
      .subscribe();

    return () => {
      quotationsSubscription.unsubscribe();
      notesSubscription.unsubscribe();
    };
  }, []);

  return {
    quotations,
    notes,
    loading,
    error,
    fetchQuotations,
    updateQuotationStatus,
    updateQuotationPrice,
    addNote,
    generateInvoice,
    deleteQuotation
  };
};