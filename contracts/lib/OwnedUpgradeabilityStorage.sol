// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "./Proxy.sol";

contract OwnedUpgradeabilityStorage is Proxy {
  // Current implementation
  address internal _implementation;

  // Owner of the contract
  address private _upgradeabilityOwner;

  /**
   * @dev Tells the address of the owner
   * @return the address of the owner
   */
  function upgradeabilityOwner() public view returns (address) {
    return _upgradeabilityOwner;
  }

  /**
   * @dev Sets the address of the owner
   */
  function setUpgradeabilityOwner(address newUpgradeabilityOwner) internal {
    _upgradeabilityOwner = newUpgradeabilityOwner;
  }

  /**
   * @dev Tells the address of the current implementation
   * @return address of the current implementation
   */
  function implementation() public view override returns (address) {
    return _implementation;
  }

  /**
   * @dev Tells the proxy type (EIP 897)
   * @return Proxy type, 2 for forwarding proxy
   */
  function proxyType() public pure override returns (uint256) {
    return 2;
  }
}
