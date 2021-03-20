// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./lib/IERC1155.sol";
import "./lib/Pausable.sol";
import "./lib/PauserRole.sol";
import "./lib/PoolTokenWrapper.sol";
import "./lib/ReentrancyGuard.sol";
import "./lib/Roles.sol";

contract EddaNftStake is PoolTokenWrapper, Ownable, Pausable, ReentrancyGuard {
  using SafeMath for uint256;
  IERC1155 public nfts;

  struct Card {
    uint256 points;
    uint256 releaseTime;
    uint256 mintFee;
  }

  struct Pool {
    uint256 periodStart;
    uint256 maxStake;
    uint256 rewardRate; // 11574074074000, 1 point per day per staked token
    uint256 feesCollected;
    uint256 spentPoints;
    uint256 controllerShare;
    address artist;
    mapping(address => uint256) lastUpdateTime;
    mapping(address => uint256) points;
    mapping(uint256 => Card) cards;
  }

  uint256 public constant MAX_CONTROLLER_SHARE = 1000;
  address public controller;
  address public rescuer;
  mapping(address => uint256) public pendingWithdrawals;
  mapping(uint256 => Pool) public pools;

  event UpdatedArtist(uint256 poolId, address artist);
  event PoolAdded(uint256 poolId, address artist, uint256 periodStart, uint256 rewardRate, uint256 maxStake);
  event CardAdded(uint256 poolId, uint256 cardId, uint256 points, uint256 mintFee, uint256 releaseTime);
  event Staked(address indexed user, uint256 poolId, uint256 amount);
  event Withdrawn(address indexed user, uint256 poolId, uint256 amount);
  event Transferred(address indexed user, uint256 fromPoolId, uint256 toPoolId, uint256 amount);
  event Redeemed(address indexed user, uint256 poolId, uint256 amount);
  event CardPointsUpdated(uint256 poolId, uint256 cardId, uint256 points);

  modifier updateReward(address account, uint256 id) {
    if (account != address(0)) {
      pools[id].points[account] = earned(account, id);
      pools[id].lastUpdateTime[account] = block.timestamp;
    }
    _;
  }

  modifier poolExists(uint256 id) {
    require(pools[id].rewardRate > 0, "pool does not exists");
    _;
  }

  modifier cardExists(uint256 pool, uint256 card) {
    require(pools[pool].cards[card].points > 0, "card does not exists");
    _;
  }

  constructor(
    address _controller,
    IERC1155 _nftsAddress,
    IERC20 _tokenAddress
  ) public PoolTokenWrapper(_tokenAddress) {
    require(_controller != address(0), "Invalid controller");
    controller = _controller;
    nfts = _nftsAddress;
  }

  function cardMintFee(uint256 pool, uint256 card) public view returns (uint256) {
    return pools[pool].cards[card].mintFee;
  }

  function cardReleaseTime(uint256 pool, uint256 card) public view returns (uint256) {
    return pools[pool].cards[card].releaseTime;
  }

  function cardPoints(uint256 pool, uint256 card) public view returns (uint256) {
    return pools[pool].cards[card].points;
  }

  function earned(address account, uint256 pool) public view returns (uint256) {
    Pool storage p = pools[pool];
    uint256 blockTime = block.timestamp;
    return
      balanceOf(account, pool).mul(blockTime.sub(p.lastUpdateTime[account]).mul(p.rewardRate)).div(1e18).add(
        p.points[account]
      );
  }

  // override PoolTokenWrapper's stake() function
  function stake(uint256 pool, uint256 amount)
    public
    override
    poolExists(pool)
    updateReward(msg.sender, pool)
    whenNotPaused()
    nonReentrant
  {
    Pool memory p = pools[pool];

    require(block.timestamp >= p.periodStart, "pool not open");
    require(amount.add(balanceOf(msg.sender, pool)) <= p.maxStake, "stake exceeds max");

    super.stake(pool, amount);
    emit Staked(msg.sender, pool, amount);
  }

  // override PoolTokenWrapper's withdraw() function
  function withdraw(uint256 pool, uint256 amount)
    public
    override
    poolExists(pool)
    updateReward(msg.sender, pool)
    nonReentrant
  {
    require(amount > 0, "cannot withdraw 0");

    super.withdraw(pool, amount);
    emit Withdrawn(msg.sender, pool, amount);
  }

  // override PoolTokenWrapper's transfer() function
  function transfer(
    uint256 fromPool,
    uint256 toPool,
    uint256 amount
  )
    public
    override
    poolExists(fromPool)
    poolExists(toPool)
    updateReward(msg.sender, fromPool)
    updateReward(msg.sender, toPool)
    whenNotPaused()
    nonReentrant
  {
    Pool memory toP = pools[toPool];

    require(block.timestamp >= toP.periodStart, "pool not open");
    require(amount.add(balanceOf(msg.sender, toPool)) <= toP.maxStake, "stake exceeds max");

    super.transfer(fromPool, toPool, amount);
    emit Transferred(msg.sender, fromPool, toPool, amount);
  }

  function transferAll(uint256 fromPool, uint256 toPool) external nonReentrant {
    transfer(fromPool, toPool, balanceOf(msg.sender, fromPool));
  }

  function exit(uint256 pool) external {
    withdraw(pool, balanceOf(msg.sender, pool));
  }

  function redeem(uint256 pool, uint256 card)
    public
    payable
    poolExists(pool)
    cardExists(pool, card)
    updateReward(msg.sender, pool)
    nonReentrant
  {
    Pool storage p = pools[pool];
    Card memory c = p.cards[card];
    require(block.timestamp >= c.releaseTime, "card not released");
    require(p.points[msg.sender] >= c.points, "not enough points");
    require(msg.value == c.mintFee, "support our artists, send eth");

    if (c.mintFee > 0) {
      uint256 _controllerShare = msg.value.mul(p.controllerShare).div(MAX_CONTROLLER_SHARE);
      uint256 _artistRoyalty = msg.value.sub(_controllerShare);
      require(_artistRoyalty.add(_controllerShare) == msg.value, "problem with fee");

      p.feesCollected = p.feesCollected.add(c.mintFee);
      pendingWithdrawals[controller] = pendingWithdrawals[controller].add(_controllerShare);
      pendingWithdrawals[p.artist] = pendingWithdrawals[p.artist].add(_artistRoyalty);
    }

    p.points[msg.sender] = p.points[msg.sender].sub(c.points);
    p.spentPoints = p.spentPoints.add(c.points);
    nfts.mint(msg.sender, card, 1, "");
    emit Redeemed(msg.sender, pool, c.points);
  }

  function rescuePoints(address account, uint256 pool)
    public
    poolExists(pool)
    updateReward(account, pool)
    nonReentrant
    returns (uint256)
  {
    require(msg.sender == rescuer, "!rescuer");
    Pool storage p = pools[pool];

    uint256 earnedPoints = p.points[account];
    p.spentPoints = p.spentPoints.add(earnedPoints);
    p.points[account] = 0;

    // transfer remaining tokens to the account
    if (balanceOf(account, pool) > 0) {
      _rescuePoints(account, pool);
    }

    emit Redeemed(account, pool, earnedPoints);
    return earnedPoints;
  }

  function setArtist(uint256 pool_, address artist_) public onlyOwner poolExists(pool_) nonReentrant {
    require(artist_ != address(0), "Invalid artist");
    address oldArtist = pools[pool_].artist;
    pendingWithdrawals[artist_] = pendingWithdrawals[artist_].add(pendingWithdrawals[oldArtist]);
    pendingWithdrawals[oldArtist] = 0;
    pools[pool_].artist = artist_;

    emit UpdatedArtist(pool_, artist_);
  }

  function setController(address _controller) public onlyOwner nonReentrant {
    require(_controller != address(0), "Invalid controller");
    pendingWithdrawals[_controller] = pendingWithdrawals[_controller].add(pendingWithdrawals[controller]);
    pendingWithdrawals[controller] = 0;
    controller = _controller;
  }

  function setRescuer(address _rescuer) public onlyOwner nonReentrant {
    rescuer = _rescuer;
  }

  function setControllerShare(uint256 pool, uint256 _controllerShare) public onlyOwner poolExists(pool) nonReentrant {
    require(_controllerShare <= MAX_CONTROLLER_SHARE, "Incorrect controller share");
    pools[pool].controllerShare = _controllerShare;
  }

  function addCard(
    uint256 pool,
    uint256 id,
    uint256 points,
    uint256 mintFee,
    uint256 releaseTime
  ) public onlyOwner poolExists(pool) nonReentrant {
    require(points >= 1e18, "Points too small");
    Card storage c = pools[pool].cards[id];
    c.points = points;
    c.releaseTime = releaseTime;
    c.mintFee = mintFee;
    emit CardAdded(pool, id, points, mintFee, releaseTime);
  }

  function createCard(
    uint256 pool,
    uint256 supply,
    uint256 points,
    uint256 mintFee,
    uint256 releaseTime
  ) public onlyOwner poolExists(pool) nonReentrant returns (uint256) {
    require(points >= 1e18, "Points too small");
    uint256 tokenId = nfts.create(supply, 0, "", "");
    require(tokenId > 0, "ERC1155 create did not succeed");

    Card storage c = pools[pool].cards[tokenId];
    c.points = points;
    c.releaseTime = releaseTime;
    c.mintFee = mintFee;
    emit CardAdded(pool, tokenId, points, mintFee, releaseTime);
    return tokenId;
  }

  function createPool(
    uint256 id,
    uint256 periodStart,
    uint256 maxStake,
    uint256 rewardRate,
    uint256 controllerShare,
    address artist
  ) public onlyOwner nonReentrant returns (uint256) {
    require(rewardRate > 0, "Invalid rewardRate");
    require(pools[id].rewardRate == 0, "pool exists");
    require(artist != address(0), "Invalid artist");
    require(controllerShare <= MAX_CONTROLLER_SHARE, "Incorrect controller share");

    Pool storage p = pools[id];

    p.periodStart = periodStart;
    p.maxStake = maxStake;
    p.rewardRate = rewardRate;
    p.controllerShare = controllerShare;
    p.artist = artist;

    emit PoolAdded(id, artist, periodStart, rewardRate, maxStake);
  }

  function withdrawFee() public nonReentrant {
    uint256 amount = pendingWithdrawals[msg.sender];
    require(amount > 0, "nothing to withdraw");
    pendingWithdrawals[msg.sender] = 0;
    msg.sender.transfer(amount);
  }

  // For development and QA
  function assignPointsTo(
    uint256 pool_,
    address tester_,
    uint256 points_
  ) public onlyOwner poolExists(pool_) nonReentrant returns (uint256) {
    Pool storage p = pools[pool_];
    p.points[tester_] = points_;

    // rescue continues
    return p.points[tester_];
  }

  /**
   * @dev Updates card points
   * @param poolId_ uint256 ID of the pool
   * @param cardId_ uint256 ID of the card to update
   * @param points_ uint256 new "points" value
   */
  function updateCardPoints(
    uint256 poolId_,
    uint256 cardId_,
    uint256 points_
  ) public onlyOwner poolExists(poolId_) cardExists(poolId_, cardId_) nonReentrant {
    require(points_ >= 1e18, "Points too small");
    Card storage c = pools[poolId_].cards[cardId_];
    c.points = points_;
    emit CardPointsUpdated(poolId_, cardId_, points_);
  }
}
