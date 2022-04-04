//Contract based on [https://docs.openzeppelin.com/contracts/3.x/erc721](https://docs.openzeppelin.com/contracts/3.x/erc721)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SmartSeal is ERC721Enumerable {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("SmartSeal", "SMT") {}
    
    function mintSeal(address minter) 
        public
        returns (uint256)
    {   
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        _safeMint(minter, tokenId);
        return tokenId;
    }
}
