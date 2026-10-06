const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.stdoutMuted = true;
    rl.question('Password: ', function(password) {
      rl.close();
      console.log(); // Print newline after answer
      resolve(password);
    });
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted && stringToWrite !== '\r\n' && stringToWrite !== '\n') {
        rl.output.write("*");
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

async function createAdminUser() {
  const email = process.argv[2];
  const slug = process.argv[3];
  
  if (!email || !slug) {
    console.error('Usage: node scripts/create-user.js <email> <client_slug>');
    process.exit(1);
  }

  let password = process.env.TEST_USER_PASSWORD;
  if (!password) {
    password = await askPassword();
  }

  if (!password) {
    console.error('Password is required.');
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
  
  // Get the user ID (paging through list)
  let testUser = null;
  let page = 1;
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !users || users.length === 0) break;
    
    testUser = users.find(u => u.email === email);
    if (testUser) break;
    
    page++;
  }

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
  } else {
    console.error('User not found.');
  }
}

createAdminUser();
