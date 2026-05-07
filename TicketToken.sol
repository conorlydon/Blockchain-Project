// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TicketToken {
    // ERC-20 standard variables
    string public name = "TicketToken";
    string public symbol = "TKT";
    uint8 public decimals = 0;  // Tickets are whole numbers, no fractions
    uint256 public totalSupply;

    // Ticket price in wei (0.01 SETH)
    uint256 public ticketPrice = 0.01 ether;

    // Contract owner (the venue/event organiser)
    address public owner;

    // Balances mapping
    mapping(address => uint256) public balanceOf;

    // Allowances mapping (required for ERC-20)
    mapping(address => mapping(address => uint256)) public allowance;

    // Doorman role mapping
    mapping(address => bool) public isDoorman;

    // Events (required for ERC-20)
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TicketPurchased(address indexed buyer, uint256 amount);
    event TicketReturned(address indexed returner, uint256 amount);
    event TicketValidated(address indexed doorman, address indexed attendee);
    event DoormanAdded(address indexed doorman);
    event DoormanRemoved(address indexed doorman);

    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        totalSupply = _initialSupply;
        balanceOf[owner] = _initialSupply; // All tickets start with the owner
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this");
        _;
    }

    modifier onlyDoormanOrOwner() {
        require(isDoorman[msg.sender] || msg.sender == owner, "Not authorised as doorman");
        _;
    }

    // ERC-20 transfer
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient ticket balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    // ERC-20 approve
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    // ERC-20 transferFrom
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient ticket balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }

    // Buy tickets with SETH
    function buyTicket(uint256 _amount) public payable {
        require(_amount > 0, "Must buy at least 1 ticket");
        require(msg.value == ticketPrice * _amount, "Incorrect SETH amount sent");
        require(balanceOf[owner] >= _amount, "Not enough tickets available");

        balanceOf[owner] -= _amount;
        balanceOf[msg.sender] += _amount;

        emit Transfer(owner, msg.sender, _amount);
        emit TicketPurchased(msg.sender, _amount);
    }

    // Return ticket back to vendor/owner
    function returnTicket(uint256 _amount) public {
        require(balanceOf[msg.sender] >= _amount, "You don't have enough tickets");

        balanceOf[msg.sender] -= _amount;
        balanceOf[owner] += _amount;

        emit Transfer(msg.sender, owner, _amount);
        emit TicketReturned(msg.sender, _amount);
    }

    // Grant doorman role — owner only
    function addDoorman(address _doorman) public onlyOwner {
        require(_doorman != address(0), "Invalid address");
        isDoorman[_doorman] = true;
        emit DoormanAdded(_doorman);
    }

    // Revoke doorman role — owner only
    function removeDoorman(address _doorman) public onlyOwner {
        isDoorman[_doorman] = false;
        emit DoormanRemoved(_doorman);
    }

    // Consume one ticket from an attendee, marking it as used — doorman or owner only
    function validateTicket(address _attendee) public onlyDoormanOrOwner {
        require(balanceOf[_attendee] >= 1, "Attendee holds no tickets");
        balanceOf[_attendee] -= 1;
        balanceOf[owner] += 1;
        emit Transfer(_attendee, owner, 1);
        emit TicketValidated(msg.sender, _attendee);
    }

    // Owner can withdraw SETH from contract
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Owner can update ticket price
    function setTicketPrice(uint256 _newPrice) public onlyOwner {
        ticketPrice = _newPrice;
    }

    // Check contract's SETH balance
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}