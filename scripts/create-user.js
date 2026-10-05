const { createClient } = require('@supabase/supabase-js');


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminUser() {
  const email = process.env.TEST_USER_EMAIL || process.argv[2];
  const password = process.env.TEST_USER_PASSWORD || process.argv[3];
  const slug = process.argv[4];
  
  if (!email || !password || !slug) {
    console.error('Usage: node create-user.js <email> <password> <client_slug>');
    process.exit(1);
  }

  console.log('Creating user...');
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (userError) {
    console.error('Error creating user:', userError.message);
    // If user already exists, we can still fetch the ID
  }
  
  // Get the user ID
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const testUser = users.find(u => u.email === email);

  if (testUser) {
    console.log('User created! ID:', testUser.id);
    
    console.log(`Linking to ${slug} business...`);
    const { error: updateError } = await supabase
      .from('clients')
      .update({ owner_user_id: testUser.id })
      .eq('slug', slug);
      
    if (updateError) {
      console.error('Error linking client:', updateError.message);
    } else {
      console.log(`Successfully linked ${slug} to ${email}!`);
    }
  }
}

createAdminUser();
