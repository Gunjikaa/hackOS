import { spawn } from 'child_process';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log('--- STEP 1: Starting Express Backend on Port 5000 ---');
  const backend = spawn('node', ['backend/dist/server.js'], { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  let backendOk = false;
  for (let i = 0; i < 10; i++) {
    await wait(1000);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/v1/health');
      if (res.ok) {
        const body = await res.json();
        console.log('Backend /api/v1/health responded with HTTP 200:');
        console.log(JSON.stringify(body, null, 2));
        backendOk = true;
        break;
      }
    } catch (e) {
      console.log(`[Attempt ${i + 1}] Waiting for backend: ${e.message}`);
    }
  }

  if (!backendOk) {
    try { backend.kill(); } catch (e) {}
    throw new Error('Backend failed to respond on port 5000');
  }

  console.log('\n--- STEP 2: Starting Next.js Frontend on Port 3000 ---');
  const frontend = spawn('npx', ['next', 'start', 'frontend', '-p', '3000'], {
    stdio: 'inherit',
    shell: true,
  });

  let frontendOk = false;
  let proxyOk = false;

  for (let i = 0; i < 15; i++) {
    await wait(1000);
    try {
      if (!frontendOk) {
        const pageRes = await fetch('http://127.0.0.1:3000/');
        if (pageRes.ok) {
          console.log('Frontend home page rendered successfully with HTTP', pageRes.status);
          frontendOk = true;
        }
      }

      const proxyRes = await fetch('http://127.0.0.1:3000/api/v1/health');
      if (proxyRes.ok) {
        const proxyBody = await proxyRes.json();
        console.log('Next.js API proxy (/api/v1/health -> port 5000) responded with HTTP 200:');
        console.log(JSON.stringify(proxyBody, null, 2));
        proxyOk = true;
        break;
      }
    } catch (e) {
      console.log(`[Attempt ${i + 1}] Waiting for frontend/proxy: ${e.message}`);
    }
  }

  // Terminate servers
  try { backend.kill(); } catch (e) {}
  try {
    if (frontend.pid) {
      spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']);
    }
  } catch (e) {}

  if (!frontendOk) {
    throw new Error('Frontend failed to respond on port 3000');
  }

  if (!proxyOk) {
    throw new Error('Next.js API proxy failed to forward /api/v1/health to backend');
  }

  console.log('\n======================================================');
  console.log('✓ ALL TASK 1 VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
