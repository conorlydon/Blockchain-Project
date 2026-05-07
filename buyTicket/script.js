// *** REPLACE THIS WITH YOUR CONTRACT ADDRESS ***
const CONTRACT_ADDRESS = "0x378cfb1F66d8D0e3C667c79A54f05e5dd867608f";
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

const ABI = [
    { "inputs": [{"internalType": "uint256","name": "_initialSupply","type": "uint256"}], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [{"internalType": "uint256","name": "_amount","type": "uint256"}], "name": "buyTicket", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [], "name": "owner", "outputs": [{"internalType": "address","name": "","type": "address"}], "stateMutability": "view", "type": "function" },
    { "inputs": [{"internalType": "address","name": "","type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" }
];

const TICKET_PRICE_WEI = Web3.utils.toWei('0.01', 'ether');

let web3, contract, userAccount;

const connectBtn = document.getElementById('connectBtn');
const buyBtn = document.getElementById('buyBtn');
const walletDisplay = document.getElementById('walletDisplay');
const accountSelect = document.getElementById('accountSelect');
const amountInput = document.getElementById('amountInput');
const totalCostEl = document.getElementById('totalCost');
const statusEl = document.getElementById('status');

function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
}

function populateAccountOptions(accounts) {
    accountSelect.innerHTML = '';

    if (!accounts.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Connect MetaMask first';
        accountSelect.appendChild(option);
        accountSelect.disabled = true;
        return;
    }

    for (const account of accounts) {
        const option = document.createElement('option');
        option.value = account;
        option.textContent = account;
        accountSelect.appendChild(option);
    }

    accountSelect.disabled = false;
}

function setConnectedAccount(account) {
    userAccount = account;

    if (!userAccount) {
        walletDisplay.textContent = 'No wallet connected';
        connectBtn.textContent = 'Connect MetaMask';
        buyBtn.disabled = true;
        accountSelect.innerHTML = '<option value="">Connect MetaMask first</option>';
        accountSelect.disabled = true;
        return;
    }

    web3 = new Web3(window.ethereum);
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    walletDisplay.innerHTML = 'Connected: <span>' + userAccount + '</span>';
    accountSelect.value = userAccount;
    connectBtn.textContent = 'Reload MetaMask Accounts';
    buyBtn.disabled = false;
}

function updateCost() {
    const amount = parseInt(amountInput.value) || 1;
    const totalWei = BigInt(TICKET_PRICE_WEI) * BigInt(amount);
    totalCostEl.textContent = web3 ? web3.utils.fromWei(totalWei.toString(), 'ether') + ' SETH' : '0.01 SETH';
}

async function loadContractInfo() {
    if (!contract || !userAccount) return;
    try {
        const ownerAddress = await contract.methods.owner().call();
        const available = await contract.methods.balanceOf(ownerAddress).call();
        const userBalance = await contract.methods.balanceOf(userAccount).call();
        document.getElementById('ticketsAvailable').textContent = available.toString();
        document.getElementById('yourTicketBalance').textContent = userBalance.toString();
    } catch (err) {
        document.getElementById('ticketsAvailable').textContent = 'Error';
        document.getElementById('yourTicketBalance').textContent = 'Error';
    }
}

async function ensureSepoliaNetwork() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== SEPOLIA_CHAIN_ID) {
        showStatus('Wrong network detected. Switching to Sepolia...', 'pending');
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_CHAIN_ID }]
            });
        } catch (switchErr) {
            if (switchErr.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: SEPOLIA_CHAIN_ID,
                        chainName: 'Sepolia Testnet',
                        nativeCurrency: { name: 'SepoliaETH', symbol: 'SETH', decimals: 18 },
                        rpcUrls: ['https://rpc.sepolia.org'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io']
                    }]
                });
            } else {
                throw new Error('Please switch MetaMask to the Sepolia testnet and try again.');
            }
        }
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        showStatus('MetaMask not detected. Please install it.', 'error');
        return;
    }

    try {
        await ensureSepoliaNetwork();
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        populateAccountOptions(accounts);
        setConnectedAccount(accounts[0]);
        updateCost();
        await loadContractInfo();
        showStatus('Connected on Sepolia testnet.', 'success');
    } catch (err) {
        showStatus('Connection failed: ' + err.message, 'error');
    }
}

async function buyTickets() {
    const amount = parseInt(amountInput.value);
    if (!amount || amount < 1) {
        showStatus('Please enter a valid number of tickets.', 'error');
        return;
    }
    if (!contract || !userAccount) {
        showStatus('Connect MetaMask and select an account first.', 'error');
        return;
    }

    try {
        await ensureSepoliaNetwork();
        const totalWei = (BigInt(TICKET_PRICE_WEI) * BigInt(amount)).toString();
        showStatus('Confirm the transaction in MetaMask...', 'pending');
        buyBtn.disabled = true;

        // Estimate gas first to catch contract reverts with a clear message
        try {
            await contract.methods.buyTicket(amount).estimateGas({ from: userAccount, value: totalWei });
        } catch (gasErr) {
            const reason = gasErr.data?.message || gasErr.message || 'unknown reason';
            throw new Error('Contract would revert: ' + reason + '. Check tickets are available and the price is correct.');
        }

        const tx = await contract.methods.buyTicket(amount).send({
            from: userAccount,
            value: totalWei
        });

        showStatus('Success! Tx hash: ' + tx.transactionHash, 'success');
        await loadContractInfo();
    } catch (err) {
        showStatus('Transaction failed: ' + err.message, 'error');
    } finally {
        buyBtn.disabled = false;
    }
}

if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
        populateAccountOptions(accounts);
        setConnectedAccount(accounts[0]);
        updateCost();
        await loadContractInfo();
    });
}

accountSelect.addEventListener('change', async (event) => {
    setConnectedAccount(event.target.value);
    updateCost();
    await loadContractInfo();
});

connectBtn.addEventListener('click', connectWallet);
buyBtn.addEventListener('click', buyTickets);
amountInput.addEventListener('input', updateCost);

updateCost();
