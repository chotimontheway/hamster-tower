// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title Hamster Tower SQK shop and reward pool
/// @notice Sells the SQK Chest, at most one a UTC day for each wallet. Half of every price is burned on the
/// SQK token and the other half goes to the treasury. It also pays the SQK that players earn on boss floors,
/// out of SQK the owner sends to this contract, up to a running total that the game server signs for each wallet.
/// @dev The game itself runs on a server, so the contract cannot see a floor being cleared. The server key can
/// only sign totals, and the owner bounds the damage of a leaked key with maxClaim, dayCap, pause and a new signer.
interface ISQK {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract HamsterTowerSQK {
    /// @notice The SQK token. Its burn destroys the caller's own SQK for good.
    ISQK public immutable sqk;
    address public owner;
    address public pendingOwner;
    /// @notice Receives the half of each chest price that is not burned.
    address public treasury;
    /// @notice The game server's key. It signs how much SQK a wallet has earned in total.
    address public signer;
    /// @notice Price of one SQK Chest in SQK base units. Zero closes the shop.
    uint256 public chestPrice;
    /// @notice The most SQK a single claim may pay.
    uint256 public maxClaim;
    /// @notice The most SQK all claims together may pay in one UTC day.
    uint256 public dayCap;
    bool public paused;

    /// @notice The UTC day number of the wallet's last chest, plus one, so zero means never.
    mapping(address => uint256) public lastBuyDay;
    /// @notice All SQK ever paid to the wallet by claims.
    mapping(address => uint256) public claimed;
    /// @notice The UTC day that paidToday counts.
    uint256 public payDay;
    uint256 public paidToday;

    bytes32 private constant CLAIM_TYPEHASH = keccak256("Claim(address wallet,uint256 total,uint256 deadline)");
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant NAME_HASH = keccak256("Hamster Tower SQK");
    bytes32 private constant VERSION_HASH = keccak256("1");
    uint256 private constant HALF_S = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;
    uint256 private immutable deployChain;
    bytes32 private immutable deployDomain;

    event ChestBought(address indexed buyer, uint256 indexed day, uint256 price, uint256 burned, uint256 toTreasury);
    event Claimed(address indexed wallet, uint256 amount, uint256 total);
    event PriceSet(uint256 price);
    event LimitsSet(uint256 maxClaim, uint256 dayCap);
    event SignerSet(address signer);
    event TreasurySet(address treasury);
    event PausedSet(bool paused);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnerProposed(address indexed next);
    event OwnerChanged(address indexed owner);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error IsPaused();
    error ShopClosed();
    error PriceAbove(uint256 price);
    error OneChestADay();
    error Expired();
    error BadSignature();
    error NothingToClaim();
    error OverMaxClaim(uint256 amount, uint256 maxClaim);
    error OverDayCap(uint256 leftToday);
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address sqk_, address treasury_, address signer_, uint256 maxClaim_, uint256 dayCap_) {
        if (sqk_ == address(0) || treasury_ == address(0) || signer_ == address(0)) revert ZeroAddress();
        sqk = ISQK(sqk_);
        owner = msg.sender;
        treasury = treasury_;
        signer = signer_;
        maxClaim = maxClaim_;
        dayCap = dayCap_;
        deployChain = block.chainid;
        deployDomain = _buildDomain();
        emit OwnerChanged(msg.sender);
        emit TreasurySet(treasury_);
        emit SignerSet(signer_);
        emit LimitsSet(maxClaim_, dayCap_);
    }

    // -------------------------------------------------------------------------
    // Players
    // -------------------------------------------------------------------------

    /// @notice Buys one SQK Chest. Needs an allowance of at least the price for this contract.
    /// @param maxPrice The most the buyer agrees to pay, in case the price changes before the transaction lands.
    function buyChest(uint256 maxPrice) external {
        if (paused) revert IsPaused();
        uint256 price = chestPrice;
        if (price == 0) revert ShopClosed();
        if (price > maxPrice) revert PriceAbove(price);
        uint256 day = block.timestamp / 1 days;
        if (lastBuyDay[msg.sender] == day + 1) revert OneChestADay();
        lastBuyDay[msg.sender] = day + 1;
        if (!sqk.transferFrom(msg.sender, address(this), price)) revert TransferFailed();
        uint256 burned = price / 2;
        sqk.burn(burned);
        uint256 kept = price - burned;
        if (!sqk.transfer(treasury, kept)) revert TransferFailed();
        emit ChestBought(msg.sender, day, price, burned, kept);
    }

    /// @notice Pays the caller what the server signed as their total earnings, less what they were already paid.
    /// @param total Everything this wallet has earned so far, in SQK base units.
    /// @param deadline The last second the signature is valid.
    /// @param sig The server's EIP-712 signature of Claim(wallet, total, deadline).
    function claim(uint256 total, uint256 deadline, bytes calldata sig) external {
        if (paused) revert IsPaused();
        if (block.timestamp > deadline) revert Expired();
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator(), keccak256(abi.encode(CLAIM_TYPEHASH, msg.sender, total, deadline)))
        );
        if (_recover(digest, sig) != signer) revert BadSignature();
        uint256 done = claimed[msg.sender];
        if (total <= done) revert NothingToClaim();
        uint256 amount = total - done;
        if (amount > maxClaim) revert OverMaxClaim(amount, maxClaim);
        uint256 day = block.timestamp / 1 days;
        uint256 paid = payDay == day ? paidToday : 0;
        if (paid + amount > dayCap) revert OverDayCap(dayCap > paid ? dayCap - paid : 0);
        payDay = day;
        paidToday = paid + amount;
        claimed[msg.sender] = total;
        if (!sqk.transfer(msg.sender, amount)) revert TransferFailed();
        emit Claimed(msg.sender, amount, total);
    }

    struct Status {
        uint256 price;
        bool isPaused;
        bool boughtToday;
        uint256 claimedTotal;
        uint256 pool;
        uint256 leftToday;
        uint256 maxClaim;
        address signer;
        address treasury;
    }

    /// @notice Everything a page or the server needs about one wallet, in one call.
    function status(address wallet) external view returns (Status memory s) {
        uint256 day = block.timestamp / 1 days;
        uint256 paid = payDay == day ? paidToday : 0;
        s.price = chestPrice;
        s.isPaused = paused;
        s.boughtToday = lastBuyDay[wallet] == day + 1;
        s.claimedTotal = claimed[wallet];
        s.pool = sqk.balanceOf(address(this));
        s.leftToday = dayCap > paid ? dayCap - paid : 0;
        s.maxClaim = maxClaim;
        s.signer = signer;
        s.treasury = treasury;
    }

    function domainSeparator() public view returns (bytes32) {
        return block.chainid == deployChain ? deployDomain : _buildDomain();
    }

    // -------------------------------------------------------------------------
    // Owner
    // -------------------------------------------------------------------------

    function setChestPrice(uint256 price) external onlyOwner {
        chestPrice = price;
        emit PriceSet(price);
    }

    function setLimits(uint256 maxClaim_, uint256 dayCap_) external onlyOwner {
        maxClaim = maxClaim_;
        dayCap = dayCap_;
        emit LimitsSet(maxClaim_, dayCap_);
    }

    function setSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) revert ZeroAddress();
        signer = signer_;
        emit SignerSet(signer_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    /// @notice Takes tokens out of the contract, the reward pool's SQK or anything sent here by mistake.
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(ISQK.transfer.selector, to, amount));
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
        emit Withdrawn(token, to, amount);
    }

    /// @notice Ownership moves in two steps, so a mistyped address cannot take it.
    function proposeOwner(address next) external onlyOwner {
        pendingOwner = next;
        emit OwnerProposed(next);
    }

    function acceptOwner() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnerChanged(msg.sender);
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _buildDomain() private view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
    }

    /// @dev 65 byte signatures only, low s and v of 27 or 28, as OpenZeppelin's ECDSA does. A bad one gives address 0,
    /// which never matches because the signer can never be zero.
    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly ("memory-safe") {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (uint256(s) > HALF_S) return address(0);
        if (v != 27 && v != 28) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
