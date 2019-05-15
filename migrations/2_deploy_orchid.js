var OCT      = artifacts.require("./OCT.sol");
var MicroPay = artifacts.require("./MicroPay.sol");
var Lottery  = artifacts.require("./OrchidLottery.sol");

module.exports = function(deployer) {
    // Deploy OCT, then deploy MicroPay, passing in OCT's newly deployed address
    deployer.deploy(OCT).then(function() {
	return deployer.deploy(MicroPay, OCT.address);
    });
}
