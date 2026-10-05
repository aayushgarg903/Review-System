const { createClient } = require('@supabase/supabase-js');


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminUser() {
  console.log('Creating user...');
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'password123',
    email_confirm: true
  });

  if (userError) {
    console.error('Error creating user:', userError.message);
    // If user already exists, we can still fetch the ID
  }
  
  // Get the user ID
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const testUser = users.find(u => u.email === 'test@example.com');

  if (testUser) {
    console.log('User created! ID:', testUser.id);
    
    // Update the test-cafe client to be owned by this user
    console.log('Linking to test-cafe business...');
    const { error: updateError } = await supabase
      .from('clients')
      .update({ owner_user_id: testUser.id })
      .eq('slug', 'test-cafe');
      
    if (updateError) {
      console.error('Error linking client:', updateError.message);
    } else {
      console.log('Successfully linked test-cafe to test@example.com!');
    }
  }
}

createAdminUser();
