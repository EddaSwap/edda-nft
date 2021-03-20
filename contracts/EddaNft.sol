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
    string memory _name, //// "EddaSwap"
    string memory _symbol, //// "EDDAS"
    address _proxyRegistryAddress,
    string memory _baseMetadataURI, //// "https://nft.eddaswap.com/api/"
    string memory _contractURI //// "https://nft.eddaswap.com/contract/eddas-erc1155"
  ) public ERC1155Tradable(_name, _symbol, _proxyRegistryAddress) {
    contractURI = _contractURI;
    _setBaseMetadataURI(_baseMetadataURI);
  }
}
