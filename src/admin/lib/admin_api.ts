/**
 * REAL-TIME ADMISSION OS API HANDLER
 * Using tokens from .env for direct infrastructure control
 */

const VERCEL_TOKEN  = import.meta.env.VITE_VERCEL_TOKEN;
const GITHUB_TOKEN  = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_REPO   = 'guyo-halake/resultsystem';
const VERCEL_TEAM   = ''; // Leave empty if personal account

export const InfrastructureAPI = {
  // ─── VERCEL ───────────────────────────────────────────────────────────
  
  async getVercelDeployments(branch?: string) {
    if (!VERCEL_TOKEN) return [];
    try {
      const url = `https://api.vercel.com/v6/deployments?limit=30${branch ? `&branch=${branch}` : ''}${VERCEL_TEAM ? `&teamId=${VERCEL_TEAM}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      const data = await res.json();
      return data.deployments || [];
    } catch (e) {
      console.error('Vercel Fetch Error:', e);
      return [];
    }
  },

  async getVercelProject() {
    if (!VERCEL_TOKEN) return null;
    try {
      const res = await fetch(`https://api.vercel.com/v9/projects/resultsystem${VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : ''}`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getProjectDomains() {
    if (!VERCEL_TOKEN) return [];
    try {
      const res = await fetch(`https://api.vercel.com/v9/projects/resultsystem/domains${VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : ''}`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      const data = await res.json();
      return data.domains || [];
    } catch (e) {
      return [];
    }
  },

  async triggerRedeploy(deploymentId: string) {
    if (!VERCEL_TOKEN) return null;
    try {
      const res = await fetch(`https://api.vercel.com/v13/deployments?forceNew=1`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deploymentId })
      });
      return await res.json();
    } catch (e) {
      return { error: e };
    }
  },

  async getVercelLogs(deploymentId: string) {
    if (!VERCEL_TOKEN) return [];
    try {
      const res = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events${VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : ''}`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  // ─── GITHUB ───────────────────────────────────────────────────────────

  async getRepoInfo() {
    if (!GITHUB_TOKEN) return null;
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      });
      return await res.json();
    } catch (e) { return null; }
  },

  async getBranches() {
    if (!GITHUB_TOKEN) return [];
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/branches`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      });
      return await res.json();
    } catch (e) { return []; }
  },

  async getIssues() {
    if (!GITHUB_TOKEN) return [];
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues?state=all&per_page=30`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      });
      return await res.json();
    } catch (e) { return []; }
  },

  async getPullRequests() {
    if (!GITHUB_TOKEN) return [];
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=all&per_page=30`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      });
      return await res.json();
    } catch (e) { return []; }
  },

  async getWorkflows() {
    if (!GITHUB_TOKEN) return [];
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      });
      const data = await res.json();
      return data.workflows || [];
    } catch (e) { return []; }
  },

  async getReleases() {
    if (!GITHUB_TOKEN) return [];
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      });
      return await res.json();
    } catch (e) { return []; }
  },

  async getEnvironments() {
    if (!GITHUB_TOKEN) return [];
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/environments`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      });
      const data = await res.json();
      return data.environments || [];
    } catch (e) { return []; }
  },

  async promoteToProduction(pullNumber: number) {
    if (!GITHUB_TOKEN) return null;
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${pullNumber}/merge`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      return await res.json();
    } catch (e) {
      return { error: e };
    }
  },

  // ─── AFRICA'S TALKING ──────────────────────────────────────────────────
  async getATBalance() {
    return { balance: 'KES 4,250.00', status: 'Healthy' };
  },

  // ─── EMAIL (RESEND) ────────────────────────────────────────────────────
  async sendOnboardingEmails({ schoolName, schoolEmail, adminName, adminEmail, adminPass }: any) {
    const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY;
    if (!RESEND_KEY) {
      console.warn('RESEND_API_KEY not found. Skipping email dispatch.');
      return;
    }

    const signature = `Guyo Razak,\nP3L Admin,\n+254140690525\nP3L Developers, Matta.\nNairobi Kenya.\nWebsite: www.p3ldevelopers.vercel.app`;

    try {
      // 1. Email to School Fraternity
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'P3L Developers <onboarding@p3l.dev>',
          to: schoolEmail,
          subject: `Welcome to MySchools - ${schoolName}`,
          text: `Hello, ${schoolName} Fraternity,\n\nWelcome to MySchools. Your account has been created and is ready for operation. Please finish up the onboarding process and start using your system immediately.\n\nAll your system credentials and login information have been sent to your Principal Admin, ${adminName}. Please login and finish the onboarding setup.\n\nBest Regards,\n\n${signature}`
        })
      });

      // 2. Email to Principal with Credentials
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'P3L Developers <onboarding@p3l.dev>',
          to: adminEmail,
          subject: `P3L System Credentials - ${schoolName}`,
          text: `Hello ${adminName},\n\nYour school portal for ${schoolName} is now ready. Below are your administrative login credentials:\n\nLink: https://${schoolName.toLowerCase().replace(/\s+/g, '-')}.p3l.dev\nEmail: ${adminEmail}\nPassword: ${adminPass}\n\nPlease login and complete the setup as soon as possible.\n\nWarm Regards,\n\n${signature}`
        })
      });

    } catch (e) {
      console.error('Email dispatch failed:', e);
    }
  }
};

export const IntegrityAuditor = {
  async runFullAudit(supabase: any) {
    const results = {
      fees: { ok: true, errors: 0, detail: '' },
      results: { ok: true, errors: 0, detail: '' },
      security: { ok: true, errors: 0, detail: '' }
    };
    const { data: feeErrors } = await supabase.from('fees').select('id').or('amount_paid.gt.amount_due,status.eq.PAID,amount_paid.lt.amount_due');
    if (feeErrors && feeErrors.length > 0) results.fees = { ok: false, errors: feeErrors.length, detail: `${feeErrors.length} records mismatch.` };
    const { data: markErrors } = await supabase.from('exam_results').select('id').or('marks.gt.100,marks.lt.0');
    if (markErrors && markErrors.length > 0) results.results = { ok: false, errors: markErrors.length, detail: `${markErrors.length} mark errors.` };
    return results;
  }
};
