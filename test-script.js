console.log('test.js is running!');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed in test.js');
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = '<h1 style="color: red; font-size: 48px;">TEST JS IS WORKING</h1>';
        console.log('Root innerHTML updated by test.js');
    } else {
        console.error('Root element not found in test.js');
    }
});
