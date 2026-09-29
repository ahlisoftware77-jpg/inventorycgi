

async function testSendMail() {
  const payload = {
    to: ['triyadi72@gmail.com', '00563@china-glaze.co.id'],
    subject: '[Helpdesk] Test Local Script',
    html: '<h1>This is a test from local script</h1>'
  };
  
  // Test local API
  try {
    const res = await fetch('http://localhost:9003/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log('Local API response:', res.status, text);
  } catch (e) {
    console.error('Local API Error:', e.message);
  }

  // Test Production API
  try {
    const res = await fetch('https://inventorycgi.vercel.app/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log('Production API response:', res.status, text);
  } catch (e) {
    console.error('Production API Error:', e.message);
  }
}

testSendMail();
