// Tests contracts/HamsterTowerSQK.json on a local copy of Sepolia made by anvil, with the real SQK token, so the real
// burn and transfer rules apply. Nothing is sent to Sepolia itself. Run: node tests/sqk-contract.test.js
// Needs anvil (Foundry). ANVIL sets its path, FORK_RPC the Sepolia node to copy from.
const { spawn } = require('child_process'), path = require('path'), os = require('os'), fs = require('fs');
const ART = require('../contracts/HamsterTowerSQK.json');
const SQK = '0xd78a3956cf63164d1fa1c622ad3c66623162fa1e', WHALE = '0x50fd1780526c3186a0c037c7622203bc4fb611ca';
const PORT = +(process.env.ANVIL_PORT || 8547), RPC = `http://127.0.0.1:${PORT}`;
const ANVIL = process.env.ANVIL || path.join(os.homedir(), '.foundry/bin/anvil.exe');
const FORK = process.env.FORK_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';
let pass = 0, fail = 0;
const check = (name, ok, more) => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && more !== undefined ? ' : ' + more : ''}`); };

(async () => {
  const v = await import('viem');
  const { privateKeyToAccount } = await import('viem/accounts');
  const anvil = spawn(ANVIL, ['--fork-url', FORK, '--port', String(PORT), '--silent', '--no-rate-limit'], { stdio: 'ignore' });
  try {
    const chain = v.defineChain({ id: 11155111, name: 'Sepolia fork', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
    const pub = v.createPublicClient({ chain, transport: v.http(RPC) });
    for (let i = 0; ; i++) { try { await pub.getBlockNumber(); break; } catch (e) { if (i > 80) throw new Error('anvil did not start'); await new Promise(r => setTimeout(r, 250)); } }
    const rpc = (method, params) => pub.request({ method, params });
    const accounts = await rpc('eth_accounts', []);
    const [ownerA, buyerA, otherA, treasuryA] = accounts;
    /* a throwaway server key made from public words, it never holds anything */
    const server = privateKeyToAccount(v.keccak256(v.toHex('hamster tower test signer')));
    const stranger = privateKeyToAccount(v.keccak256(v.toHex('hamster tower test stranger')));
    const w = a => v.createWalletClient({ chain, transport: v.http(RPC), account: a });
    const token = { address: SQK, abi: v.parseAbi(['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)', 'function approve(address,uint256) returns (bool)', 'function totalBurned() view returns (uint256)', 'function totalSupply() view returns (uint256)']) };
    const E = v.parseEther;
    const send = async (from, c, fn, args) => { const h = await w(from).writeContract({ address: c.address, abi: c.abi, functionName: fn, args }); const r = await pub.waitForTransactionReceipt({ hash: h }); if (r.status !== 'success') throw new Error('reverted'); return r; };
    const fails = async (p, name) => { try { await p; return 'no revert'; } catch (e) { const s = String(e && (e.shortMessage || '') + ' ' + (e.message || '')); return s.includes(name) ? true : s.slice(0, 300); } };
    const bal = a => pub.readContract({ ...token, functionName: 'balanceOf', args: [a] });

    /* SQK for the test wallets, from Staking, which holds the rewards on this copy of the chain */
    await rpc('anvil_impersonateAccount', [WHALE]);
    await rpc('anvil_setBalance', [WHALE, '0x56BC75E2D63100000']);
    for (const a of [ownerA, buyerA, otherA]) await send(WHALE, token, 'transfer', [a, E('1000')]);
    await rpc('anvil_stopImpersonatingAccount', [WHALE]);
    check('test wallets hold SQK', await bal(buyerA) === E('1000'));

    const hash = await w(ownerA).deployContract({ abi: ART.abi, bytecode: ART.bytecode, args: [SQK, treasuryA, server.address, E('50'), E('80')] });
    const rcpt = await pub.waitForTransactionReceipt({ hash });
    const shop = { address: rcpt.contractAddress, abi: ART.abi };
    console.log(`deployed at ${shop.address}, deploy gas ${rcpt.gasUsed}`);
    const read = (fn, args) => pub.readContract({ ...shop, functionName: fn, args });
    check('owner is the deployer', (await read('owner')).toLowerCase() === ownerA.toLowerCase());
    check('signer and treasury as given', (await read('signer')) === server.address && (await read('treasury')).toLowerCase() === treasuryA.toLowerCase());
    let st = await read('status', [buyerA]);
    check('status reads in one call', st.price === 0n && st.isPaused === false && st.boughtToday === false && st.pool === 0n && st.leftToday === E('80') && st.maxClaim === E('50'));

    /* the shop */
    check('closed while the price is zero', await fails(send(buyerA, shop, 'buyChest', [E('10')]), 'ShopClosed'));
    check('only the owner sets the price', await fails(send(buyerA, shop, 'setChestPrice', [E('10')]), 'NotOwner'));
    await send(ownerA, shop, 'setChestPrice', [E('10')]);
    check('a buy with no allowance fails', await fails(send(buyerA, shop, 'buyChest', [E('10')]), 'ERC20InsufficientAllowance'));
    await send(buyerA, token, 'approve', [shop.address, E('10')]);
    check('a buy below the price is refused', await fails(send(buyerA, shop, 'buyChest', [E('9')]), 'PriceAbove'));
    const burned0 = await pub.readContract({ ...token, functionName: 'totalBurned' }), supply0 = await pub.readContract({ ...token, functionName: 'totalSupply' }), tr0 = await bal(treasuryA);
    const r1 = await send(buyerA, shop, 'buyChest', [E('10')]);
    console.log(`buyChest gas ${r1.gasUsed}`);
    check('the buyer paid the price', await bal(buyerA) === E('990'));
    check('half went to the treasury', await bal(treasuryA) - tr0 === E('5'));
    check('half was burned on the token', await pub.readContract({ ...token, functionName: 'totalBurned' }) - burned0 === E('5') && supply0 - await pub.readContract({ ...token, functionName: 'totalSupply' }) === E('5'));
    check('nothing stays in the contract', await bal(shop.address) === 0n);
    const ev = v.parseEventLogs({ abi: ART.abi, logs: r1.logs, eventName: 'ChestBought' })[0];
    const block1 = await pub.getBlock({ blockNumber: r1.blockNumber });
    check('the event names buyer, day and split', ev && ev.args.buyer.toLowerCase() === buyerA.toLowerCase() && ev.args.day === block1.timestamp / 86400n && ev.args.price === E('10') && ev.args.burned === E('5') && ev.args.toTreasury === E('5'));
    st = await read('status', [buyerA]);
    check('status says bought today', st.boughtToday === true);
    await send(buyerA, token, 'approve', [shop.address, E('10')]);
    check('a second chest the same day is refused', await fails(send(buyerA, shop, 'buyChest', [E('10')]), 'OneChestADay'));
    const nextDay = (block1.timestamp / 86400n + 1n) * 86400n + 5n;
    await rpc('evm_setNextBlockTimestamp', ['0x' + nextDay.toString(16)]);
    await rpc('evm_mine', []);
    check('the next UTC day it can buy again', (await send(buyerA, shop, 'buyChest', [E('10')])).status === 'success');
    await send(ownerA, shop, 'setChestPrice', [E('7')]);
    await send(otherA, token, 'approve', [shop.address, E('10')]);
    await send(otherA, shop, 'buyChest', [E('10')]);
    check('a lower price charges only the price', await bal(otherA) === E('993'));
    await send(ownerA, shop, 'setChestPrice', [E('3') + 1n]);
    await rpc('evm_setNextBlockTimestamp', ['0x' + (nextDay + 86400n).toString(16)]);await rpc('evm_mine', []);
    await send(otherA, token, 'approve', [shop.address, E('10')]);
    const tr1 = await bal(treasuryA);
    await send(otherA, shop, 'buyChest', [E('10')]);
    check('odd base units: burn floor half, treasury the rest', await bal(treasuryA) - tr1 === E('1.5') + 1n);

    /* rewards */
    const domain = { name: 'Hamster Tower SQK', version: '1', chainId: 11155111, verifyingContract: shop.address };
    const types = { Claim: [{ name: 'wallet', type: 'address' }, { name: 'total', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] };
    const now = async () => (await pub.getBlock()).timestamp;
    const sign = async (who, wallet, total, deadline) => who.signTypedData({ domain, types, primaryType: 'Claim', message: { wallet, total, deadline } });
    await send(ownerA, token, 'transfer', [shop.address, E('100')]);
    check('the owner deposits with a plain transfer', (await read('status', [buyerA])).pool === E('100'));
    let dl = (await now()) + 600n;
    const s3 = await sign(server, buyerA, E('3'), dl);
    check('a claim from another wallet is refused', await fails(send(otherA, shop, 'claim', [E('3'), dl, s3]), 'BadSignature'));
    const b0 = await bal(buyerA);
    const rc = await send(buyerA, shop, 'claim', [E('3'), dl, s3]);
    console.log(`claim gas ${rc.gasUsed}`);
    check('a signed claim pays', await bal(buyerA) - b0 === E('3') && await read('claimed', [buyerA]) === E('3'));
    check('the same signature cannot pay twice', await fails(send(buyerA, shop, 'claim', [E('3'), dl, s3]), 'NothingToClaim'));
    const s5 = await sign(server, buyerA, E('5'), dl);
    await send(buyerA, shop, 'claim', [E('5'), dl, s5]);
    check('a higher total pays only the difference', await bal(buyerA) - b0 === E('5'));
    check('an older lower total pays nothing', await fails(send(buyerA, shop, 'claim', [E('3'), dl, s3]), 'NothingToClaim'));
    check('a stranger key is refused', await fails(send(buyerA, shop, 'claim', [E('9'), dl, await sign(stranger, buyerA, E('9'), dl)]), 'BadSignature'));
    const s6 = await sign(server, buyerA, E('6'), dl);
    check('a changed total breaks the signature', await fails(send(buyerA, shop, 'claim', [E('7'), dl, s6]), 'BadSignature'));
    const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n, sig = v.hexToBytes(s6), sv = BigInt(v.bytesToHex(sig.slice(32, 64)));
    const high = v.concat([v.bytesToHex(sig.slice(0, 32)), v.numberToHex(N - sv, { size: 32 }), v.numberToHex(sig[64] === 27 ? 28 : 27, { size: 1 })]);
    check('the twin high s signature is refused', await fails(send(buyerA, shop, 'claim', [E('6'), dl, high]), 'BadSignature'));
    check('a short signature is refused', await fails(send(buyerA, shop, 'claim', [E('6'), dl, s6.slice(0, 120)]), 'BadSignature'));
    const old = (await now()) - 1n;
    check('an expired signature is refused', await fails(send(buyerA, shop, 'claim', [E('6'), old, await sign(server, buyerA, E('6'), old)]), 'Expired'));
    check('one claim cannot pass maxClaim', await fails(send(otherA, shop, 'claim', [E('51'), dl, await sign(server, otherA, E('51'), dl)]), 'OverMaxClaim'));
    await send(otherA, shop, 'claim', [E('50'), dl, await sign(server, otherA, E('50'), dl)]);
    st = await read('status', [otherA]);
    check('the day cap counts everyone', st.leftToday === E('25'), String(st.leftToday));
    check('the day cap stops the next claim', await fails(send(otherA, shop, 'claim', [E('80'), dl, await sign(server, otherA, E('80'), dl)]), 'OverDayCap'));
    await rpc('evm_setNextBlockTimestamp', ['0x' + (nextDay + 3n * 86400n).toString(16)]);await rpc('evm_mine', []);
    dl = (await now()) + 600n;
    await send(otherA, shop, 'claim', [E('80'), dl, await sign(server, otherA, E('80'), dl)]);
    check('a new day opens the cap again', await read('claimed', [otherA]) === E('80'));
    await send(ownerA, shop, 'setLimits', [E('500'), E('500')]);
    check('an empty pool fails the claim', await fails(send(buyerA, shop, 'claim', [E('400'), dl, await sign(server, buyerA, E('400'), dl)]), 'ERC20InsufficientBalance'));

    /* the owner */
    await send(ownerA, shop, 'setPaused', [true]);
    check('pause stops claims', await fails(send(buyerA, shop, 'claim', [E('6'), dl, s6]), 'IsPaused'));
    check('pause stops the shop', await fails(send(buyerA, shop, 'buyChest', [E('10')]), 'IsPaused'));
    await send(ownerA, shop, 'setPaused', [false]);
    check('only the owner withdraws', await fails(send(buyerA, shop, 'withdraw', [SQK, buyerA, 1n]), 'NotOwner'));
    const pool = (await read('status', [ownerA])).pool, o0 = await bal(ownerA);
    await send(ownerA, shop, 'withdraw', [SQK, ownerA, pool]);
    check('the owner takes the pool back', await bal(ownerA) - o0 === pool && (await read('status', [ownerA])).pool === 0n);
    check('a zero signer is refused', await fails(send(ownerA, shop, 'setSigner', ['0x0000000000000000000000000000000000000000']), 'ZeroAddress'));
    await send(ownerA, shop, 'setSigner', [stranger.address]);
    check('a new signer replaces the old one', await fails(send(buyerA, shop, 'claim', [E('6'), dl, s6]), 'BadSignature'));
    await send(ownerA, shop, 'proposeOwner', [otherA]);
    check('ownership waits for the new owner', (await read('owner')).toLowerCase() === ownerA.toLowerCase());
    check('only the proposed owner accepts', await fails(send(buyerA, shop, 'acceptOwner', []), 'NotPendingOwner'));
    await send(otherA, shop, 'acceptOwner', []);
    check('the new owner takes over', (await read('owner')).toLowerCase() === otherA.toLowerCase() && await fails(send(ownerA, shop, 'setChestPrice', [1n]), 'NotOwner'));
    check('the domain matches the one signed', (await read('domainSeparator')) === v.hashDomain({ domain, types: { EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' }] } }));
  } catch (e) {
    fail++;
    console.log('FAIL crashed:', e && (e.shortMessage || e.message));
  } finally {
    anvil.kill();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
  }
})();
