// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EDDA is ERC20, Ownable {
  constructor() public ERC20("EDDA token", "EDDA") {}

  function mint(address to, uint256 amount) public virtual onlyOwner {
    _mint(to, amount);
  }
}
