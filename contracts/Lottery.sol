/* Orchid - WebRTC P2P VPN Market (on Ethereum)
 * Copyright (C) 2017-2019  The Orchid Authors
*/

/* GNU Affero General Public License, Version 3 {{{ */
/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/
/* }}} */


//pragma solidity 0.5.7;
pragma solidity >=0.5.0;

//import "../openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import './zeppelin/token/ERC20.sol';

interface IOrchidLottery {
}

contract OrchidLottery is IOrchidLottery {

    ERC20 private orchid_;

    constructor(address orchid) public {
        orchid_ = ERC20(orchid);
    }


    struct Pot {
        uint64 amount_;
        uint64 escrow_;
        uint256 unlock_;
    }

    mapping(address => Pot) pots_;

    event Update(address indexed signer, uint64 amount, uint64 escrow, uint256 unlock);

    // signer must be a simple account, to support signing tickets
    function fund(address signer, uint64 amount, uint64 total) public {
        require(total >= amount);
        Pot storage pot = pots_[signer];
        pot.amount_ += amount;
        pot.escrow_ += total - amount;
        emit Update(signer, pot.amount_, pot.escrow_, pot.unlock_);
        require(orchid_.transferFrom(msg.sender, address(this), total));
    }
    
    function get_address() public view returns (address) {
        return address(this);
    }

    function get_amount(address x) public view returns (uint64) {
        return pots_[x].amount_;
    }

    function get_escrow(address x) public view returns (uint64) {
        return pots_[x].escrow_;
    }

    function get_unlock(address x) public view returns (uint256) {
        return pots_[x].unlock_;
    }

    mapping(bytes32 => bool) tickets_;


    function hash_test( bytes32 secret_hash, address target, uint amount, uint ratio, uint nonce ) public view returns (bytes32) {
        return keccak256(abi.encodePacked(secret_hash, target, amount, ratio, nonce));
    }

    function grab(uint256 secret, bytes32 secret_hash, address target, uint nonce, uint ratio, uint amount, uint8 v, bytes32 r, bytes32 s 
        , address source_addr, bytes32 hash) public 
    {
        bytes32 ticket = keccak256(abi.encodePacked(secret_hash, target, amount, ratio, nonce));
        require(ticket == hash);

        address sender_addr = ecrecover(ticket, v, r, s);
        require(sender_addr == source_addr);

        require(keccak256(abi.encodePacked(secret)) == secret_hash);
        require(uint256(keccak256(abi.encodePacked(secret, nonce))) < ratio);

        require(!tickets_[ticket]);
        tickets_[ticket] = true;

        Pot storage pot = pots_[sender_addr];

        if (pot.amount_ < amount) {
            amount = pot.amount_;
            pot.escrow_ = 0;
        }
        pot.amount_ -= uint64(amount);
        require(orchid_.transfer(target, amount));
        
        emit Update(sender_addr, pot.amount_, pot.escrow_, pot.unlock_);
    }


    function warn() public {
        Pot storage pot = pots_[msg.sender];
        pot.unlock_ = block.timestamp + 1 days;
        emit Update(msg.sender, pot.amount_, pot.escrow_, pot.unlock_);
    }

    function take(address payable target) public {
        Pot storage pot = pots_[msg.sender];
        require(pot.unlock_ != 0);
        require(pot.unlock_ <= block.timestamp);
        uint64 amount = pot.amount_ + pot.escrow_;
        delete pots_[msg.sender];
        emit Update(msg.sender, 0, 0, 0);
        require(orchid_.transfer(target, amount));
    }

}
