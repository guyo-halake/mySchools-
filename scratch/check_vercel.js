
const VERCEL_TOKEN = 'process.env.VITE_VERCEL_TOKEN'; // This will be replaced by the actual env var if I run it via terminal, but I can't easily.
// Actually, I'll just use a command to fetch it since I have the token in .env

async function checkVercel() {
  const token = 'YOUR_TOKEN'; // I'll get this from .env
  const res = await fetch('https://api.vercel.com/v9/projects/resultsystem', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const project = await res.json();
  console.log('Project Environments:');
  console.log(JSON.stringify(project.targets, null, 2));
  
  const res2 = await fetch('https://api.vercel.com/v6/deployments?limit=5&projectId=resultsystem', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const deployments = await res2.json();
  console.log('\nLatest Deployments for resultsystem:');
  deployments.deployments.forEach(d => {
    console.log(`- ${d.name} (${d.url}) - Branch: ${d.meta?.githubCommitRef}`);
  });
}
