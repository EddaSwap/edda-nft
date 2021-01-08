// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

abstract contract Proxy {
  event ReceivedEther(address indexed sender, uint256 amount);

  /**
   * @dev Tells the address of the implementation where every call will be delegated.
   * @return address of the implementation to which it will be delegated
   */
  function implementation() public view virtual returns (address);

  /**
   * @dev Tells the type of proxy (EIP 897)
   * @return Type of proxy, 2 for upgradeable proxy
   */
  function proxyType() public pure virtual returns (uint256);

  /**
   * @dev Fallback function allowing to perform a delegatecall to the given implementation.
   * This function will return whatever the implementation call returns
   */
  fallback() external payable {
    address _impl = implementation();
    require(_impl != address(0));

    assembly {
      let ptr := mload(0x40)
      calldatacopy(ptr, 0, calldatasize())
      let result := delegatecall(gas(), _impl, ptr, calldatasize(), 0, 0)
      let size := returndatasize()
      returndatacopy(ptr, 0, size)

      switch result
        case 0 {
          revert(ptr, size)
        }
        default {
          return(ptr, size)
        }
    }
  }

  /**
   * @dev Receive Ether and generate a log event
   */
  receive() external payable {
    emit ReceivedEther(msg.sender, msg.value);
  }
}
