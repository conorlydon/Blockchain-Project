// *** REPLACE THIS WITH YOUR CONTRACT ADDRESS ***
const CONTRACT_ADDRESS = "0x378cfb1F66d8D0e3C667c79A54f05e5dd867608f";
const SEPOLIA_CHAIN_ID = "0xaa36a7";

const ABI = [
    { "inputs": [{"internalType": "uint256","name": "_initialSupply","type": "uint256"}], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [], "name": "ticketPrice", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "totalSupply", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "owner", "outputs": [{"internalType": "address","name": "","type": "address"}], "stateMutability": "view", "type": "function" },
    { "inputs": [{"internalType": "address","name": "","type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" },
    { "inputs": [{"internalType": "uint256","name": "_amount","type": "uint256"}], "name": "buyTicket", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [{"internalType": "uint256","name": "_amount","type": "uint256"}], "name": "returnTicket", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{"internalType": "address","name": "_to","type": "address"},{"internalType": "uint256","name": "_value","type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool","name": "success","type": "bool"}], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{"internalType": "address","name": "_spender","type": "address"},{"internalType": "uint256","name": "_value","type": "uint256"}], "name": "approve", "outputs": [{"internalType": "bool","name": "success","type": "bool"}], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{"internalType": "address","name": "_from","type": "address"},{"internalType": "address","name": "_to","type": "address"},{"internalType": "uint256","name": "_value","type": "uint256"}], "name": "transferFrom", "outputs": [{"internalType": "bool","name": "success","type": "bool"}], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "getContractBalance", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" },
    { "anonymous": false, "inputs": [{"indexed": true,"internalType": "address","name": "from","type": "address"},{"indexed": true,"internalType": "address","name": "to","type": "address"},{"indexed": false,"internalType": "uint256","name": "value","type": "uint256"}], "name": "Transfer", "type": "event" },
    { "anonymous": false, "inputs": [{"indexed": true,"internalType": "address","name": "returner","type": "address"},{"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}], "name": "TicketReturned", "type": "event" }
];

let web3, contract, userAccount;

const connectBtn = document.getElementById('connectBtn');
const returnBtn = document.getElementById('returnBtn');
const walletDisplay = document.getElementById('walletDisplay');
const accountSelect = document.getElementById('accountSelect');
const amountInput = document.getElementById('amountInput');
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

    accounts.forEach((account) => {
        const option = document.createElement('option');
        option.value = account;
        option.textContent = account;
        accountSelect.appendChild(option);
    });

    accountSelect.disabled = false;
}

function setConnectedAccount(account) {
    userAccount = account;

    if (!userAccount) {
        walletDisplay.textContent = 'No wallet connected';
        connectBtn.textContent = 'Connect MetaMask';
        returnBtn.disabled = true;
        document.getElementById('ticketBalance').textContent = '-';
        document.getElementById('ticketPrice').textContent = '-';
        accountSelect.innerHTML = '<option value="">Connect MetaMask first</option>';
        accountSelect.disabled = true;
        return;
    }

    web3 = new Web3(window.ethereum);
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    walletDisplay.innerHTML = 'Connected: <span>' + userAccount + '</span>';
    accountSelect.value = userAccount;
    connectBtn.textContent = 'Reload MetaMask Accounts';
    returnBtn.disabled = false;
}

async function ensureSepoliaNetwork() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== SEPOLIA_CHAIN_ID) {
        throw new Error('MetaMask must be connected to the Sepolia network.');
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        showStatus('MetaMask not detected. Please install it.', 'error');
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        populateAccountOptions(accounts);
        setConnectedAccount(accounts[0]);
        await ensureSepoliaNetwork();
        await loadContractInfo();
    } catch (err) {
        showStatus('Connection failed: ' + err.message, 'error');
    }
}

async function loadContractInfo() {
    if (!contract || !userAccount) return;

    try {
        const balance = await contract.methods.balanceOf(userAccount).call();
        document.getElementById('ticketBalance').textContent = balance + ' TKT';

        const priceWei = await contract.methods.ticketPrice().call();
        const priceEth = web3.utils.fromWei(priceWei, 'ether');
        document.getElementById('ticketPrice').textContent = priceEth + ' SETH';
    } catch (err) {
        showStatus('Error loading contract info: ' + err.message, 'error');
    }
}

async function returnTickets() {
    const amount = parseInt(amountInput.value);
    if (!amount || amount < 1) {
        showStatus('Please enter a valid number of tickets.', 'error');
        return;
    }
    try {
        showStatus('Confirm the transaction in MetaMask...', 'pending');
        returnBtn.disabled = true;

        const tx = await contract.methods.returnTicket(amount).send({
            from: userAccount
        });

        showStatus('Tickets returned! Tx hash: ' + tx.transactionHash, 'success');
        await loadContractInfo();
    } catch (err) {
        showStatus('Transaction failed: ' + err.message, 'error');
    } finally {
        returnBtn.disabled = false;
    }
}

if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
        populateAccountOptions(accounts);
        setConnectedAccount(accounts[0]);
        await loadContractInfo();
    });
}

accountSelect.addEventListener('change', async (event) => {
    setConnectedAccount(event.target.value);
    await loadContractInfo();
});

connectBtn.addEventListener('click', connectWallet);
returnBtn.addEventListener('click', returnTickets);
