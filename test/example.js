/* Example showing how to create and claim tickets

   * Install dependencies (see README) and verify with:
     `truffle compile && truffle test`

   * In the live app, the `Contracts` class will automatically
     setup connection to the live Ethereum chain

   * This example requires a localhost 'testrpc'
     (see README)

   * Some of the following dependences are only needed in this test
     (see code comments)

   * The first part of this example is test-specific setup code that,
     while informative, can be ignored for app-integration purposes
     - scroll down to the `c.transferData` call to see where to begin
*/


/*


// Only these two imports are needed in app
var Accounts  = require('../lib/accounts/accounts.js');
var Contracts = require('../lib/contracts/contracts.js');

// Only for testing - not needed in app
var assert    = require('assert');
var BigNumber = require('bignumber.js');

const ledgerABI	   = require('../build/contracts/OCT.json').abi;
const ledgerBin	   = require('../build/contracts/OCT.json').bytecode;
const microPayABI = require('../build/contracts/MicroPay.json').abi;
const microPayBin = require('../build/contracts/MicroPay.json').bytecode;

describe('Example of ticket creation & claiming:', function () {


    it('Example', async () => {
	// TEST SETUP CODE

    console.log("[39]: Example start");

	// this assumes testrpc started as:
	// testrpc -d --network-id 10
	// to get deterministic test accounts (`testAcc` is the first account)
	// --network-id 10 is needed to workaround
	// https://github.com/ethereum/web3.js/issues/932 (wtf)

	const testAcc = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
	const testKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
	const password = 'foo'
	var a = new Accounts();
	a.setup(null, password);
	const relay  = a.newKey(password);
	const source = a.newKey(password);

    console.log("[55]: relay: " + relay + " source: " + source);

	var c;
	try {
	    c = new Contracts();
	    const s = await c.web3.eth.isSyncing();
	} catch (e) {
	    assert.fail("Host unavailable/not working", c.endpoint,
			"Ethereum JSON-RPC: " + e + " (please check configured host)");
	    return;
	}

    console.log("3");

	// Deploy a test ledger and test microPay
	var l = new c.web3.eth.Contract(ledgerABI);
	var m = new c.web3.eth.Contract(microPayABI);
	var ledgerAddr;
	var microPayAddr;

    console.log("4");

	//var foo = await l.deploy({data: ledgerBin})
	//console.log("FUNKY: " + foo);
	await l.deploy({data: ledgerBin})
	    .send({from: testAcc, gas: 3000000, gasPrice: '0'})
	    .then(function(instance) {
		c.ledger = instance;
		c.ledgerAddr = instance.options.address;
		ledgerAddr = instance.options.address;
	    });

    console.log("5");

	await m.deploy({data: microPayBin, arguments: [ledgerAddr]})
	    .send({from: testAcc, gas: 3000000, gasPrice: '0'})
	    .then(function(instance) {
		c.microPay = instance;
		c.microPayAddr = instance.options.address;
		microPayAddr = instance.options.address;
	    });



	var isLocked_hash  = c.web3.utils.soliditySha3("isLocked(address)");                // 0x4a4fbeecd73fa03f3ac781aa98bb4a9c575f180ecd8e77718d48bd03acfef6b0   0x4a4fbeec0000000000000000000000000000000000000000000000000000000000000000 
	var isSolvent_hash = c.web3.utils.soliditySha3("isSolvent(address)");               // 0x38b51ce1b7ed2624dba836647af20a89172629885d0e42e807424165525b06be   0x38b51ce10000000000000000000000000000000000000000000000000000000000000000
	var ret_addr_hash  = c.web3.utils.soliditySha3("ret_addr(address)");                // 0xc6cecaa41cfcdfcb407c5920ae93f097d911035817a2c295a6d5c87ecfe96485   0xc6cecaa40000000000000000000000000000000000000000000000000000000000000000 
	var double_hash    = c.web3.utils.soliditySha3("double(int256)");                   // 0x6ffa1caacdbca40c71e3787a33872771f2864c218eaf6f1b2f862d9323ba1640   0x6ffa1caa0000000000000000000000000000000000000000000000000000000000000005    
	var get_ticketFunds_hash = c.web3.utils.soliditySha3("get_ticketFunds(address)");   // 0xf8f45f0f57543294e2dfa4639ce0163011fb4acf84bb03428407dc8c1698643b   0xf8f45f0f0000000000000000000000000000000000000000000000000000000000000000    

    console.log("6 microPayAddr: " + microPayAddr + " source.address: " + source.address);
    console.log(" isLocked: " + isLocked_hash + " isSolvent: " + isSolvent_hash + " ret_addr: " + ret_addr_hash + " double_hash: " + double_hash );
    console.log(" get_ticketFunds: " + get_ticketFunds_hash );
    
	// Now we have ledger and microPay

	// Mint some MET:
	// since testAcc deployed the ledger it becomes "owner" and can mint
	var ten = c.web3.utils.toWei('10','ether'); // MET & ETH have same precision
	var one = c.web3.utils.toWei('1','ether');
	await c.mint(source.address, ten).send({from: testAcc}).then(function(res) {
	});

    console.log("7 ten: " + ten + " one: " + one);

	// send ETH to source and relay so they can send txs
	const txRes0 = await c.web3.eth.sendTransaction(
	    {to: source.address, value: one, from: testAcc});
	const txRes1 = await c.web3.eth.sendTransaction(
	    {to: relay.address, value: one, from: testAcc});

    console.log("8");

	// verify
	const ETHBalSource = await c.web3.eth.getBalance(source.address);
	const ETHBalRelay = await c.web3.eth.getBalance(relay.address);
	assert.equal(ETHBalSource, one);
	assert.equal(ETHBalRelay, one);

    console.log("9");

	// The following is what should be integrated into the app
	// fund ticket deposit - goes through ledger API that calls microPay
	const txRes = await c.transferData(microPayAddr, one, "0x", source.privateKey);
	// verify
	const solvent = await c.isSolvent(source.address);
	assert.equal(solvent, true);


    const solvent2          = await c.microPay.methods.isSolvent(source.address).call();

    const microPayAddr_this = await c.microPay.methods.get_address().call();


    console.log("10");

	// new ticket with source as creator
	var rand = 1;
	var randHash = c.web3.utils.soliditySha3(rand);
	var faceValue = c.web3.utils.toWei('0.1','ether');;
	// so we're guaranteed to win in this test
	var winProb = (new BigNumber(2)).pow(256).sub(1);
	//var winProb = new BigNumber(33);


    console.log("11");

	var ticket = c.newTicket(randHash,
				 faceValue,
				 winProb,
				 relay.address,
				 source.address,
				 source.privateKey);
	//console.log("new ticket: " + JSON.stringify(ticket));


    console.log("12");

	// Off-chain validation
	var res;
	try {
	    res = await c.verifyTicket(ticket,
				       rand,
				       randHash,
				       faceValue,
				       winProb,
				       relay.address,
				       source.address);
	    console.log("validateTicket: " + JSON.stringify(res));
	} catch (e) {
	    console.log("validateTicket throw: " + JSON.stringify(e));
	}



    console.log("13");

	// On-chain validation & payout
	const claimTxRes = await c.claimTicket(ticket, rand, relay.privateKey);

    console.log("13a");

	// verify
	const relayOCTBal = await c.getOCTBalance(relay.address).call();
	assert.equal(relayOCTBal, faceValue);

    console.log("14");

	// withdraw before unlocking fails
	try {
	    await c.withdrawSenderFunds(source.privateKey).send({from: testAcc, gas: 3000000, gasPrice: '0'})
	    assert.fail('expected throw');
	} catch (e) {
	    assert.equal(e.message, 'Returned error: VM Exception while processing transaction: revert');
	}

    console.log("15");

	// unlock sender account
	const unlockTxRes = await c.unlockAccount(source.privateKey).send({from: testAcc, gas: 3000000, gasPrice: '0'});

    console.log("16");

	const seconds = 86401; // 1 day + 1
	c.web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [seconds], id: 0},
				    function(res) {});

    console.log("17");

	// withdraw sender's ticket account and penalty escrow
	const withdrawTxRes = await c.withdrawSenderFunds(source.privateKey).send({from: testAcc, gas: 3000000, gasPrice: '0'});

    console.log("18");
    

	// TODO: validate remaining ticket and ticket account invariants
    });
});


*/
