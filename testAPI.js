// testAPI.js
const fetch = require('node-fetch');

console.log('Starting API test...'); // This should show up immediately

async function testVidSrcAPI() {
    console.log('Testing API endpoints...');
    
    const domains = [
        'https://vidsrc.xyz',
        'https://vidsrc.me',
        'https://vidsrc.net',
        'https://vidsrc.pm',
        'https://vidsrc.in'
    ];

    for (const domain of domains) {
        console.log(`\nTesting ${domain}...`);
        try {
            const url = `${domain}/movies/latest/page-1.json`;
            console.log('Fetching:', url);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log('Status:', response.status);
            
            const text = await response.text();
            console.log('Response:', text.substring(0, 200) + '...'); // Show first 200 chars
            
        } catch (error) {
            console.log('Error:', error.message);
        }
    }
}

// Call the function and handle the promise
testVidSrcAPI()
    .then(() => console.log('Test complete'))
    .catch(error => console.error('Test failed:', error));

console.log('Test script started...');