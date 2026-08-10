async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'testuser1@example.com',
        password: 'password123'
      })
    });
    const data = await res.json();
    console.log('Signup Result:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
