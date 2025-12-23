#!/usr/bin/env node

/**
 * Staff Account Creation Tool
 * Run: node create-staff.js
 */

const readline = require('readline');
const authUtils = require('./modules/dashboard/utils/authUtils');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║  DeadLoom Staff Account Creator       ║');
    console.log('╚═══════════════════════════════════════╝\n');

    try {
        const email = await prompt('📧 Email address: ');
        const username = await prompt('👤 Username: ');
        const password = await prompt('🔐 Password: ');
        const confirmPassword = await prompt('🔐 Confirm password: ');

        if (password !== confirmPassword) {
            console.log('\n❌ Passwords do not match!\n');
            rl.close();
            return;
        }

        console.log('\n⏳ Creating staff account...\n');
        const result = await authUtils.createStaffUser(email, password, username);

        if (result.success) {
            console.log('✅ Staff account created successfully!\n');
            console.log('Staff Account Details:');
            console.log('─────────────────────');
            console.log(`📧 Email:    ${result.user.email}`);
            console.log(`👤 Username: ${result.user.username}`);
            console.log(`🔓 Status:   Staff (Dashboard Access)`);
            console.log('\nThey can now login at: /login\n');
        } else {
            console.log(`\n❌ Error: ${result.error}\n`);
        }
    } catch (err) {
        console.error(`\n❌ Error: ${err.message}\n`);
    }

    rl.close();
}

main();
