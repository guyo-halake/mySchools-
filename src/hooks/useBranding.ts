import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { School } from '../types';

export function useBranding() {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      const hostname = window.location.hostname;
      const urlParams = new URLSearchParams(window.location.search);
      const testSubdomain = urlParams.get('s'); // Allow ?s=alliance for local testing
      
      let subdomain = testSubdomain;

      if (!subdomain) {
        // Fallback to hostname detection if no test param exists
        if (
          hostname === 'localhost' || 
          hostname === 'p3l.dev' || 
          (!hostname.endsWith('myschool.vercel.app') && !hostname.endsWith('vercel.app'))
        ) {
           setLoading(false);
           return;
        }
        subdomain = hostname.split('.')[0];
      }

      if (!subdomain || subdomain === 'www' || subdomain === 'app') {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('subdomain', subdomain)
          .maybeSingle();

        if (!error && data) {
          setSchool(data);
        }
      } catch (err) {
        console.error('Branding fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return { school, loading };
}
