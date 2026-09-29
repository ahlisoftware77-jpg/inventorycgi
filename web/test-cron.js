

async function testCron() {
  try {
    const res = await fetch('https://inventorycgi.vercel.app/api/cron/cleanup-expired');
    const text = await res.text();
    console.log('Cron response:', res.status, text);
  } catch (e) {
    console.error('Cron Error:', e.message);
  }
}

testCron();
