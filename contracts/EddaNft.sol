// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "./lib/ERC1155Tradable.sol";

/**
 * @title EddaNft
 * EddaNft - Collect limited edition NFTs from Edda
 */
contract EddaNft is ERC1155Tradable {
  string public contractURI;

  constructor(
    string memory _name, //// "Meme Ltd."
    string memory _symbol, //// "MEMES"
    address _proxyRegistryAddress,
    string memory _baseMetadataURI, //// "https://api.dontbuymeme.com/memes/"
    string memory _contractURI //// "https://api.dontbuymeme.com/contract/memes-erc1155"
  ) public ERC1155Tradable(_name, _symbol, _proxyRegistryAddress) {
    contractURI = _contractURI;
    _setBaseMetadataURI(_baseMetadataURI);
  }

  //// function contractURI() public pure returns (string memory) {
  ////   return "https://api.dontbuymeme.com/contract/memes-erc1155";
  //// }
}
