const CONTRACT_ADDRESS = "0x378cfb1F66d8D0e3C667c79A54f05e5dd867608f";
const SEPOLIA_CHAIN_ID = '0xaa36a7';

const ABI = [
    { "inputs": [{"internalType": "uint256","name": "_initialSupply","type": "uint256"}], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [], "name": "owner", "outputs": [{"internalType": "address","name": "","type": "address"}], "stateMutability": "view", "type": "function" },
    { "inputs": [{"internalType": "address","name": "","type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" },
    { "inputs": [{"internalType": "address","name": "","type": "address"}], "name": "isDoorman", "outputs": [{"internalType": "bool","name": "","type": "bool"}], "stateMutability": "view", "type": "function" },
    { "inputs": [{"internalType": "address","name": "_doorman","type": "address"}], "name": "addDoorman", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{"internalType": "address","name": "_doorman","type": "address"}], "name": "removeDoorman", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{"internalType": "address","name": "_attendee","type": "address"}], "name": "validateTicket", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "anonymous": false, "inputs": [{"indexed": true,"internalType": "address","name": "doorman","type": "address"},{"indexed": true,"internalType": "address","name": "attendee","type": "address"}], "name": "TicketValidated", "type": "event" }
];

let web3, contract, userAccount, ownerAddress;

const connectBtn = document.getElementById('connectBtn');
const walletDisplay = document.getElementById('walletDisplay');
const roleBadge = document.getElementById('roleBadge');
const validateSection = document.getElementById('validateSection');
const manageSection = document.getElementById('manageSection');
const attendeeInput = document.getElementById('attendeeInput');
const checkBtn = document.getElementById('checkBtn');
const ticketResult = document.getElementById('ticketResult');
const resultLabel = document.getElementById('resultLabel');
const resultBalance = document.getElementById('resultBalance');
const validateBtn = document.getElementById('validateBtn');
const doormanInput = document.getElementById('doormanInput');
const addBtn = document.getElementById('addBtn');
const removeBtn = document.getElementById('removeBtn');
const statusEl = document.getElementById('status');

function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
}

async function ensureSepoliaNetwork() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== SEPOLIA_CHAIN_ID) {
        showStatus('Wrong network. Switching to Sepolia...', 'pending');
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_CHAIN_ID }]
            });
        } catch (err) {
            throw new Error('Please switch MetaMask to the Sepolia testnet.');
        }
    }
}

async function loadRole() {
    if (!contract || !userAccount) return;

    ownerAddress = await contract.methods.owner().call();
    const isOwner = userAccount.toLowerCase() === ownerAddress.toLowerCase();
    const isDoorman = await contract.methods.isDoorman(userAccount).call();

    roleBadge.style.display = 'block';

    if (isOwner) {
        roleBadge.textContent = 'OWNER';
        roleBadge.className = 'role-badge role-owner';
        validateSection.style.display = 'block';
        manageSection.style.display = 'block';
    } else if (isDoorman) {
        roleBadge.textContent = 'DOORMAN';
        roleBadge.className = 'role-badge role-doorman';
        validateSection.style.display = 'block';
        manageSection.style.display = 'none';
    } else {
        roleBadge.textContent = 'NOT AUTHORISED';
        roleBadge.className = 'role-badge role-none';
        validateSection.style.display = 'none';
        manageSection.style.display = 'none';
        showStatus('This account is not registered as a doorman. Ask the owner to add it.', 'error');
    }

    ticketResult.style.display = 'none';
    validateBtn.style.display = 'none';
}

async function connectWallet() {
    if (!window.ethereum) {
        showStatus('MetaMask not detected. Please install it.', 'error');
        return;
    }
    try {
        await ensureSepoliaNetwork();
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
        walletDisplay.innerHTML = 'Connected: <span>' + userAccount + '</span>';
        connectBtn.textContent = 'Reconnect';
        showStatus('', '');
        await loadRole();
    } catch (err) {
        showStatus('Connection failed: ' + err.message, 'error');
    }
}

async function checkAttendee() {
    const address = attendeeInput.value.trim();
    if (!web3.utils.isAddress(address)) {
        showStatus('Invalid wallet address.', 'error');
        return;
    }

    try {
        const balance = await contract.methods.balanceOf(address).call();
        ticketResult.style.display = 'block';

        if (parseInt(balance) >= 1) {
            resultLabel.textContent = 'VALID TICKET';
            resultLabel.className = 'result-label valid';
            resultBalance.textContent = balance + ' ticket(s) held';
            validateBtn.style.display = 'block';
        } else {
            resultLabel.textContent = 'NO TICKET';
            resultLabel.className = 'result-label invalid';
            resultBalance.textContent = '0 tickets held';
            validateBtn.style.display = 'none';
        }
        showStatus('', '');
    } catch (err) {
        showStatus('Error checking balance: ' + err.message, 'error');
    }
}

async function validateTicket() {
    const address = attendeeInput.value.trim();
    if (!web3.utils.isAddress(address)) {
        showStatus('Invalid wallet address.', 'error');
        return;
    }

    try {
        showStatus('Confirm the transaction in MetaMask...', 'pending');
        validateBtn.disabled = true;
        checkBtn.disabled = true;

        const tx = await contract.methods.validateTicket(address).send({ from: userAccount });

        showStatus('Ticket validated! Tx: ' + tx.transactionHash, 'success');
        resultLabel.textContent = 'TICKET USED';
        resultLabel.className = 'result-label used';
        resultBalance.textContent = 'Ticket consumed — entry granted';
        validateBtn.style.display = 'none';
    } catch (err) {
        showStatus('Validation failed: ' + err.message, 'error');
    } finally {
        validateBtn.disabled = false;
        checkBtn.disabled = false;
    }
}

async function addDoorman() {
    const address = doormanInput.value.trim();
    if (!web3.utils.isAddress(address)) {
        showStatus('Invalid wallet address.', 'error');
        return;
    }
    try {
        showStatus('Confirm the transaction in MetaMask...', 'pending');
        addBtn.disabled = true;
        await contract.methods.addDoorman(address).send({ from: userAccount });
        showStatus('Doorman added: ' + address, 'success');
        doormanInput.value = '';
    } catch (err) {
        showStatus('Failed to add doorman: ' + err.message, 'error');
    } finally {
        addBtn.disabled = false;
    }
}

async function removeDoorman() {
    const address = doormanInput.value.trim();
    if (!web3.utils.isAddress(address)) {
        showStatus('Invalid wallet address.', 'error');
        return;
    }
    try {
        showStatus('Confirm the transaction in MetaMask...', 'pending');
        removeBtn.disabled = true;
        await contract.methods.removeDoorman(address).send({ from: userAccount });
        showStatus('Doorman removed: ' + address, 'success');
        doormanInput.value = '';
    } catch (err) {
        showStatus('Failed to remove doorman: ' + err.message, 'error');
    } finally {
        removeBtn.disabled = false;
    }
}

if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
        userAccount = accounts[0] || null;
        if (userAccount) {
            walletDisplay.innerHTML = 'Connected: <span>' + userAccount + '</span>';
            await loadRole();
        } else {
            walletDisplay.textContent = 'No wallet connected';
            roleBadge.style.display = 'none';
            validateSection.style.display = 'none';
            manageSection.style.display = 'none';
        }
    });
}

connectBtn.addEventListener('click', connectWallet);
checkBtn.addEventListener('click', checkAttendee);
validateBtn.addEventListener('click', validateTicket);
addBtn.addEventListener('click', addDoorman);
removeBtn.addEventListener('click', removeDoorman);
