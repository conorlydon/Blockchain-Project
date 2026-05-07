let keystoreData = null;

function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
}

document.getElementById('createBtn').addEventListener('click', () => {
    const web3 = new Web3();
    const account = web3.eth.accounts.create();
    const password = prompt("Enter a password to encrypt your keystore file:");
    if (!password) return;

    const keystore = web3.eth.accounts.encrypt(account.privateKey, password);
    keystoreData = keystore;

    document.getElementById('walletAddress').textContent = account.address;
    document.getElementById('privateKey').textContent = account.privateKey;
    document.getElementById('keystoreDisplay').textContent = JSON.stringify(keystore, null, 2);
    document.getElementById('results').style.display = 'block';
    document.getElementById('downloadBtn').style.display = 'block';
});

document.getElementById('copyAddress').addEventListener('click', function() {
    copyText(document.getElementById('walletAddress').textContent, this);
});
document.getElementById('copyKey').addEventListener('click', function() {
    copyText(document.getElementById('privateKey').textContent, this);
});
document.getElementById('copyKeystore').addEventListener('click', function() {
    copyText(document.getElementById('keystoreDisplay').textContent, this);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!keystoreData) return;
    const blob = new Blob([JSON.stringify(keystoreData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keystore-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
});
