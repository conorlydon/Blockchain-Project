const web3 = new Web3("https://ethereum-sepolia-rpc.publicnode.com");

const IERC20_ABI = [
    { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{"name": "","type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function" },
    { "constant": true, "inputs": [{"name": "account","type": "address"}], "name": "balanceOf", "outputs": [{"name": "","type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function" },
    { "constant": true, "inputs": [], "name": "name", "outputs": [{"name": "","type": "string"}], "payable": false, "stateMutability": "view", "type": "function" },
    { "constant": true, "inputs": [], "name": "symbol", "outputs": [{"name": "","type": "string"}], "payable": false, "stateMutability": "view", "type": "function" },
    { "constant": true, "inputs": [], "name": "decimals", "outputs": [{"name": "","type": "uint8"}], "payable": false, "stateMutability": "view", "type": "function" }
];

function showError(msg) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = 'status error';
}

document.getElementById('cryptoBalanceButton').addEventListener('click', async () => {
    const address = document.getElementById('walletAddress').value.trim();
    if (!web3.utils.isAddress(address)) { showError('Invalid wallet address.'); return; }

    try {
        const balance = await web3.eth.getBalance(address);
        const eth = web3.utils.fromWei(balance, 'ether');
        document.getElementById('cryptoBalance').textContent = parseFloat(eth).toFixed(6) + ' SETH';
        document.getElementById('cryptoBalanceRow').style.display = 'flex';
        document.getElementById('status').className = 'status';
    } catch (err) {
        showError('Error: ' + err.message);
    }
});

document.getElementById('tokenBalanceButton').addEventListener('click', async () => {
    const walletAddress = document.getElementById('walletAddress').value.trim();
    const tokenAddress = document.getElementById('tokenAddress').value.trim();

    if (!web3.utils.isAddress(walletAddress) || !web3.utils.isAddress(tokenAddress)) {
        showError('Invalid wallet or contract address.');
        return;
    }

    try {
        const contract = new web3.eth.Contract(IERC20_ABI, tokenAddress);

        const [balance, name, symbol, decimals, totalSupply] = await Promise.all([
            contract.methods.balanceOf(walletAddress).call(),
            contract.methods.name().call(),
            contract.methods.symbol().call(),
            contract.methods.decimals().call(),
            contract.methods.totalSupply().call()
        ]);

        document.getElementById('tokenBalance').textContent = balance + ' ' + symbol;
        document.getElementById('tokenName').textContent = name;
        document.getElementById('tokenSymbol').textContent = symbol;
        document.getElementById('tokenDecimals').textContent = decimals;
        document.getElementById('tokenTotalSupply').textContent = totalSupply;
        document.getElementById('tokenResults').style.display = 'block';
        document.getElementById('status').className = 'status';
    } catch (err) {
        showError('Error: ' + err.message);
    }
});
