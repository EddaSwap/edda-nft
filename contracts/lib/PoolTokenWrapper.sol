// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PoolTokenWrapper {
  using SafeMath for uint256;
  IERC20 public token;

  constructor(IERC20 _erc20Address) public {
    token = IERC20(_erc20Address);
  }

  uint256 private _totalSupply;
  // Objects balances [id][address] => balance
  mapping(uint256 => mapping(address => uint256)) internal _balances;
  mapping(address => uint256) private _accountBalances;
  mapping(uint256 => uint256) private _poolBalances;

  function totalSupply() public view returns (uint256) {
    return _totalSupply;
  }

  function balanceOfAccount(address account) public view returns (uint256) {
    return _accountBalances[account];
  }

  function balanceOfPool(uint256 id) public view returns (uint256) {
    return _poolBalances[id];
  }

  function balanceOf(address account, uint256 id) public view returns (uint256) {
    return _balances[id][account];
  }

  function stake(uint256 id, uint256 amount) public virtual {
    _totalSupply = _totalSupply.add(amount);
    _poolBalances[id] = _poolBalances[id].add(amount);
    _accountBalances[msg.sender] = _accountBalances[msg.sender].add(amount);
    _balances[id][msg.sender] = _balances[id][msg.sender].add(amount);
    token.transferFrom(msg.sender, address(this), amount);
  }

  function withdraw(uint256 id, uint256 amount) public virtual {
    _totalSupply = _totalSupply.sub(amount);
    _poolBalances[id] = _poolBalances[id].sub(amount);
    _accountBalances[msg.sender] = _accountBalances[msg.sender].sub(amount);
    _balances[id][msg.sender] = _balances[id][msg.sender].sub(amount);
    token.transfer(msg.sender, amount);
  }

  function transfer(
    uint256 fromId,
    uint256 toId,
    uint256 amount
  ) public virtual {
    _poolBalances[fromId] = _poolBalances[fromId].sub(amount);
    _balances[fromId][msg.sender] = _balances[fromId][msg.sender].sub(amount);

    _poolBalances[toId] = _poolBalances[toId].add(amount);
    _balances[toId][msg.sender] = _balances[toId][msg.sender].add(amount);
  }

  function _rescuePoints(address account, uint256 id) internal {
    uint256 amount = _balances[id][account];

    _totalSupply = _totalSupply.sub(amount);
    _poolBalances[id] = _poolBalances[id].sub(amount);
    _accountBalances[msg.sender] = _accountBalances[msg.sender].sub(amount);
    _balances[id][account] = _balances[id][account].sub(amount);
    token.transfer(account, amount);
  }
}
