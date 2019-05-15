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

// Only these two imports are needed in app
var Accounts  = require('../lib/accounts/accounts.js');
var Contracts = require('../lib/contracts/contracts.js');

// Only for testing - not needed in app
var assert    = require('assert');
var BigNumber = require('bignumber.js');

const ledgerABI	 = require('../build/contracts/OCT.json').abi;
const ledgerBin	 = require('../build/contracts/OCT.json').bytecode;
const lotteryABI = require('../build/contracts/OrchidLottery.json').abi;
const lotteryBin = require('../build/contracts/OrchidLottery.json').bytecode;


// doesn't work :(
LineNum = function() {
    var thisline = new Error().lineNumber;
    return "[" + thisline.toString() + "]";
};


describe('Example of ticket creation & claiming:', function () 
{
    it('Example', async () => {
	    // TEST SETUP CODE

        console.log("[45] Example start");

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

        console.log("[54]: relay.address: " + relay.address + " source.address: " + source.address);


	    var c;
	    try {
	        c = new Contracts();
	        const s = await c.web3.eth.isSyncing();
	    } catch (e) {
	        assert.fail("Host unavailable/not working", c.endpoint,
			    "Ethereum JSON-RPC: " + e + " (please check configured host)");
	        return;
	    }

        console.log("[67]");        

	    // Deploy a test ledger and test microPay
	    var l = new c.web3.eth.Contract(ledgerABI);
	    var m = new c.web3.eth.Contract(lotteryABI);
	    var ledgerAddr;
	    var lotteryAddr;

        console.log("[83] deploying ledgerBin and lotteryBin");        
       
       
	    await l.deploy({data: ledgerBin})
	        .send({from: testAcc, gas: 3000000, gasPrice: '0'})
	        .then(function(instance) {
		    c.ledger = instance;
		    c.ledgerAddr = instance.options.address;
		    ledgerAddr = instance.options.address;
	        });

        console.log("[94]   ledgerAddr: " + ledgerAddr);

	    await m.deploy({data: lotteryBin, arguments: [ledgerAddr]})
	        .send({from: testAcc, gas: 3000000, gasPrice: '0'})
	        .then(function(instance) {
		    c.lottery = instance;
		    c.lotteryAddr = instance.options.address;
		    lotteryAddr = instance.options.address;
	        });       

        console.log("[104]  lotteryAddr: " + lotteryAddr);

        lotteryAddr_rv = await c.lottery.methods.get_address().call();

        console.log("[108]  lotteryAddr_rv: " + lotteryAddr_rv);
        
	    // Now we have ledger and lottery

	    // Mint some OCT:
	    // since testAcc deployed the ledger it becomes "owner" and can mint
	    var ten = c.web3.utils.toWei('10','ether'); // OCT & ETH have same precision
	    var two = c.web3.utils.toWei('2','ether');
	    var one = c.web3.utils.toWei('1','ether');
	    await c.mint(source.address, ten).send({from: testAcc}).then(function(res) {
	    });

	    const source_OCT = await c.ledger.methods.balanceOf(source.address).call();

        console.log("[122] source_OCT: " + source_OCT );

        console.log("[124] ten: " + ten + " one: " + one);

	    // send ETH to source and relay so they can send txs
	    const txRes0 = await c.web3.eth.sendTransaction(
	        {to: source.address, value: one, from: testAcc});
	    const txRes1 = await c.web3.eth.sendTransaction(
	        {to: relay.address, value: one, from: testAcc});

        console.log("[123]");

	    // verify
	    const ETHBalSource = await c.web3.eth.getBalance(source.address);
	    const ETHBalRelay = await c.web3.eth.getBalance(relay.address);
	    assert.equal(ETHBalSource, one);
	    assert.equal(ETHBalRelay, one);

        console.log("[131]  ETHBalSource: " + ETHBalSource + " ETHBalRelay: " + ETHBalRelay);        


        console.log("[134]  approve(" + lotteryAddr + ", " + ten + " )");        
	    const approveTxRes = await c.approve(lotteryAddr, ten, source.privateKey);
	    // const approveTxRes = await c.ledger.methods.approve(lotteryAddr, ten).send({from: source.address}).then(function(res) {});

        const allow_val = await c.ledger.methods.allowance(source.address, lotteryAddr).call();

        console.log("[143]  allow_val: " + allow_val );        


        console.log("[146]  fund(" + source.address + ", " + one + ", " + two + ", " + source.privateKey + ")");        
	    const fundTxRes = await c.fund(source.address, one, two, source.privateKey);

        const amount = await c.lottery.methods.get_amount(source.address).call();
        const escrow = await c.lottery.methods.get_escrow(source.address).call();
        const unlock = await c.lottery.methods.get_unlock(source.address).call();

        console.log("[154]  [" + source.address + "]: (" + amount + ", " + escrow + ", " + unlock + ")" );        


        // recipient rolls a secret rand numb, passes hash to sender
	    var secret_rand = 1;
	    var secret_hash = c.web3.utils.soliditySha3(secret_rand);


	    // sender/source creates new ticket to recipient/relay with randHash from recipient
	    var faceValue = c.web3.utils.toWei('0.1','ether');
	    // so we're guaranteed to win in this test
	    var winProb = (new BigNumber(2)).pow(256).sub(1);
	    //var winProb = new BigNumber(0);

	    var ticket = c.newTicket2(
	                 secret_hash,
				     faceValue,
				     winProb,
				     relay.address,
				     source.address,
				     source.privateKey);

	    console.log("[175] new ticket: " + JSON.stringify(ticket));


        {
            const winProb   = new BigNumber(ticket.winProb);
            const nonce     = c.web3.utils.hexToNumber(ticket.nonce);
            const hash      = c.web3.utils.soliditySha3(        ticket.randHash, ticket.recipient, ticket.faceValue, winProb, nonce);
	        const hash2     = await c.lottery.methods.hash_test(ticket.randHash, ticket.recipient, ticket.faceValue, winProb, nonce).call();

            console.log("grabTicket  hash: + " + hash + " hash2: " + hash2);
        
        }

	    // On-chain validation & payout
	    console.log("[180] grabTicket() ");
	    const grabTxRes = await c.grabTicket(ticket, secret_rand, relay.privateKey);
	    
	    
	    const relay_OCT = await c.ledger.methods.balanceOf(relay.address).call();
	    console.log("[185] relay_OCT: " + relay_OCT);

        
    });
});
